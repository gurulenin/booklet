import { PaperSize } from '../types';
import { PAPER_SIZES } from '../utils/paperSizes';

interface PaperSizeSelectorProps {
  label: string;
  value: PaperSize;
  onChange: (size: PaperSize) => void;
}

export function PaperSizeSelector({ label, value, onChange }: PaperSizeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value.name}
        onChange={(e) => {
          const selected = PAPER_SIZES.find(s => s.name === e.target.value);
          if (selected) onChange(selected);
        }}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
      >
        {PAPER_SIZES.map(size => (
          <option key={size.name} value={size.name}>
            {size.name} ({size.width} × {size.height} {size.unit})
          </option>
        ))}
      </select>
    </div>
  );
}
