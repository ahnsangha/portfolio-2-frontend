// components/ApiInfo.jsx
import { useEffect, useState } from 'react';
import { Database, FileText } from 'lucide-react';
import { API_BASE_URL } from '../constants';

// API 기본 URL 설정 (라이브 서버에서는 필요 X)
// const API_BASE_URL = 'http://localhost:8000';

export default function ApiInfo() {
  const [status, setStatus] = useState('확인 중...');
  const [color, setColor] = useState('text-secondary');
  const [pulse, setPulse] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialCheck, setIsInitialCheck] = useState(true);

  useEffect(() => {
    let timeoutId = null;

    const checkConnection = async () => {
      // 첫 확인 시 3초 이상 걸리면 "서버 준비 중" 메시지 표시
      if (isInitialCheck) {
        timeoutId = setTimeout(() => {
          setStatus('서버 준비 중... (최대 30초 소요)');
          setColor('text-info'); // 정보 색상으로 변경
          setPulse(true);
        }, 3000);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        setStatus(`연결됨 (활성 작업: ${data.active_tasks || 0})`);
        setColor('text-accent');
        setPulse(true);
        setError(null);
      } catch (err) {
        setStatus('연결 실패');
        setColor('text-danger');
        setPulse(false);
        setError(err.message);
      } finally {
        // 타임아웃 클리어 및 초기 확인 상태 해제
        if (isInitialCheck) {
          clearTimeout(timeoutId);
          setIsInitialCheck(false);
        }
      }
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 10000); // 확인 주기 10초로 변경
    return () => {
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // 초기 1회만 실행

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-accent" />
          <h3 className="text-xl font-semibold text-primary">시스템 상태</h3>
        </div>

        <div className={`inline-flex items-center gap-1 ${color} opacity-70 text-xs pr-1`}>
          <span className={`inline-block rounded-full ${pulse ? 'bg-accent' : 'bg-danger'}`} style={{ width: '6px', height: '6px' }} />
          <span className="leading-none">{status}</span>
        </div>
      </div>

      {/* 오류 메시지(있을 때만) */}
      {error && (
        <div className="mt-3 text-sm text-danger bg-red-900/20 p-2 rounded">
          오류: {error}
        </div>
      )}

      {/* Swagger / ReDoc 링크 (기존처럼 왼쪽 정렬) */}
      <div className="mt-3 flex items-center gap-4">
        <a
          className="inline-flex items-center gap-2 text-accent hover:text-secondary transition-colors duration-200 group"
          href={`${API_BASE_URL}/docs`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileText className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span>Swagger UI</span>
        </a>
        <a
          className="inline-flex items-center gap-2 text-accent hover:text-secondary transition-colors duration-200 group"
          href={`${API_BASE_URL}/redoc`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileText className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span>ReDoc</span>
        </a>
      </div>
    </div>
  );
}
