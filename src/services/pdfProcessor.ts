import { PDFDocument } from 'pdf-lib';
import { PaperSize, PageArrangement } from '../types';
import { paperSizeToPoints, mmToPoints } from '../utils/paperSizes';

export async function loadPDF(file: File): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer();
  return await PDFDocument.load(arrayBuffer);
}

export function calculatePageArrangement(
  totalPages: number,
  sourcePaper: PaperSize,
  targetPaper: PaperSize
): PageArrangement[] {
  const arrangement: PageArrangement[] = [];
  let outputPage = 1;
  let currentPage = 1;

  while (currentPage <= totalPages) {
    const frontTopPage = currentPage;
    const frontBottomPage = currentPage + 2;
    const backTopPage = currentPage + 1;
    const backBottomPage = currentPage + 3;

    if (frontTopPage <= totalPages) arrangement.push({ outputPage, side: 'front', position: 'top', sourcePage: frontTopPage });
    if (frontBottomPage <= totalPages) arrangement.push({ outputPage, side: 'front', position: 'bottom', sourcePage: frontBottomPage });
    if (backTopPage <= totalPages) arrangement.push({ outputPage, side: 'back', position: 'top', sourcePage: backTopPage });
    if (backBottomPage <= totalPages) arrangement.push({ outputPage, side: 'back', position: 'bottom', sourcePage: backBottomPage });

    outputPage++;
    currentPage += 4;
  }

  return arrangement;
}

export interface BookletLayout {
  cols: number;
  rows: number;
  pagesPerSide: number;
  pagesPerSheet: number;
  outputLandscape: boolean;
}

export function calculateBookletLayout(inputPaper: PaperSize, outputPaper: PaperSize): BookletLayout {
  const input = paperSizeToPoints(inputPaper);
  const output = paperSizeToPoints(outputPaper);

  const bestFit = (outW: number, outH: number) => {
    let bestCols = 1;
    let bestRows = 1;
    let bestCount = 0;
    for (let c = 1; c <= 8; c++) {
      for (let r = 1; r <= 8; r++) {
        const slotW = outW / c;
        const slotH = outH / r;
        const fitsPortrait = slotW >= input.width * 0.5 && slotH >= input.height * 0.5;
        const count = c * r;
        if (fitsPortrait && count > bestCount) {
          bestCount = count;
          bestCols = c;
          bestRows = r;
        }
      }
    }
    return { cols: bestCols, rows: bestRows, count: bestCount };
  };

  const portrait = bestFit(output.width, output.height);
  const landscape = bestFit(output.height, output.width);

  const useLandscape = landscape.count > portrait.count;
  const best = useLandscape ? landscape : portrait;

  const pagesPerSide = best.cols * best.rows;

  return {
    cols: best.cols,
    rows: best.rows,
    pagesPerSide,
    pagesPerSheet: pagesPerSide * 2,
    outputLandscape: useLandscape,
  };
}

function buildBookletOrder(totalPages: number, pagesPerSheet: number): number[] {
  const paddedTotal = Math.ceil(totalPages / pagesPerSheet) * pagesPerSheet;
  const order: number[] = [];

  const pagesPerSide = pagesPerSheet / 2;

  if (pagesPerSide === 1) {
    let lo = 0;
    let hi = paddedTotal - 1;
    while (lo <= hi) {
      order.push(hi);
      order.push(lo);
      lo++;
      hi--;
      order.push(lo);
      order.push(hi);
      lo++;
      hi--;
    }
  } else if (pagesPerSide === 2) {
    let lo = 0;
    let hi = paddedTotal - 1;
    while (lo <= hi) {
      order.push(hi);
      order.push(lo);
      lo++;
      hi--;
      order.push(lo);
      order.push(hi);
      lo++;
      hi--;
    }
  } else {
    const sheetsNeeded = paddedTotal / pagesPerSheet;
    for (let sheet = 0; sheet < sheetsNeeded; sheet++) {
      const base = sheet * pagesPerSheet;
      for (let i = 0; i < pagesPerSheet; i++) {
        order.push(base + i);
      }
    }
  }

  return order;
}

async function drawSourcePage(
  outputPdf: PDFDocument,
  sourcePdf: PDFDocument,
  sheet: ReturnType<PDFDocument['addPage']>,
  pageIdx: number,
  totalPages: number,
  x: number,
  y: number,
  slotWidth: number,
  slotHeight: number,
  sourceWidthPt: number,
  sourceHeightPt: number
) {
  if (pageIdx < 0 || pageIdx >= totalPages) return;
  const [embedded] = await outputPdf.embedPdf(sourcePdf, [pageIdx]);
  const scale = Math.min((slotWidth * 0.95) / sourceWidthPt, (slotHeight * 0.95) / sourceHeightPt);
  const scaledW = sourceWidthPt * scale;
  const scaledH = sourceHeightPt * scale;
  const xOffset = x + (slotWidth - scaledW) / 2;
  const yOffset = y + (slotHeight - scaledH) / 2;
  sheet.drawPage(embedded, { x: xOffset, y: yOffset, width: scaledW, height: scaledH });
}

export async function generateBookletPDF(
  sourcePdf: PDFDocument,
  inputPaper: PaperSize,
  outputPaper: PaperSize,
  spacingMm: number = 0
): Promise<Uint8Array> {
  const outputPdfDoc = await PDFDocument.create();
  const totalPages = sourcePdf.getPageCount();
  const layout = calculateBookletLayout(inputPaper, outputPaper);
  const spacingPoints = mmToPoints(spacingMm);

  const outputSize = paperSizeToPoints(outputPaper);
  const inputSize = paperSizeToPoints(inputPaper);

  const outW = layout.outputLandscape ? outputSize.height : outputSize.width;
  const outH = layout.outputLandscape ? outputSize.width : outputSize.height;

  const slotW = (outW - spacingPoints * (layout.cols - 1)) / layout.cols;
  const slotH = (outH - spacingPoints * (layout.rows - 1)) / layout.rows;

  const pagesPerSide = layout.pagesPerSide;
  const pagesPerSheet = layout.pagesPerSheet;

  const paddedTotal = Math.ceil(totalPages / pagesPerSheet) * pagesPerSheet;

  const bookletOrder = buildBookletImpositionOrder(paddedTotal, pagesPerSheet);

  const slotPositions: { x: number; y: number }[] = [];
  for (let row = layout.rows - 1; row >= 0; row--) {
    for (let col = 0; col < layout.cols; col++) {
      slotPositions.push({
        x: col * (slotW + spacingPoints),
        y: row * (slotH + spacingPoints),
      });
    }
  }

  for (let sideIdx = 0; sideIdx < bookletOrder.length; sideIdx += pagesPerSide) {
    const sheet = outputPdfDoc.addPage([outW, outH]);
    for (let slot = 0; slot < pagesPerSide; slot++) {
      const pageIdx = bookletOrder[sideIdx + slot];
      const pos = slotPositions[slot];
      await drawSourcePage(
        outputPdfDoc, sourcePdf, sheet,
        pageIdx, totalPages,
        pos.x, pos.y, slotW, slotH,
        inputSize.width, inputSize.height
      );
    }
  }

  return await outputPdfDoc.save();
}

function buildBookletImpositionOrder(paddedTotal: number, pagesPerSheet: number): number[] {
  const pagesPerSide = pagesPerSheet / 2;
  const sheetsNeeded = paddedTotal / pagesPerSheet;
  const order: number[] = [];

  if (pagesPerSide === 1) {
    let lo = 0;
    let hi = paddedTotal - 1;
    while (lo <= hi) {
      order.push(hi, lo);
      lo++;
      hi--;
      if (lo <= hi) {
        order.push(lo, hi);
        lo++;
        hi--;
      }
    }
  } else if (pagesPerSide === 2) {
    let lo = 0;
    let hi = paddedTotal - 1;
    while (lo <= hi) {
      order.push(hi, lo);
      lo++;
      hi--;
      if (lo <= hi) {
        order.push(lo, hi);
        lo++;
        hi--;
      }
    }
  } else {
    for (let sheet = 0; sheet < sheetsNeeded; sheet++) {
      const frontStart = sheet * pagesPerSide * 2;
      for (let i = 0; i < pagesPerSide; i++) order.push(frontStart + i);
      for (let i = 0; i < pagesPerSide; i++) order.push(frontStart + pagesPerSide + i);
    }
  }

  return order;
}

export async function generateArrangedPDF(
  sourcePdf: PDFDocument,
  targetPaper: PaperSize,
  arrangement: PageArrangement[],
  spacingMm: number = 0
): Promise<Uint8Array> {
  const outputPdf = await PDFDocument.create();
  const targetSize = paperSizeToPoints(targetPaper);
  const spacingPoints = mmToPoints(spacingMm);

  const sourcePages = sourcePdf.getPages();
  const outputPageMap = new Map<number, { front?: PDFDocument; back?: PDFDocument }>();

  for (const item of arrangement) {
    if (!outputPageMap.has(item.outputPage)) outputPageMap.set(item.outputPage, {});
    const pageData = outputPageMap.get(item.outputPage)!;

    if (!pageData[item.side]) {
      pageData[item.side] = await PDFDocument.create();
      pageData[item.side]!.addPage([targetSize.width, targetSize.height]);
    }

    const sourcePage = sourcePages[item.sourcePage - 1];
    if (!sourcePage) continue;

    const { width: sourceWidth, height: sourceHeight } = sourcePage.getSize();
    const [embeddedPage] = await pageData[item.side]!.embedPdf(sourcePdf, [item.sourcePage - 1]);
    const targetPage = pageData[item.side]!.getPages()[0];

    const availableHeight = (targetSize.height - spacingPoints) / 2;
    const scale = Math.min(
      (targetSize.width * 0.95) / sourceWidth,
      (availableHeight * 0.95) / sourceHeight
    );

    const scaledWidth = sourceWidth * scale;
    const scaledHeight = sourceHeight * scale;
    const xOffset = (targetSize.width - scaledWidth) / 2;
    const yOffset = item.position === 'top'
      ? targetSize.height - scaledHeight - (availableHeight - scaledHeight) / 2 - spacingPoints / 2
      : (availableHeight - scaledHeight) / 2 + spacingPoints / 2;

    targetPage.drawPage(embeddedPage, { x: xOffset, y: yOffset, width: scaledWidth, height: scaledHeight });
  }

  for (const [_, pageData] of Array.from(outputPageMap.entries()).sort((a, b) => a[0] - b[0])) {
    if (pageData.front) {
      const [frontPage] = await outputPdf.copyPages(pageData.front, [0]);
      outputPdf.addPage(frontPage);
    }
    if (pageData.back) {
      const [backPage] = await outputPdf.copyPages(pageData.back, [0]);
      outputPdf.addPage(backPage);
    }
  }

  return await outputPdf.save();
}
