import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export function NumberStepper({ label, value, min = 0, max, step = 1, onChange }: NumberStepperProps) {
  const clamp = (nextValue: number) => {
    const lowered = Math.max(min, nextValue);
    return max === undefined ? lowered : Math.min(max, lowered);
  };

  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="grid grid-cols-[44px_1fr_44px] overflow-hidden rounded-md border border-line bg-[#0f141d]">
        <button
          aria-label={`${label} 감소`}
          className="flex min-h-11 items-center justify-center border-r border-line text-muted"
          onClick={() => onChange(clamp(Number((value - step).toFixed(2))))}
          type="button"
        >
          <Minus size={16} />
        </button>
        <input
          className="min-w-0 bg-transparent px-2 text-center text-sm text-ink outline-none"
          inputMode="decimal"
          onChange={(event) => onChange(clamp(Number(event.target.value) || 0))}
          type="number"
          value={value}
        />
        <button
          aria-label={`${label} 증가`}
          className="flex min-h-11 items-center justify-center border-l border-line text-muted"
          onClick={() => onChange(clamp(Number((value + step).toFixed(2))))}
          type="button"
        >
          <Plus size={16} />
        </button>
      </div>
    </label>
  );
}
