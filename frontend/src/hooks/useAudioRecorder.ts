import { useCallback, useRef, useState } from 'react';

interface UseAudioRecorderReturn {
    isRecording: boolean;
    isSupported: boolean;
    start: () => void;
    stop: () => Promise<Blob | null>;
    reset: () => void;
    error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const isSupported = Boolean(navigator.mediaDevices?.getUserMedia);

    const start = useCallback(async () => {
        setError(null);
        chunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstart = () => setIsRecording(true);
            mediaRecorder.onstop = () => {
                setIsRecording(false);
                stream.getTracks().forEach((t) => t.stop());
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
        } catch {
            setError('No se pudo acceder al micrófono.');
        }
    }, []);

    const stop = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current;
            if (!recorder || recorder.state === 'inactive') {
                resolve(null);
                return;
            }

            recorder.onstop = () => {
                setIsRecording(false);
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                resolve(blob);
            };

            recorder.stop();
        });
    }, []);

    const reset = useCallback(() => {
        mediaRecorderRef.current?.stop();
        chunksRef.current = [];
        setIsRecording(false);
        setError(null);
    }, []);

    return { isRecording, isSupported, start, stop, reset, error };
}