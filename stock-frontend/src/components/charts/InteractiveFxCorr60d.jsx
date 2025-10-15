import React from "react";
import ReactECharts from "echarts-for-react";

/**
 * data 형식:
 * { x: string[], series: [{ name: string, values: number[] }], yAxis?: [{ name: string }] }
 */
export default function InteractiveFxCorr60d({ data, height = 560, dark = false }) {
  const fg = dark ? "#e5e7eb" : "#111827";
  const axis = dark ? "#6b7280" : "#9ca3af";
  const gridLine = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const tooltipBg = dark ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)";
  const tooltipBd = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      confine: true,
      backgroundColor: tooltipBg,
      borderColor: tooltipBd,
      borderWidth: 1,
      formatter: (params) => {
        const fmt = (v) => {
          const n = Number(v);
          if (!isFinite(n)) return v;
          return n.toFixed(4).replace(/\.?0+$/, "");
        };
        if (!Array.isArray(params)) return "";
        const x = params[0]?.axisValueLabel ?? "";
        const lines = [x];
        for (const p of params) {
          lines.push(`${p.marker} ${p.seriesName}: ${fmt(p.data)}`);
        }
        return lines.join("<br/>");
      },
    },    
    legend: { show: false, textStyle: { color: fg } },
    grid: { left: 48, right: 24, top: 36, bottom: 40 },

    xAxis: {
      type: "category",
      data: data?.x || [],
      boundaryGap: false,
      axisLabel: { color: fg },
      axisLine: { lineStyle: { color: axis } },
      axisTick: { lineStyle: { color: axis } },
    },

    yAxis: {
      type: "value",
      min: -1,
      max: 1,
      interval: 0.5,
      name: (data?.yAxis?.[0]?.name || "상관계수(60일 롤링)"),
      axisLabel: {
        color: fg,
        formatter: (v) => {
          const n = Number(v);
          return isFinite(n) ? n.toFixed(4).replace(/\.?0+$/, "") : v;
        },
      },      
      axisLine: { show: false },
      splitLine: { lineStyle: { color: gridLine } },
      nameTextStyle: { color: fg },
    },

    dataZoom: [{ type: "inside" }, { type: "slider" }],

    series: [
      {
        name: data?.series?.[0]?.name || "USD/KRW vs 시장 상관 (60D)",
        type: "line",
        showSymbol: false,
        smooth: false,
        connectNulls: false,          // 초기 윈도우 구간 NaN 연결 금지
        sampling: "lttb",             // 많은 포인트에서 왜곡 최소화
        data: data?.series?.[0]?.values || [],
        markLine: {
          symbol: "none",
          lineStyle: { type: "dashed" },
          data: [{ yAxis: 0 }],       // 0 상관 기준선
          emphasis: { disabled: true },
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ width: "min(94vw, 1200px)", height }}
      notMerge={true}
    />
  );
}
