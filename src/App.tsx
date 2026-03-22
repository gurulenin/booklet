import { useState } from 'react';
import { FileUp, Download, Printer } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { PaperSize, PageArrangement } from './types';
import { PAPER_SIZES } from './utils/paperSizes';
import { loadPDF, calculatePageArrangement, generateArrangedPDF, generateA5BookletPDF } from './services/pdfProcessor';
import { PaperSizeSelector } from './components/PaperSizeSelector';
import { ArrangementPreview } from './components/ArrangementPreview';

type Mode = 'standard' | 'a5-booklet';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [sourcePdf, setSourcePdf] = useState<PDFDocument | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [sourcePaper, setSourcePaper] = useState<PaperSize>(PAPER_SIZES[3]);
  const [targetPaper, setTargetPaper] = useState<PaperSize>(PAPER_SIZES[10]);
  const [arrangement, setArrangement] = useState<PageArrangement[]>([]);
  const [processing, setProcessing] = useState(false);
  const [spacing, setSpacing] = useState(10);
  const [mode, setMode] = useState<Mode>('standard');

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
        const arr = calculatePageArrangement(pageCount, sourcePaper, targetPaper);
        setArrangement(arr);
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaperChange = () => {
    if (totalPages > 0 && mode === 'standard') {
      const arr = calculatePageArrangement(totalPages, sourcePaper, targetPaper);
      setArrangement(arr);
    }
  };

  const handleGeneratePDF = async () => {
    if (!sourcePdf) return;

    setProcessing(true);

    try {
      let outputPdfBytes: Uint8Array;

      if (mode === 'a5-booklet') {
        outputPdfBytes = await generateA5BookletPDF(sourcePdf, spacing);
      } else {
        if (arrangement.length === 0) return;
        outputPdfBytes = await generateArrangedPDF(sourcePdf, targetPaper, arrangement, spacing);
      }

      const blob = new Blob([outputPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `arranged-${file?.name || 'booklet.pdf'}`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const canGenerate = sourcePdf && (mode === 'a5-booklet' ? true : arrangement.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center gap-3">
              <Printer className="w-8 h-8 text-white" />
              <h1 className="text-3xl font-bold text-white">Booklet Print Arranger</h1>
            </div>
            <p className="text-blue-100 mt-2">
              Arrange multiple pages on larger paper for efficient booklet printing
            </p>
          </div>

          <div className="p-8">
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Mode</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('standard')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                    mode === 'standard'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Standard Arrangement
                </button>
                <button
                  onClick={() => setMode('a5-booklet')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                    mode === 'a5-booklet'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  A5 Single-Page to 13x19 Booklet
                </button>
              </div>
              {mode === 'a5-booklet' && (
                <p className="mt-2 text-xs text-gray-500">
                  Converts A5 single-page PDFs directly into booklet imposition order, 2 pages per side on 13x19 landscape sheets.
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Upload PDF Booklet
                  </label>
                  <div className="relative">
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
                      <FileUp className="w-6 h-6 text-blue-600" />
                      <span className="text-gray-700 font-medium">
                        {file ? file.name : 'Choose PDF file'}
                      </span>
                    </label>
                  </div>
                  {totalPages > 0 && (
                    <p className="mt-3 text-sm text-gray-600">
                      Loaded: {totalPages} pages
                    </p>
                  )}
                </div>

                {mode === 'standard' && (
                  <>
                    <PaperSizeSelector
                      label="Source Paper Size"
                      value={sourcePaper}
                      onChange={(size) => {
                        setSourcePaper(size);
                        handlePaperChange();
                      }}
                    />

                    <PaperSizeSelector
                      label="Target Paper Size"
                      value={targetPaper}
                      onChange={(size) => {
                        setTargetPaper(size);
                        handlePaperChange();
                      }}
                    />
                  </>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Space Between Pages (mm): {spacing}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={spacing}
                    onChange={(e) => setSpacing(Number(e.target.value))}
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>No space</span>
                    <span>30mm</span>
                  </div>
                </div>

                {canGenerate && (
                  <button
                    onClick={handleGeneratePDF}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    <Download className="w-5 h-5" />
                    {processing ? 'Processing...' : 'Download Arranged PDF'}
                  </button>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                {mode === 'a5-booklet' ? (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-3">A5 to 13x19 Booklet Mode</h3>
                    <ol className="space-y-3 text-sm text-gray-600">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        <span>Upload your A5 single-page PDF (pages in reading order)</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        <span>Adjust spacing between pages if needed</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        <span>Download the output — pages will be rearranged in booklet imposition order, 2-up on 13x19 landscape sheets</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        <span>Print duplex, fold, and saddle-stitch to create a finished booklet</span>
                      </li>
                    </ol>
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Example:</strong> For a 16-page A5 booklet:
                      </p>
                      <ul className="mt-2 text-xs text-gray-600 space-y-1 ml-4">
                        <li>• Sheet 1 front: page 16 (left) + page 1 (right)</li>
                        <li>• Sheet 1 back: page 2 (left) + page 15 (right)</li>
                        <li>• Sheet 2 front: page 14 (left) + page 3 (right)</li>
                        <li>• Sheet 2 back: page 4 (left) + page 13 (right)</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-3">How it works</h3>
                    <ol className="space-y-3 text-sm text-gray-600">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        <span>Upload your PDF booklet in its original format</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        <span>Select the source paper size of your PDF</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        <span>Choose the target paper size for printing</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        <span>Preview the page arrangement</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                        <span>Download and print your arranged PDF</span>
                      </li>
                    </ol>
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Example:</strong> For a 12-page A4 landscape booklet printed on 13x19 paper:
                      </p>
                      <ul className="mt-2 text-xs text-gray-600 space-y-1 ml-4">
                        <li>• Pages 1-2 on top, 3-4 on bottom (Sheet 1 front)</li>
                        <li>• Pages 5-6 on top, 7-8 on bottom (Sheet 1 back)</li>
                        <li>• Pages 9-10 on top, 11-12 on bottom (Sheet 2 front)</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>

            {mode === 'standard' && arrangement.length > 0 && (
              <div className="border-t pt-8">
                <ArrangementPreview arrangement={arrangement} totalPages={totalPages} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
