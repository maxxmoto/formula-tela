from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from fitness import db
from fitness.models import DailyLog, HabitLog, HealthData, ProgressPhoto
from datetime import date, timedelta
import json

analytics = Blueprint('analytics', __name__, url_prefix='/analytics')


@analytics.route('/')
@login_required
def index():
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    week_logs = DailyLog.query.filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= week_ago
    ).order_by(DailyLog.date).all()

    month_logs = DailyLog.query.filter(
        DailyLog.user_id == current_user.id,
        DailyLog.date >= month_ago
    ).order_by(DailyLog.date).all()

    habit_logs = HabitLog.query.filter(
        HabitLog.user_id == current_user.id,
        HabitLog.date >= month_ago
    ).all()

    recent_health = HealthData.query.filter_by(
        user_id=current_user.id
    ).order_by(HealthData.date.desc()).limit(7).all()

    today_health = HealthData.query.filter_by(
        user_id=current_user.id, date=today
    ).first()

    weight_logs = DailyLog.query.filter(
        DailyLog.user_id == current_user.id,
        DailyLog.weight != None,
        DailyLog.date >= month_ago
    ).order_by(DailyLog.date).all()

    photos = ProgressPhoto.query.filter_by(
        user_id=current_user.id
    ).order_by(ProgressPhoto.date.desc()).all()

    return render_template('analytics/index.html',
                           week_logs=week_logs,
                           month_logs=month_logs,
                           habit_logs=habit_logs,
                           recent_health=recent_health,
                           today_health=today_health,
                           weight_logs=weight_logs,
                           photos=photos)


@analytics.route('/api/habits')
@login_required
def api_habits():
    days = request.args.get('days', 30, type=int)
    start = date.today() - timedelta(days=days)
    logs = HabitLog.query.filter(
        HabitLog.user_id == current_user.id,
        HabitLog.date >= start
    ).all()

    data = {'water': [], 'activity': [], 'sleep': [], 'mood': []}
    for log in logs:
        if log.habit_type == 'water':
            data['water'].append({'date': log.date.isoformat(), 'value': log.value})
        elif log.habit_type == 'activity':
            data['activity'].append({'date': log.date.isoformat(), 'value': log.value})
        elif log.habit_type == 'sleep':
            data['sleep'].append({'date': log.date.isoformat(), 'value': log.value})
        elif log.habit_type == 'mood':
            data['mood'].append({'date': log.date.isoformat(), 'value': log.value})

    return jsonify(data)


@analytics.route('/api/health-insights')
@login_required
def api_health_insights():
    logs = HealthData.query.filter_by(user_id=current_user.id).order_by(
        HealthData.date.desc()
    ).limit(14).all()

    insights = []
    if len(logs) >= 2:
        avg_energy = sum(l.energy_level or 5 for l in logs) / len(logs)
        if avg_energy < 4:
            insights.append("Ваш уровень энергии ниже среднего. Рекомендуем проверить режим сна и питания.")

    return jsonify({'insights': insights})


@analytics.route('/log-health', methods=['POST'])
@login_required
def log_health():
    data = request.json
    health = HealthData.query.filter_by(
        user_id=current_user.id, date=date.today()
    ).first()
    if not health:
        health = HealthData(user_id=current_user.id)
        db.session.add(health)

    health.energy_level = data.get('energy')
    health.mood_level = data.get('mood')
    health.hunger_before = data.get('hunger_before')
    health.hunger_after = data.get('hunger_after')
    health.symptoms = data.get('symptoms')
    health.notes = data.get('notes')
    db.session.commit()

    return jsonify({'success': True})


@analytics.route('/photo-upload', methods=['POST'])
@login_required
def photo_upload():
    if 'photo' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'error': 'No file'}), 400

    import os
    import time
    from werkzeug.utils import secure_filename
    upload_dir = f'static/uploads/{current_user.id}'
    os.makedirs(upload_dir, exist_ok=True)
    ts = int(time.time() * 1000)
    filename = secure_filename(f"progress_{date.today().isoformat()}_{ts}.jpg")
    file.save(os.path.join(upload_dir, filename))

    photo = ProgressPhoto(
        user_id=current_user.id,
        photo_path=f'uploads/{current_user.id}/{filename}',
        notes=request.form.get('notes', '')
    )
    db.session.add(photo)
    db.session.commit()

    return jsonify({'success': True, 'path': photo.photo_path})
