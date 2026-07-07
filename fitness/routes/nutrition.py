from flask import Blueprint, render_template, jsonify, request, make_response
from flask_login import login_required, current_user
from fitness import db
from fitness.models import Meal, MealTemplate, DailyLog
from datetime import date
import json
import math

nutrition = Blueprint('nutrition', __name__, url_prefix='/nutrition')


@nutrition.route('/')
@login_required
def index():
    today = date.today()
    meals = Meal.query.filter_by(user_id=current_user.id, date=today).order_by(Meal.meal_type).all()
    profile = current_user.profile

    targets = calculate_daily_targets(profile)

    consumed = {'protein': 0, 'carbs': 0, 'fats': 0, 'calories': 0}
    for m in meals:
        consumed['protein'] += m.protein or 0
        consumed['carbs'] += m.carbs or 0
        consumed['fats'] += m.fats or 0
        consumed['calories'] += m.calories or 0

    return render_template('nutrition/index.html',
                           meals=meals,
                           targets=targets,
                           consumed=consumed,
                           today=today)


@nutrition.route('/fridge')
@login_required
def fridge():
    return render_template('nutrition/fridge.html')


@nutrition.route('/grocery-list')
@login_required
def grocery_list():
    profile = current_user.profile
    list_items = generate_grocery_list(profile)
    return render_template('nutrition/grocery_list.html', items=list_items)


@nutrition.route('/grocery-list/pdf')
@login_required
def grocery_pdf():
    profile = current_user.profile
    list_items = generate_grocery_list(profile)
    html = render_template('nutrition/grocery_pdf.html', items=list_items)
    resp = make_response(html)
    resp.headers['Content-Type'] = 'text/html; charset=utf-8'
    return resp


@nutrition.route('/cheat-meal')
@login_required
def cheat_meal():
    return render_template('nutrition/cheat_meal.html')


@nutrition.route('/api/meal-from-fridge', methods=['POST'])
@login_required
def meal_from_fridge():
    data = request.json
    ingredients = data.get('ingredients', [])
    meals = generate_meals_from_ingredients(ingredients, current_user.profile)
    return jsonify({'meals': meals})


@nutrition.route('/api/add-meal', methods=['POST'])
@login_required
def add_meal():
    data = request.json
    meal = Meal(
        user_id=current_user.id,
        date=date.today(),
        meal_type=data.get('meal_type'),
        food_name=data.get('food_name'),
        protein=data.get('protein', 0),
        carbs=data.get('carbs', 0),
        fats=data.get('fats', 0),
        calories=data.get('calories', 0),
        portion_size=data.get('portion_size', '')
    )
    db.session.add(meal)
    db.session.commit()
    return jsonify({'success': True, 'meal_id': meal.id})


def calculate_mifflin_st_jeor(weight_kg, height_cm, age, gender):
    """Mifflin-St Jeor equation for BMR.
    Source: Mifflin et al. (1990) - most accurate equation for general population.
    """
    if gender == 'male':
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161


def calculate_daily_targets(profile):
    """Evidence-based macro targets using:
    - Mifflin-St Jeor equation for BMR (Mifflin 1990)
    - ISSN protein recommendations 1.4-2.4g/kg (Jäger 2017)
    - WHO/AMDR fat range 20-35% of calories
    - ACSM position stand for physical activity
    """
    if not profile:
        return {
            'protein': 80, 'carbs': 200, 'fats': 60, 'calories': 1800,
            'protein_servings': 4, 'veggie_servings': 4,
            'carbs_servings': 5, 'fat_servings': 4,
            'bmr': 1400, 'tdee': 1800
        }

    weight = profile.current_weight or 70
    height = profile.height or 165
    age = profile.age or 30
    gender = profile.gender or 'female'
    goal = profile.goal_type or 'maintain'

    bmr = calculate_mifflin_st_jeor(weight, height, age, gender)

    activity_factors = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725
    }
    af = activity_factors.get(profile.activity_level, 1.375)
    tdee = round(bmr * af)

    if goal == 'lose':
        calories = tdee - 500
        if calories < 1200:
            calories = 1200
        protein = round(weight * 1.8)
        protein = max(protein, round(weight * 1.6))
        protein = min(protein, round(weight * 2.4))
    elif goal == 'gain':
        calories = tdee + 350
        protein = round(weight * 1.8)
        protein = max(protein, round(weight * 1.6))
        protein = min(protein, round(weight * 2.2))
    else:
        calories = tdee
        protein = round(weight * 1.4)
        protein = max(protein, round(weight * 1.2))
        protein = min(protein, round(weight * 1.8))

    fat_min_cal = round(calories * 0.20)
    fat_max_cal = round(calories * 0.35)
    fat_cal = round((fat_min_cal + fat_max_cal) / 2)
    fats = round(fat_cal / 9)

    protein_cal = protein * 4
    remaining_cal = calories - protein_cal - fat_cal
    carbs = round(max(remaining_cal, 0) / 4)

    return {
        'protein': protein,
        'carbs': carbs,
        'fats': fats,
        'calories': calories,
        'bmr': round(bmr),
        'tdee': tdee,
        'protein_servings': max(1, round(protein / 25)),
        'veggie_servings': 4,
        'carbs_servings': max(1, round(carbs / 40)),
        'fat_servings': max(1, round(fats / 15))
    }


def generate_grocery_list(profile):
    """Generates grocery list based on Mediterranean diet principles
    (Harvard Health, 2023; Dietary Guidelines for Americans, 2020-2025).
    """
    items = [
        {'name': 'Куриное филе / индейка', 'category': 'Белок (нежирное мясо)', 'checked': False},
        {'name': 'Яйца', 'category': 'Белок', 'checked': False},
        {'name': 'Гречка', 'category': 'Цельнозерновые', 'checked': False},
        {'name': 'Овсянка долгая варка', 'category': 'Цельнозерновые', 'checked': False},
        {'name': 'Киноа или булгур', 'category': 'Цельнозерновые', 'checked': False},
        {'name': 'Помидоры', 'category': 'Овощи', 'checked': False},
        {'name': 'Огурцы', 'category': 'Овощи', 'checked': False},
        {'name': 'Листовой салат / руккола', 'category': 'Зелень', 'checked': False},
        {'name': 'Брокколи или цветная капуста', 'category': 'Овощи', 'checked': False},
        {'name': 'Болгарский перец', 'category': 'Овощи', 'checked': False},
        {'name': 'Авокадо', 'category': 'Овощи', 'checked': False},
        {'name': 'Яблоки', 'category': 'Фрукты', 'checked': False},
        {'name': 'Ягоды (свежие или замороженные)', 'category': 'Фрукты', 'checked': False},
        {'name': 'Грейпфрут', 'category': 'Фрукты', 'checked': False},
        {'name': 'Оливковое масло Extra Virgin', 'category': 'Полезные жиры', 'checked': False},
        {'name': 'Орехи (грецкие / миндаль)', 'category': 'Полезные жиры', 'checked': False},
        {'name': 'Семена чиа / льна', 'category': 'Полезные жиры', 'checked': False},
        {'name': 'Греческий йогурт 2%', 'category': 'Молочные', 'checked': False},
        {'name': 'Творог 5%', 'category': 'Молочные', 'checked': False},
        {'name': 'Рыба жирная (лосось / скумбрия)', 'category': 'Белок (рыба)', 'checked': False},
        {'name': 'Консервированная фасоль / нут', 'category': 'Растительный белок', 'checked': False},
        {'name': 'Чечевица', 'category': 'Растительный белок', 'checked': False},
    ]

    if profile:
        if profile.diet_type == 'vegan':
            restricted = ['Куриное филе / индейка', 'Яйца', 'Греческий йогурт 2%',
                          'Творог 5%', 'Рыба жирная (лосось / скумбрия)']
            items = [i for i in items if i['name'] not in restricted]
            items.extend([
                {'name': 'Тофу', 'category': 'Растительный белок', 'checked': False},
                {'name': 'Кокосовое молоко', 'category': 'Растительное молоко', 'checked': False},
                {'name': 'Миндальное молоко', 'category': 'Растительное молоко', 'checked': False},
                {'name': 'Темпе', 'category': 'Растительный белок', 'checked': False},
            ])
        elif profile.diet_type == 'vegetarian':
            items = [i for i in items if i['name'] not in ['Куриное филе / индейка',
                     'Рыба жирная (лосось / скумбрия)']]
            items.extend([
                {'name': 'Тофу', 'category': 'Растительный белок', 'checked': False},
                {'name': 'Нут', 'category': 'Растительный белок', 'checked': False},
            ])
        elif profile.diet_type == 'no_red_meat':
            # already no red meat in list, but keep poultry and fish
            pass

        if profile.intolerances:
            intolerances = profile.intolerances.lower()
            if 'лактоз' in intolerances or 'молоч' in intolerances or 'молок' in intolerances:
                items = [i for i in items if i['category'] not in ['Молочные']]
                items.extend([
                    {'name': 'Миндальное молоко', 'category': 'Растительное молоко', 'checked': False},
                    {'name': 'Кокосовый йогурт', 'category': 'Растительное молоко', 'checked': False},
                ])
            if 'глютен' in intolerances:
                items = [i for i in items if i['name']
                         not in ['Овсянка долгая варка']]
                items.append({'name': 'Овсянка без глютена', 'category': 'Цельнозерновые', 'checked': False})

    return items


MEAL_IMAGES = {
    'Омлет': 'food/omelette.svg',
    'Овсянка': 'food/oatmeal.svg',
    'Куриная грудка': 'food/chicken_buckwheat.svg',
    'Рыба': 'food/fish_quinoa.svg',
    'Тофу': 'food/tofu.svg',
    'Салат': 'food/greek_salad.svg',
    'Большой салат': 'food/greek_salad.svg',
    'Йогурт': 'food/yogurt.svg',
    'Греческий йогурт': 'food/yogurt.svg',
}


def get_meal_image(name):
    for key, path in MEAL_IMAGES.items():
        if key.lower() in name.lower():
            return path
    return 'food/greek_salad.svg'


def generate_meals_from_ingredients(ingredients, profile):
    ing_lower = [i.lower() for i in ingredients]
    meals = []

    if any(x in ing_lower for x in ['яйца', 'egg']):
        meal = {
            'name': 'Омлет с овощами',
            'ingredients': ['яйца', 'помидоры', 'перец', 'зелень'],
            'calories': 280, 'protein': 24, 'carbs': 6, 'fats': 18,
            'time': '10 мин', 'source': 'Harvard Healthy Eating Plate'
        }
        if any(x in ing_lower for x in ['помидоры', 'tomato']):
            meal['ingredients'] = ['яйца', 'помидоры', 'зелень']
        meal['image'] = get_meal_image(meal['name'])
        meals.append(meal)

    if any(x in ing_lower for x in ['овсянк', 'oat', 'овсян']):
        meal = {
            'name': 'Овсянка с ягодами и орехами',
            'ingredients': ['овсянка', 'ягоды', 'орехи', 'корица'],
            'calories': 320, 'protein': 12, 'carbs': 45, 'fats': 12,
            'time': '10 мин',
            'source': 'Harvard Health — долгая сытость за счет клетчатки',
            'image': get_meal_image('Овсянка')
        }
        meals.append(meal)

    has_protein = any(x in ing_lower for x in ['куриц', 'chicken', 'рыб', 'fish', 'тофу', 'tofu', 'мяс', 'meat'])
    has_grains = any(x in ing_lower for x in ['гречк', 'buckwheat', 'рис', 'rice', 'киноа', 'quinoa', 'булгур', 'bulgur'])
    has_veggies = any(x in ing_lower for x in ['помидор', 'tomato', 'огур', 'cucumber', 'перц', 'pepper',
                                                'брокколи', 'broccoli', 'капуст', 'cabbage', 'салат', 'lettuce',
                                                'морков', 'carrot', 'лук', 'onion'])

    if has_protein and has_grains and has_veggies:
        if 'куриц' in ing_lower or 'chicken' in ing_lower:
            meals.append({
                'name': 'Куриная грудка с гречкой и овощами',
                'ingredients': ['куриная грудка', 'гречка', 'овощи', 'оливковое масло'],
                'calories': 450, 'protein': 42, 'carbs': 40, 'fats': 12,
                'time': '25 мин',
                'source': 'ACSM — оптимум белок/углеводы после тренировки',
                'image': get_meal_image('Куриная грудка')
            })
        if 'рыб' in ing_lower or 'fish' in ing_lower or 'лосос' in ing_lower or 'salmon' in ing_lower:
            meals.append({
                'name': 'Рыба с киноа и овощами',
                'ingredients': ['рыба', 'киноа', 'овощи', 'лимон'],
                'calories': 420, 'protein': 35, 'carbs': 35, 'fats': 16,
                'time': '25 мин', 'source': 'Омега-3 (EPA/DHA) — AHA, 2023',
                'image': get_meal_image('Рыба')
            })
        if 'тофу' in ing_lower or 'tofu' in ing_lower:
            meals.append({
                'name': 'Тофу с овощами и рисом',
                'ingredients': ['тофу', 'рис', 'брокколи', 'соевый соус', 'имбирь'],
                'calories': 380, 'protein': 28, 'carbs': 42, 'fats': 10,
                'time': '20 мин', 'source': 'Plant-based protein — ISSN 2017',
                'image': get_meal_image('Тофу')
            })

    if has_veggies:
        meals.append({
            'name': 'Большой салат с белком',
            'ingredients': ['салат', 'помидоры', 'огурцы', 'авокадо', 'источник белка'],
            'calories': 350, 'protein': 25, 'carbs': 15, 'fats': 22,
            'time': '10 мин',
            'source': 'Harvard Healthy Eating Plate — половина тарелки овощи',
            'image': get_meal_image('Большой салат')
        })

    if any(x in ing_lower for x in ['йогурт', 'yogurt', 'творог', 'cheese']):
        meals.append({
            'name': 'Греческий йогурт с орехами и ягодами',
            'ingredients': ['греческий йогурт', 'орехи', 'ягоды'],
            'calories': 240, 'protein': 18, 'carbs': 18, 'fats': 12,
            'time': '3 мин',
            'source': 'Harvard Health — перекус с высоким содержанием белка',
            'image': get_meal_image('Греческий йогурт')
        })

    if not meals:
        meals.append({
            'name': 'Салат из доступных продуктов',
            'ingredients': ingredients,
            'calories': 300, 'protein': 15, 'carbs': 25, 'fats': 15,
            'time': '10 мин',
            'source': 'Импровизация на основе принципов здоровой тарелки',
            'image': get_meal_image('Салат')
        })

    for m in meals:
        if 'image' not in m:
            m['image'] = get_meal_image(m['name'])

    return meals
