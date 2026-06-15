import { Plus, Trash2, WandSparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import {
  createSkillFromPreset,
  createTraitFromPreset,
  factionWizardCompositions,
  factionWizardStyles,
  skillPresets,
  traitPresets,
  type FactionWizardComposition,
  type FactionWizardStyle,
} from '../data/presets';
import type { AppData, Race, Skill, Trait, Unit } from '../types';
import { createId, nowIso } from '../utils/ids';

interface FactionsPageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
}

export function FactionsPage({ data, setData }: FactionsPageProps) {
  const [selectedId, setSelectedId] = useState(data.races[0]?.id ?? '');
  const [wizardOpen, setWizardOpen] = useState(false);
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

  const createWizardFaction = (draft: WizardDraft) => {
    const factionId = createId('race');
    const style = factionWizardStyles.find((candidate) => candidate.id === draft.styleId) ?? factionWizardStyles[0];
    const composition = factionWizardCompositions.find((candidate) => candidate.id === draft.compositionId) ?? factionWizardCompositions[0];
    const createdAt = nowIso();

    setData((current) => {
      const { traits, traitIds } = resolveWizardTraits(current.traits, style);
      const units = buildWizardUnits(current, factionId, style, composition, createdAt);
      const hero = units.find((unit) => unit.isHero);
      const nextFaction: Race = {
        id: factionId,
        name: draft.name.trim() || `${style.name} 팩션`,
        concept: draft.concept.trim() || style.concept,
        description: draft.description.trim() || style.description,
        traitIds,
        unitIds: units.map((unit) => unit.id),
        heroUnitId: hero?.id ?? '',
        notes: `팩션 생성 마법사: ${style.name} / ${composition.name}`,
        createdAt,
        updatedAt: createdAt,
      };

      return {
        ...current,
        races: [...current.races, nextFaction],
        units: [...current.units, ...units],
        traits,
      };
    });

    setSelectedId(factionId);
    setWizardOpen(false);
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
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => setWizardOpen(true)} type="button">
              <WandSparkles size={16} />
              팩션 생성 마법사
            </button>
            <button className="btn btn-primary" onClick={addFaction} type="button">
              <Plus size={16} />
              추가
            </button>
          </div>
        }
        subtitle="팩션 컨셉, 특성, 대표 영웅, 메모를 관리합니다."
        title="팩션 관리"
      />

      {wizardOpen ? (
        <FactionWizard
          data={data}
          onClose={() => setWizardOpen(false)}
          onCreate={createWizardFaction}
        />
      ) : null}

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
                {unit.isHero ? '영웅 ' : ''}
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

interface WizardDraft {
  name: string;
  concept: string;
  description: string;
  styleId: FactionWizardStyle['id'];
  compositionId: FactionWizardComposition['id'];
}

function FactionWizard({
  data,
  onClose,
  onCreate,
}: {
  data: AppData;
  onClose: () => void;
  onCreate: (draft: WizardDraft) => void;
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>({
    name: '새로운 팩션',
    concept: factionWizardStyles[0].concept,
    description: factionWizardStyles[0].description,
    styleId: factionWizardStyles[0].id,
    compositionId: factionWizardCompositions[0].id,
  });
  const style = factionWizardStyles.find((candidate) => candidate.id === draft.styleId) ?? factionWizardStyles[0];
  const composition =
    factionWizardCompositions.find((candidate) => candidate.id === draft.compositionId) ?? factionWizardCompositions[0];
  const previewUnits = composition.roles.map((role, index) => wizardUnitName(style, role, index));

  const updateDraft = (patch: Partial<WizardDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const selectStyle = (nextStyle: FactionWizardStyle) => {
    updateDraft({
      styleId: nextStyle.id,
      concept: draft.concept === style.concept ? nextStyle.concept : draft.concept,
      description: draft.description === style.description ? nextStyle.description : draft.description,
    });
  };

  return (
    <section className="panel space-y-4 border-cyan/40 bg-cyan/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">팩션 생성 마법사</p>
          <h3 className="text-lg font-bold text-cyan">{step}단계 / 5단계</h3>
        </div>
        <button className="btn" onClick={onClose} type="button">
          <X size={16} />
          닫기
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <div className={`h-1.5 rounded ${value <= step ? 'bg-cyan' : 'bg-line'}`} key={value} />
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <TextField label="팩션명" onChange={(name) => updateDraft({ name })} value={draft.name} />
          <TextField label="팩션 컨셉" onChange={(concept) => updateDraft({ concept })} value={draft.concept} />
          <TextField label="설명" multiline onChange={(description) => updateDraft({ description })} value={draft.description} />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">스타일을 고르면 추천 태그, 특성, 스킬이 자동으로 구성됩니다.</p>
          <div className="grid gap-2">
            {factionWizardStyles.map((candidate) => (
              <button
                className={`rounded-md border p-3 text-left ${
                  candidate.id === style.id ? 'border-cyan bg-cyan/15' : 'border-line bg-[#0f141d]'
                }`}
                key={candidate.id}
                onClick={() => selectStyle(candidate)}
                type="button"
              >
                <span className="block text-sm font-bold text-ink">{candidate.name}</span>
                <span className="mt-1 block text-xs text-muted">{candidate.description}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {candidate.recommendedTags.map((tag) => (
                    <span className="chip text-[10px]" key={tag}>{tag}</span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">생성될 기본 유닛 구성을 선택합니다.</p>
          <div className="grid gap-2">
            {factionWizardCompositions.map((candidate) => (
              <button
                className={`rounded-md border p-3 text-left ${
                  candidate.id === composition.id ? 'border-cyan bg-cyan/15' : 'border-line bg-[#0f141d]'
                }`}
                key={candidate.id}
                onClick={() => updateDraft({ compositionId: candidate.id })}
                type="button"
              >
                <span className="block text-sm font-bold text-ink">{candidate.name}</span>
                <span className="mt-1 block text-xs text-muted">{candidate.description}</span>
                <span className="mt-2 block font-mono text-[10px] text-acid">{candidate.roles.length} 유닛 생성</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step >= 4 ? (
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-[#0f141d] p-3">
            <p className="label">생성 미리보기</p>
            <h4 className="text-base font-bold text-ink">{draft.name || `${style.name} 팩션`}</h4>
            <p className="mt-1 text-sm text-muted">{draft.concept || style.concept}</p>
          </div>
          <PreviewList label="팩션 특성" values={style.recommendedTraits} />
          <PreviewList label="유닛 목록" values={previewUnits} />
          <PreviewList label="영웅" values={previewUnits.slice(-1)} />
          <PreviewList label="주요 태그" values={style.recommendedTags} />
          <PreviewList label="주요 스킬" values={style.recommendedSkills} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button className="btn" disabled={step <= 1} onClick={() => setStep((current) => Math.max(1, current - 1))} type="button">
          이전
        </button>
        {step < 5 ? (
          <button className="btn btn-primary" onClick={() => setStep((current) => Math.min(5, current + 1))} type="button">
            다음
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => onCreate(draft)} type="button">
            생성
          </button>
        )}
      </div>

      {data.attackTypes.length === 0 || data.defenseTypes.length === 0 ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          공격 타입과 방어 타입이 최소 1개씩 있어야 유닛을 생성할 수 있습니다.
        </p>
      ) : null}
    </section>
  );
}

function PreviewList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span className="chip" key={value}>{value}</span>
        ))}
      </div>
    </div>
  );
}

function resolveWizardTraits(existingTraits: Trait[], style: FactionWizardStyle): { traits: Trait[]; traitIds: string[] } {
  const traits = [...existingTraits];
  const traitIds: string[] = [];

  for (const name of style.recommendedTraits) {
    const existing = traits.find((trait) => trait.name === name);
    if (existing) {
      traitIds.push(existing.id);
      continue;
    }

    const preset = traitPresets.find((candidate) => candidate.name === name);
    if (!preset) continue;
    const trait = createTraitFromPreset(preset);
    traits.push(trait);
    traitIds.push(trait.id);
  }

  return { traits, traitIds };
}

function buildWizardUnits(
  data: AppData,
  factionId: string,
  style: FactionWizardStyle,
  composition: FactionWizardComposition,
  timestamp: string,
): Unit[] {
  const attackFallback = data.attackTypes[0]?.id ?? '';
  const defenseFallback = data.defenseTypes[0]?.id ?? '';

  return composition.roles.map((role, index) => {
    const stats = roleStats(role, style);
    const isHero = role === 'hero';
    const tags = [...new Set([...style.recommendedTags.filter((tag) => tag !== '중장갑'), ...roleTags(role), ...(isHero ? ['영웅'] : [])])];
    const skillsV2 = wizardSkillsForRole(style, role);
    const unit: Unit = {
      id: createId('unit'),
      raceId: factionId,
      name: wizardUnitName(style, role, index),
      role: roleLabel(role),
      isHero,
      hp: stats.hp,
      mp: stats.mp,
      shield: stats.shield,
      attack: stats.attack,
      defense: stats.defense,
      attackType: attackTypeForRole(data, style, role) ?? attackFallback,
      defenseType: defenseTypeForStyle(data, style, role) ?? defenseFallback,
      range: stats.range,
      moveSpeed: stats.moveSpeed,
      attackSpeed: stats.attackSpeed,
      tags,
      skills: `${style.name} 마법사 생성 유닛`,
      skillsV2,
      cost: stats.cost,
      buildTime: stats.buildTime,
      notes: `${style.name} / ${composition.name} 구성으로 생성됨`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return unit;
  });
}

function wizardSkillsForRole(style: FactionWizardStyle, role: FactionWizardComposition['roles'][number]): Skill[] {
  const preferred = role === 'hero'
    ? style.recommendedSkills
    : role === 'support'
      ? style.recommendedSkills.filter((name) => ['응급 치유', '전술 보호막', '전투 함성'].includes(name))
      : role === 'tank'
        ? style.recommendedSkills.filter((name) => ['방패 올리기', '전술 보호막', '광폭화'].includes(name))
        : style.recommendedSkills.filter((name) => ['강타', '독침', '마력 폭발', '광폭화'].includes(name));
  const names = preferred.length > 0 ? preferred : style.recommendedSkills.slice(0, 1);
  return names
    .map((name) => skillPresets.find((preset) => preset.name === name))
    .filter((preset): preset is NonNullable<typeof preset> => Boolean(preset))
    .map(createSkillFromPreset);
}

function roleStats(role: FactionWizardComposition['roles'][number], style: FactionWizardStyle) {
  const beastSpeed = style.id === 'beast' ? 0.35 : 0;
  const machineShield = style.id === 'machine' ? 12 : 0;
  const arcaneHpPenalty = style.id === 'arcane' ? -12 : 0;
  const undeadHp = style.id === 'undead' ? 18 : 0;
  const table = {
    melee: { hp: 115 + undeadHp, mp: 0, shield: 8 + machineShield, attack: 22, defense: 4, range: 1, moveSpeed: 3 + beastSpeed, attackSpeed: 1.05, cost: 80, buildTime: 18 },
    ranged: { hp: 82 + arcaneHpPenalty, mp: 25, shield: 6 + machineShield, attack: 27, defense: 2, range: 4, moveSpeed: 2.6 + beastSpeed, attackSpeed: 0.9, cost: 115, buildTime: 24 },
    tank: { hp: 190 + undeadHp, mp: 10, shield: 28 + machineShield, attack: 16, defense: 8, range: 1, moveSpeed: 2.1 + beastSpeed, attackSpeed: 0.7, cost: 130, buildTime: 30 },
    support: { hp: 90 + arcaneHpPenalty, mp: 70, shield: 12 + machineShield, attack: 14, defense: 3, range: 3, moveSpeed: 2.5 + beastSpeed, attackSpeed: 0.75, cost: 140, buildTime: 32 },
    elite: { hp: 130 + undeadHp, mp: 35, shield: 14 + machineShield, attack: 36, defense: 5, range: 3, moveSpeed: 2.7 + beastSpeed, attackSpeed: 0.85, cost: 210, buildTime: 42 },
    hero: { hp: 340 + undeadHp, mp: 90, shield: 45 + machineShield, attack: 48, defense: 10, range: style.id === 'arcane' ? 5 : 2, moveSpeed: 2.5 + beastSpeed, attackSpeed: 0.85, cost: 520, buildTime: 70 },
  } satisfies Record<FactionWizardComposition['roles'][number], Omit<Unit, 'id' | 'raceId' | 'name' | 'role' | 'isHero' | 'attackType' | 'defenseType' | 'tags' | 'skills' | 'skillsV2' | 'notes' | 'createdAt' | 'updatedAt'>>;
  return table[role];
}

function roleTags(role: FactionWizardComposition['roles'][number]): string[] {
  if (role === 'melee') return ['근접', '딜러'];
  if (role === 'ranged') return ['원거리', '딜러'];
  if (role === 'tank') return ['근접', '탱커'];
  if (role === 'support') return ['원거리', '지원가'];
  if (role === 'elite') return ['딜러'];
  return ['영웅', '딜러'];
}

function roleLabel(role: FactionWizardComposition['roles'][number]): string {
  const labels = {
    melee: '기본 근접 유닛',
    ranged: '기본 원거리 유닛',
    tank: '탱커',
    support: '지원 유닛',
    elite: '고급 딜러',
    hero: '영웅',
  };
  return labels[role];
}

function wizardUnitName(style: FactionWizardStyle, role: FactionWizardComposition['roles'][number], index: number): string {
  const names = {
    machine: { melee: '철권 보병', ranged: '증기 사수', tank: '장갑 파수병', support: '정비 기술자', elite: '강철 포격수', hero: '기계군주 아르곤' },
    beast: { melee: '발톱 전사', ranged: '가시 사냥꾼', tank: '거대 멧전사', support: '야생 주술사', elite: '광분 추적자', hero: '붉은발톱 라칸' },
    arcane: { melee: '룬검 수행자', ranged: '마력 사수', tank: '결계 수호자', support: '치유 술사', elite: '마도 폭격수', hero: '대마도사 세린' },
    sanctuary: { melee: '성역 검사', ranged: '빛의 궁수', tank: '방패 기사', support: '성가 치유사', elite: '심판관', hero: '성기사 레오나' },
    undead: { melee: '망자 보병', ranged: '뼈 투창병', tank: '묘지 파수꾼', support: '혼령 사제', elite: '검은 집행자', hero: '사령군주 모르칸' },
  } satisfies Record<FactionWizardStyle['id'], Record<FactionWizardComposition['roles'][number], string>>;
  return `${names[style.id][role]}${index > 0 && role !== 'hero' ? ` ${index + 1}` : ''}`;
}

function attackTypeForRole(data: AppData, style: FactionWizardStyle, role: FactionWizardComposition['roles'][number]): string | undefined {
  if (style.id === 'arcane' || role === 'support') return findTypeId(data.attackTypes, ['마법']);
  if (role === 'ranged') return findTypeId(data.attackTypes, ['관통', '폭발']);
  if (role === 'elite') return findTypeId(data.attackTypes, ['폭발', '마법', '관통']);
  return findTypeId(data.attackTypes, ['물리']);
}

function defenseTypeForStyle(data: AppData, style: FactionWizardStyle, role: FactionWizardComposition['roles'][number]): string | undefined {
  if (style.id === 'machine') return findTypeId(data.defenseTypes, ['기계', '중장갑']);
  if (style.id === 'arcane' && role !== 'tank') return findTypeId(data.defenseTypes, ['영체', '생체']);
  if (role === 'tank') return findTypeId(data.defenseTypes, ['중장갑']);
  return findTypeId(data.defenseTypes, ['생체', '경장갑']);
}

function findTypeId<T extends { id: string; name: string }>(types: T[], names: string[]): string | undefined {
  return names.map((name) => types.find((type) => type.name.includes(name))?.id).find(Boolean) ?? types[0]?.id;
}
