"""
Servicio de scoring para Speaking.

Calcula similitud entre la palabra esperada y la transcripción
del alumno usando métricas fonéticas y de texto.
Sin API externa — 100% local.
"""

import jellyfish
from rapidfuzz import fuzz


def calculate_speaking_score(expected: str, transcript: str) -> tuple[int, float]:
    """
    Calcula el score de pronunciación.

    Args:
        expected:   Texto que el alumno debía pronunciar (question.correct_answer).
        transcript: Lo que captó la Web Speech API.

    Returns:
        score (int):              0-100
        transcription_match (float): 0.0-1.0
    """
    expected_clean = expected.lower().strip()
    transcript_clean = transcript.lower().strip()

    if not transcript_clean:
        return 0, 0.0

    if expected_clean == transcript_clean:
        return 100, 1.0

    # Similitud de texto puro — peso 40%
    text_sim = fuzz.ratio(expected_clean, transcript_clean) / 100.0

    # Similitud fonética Jaro-Winkler — peso 40%
    jaro = jellyfish.jaro_winkler_similarity(expected_clean, transcript_clean)

    # Coincidencia Soundex (fonética gruesa) — peso 20%
    try:
        soundex_match = float(
            jellyfish.soundex(expected_clean) == jellyfish.soundex(transcript_clean)
        )
    except Exception:
        soundex_match = 0.0

    raw_score = (text_sim * 0.4 + jaro * 0.4 + soundex_match * 0.2) * 100
    transcription_match = text_sim * 0.6 + jaro * 0.4

    score = round(min(max(raw_score, 0.0), 100.0))
    match = round(min(max(transcription_match, 0.0), 1.0), 4)

    return score, match