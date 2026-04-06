import apiClient from '@/shared/api/client';
import type { Question } from '@/types/question';

export const questionsApi = {
  getDiagnosticQuestions: async (limit?: number): Promise<Question[]> => {
    const params = new URLSearchParams();
    if (typeof limit === 'number') {
      params.set('limit', String(limit));
    }
    const query = params.toString();
    const { data } = await apiClient.get<Question[]>(
      `/questions/diagnostic/${query ? `?${query}` : ''}`,
    );
    return data;
  },
};
