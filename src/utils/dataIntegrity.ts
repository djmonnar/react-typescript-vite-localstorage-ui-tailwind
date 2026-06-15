import type { AppData, BattlePreset, Trait, TypeMatrix, Unit, UnitIconType } from '../types';
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
    traits: data.traits.map(normalizeTrait),
    races: data.races.map((race) => ({
      ...race,
      traitIds: race.traitIds.filter((id) => traitIds.has(id)),
      unitIds: race.unitIds.filter((id) => unitIds.has(id)),
      heroUnitId: unitIds.has(race.heroUnitId) ? race.heroUnitId : '',
    })),
    typeMatrix: ensureMatrix(data),
    battlePresets: data.battlePresets.map((preset) => normalizePreset(preset, unitIds)),
  };
}

function normalizeUnit(unit: Unit): Unit {
  return {
    ...unit,
    unitCost: Math.max(1, Math.round(Number(unit.unitCost ?? unit.cost / 50) || 1)),
    iconType: normalizeIconType(unit.iconType, unit),
    tags: Array.isArray(unit.tags) ? [...new Set(unit.tags.filter(Boolean))] : [],
    skillsV2: Array.isArray(unit.skillsV2)
      ? unit.skillsV2.map((skill) => {
          const chance = Number(skill.chance ?? 100);
          return {
            ...skill,
            valueType: skill.valueType ?? 'flat',
            cooldown: Number(skill.cooldown) || 0,
            mpCost: Number(skill.mpCost) || 0,
            chance: Math.max(0, Math.min(100, Number.isFinite(chance) ? chance : 100)),
            duration: Number(skill.duration) || 0,
            tags: Array.isArray(skill.tags) ? [...new Set(skill.tags.filter(Boolean))] : [],
          };
        })
      : [],
  };
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
  };
}
