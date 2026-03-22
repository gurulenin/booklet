export interface PaperSize {
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'in';
}

export interface PageArrangement {
  outputPage: number;
  side: 'front' | 'back';
  position: 'top' | 'bottom';
  sourcePage: number;
}

export interface PrintConfig {
  sourcePaper: PaperSize;
  targetPaper: PaperSize;
  orientation: 'portrait' | 'landscape';
}
