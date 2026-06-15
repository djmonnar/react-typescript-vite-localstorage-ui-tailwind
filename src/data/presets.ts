import type { PassiveTraitEffectType, Skill, SkillEffectType, SkillTarget, SkillTrigger, Trait } from '../types';
import { createId } from '../utils/ids';

export interface SkillPreset {
  name: string;
  description: string;
  trigger: SkillTrigger;
  target: SkillTarget;
  effectType: SkillEffectType;
  value: number;
  valueType: Skill['valueType'];
  cooldown: number;
  mpCost: number;
  chance: number;
  duration: number;
  maxActivations?: number;
  tags?: string[];
}

export interface TraitPreset {
  name: string;
  description: string;
  tags?: string[];
  isHero?: boolean;
  effectType: PassiveTraitEffectType;
  value: number;
}

export const skillPresets: SkillPreset[] = [
  {
    name: '강타',
    description: '기본 공격 후 일정 확률로 추가 피해를 줍니다.',
    trigger: 'onAttack',
    target: 'enemyTarget',
    effectType: 'damage',
    value: 10,
    valueType: 'flat',
    cooldown: 0,
    mpCost: 0,
    chance: 25,
    duration: 0,
    tags: ['공격'],
  },
  {
    name: '응급 치유',
    description: '쿨타임마다 체력이 가장 낮은 아군을 회복합니다.',
    trigger: 'cooldown',
    target: 'allyLowestHp',
    effectType: 'heal',
    value: 25,
    valueType: 'flat',
    cooldown: 8,
    mpCost: 10,
    chance: 100,
    duration: 0,
    tags: ['회복'],
  },
  {
    name: '전술 보호막',
    description: '전투 시작 시 모든 아군에게 보호막을 부여합니다.',
    trigger: 'battleStart',
    target: 'allAllies',
    effectType: 'shield',
    value: 15,
    valueType: 'flat',
    cooldown: 0,
    mpCost: 0,
    chance: 100,
    duration: 0,
    maxActivations: 1,
    tags: ['보호막'],
  },
  {
    name: '광폭화',
    description: '체력이 낮아지면 자신에게 공격력 증가 버프를 부여합니다.',
    trigger: 'lowHp',
    target: 'self',
    effectType: 'attackBuff',
    value: 20,
    valueType: 'percent',
    cooldown: 0,
    mpCost: 0,
    chance: 100,
    duration: 10,
    maxActivations: 1,
    tags: ['버프'],
  },
  {
    name: '방패 올리기',
    description: '쿨타임마다 자신에게 방어력 증가 버프를 부여합니다.',
    trigger: 'cooldown',
    target: 'self',
    effectType: 'defenseBuff',
    value: 4,
    valueType: 'flat',
    cooldown: 12,
    mpCost: 0,
    chance: 100,
    duration: 6,
    tags: ['방어'],
  },
  {
    name: '독침',
    description: '기본 공격 후 일정 확률로 추가 피해를 줍니다.',
    trigger: 'onAttack',
    target: 'enemyTarget',
    effectType: 'damage',
    value: 8,
    valueType: 'flat',
    cooldown: 0,
    mpCost: 0,
    chance: 35,
    duration: 0,
    tags: ['공격'],
  },
  {
    name: '전투 함성',
    description: '전투 시작 시 모든 아군에게 공격속도 증가 버프를 부여합니다.',
    trigger: 'battleStart',
    target: 'allAllies',
    effectType: 'attackSpeedBuff',
    value: 10,
    valueType: 'percent',
    cooldown: 0,
    mpCost: 0,
    chance: 100,
    duration: 15,
    maxActivations: 1,
    tags: ['버프'],
  },
  {
    name: '마력 폭발',
    description: '쿨타임마다 모든 적에게 피해를 줍니다.',
    trigger: 'cooldown',
    target: 'allEnemies',
    effectType: 'damage',
    value: 12,
    valueType: 'flat',
    cooldown: 15,
    mpCost: 25,
    chance: 100,
    duration: 0,
    tags: ['마법'],
  },
];

export const traitPresets: TraitPreset[] = [
  { name: '강철 장갑', description: '기계 태그 유닛의 방어력이 증가합니다.', tags: ['기계'], effectType: 'defenseFlat', value: 3 },
  { name: '야수 본능', description: '생체 태그 유닛의 이동속도가 증가합니다.', tags: ['생체'], effectType: 'moveSpeedPercent', value: 15 },
  { name: '원거리 숙련', description: '원거리 태그 유닛의 공격력이 증가합니다.', tags: ['원거리'], effectType: 'attackPercent', value: 10 },
  { name: '영웅의 위압감', description: '영웅 유닛의 공격력이 증가합니다.', isHero: true, effectType: 'attackPercent', value: 20 },
  { name: '보호막 증폭', description: '기계 태그 유닛의 보호막이 증가합니다.', tags: ['기계'], effectType: 'shieldPercent', value: 25 },
  { name: '전열 강화', description: '탱커 태그 유닛의 HP가 증가합니다.', tags: ['탱커'], effectType: 'hpPercent', value: 20 },
  { name: '광전사의 피', description: '근접 태그 유닛의 공격속도가 증가합니다.', tags: ['근접'], effectType: 'attackSpeedPercent', value: 15 },
  { name: '마도 회로', description: '마법 태그 유닛의 공격력이 증가합니다.', tags: ['마법'], effectType: 'attackPercent', value: 15 },
];

export function createSkillFromPreset(preset: SkillPreset): Skill {
  return {
    id: createId('skill'),
    name: preset.name,
    description: preset.description,
    trigger: preset.trigger,
    target: preset.target,
    effectType: preset.effectType,
    value: preset.value,
    valueType: preset.valueType,
    cooldown: preset.cooldown,
    mpCost: preset.mpCost,
    chance: preset.chance,
    duration: preset.duration,
    maxActivations: preset.maxActivations,
    tags: preset.tags ?? [],
    notes: '',
  };
}

export function createTraitFromPreset(preset: TraitPreset): Trait {
  return {
    id: createId('trait'),
    name: preset.name,
    description: preset.description,
    effectType: 'allAttackPercent',
    targetFilter: {},
    value: preset.value,
    trigger: 'battleStart',
    targetSide: 'ally',
    filters: {
      tags: preset.tags ?? [],
      isHero: preset.isHero,
    },
    effects: [{ type: preset.effectType, value: preset.value }],
    notes: '',
  };
}
