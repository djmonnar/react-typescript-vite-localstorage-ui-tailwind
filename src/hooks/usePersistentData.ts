import { useCallback, useEffect, useMemo, useState } from 'react';
import { sampleData } from '../data/sampleData';
import type { AppData } from '../types';
import { normalizeData } from '../utils/dataIntegrity';

const STORAGE_KEY = 'creative-race-battle-lab:v1';

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeData(sampleData);
    return normalizeData(JSON.parse(raw) as AppData);
  } catch {
    return normalizeData(sampleData);
  }
}

export function usePersistentData() {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const updateData = useCallback((updater: (current: AppData) => AppData) => {
    setData((current) => normalizeData(updater(current)));
  }, []);

  const resetData = useCallback(() => {
    setData(normalizeData(sampleData));
  }, []);

  return useMemo(
    () => ({
      data,
      setData: updateData,
      replaceData: setData,
      resetData,
    }),
    [data, resetData, updateData],
  );
}
