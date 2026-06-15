import type {
  AppData,
  ArmyEntry,
  BattleAnalysis,
  BattlePreset,
  BattleReplay,
  BattleReplayEvent,
  BattleReplaySkillEvent,
  CostEfficiency,
  SimulationSummary,
  Skill,
  SkillStat,
  TypeAdvantageReport,
  UnitDamage,
  BattleResult,
  ActiveBuff,
} from '../types';
import { getEffectiveUnit, type EffectiveUnit } from './applyTraits';

interface Combatant {
  id: string;
  team: 'A' | 'B';
  order: number;
  unit: EffectiveUnit;
  hp: number;
  shield: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  position: number;
  lastMoveLogAt: number;
  nextAttackAt: number;
  skillCooldowns: Record<string, number>;
  skillActivations: Record<string, number>;
  buffs: ActiveBuff[];
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

interface SkillContext {
  currentTarget?: Combatant;
  replayEvents: BattleReplayEvent[];
  recordReplay: boolean;
  logs: string[];
  keepFullLog: boolean;
  stats: Map<string, SkillStat>;
}

const MAX_TIME = 300;
const BATTLEFIELD_LENGTH = 70;
const TICK_DURATION = 0.25;
const MOVE_EVENT_INTERVAL = 0.5;
const RANGE_SCALE = 5;
const MOVE_SPEED_SCALE = 1.45;

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

function applyBuffValue(base: number, buffs: ActiveBuff[], effectType: ActiveBuff['effectType']): number {
  return buffs
    .filter((buff) => buff.effectType === effectType)
    .reduce((value, buff) => {
      if (buff.valueType === 'percent') return value * (1 + buff.value / 100);
      return value + buff.value;
    }, base);
}

function currentAttack(combatant: Combatant): number {
  return applyBuffValue(combatant.unit.effectiveAttack, combatant.buffs, 'attackBuff');
}

function currentDefense(combatant: Combatant): number {
  return applyBuffValue(combatant.unit.effectiveDefense, combatant.buffs, 'defenseBuff');
}

function currentMoveSpeed(combatant: Combatant): number {
  return Math.max(0, applyBuffValue(combatant.unit.effectiveMoveSpeed, combatant.buffs, 'moveSpeedBuff'));
}

function currentAttackSpeed(combatant: Combatant): number {
  return Math.max(0.1, applyBuffValue(combatant.unit.attackSpeed, combatant.buffs, 'attackSpeedBuff'));
}

function combatantCooldown(combatant: Combatant): number {
  return Math.max(0.25, 1 / currentAttackSpeed(combatant));
}

function expireBuffs(combatants: Combatant[], time: number) {
  for (const combatant of combatants) {
    combatant.buffs = combatant.buffs.filter((buff) => buff.expiresAt <= 0 || buff.expiresAt > time);
  }
}

function alive(combatants: Combatant[], team?: 'A' | 'B') {
  return combatants.filter((combatant) => combatant.hp > 0 && (!team || combatant.team === team));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampPosition(value: number): number {
  return Math.max(0, Math.min(BATTLEFIELD_LENGTH, round2(value)));
}

function startingPosition(team: 'A' | 'B', unit: EffectiveUnit, order: number): number {
  const laneOffset = (order % 6) * 1.05;
  const heroOffset = (order % 3) * 0.55;

  if (team === 'A') {
    return clampPosition(unit.isHero ? 4 + heroOffset : 6 + laneOffset);
  }

  return clampPosition(unit.isHero ? BATTLEFIELD_LENGTH - 4 - heroOffset : BATTLEFIELD_LENGTH - 6 - laneOffset);
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
        mp: effective.mp,
        maxHp: effective.effectiveHp,
        maxMp: effective.mp,
        position: startingPosition(team, effective, order),
        lastMoveLogAt: -MOVE_EVENT_INTERVAL,
        nextAttackAt: Number((Math.random() * cooldown(effective)).toFixed(2)),
        skillCooldowns: {},
        skillActivations: {},
        buffs: [],
        damageDone: 0,
      });
      order += 1;
    }
  }
  return result;
}

function attackRange(unit: EffectiveUnit): number {
  return Math.max(1, unit.range) * RANGE_SCALE;
}

function distance(left: Combatant, right: Combatant): number {
  return Math.abs(left.position - right.position);
}

function selectClosest(attacker: Combatant, enemies: Combatant[]): Combatant {
  return [...enemies].sort((left, right) => distance(attacker, left) - distance(attacker, right))[0];
}

function selectTargetInRange(attacker: Combatant, enemies: Combatant[]): Combatant | undefined {
  const range = attackRange(attacker.unit);
  const inRange = enemies.filter((enemy) => distance(attacker, enemy) <= range);
  if (inRange.length === 0) return undefined;

  return [...inRange].sort((left, right) => {
    const distanceDelta = distance(attacker, left) - distance(attacker, right);
    if (attacker.unit.range <= 1 || Math.abs(distanceDelta) > RANGE_SCALE) return distanceDelta;
    return left.hp + left.shield - (right.hp + right.shield);
  })[0];
}

function moveToward(attacker: Combatant, target: Combatant): { fromPosition: number; toPosition: number } {
  const fromPosition = attacker.position;
  const gapToRange = Math.max(0, distance(attacker, target) - attackRange(attacker.unit));
  const movement = Math.min(currentMoveSpeed(attacker) * TICK_DURATION * MOVE_SPEED_SCALE, gapToRange);
  const direction = target.position > attacker.position ? 1 : -1;

  attacker.position = clampPosition(attacker.position + direction * movement);
  return { fromPosition, toPosition: attacker.position };
}

function attackTypeName(data: AppData, attackTypeId: string): string {
  return data.attackTypes.find((type) => type.id === attackTypeId)?.name ?? attackTypeId;
}

function applyDamage(attacker: Combatant, defender: Combatant, data: AppData): DamageResult {
  const baseDamage = Math.max(1, currentAttack(attacker) - currentDefense(defender));
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

function hpRatio(combatant: Combatant): number {
  return combatant.maxHp > 0 ? combatant.hp / combatant.maxHp : 0;
}

function skillValue(skill: Skill, caster: Combatant, target?: Combatant): number {
  if (skill.valueType === 'flat') return skill.value;
  if (skill.effectType === 'damage') return Math.max(1, currentAttack(caster) * (skill.value / 100));
  if (skill.effectType === 'heal' || skill.effectType === 'shield') return Math.max(1, (target?.maxHp ?? caster.maxHp) * (skill.value / 100));
  return skill.value;
}

function getSkillTargets(
  caster: Combatant,
  skill: Skill,
  combatants: Combatant[],
  currentTarget?: Combatant,
): Combatant[] {
  const allies = alive(combatants, caster.team);
  const enemies = alive(combatants, caster.team === 'A' ? 'B' : 'A');

  if (skill.target === 'self') return [caster];
  if (skill.target === 'allyLowestHp') return [...allies].sort((left, right) => hpRatio(left) - hpRatio(right)).slice(0, 1);
  if (skill.target === 'allAllies') return allies;
  if (skill.target === 'enemyTarget') return currentTarget && currentTarget.hp > 0 ? [currentTarget] : [];
  if (skill.target === 'enemyLowestHp') return [...enemies].sort((left, right) => hpRatio(left) - hpRatio(right)).slice(0, 1);
  if (skill.target === 'allEnemies') return enemies;
  if (skill.target === 'enemiesInRange') return enemies.filter((enemy) => distance(caster, enemy) <= attackRange(caster.unit));

  return [];
}

function ensureSkillStat(stats: Map<string, SkillStat>, skill: Skill): SkillStat {
  const previous = stats.get(skill.id);
  if (previous) return previous;

  const next: SkillStat = {
    skillId: skill.id,
    skillName: skill.name,
    activations: 0,
    damage: 0,
    healing: 0,
    shield: 0,
    buffActivations: 0,
  };
  stats.set(skill.id, next);
  return next;
}

function canActivateSkill(caster: Combatant, skill: Skill, time: number): boolean {
  const activations = caster.skillActivations[skill.id] ?? 0;
  if (skill.maxActivations !== undefined && activations >= skill.maxActivations) return false;
  if (caster.mp < skill.mpCost) return false;
  if ((caster.skillCooldowns[skill.id] ?? 0) > time) return false;
  if (Math.random() * 100 > skill.chance) return false;
  return true;
}

function applySkillDamage(caster: Combatant, target: Combatant, skill: Skill, data: AppData): number {
  const rawDamage = skillValue(skill, caster, target);
  const baseDamage = Math.max(1, rawDamage - currentDefense(target));
  const multiplier = matrixMultiplier(data, caster.unit.attackType, target.unit.defenseType);
  const finalDamage = Math.max(1, Math.round(baseDamage * multiplier));
  let remaining = finalDamage;

  if (target.shield > 0) {
    const shieldDamage = Math.min(target.shield, remaining);
    target.shield -= shieldDamage;
    remaining -= shieldDamage;
  }
  if (remaining > 0) {
    target.hp = Math.max(0, target.hp - remaining);
  }

  caster.damageDone += finalDamage;
  return finalDamage;
}

function activateSkill(
  caster: Combatant,
  skill: Skill,
  combatants: Combatant[],
  data: AppData,
  time: number,
  context: SkillContext,
): boolean {
  if (!canActivateSkill(caster, skill, time)) return false;
  const targets = getSkillTargets(caster, skill, combatants, context.currentTarget);
  if (targets.length === 0) return false;

  caster.mp -= skill.mpCost;
  caster.skillActivations[skill.id] = (caster.skillActivations[skill.id] ?? 0) + 1;
  caster.skillCooldowns[skill.id] = round2(time + Math.max(0, skill.cooldown));

  const stat = ensureSkillStat(context.stats, skill);
  stat.activations += 1;

  let totalApplied = 0;
  const targetHpAfter: Record<string, number> = {};
  const targetShieldAfter: Record<string, number> = {};

  for (const target of targets) {
    if (skill.effectType === 'damage') {
      const damage = applySkillDamage(caster, target, skill, data);
      totalApplied += damage;
      stat.damage += damage;
    }

    if (skill.effectType === 'heal') {
      const amount = Math.min(target.maxHp - target.hp, Math.round(skillValue(skill, caster, target)));
      target.hp += Math.max(0, amount);
      totalApplied += Math.max(0, amount);
      stat.healing += Math.max(0, amount);
    }

    if (skill.effectType === 'shield') {
      const amount = Math.round(skillValue(skill, caster, target));
      target.shield += amount;
      totalApplied += amount;
      stat.shield += amount;
    }

    if (
      skill.effectType === 'attackBuff' ||
      skill.effectType === 'defenseBuff' ||
      skill.effectType === 'moveSpeedBuff' ||
      skill.effectType === 'attackSpeedBuff'
    ) {
      target.buffs.push({
        id: `${skill.id}_${target.id}_${time}_${stat.activations}`,
        sourceSkillId: skill.id,
        effectType: skill.effectType,
        value: skill.value,
        valueType: skill.valueType,
        expiresAt: skill.duration > 0 ? round2(time + skill.duration) : 0,
      });
      totalApplied += 1;
      stat.buffActivations += 1;
    }

    targetHpAfter[target.id] = target.hp;
    targetShieldAfter[target.id] = target.shield;
  }

  if (context.recordReplay) {
    const event: BattleReplaySkillEvent = {
      id: `evt_${context.replayEvents.length}_${caster.id}_${skill.id}`,
      index: context.replayEvents.length,
      type: 'skill',
      time: round2(time),
      casterId: caster.id,
      casterName: caster.unit.name,
      casterTeam: caster.team,
      skillId: skill.id,
      skillName: skill.name,
      targetIds: targets.map((target) => target.id),
      targetNames: targets.map((target) => target.unit.name),
      effectType: skill.effectType,
      value: skill.value,
      valueType: skill.valueType,
      duration: skill.duration,
      totalApplied,
      targetHpAfter,
      targetShieldAfter,
    };
    context.replayEvents.push(event);
  }

  if (context.keepFullLog) {
    logsSkill(context.logs, time, caster, skill, targets, totalApplied);
  }

  return true;
}

function logsSkill(logs: string[], time: number, caster: Combatant, skill: Skill, targets: Combatant[], totalApplied: number) {
  const targetLabel = targets.length === 1 ? targets[0].unit.name : `${targets.length} targets`;
  logs.push(
    `[${time.toFixed(2).padStart(6, '0')}] SKILL: ${caster.team}:${caster.unit.name} used ${skill.name} -> ${targetLabel} ${skill.effectType} ${totalApplied}`,
  );
}

function triggerSkills(
  caster: Combatant,
  trigger: Skill['trigger'],
  combatants: Combatant[],
  data: AppData,
  time: number,
  context: SkillContext,
) {
  for (const skill of caster.unit.skillsV2 ?? []) {
    if (skill.trigger !== trigger) continue;
    if (trigger === 'cooldown' && skill.cooldown <= 0) continue;
    if (trigger === 'lowHp' && hpRatio(caster) > 0.3) continue;
    activateSkill(caster, skill, combatants, data, time, context);
  }
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

function defenseTypeName(data: AppData, defenseTypeId: string): string {
  return data.defenseTypes.find((type) => type.id === defenseTypeId)?.name ?? defenseTypeId;
}

function buildReplayUnits(combatants: Combatant[], data: AppData): BattleReplay['units'] {
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
    attackTypeName: attackTypeName(data, combatant.unit.attackType),
    defenseTypeName: defenseTypeName(data, combatant.unit.defenseType),
    initialPosition: combatant.position,
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

function buildSkillAnalysis(skillStats: Map<string, SkillStat>) {
  const stats = [...skillStats.values()].sort((left, right) => right.activations - left.activations);
  const totalDamage = stats.reduce((sum, entry) => sum + entry.damage, 0);
  const totalHealing = stats.reduce((sum, entry) => sum + entry.healing, 0);
  const totalShield = stats.reduce((sum, entry) => sum + entry.shield, 0);
  const totalBuffActivations = stats.reduce((sum, entry) => sum + entry.buffActivations, 0);
  const summary: string[] = [];

  const topHealing = [...stats].sort((left, right) => right.healing - left.healing)[0];
  const topShield = [...stats].sort((left, right) => right.shield - left.shield)[0];
  const topDamage = [...stats].sort((left, right) => right.damage - left.damage)[0];

  if (topHealing?.healing > 0) summary.push(`${topHealing.skillName}가 총 ${Math.round(topHealing.healing)} HP를 회복했습니다.`);
  if (topShield?.shield > 0) summary.push(`${topShield.skillName}이 총 ${Math.round(topShield.shield)} 보호막을 부여했습니다.`);
  if (topDamage?.damage > 0) summary.push(`${topDamage.skillName}이 총 ${Math.round(topDamage.damage)} 스킬 피해를 기록했습니다.`);
  if (totalBuffActivations > 0) summary.push(`버프 스킬이 총 ${totalBuffActivations}회 발동했습니다.`);
  if (summary.length === 0) summary.push('이번 전투에서 스킬 영향은 크지 않았습니다.');

  return {
    topActivatedSkill: stats[0],
    totalDamage: Math.round(totalDamage),
    totalHealing: Math.round(totalHealing),
    totalShield: Math.round(totalShield),
    totalBuffActivations,
    skillStats: stats.map((entry) => ({
      ...entry,
      damage: Math.round(entry.damage),
      healing: Math.round(entry.healing),
      shield: Math.round(entry.shield),
    })),
    summary,
  };
}

function buildBalanceSuggestions(params: {
  winner: BattleResult['winner'];
  winnerName: string;
  firstEngagementTime?: number;
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

  if (typeof params.firstEngagementTime === 'number' && params.firstEngagementTime >= 8) {
    suggestions.push(`첫 교전까지 ${params.firstEngagementTime}초가 걸렸습니다. 전장 길이 또는 이동속도를 조정해보세요.`);
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
  skillStats: Map<string, SkillStat>;
  firstEngagementTime?: number;
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
    firstEngagementTime: params.firstEngagementTime,
    topDamageUnit: params.totalDamageByUnit[0],
    damageShares,
    survivalRatios,
    topAdvantagedAttackType: typeAdvantages[0],
    typeAdvantages,
    costEfficiency,
    skillStats: buildSkillAnalysis(params.skillStats),
    balanceSuggestions: buildBalanceSuggestions({
      winner: params.winner,
      winnerName,
      firstEngagementTime: params.firstEngagementTime,
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
  const skillTotals = new Map<string, SkillStat>();
  let firstEngagementTotal = 0;
  let firstEngagementCount = 0;

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

    for (const skill of result.analysis?.skillStats?.skillStats ?? []) {
      const previous = skillTotals.get(skill.skillId);
      if (previous) {
        previous.activations += skill.activations;
        previous.damage += skill.damage;
        previous.healing += skill.healing;
        previous.shield += skill.shield;
        previous.buffActivations += skill.buffActivations;
      } else {
        skillTotals.set(skill.skillId, { ...skill });
      }
    }

    if (typeof result.analysis?.firstEngagementTime === 'number') {
      firstEngagementTotal += result.analysis.firstEngagementTime;
      firstEngagementCount += 1;
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
  const firstEngagementTime = firstEngagementCount > 0 ? round2(firstEngagementTotal / firstEngagementCount) : undefined;

  const averageSkillStats = new Map(
    [...skillTotals.values()].map((entry) => [
      entry.skillId,
      {
        ...entry,
        activations: round1(entry.activations / results.length),
        damage: Math.round(entry.damage / results.length),
        healing: Math.round(entry.healing / results.length),
        shield: Math.round(entry.shield / results.length),
        buffActivations: round1(entry.buffActivations / results.length),
      },
    ]),
  );

  return {
    winnerName,
    firstEngagementTime,
    topDamageUnit: aggregate.totalDamageByUnit[0],
    damageShares,
    survivalRatios,
    topAdvantagedAttackType: typeAdvantages[0],
    typeAdvantages,
    costEfficiency,
    skillStats: buildSkillAnalysis(averageSkillStats),
    balanceSuggestions: buildBalanceSuggestions({
      winner: aggregate.winner,
      winnerName,
      firstEngagementTime,
      winRateA: aggregate.winRateA,
      winRateB: aggregate.winRateB,
      survivalRatios,
      damageShares,
      costEfficiency,
      topAdvantagedAttackType: typeAdvantages[0],
    }),
  };
}

interface SimulateBattleOptions {
  keepFullLog: boolean;
  recordReplay: boolean;
}

function normalizeBattleOptions(options: boolean | Partial<SimulateBattleOptions>): SimulateBattleOptions {
  if (typeof options === 'boolean') {
    return { keepFullLog: options, recordReplay: options };
  }

  return {
    keepFullLog: options.keepFullLog ?? true,
    recordReplay: options.recordReplay ?? options.keepFullLog ?? true,
  };
}

export function simulateBattle(
  data: AppData,
  preset: BattlePreset,
  options: boolean | Partial<SimulateBattleOptions> = true,
): BattleResult {
  const { keepFullLog, recordReplay } = normalizeBattleOptions(options);
  const factionAName = data.races.find((race) => race.id === preset.raceAId)?.name ?? 'A';
  const factionBName = data.races.find((race) => race.id === preset.raceBId)?.name ?? 'B';
  const combatants = [...expandArmy(data, preset.armyA, 'A'), ...expandArmy(data, preset.armyB, 'B')];
  const armyStats = collectArmyStats(combatants);
  const replayUnits = recordReplay ? buildReplayUnits(combatants, data) : [];
  const replayEvents: BattleReplayEvent[] = [];
  const typeAdvantages = new Map<string, TypeAdvantageReport>();
  const skillStats = new Map<string, SkillStat>();
  const logs: string[] = [`[00.00] SIM: ${preset.name} 교전 시작`];
  const skillContext: SkillContext = {
    replayEvents,
    recordReplay,
    logs,
    keepFullLog,
    stats: skillStats,
  };
  let time = 0;
  let firstEngagementTime: number | undefined;

  for (const combatant of alive(combatants)) {
    triggerSkills(combatant, 'battleStart', combatants, data, time, skillContext);
  }

  while (time <= MAX_TIME && alive(combatants, 'A').length > 0 && alive(combatants, 'B').length > 0) {
    expireBuffs(combatants, time);
    const actors = alive(combatants).sort((left, right) => left.team.localeCompare(right.team) || left.order - right.order);

    for (const actor of actors) {
      if (actor.hp <= 0) continue;
      triggerSkills(actor, 'cooldown', combatants, data, time, skillContext);
      triggerSkills(actor, 'lowHp', combatants, data, time, skillContext);

      const enemies = alive(combatants, actor.team === 'A' ? 'B' : 'A');
      if (enemies.length === 0) break;

      const targetInRange = selectTargetInRange(actor, enemies);

      if (targetInRange && time >= actor.nextAttackAt) {
        if (firstEngagementTime === undefined) firstEngagementTime = round2(time);
        const beforeShield = targetInRange.shield;
        const beforeHp = targetInRange.hp;
        const damageResult = applyDamage(actor, targetInRange, data);
        const damage = damageResult.damage;
        const hpDelta = beforeHp - targetInRange.hp;
        const shieldDelta = beforeShield - targetInRange.shield;
        const typeAdvantage = typeAdvantages.get(actor.unit.attackType);
        const defeated = targetInRange.hp <= 0;

        if (recordReplay) {
          replayEvents.push({
            id: `evt_${replayEvents.length}_${actor.id}_${targetInRange.id}`,
            index: replayEvents.length,
            type: 'attack',
            time: round2(time),
            attackerId: actor.id,
            attackerName: actor.unit.name,
            attackerTeam: actor.team,
            attackerPosition: actor.position,
            defenderId: targetInRange.id,
            defenderName: targetInRange.unit.name,
            defenderTeam: targetInRange.team,
            defenderPosition: targetInRange.position,
            targetId: targetInRange.id,
            targetName: targetInRange.unit.name,
            damage,
            shieldDamage: shieldDelta,
            hpDamage: hpDelta,
            multiplier: damageResult.multiplier,
            attackType: actor.unit.attackType,
            defenseType: targetInRange.unit.defenseType,
            defenderHpAfter: targetInRange.hp,
            defenderShieldAfter: targetInRange.shield,
            targetHpAfter: targetInRange.hp,
            targetShieldAfter: targetInRange.shield,
            defeated,
            killed: defeated,
          });
        }

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
            `[${time.toFixed(2).padStart(6, '0')}] ${actor.team}:${actor.unit.name}@${actor.position.toFixed(1)} -> ${targetInRange.team}:${targetInRange.unit.name}@${targetInRange.position.toFixed(1)} DMG ${damage} x${damageResult.multiplier} (S-${shieldDelta}, HP-${hpDelta})`,
          );
        }

        if (defeated) {
          logs.push(`[${time.toFixed(2).padStart(6, '0')}] DOWN: ${targetInRange.team}:${targetInRange.unit.name}`);
        }

        triggerSkills(actor, 'onAttack', combatants, data, time, { ...skillContext, currentTarget: targetInRange });
        actor.nextAttackAt = round2(time + combatantCooldown(actor));
        continue;
      }

      if (!targetInRange) {
        const closestEnemy = selectClosest(actor, enemies);
        const { fromPosition, toPosition } = moveToward(actor, closestEnemy);
        if (
          recordReplay &&
          fromPosition !== toPosition &&
          time - actor.lastMoveLogAt >= MOVE_EVENT_INTERVAL - 0.001
        ) {
          replayEvents.push({
            id: `evt_${replayEvents.length}_${actor.id}_move`,
            index: replayEvents.length,
            type: 'move',
            time: round2(time),
            unitId: actor.id,
            unitName: actor.unit.name,
            team: actor.team,
            fromPosition,
            toPosition,
          });
          actor.lastMoveLogAt = time;
        }
      }
    }

    time = round2(time + TICK_DURATION);
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
    skillStats,
    firstEngagementTime,
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
    ...(recordReplay
      ? {
          replay: {
            factionAName,
            factionBName,
            duration: battleTime,
            battlefieldLength: BATTLEFIELD_LENGTH,
            units: replayUnits,
            events: replayEvents,
          },
        }
      : {}),
  };
}

export function simulateMany(data: AppData, preset: BattlePreset, runs = 100): SimulationSummary {
  const results = Array.from({ length: runs }, () =>
    simulateBattle(data, preset, { keepFullLog: false, recordReplay: false }),
  );
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
