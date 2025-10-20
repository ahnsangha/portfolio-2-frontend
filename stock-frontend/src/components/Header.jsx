// src/components/Header.jsx

export default function Header({ analysisStatus, onNewAnalysis }) {
  const headerContent = {
    idle: {
      title: 'AI 주식 상관관계 분석',
      subtitle: '포트폴리오 리스크를 관리하고 새로운 투자 기회를 발견하세요.'
    },
    processing: {
      title: '분석 진행 중',
      subtitle: 'AI가 데이터를 처리하고 있습니다. 잠시만 기다려주세요.'
    },
    completed: {
      title: '분석 완료',
      subtitle: '결과를 확인하고 포트폴리오 전략을 수립하세요.'
    }
  };

  const { title, subtitle } = headerContent[analysisStatus] || headerContent.idle;

  return (
    <header className="text-center relative">
      <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
        {title}
      </h1>
      <p className="text-secondary text-base md:text-lg">
        {subtitle}
      </p>

      {/* ✅ 분석 중 또는 완료 상태일 때 "새 분석 시작" 버튼을 표시합니다. */}
      {analysisStatus !== 'idle' && (
        <button
          onClick={onNewAnalysis}
          className="absolute top-0 right-0 mt-1 px-4 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-primary rounded-lg transition-colors"
        >
          새 분석 시작
        </button>
      )}
    </header>
  );
}