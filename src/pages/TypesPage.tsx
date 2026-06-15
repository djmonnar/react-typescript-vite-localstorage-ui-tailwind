import { Plus, Trash2 } from 'lucide-react';
import { Fragment } from 'react';
import { useState } from 'react';
import { NumberStepper } from '../components/NumberStepper';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import type { AppData, AttackType, DefenseType, Trait, TraitEffectType } from '../types';
import { createId } from '../utils/ids';

interface TypesPageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
}

const effectLabels: Record<TraitEffectType, string> = {
  allHpPercent: '모든 유닛 HP %',
  allAttackPercent: '모든 유닛 공격력 %',
  allDefenseFlat: '모든 유닛 방어력 고정값',
  defenseTypeAttackPercent: '특정 방어타입 유닛 공격력 %',
  attackTypeAttackPercent: '특정 공격타입 유닛 공격력 %',
  productionSpeedPercent: '생산속도 %',
  moveSpeedPercent: '이동속도 %',
};

export function TypesPage({ data, setData }: TypesPageProps) {
  const [attackId, setAttackId] = useState(data.attackTypes[0]?.id ?? '');
  const [defenseId, setDefenseId] = useState(data.defenseTypes[0]?.id ?? '');
  const [traitId, setTraitId] = useState(data.traits[0]?.id ?? '');
  const selectedAttack = data.attackTypes.find((type) => type.id === attackId) ?? data.attackTypes[0];
  const selectedDefense = data.defenseTypes.find((type) => type.id === defenseId) ?? data.defenseTypes[0];
  const selectedTrait = data.traits.find((trait) => trait.id === traitId) ?? data.traits[0];

  const updateAttack = (patch: Partial<AttackType>) => {
    if (!selectedAttack) return;
    setData((current) => ({
      ...current,
      attackTypes: current.attackTypes.map((type) => (type.id === selectedAttack.id ? { ...type, ...patch } : type)),
    }));
  };

  const updateDefense = (patch: Partial<DefenseType>) => {
    if (!selectedDefense) return;
    setData((current) => ({
      ...current,
      defenseTypes: current.defenseTypes.map((type) => (type.id === selectedDefense.id ? { ...type, ...patch } : type)),
    }));
  };

  const updateTrait = (patch: Partial<Trait>) => {
    if (!selectedTrait) return;
    setData((current) => ({
      ...current,
      traits: current.traits.map((trait) => (trait.id === selectedTrait.id ? { ...trait, ...patch } : trait)),
    }));
  };

  const addAttack = () => {
    const id = createId('atk');
    setData((current) => ({
      ...current,
      attackTypes: [...current.attackTypes, { id, name: '새 공격 타입', description: '', notes: '' }],
    }));
    setAttackId(id);
  };

  const addDefense = () => {
    const id = createId('def');
    setData((current) => ({
      ...current,
      defenseTypes: [...current.defenseTypes, { id, name: '새 방어 타입', description: '', notes: '' }],
    }));
    setDefenseId(id);
  };

  const addTrait = () => {
    const id = createId('trait');
    setData((current) => ({
      ...current,
      traits: [
        ...current.traits,
        {
          id,
          name: '새 특성',
          description: '',
          effectType: 'allAttackPercent',
          targetFilter: {},
          value: 10,
          notes: '',
        },
      ],
    }));
    setTraitId(id);
  };

  const deleteAttack = () => {
    if (!selectedAttack || data.attackTypes.length <= 1) return;
    const fallback = data.attackTypes.find((type) => type.id !== selectedAttack.id)?.id ?? '';
    setData((current) => ({
      ...current,
      attackTypes: current.attackTypes.filter((type) => type.id !== selectedAttack.id),
      units: current.units.map((unit) =>
        unit.attackType === selectedAttack.id ? { ...unit, attackType: fallback } : unit,
      ),
      traits: current.traits.map((trait) => ({
        ...trait,
        targetFilter:
          trait.targetFilter.attackTypeId === selectedAttack.id ? { ...trait.targetFilter, attackTypeId: fallback } : trait.targetFilter,
      })),
    }));
    setAttackId(fallback);
  };

  const deleteDefense = () => {
    if (!selectedDefense || data.defenseTypes.length <= 1) return;
    const fallback = data.defenseTypes.find((type) => type.id !== selectedDefense.id)?.id ?? '';
    setData((current) => ({
      ...current,
      defenseTypes: current.defenseTypes.filter((type) => type.id !== selectedDefense.id),
      units: current.units.map((unit) =>
        unit.defenseType === selectedDefense.id ? { ...unit, defenseType: fallback } : unit,
      ),
      traits: current.traits.map((trait) => ({
        ...trait,
        targetFilter:
          trait.targetFilter.defenseTypeId === selectedDefense.id
            ? { ...trait.targetFilter, defenseTypeId: fallback }
            : trait.targetFilter,
      })),
    }));
    setDefenseId(fallback);
  };

  const deleteTrait = () => {
    if (!selectedTrait) return;
    setData((current) => ({
      ...current,
      traits: current.traits.filter((trait) => trait.id !== selectedTrait.id),
      races: current.races.map((race) => ({
        ...race,
        traitIds: race.traitIds.filter((id) => id !== selectedTrait.id),
      })),
    }));
    setTraitId(data.traits.find((trait) => trait.id !== selectedTrait.id)?.id ?? '');
  };

  const matrixValue = (attackTypeId: string, defenseTypeId: string) =>
    data.typeMatrix.find((entry) => entry.attackTypeId === attackTypeId && entry.defenseTypeId === defenseTypeId)
      ?.multiplier ?? 1;

  const updateMatrix = (attackTypeId: string, defenseTypeId: string, multiplier: number) => {
    setData((current) => ({
      ...current,
      typeMatrix: current.typeMatrix.map((entry) =>
        entry.attackTypeId === attackTypeId && entry.defenseTypeId === defenseTypeId
          ? { ...entry, multiplier }
          : entry,
      ),
    }));
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        subtitle="공격/방어 타입과 배율, 팩션 특성을 직접 편집합니다."
        title="상성표"
      />

      <section className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-ink">공격 타입</h3>
          <button className="btn btn-primary" onClick={addAttack} type="button">
            <Plus size={16} />
            추가
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.attackTypes.map((type) => (
            <button
              className={`shrink-0 rounded-md border px-3 py-2 text-sm ${
                selectedAttack?.id === type.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'
              }`}
              key={type.id}
              onClick={() => setAttackId(type.id)}
              type="button"
            >
              {type.name}
            </button>
          ))}
        </div>
        {selectedAttack ? (
          <div className="space-y-3">
            <TextField label="이름" onChange={(name) => updateAttack({ name })} value={selectedAttack.name} />
            <TextField label="설명" multiline onChange={(description) => updateAttack({ description })} value={selectedAttack.description} />
            <TextField label="메모" multiline onChange={(notes) => updateAttack({ notes })} value={selectedAttack.notes} />
            <button className="btn btn-danger w-full" disabled={data.attackTypes.length <= 1} onClick={deleteAttack} type="button">
              <Trash2 size={16} />
              공격 타입 삭제
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-ink">방어 타입</h3>
          <button className="btn btn-primary" onClick={addDefense} type="button">
            <Plus size={16} />
            추가
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.defenseTypes.map((type) => (
            <button
              className={`shrink-0 rounded-md border px-3 py-2 text-sm ${
                selectedDefense?.id === type.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'
              }`}
              key={type.id}
              onClick={() => setDefenseId(type.id)}
              type="button"
            >
              {type.name}
            </button>
          ))}
        </div>
        {selectedDefense ? (
          <div className="space-y-3">
            <TextField label="이름" onChange={(name) => updateDefense({ name })} value={selectedDefense.name} />
            <TextField label="설명" multiline onChange={(description) => updateDefense({ description })} value={selectedDefense.description} />
            <TextField label="메모" multiline onChange={(notes) => updateDefense({ notes })} value={selectedDefense.notes} />
            <button className="btn btn-danger w-full" disabled={data.defenseTypes.length <= 1} onClick={deleteDefense} type="button">
              <Trash2 size={16} />
              방어 타입 삭제
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel space-y-3">
        <h3 className="font-semibold text-ink">타입 배율 매트릭스</h3>
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[620px] gap-1"
            style={{ gridTemplateColumns: `96px repeat(${data.defenseTypes.length}, minmax(88px, 1fr))` }}
          >
            <div className="chip text-center">공격＼방어</div>
            {data.defenseTypes.map((type) => (
              <div className="chip text-center" key={type.id}>
                {type.name}
              </div>
            ))}
            {data.attackTypes.map((attackType) => (
              <Fragment key={attackType.id}>
                <div className="chip flex items-center justify-center text-center font-semibold text-ink" key={`${attackType.id}:label`}>
                  {attackType.name}
                </div>
                {data.defenseTypes.map((defenseType) => (
                  <input
                    className="min-h-11 rounded-md border border-line bg-[#0f141d] px-2 text-center text-sm text-ink outline-none focus:border-cyan"
                    key={`${attackType.id}:${defenseType.id}`}
                    min={0}
                    onChange={(event) =>
                      updateMatrix(attackType.id, defenseType.id, Number(event.target.value) || 0)
                    }
                    step={0.05}
                    type="number"
                    value={matrixValue(attackType.id, defenseType.id)}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-ink">팩션 특성</h3>
          <button className="btn btn-primary" onClick={addTrait} type="button">
            <Plus size={16} />
            추가
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.traits.map((trait) => (
            <button
              className={`shrink-0 rounded-md border px-3 py-2 text-sm ${
                selectedTrait?.id === trait.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'
              }`}
              key={trait.id}
              onClick={() => setTraitId(trait.id)}
              type="button"
            >
              {trait.name}
            </button>
          ))}
        </div>

        {selectedTrait ? (
          <div className="space-y-3">
            <TextField label="이름" onChange={(name) => updateTrait({ name })} value={selectedTrait.name} />
            <TextField label="설명" multiline onChange={(description) => updateTrait({ description })} value={selectedTrait.description} />
            <label className="block">
              <span className="label">효과</span>
              <select
                className="field"
                onChange={(event) =>
                  updateTrait({ effectType: event.target.value as TraitEffectType, targetFilter: {} })
                }
                value={selectedTrait.effectType}
              >
                {Object.entries(effectLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {selectedTrait.effectType === 'attackTypeAttackPercent' ? (
              <label className="block">
                <span className="label">대상 공격 타입</span>
                <select
                  className="field"
                  onChange={(event) => updateTrait({ targetFilter: { attackTypeId: event.target.value } })}
                  value={selectedTrait.targetFilter.attackTypeId ?? data.attackTypes[0]?.id ?? ''}
                >
                  {data.attackTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedTrait.effectType === 'defenseTypeAttackPercent' ? (
              <label className="block">
                <span className="label">대상 방어 타입</span>
                <select
                  className="field"
                  onChange={(event) => updateTrait({ targetFilter: { defenseTypeId: event.target.value } })}
                  value={selectedTrait.targetFilter.defenseTypeId ?? data.defenseTypes[0]?.id ?? ''}
                >
                  {data.defenseTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <NumberStepper label="값" min={-100} onChange={(value) => updateTrait({ value })} value={selectedTrait.value} />
            <TextField label="메모" multiline onChange={(notes) => updateTrait({ notes })} value={selectedTrait.notes} />
            <button className="btn btn-danger w-full" onClick={deleteTrait} type="button">
              <Trash2 size={16} />
              특성 삭제
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
