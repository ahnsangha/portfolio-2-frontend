import React, { useMemo, useRef, useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";

/**
 * InteractiveHistogram
 * - 각 시리즈 일간 수익률(%) 분포를 공통 bin으로 그룹 막대로 표시
 * - 상단 우측(범례 스크롤 화살표 옆)에 "일괄 선택" 버튼(토글: 전체 선택/해제)
 */
export default function InteractiveHistogram({
  data,
  height = 540,
  dark = false,
  bins = 30,
  chartRefCb,
}) {
  const fg = dark ? "#e5e7eb" : "#111827";
  const axis = dark ? "#9ca3af" : "#6b7280";
  const gridLine = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const tooltipBg = dark ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)";

  const instRef = useRef(null);
  const toggleRef = useRef(false);

  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    toggleRef.current = false;
  }, [data?.series?.length]);

  const { categories, seriesDefs } = useMemo(() => {
    if (!data || !Array.isArray(data.series) || data.series.length === 0) {
      return { categories: [], seriesDefs: [] };
    }

    const returnsPerSeries = data.series.map((s) => {
      const v = Array.isArray(s.values) ? s.values : [];
      const arr = [];
      for (let i = 1; i < v.length; i++) {
        const prev = v[i - 1], cur = v[i];
        if (prev !== 0 && isFinite(prev) && isFinite(cur)) {
          const r = ((cur / prev) - 1) * 100;
          if (isFinite(r)) arr.push(r);
        }
      }
      return { name: s.name || "Series", returns: arr };
    });

    const all = returnsPerSeries.flatMap((s) => s.returns);
    if (all.length === 0) return { categories: [], seriesDefs: [] };

    const sorted = [...all].sort((a, b) => a - b);
    const q = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))];

    let minR = q(0.01), maxR = q(0.99);
    if (minR === maxR) { minR -= 1; maxR += 1; }

    const step = (maxR - minR) / bins;
    const categories = new Array(bins).fill(0).map((_, i) => {
      const left = minR + step * i, right = left + step, mid = (left + right) / 2;
      return `${mid.toFixed(2)}%`;
    });

    const seriesDefs = returnsPerSeries.map((s) => {
      const counts = new Array(bins).fill(0);
      for (const r of s.returns) {
        const idx = Math.min(bins - 1, Math.max(0, Math.floor((r - minR) / step)));
        counts[idx] += 1;
      }
      return { name: s.name, type: "bar", data: counts, barMaxWidth: 22, emphasis: { focus: "series" } };
    });

    return { categories, seriesDefs };
  }, [data, bins, dark]);

  const option = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: tooltipBg,
      textStyle: { color: fg },
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];
        const x = items[0]?.axisValueLabel ?? "";
        const limit = 30;
    
        const fmt = (v) => {
          const raw = Array.isArray(v) ? v?.[1] : v;       // [x, y] 형태 대비
          const n = Number(raw);
          return Number.isFinite(n) ? n.toFixed(4).replace(/\.?0+$/, "") : raw;
        };
    
        const body = items
          .slice(0, limit)
          .map((p) => `${p.marker} ${p.seriesName}: ${fmt(p.data)}`)
          .join("<br/>");
    
        const rest = Math.max(0, items.length - limit);
        return rest > 0 ? `${x}<br/>${body}<br/>…외 ${rest}개` : `${x}<br/>${body}`;
      },
    },    
    legend: {
      type: "scroll",
      top: 10,
      left: "10%",
      width: "80%",
      pageFormatter: "{current}/{total}",
      pageButtonItemGap: 6,
      textStyle: { color: fg },
    },
    grid: { top: 48, right: 16, bottom: 52, left: 56 },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { color: axis, fontSize: 11, rotate: categories.length > 24 ? 45 : 0 },
      axisLine: { lineStyle: { color: gridLine } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "개수",
      nameTextStyle: { color: axis },
      axisLabel: { color: axis },
      splitLine: { lineStyle: { color: gridLine } },
    },
    barCategoryGap: "20%",
    barGap: "8%",
    series: seriesDefs,
    textStyle: { color: fg },
  }), [categories, seriesDefs, axis, fg, gridLine, tooltipBg]);

  const bulkToggle = () => {
    const c = instRef.current;
    if (!c) return;
    const names = (seriesDefs || []).map((s) => s.name).filter(Boolean);

    if (!toggleRef.current) {
      c.dispatchAction({ type: "legendAllSelect" });
    } else {
      names.forEach((n) => c.dispatchAction({ type: "legendUnSelect", name: n }));
    }
    toggleRef.current = !toggleRef.current;
  };

  // 기본 스타일 + 상태별 동적 스타일(hover/active)
  const tinyBtnBase = {
    fontSize: 12.5,
    lineHeight: 1.15,
    padding: "3px 12px", // ⬅ 위/아래 여백 늘림
    borderRadius: 999,
    cursor: "pointer",
    userSelect: "none",
    transition: "background 140ms ease, border-color 140ms ease, box-shadow 120ms ease, transform 60ms ease",
  };
  const tinyBtnStyle = {
    ...tinyBtnBase,
    background: active
      ? "var(--seg-active-bg, rgba(56,189,248,0.18))"
      : hover
      ? "var(--seg-hover-bg, rgba(148,163,184,0.15))"
      : "var(--seg-bg, rgba(148,163,184,0.10))",
    color: active ? "var(--seg-active-text, #e6f9ff)" : "var(--seg-text, #cbd5e1)",
    border: active
      ? "1.35px solid var(--seg-active-border, rgba(56,189,248,0.38))"
      : "1.25px solid var(--seg-border, rgba(148,163,184,0.35))",
    boxShadow: active ? "0 0 0 3px rgba(56,189,248,0.15) inset" : "none",
    transform: active ? "translateY(0.5px)" : "none",
  };

  return (
    <div style={{ width: "min(96vw, 1200px)", height, position: "relative" }}>
      {/* 네가 지정한 위치 값 기준 */}
      <div style={{ position: "absolute", top: 7.5, right: "calc(5% - 34px)", zIndex: 5 }}>
        <button
          onClick={bulkToggle}
          style={tinyBtnStyle}
          title="일괄 선택"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => { setHover(false); setActive(false); }}
          onMouseDown={() => setActive(true)}
          onMouseUp={() => setActive(false)}
        >
          일괄 선택
        </button>
      </div>

      <ReactECharts
        option={option}
        style={{ width: "100%", height: "100%" }}
        notMerge={true}
        onChartReady={(inst) => { instRef.current = inst; chartRefCb?.(inst); }}
      />
    </div>
  );
}
