// components/tabs/SummaryTab.jsx

import { BarChart2, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SummaryTab({ data }) {
  if (!data) return null;

  const { period, correlation_stats, stocks_analyzed, collection_status } = data;

  // ✅ 1. 데이터 수집에 실패한 종목만 필터링합니다.
  const failed_stocks = collection_status?.filter(s => s.status !== 'success') || [];

  const stats = [
    { label: '평균 상관관계', value: (correlation_stats?.average * 100)?.toFixed(2) + '%' },
    { label: '상관계수 중앙값', value: (correlation_stats?.median * 100)?.toFixed(2) + '%' },
    { label: '상관계수 표준편차', value: (correlation_stats?.std * 100)?.toFixed(2) + '%' },
    { label: '최소 상관관계', value: (correlation_stats?.min * 100)?.toFixed(2) + '%' },
    { label: '최대 상관관계', value: (correlation_stats?.max * 100)?.toFixed(2) + '%' },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 왼쪽: 분석 기간 및 종목 수 */}
        <div className="bg-panel-darker p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-400" />
            분석 기간
          </h3>
          <div className="space-y-2 text-sm">
            <p><strong>시작일:</strong> {period?.start}</p>
            <p><strong>종료일:</strong> {period?.end}</p>
            <p><strong>총 거래일:</strong> {period?.trading_days}일</p>
            <p className="mt-2 pt-2 border-t border-slate-700">
              <strong>분석된 종목 수:</strong> {stocks_analyzed}개
            </p>
          </div>
        </div>

        {/* 오른쪽: 상관관계 통계 */}
        <div className="bg-panel-darker p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart2 className="w-5 h-5 mr-2 text-purple-400" />
            상관관계 통계
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {stats.map(stat => (
              <div key={stat.label} className="flex justify-between">
                <span>{stat.label}:</span>
                <span className="font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ 2. 실패한 종목이 있을 경우에만 이 블록을 보여줍니다. */}
      {failed_stocks.length > 0 && (
        <div className="mt-6 bg-yellow-900/30 border border-yellow-700 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-yellow-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            데이터 수집 실패 ({failed_stocks.length}개)
          </h3>
          <p className="text-sm text-yellow-300 mb-4">
            아래 종목들은 데이터 수집에 실패하여 분석에서 제외되었습니다.
          </p>
          <div className="space-y-3 text-sm max-h-48 overflow-y-auto pr-2">
            {failed_stocks.map(stock => (
              <div key={stock.ticker} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">{stock.name} ({stock.ticker})</p>
                  <p className="text-slate-400 text-xs mt-1">사유: {stock.error || '알 수 없는 오류'}</p>
                </div>
                <span className="text-xs font-mono bg-red-900 text-red-300 px-2 py-1 rounded-md">
                  실패
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}