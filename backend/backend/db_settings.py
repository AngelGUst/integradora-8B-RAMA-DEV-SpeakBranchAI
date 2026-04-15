import os


def get_database_config():
    use_sqlite = os.getenv('USE_SQLITE', '').lower() in {'1', 'true', 'yes'}
    if use_sqlite:
        return {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': os.getenv('SQLITE_PATH', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db.sqlite3')),
            }
        }

    supabase_name = os.getenv('SUPABASE_DB_NAME')
    supabase_user = os.getenv('SUPABASE_DB_USER')
    supabase_password = os.getenv('SUPABASE_DB_PASSWORD')
    supabase_host = os.getenv('SUPABASE_HOST')
    supabase_port = os.getenv('SUPABASE_PORT', '5432')

    if not all([supabase_name, supabase_user, supabase_password, supabase_host]):
        return {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': os.getenv('SQLITE_PATH', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db.sqlite3')),
            }
        }

    return {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': supabase_name,
            'USER': supabase_user,
            'PASSWORD': supabase_password,
            'HOST': supabase_host,
            'PORT': supabase_port,
            'CONN_MAX_AGE': int(os.getenv('DB_CONN_MAX_AGE', '0')),
            'OPTIONS': {
                'connect_timeout': int(os.getenv('DB_CONNECT_TIMEOUT', '10')),
            },
        }
    }
