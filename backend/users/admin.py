# users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProgress, UserWeakCategory

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Configuración del admin para el modelo User"""
    
    list_display = ('email', 'first_name', 'level', 'role', 'is_active', 'created_at')
    list_filter = ('level', 'role', 'is_active', 'gender')
    search_fields = ('email', 'first_name')
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Información Personal', {
            'fields': ('first_name', 'age', 'gender', 'level', 'avatar_url')
        }),
        ('Precisiones', {
            'fields': ('precision_speaking', 'precision_reading', 
                      'precision_listening', 'precision_writing')
        }),
        ('Permisos', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 
                      'groups', 'user_permissions')
        }),
        ('Fechas importantes', {'fields': ('last_login', 'created_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'password1', 'password2', 'role'),
        }),
    )
    
    readonly_fields = ('created_at', 'last_login')

@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'level', 'total_xp', 'streak_days', 'last_updated')
    list_filter = ('level',)
    search_fields = ('user__email', 'user__first_name')
    readonly_fields = ('last_updated',)

@admin.register(UserWeakCategory)
class UserWeakCategoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'category', 'skill', 'avg_score', 'updated_at')
    list_filter = ('category', 'skill')
    search_fields = ('user__email', 'user__first_name')