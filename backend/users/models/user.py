# users/models/user.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        """Crea y guarda un usuario regular"""
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Crea y guarda un superusuario (admin)"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser debe tener is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser debe tener is_superuser=True')
        
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    """Modelo personalizado de usuario extendiendo el de Django"""
    
    # Campos de autenticación
    email = models.EmailField(
        verbose_name='email address',
        max_length=255,
        unique=True,
    )
    password_hash = models.CharField(
        max_length=255,
        verbose_name='password'
    )
    
    # Información personal
    first_name = models.CharField(max_length=100)
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=[
            ('M', 'Masculino'),
            ('F', 'Femenino'),
            ('NB', 'No binario'),
            ('P', 'Prefiero no decirlo')
        ],
        null=True,
        blank=True
    )
    
    # Nivel de inglés
    LEVEL_CHOICES = [
        ('A1', 'Beginner (A1)'),
        ('A2', 'Elementary (A2)'),
        ('B1', 'Intermediate (B1)'),
        ('B2', 'Upper Intermediate (B2)'),
        ('C1', 'Advanced (C1)'),
        ('C2', 'Proficient (C2)'),
    ]
    level = models.CharField(
        max_length=5,
        choices=LEVEL_CHOICES,
        default='A1'
    )
    
    # Precisión por habilidad
    precision_speaking = models.FloatField(default=0.0)
    precision_reading = models.FloatField(default=0.0)
    precision_listening = models.FloatField(default=0.0)
    precision_writing = models.FloatField(default=0.0)
    
    # Rol
    ROLE_CHOICES = [
        ('ADMIN', 'Administrador'),
        ('STUDENT', 'Estudiante'),
    ]
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='STUDENT'
    )
    
    # Avatar y estado
    avatar_url = models.URLField(max_length=500, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # Diagnóstico
    diagnostic_completed = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Campos requeridos por Django
    is_staff = models.BooleanField(default=False)
    
    # Configurar el manager
    objects = UserManager()
    
    # Campo de autenticación (email en lugar de username)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['level']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return f"{self.first_name} ({self.email})"
    
    def get_full_name(self):
        return self.first_name
    
    def get_short_name(self):
        return self.first_name
    
    @property
    def average_precision(self):
        """Calcula el promedio de precisión general"""
        scores = [
            self.precision_speaking,
            self.precision_reading,
            self.precision_listening,
            self.precision_writing
        ]
        valid_scores = [s for s in scores if s > 0]
        if not valid_scores:
            return 0.0
        return sum(valid_scores) / len(valid_scores)