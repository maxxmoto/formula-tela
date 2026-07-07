/* ===== Формула Тела — SPA App ===== */

// ===== Storage =====
const Store = {
    get(k, d) { try { const v = localStorage.getItem('ft_' + k); return v ? JSON.parse(v) : d } catch { return d } },
    set(k, v) { localStorage.setItem('ft_' + k, JSON.stringify(v)) }
};

// ===== Formulas =====
function calcTargets(p) {
    if (!p) return { protein: 80, carbs: 200, fats: 60, calories: 1800, protein_servings: 4, veggie_servings: 4, carbs_servings: 5, fat_servings: 4, bmr: 1400, tdee: 1800 };
    const w = p.current_weight || 70, h = p.height || 165, a = p.age || 30, g = p.gender || 'female';
    const bmr = g === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    const af = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[p.activity_level || 'light'];
    const tdee = Math.round(bmr * af);
    let cal = p.goal_type === 'lose' ? Math.max(tdee - 500, 1200) : p.goal_type === 'gain' ? tdee + 350 : tdee;
    let protein = Math.round(w * (p.goal_type === 'lose' ? 1.8 : p.goal_type === 'gain' ? 1.8 : 1.4));
    protein = Math.max(protein, Math.round(w * (p.goal_type === 'maintain' ? 1.2 : 1.6)));
    protein = Math.min(protein, Math.round(w * (p.goal_type === 'lose' ? 2.4 : p.goal_type === 'gain' ? 2.2 : 1.8)));
    const fatCal = Math.round((cal * 0.20 + cal * 0.35) / 2);
    const fats = Math.round(fatCal / 9);
    const carbs = Math.round(Math.max(cal - protein * 4 - fatCal, 0) / 4);
    return { protein, carbs, fats, calories: cal, bmr: Math.round(bmr), tdee, protein_servings: Math.max(1, Math.round(protein / 25)), veggie_servings: 4, carbs_servings: Math.max(1, Math.round(carbs / 40)), fat_servings: Math.max(1, Math.round(fats / 15)) };
}

// ===== Data helpers =====
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => { if (!d) return ''; const dt = new Date(d + 'T00:00:00'); return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
const getLog = (d) => (Store.get('logs', [])).find(l => l.date === d);
const saveLog = (log) => { let logs = Store.get('logs', []); const i = logs.findIndex(l => l.date === log.date); if (i >= 0) logs[i] = log; else logs.push(log); Store.set('logs', logs); };
const getMeals = (d) => (Store.get('meals', [])).filter(m => m.date === d);
const saveMeal = (m) => { const meals = Store.get('meals', []); meals.push({ ...m, id: Date.now() }); Store.set('meals', meals); };

// ===== Exercises =====
const EX = [
    { name: 'Приседания', group: 'ноги', quiet: false, cal: 7, contra: 'колени' },
    { name: 'Планка', group: 'кор', quiet: true, cal: 3, contra: '' },
    { name: 'Отжимания', group: 'грудь', quiet: false, cal: 6, contra: 'запястья' },
    { name: 'Берпи', group: 'все тело', quiet: false, cal: 10, contra: 'суставы,спина' },
    { name: 'Ягодичный мостик', group: 'ягодицы', quiet: true, cal: 4, contra: '' },
    { name: 'Выпады', group: 'ноги', quiet: false, cal: 6, contra: 'колени' },
    { name: 'Скручивания', group: 'кор', quiet: true, cal: 4, contra: 'шея' },
    { name: 'Обратные отжимания', group: 'трицепс', quiet: false, cal: 5, contra: 'плечи' },
    { name: 'Супермен', group: 'спина', quiet: true, cal: 3, contra: 'спина' },
    { name: 'Бёрпи без прыжка', group: 'все тело', quiet: true, cal: 6, contra: 'колени' },
];

function genWorkout(dur, type, quiet, contra) {
    let pool = EX.filter(e => {
        if (quiet && !e.quiet) return false;
        if (type !== 'full_body') { const g = { upper: ['грудь', 'трицепс', 'спина'], lower: ['ноги', 'ягодицы'], core: ['кор'], stretch: ['кор'] }[type]; if (!g?.includes(e.group)) return false; }
        if (contra && e.contra) { const c = contra.toLowerCase().split(','); if (c.some(p => e.contra.includes(p.trim()))) return false; }
        return true;
    });
    if (!pool.length) pool = [...EX];
    const n = Math.max(3, Math.floor(dur / 4));
    return Array.from({ length: n }, (_, i) => ({ ...pool[i % pool.length], dur: Math.floor(dur / n) }));
}

// ===== Meal generator =====
const MEAL_IMG = { 'омлет': 'static/images/food/omelette.svg', 'овсянк': 'static/images/food/oatmeal.svg', 'куриц': 'static/images/food/chicken_buckwheat.svg', 'рыб': 'static/images/food/fish_quinoa.svg', 'тофу': 'static/images/food/tofu.svg', 'салат': 'static/images/food/greek_salad.svg', 'йогурт': 'static/images/food/yogurt.svg' };
const getImg = (n) => { for (const [k, v] of Object.entries(MEAL_IMG)) if (n.toLowerCase().includes(k)) return v; return 'static/images/food/greek_salad.svg'; };

function genMeals(ing, profile) {
    const il = ing.map(i => i.toLowerCase());
    const r = [];
    const a = (m) => { m.image = getImg(m.name); r.push(m); };
    if (il.some(x => ['яйца', 'egg'].includes(x))) a({ name: 'Омлет с овощами', ingredients: ['яйца', 'помидоры', 'зелень'], calories: 280, protein: 24, carbs: 6, fats: 18, time: '10 мин', source: 'Harvard Plate' });
    if (il.some(x => ['овсянк', 'oat', 'овес'].includes(x))) a({ name: 'Овсянка с ягодами', ingredients: ['овсянка', 'ягоды', 'орехи'], calories: 320, protein: 12, carbs: 45, fats: 12, time: '10 мин', source: 'Harvard Health' });
    const hp = il.some(x => ['куриц', 'chicken', 'рыб', 'fish', 'тофу', 'tofu'].includes(x));
    const hg = il.some(x => ['гречк', 'buckwheat', 'рис', 'rice', 'киноа', 'quinoa'].includes(x));
    const hv = il.some(x => ['помидор', 'tomato', 'огур', 'cucumber', 'перц', 'pepper', 'брокколи', 'broccoli', 'капуст', 'салат', 'lettuce', 'морков', 'лук', 'onion'].includes(x));
    if (hp && hg && hv) {
        if (il.some(x => ['куриц', 'chicken'].includes(x))) a({ name: 'Куриная грудка с гречкой', ingredients: ['куриная грудка', 'гречка', 'овощи'], calories: 450, protein: 42, carbs: 40, fats: 12, time: '25 мин', source: 'ACSM' });
        if (il.some(x => ['рыб', 'fish'].includes(x))) a({ name: 'Рыба с киноа', ingredients: ['рыба', 'киноа', 'овощи'], calories: 420, protein: 35, carbs: 35, fats: 16, time: '25 мин', source: 'AHA 2023' });
        if (il.some(x => ['тофу', 'tofu'].includes(x))) a({ name: 'Тофу с овощами', ingredients: ['тофу', 'рис', 'брокколи'], calories: 380, protein: 28, carbs: 42, fats: 10, time: '20 мин', source: 'ISSN 2017' });
    }
    if (hv) a({ name: 'Большой салат', ingredients: ['салат', 'помидоры', 'огурцы', 'авокадо'], calories: 350, protein: 25, carbs: 15, fats: 22, time: '10 мин', source: 'Harvard Plate' });
    if (il.some(x => ['йогурт', 'yogurt', 'творог'].includes(x))) a({ name: 'Греческий йогурт', ingredients: ['йогурт', 'орехи', 'ягоды'], calories: 240, protein: 18, carbs: 18, fats: 12, time: '3 мин', source: 'Harvard Health' });
    if (!r.length) a({ name: 'Салат из доступных продуктов', ingredients: ing, calories: 300, protein: 15, carbs: 25, fats: 15, time: '10 мин', source: 'Принципы здоровой тарелки' });
    return r;
}

function genGrocery(p) {
    const items = [
        { n: 'Куриное филе', c: 'Белок' }, { n: 'Яйца', c: 'Белок' }, { n: 'Гречка', c: 'Зерновые' },
        { n: 'Овсянка', c: 'Зерновые' }, { n: 'Киноа', c: 'Зерновые' }, { n: 'Помидоры', c: 'Овощи' },
        { n: 'Огурцы', c: 'Овощи' }, { n: 'Салат / руккола', c: 'Зелень' }, { n: 'Брокколи', c: 'Овощи' },
        { n: 'Перец', c: 'Овощи' }, { n: 'Авокадо', c: 'Овощи' }, { n: 'Яблоки', c: 'Фрукты' },
        { n: 'Ягоды', c: 'Фрукты' }, { n: 'Оливковое масло', c: 'Жиры' }, { n: 'Орехи', c: 'Жиры' },
        { n: 'Греческий йогурт', c: 'Молочные' }, { n: 'Творог', c: 'Молочные' }, { n: 'Рыба', c: 'Белок' },
    ];
    if (p?.diet_type === 'vegan') return items.filter(i => !['Куриное филе', 'Яйца', 'Греческий йогурт', 'Творог', 'Рыба'].includes(i.n)).concat({ n: 'Тофу', c: 'Белок' }, { n: 'Миндальное молоко', c: 'Напитки' });
    if (p?.diet_type === 'vegetarian') return items.filter(i => !['Куриное филе', 'Рыба'].includes(i.n)).concat({ n: 'Тофу', c: 'Белок' });
    return items;
}

// ===== Router =====
function navigate(page) {
    history.pushState(null, '', '#' + page);
    showPage(page);
}

function showPage(page) {
    // hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.querySelector(`[data-page="${page}"]`);
    if (el) el.classList.add('active');
    // nav visibility
    const nav = document.getElementById('navBar');
    if (nav) nav.style.display = (page === 'setup' || page === 'welcome') ? 'none' : 'flex';
    // render
    try { renderPage(page); } catch (e) { console.error('Render error:', e); }
    window.scrollTo(0, 0);
    const nl = document.querySelector('.nav-links');
    if (nl) nl.classList.remove('active');
}

window.addEventListener('popstate', () => {
    const h = location.hash.slice(1) || 'welcome';
    showPage(h);
});

// ===== Render =====
function renderPage(page) {
    switch (page) {
        case 'setup': renderSetup(); break;
        case 'dashboard': renderDash(); break;
        case 'nutrition': renderNutri(); break;
        case 'fridge': renderFridge(); break;
        case 'grocery': renderGrocery(); break;
        case 'cheat': renderCheat(); break;
        case 'fitness': renderFitness(); break;
        case 'analytics': renderAnalytics(); break;
        case 'weight': renderWeight(); break;
        case 'community': renderCommunity(); break;
    }
}

// ===== Setup =====
function renderSetup() {
    const p = Store.get('profile');
    const id = (id) => document.getElementById(id);
    if (p) {
        if (id('setupName')) id('setupName').value = p.name || '';
        if (id('setupGender')) id('setupGender').value = p.gender || 'female';
        if (id('setupAge')) id('setupAge').value = p.age || 30;
        if (id('setupHeight')) id('setupHeight').value = p.height || 170;
        if (id('setupWeight')) id('setupWeight').value = p.current_weight || 70;
        if (id('setupGoalWeight')) id('setupGoalWeight').value = p.goal_weight || 65;
        if (id('setupGoal')) id('setupGoal').value = p.goal_type || 'lose';
        if (id('setupActivity')) id('setupActivity').value = p.activity_level || 'light';
        if (id('setupDiet')) id('setupDiet').value = p.diet_type || 'omnivore';
    }
    const form = id('setupForm');
    if (form) form.onsubmit = function(e) {
        e.preventDefault();
        Store.set('profile', {
            name: id('setupName')?.value || '',
            gender: id('setupGender')?.value || 'female',
            age: parseInt(id('setupAge')?.value) || 30,
            height: parseFloat(id('setupHeight')?.value) || 170,
            current_weight: parseFloat(id('setupWeight')?.value) || 70,
            goal_weight: parseFloat(id('setupGoalWeight')?.value) || 65,
            goal_type: id('setupGoal')?.value || 'lose',
            activity_level: id('setupActivity')?.value || 'light',
            diet_type: id('setupDiet')?.value || 'omnivore',
        });
        navigate('dashboard');
    };
}

// ===== Dashboard =====
function renderDash() {
    const p = Store.get('profile');
    const t = today();
    const log = getLog(t) || { date: t, water: 0, sleep: 0, activity: 0, mood: 0, energy: 0, weight: 0 };
    const meals = getMeals(t);
    const targets = calcTargets(p);
    const cons = { protein: 0, carbs: 0, fats: 0, calories: 0 };
    meals.forEach(m => { cons.protein += m.protein || 0; cons.carbs += m.carbs || 0; cons.fats += m.fats || 0; cons.calories += m.calories || 0; });
    const streak = (Store.get('logs', [])).filter(l => l.date <= t && (l.activity || 0) >= 15).length;
    const name = p?.name || '';
    const $ = (id) => document.getElementById(id);

    if ($('dashGreeting')) $('dashGreeting').innerHTML = `<span class="h1-gradient">${name ? 'Привет, ' + name + '!' : 'Привет!'}</span>`;
    if ($('dashMsg')) $('dashMsg').textContent = 'Сегодня идеальный день для заботы о себе!';
    if ($('logWater')) $('logWater').value = log.water || 0;
    if ($('logSleep')) $('logSleep').value = log.sleep || '';
    if ($('logActivity')) $('logActivity').value = log.activity || 0;
    if ($('logMood')) $('logMood').value = log.mood || '';
    if ($('logEnergy')) $('logEnergy').value = log.energy || '';

    const form = $('dashLogForm');
    if (form) form.onsubmit = function(e) {
        e.preventDefault();
        saveLog({ date: t, water: parseInt($('logWater')?.value) || 0, sleep: parseFloat($('logSleep')?.value) || 0, activity: parseInt($('logActivity')?.value) || 0, mood: parseInt($('logMood')?.value) || 0, energy: parseInt($('logEnergy')?.value) || 0, weight: log.weight || 0 });
        renderDash();
    };

    const pct = (val, max) => max ? Math.min(val / max * 100, 100) : 0;
    if ($('dashProteinBar')) $('dashProteinBar').style.width = pct(cons.protein, targets.protein) + '%';
    if ($('dashProteinText')) $('dashProteinText').textContent = `${cons.protein} / ${targets.protein} г`;
    if ($('dashCarbsBar')) $('dashCarbsBar').style.width = pct(cons.carbs, targets.carbs) + '%';
    if ($('dashCarbsText')) $('dashCarbsText').textContent = `${cons.carbs} / ${targets.carbs} г`;
    if ($('dashFatsBar')) $('dashFatsBar').style.width = pct(cons.fats, targets.fats) + '%';
    if ($('dashFatsText')) $('dashFatsText').textContent = `${cons.fats} / ${targets.fats} г`;

    if ($('dashStreak')) $('dashStreak').innerHTML = `<img src="static/images/icons/pet.svg" class="h-icon" alt=""> Серия ${streak} дней`;
    if ($('dashWeekGrid')) {
        $('dashWeekGrid').innerHTML = '';
        for (let i = 0; i < 7; i++) { const d = document.createElement('div'); d.className = 'day-marker' + (i < streak ? ' active' : ''); $('dashWeekGrid').appendChild(d); }
    }
}

// ===== Nutrition =====
function renderNutri() {
    const p = Store.get('profile');
    const t = today();
    const meals = getMeals(t);
    const targets = calcTargets(p);
    const cons = { protein: 0, carbs: 0, fats: 0, calories: 0 };
    meals.forEach(m => { cons.protein += m.protein || 0; cons.carbs += m.carbs || 0; cons.fats += m.fats || 0; cons.calories += m.calories || 0; });
    const $ = (id) => document.getElementById(id);

    if ($('nutriPlate')) $('nutriPlate').innerHTML = `
        <div class="plate-segment protein-seg">Белки: ${targets.protein_servings} порции</div>
        <div class="plate-segment veggie-seg">Овощи: ${targets.veggie_servings} порции</div>
        <div class="plate-segment carbs-seg">Углеводы: ${targets.carbs_servings} порции</div>
        <div class="plate-segment fat-seg">Жиры: ${targets.fat_servings} порции</div>`;
    if ($('nutriTargets')) $('nutriTargets').innerHTML = `
        <div class="macro-stat"><span class="stat-label">Белки</span><span class="stat-value">${targets.protein}г</span></div>
        <div class="macro-stat"><span class="stat-label">Углеводы</span><span class="stat-value">${targets.carbs}г</span></div>
        <div class="macro-stat"><span class="stat-label">Жиры</span><span class="stat-value">${targets.fats}г</span></div>
        <div class="macro-stat"><span class="stat-label">Калории</span><span class="stat-value">${targets.calories} ккал</span></div>`;
    const pct = (v, m) => m ? Math.min(v / m * 100, 100) : 0;
    if ($('nutriConsumed')) $('nutriConsumed').innerHTML = `
        <div class="macro-stat"><span class="stat-label">Белки</span><span class="stat-value">${cons.protein}г / ${targets.protein}г</span></div>
        <div class="macro-stat"><span class="stat-label">Углеводы</span><span class="stat-value">${cons.carbs}г / ${targets.carbs}г</span></div>
        <div class="macro-stat"><span class="stat-label">Жиры</span><span class="stat-value">${cons.fats}г / ${targets.fats}г</span></div>
        <div class="macro-stat"><span class="stat-label">Калории</span><span class="stat-value">${cons.calories} / ${targets.calories}</span></div>
        <div class="progress-bars">
            <div class="progress-bar-wrap"><div class="progress-fill protein" style="width:${pct(cons.protein, targets.protein)}%"></div></div>
            <div class="progress-bar-wrap"><div class="progress-fill carbs" style="width:${pct(cons.carbs, targets.carbs)}%"></div></div>
            <div class="progress-bar-wrap"><div class="progress-fill fats" style="width:${pct(cons.fats, targets.fats)}%"></div></div>
        </div>`;
    if ($('nutriMeals')) {
        if (meals.length) $('nutriMeals').innerHTML = meals.map(m => `<div class="meal-entry"><span class="meal-type">${m.meal_type}</span><span class="meal-name">${m.food_name}</span><span class="meal-cal">${m.calories} ккал</span></div>`).join('');
        else $('nutriMeals').innerHTML = '<p class="empty-state">Сегодня ещё ничего не записано</p>';
    }
    const form = $('addMealForm');
    if (form) form.onsubmit = function(e) {
        e.preventDefault();
        saveMeal({ date: t, meal_type: $('mealType')?.value || 'snack', food_name: $('mealName')?.value || '', protein: parseFloat($('mealProtein')?.value) || 0, carbs: parseFloat($('mealCarbs')?.value) || 0, fats: parseFloat($('mealFats')?.value) || 0, calories: parseFloat($('mealCalories')?.value) || 0 });
        if ($('addMealModal')) $('addMealModal').style.display = 'none';
        renderNutri();
    };
}

// ===== Fridge =====
function renderFridge() {
    const tags = [];
    const $ = (id) => document.getElementById(id);
    const renderTags = () => {
        if ($('fridgeTags')) $('fridgeTags').innerHTML = tags.map(t => `<span class="tag">${t} <span class="tag-remove" data-t="${t}">&times;</span></span>`).join('');
        if ($('fridgeTags')) $('fridgeTags').querySelectorAll('.tag-remove').forEach(el => { el.onclick = function() { tags.splice(tags.indexOf(this.dataset.t), 1); renderTags(); if ($('fridgeResults')) $('fridgeResults').innerHTML = ''; }; });
    };
    if ($('fridgeAddBtn')) $('fridgeAddBtn').onclick = function() {
        const v = $('fridgeInput')?.value.trim();
        if (v && !tags.includes(v)) { tags.push(v); renderTags(); if ($('fridgeInput')) $('fridgeInput').value = ''; }
    };
    if ($('fridgeInput')) $('fridgeInput').onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); if ($('fridgeAddBtn')) $('fridgeAddBtn').click(); } };
    if ($('fridgeGenerateBtn')) $('fridgeGenerateBtn').onclick = function() {
        if (!tags.length) { if ($('fridgeResults')) $('fridgeResults').innerHTML = '<p class="empty-state">Добавьте хотя бы один продукт</p>'; return; }
        const meals = genMeals(tags, Store.get('profile'));
        if ($('fridgeResults')) $('fridgeResults').innerHTML = meals.map(m => `
            <div class="meal-option">
                <img src="${m.image}" class="meal-img" alt="" onerror="this.src='static/images/food/greek_salad.svg'">
                <div class="meal-option-body"><h3>${m.name}</h3>
                <p>${m.calories} ккал · Б:${m.protein}г У:${m.carbs}г Ж:${m.fats}г</p>
                <p style="font-size:0.85rem;color:var(--text-muted)">${m.ingredients.join(', ')} · ${m.time}</p>
                <span class="meal-time">${m.source}</span></div>
            </div>`).join('');
    };
}

// ===== Grocery =====
function renderGrocery() {
    const items = genGrocery(Store.get('profile'));
    const cats = {};
    items.forEach(i => { if (!cats[i.c]) cats[i.c] = []; cats[i.c].push(i); });
    const $ = (id) => document.getElementById(id);
    if ($('groceryList')) $('groceryList').innerHTML = Object.entries(cats).map(([c, list]) => `<div class="grocery-category"><h3>${c}</h3>${list.map(i => `<label class="grocery-item"><input type="checkbox" class="grocery-check"><span class="grocery-name">${i.n}</span></label>`).join('')}</div>`).join('');
    if ($('clearChecked')) $('clearChecked').onclick = function() { document.querySelectorAll('.grocery-check:checked').forEach(cb => cb.closest('.grocery-item')?.remove()); };
}

// ===== Cheat =====
function renderCheat() {
    const $ = (id) => document.getElementById(id);
    const form = $('cheatForm');
    if (form) form.onsubmit = function(e) {
        e.preventDefault();
        const meal = $('cheatMeal')?.value.trim();
        const cal = parseInt($('cheatCal')?.value) || 0;
        if (!meal) return;
        const targets = calcTargets(Store.get('profile'));
        const pct = Math.round(cal / targets.calories * 100);
        if ($('cheatResult')) $('cheatResult').innerHTML = `<div class="cheat-result-content"><p><strong>${meal}</strong> — ${cal} ккал (${pct}% нормы)</p><p style="margin-top:12px;">Компенсируйте ${Math.round(pct / 2)} мин кардио или уменьшите ужин на ${cal} ккал.</p></div>`;
    };
}

// ===== Fitness =====
let wTimer = null;
function renderFitness() {
    const $ = (id) => document.getElementById(id);
    if ($('generateWorkout')) $('generateWorkout').onclick = function() {
        const dur = parseInt(document.querySelector('input[name="duration"]:checked')?.value || 20);
        const type = document.querySelector('input[name="workoutType"]:checked')?.value || 'full_body';
        const quiet = $('quietMode')?.checked || false;
        const contra = $('contraInput')?.value || '';
        const ex = genWorkout(dur, type, quiet, contra);
        if ($('exercisesList')) $('exercisesList').innerHTML = ex.map((e, i) => `<div class="exercise-item" data-idx="${i}"><span class="ex-num">${i+1}</span><div class="ex-info"><span class="ex-name">${e.name}</span><span class="ex-duration">${e.dur} сек</span></div><div class="ex-progress" style="width:0%"></div></div>`).join('');
        if ($('workoutTimer')) $('workoutTimer').style.display = 'block';
        if ($('startWorkout')) $('startWorkout').style.display = 'inline-block';
        if ($('pauseWorkout')) $('pauseWorkout').style.display = 'none';
        if ($('startWorkout')) $('startWorkout').textContent = '▶ Старт';
    };
    if ($('startWorkout')) $('startWorkout').onclick = function() {
        this.style.display = 'none';
        if ($('pauseWorkout')) $('pauseWorkout').style.display = 'inline-block';
        const items = document.querySelectorAll('.exercise-item');
        let idx = 0;
        if (wTimer) clearInterval(wTimer);
        items.forEach(i => i.querySelector('.ex-progress').style.width = '0%');
        wTimer = setInterval(() => {
            items.forEach((i, n) => { if (n < idx) i.querySelector('.ex-progress').style.width = '100%'; else if (n === idx) i.querySelector('.ex-progress').style.width = '50%'; });
            items[idx]?.classList.add('active');
            if (idx > 0) items[idx - 1]?.classList.remove('active');
            idx++;
            if (idx >= items.length) {
                clearInterval(wTimer);
                if ($('pauseWorkout')) $('pauseWorkout').style.display = 'none';
                if ($('startWorkout')) { $('startWorkout').style.display = 'inline-block'; $('startWorkout').textContent = '✅ Завершено'; }
                const wks = Store.get('workouts', []);
                wks.push({ date: today(), type: 'Тренировка', dur: parseInt(document.querySelector('input[name="duration"]:checked')?.value || 20) });
                Store.set('workouts', wks);
            }
        }, 30000);
    };
    if ($('pauseWorkout')) $('pauseWorkout').onclick = function() {
        this.style.display = 'none';
        if ($('startWorkout')) $('startWorkout').style.display = 'inline-block';
        if (wTimer) clearInterval(wTimer);
    };
    const wks = (Store.get('workouts', [])).slice(-7).reverse();
    if ($('workoutHistory')) $('workoutHistory').innerHTML = wks.length ? wks.map(w => `<div class="workout-history-item"><span class="wh-date">${fmtDate(w.date)}</span><span>${w.type} · ${w.dur} мин</span><span class="wh-status completed">✅</span></div>`).join('') : '<p class="empty-state">История пуста</p>';
}

// ===== Analytics =====
let wChart = null;
function renderAnalytics() {
    const $ = (id) => document.getElementById(id);
    const th = Store.get('healthLogs', []).find(l => l.date === today());
    const setEm = (field, val) => { const c = document.querySelector(`[data-field="${field}"]`); if (c) { c.querySelectorAll('span').forEach(s => s.classList.remove('active')); if (val) { const el = c.querySelector(`span[data-val="${val}"]`); if (el) el.classList.add('active'); } } };
    if (th) { setEm('energy', th.energy); setEm('mood', th.mood); if ($('healthHungerBefore')) $('healthHungerBefore').value = th.hunger_before || 3; if ($('healthHungerAfter')) $('healthHungerAfter').value = th.hunger_after || 3; if ($('healthNotes')) $('healthNotes').value = th.notes || ''; }
    const form = $('analyticsHealthForm');
    if (form) form.onsubmit = function(e) {
        e.preventDefault();
        const logs = Store.get('healthLogs', []);
        const ei = logs.findIndex(l => l.date === today());
        const entry = { date: today(), energy: parseInt(document.querySelector('[data-field="energy"] .active')?.dataset.val) || 3, mood: parseInt(document.querySelector('[data-field="mood"] .active')?.dataset.val) || 3, hunger_before: parseInt($('healthHungerBefore')?.value) || 3, hunger_after: parseInt($('healthHungerAfter')?.value) || 3, notes: $('healthNotes')?.value || '' };
        if (ei >= 0) logs[ei] = entry; else logs.push(entry);
        Store.set('healthLogs', logs);
        alert('Запись сохранена!');
    };

    // Photos
    const photos = Store.get('photos', []);
    if ($('photoGrid')) {
        if (photos.length) $('photoGrid').innerHTML = photos.map(p => `<div class="photo-item"><img src="${p.data}" alt=""><span class="photo-date">${fmtDate(p.date)}</span></div>`).join('');
        else $('photoGrid').innerHTML = '<p class="empty-state">Фото пока нет</p>';
    }
    if ($('photoUploadForm')) $('photoUploadForm').onsubmit = function(e) {
        e.preventDefault();
        const file = $('photoFile')?.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) { const ph = Store.get('photos', []); ph.push({ date: today(), data: ev.target.result }); Store.set('photos', ph); renderAnalytics(); };
        reader.readAsDataURL(file);
    };
    if ($('makeTimelapse')) $('makeTimelapse').onclick = function() {
        const imgs = document.querySelectorAll('.photo-item img');
        if (imgs.length < 2) { alert('Нужно минимум 2 фото.'); return; }
        const old = $('tlCanvas'); if (old) old.remove();
        const cv = document.createElement('canvas'); cv.id = 'tlCanvas'; cv.width = 400; cv.height = 400; cv.style.cssText = 'display:block;margin:16px auto;max-width:100%;border-radius:12px;';
        $('photo-timeline')?.appendChild(cv);
        const ctx = cv.getContext('2d');
        let idx = 0;
        const next = () => { const img = new Image(); img.onload = function() { ctx.clearRect(0,0,cv.width,cv.height); ctx.drawImage(img,0,0,cv.width,cv.height); idx++; if (idx < imgs.length) setTimeout(next, 1200); }; img.src = imgs[idx].src; };
        next();
    };

    // Weight chart
    const logs = (Store.get('logs', [])).filter(l => l.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
    if (logs.length > 1 && typeof Chart !== 'undefined') {
        if (wChart) wChart.destroy();
        const ctx = $('analyticsWeightChart');
        if (ctx) wChart = new Chart(ctx, { type: 'line', data: { labels: logs.map(l => l.date.slice(5)), datasets: [{ data: logs.map(l => l.weight), borderColor: '#8fbc8f', backgroundColor: 'rgba(143,188,143,0.1)', tension: 0.3, pointRadius: 4, pointBackgroundColor: '#8fbc8f', fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => v + ' кг' } }, x: { grid: { display: false } } } } });
    } else if ($('analyticsWeightContainer')) $('analyticsWeightContainer').innerHTML = '<p class="empty-state">Запишите вес 2+ раза для графика</p>';

    // Weight form
    const wf = $('analyticsWeightForm');
    if (wf) wf.onsubmit = function(e) {
        e.preventDefault();
        const w = parseFloat($('analyticsWeightInput')?.value);
        if (!w) return;
        const l = getLog(today()) || { date: today(), water: 0, sleep: 0, activity: 0, mood: 0, energy: 0 };
        l.weight = w;
        saveLog(l);
        const pr = Store.get('profile');
        if (pr) { pr.current_weight = w; Store.set('profile', pr); }
        renderAnalytics();
    };
}

// ===== Weight =====
let weightChart_ = null;
function renderWeight() {
    const $ = (id) => document.getElementById(id);
    const logs = (Store.get('logs', [])).filter(l => l.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
    const last = logs.length ? logs[logs.length - 1] : null;
    const ds = last ? Math.floor((Date.now() - new Date(last.date + 'T00:00:00').getTime()) / 86400000) : 99;
    if ($('weightLastInfo')) {
        if (last) $('weightLastInfo').innerHTML = `<span class="last-date">Последняя: ${fmtDate(last.date)}</span><span class="last-value">${last.weight} кг</span>${ds < 7 ? `<p style="color:var(--text-muted);font-size:0.9rem;margin-top:8px;">✅ Следующая через ${7 - ds} дн.</p>` : `<p style="color:var(--terracotta);font-size:0.9rem;margin-top:8px;font-weight:600;">📈 Пора! Прошло ${ds} дн.</p>`}`;
        else $('weightLastInfo').innerHTML = '<p class="empty-state">Пока нет записей</p>';
    }
    const form = $('weightForm');
    if (form) form.onsubmit = function(e) {
        e.preventDefault();
        const w = parseFloat($('weightInput')?.value);
        if (!w) return;
        const l = getLog(today()) || { date: today(), water: 0, sleep: 0, activity: 0, mood: 0, energy: 0 };
        l.weight = w; saveLog(l);
        const pr = Store.get('profile'); if (pr) { pr.current_weight = w; Store.set('profile', pr); }
        renderWeight();
    };
    if ($('weightHistory')) {
        if (logs.length) $('weightHistory').innerHTML = [...logs].reverse().map((l, i) => `<div class="weight-entry"><span class="we-date">${fmtDate(l.date)}</span><span class="we-value">${l.weight} кг</span><span class="we-day">#${logs.length - i}</span></div>`).join('');
        else $('weightHistory').innerHTML = '<p class="empty-state">История пуста</p>';
    }
    if (logs.length > 1 && typeof Chart !== 'undefined') {
        if (weightChart_) weightChart_.destroy();
        const ctx = $('weightChart');
        if (ctx) weightChart_ = new Chart(ctx, { type: 'line', data: { labels: logs.map(l => l.date.slice(5)), datasets: [{ data: logs.map(l => l.weight), borderColor: '#8fbc8f', backgroundColor: 'rgba(143,188,143,0.1)', borderWidth: 3, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#8fbc8f', pointBorderColor: '#fff', pointBorderWidth: 2, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => v + ' кг' } }, x: { grid: { display: false } } } } });
    }
}

// ===== Community (Journal) =====
function renderCommunity() {
    const $ = (id) => document.getElementById(id);
    const entries = Store.get('journal', []);
    if ($('journalMessages')) {
        if (entries.length) $('journalMessages').innerHTML = [...entries].reverse().map(e => `<div class="chat-message"><span class="msg-author">Вы</span><div class="msg-text">${e.text}</div><span class="msg-time">${fmtDate(e.date)}</span></div>`).join('');
        else $('journalMessages').innerHTML = '<p class="empty-state">Записей пока нет</p>';
    }
    const form = $('journalForm');
    if (form) form.onsubmit = function(e) {
        e.preventDefault();
        const text = $('journalInput')?.value.trim();
        if (!text) return;
        const j = Store.get('journal', []);
        j.push({ date: today(), text, id: Date.now() });
        Store.set('journal', j);
        if ($('journalInput')) $('journalInput').value = '';
        renderCommunity();
    };
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', function() {
    // Mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    if (navToggle) navToggle.onclick = function() { document.querySelector('.nav-links')?.classList.toggle('active'); };

    // Nav link clicks
    document.querySelectorAll('.nav-link, .nav-btn-link').forEach(el => {
        el.onclick = function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) navigate(page);
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

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    });

    // Route on load
    const hash = location.hash.slice(1) || 'welcome';
    const profile = Store.get('profile');
    if (profile && (hash === 'welcome' || hash === 'setup')) navigate('dashboard');
    else navigate(hash);
});
