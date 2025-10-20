// src/App.jsx

import { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ApiInfo from './components/ApiInfo';
import AnalysisForm from './components/AnalysisForm';
import ResultTabs from './components/ResultTabs';
import Theme from './components/Theme';
import './styles/analysis-mode.css';
import { setAnalysisMode } from './layout/analysisMode';
import { motion, AnimatePresence } from 'framer-motion';

const MenuIcon = (props) => (
  <svg {...props} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.2em" width="1.2em" 
  xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);

export default function App() {
  const [taskId, setTaskId] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const resultsRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ✅ 1. 앱이 처음 로드될 때 URL에서 taskId를 읽어옵니다.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskIdFromUrl = urlParams.get('taskId');
    if (taskIdFromUrl) {
      setTaskId(taskIdFromUrl);
      setAnalysisStatus('processing'); // 상태를 '처리중'으로 설정하여 ResultTabs를 렌더링
      setAnalysisMode(true);
    }
  }, []);

  useEffect(() => {
    if (!taskId) {
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

  const handleStartAnalysis = useCallback((newTaskId) => {
    setTaskId(newTaskId);
    setAnalysisStatus('processing');
    setAnalysisMode(true);
    
    // ✅ 2. 새 분석 시작 시 URL을 업데이트합니다.
    const url = new URL(window.location);
    url.searchParams.set('taskId', newTaskId);
    url.hash = ''; // 새 분석은 항상 '요약' 탭에서 시작하도록 hash 초기화
    window.history.pushState({}, '', url);
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    setAnalysisStatus('completed');
  }, []);

  // ✅ 3. "새 분석 시작" 버튼을 위한 함수를 추가합니다.
  const handleNewAnalysis = useCallback(() => {
    setTaskId(null);
    setAnalysisStatus('idle');

    // URL에서 taskId와 hash를 제거합니다.
    const url = new URL(window.location);
    url.searchParams.delete('taskId');
    url.hash = '';
    window.history.pushState({}, '', url);
  }, []);

  return (
    <div className="app-background">
      <AnimatePresence>
        {taskId && !isSidebarOpen && (
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
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
          {/* handleNewAnalysis 함수를 Header로 전달합니다. */}
          <Header analysisStatus={analysisStatus} onNewAnalysis={handleNewAnalysis} />
        </div>

        {!taskId ? (
          <div className="bg-panel bg-panel-dark backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-panel text-primary flex flex-col gap-6 p-6">
            <ApiInfo />
            <AnalysisForm onStart={handleStartAnalysis} />
          </div>
        ) : (
          <motion.div
            className="results-pane" layout transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div ref={resultsRef}>
              <ResultTabs taskId={taskId} onAnalysisComplete={handleAnalysisComplete} />
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {taskId && isSidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
              variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              className="fixed top-0 left-0 w-[720px] h-screen z-40"
              initial="closed" animate="open" exit="closed" variants={sidebarVariants}
            >
              <div className="relative bg-panel bg-panel-dark backdrop-blur-xl rounded-r-2xl shadow-2xl border-r border-t border-b border-panel text-primary flex flex-col gap-6 h-full p-6 overflow-y-auto">
                <ApiInfo />
                <AnalysisForm onStart={handleStartAnalysis} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}