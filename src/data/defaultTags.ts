import type { UnitTag, UnitTagCategory } from '../types';
import { getTagPersonality } from '../utils/tagPersonalities';

export const defaultUnitTags = [
  '기계',
  '생체',
  '언데드',
  '마법',
  '근접',
  '원거리',
  '탱커',
  '딜러',
  '지원가',
  '공성',
  '영웅',
  '비행',
  '중장갑',
  '경장갑',
  '독',
  '신성',
  '악마',
  '소환수',
  '후방공격',
  '무빙샷',
  '야포',
];

const categoryByTag: Record<string, UnitTagCategory> = {
  기계: '종족',
  생체: '종족',
  언데드: '종족',
  악마: '종족',
  소환수: '종족',
  탱커: '역할',
  딜러: '역할',
  지원가: '역할',
  영웅: '역할',
  근접: '전투방식',
  원거리: '전투방식',
  공성: '전투방식',
  후방공격: '전투방식',
  무빙샷: '전투방식',
  야포: '전투방식',
  비행: '전투방식',
  마법: '속성',
  독: '속성',
  신성: '속성',
  중장갑: '상태',
  경장갑: '상태',
};

const colorByCategory: Record<UnitTagCategory, string> = {
  종족: '#66d9ef',
  역할: '#f6c177',
  전투방식: '#9ece6a',
  속성: '#c792ea',
  상태: '#f7768e',
  커스텀: '#a9b1d6',
};

export function createDefaultUnitTags(): UnitTag[] {
  return defaultUnitTags.map((name) => {
    const category = categoryByTag[name] ?? '커스텀';
    const personality = getTagPersonality(name);
    return {
      id: `tag_${name}`,
      name,
      description: personality?.battleRule ?? `${name} 태그`,
      category,
      color: colorByCategory[category],
      notes: '',
    };
  });
}
