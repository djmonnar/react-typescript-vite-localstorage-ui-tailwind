export type Id = string;

export type TraitEffectType =
  | 'allHpPercent'
  | 'allAttackPercent'
  | 'allDefenseFlat'
  | 'defenseTypeAttackPercent'
  | 'attackTypeAttackPercent'
  | 'productionSpeedPercent'
  | 'moveSpeedPercent';

export type PassiveTraitEffectType =
  | 'hpPercent'
  | 'attackPercent'
  | 'defenseFlat'
  | 'shieldPercent'
  | 'moveSpeedPercent'
  | 'attackSpeedPercent';

export interface TraitFilters {
  tags?: string[];
  attackTypeId?: Id;
  defenseTypeId?: Id;
  isHero?: boolean;
}

export interface PassiveTraitEffect {
  type: PassiveTraitEffectType;
  value: number;
}

export type TraitTrigger =
  | 'battleStart'
  | 'always'
  | 'firstTurn'
  | 'whenHeroAlive'
  | 'whenOutnumbered'
  | 'whenEnemyHasTag';

export type TraitTarget =
  | 'allAllies'
  | 'unitsWithTags'
  | 'heroes'
  | 'nonHeroes'
  | 'meleeUnits'
  | 'rangedUnits';

export type TraitEffectTypeV2 =
  | 'hpPercent'
  | 'hpFlat'
  | 'shieldPercent'
  | 'shieldFlat'
  | 'attackPercent'
  | 'defenseFlat'
  | 'moveSpeedPercent'
  | 'moveSpeedFlat'
  | 'rangeFlat'
  | 'attackSpeedPercent'
  | 'mpFlat'
  | 'skillCooldownPercent'
  | 'unitCostDiscount';

export type UnitTagCategory = '종족' | '역할' | '전투방식' | '속성' | '상태' | '커스텀';

export type TagBehaviorType =
  | 'seekBackAttack'
  | 'backAttackDamagePercent'
  | 'kite'
  | 'cannotAttackAdjacent';

export interface UnitTagBehavior {
  type: TagBehaviorType;
  value?: number;
}

export interface UnitTag {
  id: Id;
  name: string;
  description: string;
  category: UnitTagCategory;
  color?: string;
  behaviors?: UnitTagBehavior[];
  notes: string;
}

export type SkillTrigger =
  | 'battleStart'
  | 'onAttack'
  | 'cooldown'
  | 'lowHp'
  | 'onHit'
  | 'onKill'
  | 'onDeath'
  | 'turnStart'
  | 'allyDeath'
  | 'enemyInRange';

export type SkillTarget =
  | 'self'
  | 'allyLowestHp'
  | 'allyLowestHpInRange'
  | 'allAllies'
  | 'enemyTarget'
  | 'enemyLowestHp'
  | 'allEnemies'
  | 'enemiesInRange'
  | 'nearestEnemy'
  | 'farthestEnemy'
  | 'alliesInRange'
  | 'randomEnemy'
  | 'randomAlly'
  | 'enemiesWithTag'
  | 'alliesWithTag'
  | 'lineArea'
  | 'circleArea';

export type SkillEffectType =
  | 'damage'
  | 'heal'
  | 'shield'
  | 'attackBuff'
  | 'defenseBuff'
  | 'moveSpeedBuff'
  | 'attackSpeedBuff'
  | 'rangeBuff'
  | 'mpRestore'
  | 'pull'
  | 'push'
  | 'stun'
  | 'slow'
  | 'poison'
  | 'burn'
  | 'summon'
  | 'cleanse'
  | 'removeShield';

export interface SkillArea {
  type: 'single' | 'line' | 'circle' | 'cross';
  radius?: number;
  length?: number;
}

export type ConditionLogic = 'AND' | 'OR';

export type SkillConditionType =
  | 'always'
  | 'selfHpBelow'
  | 'selfHpAbove'
  | 'selfMpAbove'
  | 'allyHpBelow'
  | 'enemyHpBelow'
  | 'enemyInRange'
  | 'allyInRange'
  | 'enemyCountInRadius'
  | 'allyCountInRadius'
  | 'enemyInLine'
  | 'allyInLine'
  | 'targetHasTag'
  | 'allyHasTag'
  | 'enemyHasTag'
  | 'heroAlive'
  | 'shieldBelow'
  | 'noShieldAllyExists';

export interface SkillCondition {
  id: Id;
  type: SkillConditionType;
  value?: number;
  radius?: number;
  range?: number;
  count?: number;
  tags?: string[];
  compare?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
  targetSide?: 'ally' | 'enemy' | 'self';
}

export interface Skill {
  id: Id;
  name: string;
  description: string;
  trigger: SkillTrigger;
  target: SkillTarget;
  effectType: SkillEffectType;
  value: number;
  valueType: 'flat' | 'percent';
  cooldown: number;
  mpCost: number;
  chance: number;
  duration: number;
  maxActivations?: number;
  tags?: string[];
  targetTags?: string[];
  area?: SkillArea;
  attackTypeId?: Id;
  conditionLogic?: ConditionLogic;
  conditions?: SkillCondition[];
  notes: string;
}

export interface ActiveBuff {
  id: Id;
  sourceSkillId: Id;
  effectType: 'attackBuff' | 'defenseBuff' | 'moveSpeedBuff' | 'attackSpeedBuff' | 'rangeBuff' | 'slow';
  value: number;
  valueType: 'flat' | 'percent';
  expiresAt: number;
}

export interface Race {
  id: Id;
  name: string;
  concept: string;
  description: string;
  traitIds: Id[];
  unitIds: Id[];
  heroUnitId: Id;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: Id;
  raceId: Id;
  name: string;
  role: string;
  isHero: boolean;
  hp: number;
  mp: number;
  shield: number;
  attack: number;
  defense: number;
  attackType: Id;
  defenseType: Id;
  range: number;
  moveSpeed: number;
  attackSpeed: number;
  tags: string[];
  skills: string;
  skillsV2?: Skill[];
  unitCost: number;
  iconType: UnitIconType;
  /** Legacy import/export fields kept for older localStorage data. New balancing uses unitCost. */
  cost?: number;
  buildTime?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type UnitIconType =
  | 'sword'
  | 'bow'
  | 'gun'
  | 'shield'
  | 'magic'
  | 'heal'
  | 'beast'
  | 'machine'
  | 'hero'
  | 'skull'
  | 'tank'
  | 'artillery';

export interface AttackType {
  id: Id;
  name: string;
  description: string;
  notes: string;
}

export interface DefenseType {
  id: Id;
  name: string;
  description: string;
  notes: string;
}

export interface TypeMatrix {
  attackTypeId: Id;
  defenseTypeId: Id;
  multiplier: number;
}

export interface Trait {
  id: Id;
  name: string;
  description: string;
  effectType: TraitEffectType;
  targetFilter: {
    attackTypeId?: Id;
    defenseTypeId?: Id;
  };
  value: number;
  trigger?: 'battleStart';
  targetSide?: 'ally';
  filters?: TraitFilters;
  effects?: PassiveTraitEffect[];
  triggerV2?: TraitTrigger;
  targetV2?: TraitTarget;
  effectsV2?: Array<{ type: TraitEffectTypeV2; value: number }>;
  stackable?: boolean;
  notes: string;
}

export interface ArmyEntry {
  unitId: Id;
  count: number;
}

export interface DeployedUnit {
  id: Id;
  unitId: Id;
  team: 'A' | 'B';
  tile: GridTile;
}

export interface BattlePreset {
  id: Id;
  name: string;
  raceAId: Id;
  raceBId: Id;
  armyA: ArmyEntry[];
  armyB: ArmyEntry[];
  maxCostA?: number;
  maxCostB?: number;
  deploymentA?: DeployedUnit[];
  deploymentB?: DeployedUnit[];
  notes: string;
}

export interface RemainingUnit {
  unitId: Id;
  name: string;
  team: 'A' | 'B';
  count: number;
}

export interface UnitDamage {
  unitId: Id;
  name: string;
  damage: number;
}

export interface DamageShare {
  unitId: Id;
  name: string;
  damage: number;
  sharePercent: number;
}

export interface SurvivalRatio {
  team: 'A' | 'B';
  factionName: string;
  initialCount: number;
  remainingCount: number;
  ratioPercent: number;
}

export interface TypeAdvantageReport {
  attackTypeId: Id;
  attackTypeName: string;
  bonusDamage: number;
  totalDamage: number;
  hitCount: number;
}

export interface CostEfficiency {
  unitId: Id;
  name: string;
  totalCost: number;
  damage: number;
  efficiency: number;
}

export interface GridTile {
  x: number;
  y: number;
}

export type Facing = 'N' | 'E' | 'S' | 'W';

export interface BattleAnalysis {
  winnerName: string;
  firstEngagementTime?: number;
  totalMoveCount?: number;
  averageMoveDistance?: number;
  topDamageUnit?: UnitDamage;
  damageShares: DamageShare[];
  survivalRatios: SurvivalRatio[];
  topAdvantagedAttackType?: TypeAdvantageReport;
  typeAdvantages: TypeAdvantageReport[];
  costEfficiency: CostEfficiency[];
  balanceSuggestions: string[];
  skillStats?: BattleSkillAnalysis;
}

export interface BattleReplayUnit {
  combatantId: Id;
  unitId: Id;
  name: string;
  role: string;
  team: 'A' | 'B';
  isHero: boolean;
  maxHp: number;
  maxShield: number;
  attack?: number;
  defense?: number;
  range?: number;
  unitCost?: number;
  attackType: Id;
  defenseType: Id;
  attackTypeName?: string;
  defenseTypeName?: string;
  iconType?: UnitIconType;
  initialTile?: GridTile;
  initialPosition?: number;
  initialFacing?: Facing;
}

export interface BattleReplayBaseEvent {
  id: Id;
  index: number;
  time: number;
  type?: 'attack' | 'move' | 'skill';
}

export interface BattleReplayAttackEvent extends BattleReplayBaseEvent {
  type?: 'attack';
  attackerId: Id;
  attackerName: string;
  attackerTeam?: 'A' | 'B';
  attackerPosition?: number;
  attackerTile?: GridTile;
  defenderId?: Id;
  defenderName?: string;
  defenderTeam?: 'A' | 'B';
  defenderPosition?: number;
  defenderTile?: GridTile;
  damage: number;
  shieldDamage: number;
  hpDamage: number;
  multiplier?: number;
  backAttack?: boolean;
  attackerFacing?: Facing;
  defenderFacing?: Facing;
  attackType?: Id;
  defenseType?: Id;
  defenderHpAfter?: number;
  defenderShieldAfter?: number;
  defeated?: boolean;
  targetId?: Id;
  targetName?: string;
  targetHpAfter?: number;
  targetShieldAfter?: number;
  killed?: boolean;
}

export interface BattleReplayMoveEvent extends BattleReplayBaseEvent {
  type: 'move';
  unitId: Id;
  unitName: string;
  team: 'A' | 'B';
  fromPosition: number;
  toPosition: number;
  fromTile?: GridTile;
  toTile?: GridTile;
  facingAfter?: Facing;
}

export interface BattleReplaySkillEvent extends BattleReplayBaseEvent {
  type: 'skill';
  casterId: Id;
  casterName: string;
  casterTeam: 'A' | 'B';
  casterTile?: GridTile;
  casterFacing?: Facing;
  skillId: Id;
  skillName: string;
  targetIds: Id[];
  targetNames: string[];
  targetTiles?: Record<Id, GridTile>;
  effectType: SkillEffectType;
  attackTypeId?: Id;
  value: number;
  valueType?: Skill['valueType'];
  duration?: number;
  totalApplied: number;
  targetHpAfter?: Record<Id, number>;
  targetShieldAfter?: Record<Id, number>;
}

export type BattleReplayEvent = BattleReplayAttackEvent | BattleReplayMoveEvent | BattleReplaySkillEvent;

export interface SkillStat {
  skillId: Id;
  skillName: string;
  activations: number;
  damage: number;
  healing: number;
  shield: number;
  buffActivations: number;
}

export interface BattleSkillAnalysis {
  topActivatedSkill?: SkillStat;
  totalDamage: number;
  totalHealing: number;
  totalShield: number;
  totalBuffActivations: number;
  skillStats: SkillStat[];
  summary: string[];
}

export interface BattleReplay {
  factionAName: string;
  factionBName: string;
  duration: number;
  battlefieldLength?: number;
  gridWidth?: number;
  gridHeight?: number;
  units: BattleReplayUnit[];
  events: BattleReplayEvent[];
}

export interface BattleResult {
  winner: 'A' | 'B' | 'Draw';
  factionAName?: string;
  factionBName?: string;
  winRateA: number;
  winRateB: number;
  remainingUnits: RemainingUnit[];
  totalDamageByUnit: UnitDamage[];
  mvpUnit: string;
  battleTime: number;
  logs: string[];
  analysis?: BattleAnalysis;
  replay?: BattleReplay;
}

export interface SimulationSummary extends BattleResult {
  runs: number;
  averageRemainingA: number;
  averageRemainingB: number;
}

export interface AppData {
  races: Race[];
  units: Unit[];
  unitTags: UnitTag[];
  attackTypes: AttackType[];
  defenseTypes: DefenseType[];
  typeMatrix: TypeMatrix[];
  traits: Trait[];
  skillTemplates: Skill[];
  battlePresets: BattlePreset[];
  lastResult?: BattleResult | SimulationSummary;
}

export type TabKey = 'races' | 'units' | 'types' | 'battle' | 'logs';
