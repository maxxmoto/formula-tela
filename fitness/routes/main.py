from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from flask import render_template, redirect, url_for, flash, request, jsonify
from datetime import date, datetime, timedelta
from fitness import db
from fitness.models import User, Profile, DailyLog, HabitLog, Meal, Workout, HealthData, ProgressPhoto, CommunityMessage, MealTemplate, Exercise
from fitness.routes.nutrition import calculate_daily_targets
import random
import json

main = Blueprint('main', __name__)


@main.route('/')
def index():
    from flask_login import current_user
    if current_user.is_authenticated and current_user.is_onboarded:
        return redirect(url_for('main.dashboard'))
    return render_template('index.html')


@main.route('/legal')
def legal():
    return render_template('legal.html')


@main.route('/dashboard')
@login_required
def dashboard():
    if not current_user.is_onboarded:
        return redirect(url_for('onboarding.start'))
    today = date.today()
    profile = current_user.profile
    daily_log = DailyLog.query.filter_by(user_id=current_user.id, date=today).first()
    health = HealthData.query.filter_by(user_id=current_user.id, date=today).first()
    todays_workout = Workout.query.filter_by(user_id=current_user.id, date=today).first()
    meals = Meal.query.filter_by(user_id=current_user.id, date=today).order_by(Meal.meal_type).all()

    targets = calculate_daily_targets(profile)
    consumed = {'protein': 0, 'carbs': 0, 'fats': 0, 'calories': 0}
    for m in meals:
        consumed['protein'] += m.protein or 0
        consumed['carbs'] += m.carbs or 0
        consumed['fats'] += m.fats or 0
        consumed['calories'] += m.calories or 0

    streak = calculate_streak(current_user.id)

    msg = get_motivational_message(profile, today)

    return render_template('dashboard/index.html',
                           profile=profile,
                           daily_log=daily_log,
                           health=health,
                           todays_workout=todays_workout,
                           targets=targets,
                           consumed=consumed,
                           streak=streak,
                           msg=msg,
                           today=today)


@main.route('/api/cycle-info')
@login_required
def api_cycle_info():
    profile = current_user.profile
    if profile and profile.has_cycle:
        return jsonify({
            'has_cycle': True,
            'cycle_day': profile.cycle_day or 1,
            'message': get_cycle_message(profile.cycle_day or 1)
        })
    return jsonify({'has_cycle': False})


def calculate_streak(user_id):
    logs = DailyLog.query.filter_by(user_id=user_id).order_by(DailyLog.date.desc()).limit(30).all()
    streak = 0
    for log in logs:
        if log.activity_minutes and log.activity_minutes >= 15:
            streak += 1
        else:
            break
    return streak


def get_motivational_message(profile, today):
    if not profile:
        return "Добро пожаловать! Заполните профиль, чтобы начать."

    name = current_user.username if current_user.username and current_user.username != 'me' else ''
    msgs = []

    if profile.has_cycle and profile.cycle_day:
        day = profile.cycle_day
        if day <= 7:
            msgs.append(f"{name}, сегодня {day}-й день цикла. Предлагаем снизить нагрузку на пресс и выбрать йогу или растяжку.")
        elif 8 <= day <= 14:
            msgs.append(f"{name}, отличное время для силовых тренировок! Вы на пике энергии.")

    return msgs[0] if msgs else f"{name}, сегодня идеальный день для заботы о себе!"


def get_cycle_message(day):
    if day <= 7:
        return "Фаза отдыха. Снизьте интенсивность, йога и растяжка."
    elif day <= 14:
        return "Фаза энергии. Отличное время для силовых."
    elif day <= 21:
        return "Фаза стабильности. Поддерживайте активность."
    else:
        return "Фаза подготовки. Легкие кардио и прогулки."


@main.route('/weight')
@login_required
def weight():
    logs = DailyLog.query.filter(
        DailyLog.user_id == current_user.id,
        DailyLog.weight != None
    ).order_by(DailyLog.date.desc()).limit(52).all()
    last_log = logs[0] if logs else None
    days_since = (date.today() - last_log.date).days if last_log else 99
    return render_template('weight.html',
                           logs=list(reversed(logs)),
                           last_log=last_log,
                           days_since=days_since)


@main.route('/api/weight-data')
@login_required
def api_weight_data():
    logs = DailyLog.query.filter(
        DailyLog.user_id == current_user.id,
        DailyLog.weight != None
    ).order_by(DailyLog.date).limit(52).all()
    return jsonify([{
        'date': l.date.isoformat(),
        'weight': l.weight
    } for l in logs])


@main.route('/daily-log', methods=['POST'])
@login_required
def save_daily_log():
    today = date.today()
    log = DailyLog.query.filter_by(user_id=current_user.id, date=today).first()
    if not log:
        log = DailyLog(user_id=current_user.id, date=today)
        db.session.add(log)

    log.water_glasses = request.form.get('water', type=int, default=0)
    log.sleep_hours = request.form.get('sleep', type=float)
    log.activity_minutes = request.form.get('activity', type=int, default=0)
    log.mood = request.form.get('mood', type=int)
    log.energy = request.form.get('energy', type=int)
    weight = request.form.get('weight', type=float)
    if weight:
        log.weight = weight
        if current_user.profile:
            current_user.profile.current_weight = weight
    db.session.commit()
    referrer = request.referrer or url_for('main.dashboard')
    return redirect(referrer)
