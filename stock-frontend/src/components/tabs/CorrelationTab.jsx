// components/tabs/CorrelationTab.jsx
import { Layers } from 'lucide-react';

/* ──────────────────────────────────────────────
   상관계수 통일 팔레트 (라이트/다크 동일)
   -1(강한 음) → 0(중립) → +1(강한 양)
   NEG(#EF9A9A)  MID(#94A3B8)  POS(#22D3EE)
────────────────────────────────────────────── */
const NEG = [239, 154, 154]; // #EF9A9A
const MID = [226, 238, 253]; // #e2eefd
const POS = [127, 184, 249]; // #7fb8f9

const mix = (a, b, t) => {
  const lerp = (i) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${lerp(0)}, ${lerp(1)}, ${lerp(2)})`;
};

const corrColor = (v) => {
  const x = Math.max(-1, Math.min(1, v));
  return x < 0 ? mix(NEG, MID, Math.abs(x)) : mix(MID, POS, x);
};

const textColor = (v) => (Math.abs(v) > 0.55 ? '#ffffff' : '#111827');

export default function CorrelationTab({ data }) {

  const labels = Object.keys(data || {});
  const minWidthPx = Math.max(1200, (labels.length + 1) * 110);  

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-primary mb-4 flex items-center space-x-3">
        <Layers className="w-7 h-7 text-purple-themed" />
        <span>상관계수 매트릭스</span>
      </h3>

      <div className="corr-scroll-container rounded-xl shadow-2xl">
        <table className="text-xs corr-table" style={{ minWidth: `${minWidthPx}px`, tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-20">
            <tr className="table-header-gradient">
              <th className="corr-first-col px-3 py-3 text-left font-semibold text-primary bg-[var(--color-table-header-end)] whitespace-nowrap"></th>
              {labels.map((col, i) => (
                <th
                  key={i}
                  className="px-3 py-3 text-center font-semibold text-primary min-w-[100px] whitespace-nowrap text-xs"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Object.entries(data).map(([rowName, rowVals], i) => (
              <tr key={i} className="bg-panel hover:bg-panel-dark transition-colors border-b border-panel">
                <td className="corr-first-col px-3 py-3 text-left font-medium text-primary bg-panel-dark whitespace-nowrap">
                  {rowName}
                </td>

                {Object.values(rowVals).map((val, j) => {
                  const bg = corrColor(val);
                  const fg = textColor(val);
                  return (
                    <td
                      key={j}
                      className="px-3 py-3 text-center font-mono"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      {val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 해석 범례(팔레트와 일치) */}
      <div className="mt-6 p-4 bg-panel rounded-lg">
        <h4 className="text-sm font-semibold text-primary mb-2">상관계수 해석</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: `rgb(${POS.join(',')})` }} />
            <span className="text-primary">강한 양의 상관관계 (0.7 ~ 1.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: mix(MID, POS, 0.5) }} />
            <span className="text-primary">약한 양의 상관관계 (0.3 ~ 0.7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: `rgb(${MID.join(',')})` }} />
            <span className="text-primary">상관관계 없음 (-0.3 ~ 0.3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: mix(NEG, MID, 0.5) }} />
            <span className="text-primary">음의 상관관계 (-1.0 ~ -0.3)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
