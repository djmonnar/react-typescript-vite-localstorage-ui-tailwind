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
} from '../types';

export const skillTriggerLabels: Record<SkillTrigger, string> = {
  battleStart: '전투 시작 시',
  onAttack: '기본 공격 시',
  cooldown: '쿨타임마다',
  lowHp: '체력 낮을 때',
};

export const skillTargetLabels: Record<SkillTarget, string> = {
  self: '자신',
  allyLowestHp: '체력이 가장 낮은 아군',
  allAllies: '모든 아군',
  enemyTarget: '현재 공격 대상',
  enemyLowestHp: '체력이 가장 낮은 적',
  allEnemies: '모든 적',
  enemiesInRange: '사거리 안의 적',
};

export const skillEffectLabels: Record<SkillEffectType, string> = {
  damage: '피해',
  heal: '회복',
  shield: '보호막 부여',
  attackBuff: '공격력 증가',
  defenseBuff: '방어력 증가',
  moveSpeedBuff: '이동속도 증가',
  attackSpeedBuff: '공격속도 증가',
};

export const skillValueTypeLabels: Record<Skill['valueType'], string> = {
  flat: '고정 수치',
  percent: '퍼센트',
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
  const cooldown = skill.cooldown > 0 ? `${skill.cooldown}초마다 ` : '쿨타임마다 ';
  const duration = skill.duration > 0 ? ` ${skill.duration}초 동안` : '';
  const target = skillTargetLabels[skill.target];

  if (skill.effectType === 'damage') {
    if (skill.trigger === 'onAttack') return `기본 공격 시 ${chance}${target}에게 ${value}의 추가 피해를 줍니다.`;
    if (skill.trigger === 'cooldown') return `${cooldown}${mpCost}${target}에게 ${value}의 피해를 줍니다.`;
    if (skill.trigger === 'battleStart') return `전투 시작 시 ${target}에게 ${value}의 피해를 줍니다.`;
    return `체력이 낮을 때 ${chance}${target}에게 ${value}의 피해를 줍니다.`;
  }

  if (skill.effectType === 'heal') {
    if (skill.trigger === 'cooldown') return `${cooldown}${mpCost}${target}을 ${value} 회복합니다.`;
    return `${skillTriggerLabels[skill.trigger]} ${chance}${target}을 ${value} 회복합니다.`;
  }

  if (skill.effectType === 'shield') {
    if (skill.trigger === 'battleStart') return `전투 시작 시 ${target}에게 보호막 ${value}를 부여합니다.`;
    if (skill.trigger === 'cooldown') return `${cooldown}${mpCost}${target}에게 보호막 ${value}를 부여합니다.`;
    return `${skillTriggerLabels[skill.trigger]} ${chance}${target}에게 보호막 ${value}를 부여합니다.`;
  }

  return `${skillTriggerLabels[skill.trigger]} ${chance}${target}에게 ${skillEffectLabels[skill.effectType]} ${value} 버프를${duration} 부여합니다.`;
}

export function formatSkillShortLine(skill: Skill): string {
  return `${skillTriggerLabels[skill.trigger]} / ${skillTargetLabels[skill.target]} / ${skillEffectLabels[skill.effectType]}`;
}

export function formatSkillEventSummary(event: BattleReplaySkillEvent): string {
  return `${teamLabel(event.casterTeam)}:${event.casterName} 스킬 ${event.skillName} -> ${event.targetNames.join(', ')}`;
}

export function formatTraitPreview(trait: Trait, data: AppData): string {
  const filters = trait.filters ?? {};
  const effect = trait.effects?.[0];
  if (!effect) return '전투 시작 시, 조건에 맞는 아군 유닛에게 아직 설정되지 않은 효과를 적용합니다.';

  const targetParts: string[] = [];
  if (filters.tags?.length) targetParts.push(`${filters.tags.join(', ')} 태그를 가진`);
  if (filters.attackTypeId) {
    const name = data.attackTypes.find((type) => type.id === filters.attackTypeId)?.name ?? '선택한 공격 타입';
    targetParts.push(`${name} 공격 타입`);
  }
  if (filters.defenseTypeId) {
    const name = data.defenseTypes.find((type) => type.id === filters.defenseTypeId)?.name ?? '선택한 방어 타입';
    targetParts.push(`${name} 방어 타입`);
  }
  if (filters.isHero === true) targetParts.push('영웅');
  if (filters.isHero === false) targetParts.push('일반');

  const target = targetParts.length > 0 ? `${targetParts.join(', ')} 아군 유닛` : '모든 아군 유닛';
  const amount = effect.type.endsWith('Percent') ? `${effect.value}%` : `${effect.value}`;
  const direction = effect.value >= 0 ? '증가합니다' : '감소합니다';
  return `전투 시작 시, ${target}의 ${passiveTraitEffectLabels[effect.type]}이 ${amount} ${direction}.`;
}
