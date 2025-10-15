// components/ApiInfo.jsx
import { useEffect, useState } from 'react';
import { Database, FileText } from 'lucide-react';
import { API_BASE_URL } from '../constants';

export default function ApiInfo() {
  const [status, setStatus] = useState('확인 중...');
  const [color, setColor] = useState('text-secondary');
  const [pulse, setPulse] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialCheck, setIsInitialCheck] = useState(true);

  useEffect(() => {
    let timeoutId = null;

    const checkConnection = async () => {
      // 1. 첫 접속 시, 3초짜리 타이머를 설정합니다.
      if (isInitialCheck) {
        timeoutId = setTimeout(() => {
          // 3초가 지나도 서버에서 응답이 없으면,
          // 화면의 상태 메시지를 "서버 준비 중..."으로 변경합니다.
          setStatus('서버 준비 중... (최대 60초 소요)');
          setColor('text-info'); 
          setPulse(true);
        }, 3000);
      }

      try {
        // 2. 백엔드 서버에 "/health" 신호를 보냅니다.
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // 3-A. (성공) 서버가 응답하면, 상태를 "연결됨"으로 변경합니다.
        const data = await response.json();
        setStatus(`연결됨 (활성 작업: ${data.active_tasks || 0})`);
        setColor('text-accent');
        setPulse(true);
        setError(null);

      } catch (err) {
        // 3-B. (실패) 서버 연결에 실패하면, 상태를 "연결 실패"로 변경합니다.
        setStatus('연결 실패');
        setColor('text-danger');
        setPulse(false);
        setError(err.message);

      } finally {
        // 4. 요청이 성공하든 실패하든, 맨 처음에 설정했던 3초짜리 타이머를 제거합니다.
        // (서버가 3초 안에 응답했다면 "서버 준비 중..." 메시지가 표시되지 않습니다.)
        if (isInitialCheck) {
          clearTimeout(timeoutId);
          setIsInitialCheck(false); // "첫 접속" 상태를 해제하여 다음부터는 타이머가 동작하지 않게 합니다.
        }
      }
    };

    // 5. 컴포넌트가 처음 화면에 나타날 때 checkConnection 함수를 딱 한 번 실행하고,
    // 그 후로는 10초마다 주기적으로 서버 상태를 확인합니다.
    checkConnection();
    const intervalId = setInterval(checkConnection, 10000); 
    return () => {
      clearInterval(intervalId); // 컴포넌트가 사라질 때 주기적인 확인을 멈춥니다.
      if (timeoutId) clearTimeout(timeoutId);
    };
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
