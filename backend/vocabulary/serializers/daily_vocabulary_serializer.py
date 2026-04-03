# vocabulary/serializers/daily_vocabulary_serializer.py
from .vocabulary_serializer import VocabularySerializer


class DailyVocabularySerializer:
    """
    Serializes DailyVocabulary model instances to plain dicts for API responses.
    Nests a full VocabularySerializer so the frontend receives the full word data
    (word, meaning, pronunciation, image_url, audio_url) alongside tracking fields.

    Usage:
        # single instance
        DailyVocabularySerializer(instance=daily_vocab).data

        # list
        DailyVocabularySerializer(instance=daily_vocab_list, many=True).data
    """

    def __init__(self, instance=None, many=False):
        self.instance = instance
        self.many = many

    @staticmethod
    def to_dict(daily_vocab):
        return {
            'id': daily_vocab.id,
            'vocabulary': VocabularySerializer.to_dict(daily_vocab.vocabulary),
            'date_assigned': str(daily_vocab.date_assigned),
            'was_seen': daily_vocab.was_seen,
            'seen_at': (
                daily_vocab.seen_at.isoformat() if daily_vocab.seen_at else None
            ),
            'was_practiced': daily_vocab.was_practiced,
            'mastery_level': daily_vocab.mastery_level,
            'times_reviewed': daily_vocab.times_reviewed,
            'last_reviewed_at': (
                daily_vocab.last_reviewed_at.isoformat()
                if daily_vocab.last_reviewed_at else None
            ),
        }

    @property
    def data(self):
        if self.many:
            return [self.to_dict(dv) for dv in self.instance]
        return self.to_dict(self.instance)
