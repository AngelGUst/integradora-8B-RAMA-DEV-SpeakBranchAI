from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Permite acceso solo a usuarios con role='ADMIN'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )
