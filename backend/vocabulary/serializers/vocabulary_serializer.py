# vocabulary/serializers/vocabulary_serializer.py


class VocabularySerializer:
    """
    Serializes Vocabulary model instances to plain dicts for API responses.
    Intentionally framework-agnostic (no DRF dependency).

    Usage:
        # single instance
        VocabularySerializer(instance=vocab).data

        # queryset
        VocabularySerializer(instance=qs, many=True).data
    """

    def __init__(self, instance=None, many=False):
        self.instance = instance
        self.many = many

    @staticmethod
    def to_dict(vocab):
        return {
            'id': vocab.id,
            'word': vocab.word,
            'meaning': vocab.meaning,
            'pronunciation': vocab.pronunciation,
            'example_sentence': vocab.example_sentence,
            'level': vocab.level,
            'category': vocab.category,
            'image_url': vocab.image_url,
            'audio_url': vocab.audio_url,
        }

    @property
    def data(self):
        if self.many:
            return [self.to_dict(v) for v in self.instance]
        return self.to_dict(self.instance)
