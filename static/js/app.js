/* ===== Формула Тела — SPA App ===== */

// ===== Storage =====
const Store = {
    get(k, def) { try { const d = localStorage.getItem('ft_' + k); return d ? JSON.parse(d) : def } catch { return def } },
    set(k, v) { localStorage.setItem('ft_' + k, JSON.stringify(v)) },
    remove(k) { localStorage.removeItem('ft_' + k) }
};

// ===== Formulas =====
const Formulas = {
    bmr(w, h, a, g) {
        return g === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    },
    tdee(bmr, activity) {
        const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
        return Math.round(bmr * (factors[activity] || 1.375));
    },
    targets(profile) {
        const w = profile.current_weight || 70, h = profile.height || 165, a = profile.age || 30;
        const g = profile.gender || 'female', goal = profile.goal_type || 'maintain';
        const act = profile.activity_level || 'light';
        const bmr = this.bmr(w, h, a, g), tdee = this.tdee(bmr, act);
        let cal = goal === 'lose' ? Math.max(tdee - 500, 1200) : goal === 'gain' ? tdee + 350 : tdee;
        let protein = Math.round(goal === 'lose' ? w * 1.8 : goal === 'gain' ? w * 1.8 : w * 1.4);
        protein = Math.max(protein, Math.round(w * (goal === 'maintain' ? 1.2 : 1.6)));
        protein = Math.min(protein, Math.round(w * (goal === 'lose' ? 2.4 : goal === 'gain' ? 2.2 : 1.8)));
        const fatCal = Math.round((cal * 0.20 + cal * 0.35) / 2);
        const fats = Math.round(fatCal / 9);
        const carbs = Math.round(Math.max(cal - protein * 4 - fatCal, 0) / 4);
        return { protein, carbs, fats, calories: cal, bmr: Math.round(bmr), tdee,
            protein_servings: Math.max(1, Math.round(protein / 25)),
            veggie_servings: 4, carbs_servings: Math.max(1, Math.round(carbs / 40)),
            fat_servings: Math.max(1, Math.round(fats / 15)) };
    }
};

// ===== Router =====
const Router = {
    current: null,
    navigate(page, data) {
        history.pushState(null, '', '#' + page);
        this.show(page, data);
    },
    show(page, data) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const el = document.querySelector(`[data-page="${page}"]`);
        if (el) {
            el.classList.add('active');
            this.current = page;
            if (page !== 'setup') document.getElementById('navBar').style.display = 'flex';
            else document.getElementById('navBar').style.display = 'none';
            if (window.renderPage) window.renderPage(page, data);
        }
        window.scrollTo(0, 0);
        document.querySelector('.nav-links')?.classList.remove('active');
    },
    init() {
        const hash = location.hash.slice(1) || 'setup';
        const profile = Store.get('profile');
        if (!profile && hash !== 'setup' && hash !== 'legal') { this.navigate('setup'); return; }
        this.navigate(hash);
        window.addEventListener('popstate', () => {
            const h = location.hash.slice(1) || 'setup';
            this.show(h);
        });
    }
};

// ===== Data helpers =====
const Data = {
    today() { return new Date().toISOString().slice(0, 10) },
    yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) },
    daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) },
    formatDate(d) {
        if (!d) return '';
        const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
        return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    getLog(date) {
        const logs = Store.get('dailyLogs', []);
        return logs.find(l => l.date === date);
    },
    saveLog(log) {
        let logs = Store.get('dailyLogs', []);
        const idx = logs.findIndex(l => l.date === log.date);
        if (idx >= 0) logs[idx] = log; else logs.push(log);
        Store.set('dailyLogs', logs);
    },
    getMeals(date) {
        const meals = Store.get('meals', []);
        return meals.filter(m => m.date === date);
    },
    saveMeal(meal) {
        const meals = Store.get('meals', []);
        meals.push({ ...meal, id: Date.now() });
        Store.set('meals', meals);
    },
    getWorkouts() {
        return Store.get('workouts', []);
    },
    saveWorkout(w) {
        const wks = Store.get('workouts', []);
        wks.push({ ...w, id: Date.now() });
        Store.set('workouts', wks);
    },
    getHealth(date) {
        const logs = Store.get('healthLogs', []);
        return logs.find(l => l.date === date);
    },
    saveHealth(h) {
        let logs = Store.get('healthLogs', []);
        const idx = logs.findIndex(l => l.date === h.date);
        if (idx >= 0) logs[idx] = h; else logs.push(h);
        Store.set('healthLogs', logs);
    },
    getPhotos() { return Store.get('photos', []) },
    savePhoto(p) {
        const ph = Store.get('photos', []);
        ph.push({ ...p, id: Date.now() });
        Store.set('photos', ph);
    }
};

// ===== Gym =====
const GYM = {
    exercises: [
        { name: 'Приседания', group: 'ноги', diff: 'beginner', quiet: false, cal: 7, contra: 'колени' },
        { name: 'Планка', group: 'кор', diff: 'beginner', quiet: true, cal: 3, contra: '' },
        { name: 'Отжимания', group: 'грудь', diff: 'intermediate', quiet: false, cal: 6, contra: 'запястья' },
        { name: 'Берпи', group: 'все тело', diff: 'advanced', quiet: false, cal: 10, contra: 'суставы,спина' },
        { name: 'Ягодичный мостик', group: 'ягодицы', diff: 'beginner', quiet: true, cal: 4, contra: '' },
        { name: 'Выпады', group: 'ноги', diff: 'beginner', quiet: false, cal: 6, contra: 'колени' },
        { name: 'Скручивания', group: 'кор', diff: 'beginner', quiet: true, cal: 4, contra: 'шея' },
        { name: 'Обратные отжимания', group: 'трицепс', diff: 'intermediate', quiet: false, cal: 5, contra: 'плечи' },
        { name: 'Супермен', group: 'спина', diff: 'beginner', quiet: true, cal: 3, contra: 'спина' },
        { name: 'Бёрпи без прыжка', group: 'все тело', diff: 'intermediate', quiet: true, cal: 6, contra: 'колени' },
    ],
    generate(duration, type, quiet, contra) {
        let pool = this.exercises.filter(e => {
            if (quiet && !e.quiet) return false;
            if (type !== 'full_body') {
                const groups = { upper: ['грудь', 'трицепс', 'спина'], lower: ['ноги', 'ягодицы'],
                    core: ['кор'], stretch: ['кор'] };
                if (!groups[type]?.includes(e.group)) return false;
            }
            if (contra && e.contra) {
                const c = contra.toLowerCase();
                const ec = e.contra.toLowerCase();
                if (c.split(',').some(p => ec.includes(p.trim()))) return false;
            }
            return true;
        });
        if (!pool.length) pool = this.exercises.filter(e => true);
        const reps = Math.max(3, Math.floor(duration / 4));
        const result = [];
        for (let i = 0; i < reps; i++) {
            const e = pool[i % pool.length];
            const sets = Math.floor(duration / pool.length) || 2;
            result.push({ ...e, duration: Math.floor(duration / reps) });
        }
        return result;
    }
};

// ===== Meal generator =====
const MEAL_IMAGES = {
    'Омлет': 'static/images/food/omelette.svg',
    'Овсянка': 'static/images/food/oatmeal.svg',
    'Куриная грудка': 'static/images/food/chicken_buckwheat.svg',
    'Рыба': 'static/images/food/fish_quinoa.svg',
    'Тофу': 'static/images/food/tofu.svg',
    'Салат': 'static/images/food/greek_salad.svg',
    'Большой салат': 'static/images/food/greek_salad.svg',
    'Йогурт': 'static/images/food/yogurt.svg',
    'Греческий йогурт': 'static/images/food/yogurt.svg',
};

function getMealImage(name) {
    for (const [k, v] of Object.entries(MEAL_IMAGES)) {
        if (name.toLowerCase().includes(k.toLowerCase())) return v;
    }
    return 'static/images/food/greek_salad.svg';
}

function generateMeals(ingredients, profile) {
    const ing_lower = ingredients.map(i => i.toLowerCase());
    const meals = [];
    const add = (m) => { m.image = getMealImage(m.name); meals.push(m); };

    if (ing_lower.some(x => ['яйца', 'egg'].includes(x))) {
        add({ name: 'Омлет с овощами', ingredients: ['яйца', 'помидоры', 'перец', 'зелень'],
            calories: 280, protein: 24, carbs: 6, fats: 18, time: '10 мин',
            source: 'Harvard Healthy Eating Plate' });
    }
    if (ing_lower.some(x => ['овсянк', 'oat', 'овсян', 'овес'].includes(x))) {
        add({ name: 'Овсянка с ягодами и орехами', ingredients: ['овсянка', 'ягоды', 'орехи', 'корица'],
            calories: 320, protein: 12, carbs: 45, fats: 12, time: '10 мин',
            source: 'Harvard Health' });
    }
    const hasProtein = ing_lower.some(x => ['куриц', 'chicken', 'рыб', 'fish', 'тофу', 'tofu', 'мяс', 'meat'].includes(x));
    const hasGrains = ing_lower.some(x => ['гречк', 'buckwheat', 'рис', 'rice', 'киноа', 'quinoa', 'булгур', 'bulgur'].includes(x));
    const hasVeggies = ing_lower.some(x => ['помидор', 'tomato', 'огурец', 'огур', 'cucumber', 'перц', 'pepper',
        'брокколи', 'broccoli', 'капуст', 'cabbage', 'салат', 'lettuce', 'морков', 'carrot', 'лук', 'onion'].includes(x));

    if (hasProtein && hasGrains && hasVeggies) {
        if (ing_lower.some(x => ['куриц', 'chicken'].includes(x)))
            add({ name: 'Куриная грудка с гречкой и овощами', ingredients: ['куриная грудка', 'гречка', 'овощи', 'оливковое масло'],
                calories: 450, protein: 42, carbs: 40, fats: 12, time: '25 мин', source: 'ACSM' });
        if (ing_lower.some(x => ['рыб', 'fish', 'лосос', 'salmon'].includes(x)))
            add({ name: 'Рыба с киноа и овощами', ingredients: ['рыба', 'киноа', 'овощи', 'лимон'],
                calories: 420, protein: 35, carbs: 35, fats: 16, time: '25 мин', source: 'AHA 2023' });
        if (ing_lower.some(x => ['тофу', 'tofu'].includes(x)))
            add({ name: 'Тофу с овощами и рисом', ingredients: ['тофу', 'рис', 'брокколи', 'соевый соус', 'имбирь'],
                calories: 380, protein: 28, carbs: 42, fats: 10, time: '20 мин', source: 'ISSN 2017' });
    }
    if (hasVeggies)
        add({ name: 'Большой салат с белком', ingredients: ['салат', 'помидоры', 'огурцы', 'авокадо', 'источник белка'],
            calories: 350, protein: 25, carbs: 15, fats: 22, time: '10 мин', source: 'Harvard Plate' });
    if (ing_lower.some(x => ['йогурт', 'yogurt', 'творог', 'cheese'].includes(x)))
        add({ name: 'Греческий йогурт с орехами и ягодами', ingredients: ['греческий йогурт', 'орехи', 'ягоды'],
            calories: 240, protein: 18, carbs: 18, fats: 12, time: '3 мин', source: 'Harvard Health' });

    if (!meals.length) add({ name: 'Салат из доступных продуктов', ingredients: ingredients,
        calories: 300, protein: 15, carbs: 25, fats: 15, time: '10 мин', source: 'Принципы здоровой тарелки' });

    return meals;
}

// ===== Grocery generator =====
function generateGrocery(profile) {
    const items = [
        { name: 'Куриное филе / индейка', category: 'Белок', checked: false },
        { name: 'Яйца', category: 'Белок', checked: false },
        { name: 'Гречка', category: 'Цельнозерновые', checked: false },
        { name: 'Овсянка долгая варка', category: 'Цельнозерновые', checked: false },
        { name: 'Киноа или булгур', category: 'Цельнозерновые', checked: false },
        { name: 'Помидоры', category: 'Овощи', checked: false },
        { name: 'Огурцы', category: 'Овощи', checked: false },
        { name: 'Листовой салат / руккола', category: 'Зелень', checked: false },
        { name: 'Брокколи или цветная капуста', category: 'Овощи', checked: false },
        { name: 'Болгарский перец', category: 'Овощи', checked: false },
        { name: 'Авокадо', category: 'Овощи', checked: false },
        { name: 'Яблоки', category: 'Фрукты', checked: false },
        { name: 'Ягоды (свежие или замороженные)', category: 'Фрукты', checked: false },
        { name: 'Оливковое масло Extra Virgin', category: 'Полезные жиры', checked: false },
        { name: 'Орехи (грецкие / миндаль)', category: 'Полезные жиры', checked: false },
        { name: 'Греческий йогурт 2%', category: 'Молочные', checked: false },
        { name: 'Творог 5%', category: 'Молочные', checked: false },
        { name: 'Рыба жирная (лосось / скумбрия)', category: 'Белок', checked: false },
    ];
    if (profile) {
        if (profile.diet_type === 'vegan') {
            const skip = ['Куриное филе / индейка', 'Яйца', 'Греческий йогурт 2%', 'Творог 5%', 'Рыба жирная (лосось / скумбрия)'];
            const filtered = items.filter(i => !skip.includes(i.name));
            filtered.push({ name: 'Тофу', category: 'Растительный белок', checked: false });
            filtered.push({ name: 'Миндальное молоко', category: 'Растительное молоко', checked: false });
            return filtered;
        }
        if (profile.diet_type === 'vegetarian') {
            const filtered = items.filter(i => !['Куриное филе / индейка', 'Рыба жирная (лосось / скумбрия)'].includes(i.name));
            filtered.push({ name: 'Тофу', category: 'Растительный белок', checked: false });
            return filtered;
        }
        if (profile.intolerances) {
            const intol = profile.intolerances.toLowerCase();
            if (intol.includes('лактоз') || intol.includes('молоч')) {
                items.filter(i => i.category !== 'Молочные');
                items.push({ name: 'Миндальное молоко', category: 'Растительное молоко', checked: false });
            }
        }
    }
    return items;
}

// ===== Render functions =====
window.renderPage = function(page, data) {
    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'nutrition': renderNutrition(); break;
        case 'fridge': renderFridge(data); break;
        case 'grocery': renderGrocery(); break;
        case 'cheat': renderCheat(data); break;
        case 'fitness': renderFitness(); break;
        case 'analytics': renderAnalytics(); break;
        case 'weight': renderWeight(); break;
        case 'community': renderCommunity(); break;
        case 'setup': renderSetup(data); break;
    }
};

// ===== Setup =====
function renderSetup() {
    const p = Store.get('profile');
    if (p) {
        document.getElementById('setupName').value = p.name || '';
        document.getElementById('setupGender').value = p.gender || 'female';
        document.getElementById('setupAge').value = p.age || 30;
        document.getElementById('setupHeight').value = p.height || 170;
        document.getElementById('setupWeight').value = p.current_weight || 70;
        document.getElementById('setupGoalWeight').value = p.goal_weight || 65;
        document.getElementById('setupGoal').value = p.goal_type || 'lose';
        document.getElementById('setupActivity').value = p.activity_level || 'light';
        document.getElementById('setupDiet').value = p.diet_type || 'omnivore';
    }
    document.getElementById('setupForm').onsubmit = function(e) {
        e.preventDefault();
        const profile = {
            name: document.getElementById('setupName').value,
            gender: document.getElementById('setupGender').value,
            age: parseInt(document.getElementById('setupAge').value),
            height: parseFloat(document.getElementById('setupHeight').value),
            current_weight: parseFloat(document.getElementById('setupWeight').value),
            goal_weight: parseFloat(document.getElementById('setupGoalWeight').value),
            goal_type: document.getElementById('setupGoal').value,
            activity_level: document.getElementById('setupActivity').value,
            diet_type: document.getElementById('setupDiet').value,
        };
        Store.set('profile', profile);
        Router.navigate('dashboard');
    };
}

// ===== Dashboard =====
function renderDashboard() {
    const p = Store.get('profile');
    const today = Data.today();
    const log = Data.getLog(today) || { date: today, water: 0, sleep: 0, activity: 0, mood: 0, energy: 0, weight: 0 };
    const meals = Data.getMeals(today);
    let targets = { protein: 80, carbs: 200, fats: 60, calories: 1800 };
    if (p) targets = Formulas.targets(p);

    const consumed = { protein: 0, carbs: 0, fats: 0, calories: 0 };
    meals.forEach(m => { consumed.protein += m.protein || 0; consumed.carbs += m.carbs || 0; consumed.fats += m.fats || 0; consumed.calories += m.calories || 0; });

    const streak = (Store.get('dailyLogs', []).filter(l => l.date <= today && (l.activity || 0) >= 15)).length;

    const name = p?.name || '';
    const greeting = name ? `Привет, ${name}!` : 'Привет!';
    document.getElementById('dashGreeting').innerHTML = `<span class="h1-gradient">${greeting}</span>`;
    document.getElementById('dashMsg').textContent = name ? `${name}, сегодня идеальный день для заботы о себе!` : 'Сегодня идеальный день для заботы о себе!';

    // Quick log
    document.getElementById('logWater').value = log.water || 0;
    document.getElementById('logSleep').value = log.sleep || '';
    document.getElementById('logActivity').value = log.activity || 0;
    document.getElementById('logMood').value = log.mood || '';
    document.getElementById('logEnergy').value = log.energy || '';

    document.getElementById('dashLogForm').onsubmit = function(e) {
        e.preventDefault();
        const l = {
            date: today,
            water: parseInt(document.getElementById('logWater').value) || 0,
            sleep: parseFloat(document.getElementById('logSleep').value) || 0,
            activity: parseInt(document.getElementById('logActivity').value) || 0,
            mood: parseInt(document.getElementById('logMood').value) || 0,
            energy: parseInt(document.getElementById('logEnergy').value) || 0,
            weight: log.weight || 0,
        };
        Data.saveLog(l);
        renderDashboard();
    };

    // Macro bars
    const proteinPct = targets.protein ? Math.min(consumed.protein / targets.protein * 100, 100) : 0;
    const carbsPct = targets.carbs ? Math.min(consumed.carbs / targets.carbs * 100, 100) : 0;
    const fatsPct = targets.fats ? Math.min(consumed.fats / targets.fats * 100, 100) : 0;
    document.getElementById('dashProteinBar').style.width = proteinPct + '%';
    document.getElementById('dashProteinText').textContent = `${consumed.protein} / ${targets.protein} г`;
    document.getElementById('dashCarbsBar').style.width = carbsPct + '%';
    document.getElementById('dashCarbsText').textContent = `${consumed.carbs} / ${targets.carbs} г`;
    document.getElementById('dashFatsBar').style.width = fatsPct + '%';
    document.getElementById('dashFatsText').textContent = `${consumed.fats} / ${targets.fats} г`;

    // Streak
    document.getElementById('dashStreak').textContent = `Серия ${streak} дней`;
    document.getElementById('dashWeekGrid').innerHTML = '';
    for (let i = 0; i < 7; i++) {
        const d = document.createElement('div');
        d.className = 'day-marker' + (i < streak ? ' active' : '');
        document.getElementById('dashWeekGrid').appendChild(d);
    }

    // Cycle
    document.getElementById('dashCycle').innerHTML = '';
}

// ===== Nutrition =====
function renderNutrition() {
    const p = Store.get('profile');
    const today = Data.today();
    const meals = Data.getMeals(today);
    const targets = p ? Formulas.targets(p) : { protein: 80, carbs: 200, fats: 60, calories: 1800, protein_servings: 4, veggie_servings: 4, carbs_servings: 5, fat_servings: 4, bmr: 1400, tdee: 1800 };

    const consumed = { protein: 0, carbs: 0, fats: 0, calories: 0 };
    meals.forEach(m => { consumed.protein += m.protein || 0; consumed.carbs += m.carbs || 0; consumed.fats += m.fats || 0; consumed.calories += m.calories || 0; });

    document.getElementById('nutriPlate').innerHTML = `
        <div class="plate-segment protein-seg">Белки: ${targets.protein_servings} порции</div>
        <div class="plate-segment veggie-seg">Овощи: ${targets.veggie_servings} порции</div>
        <div class="plate-segment carbs-seg">Углеводы: ${targets.carbs_servings} порции</div>
        <div class="plate-segment fat-seg">Жиры: ${targets.fat_servings} порции</div>`;
    document.getElementById('nutriTargets').innerHTML = `
        <div class="macro-stat"><span class="stat-label">Белки</span><span class="stat-value">${targets.protein}г</span></div>
        <div class="macro-stat"><span class="stat-label">Углеводы</span><span class="stat-value">${targets.carbs}г</span></div>
        <div class="macro-stat"><span class="stat-label">Жиры</span><span class="stat-value">${targets.fats}г</span></div>
        <div class="macro-stat"><span class="stat-label">Калории</span><span class="stat-value">${targets.calories} ккал</span></div>`;

    const proteinPct = targets.protein ? Math.min(consumed.protein / targets.protein * 100, 100) : 0;
    const carbsPct = targets.carbs ? Math.min(consumed.carbs / targets.carbs * 100, 100) : 0;
    const fatsPct = targets.fats ? Math.min(consumed.fats / targets.fats * 100, 100) : 0;
    document.getElementById('nutriConsumed').innerHTML = `
        <div class="macro-stat"><span class="stat-label">Белки</span><span class="stat-value">${consumed.protein}г / ${targets.protein}г</span></div>
        <div class="macro-stat"><span class="stat-label">Углеводы</span><span class="stat-value">${consumed.carbs}г / ${targets.carbs}г</span></div>
        <div class="macro-stat"><span class="stat-label">Жиры</span><span class="stat-value">${consumed.fats}г / ${targets.fats}г</span></div>
        <div class="macro-stat"><span class="stat-label">Калории</span><span class="stat-value">${consumed.calories} / ${targets.calories}</span></div>
        <div class="progress-bars">
            <div class="progress-bar-wrap"><div class="progress-fill protein" style="width:${proteinPct}%"></div></div>
            <div class="progress-bar-wrap"><div class="progress-fill carbs" style="width:${carbsPct}%"></div></div>
            <div class="progress-bar-wrap"><div class="progress-fill fats" style="width:${fatsPct}%"></div></div>
        </div>`;

    if (meals.length) {
        document.getElementById('nutriMeals').innerHTML = meals.map(m =>
            `<div class="meal-entry"><span class="meal-type">${m.meal_type}</span><span class="meal-name">${m.food_name}</span><span class="meal-cal">${m.calories} ккал</span></div>`
        ).join('');
    } else {
        document.getElementById('nutriMeals').innerHTML = '<p class="empty-state">Сегодня еще ничего не записано</p>';
    }
}

// ===== Fridge =====
function renderFridge() {
    const tags = [];
    const container = document.getElementById('fridgeTags');
    const results = document.getElementById('fridgeResults');

    document.getElementById('fridgeAddBtn').onclick = function() {
        const input = document.getElementById('fridgeInput');
        const val = input.value.trim();
        if (val && !tags.includes(val)) {
            tags.push(val);
            renderTags();
            input.value = '';
        }
    };
    document.getElementById('fridgeInput').onkeydown = function(e) {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('fridgeAddBtn').click(); }
    };

    function renderTags() {
        container.innerHTML = tags.map(t => `<span class="tag">${t} <span class="tag-remove" data-tag="${t}">&times;</span></span>`).join('');
        container.querySelectorAll('.tag-remove').forEach(el => {
            el.onclick = function() {
                const idx = tags.indexOf(this.dataset.tag);
                if (idx >= 0) tags.splice(idx, 1);
                renderTags();
                results.innerHTML = '';
            };
        });
    }

    document.getElementById('fridgeGenerateBtn').onclick = function() {
        if (!tags.length) { results.innerHTML = '<p class="empty-state">Добавьте хотя бы один продукт</p>'; return; }
        const meals = generateMeals(tags, Store.get('profile'));
        results.innerHTML = meals.map(m => `
            <div class="meal-option">
                <img src="${m.image}" class="meal-img" alt="${m.name}" onerror="this.src='static/images/food/greek_salad.svg'">
                <div class="meal-option-body">
                    <h3>${m.name}</h3>
                    <p>${m.calories} ккал · Б: ${m.protein}г · У: ${m.carbs}г · Ж: ${m.fats}г</p>
                    <p style="font-size:0.85rem;color:var(--text-muted)">${m.ingredients.join(', ')} · ${m.time}</p>
                    <span class="meal-time">${m.source}</span>
                </div>
            </div>
        `).join('');
    };
}

// ===== Grocery =====
function renderGrocery() {
    const p = Store.get('profile');
    const items = generateGrocery(p);
    const categories = {};
    items.forEach(i => { if (!categories[i.category]) categories[i.category] = []; categories[i.category].push(i); });
    const container = document.getElementById('groceryList');
    container.innerHTML = Object.entries(categories).map(([cat, list]) => `
        <div class="grocery-category"><h3>${cat}</h3>
            ${list.map(item => `<label class="grocery-item"><input type="checkbox" class="grocery-check" ${item.checked ? 'checked' : ''}><span class="grocery-name">${item.name}</span></label>`).join('')}
        </div>
    `).join('');

    document.getElementById('clearChecked').onclick = function() {
        document.querySelectorAll('.grocery-check:checked').forEach(cb => cb.closest('.grocery-item')?.remove());
    };
}

// ===== Cheat Meal =====
function renderCheat() {
    document.getElementById('cheatForm').onsubmit = function(e) {
        e.preventDefault();
        const meal = document.getElementById('cheatMeal').value.trim();
        const cal = parseInt(document.getElementById('cheatCal').value) || 0;
        if (!meal) return;
        const p = Store.get('profile');
        const targets = p ? Formulas.targets(p) : { calories: 1800 };
        const pct = Math.round(cal / targets.calories * 100);
        document.getElementById('cheatResult').innerHTML = `
            <div class="cheat-result-content">
                <p><strong>${meal}</strong> — ${cal} ккал (${pct}% дневной нормы)</p>
                <p style="margin-top:12px;">Чтобы компенсировать, добавьте ${Math.round(pct/2)} мин кардио или уменьшите ужин на ${cal} ккал.</p>
                <p style="margin-top:8px;font-size:0.9rem;color:var(--text-muted);">Главное — общий баланс за неделю, а не один приём пищи.</p>
            </div>`;
    };
}

// ===== Fitness =====
let workoutTimer = null;
function renderFitness() {
    document.getElementById('generateWorkout').onclick = function() {
        const duration = parseInt(document.querySelector('input[name="duration"]:checked')?.value || 20);
        const type = document.querySelector('input[name="workoutType"]:checked')?.value || 'full_body';
        const quiet = document.getElementById('quietMode').checked;
        const contra = document.getElementById('contraInput').value;
        const exercises = GYM.generate(duration, type, quiet, contra);
        const list = document.getElementById('exercisesList');
        list.innerHTML = exercises.map((e, i) => `
            <div class="exercise-item" data-idx="${i}">
                <span class="ex-num">${i + 1}</span>
                <div class="ex-info"><span class="ex-name">${e.name}</span><span class="ex-duration">${e.duration} сек</span></div>
                <div class="ex-progress" style="width:0%"></div>
            </div>
        `).join('');
        document.getElementById('workoutTimer').style.display = 'block';
        document.getElementById('startWorkout').style.display = 'inline-block';
        document.getElementById('pauseWorkout').style.display = 'none';
        document.querySelector('.workout-history').style.display = 'block';
    };

    document.getElementById('startWorkout').onclick = function() {
        this.style.display = 'none';
        document.getElementById('pauseWorkout').style.display = 'inline-block';
        const items = document.querySelectorAll('.exercise-item');
        let idx = 0;
        if (workoutTimer) clearInterval(workoutTimer);
        items.forEach((item, i) => {
            item.querySelector('.ex-progress').style.width = '0%';
        });
        workoutTimer = setInterval(() => {
            items.forEach((item, i) => {
                if (i < idx) item.querySelector('.ex-progress').style.width = '100%';
                else if (i === idx) item.querySelector('.ex-progress').style.width = '50%';
            });
            items[idx]?.classList.add('active');
            if (idx > 0) items[idx - 1]?.classList.remove('active');
            idx++;
            if (idx >= items.length) {
                clearInterval(workoutTimer);
                document.getElementById('pauseWorkout').style.display = 'none';
                document.getElementById('startWorkout').style.display = 'inline-block';
                document.getElementById('startWorkout').textContent = '✅ Завершено';
                Data.saveWorkout({ date: Data.today(), type: 'Тренировка', duration: parseInt(document.querySelector('input[name="duration"]:checked')?.value || 20), completed: true });
            }
        }, 30000);
    };

    document.getElementById('pauseWorkout').onclick = function() {
        this.style.display = 'none';
        document.getElementById('startWorkout').style.display = 'inline-block';
        if (workoutTimer) clearInterval(workoutTimer);
    };

    // History
    const wks = Data.getWorkouts().slice(-7).reverse();
    document.getElementById('workoutHistory').innerHTML = wks.length ? wks.map(w =>
        `<div class="workout-history-item"><span class="wh-date">${Data.formatDate(w.date)}</span><span>${w.type} · ${w.duration} мин</span><span class="wh-status completed">✅</span></div>`
    ).join('') : '<p class="empty-state">История пуста</p>';
}

// ===== Analytics =====
let weightChartInstance = null;
function renderAnalytics() {
    // Health diary
    const todayHealth = Data.getHealth(Data.today());
    const setEmoji = (field, val) => {
        const container = document.querySelector(`[data-field="${field}"]`);
        if (!container) return;
        container.querySelectorAll('span').forEach(s => s.classList.remove('active'));
        if (val) container.querySelector(`span[data-val="${val}"]`)?.classList.add('active');
    };
    if (todayHealth) {
        setEmoji('energy', todayHealth.energy);
        setEmoji('mood', todayHealth.mood);
        document.getElementById('healthHungerBefore').value = todayHealth.hunger_before || 3;
        document.getElementById('healthHungerAfter').value = todayHealth.hunger_after || 3;
        document.getElementById('healthNotes').value = todayHealth.notes || '';
    }

    document.getElementById('analyticsHealthForm').onsubmit = function(e) {
        e.preventDefault();
        Data.saveHealth({
            date: Data.today(),
            energy: parseInt(document.querySelector('[data-field="energy"] .active')?.dataset.val) || 3,
            mood: parseInt(document.querySelector('[data-field="mood"] .active')?.dataset.val) || 3,
            hunger_before: parseInt(document.getElementById('healthHungerBefore').value) || 3,
            hunger_after: parseInt(document.getElementById('healthHungerAfter').value) || 3,
            notes: document.getElementById('healthNotes').value || ''
        });
        alert('Запись сохранена!');
    };

    // Photos
    const photos = Data.getPhotos();
    const photoGrid = document.getElementById('photoGrid');
    if (photos.length) {
        photoGrid.innerHTML = photos.map(p =>
            `<div class="photo-item"><img src="${p.data}" alt="Фото ${Data.formatDate(p.date)}"><span class="photo-date">${Data.formatDate(p.date)}</span></div>`
        ).join('');
    } else {
        photoGrid.innerHTML = '<p class="empty-state">Фото пока нет</p>';
    }

    document.getElementById('photoUploadForm').onsubmit = function(e) {
        e.preventDefault();
        const file = document.getElementById('photoFile').files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            Data.savePhoto({ date: Data.today(), data: ev.target.result });
            renderAnalytics();
        };
        reader.readAsDataURL(file);
    };

    // Timelapse
    document.getElementById('makeTimelapse')?.addEventListener('click', function() {
        const images = document.querySelectorAll('.photo-item img');
        if (images.length < 2) { alert('Для таймлапса нужно минимум 2 фото.'); return; }
        const existing = document.getElementById('tlCanvas');
        if (existing) existing.remove();
        const canvas = document.createElement('canvas');
        canvas.id = 'tlCanvas';
        canvas.width = 400; canvas.height = 400;
        canvas.style.cssText = 'display:block;margin:16px auto;max-width:100%;border-radius:12px;';
        document.querySelector('.photo-timeline')?.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        let idx = 0;
        function drawNext() {
            const img = new Image();
            img.onload = function() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); idx++; if (idx < images.length) setTimeout(drawNext, 1200); };
            img.src = images[idx].src;
        }
        drawNext();
    });

    // Weight chart
    const logs = Store.get('dailyLogs', []).filter(l => l.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
    if (logs.length > 1 && typeof Chart !== 'undefined') {
        if (weightChartInstance) weightChartInstance.destroy();
        weightChartInstance = new Chart(document.getElementById('analyticsWeightChart'), {
            type: 'line',
            data: { labels: logs.map(l => l.date.slice(5)),
                datasets: [{ data: logs.map(l => l.weight), borderColor: '#8fbc8f', backgroundColor: 'rgba(143,188,143,0.1)', tension: 0.3, pointRadius: 4, pointBackgroundColor: '#8fbc8f', fill: true }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => v + ' кг' } }, x: { grid: { display: false } } } }
        });
    } else {
        document.getElementById('analyticsWeightContainer').innerHTML = '<p class="empty-state">Запишите вес 2+ раза для графика</p>';
    }
}

// ===== Weight =====
function renderWeight() {
    const logs = Store.get('dailyLogs', []).filter(l => l.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
    const last = logs.length ? logs[logs.length - 1] : null;
    const daysSince = last ? Math.floor((Date.now() - new Date(last.date + 'T00:00:00').getTime()) / 86400000) : 99;

    const info = document.getElementById('weightLastInfo');
    if (last) {
        info.innerHTML = `<span class="last-date">Последняя запись: ${Data.formatDate(last.date)}</span><span class="last-value">${last.weight} кг</span>
            ${daysSince < 7 ? `<p style="color:var(--text-muted);font-size:0.9rem;margin-top:8px;">✅ Записано ${daysSince} дн. назад. Следующая через ${7 - daysSince} дн.</p>`
            : `<p style="color:var(--terracotta);font-size:0.9rem;margin-top:8px;font-weight:600;">📈 Пора записать вес! Прошло ${daysSince} дн.</p>`}`;
    } else {
        info.innerHTML = '<p class="empty-state">Пока нет записей. Сделайте первую!</p>';
    }

    document.getElementById('weightForm').onsubmit = function(e) {
        e.preventDefault();
        const weight = parseFloat(document.getElementById('weightInput').value);
        if (!weight) return;
        const log = Data.getLog(Data.today()) || { date: Data.today(), water: 0, sleep: 0, activity: 0, mood: 0, energy: 0 };
        log.weight = weight;
        Data.saveLog(log);
        const p = Store.get('profile');
        if (p) { p.current_weight = weight; Store.set('profile', p); }
        renderWeight();
    };

    const history = document.getElementById('weightHistory');
    if (logs.length) {
        history.innerHTML = [...logs].reverse().map((l, i) =>
            `<div class="weight-entry"><span class="we-date">${Data.formatDate(l.date)}</span><span class="we-value">${l.weight} кг</span><span class="we-day">Запись ${logs.length - i}</span></div>`
        ).join('');
    } else {
        history.innerHTML = '<p class="empty-state">История пуста</p>';
    }

    // Chart
    if (logs.length > 1 && typeof Chart !== 'undefined') {
        if (window.weightChart) window.weightChart.destroy();
        window.weightChart = new Chart(document.getElementById('weightChart'), {
            type: 'line',
            data: { labels: logs.map(l => l.date.slice(5)),
                datasets: [{ data: logs.map(l => l.weight), borderColor: '#8fbc8f', backgroundColor: 'rgba(143,188,143,0.1)', borderWidth: 3, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#8fbc8f', pointBorderColor: '#fff', pointBorderWidth: 2, fill: true }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => v + ' кг' } }, x: { grid: { display: false } } } }
        });
    }
}

// ===== Community (Local Journal) =====
function renderCommunity() {
    const entries = Store.get('journalEntries', []);
    const container = document.getElementById('journalMessages');
    if (entries.length) {
        container.innerHTML = [...entries].reverse().map(e =>
            `<div class="chat-message"><span class="msg-author">Вы</span><div class="msg-text">${e.text}</div><span class="msg-time">${Data.formatDate(e.date)}</span></div>`
        ).join('');
    } else {
        container.innerHTML = '<p class="empty-state">Записей пока нет. Поделитесь своими мыслями!</p>';
    }

    document.getElementById('journalForm').onsubmit = function(e) {
        e.preventDefault();
        const text = document.getElementById('journalInput').value.trim();
        if (!text) return;
        const entries = Store.get('journalEntries', []);
        entries.push({ date: Data.today(), text, id: Date.now() });
        Store.set('journalEntries', entries);
        document.getElementById('journalInput').value = '';
        renderCommunity();
    };
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', function() {
    // Mobile nav toggle
    document.getElementById('navToggle').onclick = function() {
        document.querySelector('.nav-links')?.classList.toggle('active');
    };

    // Nav clicks
    document.querySelectorAll('.nav-link, .nav-btn-link').forEach(el => {
        el.onclick = function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) Router.navigate(page);
        };
    });

    // Emoji rating
    document.querySelectorAll('.emoji-rating').forEach(container => {
        container.querySelectorAll('span').forEach(span => {
            span.onclick = function() {
                container.querySelectorAll('span').forEach(s => s.classList.remove('active'));
                this.classList.add('active');
            };
        });
    });

    // Add meal form
    document.getElementById('addMealForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        Data.saveMeal({
            date: Data.today(),
            meal_type: document.getElementById('mealType').value,
            food_name: document.getElementById('mealName').value,
            protein: parseFloat(document.getElementById('mealProtein').value) || 0,
            carbs: parseFloat(document.getElementById('mealCarbs').value) || 0,
            fats: parseFloat(document.getElementById('mealFats').value) || 0,
            calories: parseFloat(document.getElementById('mealCalories').value) || 0,
        });
        document.getElementById('addMealModal').style.display = 'none';
        if (Router.current === 'nutrition') renderNutrition();
    });

    // Analytics weight form
    document.getElementById('analyticsWeightForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const weight = parseFloat(document.getElementById('analyticsWeightInput').value);
        if (!weight) return;
        const log = Data.getLog(Data.today()) || { date: Data.today(), water: 0, sleep: 0, activity: 0, mood: 0, energy: 0 };
        log.weight = weight;
        Data.saveLog(log);
        const p = Store.get('profile');
        if (p) { p.current_weight = weight; Store.set('profile', p); }
        if (Router.current === 'analytics') renderAnalytics();
        alert('Вес сохранён!');
    });

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
    });

    // Init router
    Router.init();
});
