import { PageArrangement } from '../types';

interface ArrangementPreviewProps {
  arrangement: PageArrangement[];
  totalPages: number;
}

export function ArrangementPreview({ arrangement, totalPages }: ArrangementPreviewProps) {
  const outputPages = Math.max(...arrangement.map(a => a.outputPage));
  const sheets = Array.from({ length: outputPages }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Print Layout Preview</h3>
      <div className="text-sm text-gray-600 mb-4">
        <p>Total source pages: {totalPages}</p>
        <p>Total sheets needed: {outputPages}</p>
        <p>Pages per sheet: 4 (2 front + 2 back)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sheets.map(sheetNum => {
          const frontPages = arrangement.filter(a => a.outputPage === sheetNum && a.side === 'front');
          const backPages = arrangement.filter(a => a.outputPage === sheetNum && a.side === 'back');

          return (
            <div key={sheetNum} className="border-2 border-gray-300 rounded-lg p-4 bg-white shadow-sm">
              <h4 className="font-semibold text-center mb-3 text-gray-700">Sheet {sheetNum}</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-center text-gray-600">FRONT</p>
                  <div className="border-2 border-blue-400 rounded p-2 bg-blue-50 aspect-[3/4]">
                    {frontPages.map(page => (
                      <div
                        key={`${page.outputPage}-${page.side}-${page.position}`}
                        className={`border border-blue-600 bg-white rounded p-2 text-center text-xs font-medium ${
                          page.position === 'top' ? 'mb-1' : 'mt-1'
                        } h-[45%]`}
                      >
                        <div className="text-blue-700">Page {page.sourcePage}</div>
                        <div className="text-[10px] text-gray-500">{page.position}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-center text-gray-600">BACK</p>
                  <div className="border-2 border-green-400 rounded p-2 bg-green-50 aspect-[3/4]">
                    {backPages.map(page => (
                      <div
                        key={`${page.outputPage}-${page.side}-${page.position}`}
                        className={`border border-green-600 bg-white rounded p-2 text-center text-xs font-medium ${
                          page.position === 'top' ? 'mb-1' : 'mt-1'
                        } h-[45%]`}
                      >
                        <div className="text-green-700">Page {page.sourcePage}</div>
                        <div className="text-[10px] text-gray-500">{page.position}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
