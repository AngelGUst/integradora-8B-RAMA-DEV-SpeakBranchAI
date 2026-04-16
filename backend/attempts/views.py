import random
import traceback
import json

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from attempts.services.whisper_transcription import generate_audio_url
from questions.models import Question

from .models import SpeakingAttempt, WritingAttempt, AttemptLessonProgress
from .serializers import (
    SpeakingEvaluateRequestSerializer,
    SpeakingEvaluateResponseSerializer,
    SpeakingHistorySerializer,
    SpeakingQuestionSerializer,
    WritingEvaluateRequestSerializer,
)
from .services import calculate_speaking_score, evaluate_writing

# Message constants to avoid duplication
MSG_ALREADY_COMPLETED = "Ya completaste este ejercicio con una calificación aprobatoria."
MSG_INSUFFICIENT_SCORE = "No obtuviste suficientes puntos. ¡Intenta de nuevo!"


# Helper functions to reduce cognitive complexity
def _calculate_xp_for_attempt(user, question, score, attempt_model):
    """Calculate XP and message based on score and previous attempts"""
    xp = 0
    xp_message = ""
    
    if not user.is_authenticated:
        return xp, xp_message
    
    previous_successful = attempt_model.objects.filter(
        user=user,
        question=question,
        score__gte=80
    ).first()
    
    if score >= 80:
        if previous_successful:
            xp = 0
            xp_message = MSG_ALREADY_COMPLETED
        else:
            xp = question.xp_max
            xp_message = f"¡Excelente! Obtuviste {xp} XP."
    else:
        xp = max(0, round((score / 100) * 5))
        if xp > 0:
            xp_message = f"Obtuviste {xp} XP. Intenta de nuevo para obtener la calificación completa."
        else:
            xp_message = MSG_INSUFFICIENT_SCORE
    
    return xp, xp_message


def _update_lesson_progress(user, question, xp):
    """Update lesson progress and return progress object"""
    if not user.is_authenticated:
        return None
    
    lesson_progress, _ = AttemptLessonProgress.objects.get_or_create(
        user=user,
        question_type=question.type,
        question_level=question.level,
    )
    lesson_progress.refresh_from_db()
    
    if xp > 0:
        lesson_progress.xp_easy += xp
        lesson_progress.save()
        lesson_progress.refresh_from_db()
    
    return lesson_progress


def _get_lesson_progress_response(lesson_progress):
    """Generate standard lesson progress response"""
    if not lesson_progress:
        return {
            "total_xp": 0,
            "max_xp": 60,
            "is_completed": False,
            "xp_breakdown": {"easy": 0, "medium": 0, "hard": 0}
        }
    
    return {
        "total_xp": lesson_progress.total_xp,
        "max_xp": 60,
        "is_completed": lesson_progress.is_completed,
        "xp_breakdown": {
            "easy": lesson_progress.xp_easy,
            "medium": lesson_progress.xp_medium,
            "hard": lesson_progress.xp_hard,
        }
    }


def _parse_mcq_correct_answer(question):
    """Parse the correct answer from JSON format used in MCQ questions
    
    Returns the correct answer value or the raw correct_answer if parsing fails
    """
    try:
        parsed = json.loads(question.correct_answer)
        if isinstance(parsed, dict) and 'questions' in parsed:
            questions_list = parsed.get('questions', [])
            if questions_list and isinstance(questions_list[0], dict):
                return questions_list[0].get('correct')
        return question.correct_answer
    except (json.JSONDecodeError, TypeError, IndexError):
        return question.correct_answer


def _get_random_question(question_type, additional_fields=None):
    """Get a random question of the specified type
    
    Args:
        question_type: The type of question to retrieve
        additional_fields: Optional list of additional field names to include in response
    
    Returns:
        Response object with question data or error
    """
    try:
        questions = Question.objects.filter(type=question_type, is_active=True)
        if not questions.exists():
            return Response(
                {'detail': f'No hay preguntas {question_type} disponibles'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        question = questions.order_by('?').first()
        
        # Base fields always included
        response_data = {
            "id": question.id,
            "text": question.text,
            "difficulty": question.difficulty,
            "level": question.level,
            "correct_answer": question.correct_answer,
            "xp_max": question.xp_max,
        }
        
        # Add additional fields if specified
        if additional_fields:
            for field in additional_fields:
                if hasattr(question, field):
                    response_data[field] = getattr(question, field)
        
        return Response(response_data)
    except Exception as e:
        return Response(
            {'detail': f'Error al obtener pregunta: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class SpeakingViewSet(viewsets.GenericViewSet):

    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='question')
    def question(self, request):
        """Obtiene una pregunta SPEAKING aleatoria de la BD"""
        return _get_random_question('SPEAKING', additional_fields=['phonetic_text'])

    @action(detail=False, methods=['post'], url_path='evaluate')
    def evaluate(self, request):
        transcript = request.data.get('transcript', '')
        question_id = request.data.get('question_id')
        attempts_count = request.data.get('attempts_count', 1)

        if not question_id:
            return Response(
                {'detail': 'question_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            question = Question.objects.get(id=question_id, type='SPEAKING', is_active=True)
        except Question.DoesNotExist:
            return Response(
                {'detail': f'Pregunta SPEAKING con ID {question_id} no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        expected = question.correct_answer or question.text
        score, match = calculate_speaking_score(expected, transcript)
        
        # Calculate XP using helper
        xp, xp_message = _calculate_xp_for_attempt(
            request.user, question, score, SpeakingAttempt
        )
        
        # Update lesson progress using helper
        lesson_progress = _update_lesson_progress(request.user, question, xp)
        
        # Save the attempt
        if request.user.is_authenticated:
            SpeakingAttempt.objects.create(
                user=request.user,
                question=question,
                expected_text=expected,
                transcribed_text=transcript,
                transcription_match=match,
                score=score,
                attempts_count=attempts_count,
                difficulty=question.difficulty,
                xp_earned=xp,
            )

        return Response({
            "id": question.id,
            "text": question.text,
            "transcribed_text": transcript,
            "score": score,
            "xp_earned": xp,
            "xp_message": xp_message,
            "attempts_count": attempts_count,
            "created_at": "2026-03-26T00:00:00Z",
            "lesson_progress": _get_lesson_progress_response(lesson_progress)
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

    @action(detail=False, methods=['post'], url_path='generate-audio', permission_classes=[IsAuthenticated])
    def generate_audio(self, request):
        """Genera audio para una pregunta (solo admin)"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Solo administradores pueden generar audios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        text = request.data.get('text')
        question_id = request.data.get('question_id')
        
        if not text or not question_id:
            return Response(
                {'error': 'text y question_id son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        url = generate_audio_url(text, question_id)
        
        if not url:
            return Response(
                {'error': 'Error generando audio'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            question = Question.objects.get(id=question_id)
            question.audio_url = url
            question.save()
            
            return Response({
                'audio_url': url,
                'success': True,
                'question_id': question_id
            })
        except Question.DoesNotExist:
            return Response(
                {'error': 'Pregunta no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )


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
        
        # Calculate XP using helper
        xp_earned, xp_message = _calculate_xp_for_attempt(
            request.user, question, score, WritingAttempt
        )
        
        # Update lesson progress using helper
        lesson_progress = _update_lesson_progress(request.user, question, xp_earned)
        
        # Save the attempt
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
            'xp_message':       xp_message,
            'lesson_progress': _get_lesson_progress_response(lesson_progress)
        }, status=status.HTTP_200_OK)
        


class ReadingViewSet(viewsets.GenericViewSet):
    """ViewSet para ejercicios de Reading (MCQ)"""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='question')
    def question(self, request):
        """Obtiene una pregunta READING aleatoria de la BD"""
        return _get_random_question('READING')

    @action(detail=False, methods=['post'], url_path='evaluate')
    def evaluate(self, request):
        """Evalúa respuesta de Reading (MCQ)"""
        question_id = request.data.get('question_id')
        selected_answer = request.data.get('selected_answer')

        if not question_id or selected_answer is None:
            return Response(
                {'detail': 'question_id y selected_answer son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            question = Question.objects.get(id=question_id, type='READING', is_active=True)
        except Question.DoesNotExist:
            return Response(
                {'detail': f'Pregunta READING con ID {question_id} no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Parse correct answer using helper
        correct_value = _parse_mcq_correct_answer(question)

        # Evaluar respuesta
        correct = str(selected_answer).strip().lower() == str(correct_value).strip().lower()
        score = 100 if correct else 0
        
        # Calculate XP using helper
        from attempts.models.reading_attempt import ReadingAttempt
        xp, xp_message = _calculate_xp_for_attempt(
            request.user, question, score, ReadingAttempt
        )
        
        # Update lesson progress using helper
        lesson_progress = _update_lesson_progress(request.user, question, xp)
        
        # Save the attempt
        if request.user.is_authenticated:
            ReadingAttempt.objects.create(
                user=request.user,
                question=question,
                selected_answer=selected_answer,
                correct=correct,
                score=score,
                difficulty=question.difficulty,
                xp_earned=xp,
            )

        return Response({
            "id": question.id,
            "selected_answer": selected_answer,
            "correct": correct,
            "score": score,
            "xp_earned": xp,
            "xp_message": xp_message,
            "lesson_progress": _get_lesson_progress_response(lesson_progress)
        }, status=status.HTTP_201_CREATED)


class ListeningShadowingViewSet(viewsets.GenericViewSet):
    """ViewSet para ejercicios de Listening Shadowing"""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='question')
    def question(self, request):
        """Obtiene una pregunta LISTENING_SHADOWING aleatoria"""
        return _get_random_question('LISTENING_SHADOWING', additional_fields=['audio_url'])

    @action(detail=False, methods=['post'], url_path='evaluate')
    def evaluate(self, request):
        """Evalúa respuesta de Shadowing"""
        question_id = request.data.get('question_id')
        transcript = request.data.get('transcript', '')

        if not question_id:
            return Response(
                {'detail': 'question_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            question = Question.objects.get(id=question_id, type='LISTENING_SHADOWING', is_active=True)
        except Question.DoesNotExist:
            return Response(
                {'detail': f'Pregunta LISTENING_SHADOWING con ID {question_id} no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        expected = question.correct_answer or question.text
        score, match = calculate_speaking_score(expected, transcript)
        
        # Calculate XP using helper
        xp, xp_message = _calculate_xp_for_attempt(
            request.user, question, score, SpeakingAttempt
        )
        
        # Update lesson progress using helper
        lesson_progress = _update_lesson_progress(request.user, question, xp)
        
        # Save the attempt
        if request.user.is_authenticated:
            SpeakingAttempt.objects.create(
                user=request.user,
                question=question,
                expected_text=expected,
                transcribed_text=transcript,
                transcription_match=match,
                score=score,
                difficulty=question.difficulty,
                xp_earned=xp,
            )

        return Response({
            "id": question.id,
            "transcribed_text": transcript,
            "score": score,
            "xp_earned": xp,
            "xp_message": xp_message,
            "lesson_progress": _get_lesson_progress_response(lesson_progress)
        }, status=status.HTTP_201_CREATED)


class ListeningComprehensionViewSet(viewsets.GenericViewSet):
    """ViewSet para ejercicios de Listening Comprehension (MCQ)"""
    permission_classes = [AllowAny]
 
    @action(detail=False, methods=['get'], url_path='question')
    def question(self, request):
        """Obtiene una pregunta LISTENING_COMPREHENSION aleatoria"""
        return _get_random_question('LISTENING_COMPREHENSION', additional_fields=['audio_url', 'phonetic_text'])
 
    @action(detail=False, methods=['post'], url_path='evaluate')
    def evaluate(self, request):
        """Evalúa respuesta de Listening Comprehension (MCQ)"""
        question_id = request.data.get('question_id')
        selected_answer = request.data.get('selected_answer')
 
        if not question_id or selected_answer is None:
            return Response(
                {'detail': 'question_id y selected_answer son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        try:
            question = Question.objects.get(id=question_id, type='LISTENING_COMPREHENSION', is_active=True)
        except Question.DoesNotExist:
            return Response(
                {'detail': f'Pregunta LISTENING_COMPREHENSION con ID {question_id} no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
 
        # Parse correct answer using helper
        correct_value = _parse_mcq_correct_answer(question)
 
        # Evaluar respuesta
        correct = str(selected_answer).strip().lower() == str(correct_value).strip().lower()
        score = 100 if correct else 0
        
        # Calculate XP using helper
        from attempts.models.reading_attempt import ReadingAttempt
        xp, xp_message = _calculate_xp_for_attempt(
            request.user, question, score, ReadingAttempt
        )
        
        # Update lesson progress using helper
        lesson_progress = _update_lesson_progress(request.user, question, xp)
        
        # Save the attempt
        if request.user.is_authenticated:
            ReadingAttempt.objects.create(
                user=request.user,
                question=question,
                selected_answer=selected_answer,
                correct=correct,
                score=score,
                difficulty=question.difficulty,
                xp_earned=xp,
            )
 
        return Response({
            "id": question.id,
            "selected_answer": selected_answer,
            "correct": correct,
            "score": score,
            "xp_earned": xp,
            "xp_message": xp_message,
            "lesson_progress": _get_lesson_progress_response(lesson_progress)
        }, status=status.HTTP_201_CREATED)