import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import type { AppData, Race } from '../types';
import { createId, nowIso } from '../utils/ids';

interface FactionsPageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
}

export function FactionsPage({ data, setData }: FactionsPageProps) {
  const [selectedId, setSelectedId] = useState(data.races[0]?.id ?? '');
  const faction = data.races.find((candidate) => candidate.id === selectedId) ?? data.races[0];
  const factionUnits = data.units.filter((unit) => unit.raceId === faction?.id);

  useEffect(() => {
    if (!data.races.some((candidate) => candidate.id === selectedId)) {
      setSelectedId(data.races[0]?.id ?? '');
    }
  }, [data.races, selectedId]);

  const updateFaction = (patch: Partial<Race>) => {
    if (!faction) return;
    setData((current) => ({
      ...current,
      races: current.races.map((candidate) =>
        candidate.id === faction.id ? { ...candidate, ...patch, updatedAt: nowIso() } : candidate,
      ),
    }));
  };

  const addFaction = () => {
    const id = createId('race');
    const nextFaction: Race = {
      id,
      name: '새 팩션',
      concept: '팩션 컨셉 입력',
      description: '',
      traitIds: [],
      unitIds: [],
      heroUnitId: '',
      notes: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setData((current) => ({ ...current, races: [...current.races, nextFaction] }));
    setSelectedId(id);
  };

  const deleteFaction = () => {
    if (!faction) return;
    setData((current) => ({
      ...current,
      races: current.races.filter((candidate) => candidate.id !== faction.id),
      units: current.units.filter((unit) => unit.raceId !== faction.id),
      battlePresets: current.battlePresets.filter(
        (preset) => preset.raceAId !== faction.id && preset.raceBId !== faction.id,
      ),
    }));
  };

  if (!faction) {
    return (
      <div className="space-y-4">
        <SectionHeader
          action={
            <button className="btn btn-primary" onClick={addFaction} type="button">
              <Plus size={16} />
              추가
            </button>
          }
          title="팩션"
        />
        <p className="panel text-sm text-muted">팩션이 없습니다. 새 팩션을 추가하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        action={
          <button className="btn btn-primary" onClick={addFaction} type="button">
            <Plus size={16} />
            추가
          </button>
        }
        subtitle="팩션 컨셉, 특성, 대표 영웅, 메모를 관리합니다."
        title="팩션 관리"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {data.races.map((candidate) => (
          <button
            className={`min-h-11 shrink-0 rounded-md border px-4 py-2 text-sm font-semibold ${
              candidate.id === faction.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-panel text-muted'
            }`}
            key={candidate.id}
            onClick={() => setSelectedId(candidate.id)}
            type="button"
          >
            {candidate.name}
          </button>
        ))}
      </div>

      <section className="panel space-y-3">
        <TextField label="팩션명" onChange={(name) => updateFaction({ name })} value={faction.name} />
        <TextField label="팩션 컨셉" onChange={(concept) => updateFaction({ concept })} value={faction.concept} />
        <TextField
          label="팩션 설명"
          multiline
          onChange={(description) => updateFaction({ description })}
          value={faction.description}
        />

        <label className="block">
          <span className="label">팩션 특성</span>
          <div className="grid gap-2">
            {data.traits.map((trait) => {
              const checked = faction.traitIds.includes(trait.id);
              return (
                <label className="flex items-start gap-2 rounded-md border border-line bg-[#0f141d] p-3" key={trait.id}>
                  <input
                    checked={checked}
                    className="mt-1"
                    onChange={() =>
                      updateFaction({
                        traitIds: checked
                          ? faction.traitIds.filter((id) => id !== trait.id)
                          : [...faction.traitIds, trait.id],
                      })
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{trait.name}</span>
                    <span className="block text-xs text-muted">{trait.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </label>

        <label className="block">
          <span className="label">대표 영웅 유닛</span>
          <select
            className="field"
            onChange={(event) => updateFaction({ heroUnitId: event.target.value })}
            value={faction.heroUnitId}
          >
            <option value="">없음</option>
            {factionUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="label">소속 유닛</span>
          <div className="flex flex-wrap gap-2">
            {factionUnits.map((unit) => (
              <span className="chip" key={unit.id}>
                {unit.isHero ? 'HERO ' : ''}
                {unit.name}
              </span>
            ))}
            {factionUnits.length === 0 ? <span className="text-sm text-muted">아직 유닛이 없습니다.</span> : null}
          </div>
        </div>

        <TextField label="팩션 메모" multiline onChange={(notes) => updateFaction({ notes })} value={faction.notes} />

        <button className="btn btn-danger w-full" onClick={deleteFaction} type="button">
          <Trash2 size={16} />
          팩션 삭제
        </button>
      </section>
    </div>
  );
}
