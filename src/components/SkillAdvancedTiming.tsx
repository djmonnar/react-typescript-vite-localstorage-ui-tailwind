import type { Skill } from '../types';
import { skillUsesDuration } from '../utils/skillRules';
import { NumberStepper } from './NumberStepper';

interface SkillAdvancedTimingProps {
  skill: Skill;
  onUpdate: (patch: Partial<Skill>) => void;
}

export function SkillAdvancedTiming({ onUpdate, skill }: SkillAdvancedTimingProps) {
  const hasMaxActivationLimit = typeof skill.maxActivations === 'number' && skill.maxActivations > 0;

  return (
    <>
      {skillUsesDuration(skill) ? (
        <div>
          <NumberStepper label="지속 시간" onChange={(duration) => onUpdate({ duration })} step={0.5} value={skill.duration} />
          <p className="mt-2 text-xs leading-5 text-muted">
            0이면 전투가 끝날 때까지 유지됩니다.
          </p>
        </div>
      ) : (
        <NotApplicableCard
          label="지속 시간"
          text="이 효과는 한 번 적용되는 단발성 효과라 지속 시간이 없습니다."
        />
      )}

      {hasMaxActivationLimit ? (
        <div>
          <NumberStepper
            label="최대 발동 횟수"
            min={1}
            onChange={(maxActivations) => onUpdate({ maxActivations: maxActivations > 0 ? maxActivations : undefined })}
            value={skill.maxActivations ?? 1}
          />
          <button className="btn mt-2 min-h-11 w-full" onClick={() => onUpdate({ maxActivations: undefined })} type="button">
            무한 발동으로 변경
          </button>
        </div>
      ) : (
        <NotApplicableCard
          actionLabel="횟수 제한 설정"
          label="최대 발동 횟수"
          onAction={() => onUpdate({ maxActivations: 1 })}
          text="해당 없음 · 제한 없이 발동합니다."
        />
      )}
    </>
  );
}

function NotApplicableCard({
  actionLabel,
  label,
  onAction,
  text,
}: {
  actionLabel?: string;
  label: string;
  onAction?: () => void;
  text: string;
}) {
  return (
    <div className="rounded-md border border-line bg-[#10151f] p-3">
      <span className="label">{label}</span>
      <p className="mt-2 text-sm font-bold text-ink">해당 없음</p>
      <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
      {onAction && actionLabel ? (
        <button className="btn mt-3 min-h-11 w-full" onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
