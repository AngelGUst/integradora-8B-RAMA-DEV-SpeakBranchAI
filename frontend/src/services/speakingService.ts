import type { EvaluatePayload, SpeakingQuestion, SpeakingResult } from '../types/speaking';
import { TOKEN_KEY } from '@/shared/api/client';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...options,
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Error de red' }));
        throw new Error(error.detail ?? 'Error desconocido');
    }
    return res.json() as Promise<T>;
}

export const speakingService = {
    getQuestion(params?: { level?: string; difficulty?: string }): Promise<SpeakingQuestion> {
        const query = new URLSearchParams(
            Object.fromEntries(
                Object.entries(params ?? {}).filter(([, v]) => v !== undefined)
            ) as Record<string, string>
        ).toString();
        return apiFetch<SpeakingQuestion>(`/speaking/question/${query ? `?${query}` : ''}`);
    },

    evaluate(payload: EvaluatePayload): Promise<SpeakingResult> {
        return apiFetch<SpeakingResult>('/speaking/evaluate/', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    transcribeAudio(audioBlob: Blob): Promise<{ transcript: string }> {
        const token = localStorage.getItem(TOKEN_KEY);
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        return fetch(`${API_BASE}/speaking/transcribe/`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        }).then((res) => {
            if (!res.ok) throw new Error('Error while transcribing');
            return res.json();
        });
    },
};