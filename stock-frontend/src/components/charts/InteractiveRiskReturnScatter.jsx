import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

/**
 * InteractiveRiskReturnScatter
 * - timeseries?kind=normalized 응답으로 각 종목의
 *   연율 수익률(%) vs 연율 변동성(%) 산점도 + 샤프 계산/툴팁 제공
 *
 * props:
 *  - data: { x: string[], series: [{ name: string, values: number[] }] }
 *  - height?: number = 560
 *  - dark?: boolean = false
 */
export default function InteractiveRiskReturnScatter({
  data,
  height = 560,
  dark = false,
}) {
  const fg = dark ? "#e5e7eb" : "#111827";
  const axis = dark ? "#9ca3af" : "#6b7280";
  const gridLine = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const tooltipBg = dark ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)";

  const POS = "#60a5fa"; // 양수(샤프 >= 0) 파랑
  const NEG = "#f87171"; // 음수(샤프 < 0) 빨강

  // 데이터 가공
  const rows = useMemo(() => {
    if (!data || !Array.isArray(data.series)) return [];
    const ANNUAL = Math.sqrt(252);
    const ANN_DAYS = 252;

    return data.series.map((s) => {
      const v = Array.isArray(s.values) ? s.values : [];
      const rets = [];
      for (let i = 1; i < v.length; i++) {
        const prev = v[i - 1], cur = v[i];
        if (prev !== 0 && isFinite(prev) && isFinite(cur)) {
          const r = cur / prev - 1;
          if (isFinite(r)) rets.push(r);
        }
      }
      const n = rets.length || 1;
      const mean = rets.reduce((a, b) => a + b, 0) / n;
      const variance = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
      const std = Math.sqrt(variance) || 1e-12;

      const annRet = mean * ANN_DAYS * 100;        // 연율 수익률 %
      const annVol = std * ANNUAL * 100;           // 연율 변동성 %
      const sharpe = (mean / std) * ANNUAL;        // Rf=0

      return {
        name: s.name || "Series",
        annRet,
        annVol,
        sharpe,
      };
    });
  }, [data]);

  // 산점도 시리즈 데이터 (x, y, size, color)
  const scatterData = rows.map((r) => ({
    value: [Number(r.annVol.toFixed(2)), Number(r.annRet.toFixed(2))],
    name: r.name,
    sharpe: r.sharpe,
    itemStyle: { color: r.sharpe >= 0 ? POS : NEG },
    symbolSize: Math.min(22, Math.max(10, Math.abs(r.sharpe) * 6 + 8)),
  }));  

  const option = {
    backgroundColor: "transparent",
    grid: { top: 48, right: 24, bottom: 60, left: 64 },
    tooltip: {
      trigger: "item",
      backgroundColor: tooltipBg,
      textStyle: { color: fg },
      formatter: (p) => {
        const [vol, ret] = p.value || [];
        const r = rows[p.dataIndex];
        return [
          `<b>${r.name}</b>`,
          `연율 수익률: ${ret?.toFixed(2)}%`,
          `연율 변동성: ${vol?.toFixed(2)}%`,
          `샤프비율: <b>${r.sharpe.toFixed(2)}</b>`,
        ].join("<br/>");
      },
    },
    xAxis: {
      type: "value",
      name: "연율 변동성(%)",
      nameTextStyle: { color: axis },
      axisLabel: { color: axis },
      splitLine: { lineStyle: { color: gridLine } },
      min: (val) => Math.max(0, val.min - 2),
    },
    yAxis: {
      type: "value",
      name: "연율 수익률(%)",
      nameTextStyle: { color: axis },
      axisLabel: { color: axis },
      splitLine: { lineStyle: { color: gridLine } },
    },
    series: [
        {
          type: "scatter",
          data: scatterData,
          label: {
            show: true,
            position: "top",
            distance: 4,
            color: fg,
            fontSize: 11,
            formatter: (p) => {
              const name = rows[p.dataIndex].name || "";
              return name.length > 10 ? name.slice(0, 10) + "…" : name;
            },
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          emphasis: {
            focus: "series",
            label: {
              show: true,
              formatter: (p) => rows[p.dataIndex].name,
              color: fg,
              fontSize: 12,
              backgroundColor: "rgba(0,0,0,0.25)",
              padding: [2, 6],
              borderRadius: 4,
            },
          },
        },
      ],          
    // 드래그줌/휠줌
    dataZoom: [
        { type: "inside", xAxisIndex: 0 },
        { type: "inside", yAxisIndex: 0 },
        {
          type: "slider",
          xAxisIndex: 0,
          height: 8,          // 더 얇게
          bottom: 8,
          showDetail: false,  // 숫자 팝업 숨김
          brushSelect: false,
          handleSize: 10,
          handleStyle: { borderWidth: 0, shadowBlur: 0 },
          borderColor: "transparent",
          fillerColor: "rgba(125,125,125,0.25)",
          backgroundColor: "rgba(125,125,125,0.12)",
        },
        {
          type: "slider",
          yAxisIndex: 0,
          width: 8,           // 더 얇게
          right: 6,
          showDetail: false,
          brushSelect: false,
          handleSize: 10,
          handleStyle: { borderWidth: 0, shadowBlur: 0 },
          borderColor: "transparent",
          fillerColor: "rgba(125,125,125,0.25)",
          backgroundColor: "rgba(125,125,125,0.12)",
        },
      ],      
    textStyle: { color: fg },
  };

  if (!rows.length) {
    return (
      <div style={{
        width: "min(96vw, 1200px)",
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.7
      }}>
        표시할 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: "min(96vw, 1200px)", height }}
      notMerge={true}
    />
  );
}
