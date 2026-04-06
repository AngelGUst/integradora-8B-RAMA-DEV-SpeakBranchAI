import json
from openai import OpenAI
from django.conf import settings


SYSTEM_PROMPT = """You are an English language teacher evaluating a student's writing exercise.
Evaluate the student's text and return ONLY a valid JSON object with this exact structure:
{
  "score_grammar": <integer 0-100>,
  "score_vocabulary": <integer 0-100>,
  "score_coherence": <integer 0-100>,
  "score_spelling": <integer 0-100>,
  "feedback": "<constructive feedback in Spanish, 2-4 sentences>"
}
No extra text, no markdown, only the JSON object."""


def evaluate_writing(student_text: str, evaluation_instructions: str, prompt_text: str) -> dict:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    user_prompt = (
        f"Exercise prompt given to the student:\n{prompt_text}\n\n"
        f"Evaluation criteria:\n{evaluation_instructions}\n\n"
        f"Student's response:\n{student_text}"
    )

    response = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_prompt},
        ],
        response_format={'type': 'json_object'},
        temperature=0.2,
        max_tokens=400,
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)

    return {
        'score_grammar':    float(data.get('score_grammar', 0)),
        'score_vocabulary': float(data.get('score_vocabulary', 0)),
        'score_coherence':  float(data.get('score_coherence', 0)),
        'score_spelling':   float(data.get('score_spelling', 0)),
        'feedback':         data.get('feedback', ''),
        'raw':              data,
    }
