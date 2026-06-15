import type { AppData, ArmyEntry, BattlePreset, BattleResult, SimulationSummary, UnitDamage } from '../types';
import { getEffectiveUnit, type EffectiveUnit } from './applyTraits';

interface Combatant {
  id: string;
  team: 'A' | 'B';
  order: number;
  unit: EffectiveUnit;
  hp: number;
  shield: number;
  nextAttackAt: number;
  damageDone: number;
}

const MAX_TIME = 300;

function matrixMultiplier(data: AppData, attackTypeId: string, defenseTypeId: string): number {
  return (
    data.typeMatrix.find(
      (entry) => entry.attackTypeId === attackTypeId && entry.defenseTypeId === defenseTypeId,
    )?.multiplier ?? 1
  );
}

function cooldown(unit: EffectiveUnit): number {
  return Math.max(0.25, 1 / Math.max(0.1, unit.attackSpeed));
}

function alive(combatants: Combatant[], team?: 'A' | 'B') {
  return combatants.filter((combatant) => combatant.hp > 0 && (!team || combatant.team === team));
}

function expandArmy(data: AppData, entries: ArmyEntry[], team: 'A' | 'B'): Combatant[] {
  const result: Combatant[] = [];
  let order = 0;
  for (const entry of entries) {
    const unit = data.units.find((candidate) => candidate.id === entry.unitId);
    if (!unit) continue;
    const race = data.races.find((candidate) => candidate.id === unit.raceId);
    const effective = getEffectiveUnit(unit, race, data);
    for (let index = 0; index < entry.count; index += 1) {
      result.push({
        id: `${team}_${unit.id}_${index}_${order}`,
        team,
        order,
        unit: effective,
        hp: effective.effectiveHp,
        shield: effective.effectiveShield,
        nextAttackAt: Number((Math.random() * cooldown(effective)).toFixed(2)),
        damageDone: 0,
      });
      order += 1;
    }
  }
  return result;
}

function selectTarget(attacker: Combatant, enemies: Combatant[]): Combatant {
  if (attacker.unit.range <= 1) {
    return [...enemies].sort((left, right) => left.order - right.order || left.hp - right.hp)[0];
  }

  const preferLowHp = Math.random() > 0.35;
  if (preferLowHp) {
    return [...enemies].sort((left, right) => left.hp + left.shield - (right.hp + right.shield))[0];
  }
  return [...enemies].sort((left, right) => left.order - right.order)[0];
}

function applyDamage(attacker: Combatant, defender: Combatant, data: AppData): number {
  const baseDamage = Math.max(1, attacker.unit.effectiveAttack - defender.unit.effectiveDefense);
  const multiplier = matrixMultiplier(data, attacker.unit.attackType, defender.unit.defenseType);
  const finalDamage = Math.max(1, Math.round(baseDamage * multiplier));
  let remaining = finalDamage;

  if (defender.shield > 0) {
    const shieldDamage = Math.min(defender.shield, remaining);
    defender.shield -= shieldDamage;
    remaining -= shieldDamage;
  }

  if (remaining > 0) {
    defender.hp = Math.max(0, defender.hp - remaining);
  }

  attacker.damageDone += finalDamage;
  return finalDamage;
}

function aggregateDamage(combatants: Combatant[]): UnitDamage[] {
  const totals = new Map<string, UnitDamage>();
  for (const combatant of combatants) {
    const previous = totals.get(combatant.unit.id);
    if (previous) {
      previous.damage += combatant.damageDone;
    } else {
      totals.set(combatant.unit.id, {
        unitId: combatant.unit.id,
        name: combatant.unit.name,
        damage: combatant.damageDone,
      });
    }
  }
  return [...totals.values()].sort((left, right) => right.damage - left.damage);
}

function aggregateRemaining(combatants: Combatant[]): BattleResult['remainingUnits'] {
  const totals = new Map<string, BattleResult['remainingUnits'][number]>();
  for (const combatant of alive(combatants)) {
    const key = `${combatant.team}:${combatant.unit.id}`;
    const previous = totals.get(key);
    if (previous) {
      previous.count += 1;
    } else {
      totals.set(key, {
        unitId: combatant.unit.id,
        name: combatant.unit.name,
        team: combatant.team,
        count: 1,
      });
    }
  }
  return [...totals.values()];
}

export function simulateBattle(data: AppData, preset: BattlePreset, keepFullLog = true): BattleResult {
  const combatants = [...expandArmy(data, preset.armyA, 'A'), ...expandArmy(data, preset.armyB, 'B')];
  const logs: string[] = [`[00.00] SIM: ${preset.name} 교전 시작`];
  let time = 0;

  while (time <= MAX_TIME && alive(combatants, 'A').length > 0 && alive(combatants, 'B').length > 0) {
    const actor = alive(combatants).sort((left, right) => left.nextAttackAt - right.nextAttackAt)[0];
    time = actor.nextAttackAt;
    if (time > MAX_TIME) break;

    const enemies = alive(combatants, actor.team === 'A' ? 'B' : 'A');
    if (enemies.length === 0) break;

    const target = selectTarget(actor, enemies);
    const beforeShield = target.shield;
    const beforeHp = target.hp;
    const damage = applyDamage(actor, target, data);
    const hpDelta = beforeHp - target.hp;
    const shieldDelta = beforeShield - target.shield;

    if (keepFullLog) {
      logs.push(
        `[${time.toFixed(2).padStart(6, '0')}] ${actor.team}:${actor.unit.name} -> ${target.team}:${target.unit.name} DMG ${damage} (S-${shieldDelta}, HP-${hpDelta})`,
      );
    }

    if (target.hp <= 0) {
      logs.push(`[${time.toFixed(2).padStart(6, '0')}] DOWN: ${target.team}:${target.unit.name}`);
    }

    actor.nextAttackAt = Number((time + cooldown(actor.unit)).toFixed(2));
  }

  const aliveA = alive(combatants, 'A').length;
  const aliveB = alive(combatants, 'B').length;
  const winner = aliveA === aliveB ? 'Draw' : aliveA > aliveB ? 'A' : 'B';
  const battleTime = Math.min(MAX_TIME, Number(time.toFixed(2)));
  const totalDamageByUnit = aggregateDamage(combatants);
  const mvpUnit = totalDamageByUnit[0]?.name ?? '없음';

  logs.push(`[${battleTime.toFixed(2).padStart(6, '0')}] END: winner=${winner}, aliveA=${aliveA}, aliveB=${aliveB}`);

  return {
    winner,
    winRateA: winner === 'A' ? 100 : 0,
    winRateB: winner === 'B' ? 100 : 0,
    remainingUnits: aggregateRemaining(combatants),
    totalDamageByUnit,
    mvpUnit,
    battleTime,
    logs,
  };
}

export function simulateMany(data: AppData, preset: BattlePreset, runs = 100): SimulationSummary {
  const results = Array.from({ length: runs }, () => simulateBattle(data, preset, false));
  const winsA = results.filter((result) => result.winner === 'A').length;
  const winsB = results.filter((result) => result.winner === 'B').length;
  const averageTime = results.reduce((sum, result) => sum + result.battleTime, 0) / runs;
  const mvpCounts = new Map<string, number>();
  const damageTotals = new Map<string, UnitDamage>();
  let remainingA = 0;
  let remainingB = 0;

  for (const result of results) {
    mvpCounts.set(result.mvpUnit, (mvpCounts.get(result.mvpUnit) ?? 0) + 1);
    for (const remaining of result.remainingUnits) {
      if (remaining.team === 'A') remainingA += remaining.count;
      if (remaining.team === 'B') remainingB += remaining.count;
    }
    for (const damage of result.totalDamageByUnit) {
      const previous = damageTotals.get(damage.unitId);
      if (previous) {
        previous.damage += damage.damage;
      } else {
        damageTotals.set(damage.unitId, { ...damage });
      }
    }
  }

  const mvpUnit = [...mvpCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '없음';
  const representative = results[results.length - 1];
  const logs = [
    `[SUMMARY] ${runs}회 반복 시뮬레이션`,
    `[SUMMARY] A 승률 ${(winsA / runs) * 100}% / B 승률 ${(winsB / runs) * 100}% / 무승부 ${runs - winsA - winsB}회`,
    `[SUMMARY] 평균 전투 시간 ${averageTime.toFixed(2)}초`,
    `[SUMMARY] 평균 생존 A ${(remainingA / runs).toFixed(1)} / B ${(remainingB / runs).toFixed(1)}`,
    `[SUMMARY] 최다 MVP ${mvpUnit}`,
    ...representative.logs.slice(-8),
  ];

  return {
    ...representative,
    runs,
    winner: winsA === winsB ? 'Draw' : winsA > winsB ? 'A' : 'B',
    winRateA: Math.round((winsA / runs) * 1000) / 10,
    winRateB: Math.round((winsB / runs) * 1000) / 10,
    averageRemainingA: Math.round((remainingA / runs) * 10) / 10,
    averageRemainingB: Math.round((remainingB / runs) * 10) / 10,
    battleTime: Math.round(averageTime * 100) / 100,
    totalDamageByUnit: [...damageTotals.values()]
      .map((damage) => ({ ...damage, damage: Math.round(damage.damage / runs) }))
      .sort((left, right) => right.damage - left.damage),
    mvpUnit,
    logs,
  };
}
