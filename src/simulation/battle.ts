import type {
  AppData,
  ArmyEntry,
  BattleAnalysis,
  BattlePreset,
  BattleReplay,
  BattleReplayEvent,
  CostEfficiency,
  SimulationSummary,
  TypeAdvantageReport,
  UnitDamage,
  BattleResult,
} from '../types';
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

interface DamageResult {
  damage: number;
  bonusDamage: number;
  multiplier: number;
}

interface ArmyStats {
  initialA: number;
  initialB: number;
  unitCounts: Map<string, number>;
  unitCosts: Map<string, number>;
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

function attackTypeName(data: AppData, attackTypeId: string): string {
  return data.attackTypes.find((type) => type.id === attackTypeId)?.name ?? attackTypeId;
}

function applyDamage(attacker: Combatant, defender: Combatant, data: AppData): DamageResult {
  const baseDamage = Math.max(1, attacker.unit.effectiveAttack - defender.unit.effectiveDefense);
  const multiplier = matrixMultiplier(data, attacker.unit.attackType, defender.unit.defenseType);
  const finalDamage = Math.max(1, Math.round(baseDamage * multiplier));
  const bonusDamage = Math.max(0, finalDamage - baseDamage);
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
  return { damage: finalDamage, bonusDamage, multiplier };
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

function collectArmyStats(combatants: Combatant[]): ArmyStats {
  const unitCounts = new Map<string, number>();
  const unitCosts = new Map<string, number>();
  let initialA = 0;
  let initialB = 0;

  for (const combatant of combatants) {
    if (combatant.team === 'A') initialA += 1;
    if (combatant.team === 'B') initialB += 1;
    unitCounts.set(combatant.unit.id, (unitCounts.get(combatant.unit.id) ?? 0) + 1);
    unitCosts.set(combatant.unit.id, combatant.unit.cost);
  }

  return { initialA, initialB, unitCounts, unitCosts };
}

function buildReplayUnits(combatants: Combatant[]): BattleReplay['units'] {
  return combatants.map((combatant) => ({
    combatantId: combatant.id,
    unitId: combatant.unit.id,
    name: combatant.unit.name,
    role: combatant.unit.role,
    team: combatant.team,
    isHero: combatant.unit.isHero,
    maxHp: combatant.unit.effectiveHp,
    maxShield: combatant.unit.effectiveShield,
    attackType: combatant.unit.attackType,
    defenseType: combatant.unit.defenseType,
  }));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function topDamageShare(totalDamageByUnit: UnitDamage[]) {
  const totalDamage = totalDamageByUnit.reduce((sum, entry) => sum + entry.damage, 0);
  return totalDamageByUnit.map((entry) => ({
    ...entry,
    sharePercent: totalDamage > 0 ? round1((entry.damage / totalDamage) * 100) : 0,
  }));
}

function aggregateTypeAdvantages(typeAdvantages: Map<string, TypeAdvantageReport>): TypeAdvantageReport[] {
  return [...typeAdvantages.values()]
    .map((entry) => ({
      ...entry,
      bonusDamage: Math.round(entry.bonusDamage),
      totalDamage: Math.round(entry.totalDamage),
    }))
    .sort((left, right) => right.bonusDamage - left.bonusDamage);
}

function buildCostEfficiency(totalDamageByUnit: UnitDamage[], armyStats: ArmyStats): CostEfficiency[] {
  return totalDamageByUnit
    .map((entry) => {
      const totalCost = (armyStats.unitCounts.get(entry.unitId) ?? 0) * (armyStats.unitCosts.get(entry.unitId) ?? 0);
      return {
        unitId: entry.unitId,
        name: entry.name,
        totalCost,
        damage: entry.damage,
        efficiency: totalCost > 0 ? round1(entry.damage / totalCost) : entry.damage,
      };
    })
    .sort((left, right) => right.efficiency - left.efficiency);
}

function buildBalanceSuggestions(params: {
  winner: BattleResult['winner'];
  winnerName: string;
  winRateA: number;
  winRateB: number;
  survivalRatios: BattleAnalysis['survivalRatios'];
  damageShares: BattleAnalysis['damageShares'];
  costEfficiency: CostEfficiency[];
  topAdvantagedAttackType?: TypeAdvantageReport;
}): string[] {
  const suggestions: string[] = [];
  const winGap = Math.abs(params.winRateA - params.winRateB);
  const topShare = params.damageShares[0];
  const topEfficiency = params.costEfficiency[0];
  const winnerSurvival = params.survivalRatios.find((entry) =>
    params.winner === 'A' ? entry.team === 'A' : params.winner === 'B' ? entry.team === 'B' : false,
  );

  if (params.winner === 'Draw') {
    suggestions.push('승부가 나지 않았습니다. 양쪽 화력 또는 최대 전투 시간을 조정하면 결과 차이가 더 선명해집니다.');
  } else if (winGap >= 30) {
    suggestions.push(`${params.winnerName} 승률이 크게 앞섭니다. 패배 팩션의 핵심 딜러 공격력이나 전열 생존력을 소폭 올려보세요.`);
  } else {
    suggestions.push('승률 격차가 과하지 않습니다. 큰 수치 변경보다 상성 배율이나 생산 비용을 작게 조정하는 편이 좋습니다.');
  }

  if (winnerSurvival && winnerSurvival.ratioPercent >= 45) {
    suggestions.push(`${winnerSurvival.factionName} 생존율이 ${winnerSurvival.ratioPercent}%입니다. 압승을 줄이려면 해당 팩션의 방어력/보호막 또는 유닛 수를 낮춰보세요.`);
  }

  if (topShare && topShare.sharePercent >= 45) {
    suggestions.push(`${topShare.name} 피해 비중이 ${topShare.sharePercent}%로 높습니다. 공격력, 공격속도, 사거리 중 하나를 낮추거나 비용을 올리는 조정이 적합합니다.`);
  }

  if (params.topAdvantagedAttackType && params.topAdvantagedAttackType.bonusDamage > 0) {
    suggestions.push(`${params.topAdvantagedAttackType.attackTypeName} 타입이 상성으로 +${params.topAdvantagedAttackType.bonusDamage} 피해를 얻었습니다. 해당 타입 배율이 의도보다 강한지 확인하세요.`);
  }

  if (topEfficiency && topEfficiency.totalCost > 0 && topEfficiency.efficiency >= 1.5) {
    suggestions.push(`${topEfficiency.name}의 가격 대비 효율이 ${topEfficiency.efficiency}입니다. 비용 증가 또는 생산속도 증가로 효율을 맞출 수 있습니다.`);
  }

  return suggestions;
}

function buildAnalysis(params: {
  winner: BattleResult['winner'];
  factionAName: string;
  factionBName: string;
  totalDamageByUnit: UnitDamage[];
  remainingUnits: BattleResult['remainingUnits'];
  armyStats: ArmyStats;
  typeAdvantages: Map<string, TypeAdvantageReport>;
  winRateA: number;
  winRateB: number;
}): BattleAnalysis {
  const remainingA = params.remainingUnits
    .filter((entry) => entry.team === 'A')
    .reduce((sum, entry) => sum + entry.count, 0);
  const remainingB = params.remainingUnits
    .filter((entry) => entry.team === 'B')
    .reduce((sum, entry) => sum + entry.count, 0);
  const damageShares = topDamageShare(params.totalDamageByUnit);
  const survivalRatios = [
    {
      team: 'A' as const,
      factionName: params.factionAName,
      initialCount: params.armyStats.initialA,
      remainingCount: remainingA,
      ratioPercent: params.armyStats.initialA > 0 ? round1((remainingA / params.armyStats.initialA) * 100) : 0,
    },
    {
      team: 'B' as const,
      factionName: params.factionBName,
      initialCount: params.armyStats.initialB,
      remainingCount: remainingB,
      ratioPercent: params.armyStats.initialB > 0 ? round1((remainingB / params.armyStats.initialB) * 100) : 0,
    },
  ];
  const typeAdvantages = aggregateTypeAdvantages(params.typeAdvantages);
  const costEfficiency = buildCostEfficiency(params.totalDamageByUnit, params.armyStats);
  const winnerName =
    params.winner === 'A' ? params.factionAName : params.winner === 'B' ? params.factionBName : '무승부';

  return {
    winnerName,
    topDamageUnit: params.totalDamageByUnit[0],
    damageShares,
    survivalRatios,
    topAdvantagedAttackType: typeAdvantages[0],
    typeAdvantages,
    costEfficiency,
    balanceSuggestions: buildBalanceSuggestions({
      winner: params.winner,
      winnerName,
      winRateA: params.winRateA,
      winRateB: params.winRateB,
      survivalRatios,
      damageShares,
      costEfficiency,
      topAdvantagedAttackType: typeAdvantages[0],
    }),
  };
}

function mergeManyAnalysis(results: BattleResult[], aggregate: {
  winner: BattleResult['winner'];
  factionAName: string;
  factionBName: string;
  totalDamageByUnit: UnitDamage[];
  winRateA: number;
  winRateB: number;
  averageRemainingA: number;
  averageRemainingB: number;
}): BattleAnalysis | undefined {
  if (!results[0]?.analysis) return undefined;

  const initialA = results[0].analysis.survivalRatios.find((entry) => entry.team === 'A')?.initialCount ?? 0;
  const initialB = results[0].analysis.survivalRatios.find((entry) => entry.team === 'B')?.initialCount ?? 0;
  const typeTotals = new Map<string, TypeAdvantageReport>();
  const costTotals = new Map<string, CostEfficiency>();

  for (const result of results) {
    for (const typeAdvantage of result.analysis?.typeAdvantages ?? []) {
      const previous = typeTotals.get(typeAdvantage.attackTypeId);
      if (previous) {
        previous.bonusDamage += typeAdvantage.bonusDamage;
        previous.totalDamage += typeAdvantage.totalDamage;
        previous.hitCount += typeAdvantage.hitCount;
      } else {
        typeTotals.set(typeAdvantage.attackTypeId, { ...typeAdvantage });
      }
    }

    for (const efficiency of result.analysis?.costEfficiency ?? []) {
      const previous = costTotals.get(efficiency.unitId);
      if (previous) {
        previous.damage += efficiency.damage;
      } else {
        costTotals.set(efficiency.unitId, { ...efficiency });
      }
    }
  }

  const typeAdvantages = [...typeTotals.values()]
    .map((entry) => ({
      ...entry,
      bonusDamage: Math.round(entry.bonusDamage / results.length),
      totalDamage: Math.round(entry.totalDamage / results.length),
      hitCount: Math.round(entry.hitCount / results.length),
    }))
    .sort((left, right) => right.bonusDamage - left.bonusDamage);

  const costEfficiency = [...costTotals.values()]
    .map((entry) => ({
      ...entry,
      damage: Math.round(entry.damage / results.length),
      efficiency: entry.totalCost > 0 ? round1(entry.damage / results.length / entry.totalCost) : entry.damage,
    }))
    .sort((left, right) => right.efficiency - left.efficiency);

  const damageShares = topDamageShare(aggregate.totalDamageByUnit);
  const survivalRatios = [
    {
      team: 'A' as const,
      factionName: aggregate.factionAName,
      initialCount: initialA,
      remainingCount: round1(aggregate.averageRemainingA),
      ratioPercent: initialA > 0 ? round1((aggregate.averageRemainingA / initialA) * 100) : 0,
    },
    {
      team: 'B' as const,
      factionName: aggregate.factionBName,
      initialCount: initialB,
      remainingCount: round1(aggregate.averageRemainingB),
      ratioPercent: initialB > 0 ? round1((aggregate.averageRemainingB / initialB) * 100) : 0,
    },
  ];
  const winnerName =
    aggregate.winner === 'A' ? aggregate.factionAName : aggregate.winner === 'B' ? aggregate.factionBName : '무승부';

  return {
    winnerName,
    topDamageUnit: aggregate.totalDamageByUnit[0],
    damageShares,
    survivalRatios,
    topAdvantagedAttackType: typeAdvantages[0],
    typeAdvantages,
    costEfficiency,
    balanceSuggestions: buildBalanceSuggestions({
      winner: aggregate.winner,
      winnerName,
      winRateA: aggregate.winRateA,
      winRateB: aggregate.winRateB,
      survivalRatios,
      damageShares,
      costEfficiency,
      topAdvantagedAttackType: typeAdvantages[0],
    }),
  };
}

export function simulateBattle(data: AppData, preset: BattlePreset, keepFullLog = true): BattleResult {
  const factionAName = data.races.find((race) => race.id === preset.raceAId)?.name ?? 'A';
  const factionBName = data.races.find((race) => race.id === preset.raceBId)?.name ?? 'B';
  const combatants = [...expandArmy(data, preset.armyA, 'A'), ...expandArmy(data, preset.armyB, 'B')];
  const armyStats = collectArmyStats(combatants);
  const replayUnits = buildReplayUnits(combatants);
  const replayEvents: BattleReplayEvent[] = [];
  const typeAdvantages = new Map<string, TypeAdvantageReport>();
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
    const damageResult = applyDamage(actor, target, data);
    const damage = damageResult.damage;
    const hpDelta = beforeHp - target.hp;
    const shieldDelta = beforeShield - target.shield;
    const typeAdvantage = typeAdvantages.get(actor.unit.attackType);
    const killed = target.hp <= 0;

    replayEvents.push({
      id: `evt_${replayEvents.length}_${actor.id}_${target.id}`,
      index: replayEvents.length,
      time: Number(time.toFixed(2)),
      attackerId: actor.id,
      attackerName: actor.unit.name,
      targetId: target.id,
      targetName: target.unit.name,
      damage,
      shieldDamage: shieldDelta,
      hpDamage: hpDelta,
      targetHpAfter: target.hp,
      targetShieldAfter: target.shield,
      killed,
    });

    if (typeAdvantage) {
      typeAdvantage.bonusDamage += damageResult.bonusDamage;
      typeAdvantage.totalDamage += damageResult.damage;
      typeAdvantage.hitCount += 1;
    } else {
      typeAdvantages.set(actor.unit.attackType, {
        attackTypeId: actor.unit.attackType,
        attackTypeName: attackTypeName(data, actor.unit.attackType),
        bonusDamage: damageResult.bonusDamage,
        totalDamage: damageResult.damage,
        hitCount: 1,
      });
    }

    if (keepFullLog) {
      logs.push(
        `[${time.toFixed(2).padStart(6, '0')}] ${actor.team}:${actor.unit.name} -> ${target.team}:${target.unit.name} DMG ${damage} (S-${shieldDelta}, HP-${hpDelta})`,
      );
    }

    if (killed) {
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
  const remainingUnits = aggregateRemaining(combatants);
  const analysis = buildAnalysis({
    winner,
    factionAName,
    factionBName,
    totalDamageByUnit,
    remainingUnits,
    armyStats,
    typeAdvantages,
    winRateA: winner === 'A' ? 100 : 0,
    winRateB: winner === 'B' ? 100 : 0,
  });

  logs.push(`[${battleTime.toFixed(2).padStart(6, '0')}] END: winner=${winner}, aliveA=${aliveA}, aliveB=${aliveB}`);

  return {
    winner,
    factionAName,
    factionBName,
    winRateA: winner === 'A' ? 100 : 0,
    winRateB: winner === 'B' ? 100 : 0,
    remainingUnits,
    totalDamageByUnit,
    mvpUnit,
    battleTime,
    logs,
    analysis,
    replay: {
      factionAName,
      factionBName,
      duration: battleTime,
      units: replayUnits,
      events: replayEvents,
    },
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

  const winner = winsA === winsB ? 'Draw' : winsA > winsB ? 'A' : 'B';
  const averageRemainingA = Math.round((remainingA / runs) * 10) / 10;
  const averageRemainingB = Math.round((remainingB / runs) * 10) / 10;
  const winRateA = Math.round((winsA / runs) * 1000) / 10;
  const winRateB = Math.round((winsB / runs) * 1000) / 10;
  const totalDamageByUnit = [...damageTotals.values()]
    .map((damage) => ({ ...damage, damage: Math.round(damage.damage / runs) }))
    .sort((left, right) => right.damage - left.damage);
  const analysis = mergeManyAnalysis(results, {
    winner,
    factionAName: representative.factionAName ?? 'A',
    factionBName: representative.factionBName ?? 'B',
    totalDamageByUnit,
    winRateA,
    winRateB,
    averageRemainingA,
    averageRemainingB,
  });

  return {
    ...representative,
    runs,
    winner,
    winRateA,
    winRateB,
    averageRemainingA,
    averageRemainingB,
    battleTime: Math.round(averageTime * 100) / 100,
    totalDamageByUnit,
    mvpUnit,
    analysis,
    logs,
  };
}
