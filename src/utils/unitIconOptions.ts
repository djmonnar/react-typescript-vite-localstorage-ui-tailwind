import type { UnitIconType } from '../types';

export const unitIconLabels: Record<UnitIconType, string> = {
  sword: '근접',
  bow: '활/사격',
  gun: '화기',
  shield: '방어',
  magic: '마법',
  heal: '회복',
  beast: '야수',
  machine: '기계',
  hero: '영웅',
  skull: '언데드',
  tank: '중장갑',
  artillery: '포병',
};

export const unitIconTypes = Object.keys(unitIconLabels) as UnitIconType[];
