import { BookOpen, Bot, Crosshair, FileText, Swords } from 'lucide-react';
import type { TabKey } from '../types';

interface BottomNavProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: Array<{ key: TabKey; label: string; icon: typeof BookOpen }> = [
  { key: 'races', label: '팩션', icon: BookOpen },
  { key: 'units', label: '유닛', icon: Bot },
  { key: 'types', label: '상성', icon: Crosshair },
  { key: 'battle', label: '전투', icon: Swords },
  { key: 'logs', label: '로그', icon: FileText },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-[#0b0f16]/95 px-2 pt-1 backdrop-blur pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-semibold ${
                isActive ? 'bg-cyan/15 text-cyan' : 'text-muted'
              }`}
              key={tab.key}
              onClick={() => onChange(tab.key)}
              type="button"
            >
              <Icon aria-hidden="true" size={19} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
