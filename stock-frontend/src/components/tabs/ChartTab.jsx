//src/components/tabs/ChartTab.jsx
import { useState, useRef, useEffect, useMemo } from "react";
import PortfolioSummaryTable from "../tables/PortfolioSummaryTable";
import "../../styles/analysis-mode.css";
import InteractiveLineChart from "../charts/InteractiveLineChart";
import InteractiveHeatmap from "../charts/InteractiveHeatmap";
import InteractiveHistogram from "../charts/InteractiveHistogram";
import InteractiveSharpeBar from "../charts/InteractiveSharpeBar";
import InteractiveRiskReturnScatter from "../charts/InteractiveRiskReturnScatter";
import InteractiveDrawdownChart from "../charts/InteractiveDrawdownChart";
import InteractiveMonthlyStrategyReturns from "../charts/InteractiveMonthlyStrategyReturns";
import InteractiveCorrVsVol from "../charts/InteractiveCorrVsVol";
import InteractiveQuarterlyCorrPairs from "../charts/InteractiveQuarterlyCorrPairs";
import InteractiveFxCorr60d from "../charts/InteractiveFxCorr60d";
import ZoomableImage from "../common/ZoomableImage";
import { API_BASE_URL } from "../../constants";
import { Square, LayoutGrid, Info } from "lucide-react";

// 세로 나열용 심플 스택 아이콘 
const VerticalStackIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

// 보기 모드
const VIEW_MODES = { SINGLE: "single", ALL_MODAL: "all-modal", STACKED: "stacked" };

// 서브차트 메타
const PANEL_META = {
  basic: {
    rows: 2,
    cols: 2,
    titles: ["정규화 주가", "상관관계 행렬", "일간 수익률 분포", "누적 수익률"],
  },
  advanced: {
    rows: 3,
    cols: 2,
    titles: [
      "롤링 상관계수 vs 시장 변동성",
      "위험-수익 프로파일",
      "포트폴리오 전략 비교",
      "분기별 상관관계 변화 (상위 5개 페어)",
      "USD/KRW vs 주식시장 상관관계 (60일 롤링)",
      "최대 낙폭 분석",
    ],
  },
  performance: {
    rows: 2,
    cols: 2,
    titles: ["개별 종목 샤프 비율", "위험-수익 프로파일", "월별 전략 수익률 (최근 12개월)", "포트폴리오 성과 요약"],
  },
};

// 서버에서 오는 분리 이미지의 키 순서(백엔드 반환 키와 일치)
const ORDER_KEYS = {
  basic: ["normalized_price", "corr_matrix", "daily_return_hist", "cumulative_return"],
  advanced: ["rolling_corr_vs_vol", "risk_return", "strategy_compare", "quarterly_corr_pairs", "fx_corr_60d", "max_drawdown"],
  performance: ["sharpe_by_stock", "risk_return_profile", "monthly_strategy_returns", "portfolio_summary_table"],
  correlation: ["heatmap"],
};

// DOM 전역에서 다크 신호를 탐지
const detectIsDark = () => {
  try {
    // 전역/루트에 붙은 명시적 클래스가 있으면 그것만 신뢰
    if (document.querySelector('html.light, body.light, [data-theme="light"], .theme-light, .light')) return false;
    if (document.querySelector('html.dark,  body.dark,  [data-theme="dark"],  .theme-dark,  .dark-mode')) return true;
    // 명시 없으면 기본 라이트(= false). 필요 시 전역에 data-theme="system"을 달아 따로 처리.
    return false;
  } catch {
    return false;
  }
};

// 요약 버튼 (바깥 우상단 고정용)
const SummaryButton = ({ onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`summary-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${className}`}
    title="요약"
  >
    <Info className="w-4 h-4 opacity-90" aria-hidden="true" />
    <span>요약</span>
  </button>
);

export default function ChartTab({ taskId, isDark: isDarkProp }) {
  const [viewMode, setViewMode] = useState(VIEW_MODES.SINGLE);
  const [aliasType, setAliasType] = useState(null);
  const [callType, setCallType] = useState(null);
  const [chartUrl, setChartUrl] = useState("");
  const [croppedUrl, setCroppedUrl] = useState("");
  const [activePanel, setActivePanel] = useState(0);
  const [forcedPanel, setForcedPanel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [separateImages, setSeparateImages] = useState(null);

  // 인터랙티브 모드
  const SUPPORTED_TS = {
    normalized_price: "normalized",
    cumulative_return: "cumulative",
    strategy_compare: "strategy",
    daily_return_hist: "normalized", // 히스토그램은 정규화 시계열로부터 계산
    sharpe_by_stock: "normalized", // 샤프 계산용
    risk_return_profile: "normalized",
    risk_return: "normalized",
    max_drawdown: "normalized",
    monthly_strategy_returns: "strategy",
    rolling_corr_vs_vol: "corr_vs_vol",
    quarterly_corr_pairs: "quarterly_pairs",
    fx_corr_60d: "fx_corr_60d",
  };
  const HEATMAP_KEYS = new Set(["corr_matrix", "heatmap"]);
  const [interactive, setInteractive] = useState(true);

  // 차트 인스턴스 & 일괄선택
  const chartRefs = useRef({});
  const setChartRef = (key) => (inst) => {
    if (inst) chartRefs.current[key] = inst;
  };

  // 각 차트의 현재 “전체 ON/전체 OFF” 버튼 상태(스타일 용)
  const [seriesAll, setSeriesAll] = useState({}); // key -> boolean (true: 전체 ON, false: 전체 OFF)

  const applyLegendBulk = (k, raw, action) => {
    // ECharts 인스턴스에 legend 액션 전달
    requestAnimationFrame(() => {
      const inst = chartRefs.current[k];
      if (!inst || !raw || !Array.isArray(raw.series)) return;
      const names = raw.series.map((s) => s?.name).filter(Boolean);
      try {
        if (action === "select_all") {
          inst.dispatchAction({ type: "legendAllSelect" });
        } else if (action === "unselect_all") {
          for (const n of names) inst.dispatchAction({ type: "legendUnSelect", name: n });
        }
      } catch (e) {}
    });
  };

  // “최대 낙폭 분석 / 일간 수익률 분포” 에서만 버튼 노출
  // 종목 범례 일괄 선택/해제 컨트롤 (차트 내부 우측 상단 오버레이)
  const renderSeriesControl = (k, raw) => {
    const allowed = new Set(["max_drawdown", "daily_return_hist"]); // 적용 대상
    if (!interactive || !allowed.has(k)) return null;
    if (!raw || !Array.isArray(raw.series) || raw.series.length < 2) return null;

    const btn =
      "px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[11px] md:text-xs " +
      "bg-transparent text-[var(--seg-text)] select-none " +
      // hover 색 없음, press일 때만 강조
      "active:bg-[var(--seg-active-bg)] active:text-[var(--seg-active-text)] " +
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40";

    return (
      <div
        className="
          absolute z-[6]
          top-[6px] md:top-[8px]
          right-0 translate-x-[36px]      /* ← 화살표 그룹 바로 오른쪽으로 36px만 내보냄 */
          pointer-events-auto
        "
        style={{ minWidth: 0 }}
      >
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSeriesAll((p) => ({ ...p, [k]: true }));
              applyLegendBulk(k, raw, "select_all");
            }}
            className={btn}
            title="일괄선택"
            aria-label="일괄선택"
          >
            일괄선택
          </button>
          <button
            type="button"
            onClick={() => {
              setSeriesAll((p) => ({ ...p, [k]: false }));
              applyLegendBulk(k, raw, "unselect_all");
            }}
            className={btn}
            title="일괄해제"
            aria-label="일괄해제"
          >
            일괄해제
          </button>
        </div>
      </div>
    );
  };

  // 키별 로딩/데이터 맵
  const [tsLoad, setTsLoad] = useState({});
  const [tsMap, setTsMap] = useState({});

  const isDark = typeof isDarkProp === "boolean" ? isDarkProp : detectIsDark();
  const isInteractiveSupported = (k) => !!SUPPORTED_TS[k];

  // 표 전용 상태
  const [portfolioTable, setPortfolioTable] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [modalShown, setModalShown] = useState(false);

  // 슬라이드 애니메이션 상태
  const [prevModalIndex, setPrevModalIndex] = useState(null);
  const [slideDir, setSlideDir] = useState(null);
  const [slideGo, setSlideGo] = useState(false);

  const isCallingApi = useRef(false);
  const containerRef = useRef(null);
  const lastDarkRef = useRef(detectIsDark());
  // ✅ 자동 스크롤 로직 추가
  const chartContainerRef = useRef(null);

  // 테마 변경 감지 → 현재 탭 재요청
  useEffect(() => {
    let prev = typeof isDarkProp === "boolean" ? isDarkProp : detectIsDark();
    let timer = null;
    const trigger = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const now = typeof isDarkProp === "boolean" ? isDarkProp : detectIsDark();
        if (now !== prev) {
          prev = now;
          if (callType && !isCallingApi.current) {
            loadChart(callType);
          }
        }
      }, 80);
    };

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && (m.attributeName === "class" || m.attributeName === "data-theme")) {
          trigger();
          break;
        }
      }
    });

    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
      subtree: true,
    });

    let mm;
    const onMediaChange = () => trigger();
    try {
      mm = window.matchMedia("(prefers-color-scheme: dark)");
      if (mm.addEventListener) mm.addEventListener("change", onMediaChange);
      else if (mm.addListener) mm.addListener(onMediaChange);
    } catch {}

    trigger();

    return () => {
      obs.disconnect();
      clearTimeout(timer);
      if (mm) {
        if (mm.removeEventListener) mm.removeEventListener("change", onMediaChange);
        else if (mm.removeListener) mm.removeListener(onMediaChange);
      }
    };
  }, [callType, isDarkProp]);

  const callTypeRef = useRef(null);
  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  // 탭 바뀌면 요약 닫기
  useEffect(() => {
    setSummaryOpen(false);
  }, [callType]);

  // 테마 폴링(옵션)
  useEffect(() => {
    let prev = typeof isDarkProp === "boolean" ? isDarkProp : detectIsDark();
    let timer = null;
    const tick = () => {
      const now = typeof isDarkProp === "boolean" ? isDarkProp : detectIsDark();
      if (now !== prev) {
        prev = now;
        if (callTypeRef.current && !isCallingApi.current) {
          clearTimeout(timer);
          timer = setTimeout(() => loadChart(callTypeRef.current), 80);
        }
      }
    };
    const id = setInterval(tick, 200);
    tick();
    return () => {
      clearInterval(id);
      clearTimeout(timer);
    };
  }, [isDarkProp]);

  // const API_BASE = "http://localhost:8000"; 라이브 서버에서는 제외

  // 라벨 매핑 (컴포넌트 안으로 이동)
  const LABELS = {
    normalized_price: "정규화 주가",
    corr_matrix: "상관관계 행렬",
    daily_return_hist: "일간 수익률 분포",
    cumulative_return: "누적 수익률",
    rolling_corr_vs_vol: "롤링 상관관계수 vs 변동성",
    risk_return: "위험-수익 프로파일",
    strategy_compare: "포트폴리오 전략 비교",
    quarterly_corr_pairs: "분기별 상관관계 변화",
    fx_corr_60d: "환율 vs 시장(60일)",
    max_drawdown: "최대 낙폭",
    sharpe_by_stock: "샤프 비율",
    risk_return_profile: "위험-수익 프로파일",
    monthly_strategy_returns: "월별 전략 수익률",
    portfolio_summary_table: "성과 요약",
    heatmap: "상관관계 행렬",
    ml: "ml 예측",
  };

  // 요약 드로어 상태 (컴포넌트 안)
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryMeta, setSummaryMeta] = useState({ type: null, key: null });

  const openSummary = (type, key) => {
    // 같은 타겟이면 토글, 다르면 해당 타겟으로 열기
    if (summaryOpen && summaryMeta?.type === type && summaryMeta?.key === key) {
      setSummaryOpen(false);
      return;
    }
    setSummaryMeta({ type, key });
    setSummaryOpen(true);
  };

  const summaryTitle = useMemo(() => {
    const t = summaryMeta?.type;
    const k = summaryMeta?.key;
    const typeTitle =
      t === "basic"
        ? "기본 분석"
        : t === "advanced"
        ? "고급 분석"
        : t === "correlation"
        ? "상관관계"
        : t === "performance"
        ? "성과 분석"
        : t === "ml"
        ? "AI 예측"
        : "차트";
    const keyLabel = LABELS?.[k] || k || "";
    return `${typeTitle} 요약${keyLabel ? ` - ${keyLabel}` : ""}`;
  }, [summaryMeta]);

  // ▼ v54 요약 데이터 상태/로딩 로직
  const [summaryData, setSummaryData] = useState(null);
  const [mlStatus, setMlStatus] = useState(null);

  // 숫자 파싱 유틸
  const asNum = (v) => {
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseFloat(v);
      return isFinite(n) ? n : NaN;
    }
    return NaN;
  };

  // 첫 번째 유효값 고르기
  const pickFirst = (...vals) => {
    for (const v of vals) {
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  };

  // 퍼센트(0~1 vs 0~100) 자동 정규화
  const asRate01 = (v) => {
    const n = asNum(v);
    if (!isFinite(n)) return 0;
    return n > 1 ? n / 100 : n; // 72(%) -> 0.72
  };

  const fetchSummaryData = async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`${API_BASE}/analysis/result/${taskId}`);
      const data = await res.json();

      const basicStats = data?.basic_stats || {};
      const performance = data?.performance_summary || {};
      const mlAnalysis = data?.ml_analysis || {};
      const prediction = mlAnalysis?.prediction || data?.prediction_summary || {};

      const summary = {
        basic: {
          title: "기본 분석 요약",
          items: [
            { label: "분석 기간", value: `${basicStats?.period?.start || "N/A"} ~ ${basicStats?.period?.end || "N/A"}` },
            { label: "분석 종목 수", value: `${basicStats?.stocks_analyzed || 0}개` },
            { label: "평균 상관계수", value: `${(basicStats?.correlation_stats?.average ?? 0).toFixed(3)}` },
            { label: "거래일 수", value: `${basicStats?.period?.trading_days || 0}일` },
          ],
        },
        advanced: {
          title: "고급 분석 요약",
          items: [
            { label: "최고 수익 종목", value: performance?.individual_stocks?.[0]?.name || "N/A" },
            { label: "연간 수익률", value: `${(performance?.individual_stocks?.[0]?.annual_return ?? 0).toFixed(1)}%` },
            { label: "최고 샤프비율", value: `${(performance?.individual_stocks?.[0]?.sharpe_ratio ?? 0).toFixed(2)}` },
            { label: "평균 변동성", value: `${(performance?.individual_stocks?.[0]?.annual_volatility ?? 0).toFixed(1)}%` },
          ],
        },
        correlation: {
          title: "상관관계 요약",
          items: [
            { label: "최고 상관", value: `${(basicStats?.correlation_stats?.max ?? 0).toFixed(3)}` },
            { label: "최저 상관", value: `${(basicStats?.correlation_stats?.min ?? 0).toFixed(3)}` },
            { label: "중앙값", value: `${(basicStats?.correlation_stats?.median ?? 0).toFixed(3)}` },
            { label: "표준편차", value: `${(basicStats?.correlation_stats?.std ?? 0).toFixed(3)}` },
          ],
        },
        performance: { title: "성과 분석 요약", items: [] },
        ml: { title: "AI 예측 요약", items: [] },
      };

      if (performance?.portfolio_strategies?.length > 0) {
        const bestStrategy = performance.portfolio_strategies.reduce((best, cur) => (cur?.sharpe_ratio > best?.sharpe_ratio ? cur : best));
        summary.performance.items = [
          { label: "최적 전략", value: bestStrategy?.strategy || "N/A" },
          { label: "연간 수익률", value: `${(bestStrategy?.annual_return ?? 0).toFixed(1)}%` },
          { label: "샤프 비율", value: `${(bestStrategy?.sharpe_ratio ?? 0).toFixed(2)}` },
          { label: "최대 낙폭", value: `${(bestStrategy?.max_drawdown ?? 0).toFixed(1)}%` },
        ];
      }

      const ic = typeof prediction?.ic === "number" ? prediction.ic : typeof prediction?.ic_mean === "number" ? prediction.ic_mean : 0;

      const grade = ic > 0.1 ? "EXCELLENT" : ic > 0.05 ? "GOOD" : ic > 0.02 ? "FAIR" : "POOR";

      summary.ml.items = [
        { label: "예측 등급", value: grade },
        { label: "IC Score", value: `${(ic || 0).toFixed(3)}` },
        { label: "적중률", value: `${((prediction?.hit_rate || 0) * 100).toFixed(1)}%` },
        { label: "투자 추천", value: ic > 0.05 ? "투자 권장" : "투자 보류" },
      ];

      setSummaryData(summary);
      setMlStatus({ grade, ic, hitRate: prediction?.hit_rate || 0, r2: prediction?.r2 });
    } catch (e) {
      console.error("Failed to fetch summary data:", e);
    }
  };

  useEffect(() => {
    if (summaryOpen) fetchSummaryData();
  }, [summaryOpen, taskId]);

  const getGradeClass = (grade) => {
    switch (grade) {
      case "EXCELLENT":
        return "text-emerald-400 font-semibold";
      case "GOOD":
        return "text-sky-400 font-semibold";
      case "FAIR":
        return "text-amber-400 font-semibold";
      case "POOR":
        return "text-rose-400 font-semibold";
      default:
        return "text-primary";
    }
  };

  const recommendBorderColor = (grade) => {
    return grade === "EXCELLENT"
      ? "#34d399" // emerald-400
      : grade === "GOOD"
      ? "#38bdf8" // sky-400
      : grade === "FAIR"
      ? "#f59e0b" // amber-500
      : "#fb7185"; // rose-400
  };

  // 키 순서 계산
  const getOrderedKeys = (type, dict) => {
    const order = ORDER_KEYS[type];
    if (order && dict && order.every((k) => Object.prototype.hasOwnProperty.call(dict, k))) {
      return order;
    }
    return dict ? Object.keys(dict) : [];
  };

  // 현재 전체 keys / 현재 선택 key
  const keys = useMemo(() => getOrderedKeys(callType, separateImages), [callType, separateImages]);
  const selectedKey = useMemo(() => {
    if (!keys.length) return null;
    const useIdx = forcedPanel != null ? forcedPanel : activePanel;
    const idx = Math.max(0, Math.min(useIdx, keys.length - 1));
    return keys[idx] || null;
  }, [keys, activePanel, forcedPanel]);

  // 선택된 패널이 'portfolio_summary_table'일 때 표 데이터 로드
  useEffect(() => {
    if (!taskId) return;
    const needTable =
      (viewMode === VIEW_MODES.SINGLE && selectedKey === "portfolio_summary_table") ||
      (viewMode === VIEW_MODES.ALL_MODAL && keys.includes("portfolio_summary_table")) ||
      (viewMode === VIEW_MODES.STACKED && keys.includes("portfolio_summary_table"));
    if (!needTable) return;

    setTableLoading(true);
    setPortfolioTable(null);
    const ctrl = new AbortController();

    fetch(`${API_BASE}/analysis/table/${taskId}/portfolio_summary`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => setPortfolioTable(j.table))
      .catch(() => setPortfolioTable(null))
      .finally(() => setTableLoading(false));

    return () => ctrl.abort();
  }, [taskId, viewMode, selectedKey, keys]);

  // 인터랙티브 차트 데이터 로드 (타임시리즈 + 히트맵)
  useEffect(() => {
    if (!interactive) return;
    if (!taskId || !Array.isArray(keys) || keys.length === 0) return;

    const tsKeys = keys.filter((k) => isInteractiveSupported(k));
    const hmKeys = keys.filter((k) => HEATMAP_KEYS.has(k));
    if (tsKeys.length + hmKeys.length === 0) return;

    const aborts = new Map();

    setTsLoad((prev) => {
      const next = { ...prev };
      for (const k of tsKeys) next[k] = true;
      for (const k of hmKeys) next[k] = true;
      return next;
    });

    // 타임시리즈 병렬 로드 (+ 커스텀 corr_vs_vol 분기)
    for (const k of tsKeys) {
      const kind = SUPPORTED_TS[k];
      const ctrl = new AbortController();
      aborts.set(k, ctrl);

      const MAX_SERIES = 100;
      const url =
        kind === "corr_vs_vol"
          ? `${API_BASE}/analysis/data/${taskId}/corr_vs_vol`
          : kind === "quarterly_pairs"
          ? `${API_BASE}/analysis/data/${taskId}/quarterly_corr_pairs`
          : kind === "fx_corr_60d"
          ? `${API_BASE}/analysis/data/${taskId}/fx_corr_60d`
          : `${API_BASE}/analysis/data/${taskId}/timeseries?kind=${kind}&limit=${MAX_SERIES}`;

      fetch(url, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => setTsMap((prev) => ({ ...prev, [k]: j })))
        .catch(() => setTsMap((prev) => ({ ...prev, [k]: null })))
        .finally(() => setTsLoad((prev) => ({ ...prev, [k]: false })));
    }

    // 히트맵 병렬 로드
    for (const k of hmKeys) {
      const ctrl = new AbortController();
      aborts.set(k, ctrl);

      fetch(`${API_BASE}/analysis/data/${taskId}/corr_matrix`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => setTsMap((prev) => ({ ...prev, [k]: j })))
        .catch(() => setTsMap((prev) => ({ ...prev, [k]: null })))
        .finally(() => setTsLoad((prev) => ({ ...prev, [k]: false })));
    }

    return () => {
      for (const [, ctrl] of aborts) ctrl.abort();
    };
  }, [interactive, taskId, JSON.stringify(keys)]);

  // 차트 바깥 우상단에 '요약' 버튼을 붙이는 공통 래퍼
  const renderWithSummaryHeader = (k, inner, wide = false) => {
    return (
      <div className="mx-auto" style={{ width: wide ? "min(1200px, 96vw)" : "min(1200px, 94vw)" }}>
        {inner}
      </div>
    );
  };

  // 개별 패널을 렌더링하는 공통 함수
  const renderPanel = (k) => {
    if (k === "portfolio_summary_table") {
      return (
        <div data-pscope className="mx-auto w-full md:w-[88%]">
          <PortfolioSummaryTable data={portfolioTable} loading={tableLoading} />
        </div>
      );
    }
    if (interactive) {
      // 1) 히트맵
      if (HEATMAP_KEYS.has(k)) {
        const loading = !!tsLoad[k];
        const data = tsMap[k];
        if (loading) return <div className="p-6 text-sm opacity-70">데이터 불러오는 중...</div>;
        if (data && Array.isArray(data.labels) && Array.isArray(data.matrix)) {
          // 백엔드가 주는 매핑/표시용 라벨을 최대한 활용
          const displayLabels =
            data.display_labels || data.labels_ko || (data.code_to_name ? data.labels.map((c) => data.code_to_name[c] || c) : data.labels);
          const nameMap = data.name_map || data.code_to_name || null;

          return renderWithSummaryHeader(
            k,
            <InteractiveHeatmap labels={displayLabels || data.labels} matrix={data.matrix} dark={isDark} height={540} nameMap={nameMap} />,
            true // wide(96vw) 유지
          );
        }
        // 데이터 없으면 이미지 폴백
      }

      // 2) 타임시리즈
      if (isInteractiveSupported(k)) {
        const loading = !!tsLoad[k];
        const data = tsMap[k];

        if (loading) return <div className="p-6 text-sm opacity-70">데이터 불러오는 중...</div>;
        if (data && Array.isArray(data.series) && data.series.length) {
          if (k === "daily_return_hist") {
            return renderWithSummaryHeader(k, <InteractiveHistogram data={data} dark={isDark} height={540} chartRefCb={setChartRef(k)} />);
          }
          if (k === "sharpe_by_stock") {
            return renderWithSummaryHeader(k, <InteractiveSharpeBar data={data} dark={isDark} height={540} />);
          }
          // 기본: 라인차트
          if (k === "fx_corr_60d") {
            return renderWithSummaryHeader(k, <InteractiveFxCorr60d data={data} dark={isDark} height={560} />);
          }
          if (k === "strategy_compare") {
            return renderWithSummaryHeader(k, <InteractiveLineChart data={data} dark={isDark} height={560} enableZoom={true} />);
          }
          if (k === "cumulative_return") {
            return renderWithSummaryHeader(k, <InteractiveLineChart data={data} dark={isDark} height={560} enableZoom={true} />);
          }
          if (k === "normalized_price") {
            return renderWithSummaryHeader(k, <InteractiveLineChart data={data} dark={isDark} height={560} enableZoom={true} />);
          }
          if (k === "quarterly_corr_pairs") {
            return renderWithSummaryHeader(k, <InteractiveQuarterlyCorrPairs data={data} dark={isDark} height={560} />);
          }
          if (k === "rolling_corr_vs_vol") {
            return renderWithSummaryHeader(k, <InteractiveCorrVsVol data={data} dark={isDark} height={560} />);
          }
          if (k === "monthly_strategy_returns") {
            return renderWithSummaryHeader(k, <InteractiveMonthlyStrategyReturns data={data} dark={isDark} height={560} />);
          }
          if (k === "max_drawdown") {
            return renderWithSummaryHeader(
              k,
              <InteractiveDrawdownChart data={data} dark={isDark} height={560} chartRefCb={setChartRef(k)} />
            );
          }
          if (k === "risk_return_profile" || k === "risk_return") {
            return renderWithSummaryHeader(k, <InteractiveRiskReturnScatter data={data} dark={isDark} height={560} />);
          }
          return renderWithSummaryHeader(k, <InteractiveLineChart data={data} dark={isDark} height={540} />);
        }
      }
    }

    // 기본: 기존 이미지 표시
    return (
      <div className="mx-auto" style={{ width: "min(1100px, 94vw)" }}>
        <ZoomableImage key={separateImages[k]} src={separateImages[k]} alt={k} maxWidth="1100px" widthPercent={92} />
      </div>
    );
  };

  const loadChart = async (type) => {
    if (loading || isCallingApi.current) return;

    // 초기화
    setChartUrl("");
    setCroppedUrl("");
    setSeparateImages(null);
    setActivePanel(0);
    setForcedPanel(null);
    setPortfolioTable(null);
    setTableLoading(false);
    setIsModalOpen(false);
    setModalIndex(0);

    setAliasType(type);
    setCallType(type);

    try {
      isCallingApi.current = true;
      setLoading(true);

      const kind = type === "correlation" ? "correlation_heatmap" : type;
      let url = `${API_BASE_URL}/analysis/chart/${taskId}/${kind}`;
      const qs = new URLSearchParams();

      if (["basic", "advanced", "performance", "ml"].includes(kind)) {
        qs.set("separate", "true");
      }

      // 토글 직후에도 정확한 테마를 반영하도록, 항상 최신 상태로 재계산
      const isDarkNow = isDark;
      qs.set("theme", isDarkNow ? "dark" : "light");
      qs.set("_", Date.now().toString()); // 캐시 버스터(중복 제거)

      url += `?${qs.toString()}`;
      let res = await fetch(url);

      // 상관관계 엔드포인트가 없는 경우 대비 Fallback
      if (!res.ok && type === "correlation") {
        const fbQs = new URLSearchParams({ separate: "true", theme: isDarkNow ? "dark" : "light" });
        const fb = `${API_BASE}/analysis/chart/${taskId}/basic?${fbQs.toString()}`;
        const fbRes = await fetch(fb);
        if (!fbRes.ok) throw new Error(`HTTP ${res.status} & fallback ${fbRes.status}`);
        const fbData = await fbRes.json();
        if (fbData.images) {
          setSeparateImages(fbData.images);
          const idx = (ORDER_KEYS.basic || []).indexOf("corr_matrix");
          setForcedPanel(idx >= 0 ? idx : 1);
        } else if (fbData.image) {
          setChartUrl(fbData.image);
        }
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.error) {
        console.warn("[ML] 서버 오류:", data.error);
      }

      if (data.images) {
        setSeparateImages(data.images);
      } else if (data.image) {
        setChartUrl(data.image);
      }
    } catch (e) {
      console.error("차트 로드 실패:", e);
    } finally {
      setLoading(false);
      isCallingApi.current = false;
    }
  };

  // (구 모드 호환) 하나의 큰 이미지에서 특정 패널 잘라내기
  const cropPanelToDataUrl = async (imgUrl, rows, cols, index) => {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = imgUrl;
    });

    const w = img.naturalWidth,
      h = img.naturalHeight;
    if (!w || !h) return imgUrl;

    const cellW = Math.floor(w / cols);
    const cellH = Math.floor(h / rows);
    const r = Math.floor(index / cols);
    const c = index % cols;

    const sx = c * cellW,
      sy = r * cellH;

    const canvas = document.createElement("canvas");
    canvas.width = cellW;
    canvas.height = cellH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
    return canvas.toDataURL("image/png");
  };

  // 단일 이미지 fallback용 크롭
  useEffect(() => {
    (async () => {
      if (!chartUrl || !callType) return;
      const meta = PANEL_META[callType];
      if (!meta) {
        setCroppedUrl(chartUrl);
        return;
      }

      const useIdx = forcedPanel != null ? forcedPanel : activePanel;
      const total = meta.rows * meta.cols;
      const idx = Math.max(0, Math.min(useIdx, total - 1));

      const url = await cropPanelToDataUrl(chartUrl, meta.rows, meta.cols, idx);
      setCroppedUrl(url);

      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    })();
  }, [chartUrl, callType, activePanel, forcedPanel]);

  const Header = () => (
    <div ref={chartContainerRef} className="flex items-center justify-between mb-4 space-y-8">
      <h3 className="text-2xl font-bold text-primary">분석 차트</h3>

      {/* 오른쪽: 좌=상세보기 버튼, 우=아이콘 묶음 */}
      <div className="flex items-center gap-3">
        {/* 상세보기 토글 버튼 */}
        <button
          type="button"
          onClick={() => setInteractive((v) => !v)}
          aria-pressed={interactive}
          title="탐색 모드"
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition border
            ${
              interactive
                ? "bg-[var(--seg-active-bg)] text-[var(--seg-active-text)] border-[var(--seg-active-bg)] shadow-[0_0_0_3px_rgba(56,189,248,0.25)]"
                : "bg-[var(--seg-bg)] text-[var(--seg-text)] border-[var(--seg-border)] hover:bg-[var(--seg-hover-bg)] hover:text-[var(--seg-hover-text)]"
            }`}
        >
          <span className="font-medium leading-none">탐색 모드</span>
          <span
            aria-hidden="true"
            className={`w-2.5 h-2.5 rounded-full shrink-0
              ${interactive ? "bg-emerald-400 shadow-[0_0_6px_2px_rgba(16,185,129,0.55)]" : "bg-slate-400/40"}`}
          />
        </button>

        {/* 아이콘 묶음 */}
        <div className="inline-flex items-center rounded-full border p-1 bg-[var(--seg-bg)] border-[var(--seg-border)] text-[var(--seg-text)]">
          <button
            onClick={() => setViewMode(VIEW_MODES.SINGLE)}
            className={`px-3 py-1.5 text-xs rounded-full ${
              viewMode === VIEW_MODES.SINGLE
                ? "bg-[var(--seg-active-bg)] text-[var(--seg-active-text)]"
                : "text-[var(--seg-inactive-text)] hover:text-[var(--seg-hover-text)]"
            }`}
            title="선택 보기"
            aria-label="선택 보기"
          >
            <span className="sr-only">선택 보기</span>
            <Square className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setViewMode(VIEW_MODES.ALL_MODAL)}
            className={`px-3 py-1.5 text-xs rounded-full ${
              viewMode === VIEW_MODES.ALL_MODAL
                ? "bg-[var(--seg-active-bg)] text-[var(--seg-active-text)]"
                : "text-[var(--seg-inactive-text)] hover:text-[var(--seg-hover-text)]"
            }`}
            title="모두 보기(모달)"
            aria-label="모두 보기(모달)"
          >
            <span className="sr-only">모두 보기(모달)</span>
            <LayoutGrid className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setViewMode(VIEW_MODES.STACKED)}
            className={`px-3 py-1.5 text-xs rounded-full ${
              viewMode === VIEW_MODES.STACKED
                ? "bg-[var(--seg-active-bg)] text-[var(--seg-active-text)]"
                : "text-[var(--seg-inactive-text)] hover:text-[var(--seg-hover-text)]"
            }`}
            title="세로 나열"
            aria-label="세로 나열"
          >
            <span className="sr-only">세로 나열</span>
            <VerticalStackIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  const btn = (from, to) =>
    `group relative p-4 rounded-xl hover:shadow-2xl transition-all duration-300 transform
     bg-gradient-to-br ${from} ${to} hover:scale-105 hover:shadow-black/20 text-primary`;

  // ───────────────────────── 모달 핸들링 ─────────────────────────

  // 슬라이드 시작
  const startSlide = (dir, nextIdx) => {
    setPrevModalIndex(modalIndex);
    setModalIndex(nextIdx);
    setSlideDir(dir);
    setSlideGo(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setSlideGo(true);
        if (SLIDE_MS <= 0) {
          setPrevModalIndex(null);
          setSlideDir(null);
          setSlideGo(false);
        }
      })
    );
  };

  const openModalAt = (idx) => {
    setModalIndex(idx);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setModalShown(false);
    setIsModalOpen(false);
    setPrevModalIndex(null);
    setSlideDir(null);
    setSlideGo(false);
  };

  const goNext = () => {
    if (!keys.length) return;
    const ni = (modalIndex + 1) % keys.length;
    startSlide("next", ni);
  };

  const goPrev = () => {
    if (!keys.length) return;
    const pi = (modalIndex - 1 + keys.length) % keys.length;
    startSlide("prev", pi);
  };

  const handleSlideEnd = () => {
    if (!slideDir) return;
    setPrevModalIndex(null);
    setSlideDir(null);
    setSlideGo(false);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const t = setTimeout(() => setModalShown(true), 10);
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [isModalOpen, keys.length]);

  // ✅ 새로운 차트가 로딩 완료되면 스크롤
  useEffect(() => {
    if (!loading && (separateImages || chartUrl || croppedUrl) && chartContainerRef.current) {
      chartContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading, separateImages, chartUrl, croppedUrl]);

  // ⬇ 완전 슬라이드
  const SLIDE_MS = 420;
  const SLIDE_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";
  const baseSlideStyle = {
    willChange: "transform, opacity",
    transition: slideDir ? (SLIDE_MS > 0 ? `transform ${SLIDE_MS}ms ${SLIDE_EASING}, opacity ${SLIDE_MS}ms ease` : "none") : undefined,
  };
  const getPrevStyle = () => {
    if (prevModalIndex === null || !slideDir) return {};
    const toX = slideDir === "next" ? "-100%" : "100%";
    return { ...baseSlideStyle, transform: `translateX(${slideGo ? toX : "0%"})`, opacity: slideGo ? 0.4 : 1 };
  };
  const getCurrStyle = () => {
    if (prevModalIndex === null || !slideDir) return {};
    const fromX = slideDir === "next" ? "100%" : "-100%";
    return { ...baseSlideStyle, transform: `translateX(${slideGo ? "0%" : fromX})`, opacity: slideGo ? 1 : 0.4 };
  };

  // ───────────────────────── v54 스타일의 요약 오버레이 렌더러 ─────────────────────────
  const renderSummaryOverlay = (anchorKey, positionClass) => {
    if (!summaryOpen || !summaryData) return null;
    const t = callTypeRef.current || callType;
    if (summaryMeta?.type !== t || summaryMeta?.key !== anchorKey) return null;

    return (
      <div
        className={`summary-overlay ${isDark ? "theme-dark dark" : "theme-light light"} absolute ${positionClass}
                    z-20 w-80 rounded-xl shadow-2xl border backdrop-blur`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold">{summaryTitle}</h4>
            <button type="button" onClick={() => setSummaryOpen(false)} className="close-btn p-1 rounded" aria-label="Close summary">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6L18 18M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* ML 예측 요약 */}
          <section className="mb-3">
            <p className="summary-title text-xs font-semibold mb-2">AI 예측 요약</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="muted">예측 등급</span>
                <span className={getGradeClass(mlStatus?.grade)}>{mlStatus?.grade ?? "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">IC Score</span>
                <span className="font-medium">{typeof mlStatus?.ic === "number" ? mlStatus.ic.toFixed(3) : "0.000"}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">적중률</span>
                <span className="font-medium">{((mlStatus?.hitRate ?? 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">투자 추천</span>
                <span className="font-medium">{(mlStatus?.ic ?? 0) > 0.05 ? "투자 권장" : "투자 보류"}</span>
              </div>
            </div>
          </section>

          {/* 전체 분석 요약 */}
          <section className="mb-3">
            <p className="summary-title text-xs font-semibold mb-2">전체 분석 요약</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="muted">분석 종목</span>
                <span className="font-medium">{summaryData?.basic?.items?.[1]?.value ?? "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">평균 상관</span>
                <span className="font-medium">{summaryData?.basic?.items?.[2]?.value ?? "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">최적 전략</span>
                <span className="font-medium">{summaryData?.performance?.items?.[0]?.value ?? "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">AI 예측</span>
                <span className={getGradeClass(mlStatus?.grade)}>{mlStatus?.grade ?? "N/A"}</span>
              </div>
            </div>
          </section>

          {/* 추천 박스 */}
          <section>
            <div
              className="recommend-box rounded p-3"
              style={{ borderLeft: `4px solid ${recommendBorderColor(mlStatus?.grade || "POOR")}` }}
            >
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">투자 추천</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {(mlStatus?.ic ?? 0) > 0.05 ? "투자 권장 - AI 예측 신뢰도가 양호합니다." : "투자 비권장 - AI 예측 신뢰도가 낮습니다."}
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Header />

      {/* 상단 타입 버튼들 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-2">
        <button onClick={() => loadChart("basic")} className={btn("from-[var(--gradient-blue-start)]", "to-[var(--gradient-blue-end)]")}>
          <span className="block text-center font-bold">기본 분석</span>
        </button>
        <button
          onClick={() => loadChart("advanced")}
          className={btn("from-[var(--gradient-purple-start)]", "to-[var(--gradient-purple-end)]")}
        >
          <span className="block text-center font-bold">고급 분석</span>
        </button>
        <button
          onClick={() => loadChart("correlation")}
          className={btn("from-[var(--gradient-green-start)]", "to-[var(--gradient-green-end)]")}
        >
          <span className="block text-center font-bold">상관관계</span>
        </button>
        <button
          onClick={() => loadChart("performance")}
          className={btn("from-[var(--gradient-pink-start)]", "to-[var(--gradient-pink-end)]")}
        >
          <span className="block text-center font-bold">성과 분석</span>
        </button>
        <button
          onClick={() => loadChart("ml")}
          className={btn("from-[var(--gradient-blue-start)]", "via-[var(--gradient-purple-start)] to-[var(--gradient-pink-end)]")}
        >
          <span className="inline-flex items-center justify-center font-bold">
            <div className="w-5 h-5" /> ML 예측
          </span>
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {/* SINGLE 모드 */}
      {!loading && separateImages && viewMode === VIEW_MODES.SINGLE && (
        <div
          ref={containerRef}
          data-chart-card
          className={`relative p-6 rounded-xl border ${isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-white/70 border-slate-200/70"}`}
        >
          <SummaryButton
            className="absolute top-3 right-3 z-10"
            onClick={() => openSummary(callTypeRef.current || callType, selectedKey)}
          />
          {/* v54 요약 오버레이 */}
          {renderSummaryOverlay(selectedKey, "top-14 right-3")}

          {keys.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {keys.map((k, i) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setForcedPanel(null);
                    setActivePanel(i);
                  }}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors duration-200
                    ${
                      i === activePanel
                        ? "bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] border-[var(--pill-active-border)]"
                        : "bg-[var(--pill-bg)] text-[var(--pill-text)] border-[var(--pill-border)] hover:bg-[var(--pill-hover-bg)] hover:text-[var(--pill-hover-text)]"
                    }`}
                  title={k}
                >
                  {PANEL_META[callType]?.titles?.[i] ?? (typeof k === "string" ? LABELS[k] || k : k)}
                </button>
              ))}
            </div>
          )}

          {/* 선택된 패널 */}
          {selectedKey === "portfolio_summary_table" ? (
            <div data-pscope className="mx-auto w-full md:w-[88%]">
              <PortfolioSummaryTable data={portfolioTable} loading={tableLoading} />
            </div>
          ) : (
            <div className="mx-auto w-full md:w-[80%]">{renderPanel(selectedKey)}</div>
          )}
        </div>
      )}

      {/* ALL_MODAL 모드(그리드) */}
      {!loading && separateImages && viewMode === VIEW_MODES.ALL_MODAL && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {keys.map((k, idx) => (
              <div
                data-chart-card
                key={k}
                className={`relative p-4 rounded-xl border cursor-pointer group ${
                  isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-white/70 border-slate-200/70"
                }`}
                onClick={() => openModalAt(idx)}
              >
                <SummaryButton
                  className="absolute top-2 right-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSummary(callTypeRef.current || callType, k);
                  }}
                />
                {/* 요약 오버레이 */}
                {renderSummaryOverlay(k, "top-12 right-2")}

                <div className="text-xs text-slate-400 mb-2 font-medium">{PANEL_META[callType]?.titles?.[idx] ?? (LABELS[k] || k)}</div>

                {k === "portfolio_summary_table" ? (
                  <div data-pscope className="h-[320px] overflow-auto rounded-lg border border-slate-700/40 bg-slate-900/40">
                    <PortfolioSummaryTable data={portfolioTable} loading={tableLoading} />
                  </div>
                ) : (
                  <img
                    src={separateImages[k]}
                    alt={k}
                    className="w-full h-[300px] object-contain rounded-lg shadow transition-transform group-hover:scale-[1.01]"
                  />
                )}
              </div>
            ))}
          </div>

          {/* MODAL */}
          {isModalOpen &&
            Array.isArray(keys) &&
            keys.length > 0 &&
            (() => {
              const currentKey = keys[modalIndex];

              return (
                <>
                  {/* 오버레이 */}
                  <div
                    className={`fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px] transition-opacity duration-500 ${
                      modalShown ? "opacity-100" : "opacity-0"
                    }`}
                    onClick={closeModal}
                    aria-hidden="true"
                  />

                  {/* 모달 콘텐츠 */}
                  <div
                    className={`fixed z-[101] modal-pop ${modalShown ? "enter-active" : "enter"}`}
                    style={{ left: "50%", top: "50%" }}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div
                      className={`relative rounded-2xl ${
                        isDark ? "theme-dark dark" : "theme-light light"
                      } bg-white text-slate-800 shadow-2xl p-3 allcharts-modal-panel`}
                    >
                      <div className="slide-viewport" style={{ maxWidth: "96vw", maxHeight: "88vh" }}>
                        <div className="relative">
                          {/* 나가는 레이어 */}
                          {prevModalIndex !== null && (
                            <div className="absolute inset-0 grid place-items-center overflow-hidden" style={getPrevStyle()}>
                              {renderPanel(keys[prevModalIndex])}
                            </div>
                          )}
                          {/* 들어오는/현재 레이어 */}
                          <div
                            className="relative grid place-items-center overflow-hidden"
                            style={getCurrStyle()}
                            onTransitionEnd={handleSlideEnd}
                          >
                            {renderPanel(currentKey)}
                          </div>
                        </div>
                      </div>

                      {/* 좌/우 네비게이션 */}
                      {keys.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              goPrev();
                            }}
                            className="absolute top-1/2 -translate-y-1/2 left-[-56px] md:left-[-72px] text-white hover:text-white/90 focus:outline-none"
                            aria-label="Previous"
                          >
                            <svg viewBox="0 0 56 56" className="w-12 md:w-16 h-12 md:h-16 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
                              <path
                                d="M34 10 L20 28 L34 46"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              goNext();
                            }}
                            className="absolute top-1/2 -translate-y-1/2 right-[-56px] md:right-[-72px] text-white hover:text-white/90 focus:outline-none"
                            aria-label="Next"
                          >
                            <svg viewBox="0 0 56 56" className="w-12 md:w-16 h-12 md:h-16 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
                              <path
                                d="M22 10 L36 28 L22 46"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 닫기(X) 버튼 */}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="fixed right-6 top-6 z-[102] text-white hover:text-white/90 focus:outline-none"
                    aria-label="Close modal"
                  >
                    <svg viewBox="0 0 60 60" className="w-10 h-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
                      <path
                        d="M15 15 L45 45 M45 15 L15 45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              );
            })()}
        </>
      )}

      {/* STACKED 모드 */}
      {!loading && separateImages && viewMode === VIEW_MODES.STACKED && (
        <div className="flex flex-col gap-6">
          {keys.map((k, i) =>
            k === "portfolio_summary_table" ? (
              <div
                key={k}
                data-chart-card
                className={`relative p-6 rounded-xl border${
                  isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-white/70 border-slate-200/70"
                }`}
              >
                <SummaryButton className="absolute top-3 right-3 z-10" onClick={() => openSummary(callTypeRef.current || callType, k)} />
                {/* v54 요약 오버레이 */}
                {renderSummaryOverlay(k, "top-14 right-3")}
                <div data-pscope className="mx-auto w-full md:w-[88%]">
                  <h4 className="text-sm mb-3 text-secondary">{LABELS[k] || "표"}</h4>
                  <PortfolioSummaryTable data={portfolioTable} loading={tableLoading} />
                </div>
              </div>
            ) : (
              <div
                key={k}
                data-chart-card
                className={`relative p-6 rounded-xl border ${
                  isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-white/70 border-slate-200/70"
                }`}
              >
                <SummaryButton className="absolute top-3 right-3 z-10" onClick={() => openSummary(callTypeRef.current || callType, k)} />
                {/* 오버레이 */}
                {renderSummaryOverlay(k, "top-14 right-3")}
                <div className="mx-auto w-full md:w-[80%]">
                  <h4 className="text-sm mb-3 text-secondary">{PANEL_META[callType]?.titles?.[i] ?? (LABELS[k] || k)}</h4>
                  {renderPanel(k)}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* fallback: 단일*/}
      {!loading && !separateImages && croppedUrl && (
        <div
          ref={containerRef}
          className={`p-6 rounded-xl border ${isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-white/70 border-slate-200/70"}`}
        >
          <div className="mx-auto w-full md:w-[80%]">
            <img src={croppedUrl} alt="chart" className="w-full h-auto rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

      {/* correlation 단일 이미지 대응 */}
      {!loading && aliasType === "correlation" && !separateImages && chartUrl && (
        <div className={`p-6 rounded-xl border ${isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-white/70 border-slate-200/70"}`}>
          <div className="mx-auto w-full md:w-[80%]">
            <img src={chartUrl} alt="heatmap" className="w-full h-auto rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
