import apiClient from '@/shared/api/client';

export interface SystemConfig {
  adaptive_threshold_up: number;
  adaptive_threshold_down: number;
  registration_enabled: boolean;
  xp_level_a1: number;
  xp_level_a2: number;
  xp_level_b1: number;
  xp_level_b2: number;
}

export interface LogsResponse {
  lines: string[];
  total: number;
}

export type LogSource = 'all' | 'whisper' | 'gpt';

export const systemConfigService = {
  get: (): Promise<SystemConfig> =>
    apiClient.get('/system/').then(r => r.data),

  update: (data: Partial<SystemConfig>): Promise<SystemConfig> =>
    apiClient.patch('/system/', data).then(r => r.data),

  getLogs: (source: LogSource = 'all', limit = 100): Promise<LogsResponse> =>
    apiClient.get('/system/logs/', { params: { source, limit } }).then(r => r.data),
};
