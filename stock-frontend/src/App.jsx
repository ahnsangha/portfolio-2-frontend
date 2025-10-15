// src/App.jsx
import { useState, useRef, useEffect, useCallback  } from 'react';
import Header from './components/Header';
import ApiInfo from './components/ApiInfo';
import AnalysisForm from './components/AnalysisForm';
import ResultTabs from './components/ResultTabs';
import Theme from './components/Theme';
import './styles/analysis-mode.css';
import { setAnalysisMode } from './layout/analysisMode';
import { motion, AnimatePresence } from 'framer-motion';

// 사이드바 토글에 사용할 아이콘 컴포넌트
const MenuIcon = (props) => (
  <svg {...props} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);
const CloseIcon = (props) => (
  <svg {...props} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export default function App() {
  const [taskId, setTaskId] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const resultsRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (taskId) {
      setAnalysisMode(true);
    } else {
      // taskId가 없어지면 analysis-mode 클래스를 제거합니다.
      document.documentElement.classList.remove('analysis-mode', 'analysis-anim');
    }
  }, [taskId]);

  const sidebarVariants = {
    open: { x: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
    closed: { x: '-100%', transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  };

  const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  // ✅ useCallback을 사용하여 함수가 불필요하게 재생성되는 것을 방지합니다.
  const handleStartAnalysis = useCallback((newTaskId) => {
    setTaskId(newTaskId);
    setAnalysisStatus('processing');
    setAnalysisMode(true);
  }, []); // 의존성 배열이 비어있으므로, 이 함수는 처음 한 번만 생성됩니다.

  // ✅ onAnalysisComplete 핸들러도 useCallback으로 감싸줍니다.
  const handleAnalysisComplete = useCallback(() => {
    setAnalysisStatus('completed');
  }, []);

  return (
    <div className="app-background">
      <AnimatePresence>
        {taskId && !isSidebarOpen && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-4 left-6 z-50 p-3 bg-panel bg-panel-dark backdrop-blur-xl rounded-full text-primary shadow-lg border border-panel focus:outline-none hover:bg-opacity-80 transition-all"
            aria-label="Open sidebar"
          >
            <MenuIcon />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-end mb-4">
          <Theme />
        </div>
        <div className="mb-4">
          <Header analysisStatus={analysisStatus} />
        </div>

        {!taskId ? (
          <div className="bg-panel bg-panel-dark backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-panel text-primary flex flex-col gap-6 p-6">
            <ApiInfo />
            <AnalysisForm onStart={handleStartAnalysis} />
          </div>
        ) : (
          <motion.div
            className="results-pane"
            layout
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div ref={resultsRef}>
              <ResultTabs
                taskId={taskId}
                onAnalysisComplete={handleAnalysisComplete} // 수정된 핸들러 전달
              />
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {taskId && isSidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              className="fixed top-0 left-0 w-[720px] h-screen z-40"
              initial="closed"
              animate="open"
              exit="closed"
              variants={sidebarVariants}
            >
              <div className="relative bg-panel bg-panel-dark backdrop-blur-xl rounded-r-2xl shadow-2xl border-r border-t border-b border-panel text-primary flex flex-col gap-6 h-full p-6 overflow-y-auto">
                <ApiInfo />
                <AnalysisForm
                  onStart={handleStartAnalysis}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}