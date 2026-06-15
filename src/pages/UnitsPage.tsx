import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { JsonPreview } from '../components/JsonPreview';
import { NumberStepper } from '../components/NumberStepper';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import type { AppData, Unit } from '../types';
import { createId, nowIso } from '../utils/ids';

interface UnitsPageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
}

export function UnitsPage({ data, setData }: UnitsPageProps) {
  const [selectedId, setSelectedId] = useState(data.units[0]?.id ?? '');
  const unit = data.units.find((candidate) => candidate.id === selectedId) ?? data.units[0];

  useEffect(() => {
    if (!data.units.some((candidate) => candidate.id === selectedId)) {
      setSelectedId(data.units[0]?.id ?? '');
    }
  }, [data.units, selectedId]);

  const updateUnit = (patch: Partial<Unit>) => {
    if (!unit) return;
    setData((current) => {
      const units = current.units.map((candidate) =>
        candidate.id === unit.id ? { ...candidate, ...patch, updatedAt: nowIso() } : candidate,
      );
      const races = current.races.map((race) => ({
        ...race,
        unitIds: units.filter((candidate) => candidate.raceId === race.id).map((candidate) => candidate.id),
        heroUnitId: units.find((candidate) => candidate.raceId === race.id && candidate.isHero)?.id ?? race.heroUnitId,
      }));
      return { ...current, units, races };
    });
  };

  const addUnit = () => {
    const race = data.races[0];
    if (!race || !data.attackTypes[0] || !data.defenseTypes[0]) return;
    const id = createId('unit');
    const nextUnit: Unit = {
      id,
      raceId: race.id,
      name: '새 유닛',
      role: '역할 입력',
      isHero: false,
      hp: 100,
      mp: 0,
      shield: 0,
      attack: 15,
      defense: 2,
      attackType: data.attackTypes[0].id,
      defenseType: data.defenseTypes[0].id,
      range: 1,
      moveSpeed: 3,
      attackSpeed: 1,
      skills: '',
      cost: 100,
      buildTime: 20,
      notes: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setData((current) => ({
      ...current,
      units: [...current.units, nextUnit],
      races: current.races.map((candidate) =>
        candidate.id === race.id ? { ...candidate, unitIds: [...candidate.unitIds, id] } : candidate,
      ),
    }));
    setSelectedId(id);
  };

  const deleteUnit = () => {
    if (!unit) return;
    setData((current) => ({
      ...current,
      units: current.units.filter((candidate) => candidate.id !== unit.id),
      races: current.races.map((race) => ({
        ...race,
        unitIds: race.unitIds.filter((id) => id !== unit.id),
        heroUnitId: race.heroUnitId === unit.id ? '' : race.heroUnitId,
      })),
      battlePresets: current.battlePresets.map((preset) => ({
        ...preset,
        armyA: preset.armyA.filter((entry) => entry.unitId !== unit.id),
        armyB: preset.armyB.filter((entry) => entry.unitId !== unit.id),
      })),
    }));
  };

  if (!unit) {
    return (
      <div className="space-y-4">
        <SectionHeader
          action={
            <button className="btn btn-primary" onClick={addUnit} type="button">
              <Plus size={16} />
              추가
            </button>
          }
          title="유닛"
        />
        <p className="panel text-sm text-muted">유닛이 없습니다. 먼저 종족과 타입을 만든 뒤 유닛을 추가하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        action={
          <button className="btn btn-primary" onClick={addUnit} type="button">
            <Plus size={16} />
            추가
          </button>
        }
        subtitle="폼으로 편집하고 JSON 미리보기로 원본 구조를 확인합니다."
        title="유닛 관리"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {data.units.map((candidate) => (
          <button
            className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${
              candidate.id === unit.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-panel text-muted'
            }`}
            key={candidate.id}
            onClick={() => setSelectedId(candidate.id)}
            type="button"
          >
            {candidate.isHero ? '★ ' : ''}
            {candidate.name}
          </button>
        ))}
      </div>

      <section className="panel space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="이름" onChange={(name) => updateUnit({ name })} value={unit.name} />
          <TextField label="역할" onChange={(role) => updateUnit({ role })} value={unit.role} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">종족</span>
            <select className="field" onChange={(event) => updateUnit({ raceId: event.target.value })} value={unit.raceId}>
              {data.races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-md border border-line bg-[#0f141d] p-3 text-sm text-ink">
            <input checked={unit.isHero} onChange={(event) => updateUnit({ isHero: event.target.checked })} type="checkbox" />
            영웅 유닛
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberStepper label="HP" onChange={(hp) => updateUnit({ hp })} value={unit.hp} />
          <NumberStepper label="MP" onChange={(mp) => updateUnit({ mp })} value={unit.mp} />
          <NumberStepper label="Shield" onChange={(shield) => updateUnit({ shield })} value={unit.shield} />
          <NumberStepper label="공격력" onChange={(attack) => updateUnit({ attack })} value={unit.attack} />
          <NumberStepper label="방어력" onChange={(defense) => updateUnit({ defense })} value={unit.defense} />
          <NumberStepper label="사거리" min={1} onChange={(range) => updateUnit({ range })} value={unit.range} />
          <NumberStepper label="이속" onChange={(moveSpeed) => updateUnit({ moveSpeed })} step={0.1} value={unit.moveSpeed} />
          <NumberStepper
            label="공속"
            min={0.1}
            onChange={(attackSpeed) => updateUnit({ attackSpeed })}
            step={0.05}
            value={unit.attackSpeed}
          />
          <NumberStepper label="비용" onChange={(cost) => updateUnit({ cost })} value={unit.cost} />
          <NumberStepper label="생산시간" onChange={(buildTime) => updateUnit({ buildTime })} value={unit.buildTime} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">공격 타입</span>
            <select className="field" onChange={(event) => updateUnit({ attackType: event.target.value })} value={unit.attackType}>
              {data.attackTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">방어 타입</span>
            <select className="field" onChange={(event) => updateUnit({ defenseType: event.target.value })} value={unit.defenseType}>
              {data.defenseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <TextField label="스킬" multiline onChange={(skills) => updateUnit({ skills })} value={unit.skills} />
        <TextField label="메모" multiline onChange={(notes) => updateUnit({ notes })} value={unit.notes} />
        <JsonPreview value={unit} />

        <button className="btn btn-danger w-full" onClick={deleteUnit} type="button">
          <Trash2 size={16} />
          유닛 삭제
        </button>
      </section>
    </div>
  );
}
