// components/ResultTabs.jsx

import { useEffect, useState } from 'react';
import { BarChart2, BarChart3, TrendingUp, Layers, AlertTriangle } from 'lucide-react';
import SummaryTab from './tabs/SummaryTab';
import ChartTab from './tabs/ChartTab';
import PerformanceTab from './tabs/PerformanceTab';
import CorrelationTab from './tabs/CorrelationTab';
import { API_BASE_URL } from '../constants';
import '../styles/analysis-mode.css';

export default function ResultTabs({ taskId, onAnalysisComplete }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  // ✅ 1. 상태 폴링과 결과 페칭 로직을 하나의 useEffect로 통합합니다.
  useEffect(() => {
    // taskId가 없으면 아무 작업도 하지 않습니다.
    if (!taskId) return;

    // 컴포넌트가 마운트될 때 상태를 초기화합니다.
    setResult(null);
    setStatus(null);
    setError(null);

    // ✅ 2. '/analysis/status'를 주기적으로 호출하는 인터벌을 설정합니다.
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analysis/status/${taskId}`);
        if (!response.ok) {
          throw new Error(`서버 상태 확인 실패 (HTTP ${response.status})`);
        }
        
        const data = await response.json();
        setStatus(data); // 실시간 상태 업데이트

        // ✅ 3. 분석이 완료되면 인터벌을 멈추고 최종 결과를 가져옵니다.
        if (data.status === 'completed') {
          clearInterval(intervalId);
          
          const resultResponse = await fetch(`${API_BASE_URL}/analysis/result/${taskId}`);
          if (!resultResponse.ok) {
            throw new Error(`최종 결과 로딩 실패 (HTTP ${resultResponse.status})`);
          }
          const resultData = await resultResponse.json();
          setResult(resultData);
          onAnalysisComplete?.(); // 상위 컴포넌트에 완료 알림
        }

        // 분석이 실패하면 인터벌을 멈추고 에러 상태를 설정합니다.
        if (data.status === 'failed') {
          clearInterval(intervalId);
          setError(data.message || '알 수 없는 오류로 분석에 실패했습니다.');
        }

      } catch (err) {
        setError(err.message);
        clearInterval(intervalId);
      }
    }, 1500); // 1.5초마다 상태 확인

    // 컴포넌트가 언마운트될 때 인터벌을 정리합니다.
    return () => clearInterval(intervalId);
  }, [taskId, onAnalysisComplete]);


  // ✅ 4. 로딩 UI: result가 아직 없고, 에러도 없을 때 표시됩니다.
  if (!result && !error) {
    const progress = status ? Math.round(status.progress * 100) : 0;
    
    return (
      <div className="text-center p-8 bg-panel bg-panel-dark backdrop-blur-xl rounded-2xl shadow-2xl border border-panel">
        <h3 className="text-xl font-bold mb-2">{status?.message || '분석 준비 중...'}</h3>
        {status?.current_stock && (
          <p className="text-lg text-gray-400 mb-4">{status.current_stock}</p>
        )}
        <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-blue-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="mt-2 text-sm text-gray-300">{progress}% 완료</p>
      </div>
    );
  }

  // ✅ 5. 에러 UI: 에러가 발생했을 때 최우선으로 표시됩니다.
  if (error) {
    return (
      <div className="bg-panel bg-panel-dark backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-panel text-primary">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <span className="font-semibold">{error}</span>
        </div>
        <button
          onClick={() => window.location.reload()} // 간단하게 페이지 새로고침으로 재시도
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-primary"
        >
          새로고침
        </button>
      </div>
    );
  }

  // ✅ 6. 결과 UI: result가 성공적으로 로드되었을 때 표시됩니다.
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

      <div>
        {activeTab === 'summary' && result?.basic_stats && <SummaryTab data={result.basic_stats} />}
        {activeTab === 'charts' && <ChartTab taskId={taskId} />}
        {activeTab === 'performance' && result?.performance_summary && <PerformanceTab data={result.performance_summary} />}
        {activeTab === 'correlation' && result?.correlation_matrix && <CorrelationTab data={result.correlation_matrix} />}
      </div>
    </div>
  );
}