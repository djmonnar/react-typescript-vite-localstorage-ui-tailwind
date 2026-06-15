import { Play, Repeat } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NumberStepper } from '../components/NumberStepper';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import { simulateBattle, simulateMany } from '../simulation/battle';
import type { AppData, ArmyEntry, BattlePreset } from '../types';
import { createId } from '../utils/ids';

interface BattlePageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
  goLogs: () => void;
}

export function BattlePage({ data, setData, goLogs }: BattlePageProps) {
  const [presetId, setPresetId] = useState(data.battlePresets[0]?.id ?? '');
  const preset = data.battlePresets.find((candidate) => candidate.id === presetId) ?? data.battlePresets[0];
  const factionA = data.races.find((race) => race.id === preset?.raceAId) ?? data.races[0];
  const factionB = data.races.find((race) => race.id === preset?.raceBId) ?? data.races[1] ?? data.races[0];
  const unitsA = useMemo(() => data.units.filter((unit) => unit.raceId === factionA?.id), [data.units, factionA?.id]);
  const unitsB = useMemo(() => data.units.filter((unit) => unit.raceId === factionB?.id), [data.units, factionB?.id]);

  useEffect(() => {
    if (!data.battlePresets.some((candidate) => candidate.id === presetId)) {
      setPresetId(data.battlePresets[0]?.id ?? '');
    }
  }, [data.battlePresets, presetId]);

  const updatePreset = (patch: Partial<BattlePreset>) => {
    if (!preset) return;
    setData((current) => ({
      ...current,
      battlePresets: current.battlePresets.map((candidate) =>
        candidate.id === preset.id ? { ...candidate, ...patch } : candidate,
      ),
    }));
  };

  const addPreset = () => {
    if (!data.races[0]) return;
    const id = createId('preset');
    const nextPreset: BattlePreset = {
      id,
      name: '새 전투',
      raceAId: data.races[0].id,
      raceBId: data.races[1]?.id ?? data.races[0].id,
      armyA: [],
      armyB: [],
      notes: '',
    };
    setData((current) => ({ ...current, battlePresets: [...current.battlePresets, nextPreset] }));
    setPresetId(id);
  };

  const setArmyCount = (side: 'A' | 'B', unitId: string, count: number) => {
    if (!preset) return;
    const key = side === 'A' ? 'armyA' : 'armyB';
    const entries = preset[key].filter((entry) => entry.unitId !== unitId);
    if (count > 0) entries.push({ unitId, count });
    updatePreset({ [key]: entries } as Pick<BattlePreset, 'armyA' | 'armyB'>);
  };

  const runOnce = () => {
    if (!preset) return;
    const result = simulateBattle(data, preset, true);
    setData((current) => ({ ...current, lastResult: result }));
    goLogs();
  };

  const runMany = () => {
    if (!preset) return;
    const result = simulateMany(data, preset, 100);
    setData((current) => ({ ...current, lastResult: result }));
    goLogs();
  };

  if (!preset) {
    return (
      <div className="space-y-4">
        <SectionHeader
          action={
          <button className="btn btn-primary" onClick={addPreset} type="button">
            전투 추가
          </button>
        }
        title="전투 시뮬레이션"
        />
        <p className="panel text-sm text-muted">전투 프리셋이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        action={
          <button className="btn btn-primary" onClick={addPreset} type="button">
            전투 추가
          </button>
        }
        subtitle="두 팩션의 편성 수량을 정하고 자동 전투를 실행합니다."
        title="전투 시뮬레이션"
      />

      <section className="panel space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.battlePresets.map((candidate) => (
            <button
              className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${
                candidate.id === preset.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'
              }`}
              key={candidate.id}
              onClick={() => setPresetId(candidate.id)}
              type="button"
            >
              {candidate.name}
            </button>
          ))}
        </div>

        <TextField label="프리셋 이름" onChange={(name) => updatePreset({ name })} value={preset.name} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">A 팩션</span>
            <select
              className="field"
              onChange={(event) => updatePreset({ raceAId: event.target.value, armyA: [] })}
              value={preset.raceAId}
            >
              {data.races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">B 팩션</span>
            <select
              className="field"
              onChange={(event) => updatePreset({ raceBId: event.target.value, armyB: [] })}
              value={preset.raceBId}
            >
              {data.races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TextField label="메모" multiline onChange={(notes) => updatePreset({ notes })} value={preset.notes} />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ArmyEditor
          army={preset.armyA}
          label={`A: ${factionA?.name ?? '없음'}`}
          onChange={(unitId, count) => setArmyCount('A', unitId, count)}
          units={unitsA}
        />
        <ArmyEditor
          army={preset.armyB}
          label={`B: ${factionB?.name ?? '없음'}`}
          onChange={(unitId, count) => setArmyCount('B', unitId, count)}
          units={unitsB}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button className="btn btn-primary min-h-14" onClick={runOnce} type="button">
          <Play size={18} />
          1회 전투
        </button>
        <button className="btn min-h-14 border-amber/60 bg-amber/10 text-amber" onClick={runMany} type="button">
          <Repeat size={18} />
          100회 반복
        </button>
      </section>
    </div>
  );
}

interface ArmyEditorProps {
  label: string;
  units: AppData['units'];
  army: ArmyEntry[];
  onChange: (unitId: string, count: number) => void;
}

function ArmyEditor({ label, units, army, onChange }: ArmyEditorProps) {
  return (
    <section className="panel space-y-3">
      <h3 className="font-semibold text-ink">{label}</h3>
      {units.map((unit) => (
        <div className="rounded-md border border-line bg-[#0f141d] p-2" key={unit.id}>
          <div className="grid grid-cols-[1fr_112px] items-center gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {unit.isHero ? '★ ' : ''}
                {unit.name}
              </p>
              <p className="text-xs text-muted">
                {unit.role} · HP {unit.hp} · 공격 {unit.attack}
              </p>
              {unit.tags.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {unit.tags.slice(0, 4).map((tag) => (
                    <span className="chip text-[9px]" key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
            </div>
            <NumberStepper label="수량" onChange={(count) => onChange(unit.id, count)} value={countForLocal(army, unit.id)} />
          </div>
        </div>
      ))}
      {units.length === 0 ? <p className="text-sm text-muted">선택한 팩션에 유닛이 없습니다.</p> : null}
    </section>
  );
}

function countForLocal(army: ArmyEntry[], unitId: string) {
  return army.find((entry) => entry.unitId === unitId)?.count ?? 0;
}
