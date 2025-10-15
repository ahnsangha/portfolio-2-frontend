# Korean Stock Correlation Analysis 

한국 주식 시장의 상관관계를 분석하고 포트폴리오 최적화를 제공하는 FastAPI 기반 RESTful API

## 주요 기능

- **주식 데이터 수집**: Yahoo Finance를 통한 실시간 한국 주식 데이터 수집
- **상관관계 분석**: 정적/동적 상관계수 계산 및 시각화
- **포트폴리오 최적화**: 다양한 전략(동일가중, 최소분산, 최대샤프)을 통한 최적화
- **비동기 처리**: 백그라운드 작업을 통한 대용량 분석 처리
- **다양한 시각화**: 4가지 차트 타입 제공 (기본, 고급, 상관관계, 성과)
- **Excel 내보내기**: 분석 결과를 Excel 파일로 다운로드

## 기술 스택

- **Framework**: FastAPI
- **Data Analysis**: pandas, numpy, scipy
- **Visualization**: matplotlib, seaborn
- **Market Data**: yfinance
- **Async Processing**: asyncio, ThreadPoolExecutor
- **Export**: openpyxl, xlsxwriter

## 설치 방법

### 1. 가상환경 생성 및 활성화
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 2. 의존성 설치
```bash
pip install -r requirements.txt
```

### 3. 서버 실행
```bash
python main.py / python3 main.py (macOS/Linux)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. API 문서 확인
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 엔드포인트

### 분석 관련

#### 분석 시작
```http
POST /analysis/start
```
```json
{
  "start_date": "2023-01-01",
  "end_date": "2024-12-31",
  "tickers": ["005930.KS", "000660.KS"],
  "window": 60
}
```

#### 분석 상태 확인
```http
GET /analysis/status/{task_id}
```

#### 분석 결과 조회
```http
GET /analysis/result/{task_id}
```

#### 차트 조회
```http
GET /analysis/chart/{task_id}/{chart_type}
```
차트 타입: `basic`, `advanced`, `correlation_heatmap`, `performance`

#### Excel 내보내기
```http
GET /analysis/export/{task_id}
```

### 주식 데이터

#### 지원 종목 리스트
```http
GET /stocks/list
```

#### 개별 종목 가격 데이터
```http
GET /stocks/price/{ticker}?start_date=2023-01-01&end_date=2024-12-31
```

### 포트폴리오

#### 포트폴리오 최적화
```http
POST /portfolio/optimize
```
```json
{
  "tickers": ["005930.KS", "000660.KS", "035420.KS"],
  "start_date": "2023-01-01",
  "end_date": "2024-12-31",
  "strategy": "max_sharpe"
}
```

## 사용 예시

### Python 클라이언트 예시
```python
import requests
import time

# 1. 분석 시작
response = requests.post("http://localhost:8000/analysis/start", json={
    "start_date": "2023-01-01",
    "end_date": "2024-12-31",
    "window": 60
})
task_id = response.json()["task_id"]

# 2. 진행 상황 확인
while True:
    status = requests.get(f"http://localhost:8000/analysis/status/{task_id}")
    data = status.json()
    print(f"Status: {data['status']}, Progress: {data['progress']*100:.0f}%")
    
    if data['status'] == 'completed':
        break
    elif data['status'] == 'failed':
        print(f"Error: {data['message']}")
        break
    
    time.sleep(2)

# 3. 결과 조회
result = requests.get(f"http://localhost:8000/analysis/result/{task_id}")
print(result.json())

# 4. 차트 조회
chart = requests.get(f"http://localhost:8000/analysis/chart/{task_id}/basic")
chart_data = chart.json()
# chart_data['image']는 base64 인코딩된 이미지
```

### JavaScript/Fetch 예시
```javascript
// 분석 시작
const startAnalysis = async () => {
  const response = await fetch('http://localhost:8000/analysis/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start_date: '2023-01-01',
      end_date: '2024-12-31',
      window: 60
    })
  });
  const data = await response.json();
  return data.task_id;
};

// 상태 확인
const checkStatus = async (taskId) => {
  const response = await fetch(`http://localhost:8000/analysis/status/${taskId}`);
  return await response.json();
};
```

## 프로젝트 구조

```
stock-analysis-api/
│
├── main.py                 # FastAPI 애플리케이션 메인 파일
├── requirements.txt        # Python 의존성 목록
├── .gitignore             # Git 제외 파일
├── README.md              # 프로젝트 문서
│
├── .venv/                 # 가상환경 (git 제외)
└── output/                # 생성된 파일 저장 (선택사항)
```

## 분석 기능 상세

### 1. 상관관계 분석
- **정적 상관계수**: 전체 기간의 상관관계 매트릭스
- **롤링 상관계수**: 지정된 윈도우 크기의 동적 상관관계
- **평균 상관계수 추이**: 시장 전체의 상관관계 변화 추적

### 2. 포트폴리오 전략
- **동일가중 (Equal Weight)**: 모든 종목에 동일한 비중
- **최소분산 (Min Variance)**: 포트폴리오 변동성 최소화
- **최대샤프 (Max Sharpe)**: 위험 대비 수익률 최대화
- **동적 전략 (Dynamic)**: 상관관계 기반 동적 가중치

### 3. 성과 지표
- 연간 수익률 (Annual Return)
- 연간 변동성 (Annual Volatility)
- 샤프 비율 (Sharpe Ratio)
- 최대 낙폭 (Maximum Drawdown)
- 누적 수익률 (Cumulative Return)

## 차트 타입

### 1. Basic Analysis
- 정규화된 주가 추이
- 상관계수 히트맵
- 일일 수익률 분포
- 누적 수익률

### 2. Advanced Analysis
- 롤링 상관계수 vs 시장 변동성
- 위험-수익 프로파일
- 포트폴리오 전략 비교
- 분기별 상관관계 변화
- 환율-주식 상관관계
- 최대 낙폭 분석

### 3. Correlation Heatmap
- 상세 상관계수 매트릭스
- 고해상도 히트맵

### 4. Performance Chart
- 종목별 샤프 비율
- 위험-수익 산점도
- 월별 전략 수익률
- 포트폴리오 성과 및 리스크

# 한국 주식 시장 상관관계 분석 보고서

> 2023.01.02 ~ 2024.12.30 기간의 주요 8개 종목 데이터를 기반으로 주가 상관관계, 수익률, 포트폴리오 전략 등을 분석하였습니다.

---

## 1. 분석 개요

- 분석 기간: 2023-01-02 ~ 2024-12-30  
- 총 거래일 수: 489일  
- 분석 종목 수: 8개

### 데이터 수집 상태

| 종목 | 수집 상태 |
|------|-----------|
| Samsung Electronics | success |
| SK Hynix | success |
| NAVER | success |
| Kakao | success |
| LG Chemicals | success |
| Hyundai Motor | success |
| POSCO Holdings | success |
| KB Financial | success |

---

## 2. 상관관계 통계 요약

| 지표 | 값 |
|------|-----|
| 평균 상관계수 | 0.284 |
| 중앙값 | 0.265 |
| 표준편차 | 0.123 |
| 최소값 | 0.137 |
| 최대값 | 0.633 |

---

## 3. 주요 분석 결과

### 정규화된 주가 추이

- 최고 성과: SK Hynix (약 3배 상승)  
- 최저 성과: LG Chemicals (약 40% 하락)  
- 트렌드: 대부분 2024년 상반기까지 상승, 이후 하락세 전환

### 상관관계 히트맵 요약

| 종목 쌍 | 상관계수 | 해석 |
|---------|----------|------|
| NAVER - Kakao | 0.633 | IT 플랫폼 업종 동조화 |
| POSCO - Hyundai Motor | 0.613 | 제조업 업종 동조화 |
| Samsung - SK Hynix | 0.529 | 반도체 업종 동조화 |

---

## 4. 수익률 및 변동성 분석

### 수익률 분포

- 대부분 -5% ~ +5% 범위  
- 정규분포에 가까운 종형 분포  
- 일부 ±10% 이상 극단값 존재

### 연간 수익률 및 변동성

| 종목 | 수익률 | 변동성 | 특성 |
|------|--------|--------|------|
| SK Hynix | ~50% | ~45% | 고위험·고수익 |
| Samsung | ~5% | ~28% | 중위험·저수익 |
| LG Chemicals | -35% | ~40% | 고위험·손실 |

---

## 5. 포트폴리오 전략 비교

| 전략 | 연간 수익률 | 변동성 | 샤프 비율 | 최대 낙폭 |
|------|--------------|---------|-------------|--------------|
| Equal Weight | 11.58% | 22.29% | 0.520 | -19.37% |
| Min Variance | 11.45% | 20.58% | 0.556 | -21.76% |
| Max Sharpe | 11.14% | 21.74% | 0.512 | -19.59% |
| Dynamic | 누적 수익률 약 12% | - | - | - |

*Min Variance 전략이 안정성과 수익률 면에서 가장 균형적입니다.*

---

## 6. 월별 수익률 트렌드

- 2023년 1~3월: 강한 상승세 (월 +10% 이상)  
- 2023년 중반: 높은 변동성  
- 2024년 상반기: 완만한 상승  
- 2024년 하반기: 전체적으로 하락 전환

---

## 7. 상관관계 매트릭스 요약

### 높은 상관관계 (> 0.5)

- NAVER ↔ Kakao: 0.633  
- POSCO ↔ Hyundai Motor: 0.613  
- Samsung ↔ SK Hynix: 0.529

### 낮은 상관관계 (< 0.2)

- NAVER ↔ Hyundai Motor: 0.137  
- POSCO ↔ SK Hynix: 0.154  
- KB Financial ↔ NAVER: 0.183

---

## 8. 종목별 샤프 비율

| 순위 | 종목 | 샤프 비율 | 해석 |
|------|------|-------------|--------|
| 1위 | SK Hynix | 1.236 | 수익성과 리스크 보상이 가장 우수 |
| 2위 | KB Financial | 1.087 | 금융주 대비 양호 |
| 3위 | Hyundai Motor | 0.762 | 제조업 기준 준수 |
| - | NAVER | 0.334 | 낮은 성과 |
| - | Kakao | -0.292 | 음수 |
| 최하위 | LG Chemicals | -0.949 | 손실 + 고변동성 |

---

## 9. 투자 전략 제안

| 투자 성향 | 추천 전략 |
|------------|-------------|
| 고위험 선호 | SK Hynix 중심 투자 |
| 안정 추구 | Min Variance 전략 |
| 균형 지향 | Equal Weight 전략 |

---

## 10. 핵심 요약

- 업종별 동조화 현상: 같은 업종일수록 높은 상관관계  
- 시장 스트레스 시 상관 증가: 위기 상황에서 종목 간 연동성 확대  
- 분산 투자 효과 입증: 포트폴리오 전략이 개별 종목보다 안정적  
- 2024년 중반 이후 하락세 전환: 리스크 관리 필요 시점

## 프로젝트 실행 명령어

프론트엔드
```
cd stock-frontend/
npm run dev
```

백엔드
```
cd stock-backend/
python3 main.py (MacOS/Linux)
python main.py (Window)
.venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

추가로 프론트 디렉토리 변경 후 실행하기 전에 패키지 하나 설치하셔야 합니다!
```
 npm install lucide-react
```