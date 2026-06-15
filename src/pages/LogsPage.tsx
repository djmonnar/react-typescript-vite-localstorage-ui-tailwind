import { Download, RotateCcw, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { SectionHeader } from '../components/SectionHeader';
import type { AppData, SimulationSummary } from '../types';
import { exportData, importData } from '../utils/exportImport';

interface LogsPageProps {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
  replaceData: (data: AppData) => void;
  resetData: () => void;
}

export function LogsPage({ data, setData, replaceData, resetData }: LogsPageProps) {
  const [jsonText, setJsonText] = useState('');
  const [message, setMessage] = useState('');
  const result = data.lastResult;
  const exported = useMemo(() => exportData(data), [data]);
  const isSummary = result && 'runs' in result;
  const winnerLabel =
    result?.winner === 'A'
      ? (result.factionAName ?? 'A')
      : result?.winner === 'B'
        ? (result.factionBName ?? 'B')
        : '무승부';

  const applyImport = () => {
    try {
      replaceData(importData(jsonText));
      setMessage('가져오기 완료');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '가져오기 실패');
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        subtitle="전투 결과, 콘솔 로그, JSON 백업을 관리합니다."
        title="결과 / 로그"
      />

      {result ? (
        <section className="panel space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="승자" value={winnerLabel} />
            <Metric label="A 승률" value={`${result.winRateA}%`} />
            <Metric label="B 승률" value={`${result.winRateB}%`} />
            <Metric label="전투 시간" value={`${result.battleTime}s`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="A 팩션" value={result.factionAName ?? 'A'} />
            <Metric label="B 팩션" value={result.factionBName ?? 'B'} />
          </div>
          {isSummary ? (
            <div className="grid grid-cols-2 gap-2">
              <Metric label="평균 생존 A" value={(result as SimulationSummary).averageRemainingA} />
              <Metric label="평균 생존 B" value={(result as SimulationSummary).averageRemainingB} />
            </div>
          ) : null}
          <div className="rounded-md border border-line bg-[#0f141d] p-3">
            <p className="label">MVP</p>
            <p className="text-lg font-bold text-amber">{result.mvpUnit}</p>
          </div>
          {result.analysis ? <AnalysisReport analysis={result.analysis} /> : null}
          <div>
            <p className="label">평균/총 피해량</p>
            <div className="grid gap-2">
              {result.totalDamageByUnit.slice(0, 6).map((damage) => (
                <div className="flex items-center justify-between rounded-md border border-line bg-[#0f141d] px-3 py-2" key={damage.unitId}>
                  <span className="text-sm text-ink">{damage.name}</span>
                  <span className="font-mono text-sm text-acid">{damage.damage}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="label">생존 유닛</p>
            <div className="flex flex-wrap gap-2">
              {result.remainingUnits.map((unit) => (
                <span className="chip" key={`${unit.team}:${unit.unitId}`}>
                  {unit.team}:{unit.name} x{unit.count}
                </span>
              ))}
              {result.remainingUnits.length === 0 ? <span className="text-sm text-muted">생존 없음</span> : null}
            </div>
          </div>
          <pre className="max-h-96 overflow-auto rounded-md border border-line bg-[#05070a] p-3 font-mono text-xs leading-relaxed text-acid">
            {result.logs.join('\n')}
          </pre>
          <button className="btn w-full" onClick={() => setData((current) => ({ ...current, lastResult: undefined }))} type="button">
            로그 지우기
          </button>
        </section>
      ) : (
        <p className="panel text-sm text-muted">아직 전투 결과가 없습니다. 전투 탭에서 시뮬레이션을 실행하세요.</p>
      )}

      <section className="panel space-y-3">
        <h3 className="font-semibold text-ink">JSON 내보내기 / 가져오기</h3>
        <textarea
          className="field min-h-48 font-mono text-xs"
          onChange={(event) => setJsonText(event.target.value)}
          placeholder="가져올 JSON을 붙여넣거나, 아래 내보내기 버튼으로 현재 데이터를 채웁니다."
          value={jsonText}
        />
        {message ? <p className="text-sm text-amber">{message}</p> : null}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button className="btn" onClick={() => setJsonText(exported)} type="button">
            <Download size={16} />
            내보내기
          </button>
          <button className="btn btn-primary" onClick={applyImport} type="button">
            <Upload size={16} />
            가져오기
          </button>
          <button className="btn btn-danger" onClick={resetData} type="button">
            <RotateCcw size={16} />
            샘플 초기화
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-[#0f141d] p-3">
      <p className="label">{label}</p>
      <p className="font-mono text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function AnalysisReport({ analysis }: { analysis: NonNullable<AppData['lastResult']>['analysis'] }) {
  if (!analysis) return null;

  return (
    <section className="space-y-3 rounded-md border border-cyan/30 bg-cyan/5 p-3">
      <div>
        <p className="label">분석 리포트</p>
        <h3 className="text-lg font-bold text-cyan">
          승리 팩션: {analysis.winnerName}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Metric label="총 피해량 1위" value={analysis.topDamageUnit ? `${analysis.topDamageUnit.name} ${analysis.topDamageUnit.damage}` : '없음'} />
        <Metric
          label="상성 이득 1위"
          value={
            analysis.topAdvantagedAttackType
              ? `${analysis.topAdvantagedAttackType.attackTypeName} +${analysis.topAdvantagedAttackType.bonusDamage}`
              : '없음'
          }
        />
      </div>

      <ReportBlock title="피해량 비중">
        {analysis.damageShares.slice(0, 5).map((entry) => (
          <PercentRow
            key={entry.unitId}
            label={entry.name}
            meta={`${entry.damage} dmg`}
            percent={entry.sharePercent}
          />
        ))}
      </ReportBlock>

      <ReportBlock title="생존 유닛 비율">
        {analysis.survivalRatios.map((entry) => (
          <PercentRow
            key={entry.team}
            label={`${entry.team} · ${entry.factionName}`}
            meta={`${entry.remainingCount}/${entry.initialCount} 생존`}
            percent={entry.ratioPercent}
          />
        ))}
      </ReportBlock>

      <ReportBlock title="타입 상성 이득">
        {analysis.typeAdvantages.slice(0, 4).map((entry) => (
          <div className="flex items-center justify-between rounded-md border border-line bg-[#0f141d] px-3 py-2" key={entry.attackTypeId}>
            <span className="text-sm text-ink">{entry.attackTypeName}</span>
            <span className="font-mono text-xs text-acid">
              +{entry.bonusDamage} / {entry.totalDamage} dmg · {entry.hitCount} hits
            </span>
          </div>
        ))}
        {analysis.typeAdvantages.length === 0 ? <p className="text-sm text-muted">상성 이득 데이터가 없습니다.</p> : null}
      </ReportBlock>

      <ReportBlock title="가격 대비 효율">
        {analysis.costEfficiency.slice(0, 5).map((entry) => (
          <div className="flex items-center justify-between rounded-md border border-line bg-[#0f141d] px-3 py-2" key={entry.unitId}>
            <span className="text-sm text-ink">{entry.name}</span>
            <span className="font-mono text-xs text-amber">
              {entry.efficiency} dmg/cost · cost {entry.totalCost}
            </span>
          </div>
        ))}
      </ReportBlock>

      <ReportBlock title="밸런스 조정 제안">
        <div className="space-y-2">
          {analysis.balanceSuggestions.map((suggestion) => (
            <p className="rounded-md border border-line bg-[#0f141d] px-3 py-2 text-sm text-muted" key={suggestion}>
              {suggestion}
            </p>
          ))}
        </div>
      </ReportBlock>
    </section>
  );
}

function ReportBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="label">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PercentRow({ label, meta, percent }: { label: string; meta: string; percent: number }) {
  return (
    <div className="rounded-md border border-line bg-[#0f141d] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="font-mono text-xs text-muted">
          {percent}% · {meta}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-[#070a10]">
        <div className="h-full rounded bg-cyan" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  );
}
