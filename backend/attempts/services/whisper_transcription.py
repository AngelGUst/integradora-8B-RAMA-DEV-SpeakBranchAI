from openai import OpenAI
from django.conf import settings
from gtts import gTTS
import requests
import uuid
from io import BytesIO
from typing import Optional


def transcribe_audio(audio_file) -> str:
    """Transcribe audio using OpenAI Whisper API"""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    transcription = client.audio.transcriptions.create(
        model='whisper-1',
        file=(audio_file.name, audio_file.read(), audio_file.content_type),
        language='en',
    )

    return transcription.text.strip()


def generate_audio_url(text: str, question_id: int) -> Optional[str]:
    """
    Genera audio de un texto con gTTS y lo sube a Supabase Storage.
    Retorna la URL pública del audio, o None si hay error.
    """
    try:
        tts = gTTS(text=text, lang='en', slow=False)
        audio_buffer = BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        filename = f"question_{question_id}_{uuid.uuid4().hex[:8]}.mp3"
        
        url = f"https://{settings.SUPABASE_HOST.split('.')[0]}.supabase.co/storage/v1/object/speaking-audios/{filename}"
        
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
            "Content-Type": "audio/mpeg"
        }
        
        response = requests.post(url, data=audio_buffer.getvalue(), headers=headers)
        
        if response.status_code not in [200, 201]:
            print(f"❌ Error Supabase: {response.text}")
            return None
        
        public_url = f"https://{settings.SUPABASE_HOST.split('.')[0]}.supabase.co/storage/v1/object/public/speaking-audios/{filename}"
        
        print(f"✅ Audio generado: {public_url}")
        return public_url
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None