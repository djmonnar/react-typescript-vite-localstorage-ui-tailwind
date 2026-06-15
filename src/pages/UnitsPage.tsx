import { Copy, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { JsonPreview } from '../components/JsonPreview';
import { NumberStepper } from '../components/NumberStepper';
import { SectionHeader } from '../components/SectionHeader';
import { SkillAdvancedTiming } from '../components/SkillAdvancedTiming';
import { SkillConditionBuilder } from '../components/SkillConditionBuilder';
import { TargetTagPicker } from '../components/TargetTagPicker';
import { TextField } from '../components/TextField';
import { UnitIcon } from '../components/UnitIcon';
import { createSkillFromPreset, skillPresets } from '../data/presets';
import type { AppData, AttackType, Race, Skill, SkillArea, SkillEffectType, SkillTarget, SkillTrigger, Unit } from '../types';
import { createId, nowIso } from '../utils/ids';
import {
  formatSkillAutoDescription,
  formatSkillShortLine,
  skillAreaLabels,
  skillAreaHelp,
  skillEffectLabels,
  skillTargetLabels,
  skillTriggerLabels,
  skillValueTypeLabels,
} from '../utils/labels';
import { describeTagBehavior, resolveTagBehaviors } from '../utils/tagBehaviors';
import { unitIconLabels, unitIconTypes } from '../utils/unitIconOptions';

interface UnitsPageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
}

const skillTriggers = Object.keys(skillTriggerLabels) as SkillTrigger[];
const skillTargets = Object.keys(skillTargetLabels) as SkillTarget[];
const skillEffects = Object.keys(skillEffectLabels) as SkillEffectType[];
const skillAreas = Object.keys(skillAreaLabels) as SkillArea['type'][];

export function UnitsPage({ data, setData }: UnitsPageProps) {
  const [selectedFactionId, setSelectedFactionId] = useState(data.races[0]?.id ?? '');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedSkillPreset, setSelectedSkillPreset] = useState(skillPresets[0]?.name ?? '');
  const [selectedSkillTemplateId, setSelectedSkillTemplateId] = useState(data.skillTemplates[0]?.id ?? '');
  const selectedFaction = data.races.find((candidate) => candidate.id === selectedFactionId) ?? data.races[0];
  const factionUnits = useMemo(
    () => data.units.filter((unit) => unit.raceId === selectedFaction?.id),
    [data.units, selectedFaction?.id],
  );
  const selectedUnit = factionUnits.find((candidate) => candidate.id === selectedUnitId) ?? factionUnits[0];
  const availableTags = useMemo(() => {
    const customTags = data.units.flatMap((unit) => unit.tags ?? []);
    return [...new Set([...data.unitTags.map((tag) => tag.name), ...customTags].map((tag) => tag.trim()).filter(Boolean))];
  }, [data.unitTags, data.units]);

  useEffect(() => {
    if (!data.races.some((candidate) => candidate.id === selectedFactionId)) {
      setSelectedFactionId(data.races[0]?.id ?? '');
    }
  }, [data.races, selectedFactionId]);

  useEffect(() => {
    if (!selectedUnit || !factionUnits.some((candidate) => candidate.id === selectedUnitId)) {
      setSelectedUnitId(factionUnits[0]?.id ?? '');
    }
  }, [factionUnits, selectedUnit, selectedUnitId]);

  useEffect(() => {
    if (!data.skillTemplates.some((skill) => skill.id === selectedSkillTemplateId)) {
      setSelectedSkillTemplateId(data.skillTemplates[0]?.id ?? '');
    }
  }, [data.skillTemplates, selectedSkillTemplateId]);

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
    if (patch.raceId) setSelectedFactionId(patch.raceId);
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
      moveSpeed: 2,
      attackSpeed: 1,
      tags: [],
      skills: '',
      skillsV2: [],
      unitCost: 1,
      iconType: 'sword',
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
          deploymentA: (preset.deploymentA ?? []).filter((entry) => entry.unitId !== selectedUnit.id),
          deploymentB: (preset.deploymentB ?? []).filter((entry) => entry.unitId !== selectedUnit.id),
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

  const setSkillsV2 = (skillsV2: Skill[]) => updateUnit({ skillsV2 });

  const addSkill = () => {
    if (!selectedUnit) return;
    setSkillsV2([
      ...(selectedUnit.skillsV2 ?? []),
      {
        id: createId('skill'),
        name: '새 스킬',
        description: '',
        trigger: 'cooldown',
        target: 'enemyTarget',
        effectType: 'damage',
        value: 10,
        valueType: 'flat',
        cooldown: 5,
        mpCost: 0,
        chance: 100,
        duration: 0,
        tags: [],
        area: { type: 'single' },
        attackTypeId: undefined,
        notes: '',
      },
    ]);
  };

  const addSkillPreset = () => {
    if (!selectedUnit) return;
    const preset = skillPresets.find((candidate) => candidate.name === selectedSkillPreset) ?? skillPresets[0];
    if (!preset) return;
    setSkillsV2([...(selectedUnit.skillsV2 ?? []), createSkillFromPreset(preset)]);
  };

  const addSkillTemplate = () => {
    if (!selectedUnit) return;
    const template = data.skillTemplates.find((skill) => skill.id === selectedSkillTemplateId) ?? data.skillTemplates[0];
    if (!template) return;
    setSkillsV2([
      ...(selectedUnit.skillsV2 ?? []),
      {
        ...template,
        id: createId('skill'),
        name: template.name,
        tags: [...(template.tags ?? [])],
        targetTags: [...(template.targetTags ?? [])],
        area: template.area ? { ...template.area } : { type: 'single' },
        conditions: (template.conditions ?? []).map((condition) => ({
          ...condition,
          id: createId('condition'),
          tags: [...(condition.tags ?? [])],
        })),
      },
    ]);
  };

  const updateSkill = (skillId: string, patch: Partial<Skill>) => {
    if (!selectedUnit) return;
    setSkillsV2((selectedUnit.skillsV2 ?? []).map((skill) => (skill.id === skillId ? { ...skill, ...patch } : skill)));
  };

  const duplicateSkill = (skill: Skill) => {
    if (!selectedUnit) return;
    setSkillsV2([...(selectedUnit.skillsV2 ?? []), { ...skill, id: createId('skill'), name: `${skill.name} 복제` }]);
  };

  const saveSkillAsTemplate = (skill: Skill) => {
    const template: Skill = {
      ...skill,
      id: createId('skill'),
      name: `${skill.name} 공용`,
      tags: [...(skill.tags ?? [])],
      area: skill.area ? { ...skill.area } : { type: 'single' },
      conditions: (skill.conditions ?? []).map((condition) => ({
        ...condition,
        id: createId('condition'),
        tags: [...(condition.tags ?? [])],
      })),
      targetTags: [...(skill.targetTags ?? [])],
    };
    setData((current) => ({ ...current, skillTemplates: [...current.skillTemplates, template] }));
    setSelectedSkillTemplateId(template.id);
  };

  const deleteSkill = (skillId: string) => {
    if (!selectedUnit) return;
    setSkillsV2((selectedUnit.skillsV2 ?? []).filter((skill) => skill.id !== skillId));
  };

  const typeName = (kind: 'attack' | 'defense', id: string) => {
    const list = kind === 'attack' ? data.attackTypes : data.defenseTypes;
    return list.find((type) => type.id === id)?.name ?? '미지정';
  };

  if (!selectedFaction) {
    return (
      <div className="space-y-4">
        <SectionHeader subtitle="유닛을 추가하려면 먼저 팩션을 만들어야 합니다." title="유닛 관리" />
        <p className="panel text-sm text-muted">팩션이 없습니다. 팩션 탭에서 팩션을 추가하세요.</p>
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
        subtitle="팩션을 먼저 고른 뒤, 해당 팩션 안의 유닛만 선택하고 편집합니다."
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
            <span className="chip shrink-0">{factionUnits.length} 유닛</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-ink">팩션 유닛</h3>
          <span className="text-xs text-muted">좌우로 밀어서 선택</span>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {factionUnits.map((unit) => (
            <button
              className={`min-h-28 w-40 shrink-0 rounded-lg border p-3 text-left transition active:scale-[0.98] ${
                unit.id === selectedUnit?.id ? 'border-cyan bg-cyan/10 shadow-[0_0_0_1px_rgba(95,231,255,0.18)]' : 'border-line bg-panel'
              }`}
              key={unit.id}
              onClick={() => setSelectedUnitId(unit.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan/30 bg-cyan/10 text-cyan">
                  <UnitIcon className="h-5 w-5" type={unit.iconType} />
                </span>
                {unit.isHero ? <span className="rounded bg-amber/15 px-1.5 py-1 text-[10px] font-bold text-amber">영웅</span> : null}
              </div>
              <p className="mt-2 truncate text-sm font-bold text-ink">{unit.name}</p>
              <p className="truncate text-xs text-muted">{unit.role}</p>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                <CompactStat label="비용" value={unit.unitCost} />
                <CompactStat label="HP" value={unit.hp} />
                <CompactStat label="공격" value={unit.attack} />
                <CompactStat label="사거리" value={unit.range} />
              </div>
            </button>
          ))}
        </div>
        {factionUnits.length === 0 ? (
          <p className="panel text-sm text-muted">선택한 팩션에 유닛이 없습니다. 새 유닛을 추가하세요.</p>
        ) : null}
      </section>

      {selectedUnit ? (
        <section className="panel space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label">선택한 유닛</p>
              <h3 className="text-lg font-bold text-ink">{selectedUnit.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {selectedUnit.role} · {typeName('attack', selectedUnit.attackType)} / {typeName('defense', selectedUnit.defenseType)}
              </p>
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
          <div className="grid grid-cols-4 gap-2">
            <CompactStat label="HP" value={selectedUnit.hp} />
            <CompactStat label="공격" value={selectedUnit.attack} />
            <CompactStat label="방어" value={selectedUnit.defense} />
            <CompactStat label="비용" value={selectedUnit.unitCost} />
          </div>

          <FormSection defaultOpen title="기본 정보">
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

            <div className="mt-4">
              <p className="label">아이콘</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {unitIconTypes.map((iconType) => (
                  <button
                    className={`min-h-16 rounded-md border px-2 py-2 text-xs font-bold ${
                      selectedUnit.iconType === iconType
                        ? 'border-cyan bg-cyan/15 text-cyan'
                        : 'border-line bg-[#0f141d] text-muted'
                    }`}
                    key={iconType}
                    onClick={() => updateUnit({ iconType })}
                    type="button"
                  >
                    <UnitIcon className="mx-auto mb-1 h-5 w-5" type={iconType} />
                    {unitIconLabels[iconType]}
                  </button>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection title="전투 능력치">
            <TagEditor
              availableTags={availableTags}
              selectedTags={selectedUnit.tags}
              tagInput={tagInput}
              unitTags={data.unitTags}
              onAddCustomTag={addCustomTag}
              onInputChange={setTagInput}
              onRemoveTag={(tag) => setUnitTags(selectedUnit.tags.filter((candidate) => candidate !== tag))}
              onToggleTag={toggleTag}
            />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberStepper label="HP" onChange={(hp) => updateUnit({ hp })} value={selectedUnit.hp} />
              <NumberStepper label="MP" onChange={(mp) => updateUnit({ mp })} value={selectedUnit.mp} />
              <NumberStepper label="보호막" onChange={(shield) => updateUnit({ shield })} value={selectedUnit.shield} />
              <NumberStepper label="공격력" onChange={(attack) => updateUnit({ attack })} value={selectedUnit.attack} />
              <NumberStepper label="방어력" onChange={(defense) => updateUnit({ defense })} value={selectedUnit.defense} />
              <NumberStepper label="전투 코스트" min={1} onChange={(unitCost) => updateUnit({ unitCost })} value={selectedUnit.unitCost} />
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
                max={4}
                min={1}
                onChange={(moveSpeed) => updateUnit({ moveSpeed })}
                step={1}
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

          <FormSection title={`스킬 ${(selectedUnit.skillsV2 ?? []).length}개`}>
            <div>
              <TextField label="특수기술 메모" multiline onChange={(skills) => updateUnit({ skills })} value={selectedUnit.skills} />
            </div>
            <SkillSection
              availableTags={availableTags}
              attackTypes={data.attackTypes}
              selectedSkillPreset={selectedSkillPreset}
              selectedSkillTemplateId={selectedSkillTemplateId}
              setSelectedSkillPreset={setSelectedSkillPreset}
              setSelectedSkillTemplateId={setSelectedSkillTemplateId}
              skillTemplates={data.skillTemplates}
              skills={selectedUnit.skillsV2 ?? []}
              onAddSkill={addSkill}
              onAddSkillPreset={addSkillPreset}
              onAddSkillTemplate={addSkillTemplate}
              onDeleteSkill={deleteSkill}
              onDuplicateSkill={duplicateSkill}
              onSaveSkillTemplate={saveSkillAsTemplate}
              onUpdateSkill={updateSkill}
            />
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

function TagEditor({
  availableTags,
  onAddCustomTag,
  onInputChange,
  onRemoveTag,
  onToggleTag,
  selectedTags,
  tagInput,
  unitTags,
}: {
  availableTags: string[];
  onAddCustomTag: () => void;
  onInputChange: (value: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleTag: (tag: string) => void;
  selectedTags: string[];
  tagInput: string;
  unitTags: AppData['unitTags'];
}) {
  const selectedPersonalities = selectedTags
    .map((tag) => ({ tag, behaviors: resolveTagBehaviors(tag, unitTags) }))
    .filter((entry) => entry.behaviors.length > 0);

  return (
    <div className="rounded-md border border-line bg-[#0f141d] p-3">
      <h5 className="mb-3 text-sm font-bold text-cyan">태그</h5>
      <p className="mb-3 text-xs leading-5 text-muted">
        태그는 특성/스킬 조건에 쓰입니다. <span className="text-cyan">개성</span> 표시가 붙은 태그는 전투 AI 행동도 바꿉니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const checked = selectedTags.includes(tag);
          const behaviors = resolveTagBehaviors(tag, unitTags);
          return (
            <button
              className={`min-h-11 rounded-md border px-3 py-2 text-sm font-semibold ${
                checked ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#10151f] text-muted'
              }`}
              key={tag}
              onClick={() => onToggleTag(tag)}
              type="button"
            >
              {tag}
              {behaviors.length > 0 ? <span className="ml-2 text-[10px] text-cyan">개성 {behaviors.length}</span> : null}
            </button>
          );
        })}
      </div>
      {selectedPersonalities.length > 0 ? (
        <div className="mt-3 space-y-2 rounded-md border border-cyan/30 bg-cyan/10 p-3">
          <p className="text-xs font-bold text-cyan">적용 중인 태그 개성</p>
          {selectedPersonalities.map((entry) => (
            <p className="text-xs leading-5 text-muted" key={entry.tag}>
              <span className="font-bold text-ink">{entry.tag}</span>: {entry.behaviors.map(describeTagBehavior).join(' · ')}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input
          className="field"
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAddCustomTag();
            }
          }}
          placeholder="새 태그"
          type="text"
          value={tagInput}
        />
        <button className="btn btn-primary" onClick={onAddCustomTag} type="button">
          추가
        </button>
      </div>
      {selectedTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <button
              className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger"
              key={tag}
              onClick={() => onRemoveTag(tag)}
              type="button"
            >
              {tag} 삭제
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SkillSection({
  availableTags,
  attackTypes,
  onAddSkill,
  onAddSkillPreset,
  onAddSkillTemplate,
  onDeleteSkill,
  onDuplicateSkill,
  onSaveSkillTemplate,
  onUpdateSkill,
  selectedSkillPreset,
  selectedSkillTemplateId,
  setSelectedSkillPreset,
  setSelectedSkillTemplateId,
  skillTemplates,
  skills,
}: {
  availableTags: string[];
  attackTypes: AttackType[];
  selectedSkillPreset: string;
  selectedSkillTemplateId: string;
  setSelectedSkillPreset: (value: string) => void;
  setSelectedSkillTemplateId: (value: string) => void;
  skillTemplates: Skill[];
  skills: Skill[];
  onAddSkill: () => void;
  onAddSkillPreset: () => void;
  onAddSkillTemplate: () => void;
  onDeleteSkill: (skillId: string) => void;
  onDuplicateSkill: (skill: Skill) => void;
  onSaveSkillTemplate: (skill: Skill) => void;
  onUpdateSkill: (skillId: string, patch: Partial<Skill>) => void;
}) {
  const [addSource, setAddSource] = useState<'preset' | 'template' | 'blank'>('preset');
  const canUseTemplate = skillTemplates.length > 0;
  const addSourceOptions: Array<{ id: 'preset' | 'template' | 'blank'; label: string; description: string; disabled?: boolean }> = [
    { id: 'preset', label: '추천 프리셋', description: '기본 제공 스킬을 복사해서 수정합니다.' },
    { id: 'template', label: '내 공용 스킬', description: '세부설정에서 만든 공용 스킬을 복사합니다.', disabled: !canUseTemplate },
    { id: 'blank', label: '빈 스킬', description: '처음부터 직접 만듭니다.' },
  ];

  const addSelectedSkill = () => {
    if (addSource === 'template') {
      onAddSkillTemplate();
      return;
    }
    if (addSource === 'blank') {
      onAddSkill();
      return;
    }
    onAddSkillPreset();
  };

  return (
    <div className="mt-4 space-y-3 rounded-md border border-line bg-[#0f141d] p-3">
      <div className="space-y-1">
        <h5 className="text-sm font-bold text-cyan">스킬</h5>
        <p className="text-xs text-muted">스킬은 특정 유닛이 전투 중 조건에 따라 사용하는 능력입니다.</p>
      </div>

      <div className="rounded-md border border-line bg-[#10151f] p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">스킬 추가</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              추천 프리셋과 내 공용 스킬은 모두 현재 유닛으로 복사한 뒤 자유롭게 수정됩니다.
            </p>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {addSourceOptions.map((option) => (
            <button
              className={`min-h-12 rounded-md border px-2 py-2 text-xs font-bold ${
                addSource === option.id
                  ? 'border-cyan bg-cyan/15 text-cyan'
                  : option.disabled
                    ? 'border-line bg-[#0f141d] text-muted/50'
                    : 'border-line bg-[#0f141d] text-muted'
              }`}
              disabled={option.disabled}
              key={option.id}
              onClick={() => setAddSource(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs leading-relaxed text-muted">
          {addSourceOptions.find((option) => option.id === addSource)?.description}
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          {addSource === 'preset' ? (
            <select
              className="field"
              onChange={(event) => setSelectedSkillPreset(event.target.value)}
              value={selectedSkillPreset}
            >
              {skillPresets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          ) : null}
          {addSource === 'template' ? (
            <select
              className="field"
              onChange={(event) => setSelectedSkillTemplateId(event.target.value)}
              value={selectedSkillTemplateId}
            >
              {skillTemplates.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          ) : null}
          {addSource === 'blank' ? (
            <div className="rounded-md border border-line bg-[#0f141d] px-3 py-3 text-sm text-muted">
              빈 스킬을 추가한 뒤 이름, 타이밍, 대상, 효과를 직접 설정합니다.
            </div>
          ) : null}
          <button className="btn btn-primary" disabled={addSource === 'template' && !canUseTemplate} onClick={addSelectedSkill} type="button">
            <Plus size={16} />
            선택한 스킬 추가
          </button>
        </div>
      </div>

      {skillTemplates.length > 0 ? (
        <div>
          <span className="label">내 공용 스킬 바로 선택</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {skillTemplates.map((skill) => (
              <button
                className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${selectedSkillTemplateId === skill.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#10151f] text-muted'}`}
                key={skill.id}
                onClick={() => setSelectedSkillTemplateId(skill.id)}
                type="button"
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {skills.map((skill) => (
        <SkillEditor
          availableTags={availableTags}
          attackTypes={attackTypes}
          key={skill.id}
          onDelete={() => onDeleteSkill(skill.id)}
          onDuplicate={() => onDuplicateSkill(skill)}
          onSaveTemplate={() => onSaveSkillTemplate(skill)}
          onUpdate={(patch) => onUpdateSkill(skill.id, patch)}
          skill={skill}
        />
      ))}
      {skills.length === 0 ? <p className="text-sm text-muted">아직 구조화 스킬이 없습니다.</p> : null}
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-[#0f141d] px-2 py-1.5">
      <p className="text-[10px] font-semibold text-muted">{label}</p>
      <p className="mt-0.5 truncate font-mono text-xs font-bold text-ink">{value}</p>
    </div>
  );
}

function FormSection({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="rounded-md border border-line bg-[#10151f] p-3 open:pb-4" open={defaultOpen}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-cyan marker:hidden">
        <span>{title}</span>
        <span className="rounded-md border border-line bg-[#0f141d] px-2 py-1 text-[10px] text-muted">열기/닫기</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function SkillEditor({
  availableTags,
  attackTypes,
  onDelete,
  onDuplicate,
  onSaveTemplate,
  onUpdate,
  skill,
}: {
  availableTags: string[];
  attackTypes: AttackType[];
  onDelete: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
  onUpdate: (patch: Partial<Skill>) => void;
  skill: Skill;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const autoDescription = formatSkillAutoDescription(skill);
  const area = skill.area ?? { type: 'single' as const };
  const attackTypeOptions = ['', ...attackTypes.map((type) => type.id)];
  const attackTypeLabels = Object.fromEntries([
    ['', '유닛 기본 타입'],
    ...attackTypes.map((type) => [type.id, type.name]),
  ]);

  return (
    <div className="rounded-md border border-line bg-[#10151f] p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{skill.name}</p>
          <p className="mt-1 text-xs text-muted">{formatSkillShortLine(skill)}</p>
          <div className="mt-2 space-y-1 rounded-md border border-cyan/20 bg-cyan/5 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-cyan">자동 설명</p>
            <p className="text-xs leading-relaxed text-ink">{autoDescription}</p>
            {skill.description.trim() ? <p className="text-xs leading-relaxed text-muted">{skill.description}</p> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={onSaveTemplate} type="button">
            공용 저장
          </button>
          <button className="btn" onClick={onDuplicate} type="button">
            <Copy size={14} />
          </button>
          <button className="btn btn-danger" onClick={onDelete} type="button">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="스킬명" onChange={(name) => onUpdate({ name })} value={skill.name} />
        <TextField label="설명" onChange={(description) => onUpdate({ description })} value={skill.description} />
        <SkillSelect
          label="발동 타이밍"
          labels={skillTriggerLabels}
          onChange={(trigger) => onUpdate({ trigger: trigger as SkillTrigger })}
          options={skillTriggers}
          value={skill.trigger}
        />
        <SkillSelect
          label="대상"
          labels={skillTargetLabels}
          onChange={(target) => onUpdate({ target: target as SkillTarget })}
          options={skillTargets}
          value={skill.target}
        />
        <SkillSelect
          label="효과"
          labels={skillEffectLabels}
          onChange={(effectType) => onUpdate({ effectType: effectType as SkillEffectType })}
          options={skillEffects}
          value={skill.effectType}
        />
        {skill.effectType === 'damage' ? (
          <SkillSelect
            label="피해 타입"
            labels={attackTypeLabels}
            onChange={(attackTypeId) => onUpdate({ attackTypeId: attackTypeId || undefined })}
            options={attackTypeOptions}
            value={skill.attackTypeId ?? ''}
          />
        ) : null}
        <NumberStepper label="위력" min={-999} onChange={(value) => onUpdate({ value })} value={skill.value} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumberStepper label="쿨타임" onChange={(cooldown) => onUpdate({ cooldown })} step={0.5} value={skill.cooldown} />
        <NumberStepper label="MP 소모" onChange={(mpCost) => onUpdate({ mpCost })} value={skill.mpCost} />
        <NumberStepper label="발동 확률 %" max={100} onChange={(chance) => onUpdate({ chance })} value={skill.chance} />
      </div>

      <div className="mt-3">
        <SkillConditionBuilder availableTags={availableTags} onUpdate={onUpdate} skill={skill} />
      </div>

      <button className="btn mt-3 w-full" onClick={() => setShowAdvanced((current) => !current)} type="button">
        {showAdvanced ? '고급 설정 접기' : '고급 설정 펼치기'}
      </button>

      {showAdvanced ? (
        <div className="mt-3 space-y-3 rounded-md border border-line bg-[#0f141d] p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SkillSelect
              label="수치 타입"
              labels={skillValueTypeLabels}
              onChange={(valueType) => onUpdate({ valueType: valueType as Skill['valueType'] })}
              options={['flat', 'percent']}
              value={skill.valueType}
            />
            <SkillAdvancedTiming onUpdate={onUpdate} skill={skill} />
            <SkillSelect
              label="영역"
              labels={skillAreaLabels}
              onChange={(type) => onUpdate({ area: { ...area, type: type as SkillArea['type'] } })}
              options={skillAreas}
              value={area.type}
            />
            {area.type === 'circle' || area.type === 'selfCircle' || area.type === 'cross' ? (
              <NumberStepper
                label="반경"
                min={0}
                onChange={(radius) => onUpdate({ area: { ...area, radius } })}
                value={area.radius ?? 0}
              />
            ) : null}
            {area.type === 'line' || area.type === 'cross' ? (
              <NumberStepper
                label="길이"
                min={0}
                onChange={(length) => onUpdate({ area: { ...area, length } })}
                value={area.length ?? 0}
              />
            ) : null}
          </div>
          <p className="rounded-md border border-line bg-[#10151f] px-3 py-2 text-xs leading-relaxed text-muted">
            {skillAreaHelp(area.type)}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="스킬 태그"
              onChange={(value) => onUpdate({ tags: value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
              placeholder="치유, 보호막"
              value={(skill.tags ?? []).join(', ')}
            />
            <TextField label="스킬 메모" onChange={(notes) => onUpdate({ notes })} value={skill.notes} />
          </div>
          <TargetTagPicker
            availableTags={availableTags}
            selectedTags={skill.targetTags ?? []}
            onChange={(targetTags) => onUpdate({ targetTags })}
          />
          <pre className="max-h-60 overflow-auto rounded-md border border-line bg-[#05070a] p-3 font-mono text-[10px] leading-relaxed text-acid">
            {JSON.stringify(skill, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function SkillSelect({
  label,
  labels,
  onChange,
  options,
  value,
}: {
  label: string;
  labels?: Record<string, string>;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="field" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
