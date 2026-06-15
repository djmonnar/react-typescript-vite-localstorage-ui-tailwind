import type { Skill, SkillEffectType } from '../types';

const durationEffectTypes = new Set<SkillEffectType>([
  'attackBuff',
  'defenseBuff',
  'moveSpeedBuff',
  'attackSpeedBuff',
  'rangeBuff',
  'slow',
  'stun',
  'poison',
  'burn',
  'taunt',
]);

export function skillUsesDuration(skill: Skill): boolean {
  return durationEffectTypes.has(skill.effectType);
}
