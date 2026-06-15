import { Pause, Play, RotateCcw, SkipBack } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  BattleReplay,
  BattleReplayAttackEvent,
  BattleReplayEvent,
  BattleReplayMoveEvent,
  BattleReplayUnit,
} from '../types';

interface BattleReplayBoardProps {
  replay: BattleReplay;
}

interface ReplayUnitState extends BattleReplayUnit {
  hp: number;
  shield: number;
  dead: boolean;
  position: number;
}

const SPEEDS = [0.5, 1, 2, 4] as const;
const BASE_DELAY_MS = 650;

export function BattleReplayBoard({ replay }: BattleReplayBoardProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const events = replay.events;
  const activeEvent = step > 0 ? events[step - 1] : undefined;
  const unitStates = useMemo(() => buildReplayState(replay, step), [replay, step]);
  const unitIndexes = useMemo(() => buildUnitIndexes(unitStates), [unitStates]);
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
            {step}/{events.length} events | {activeEvent ? `${activeEvent.time.toFixed(2)}s` : '00.00s'} | {progress}%
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

      <div className="grid grid-cols-4 gap-2">
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
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-line bg-[#070a10]">
        <div className="relative min-h-[360px] min-w-[720px] overflow-hidden p-4">
          <div className="mb-2 flex items-center justify-between font-mono text-xs font-bold text-muted">
            <span>A | {replay.factionAName}</span>
            <span>1D BATTLEFIELD</span>
            <span>B | {replay.factionBName}</span>
          </div>

          <div className="absolute left-8 right-8 top-[176px] h-1 rounded bg-line" />
          <div className="absolute left-8 top-[166px] h-5 w-px bg-cyan" />
          <div className="absolute right-8 top-[166px] h-5 w-px bg-danger" />
          <div className="absolute left-[50%] top-[168px] h-4 w-px bg-muted/50" />

          {unitStates.map((unit) => (
            <BattlefieldToken
              activeEvent={activeEvent}
              key={unit.combatantId}
              unit={unit}
              unitIndex={unitIndexes.get(unit.combatantId) ?? 0}
            />
          ))}
        </div>
      </div>
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

  for (const unit of replay.units) {
    state.set(unit.combatantId, {
      ...unit,
      hp: unit.maxHp,
      shield: unit.maxShield,
      dead: false,
      position: unit.initialPosition ?? (unit.team === 'A' ? 5 : 95),
    });
  }

  for (const event of replay.events.slice(0, step)) {
    if (isMoveEvent(event)) {
      const mover = state.get(event.unitId);
      if (mover) mover.position = event.toPosition;
      continue;
    }

    if (isAttackEvent(event)) {
      const attacker = state.get(event.attackerId);
      const targetId = event.defenderId ?? event.targetId;
      const target = targetId ? state.get(targetId) : undefined;

      if (attacker && typeof event.attackerPosition === 'number') attacker.position = event.attackerPosition;
      if (!target) continue;

      if (typeof event.defenderPosition === 'number') target.position = event.defenderPosition;
      target.hp = Math.max(0, event.defenderHpAfter ?? event.targetHpAfter ?? target.hp);
      target.shield = Math.max(0, event.defenderShieldAfter ?? event.targetShieldAfter ?? target.shield);
      target.dead = Boolean(event.defeated ?? event.killed) || target.hp <= 0;
    }
  }

  return [...state.values()].sort((left, right) => left.team.localeCompare(right.team) || left.combatantId.localeCompare(right.combatantId));
}

function BattlefieldToken({
  activeEvent,
  unit,
  unitIndex,
}: {
  activeEvent?: BattleReplayEvent;
  unit: ReplayUnitState;
  unitIndex: number;
}) {
  const attacking = isAttackEvent(activeEvent) && activeEvent.attackerId === unit.combatantId;
  const targeted = isAttackEvent(activeEvent) && (activeEvent.defenderId ?? activeEvent.targetId) === unit.combatantId;
  const moving = isMoveEvent(activeEvent) && activeEvent.unitId === unit.combatantId;
  const hpPercent = unit.maxHp > 0 ? Math.round((unit.hp / unit.maxHp) * 100) : 0;
  const shieldPercent = unit.maxShield > 0 ? Math.round((unit.shield / unit.maxShield) * 100) : 0;
  const lane = unitIndex % 4;
  const top = unit.team === 'A' ? 56 + lane * 44 : 204 + lane * 44;
  const left = `calc(${Math.min(100, Math.max(0, unit.position))}% - 34px)`;

  return (
    <div
      className={`absolute min-h-11 w-[68px] rounded-md border p-1.5 shadow-sm transition-all duration-300 ${
        unit.dead ? 'border-line bg-[#05070a] opacity-35 grayscale' : 'border-line bg-[#0f141d]'
      } ${attacking ? 'border-amber shadow-[0_0_0_2px_rgba(255,202,97,0.45)]' : ''} ${
        targeted ? 'border-danger shadow-[0_0_0_2px_rgba(255,107,129,0.5)]' : ''
      } ${moving ? 'border-cyan shadow-[0_0_0_2px_rgba(80,227,194,0.35)]' : ''}`}
      style={{ left, top }}
      title={`${unit.name} @ ${unit.position.toFixed(1)}`}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className={`font-mono text-[10px] font-bold ${unit.team === 'A' ? 'text-cyan' : 'text-danger'}`}>{unit.team}</span>
        {unit.isHero ? <span className="rounded bg-amber/15 px-1 text-[8px] font-bold text-amber">HERO</span> : null}
      </div>
      <p className="truncate text-[10px] font-bold text-ink">{unit.name}</p>
      <Bar color="bg-danger" percent={hpPercent} />
      <Bar color="bg-cyan" percent={shieldPercent} />
      <p className="mt-1 text-right font-mono text-[9px] text-muted">{unit.position.toFixed(0)}</p>
    </div>
  );
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
  return Boolean(event && event.type !== 'move' && 'attackerId' in event);
}

function eventSummary(event: BattleReplayEvent): string {
  if (isMoveEvent(event)) {
    return `${event.team}:${event.unitName} MOVE ${event.fromPosition.toFixed(1)} -> ${event.toPosition.toFixed(1)}`;
  }

  const defenderName = event.defenderName ?? event.targetName ?? 'target';
  const attackerPosition = typeof event.attackerPosition === 'number' ? `@${event.attackerPosition.toFixed(1)}` : '';
  const defenderPosition = typeof event.defenderPosition === 'number' ? `@${event.defenderPosition.toFixed(1)}` : '';
  return `${event.attackerName}${attackerPosition} -> ${defenderName}${defenderPosition}`;
}
