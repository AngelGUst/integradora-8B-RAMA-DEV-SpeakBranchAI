import apiClient from '@/shared/api/client';

export interface SystemConfig {
  adaptive_threshold_up: number;
  adaptive_threshold_down: number;
  registration_enabled: boolean;
}

export interface LogsResponse {
  lines: string[];
  total: number;
}

export interface LevelProgressionConfig {
  level_xp_requirements: Record<string, number>;
  level_ranges: Record<string, [number, number]>;
}

export type LogSource = 'all' | 'whisper' | 'gpt';

export const systemConfigService = {
  get: (): Promise<SystemConfig> =>
    apiClient.get('/system/').then(r => r.data),

  update: (data: Partial<SystemConfig>): Promise<SystemConfig> =>
    apiClient.patch('/system/', data).then(r => r.data),

  getLogs: (source: LogSource = 'all', limit = 100): Promise<LogsResponse> =>
    apiClient.get('/system/logs/', { params: { source, limit } }).then(r => r.data),

  getProgression: (): Promise<LevelProgressionConfig> =>
    apiClient.get('/system/progression/').then(r => r.data),
};
