// ahnsangha/portfolio-2-frontend/portfolio-2-frontend-217b54b6ff2088b6ce16c4a81a977a19a83b4f79/stock-frontend/src/components/tabs/SummaryTab.jsx

import { BarChart2, Calendar, AlertTriangle } from 'lucide-react';

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
        
        {/* 카드 1: 분석 기간 */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg transition-all hover:border-slate-300 dark:hover:border-slate-600">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold flex items-center text-slate-800 dark:text-slate-100">
              <Calendar className="w-5 h-5 mr-3 text-blue-500 dark:text-blue-400" />
              분석 기간
            </h3>
          </div>
          <div className="p-5 space-y-3 text-sm text-slate-700 dark:text-slate-50">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">시작일:</span>
              <span className="font-mono">{period?.start}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">종료일:</span>
              <span className="font-mono">{period?.end}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">총 거래일:</span>
              <span>{period?.trading_days}일</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700/50">
              <span className="text-slate-600 dark:text-slate-300 font-semibold">분석된 종목 수:</span>
              <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{stocks_analyzed}개</span>
            </div>
          </div>
        </div>

        {/* 카드 2: 상관관계 통계 */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg transition-all hover:border-slate-300 dark:hover:border-slate-600">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold flex items-center text-slate-800 dark:text-slate-100">
              <BarChart2 className="w-5 h-5 mr-3 text-purple-500 dark:text-purple-400" />
              상관관계 통계
            </h3>
          </div>
          <div className="p-3 text-sm">
            <ul className="space-y-1">
              {stats.map(stat => (
                <li key={stat.label} className="flex justify-between items-center px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                  <span className="text-slate-500 dark:text-slate-400">{stat.label}:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-50">{stat.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 데이터 수집 실패 경고창 (기존 디자인 유지) */}
      {failed_stocks.length > 0 && (
        <div className="mt-6 bg-orange-950/40 border border-orange-800/60 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-2 flex items-center text-orange-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            데이터 수집 실패 ({failed_stocks.length}개)
          </h3>
          <p className="text-sm text-orange-400/80 mb-4">
            아래 종목들은 데이터가 부족하거나 찾을 수 없어 분석에서 제외되었습니다.
          </p>
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