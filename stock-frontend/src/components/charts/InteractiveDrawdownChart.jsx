import React, { useMemo, useRef, useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";

export default function InteractiveDrawdownChart({
  data,
  height = 560,
  dark = false,
  chartRefCb,
}) {
  const fg = dark ? "#e5e7eb" : "#111827";
  const axis = dark ? "#9ca3af" : "#6b7280";
  const gridLine = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const tooltipBg = dark ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)";
  const tooltipBd = dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";

  const hoverSeriesNameRef = useRef(null);
  const drawdownEvents = useMemo(() => ({
    mouseover: (e) => { if (e && e.seriesName) hoverSeriesNameRef.current = e.seriesName; },
    globalout: () => { hoverSeriesNameRef.current = null; }
  }), []);

  // 차트 인스턴스 & 버튼 토글 상태
  const instRef = useRef(null);
  const toggleRef = useRef(false); // false: 다음 클릭은 "전체 선택", true: 다음 클릭은 "전체 해제"

  // 버튼 hover/active 시각 피드백 상태
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  // 데이터(시리즈 수) 바뀌면 토글 초기화 → 항상 "전체 선택"부터 시작
  useEffect(() => {
    toggleRef.current = false;
  }, [data?.series?.length]);

  function computeDrawdown(values) {
    const n = values.length;
    const dd = new Array(n).fill(0);
    let runMax = -Infinity;
    const cumMaxIdx = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v > runMax) { runMax = v; cumMaxIdx[i] = i; }
      else { cumMaxIdx[i] = cumMaxIdx[i - 1] ?? 0; }
      dd[i] = (v / runMax - 1) * 100;
    }
    let troughIdx = 0;
    for (let i = 1; i < n; i++) if (dd[i] < dd[troughIdx]) troughIdx = i;
    const startIdx = cumMaxIdx[troughIdx] || 0;
    const peakVal = values[startIdx] || values[0] || 1;
    let recoverIdx = n - 1;
    for (let i = troughIdx + 1; i < n; i++) { if (values[i] >= peakVal) { recoverIdx = i; break; } }
    return { dd, startIdx, troughIdx, recoverIdx, mddPct: dd[troughIdx] || 0 };
  }

  const prepared = useMemo(() => {
    if (!data || !Array.isArray(data.series) || !Array.isArray(data.x)) {
      return { x: [], series: [], meta: [] };
    }
    const x = data.x;
    const series = [];
    const meta = [];
    for (const s of data.series) {
      const values = Array.isArray(s.values) ? s.values : [];
      if (!values.length) continue;
      const { dd, startIdx, troughIdx, recoverIdx, mddPct } = computeDrawdown(values);
      series.push({ name: s.name || "Series", dd });
      meta.push({ name: s.name || "Series", startIdx, troughIdx, recoverIdx, mddPct });
    }
    return { x, series, meta };
  }, [data]);

  const option = useMemo(() => {
    const { x, series, meta } = prepared;

    const echSeries = series.map((s, idx) => {
      const m = meta[idx];
      const areaPT =
        m && m.startIdx !== undefined
          ? [[{ xAxis: x[m.startIdx], itemStyle: { color: "rgba(244,63,94,0.06)" } }, { xAxis: x[m.troughIdx] }]]
          : [];

      return {
        name: s.name,
        type: "line",
        data: s.dd.map((v, i) => [x[i], Number.isFinite(v) ? +v.toFixed(2) : null]),
        symbol: "circle",
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0 },
        markArea: areaPT.length ? { silent: true, itemStyle: { color: "rgba(244,63,94,0.06)" }, data: areaPT } : undefined,
        markPoint: m && Number.isFinite(m.mddPct)
        ? {
            data: [{
              coord: [x[m.troughIdx], +m.mddPct.toFixed(2)],
              value: +m.mddPct.toFixed(2)  // 숫자 저장
            }],
            symbolSize: 46,
            label: {
              show: true,
              color: fg,
              backgroundColor: "rgba(0,0,0,0.25)",
              padding: [2, 6],
              borderRadius: 4,
              formatter: (p) => `${Number(p.value).toFixed(2)}%`
            },
            tooltip: {
              trigger: "item",
              formatter: (p) => `${p.name || p.axisValueLabel || ""}<br/>${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(4).replace(/\.?0+$/,"")}%`
            }
          }
        : undefined,      
      };
    });

    return {
      backgroundColor: "transparent",
      grid: { top: 48, right: 24, bottom: 60, left: 64 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      
        // 위로만 띄우기 위해 confine 해제 + body에 부착
        confine: false,
        appendToBody: true,
      
        backgroundColor: tooltipBg,
        borderColor: tooltipBd,
        borderWidth: 1,
      
        // 무조건 커서 위쪽에 배치 (클램프/자동전환 없음)
        position: (pos, params, dom, rect, size) => {
          const [x, y] = pos;
          const [cw, ch] = size.contentSize;
          return [x - cw / 2, y - ch - 12];
        },
      
        formatter: (params) => {
          const list = Array.isArray(params) ? params : [params];
      
          // 마커(최대낙폭 점) 위: 해당 종목만
          const mp = list.find((p) => p?.dataType === "markPoint");
          if (mp) {
            const fmt = (v) => {
              const n = Number(v);
              if (!isFinite(n)) return v ?? "";
              return n.toFixed(4).replace(/\.?0+$/, "");
            };
            const val = mp?.data?.value ?? mp?.value;
            const x = mp?.axisValueLabel ?? mp?.name ?? "";
            return `${x}<br/>${mp.marker} ${mp.seriesName}: ${fmt(val)}%`;
          }
      
          // 축 기준 기본 툴팁: 최대 30개, 초과 요약 + 하단 강조 1개
          const x = list[0]?.axisValueLabel ?? "";
          const limit = 30;
          const fmt = (v) => {
            const raw = Array.isArray(v) ? v?.[1] : v;
            const n = Number(raw);
            return Number.isFinite(n) ? `${n.toFixed(4).replace(/\.?0+$/,"")}%` : raw;
          };
          const bodyArr = list.slice(0, limit)
            .map(p => `${p.marker} ${p.seriesName}: ${fmt(p.data)}`);
          const rest = Math.max(0, list.length - limit);

          // 하단 강조 1개
          const hovered = hoverSeriesNameRef.current;
          let highlight = "";
          if (hovered) {
            const hp = list.find(p => p.seriesName === hovered);
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
        name: "낙폭(%)",
        nameTextStyle: { color: axis },
        axisLabel: { color: axis },
        splitLine: { lineStyle: { color: gridLine } },
        max: 0,
        min: (val) => Math.min(-5, Math.floor((val.min - 2) / 5) * 5),
      },
      series: echSeries,
      dataZoom: [
        { type: "inside", xAxisIndex: 0 },
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
      ],
      textStyle: { color: fg },
    };
  }, [prepared, axis, fg, gridLine, tooltipBg]);

  // 단일 버튼(일괄 선택) : 클릭 시 전체 선택 ↔ 전체 해제 토글
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
      <div style={{ position: "absolute", top: 7.5, right: "calc(5% - 32px)", zIndex: 5 }}>
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
        onEvents={drawdownEvents}
      />
    </div>
  );
}
