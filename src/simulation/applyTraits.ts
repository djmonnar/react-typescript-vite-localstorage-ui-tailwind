import type { AppData, Race, Trait, Unit } from '../types';

export interface EffectiveUnit extends Unit {
  effectiveHp: number;
  effectiveShield: number;
  effectiveAttack: number;
  effectiveDefense: number;
  effectiveMoveSpeed: number;
  effectiveBuildTime: number;
}

function traitApplies(unit: Unit, trait: Trait): boolean {
  if (trait.targetFilter.attackTypeId && unit.attackType !== trait.targetFilter.attackTypeId) return false;
  if (trait.targetFilter.defenseTypeId && unit.defenseType !== trait.targetFilter.defenseTypeId) return false;
  return true;
}

export function getEffectiveUnit(unit: Unit, race: Race | undefined, data: AppData): EffectiveUnit {
  const base: EffectiveUnit = {
    ...unit,
    effectiveHp: unit.hp,
    effectiveShield: unit.shield,
    effectiveAttack: unit.attack,
    effectiveDefense: unit.defense,
    effectiveMoveSpeed: unit.moveSpeed,
    effectiveBuildTime: unit.buildTime,
  };

  const traits = data.traits.filter((trait) => race?.traitIds.includes(trait.id));
  for (const trait of traits) {
    if (!traitApplies(unit, trait)) continue;

    if (trait.effectType === 'allHpPercent') {
      base.effectiveHp *= 1 + trait.value / 100;
    }
    if (trait.effectType === 'allAttackPercent') {
      base.effectiveAttack *= 1 + trait.value / 100;
    }
    if (trait.effectType === 'allDefenseFlat') {
      base.effectiveDefense += trait.value;
    }
    if (trait.effectType === 'defenseTypeAttackPercent' || trait.effectType === 'attackTypeAttackPercent') {
      base.effectiveAttack *= 1 + trait.value / 100;
    }
    if (trait.effectType === 'productionSpeedPercent') {
      base.effectiveBuildTime = Math.max(1, base.effectiveBuildTime / (1 + trait.value / 100));
    }
    if (trait.effectType === 'moveSpeedPercent') {
      base.effectiveMoveSpeed *= 1 + trait.value / 100;
    }
  }

  return {
    ...base,
    effectiveHp: Math.round(base.effectiveHp),
    effectiveShield: Math.round(base.effectiveShield),
    effectiveAttack: Math.round(base.effectiveAttack * 10) / 10,
    effectiveDefense: Math.round(base.effectiveDefense * 10) / 10,
    effectiveMoveSpeed: Math.round(base.effectiveMoveSpeed * 100) / 100,
    effectiveBuildTime: Math.round(base.effectiveBuildTime * 10) / 10,
  };
}
