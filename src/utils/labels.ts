import type {
  AppData,
  BattleReplaySkillEvent,
  PassiveTraitEffectType,
  Skill,
  SkillEffectType,
  SkillTarget,
  SkillTrigger,
  Trait,
  TraitEffectType,
  TraitEffectTypeV2,
  TraitTarget,
  TraitTrigger,
} from '../types';

export const skillTriggerLabels: Record<SkillTrigger, string> = {
  battleStart: '전투 시작 시',
  onAttack: '기본 공격 시',
  cooldown: '쿨타임마다',
  lowHp: '체력 낮을 때',
  onHit: '피격 시',
  onKill: '적 처치 시',
  onDeath: '사망 시',
  turnStart: '자기 행동 시작 시',
  allyDeath: '아군 사망 시',
  enemyInRange: '적이 사거리 안에 있을 때',
};

export const skillTargetLabels: Record<SkillTarget, string> = {
  self: '자신',
  allyLowestHp: '체력이 가장 낮은 아군',
  allAllies: '모든 아군',
  enemyTarget: '현재 공격 대상',
  enemyLowestHp: '체력이 가장 낮은 적',
  allEnemies: '모든 적',
  enemiesInRange: '사거리 안의 적',
  nearestEnemy: '가장 가까운 적',
  farthestEnemy: '가장 먼 적',
  alliesInRange: '사거리 안의 아군',
  randomEnemy: '무작위 적',
  randomAlly: '무작위 아군',
  enemiesWithTag: '태그가 맞는 적',
  alliesWithTag: '태그가 맞는 아군',
  lineArea: '직선 영역',
  circleArea: '원형 영역',
};

export const skillEffectLabels: Record<SkillEffectType, string> = {
  damage: '피해',
  heal: '회복',
  shield: '보호막 부여',
  attackBuff: '공격력 증가',
  defenseBuff: '방어력 증가',
  moveSpeedBuff: '이동속도 증가',
  attackSpeedBuff: '공격속도 증가',
  rangeBuff: '사거리 증가',
  mpRestore: 'MP 회복',
  pull: '끌어오기',
  push: '밀쳐내기',
  stun: '기절',
  slow: '감속',
  poison: '독',
  burn: '화상',
  summon: '소환',
  cleanse: '정화',
  removeShield: '보호막 제거',
};

export const skillValueTypeLabels: Record<Skill['valueType'], string> = {
  flat: '고정 수치',
  percent: '퍼센트',
};

export const skillAreaLabels: Record<NonNullable<Skill['area']>['type'], string> = {
  single: '단일',
  line: '직선',
  circle: '원형',
  cross: '십자',
};

export const legacyTraitEffectLabels: Record<TraitEffectType, string> = {
  allHpPercent: '모든 유닛 HP %',
  allAttackPercent: '모든 유닛 공격력 %',
  allDefenseFlat: '모든 유닛 방어력 고정값',
  defenseTypeAttackPercent: '특정 방어타입 유닛 공격력 %',
  attackTypeAttackPercent: '특정 공격타입 유닛 공격력 %',
  productionSpeedPercent: '생산속도 %',
  moveSpeedPercent: '이동속도 %',
};

export const passiveTraitEffectLabels: Record<PassiveTraitEffectType, string> = {
  hpPercent: 'HP',
  attackPercent: '공격력',
  defenseFlat: '방어력',
  shieldPercent: '보호막',
  moveSpeedPercent: '이동속도',
  attackSpeedPercent: '공격속도',
};

export const traitTriggerLabels: Record<TraitTrigger, string> = {
  battleStart: '전투 시작 시',
  always: '항상',
  firstTurn: '첫 행동 시',
  whenHeroAlive: '영웅 생존 중',
  whenOutnumbered: '수가 적을 때',
  whenEnemyHasTag: '적에게 특정 태그가 있을 때',
};

export const traitTargetLabels: Record<TraitTarget, string> = {
  allAllies: '모든 아군',
  unitsWithTags: '태그가 맞는 유닛',
  heroes: '영웅',
  nonHeroes: '일반 유닛',
  meleeUnits: '근접 유닛',
  rangedUnits: '원거리 유닛',
};

export const traitEffectV2Labels: Record<TraitEffectTypeV2, string> = {
  hpPercent: 'HP %',
  shieldPercent: '보호막 %',
  attackPercent: '공격력 %',
  defenseFlat: '방어력 고정값',
  moveSpeedPercent: '이동속도 %',
  moveSpeedFlat: '이동속도 고정값',
  rangeFlat: '사거리 고정값',
  attackSpeedPercent: '공격속도 %',
  mpFlat: 'MP 고정값',
  skillCooldownPercent: '스킬 쿨타임 %',
  unitCostDiscount: '유닛 코스트 할인',
};

export function teamLabel(team: 'A' | 'B'): string {
  return `${team} 팩션`;
}

export function winnerLabel(winner: 'A' | 'B' | 'Draw', factionAName?: string, factionBName?: string): string {
  if (winner === 'A') return factionAName ?? 'A 팩션';
  if (winner === 'B') return factionBName ?? 'B 팩션';
  return '무승부';
}

export function formatSkillAutoDescription(skill: Skill): string {
  const value = skill.valueType === 'percent' ? `${skill.value}%` : `${skill.value}`;
  const chance = skill.chance < 100 ? `${skill.chance}% 확률로 ` : '';
  const mpCost = skill.mpCost > 0 ? `MP ${skill.mpCost}을 소모해 ` : '';
  const cooldown = skill.cooldown > 0 ? `${skill.cooldown}초마다 ` : '';
  const duration = skill.duration > 0 ? ` ${skill.duration}초 동안` : '';
  const target = skillTargetLabels[skill.target];
  const trigger = skillTriggerLabels[skill.trigger];
  const effect = skillEffectLabels[skill.effectType];

  if (skill.effectType === 'damage') return `${trigger} ${chance}${target}에게 ${value}의 피해를 줍니다.`;
  if (skill.effectType === 'heal') return `${cooldown || `${trigger} `}${mpCost}${target}을 ${value} 회복합니다.`;
  if (skill.effectType === 'shield') return `${trigger} ${target}에게 보호막 ${value}를 부여합니다.`;
  if (skill.effectType === 'mpRestore') return `${trigger} ${target}의 MP를 ${value} 회복합니다.`;
  if (skill.effectType === 'removeShield') return `${trigger} ${target}의 보호막을 ${value} 제거합니다.`;
  return `${trigger} ${chance}${target}에게 ${effect} ${value} 효과를${duration} 부여합니다.`;
}

export function formatSkillShortLine(skill: Skill): string {
  return `${skillTriggerLabels[skill.trigger]} / ${skillTargetLabels[skill.target]} / ${skillEffectLabels[skill.effectType]}`;
}

export function formatSkillEventSummary(event: BattleReplaySkillEvent): string {
  return `${teamLabel(event.casterTeam)}:${event.casterName} 스킬 ${event.skillName} -> ${event.targetNames.join(', ')}`;
}

export function formatTraitPreview(trait: Trait, data: AppData): string {
  const filters = trait.filters ?? {};
  const effect = trait.effectsV2?.[0] ?? trait.effects?.[0];
  if (!effect) return '아직 설정된 효과가 없습니다.';

  const targetParts: string[] = [];
  if (trait.targetV2) targetParts.push(traitTargetLabels[trait.targetV2]);
  if (filters.tags?.length) targetParts.push(`${filters.tags.join(', ')} 태그`);
  if (filters.attackTypeId) {
    const name = data.attackTypes.find((type) => type.id === filters.attackTypeId)?.name ?? '선택한 공격 타입';
    targetParts.push(`${name} 공격 타입`);
  }
  if (filters.defenseTypeId) {
    const name = data.defenseTypes.find((type) => type.id === filters.defenseTypeId)?.name ?? '선택한 방어 타입';
    targetParts.push(`${name} 방어 타입`);
  }
  if (filters.isHero === true) targetParts.push('영웅');
  if (filters.isHero === false) targetParts.push('일반 유닛');

  const trigger = traitTriggerLabels[trait.triggerV2 ?? 'battleStart'];
  const target = targetParts.length > 0 ? targetParts.join(', ') : '모든 아군';
  const label = 'type' in effect && effect.type in traitEffectV2Labels
    ? traitEffectV2Labels[effect.type as TraitEffectTypeV2]
    : passiveTraitEffectLabels[effect.type as PassiveTraitEffectType];
  const percent = String(effect.type).includes('Percent') ? '%' : '';
  return `${trigger}, ${target}의 ${label}이 ${effect.value}${percent} 적용됩니다.`;
}
