import os
import sys


def get_data_dir():
    """Get writable directory for database storage."""
    if getattr(sys, 'frozen', False):
        return os.path.join(os.environ.get('LOCALAPPDATA', os.path.expanduser('~')), 'FormulaTela')
    return os.path.abspath(os.path.dirname(__file__))


class Config:
    data_dir = get_data_dir()
    os.makedirs(data_dir, exist_ok=True)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'body-formula-secret-key-2026'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(data_dir, 'body_formula.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    WTF_CSRF_ENABLED = True
    UPLOAD_FOLDER = os.path.join(data_dir, 'uploads')
