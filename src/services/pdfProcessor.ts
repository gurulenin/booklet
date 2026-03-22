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

const A5_WIDTH_PT = mmToPoints(148);
const A5_HEIGHT_PT = mmToPoints(210);

export function canFitFourA5Pages(targetPaper: PaperSize): boolean {
  const { width: tw, height: th } = paperSizeToPoints(targetPaper);
  const fitPortrait = tw >= A5_WIDTH_PT * 2 && th >= A5_HEIGHT_PT * 2;
  const fitLandscape = tw >= A5_HEIGHT_PT * 2 && th >= A5_WIDTH_PT * 2;
  return fitPortrait || fitLandscape;
}

async function drawA5Page(
  outputPdf: PDFDocument,
  sourcePdf: PDFDocument,
  sheet: ReturnType<PDFDocument['addPage']>,
  pageIdx: number,
  totalPages: number,
  x: number,
  y: number,
  slotWidth: number,
  slotHeight: number
) {
  if (pageIdx < 0 || pageIdx >= totalPages) return;
  const [embedded] = await outputPdf.embedPdf(sourcePdf, [pageIdx]);
  const scale = Math.min((slotWidth * 0.95) / A5_WIDTH_PT, (slotHeight * 0.95) / A5_HEIGHT_PT);
  const scaledW = A5_WIDTH_PT * scale;
  const scaledH = A5_HEIGHT_PT * scale;
  const xOffset = x + (slotWidth - scaledW) / 2;
  const yOffset = y + (slotHeight - scaledH) / 2;
  sheet.drawPage(embedded, { x: xOffset, y: yOffset, width: scaledW, height: scaledH });
}

async function generateA5Booklet2Up(
  sourcePdf: PDFDocument,
  targetPaper: PaperSize,
  spacingMm: number
): Promise<Uint8Array> {
  const outputPdf = await PDFDocument.create();
  const totalPages = sourcePdf.getPageCount();
  const { width: targetWidth, height: targetHeight } = paperSizeToPoints(targetPaper);
  const spacingPoints = mmToPoints(spacingMm);

  const paddedTotal = Math.ceil(totalPages / 4) * 4;
  const bookletOrder: number[] = [];

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

  const slotWidth = (targetWidth - spacingPoints) / 2;
  const slotHeight = targetHeight;

  for (let i = 0; i < bookletOrder.length; i += 2) {
    const sheet = outputPdf.addPage([targetWidth, targetHeight]);
    await drawA5Page(outputPdf, sourcePdf, sheet, bookletOrder[i], totalPages, 0, 0, slotWidth, slotHeight);
    await drawA5Page(outputPdf, sourcePdf, sheet, bookletOrder[i + 1], totalPages, slotWidth + spacingPoints, 0, slotWidth, slotHeight);
  }

  return await outputPdf.save();
}

async function generateA5Booklet4Up(
  sourcePdf: PDFDocument,
  targetPaper: PaperSize,
  spacingMm: number
): Promise<Uint8Array> {
  const outputPdf = await PDFDocument.create();
  const totalPages = sourcePdf.getPageCount();
  const { width: targetWidth, height: targetHeight } = paperSizeToPoints(targetPaper);
  const spacingPoints = mmToPoints(spacingMm);

  const paddedTotal = Math.ceil(totalPages / 4) * 4;
  const bookletOrder: number[] = [];

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

  const slotWidth = (targetWidth - spacingPoints) / 2;
  const slotHeight = (targetHeight - spacingPoints) / 2;

  for (let i = 0; i < bookletOrder.length; i += 4) {
    const sheet = outputPdf.addPage([targetWidth, targetHeight]);

    const topY = slotHeight + spacingPoints;
    const bottomY = 0;
    const leftX = 0;
    const rightX = slotWidth + spacingPoints;

    await drawA5Page(outputPdf, sourcePdf, sheet, bookletOrder[i], totalPages, leftX, topY, slotWidth, slotHeight);
    await drawA5Page(outputPdf, sourcePdf, sheet, bookletOrder[i + 1], totalPages, rightX, topY, slotWidth, slotHeight);
    await drawA5Page(outputPdf, sourcePdf, sheet, bookletOrder[i + 2], totalPages, leftX, bottomY, slotWidth, slotHeight);
    await drawA5Page(outputPdf, sourcePdf, sheet, bookletOrder[i + 3], totalPages, rightX, bottomY, slotWidth, slotHeight);
  }

  return await outputPdf.save();
}

export async function generateA5BookletPDF(
  sourcePdf: PDFDocument,
  targetPaper: PaperSize,
  spacingMm: number = 0
): Promise<Uint8Array> {
  if (canFitFourA5Pages(targetPaper)) {
    return generateA5Booklet4Up(sourcePdf, targetPaper, spacingMm);
  }
  return generateA5Booklet2Up(sourcePdf, targetPaper, spacingMm);
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
