from gtts import gTTS
import os

# Preguntas a convertir
preguntas = [
    (50, "Can I have a cup of coffee, please?"),
    (51, "I would like a cup of coffee with sugar and milk, please. How much does it cost?"),
]

# Crear carpeta audios
os.makedirs("audios", exist_ok=True)

for qid, text in preguntas:
    print(f"Generando audio {qid}...")
    tts = gTTS(text=text, lang='en', slow=False)
    filename = f"audios/question_{qid}.mp3"
    tts.save(filename)
    print(f"✅ {filename}")

print("\n✅ Todos los audios fueron generados en la carpeta 'audios/'")