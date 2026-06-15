import type { AppData } from '../types';
import { normalizeData } from './dataIntegrity';

export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(raw: string): AppData {
  const parsed = JSON.parse(raw) as Partial<AppData>;
  const requiredKeys = ['races', 'units', 'attackTypes', 'defenseTypes', 'typeMatrix', 'traits', 'battlePresets'];
  for (const key of requiredKeys) {
    if (!Array.isArray(parsed[key as keyof AppData])) {
      throw new Error(`JSON에 ${key} 배열이 없습니다.`);
    }
  }
  return normalizeData(parsed as AppData);
}
