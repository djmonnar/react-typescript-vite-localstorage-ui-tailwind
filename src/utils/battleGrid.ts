import type { AppData, DeployedUnit, GridTile, Unit } from '../types';
import { createId } from './ids';

export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 6;
export const DEFAULT_MAX_COST = 100;

export function tileKey(tile: GridTile): string {
  return `${tile.x}:${tile.y}`;
}

export function sameTile(left: GridTile, right: GridTile): boolean {
  return left.x === right.x && left.y === right.y;
}

export function inBounds(tile: GridTile): boolean {
  return tile.x >= 0 && tile.x < GRID_WIDTH && tile.y >= 0 && tile.y < GRID_HEIGHT;
}

export function isDeployTile(team: 'A' | 'B', tile: GridTile): boolean {
  if (!inBounds(tile)) return false;
  return team === 'A' ? tile.x <= 1 : tile.x >= GRID_WIDTH - 2;
}

export function deploymentTiles(team: 'A' | 'B'): GridTile[] {
  const columns = team === 'A' ? [0, 1] : [GRID_WIDTH - 1, GRID_WIDTH - 2];
  return columns.flatMap((x) => Array.from({ length: GRID_HEIGHT }, (_, y) => ({ x, y })));
}

export function clampUnitCost(unit: Pick<Unit, 'cost' | 'unitCost'>): number {
  return Math.max(1, Math.round(unit.unitCost ?? unit.cost / 50));
}

export function deploymentCost(deployment: DeployedUnit[] | undefined, units: Unit[]): number {
  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  return (deployment ?? []).reduce((sum, item) => {
    const unit = unitMap.get(item.unitId);
    return sum + (unit ? clampUnitCost(unit) : 0);
  }, 0);
}

export function normalizeDeployment(
  deployment: DeployedUnit[] | undefined,
  team: 'A' | 'B',
  validUnitIds: Set<string>,
): DeployedUnit[] {
  const used = new Set<string>();
  return (deployment ?? []).flatMap((item) => {
    if (!validUnitIds.has(item.unitId) || !isDeployTile(team, item.tile) || used.has(tileKey(item.tile))) return [];
    used.add(tileKey(item.tile));
    return [{ ...item, id: item.id || createId('deploy'), team, tile: { ...item.tile } }];
  });
}

export function autoDeployFromUnitIds(unitIds: string[], team: 'A' | 'B', existing: DeployedUnit[] = []): DeployedUnit[] {
  const used = new Set(existing.map((item) => tileKey(item.tile)));
  const tiles = deploymentTiles(team);
  const result = [...existing];

  for (const unitId of unitIds) {
    const tile = tiles.find((candidate) => !used.has(tileKey(candidate)));
    if (!tile) break;
    used.add(tileKey(tile));
    result.push({ id: createId('deploy'), unitId, team, tile });
  }

  return result;
}

export function deploymentFromArmy(
  army: Array<{ unitId: string; count: number }> | undefined,
  team: 'A' | 'B',
  validUnitIds: Set<string>,
): DeployedUnit[] {
  const unitIds = (army ?? []).flatMap((entry) =>
    validUnitIds.has(entry.unitId)
      ? Array.from({ length: Math.max(0, Math.round(entry.count)) }, () => entry.unitId)
      : [],
  );
  return autoDeployFromUnitIds(unitIds, team);
}

export function deploymentForFaction(
  data: AppData,
  factionId: string,
  team: 'A' | 'B',
  maxCost = DEFAULT_MAX_COST,
): DeployedUnit[] {
  const units = data.units.filter((unit) => unit.raceId === factionId);
  let total = 0;
  const unitIds: string[] = [];

  for (const unit of units) {
    const cost = clampUnitCost(unit);
    if (total + cost > maxCost) continue;
    unitIds.push(unit.id);
    total += cost;
  }

  return autoDeployFromUnitIds(unitIds, team);
}
