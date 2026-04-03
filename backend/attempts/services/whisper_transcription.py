from openai import OpenAI
from django.conf import settings


def transcribe_audio(audio_file) -> str:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    transcription = client.audio.transcriptions.create(
        model='whisper-1',
        file=(audio_file.name, audio_file.read(), audio_file.content_type),
        language='en',
    )

    return transcription.text.strip()