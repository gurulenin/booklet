import { PaperSize } from '../types';

export const PAPER_SIZES: PaperSize[] = [
  { name: 'A5', width: 148, height: 210, unit: 'mm' },
  { name: 'A5 Landscape', width: 210, height: 148, unit: 'mm' },
  { name: 'A4', width: 210, height: 297, unit: 'mm' },
  { name: 'A4 Landscape', width: 297, height: 210, unit: 'mm' },
  { name: 'A3', width: 297, height: 420, unit: 'mm' },
  { name: 'A3 Landscape', width: 420, height: 297, unit: 'mm' },
  { name: 'Letter', width: 8.5, height: 11, unit: 'in' },
  { name: 'Letter Landscape', width: 11, height: 8.5, unit: 'in' },
  { name: 'Legal', width: 8.5, height: 14, unit: 'in' },
  { name: '11x17', width: 11, height: 17, unit: 'in' },
  { name: '13x19', width: 13, height: 19, unit: 'in' },
  { name: '13x19 Landscape', width: 19, height: 13, unit: 'in' },
];

export function mmToPoints(mm: number): number {
  return (mm / 25.4) * 72;
}

export function inchesToPoints(inches: number): number {
  return inches * 72;
}

export function paperSizeToPoints(paper: PaperSize): { width: number; height: number } {
  if (paper.unit === 'mm') {
    return {
      width: mmToPoints(paper.width),
      height: mmToPoints(paper.height),
    };
  } else {
    return {
      width: inchesToPoints(paper.width),
      height: inchesToPoints(paper.height),
    };
  }
}
