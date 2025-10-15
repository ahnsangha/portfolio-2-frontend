/* // components/tabs/PerformanceTab.jsx
import { TrendingUp, Layers } from 'lucide-react';

export default function PerformanceTab({ data }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-primary mb-6 flex items-center space-x-3">
          <TrendingUp className="w-7 h-7 text-success" />
          <span>개별 종목 성과</span>
        </h3>
        <div className="overflow-x-auto rounded-xl shadow-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-gradient">
                <th className="px-6 py-4 text-left font-semibold text-secondary">종목</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">수익률</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">변동성</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">샤프비율</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">최대낙폭</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">총 수익률</th>
              </tr>
            </thead>
            <tbody>
              {data.individual_stocks.map((stock, i) => (
                <tr key={i} className="bg-panel hover:bg-panel-dark transition-colors border-b border-panel">
                  <td className="px-6 py-4 font-medium text-primary">{stock.name}</td>
                  <td className="px-6 py-4 text-right font-mono text-success">{stock.annual_return.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right font-mono text-warning">{stock.annual_volatility.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right font-mono text-info">{stock.sharpe_ratio.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-mono text-error">{stock.max_drawdown.toFixed(2)}%</td>
                  <td className={`px-6 py-4 text-right font-mono ${stock.total_return >= 0 ? 'text-success' : 'text-error'}`}>
                    {stock.total_return.toFixed(2)}
                  %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-primary mb-6 flex items-center space-x-3">
          <Layers className="w-7 h-7 text-purple-themed" />
          <span>포트폴리오 전략 성과</span>
        </h3>
        <div className="overflow-x-auto rounded-xl shadow-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-gradient">
                <th className="px-6 py-4 text-left font-semibold text-secondary">전략</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">수익률</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">변동성</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">샤프비율</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">최대낙폭</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">최종 가치</th>
              </tr>
            </thead>
            <tbody>
              {data.portfolio_strategies.map((strategy, i) => (
                <tr key={i} className="bg-panel hover:bg-panel-dark transition-colors border-b border-panel">
                  <td className="px-6 py-4 font-medium text-primary">{strategy.strategy}</td>
                  <td className="px-6 py-4 text-right font-mono text-success">{strategy.annual_return.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right font-mono text-warning">{strategy.annual_volatility.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right font-mono text-info">{strategy.sharpe_ratio.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-mono text-error">{strategy.max_drawdown.toFixed(2)}%</td>
                  <td className={`px-6 py-4 text-right font-mono ${strategy.final_value >= 0 ? 'text-success' : 'text-error'}`}>
                  {strategy.final_value.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} */

// components/tabs/PerformanceTab.jsx
import { useState, useMemo } from 'react';
import { TrendingUp, Layers, Search, ArrowUp, ArrowDown } from 'lucide-react';

/** ----- 숫자 포맷 유틸 ----- */
const toNum = (v) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const fmt = (v, digits = 2) => {
  const n = toNum(v);
  return n === null ? '-' : n.toFixed(digits);
};
const fmtPct = (v, digits = 2) => {
  const n = toNum(v);
  return n === null ? '-' : `${n.toFixed(digits)}%`;
};
const signClass = (v, pos = 'text-success', neg = 'text-error', zeroOrNull = 'text-secondary') => {
  const n = toNum(v);
  if (n === null) return zeroOrNull;
  return n >= 0 ? pos : neg;
};

export default function PerformanceTab({ data }) {
  const stocks = Array.isArray(data?.individual_stocks) ? data.individual_stocks : [];
  const strategies = Array.isArray(data?.portfolio_strategies) ? data.portfolio_strategies : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'descending' }); // 초기 방향을 내림차순으로 설정

  const requestSort = (key) => {
    let direction = 'descending';

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'descending') {
        direction = 'ascending';
      } else {
        setSortConfig({ key: null, direction: 'descending' }); // 정렬 해제 후 다음 클릭을 위해 내림차순으로 초기화
        return;
      }
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'descending' ? <ArrowDown className="w-4 h-4 ml-2 inline" /> : <ArrowUp className="w-4 h-4 ml-2 inline" />;
  };

  const sortedStocks = useMemo(() => {
    if (sortConfig.key === null) {
      return [...stocks];
    }

    let sortableStocks = [...stocks];
    sortableStocks.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        const aNum = toNum(aValue);
        const bNum = toNum(bValue);
        if (aNum === null || bNum === null) return 0;
        return sortConfig.direction === 'ascending' ? aNum - bNum : bNum - aNum;
      }
    });
    return sortableStocks;
  }, [stocks, sortConfig]);

  const filteredAndSortedStocks = sortedStocks.filter(stock =>
    stock?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-primary mb-6 flex items-center space-x-3">
          <TrendingUp className="w-7 h-7 text-success" />
          <span>개별 종목 성과</span>
        </h3>
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="종목명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-panel-dark text-primary rounded-xl border border-panel-dark focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          <Search className="w-5 h-5 text-secondary absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
        <div className="overflow-x-auto rounded-xl shadow-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-gradient">
                <th className="px-6 py-4 text-left font-semibold text-secondary cursor-pointer hover:bg-panel-dark" onClick={() => requestSort('name')}>
                  종목 {getSortIcon('name')}
                </th>
                <th className="px-6 py-4 text-right font-semibold text-secondary cursor-pointer hover:bg-panel-dark" onClick={() => requestSort('annual_return')}>
                  수익률 {getSortIcon('annual_return')}
                </th>
                <th className="px-6 py-4 text-right font-semibold text-secondary cursor-pointer hover:bg-panel-dark" onClick={() => requestSort('annual_volatility')}>
                  변동성 {getSortIcon('annual_volatility')}
                </th>
                <th className="px-6 py-4 text-right font-semibold text-secondary cursor-pointer hover:bg-panel-dark" onClick={() => requestSort('sharpe_ratio')}>
                  샤프비율 {getSortIcon('sharpe_ratio')}
                </th>
                <th className="px-6 py-4 text-right font-semibold text-secondary cursor-pointer hover:bg-panel-dark" onClick={() => requestSort('max_drawdown')}>
                  최대낙폭 {getSortIcon('max_drawdown')}
                </th>
                <th className="px-6 py-4 text-right font-semibold text-secondary cursor-pointer hover:bg-panel-dark" onClick={() => requestSort('total_return')}>
                  총 수익률 {getSortIcon('total_return')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedStocks.map((stock, i) => (
                <tr key={i} className="bg-panel hover:bg-panel-dark transition-colors border-b border-panel">
                  <td className="px-6 py-4 font-medium text-primary">{stock?.name ?? '-'}</td>
                  <td
                    className={`px-6 py-4 text-right font-mono ${signClass(
                      stock?.annual_return,
                      'text-success',
                      'text-error'
                    )}`}
                  >
                    {fmtPct(stock?.annual_return)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-warning">{fmtPct(stock?.annual_volatility)}</td>
                  <td className="px-6 py-4 text-right font-mono text-info">{fmt(stock?.sharpe_ratio)}</td>
                  <td className="px-6 py-4 text-right font-mono text-error">{fmtPct(stock?.max_drawdown)}</td>
                  <td
                    className={`px-6 py-4 text-right font-mono ${signClass(
                      stock?.total_return,
                      'text-success',
                      'text-error'
                    )}`}
                  >
                    {fmt(stock?.total_return)}%
                  </td>
                </tr>
              ))}
              {filteredAndSortedStocks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-secondary">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-primary mb-6 flex items-center space-x-3">
          <Layers className="w-7 h-7 text-purple-themed" />
          <span>포트폴리오 전략 성과</span>
        </h3>
        <div className="overflow-x-auto rounded-xl shadow-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-gradient">
                <th className="px-6 py-4 text-left font-semibold text-secondary">전략</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">수익률</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">변동성</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">샤프비율</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">최대낙폭</th>
                <th className="px-6 py-4 text-right font-semibold text-secondary">최종 가치</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy, i) => (
                <tr key={i} className="bg-panel hover:bg-panel-dark transition-colors border-b border-panel">
                  <td className="px-6 py-4 font-medium text-primary">{strategy?.strategy ?? '-'}</td>
                  <td className="px-6 py-4 text-right font-mono text-success">{fmtPct(strategy?.annual_return)}</td>
                  <td className="px-6 py-4 text-right font-mono text-warning">{fmtPct(strategy?.annual_volatility)}</td>
                  <td className="px-6 py-4 text-right font-mono text-info">{fmt(strategy?.sharpe_ratio)}</td>
                  <td className="px-6 py-4 text-right font-mono text-error">{fmtPct(strategy?.max_drawdown)}</td>
                  <td
                    className={`px-6 py-4 text-right font-mono ${signClass(
                      strategy?.final_value,
                      'text-success',
                      'text-error'
                    )}`}
                  >
                    {fmt(strategy?.final_value)}
                  </td>
                </tr>
              ))}
              {strategies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-secondary">
                    표시할 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}