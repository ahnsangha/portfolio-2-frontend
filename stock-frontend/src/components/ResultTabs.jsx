// components/ResultTabs.jsx
import { useEffect, useState, useRef } from 'react';
import { BarChart2, BarChart3, TrendingUp, Layers, AlertTriangle } from 'lucide-react';
import SummaryTab from './tabs/SummaryTab';
import ChartTab from './tabs/ChartTab';
import PerformanceTab from './tabs/PerformanceTab';
import CorrelationTab from './tabs/CorrelationTab';
import '../styles/analysis-mode.css';

export default function ResultTabs({ taskId, onAnalysisComplete }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const hasCompletedRef = useRef(false);

  const stopPolling = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  };

  const scheduleNext = (currentTaskId, delay = 1200) => {
    timerRef.current = setTimeout(() => pollResult(currentTaskId), delay);
  };

  const pollResult = async (currentTaskId) => {
    // 이전 요청 정리 후 새 요청
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`http://localhost:8000/analysis/result/${currentTaskId}`, {
        signal: abortRef.current.signal,
      });

      // 404 → 세션 만료/없는 taskId. 스피너 종료 + 안내
      if (res.status === 404) {
        stopPolling();
        setLoading(false);
        setResult(null);
        setError('분석 세션이 만료되었거나 존재하지 않습니다. "분석 시작"으로 다시 실행해 주세요.');
        return;
      }

      // 202 → 처리 중. 계속 폴링
      if (res.status === 202) {
        setError(null);
        setLoading(true);
        scheduleNext(currentTaskId);
        return;
      }

      if (!res.ok) {
        stopPolling();
        setLoading(false);
        setError(`오류가 발생했습니다. (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      setError(null);
      setResult(data);

      if (data.status === 'completed') {
        stopPolling();
        if (!hasCompletedRef.current) {
          onAnalysisComplete?.();
          hasCompletedRef.current = true;
        }
        setLoading(false);
      } else {
        // 혹시 다른 상태면 계속 폴링
        setLoading(true);
        scheduleNext(currentTaskId);
      }
    } catch (e) {
      if (e.name === 'AbortError') return; // 정상 정리
      stopPolling();
      setLoading(false);
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  // taskId 변경 시 폴링 시작/정리
  useEffect(() => {
    stopPolling();
    setResult(null);
    setError(null);
    hasCompletedRef.current = false;

    if (!taskId) return;

    setLoading(true);
    pollResult(taskId);

    return () => {
      stopPolling();
      hasCompletedRef.current = false;
    };
  }, [taskId]);

  // 에러 우선 표시 (이전에 spinner로 가려지던 문제 해결)
  if (error) {
    return (
      <div className="bg-panel bg-panel-dark backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-panel mb-8 text-primary">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <span className="font-semibold">{error}</span>
        </div>
        <button
          onClick={() => {
            // 재시작 유도: 상위에서 taskId를 새로 받도록 보통 '분석 시작' 버튼을 누르게 함
            setError(null);
            if (taskId) {
              stopPolling();
              setLoading(true);
              pollResult(taskId);
            }
          }}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-primary"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 로딩 또는 아직 결과 없음 → 스피너
  if (loading || !result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
        <p className="text-secondary text-lg">분석 결과를 불러오는 중입니다...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'summary', label: '요약', icon: BarChart2 },
    { id: 'charts', label: '차트', icon: BarChart3 },
    { id: 'performance', label: '성과', icon: TrendingUp },
    { id: 'correlation', label: '상관관계', icon: Layers },
  ];

  return (
    <div className="bg-panel bg-panel-dark backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-panel mb-8 text-primary">
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              group flex items-center space-x-2 px-6 py-3 font-semibold rounded-xl transition-all duration-300
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-[var(--color-tab-active-gradient-start)] to-[var(--color-tab-active-gradient-end)] text-[var(--color-tab-active-text)] shadow-lg'
                : 'bg-[var(--color-tab-inactive-bg)] text-[var(--color-tab-inactive-text)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-tab-inactive-hover-bg)]'
              }
            `}
          >
            <tab.icon className="w-5 h-5 transition-transform" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="">
        {activeTab === 'summary' && result.basic_stats && (
          <div>
            <SummaryTab data={result.basic_stats} />
          </div>
        )}
        {activeTab === 'charts' && (
          <div>
            <ChartTab taskId={taskId} />
          </div>
        )}
        {activeTab === 'performance' && result.performance_summary && (
          <div>
            <PerformanceTab data={result.performance_summary} />
          </div>
        )}
        {activeTab === 'correlation' && result.correlation_matrix && (
          <div>
            <CorrelationTab data={result.correlation_matrix} />
          </div>
        )}
      </div>

      <div className="pb-1" />
    </div>
  );
}