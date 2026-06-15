import { Dices, Eraser, Grid3X3, Play, Repeat, Wand2, X } from 'lucide-react';
import type { DragEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { NumberStepper } from '../components/NumberStepper';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import { UnitIcon } from '../components/UnitIcon';
import { simulateBattle, simulateMany } from '../simulation/battle';
import type { AppData, BattlePreset, DeployedUnit, GridTile, Unit } from '../types';
import {
  DEFAULT_MAX_COST,
  GRID_HEIGHT,
  GRID_WIDTH,
  deploymentCost,
  deploymentForFaction,
  deploymentTiles,
  isDeployTile,
  tileKey,
} from '../utils/battleGrid';
import { createId } from '../utils/ids';

interface BattlePageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
  goLogs: () => void;
}

type PaletteSelection = { team: 'A' | 'B'; unitId: string } | undefined;

export function BattlePage({ data, setData, goLogs }: BattlePageProps) {
  const [presetId, setPresetId] = useState(data.battlePresets[0]?.id ?? '');
  const [deploymentOpen, setDeploymentOpen] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<PaletteSelection>();
  const [selectedDeploymentId, setSelectedDeploymentId] = useState('');
  const [warning, setWarning] = useState('');
  const preset = data.battlePresets.find((candidate) => candidate.id === presetId) ?? data.battlePresets[0];
  const factionA = data.races.find((race) => race.id === preset?.raceAId) ?? data.races[0];
  const factionB = data.races.find((race) => race.id === preset?.raceBId) ?? data.races[1] ?? data.races[0];
  const unitsA = useMemo(() => data.units.filter((unit) => unit.raceId === factionA?.id), [data.units, factionA?.id]);
  const unitsB = useMemo(() => data.units.filter((unit) => unit.raceId === factionB?.id), [data.units, factionB?.id]);
  const deploymentA = preset?.deploymentA ?? [];
  const deploymentB = preset?.deploymentB ?? [];
  const maxCostA = preset?.maxCostA ?? DEFAULT_MAX_COST;
  const maxCostB = preset?.maxCostB ?? DEFAULT_MAX_COST;
  const costA = deploymentCost(deploymentA, data.units);
  const costB = deploymentCost(deploymentB, data.units);

  useEffect(() => {
    if (!data.battlePresets.some((candidate) => candidate.id === presetId)) {
      setPresetId(data.battlePresets[0]?.id ?? '');
    }
  }, [data.battlePresets, presetId]);

  const updatePreset = (patch: Partial<BattlePreset>) => {
    if (!preset) return;
    setData((current) => ({
      ...current,
      battlePresets: current.battlePresets.map((candidate) =>
        candidate.id === preset.id ? { ...candidate, ...patch } : candidate,
      ),
    }));
  };

  const updateDeployment = (team: 'A' | 'B', deployment: DeployedUnit[]) => {
    const key = team === 'A' ? 'deploymentA' : 'deploymentB';
    const armyKey = team === 'A' ? 'armyA' : 'armyB';
    updatePreset({ [key]: deployment, [armyKey]: armyFromDeployment(deployment) } as Partial<BattlePreset>);
  };

  const addPreset = () => {
    if (!data.races[0]) return;
    const id = createId('preset');
    const raceAId = data.races[0].id;
    const raceBId = data.races[1]?.id ?? data.races[0].id;
    const nextPreset: BattlePreset = {
      id,
      name: '새 전투',
      raceAId,
      raceBId,
      armyA: [],
      armyB: [],
      maxCostA: DEFAULT_MAX_COST,
      maxCostB: DEFAULT_MAX_COST,
      deploymentA: deploymentForFaction(data, raceAId, 'A', DEFAULT_MAX_COST),
      deploymentB: deploymentForFaction(data, raceBId, 'B', DEFAULT_MAX_COST),
      notes: '',
    };
    setData((current) => ({ ...current, battlePresets: [...current.battlePresets, nextPreset] }));
    setPresetId(id);
  };

  const changeFaction = (team: 'A' | 'B', raceId: string) => {
    const maxCost = team === 'A' ? maxCostA : maxCostB;
    const deployment = deploymentForFaction(data, raceId, team, maxCost);
    updatePreset(
      team === 'A'
        ? { raceAId: raceId, deploymentA: deployment, armyA: armyFromDeployment(deployment) }
        : { raceBId: raceId, deploymentB: deployment, armyB: armyFromDeployment(deployment) },
    );
    setSelectedPalette(undefined);
    setSelectedDeploymentId('');
  };

  const runOnce = () => {
    if (!preset || !validateBeforeBattle()) return;
    const result = simulateBattle(data, preset, true);
    setData((current) => ({ ...current, lastResult: result }));
    goLogs();
  };

  const runMany = () => {
    if (!preset || !validateBeforeBattle()) return;
    const result = simulateMany(data, preset, 100);
    setData((current) => ({ ...current, lastResult: result }));
    goLogs();
  };

  const validateBeforeBattle = () => {
    if (deploymentA.length === 0 || deploymentB.length === 0) {
      setWarning('A/B 양쪽 모두 최소 1기 이상 배치해야 합니다.');
      return false;
    }
    if (costA > maxCostA || costB > maxCostB) {
      setWarning('코스트가 초과되었습니다. 배치를 줄이거나 최대 코스트를 올려주세요.');
      return false;
    }
    setWarning('');
    return true;
  };

  if (!preset) {
    return (
      <div className="space-y-4">
        <SectionHeader
          action={
            <button className="btn btn-primary" onClick={addPreset} type="button">
              전투 추가
            </button>
          }
          title="전투 시뮬레이션"
        />
        <p className="panel text-sm text-muted">전투 프리셋이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        action={
          <button className="btn btn-primary" onClick={addPreset} type="button">
            전투 추가
          </button>
        }
        subtitle="개별 유닛을 타일 보드에 배치하고 자동 전투를 실행합니다."
        title="전투 시뮬레이션"
      />

      <section className="panel space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.battlePresets.map((candidate) => (
            <button
              className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${
                candidate.id === preset.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'
              }`}
              key={candidate.id}
              onClick={() => setPresetId(candidate.id)}
              type="button"
            >
              {candidate.name}
            </button>
          ))}
        </div>

        <TextField label="프리셋 이름" onChange={(name) => updatePreset({ name })} value={preset.name} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FactionSelect label="A 팩션" onChange={(raceId) => changeFaction('A', raceId)} races={data.races} value={preset.raceAId} />
          <FactionSelect label="B 팩션" onChange={(raceId) => changeFaction('B', raceId)} races={data.races} value={preset.raceBId} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberStepper label="A 최대 코스트" min={1} onChange={(maxCostA) => updatePreset({ maxCostA })} value={maxCostA} />
          <NumberStepper label="B 최대 코스트" min={1} onChange={(maxCostB) => updatePreset({ maxCostB })} value={maxCostB} />
        </div>
        <TextField label="메모" multiline onChange={(notes) => updatePreset({ notes })} value={preset.notes} />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FactionArmySummary
          cost={costA}
          factionName={factionA?.name ?? 'A'}
          maxCost={maxCostA}
          team="A"
          units={unitsA}
        />
        <FactionArmySummary
          cost={costB}
          factionName={factionB?.name ?? 'B'}
          maxCost={maxCostB}
          team="B"
          units={unitsB}
        />
      </section>

      {warning ? <p className="rounded-md border border-danger/50 bg-danger/10 p-3 text-sm text-danger">{warning}</p> : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button className="btn min-h-14" onClick={() => setDeploymentOpen(true)} type="button">
          <Grid3X3 size={18} />
          배치 편집
        </button>
        <button className="btn btn-primary min-h-14" onClick={runOnce} type="button">
          <Play size={18} />
          1회 전투
        </button>
        <button className="btn min-h-14 border-amber/60 bg-amber/10 text-amber" onClick={runMany} type="button">
          <Repeat size={18} />
          100회 반복
        </button>
      </section>

      {deploymentOpen ? (
        <DeploymentModal
          costA={costA}
          costB={costB}
          data={data}
          deploymentA={deploymentA}
          deploymentB={deploymentB}
          factionAName={factionA?.name ?? 'A'}
          factionBName={factionB?.name ?? 'B'}
          maxCostA={maxCostA}
          maxCostB={maxCostB}
          onClose={() => setDeploymentOpen(false)}
          onSetDeployment={updateDeployment}
          selectedDeploymentId={selectedDeploymentId}
          selectedPalette={selectedPalette}
          setSelectedDeploymentId={setSelectedDeploymentId}
          setSelectedPalette={setSelectedPalette}
          setWarning={setWarning}
          unitsA={unitsA}
          unitsB={unitsB}
        />
      ) : null}
    </div>
  );
}

function FactionSelect({
  label,
  onChange,
  races,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  races: AppData['races'];
  value: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="field" onChange={(event) => onChange(event.target.value)} value={value}>
        {races.map((race) => (
          <option key={race.id} value={race.id}>
            {race.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function FactionArmySummary({
  cost,
  factionName,
  maxCost,
  team,
  units,
}: {
  cost: number;
  factionName: string;
  maxCost: number;
  team: 'A' | 'B';
  units: Unit[];
}) {
  return (
    <section className="panel space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">
            {team} 팩션: {factionName}
          </h3>
          <p className={`mt-1 font-mono text-sm font-bold ${cost > maxCost ? 'text-danger' : 'text-cyan'}`}>
            사용 코스트 {cost} / {maxCost}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {units.map((unit) => (
          <div className="rounded-md border border-line bg-[#0f141d] p-2" key={unit.id}>
            <div className="flex items-start gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-[#10151f] text-cyan">
                <UnitIcon className="h-5 w-5" type={unit.iconType} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{unit.isHero ? '★ ' : ''}{unit.name}</p>
                <p className="text-xs text-muted">
                  {unit.role} · 코스트 {unit.unitCost} · HP {unit.hp} · 공격 {unit.attack} · 방어 {unit.defense}
                </p>
                <p className="text-xs text-muted">
                  사거리 {unit.range} · 이동 {Math.max(1, Math.min(4, Math.round(unit.moveSpeed)))}
                </p>
                {unit.tags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {unit.tags.slice(0, 4).map((tag) => (
                      <span className="chip text-[9px]" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeploymentModal({
  costA,
  costB,
  data,
  deploymentA,
  deploymentB,
  factionAName,
  factionBName,
  maxCostA,
  maxCostB,
  onClose,
  onSetDeployment,
  selectedDeploymentId,
  selectedPalette,
  setSelectedDeploymentId,
  setSelectedPalette,
  setWarning,
  unitsA,
  unitsB,
}: {
  costA: number;
  costB: number;
  data: AppData;
  deploymentA: DeployedUnit[];
  deploymentB: DeployedUnit[];
  factionAName: string;
  factionBName: string;
  maxCostA: number;
  maxCostB: number;
  onClose: () => void;
  onSetDeployment: (team: 'A' | 'B', deployment: DeployedUnit[]) => void;
  selectedDeploymentId: string;
  selectedPalette: PaletteSelection;
  setSelectedDeploymentId: (value: string) => void;
  setSelectedPalette: (value: PaletteSelection) => void;
  setWarning: (value: string) => void;
  unitsA: Unit[];
  unitsB: Unit[];
}) {
  const [localMessage, setLocalMessage] = useState('배치할 유닛을 고른 뒤 자기 진영의 빈 타일을 선택하세요.');
  const unitMap = useMemo(() => new Map(data.units.map((unit) => [unit.id, unit])), [data.units]);
  const allDeployment = [...deploymentA, ...deploymentB];
  const selectedDeployment = allDeployment.find((item) => item.id === selectedDeploymentId);

  const placeUnit = (team: 'A' | 'B', unitId: string, tile: GridTile) => {
    const unit = unitMap.get(unitId);
    if (!unit) return;
    if (!isDeployTile(team, tile)) return showMessage('자기 진영에만 배치할 수 있습니다.');
    if (unitAt(tile)) return showMessage('한 타일에는 한 유닛만 배치할 수 있습니다.');
    const deployment = team === 'A' ? deploymentA : deploymentB;
    const maxCost = team === 'A' ? maxCostA : maxCostB;
    const currentCost = team === 'A' ? costA : costB;
    if (currentCost + unit.unitCost > maxCost) return showMessage('코스트가 초과되었습니다.');
    onSetDeployment(team, [...deployment, { id: createId('deploy'), unitId, team, tile }]);
    setSelectedDeploymentId('');
    setSelectedPalette(undefined);
    showMessage(`${unit.name} 배치 완료`);
  };

  const moveDeployment = (deploymentId: string, tile: GridTile) => {
    const item = allDeployment.find((candidate) => candidate.id === deploymentId);
    if (!item) return;
    if (!isDeployTile(item.team, tile)) return showMessage('자기 진영 배치 구역 안에서만 이동할 수 있습니다.');
    if (unitAt(tile)) return showMessage('한 타일에는 한 유닛만 배치할 수 있습니다.');
    const deployment = item.team === 'A' ? deploymentA : deploymentB;
    onSetDeployment(
      item.team,
      deployment.map((candidate) => (candidate.id === deploymentId ? { ...candidate, tile } : candidate)),
    );
    setSelectedDeploymentId('');
    showMessage('유닛을 이동했습니다.');
  };

  const removeSelected = () => {
    if (!selectedDeployment) return;
    const deployment = selectedDeployment.team === 'A' ? deploymentA : deploymentB;
    onSetDeployment(
      selectedDeployment.team,
      deployment.filter((item) => item.id !== selectedDeployment.id),
    );
    setSelectedDeploymentId('');
    showMessage('배치를 해제했습니다.');
  };

  const clearTeam = (team: 'A' | 'B') => {
    onSetDeployment(team, []);
    setSelectedDeploymentId('');
    showMessage(`${team} 배치를 초기화했습니다.`);
  };

  const autoDeploy = (team: 'A' | 'B') => {
    const units = team === 'A' ? unitsA : unitsB;
    const maxCost = team === 'A' ? maxCostA : maxCostB;
    onSetDeployment(team, buildAutoDeployment(units, team, maxCost, false));
    showMessage(`${team} 자동 배치를 완료했습니다.`);
  };

  const randomDeploy = (team: 'A' | 'B') => {
    const units = team === 'A' ? unitsA : unitsB;
    const maxCost = team === 'A' ? maxCostA : maxCostB;
    onSetDeployment(team, buildAutoDeployment(units, team, maxCost, true));
    showMessage(`${team} 랜덤 배치를 완료했습니다.`);
  };

  const mirrorDeployment = () => {
    const bUnitIds = unitsB.map((unit) => unit.id);
    const mirrored = deploymentA.flatMap((item, index) => {
      const unitId = bUnitIds[index % bUnitIds.length];
      if (!unitId) return [];
      const tile = { x: GRID_WIDTH - 1 - item.tile.x, y: item.tile.y };
      return isDeployTile('B', tile) ? [{ id: createId('deploy'), unitId, team: 'B' as const, tile }] : [];
    });
    const limited = limitByCost(mirrored, unitsB, maxCostB);
    onSetDeployment('B', limited);
    showMessage('A 배치를 기준으로 B를 좌우 대칭 배치했습니다.');
  };

  const showMessage = (message: string) => {
    setLocalMessage(message);
    setWarning(message.includes('초과') ? message : '');
  };

  const unitAt = (tile: GridTile) => allDeployment.find((item) => item.tile.x === tile.x && item.tile.y === tile.y);

  const handleTileClick = (tile: GridTile) => {
    const placed = unitAt(tile);
    if (placed) {
      setSelectedDeploymentId(placed.id);
      setSelectedPalette(undefined);
      const unit = unitMap.get(placed.unitId);
      showMessage(`${unit?.name ?? '유닛'} 선택됨. 빈 타일을 누르면 이동합니다.`);
      return;
    }
    if (selectedDeploymentId) return moveDeployment(selectedDeploymentId, tile);
    if (selectedPalette) return placeUnit(selectedPalette.team, selectedPalette.unitId, tile);
    showMessage('먼저 배치할 유닛을 선택하세요.');
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>, tile: GridTile) => {
    event.preventDefault();
    const deploymentId = event.dataTransfer.getData('deploymentId');
    const paletteTeam = event.dataTransfer.getData('paletteTeam') as 'A' | 'B';
    const paletteUnitId = event.dataTransfer.getData('paletteUnitId');
    if (deploymentId) moveDeployment(deploymentId, tile);
    else if (paletteTeam && paletteUnitId) placeUnit(paletteTeam, paletteUnitId, tile);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#05070a]/95 p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="sticky top-0 z-10 rounded-md border border-line bg-[#0b0f16]/95 p-3 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label">유닛 배치</p>
              <h2 className="text-lg font-black text-ink">전투 맵 배치 편집</h2>
              <p className="mt-1 text-xs text-muted">{localMessage}</p>
            </div>
            <button className="btn" onClick={onClose} type="button">
              <X size={16} />
              닫기
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[250px_1fr_250px]">
          <Palette
            cost={costA}
            factionName={factionAName}
            maxCost={maxCostA}
            onAuto={() => autoDeploy('A')}
            onClear={() => clearTeam('A')}
            onRandom={() => randomDeploy('A')}
            onSelect={(unitId) => {
              setSelectedPalette({ team: 'A', unitId });
              setSelectedDeploymentId('');
              showMessage('A 유닛을 선택했습니다. 왼쪽 배치 구역의 빈 타일을 누르세요.');
            }}
            selectedPalette={selectedPalette}
            team="A"
            units={unitsA}
          />

          <section className="rounded-md border border-line bg-[#070a10] p-2">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
              <span>A 배치 구역</span>
              <button className="btn min-h-9 px-3 py-1 text-xs" onClick={mirrorDeployment} type="button">
                좌우 대칭 배치
              </button>
              <span>B 배치 구역</span>
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_WIDTH}, minmax(0, 1fr))` }}>
              {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, (_, index) => {
                const tile = { x: index % GRID_WIDTH, y: Math.floor(index / GRID_WIDTH) };
                const item = unitAt(tile);
                const unit = item ? unitMap.get(item.unitId) : undefined;
                return (
                  <button
                    className={`relative aspect-square min-h-12 rounded border text-left ${
                      tile.x <= 1
                        ? 'border-cyan/25 bg-cyan/5'
                        : tile.x >= GRID_WIDTH - 2
                          ? 'border-danger/25 bg-danger/5'
                          : 'border-line bg-[#0b1018]'
                    } ${selectedDeploymentId === item?.id ? 'outline outline-2 outline-amber' : ''}`}
                    key={tileKey(tile)}
                    onClick={() => handleTileClick(tile)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, tile)}
                    type="button"
                  >
                    {unit && item ? (
                      <DeployToken
                        item={item}
                        selected={selectedDeploymentId === item.id}
                        unit={unit}
                      />
                    ) : (
                      <span className="absolute left-1 top-1 font-mono text-[9px] text-muted/60">
                        {tile.x},{tile.y}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-danger" disabled={!selectedDeployment} onClick={removeSelected} type="button">
                선택 배치 해제
              </button>
              <span className="chip">중앙 중립 구역에는 시작 배치 불가</span>
            </div>
          </section>

          <Palette
            cost={costB}
            factionName={factionBName}
            maxCost={maxCostB}
            onAuto={() => autoDeploy('B')}
            onClear={() => clearTeam('B')}
            onRandom={() => randomDeploy('B')}
            onSelect={(unitId) => {
              setSelectedPalette({ team: 'B', unitId });
              setSelectedDeploymentId('');
              showMessage('B 유닛을 선택했습니다. 오른쪽 배치 구역의 빈 타일을 누르세요.');
            }}
            selectedPalette={selectedPalette}
            team="B"
            units={unitsB}
          />
        </div>
      </div>
    </div>
  );
}

function Palette({
  cost,
  factionName,
  maxCost,
  onAuto,
  onClear,
  onRandom,
  onSelect,
  selectedPalette,
  team,
  units,
}: {
  cost: number;
  factionName: string;
  maxCost: number;
  onAuto: () => void;
  onClear: () => void;
  onRandom: () => void;
  onSelect: (unitId: string) => void;
  selectedPalette: PaletteSelection;
  team: 'A' | 'B';
  units: Unit[];
}) {
  return (
    <section className="space-y-2 rounded-md border border-line bg-panel p-3">
      <div>
        <h3 className="font-bold text-ink">
          {team} 팩션 · {factionName}
        </h3>
        <p className={`mt-1 font-mono text-sm font-bold ${cost > maxCost ? 'text-danger' : 'text-cyan'}`}>
          사용 코스트 {cost} / {maxCost}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button className="btn min-h-10 px-2 py-1 text-xs" onClick={onAuto} type="button">
          <Wand2 size={14} />자동
        </button>
        <button className="btn min-h-10 px-2 py-1 text-xs" onClick={onRandom} type="button">
          <Dices size={14} />랜덤
        </button>
        <button className="btn btn-danger min-h-10 px-2 py-1 text-xs" onClick={onClear} type="button">
          <Eraser size={14} />초기화
        </button>
      </div>
      <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
        {units.map((unit) => (
          <button
            className={`w-full rounded-md border p-2 text-left ${
              selectedPalette?.team === team && selectedPalette.unitId === unit.id
                ? 'border-cyan bg-cyan/15'
                : 'border-line bg-[#0f141d]'
            }`}
            draggable
            key={unit.id}
            onClick={() => onSelect(unit.id)}
            onDragStart={(event) => {
              event.dataTransfer.setData('paletteTeam', team);
              event.dataTransfer.setData('paletteUnitId', unit.id);
            }}
            type="button"
          >
            <div className="flex items-start gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-[#10151f] text-cyan">
                <UnitIcon className="h-5 w-5" type={unit.iconType} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{unit.isHero ? '★ ' : ''}{unit.name}</p>
                <p className="text-xs text-muted">
                  {unit.role} · 코스트 {unit.unitCost}
                </p>
                <p className="text-xs text-muted">
                  HP {unit.hp} · 공격 {unit.attack} · 사거리 {unit.range} · 이동 {Math.max(1, Math.min(4, Math.round(unit.moveSpeed)))}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function DeployToken({ item, selected, unit }: { item: DeployedUnit; selected: boolean; unit: Unit }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col justify-between rounded p-1 ${
        item.team === 'A' ? 'bg-cyan/15 text-cyan' : 'bg-danger/15 text-danger'
      } ${selected ? 'ring-2 ring-amber' : ''}`}
      draggable
      onDragStart={(event) => event.dataTransfer.setData('deploymentId', item.id)}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[9px] font-bold">{item.team}</span>
        {unit.isHero ? <span className="text-[10px] font-bold text-amber">★</span> : null}
      </div>
      <UnitIcon className="mx-auto h-4 w-4" type={unit.iconType} />
      <p className="truncate text-center text-[10px] font-bold text-ink">{shortUnitName(unit.name)}</p>
    </div>
  );
}

function armyFromDeployment(deployment: DeployedUnit[]): BattlePreset['armyA'] {
  const counts = new Map<string, number>();
  for (const item of deployment) counts.set(item.unitId, (counts.get(item.unitId) ?? 0) + 1);
  return [...counts.entries()].map(([unitId, count]) => ({ unitId, count }));
}

function buildAutoDeployment(units: Unit[], team: 'A' | 'B', maxCost: number, random: boolean): DeployedUnit[] {
  const tiles = [...deploymentTiles(team)];
  const unitPool = [...units].sort((left, right) => left.unitCost - right.unitCost);
  if (random) {
    shuffle(tiles);
    shuffle(unitPool);
  }

  const result: DeployedUnit[] = [];
  let cost = 0;
  let cursor = 0;

  while (result.length < tiles.length && unitPool.length > 0) {
    const candidates = unitPool.filter((unit) => cost + unit.unitCost <= maxCost);
    if (candidates.length === 0) break;
    const unit = candidates[cursor % candidates.length];
    const tile = tiles[result.length];
    result.push({ id: createId('deploy'), unitId: unit.id, team, tile });
    cost += unit.unitCost;
    cursor += 1;
  }

  return result;
}

function limitByCost(deployment: DeployedUnit[], units: Unit[], maxCost: number) {
  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  let cost = 0;
  const result: DeployedUnit[] = [];
  for (const item of deployment) {
    const unit = unitMap.get(item.unitId);
    if (!unit || cost + unit.unitCost > maxCost) continue;
    result.push(item);
    cost += unit.unitCost;
  }
  return result;
}

function shuffle<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

function shortUnitName(name: string): string {
  const compact = name.replace(/\s+/g, '');
  if (compact.length <= 4) return compact;
  return compact.slice(0, 4);
}
