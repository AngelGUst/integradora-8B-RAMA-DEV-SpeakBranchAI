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


class SpeakingViewSet(viewsets.GenericViewSet):

    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='question')
    def question(self, request):
        """Obtiene una pregunta SPEAKING aleatoria de la BD"""
        try:
            questions = Question.objects.filter(type='SPEAKING', is_active=True)
            if not questions.exists():
                return Response(
                    {'detail': 'No hay preguntas SPEAKING disponibles'},
                    status=status.HTTP_404_NOT_FOUND
                )
            question = questions.order_by('?').first()
            return Response({
                "id": question.id,
                "text": question.text,
                "difficulty": question.difficulty,
                "level": question.level,
                "phonetic_text": question.phonetic_text,
                "xp_max": question.xp_max,
            })
        except Exception as e:
            return Response(
                {'detail': f'Error al obtener pregunta: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
        
        # ---- LÓGICA XP POR EJERCICIO ----
        xp = 0
        xp_message = ""
        
        if request.user.is_authenticated:
            # ★ Verificar si ya hay intento con score >= 80 en ESTE ejercicio
            previous_successful = SpeakingAttempt.objects.filter(
                user=request.user,
                question=question,
                score__gte=80
            ).first()
            
            if score >= 80:
                if previous_successful:
                    # Ya completó este ejercicio, no suma más
                    xp = 0
                    xp_message = "Ya completaste este ejercicio con una calificación aprobatoria."
                else:
                    # Primera vez con score >= 80, suma xp_max
                    xp = question.xp_max
                    xp_message = f"¡Excelente! Obtuviste {xp} XP."
            else:
                # Score < 80: suma pequeño proporcional
                xp = max(0, round((score / 100) * 5))
                if xp > 0:
                    xp_message = f"Obtuviste {xp} XP. Intenta de nuevo para obtener la calificación completa."
                else:
                    xp_message = "No obtuviste suficientes puntos. ¡Intenta de nuevo!"

        # ---- REGISTRAR XP EN LECCIÓN ----
        lesson_progress = None
        if request.user.is_authenticated:
            lesson_progress, _ = AttemptLessonProgress.objects.get_or_create(
                user=request.user,
                question_type=question.type,
                question_level=question.level,
            )
            lesson_progress.refresh_from_db()
            
            # Sumar XP a la lección
            if xp > 0:
                lesson_progress.xp_easy += xp
                lesson_progress.save()
                lesson_progress.refresh_from_db()
            
            # Guardar el intento
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
            "lesson_progress": {
                "total_xp": lesson_progress.total_xp if lesson_progress else 0,
                "max_xp": 60,
                "is_completed": lesson_progress.is_completed if lesson_progress else False,
                "xp_breakdown": {
                    "easy": lesson_progress.xp_easy if lesson_progress else 0,
                    "medium": lesson_progress.xp_medium if lesson_progress else 0,
                    "hard": lesson_progress.xp_hard if lesson_progress else 0,
                }
            }
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
        
        # ---- LÓGICA XP POR EJERCICIO ----
        xp_earned = 0
        xp_message = ""
        
        if request.user.is_authenticated:
            # ★ Verificar si ya hay intento con score >= 80 en ESTE ejercicio
            previous_successful = WritingAttempt.objects.filter(
                user=request.user,
                question=question,
                score__gte=80
            ).first()
            
            if score >= 80:
                if previous_successful:
                    # Ya completó este ejercicio, no suma más
                    xp_earned = 0
                    xp_message = "Ya completaste este ejercicio con una calificación aprobatoria."
                else:
                    # Primera vez con score >= 80, suma xp_max
                    xp_earned = question.xp_max
                    xp_message = f"¡Excelente! Obtuviste {xp_earned} XP."
            else:
                # Score < 80: suma pequeño proporcional
                xp_earned = max(0, round((score / 100) * 5))
                if xp_earned > 0:
                    xp_message = f"Obtuviste {xp_earned} XP. Intenta de nuevo para obtener la calificación completa."
                else:
                    xp_message = "No obtuviste suficientes puntos. ¡Intenta de nuevo!"
        
        lesson_progress = None

        if request.user.is_authenticated:
            # ---- REGISTRAR XP EN LECCIÓN ----
            lesson_progress, _ = AttemptLessonProgress.objects.get_or_create(
                user=request.user,
                question_type=question.type,
                question_level=question.level,
            )
            lesson_progress.refresh_from_db()
            
            # Sumar XP a la lección
            if xp_earned > 0:
                lesson_progress.xp_easy += xp_earned
                lesson_progress.save()
                lesson_progress.refresh_from_db()
            
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
            'lesson_progress': {
                "total_xp": lesson_progress.total_xp if lesson_progress else 0,
                "max_xp": 60,
                "is_completed": lesson_progress.is_completed if lesson_progress else False,
                "xp_breakdown": {
                    "easy": lesson_progress.xp_easy if lesson_progress else 0,
                    "medium": lesson_progress.xp_medium if lesson_progress else 0,
                    "hard": lesson_progress.xp_hard if lesson_progress else 0,
                }
            }
        }, status=status.HTTP_200_OK)
        


class ReadingViewSet(viewsets.GenericViewSet):
    """ViewSet para ejercicios de Reading (MCQ)"""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='question')
    def question(self, request):
        """Obtiene una pregunta READING aleatoria de la BD"""
        try:
            questions = Question.objects.filter(type='READING', is_active=True)
            if not questions.exists():
                return Response(
                    {'detail': 'No hay preguntas READING disponibles'},
                    status=status.HTTP_404_NOT_FOUND
                )
            question = questions.order_by('?').first()
            return Response({
                "id": question.id,
                "text": question.text,
                "difficulty": question.difficulty,
                "level": question.level,
                "correct_answer": question.correct_answer,
                "xp_max": question.xp_max,
            })
        except Exception as e:
            return Response(
                {'detail': f'Error al obtener pregunta: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

        # ★ PARSEAR JSON DEL correct_answer
        correct_value = None
        try:
            parsed = json.loads(question.correct_answer)
            if isinstance(parsed, dict) and 'questions' in parsed:
                questions_list = parsed.get('questions', [])
                if questions_list and isinstance(questions_list[0], dict):
                    correct_value = questions_list[0].get('correct')
            else:
                correct_value = question.correct_answer
        except (json.JSONDecodeError, TypeError, IndexError):
            correct_value = question.correct_answer

        # Evaluar respuesta
        correct = str(selected_answer).strip().lower() == str(correct_value).strip().lower()
        score = 100 if correct else 0
        
        # ---- LÓGICA XP POR EJERCICIO ----
        xp = 0
        xp_message = ""
        
        if request.user.is_authenticated:
            from attempts.models.reading_attempt import ReadingAttempt
            
            # ★ Verificar si ya hay intento con score >= 80 en ESTE ejercicio
            previous_successful = ReadingAttempt.objects.filter(
                user=request.user,
                question=question,
                score__gte=80
            ).first()
            
            if score >= 80:
                if previous_successful:
                    # Ya completó este ejercicio, no suma más
                    xp = 0
                    xp_message = "Ya completaste este ejercicio con una calificación aprobatoria."
                else:
                    # Primera vez con score >= 80, suma xp_max
                    xp = question.xp_max
                    xp_message = f"¡Excelente! Obtuviste {xp} XP."
            else:
                # Score < 80: suma pequeño proporcional
                xp = max(0, round((score / 100) * 5))
                if xp > 0:
                    xp_message = f"Obtuviste {xp} XP. Intenta de nuevo para obtener la calificación completa."
                else:
                    xp_message = "No obtuviste suficientes puntos. ¡Intenta de nuevo!"

        # ---- REGISTRAR XP EN LECCIÓN ----
        lesson_progress = None
        if request.user.is_authenticated:
            from attempts.models.reading_attempt import ReadingAttempt
            lesson_progress, _ = AttemptLessonProgress.objects.get_or_create(
                user=request.user,
                question_type=question.type,
                question_level=question.level,
            )
            lesson_progress.refresh_from_db()
            
            # Sumar XP a la lección
            if xp > 0:
                lesson_progress.xp_easy += xp
                lesson_progress.save()
                lesson_progress.refresh_from_db()
            
            # Guardar intento
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
            "lesson_progress": {
                "total_xp": lesson_progress.total_xp if lesson_progress else 0,
                "max_xp": 60,
                "is_completed": lesson_progress.is_completed if lesson_progress else False,
                "xp_breakdown": {
                    "easy": lesson_progress.xp_easy if lesson_progress else 0,
                    "medium": lesson_progress.xp_medium if lesson_progress else 0,
                    "hard": lesson_progress.xp_hard if lesson_progress else 0,
                }
            }
        }, status=status.HTTP_201_CREATED)


class ListeningShadowingViewSet(viewsets.GenericViewSet):
    """ViewSet para ejercicios de Listening Shadowing"""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='question')
    def question(self, request):
        """Obtiene una pregunta LISTENING_SHADOWING aleatoria"""
        try:
            questions = Question.objects.filter(type='LISTENING_SHADOWING', is_active=True)
            if not questions.exists():
                return Response(
                    {'detail': 'No hay preguntas LISTENING_SHADOWING disponibles'},
                    status=status.HTTP_404_NOT_FOUND
                )
            question = questions.order_by('?').first()
            return Response({
                "id": question.id,
                "text": question.text,
                "difficulty": question.difficulty,
                "level": question.level,
                "correct_answer": question.correct_answer,
                "audio_url": question.audio_url,
                "xp_max": question.xp_max,
            })
        except Exception as e:
            return Response(
                {'detail': f'Error al obtener pregunta: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
        
        # ---- LÓGICA XP POR EJERCICIO ----
        xp = 0
        xp_message = ""
        
        if request.user.is_authenticated:
            # ★ Verificar si ya hay intento con score >= 80 en ESTE ejercicio
            previous_successful = SpeakingAttempt.objects.filter(
                user=request.user,
                question=question,
                score__gte=80
            ).first()
            
            if score >= 80:
                if previous_successful:
                    # Ya completó este ejercicio, no suma más
                    xp = 0
                    xp_message = "Ya completaste este ejercicio con una calificación aprobatoria."
                else:
                    # Primera vez con score >= 80, suma xp_max
                    xp = question.xp_max
                    xp_message = f"¡Excelente! Obtuviste {xp} XP."
            else:
                # Score < 80: suma pequeño proporcional
                xp = max(0, round((score / 100) * 5))
                if xp > 0:
                    xp_message = f"Obtuviste {xp} XP. Intenta de nuevo para obtener la calificación completa."
                else:
                    xp_message = "No obtuviste suficientes puntos. ¡Intenta de nuevo!"

        # ---- REGISTRAR XP EN LECCIÓN ----
        lesson_progress = None
        if request.user.is_authenticated:
            lesson_progress, _ = AttemptLessonProgress.objects.get_or_create(
                user=request.user,
                question_type=question.type,
                question_level=question.level,
            )
            lesson_progress.refresh_from_db()
            
            # Sumar XP a la lección
            if xp > 0:
                lesson_progress.xp_easy += xp
                lesson_progress.save()
                lesson_progress.refresh_from_db()
            
            # Guardar intento
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
            "lesson_progress": {
                "total_xp": lesson_progress.total_xp if lesson_progress else 0,
                "max_xp": 60,
                "is_completed": lesson_progress.is_completed if lesson_progress else False,
                "xp_breakdown": {
                    "easy": lesson_progress.xp_easy if lesson_progress else 0,
                    "medium": lesson_progress.xp_medium if lesson_progress else 0,
                    "hard": lesson_progress.xp_hard if lesson_progress else 0,
                }
            }
        }, status=status.HTTP_201_CREATED)


class ListeningComprehensionViewSet(viewsets.GenericViewSet):
    """ViewSet para ejercicios de Listening Comprehension (MCQ)"""
    permission_classes = [AllowAny]
 
    @action(detail=False, methods=['get'], url_path='question')
    def question(self, request):
        """Obtiene una pregunta LISTENING_COMPREHENSION aleatoria"""
        try:
            questions = Question.objects.filter(type='LISTENING_COMPREHENSION', is_active=True)
            if not questions.exists():
                return Response(
                    {'detail': 'No hay preguntas LISTENING_COMPREHENSION disponibles'},
                    status=status.HTTP_404_NOT_FOUND
                )
            question = questions.order_by('?').first()
            return Response({
                "id": question.id,
                "text": question.text,
                "difficulty": question.difficulty,
                "level": question.level,
                "correct_answer": question.correct_answer,
                "audio_url": question.audio_url,
                "phonetic_text": question.phonetic_text,
                "xp_max": question.xp_max,
            })
        except Exception as e:
            return Response(
                {'detail': f'Error al obtener pregunta: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
 
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
 
        # ★ PARSEAR JSON DEL correct_answer
        correct_value = None
        try:
            parsed = json.loads(question.correct_answer)
            if isinstance(parsed, dict) and 'questions' in parsed:
                questions_list = parsed.get('questions', [])
                if questions_list and isinstance(questions_list[0], dict):
                    correct_value = questions_list[0].get('correct')
            else:
                correct_value = question.correct_answer
        except (json.JSONDecodeError, TypeError, IndexError):
            correct_value = question.correct_answer
 
        # Evaluar respuesta
        correct = str(selected_answer).strip().lower() == str(correct_value).strip().lower()
        score = 100 if correct else 0
        
        # ---- LÓGICA XP POR EJERCICIO ----
        xp = 0
        xp_message = ""
        
        if request.user.is_authenticated:
            from attempts.models.reading_attempt import ReadingAttempt
            
            # ★ Verificar si ya hay intento con score >= 80 en ESTE ejercicio
            previous_successful = ReadingAttempt.objects.filter(
                user=request.user,
                question=question,
                score__gte=80
            ).first()
            
            if score >= 80:
                if previous_successful:
                    # Ya completó este ejercicio, no suma más
                    xp = 0
                    xp_message = "Ya completaste este ejercicio con una calificación aprobatoria."
                else:
                    # Primera vez con score >= 80, suma xp_max
                    xp = question.xp_max
                    xp_message = f"¡Excelente! Obtuviste {xp} XP."
            else:
                # Score < 80: suma pequeño proporcional
                xp = max(0, round((score / 100) * 5))
                if xp > 0:
                    xp_message = f"Obtuviste {xp} XP. Intenta de nuevo para obtener la calificación completa."
                else:
                    xp_message = "No obtuviste suficientes puntos. ¡Intenta de nuevo!"
 
        # ---- REGISTRAR XP EN LECCIÓN ----
        lesson_progress = None
        if request.user.is_authenticated:
            from attempts.models.reading_attempt import ReadingAttempt
            lesson_progress, _ = AttemptLessonProgress.objects.get_or_create(
                user=request.user,
                question_type=question.type,
                question_level=question.level,
            )
            lesson_progress.refresh_from_db()
            
            # Sumar XP a la lección
            if xp > 0:
                lesson_progress.xp_easy += xp
                lesson_progress.save()
                lesson_progress.refresh_from_db()
            
            # Guardar intento
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
            "lesson_progress": {
                "total_xp": lesson_progress.total_xp if lesson_progress else 0,
                "max_xp": 60,
                "is_completed": lesson_progress.is_completed if lesson_progress else False,
                "xp_breakdown": {
                    "easy": lesson_progress.xp_easy if lesson_progress else 0,
                    "medium": lesson_progress.xp_medium if lesson_progress else 0,
                    "hard": lesson_progress.xp_hard if lesson_progress else 0,
                }
            }
        }, status=status.HTTP_201_CREATED)