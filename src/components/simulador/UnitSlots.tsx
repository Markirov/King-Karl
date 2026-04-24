import { Upload } from 'lucide-react';

interface Props {
  slotNames:    string[];
  slotCount:    number;
  activeIndex:  number;
  onSelectIndex: (i: number) => void;
  onFileUpload:  (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UnitSlots({ slotNames, slotCount, activeIndex, onSelectIndex, onFileUpload }: Props) {
  return (
    <div className="flex items-center gap-3">

      {/* Slot buttons */}
      <div className="flex bg-surface-container-low p-1 clip-chamfer gap-1">
        {Array.from({ length: slotCount }).map((_, idx) => (
          <button key={idx} onClick={() => onSelectIndex(idx)}
            className={`w-8 h-8 flex items-center justify-center font-mono text-xs transition-all relative group ${
              activeIndex === idx ? 'bg-primary text-on-primary' : 'text-secondary hover:bg-secondary/20'
            }`}
          >
            {idx + 1}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-surface-container-highest text-primary px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-primary/20 shadow-xl">
              {slotNames[idx]}
            </div>
          </button>
        ))}
      </div>

      {/* Upload */}
      <label className="p-2 text-primary-container hover:bg-primary-container/10 transition-all cursor-pointer" title="Cargar archivo">
        <Upload size={20} strokeWidth={1.5} />
        <input type="file" accept=".ssw,.mtf,.saw" className="hidden" onChange={onFileUpload} />
      </label>
    </div>
  );
}
