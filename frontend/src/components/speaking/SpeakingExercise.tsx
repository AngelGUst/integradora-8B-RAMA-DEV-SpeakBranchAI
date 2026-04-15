import { useCallback, useEffect, useState } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { speakingService } from '../../services/speakingService';
import type { SpeakingQuestion, SpeakingResult } from '../../types/speaking';

type SpeakingStage = 'loading' | 'ready' | 'recording' | 'recorded' | 'evaluating' | 'result' | 'error';

const DIFFICULTY_COLOR: Record<string, string> = {
    EASY: '#22c55e', MEDIUM: '#f59e0b', HARD: '#ef4444',
};
const DIFFICULTY_LABEL: Record<string, string> = {
    EASY: 'Fácil', MEDIUM: 'Medio', HARD: 'Difícil',
};

export default function SpeakingExercise() {
    const [stage, setStage] = useState<SpeakingStage>('loading');
    const [question, setQuestion] = useState<SpeakingQuestion | null>(null);
    const [result, setResult] = useState<SpeakingResult | null>(null);
    const [transcript, setTranscript] = useState('');
    const [attemptsCount, setAttemptsCount] = useState(1);
    const [errorMsg, setErrorMsg] = useState('');
    const [lessonCompleted, setLessonCompleted] = useState(false);

    const { isRecording, isSupported, start, stop, reset, error: micError } = useAudioRecorder();

    const fetchQuestion = useCallback(async () => {
        setStage('loading');
        setResult(null);
        setTranscript('');
        setAttemptsCount(1);
        reset();
        try {
            const q = await speakingService.getQuestion();
            setQuestion(q);
            setStage('ready');
        } catch {
            setErrorMsg('No se pudo cargar la pregunta.');
            setStage('error');
        }
    }, [reset]);

    useEffect(() => { fetchQuestion(); }, [fetchQuestion]);

    const handleStartRecording = useCallback(() => {
        setTranscript('');
        start();
        setStage('recording');
    }, [start]);

    const handleStopRecording = useCallback(async () => {
        const audioBlob = await stop();
        if (!audioBlob) return;
        setStage('evaluating');
        try {
            const { transcript: text } = await speakingService.transcribeAudio(audioBlob);
            setTranscript(text);
            setStage('recorded');
        } catch {
            setErrorMsg('Error al transcribir el audio.');
            setStage('error');
        }
    }, [stop]);

    const handleEvaluate = useCallback(async () => {
        if (!question || !transcript) return;
        setStage('evaluating');
        try {
            const res = await speakingService.evaluate({
                question_id: question.id,
                transcript,
                attempts_count: attemptsCount,
            });
            setResult(res);
            if (res.lesson_progress.is_completed) {
                setLessonCompleted(true);
            }
            setStage('result');
        } catch {
            setErrorMsg('Error al evaluar.');
            setStage('error');
        }
    }, [question, transcript, attemptsCount]);

    const handleRetry = () => {
        setAttemptsCount((c) => c + 1);
        setTranscript('');
        reset();
        setStage('ready');
    };

    const scoreColor = result
        ? result.score >= 80 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : '#ef4444'
        : '#fff';

    const scoreLabel = result
        ? result.score >= 80 ? '¡Excelente!' : result.score >= 50 ? 'Casi lo tienes' : 'Sigue practicando'
        : '';

    const btn = (label: string, onClick: () => void, primary = false, disabled = false) => (
        <button onClick={onClick} disabled={disabled} style={{
            flex: 1, padding: '12px', borderRadius: '12px',
            border: primary ? 'none' : '1px solid #2a2a35',
            background: primary ? '#6366f1' : 'transparent',
            color: primary ? '#fff' : '#888',
            fontSize: '14px', fontWeight: primary ? 700 : 400,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.4 : 1,
        }}>{label}</button>
    );

    return (
        <div style={{
            width: '100vw', minHeight: '100vh', background: '#0c0c10',
            display: 'grid', gridTemplateColumns: '1fr 2fr',
            fontFamily: 'system-ui, sans-serif', color: '#f0f0f0',
        }}>
            <div style={{
                borderRight: '1px solid #1e1e28', padding: '3rem 2.5rem',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
                <div>
                    <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: '#333', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Speaking Practice
                    </p>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 3rem' }}>SpeakBranch</h1>
                    {question && (stage === 'ready' || stage === 'recording' || stage === 'recorded' || stage === 'evaluating') && (
                        <>
                            <p style={{ fontSize: '12px', color: '#333', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dificultad</p>
                            <span style={{
                                display: 'inline-block', fontSize: '11px', letterSpacing: '0.15em',
                                textTransform: 'uppercase', color: DIFFICULTY_COLOR[question.difficulty],
                                border: `1px solid ${DIFFICULTY_COLOR[question.difficulty]}33`,
                                borderRadius: '100px', padding: '4px 14px', marginBottom: '2rem',
                            }}>
                                {DIFFICULTY_LABEL[question.difficulty]}
                            </span>
                            <p style={{ fontSize: '12px', color: '#333', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nivel</p>
                            <p style={{ fontSize: '16px', color: '#666', marginBottom: '2rem' }}>{question.level}</p>
                            <p style={{ fontSize: '12px', color: '#333', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>XP máximo</p>
                            <p style={{ fontSize: '16px', color: '#666' }}>⚡ {question.xp_max} XP</p>
                        </>
                    )}
                    {stage === 'result' && result && (
                        <>
                            <p style={{ fontSize: '12px', color: '#333', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Resultado</p>
                            <div style={{ fontSize: '72px', fontWeight: 900, color: scoreColor, lineHeight: 1, marginBottom: '8px' }}>
                                {result.score}
                            </div>
                            <p style={{ color: scoreColor, fontSize: '16px', fontWeight: 600, marginBottom: '2rem' }}>{scoreLabel}</p>
                            <div style={{
                                background: '#1e1e28', borderRadius: '12px', padding: '12px 16px',
                                fontSize: '13px', color: '#666', display: 'flex', gap: '8px', alignItems: 'center',
                            }}>
                                <span>⚡</span><span>+{result.xp_earned} XP ganados</span>
                            </div>
                        </>
                    )}
                </div>
                <p style={{ fontSize: '11px', color: '#222' }}>© SpeakBranch 2026</p>
            </div>

            <div style={{
                padding: '3rem', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}>
                {stage === 'loading' && (
                    <p style={{ color: '#333', fontSize: '14px' }}>Cargando oración...</p>
                )}
                {(stage === 'ready' || stage === 'recording' || stage === 'recorded' || stage === 'evaluating') && question && (
                    <div style={{ width: '100%', maxWidth: '600px' }}>
                        <p style={{ fontSize: '12px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                            Lee esta oración en voz alta
                        </p>
                        <div style={{
                            fontSize: '36px', fontWeight: 700, lineHeight: 1.4,
                            color: '#fff', marginBottom: '3rem',
                            borderLeft: '3px solid #6366f1', paddingLeft: '1.5rem',
                        }}>
                            {question.text}
                        </div>
                        <p style={{ fontSize: '12px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                            Tu pronunciación
                        </p>
                        <div style={{
                            background: '#16161d', border: '1px solid #2a2a35', borderRadius: '16px',
                            padding: '1.5rem', minHeight: '80px', marginBottom: '2rem',
                            fontSize: '20px', color: transcript ? '#aaa' : '#2a2a35',
                        }}>
                            {stage === 'evaluating' && !transcript
                                ? 'Transcribiendo...'
                                : transcript || 'Presiona Grabar y lee la oración...'}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem' }}>
                            {!isRecording
                                ? btn('🎤 Grabar', handleStartRecording, false, stage === 'evaluating' || !isSupported)
                                : btn('⏹ Detener', handleStopRecording, false, false)
                            }
                            {btn(
                                stage === 'evaluating' ? 'Evaluando...' : '✅ Evaluar',
                                handleEvaluate, true,
                                !transcript || isRecording || stage === 'evaluating'
                            )}
                        </div>
                        {transcript && !isRecording && stage !== 'evaluating' && (
                            <button onClick={() => { setTranscript(''); reset(); setStage('ready'); }} style={{
                                background: 'transparent', border: 'none', color: '#333',
                                fontSize: '12px', cursor: 'pointer', textDecoration: 'underline',
                            }}>
                                Borrar y volver a grabar
                            </button>
                        )}
                        {micError && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '1rem' }}>{micError}</p>}
                        {!isSupported && <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '1rem' }}>Usa Chrome para el micrófono.</p>}
                    </div>
                )}
                {stage === 'result' && result && (
                    <div style={{ width: '100%', maxWidth: '600px' }}>
                        <p style={{ fontSize: '12px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                            Oración
                        </p>
                        <div style={{
                            fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '2rem',
                            borderLeft: '3px solid #6366f1', paddingLeft: '1.5rem', lineHeight: 1.4,
                        }}>
                            {result.word}
                        </div>
                        <p style={{ fontSize: '12px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                            Dijiste
                        </p>
                        <div style={{
                            background: '#16161d', border: '1px solid #2a2a35', borderRadius: '16px',
                            padding: '1.5rem', fontSize: '20px', color: '#666', marginBottom: '3rem',
                        }}>
                            {result.transcribed_text}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {btn('Reintentar', handleRetry)}
                            {btn('Siguiente →', fetchQuestion, true)}
                        </div>
                    </div>
                )}
                {stage === 'error' && (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#ef4444', marginBottom: '1.5rem' }}>{errorMsg}</p>
                        {btn('Reintentar', fetchQuestion, true)}
                    </div>
                )}
            </div>

            {lessonCompleted && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: '#16161d', borderRadius: '16px', padding: '3rem',
                        textAlign: 'center', maxWidth: '500px', border: '1px solid #6366f1',
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>
                            ¡Lección completada!
                        </h2>
                        <p style={{ color: '#888', marginBottom: '2rem', lineHeight: 1.6 }}>
                            Felicidades, ganaste todo el XP posible en esta lección.
                        </p>
                        <div style={{ background: '#1e1e28', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                            <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                                Total XP ganado
                            </p>
                            <p style={{ fontSize: '36px', fontWeight: 900, color: '#22c55e' }}>
                                +{result?.xp_earned}
                            </p>
                        </div>
                        {btn('Continuar →', () => {
                            setLessonCompleted(false);
                            fetchQuestion();
                        }, true)}
                    </div>
                </div>
            )}
        </div>
    );
}
