import { Pause, Play, RotateCcw, SkipBack } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  BattleReplay,
  BattleReplayAttackEvent,
  BattleReplayEvent,
  BattleReplayMoveEvent,
  BattleReplaySkillEvent,
  BattleReplayUnit,
} from '../types';
import { formatSkillEventSummary, skillEffectLabels, teamLabel } from '../utils/labels';

interface BattleReplayBoardProps {
  replay: BattleReplay;
}

interface ReplayUnitState extends BattleReplayUnit {
  hp: number;
  shield: number;
  dead: boolean;
  position: number;
  activeBuffs: string[];
  lastAction: string;
}

const SPEEDS = [0.5, 1, 2, 4] as const;
const BASE_DELAY_MS = 650;

export function BattleReplayBoard({ replay }: BattleReplayBoardProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const events = replay.events;
  const activeEvent = step > 0 ? events[step - 1] : undefined;
  const unitStates = useMemo(() => buildReplayState(replay, step), [replay, step]);
  const unitIndexes = useMemo(() => buildUnitIndexes(unitStates), [unitStates]);
  const battlefieldLength = replay.battlefieldLength ?? 100;
  const selectedUnit = unitStates.find((unit) => unit.combatantId === selectedUnitId) ?? unitStates[0];
  const progress = events.length > 0 ? Math.round((step / events.length) * 100) : 0;

  useEffect(() => {
    if (!playing) return undefined;
    if (step >= events.length) {
      setPlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(events.length, current + 1));
    }, BASE_DELAY_MS / speed);

    return () => window.clearTimeout(timer);
  }, [events.length, playing, speed, step]);

  useEffect(() => {
    setStep(0);
    setPlaying(false);
    setSelectedUnitId('');
  }, [replay]);

  const restart = () => {
    setStep(0);
    setPlaying(true);
  };

  const reset = () => {
    setStep(0);
    setPlaying(false);
  };

  if (events.length === 0 || replay.units.length === 0) {
    return (
      <section className="rounded-md border border-line bg-[#0f141d] p-3">
        <p className="label">전투 리플레이</p>
        <p className="text-sm text-muted">재생할 전투 이벤트가 없습니다. 1회 전투를 실행하면 리플레이가 생성됩니다.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-md border border-cyan/30 bg-cyan/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">전투 리플레이</p>
          <h3 className="text-lg font-bold text-cyan">
            {replay.factionAName} vs {replay.factionBName}
          </h3>
          <p className="mt-1 font-mono text-xs text-muted">
            {step}/{events.length} 이벤트 | {activeEvent ? `${activeEvent.time.toFixed(2)}초` : '00.00초'} | {progress}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button className="btn" onClick={() => setPlaying((current) => !current)} type="button">
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? '일시정지' : '재생'}
        </button>
        <button className="btn" onClick={restart} type="button">
          <RotateCcw size={16} />
          처음부터
        </button>
        <button className="btn" onClick={reset} type="button">
          <SkipBack size={16} />
          정지
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {SPEEDS.map((value) => (
          <button
            className={`min-h-11 rounded-md border px-2 py-2 font-mono text-xs font-bold ${
              speed === value ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'
            }`}
            key={value}
            onClick={() => setSpeed(value)}
            type="button"
          >
            {value}x
          </button>
        ))}
        <button
          className="min-h-11 rounded-md border border-amber/50 bg-amber/10 px-2 py-2 text-xs font-bold text-amber"
          onClick={() => {
            setStep(events.length);
            setPlaying(false);
          }}
          type="button"
        >
          즉시 결과
        </button>
      </div>

      <div className="h-2 overflow-hidden rounded bg-[#070a10]">
        <div className="h-full rounded bg-cyan transition-all" style={{ width: `${progress}%` }} />
      </div>

      {activeEvent ? (
        <div className="rounded-md border border-line bg-[#0f141d] p-3">
          <p className="font-mono text-xs text-muted">{eventSummary(activeEvent)}</p>
          {isAttackEvent(activeEvent) ? (
            <p className="mt-1 text-sm text-ink">
              피해 {activeEvent.damage} | 보호막 -{activeEvent.shieldDamage} | HP -{activeEvent.hpDamage}
              {activeEvent.defeated ?? activeEvent.killed ? ' | 사망' : ''}
            </p>
          ) : null}
          {isSkillEvent(activeEvent) ? (
            <p className="mt-1 text-sm text-ink">
              스킬 {skillEffectLabels[activeEvent.effectType]} | 적용량 {activeEvent.totalApplied}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-md border border-line bg-[#070a10]">
        <div className="relative min-h-[260px] overflow-hidden p-3">
          <div className="mb-2 flex items-center justify-between font-mono text-xs font-bold text-muted">
            <span>A 팩션 | {replay.factionAName}</span>
            <span>1D 라인 전장</span>
            <span>B 팩션 | {replay.factionBName}</span>
          </div>

          <div className="absolute left-5 right-5 top-[128px] h-1 rounded bg-line" />
          <div className="absolute left-5 top-[118px] h-5 w-px bg-cyan" />
          <div className="absolute right-5 top-[118px] h-5 w-px bg-danger" />
          <div className="absolute left-[50%] top-[120px] h-4 w-px bg-muted/50" />

          {unitStates.map((unit) => (
            <BattlefieldToken
              activeEvent={activeEvent}
              battlefieldLength={battlefieldLength}
              isSelected={unit.combatantId === selectedUnit?.combatantId}
              key={unit.combatantId}
              onSelect={() => setSelectedUnitId(unit.combatantId)}
              unit={unit}
              unitIndex={unitIndexes.get(unit.combatantId) ?? 0}
            />
          ))}
        </div>
      </div>

      {selectedUnit ? <ReplayUnitDetail unit={selectedUnit} /> : null}
    </section>
  );
}

function buildUnitIndexes(units: ReplayUnitState[]): Map<string, number> {
  const counters = { A: 0, B: 0 };
  const indexes = new Map<string, number>();

  for (const unit of units) {
    indexes.set(unit.combatantId, counters[unit.team]);
    counters[unit.team] += 1;
  }

  return indexes;
}

function buildReplayState(replay: BattleReplay, step: number): ReplayUnitState[] {
  const state = new Map<string, ReplayUnitState>();
  const replayTime = step > 0 ? (replay.events[Math.min(step - 1, replay.events.length - 1)]?.time ?? 0) : 0;

  for (const unit of replay.units) {
    state.set(unit.combatantId, {
      ...unit,
      hp: unit.maxHp,
      shield: unit.maxShield,
      dead: false,
      position: unit.initialPosition ?? (unit.team === 'A' ? 5 : 95),
      activeBuffs: [],
      lastAction: '대기',
    });
  }

  for (const event of replay.events.slice(0, step)) {
    if (isMoveEvent(event)) {
      const mover = state.get(event.unitId);
      if (mover) {
        mover.position = event.toPosition;
        mover.lastAction = `이동 ${event.fromPosition.toFixed(1)} -> ${event.toPosition.toFixed(1)}`;
      }
      continue;
    }

    if (isAttackEvent(event)) {
      const attacker = state.get(event.attackerId);
      const targetId = event.defenderId ?? event.targetId;
      const target = targetId ? state.get(targetId) : undefined;

      if (attacker && typeof event.attackerPosition === 'number') {
        attacker.position = event.attackerPosition;
        attacker.lastAction = `${target?.name ?? event.defenderName ?? '대상'} 공격`;
      }
      if (!target) continue;

      if (typeof event.defenderPosition === 'number') target.position = event.defenderPosition;
      target.hp = Math.max(0, event.defenderHpAfter ?? event.targetHpAfter ?? target.hp);
      target.shield = Math.max(0, event.defenderShieldAfter ?? event.targetShieldAfter ?? target.shield);
      target.dead = Boolean(event.defeated ?? event.killed) || target.hp <= 0;
      target.lastAction = `피해 ${event.damage}`;
    }

    if (isSkillEvent(event)) {
      const caster = state.get(event.casterId);
      if (caster) caster.lastAction = `${event.skillName} 사용`;
      for (const targetId of event.targetIds) {
        const target = state.get(targetId);
        if (!target) continue;
        target.hp = Math.max(0, event.targetHpAfter?.[targetId] ?? target.hp);
        target.shield = Math.max(0, event.targetShieldAfter?.[targetId] ?? target.shield);
        target.dead = target.hp <= 0;
        target.lastAction = `${event.skillName} 적용`;
        if (
          ['attackBuff', 'defenseBuff', 'moveSpeedBuff', 'attackSpeedBuff'].includes(event.effectType) &&
          (event.duration ?? 0) > 0 &&
          event.time + (event.duration ?? 0) >= replayTime
        ) {
          target.activeBuffs.push(`${event.skillName} ${skillEffectLabels[event.effectType]}`);
        }
      }
    }
  }

  return [...state.values()].sort((left, right) => left.team.localeCompare(right.team) || left.combatantId.localeCompare(right.combatantId));
}

function BattlefieldToken({
  activeEvent,
  battlefieldLength,
  isSelected,
  onSelect,
  unit,
  unitIndex,
}: {
  activeEvent?: BattleReplayEvent;
  battlefieldLength: number;
  isSelected: boolean;
  onSelect: () => void;
  unit: ReplayUnitState;
  unitIndex: number;
}) {
  const attacking = isAttackEvent(activeEvent) && activeEvent.attackerId === unit.combatantId;
  const targeted = isAttackEvent(activeEvent) && (activeEvent.defenderId ?? activeEvent.targetId) === unit.combatantId;
  const moving = isMoveEvent(activeEvent) && activeEvent.unitId === unit.combatantId;
  const casting = isSkillEvent(activeEvent) && activeEvent.casterId === unit.combatantId;
  const skillTargeted = isSkillEvent(activeEvent) && activeEvent.targetIds.includes(unit.combatantId);
  const hpPercent = unit.maxHp > 0 ? Math.round((unit.hp / unit.maxHp) * 100) : 0;
  const shieldPercent = unit.maxShield > 0 ? Math.round((unit.shield / unit.maxShield) * 100) : 0;
  const lane = unitIndex % 4;
  const top = unit.team === 'A' ? 48 + lane * 34 : 146 + lane * 34;
  const left = `calc(${Math.min(100, Math.max(0, (unit.position / battlefieldLength) * 100))}% - 23px)`;

  return (
    <button
      className={`absolute min-h-11 w-[46px] rounded-md border px-1 py-1 text-left shadow-sm transition-all duration-300 ${
        unit.dead ? 'border-line bg-[#05070a] opacity-30 grayscale' : 'border-line bg-[#0f141d]'
      } ${attacking ? 'border-amber shadow-[0_0_0_2px_rgba(255,202,97,0.45)]' : ''} ${
        targeted ? 'border-danger shadow-[0_0_0_2px_rgba(255,107,129,0.5)]' : ''
      } ${moving ? 'border-cyan shadow-[0_0_0_2px_rgba(80,227,194,0.35)]' : ''} ${
        casting || skillTargeted ? 'border-acid shadow-[0_0_0_2px_rgba(199,255,91,0.35)]' : ''
      } ${isSelected ? 'ring-2 ring-cyan' : ''}`}
      onClick={onSelect}
      style={{ left, top }}
      title={`${unit.name} @ ${unit.position.toFixed(1)}`}
      type="button"
    >
      <div className="mb-1 flex items-center justify-between gap-0.5">
        <span className={`font-mono text-[9px] font-bold ${unit.team === 'A' ? 'text-cyan' : 'text-danger'}`}>{unit.team}</span>
        {unit.isHero ? <span className="text-[10px] font-bold text-amber">★</span> : null}
      </div>
      <p className="truncate text-center text-[10px] font-bold text-ink">{shortUnitName(unit.name)}</p>
      <Bar color="bg-danger" percent={hpPercent} />
      <Bar color="bg-cyan" percent={shieldPercent} />
    </button>
  );
}

function ReplayUnitDetail({ unit }: { unit: ReplayUnitState }) {
  return (
    <div className="rounded-md border border-line bg-[#0f141d] p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">{unit.isHero ? '★ ' : ''}{unit.name}</p>
          <p className="mt-1 text-xs text-muted">{teamLabel(unit.team)} · 위치 {unit.position.toFixed(1)}</p>
        </div>
        <span className={`chip ${unit.dead ? 'opacity-50' : ''}`}>{unit.dead ? '사망' : '생존'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <DetailItem label="HP" value={`${unit.hp}/${unit.maxHp}`} />
        <DetailItem label="보호막" value={unit.shield} />
        <DetailItem label="공격 타입" value={unit.attackTypeName ?? unit.attackType} />
        <DetailItem label="방어 타입" value={unit.defenseTypeName ?? unit.defenseType} />
      </div>
      <div className="mt-2">
        <p className="label">적용 중인 버프</p>
        <p className="text-xs text-muted">{unit.activeBuffs.length > 0 ? [...new Set(unit.activeBuffs)].join(', ') : '없음'}</p>
      </div>
      <div className="mt-2">
        <p className="label">마지막 행동</p>
        <p className="text-xs text-ink">{unit.lastAction}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-[#10151f] px-2 py-2">
      <p className="label">{label}</p>
      <p className="font-mono text-xs text-ink">{value}</p>
    </div>
  );
}

function shortUnitName(name: string): string {
  const compact = name.replace(/\s+/g, '');
  if (compact.length <= 4) return compact;
  return compact.slice(0, 4);
}

function Bar({ color, percent }: { color: string; percent: number }) {
  return (
    <div className="mt-1 h-1 overflow-hidden rounded bg-[#05070a]">
      <div className={`h-full rounded ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function isMoveEvent(event: BattleReplayEvent | undefined): event is BattleReplayMoveEvent {
  return event?.type === 'move';
}

function isAttackEvent(event: BattleReplayEvent | undefined): event is BattleReplayAttackEvent {
  return Boolean(event && event.type !== 'move' && event.type !== 'skill' && 'attackerId' in event);
}

function isSkillEvent(event: BattleReplayEvent | undefined): event is BattleReplaySkillEvent {
  return event?.type === 'skill';
}

function eventSummary(event: BattleReplayEvent): string {
  if (isMoveEvent(event)) {
    return `${teamLabel(event.team)}:${event.unitName} 이동 ${event.fromPosition.toFixed(1)} -> ${event.toPosition.toFixed(1)}`;
  }

  if (isSkillEvent(event)) {
    return formatSkillEventSummary(event);
  }

  const defenderName = event.defenderName ?? event.targetName ?? '대상';
  const attackerPosition = typeof event.attackerPosition === 'number' ? `@${event.attackerPosition.toFixed(1)}` : '';
  const defenderPosition = typeof event.defenderPosition === 'number' ? `@${event.defenderPosition.toFixed(1)}` : '';
  return `${event.attackerName}${attackerPosition} 공격 -> ${defenderName}${defenderPosition}`;
}
