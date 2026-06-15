export interface TagPersonality {
  name: string;
  summary: string;
  battleRule: string;
}

export const tacticalTagPersonalities: TagPersonality[] = [
  {
    name: '후방공격',
    summary: '적의 등 뒤를 노리는 전술 태그',
    battleRule: '가능하면 적 뒤쪽 타일로 이동하고, 등 뒤에서 공격하면 피해가 50% 증가합니다.',
  },
  {
    name: '무빙샷',
    summary: '거리를 벌리며 싸우는 원거리 전술 태그',
    battleRule: '사거리 안에서 공격할 수 있으면 가능한 한 적과의 거리를 벌리며 공격합니다.',
  },
  {
    name: '야포',
    summary: '근접전이 불가능한 포격 태그',
    battleRule: '인접한 적은 공격할 수 없습니다. 가까이 붙은 적이 있으면 물러나서 사격하려고 합니다.',
  },
];

export function getTagPersonality(tagName: string): TagPersonality | undefined {
  return tacticalTagPersonalities.find((personality) => personality.name === tagName);
}
