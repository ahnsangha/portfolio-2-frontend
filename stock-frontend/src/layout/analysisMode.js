export const setAnalysisMode = (on) => {
    const root = document.documentElement;
    root.classList.toggle('analysis-mode', !!on);
    root.classList.add('analysis-anim');
    clearTimeout(window.__amTimer);
    window.__amTimer = setTimeout(()=>root.classList.remove('analysis-anim'), 350);
  };
  