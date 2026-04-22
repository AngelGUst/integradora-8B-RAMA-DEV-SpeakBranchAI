"""
Mixins for question serializers to reduce code duplication.
"""
from rest_framework import serializers


class JSONQuestionValidatorMixin:
    """
    Mixin for validating JSON-based correct_answer fields.
    Supports both new format (multiple questions) and legacy format (single question).
    """

    def _validate_question_item(self, question, index):
        """Validate a single question item in the new format."""
        options = question.get('options')
        correct = question.get('correct')
        
        if not isinstance(options, list) or len(options) < 2:
            raise serializers.ValidationError(
                f'Pregunta {index + 1}: "options" debe ser una lista con al menos 2 elementos.'
            )
        
        if not isinstance(correct, str):
            raise serializers.ValidationError(
                f'Pregunta {index + 1}: "correct" debe ser un string.'
            )
        
        if correct not in options:
            raise serializers.ValidationError(
                f'Pregunta {index + 1}: "correct" debe ser uno de los valores en "options".'
            )

    def _validate_new_format(self, data):
        """Validate the new format with multiple questions."""
        questions = data['questions']
        if not isinstance(questions, list) or len(questions) < 1:
            raise serializers.ValidationError(
                '"questions" debe ser una lista con al menos 1 pregunta.'
            )
        for i, q in enumerate(questions):
            self._validate_question_item(q, i)

    def _validate_legacy_format(self, data):
        """Validate the legacy format with a single question."""
        if not isinstance(data.get('options'), list) or len(data['options']) < 2:
            raise serializers.ValidationError(
                'El JSON debe tener "options" como lista con al menos 2 elementos.'
            )
        
        if 'correct' not in data or not isinstance(data['correct'], str):
            raise serializers.ValidationError(
                'El JSON debe tener "correct" como string.'
            )
        
        if data['correct'] not in data['options']:
            raise serializers.ValidationError(
                '"correct" debe ser uno de los valores en "options".'
            )

    def validate_json_question_format(self, data):
        """
        Validates JSON data in either new or legacy format.
        To be called from validate_correct_answer() after JSON parsing.
        """
        if 'questions' in data:
            self._validate_new_format(data)
        else:
            self._validate_legacy_format(data)
