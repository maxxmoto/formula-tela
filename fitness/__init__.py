import os
import sys
from flask import Flask, redirect, url_for, request, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, current_user
from flask_migrate import Migrate
from config import Config

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()


def get_base_path():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def create_app():
    base = get_base_path()
    app = Flask(__name__,
                template_folder=os.path.join(base, 'templates'),
                static_folder=os.path.join(base, 'static'))
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)

    login_manager.login_view = 'auth.setup'

    from fitness.models import User, Profile, HealthData, DailyLog, HabitLog, \
        Meal, Workout, ProgressPhoto, CommunityMessage, MealTemplate, Exercise

    from fitness.routes.main import main as main_bp
    from fitness.routes.auth import auth as auth_bp
    from fitness.routes.onboarding import onboarding as onboarding_bp
    from fitness.routes.nutrition import nutrition as nutrition_bp
    from fitness.routes.fitness_routes import fitness as fitness_bp
    from fitness.routes.analytics import analytics as analytics_bp
    from fitness.routes.community import community as community_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(onboarding_bp)
    app.register_blueprint(nutrition_bp)
    app.register_blueprint(fitness_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(community_bp)

    with app.app_context():
        db.create_all()

    @app.before_request
    def auto_login():
        if request.endpoint and request.endpoint != 'static' and not request.endpoint.startswith('auth.'):
            if not current_user.is_authenticated:
                user = User.query.get(1)
                if not user:
                    user = User(username='me', email='me@local', password_hash='')
                    db.session.add(user)
                    db.session.commit()
                login_user(user)
                if not user.is_onboarded and request.endpoint != 'auth.setup':
                    return redirect(url_for('auth.setup'))

    return app


def seed_data():
    from fitness.models import MealTemplate, Exercise
    if MealTemplate.query.first() is None:
        templates = [
            MealTemplate(name='Овсянка с ягодами', meal_type='breakfast',
                         ingredients='овсяные хлопья, ягоды, мед, орехи',
                         instructions='Залить хлопья кипятком, добавить ягоды и мед.',
                         protein=8, carbs=45, fats=6, calories=280,
                         tags='завтрак, быстро', diet_types='omnivore,vegetarian,vegan',
                         prep_time=10),
            MealTemplate(name='Греческий салат', meal_type='lunch',
                         ingredients='помидоры, огурцы, перец, фета, оливки, оливковое масло',
                         instructions='Нарезать овощи, добавить фету и заправить маслом.',
                         protein=12, carbs=15, fats=18, calories=280,
                         tags='обед, салат, легко', diet_types='omnivore,vegetarian',
                         prep_time=10),
            MealTemplate(name='Куриная грудка с гречкой', meal_type='dinner',
                         ingredients='куриная грудка, гречка, овощи, специи',
                         instructions='Отварить гречку. Запечь куриную грудку с овощами.',
                         protein=40, carbs=50, fats=8, calories=420,
                         tags='ужин, белок', diet_types='omnivore',
                         prep_time=30),
            MealTemplate(name='Смузи-боул', meal_type='breakfast',
                         ingredients='банан, ягоды, йогурт, гранола, семена чиа',
                         instructions='Взбить банан с ягодами и йогуртом. Посыпать гранолой.',
                         protein=10, carbs=50, fats=10, calories=320,
                         tags='завтрак, быстро', diet_types='omnivore,vegetarian',
                         prep_time=5),
            MealTemplate(name='Тофу с овощами', meal_type='dinner',
                         ingredients='тофу, брокколи, перец, соевый соус, имбирь',
                         instructions='Обжарить тофу с овощами на сковороде вок.',
                         protein=25, carbs=20, fats=15, calories=320,
                         tags='ужин, азиатское', diet_types='vegan,vegetarian',
                         prep_time=20),
        ]
        db.session.add_all(templates)
        db.session.commit()

    if Exercise.query.first() is None:
        exercises = [
            Exercise(name='Приседания', muscle_group='ноги', difficulty='beginner',
                     equipment_needed='none', is_quiet=False, calories_per_minute=7,
                     contraindications='проблемы с коленями'),
            Exercise(name='Планка', muscle_group='кор', difficulty='beginner',
                     equipment_needed='коврик', is_quiet=True, calories_per_minute=3,
                     contraindications=''),
            Exercise(name='Отжимания', muscle_group='грудь', difficulty='intermediate',
                     equipment_needed='none', is_quiet=False, calories_per_minute=6,
                     contraindications='проблемы с запястьями'),
            Exercise(name='Берпи', muscle_group='все тело', difficulty='advanced',
                     equipment_needed='none', is_quiet=False, calories_per_minute=10,
                     contraindications='проблемы с суставами, спиной'),
            Exercise(name='Ягодичный мостик', muscle_group='ягодицы', difficulty='beginner',
                     equipment_needed='коврик', is_quiet=True, calories_per_minute=4,
                     contraindications=''),
        ]
        db.session.add_all(exercises)
        db.session.commit()


@login_manager.user_loader
def load_user(user_id):
    from fitness.models import User
    return User.query.get(int(user_id))
