import { PDFDocument } from 'pdf-lib';
import { PaperSize, PageArrangement } from '../types';
import { paperSizeToPoints, mmToPoints, inchesToPoints } from '../utils/paperSizes';

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

    if (frontTopPage <= totalPages) {
      arrangement.push({
        outputPage,
        side: 'front',
        position: 'top',
        sourcePage: frontTopPage,
      });
    }

    if (frontBottomPage <= totalPages) {
      arrangement.push({
        outputPage,
        side: 'front',
        position: 'bottom',
        sourcePage: frontBottomPage,
      });
    }

    if (backTopPage <= totalPages) {
      arrangement.push({
        outputPage,
        side: 'back',
        position: 'top',
        sourcePage: backTopPage,
      });
    }

    if (backBottomPage <= totalPages) {
      arrangement.push({
        outputPage,
        side: 'back',
        position: 'bottom',
        sourcePage: backBottomPage,
      });
    }

    outputPage++;
    currentPage += 4;
  }

  return arrangement;
}

export async function generateA5BookletPDF(
  sourcePdf: PDFDocument,
  spacingMm: number = 0
): Promise<Uint8Array> {
  const outputPdf = await PDFDocument.create();
  const totalPages = sourcePdf.getPageCount();

  const paddedTotal = Math.ceil(totalPages / 4) * 4;
  const bookletOrder: (number | null)[] = [];

  let lo = 0;
  let hi = paddedTotal - 1;
  while (lo <= hi) {
    bookletOrder.push(hi);
    bookletOrder.push(lo);
    lo++;
    hi--;
    bookletOrder.push(lo);
    bookletOrder.push(hi);
    lo++;
    hi--;
  }

  const targetWidth = inchesToPoints(19);
  const targetHeight = inchesToPoints(13);
  const spacingPoints = mmToPoints(spacingMm);

  const a5WidthMm = 148;
  const a5HeightMm = 210;
  const a5Width = mmToPoints(a5WidthMm);
  const a5Height = mmToPoints(a5HeightMm);

  const availableWidth = (targetWidth - spacingPoints) / 2;
  const scale = Math.min(
    (availableWidth * 0.95) / a5Width,
    (targetHeight * 0.95) / a5Height
  );

  const scaledW = a5Width * scale;
  const scaledH = a5Height * scale;

  for (let sheetSide = 0; sheetSide < bookletOrder.length; sheetSide += 2) {
    const leftPageIdx = bookletOrder[sheetSide];
    const rightPageIdx = bookletOrder[sheetSide + 1];

    const sheet = outputPdf.addPage([targetWidth, targetHeight]);

    const drawSlot = async (pageIdx: number | null, slotX: number) => {
      if (pageIdx === null || pageIdx >= totalPages || pageIdx < 0) return;
      const [embedded] = await outputPdf.embedPdf(sourcePdf, [pageIdx]);
      const xOffset = slotX + (availableWidth - scaledW) / 2;
      const yOffset = (targetHeight - scaledH) / 2;
      sheet.drawPage(embedded, { x: xOffset, y: yOffset, width: scaledW, height: scaledH });
    };

    await drawSlot(leftPageIdx, 0);
    await drawSlot(rightPageIdx, availableWidth + spacingPoints);
  }

  return await outputPdf.save();
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
    if (!outputPageMap.has(item.outputPage)) {
      outputPageMap.set(item.outputPage, {});
    }

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

    targetPage.drawPage(embeddedPage, {
      x: xOffset,
      y: yOffset,
      width: scaledWidth,
      height: scaledHeight,
    });
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
