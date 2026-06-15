import { Copy, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { JsonPreview } from '../components/JsonPreview';
import { NumberStepper } from '../components/NumberStepper';
import { SectionHeader } from '../components/SectionHeader';
import { SkillConditionBuilder } from '../components/SkillConditionBuilder';
import { TextField } from '../components/TextField';
import { UnitIcon } from '../components/UnitIcon';
import { createSkillFromPreset, skillPresets } from '../data/presets';
import type { AppData, Race, Skill, SkillArea, SkillEffectType, SkillTarget, SkillTrigger, Unit } from '../types';
import { createId, nowIso } from '../utils/ids';
import {
  formatSkillAutoDescription,
  formatSkillShortLine,
  skillAreaLabels,
  skillEffectLabels,
  skillTargetLabels,
  skillTriggerLabels,
  skillValueTypeLabels,
} from '../utils/labels';
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
    return [...new Set([...data.unitTags.map((tag) => tag.name), ...customTags])];
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
        area: template.area ? { ...template.area } : { type: 'single' },
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
                  <span className="inline-flex items-center gap-1 rounded-md border border-cyan/30 bg-cyan/10 px-2 py-1 text-xs font-bold text-cyan">
                    <UnitIcon className="h-3.5 w-3.5" type={unit.iconType} />
                    {unitIconLabels[unit.iconType]}
                  </span>
                  <p className="text-base font-bold text-ink">{unit.name}</p>
                  {unit.isHero ? <span className="rounded bg-amber/15 px-2 py-1 text-xs font-bold text-amber">영웅</span> : null}
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
              <CardStat label="전투 코스트" value={unit.unitCost} />
              <CardStat label="HP / 보호막" value={`${unit.hp} / ${unit.shield}`} />
              <CardStat label="공격 / 방어" value={`${unit.attack} / ${unit.defense}`} />
              <CardStat label="공격 타입" value={typeName('attack', unit.attackType)} />
              <CardStat label="방어 타입" value={typeName('defense', unit.defenseType)} />
              <CardStat label="사거리" value={unit.range} />
              <CardStat label="이동속도" value={unit.moveSpeed} />
              <CardStat label="공격속도" value={unit.attackSpeed} />
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
              <p className="label">선택한 유닛</p>
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

          <FormSection title="생산 / 스킬">
            <div className="grid grid-cols-2 gap-3">
              <NumberStepper label="생산가격" onChange={(cost) => updateUnit({ cost })} value={selectedUnit.cost} />
              <NumberStepper label="생산속도" onChange={(buildTime) => updateUnit({ buildTime })} value={selectedUnit.buildTime} />
            </div>
            <div className="mt-3">
              <TextField label="특수기술 메모" multiline onChange={(skills) => updateUnit({ skills })} value={selectedUnit.skills} />
            </div>
            <SkillSection
              availableTags={availableTags}
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
}: {
  availableTags: string[];
  onAddCustomTag: () => void;
  onInputChange: (value: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleTag: (tag: string) => void;
  selectedTags: string[];
  tagInput: string;
}) {
  return (
    <div className="rounded-md border border-line bg-[#0f141d] p-3">
      <h5 className="mb-3 text-sm font-bold text-cyan">태그</h5>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const checked = selectedTags.includes(tag);
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
            </button>
          );
        })}
      </div>
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
  onAddSkill,
  onAddSkillPreset,
  onAddSkillTemplate,
  onDeleteSkill,
  onDuplicateSkill,
  onUpdateSkill,
  selectedSkillPreset,
  selectedSkillTemplateId,
  setSelectedSkillPreset,
  setSelectedSkillTemplateId,
  skillTemplates,
  skills,
}: {
  availableTags: string[];
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
  onUpdateSkill: (skillId: string, patch: Partial<Skill>) => void;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-md border border-line bg-[#0f141d] p-3">
      <div className="space-y-1">
        <h5 className="text-sm font-bold text-cyan">스킬</h5>
        <p className="text-xs text-muted">스킬은 특정 유닛이 전투 중 조건에 따라 사용하는 능력입니다.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
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
        <button className="btn btn-primary" onClick={onAddSkillPreset} type="button">
          <Plus size={16} />
          스킬 프리셋 추가
        </button>
        <button className="btn" onClick={onAddSkill} type="button">
          <Plus size={16} />빈 스킬
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
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
        <button className="btn btn-primary" disabled={skillTemplates.length === 0} onClick={onAddSkillTemplate} type="button">
          <Plus size={16} />
          공용 스킬에서 추가
        </button>
      </div>
      {skills.map((skill) => (
        <SkillEditor
          availableTags={availableTags}
          key={skill.id}
          onDelete={() => onDeleteSkill(skill.id)}
          onDuplicate={() => onDuplicateSkill(skill)}
          onUpdate={(patch) => onUpdateSkill(skill.id, patch)}
          skill={skill}
        />
      ))}
      {skills.length === 0 ? <p className="text-sm text-muted">아직 구조화 스킬이 없습니다.</p> : null}
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

function SkillEditor({
  availableTags,
  onDelete,
  onDuplicate,
  onUpdate,
  skill,
}: {
  availableTags: string[];
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (patch: Partial<Skill>) => void;
  skill: Skill;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const autoDescription = formatSkillAutoDescription(skill);
  const area = skill.area ?? { type: 'single' as const };

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
          label="발동 조건"
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
        <NumberStepper label="위력" min={-999} onChange={(value) => onUpdate({ value })} value={skill.value} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumberStepper label="쿨타임" onChange={(cooldown) => onUpdate({ cooldown })} step={0.5} value={skill.cooldown} />
        <NumberStepper label="MP 소모" onChange={(mpCost) => onUpdate({ mpCost })} value={skill.mpCost} />
        <NumberStepper label="발동 확률 %" max={100} onChange={(chance) => onUpdate({ chance })} value={skill.chance} />
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
            <NumberStepper label="지속 시간" onChange={(duration) => onUpdate({ duration })} step={0.5} value={skill.duration} />
            <NumberStepper
              label="최대 발동 횟수"
              onChange={(maxActivations) => onUpdate({ maxActivations: maxActivations > 0 ? maxActivations : undefined })}
              value={skill.maxActivations ?? 0}
            />
            <SkillSelect
              label="영역"
              labels={skillAreaLabels}
              onChange={(type) => onUpdate({ area: { ...area, type: type as SkillArea['type'] } })}
              options={skillAreas}
              value={area.type}
            />
            <NumberStepper
              label="반경"
              min={0}
              onChange={(radius) => onUpdate({ area: { ...area, radius } })}
              value={area.radius ?? 0}
            />
            <NumberStepper
              label="길이"
              min={0}
              onChange={(length) => onUpdate({ area: { ...area, length } })}
              value={area.length ?? 0}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="스킬 태그"
              onChange={(value) => onUpdate({ tags: value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
              placeholder="치유, 보호막"
              value={(skill.tags ?? []).join(', ')}
            />
            <TextField label="스킬 메모" onChange={(notes) => onUpdate({ notes })} value={skill.notes} />
          </div>
          <SkillConditionBuilder availableTags={availableTags} onUpdate={onUpdate} skill={skill} />
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
