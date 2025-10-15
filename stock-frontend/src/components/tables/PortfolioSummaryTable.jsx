// components/tables/PortfolioSummaryTable.jsx
import React from "react";

function formatCell(value, unit) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (typeof value === "number") {
    if (unit === "%") return `${value.toFixed(1)}%`;
    // 샤프비율 등 소수 2자리로
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return value; // 문자열 그대로
}

export default function PortfolioSummaryTable({ data, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-pulse h-6 w-48 bg-slate-700/50 rounded" />
      </div>
    );
  }
  if (!data || !data.rows?.length) {
    return <div className="text-secondary text-center py-8">표 데이터가 없습니다.</div>;
  }

  const cols = data.columns;
  const rows = data.rows;

  // 숫자 컬럼 판별: unitHints가 있거나, 첫 행 값이 number면 숫자 취급
  const numericCols = new Set(
    cols.filter((c) => data.unitHints?.[c] || typeof rows[0]?.[c] === "number")
  );

  const thBase =
    "bg-emerald-600 text-white text-sm font-semibold px-4 py-3 border-r border-emerald-700/50 last:border-r-0";
  const tdBase =
    "px-4 py-3 text-sm border-t border-slate-700/60 border-r border-slate-700/40 last:border-r-0";
  const tableCls =
    "w-full table-fixed border-collapse rounded-xl overflow-hidden shadow-xl";

  return (
    <div className="overflow-x-auto">
      <table className={tableCls}>
        <thead>
          <tr>
            {cols.map((c, i) => {
              const isNum = numericCols.has(c);
              return (
                <th
                  key={i}
                  className={`${thBase} ${isNum ? "text-right" : "text-left"}`}
                >
                  {c}
                  {data.unitHints?.[c] ? (
                    <span className="text-white/80 text-xs ml-1">
                      ({data.unitHints[c]})
                    </span>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr
              key={ri}
              className={
                ri % 2 === 0 ? "bg-white/[0.03] hover:bg-white/[0.06]" : "hover:bg-white/[0.06]"
              }
            >
              {cols.map((c, ci) => {
                const isNum = numericCols.has(c);
                const unit = data.unitHints?.[c];
                const val = formatCell(r[c], unit);
                // 음수는 살짝 눈에 띄게
                const neg = isNum && typeof r[c] === "number" && r[c] < 0;
                return (
                  <td
                    key={ci}
                    className={`${tdBase} ${
                      isNum ? "text-right tabular-nums pr-5" : "text-left"
                    } ${neg ? "text-red-300" : ""}`}
                  >
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
