// stock-frontend/src/components/charts/InteractiveSharpeBar.jsx
import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

/**
 * InteractiveSharpeBar
 * - timeseries?kind=normalized 응답을 받아 종목별 샤프비율을 계산해 막대 차트로 표시
 *
 * props:
 *  - data: { x: string[], series: [{ name: string, values: number[] }] }
 *  - height?: number = 540
 *  - dark?: boolean = false
 *  - maxItems?: number = 10        // 샤프 내림차순 상위 N개만 표시
 */
export default function InteractiveSharpeBar({
  data,
  height = 540,
  dark = false,
  maxItems = Infinity,
}) {
  const fg = dark ? "#e5e7eb" : "#111827";
  const axis = dark ? "#9ca3af" : "#6b7280";
  const gridLine = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const tooltipBg = dark ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)";

  // 색상: 양수 파랑, 음수 빨강 (다크테마에 어울리는 채도)
  const POS_COLOR = "#60a5fa"; // tailwind sky-400 느낌
  const NEG_COLOR = "#f87171"; // tailwind red-400 느낌

  const { names, sharpes, stats } = useMemo(() => {
    if (!data || !Array.isArray(data.series) || data.series.length === 0) {
      return { names: [], sharpes: [], stats: [] };
    }

    const ANNUAL = Math.sqrt(252);
    const rows = data.series.map((s) => {
      const v = Array.isArray(s.values) ? s.values : [];
      const rets = [];
      for (let i = 1; i < v.length; i++) {
        const prev = v[i - 1];
        const cur = v[i];
        if (prev !== 0 && isFinite(prev) && isFinite(cur)) {
          const r = cur / prev - 1; // 일간 수익률(소수)
          if (isFinite(r)) rets.push(r);
        }
      }
      const n = rets.length || 1;
      const mean = rets.reduce((a, b) => a + b, 0) / n;
      const variance = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
      const std = Math.sqrt(variance) || 1e-12;
      const sharpe = (mean / std) * ANNUAL; // 무위험수익률 0 가정

      return {
        name: s.name || "Series",
        sharpe,
        meanPct: mean * 100,
        stdPct: std * 100,
        n,
      };
    });

    // 샤프 내림차순 정렬 → 상위 maxItems만 사용
    rows.sort((a, b) => b.sharpe - a.sharpe);
    const top = rows.slice(0, Math.max(1, Math.min(maxItems, rows.length)));

    return {
      names: top.map((r) => r.name),
      sharpes: top.map((r) =>
        Number.isFinite(r.sharpe) ? +r.sharpe.toFixed(2) : 0
      ),
      stats: top,
    };
  }, [data, maxItems]);

  const shouldRotate = names.length > 8; // 9개 이상이면 라벨 회전

  const option = {
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 16,
        bottom: 8,
        brushSelect: false,
        start: 0,   // 기본 표시 구간(%) - 필요시 조정
        end: 100
      },
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseWheel: false,
        moveOnMouseMove: true
      }
    ],    
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: tooltipBg,
      textStyle: { color: fg },
      formatter: (params) => {
        const p = params?.[0];
        if (!p) return "";
        const r = stats[p.dataIndex];
        if (!r) return "";
        return [
          `<b>${r.name}</b>`,
          `샤프비율: <b>${r.sharpe.toFixed(2)}</b>`,
          `평균 일수익률: ${r.meanPct.toFixed(3)}%`,
          `일변동성: ${r.stdPct.toFixed(3)}%`,
          `관측일수: ${r.n}`,
        ].join("<br/>");
      },
    },
    grid: { top: 40, right: 18, bottom: shouldRotate ? 88 : 56, left: 56 },
    xAxis: {
      type: "category",
      data: names,
      axisLabel: {
        color: axis,
        // 모든 라벨 표시 + 겹침 허용 + 회전
        interval: 0,
        hideOverlap: false,
        rotate: shouldRotate ? 35 : 0,
        margin: 12,
        showMinLabel: true,
        showMaxLabel: true,
        formatter: (val) => (val.length > 12 ? val.slice(0, 12) + "…" : val),
      },
      axisLine: { lineStyle: { color: gridLine } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "샤프비율",
      nameTextStyle: { color: axis },
      axisLabel: { color: axis },
      splitLine: { lineStyle: { color: gridLine } },
    },
    series: [
      {
        name: "Sharpe",
        type: "bar",
        data: sharpes,
        // ✅ 두께 업: barWidth로 명시, 둥근 모서리
        barWidth: 36,
        itemStyle: {
          color: (p) => (p.value >= 0 ? POS_COLOR : NEG_COLOR), // ✅ 양수 파랑, 음수 빨강
        },
        emphasis: { focus: "series" },
      },
    ],
    textStyle: { color: fg },
  };

  if (!names.length) {
    return (
      <div
        style={{
          width: "min(96vw, 1200px)",
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
        }}
      >
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
