class QuestionFilter:
    """Filtrado manual de preguntas por query params (sin django-filter)."""

    ALLOWED_FILTERS = ('type', 'level', 'difficulty', 'category')

    @classmethod
    def apply(cls, queryset, query_params):
        filters = {
            field: query_params[field]
            for field in cls.ALLOWED_FILTERS
            if field in query_params
        }
        return queryset.filter(**filters)
