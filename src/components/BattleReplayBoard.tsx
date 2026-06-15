import { Pause, Play, RotateCcw, SkipBack } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { BattleReplay, BattleReplayEvent, BattleReplayUnit } from '../types';

interface BattleReplayBoardProps {
  replay: BattleReplay;
}

interface ReplayUnitState extends BattleReplayUnit {
  hp: number;
  shield: number;
  dead: boolean;
}

export function BattleReplayBoard({ replay }: BattleReplayBoardProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const events = replay.events;
  const activeEvent = step > 0 ? events[step - 1] : undefined;
  const unitStates = useMemo(() => buildReplayState(replay, step), [replay, step]);
  const teamA = unitStates.filter((unit) => unit.team === 'A');
  const teamB = unitStates.filter((unit) => unit.team === 'B');
  const progress = events.length > 0 ? Math.round((step / events.length) * 100) : 0;

  useEffect(() => {
    if (!playing) return undefined;
    if (step >= events.length) {
      setPlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(events.length, current + 1));
    }, 650);

    return () => window.clearTimeout(timer);
  }, [events.length, playing, step]);

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
            {step}/{events.length} events · {activeEvent ? `${activeEvent.time.toFixed(2)}s` : '00.00s'} · {progress}%
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

      <div className="h-2 overflow-hidden rounded bg-[#070a10]">
        <div className="h-full rounded bg-cyan transition-all" style={{ width: `${progress}%` }} />
      </div>

      {activeEvent ? (
        <div className="rounded-md border border-line bg-[#0f141d] p-3">
          <p className="font-mono text-xs text-muted">
            {activeEvent.attackerName} → {activeEvent.targetName}
          </p>
          <p className="mt-1 text-sm text-ink">
            피해 {activeEvent.damage} · 보호막 -{activeEvent.shieldDamage} · HP -{activeEvent.hpDamage}
            {activeEvent.killed ? ' · 사망' : ''}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        <TeamColumn activeEvent={activeEvent} label={`A · ${replay.factionAName}`} units={teamA} />
        <div className="flex items-center justify-center px-1 font-mono text-xs font-bold text-muted">VS</div>
        <TeamColumn activeEvent={activeEvent} label={`B · ${replay.factionBName}`} units={teamB} />
      </div>
    </section>
  );
}

function buildReplayState(replay: BattleReplay, step: number): ReplayUnitState[] {
  const state = new Map<string, ReplayUnitState>();

  for (const unit of replay.units) {
    state.set(unit.combatantId, {
      ...unit,
      hp: unit.maxHp,
      shield: unit.maxShield,
      dead: false,
    });
  }

  for (const event of replay.events.slice(0, step)) {
    const target = state.get(event.targetId);
    if (!target) continue;
    target.hp = Math.max(0, event.targetHpAfter);
    target.shield = Math.max(0, event.targetShieldAfter);
    target.dead = event.killed || target.hp <= 0;
  }

  return [...state.values()];
}

function TeamColumn({
  activeEvent,
  label,
  units,
}: {
  activeEvent?: BattleReplayEvent;
  label: string;
  units: ReplayUnitState[];
}) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="truncate text-center text-xs font-bold text-ink">{label}</p>
      <div className="space-y-2">
        {units.map((unit) => (
          <ReplayUnitCard
            activeEvent={activeEvent}
            key={unit.combatantId}
            unit={unit}
          />
        ))}
      </div>
    </div>
  );
}

function ReplayUnitCard({ activeEvent, unit }: { activeEvent?: BattleReplayEvent; unit: ReplayUnitState }) {
  const attacking = activeEvent?.attackerId === unit.combatantId;
  const targeted = activeEvent?.targetId === unit.combatantId;
  const hpPercent = unit.maxHp > 0 ? Math.round((unit.hp / unit.maxHp) * 100) : 0;
  const shieldPercent = unit.maxShield > 0 ? Math.round((unit.shield / unit.maxShield) * 100) : 0;

  return (
    <div
      className={`rounded-md border p-2 transition ${
        unit.dead ? 'border-line bg-[#070a10] opacity-45' : 'bg-[#0f141d]'
      } ${attacking ? 'border-amber shadow-[0_0_0_1px_rgba(255,202,97,0.4)]' : ''} ${
        targeted ? 'border-danger shadow-[0_0_0_1px_rgba(255,107,129,0.45)]' : 'border-line'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-ink">{unit.name}</p>
          <p className="truncate text-[10px] text-muted">{unit.role}</p>
        </div>
        {unit.isHero ? <span className="rounded bg-amber/15 px-1.5 py-0.5 text-[9px] font-bold text-amber">HERO</span> : null}
      </div>

      <Bar color="bg-danger" label="HP" percent={hpPercent} value={`${unit.hp}/${unit.maxHp}`} />
      <Bar color="bg-cyan" label="S" percent={shieldPercent} value={`${unit.shield}/${unit.maxShield}`} />

      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
        <span>{attacking ? 'ATTACK' : targeted ? 'HIT' : unit.dead ? 'DOWN' : 'READY'}</span>
        <span>#{unit.combatantId.split('_').at(-1)}</span>
      </div>
    </div>
  );
}

function Bar({ color, label, percent, value }: { color: string; label: string; percent: number; value: string }) {
  return (
    <div className="mt-1">
      <div className="mb-1 flex justify-between font-mono text-[10px] text-muted">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-[#05070a]">
        <div className={`h-full rounded ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  );
}
