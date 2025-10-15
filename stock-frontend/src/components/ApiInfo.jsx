// components/ApiInfo.jsx
import { useEffect, useState } from 'react';
import { Database, FileText } from 'lucide-react';

// API 기본 URL 설정
const API_BASE_URL = 'http://localhost:8000';

export default function ApiInfo() {
  const [status, setStatus] = useState('확인 중...');
  const [color, setColor] = useState('text-secondary');
  const [pulse, setPulse] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        setStatus(`연결됨 (활성 작업: ${data.active_tasks || 0})`);
        setColor('text-accent');
        setPulse(true);
        setError(null);
      } catch (err) {
        console.error('API 연결 오류:', err);
        setStatus('연결 실패');
        setColor('text-danger');
        setPulse(false);
        setError(err.message);
      }
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 5000);
    return () => clearInterval(intervalId);
  }, []);

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
