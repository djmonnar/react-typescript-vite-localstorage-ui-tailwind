import { Activity, Maximize2, Pause, Play, RotateCcw, SkipBack, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { UnitIcon } from './UnitIcon';
import type {
  BattleReplay,
  BattleReplayAttackEvent,
  BattleReplayEvent,
  BattleReplayMoveEvent,
  BattleReplaySkillEvent,
  BattleReplayUnit,
  Facing,
  GridTile,
} from '../types';
import { formatSkillEventSummary, skillEffectLabels, teamLabel } from '../utils/labels';

interface BattleReplayBoardProps {
  replay: BattleReplay;
  isFullscreen?: boolean;
  onClose?: () => void;
}

interface ReplayUnitState extends BattleReplayUnit {
  hp: number;
  shield: number;
  dead: boolean;
  tile: GridTile;
  facing: Facing;
  activeBuffs: string[];
  lastAction: string;
}

const SPEEDS = [0.5, 1, 2, 4] as const;
const BASE_DELAY_MS = 650;

interface BattlePowerSnapshot {
  powerA: number;
  powerB: number;
  percentA: number;
  percentB: number;
  aliveA: number;
  aliveB: number;
  totalA: number;
  totalB: number;
  leader: 'A' | 'B' | 'even';
  leadPercent: number;
}

export function BattleReplayBoard({ isFullscreen = false, onClose, replay }: BattleReplayBoardProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [expanded, setExpanded] = useState(false);
  const events = replay.events;
  const activeEvent = step > 0 ? events[step - 1] : undefined;
  const gridWidth = replay.gridWidth ?? 10;
  const gridHeight = replay.gridHeight ?? 6;
  const unitStates = useMemo(() => buildReplayState(replay, step), [replay, step]);
  const selectedUnit = unitStates.find((unit) => unit.combatantId === selectedUnitId) ?? unitStates[0];
  const progress = events.length > 0 ? Math.round((step / events.length) * 100) : 0;
  const battlePower = useMemo(() => calculateBattlePower(unitStates), [unitStates]);

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

  if (events.length === 0 || replay.units.length === 0) {
    return (
      <section className="rounded-md border border-line bg-[#0f141d] p-3">
        <p className="label">전투 리플레이</p>
        <p className="text-sm text-muted">재생할 전투 이벤트가 없습니다. 1회 전투를 실행하면 리플레이가 생성됩니다.</p>
      </section>
    );
  }

  const board = (
    <section className={`${isFullscreen ? 'min-h-full space-y-3 rounded-md border border-cyan/30 bg-[#09111b] p-3 shadow-2xl shadow-cyan/10' : 'space-y-3 rounded-md border border-cyan/30 bg-cyan/5 p-3'}`}>
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
        {isFullscreen ? (
          <button className="btn min-h-11 shrink-0" onClick={onClose} type="button">
            <X size={16} />닫기
          </button>
        ) : (
          <button className="btn min-h-11 shrink-0" onClick={() => setExpanded(true)} type="button">
            <Maximize2 size={16} />전투맵 전체화면
          </button>
        )}
      </div>

      <BattlePowerPanel
        factionAName={replay.factionAName}
        factionBName={replay.factionBName}
        isFullscreen={isFullscreen}
        snapshot={battlePower}
      />

      <div className="grid grid-cols-3 gap-2">
        <button className="btn" onClick={() => setPlaying((current) => !current)} type="button">
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? '일시정지' : '재생'}
        </button>
        <button
          className="btn"
          onClick={() => {
            setStep(0);
            setPlaying(true);
          }}
          type="button"
        >
          <RotateCcw size={16} />
          처음부터
        </button>
        <button
          className="btn"
          onClick={() => {
            setStep(0);
            setPlaying(false);
          }}
          type="button"
        >
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
              {activeEvent.backAttack ? ' | 백어택' : ''}
              {activeEvent.defeated ?? activeEvent.killed ? ' | 쓰러짐' : ''}
            </p>
          ) : null}
          {isSkillEvent(activeEvent) ? (
            <p className="mt-1 text-sm text-ink">
              스킬 {skillEffectLabels[activeEvent.effectType]} | 적용량 {activeEvent.totalApplied}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className={`relative overflow-hidden rounded-md border border-line bg-[#070a10] ${
          isFullscreen ? 'p-3 shadow-[0_0_80px_rgba(102,217,239,0.12)]' : 'p-2'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_50%,rgba(102,217,239,0.14),transparent_34%),radial-gradient(circle_at_82%_50%,rgba(255,91,122,0.13),transparent_34%)]" />
        <div className="relative mb-2 flex items-center justify-between font-mono text-[10px] font-bold text-muted">
          <span>A 팩션 | {replay.factionAName}</span>
          <span className="text-cyan">{isFullscreen ? 'TACTICAL GRID LIVE' : '전투 맵'}</span>
          <span>B 팩션 | {replay.factionBName}</span>
        </div>
        <div className={`relative ${isFullscreen ? 'overflow-x-auto pb-2' : ''}`}>
          <div
            className={`grid gap-1 rounded-md bg-[#03060a]/50 p-1 ${isFullscreen ? 'min-w-[520px]' : ''}`}
            style={{ gridTemplateColumns: `repeat(${gridWidth}, minmax(${isFullscreen ? '3rem' : '0'}, 1fr))` }}
          >
            {Array.from({ length: gridWidth * gridHeight }, (_, index) => {
              const tile = { x: index % gridWidth, y: Math.floor(index / gridWidth) };
              const unit = unitStates.find((candidate) => candidate.tile.x === tile.x && candidate.tile.y === tile.y && !candidate.dead);
              const centerLine = tile.x === Math.floor(gridWidth / 2) - 1 || tile.x === Math.floor(gridWidth / 2);
              return (
                <div
                  className={`relative aspect-square rounded border ${
                    isFullscreen ? 'min-h-14' : 'min-h-11'
                  } ${
                    tile.x < 2
                      ? 'border-cyan/25 bg-cyan/10'
                      : tile.x >= gridWidth - 2
                        ? 'border-danger/25 bg-danger/10'
                        : centerLine
                          ? 'border-amber/20 bg-amber/5'
                          : 'border-line bg-[#0b1018]'
                  }`}
                  key={`${tile.x}:${tile.y}`}
                >
                  {centerLine ? <div className="pointer-events-none absolute inset-y-1 left-1/2 w-px bg-amber/20" /> : null}
                  {unit ? (
                    <BattlefieldToken
                      activeEvent={activeEvent}
                      isFullscreen={isFullscreen}
                      isSelected={unit.combatantId === selectedUnit?.combatantId}
                      onSelect={() => setSelectedUnitId(unit.combatantId)}
                      unit={unit}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedUnit ? <ReplayUnitDetail unit={selectedUnit} /> : null}
    </section>
  );

  return (
    <>
      {isFullscreen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#03060a]/95 p-2 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
          {board}
        </div>
      ) : (
        board
      )}
      {!isFullscreen && expanded ? (
        <BattleReplayBoard isFullscreen onClose={() => setExpanded(false)} replay={replay} />
      ) : null}
    </>
  );
}

function calculateBattlePower(units: ReplayUnitState[]): BattlePowerSnapshot {
  const totalA = units.filter((unit) => unit.team === 'A').length;
  const totalB = units.filter((unit) => unit.team === 'B').length;
  const aliveA = units.filter((unit) => unit.team === 'A' && !unit.dead).length;
  const aliveB = units.filter((unit) => unit.team === 'B' && !unit.dead).length;
  const powerA = Math.round(units.filter((unit) => unit.team === 'A').reduce((sum, unit) => sum + unitBattlePower(unit), 0));
  const powerB = Math.round(units.filter((unit) => unit.team === 'B').reduce((sum, unit) => sum + unitBattlePower(unit), 0));
  const totalPower = Math.max(1, powerA + powerB);
  const percentA = Math.round((powerA / totalPower) * 100);
  const percentB = 100 - percentA;
  const leadPercent = Math.abs(percentA - percentB);
  const leader = leadPercent < 6 ? 'even' : percentA > percentB ? 'A' : 'B';

  return { aliveA, aliveB, leader, leadPercent, percentA, percentB, powerA, powerB, totalA, totalB };
}

function unitBattlePower(unit: ReplayUnitState): number {
  if (unit.dead || unit.hp <= 0) return 0;
  const maxDurability = Math.max(1, unit.maxHp + unit.maxShield * 0.7);
  const currentDurability = Math.max(0, unit.hp + unit.shield * 0.7);
  const durabilityRatio = Math.min(1, currentDurability / maxDurability);
  const offense = (unit.attack ?? 0) * 8 + (unit.defense ?? 0) * 5 + (unit.range ?? 1) * 4;
  const strategicValue = (unit.unitCost ?? 1) * 12 + (unit.isHero ? 70 : 0);

  return currentDurability + (offense + strategicValue) * Math.max(0.25, durabilityRatio);
}

function BattlePowerPanel({
  factionAName,
  factionBName,
  isFullscreen,
  snapshot,
}: {
  factionAName: string;
  factionBName: string;
  isFullscreen: boolean;
  snapshot: BattlePowerSnapshot;
}) {
  const leaderLabel =
    snapshot.leader === 'even'
      ? '접전'
      : snapshot.leader === 'A'
        ? `${factionAName} 우세`
        : `${factionBName} 우세`;
  const leaderColor = snapshot.leader === 'even' ? 'text-amber' : snapshot.leader === 'A' ? 'text-cyan' : 'text-danger';

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-line bg-[#080d15] ${
        isFullscreen ? 'p-4 shadow-[inset_0_0_40px_rgba(255,255,255,0.03)]' : 'p-3'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(102,217,239,0.08),transparent_45%,rgba(255,91,122,0.08))]" />
      <div className="relative mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="label">전투력 판세</p>
          <p className={`flex items-center gap-2 text-sm font-black ${leaderColor}`}>
            <Activity size={16} />
            {leaderLabel}
          </p>
        </div>
        <div className="text-right font-mono text-xs text-muted">
          <p>A {snapshot.aliveA}/{snapshot.totalA} 생존</p>
          <p>B {snapshot.aliveB}/{snapshot.totalB} 생존</p>
        </div>
      </div>

      <div className="relative h-5 overflow-hidden rounded-full border border-line bg-[#03060a]">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan/90 to-cyan/35 transition-all duration-500"
          style={{ width: `${snapshot.percentA}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-danger/90 to-danger/35 transition-all duration-500"
          style={{ width: `${snapshot.percentB}%` }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-ink/40" />
        <div className="absolute inset-0 flex items-center justify-between px-3 font-mono text-[10px] font-black text-ink">
          <span>{snapshot.percentA}%</span>
          <span>{snapshot.percentB}%</span>
        </div>
      </div>

      <div className={`relative mt-2 grid grid-cols-2 gap-2 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
        <PowerStat label={factionAName} power={snapshot.powerA} team="A" />
        <PowerStat label={factionBName} power={snapshot.powerB} team="B" />
      </div>
    </div>
  );
}

function PowerStat({ label, power, team }: { label: string; power: number; team: 'A' | 'B' }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${team === 'A' ? 'border-cyan/25 bg-cyan/10' : 'border-danger/25 bg-danger/10'}`}>
      <p className="truncate text-xs font-bold text-muted">{label}</p>
      <p className={`font-mono text-lg font-black ${team === 'A' ? 'text-cyan' : 'text-danger'}`}>{power}</p>
    </div>
  );
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
      tile: unit.initialTile ?? { x: Math.round(unit.initialPosition ?? 0), y: unit.team === 'A' ? 0 : 5 },
      facing: unit.initialFacing ?? (unit.team === 'A' ? 'E' : 'W'),
      activeBuffs: [],
      lastAction: '대기',
    });
  }

  for (const event of replay.events.slice(0, step)) {
    if (isMoveEvent(event)) {
      const mover = state.get(event.unitId);
      if (mover) {
        const fromTile = event.fromTile ?? mover.tile;
        const toTile = event.toTile ?? { x: Math.round(event.toPosition), y: mover.tile.y };
        mover.tile = toTile;
        if (event.facingAfter) mover.facing = event.facingAfter;
        mover.lastAction = `이동 (${fromTile.x},${fromTile.y}) -> (${toTile.x},${toTile.y})`;
      }
      continue;
    }

    if (isAttackEvent(event)) {
      const attacker = state.get(event.attackerId);
      const targetId = event.defenderId ?? event.targetId;
      const target = targetId ? state.get(targetId) : undefined;
      if (attacker) {
        if (event.attackerTile) attacker.tile = event.attackerTile;
        if (event.attackerFacing) attacker.facing = event.attackerFacing;
        attacker.lastAction = `${target?.name ?? event.defenderName ?? '대상'} 공격${event.backAttack ? ' (백어택)' : ''}`;
      }
      if (!target) continue;
      if (event.defenderTile) target.tile = event.defenderTile;
      if (event.defenderFacing) target.facing = event.defenderFacing;
      target.hp = Math.max(0, event.defenderHpAfter ?? event.targetHpAfter ?? target.hp);
      target.shield = Math.max(0, event.defenderShieldAfter ?? event.targetShieldAfter ?? target.shield);
      target.dead = Boolean(event.defeated ?? event.killed) || target.hp <= 0;
      target.lastAction = `피해 ${event.damage}`;
    }

    if (isSkillEvent(event)) {
      const caster = state.get(event.casterId);
      if (caster) {
        if (event.casterTile) caster.tile = event.casterTile;
        if (event.casterFacing) caster.facing = event.casterFacing;
        caster.lastAction = `${event.skillName} 사용`;
      }
      for (const targetId of event.targetIds) {
        const target = state.get(targetId);
        if (!target) continue;
        const tile = event.targetTiles?.[targetId];
        if (tile) target.tile = tile;
        target.hp = Math.max(0, event.targetHpAfter?.[targetId] ?? target.hp);
        target.shield = Math.max(0, event.targetShieldAfter?.[targetId] ?? target.shield);
        target.dead = target.hp <= 0;
        target.lastAction = `${event.skillName} 적용`;
        if (
          ['attackBuff', 'defenseBuff', 'moveSpeedBuff', 'attackSpeedBuff', 'rangeBuff', 'slow', 'taunt'].includes(event.effectType) &&
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
  isFullscreen,
  isSelected,
  onSelect,
  unit,
}: {
  activeEvent?: BattleReplayEvent;
  isFullscreen: boolean;
  isSelected: boolean;
  onSelect: () => void;
  unit: ReplayUnitState;
}) {
  const attacking = isAttackEvent(activeEvent) && activeEvent.attackerId === unit.combatantId;
  const targeted = isAttackEvent(activeEvent) && (activeEvent.defenderId ?? activeEvent.targetId) === unit.combatantId;
  const moving = isMoveEvent(activeEvent) && activeEvent.unitId === unit.combatantId;
  const casting = isSkillEvent(activeEvent) && activeEvent.casterId === unit.combatantId;
  const skillTargeted = isSkillEvent(activeEvent) && activeEvent.targetIds.includes(unit.combatantId);
  const hpPercent = unit.maxHp > 0 ? Math.round((unit.hp / unit.maxHp) * 100) : 0;
  const shieldPercent = unit.maxShield > 0 ? Math.round((unit.shield / unit.maxShield) * 100) : 0;

  return (
    <button
      className={`absolute inset-0 flex flex-col justify-between rounded text-left transition ${
        isFullscreen ? 'p-1.5' : 'p-1'
      } ${
        unit.dead ? 'bg-[#05070a] opacity-30 grayscale' : unit.team === 'A' ? 'bg-cyan/15' : 'bg-danger/15'
      } ${attacking ? 'scale-105 ring-2 ring-amber shadow-lg shadow-amber/20' : ''} ${targeted ? 'animate-pulse ring-2 ring-danger shadow-lg shadow-danger/20' : ''} ${
        moving ? 'ring-2 ring-cyan' : ''
      } ${casting || skillTargeted ? 'ring-2 ring-acid' : ''} ${isSelected ? 'outline outline-2 outline-cyan' : ''}`}
      onClick={onSelect}
      title={`${unit.name} (${unit.tile.x},${unit.tile.y})`}
      type="button"
    >
      <div className="flex items-center justify-between gap-1">
        <span className={`font-mono text-[9px] font-bold ${unit.team === 'A' ? 'text-cyan' : 'text-danger'}`}>{unit.team}</span>
        <span className="font-mono text-[10px] font-bold text-muted">{facingArrow(unit.facing)}</span>
        {unit.isHero ? <span className="text-[10px] font-bold text-amber">★</span> : null}
      </div>
      <UnitIcon className={`mx-auto text-ink ${isFullscreen ? 'h-5 w-5' : 'h-4 w-4'}`} type={unit.iconType ?? (unit.isHero ? 'hero' : 'sword')} />
      <p className={`truncate text-center font-bold text-ink ${isFullscreen ? 'text-[11px]' : 'text-[10px]'}`}>{shortUnitName(unit.name)}</p>
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
          <p className="mt-1 text-xs text-muted">
            {teamLabel(unit.team)} · 위치 ({unit.tile.x}, {unit.tile.y})
            {' '}· 방향 {facingLabel(unit.facing)}
          </p>
        </div>
        <span className={`chip ${unit.dead ? 'opacity-50' : ''}`}>{unit.dead ? '쓰러짐' : '생존'}</span>
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

function Bar({ color, percent }: { color: string; percent: number }) {
  return (
    <div className="mt-0.5 h-1 overflow-hidden rounded bg-[#05070a]">
      <div className={`h-full rounded ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function facingArrow(facing: Facing): string {
  if (facing === 'N') return '↑';
  if (facing === 'S') return '↓';
  if (facing === 'E') return '→';
  return '←';
}

function facingLabel(facing: Facing): string {
  if (facing === 'N') return '위';
  if (facing === 'S') return '아래';
  if (facing === 'E') return '오른쪽';
  return '왼쪽';
}

function shortUnitName(name: string): string {
  const compact = name.replace(/\s+/g, '');
  if (compact.length <= 4) return compact;
  return compact.slice(0, 4);
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
    const from = event.fromTile ? `(${event.fromTile.x},${event.fromTile.y})` : event.fromPosition.toFixed(1);
    const to = event.toTile ? `(${event.toTile.x},${event.toTile.y})` : event.toPosition.toFixed(1);
    return `${teamLabel(event.team)}:${event.unitName} 이동 ${from} -> ${to}`;
  }

  if (isSkillEvent(event)) return formatSkillEventSummary(event);

  const defenderName = event.defenderName ?? event.targetName ?? '대상';
  const from = event.attackerTile ? `(${event.attackerTile.x},${event.attackerTile.y})` : '';
  const to = event.defenderTile ? `(${event.defenderTile.x},${event.defenderTile.y})` : '';
  return `${event.attackerName}${from} 공격 -> ${defenderName}${to}${event.backAttack ? ' [백어택]' : ''}`;
}
