import React from "react";
import ReactECharts from "echarts-for-react";

/**
 * props:
 *  - data: { x: string[], series: [{name, values}], yAxis?: [{name}] }
 *  - height?: number
 *  - dark?: boolean
 */
export default function InteractiveQuarterlyCorrPairs({ data, height = 560, dark = false }) {
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
    
    legend: { type: "scroll", textStyle: { color: fg } },
    grid: { left: 48, right: 18, top: 40, bottom: 36 },

    xAxis: {
        type: "category",
        data: data?.x || [],
        boundaryGap: ['6%', '6%'],
        axisLabel: { color: fg, alignWithLabel: true },
        axisLine: { lineStyle: { color: axis } },
        axisTick: { lineStyle: { color: axis } },
      },      

    yAxis: {
      type: "value",
      min: -1,
      max: 1,
      interval: 0.5,
      name: (data?.yAxis?.[0]?.name || "상관계수(분기)"),
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

    dataZoom: [
        { type: "inside", filterMode: "none", moveOnMouseWheel: true, zoomOnMouseWheel: true },
        { type: "slider", filterMode: "none" }
      ],      

      series: (data?.series || []).map(s => ({
        name: s.name,
        type: "line",
        showSymbol: true,
        showAllSymbol: "auto",
        symbol: "circle",
        symbolSize: 6,
        smooth: false,
        clip: false,
        data: s.values || [],
      })),      
  };

  return (
    <ReactECharts
      option={option}
      style={{ width: "min(94vw, 1200px)", height }}
      notMerge={true}
    />
  );
}
