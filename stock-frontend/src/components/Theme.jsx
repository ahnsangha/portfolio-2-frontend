// src/components/Theme.jsx
import { useState, useEffect } from 'react';

export default function Theme() {
  // 현재 활성화된 테마 상태 (기본값 'dark')
  const [isDark, setIsDark] = useState(() => {
    // 로컬 스토리지에서 테마 불러오기, 없으면 'dark'
    const savedTheme = localStorage.getItem('appTheme');
    return savedTheme !== 'light';
  });

  // 테마 변경 핸들러
  const handleThemeToggle = () => {
    setIsDark(!isDark);
  };

  // 테마 상태 변경 시 body에 테마 클래스 적용
  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    const body = document.body;
    
    // 기존 테마 클래스 제거
    body.classList.remove('theme-dark', 'theme-light');
    // 새로운 테마 클래스 추가
    body.classList.add(`theme-${theme}`);
    // 로컬 스토리지에 저장
    localStorage.setItem('appTheme', theme);
  }, [isDark]);

  return (
    <div className="flex items-center space-x-3">
      {/* 라이트 모드 텍스트 */}
      <span className={`text-xs font-medium transition-colors duration-300 ${
        !isDark ? 'text-primary' : 'text-secondary'
      }`}>
        Light
      </span>
      
      {/* 토글 스위치 */}
      <button
        onClick={handleThemeToggle}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
          isDark ? 'bg-slate-600' : 'bg-slate-400'
        }`}
        aria-label="테마 전환"
      >
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${
            isDark ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
      
      {/* 다크 모드 텍스트 */}
      <span className={`text-xs font-medium transition-colors duration-300 ${
        isDark ? 'text-primary' : 'text-secondary'
      }`}>
        Dark
      </span>
    </div>
  );
}