import type { AppData, TypeMatrix } from '../types';

export function ensureMatrix(data: AppData): TypeMatrix[] {
  const existing = new Map(
    data.typeMatrix.map((entry) => [`${entry.attackTypeId}:${entry.defenseTypeId}`, entry.multiplier]),
  );

  return data.attackTypes.flatMap((attackType) =>
    data.defenseTypes.map((defenseType) => ({
      attackTypeId: attackType.id,
      defenseTypeId: defenseType.id,
      multiplier: existing.get(`${attackType.id}:${defenseType.id}`) ?? 1,
    })),
  );
}

export function normalizeData(data: AppData): AppData {
  const raceIds = new Set(data.races.map((race) => race.id));
  const unitIds = new Set(data.units.map((unit) => unit.id));
  const attackTypeIds = new Set(data.attackTypes.map((type) => type.id));
  const defenseTypeIds = new Set(data.defenseTypes.map((type) => type.id));
  const traitIds = new Set(data.traits.map((trait) => trait.id));

  return {
    ...data,
    units: data.units.filter(
      (unit) =>
        raceIds.has(unit.raceId) && attackTypeIds.has(unit.attackType) && defenseTypeIds.has(unit.defenseType),
    ),
    races: data.races.map((race) => ({
      ...race,
      traitIds: race.traitIds.filter((id) => traitIds.has(id)),
      unitIds: race.unitIds.filter((id) => unitIds.has(id)),
      heroUnitId: unitIds.has(race.heroUnitId) ? race.heroUnitId : '',
    })),
    typeMatrix: ensureMatrix(data),
    battlePresets: data.battlePresets.map((preset) => ({
      ...preset,
      armyA: preset.armyA.filter((entry) => unitIds.has(entry.unitId)),
      armyB: preset.armyB.filter((entry) => unitIds.has(entry.unitId)),
    })),
  };
}
