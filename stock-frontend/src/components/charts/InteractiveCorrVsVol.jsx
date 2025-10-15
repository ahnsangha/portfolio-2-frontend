import React from "react";
import ReactECharts from "echarts-for-react";

export default function InteractiveCorrVsVol({ data, height = 560, dark = false }) {
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
    grid: { left: 48, right: 56, top: 40, bottom: 36 },

    xAxis: {
      type: "category",
      data: data?.x || [],
      axisLabel: { color: fg },
      axisLine: { lineStyle: { color: axis } },
      axisTick: { lineStyle: { color: axis } },
    },

    yAxis: [
      {
        type: "value",
        name: (data?.yAxis?.[0]?.name || "상관계수"),
        min: -1,
        max: 1,
        interval: 0.5,
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
      {
        type: "value",
        name: (data?.yAxis?.[1]?.name || "변동성(%)"),
        position: "right",
        axisLabel: {
          color: fg,
          formatter: (v) => {
            const n = Number(v);
            return isFinite(n) ? n.toFixed(4).replace(/\.?0+$/, "") : v;
          },
        },        
        axisLine: { show: false },
        splitLine: { show: false },
        nameTextStyle: { color: fg },
      },
    ],

    dataZoom: [{ type: "inside" }, { type: "slider" }],

    series: [
      {
        name: data?.series?.[0]?.name || "평균 상관계수",
        type: "line",
        showSymbol: false,
        smooth: false,
        yAxisIndex: 0,
        data: data?.series?.[0]?.values || [],
      },
      {
        name: data?.series?.[1]?.name || "시장 변동성(%)",
        type: "line",
        showSymbol: false,
        smooth: true,
        yAxisIndex: 1,
        data: data?.series?.[1]?.values || [],
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
