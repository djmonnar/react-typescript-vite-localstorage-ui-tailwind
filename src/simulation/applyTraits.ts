import type { AppData, Race, Trait, Unit } from '../types';

export interface EffectiveUnit extends Unit {
  effectiveHp: number;
  effectiveShield: number;
  effectiveAttack: number;
  effectiveDefense: number;
  effectiveMoveSpeed: number;
}

function traitApplies(unit: Unit, trait: Trait): boolean {
  if (trait.targetFilter.attackTypeId && unit.attackType !== trait.targetFilter.attackTypeId) return false;
  if (trait.targetFilter.defenseTypeId && unit.defenseType !== trait.targetFilter.defenseTypeId) return false;
  return true;
}

function passiveTraitApplies(unit: Unit, trait: Trait): boolean {
  if (trait.trigger && trait.trigger !== 'battleStart') return false;
  if (trait.triggerV2 && trait.triggerV2 !== 'battleStart' && trait.triggerV2 !== 'always') return false;
  if (trait.targetSide && trait.targetSide !== 'ally') return false;
  if (trait.targetV2 === 'heroes' && !unit.isHero) return false;
  if (trait.targetV2 === 'nonHeroes' && unit.isHero) return false;
  if (trait.targetV2 === 'meleeUnits' && unit.range > 1) return false;
  if (trait.targetV2 === 'rangedUnits' && unit.range <= 1) return false;
  if (trait.filters?.attackTypeId && unit.attackType !== trait.filters.attackTypeId) return false;
  if (trait.filters?.defenseTypeId && unit.defenseType !== trait.filters.defenseTypeId) return false;
  if (typeof trait.filters?.isHero === 'boolean' && unit.isHero !== trait.filters.isHero) return false;

  const requiredTags = trait.filters?.tags ?? [];
  if (requiredTags.length > 0 && !requiredTags.every((tag) => unit.tags.includes(tag))) return false;

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
  };

  const traits = data.traits.filter((trait) => race?.traitIds.includes(trait.id));
  for (const trait of traits) {
    if (traitApplies(unit, trait)) {
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
      if (trait.effectType === 'moveSpeedPercent') {
        base.effectiveMoveSpeed *= 1 + trait.value / 100;
      }
    }

    if (!passiveTraitApplies(unit, trait)) continue;

    const effects = trait.effectsV2 && trait.effectsV2.length > 0 ? trait.effectsV2 : trait.effects ?? [];
    for (const effect of effects) {
      if (effect.type === 'hpPercent') {
        base.effectiveHp *= 1 + effect.value / 100;
      }
      if (effect.type === 'hpFlat') {
        base.effectiveHp += effect.value;
      }
      if (effect.type === 'attackPercent') {
        base.effectiveAttack *= 1 + effect.value / 100;
      }
      if (effect.type === 'defenseFlat') {
        base.effectiveDefense += effect.value;
      }
      if (effect.type === 'mpFlat') {
        base.mp += effect.value;
      }
      if (effect.type === 'shieldPercent') {
        base.effectiveShield *= 1 + effect.value / 100;
      }
      if (effect.type === 'shieldFlat') {
        base.effectiveShield += effect.value;
      }
      if (effect.type === 'moveSpeedPercent') {
        base.effectiveMoveSpeed *= 1 + effect.value / 100;
      }
      if (effect.type === 'moveSpeedFlat') {
        base.effectiveMoveSpeed += effect.value;
      }
      if (effect.type === 'rangeFlat') {
        base.range = Math.max(1, base.range + effect.value);
      }
      if (effect.type === 'attackSpeedPercent') {
        base.attackSpeed *= 1 + effect.value / 100;
      }
    }
  }

  return {
    ...base,
    effectiveHp: Math.round(base.effectiveHp),
    effectiveShield: Math.round(base.effectiveShield),
    effectiveAttack: Math.round(base.effectiveAttack * 10) / 10,
    effectiveDefense: Math.round(base.effectiveDefense * 10) / 10,
    effectiveMoveSpeed: Math.round(base.effectiveMoveSpeed * 100) / 100,
    attackSpeed: Math.round(base.attackSpeed * 100) / 100,
  };
}
