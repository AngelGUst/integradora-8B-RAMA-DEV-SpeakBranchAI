import random
import traceback

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from questions.models import Question
from .models import SpeakingAttempt, WritingAttempt
from .serializers import (
    SpeakingEvaluateRequestSerializer,
    SpeakingEvaluateResponseSerializer,
    SpeakingHistorySerializer,
    SpeakingQuestionSerializer,
    WritingEvaluateRequestSerializer,
)
from .services import calculate_speaking_score, evaluate_writing


class SpeakingViewSet(viewsets.GenericViewSet):

    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='question')
    def question(self, request):
        preguntas = [
            {"id": 1, "text": "The weather is nice today", "difficulty": "EASY", "level": "A1", "phonetic_text": None, "xp_max": 10},
            {"id": 2, "text": "She sells seashells by the seashore", "difficulty": "MEDIUM", "level": "B1", "phonetic_text": None, "xp_max": 20},
            {"id": 3, "text": "How much wood would a woodchuck chuck", "difficulty": "HARD", "level": "B2", "phonetic_text": None, "xp_max": 30},
        ]
        return Response(random.choice(preguntas))

    @action(detail=False, methods=['post'], url_path='evaluate')
    def evaluate(self, request):
        transcript = request.data.get('transcript', '')
        question_id = request.data.get('question_id', 1)
        attempts_count = request.data.get('attempts_count', 1)

        preguntas = {
            1: "The weather is nice today",
            2: "She sells seashells by the seashore",
            3: "How much wood would a woodchuck chuck",
        }

        expected = preguntas.get(question_id, "The weather is nice today")
        score, match = calculate_speaking_score(expected, transcript)
        xp = max(0, round(10 * (score / 100) - 3 * (attempts_count - 1)))

        return Response({
            "id": 1,
            "word": expected,
            "transcribed_text": transcript,
            "score": score,
            "xp_earned": xp,
            "attempts_count": attempts_count,
            "created_at": "2026-03-26T00:00:00Z",
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='transcribe')
    def transcribe(self, request):
        audio = request.FILES.get('audio')

        if not audio:
            return Response(
                {'detail': 'No se recibió archivo de audio.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from .services import transcribe_audio
            text = transcribe_audio(audio)
            return Response({'transcript': text})
        except Exception as e:
            print(traceback.format_exc())
            return Response(
                {'detail': f'Error al transcribir: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        return Response([])


class WritingViewSet(viewsets.GenericViewSet):

    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='evaluate')
    def evaluate(self, request):
        serializer = WritingEvaluateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question_id = serializer.validated_data['question_id']
        student_text = serializer.validated_data['student_text']

        try:
            question = Question.objects.get(id=question_id, type='WRITING', is_active=True)
        except Question.DoesNotExist:
            return Response(
                {'detail': 'Pregunta no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            result = evaluate_writing(
                student_text=student_text,
                evaluation_instructions=question.correct_answer,
                prompt_text=question.text,
            )
        except Exception:
            print(traceback.format_exc())
            return Response(
                {'detail': 'Error al conectar con el servicio de evaluación. Intenta de nuevo.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        score = round(
            result['score_grammar']    * 0.35 +
            result['score_vocabulary'] * 0.25 +
            result['score_coherence']  * 0.25 +
            result['score_spelling']   * 0.15
        )
        xp_earned = round(question.xp_max * (score / 100))

        if request.user.is_authenticated:
            attempt = WritingAttempt(
                user=request.user,
                question=question,
                prompt_text=question.text,
                student_text=student_text,
                score_grammar=result['score_grammar'],
                score_vocabulary=result['score_vocabulary'],
                score_coherence=result['score_coherence'],
                score_spelling=result['score_spelling'],
                score=score,
                ai_feedback=result['feedback'],
                difficulty=question.difficulty,
                xp_earned=xp_earned,
                api_response_raw=result['raw'],
            )
            attempt.save()

        return Response({
            'score':            score,
            'score_grammar':    result['score_grammar'],
            'score_vocabulary': result['score_vocabulary'],
            'score_coherence':  result['score_coherence'],
            'score_spelling':   result['score_spelling'],
            'feedback':         result['feedback'],
            'xp_earned':        xp_earned,
        }, status=status.HTTP_200_OK)