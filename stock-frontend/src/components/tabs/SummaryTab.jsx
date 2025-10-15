// ahnsangha/portfolio-2-frontend/portfolio-2-frontend-217b54b6ff2088b6ce16c4a81a977a19a83b4f79/stock-frontend/src/components/tabs/SummaryTab.jsx

import { BarChart2, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SummaryTab({ data }) {
  if (!data) return null;

  const { period, correlation_stats, stocks_analyzed, collection_status } = data;
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

      {/* ✅ --- 가독성 개선을 위해 이 블록의 CSS를 수정했습니다 --- ✅ */}
      {failed_stocks.length > 0 && (
        <div className="mt-6 bg-orange-950/40 border border-orange-800/60 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-2 flex items-center text-orange-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            데이터 수집 실패 ({failed_stocks.length}개)
          </h3>
          <p className="text-sm text-orange-400/80 mb-4">
            아래 종목들은 데이터가 부족하거나 찾을 수 없어 분석에서 제외되었습니다.
          </p>
          {/* 목록이 길어질 경우를 대비해 스크롤바를 추가하고, 디자인을 개선합니다. */}
          <div className="space-y-2 text-sm max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
            {failed_stocks.map(stock => (
              <div key={stock.ticker} className="bg-orange-900/30 hover:bg-orange-900/60 p-3 rounded-lg transition-colors">
                <div className="flex justify-between items-center">
                    <p className="font-semibold text-white">{stock.name} ({stock.ticker})</p>
                    <span className="text-xs font-mono bg-red-900/70 text-red-300 px-2 py-1 rounded-md">
                      제외됨
                    </span>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  사유: {stock.error || '알 수 없는 오류'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}