import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print('Admin created: admin / admin')
else:
    print('Admin already exists')

if not User.objects.filter(username='entregador').exists():
    entregador = User.objects.create_user('entregador', 'entregador@example.com', 'entregador')
    try:
        from users.models import Perfil
        Perfil.objects.filter(user=entregador).update(role='entregador')
    except Exception as e:
        pass
    print('Entregador created: entregador / entregador')
else:
    print('Entregador already exists')

if not User.objects.filter(username='cliente').exists():
    cliente = User.objects.create_user('cliente', 'cliente@example.com', 'cliente')
    try:
        from users.models import Perfil
        Perfil.objects.filter(user=cliente).update(role='cliente')
    except Exception as e:
        pass
    print('Cliente created: cliente / cliente')
else:
    print('Cliente already exists')
