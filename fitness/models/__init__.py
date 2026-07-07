from flask_login import UserMixin
from datetime import datetime, date

from fitness import db


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_onboarded = db.Column(db.Boolean, default=False)

    profile = db.relationship('Profile', backref='user', uselist=False)
    health_data = db.relationship('HealthData', backref='user', uselist=False)
    daily_logs = db.relationship('DailyLog', backref='user', lazy='dynamic')
    habit_logs = db.relationship('HabitLog', backref='user', lazy='dynamic')
    meals = db.relationship('Meal', backref='user', lazy='dynamic')
    workouts = db.relationship('Workout', backref='user', lazy='dynamic')
    progress_photos = db.relationship('ProgressPhoto', backref='user', lazy='dynamic')
    community_messages = db.relationship('CommunityMessage', backref='user', lazy='dynamic')


class Profile(db.Model):
    __tablename__ = 'profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    gender = db.Column(db.String(20))
    age = db.Column(db.Integer)
    height = db.Column(db.Float)
    current_weight = db.Column(db.Float)
    goal_weight = db.Column(db.Float)
    goal_type = db.Column(db.String(50))
    activity_level = db.Column(db.String(50))
    sleep_hours = db.Column(db.Float)
    stress_level = db.Column(db.Integer)
    water_goal = db.Column(db.Integer)
    works_out = db.Column(db.Boolean, default=True)

    chronic_diseases = db.Column(db.Text)
    joint_problems = db.Column(db.Boolean, default=False)
    back_problems = db.Column(db.Boolean, default=False)
    blood_sugar_issues = db.Column(db.Boolean, default=False)
    blood_pressure_issues = db.Column(db.Boolean, default=False)
    is_pregnant = db.Column(db.Boolean, default=False)
    is_breastfeeding = db.Column(db.Boolean, default=False)

    has_yoga_mat = db.Column(db.Boolean, default=False)
    has_dumbbells = db.Column(db.Boolean, default=False)
    has_fitball = db.Column(db.Boolean, default=False)
    has_pullup_bar = db.Column(db.Boolean, default=False)
    has_resistance_band = db.Column(db.Boolean, default=False)
    free_space_meters = db.Column(db.Float)
    workout_time_minutes = db.Column(db.Integer)

    diet_type = db.Column(db.String(50))
    allergies = db.Column(db.Text)
    intolerances = db.Column(db.Text)
    food_preferences = db.Column(db.Text)
    food_dislikes = db.Column(db.Text)

    work_schedule = db.Column(db.String(50))
    meals_per_day = db.Column(db.Integer)
    drinks_water = db.Column(db.Boolean, default=True)
    water_amount = db.Column(db.Float)

    has_cycle = db.Column(db.Boolean, default=False)
    cycle_day = db.Column(db.Integer)
    cycle_length = db.Column(db.Integer)

    city = db.Column(db.String(100))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class HealthData(db.Model):
    __tablename__ = 'health_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    energy_level = db.Column(db.Integer)
    mood_level = db.Column(db.Integer)
    hunger_before = db.Column(db.Integer)
    hunger_after = db.Column(db.Integer)
    symptoms = db.Column(db.Text)
    notes = db.Column(db.Text)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
    date = db.Column(db.Date, default=date.today)


class DailyLog(db.Model):
    __tablename__ = 'daily_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, default=date.today)
    weight = db.Column(db.Float, nullable=True)
    water_glasses = db.Column(db.Integer, default=0)
    sleep_hours = db.Column(db.Float, nullable=True)
    activity_minutes = db.Column(db.Integer, default=0)
    calories_consumed = db.Column(db.Integer, default=0)
    calories_burned = db.Column(db.Integer, default=0)
    mood = db.Column(db.Integer)
    energy = db.Column(db.Integer)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class HabitLog(db.Model):
    __tablename__ = 'habit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, default=date.today)
    habit_type = db.Column(db.String(50))
    value = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Meal(db.Model):
    __tablename__ = 'meals'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, default=date.today)
    meal_type = db.Column(db.String(50))
    food_name = db.Column(db.String(200))
    protein = db.Column(db.Float, default=0)
    carbs = db.Column(db.Float, default=0)
    fats = db.Column(db.Float, default=0)
    calories = db.Column(db.Float, default=0)
    portion_size = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Workout(db.Model):
    __tablename__ = 'workouts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, default=date.today)
    workout_type = db.Column(db.String(100))
    duration_minutes = db.Column(db.Integer)
    calories_burned = db.Column(db.Integer)
    exercises = db.Column(db.Text)
    notes = db.Column(db.Text)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ProgressPhoto(db.Model):
    __tablename__ = 'progress_photos'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    photo_path = db.Column(db.String(500))
    date = db.Column(db.Date, default=date.today)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class CommunityMessage(db.Model):
    __tablename__ = 'community_messages'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    room = db.Column(db.String(100))
    message = db.Column(db.Text)
    is_sos = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class MealTemplate(db.Model):
    __tablename__ = 'meal_templates'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200))
    meal_type = db.Column(db.String(50))
    ingredients = db.Column(db.Text)
    instructions = db.Column(db.Text)
    protein = db.Column(db.Float)
    carbs = db.Column(db.Float)
    fats = db.Column(db.Float)
    calories = db.Column(db.Float)
    tags = db.Column(db.String(500))
    diet_types = db.Column(db.String(200))
    prep_time = db.Column(db.Integer)


class Exercise(db.Model):
    __tablename__ = 'exercises'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200))
    description = db.Column(db.Text)
    muscle_group = db.Column(db.String(100))
    difficulty = db.Column(db.String(50))
    equipment_needed = db.Column(db.String(200))
    video_url = db.Column(db.String(500))
    animation_url = db.Column(db.String(500))
    is_quiet = db.Column(db.Boolean, default=False)
    calories_per_minute = db.Column(db.Float)
    contraindications = db.Column(db.Text)
