# users/models/user_weak_categories.py
from django.db import models
from django.conf import settings

class UserWeakCategory(models.Model):
    """Categorías débiles del usuario para el motor adaptativo"""
    
    CATEGORY_CHOICES = [
        ('TOEFL', 'TOEFL'),
        ('BASIC', 'Básico'),
        ('INTERMEDIATE', 'Intermedio'),
        ('ADVANCED', 'Avanzado'),
    ]
    
    SKILL_CHOICES = [
        ('SPEAKING', 'Speaking'),
        ('READING', 'Reading'),
        ('LISTENING_SHADOWING', 'Listening Shadowing'),
        ('LISTENING_COMPREHENSION', 'Listening Comprehension'),
        ('WRITING', 'Writing'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='weak_categories'
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    skill = models.CharField(max_length=30, choices=SKILL_CHOICES)
    avg_score = models.FloatField(default=0.0)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_weak_categories'
        verbose_name = 'Categoría Débil'
        verbose_name_plural = 'Categorías Débiles'
        unique_together = ['user', 'category', 'skill']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['category', 'skill']),
        ]
    
    def __str__(self):
        return f"{self.user.first_name} - {self.get_category_display()} - {self.get_skill_display()}: {self.avg_score}"
    
    @classmethod
    def update_weak_categories(cls, user, skill, category, new_score):
        """
        Actualiza o crea una categoría débil para el usuario
        """
        weak_category, created = cls.objects.update_or_create(
            user=user,
            skill=skill,
            category=category,
            defaults={'avg_score': new_score}
        )
        return weak_category