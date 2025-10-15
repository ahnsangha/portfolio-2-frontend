// src/constants.js
export const API_BASE_URL = 'http://localhost:8000';

export const ENDPOINTS = {
  HEALTH: '/health',
  START_ANALYSIS: '/analysis/start',
  GET_STATUS: (taskId) => `/analysis/status/${taskId}`,
  GET_RESULT: (taskId) => `/analysis/result/${taskId}`,
  GET_CHART: (taskId, chartType) => `/analysis/chart/${taskId}/${chartType}`,
};

export const CHART_TYPES = {
  BASIC: 'basic',
  ADVANCED: 'advanced',
  CORRELATION_HEATMAP: 'correlation_heatmap',
  PERFORMANCE: 'performance',
};

export const DEFAULT_SETTINGS = {
  START_DATE: '2023-01-01',
  END_DATE: '2024-12-31',
  WINDOW_SIZE: 60,
  MIN_WINDOW: 20,
  MAX_WINDOW: 250,
};

export const REFRESH_INTERVALS = {
  STATUS_CHECK: 2000, // 2 seconds
  RESULT_CHECK: 2000, // 2 seconds
};