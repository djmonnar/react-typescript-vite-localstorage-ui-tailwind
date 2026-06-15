import type { TagBehaviorType, UnitTag, UnitTagBehavior } from '../types';

export interface TagBehaviorDefinition {
  type: TagBehaviorType;
  label: string;
  shortLabel: string;
  description: string;
  valueLabel?: string;
  targetTagsLabel?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}

export const tagBehaviorDefinitions: TagBehaviorDefinition[] = [
  {
    type: 'seekBackAttack',
    label: '뒤를 노림',
    shortLabel: '뒤 노림',
    description: '사거리 안에 적이 있어도 가능하면 적의 등 뒤 타일로 이동한 뒤 공격합니다.',
  },
  {
    type: 'backAttackDamagePercent',
    label: '백어택 피해 증가',
    shortLabel: '백어택 +%',
    description: '등 뒤에서 공격할 때 피해량이 증가합니다. 백어택 판정은 방향을 기준으로 계산됩니다.',
    valueLabel: '피해 증가 %',
    defaultValue: 50,
    min: 0,
    max: 300,
    step: 5,
  },
  {
    type: 'kite',
    label: '거리 벌림',
    shortLabel: '거리 벌림',
    description: '공격 가능한 상태라면 가능한 한 적과의 거리를 벌리며 싸웁니다.',
  },
  {
    type: 'cannotAttackAdjacent',
    label: '인접 공격 불가',
    shortLabel: '근접 불가',
    description: '인접한 적은 공격할 수 없습니다. 붙은 적이 있으면 물러나서 공격하려고 합니다.',
  },
  {
    type: 'tagDamageMultiplier',
    label: '특정 태그 추가 피해',
    shortLabel: '태그 피해',
    description: '선택한 태그를 가진 대상에게 주는 피해가 배율만큼 증가합니다. 예: 150%는 1.5배 피해입니다.',
    valueLabel: '피해 배율 %',
    targetTagsLabel: '추가 피해 대상 태그',
    defaultValue: 150,
    min: 0,
    max: 500,
    step: 5,
  },
  {
    type: 'flyingMove',
    label: '비행 이동',
    shortLabel: '비행',
    description: '이동거리가 된다면 적과 아군이 있는 타일을 뛰어넘어 목적지로 이동할 수 있습니다.',
  },
  {
    type: 'jumpPackMove',
    label: '점프팩 이동',
    shortLabel: '점프팩',
    description: '이동거리가 된다면 아군이 있는 타일을 뛰어넘어 목적지로 이동할 수 있습니다. 적은 뛰어넘지 못합니다.',
  },
  {
    type: 'assassinateBackline',
    label: '암살',
    shortLabel: '암살',
    description: '사거리가 가능하다면 뒤쪽에 있는 적을 우선 노립니다.',
  },
  {
    type: 'killCatch',
    label: '킬캐치',
    shortLabel: '킬캐치',
    description: '사거리가 가능하다면 현재 체력이 가장 낮은 적을 우선 노립니다.',
  },
];

const defaultBehaviorsByTagName: Record<string, UnitTagBehavior[]> = {
  후방공격: [
    { type: 'seekBackAttack' },
    { type: 'backAttackDamagePercent', value: 50 },
  ],
  무빙샷: [{ type: 'kite' }],
  야포: [
    { type: 'cannotAttackAdjacent' },
    { type: 'kite' },
  ],
  비행: [{ type: 'flyingMove' }],
  점프팩: [{ type: 'jumpPackMove' }],
  암살: [{ type: 'assassinateBackline' }],
  킬캐치: [{ type: 'killCatch' }],
};

export function getDefaultTagBehaviors(tagName: string): UnitTagBehavior[] {
  return cloneBehaviors(defaultBehaviorsByTagName[tagName] ?? []);
}

export function normalizeTagBehaviors(tagName: string, behaviors: UnitTagBehavior[] | undefined): UnitTagBehavior[] {
  const source = Array.isArray(behaviors) && behaviors.length > 0 ? behaviors : getDefaultTagBehaviors(tagName);
  const byType = new Map<TagBehaviorType, UnitTagBehavior>();

  for (const behavior of source) {
    const definition = tagBehaviorDefinitions.find((candidate) => candidate.type === behavior.type);
    if (!definition) continue;
    byType.set(behavior.type, {
      type: behavior.type,
      value: definition.valueLabel ? Number(behavior.value ?? definition.defaultValue ?? 0) : undefined,
      targetTags: definition.targetTagsLabel && Array.isArray(behavior.targetTags) ? [...new Set(behavior.targetTags.filter(Boolean))] : undefined,
    });
  }

  return [...byType.values()];
}

export function resolveTagBehaviors(tagName: string, unitTags: UnitTag[]): UnitTagBehavior[] {
  const tag = unitTags.find((candidate) => candidate.name === tagName);
  return normalizeTagBehaviors(tagName, tag?.behaviors);
}

export function describeTagBehavior(behavior: UnitTagBehavior): string {
  const definition = tagBehaviorDefinitions.find((candidate) => candidate.type === behavior.type);
  if (!definition) return behavior.type;
  const targetTags = behavior.targetTags?.length ? ` (${behavior.targetTags.join(', ')})` : '';
  if (definition.valueLabel) return `${definition.label} ${behavior.value ?? definition.defaultValue ?? 0}%${targetTags}`;
  return definition.label;
}

function cloneBehaviors(behaviors: UnitTagBehavior[]): UnitTagBehavior[] {
  return behaviors.map((behavior) => ({ ...behavior }));
}
