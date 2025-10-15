// components/AnalysisForm.jsx
import { useState, useEffect, useRef } from 'react';
import { BarChart3, Calendar, Activity, Play, AlertCircle, X, Search, Building2, TrendingUp } from 'lucide-react';
import PresetLauncher from './presets/PresetLauncher';
import { API_BASE_URL } from '../constants'; 

export default function AnalysisForm({ onStart }) {
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [window, setWindow] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedTickers, setSelectedTickers] = useState([]);
  const [showAllSelected, setShowAllSelected] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [totalStockCount, setTotalStockCount] = useState(0);

  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // 전체 주식 수 가져오기
  useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/stocks/list`);
        const data = await response.json();
        setTotalStockCount(data.total_count || 0);
      } catch (error) {
        console.error("Error fetching total stock count:", error);
      }
    };
    fetchTotalCount();
  }, []);

  // 검색 기능 (디바운싱 적용)
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (searchTerm.length > 0) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const marketParam = selectedMarket !== 'all' ? `&market=${selectedMarket}` : '';
          const response = await fetch(
            `${API_BASE_URL}/stocks/search?q=${encodeURIComponent(searchTerm)}${marketParam}&limit=30`
          );
          const data = await response.json();

          // 이미 선택된 종목 제외
          const selectedTickerSet = new Set(selectedTickers.map(s => s.ticker));
          const filteredResults = data.stocks.filter(stock => !selectedTickerSet.has(stock.ticker));

          setSearchResults(filteredResults);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
      setIsSearching(false);
    }

    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchTerm, selectedMarket, selectedTickers]);

  // 유효성 검증
  useEffect(() => {
    const newErrors = {};
    const today = new Date().toISOString().slice(0, 10);

    if (!startDate) newErrors.startDate = '시작일을 입력해주세요.';
    else if (new Date(startDate) > new Date(endDate)) newErrors.startDate = '시작일은 종료일보다 이전이어야 합니다.';

    if (!endDate) newErrors.endDate = '종료일을 입력해주세요.';
    else if (new Date(endDate) > new Date(today)) newErrors.endDate = '종료일은 오늘 날짜보다 이후일 수 없습니다.';

    if (window < 20 || window > 250) newErrors.window = 'Window 값은 20에서 250 사이여야 합니다.';

    if (selectedTickers.length < 2) newErrors.tickers = '최소 2개 이상의 종목을 선택해주세요.';
    else if (selectedTickers.length > 100) newErrors.tickers = '최대 100개까지 선택 가능합니다.';

    setErrors(newErrors);
  }, [startDate, endDate, window, selectedTickers]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleMarketChange = (e) => {
    setSelectedMarket(e.target.value);
    if (searchTerm) setSearchTerm(searchTerm);
  };

  const handleTickerSelect = (stock) => {
    if (!selectedTickers.some(s => s.ticker === stock.ticker)) {
      setSelectedTickers(prev => [...prev, stock]);
    }
    setSearchTerm('');
    setSearchResults([]);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleRemoveTicker = (tickerToRemove) => {
    setSelectedTickers(prev => prev.filter(stock => stock.ticker !== tickerToRemove));
  };

  const handleStart = async () => {
    setIsLoading(true);
    setLoadingMessage('분석 중...');
    setErrors({});

    const timeoutId = setTimeout(() => {
        setLoadingMessage('서버에 연결 중... (최대 50초 소요)');
    }, 3000);

    const requestBody = {
      start_date: startDate,
      end_date: endDate,
      window: parseInt(window),
      tickers: selectedTickers.map(stock => stock.ticker),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/analysis/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      onStart(data.task_id);
      try { (await import('../layout/analysisMode')).setAnalysisMode(true); } catch (e) { }

    } catch (error) {
      console.error("분석 시작 중 오류 발생:", error);
      setErrors(prev => ({ ...prev, apiError: `분석 요청 실패: ${error.message}` }));
    } finally {
      clearTimeout(timeoutId); // ④ 요청이 끝나면 타이머를 반드시 제거
      setIsLoading(false);
      setLoadingMessage('분석 시작'); // ⑤ 모든 작업 완료 후 버튼 텍스트 초기화
    }
  };

  const getMarketBadgeColor = (market) => {
    switch (market?.toUpperCase()) {
      case 'KOSPI': return 'bg-blue-500';
      case 'KOSDAQ': return 'bg-green-500';
      case 'KONEX': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="">
      {/* 제목 + 전체 종목 수 (제목 아래 한 칸) */}
      <div className="mb-6">
        <div className="flex items-center w-full">
          {/* 왼쪽: 아이콘 + 제목 */}
          <div className="flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-blue-400" />
            <h2 className="text-2xl font-bold text-primary leading-tight">
              상관관계 분석 설정
            </h2>
          </div>

          {/* 오른쪽: 종목 지원 문구 — 자동 마진으로 끝까지, 살짝 아래로 */}
          <div className="ml-auto text-secondary/80 text-[13px] whitespace-nowrap relative top-[6px] pr-1">
            전체 {totalStockCount.toLocaleString()}개 종목 지원
          </div>
        </div>
      </div>

      {/* 날짜 + 윈도우 (기본: 3열 / 분석모드: 2열 + 윈도우 하단 전체폭) */}
      <div className="af-dates-grid grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 시작일 */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-primary">
            <Calendar className="w-6 h-6 text-blue-400" />
            <span>시작일</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={`w-full bg-slate-600/30 border-2 ${errors.startDate ? 'border-gray-500' : 'border-slate-600'} rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
          />
          {errors.startDate && (
            <p className="text-gray-500 text-xs flex items-center mt-2">
              <AlertCircle className="w-3 h-3 mr-1" />
              {errors.startDate}
            </p>
          )}
        </div>

        {/* 종료일 */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-primary">
            <Calendar className="w-6 h-6 text-purple-400" />
            <span>종료일</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={`w-full bg-slate-600/30 border-2 ${errors.endDate ? 'border-gray-500' : 'border-slate-600'} rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
          />
          {errors.endDate && (
            <p className="text-gray-500 text-xs flex items-center mt-2">
              <AlertCircle className="w-3 h-3 mr-1" />
              {errors.endDate}
            </p>
          )}
        </div>

        {/* 윈도우 크기 (기본: 같은 줄 / 분석모드: 다음 줄 전체폭) */}
        <div className="af-window-block space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-primary">
            <Activity className="w-6 h-6 text-green-400" />
            <span>윈도우 크기</span>
          </label>
          <input
            type="number"
            value={window}
            onChange={e => setWindow(e.target.value)}
            min={20}
            max={250}
            className={`w-full bg-slate-600/30 border-2 ${errors.window ? 'border-gray-500' : 'border-slate-600'} rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200`}
          />
          {errors.window && (
            <p className="text-gray-500 text-xs flex items-center mt-2">
              <AlertCircle className="w-3 h-3 mr-1" />
              {errors.window}
            </p>
          )}
        </div>
      </div>

      {/* 종목 선택 */}
      <div className="mb-8">
        <label htmlFor="ticker-search" className="block text-primary text-sm font-semibold mb-3 flex items-center justify-between">
          <span className="flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-blue-400" />
            종목 선택 (최소 2개, 최대 100개)
          </span>
          <span className="text-xs font-normal text-secondary">
            {selectedTickers.length}개 선택됨
          </span>
        </label>

        <div className="af-market-search flex gap-3 mb-3 items-center">
          {/* ✅ PresetLauncher를 flex 아이템으로 감싸고 w-full 클래스 적용 */}
          <div className="flex-1">
            <PresetLauncher
              getCurrentSymbols={() => selectedTickers}
              applySymbols={(symbols) => setSelectedTickers(symbols)}
            />
          </div>

          {/* ✅ 시장 선택 - 스타일 클래스 통일 */}
          <div className="flex-1 relative">
            <select
              value={selectedMarket}
              onChange={handleMarketChange}
              className="w-full bg-slate-600/30 border-2 border-slate-600 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center"
            >
              <option value="all">전체 시장</option>
              <option value="kospi">KOSPI</option>
              <option value="kosdaq">KOSDAQ</option>
            </select>
          </div>

          {/* 종목 검색 */}
          <div className="flex-3 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                id="ticker-search"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="종목명, 코드, 섹터로 검색 (예: 삼성전자, 005930, 반도체)"
                className={`w-full pl-10 pr-4 py-3 bg-slate-600/30 border-2 ${errors.tickers ? 'border-gray-500' : 'border-slate-600'} rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200`}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-transparent"></div>
                </div>
              )}
            </div>

            {showSuggestions && searchResults.length > 0 && (
              <div className="ticker-suggestions absolute z-10 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 max-h-80 overflow-y-auto shadow-lg">
                {searchResults.map(stock => (
                  <div
                    key={stock.ticker}
                    className="px-4 py-3 hover:bg-slate-600 cursor-pointer flex items-center justify-between group"
                    onMouseDown={() => handleTickerSelect(stock)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-100 font-medium">{stock.name}</span>
                        <span className="text-gray-400 text-sm">({stock.code})</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getMarketBadgeColor(stock.market)}`}>
                          {stock.market}
                        </span>
                      </div>
                      {stock.sector && (
                        <div className="text-xs text-gray-400 mt-1">
                          {stock.sector} {stock.industry && `• ${stock.industry}`}
                        </div>
                      )}
                    </div>
                    <Building2 className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                  </div>
                ))}
              </div>
            )}

            {showSuggestions && searchTerm && searchResults.length === 0 && !isSearching && (
              <div className="absolute z-10 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 p-4 shadow-lg">
                <p className="text-gray-400 text-center">검색 결과가 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* 선택된 종목 칩 (처음 5개만 표시, '모두 보기'로 확장/접기) */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(showAllSelected ? selectedTickers : selectedTickers.slice(0, 5)).map(stock => (
            <div
              key={stock.ticker}
              className="ticker-chip flex items-center bg-accent/20 border border-accent/50 text-primary text-sm px-3 py-2 rounded-full shadow-md group hover:bg-accent/30 transition-colors"
            >
              <span className="font-medium">{stock.name}</span>
              <span className="text-xs text-secondary ml-1">({stock.code})</span>
              <span className={`chip-badge text-xs px-2 py-0.5 rounded-full text-white ml-2 ${getMarketBadgeColor(stock.market)}`}>
                {stock.market}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveTicker(stock.ticker)}
                className="chip-remove ml-2 text-gray-400 hover:text-danger focus:outline-none transition-colors"
                aria-label="remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {!showAllSelected && selectedTickers.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllSelected(true)}
              className="px-3 py-2 rounded-full border border-slate-400 text-primary hover:bg-slate-500/10 transition-colors text-sm"
            >
              모두 보기 (+{selectedTickers.length - 5})
            </button>
          )}

          {showAllSelected && selectedTickers.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllSelected(false)}
              className="px-3 py-2 rounded-full border border-slate-400 text-primary hover:bg-slate-500/10 transition-colors text-sm"
            >
              접기
            </button>
          )}
        </div>

        {errors.tickers && (
          <p className="text-gray-500 text-xs flex items-center mt-2">
            <AlertCircle className="w-3 h-3 mr-1" />
            {errors.tickers}
          </p>
        )}

        {errors.apiError && (
          <p className="text-gray-500 text-xs flex items-center mt-2">
            <AlertCircle className="w-3 h-3 mr-1" />
            {errors.apiError}
          </p>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={isLoading || hasErrors || selectedTickers.length < 2}
        className={`group relative w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 ${isLoading || hasErrors || selectedTickers.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
          }`}
      >
        <Play className={`w-5 h-5 mr-3 inline-block ${isLoading ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
        {isLoading ? '분석 중...' : '분석 시작'}
      </button>
    </div>
  );
}