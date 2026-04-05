import json
import random

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from questions.models import Question

LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']


class DiagnosticQuestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            count = int(request.query_params.get('count', 10))
        except ValueError:
            count = 10

        per_level = max(1, count // len(LEVEL_ORDER))
        selected = []
        selected_ids = set()

        for level in LEVEL_ORDER:
            qs = Question.objects.filter(
                is_active=True,
                type='READING',
                level=level,
            ).order_by('?')[:per_level]
            for question in qs:
                if question.id not in selected_ids:
                    selected.append(question)
                    selected_ids.add(question.id)

        if len(selected) < count:
            remaining = count - len(selected)
            fillers = Question.objects.filter(
                is_active=True,
                type='READING',
            ).exclude(id__in=selected_ids).order_by('?')[:remaining]
            selected.extend(list(fillers))

        payload = []
        for question in selected:
            try:
                data = json.loads(question.correct_answer)
                options = data.get('options')
                correct = data.get('correct')
                if not isinstance(options, list) or not options:
                    continue
                if correct not in options:
                    continue
                correct_index = options.index(correct)
            except (TypeError, ValueError, json.JSONDecodeError):
                continue

            payload.append({
                'id': question.id,
                'level': question.level,
                'skill': 'Reading',
                'text': question.text,
                'options': options,
                'correct': correct_index,
            })

        if len(payload) < count and len(payload) < len(selected):
            random.shuffle(payload)

        return Response({'count': len(payload), 'questions': payload})
