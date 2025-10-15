// components/tabs/SummaryTab.jsx
import { BarChart2 } from 'lucide-react';

export default function SummaryTab({ data }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-primary mb-4 flex items-center space-x-3">
        <BarChart2 className="w-7 h-7 text-info" />
        <span>기본 통계</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-panel p-6 rounded-xl border border-panel">
          <h4 className="text-lg font-semibold text-info mb-3">분석 기간</h4>
          <div className="space-y-2 text-primary">
            <p className="flex justify-between">
              <span>시작일:</span>
              <span className="font-mono">{data.period.start}</span>
            </p>
            <p className="flex justify-between">
              <span>종료일:</span>
              <span className="font-mono">{data.period.end}</span>
            </p>
            <p className="flex justify-between">
              <span>거래일수:</span>
              <span className="font-mono">{data.period.trading_days}일</span>
            </p>
          </div>
        </div>
        <div className="bg-panel p-6 rounded-xl border border-panel">
          <h4 className="text-lg font-semibold text-purple-themed mb-3">상관계수 통계</h4>
          <div className="space-y-2 text-primary">
            <p className="flex justify-between">
              <span>평균:</span>
              <span className="font-mono">{data.correlation_stats.average.toFixed(3)}</span>
            </p>
            <p className="flex justify-between">
              <span>최대/최소:</span>
              <span className="font-mono">{data.correlation_stats.max.toFixed(3)} / {data.correlation_stats.min.toFixed(3)}</span>
            </p>
            <p className="flex justify-between">
              <span>표준편차:</span>
              <span className="font-mono">{data.correlation_stats.std.toFixed(3)}</span>
            </p>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-[var(--color-summary-gradient-start)] to-[var(--color-summary-gradient-end)] p-4 rounded-xl text-primary font-semibold text-center shadow-lg">
        <p className="text-center text-lg text-secondry">
          총 <span className="font-bold text-2xl text-primary">{data.stocks_analyzed}</span>개 종목 분석 완료
        </p>
      </div>
    </div>
  );
}