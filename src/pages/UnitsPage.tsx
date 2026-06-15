import { Copy, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { JsonPreview } from '../components/JsonPreview';
import { NumberStepper } from '../components/NumberStepper';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import { defaultUnitTags } from '../data/defaultTags';
import type { AppData, Race, Unit } from '../types';
import { createId, nowIso } from '../utils/ids';

interface UnitsPageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
}

export function UnitsPage({ data, setData }: UnitsPageProps) {
  const [selectedFactionId, setSelectedFactionId] = useState(data.races[0]?.id ?? '');
  const [tagInput, setTagInput] = useState('');
  const selectedFaction = data.races.find((candidate) => candidate.id === selectedFactionId) ?? data.races[0];
  const factionUnits = useMemo(
    () => data.units.filter((unit) => unit.raceId === selectedFaction?.id),
    [data.units, selectedFaction?.id],
  );
  const availableTags = useMemo(() => {
    const customTags = data.units.flatMap((unit) => unit.tags ?? []);
    return [...new Set([...defaultUnitTags, ...customTags])];
  }, [data.units]);
  const [selectedUnitId, setSelectedUnitId] = useState(factionUnits[0]?.id ?? '');
  const selectedUnit = factionUnits.find((candidate) => candidate.id === selectedUnitId);

  useEffect(() => {
    if (!data.races.some((candidate) => candidate.id === selectedFactionId)) {
      setSelectedFactionId(data.races[0]?.id ?? '');
    }
  }, [data.races, selectedFactionId]);

  useEffect(() => {
    if (!factionUnits.some((candidate) => candidate.id === selectedUnitId)) {
      setSelectedUnitId(factionUnits[0]?.id ?? '');
    }
  }, [factionUnits, selectedUnitId]);

  const syncFactionUnitIds = (units: Unit[], factions: Race[]) =>
    factions.map((faction) => {
      const factionUnitIds = units.filter((unit) => unit.raceId === faction.id).map((unit) => unit.id);
      const heroStillValid = faction.heroUnitId && factionUnitIds.includes(faction.heroUnitId);
      return {
        ...faction,
        unitIds: factionUnitIds,
        heroUnitId: heroStillValid ? faction.heroUnitId : '',
        updatedAt: nowIso(),
      };
    });

  const updateUnit = (patch: Partial<Unit>) => {
    if (!selectedUnit) return;
    setData((current) => {
      const units = current.units.map((candidate) =>
        candidate.id === selectedUnit.id ? { ...candidate, ...patch, updatedAt: nowIso() } : candidate,
      );
      return { ...current, units, races: syncFactionUnitIds(units, current.races) };
    });
    if (patch.raceId) {
      setSelectedFactionId(patch.raceId);
    }
  };

  const addUnit = () => {
    if (!selectedFaction || !data.attackTypes[0] || !data.defenseTypes[0]) return;
    const id = createId('unit');
    const nextUnit: Unit = {
      id,
      raceId: selectedFaction.id,
      name: '새 유닛',
      role: '기본 유닛',
      isHero: false,
      hp: 100,
      mp: 0,
      shield: 0,
      attack: 10,
      defense: 2,
      attackType: data.attackTypes[0].id,
      defenseType: data.defenseTypes[0].id,
      range: 1,
      moveSpeed: 1,
      attackSpeed: 1,
      tags: [],
      skills: '',
      cost: 50,
      buildTime: 10,
      notes: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setData((current) => {
      const units = [...current.units, nextUnit];
      return { ...current, units, races: syncFactionUnitIds(units, current.races) };
    });
    setSelectedUnitId(id);
  };

  const duplicateUnit = () => {
    if (!selectedUnit || !selectedFaction) return;
    const id = createId('unit');
    const copiedUnit: Unit = {
      ...selectedUnit,
      id,
      raceId: selectedFaction.id,
      name: `${selectedUnit.name} 복제`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setData((current) => {
      const units = [...current.units, copiedUnit];
      return { ...current, units, races: syncFactionUnitIds(units, current.races) };
    });
    setSelectedUnitId(id);
  };

  const deleteUnit = () => {
    if (!selectedUnit) return;
    const nextSelectedId = factionUnits.find((candidate) => candidate.id !== selectedUnit.id)?.id ?? '';
    setData((current) => {
      const units = current.units.filter((candidate) => candidate.id !== selectedUnit.id);
      return {
        ...current,
        units,
        races: syncFactionUnitIds(units, current.races),
        battlePresets: current.battlePresets.map((preset) => ({
          ...preset,
          armyA: preset.armyA.filter((entry) => entry.unitId !== selectedUnit.id),
          armyB: preset.armyB.filter((entry) => entry.unitId !== selectedUnit.id),
        })),
      };
    });
    setSelectedUnitId(nextSelectedId);
  };

  const setUnitTags = (tags: string[]) => {
    updateUnit({ tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))] });
  };

  const toggleTag = (tag: string) => {
    if (!selectedUnit) return;
    const nextTags = selectedUnit.tags.includes(tag)
      ? selectedUnit.tags.filter((candidate) => candidate !== tag)
      : [...selectedUnit.tags, tag];
    setUnitTags(nextTags);
  };

  const addCustomTag = () => {
    if (!selectedUnit) return;
    const nextTag = tagInput.trim();
    if (!nextTag) return;
    setUnitTags([...selectedUnit.tags, nextTag]);
    setTagInput('');
  };

  const typeName = (kind: 'attack' | 'defense', id: string) => {
    const list = kind === 'attack' ? data.attackTypes : data.defenseTypes;
    return list.find((type) => type.id === id)?.name ?? '미지정';
  };

  if (!selectedFaction) {
    return (
      <div className="space-y-4">
        <SectionHeader
          title="유닛 관리"
          subtitle="유닛을 추가하려면 먼저 팩션을 만들어야 합니다."
        />
        <p className="panel text-sm text-muted">팩션이 없습니다. 팩션 탭에서 새 팩션을 추가하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        action={
          <button className="btn btn-primary" onClick={addUnit} type="button">
            <Plus size={16} />새 유닛 추가
          </button>
        }
        subtitle="팩션을 먼저 고른 뒤, 해당 팩션 안의 유닛만 카드로 편집합니다."
        title="유닛 관리"
      />

      <section className="panel space-y-3">
        <span className="label">팩션 선택</span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.races.map((faction) => (
            <button
              className={`min-h-12 shrink-0 rounded-md border px-4 py-2 text-left text-sm font-semibold ${
                faction.id === selectedFaction.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'
              }`}
              key={faction.id}
              onClick={() => setSelectedFactionId(faction.id)}
              type="button"
            >
              {faction.name}
            </button>
          ))}
        </div>

        <div className="rounded-md border border-line bg-[#0f141d] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-ink">{selectedFaction.name}</p>
              <p className="mt-1 text-sm text-muted">{selectedFaction.concept}</p>
            </div>
            <span className="chip shrink-0">{factionUnits.length} units</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-ink">팩션 유닛</h3>
        {factionUnits.map((unit) => (
          <button
            className={`w-full rounded-lg border p-3 text-left transition active:scale-[0.99] ${
              unit.id === selectedUnit?.id ? 'border-cyan bg-cyan/10' : 'border-line bg-panel'
            }`}
            key={unit.id}
            onClick={() => setSelectedUnitId(unit.id)}
            type="button"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-bold text-ink">{unit.name}</p>
                  {unit.isHero ? <span className="rounded bg-amber/15 px-2 py-1 text-xs font-bold text-amber">HERO</span> : null}
                </div>
                <p className="mt-1 text-sm text-muted">{unit.role}</p>
                {unit.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {unit.tags.map((tag) => (
                      <span className="chip text-[10px]" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <CardStat label="HP / 보호막" value={`${unit.hp} / ${unit.shield}`} />
              <CardStat label="공격 / 방어" value={`${unit.attack} / ${unit.defense}`} />
              <CardStat label="공격 타입" value={typeName('attack', unit.attackType)} />
              <CardStat label="방어 타입" value={typeName('defense', unit.defenseType)} />
              <CardStat label="사거리" value={unit.range} />
              <CardStat label="이동속도" value={unit.moveSpeed} />
              <CardStat label="공격속도" value={unit.attackSpeed} />
              <CardStat label="가격 / 생산속도" value={`${unit.cost} / ${unit.buildTime}s`} />
            </div>
          </button>
        ))}
        {factionUnits.length === 0 ? (
          <p className="panel text-sm text-muted">선택한 팩션에 유닛이 없습니다. 새 유닛을 추가하세요.</p>
        ) : null}
      </section>

      {selectedUnit ? (
        <section className="panel space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label">선택된 유닛</p>
              <h3 className="text-lg font-bold text-ink">{selectedUnit.name}</h3>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={duplicateUnit} type="button">
                <Copy size={16} />복제
              </button>
              <button className="btn btn-danger" onClick={deleteUnit} type="button">
                <Trash2 size={16} />삭제
              </button>
            </div>
          </div>

          <FormSection title="기본 정보">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="이름" onChange={(name) => updateUnit({ name })} value={selectedUnit.name} />
              <TextField label="역할" onChange={(role) => updateUnit({ role })} value={selectedUnit.role} />
              <label className="block">
                <span className="label">팩션</span>
                <select
                  className="field"
                  onChange={(event) => updateUnit({ raceId: event.target.value })}
                  value={selectedUnit.raceId}
                >
                  {data.races.map((faction) => (
                    <option key={faction.id} value={faction.id}>
                      {faction.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-line bg-[#0f141d] p-3 text-sm text-ink">
                <input
                  checked={selectedUnit.isHero}
                  onChange={(event) => updateUnit({ isHero: event.target.checked })}
                  type="checkbox"
                />
                영웅 유닛
              </label>
            </div>
          </FormSection>

          <FormSection title="전투 능력치">
            <div className="mb-4 rounded-md border border-line bg-[#0f141d] p-3">
              <h5 className="mb-3 text-sm font-bold text-cyan">태그</h5>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const checked = selectedUnit.tags.includes(tag);
                  return (
                    <button
                      className={`min-h-11 rounded-md border px-3 py-2 text-sm font-semibold ${
                        checked ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#10151f] text-muted'
                      }`}
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      type="button"
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <input
                  className="field"
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="새 태그"
                  type="text"
                  value={tagInput}
                />
                <button className="btn btn-primary" onClick={addCustomTag} type="button">
                  추가
                </button>
              </div>
              {selectedUnit.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedUnit.tags.map((tag) => (
                    <button
                      className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger"
                      key={tag}
                      onClick={() => setUnitTags(selectedUnit.tags.filter((candidate) => candidate !== tag))}
                      type="button"
                    >
                      {tag} 삭제
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberStepper label="HP" onChange={(hp) => updateUnit({ hp })} value={selectedUnit.hp} />
              <NumberStepper label="MP" onChange={(mp) => updateUnit({ mp })} value={selectedUnit.mp} />
              <NumberStepper label="보호막" onChange={(shield) => updateUnit({ shield })} value={selectedUnit.shield} />
              <NumberStepper label="공격력" onChange={(attack) => updateUnit({ attack })} value={selectedUnit.attack} />
              <NumberStepper label="방어력" onChange={(defense) => updateUnit({ defense })} value={selectedUnit.defense} />
            </div>
          </FormSection>

          <FormSection title="타입 / 속도">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">공격 타입</span>
                <select
                  className="field"
                  onChange={(event) => updateUnit({ attackType: event.target.value })}
                  value={selectedUnit.attackType}
                >
                  {data.attackTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">방어 타입</span>
                <select
                  className="field"
                  onChange={(event) => updateUnit({ defenseType: event.target.value })}
                  value={selectedUnit.defenseType}
                >
                  {data.defenseTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberStepper label="사거리" min={1} onChange={(range) => updateUnit({ range })} value={selectedUnit.range} />
              <NumberStepper
                label="이동속도"
                onChange={(moveSpeed) => updateUnit({ moveSpeed })}
                step={0.1}
                value={selectedUnit.moveSpeed}
              />
              <NumberStepper
                label="공격속도"
                min={0.1}
                onChange={(attackSpeed) => updateUnit({ attackSpeed })}
                step={0.05}
                value={selectedUnit.attackSpeed}
              />
            </div>
          </FormSection>

          <FormSection title="생산 / 스킬">
            <div className="grid grid-cols-2 gap-3">
              <NumberStepper label="생산가격" onChange={(cost) => updateUnit({ cost })} value={selectedUnit.cost} />
              <NumberStepper label="생산속도" onChange={(buildTime) => updateUnit({ buildTime })} value={selectedUnit.buildTime} />
            </div>
            <div className="mt-3">
              <TextField label="특수기술" multiline onChange={(skills) => updateUnit({ skills })} value={selectedUnit.skills} />
            </div>
          </FormSection>

          <FormSection title="메모 / JSON">
            <TextField label="메모" multiline onChange={(notes) => updateUnit({ notes })} value={selectedUnit.notes} />
            <div className="mt-3">
              <JsonPreview value={selectedUnit} />
            </div>
          </FormSection>
        </section>
      ) : null}
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-[#0f141d] px-2 py-2">
      <p className="text-[10px] font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 font-mono text-xs text-ink">{value}</p>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-[#10151f] p-3">
      <h4 className="mb-3 text-sm font-bold text-cyan">{title}</h4>
      {children}
    </div>
  );
}
