import { useState } from 'react';
import { FileUp, Download, Printer } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { PaperSize, PageArrangement } from './types';
import { PAPER_SIZES } from './utils/paperSizes';
import { loadPDF, calculatePageArrangement, generateArrangedPDF } from './services/pdfProcessor';
import { PaperSizeSelector } from './components/PaperSizeSelector';
import { ArrangementPreview } from './components/ArrangementPreview';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [sourcePdf, setSourcePdf] = useState<PDFDocument | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [sourcePaper, setSourcePaper] = useState<PaperSize>(PAPER_SIZES[1]);
  const [targetPaper, setTargetPaper] = useState<PaperSize>(PAPER_SIZES[8]);
  const [arrangement, setArrangement] = useState<PageArrangement[]>([]);
  const [processing, setProcessing] = useState(false);
  const [spacing, setSpacing] = useState(10);

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

      const arr = calculatePageArrangement(pageCount, sourcePaper, targetPaper);
      setArrangement(arr);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaperChange = () => {
    if (totalPages > 0) {
      const arr = calculatePageArrangement(totalPages, sourcePaper, targetPaper);
      setArrangement(arr);
    }
  };

  const handleGeneratePDF = async () => {
    if (!sourcePdf || arrangement.length === 0) return;

    setProcessing(true);

    try {
      const outputPdfBytes = await generateArrangedPDF(sourcePdf, targetPaper, arrangement, spacing);
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

                {arrangement.length > 0 && (
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
                    <strong>Example:</strong> For a 12-page A4 landscape booklet printed on 13×19 paper:
                  </p>
                  <ul className="mt-2 text-xs text-gray-600 space-y-1 ml-4">
                    <li>• Pages 1-2 on top, 3-4 on bottom (Sheet 1 front)</li>
                    <li>• Pages 5-6 on top, 7-8 on bottom (Sheet 1 back)</li>
                    <li>• Pages 9-10 on top, 11-12 on bottom (Sheet 2 front)</li>
                  </ul>
                </div>
              </div>
            </div>

            {arrangement.length > 0 && (
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
