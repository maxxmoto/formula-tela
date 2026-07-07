from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import current_user
from fitness import db
from fitness.models import User, Profile
from datetime import date

auth = Blueprint('auth', __name__, url_prefix='/auth')


@auth.route('/setup', methods=['GET', 'POST'])
def setup():
    if request.method == 'POST':
        user = User.query.get(1)
        if not user:
            user = User(username='me', email='me@local', password_hash='')
            db.session.add(user)
            db.session.commit()
        user.username = request.form.get('name', '') or 'Друг'
        profile = user.profile
        if not profile:
            profile = Profile(user_id=user.id)
            db.session.add(profile)
        profile.gender = request.form.get('gender')
        profile.age = int(request.form.get('age', 30))
        profile.height = float(request.form.get('height', 170))
        profile.current_weight = float(request.form.get('current_weight', 70))
        profile.goal_weight = float(request.form.get('goal_weight', 65))
        profile.goal_type = request.form.get('goal_type', 'lose')
        profile.activity_level = request.form.get('activity_level', 'light')
        profile.diet_type = request.form.get('diet_type', 'omnivore')
        user.is_onboarded = True
        db.session.commit()
        return redirect(url_for('main.dashboard'))
    return render_template('auth/setup.html')
