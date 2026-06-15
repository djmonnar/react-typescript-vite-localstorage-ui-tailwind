import { useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { usePersistentData } from './hooks/usePersistentData';
import { BattlePage } from './pages/BattlePage';
import { FactionsPage } from './pages/FactionsPage';
import { LogsPage } from './pages/LogsPage';
import { TypesPage } from './pages/TypesPage';
import { UnitsPage } from './pages/UnitsPage';
import type { TabKey } from './types';

const pageTitle: Record<TabKey, string> = {
  races: 'FACTION.DATA',
  units: 'UNIT.EDITOR',
  types: 'TYPE.MATRIX',
  battle: 'BATTLE.SIM',
  logs: 'RESULT.LOG',
};

export function App() {
  const [tab, setTab] = useState<TabKey>('races');
  const { data, setData, replaceData, resetData } = usePersistentData();
  const counts = useMemo(
    () => `${data.races.length} factions / ${data.units.length} units / ${data.traits.length} traits`,
    [data.races.length, data.traits.length, data.units.length],
  );

  return (
    <div className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 border-b border-line bg-[#0b0f16]/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold text-cyan">{pageTitle[tab]}</p>
              <h1 className="mt-1 text-xl font-black text-ink">팩션 전투 실험실</h1>
            </div>
            <div className="hidden rounded-md border border-line bg-panel px-3 py-2 font-mono text-xs text-muted sm:block">
              {counts}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {tab === 'races' ? <FactionsPage data={data} setData={setData} /> : null}
        {tab === 'units' ? <UnitsPage data={data} setData={setData} /> : null}
        {tab === 'types' ? <TypesPage data={data} setData={setData} /> : null}
        {tab === 'battle' ? <BattlePage data={data} goLogs={() => setTab('logs')} setData={setData} /> : null}
        {tab === 'logs' ? (
          <LogsPage data={data} replaceData={replaceData} resetData={resetData} setData={setData} />
        ) : null}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
