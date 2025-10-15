import React, { useMemo, useRef, useEffect } from "react";
import ReactECharts from "echarts-for-react";

/**
 * props:
 *  - labels: string[]
 *  - matrix: number[][]
 *  - dark?: boolean
 *  - height?: number
 *  - nameMap?: Record<string,string>
 *  - palette?: string[]               // inRange 색상 [neg, neutral, pos]
 *  - vmin?: number                    // 기본 -1
 *  - vmax?: number                    // 기본  1
 */
export default function InteractiveHeatmap({
  labels = [],
  matrix = [],
  dark = false,
  height = 540,
  nameMap = null,
  palette,
  vmin = -1,
  vmax = 1,
}) {
  const chartRef = useRef(null);
  const barRef = useRef(null);
  const tickRef = useRef(null);
  const rafRef = useRef(null);
  const filterRangeRef = useRef(null); // [low, high] — 라이트모드에서 숫자 표시 범위
  const winCount = Math.min(24, Math.max(10, Math.round(labels.length * 0.35)));
  const xEnd = Math.min(labels.length - 1, winCount - 1);
  const yEnd = Math.min(labels.length - 1, winCount - 1);

  // ECharts data: [xIndex, yIndex, value]
  const data = useMemo(() => {
    const out = [];
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        out.push([j, i, matrix[i][j]]);
      }
    }
    return out;
  }, [matrix]);

  // 테마 색상
  const fg = dark ? "#e5e7eb" : "#111827";
  const axis = dark ? "#9ca3af" : "#6b7280";
  const gridLine = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const tooltipBg = dark ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)";
  const tooltipBd = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";

  // 기본 팔레트
  const vmColors =
    Array.isArray(palette) && palette.length >= 2
      ? palette
      : ["#ef4444", "#e6efff", dark ? "#3b82f6" : "#2563eb"];

  // 코드 → 보기용 라벨 변환
  const formatLabel = (val) => {
    const v = String(val);
    if (nameMap && typeof nameMap === "object") {
      const base = v.replace(/\.[A-Z]+$/i, "");
      const candidates = [v, base, `${base}.KS`, `${base}.KQ`];
      for (const c of candidates) {
        if (nameMap[c]) return nameMap[c];
      }
    }
    return v.replace(/\.[A-Z]+$/i, "");
  };

  // 라벨 색 자동 선택(셀 배경 밝기 기반)
  function hexToRgbArray(hex) {
    if (!hex) return [0, 0, 0];
    if (hex.startsWith("rgb")) {
      const m = hex.match(/\d+/g);
      return [Number(m[0]), Number(m[1]), Number(m[2])];
    }
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function interpRgb(stops, t) {
    const n = stops.length - 1;
    const x = Math.min(Math.max(t, 0), 1) * n;
    const i = Math.floor(x);
    const f = x - i;
    const a = stops[i],
      b = stops[Math.min(i + 1, n)];
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ];
  }
  const vmStops = vmColors.map(hexToRgbArray);

  const labelColorFn = (p) => {
    const v = p?.data?.[2];
    if (v == null || isNaN(v)) return fg;
    const t = (v - vmin) / (vmax - vmin);
    const [r, g, b] = interpRgb(vmStops, t);
    const lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
    return lum > 0.60 ? "#111827" : "#ffffff";
  };

  // 라이트모드에서 필터 밖 숫자 숨김 — 공용 라벨 포매터
  const labelFormatter = (p) => {
    const v = p?.data?.[2];
    if (v == null || isNaN(v)) return "";
    const r = filterRangeRef.current;
    if (!dark && Array.isArray(r) && (v < r[0] || v > r[1])) return "";
    return Number(v).toFixed(2);
  };

  // 슬림한 dataZoom 색상
  const dzTrack = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const dzFill = dark ? "rgba(99,102,241,0.28)" : "rgba(59,130,246,0.25)";
  const dzHand = dark ? "#cbd5e1" : "#4b5563";

  // ── 고정 뷰포트 + 내부 스크롤을 위한 실제 캔버스 사이즈 계산 ──
  const { contentW, contentH } = useMemo(() => {
    const X_CELL = labels.length > 36 ? 42 : 36; // 열 방향 셀 너비(px)
    const Y_CELL = 28;                           // 행 방향 셀 높이(px)
    const MARGIN_X = 180;                        // 좌우 라벨/그리드 여유
    const MARGIN_Y = 160;                        // 상하 라벨/그리드 여유

    return {
      contentW: Math.max(labels.length * X_CELL + MARGIN_X, 960),
      contentH: Math.max(labels.length * Y_CELL + MARGIN_Y, height),
    };
  }, [labels.length, height]);

  // 옵션 (확대/축소 포함 기존 기능 유지)
  const option = {
    backgroundColor: "transparent",
    animation: true,
    animationDuration: 300,
    animationEasing: "cubicOut",

    grid: { left: 64, right: 64, top: 56, bottom: 56, containLabel: true },

    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: tooltipBg,
      borderColor: tooltipBd,
      borderWidth: 1,
      formatter: (p) => {
        const xCode = labels[p.value[0]] ?? p.value[0];
        const yCode = labels[p.value[1]] ?? p.value[1];
        const v = (p.value[2] ?? 0).toFixed(3);
        return `${formatLabel(yCode)} × ${formatLabel(
          xCode
        )}<br/>상관계수: <b>${v}</b>`;
      },
    },

    xAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        color: fg,
        rotate: 45,
        interval: 0,
        hideOverlap: true,
        fontSize: 10,
        margin: 10,
        formatter: (v) => formatLabel(v),
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: axis } },
      splitLine: { show: true, lineStyle: { color: gridLine } },
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        color: fg,
        interval: 0,
        hideOverlap: true,
        fontSize: 10,
        margin: 6,
        formatter: (v) => formatLabel(v),
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: axis } },
      splitLine: { show: true, lineStyle: { color: gridLine } },
    },

    // 확대/축소: 휠/핀치 + 슬림 슬라이더
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none", throttle: 50, startValue: 0, endValue: xEnd },
      { type: "inside", yAxisIndex: 0, filterMode: "none", throttle: 50, startValue: 0, endValue: yEnd },
      {
        type: "slider",
        xAxisIndex: 0,
        bottom: 16,
        height: 10,
        filterMode: "none",
        backgroundColor: dzTrack,
        fillerColor: dzFill,
        borderColor: "transparent",
        showDetail: false,
        showDataShadow: false,
        handleSize: 10,
        handleStyle: { color: dzHand, borderWidth: 0, shadowBlur: 0 },
        dataBackground: { lineStyle: { color: "transparent" }, areaStyle: { color: "transparent" } },
        selectedDataBackground: { lineStyle: { color: "transparent" }, areaStyle: { color: "transparent" } },
        startValue: 0,
        endValue: xEnd,
      },
      {
        type: "slider",
        yAxisIndex: 0,
        right: 32,
        top: 56,
        bottom: 56,
        width: 8,
        orient: "vertical",
        filterMode: "none",
        backgroundColor: dzTrack,
        fillerColor: dzFill,
        borderColor: "transparent",
        showDetail: false,
        showDataShadow: false,
        handleSize: 10,
        handleStyle: { color: dzHand, borderWidth: 0, shadowBlur: 0 },
        dataBackground: { lineStyle: { color: "transparent" }, areaStyle: { color: "transparent" } },
        selectedDataBackground: { lineStyle: { color: "transparent" }, areaStyle: { color: "transparent" } },
        startValue: 0,
        endValue: yEnd,
      },
    ],
    

    // 색상 매핑 + 필터(outOfRange 투명도) — visualMap UI는 숨김
    visualMap: [
      {
        type: "continuous",
        show: false,
        min: vmin,
        max: vmax,
        dimension: 2,
        realtime: true,
        hoverLink: true,
        inRange: { color: vmColors, colorAlpha: 1 },
        outOfRange: { color: vmColors, colorAlpha: dark ? 0.12 : 0.05 },
      },
    ],

    series: [
      {
        type: "heatmap",
        data,
        progressive: 5000,
        itemStyle: { borderColor: gridLine, borderWidth: 1 },
        label: {
          show: true,
          fontSize: 11,
          fontWeight: 500,
          formatter: labelFormatter,
          color: labelColorFn,
          opacity: 1,
          textBorderWidth: 1,
          textBorderColor: (p) => {
            const c = labelColorFn(p);
            return c === "#ffffff" ? "rgba(0,0,0,0.40)" : "rgba(255,255,255,0.45)";
          },
          textShadowBlur: 0,
        },
        emphasis: {
          itemStyle: { borderColor: axis, borderWidth: 1 },
          label: {
            color: labelColorFn,
            opacity: 1,
            fontWeight: 600,
            textBorderWidth: 2,
            textBorderColor: (p) => {
              const c = labelColorFn(p);
              return c === "#ffffff" ? "rgba(0,0,0,0.50)" : "rgba(255,255,255,0.60)";
            },
          },
        },
      },
    ],
    textStyle: { color: fg },
  };

  // 상단 커스텀 가로 컬러바(그라디언트)
  const barBg = `linear-gradient(90deg, ${vmColors.join(",")})`;
  const tickStyle = {
    width: 2,
    height: 12,
    background: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
    borderRadius: 1,
  };
  const BAR_LABEL_OFFSET = 18; // px
  const BAR_LABEL_TOP = 0;     // px

  // 초기 중앙 위치
  useEffect(() => {
    if (tickRef.current) tickRef.current.style.left = "50%";
  }, []);

  return (
    <div style={{ width: "100%" }}>
      {/* 상단 가로 컬러바 + hover 필터 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 8px 0 8px",
          marginTop: 8,
          marginBottom: -22,
          color: fg,
          justifyContent: "center",
        }}
      >
        <div
          ref={barRef}
          onMouseEnter={() => {
            const inst = chartRef.current;
            if (!inst) return;
            filterRangeRef.current = null;
            inst.dispatchAction({
              type: "selectDataRange",
              visualMapIndex: 0,
              selected: [vmin, vmax],
            });
            inst.setOption({ series: [{ label: { formatter: labelFormatter } }] }, false);
          }}
          onMouseLeave={() => {
            const inst = chartRef.current;
            if (!inst) return;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            filterRangeRef.current = null;
            inst.dispatchAction({
              type: "selectDataRange",
              visualMapIndex: 0,
              selected: [vmin, vmax],
            });
            inst.setOption({ series: [{ label: { formatter: labelFormatter } }] }, false);
            if (tickRef.current) tickRef.current.style.left = "50%";
          }}
          onMouseMove={(e) => {
            const inst = chartRef.current;
            const el = barRef.current;
            if (!inst || !el) return;

            const rect = el.getBoundingClientRect();
            const t = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);

            if (tickRef.current) {
              tickRef.current.style.left = `${(t * 100).toFixed(2)}%`;
            }

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
              const total = vmax - vmin;
              const center = vmin + t * total;
              const half = total * 0.08;
              const low = Math.max(vmin, center - half);
              const high = Math.min(vmax, center + half);

              inst.dispatchAction({
                type: "selectDataRange",
                visualMapIndex: 0,
                selected: [low, high],
              });

              filterRangeRef.current = [low, high];
              inst.setOption({ series: [{ label: { formatter: labelFormatter } }] }, false);
            });
          }}
          style={{
            position: "relative",
            top: 12,
            zIndex: 3,
            width: 360,
            cursor: "crosshair",
            userSelect: "none",
          }}
        >
          <div
            style={{
              height: 14,
              width: "100%",
              borderRadius: 8,
              background: barBg,
              boxShadow: dark
                ? "0 0 0 1px rgba(255,255,255,0.15) inset"
                : "0 0 0 1px rgba(0,0,0,0.12) inset",
            }}
          />
          <div
            ref={tickRef}
            style={{
              position: "absolute",
              left: "50%",
              top: -3,
              transform: "translateX(-50%)",
              width: 2,
              height: 12,
              background: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
              borderRadius: 1,
            }}
          />
          {/* 좌/우 숫자 */}
          <div
            style={{
              position: "absolute",
              left: `-${BAR_LABEL_OFFSET}px`,
              top: `calc(50% + ${BAR_LABEL_TOP}px)`,
              transform: "translateY(-50%)",
              fontSize: 12,
              opacity: 0.8,
              pointerEvents: "none",
              textAlign: "right",
              color: fg,
              whiteSpace: "nowrap",
            }}
          >
            {vmin}
          </div>
          <div
            style={{
              position: "absolute",
              right: `-${BAR_LABEL_OFFSET}px`,
              top: `calc(50% + ${BAR_LABEL_TOP}px)`,
              transform: "translateY(-50%)",
              fontSize: 12,
              opacity: 0.8,
              pointerEvents: "none",
              textAlign: "left",
              color: fg,
              whiteSpace: "nowrap",
            }}
          >
            {vmax}
          </div>
        </div>
      </div>

      {/* 차트: 고정 뷰포트 + 내부 스크롤 (줌/필터/슬라이더 그대로 유지) */}
      <ReactECharts
  option={option}
  style={{ width: "min(1200px, 96vw)", height }}
  notMerge={true}
  opts={{ renderer: "svg" }}
  onChartReady={(inst) => { chartRef.current = inst; }}
/>

    </div>
  );
}
