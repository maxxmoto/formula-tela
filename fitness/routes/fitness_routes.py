from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from fitness import db
from fitness.models import Workout, Exercise
from datetime import date
import json
import random
import math

fitness = Blueprint('fitness', __name__, url_prefix='/fitness')


@fitness.route('/')
@login_required
def index():
    today = date.today()
    todays_workout = Workout.query.filter_by(
        user_id=current_user.id, date=today
    ).first()
    recent = Workout.query.filter_by(user_id=current_user.id).order_by(
        Workout.date.desc()
    ).limit(10).all()
    return render_template('fitness/index.html',
                           todays_workout=todays_workout,
                           recent=recent)


@fitness.route('/generator')
@login_required
def generator():
    return render_template('fitness/generator.html')


@fitness.route('/generate', methods=['POST'])
@login_required
def generate_workout():
    data = request.json
    duration = data.get('duration', 15)
    is_quiet = data.get('is_quiet', False)
    workout_type = data.get('type', 'full_body')
    profile = current_user.profile

    exercises = generate_exercise_plan(profile, duration, is_quiet, workout_type)

    total_cal = sum(
        round(ex.get('calories_per_minute', 4) * ex.get('duration', 30) / 60)
        for ex in exercises
    )

    workout = Workout(
        user_id=current_user.id,
        date=date.today(),
        workout_type=workout_type,
        duration_minutes=duration,
        exercises=json.dumps(exercises, ensure_ascii=False),
        calories_burned=total_cal
    )
    db.session.add(workout)
    db.session.commit()

    return jsonify({'exercises': exercises, 'workout_id': workout.id})


@fitness.route('/complete/<int:workout_id>', methods=['POST'])
@login_required
def complete_workout(workout_id):
    workout = Workout.query.get_or_404(workout_id)
    workout.completed = True
    db.session.commit()
    return jsonify({'success': True})


def generate_exercise_plan(profile, duration_minutes, is_quiet=False, workout_type='full_body'):
    """
    Evidence-based workout generation.

    References:
    - ACSM Resistance Training Guidelines (2026) — 2-3 sets of 8-12 reps, all major muscle groups
    - WHO Physical Activity Guidelines (2024) — 150+ min/week moderate activity
    - WHO — muscle strengthening 2+ days/week
    - Harvard Health (2026) — bodyweight effective, progressive overload, push/pull/core balance
    - ACSM Position Stand: Progression Models in Resistance Training (2009, updated 2026)
    """
    exercises_by_type = {
        'push': [
            {'name': 'Отжимания от пола', 'duration': 40, 'rest': 20, 'muscle': 'грудь, плечи, трицепс',
             'calories_per_minute': 6, 'quiet': False, 'sets': 2, 'reps': '8-12'},
            {'name': 'Отжимания от стены', 'duration': 40, 'rest': 20, 'muscle': 'грудь, плечи, трицепс',
             'calories_per_minute': 3, 'quiet': True, 'sets': 2, 'reps': '10-15'},
            {'name': 'Отжимания с колен', 'duration': 40, 'rest': 20, 'muscle': 'грудь, плечи, трицепс',
             'calories_per_minute': 4, 'quiet': True, 'sets': 2, 'reps': '8-12'},
            {'name': 'Жим гантелей вверх', 'duration': 40, 'rest': 20, 'muscle': 'плечи',
             'calories_per_minute': 5, 'quiet': True, 'sets': 2, 'reps': '10-12'},
            {'name': 'Разведение рук с гантелями', 'duration': 35, 'rest': 25, 'muscle': 'плечи',
             'calories_per_minute': 4, 'quiet': True, 'sets': 2, 'reps': '10-12'},
        ],
        'pull': [
            {'name': 'Тяга гантели к поясу', 'duration': 40, 'rest': 20, 'muscle': 'спина, бицепс',
             'calories_per_minute': 5, 'quiet': True, 'sets': 2, 'reps': '8-12'},
            {'name': 'Тяга резинки к груди', 'duration': 40, 'rest': 20, 'muscle': 'спина',
             'calories_per_minute': 4, 'quiet': True, 'sets': 2, 'reps': '10-15'},
            {'name': 'Сведение лопаток лежа на животе', 'duration': 40, 'rest': 20, 'muscle': 'спина',
             'calories_per_minute': 3, 'quiet': True, 'sets': 2, 'reps': '12-15'},
            {'name': 'Подтягивания (или негативные)', 'duration': 30, 'rest': 30, 'muscle': 'спина, бицепс',
             'calories_per_minute': 8, 'quiet': False, 'sets': 2, 'reps': 'max'},
        ],
        'legs': [
            {'name': 'Приседания', 'duration': 45, 'rest': 15, 'muscle': 'квадрицепс, ягодицы',
             'calories_per_minute': 7, 'quiet': False, 'sets': 2, 'reps': '10-15'},
            {'name': 'Выпады вперед', 'duration': 40, 'rest': 20, 'muscle': 'ноги, ягодицы',
             'calories_per_minute': 6, 'quiet': False, 'sets': 2, 'reps': '8-10 на ногу'},
            {'name': 'Ягодичный мостик', 'duration': 45, 'rest': 15, 'muscle': 'ягодицы, поясница',
             'calories_per_minute': 4, 'quiet': True, 'sets': 2, 'reps': '12-15'},
            {'name': 'Подъем на носки', 'duration': 30, 'rest': 15, 'muscle': 'икры',
             'calories_per_minute': 3, 'quiet': True, 'sets': 2, 'reps': '15-20'},
            {'name': 'Махи ногами назад', 'duration': 30, 'rest': 15, 'muscle': 'ягодицы',
             'calories_per_minute': 4, 'quiet': True, 'sets': 2, 'reps': '12-15'},
        ],
        'core': [
            {'name': 'Планка', 'duration': 30, 'rest': 20, 'muscle': 'кор',
             'calories_per_minute': 3, 'quiet': True, 'sets': 2, 'reps': '30 сек'},
            {'name': 'Боковая планка', 'duration': 25, 'rest': 20, 'muscle': 'косые мышцы',
             'calories_per_minute': 3, 'quiet': True, 'sets': 2, 'reps': '25 сек'},
            {'name': 'Подъем ног лежа', 'duration': 30, 'rest': 20, 'muscle': 'нижний пресс',
             'calories_per_minute': 4, 'quiet': True, 'sets': 2, 'reps': '10-15'},
            {'name': 'Скручивания', 'duration': 30, 'rest': 20, 'muscle': 'верхний пресс',
             'calories_per_minute': 4, 'quiet': True, 'sets': 2, 'reps': '12-15'},
            {'name': 'Птица-собака (Bird Dog)', 'duration': 40, 'rest': 20, 'muscle': 'кор, спина',
             'calories_per_minute': 3, 'quiet': True, 'sets': 2, 'reps': '8-10 на сторону'},
        ],
        'cardio': [
            {'name': 'Берпи', 'duration': 30, 'rest': 30, 'muscle': 'все тело, кардио',
             'calories_per_minute': 10, 'quiet': False, 'sets': 2, 'reps': '8-12'},
            {'name': 'Альпинист (Mountain Climbers)', 'duration': 30, 'rest': 20, 'muscle': 'кор, кардио',
             'calories_per_minute': 8, 'quiet': False, 'sets': 2, 'reps': '30 сек'},
            {'name': 'Джампинг Джекс', 'duration': 30, 'rest': 20, 'muscle': 'все тело, кардио',
             'calories_per_minute': 7, 'quiet': False, 'sets': 2, 'reps': '30 сек'},
            {'name': 'Бег на месте с высоким подъемом колен', 'duration': 30, 'rest': 20,
             'muscle': 'ноги, кардио', 'calories_per_minute': 8, 'quiet': False, 'sets': 2, 'reps': '30 сек'},
        ]
    }

    if is_quiet:
        exercises_by_type['push'] = [e for e in exercises_by_type['push'] if e['quiet']]
        exercises_by_type['legs'] = [e for e in exercises_by_type['legs'] if e['quiet']]
        exercises_by_type['cardio'] = [
            {'name': 'Ходьба на месте', 'duration': 60, 'rest': 0, 'muscle': 'ноги, кардио',
             'calories_per_minute': 3, 'quiet': True, 'sets': 1, 'reps': '60 сек'},
            {'name': 'Марш на месте', 'duration': 45, 'rest': 15, 'muscle': 'ноги, кардио',
             'calories_per_minute': 3, 'quiet': True, 'sets': 1, 'reps': '45 сек'},
        ]

    if profile:
        if profile.back_problems:
            exercises_by_type['core'] = [e for e in exercises_by_type['core']
                                         if e['name'] not in ['Скручивания', 'Подъем ног лежа']]
            exercises_by_type['legs'] = [e for e in exercises_by_type['legs']
                                         if e['name'] not in ['Выпады вперед', 'Приседания']]
            exercises_by_type['cardio'] = [e for e in exercises_by_type['cardio']
                                           if e['name'] not in ['Берпи']]
        if profile.joint_problems:
            exercises_by_type['legs'] = [e for e in exercises_by_type['legs']
                                         if e['name'] not in ['Выпады вперед', 'Приседания']]
            exercises_by_type['cardio'] = [e for e in exercises_by_type['cardio']
                                           if e['name'] not in ['Берпи', 'Джампинг Джекс']]

    total_seconds = duration_minutes * 60
    warmup_seconds = min(90, int(total_seconds * 0.12))
    cooldown_seconds = min(60, int(total_seconds * 0.08))
    work_seconds = total_seconds - warmup_seconds - cooldown_seconds

    warmup = [
        {'name': 'Разминка шеи (наклоны и повороты)', 'duration': 20, 'rest': 0,
         'muscle': 'шея', 'calories_per_minute': 1, 'quiet': True},
        {'name': 'Вращение плечами вперед/назад', 'duration': 20, 'rest': 0,
         'muscle': 'плечи', 'calories_per_minute': 1, 'quiet': True},
        {'name': 'Наклоны корпуса в стороны', 'duration': 20, 'rest': 0,
         'muscle': 'спина, кор', 'calories_per_minute': 1, 'quiet': True},
        {'name': 'Круговые движения тазом', 'duration': 15, 'rest': 0,
         'muscle': 'тазобедренные', 'calories_per_minute': 1, 'quiet': True},
        {'name': 'Махи ногами вперед/назад', 'duration': 15, 'rest': 0,
         'muscle': 'ноги', 'calories_per_minute': 1, 'quiet': False},
    ]

    cooldown = [
        {'name': 'Растяжка грудных мышц', 'duration': 20, 'rest': 0,
         'muscle': 'грудь', 'calories_per_minute': 1, 'quiet': True},
        {'name': 'Растяжка квадрицепса стоя', 'duration': 20, 'rest': 0,
         'muscle': 'квадрицепс', 'calories_per_minute': 1, 'quiet': True},
        {'name': 'Наклон вперед к ногам', 'duration': 20, 'rest': 0,
         'muscle': 'задняя поверхность бедра', 'calories_per_minute': 1, 'quiet': True},
    ]

    selected = []
    time_used = 0

    # Add warm-up
    for w in warmup[:3]:
        selected.append(w)
    time_used += warmup_seconds

    remaining = work_seconds

    # Select main exercises based on workout type
    if workout_type == 'full_body':
        groups = ['push', 'pull', 'legs', 'core']
    elif workout_type == 'upper':
        groups = ['push', 'pull']
    elif workout_type == 'lower':
        groups = ['legs']
    elif workout_type == 'core':
        groups = ['core']
    elif workout_type == 'stretch':
        groups = ['core']
    else:
        groups = ['push', 'pull', 'legs', 'core']

    # Build a circuit: pick 1-2 from each group, alternate
    pool = []
    for g in groups:
        available = exercises_by_type.get(g, [])[:]
        random.shuffle(available)
        if available:
            pool.append(available[0])
        if len(available) > 1:
            pool.append(available[1])

    random.shuffle(pool)

    circuit_time = sum(e['duration'] + e['rest'] for e in pool)
    if circuit_time == 0:
        circuit_time = 1

    circuits = max(1, math.floor(remaining / circuit_time))
    circuits = min(circuits, 4)

    for _ in range(circuits):
        for ex in pool:
            if time_used + ex['duration'] + ex['rest'] <= remaining:
                selected.append(ex)
                time_used += ex['duration'] + ex['rest']
            else:
                break

    # If there's still time, add a cardio finisher
    if remaining - time_used > 60 and not is_quiet:
        cardio_ex = random.choice(exercises_by_type.get('cardio', []))
        if time_used + cardio_ex['duration'] + cardio_ex['rest'] <= remaining:
            selected.append(cardio_ex)
            time_used += cardio_ex['duration'] + cardio_ex['rest']

    # Add cooldown
    for c in cooldown[:2]:
        if time_used + c['duration'] <= total_seconds:
            selected.append(c)
            time_used += c['duration']

    return selected
