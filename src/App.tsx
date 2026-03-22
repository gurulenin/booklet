import { useState, useMemo } from 'react';
import { FileUp, Download, Printer, BookOpen, LayoutGrid } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { PaperSize, PageArrangement } from './types';
import { PAPER_SIZES } from './utils/paperSizes';
import {
  loadPDF,
  calculatePageArrangement,
  generateArrangedPDF,
  generateBookletPDF,
  calculateBookletLayout,
} from './services/pdfProcessor';
import { PaperSizeSelector } from './components/PaperSizeSelector';
import { ArrangementPreview } from './components/ArrangementPreview';

type Mode = 'standard' | 'booklet';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [sourcePdf, setSourcePdf] = useState<PDFDocument | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [mode, setMode] = useState<Mode>('booklet');
  const [processing, setProcessing] = useState(false);
  const [spacing, setSpacing] = useState(5);

  const [stdSourcePaper, setStdSourcePaper] = useState<PaperSize>(PAPER_SIZES.find(p => p.name === 'A4')!);
  const [stdTargetPaper, setStdTargetPaper] = useState<PaperSize>(PAPER_SIZES.find(p => p.name === '13x19')!);
  const [arrangement, setArrangement] = useState<PageArrangement[]>([]);

  const [bookletInputPaper, setBookletInputPaper] = useState<PaperSize>(PAPER_SIZES.find(p => p.name === 'A5')!);
  const [bookletOutputPaper, setBookletOutputPaper] = useState<PaperSize>(PAPER_SIZES.find(p => p.name === 'A4')!);

  const bookletLayout = useMemo(
    () => calculateBookletLayout(bookletInputPaper, bookletOutputPaper),
    [bookletInputPaper, bookletOutputPaper]
  );

  const sheetsNeeded = totalPages > 0
    ? Math.ceil(totalPages / bookletLayout.pagesPerSheet)
    : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setProcessing(true);

    try {
      const pdf = await loadPDF(selectedFile);
      setSourcePdf(pdf);
      const pageCount = pdf.getPageCount();
      setTotalPages(pageCount);

      if (mode === 'standard') {
        const arr = calculatePageArrangement(pageCount, stdSourcePaper, stdTargetPaper);
        setArrangement(arr);
      }
    } catch {
      alert('Failed to load PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const recalcArrangement = (count: number, src: PaperSize, tgt: PaperSize) => {
    if (count > 0) setArrangement(calculatePageArrangement(count, src, tgt));
  };

  const handleGeneratePDF = async () => {
    if (!sourcePdf) return;
    setProcessing(true);

    try {
      let bytes: Uint8Array;

      if (mode === 'booklet') {
        bytes = await generateBookletPDF(sourcePdf, bookletInputPaper, bookletOutputPaper, spacing);
      } else {
        if (arrangement.length === 0) return;
        bytes = await generateArrangedPDF(sourcePdf, stdTargetPaper, arrangement, spacing);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `booklet-${file?.name || 'output.pdf'}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const canGenerate = sourcePdf && (mode === 'booklet' ? true : arrangement.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-8 py-6">
            <div className="flex items-center gap-3">
              <Printer className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">Booklet Print Arranger</h1>
                <p className="text-blue-200 text-sm mt-0.5">Arrange pages for duplex booklet printing</p>
              </div>
            </div>
          </div>

          <div className="p-8">

            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setMode('booklet')}
                className={`flex items-center gap-2 flex-1 px-5 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                  mode === 'booklet'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Single Page to Booklet
              </button>
              <button
                onClick={() => setMode('standard')}
                className={`flex items-center gap-2 flex-1 px-5 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                  mode === 'standard'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Standard Arrangement
              </button>
            </div>

            <div className="grid md:grid-cols-5 gap-8">

              <div className="md:col-span-3 space-y-5">

                <div className="border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/40 p-5">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Upload PDF</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <FileUp className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-700 font-medium text-sm">
                      {file ? file.name : 'Click to choose PDF file'}
                    </span>
                  </label>
                  {totalPages > 0 && (
                    <p className="mt-2.5 text-sm text-gray-600 text-center">
                      <span className="font-semibold text-gray-800">{totalPages}</span> pages loaded
                    </p>
                  )}
                </div>

                {mode === 'booklet' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Input Page Size
                        </label>
                        <select
                          value={bookletInputPaper.name}
                          onChange={(e) => {
                            const found = PAPER_SIZES.find(p => p.name === e.target.value);
                            if (found) setBookletInputPaper(found);
                          }}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                        >
                          {PAPER_SIZES.map(size => (
                            <option key={size.name} value={size.name}>
                              {size.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400">
                          {bookletInputPaper.width} × {bookletInputPaper.height} {bookletInputPaper.unit}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Output Paper Size
                        </label>
                        <select
                          value={bookletOutputPaper.name}
                          onChange={(e) => {
                            const found = PAPER_SIZES.find(p => p.name === e.target.value);
                            if (found) setBookletOutputPaper(found);
                          }}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                        >
                          {PAPER_SIZES.map(size => (
                            <option key={size.name} value={size.name}>
                              {size.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400">
                          {bookletOutputPaper.width} × {bookletOutputPaper.height} {bookletOutputPaper.unit}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Detected Layout</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                          <p className="text-xl font-bold text-blue-700">{bookletLayout.cols} × {bookletLayout.rows}</p>
                          <p className="text-xs text-gray-500 mt-0.5">grid</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                          <p className="text-xl font-bold text-blue-700">{bookletLayout.pagesPerSide}</p>
                          <p className="text-xs text-gray-500 mt-0.5">per side</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                          <p className="text-xl font-bold text-blue-700">{bookletLayout.pagesPerSheet}</p>
                          <p className="text-xs text-gray-500 mt-0.5">per sheet</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {bookletLayout.outputLandscape ? 'Landscape output' : 'Portrait output'}
                        </span>
                        <span>· Duplex printing required</span>
                      </div>
                      {sheetsNeeded && (
                        <p className="text-xs text-slate-600">
                          For <span className="font-semibold">{totalPages} pages</span>:{' '}
                          <span className="font-semibold text-blue-700">{sheetsNeeded} physical sheets</span> needed
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {mode === 'standard' && (
                  <div className="space-y-4">
                    <PaperSizeSelector
                      label="Source Paper Size"
                      value={stdSourcePaper}
                      onChange={(size) => {
                        setStdSourcePaper(size);
                        recalcArrangement(totalPages, size, stdTargetPaper);
                      }}
                    />
                    <PaperSizeSelector
                      label="Target Paper Size"
                      value={stdTargetPaper}
                      onChange={(size) => {
                        setStdTargetPaper(size);
                        recalcArrangement(totalPages, stdSourcePaper, size);
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Gutter / Spacing
                    </label>
                    <span className="text-sm font-semibold text-gray-800">{spacing} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={spacing}
                    onChange={(e) => setSpacing(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0 mm</span>
                    <span>20 mm</span>
                  </div>
                </div>

                {canGenerate && (
                  <button
                    onClick={handleGeneratePDF}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    {processing ? 'Generating...' : 'Download Booklet PDF'}
                  </button>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 h-full">
                  {mode === 'booklet' ? (
                    <BookletExplainer
                      inputPaper={bookletInputPaper}
                      outputPaper={bookletOutputPaper}
                      layout={bookletLayout}
                    />
                  ) : (
                    <StandardExplainer />
                  )}
                </div>
              </div>
            </div>

            {mode === 'standard' && arrangement.length > 0 && (
              <div className="border-t pt-8 mt-8">
                <ArrangementPreview arrangement={arrangement} totalPages={totalPages} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BookletExplainerProps {
  inputPaper: PaperSize;
  outputPaper: PaperSize;
  layout: ReturnType<typeof calculateBookletLayout>;
}

function BookletExplainer({ inputPaper, outputPaper, layout }: BookletExplainerProps) {
  const pagesPerSheet = layout.pagesPerSheet;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Single Page to Booklet</h3>
      <p className="text-xs text-gray-500 leading-relaxed">
        Upload a PDF where each page is a single <strong>{inputPaper.name}</strong> page.
        This tool will rearrange them in booklet imposition order for duplex printing on <strong>{outputPaper.name}</strong>.
      </p>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">How it works</p>
        <ol className="space-y-2 text-xs text-gray-600">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Pages are automatically arranged so when printed duplex and folded, they read in order</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
            <span><strong>{pagesPerSheet} source pages</strong> fit per physical sheet ({layout.pagesPerSide} per side)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
            <span>Print the output PDF <strong>duplex (both sides)</strong>, then fold and saddle-stitch</span>
          </li>
        </ol>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1.5">Example for 16-page booklet</p>
        {pagesPerSheet === 2 ? (
          <table className="w-full text-gray-600">
            <thead>
              <tr className="text-gray-400 border-b">
                <th className="text-left font-medium pb-1">Sheet</th>
                <th className="text-center font-medium pb-1">Front</th>
                <th className="text-center font-medium pb-1">Back</th>
              </tr>
            </thead>
            <tbody className="space-y-1">
              {[
                ['1', '16, 1', '2, 15'],
                ['2', '14, 3', '4, 13'],
                ['3', '12, 5', '6, 11'],
                ['4', '10, 7', '8, 9'],
              ].map(([sheet, front, back]) => (
                <tr key={sheet} className="border-b border-gray-50">
                  <td className="py-0.5 font-medium text-gray-700">Sheet {sheet}</td>
                  <td className="py-0.5 text-center text-blue-700">{front}</td>
                  <td className="py-0.5 text-center text-green-700">{back}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : pagesPerSheet === 4 ? (
          <table className="w-full text-gray-600">
            <thead>
              <tr className="text-gray-400 border-b">
                <th className="text-left font-medium pb-1">Sheet</th>
                <th className="text-center font-medium pb-1">Front (4 pages)</th>
                <th className="text-center font-medium pb-1">Back (4 pages)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['1', '16,1,2,15', '14,3,4,13'],
                ['2', '12,5,6,11', '10,7,8,9'],
              ].map(([sheet, front, back]) => (
                <tr key={sheet} className="border-b border-gray-50">
                  <td className="py-0.5 font-medium text-gray-700">Sheet {sheet}</td>
                  <td className="py-0.5 text-center text-blue-700 text-[10px]">{front}</td>
                  <td className="py-0.5 text-center text-green-700 text-[10px]">{back}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">{pagesPerSheet} source pages per physical sheet</p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
        <strong>Note:</strong> If total pages are not a multiple of {pagesPerSheet}, blank pages will be added automatically.
      </div>
    </div>
  );
}

function StandardExplainer() {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Standard Arrangement</h3>
      <p className="text-xs text-gray-500 leading-relaxed">
        Places source pages sequentially on larger output pages, 2 per side (top and bottom), in reading order.
      </p>
      <ol className="space-y-2 text-xs text-gray-600">
        <li className="flex gap-2">
          <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
          <span>Upload your PDF and set source and target sizes</span>
        </li>
        <li className="flex gap-2">
          <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
          <span>Pages are placed 2 per output sheet side (top + bottom)</span>
        </li>
        <li className="flex gap-2">
          <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
          <span>Preview the layout below, then download and print</span>
        </li>
      </ol>
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-gray-600">
        <p className="font-semibold text-gray-700 mb-1">Example: 8 pages on 13×19</p>
        <ul className="space-y-0.5">
          <li>Sheet 1 front: pages 1 (top) + 3 (bottom)</li>
          <li>Sheet 1 back: pages 2 (top) + 4 (bottom)</li>
          <li>Sheet 2 front: pages 5 (top) + 7 (bottom)</li>
          <li>Sheet 2 back: pages 6 (top) + 8 (bottom)</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
