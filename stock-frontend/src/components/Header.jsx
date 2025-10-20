// components/Header.jsx
export default function Header({ analysisStatus = 'idle' }) {
  // 분석 상태에 따른 단계 정의
  const getStepStatus = () => {
    switch (analysisStatus) {
      case 'idle':
        return { waiting: 'active', analyzing: 'inactive', completed: 'inactive' };
      case 'processing':
        return { waiting: 'completed', analyzing: 'active', completed: 'inactive' };
      case 'completed':
        return { waiting: 'completed', analyzing: 'completed', completed: 'active' };
      default:
        return { waiting: 'inactive', analyzing: 'inactive', completed: 'inactive' };
    }
  };

  const stepStatus = getStepStatus();

  return (
    <div className="bg-panel bg-panel-dark backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-panel text-primary py-6 px-8 mb-8">
      <div className="text-center">
        {/* 작은 상단 텍스트 */}
        <div className="text-xs text-secondary mb-2 tracking-widest uppercase">
          Stock Market Analysis Platform
        </div>
        
        {/* 메인 타이틀 - 크기 축소 */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-primary">
          산업별 주식 상관구조 변화 분석
        </h1>
        
        {/* 구분선 */}
        <div className="flex items-center justify-center mb-2">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent w-48"></div>
        </div>
        
        {/* 설명 텍스트 - 크기 축소 */}
        <p className="text-base text-secondary font-medium">
          실시간 포트폴리오 분석 및 성과 추적 시스템
        </p>
        
        {/* 미니 진행바 */}
        <div className="flex justify-center items-center space-x-4 pt-3 mt-3">
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              stepStatus.waiting === 'completed' ? 'bg-green-500' : 
              stepStatus.waiting === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'
            }`}></div>
            <span className={`text-xs transition-colors duration-300 ${
              stepStatus.waiting === 'active' ? 'text-blue-400' : 
              stepStatus.waiting === 'completed' ? 'text-green-400' : 'text-gray-400'
            }`}>대기</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              stepStatus.analyzing === 'completed' ? 'bg-green-500' : 
              stepStatus.analyzing === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'
            }`}></div>
            <span className={`text-xs transition-colors duration-300 ${
              stepStatus.analyzing === 'active' ? 'text-blue-400' : 
              stepStatus.analyzing === 'completed' ? 'text-green-400' : 'text-gray-400'
            }`}>분석중</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              stepStatus.completed === 'completed' ? 'bg-green-500' : 
              stepStatus.completed === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'
            }`}></div>
            <span className={`text-xs transition-colors duration-300 ${
              stepStatus.completed === 'active' ? 'text-blue-400' : 
              stepStatus.completed === 'completed' ? 'text-green-400' : 'text-gray-400'
            }`}>완료</span>
          </div>
        </div>
      </div>
    </div>
  );
}