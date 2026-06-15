export type Id = string;

export type TraitEffectType =
  | 'allHpPercent'
  | 'allAttackPercent'
  | 'allDefenseFlat'
  | 'defenseTypeAttackPercent'
  | 'attackTypeAttackPercent'
  | 'productionSpeedPercent'
  | 'moveSpeedPercent';

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
  skills: string;
  cost: number;
  buildTime: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

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
  notes: string;
}

export interface ArmyEntry {
  unitId: Id;
  count: number;
}

export interface BattlePreset {
  id: Id;
  name: string;
  raceAId: Id;
  raceBId: Id;
  armyA: ArmyEntry[];
  armyB: ArmyEntry[];
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

export interface BattleAnalysis {
  winnerName: string;
  topDamageUnit?: UnitDamage;
  damageShares: DamageShare[];
  survivalRatios: SurvivalRatio[];
  topAdvantagedAttackType?: TypeAdvantageReport;
  typeAdvantages: TypeAdvantageReport[];
  costEfficiency: CostEfficiency[];
  balanceSuggestions: string[];
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
}

export interface SimulationSummary extends BattleResult {
  runs: number;
  averageRemainingA: number;
  averageRemainingB: number;
}

export interface AppData {
  races: Race[];
  units: Unit[];
  attackTypes: AttackType[];
  defenseTypes: DefenseType[];
  typeMatrix: TypeMatrix[];
  traits: Trait[];
  battlePresets: BattlePreset[];
  lastResult?: BattleResult | SimulationSummary;
}

export type TabKey = 'races' | 'units' | 'types' | 'battle' | 'logs';
