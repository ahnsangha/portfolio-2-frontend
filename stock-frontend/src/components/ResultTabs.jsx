// src/components/ResultTabs.jsx
import { useEffect, useState, useRef } from 'react';
import { BarChart2, BarChart3, TrendingUp, Layers, AlertTriangle } from 'lucide-react';
import SummaryTab from './tabs/SummaryTab';
import ChartTab from './tabs/ChartTab';
import PerformanceTab from './tabs/PerformanceTab';
import CorrelationTab from './tabs/CorrelationTab';
import { API_BASE_URL } from '../constants';
import '../styles/analysis-mode.css';

export default function ResultTabs({ taskId, onAnalysisComplete }) {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    // URL에 유효한 탭 ID가 없으면 'summary'를 기본값으로 사용합니다.
    const validTabs = ['summary', 'charts', 'performance', 'correlation'];
    return validTabs.includes(hash) ? hash : 'summary';
  });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [serverHealth, setServerHealth] = useState('pending');
  
  // 분석이 완료되었는지 추적하기 위한 ref
  const analysisCompletedRef = useRef(false);

  // Effect 1: 상태(status)를 주기적으로 폴링합니다.
  useEffect(() => {
    if (!taskId) return;

    // taskId가 바뀌면 상태를 초기화합니다.
    setStatus(null);
    setResult(null);
    setError(null);
    analysisCompletedRef.current = false;

    const intervalId = setInterval(async () => {
      // 이미 완료되었거나 에러가 발생했으면 폴링을 중단합니다.
      if (analysisCompletedRef.current) {
        clearInterval(intervalId);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/analysis/status/${taskId}`);
        if (!response.ok) throw new Error(`서버 상태 확인 실패 (HTTP ${response.status})`);
        
        const data = await response.json();
        setStatus(data);

        if (data.status === 'completed' || data.status === 'failed') {
          analysisCompletedRef.current = true; // 완료 상태로 변경
          clearInterval(intervalId);
        }
      } catch (err) {
        setError(err.message);
        analysisCompletedRef.current = true; // 에러 발생 시에도 완료로 처리
        clearInterval(intervalId);
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [taskId]);

  // Effect 2: 서버 연결 상태(health)를 주기적으로 확인 
  useEffect(() => {
    if (!taskId || analysisCompletedRef.current) return;

    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (res.ok) {
          setServerHealth('healthy');
        } else {
          throw new Error('Server unhealthy');
        }
      } catch {
        setServerHealth('unhealthy');
      }
    };

    checkHealth(); // 즉시 1회 실행
    const healthInterval = setInterval(checkHealth, 5000); // 5초마다 상태 확인

    return () => clearInterval(healthInterval);
  }, [taskId, status]);


  // Effect 3: status가 'completed'로 변경되면 최종 결과 로딩
  useEffect(() => {
    if (status?.status === 'completed' && !result) {
      const fetchResult = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/analysis/result/${taskId}`);
          if (!response.ok) throw new Error(`최종 결과 로딩 실패 (HTTP ${response.status})`);
          const data = await response.json();
          setResult(data);
          onAnalysisComplete?.();
        } catch (err) {
          setError(err.message);
        }
      };
      fetchResult();
    } else if (status?.status === 'failed') {
      setError(status.message || '알 수 없는 오류로 분석에 실패했습니다.');
    }
  }, [status, taskId, result, onAnalysisComplete]);

  // 로딩 UI
  if (!result && !error) {
    const progress = status ? Math.round(status.progress * 100) : 0;
    
    // 서버 상태에 따른 UI 분기 처리
    const serverStatusInfo = {
      healthy: { text: '서버 연결 양호', color: 'text-green-400', pulseColor: 'bg-green-400' },
      unhealthy: { text: '서버 연결 불안정', color: 'text-red-400', pulseColor: 'bg-red-400' },
      pending: { text: '서버 연결 중...', color: 'text-yellow-400', pulseColor: 'bg-yellow-400' },
    };
    const currentServerStatus = serverStatusInfo[serverHealth];

    return (
      <div className="text-center p-8 bg-panel bg-panel-dark backdrop-blur-xl rounded-2xl shadow-2xl border border-panel text-primary">
        <h3 className="text-xl font-bold mb-2">{status?.message || '분석 준비 중...'}</h3>
        {status?.current_stock && (
          <p className="text-lg text-gray-400 mb-4">{status.current_stock}</p>
        )}
        
        {/* 진행률 바에 빛나는 효과(shimmer) 추가 */}
        <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden relative shimmer-container">
          <div 
            className="bg-blue-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-2 text-sm">
          {/* 서버 상태 표시등 UI  */}
          <div className={`flex items-center gap-2 ${currentServerStatus.color}`}>
            <span className={`relative flex h-3 w-3`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentServerStatus.pulseColor} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${currentServerStatus.pulseColor}`}></span>
            </span>
            <span>{currentServerStatus.text}</span>
          </div>
          <span className="text-gray-300">{progress}% 완료</span>
        </div>
      </div>
    );
  }
  // 에러 UI: 에러가 발생하면 최우선으로 표시됩니다.
  if (error) {
    return (
      <div className="bg-panel bg-panel-dark backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-panel text-primary">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <span className="font-semibold">{error}</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-primary"
        >
          새로고침
        </button>
      </div>
    );
  }

  // 결과 UI: result가 성공적으로 로드되면 표시됩니다.
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
            onClick={() => handleTabClick(tab.id)}
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

      <div>
        {activeTab === 'summary' && result?.basic_stats && <SummaryTab data={result.basic_stats} />}
        {activeTab === 'charts' && <ChartTab taskId={taskId} />}
        {activeTab === 'performance' && result?.performance_summary && <PerformanceTab data={result.performance_summary} />}
        {activeTab === 'correlation' && result?.correlation_matrix && <CorrelationTab data={result.correlation_matrix} />}
      </div>
    </div>
  );
}