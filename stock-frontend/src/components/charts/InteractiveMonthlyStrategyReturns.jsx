/*import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

/**
 * InteractiveMonthlyStrategyReturns
 * - 입력: timeseries?kind=strategy 의 응답 { x: string[], series: [{ name, values }] }
 * - 처리: 일간(or 구간) 수익률로부터 월별 복리수익률을 산출하여 히트맵으로 표시
 *   음수=빨강, 0=중립, 양수=파랑. 셀 라벨은 간단 퍼센트, 상세는 툴팁.
 */
/*export default function InteractiveMonthlyStrategyReturns({
  data,
  height = 560,
  dark = false,
}) {
  const fg = dark ? "#e5e7eb" : "#111827";
  const axis = dark ? "#9ca3af" : "#6b7280";
  const gridLine = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const tooltipBg = dark ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)";

  // YYYY-MM 문자열 생성
  const ym = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    return `${y}-${m}`;
  };

  // 데이터 가공: 월별 복리수익률( (1+r1)*(1+r2)*... - 1 )
  const prepared = useMemo(() => {
    if (!data || !Array.isArray(data.series) || !Array.isArray(data.x)) {
      return { months: [], rows: [], matrix: [] };
    }

    // 전체 타임라인의 월 목록(정렬)
    const monthsSet = new Set();
    data.x.forEach((xi) => {
      const key = ym(xi);
      if (key) monthsSet.add(key);
    });
    const months = Array.from(monthsSet).sort();

    const rows = data.series.map((s) => s.name || "Strategy");
    const rowCount = rows.length;
    const colCount = months.length;

    // 행렬 초기화: NaN으로 채워둠
    const matrix = Array.from({ length: rowCount }, () =>
      Array.from({ length: colCount }, () => NaN)
    );

    data.series.forEach((s, r) => {
      const vals = Array.isArray(s.values) ? s.values : [];
      if (vals.length < 2) return;

      let curMonth = ym(data.x[0]);
      let acc = 1.0;
      let hasAny = false;

      for (let i = 1; i < vals.length; i++) {
        const prev = vals[i - 1];
        const cur = vals[i];
        const monthKey = ym(data.x[i]);

        // 월이 바뀌면 이전 월을 기록
        if (monthKey !== curMonth && curMonth) {
          const cIdx = months.indexOf(curMonth);
          if (cIdx >= 0) {
            matrix[r][cIdx] = hasAny ? acc - 1 : NaN;
          }
          // 초기화
          acc = 1.0;
          hasAny = false;
          curMonth = monthKey;
        }

        if (prev !== 0 && isFinite(prev) && isFinite(cur)) {
          const ret = cur / prev - 1;
          if (isFinite(ret)) {
            acc *= 1 + ret;
            hasAny = true;
          }
        }
      }

      // 마지막 월 기록
      if (curMonth) {
        const cIdx = months.indexOf(curMonth);
        if (cIdx >= 0) {
          matrix[r][cIdx] = hasAny ? acc - 1 : NaN;
        }
      }
    });

    return { months, rows, matrix };
  }, [data]);

  // ECharts 히트맵 데이터: [xIndex, yIndex, value]
  const heatData = useMemo(() => {
    const list = [];
    prepared.rows.forEach((_, r) => {
      prepared.months.forEach((_, c) => {
        const v = prepared.matrix[r][c];
        // 퍼센트 값으로 변환
        const pct = Number.isFinite(v) ? +(v * 100).toFixed(2) : null;
        list.push([c, r, pct]);
      });
    });
    return list;
  }, [prepared]);

  // 색상(다크/라이트에 따라 약간 다르게)
  const NEG = dark ? "#f87171" : "#ef4444";
  const MID = dark ? "#e5e7eb" : "#374151"; // 0 근처 라벨용 대비색
  const POS = dark ? "#60a5fa" : "#3b82f6";

  // 값의 범위 추정(중앙 0에 맞추는 것이 중요)
  const allVals = heatData
    .map((d) => d[2])
    .filter((v) => typeof v === "number" && isFinite(v));
  const minV = allVals.length ? Math.min(...allVals, -20) : -20;
  const maxV = allVals.length ? Math.max(...allVals, 20) : 20;
  const absMax = Math.max(Math.abs(minV), Math.abs(maxV));

  const option = {
    backgroundColor: "transparent",
    grid: { top: 48, right: 24, bottom: 64, left: 96 },
    tooltip: {
      trigger: "item",
      backgroundColor: tooltipBg,
      textStyle: { color: fg },
      formatter: (p) => {
        const c = p?.value;
        if (!c) return "";
        const month = prepared.months[c[0]];
        const strat = prepared.rows[c[1]];
        const val = c[2];
        if (val === null || val === undefined) return `${strat}<br/>${month}<br/>데이터 없음`;
        return `<b>${strat}</b><br/>${month}<br/>월 수익률: <b>${val.toFixed(2)}%</b>`;
      },
    },
    xAxis: {
      type: "category",
      data: prepared.months,
      axisLabel: { color: axis, rotate: prepared.months.length > 14 ? 30 : 0 },
      axisLine: { lineStyle: { color: gridLine } },
      splitArea: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: prepared.rows,
      axisLabel: { color: axis },
      axisLine: { lineStyle: { color: gridLine } },
      splitArea: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      show: false,
      min: -absMax,
      max: absMax,
      calculable: false,
      // 중립색을 가운데 둔 diverging
      inRange: {
        color: [NEG, "#d1d5db", POS], // 빨강 → 중립 → 파랑
      },
      outOfRange: { color: ["#9ca3af"] },
    },
    series: [
      {
        name: "Monthly Return",
        type: "heatmap",
        data: heatData,
        label: {
          show: true,
          color: MID,
          fontSize: 11,
          formatter: (p) => {
            const v = p.value?.[2];
            if (v === null || v === undefined || !isFinite(v)) return "";
            // 절대값이 작을수록 숫자 대비 위해 색 바꾸기
            return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0,0,0,0.25)",
          },
        },
      },
    ],
    dataZoom: [
      { type: "inside", xAxisIndex: 0 },
      {
        type: "slider",
        xAxisIndex: 0,
        height: 8,
        bottom: 10,
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

  if (!prepared.rows.length || !prepared.months.length) {
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
*/


import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

export default function InteractiveMonthlyStrategyReturns({
    data,
    height = 560,
    dark = false,
  }) {
    const fg = dark ? "#e5e7eb" : "#111827";
    const axis = dark ? "#9ca3af" : "#6b7280";
    const gridLine = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
    const tooltipBg = dark ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.96)";
  
    const POS = "#60a5fa"; // 파랑
    const NEG = "#f87171"; // 빨강
  
    // YYYY-MM
    const ym = (iso) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      const y = d.getFullYear();
      const m = `${d.getMonth() + 1}`.padStart(2, "0");
      return `${y}-${m}`;
    };
  
    // 월별 복리수익률 계산
    const prepared = useMemo(() => {
      if (!data || !Array.isArray(data.series) || !Array.isArray(data.x)) {
        return { months: [], rows: [], matrix: [] };
      }
  
      // 전체 월 목록
      const monthsSet = new Set();
      data.x.forEach((xi) => {
        const key = ym(xi);
        if (key) monthsSet.add(key);
      });
      const months = Array.from(monthsSet).sort();
  
      const rows = data.series.map((s) => s.name || "Strategy");
      const rowCount = rows.length;
      const colCount = months.length;
  
      const matrix = Array.from({ length: rowCount }, () =>
        Array.from({ length: colCount }, () => NaN)
      );
  
      data.series.forEach((s, r) => {
        const vals = Array.isArray(s.values) ? s.values : [];
        if (vals.length < 2) return;
  
        let curMonth = ym(data.x[0]);
        let acc = 1.0;
        let hasAny = false;
  
        for (let i = 1; i < vals.length; i++) {
          const prev = vals[i - 1];
          const cur = vals[i];
          const monthKey = ym(data.x[i]);
  
          // 월이 바뀌면 이전 월 저장
          if (monthKey !== curMonth && curMonth) {
            const cIdx = months.indexOf(curMonth);
            if (cIdx >= 0) matrix[r][cIdx] = hasAny ? acc - 1 : NaN;
            acc = 1.0;
            hasAny = false;
            curMonth = monthKey;
          }
  
          if (prev !== 0 && isFinite(prev) && isFinite(cur)) {
            const ret = cur / prev - 1;
            if (isFinite(ret)) {
              acc *= 1 + ret;
              hasAny = true;
            }
          }
        }
  
        // 마지막 월 저장
        if (curMonth) {
          const cIdx = months.indexOf(curMonth);
          if (cIdx >= 0) matrix[r][cIdx] = hasAny ? acc - 1 : NaN;
        }
      });
  
      return { months, rows, matrix };
    }, [data]);
  
    // 퍼센트 행렬
    const pctMatrix = useMemo(() => {
      return prepared.matrix.map((row) =>
        row.map((v) => (Number.isFinite(v) ? v * 100 : null))
      );
    }, [prepared]);
  
    // y 범위(전략 전부 동일 스케일)
    const absMax = useMemo(() => {
      const vals = pctMatrix.flat().filter((v) => v !== null);
      if (!vals.length) return 10;
      const maxAbs = Math.max(...vals.map((x) => Math.abs(x)));
      const cap = 25; // 극단치 캡
      return Math.min(Math.max(10, Math.ceil(maxAbs / 5) * 5), cap);
    }, [pctMatrix]);
  
    // 행 레이아웃 (그리드 다중)
    const rowCount = prepared.rows.length || 1;
    const topPct = 10;   // 상단 여백 %
    const botPct = 10;   // 하단 여백 %
    const gapPct = 2;    // 행 간 간격 %
    const availPct = 100 - topPct - botPct - (rowCount - 1) * gapPct;
    const rowPct = availPct / rowCount;
  
    const grids = Array.from({ length: rowCount }, (_, r) => ({
      top: `${topPct + r * (rowPct + gapPct)}%`,
      height: `${rowPct}%`,
      left: 96,
      right: 24,
    }));
  
    // x/y 축 (행마다 하나씩)
    const xAxes = Array.from({ length: rowCount }, (_, r) => ({
      type: "category",
      gridIndex: r,
      data: prepared.months,
      axisLabel: {
        color: axis,
        rotate: prepared.months.length > 14 ? 30 : 0,
        margin: 8,
        show: r === rowCount - 1, // 맨 아래 행만 월 라벨 표시
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: gridLine } },
      boundaryGap: true,
    }));
  
    const yAxes = Array.from({ length: rowCount }, (_, r) => ({
      type: "value",
      gridIndex: r,
      name: r === 0 ? "월 수익률(%)" : "",
      nameTextStyle: { color: axis },
      axisLabel: { color: axis },
      splitLine: { lineStyle: { color: gridLine } },
      max: absMax,
      min: -absMax,
    }));
  
    const xIndexArray = Array.from({ length: rowCount }, (_, r) => r);
  
    // 시리즈 생성 (전략별 막대)
    const series = pctMatrix.map((row, r) => {
      const data = row.map((v, i) =>
        v === null || !isFinite(v) ? null : [prepared.months[i], +v.toFixed(2)]
      );
      return {
        name: prepared.rows[r],
        type: "bar",
        xAxisIndex: r,
        yAxisIndex: r,
        data,
        barWidth: 18,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: (p) => {
            const v = p.value?.[1];
            return v >= 0 ? POS : NEG;
          },
        },
        // 큰 변화만 라벨
        label: {
          show: true,
          position: (p) => (p.value?.[1] >= 0 ? "top" : "bottom"),
          formatter: (p) => {
            const v = p.value?.[1];
            if (v === null || v === undefined || !isFinite(v)) return "";
            const threshold = Math.max(6, absMax * 0.18);
            if (Math.abs(v) < threshold) return "";
            const sign = v > 0 ? "+" : "";
            return `${sign}${v.toFixed(1)}%`;
          },
          color: fg,
          fontSize: 11,
        },
        // 0 기준선
        markLine: {
          symbol: ["none", "none"],
          silent: true,
          lineStyle: {
            type: "dashed",
            width: 1,
            color: dark ? "rgba(229,231,235,0.35)" : "rgba(55,65,81,0.35)",
          },
          data: [{ yAxis: 0 }],
        },
        emphasis: { focus: "series" },
      };
    });
  
    const option = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: tooltipBg,
        textStyle: { color: fg },
        formatter: (p) => {
          const strat = p.seriesName;
          const month = p.value?.[0];
          const v = p.value?.[1];
          if (v === null || v === undefined)
            return `<b>${strat}</b><br/>${month}<br/>데이터 없음`;
          const sign = v > 0 ? "+" : "";
          return `<b>${strat}</b><br/>${month}<br/>월 수익률: <b>${sign}${v.toFixed(
            2
          )}%</b>`;
        },
      },
      legend: { show: false },
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      series,
      // 슬림 스크롤바 (모든 행 동기화)
      dataZoom: [
        { type: "inside", xAxisIndex: xIndexArray },
        {
          type: "slider",
          xAxisIndex: xIndexArray,
          height: 8,
          bottom: 6,
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
  
    if (!prepared.rows.length || !prepared.months.length) {
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
