import { Copy, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { NumberStepper } from '../components/NumberStepper';
import { SectionHeader } from '../components/SectionHeader';
import { SkillConditionBuilder } from '../components/SkillConditionBuilder';
import { TextField } from '../components/TextField';
import { UnitIcon } from '../components/UnitIcon';
import { createSkillFromPreset, createTraitFromPreset, skillPresets, traitPresets } from '../data/presets';
import type {
  AppData,
  AttackType,
  DefenseType,
  Skill,
  SkillArea,
  SkillEffectType,
  SkillTarget,
  SkillTrigger,
  Trait,
  TraitEffectTypeV2,
  TraitTarget,
  TraitTrigger,
  UnitTag,
  UnitTagCategory,
} from '../types';
import { createId } from '../utils/ids';
import {
  formatSkillAutoDescription,
  formatTraitPreview,
  skillAreaLabels,
  skillEffectLabels,
  skillTargetLabels,
  skillTriggerLabels,
  skillValueTypeLabels,
  traitEffectV2Labels,
  traitTargetLabels,
  traitTriggerLabels,
} from '../utils/labels';
import { unitIconLabels, unitIconTypes } from '../utils/unitIconOptions';

interface TypesPageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
}

type SettingsPanel = 'attack' | 'defense' | 'matrix' | 'tags' | 'traits' | 'skills' | 'icons';

const panels: Array<{ id: SettingsPanel; label: string }> = [
  { id: 'attack', label: '공격 타입' },
  { id: 'defense', label: '방어 타입' },
  { id: 'matrix', label: '타입 상성표' },
  { id: 'tags', label: '태그 설정' },
  { id: 'traits', label: '특성 설정' },
  { id: 'skills', label: '스킬 설정' },
  { id: 'icons', label: '아이콘 설정' },
];

const tagCategories: UnitTagCategory[] = ['종족', '역할', '전투방식', '속성', '상태', '커스텀'];
const traitTriggers = Object.keys(traitTriggerLabels) as TraitTrigger[];
const traitTargets = Object.keys(traitTargetLabels) as TraitTarget[];
const traitEffects = (Object.keys(traitEffectV2Labels) as TraitEffectTypeV2[]).filter(
  (effect) => effect !== 'unitCostDiscount',
);
const skillTriggers = Object.keys(skillTriggerLabels) as SkillTrigger[];
const skillTargets = Object.keys(skillTargetLabels) as SkillTarget[];
const skillEffects = Object.keys(skillEffectLabels) as SkillEffectType[];
const skillAreas = Object.keys(skillAreaLabels) as SkillArea['type'][];
const tagColors = ['#66d9ef', '#f6c177', '#9ece6a', '#c792ea', '#f7768e', '#a9b1d6'];

export function TypesPage({ data, setData }: TypesPageProps) {
  const [activePanel, setActivePanel] = useState<SettingsPanel>('matrix');
  const [attackId, setAttackId] = useState(data.attackTypes[0]?.id ?? '');
  const [defenseId, setDefenseId] = useState(data.defenseTypes[0]?.id ?? '');
  const [traitId, setTraitId] = useState(data.traits[0]?.id ?? '');
  const [tagId, setTagId] = useState(data.unitTags[0]?.id ?? '');
  const [skillId, setSkillId] = useState(data.skillTemplates[0]?.id ?? '');
  const [tagSearch, setTagSearch] = useState('');
  const [tagCategoryFilter, setTagCategoryFilter] = useState<UnitTagCategory | '전체'>('전체');
  const [selectedTraitPreset, setSelectedTraitPreset] = useState(traitPresets[0]?.name ?? '');
  const [selectedSkillPreset, setSelectedSkillPreset] = useState(skillPresets[0]?.name ?? '');
  const selectedAttack = data.attackTypes.find((type) => type.id === attackId) ?? data.attackTypes[0];
  const selectedDefense = data.defenseTypes.find((type) => type.id === defenseId) ?? data.defenseTypes[0];
  const selectedTrait = data.traits.find((trait) => trait.id === traitId) ?? data.traits[0];
  const selectedTag = data.unitTags.find((tag) => tag.id === tagId) ?? data.unitTags[0];
  const selectedSkill = data.skillTemplates.find((skill) => skill.id === skillId) ?? data.skillTemplates[0];
  const filteredTags = useMemo(() => {
    const query = tagSearch.trim().toLowerCase();
    return data.unitTags.filter((tag) => {
      const matchesQuery = !query || `${tag.name} ${tag.description} ${tag.notes}`.toLowerCase().includes(query);
      const matchesCategory = tagCategoryFilter === '전체' || tag.category === tagCategoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [data.unitTags, tagCategoryFilter, tagSearch]);

  const updateAttack = (patch: Partial<AttackType>) => {
    if (!selectedAttack) return;
    setData((current) => ({
      ...current,
      attackTypes: current.attackTypes.map((type) => (type.id === selectedAttack.id ? { ...type, ...patch } : type)),
    }));
  };

  const updateDefense = (patch: Partial<DefenseType>) => {
    if (!selectedDefense) return;
    setData((current) => ({
      ...current,
      defenseTypes: current.defenseTypes.map((type) => (type.id === selectedDefense.id ? { ...type, ...patch } : type)),
    }));
  };

  const updateTrait = (patch: Partial<Trait>) => {
    if (!selectedTrait) return;
    setData((current) => ({
      ...current,
      traits: current.traits.map((trait) => (trait.id === selectedTrait.id ? { ...trait, ...patch } : trait)),
    }));
  };

  const updateSkill = (patch: Partial<Skill>) => {
    if (!selectedSkill) return;
    setData((current) => ({
      ...current,
      skillTemplates: current.skillTemplates.map((skill) => (skill.id === selectedSkill.id ? { ...skill, ...patch } : skill)),
    }));
  };

  const updateTag = (patch: Partial<UnitTag>) => {
    if (!selectedTag) return;
    const previousName = selectedTag.name;
    const nextName = patch.name?.trim();
    setData((current) => ({
      ...current,
      unitTags: current.unitTags.map((tag) => (tag.id === selectedTag.id ? { ...tag, ...patch } : tag)),
      ...(nextName && nextName !== previousName ? renameTagEverywhere(current, previousName, nextName) : {}),
    }));
  };

  const addAttack = () => {
    const id = createId('atk');
    setData((current) => ({ ...current, attackTypes: [...current.attackTypes, { id, name: '새 공격 타입', description: '', notes: '' }] }));
    setAttackId(id);
  };

  const addDefense = () => {
    const id = createId('def');
    setData((current) => ({ ...current, defenseTypes: [...current.defenseTypes, { id, name: '새 방어 타입', description: '', notes: '' }] }));
    setDefenseId(id);
  };

  const addTag = () => {
    const id = createId('tag');
    setData((current) => ({
      ...current,
      unitTags: [...current.unitTags, { id, name: '새 태그', description: '', category: '커스텀', color: '#a9b1d6', notes: '' }],
    }));
    setTagId(id);
  };

  const addTrait = () => {
    const id = createId('trait');
    setData((current) => ({
      ...current,
      traits: [
        ...current.traits,
        {
          id,
          name: '새 특성',
          description: '',
          effectType: 'allAttackPercent',
          targetFilter: {},
          value: 10,
          trigger: 'battleStart',
          targetSide: 'ally',
          filters: { tags: [] },
          effects: [{ type: 'attackPercent', value: 10 }],
          triggerV2: 'battleStart',
          targetV2: 'allAllies',
          effectsV2: [{ type: 'attackPercent', value: 10 }],
          stackable: false,
          notes: '',
        },
      ],
    }));
    setTraitId(id);
  };

  const addTraitPreset = () => {
    const preset = traitPresets.find((candidate) => candidate.name === selectedTraitPreset) ?? traitPresets[0];
    if (!preset) return;
    const trait = createTraitFromPreset(preset);
    setData((current) => ({ ...current, traits: [...current.traits, trait] }));
    setTraitId(trait.id);
  };

  const addSkill = () => {
    const id = createId('skill');
    setData((current) => ({
      ...current,
      skillTemplates: [
        ...current.skillTemplates,
        {
          id,
          name: '새 스킬 템플릿',
          description: '',
          trigger: 'cooldown',
          target: 'nearestEnemy',
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
      ],
    }));
    setSkillId(id);
  };

  const addSkillPreset = () => {
    const preset = skillPresets.find((candidate) => candidate.name === selectedSkillPreset) ?? skillPresets[0];
    if (!preset) return;
    const skill = createSkillFromPreset(preset);
    setData((current) => ({ ...current, skillTemplates: [...current.skillTemplates, skill] }));
    setSkillId(skill.id);
  };

  const duplicateSkill = () => {
    if (!selectedSkill) return;
    const copy = { ...selectedSkill, id: createId('skill'), name: `${selectedSkill.name} 복제` };
    setData((current) => ({ ...current, skillTemplates: [...current.skillTemplates, copy] }));
    setSkillId(copy.id);
  };

  const deleteTag = () => {
    if (!selectedTag) return;
    const tagName = selectedTag.name;
    setData((current) => ({
      ...current,
      unitTags: current.unitTags.filter((tag) => tag.id !== selectedTag.id),
      units: current.units.map((unit) => ({
        ...unit,
        tags: unit.tags.filter((tag) => tag !== tagName),
        skillsV2: (unit.skillsV2 ?? []).map((skill) => ({
          ...skill,
          tags: (skill.tags ?? []).filter((tag) => tag !== tagName),
        })),
      })),
      traits: current.traits.map((trait) => ({
        ...trait,
        filters: { ...(trait.filters ?? {}), tags: (trait.filters?.tags ?? []).filter((tag) => tag !== tagName) },
      })),
      skillTemplates: current.skillTemplates.map((skill) => ({
        ...skill,
        tags: (skill.tags ?? []).filter((tag) => tag !== tagName),
      })),
    }));
    setTagId(data.unitTags.find((tag) => tag.id !== selectedTag.id)?.id ?? '');
  };

  const deleteSkill = () => {
    if (!selectedSkill) return;
    setData((current) => ({ ...current, skillTemplates: current.skillTemplates.filter((skill) => skill.id !== selectedSkill.id) }));
    setSkillId(data.skillTemplates.find((skill) => skill.id !== selectedSkill.id)?.id ?? '');
  };

  const deleteAttack = () => {
    if (!selectedAttack || data.attackTypes.length <= 1) return;
    const fallback = data.attackTypes.find((type) => type.id !== selectedAttack.id)?.id ?? '';
    setData((current) => ({
      ...current,
      attackTypes: current.attackTypes.filter((type) => type.id !== selectedAttack.id),
      units: current.units.map((unit) => (unit.attackType === selectedAttack.id ? { ...unit, attackType: fallback } : unit)),
      traits: current.traits.map((trait) => ({
        ...trait,
        filters: trait.filters?.attackTypeId === selectedAttack.id ? { ...trait.filters, attackTypeId: fallback } : trait.filters,
      })),
    }));
    setAttackId(fallback);
  };

  const deleteDefense = () => {
    if (!selectedDefense || data.defenseTypes.length <= 1) return;
    const fallback = data.defenseTypes.find((type) => type.id !== selectedDefense.id)?.id ?? '';
    setData((current) => ({
      ...current,
      defenseTypes: current.defenseTypes.filter((type) => type.id !== selectedDefense.id),
      units: current.units.map((unit) => (unit.defenseType === selectedDefense.id ? { ...unit, defenseType: fallback } : unit)),
      traits: current.traits.map((trait) => ({
        ...trait,
        filters: trait.filters?.defenseTypeId === selectedDefense.id ? { ...trait.filters, defenseTypeId: fallback } : trait.filters,
      })),
    }));
    setDefenseId(fallback);
  };

  const deleteTrait = () => {
    if (!selectedTrait) return;
    setData((current) => ({
      ...current,
      traits: current.traits.filter((trait) => trait.id !== selectedTrait.id),
      races: current.races.map((race) => ({ ...race, traitIds: race.traitIds.filter((id) => id !== selectedTrait.id) })),
    }));
    setTraitId(data.traits.find((trait) => trait.id !== selectedTrait.id)?.id ?? '');
  };

  const matrixValue = (attackTypeId: string, defenseTypeId: string) =>
    data.typeMatrix.find((entry) => entry.attackTypeId === attackTypeId && entry.defenseTypeId === defenseTypeId)?.multiplier ?? 1;

  const updateMatrix = (attackTypeId: string, defenseTypeId: string, multiplier: number) => {
    setData((current) => ({
      ...current,
      typeMatrix: current.typeMatrix.map((entry) =>
        entry.attackTypeId === attackTypeId && entry.defenseTypeId === defenseTypeId ? { ...entry, multiplier } : entry,
      ),
    }));
  };

  const resetMatrix = () => {
    setData((current) => ({
      ...current,
      typeMatrix: current.attackTypes.flatMap((attackType) =>
        current.defenseTypes.map((defenseType) => ({ attackTypeId: attackType.id, defenseTypeId: defenseType.id, multiplier: 1 })),
      ),
    }));
  };

  const adjustAttackRow = (attackTypeId: string, amount: number) => {
    setData((current) => ({
      ...current,
      typeMatrix: current.typeMatrix.map((entry) =>
        entry.attackTypeId === attackTypeId ? { ...entry, multiplier: round2(Math.max(0, entry.multiplier + amount)) } : entry,
      ),
    }));
  };

  const adjustDefenseColumn = (defenseTypeId: string, amount: number) => {
    setData((current) => ({
      ...current,
      typeMatrix: current.typeMatrix.map((entry) =>
        entry.defenseTypeId === defenseTypeId ? { ...entry, multiplier: round2(Math.max(0, entry.multiplier + amount)) } : entry,
      ),
    }));
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        subtitle="공격/방어 타입, 상성 배율, 태그, 특성, 공용 스킬 템플릿을 관리합니다."
        title="세부설정"
      />

      <div className="panel flex gap-2 overflow-x-auto p-2">
        {panels.map((panel) => (
          <button
            className={`min-h-11 shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${
              activePanel === panel.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'
            }`}
            key={panel.id}
            onClick={() => setActivePanel(panel.id)}
            type="button"
          >
            {panel.label}
          </button>
        ))}
      </div>

      {activePanel === 'attack' ? (
        <TypeEditor
          canDelete={data.attackTypes.length > 1}
          items={data.attackTypes}
          label="공격 타입"
          onAdd={addAttack}
          onDelete={deleteAttack}
          onSelect={setAttackId}
          onUpdate={updateAttack}
          selected={selectedAttack}
        />
      ) : null}

      {activePanel === 'defense' ? (
        <TypeEditor
          canDelete={data.defenseTypes.length > 1}
          items={data.defenseTypes}
          label="방어 타입"
          onAdd={addDefense}
          onDelete={deleteDefense}
          onSelect={setDefenseId}
          onUpdate={updateDefense}
          selected={selectedDefense}
        />
      ) : null}

      {activePanel === 'matrix' ? (
        <section className="panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-ink">타입 상성표</h3>
            <button className="btn" onClick={resetMatrix} type="button">
              <RotateCcw size={16} />
              전체 1.0 초기화
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MatrixAdjust label="선택 공격 타입 전체 +0.1" onClick={() => selectedAttack && adjustAttackRow(selectedAttack.id, 0.1)} />
            <MatrixAdjust label="선택 방어 타입 전체 -0.1" onClick={() => selectedDefense && adjustDefenseColumn(selectedDefense.id, -0.1)} />
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[680px] gap-1" style={{ gridTemplateColumns: `104px repeat(${data.defenseTypes.length}, minmax(92px, 1fr))` }}>
              <div className="chip text-center">공격/방어</div>
              {data.defenseTypes.map((type) => (
                <button className="chip text-center" key={type.id} onClick={() => setDefenseId(type.id)} type="button">
                  {type.name}
                </button>
              ))}
              {data.attackTypes.map((attackType) => (
                <Fragment key={attackType.id}>
                  <button className="chip flex items-center justify-center text-center font-semibold text-ink" onClick={() => setAttackId(attackType.id)} type="button">
                    {attackType.name}
                  </button>
                  {data.defenseTypes.map((defenseType) => {
                    const value = matrixValue(attackType.id, defenseType.id);
                    return (
                      <input
                        className={`min-h-11 rounded-md border px-2 text-center text-sm text-ink outline-none focus:border-cyan ${matrixClass(value)}`}
                        key={`${attackType.id}:${defenseType.id}`}
                        min={0}
                        onChange={(event) => updateMatrix(attackType.id, defenseType.id, Number(event.target.value) || 0)}
                        step={0.05}
                        type="number"
                        value={value}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activePanel === 'tags' ? (
        <section className="panel space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-ink">태그 설정</h3>
            <button className="btn btn-primary" onClick={addTag} type="button">
              <Plus size={16} />태그 추가
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px]">
            <input className="field" onChange={(event) => setTagSearch(event.target.value)} placeholder="태그 검색" value={tagSearch} />
            <select className="field" onChange={(event) => setTagCategoryFilter(event.target.value as UnitTagCategory | '전체')} value={tagCategoryFilter}>
              <option value="전체">전체</option>
              {tagCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filteredTags.map((tag) => (
              <button
                className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${selectedTag?.id === tag.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'}`}
                key={tag.id}
                onClick={() => setTagId(tag.id)}
                type="button"
              >
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tag.color ?? '#a9b1d6' }} />
                {tag.name}
              </button>
            ))}
          </div>
          {selectedTag ? (
            <div className="space-y-3 rounded-md border border-line bg-[#10151f] p-3">
              <TextField label="태그 이름" onChange={(name) => updateTag({ name })} value={selectedTag.name} />
              <TextField label="설명" multiline onChange={(description) => updateTag({ description })} value={selectedTag.description} />
              <label className="block">
                <span className="label">카테고리</span>
                <select className="field" onChange={(event) => updateTag({ category: event.target.value as UnitTagCategory })} value={selectedTag.category}>
                  {tagCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <div>
                <span className="label">색상</span>
                <div className="flex flex-wrap gap-2">
                  {tagColors.map((color) => (
                    <button
                      aria-label={`색상 ${color}`}
                      className={`h-11 w-11 rounded-md border ${selectedTag.color === color ? 'border-ink' : 'border-line'}`}
                      key={color}
                      onClick={() => updateTag({ color })}
                      style={{ backgroundColor: color }}
                      type="button"
                    />
                  ))}
                </div>
              </div>
              <TextField label="메모" multiline onChange={(notes) => updateTag({ notes })} value={selectedTag.notes} />
              <button className="btn btn-danger w-full" onClick={deleteTag} type="button">
                <Trash2 size={16} />태그 삭제
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {activePanel === 'traits' ? (
        <TraitSettings
          data={data}
          onAdd={addTrait}
          onAddPreset={addTraitPreset}
          onDelete={deleteTrait}
          onSelect={setTraitId}
          onUpdate={updateTrait}
          selectedPreset={selectedTraitPreset}
          selectedTrait={selectedTrait}
          setSelectedPreset={setSelectedTraitPreset}
        />
      ) : null}

      {activePanel === 'skills' ? (
        <SkillTemplateSettings
          attackTypes={data.attackTypes}
          onAdd={addSkill}
          onAddPreset={addSkillPreset}
          onDelete={deleteSkill}
          onDuplicate={duplicateSkill}
          onSelect={setSkillId}
          onUpdate={updateSkill}
          selectedPreset={selectedSkillPreset}
          selectedSkill={selectedSkill}
          setSelectedPreset={setSelectedSkillPreset}
          skills={data.skillTemplates}
          tags={data.unitTags.map((tag) => tag.name)}
        />
      ) : null}

      {activePanel === 'icons' ? <IconSettings /> : null}
    </div>
  );
}

function TypeEditor<T extends AttackType | DefenseType>({
  canDelete,
  items,
  label,
  onAdd,
  onDelete,
  onSelect,
  onUpdate,
  selected,
}: {
  canDelete: boolean;
  items: T[];
  label: string;
  onAdd: () => void;
  onDelete: () => void;
  onSelect: (id: string) => void;
  onUpdate: (patch: Partial<T>) => void;
  selected?: T;
}) {
  return (
    <section className="panel space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">{label}</h3>
        <button className="btn btn-primary" onClick={onAdd} type="button"><Plus size={16} />추가</button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <button
            className={`shrink-0 rounded-md border px-3 py-2 text-sm ${selected?.id === item.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'}`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            {item.name}
          </button>
        ))}
      </div>
      {selected ? (
        <div className="space-y-3">
          <TextField label="이름" onChange={(name) => onUpdate({ name } as Partial<T>)} value={selected.name} />
          <TextField label="설명" multiline onChange={(description) => onUpdate({ description } as Partial<T>)} value={selected.description} />
          <TextField label="메모" multiline onChange={(notes) => onUpdate({ notes } as Partial<T>)} value={selected.notes} />
          <button className="btn btn-danger w-full" disabled={!canDelete} onClick={onDelete} type="button">
            <Trash2 size={16} />삭제
          </button>
        </div>
      ) : null}
    </section>
  );
}

function MatrixAdjust({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="btn min-h-11" onClick={onClick} type="button">{label}</button>;
}

function TraitSettings({
  data,
  onAdd,
  onAddPreset,
  onDelete,
  onSelect,
  onUpdate,
  selectedPreset,
  selectedTrait,
  setSelectedPreset,
}: {
  data: AppData;
  onAdd: () => void;
  onAddPreset: () => void;
  onDelete: () => void;
  onSelect: (id: string) => void;
  onUpdate: (patch: Partial<Trait>) => void;
  selectedPreset: string;
  selectedTrait?: Trait;
  setSelectedPreset: (value: string) => void;
}) {
  const effect = selectedTrait?.effectsV2?.[0] ?? { type: 'attackPercent' as TraitEffectTypeV2, value: 10 };
  const editableEffect = (traitEffects as TraitEffectTypeV2[]).includes(effect.type)
    ? effect
    : { ...effect, type: 'attackPercent' as TraitEffectTypeV2 };
  const tags = data.unitTags.map((tag) => tag.name);

  const updateFilters = (patch: NonNullable<Trait['filters']>) => {
    if (!selectedTrait) return;
    onUpdate({ filters: { ...(selectedTrait.filters ?? {}), ...patch } });
  };

  const toggleTag = (tag: string) => {
    if (!selectedTrait) return;
    const current = selectedTrait.filters?.tags ?? [];
    updateFilters({ tags: current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag] });
  };

  return (
    <section className="panel space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">특성 설정</h3>
        <button className="btn btn-primary" onClick={onAdd} type="button"><Plus size={16} />빈 특성</button>
      </div>
      <p className="rounded-md border border-cyan/20 bg-cyan/5 px-3 py-2 text-xs leading-relaxed text-muted">
        특성은 전투 시작 전에 팩션 전체에 적용되는 패시브 규칙입니다. 복잡한 조건은 데이터로 저장되고, 현재 전투 적용은 전투 시작/항상 조건 중심입니다.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <select className="field" onChange={(event) => setSelectedPreset(event.target.value)} value={selectedPreset}>
          {traitPresets.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={onAddPreset} type="button"><Plus size={16} />특성 프리셋 추가</button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {data.traits.map((trait) => (
          <button className={`shrink-0 rounded-md border px-3 py-2 text-sm ${selectedTrait?.id === trait.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'}`} key={trait.id} onClick={() => onSelect(trait.id)} type="button">
            {trait.name}
          </button>
        ))}
      </div>
      {selectedTrait ? (
        <div className="space-y-3 rounded-md border border-line bg-[#10151f] p-3">
          <TextField label="특성 이름" onChange={(name) => onUpdate({ name })} value={selectedTrait.name} />
          <TextField label="설명" multiline onChange={(description) => onUpdate({ description })} value={selectedTrait.description} />
          <div className="rounded-md border border-cyan/20 bg-cyan/5 px-3 py-2">
            <p className="label">자동 설명 미리보기</p>
            <p className="text-sm leading-relaxed text-ink">{formatTraitPreview(selectedTrait, data)}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField label="발동 조건" labels={traitTriggerLabels} onChange={(triggerV2) => onUpdate({ triggerV2: triggerV2 as TraitTrigger })} options={traitTriggers} value={selectedTrait.triggerV2 ?? 'battleStart'} />
            <SelectField label="대상" labels={traitTargetLabels} onChange={(targetV2) => onUpdate({ targetV2: targetV2 as TraitTarget })} options={traitTargets} value={selectedTrait.targetV2 ?? 'allAllies'} />
            <SelectField label="효과 타입" labels={traitEffectV2Labels} onChange={(type) => onUpdate({ effectsV2: [{ ...editableEffect, type: type as TraitEffectTypeV2 }] })} options={traitEffects} value={editableEffect.type} />
            <NumberStepper label="수치" min={-999} onChange={(value) => onUpdate({ effectsV2: [{ ...editableEffect, value }] })} value={editableEffect.value} />
          </div>
          <div>
            <span className="label">태그 필터</span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const checked = selectedTrait.filters?.tags?.includes(tag) ?? false;
                return (
                  <button className={`min-h-11 rounded-md border px-3 py-2 text-sm font-semibold ${checked ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'}`} key={tag} onClick={() => toggleTag(tag)} type="button">
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField label="공격 타입 필터" onChange={(attackTypeId) => updateFilters({ attackTypeId: attackTypeId || undefined })} options={['', ...data.attackTypes.map((type) => type.id)]} labels={Object.fromEntries([['', '전체'], ...data.attackTypes.map((type) => [type.id, type.name])])} value={selectedTrait.filters?.attackTypeId ?? ''} />
            <SelectField label="방어 타입 필터" onChange={(defenseTypeId) => updateFilters({ defenseTypeId: defenseTypeId || undefined })} options={['', ...data.defenseTypes.map((type) => type.id)]} labels={Object.fromEntries([['', '전체'], ...data.defenseTypes.map((type) => [type.id, type.name])])} value={selectedTrait.filters?.defenseTypeId ?? ''} />
            <SelectField label="영웅 여부" onChange={(value) => updateFilters({ isHero: value === '' ? undefined : value === 'true' })} options={['', 'true', 'false']} labels={{ '': '전체', true: '영웅만', false: '일반 유닛만' }} value={typeof selectedTrait.filters?.isHero === 'boolean' ? String(selectedTrait.filters.isHero) : ''} />
          </div>
          <label className="flex items-center gap-2 rounded-md border border-line bg-[#0f141f] p-3 text-sm text-ink">
            <input checked={selectedTrait.stackable ?? false} onChange={(event) => onUpdate({ stackable: event.target.checked })} type="checkbox" />
            중첩 가능
          </label>
          <TextField label="메모" multiline onChange={(notes) => onUpdate({ notes })} value={selectedTrait.notes} />
          <button className="btn btn-danger w-full" onClick={onDelete} type="button"><Trash2 size={16} />특성 삭제</button>
        </div>
      ) : null}
    </section>
  );
}

function SkillTemplateSettings({
  attackTypes,
  onAdd,
  onAddPreset,
  onDelete,
  onDuplicate,
  onSelect,
  onUpdate,
  selectedPreset,
  selectedSkill,
  setSelectedPreset,
  skills,
  tags,
}: {
  attackTypes: AttackType[];
  onAdd: () => void;
  onAddPreset: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelect: (id: string) => void;
  onUpdate: (patch: Partial<Skill>) => void;
  selectedPreset: string;
  selectedSkill?: Skill;
  setSelectedPreset: (value: string) => void;
  skills: Skill[];
  tags: string[];
}) {
  const area = selectedSkill?.area ?? { type: 'single' as const };
  const attackTypeOptions = ['', ...attackTypes.map((type) => type.id)];
  const attackTypeLabels = Object.fromEntries([
    ['', '유닛 기본 타입'],
    ...attackTypes.map((type) => [type.id, type.name]),
  ]);
  const toggleTag = (tag: string) => {
    if (!selectedSkill) return;
    const current = selectedSkill.tags ?? [];
    onUpdate({ tags: current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag] });
  };

  return (
    <section className="panel space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">공용 스킬 템플릿</h3>
        <button className="btn btn-primary" onClick={onAdd} type="button"><Plus size={16} />빈 스킬</button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <select className="field" onChange={(event) => setSelectedPreset(event.target.value)} value={selectedPreset}>
          {skillPresets.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={onAddPreset} type="button"><Plus size={16} />프리셋에서 추가</button>
      </div>
      <div>
        <span className="label">내가 만든 공용 스킬</span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {skills.map((skill) => (
            <button className={`shrink-0 rounded-md border px-3 py-2 text-sm ${selectedSkill?.id === skill.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'}`} key={skill.id} onClick={() => onSelect(skill.id)} type="button">
              {skill.name}
            </button>
          ))}
        </div>
      </div>
      {selectedSkill ? (
        <div className="space-y-3 rounded-md border border-line bg-[#10151f] p-3">
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={onDuplicate} type="button"><Copy size={16} />복제</button>
            <button className="btn btn-danger" onClick={onDelete} type="button"><Trash2 size={16} />삭제</button>
          </div>
          <TextField label="스킬 이름" onChange={(name) => onUpdate({ name })} value={selectedSkill.name} />
          <TextField label="설명" multiline onChange={(description) => onUpdate({ description })} value={selectedSkill.description} />
          <div className="rounded-md border border-cyan/20 bg-cyan/5 px-3 py-2">
            <p className="label">자동 설명 미리보기</p>
            <p className="text-sm leading-relaxed text-ink">{formatSkillAutoDescription(selectedSkill)}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField label="발동 조건" labels={skillTriggerLabels} onChange={(trigger) => onUpdate({ trigger: trigger as SkillTrigger })} options={skillTriggers} value={selectedSkill.trigger} />
            <SelectField label="대상" labels={skillTargetLabels} onChange={(target) => onUpdate({ target: target as SkillTarget })} options={skillTargets} value={selectedSkill.target} />
            <SelectField label="효과" labels={skillEffectLabels} onChange={(effectType) => onUpdate({ effectType: effectType as SkillEffectType })} options={skillEffects} value={selectedSkill.effectType} />
            {selectedSkill.effectType === 'damage' ? (
              <SelectField label="피해 타입" labels={attackTypeLabels} onChange={(attackTypeId) => onUpdate({ attackTypeId: attackTypeId || undefined })} options={attackTypeOptions} value={selectedSkill.attackTypeId ?? ''} />
            ) : null}
            <SelectField label="수치 타입" labels={skillValueTypeLabels} onChange={(valueType) => onUpdate({ valueType: valueType as Skill['valueType'] })} options={['flat', 'percent']} value={selectedSkill.valueType} />
            <NumberStepper label="수치" min={-999} onChange={(value) => onUpdate({ value })} value={selectedSkill.value} />
            <NumberStepper label="쿨타임" onChange={(cooldown) => onUpdate({ cooldown })} step={0.5} value={selectedSkill.cooldown} />
            <NumberStepper label="MP 소모" onChange={(mpCost) => onUpdate({ mpCost })} value={selectedSkill.mpCost} />
            <NumberStepper label="발동 확률 %" max={100} onChange={(chance) => onUpdate({ chance })} value={selectedSkill.chance} />
            <NumberStepper label="지속 시간" onChange={(duration) => onUpdate({ duration })} step={0.5} value={selectedSkill.duration} />
            <NumberStepper label="최대 발동 횟수" onChange={(maxActivations) => onUpdate({ maxActivations: maxActivations > 0 ? maxActivations : undefined })} value={selectedSkill.maxActivations ?? 0} />
            <SelectField label="영역" labels={skillAreaLabels} onChange={(type) => onUpdate({ area: { ...area, type: type as SkillArea['type'] } })} options={skillAreas} value={area.type} />
            <NumberStepper label="반경" min={0} onChange={(radius) => onUpdate({ area: { ...area, radius } })} value={area.radius ?? 0} />
            <NumberStepper label="길이" min={0} onChange={(length) => onUpdate({ area: { ...area, length } })} value={area.length ?? 0} />
          </div>
          <div>
            <span className="label">스킬 태그</span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const checked = selectedSkill.tags?.includes(tag) ?? false;
                return (
                  <button className={`min-h-11 rounded-md border px-3 py-2 text-sm font-semibold ${checked ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'}`} key={tag} onClick={() => toggleTag(tag)} type="button">
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
          <SkillConditionBuilder availableTags={tags} onUpdate={onUpdate} skill={selectedSkill} />
          <TextField label="메모" multiline onChange={(notes) => onUpdate({ notes })} value={selectedSkill.notes} />
        </div>
      ) : null}
    </section>
  );
}

function IconSettings() {
  const descriptions: Record<string, string> = {
    sword: '근접 전투 유닛에 적합합니다.',
    bow: '활, 투척, 원거리 물리 유닛에 적합합니다.',
    gun: '화기, 에너지 사격 유닛에 적합합니다.',
    shield: '탱커와 방어형 유닛에 적합합니다.',
    magic: '주문과 마법 화력 유닛에 적합합니다.',
    heal: '치유와 지원 유닛에 적합합니다.',
    beast: '야수형 유닛에 적합합니다.',
    machine: '기계 문명 유닛에 적합합니다.',
    hero: '영웅 유닛에 적합합니다.',
    skull: '언데드와 저주 계열 유닛에 적합합니다.',
    tank: '중장갑, 전차형 유닛에 적합합니다.',
    artillery: '포병과 공성 유닛에 적합합니다.',
  };

  return (
    <section className="panel space-y-3">
      <h3 className="font-semibold text-ink">아이콘 설정</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {unitIconTypes.map((type) => (
          <div className="rounded-md border border-line bg-[#10151f] p-3" key={type}>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-md border border-cyan/30 bg-cyan/10 text-cyan">
                <UnitIcon className="h-6 w-6" type={type} />
              </span>
              <div>
                <p className="font-bold text-ink">{unitIconLabels[type]}</p>
                <p className="font-mono text-xs text-muted">{type}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{descriptions[type]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SelectField({
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
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function matrixClass(value: number) {
  if (value >= 1.2) return 'border-acid/40 bg-acid/10';
  if (value <= 0.8) return 'border-danger/40 bg-danger/10';
  return 'border-line bg-[#0f141d]';
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function renameTagEverywhere(current: AppData, previousName: string, nextName: string): Partial<AppData> {
  const renameList = (tags: string[] | undefined) => (tags ?? []).map((tag) => (tag === previousName ? nextName : tag));
  return {
    units: current.units.map((unit) => ({
      ...unit,
      tags: renameList(unit.tags),
      skillsV2: (unit.skillsV2 ?? []).map((skill) => ({ ...skill, tags: renameList(skill.tags) })),
    })),
    traits: current.traits.map((trait) => ({
      ...trait,
      filters: { ...(trait.filters ?? {}), tags: renameList(trait.filters?.tags) },
    })),
    skillTemplates: current.skillTemplates.map((skill) => ({ ...skill, tags: renameList(skill.tags) })),
  };
}
