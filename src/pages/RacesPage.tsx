import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import type { AppData, Race } from '../types';
import { createId, nowIso } from '../utils/ids';

interface RacesPageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
}

export function RacesPage({ data, setData }: RacesPageProps) {
  const [selectedId, setSelectedId] = useState(data.races[0]?.id ?? '');
  const race = data.races.find((candidate) => candidate.id === selectedId) ?? data.races[0];
  const raceUnits = data.units.filter((unit) => unit.raceId === race?.id);

  useEffect(() => {
    if (!data.races.some((candidate) => candidate.id === selectedId)) {
      setSelectedId(data.races[0]?.id ?? '');
    }
  }, [data.races, selectedId]);

  const updateRace = (patch: Partial<Race>) => {
    if (!race) return;
    setData((current) => ({
      ...current,
      races: current.races.map((candidate) =>
        candidate.id === race.id ? { ...candidate, ...patch, updatedAt: nowIso() } : candidate,
      ),
    }));
  };

  const addRace = () => {
    const id = createId('race');
    const nextRace: Race = {
      id,
      name: '새 종족',
      concept: '컨셉 입력',
      description: '',
      traitIds: [],
      unitIds: [],
      heroUnitId: '',
      notes: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setData((current) => ({ ...current, races: [...current.races, nextRace] }));
    setSelectedId(id);
  };

  const deleteRace = () => {
    if (!race) return;
    setData((current) => ({
      ...current,
      races: current.races.filter((candidate) => candidate.id !== race.id),
      units: current.units.filter((unit) => unit.raceId !== race.id),
      battlePresets: current.battlePresets.filter(
        (preset) => preset.raceAId !== race.id && preset.raceBId !== race.id,
      ),
    }));
  };

  if (!race) {
    return (
      <div className="space-y-4">
        <SectionHeader
          action={
            <button className="btn btn-primary" onClick={addRace} type="button">
              <Plus size={16} />
              추가
            </button>
          }
          title="종족"
        />
        <p className="panel text-sm text-muted">종족이 없습니다. 새 종족을 추가하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        action={
          <button className="btn btn-primary" onClick={addRace} type="button">
            <Plus size={16} />
            추가
          </button>
        }
        subtitle="종족 컨셉, 특성, 대표 영웅, 메모를 관리합니다."
        title="종족 관리"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {data.races.map((candidate) => (
          <button
            className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${
              candidate.id === race.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-panel text-muted'
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
        <TextField label="이름" onChange={(name) => updateRace({ name })} value={race.name} />
        <TextField label="컨셉" onChange={(concept) => updateRace({ concept })} value={race.concept} />
        <TextField
          label="설명"
          multiline
          onChange={(description) => updateRace({ description })}
          value={race.description}
        />

        <label className="block">
          <span className="label">종족 특성</span>
          <div className="grid gap-2">
            {data.traits.map((trait) => {
              const checked = race.traitIds.includes(trait.id);
              return (
                <label className="flex items-start gap-2 rounded-md border border-line bg-[#0f141d] p-3" key={trait.id}>
                  <input
                    checked={checked}
                    className="mt-1"
                    onChange={() =>
                      updateRace({
                        traitIds: checked
                          ? race.traitIds.filter((id) => id !== trait.id)
                          : [...race.traitIds, trait.id],
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
          <span className="label">영웅 유닛</span>
          <select className="field" onChange={(event) => updateRace({ heroUnitId: event.target.value })} value={race.heroUnitId}>
            <option value="">없음</option>
            {raceUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="label">소속 유닛</span>
          <div className="flex flex-wrap gap-2">
            {raceUnits.map((unit) => (
              <span className="chip" key={unit.id}>
                {unit.isHero ? '★ ' : ''}
                {unit.name}
              </span>
            ))}
            {raceUnits.length === 0 ? <span className="text-sm text-muted">아직 유닛이 없습니다.</span> : null}
          </div>
        </div>

        <TextField label="메모" multiline onChange={(notes) => updateRace({ notes })} value={race.notes} />

        <button className="btn btn-danger w-full" onClick={deleteRace} type="button">
          <Trash2 size={16} />
          종족 삭제
        </button>
      </section>
    </div>
  );
}
