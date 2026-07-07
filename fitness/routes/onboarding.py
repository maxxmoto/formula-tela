from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from fitness import db
from fitness.models import Profile, HealthData
from datetime import date

onboarding = Blueprint('onboarding', __name__, url_prefix='/onboarding')

QUESTIONS = [
    {
        'step': 1,
        'title': 'Давайте знакомиться',
        'subtitle': 'Расскажите немного о себе',
        'fields': [
            {'name': 'gender', 'type': 'radio', 'label': 'Ваш пол', 'options': [
                {'value': 'male', 'label': 'Мужской'},
                {'value': 'female', 'label': 'Женский'}
            ]},
            {'name': 'age', 'type': 'number', 'label': 'Ваш возраст', 'min': 14, 'max': 100},
            {'name': 'height', 'type': 'number', 'label': 'Рост (см)', 'min': 100, 'max': 250},
            {'name': 'current_weight', 'type': 'number', 'label': 'Текущий вес (кг)', 'min': 30, 'max': 300}
        ]
    },
    {
        'step': 2,
        'title': 'Ваша цель',
        'subtitle': 'Чего вы хотите достичь?',
        'fields': [
            {'name': 'goal_type', 'type': 'radio', 'label': 'Главная цель', 'options': [
                {'value': 'lose', 'label': 'Похудеть'},
                {'value': 'tone', 'label': 'Привести тело в тонус'},
                {'value': 'maintain', 'label': 'Сохранить результат'},
                {'value': 'gain', 'label': 'Набрать мышечную массу'}
            ]},
            {'name': 'goal_weight', 'type': 'number', 'label': 'Желаемый вес (кг)', 'min': 30, 'max': 300},
            {'name': 'activity_level', 'type': 'radio', 'label': 'Уровень активности', 'options': [
                {'value': 'sedentary', 'label': 'Сидячий образ жизни'},
                {'value': 'light', 'label': 'Легкая активность 1-2 раза в неделю'},
                {'value': 'moderate', 'label': 'Умеренная 3-4 раза в неделю'},
                {'value': 'active', 'label': 'Активный 5+ раз в неделю'}
            ]}
        ]
    },
    {
        'step': 3,
        'title': 'Ваше здоровье',
        'subtitle': 'Это поможет нам подобрать безопасные рекомендации',
        'fields': [
            {'name': 'chronic_diseases', 'type': 'text', 'label': 'Хронические заболевания (если есть)'},
            {'name': 'joint_problems', 'type': 'checkbox', 'label': 'Проблемы с суставами'},
            {'name': 'back_problems', 'type': 'checkbox', 'label': 'Проблемы со спиной'},
            {'name': 'blood_sugar_issues', 'type': 'checkbox', 'label': 'Проблемы с уровнем сахара'},
            {'name': 'blood_pressure_issues', 'type': 'checkbox', 'label': 'Проблемы с давлением'},
            {'name': 'is_pregnant', 'type': 'checkbox', 'label': 'Беременность'},
            {'name': 'is_breastfeeding', 'type': 'checkbox', 'label': 'Грудное вскармливание'}
        ]
    },
    {
        'step': 4,
        'title': 'Домашние условия',
        'subtitle': 'Что у вас есть для тренировок?',
        'fields': [
            {'name': 'has_yoga_mat', 'type': 'checkbox', 'label': 'Коврик для йоги'},
            {'name': 'has_dumbbells', 'type': 'checkbox', 'label': 'Гантели'},
            {'name': 'has_fitball', 'type': 'checkbox', 'label': 'Фитбол'},
            {'name': 'has_pullup_bar', 'type': 'checkbox', 'label': 'Турник'},
            {'name': 'has_resistance_band', 'type': 'checkbox', 'label': 'Резинки для фитнеса'},
            {'name': 'free_space_meters', 'type': 'number', 'label': 'Свободное пространство (метров)', 'min': 0, 'max': 10},
            {'name': 'workout_time_minutes', 'type': 'number', 'label': 'Сколько минут готовы уделять тренировке', 'min': 5, 'max': 120}
        ]
    },
    {
        'step': 5,
        'title': 'Питание и предпочтения',
        'subtitle': 'Что вы любите и не любите?',
        'fields': [
            {'name': 'diet_type', 'type': 'radio', 'label': 'Тип питания', 'options': [
                {'value': 'omnivore', 'label': 'Всеядный'},
                {'value': 'no_red_meat', 'label': 'Не ем красное мясо'},
                {'value': 'vegetarian', 'label': 'Вегетарианец'},
                {'value': 'vegan', 'label': 'Веган'}
            ]},
            {'name': 'allergies', 'type': 'text', 'label': 'Аллергии (через запятую)'},
            {'name': 'intolerances', 'type': 'text', 'label': 'Непереносимости (через запятую)'},
            {'name': 'food_preferences', 'type': 'text', 'label': 'Любимые кухни и продукты'},
            {'name': 'food_dislikes', 'type': 'text', 'label': 'Что не любите (через запятую)'},
            {'name': 'meals_per_day', 'type': 'number', 'label': 'Сколько раз в день едите', 'min': 1, 'max': 10}
        ]
    },
    {
        'step': 6,
        'title': 'Образ жизни',
        'subtitle': 'Режим дня и привычки',
        'fields': [
            {'name': 'work_schedule', 'type': 'radio', 'label': 'График работы', 'options': [
                {'value': 'office_9_5', 'label': 'Офисный 9:00-18:00'},
                {'value': 'remote', 'label': 'Удаленная работа'},
                {'value': 'shift', 'label': 'Сменный график'},
                {'value': 'freelance', 'label': 'Свободный график'}
            ]},
            {'name': 'sleep_hours', 'type': 'number', 'label': 'Часов сна в сутки', 'min': 3, 'max': 14},
            {'name': 'stress_level', 'type': 'radio', 'label': 'Уровень стресса', 'options': [
                {'value': 1, 'label': 'Низкий'},
                {'value': 2, 'label': 'Умеренный'},
                {'value': 3, 'label': 'Высокий'},
                {'value': 4, 'label': 'Очень высокий'}
            ]},
            {'name': 'drinks_water', 'type': 'checkbox', 'label': 'Пью воду регулярно'},
            {'name': 'water_amount', 'type': 'number', 'label': 'Сколько воды пьете в день (литров)'}
        ]
    },
    {
        'step': 7,
        'title': 'Для женщин',
        'subtitle': 'Чтобы адаптировать рекомендации под ваш цикл',
        'fields': [
            {'name': 'has_cycle', 'type': 'radio', 'label': 'Менструальный цикл', 'options': [
                {'value': True, 'label': 'Да, есть'},
                {'value': False, 'label': 'Нет / не適用'}
            ]},
            {'name': 'cycle_length', 'type': 'number', 'label': 'Длина цикла (дней)', 'min': 20, 'max': 40},
            {'name': 'cycle_day', 'type': 'number', 'label': 'Текущий день цикла', 'min': 1, 'max': 40}
        ]
    },
    {
        'step': 8,
        'title': 'Последние штрихи',
        'subtitle': 'Город и финальные детали',
        'fields': [
            {'name': 'city', 'type': 'text', 'label': 'Ваш город'},
        ]
    }
]


@onboarding.route('/')
@login_required
def start():
    if current_user.is_onboarded:
        return redirect(url_for('main.dashboard'))
    return render_template('onboarding/index.html', questions=QUESTIONS, total_steps=len(QUESTIONS))


@onboarding.route('/save', methods=['POST'])
@login_required
def save():
    profile = Profile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.session.add(profile)

    data = request.form

    profile.gender = data.get('gender')
    profile.age = data.get('age', type=int)
    profile.height = data.get('height', type=float)
    profile.current_weight = data.get('current_weight', type=float)
    profile.goal_weight = data.get('goal_weight', type=float)
    profile.goal_type = data.get('goal_type')
    profile.activity_level = data.get('activity_level')

    profile.chronic_diseases = data.get('chronic_diseases')
    profile.joint_problems = 'joint_problems' in data
    profile.back_problems = 'back_problems' in data
    profile.blood_sugar_issues = 'blood_sugar_issues' in data
    profile.blood_pressure_issues = 'blood_pressure_issues' in data
    profile.is_pregnant = 'is_pregnant' in data
    profile.is_breastfeeding = 'is_breastfeeding' in data

    profile.has_yoga_mat = 'has_yoga_mat' in data
    profile.has_dumbbells = 'has_dumbbells' in data
    profile.has_fitball = 'has_fitball' in data
    profile.has_pullup_bar = 'has_pullup_bar' in data
    profile.has_resistance_band = 'has_resistance_band' in data
    profile.free_space_meters = data.get('free_space_meters', type=float)
    profile.workout_time_minutes = data.get('workout_time_minutes', type=int)

    profile.diet_type = data.get('diet_type')
    profile.allergies = data.get('allergies')
    profile.intolerances = data.get('intolerances')
    profile.food_preferences = data.get('food_preferences')
    profile.food_dislikes = data.get('food_dislikes')
    profile.meals_per_day = data.get('meals_per_day', type=int)

    profile.work_schedule = data.get('work_schedule')
    profile.sleep_hours = data.get('sleep_hours', type=float)
    profile.stress_level = data.get('stress_level', type=int)
    profile.drinks_water = 'drinks_water' in data
    profile.water_amount = data.get('water_amount', type=float)

    profile.has_cycle = data.get('has_cycle') == 'True'
    profile.cycle_length = data.get('cycle_length', type=int)
    profile.cycle_day = data.get('cycle_day', type=int)

    profile.city = data.get('city')

    db.session.commit()

    current_user.is_onboarded = True
    db.session.commit()

    health = HealthData(user_id=current_user.id)
    db.session.add(health)
    db.session.commit()

    return redirect(url_for('main.dashboard'))
