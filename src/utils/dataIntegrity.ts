import type { AppData, BattlePreset, SkillCondition, SkillConditionType, Trait, TypeMatrix, Unit, UnitIconType } from '../types';
import { createDefaultUnitTags } from '../data/defaultTags';
import { createSkillFromPreset, skillPresets } from '../data/presets';
import { DEFAULT_MAX_COST, deploymentFromArmy, normalizeDeployment } from './battleGrid';

export function ensureMatrix(data: AppData): TypeMatrix[] {
  const existing = new Map(
    data.typeMatrix.map((entry) => [`${entry.attackTypeId}:${entry.defenseTypeId}`, entry.multiplier]),
  );

  return data.attackTypes.flatMap((attackType) =>
    data.defenseTypes.map((defenseType) => ({
      attackTypeId: attackType.id,
      defenseTypeId: defenseType.id,
      multiplier: existing.get(`${attackType.id}:${defenseType.id}`) ?? 1,
    })),
  );
}

export function normalizeData(data: AppData): AppData {
  const raceIds = new Set(data.races.map((race) => race.id));
  const attackTypeIds = new Set(data.attackTypes.map((type) => type.id));
  const defenseTypeIds = new Set(data.defenseTypes.map((type) => type.id));
  const traitIds = new Set(data.traits.map((trait) => trait.id));
  const unitTags = normalizeUnitTags(data.unitTags, data.units);

  const units = data.units
    .filter(
      (unit) =>
        raceIds.has(unit.raceId) && attackTypeIds.has(unit.attackType) && defenseTypeIds.has(unit.defenseType),
    )
    .map(normalizeUnit);
  const unitIds = new Set(units.map((unit) => unit.id));

  return {
    ...data,
    units,
    unitTags,
    traits: data.traits.map(normalizeTrait),
    races: data.races.map((race) => ({
      ...race,
      traitIds: race.traitIds.filter((id) => traitIds.has(id)),
      unitIds: race.unitIds.filter((id) => unitIds.has(id)),
      heroUnitId: unitIds.has(race.heroUnitId) ? race.heroUnitId : '',
    })),
    typeMatrix: ensureMatrix(data),
    skillTemplates: normalizeSkillTemplates(data.skillTemplates),
    battlePresets: data.battlePresets.map((preset) => normalizePreset(preset, unitIds)),
  };
}

function normalizeUnit(unit: Unit): Unit {
  return {
    ...unit,
    unitCost: Math.max(1, Math.round(Number(unit.unitCost ?? unit.cost / 50) || 1)),
    iconType: normalizeIconType(unit.iconType, unit),
    tags: Array.isArray(unit.tags) ? [...new Set(unit.tags.filter(Boolean))] : [],
    skillsV2: Array.isArray(unit.skillsV2) ? unit.skillsV2.map(normalizeSkill) : [],
  };
}

function normalizeSkillTemplates(skillTemplates: AppData['skillTemplates'] | undefined) {
  const source = Array.isArray(skillTemplates) && skillTemplates.length > 0
    ? skillTemplates
    : skillPresets.map(createSkillFromPreset);
  return source.map(normalizeSkill);
}

function normalizeSkill(skill: Unit['skillsV2'] extends Array<infer T> | undefined ? T : never) {
  const chance = Number(skill.chance ?? 100);
  return {
    ...skill,
    valueType: skill.valueType ?? 'flat',
    cooldown: Number(skill.cooldown) || 0,
    mpCost: Number(skill.mpCost) || 0,
    chance: Math.max(0, Math.min(100, Number.isFinite(chance) ? chance : 100)),
    duration: Number(skill.duration) || 0,
    tags: Array.isArray(skill.tags) ? [...new Set(skill.tags.filter(Boolean))] : [],
    area: skill.area ?? { type: 'single' as const },
    conditionLogic: skill.conditionLogic ?? 'AND',
    conditions: normalizeSkillConditions(skill),
  };
}

function normalizeSkillConditions(skill: Unit['skillsV2'] extends Array<infer T> | undefined ? T : never): SkillCondition[] {
  const source = Array.isArray(skill.conditions) && skill.conditions.length > 0
    ? skill.conditions
    : [{ id: `${skill.id}_condition_always`, type: 'always' as const }];

  return source.map((condition, index) => ({
    id: condition.id || `${skill.id}_condition_${index}`,
    type: normalizeSkillConditionType(condition.type),
    value: Number.isFinite(Number(condition.value)) ? Number(condition.value) : undefined,
    radius: Number.isFinite(Number(condition.radius)) ? Math.max(0, Number(condition.radius)) : undefined,
    range: Number.isFinite(Number(condition.range)) ? Math.max(0, Number(condition.range)) : undefined,
    count: Number.isFinite(Number(condition.count)) ? Math.max(0, Number(condition.count)) : undefined,
    tags: Array.isArray(condition.tags) ? [...new Set(condition.tags.filter(Boolean))] : [],
    compare: condition.compare,
    targetSide: condition.targetSide ?? 'self',
  }));
}

function normalizeSkillConditionType(type: SkillConditionType | undefined): SkillConditionType {
  const allowed: SkillConditionType[] = [
    'always',
    'selfHpBelow',
    'selfHpAbove',
    'selfMpAbove',
    'allyHpBelow',
    'enemyHpBelow',
    'enemyInRange',
    'allyInRange',
    'enemyCountInRadius',
    'allyCountInRadius',
    'enemyInLine',
    'allyInLine',
    'targetHasTag',
    'allyHasTag',
    'enemyHasTag',
    'heroAlive',
    'shieldBelow',
    'noShieldAllyExists',
  ];
  return type && allowed.includes(type) ? type : 'always';
}

function normalizeUnitTags(unitTags: AppData['unitTags'] | undefined, units: Unit[]) {
  const defaults = createDefaultUnitTags();
  const byName = new Map(defaults.map((tag) => [tag.name, tag]));

  for (const tag of unitTags ?? []) {
    if (!tag.name?.trim()) continue;
    byName.set(tag.name, {
      id: tag.id || `tag_${tag.name}`,
      name: tag.name,
      description: tag.description ?? '',
      category: tag.category ?? '커스텀',
      color: tag.color,
      notes: tag.notes ?? '',
    });
  }

  for (const tagName of units.flatMap((unit) => unit.tags ?? [])) {
    if (!tagName?.trim() || byName.has(tagName)) continue;
    byName.set(tagName, {
      id: `tag_${tagName}`,
      name: tagName,
      description: '',
      category: '커스텀',
      color: '#a9b1d6',
      notes: '',
    });
  }

  return [...byName.values()];
}

function normalizePreset(preset: BattlePreset, unitIds: Set<string>): BattlePreset {
  const armyA = preset.armyA.filter((entry) => unitIds.has(entry.unitId));
  const armyB = preset.armyB.filter((entry) => unitIds.has(entry.unitId));
  const deploymentA = normalizeDeployment(preset.deploymentA, 'A', unitIds);
  const deploymentB = normalizeDeployment(preset.deploymentB, 'B', unitIds);

  return {
    ...preset,
    armyA,
    armyB,
    maxCostA: Number(preset.maxCostA) || DEFAULT_MAX_COST,
    maxCostB: Number(preset.maxCostB) || DEFAULT_MAX_COST,
    deploymentA: deploymentA.length > 0 ? deploymentA : deploymentFromArmy(armyA, 'A', unitIds),
    deploymentB: deploymentB.length > 0 ? deploymentB : deploymentFromArmy(armyB, 'B', unitIds),
  };
}

const iconTypes: UnitIconType[] = [
  'sword',
  'bow',
  'gun',
  'shield',
  'magic',
  'heal',
  'beast',
  'machine',
  'hero',
  'skull',
  'tank',
  'artillery',
];

function normalizeIconType(iconType: UnitIconType | undefined, unit: Unit): UnitIconType {
  if (iconType && iconTypes.includes(iconType)) return iconType;
  if (unit.isHero) return 'hero';
  if (unit.defense >= 8 || unit.shield >= 30) return 'shield';
  if (unit.range >= 4) return 'artillery';
  if (unit.range >= 3) return 'bow';
  return 'sword';
}

function normalizeTrait(trait: Trait): Trait {
  return {
    ...trait,
    targetFilter: trait.targetFilter ?? {},
    trigger: trait.trigger ?? 'battleStart',
    targetSide: trait.targetSide ?? 'ally',
    filters: trait.filters ?? {},
    effects: Array.isArray(trait.effects) ? trait.effects : [],
    triggerV2: trait.triggerV2 ?? (trait.trigger === 'battleStart' ? 'battleStart' : 'always'),
    targetV2: trait.targetV2 ?? inferTraitTarget(trait),
    effectsV2: Array.isArray(trait.effectsV2) && trait.effectsV2.length > 0
      ? trait.effectsV2
      : (trait.effects ?? []).map((effect) => ({ type: effect.type, value: effect.value })),
    stackable: trait.stackable ?? false,
  };
}

function inferTraitTarget(trait: Trait) {
  if (trait.filters?.isHero === true) return 'heroes' as const;
  if (trait.filters?.isHero === false) return 'nonHeroes' as const;
  if ((trait.filters?.tags ?? []).length > 0) return 'unitsWithTags' as const;
  return 'allAllies' as const;
}
