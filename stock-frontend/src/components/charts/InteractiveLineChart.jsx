import React, { useMemo, useRef, useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";

/**
 * InteractiveLineChart
 * - 사용처: 정규화 주가, 누적 수익률, 전략 비교 등 일반 라인 시리즈
 * - 데이터 형식: { x: string[], series: [{ name: string, values: number[] }] }
 * - props:
 *    - height?: number (default 560)
 *    - dark?: boolean
 *    - enableZoom?: boolean (슬라이더/인사이드 줌 표시)
 *    - chartRefCb?: (echartsInstance) => void
 * - 상단 우측(범례 스크롤 화살표 옆)에 "일괄 선택" 버튼(토글: 전체 선택/해제)
 */
export default function InteractiveLineChart({
  data,
  height = 560,
  dark = false,
  enableZoom = false,
  chartRefCb,
}) {
  const fg = dark ? "#e5e7eb" : "#111827";
  const axis = dark ? "#9ca3af" : "#6b7280";
  const gridLine = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const tooltipBg = dark ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)";

  const hoverSeriesNameRef = useRef(null);
  const lineChartEvents = useMemo(() => ({
    mouseover: (e) => { if (e && e.seriesName) hoverSeriesNameRef.current = e.seriesName; },
    globalout: () => { hoverSeriesNameRef.current = null; }
  }), []);

  // 차트 인스턴스 & 토글 상태
  const instRef = useRef(null);
  const toggleRef = useRef(false); // false: 다음 클릭은 "전체 선택", true: 다음 클릭은 "전체 해제"

  // 버튼 hover/active 시각 피드백
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  // 데이터 바뀌면 토글 초기화(항상 전체 선택부터 시작)
  useEffect(() => {
    toggleRef.current = false;
  }, [data?.series?.length]);

  const prepared = useMemo(() => {
    if (!data || !Array.isArray(data.x) || !Array.isArray(data.series)) {
      return { x: [], series: [] };
    }
    const x = data.x;
    const series = data.series
      .filter((s) => Array.isArray(s.values) && s.values.length)
      .map((s) => ({ name: s.name || "Series", values: s.values }));
    return { x, series };
  }, [data]);

  const option = useMemo(() => {
    const echSeries = prepared.series.map((s) => ({
      name: s.name,
      type: "line",
      data: s.values,
      symbol: "circle",
      showSymbol: false,
      smooth: true,
      lineStyle: { width: 2 },
      // 색상은 ECharts 기본 팔레트 사용(테마 일관성 유지)
    }));

    const zoomInside = enableZoom ? [{ type: "inside", xAxisIndex: 0 }] : [];
    const zoomSlider = enableZoom
      ? [
          {
            type: "slider",
            xAxisIndex: 0,
            height: 8,
            bottom: 8,
            showDetail: false,
            brushSelect: false,
            handleSize: 10,
            handleStyle: { borderWidth: 0, shadowBlur: 0 },
            borderColor: "transparent",
            fillerColor: "rgba(125,125,125,0.25)",
            backgroundColor: "rgba(125,125,125,0.12)",
          },
        ]
      : [];

    return {
      backgroundColor: "transparent",
      grid: { top: 48, right: 24, bottom: enableZoom ? 60 : 40, left: 60 },
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        textStyle: { color: fg },
        axisPointer: { type: "line" },
        formatter: (params) => {
          const items = Array.isArray(params) ? params : [params];
          const x = items[0]?.axisValueLabel ?? "";
          const limit = 30;
      
          const fmt = (v) => {
            const raw = Array.isArray(v) ? v?.[1] : v;
            const n = Number(raw);
            return Number.isFinite(n) ? n.toFixed(4).replace(/\.?0+$/, "") : raw;
          };
      
          const bodyArr = items.slice(0, limit)
            .map(p => `${p.marker} ${p.seriesName}: ${fmt(p.data)}`);
          const rest = Math.max(0, items.length - limit);
      
          // 하단 강조 1개(커서가 실제로 가리키는 시리즈)
          const hovered = hoverSeriesNameRef.current;
          let highlight = "";
          if (hovered) {
            const hp = items.find(p => p.seriesName === hovered);
            if (hp) {
              const line = `${hp.marker} <b>${hp.seriesName}: ${fmt(hp.data)}</b>`;
              highlight = `<div style="margin-top:6px;border-top:1px solid rgba(128,128,128,.25);padding-top:6px;">${line}</div>`;
            }
          }
      
          const head = `${x}<br/>${bodyArr.join("<br/>")}`;
          const tail = rest > 0 ? `<br/>…외 ${rest}개` : "";
          return head + tail + highlight;
        },
      },              
      legend: {
        type: "scroll",
        top: 8,
        left: "10%",
        width: "80%",
        pageFormatter: "{current}/{total}",
        pageButtonItemGap: 6,
        textStyle: { color: fg },
        icon: "roundRect",
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: "category",
        data: prepared.x,
        axisLabel: { color: axis, showMinLabel: true, showMaxLabel: true },
        axisLine: { lineStyle: { color: gridLine } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: axis,
          formatter: (v) => {
            const n = Number(v);
            return isFinite(n) ? n.toFixed(4).replace(/\.?0+$/, "") : v;
          },
        },
        nameTextStyle: { color: axis },
        splitLine: { lineStyle: { color: gridLine } },
      },      
      series: echSeries,
      dataZoom: [...zoomInside, ...zoomSlider],
      textStyle: { color: fg },
    };
  }, [prepared, axis, fg, gridLine, tooltipBg, enableZoom]);

  // 단일 버튼(일괄 선택): 클릭 시 전체 선택 ↔ 전체 해제 토글
  const bulkToggle = () => {
    const c = instRef.current;
    if (!c) return;
    const names = (prepared.series || []).map((s) => s.name).filter(Boolean);

    if (!toggleRef.current) {
      c.dispatchAction({ type: "legendAllSelect" });
    } else {
      names.forEach((n) => c.dispatchAction({ type: "legendUnSelect", name: n }));
    }
    toggleRef.current = !toggleRef.current;
  };

  // 버튼 스타일 (위/아래 여백 확대 + 눌림/호버 피드백)
  const tinyBtnBase = {
    fontSize: 12.5,
    lineHeight: 1.15,
    padding: "3px 12px", // ⬅ 위·아래 여백 포함
    borderRadius: 999,
    cursor: "pointer",
    userSelect: "none",
    transition:
      "background 140ms ease, border-color 140ms ease, box-shadow 120ms ease, transform 60ms ease",
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

  if (!prepared.series.length) {
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
    <div style={{ width: "min(96vw, 1200px)", height, position: "relative" }}>
      {/* 범례 스크롤 화살표 바로 옆. (현재 프로젝트에서 맞춘 기준) */}
      <div style={{ position: "absolute", top: 7.5, right: "calc(5% - 34px)", zIndex: 5 }}>
        <button
          onClick={bulkToggle}
          style={tinyBtnStyle}
          title="일괄 선택"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => {
            setHover(false);
            setActive(false);
          }}
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
        onChartReady={(inst) => {
          instRef.current = inst;
          chartRefCb?.(inst);
        }}
        onEvents={lineChartEvents}
      />
    </div>
  );
}
