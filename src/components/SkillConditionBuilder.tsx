import { Plus, Trash2 } from 'lucide-react';
import type { ConditionLogic, Skill, SkillCondition, SkillConditionType } from '../types';
import { createId } from '../utils/ids';
import {
  conditionCompareLabels,
  conditionLogicLabels,
  conditionTargetSideLabels,
  formatSkillConditions,
  formatSkillCondition,
  skillConditionTypeLabels,
} from '../utils/labels';
import { NumberStepper } from './NumberStepper';

interface SkillConditionBuilderProps {
  availableTags: string[];
  defaultOpen?: boolean;
  onUpdate: (patch: Partial<Skill>) => void;
  skill: Skill;
}

const conditionTypes = Object.keys(skillConditionTypeLabels) as SkillConditionType[];
const compareOptions = Object.keys(conditionCompareLabels) as NonNullable<SkillCondition['compare']>[];
const targetSideOptions = Object.keys(conditionTargetSideLabels) as NonNullable<SkillCondition['targetSide']>[];
const logicOptions = Object.keys(conditionLogicLabels) as ConditionLogic[];

const valueConditions: SkillConditionType[] = [
  'selfHpBelow',
  'selfHpAbove',
  'selfMpAbove',
  'allyHpBelow',
  'enemyHpBelow',
  'shieldBelow',
];
const rangeConditions: SkillConditionType[] = ['enemyInRange', 'allyInRange', 'enemyInLine', 'allyInLine'];
const radiusCountConditions: SkillConditionType[] = ['enemyCountInRadius', 'allyCountInRadius'];
const tagConditions: SkillConditionType[] = ['targetHasTag', 'allyHasTag', 'enemyHasTag'];

function defaultCondition(): SkillCondition {
  return {
    id: createId('condition'),
    type: 'always',
  };
}

export function SkillConditionBuilder({ availableTags, defaultOpen = false, onUpdate, skill }: SkillConditionBuilderProps) {
  const conditions = skill.conditions?.length ? skill.conditions : [defaultCondition()];

  const updateCondition = (conditionId: string, patch: Partial<SkillCondition>) => {
    onUpdate({
      conditions: conditions.map((condition) => (
        condition.id === conditionId ? { ...condition, ...patch } : condition
      )),
    });
  };

  const addCondition = () => {
    onUpdate({ conditions: [...conditions, defaultCondition()] });
  };

  const deleteCondition = (conditionId: string) => {
    const nextConditions = conditions.filter((condition) => condition.id !== conditionId);
    onUpdate({ conditions: nextConditions.length > 0 ? nextConditions : [defaultCondition()] });
  };

  const toggleTag = (condition: SkillCondition, tag: string) => {
    const current = condition.tags ?? [];
    updateCondition(condition.id, {
      tags: current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    });
  };

  return (
    <details className="rounded-md border border-cyan/20 bg-cyan/5 p-3 open:space-y-3" open={defaultOpen}>
      <summary className="cursor-pointer list-none space-y-2 marker:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-cyan">추가 사용 조건</p>
          <span className="rounded-md border border-cyan/20 bg-[#0b1018] px-2 py-1 text-[10px] text-muted">열기/닫기</span>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          발동 타이밍이 왔을 때, 이 조건을 만족해야 실제로 스킬을 사용합니다.
        </p>
        <p className="rounded-md border border-cyan/20 bg-[#0b1018] px-3 py-2 text-xs leading-relaxed text-ink">
          {formatSkillConditions({ ...skill, conditions })}
        </p>
      </summary>

      <label className="block">
        <span className="label">조건 연결 방식</span>
        <select
          className="field"
          onChange={(event) => onUpdate({ conditionLogic: event.target.value as ConditionLogic })}
          value={skill.conditionLogic ?? 'AND'}
        >
          {logicOptions.map((logic) => (
            <option key={logic} value={logic}>{conditionLogicLabels[logic]}</option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div className="rounded-md border border-line bg-[#10151f] p-3" key={condition.id}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-muted">조건 {index + 1}</p>
                <p className="mt-1 text-sm text-ink">{formatSkillCondition(condition)}</p>
              </div>
              <button className="btn btn-danger" onClick={() => deleteCondition(condition.id)} type="button">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">조건 종류</span>
                <select
                  className="field"
                  onChange={(event) => updateCondition(condition.id, { type: event.target.value as SkillConditionType })}
                  value={condition.type}
                >
                  {conditionTypes.map((type) => (
                    <option key={type} value={type}>{skillConditionTypeLabels[type]}</option>
                  ))}
                </select>
              </label>

              {valueConditions.includes(condition.type) ? (
                <>
                  <NumberStepper
                    label={condition.type.includes('Hp') ? '기준 HP %' : condition.type === 'selfMpAbove' ? '기준 MP' : '기준 보호막'}
                    max={condition.type.includes('Hp') ? 100 : undefined}
                    min={0}
                    onChange={(value) => updateCondition(condition.id, { value })}
                    value={condition.value ?? (condition.type.includes('Above') ? 50 : 30)}
                  />
                  <label className="block">
                    <span className="label">비교</span>
                    <select
                      className="field"
                      onChange={(event) => updateCondition(condition.id, { compare: event.target.value as SkillCondition['compare'] })}
                      value={condition.compare ?? (condition.type.includes('Above') ? 'gte' : 'lte')}
                    >
                      {compareOptions.map((compare) => (
                        <option key={compare} value={compare}>{conditionCompareLabels[compare]}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}

              {condition.type === 'shieldBelow' ? (
                <label className="block">
                  <span className="label">검사 대상</span>
                  <select
                    className="field"
                    onChange={(event) => updateCondition(condition.id, { targetSide: event.target.value as SkillCondition['targetSide'] })}
                    value={condition.targetSide ?? 'self'}
                  >
                    {targetSideOptions.map((side) => (
                      <option key={side} value={side}>{conditionTargetSideLabels[side]}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {rangeConditions.includes(condition.type) ? (
                <NumberStepper
                  label="거리"
                  min={1}
                  max={10}
                  onChange={(range) => updateCondition(condition.id, { range })}
                  value={condition.range ?? 1}
                />
              ) : null}

              {radiusCountConditions.includes(condition.type) ? (
                <>
                  <NumberStepper
                    label="반경"
                    min={1}
                    max={10}
                    onChange={(radius) => updateCondition(condition.id, { radius })}
                    value={condition.radius ?? 1}
                  />
                  <NumberStepper
                    label="필요 수"
                    min={1}
                    max={20}
                    onChange={(count) => updateCondition(condition.id, { count })}
                    value={condition.count ?? 2}
                  />
                </>
              ) : null}
            </div>

            {tagConditions.includes(condition.type) ? (
              <div className="mt-3">
                <span className="label">태그 조건</span>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const checked = condition.tags?.includes(tag) ?? false;
                    return (
                      <button
                        className={`min-h-11 rounded-md border px-3 py-2 text-sm font-semibold ${checked ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'}`}
                        key={tag}
                        onClick={() => toggleTag(condition, tag)}
                        type="button"
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <button className="btn w-full" onClick={addCondition} type="button">
        <Plus size={16} />
        조건 추가
      </button>
    </details>
  );
}
