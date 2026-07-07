const CACHE = 'ft-v3';
const FILES = [
  '/formula-tela/',
  '/formula-tela/index.html',
  '/formula-tela/static/favicon.svg',
  '/formula-tela/static/manifest.json',
  '/formula-tela/static/css/style.css',
  '/formula-tela/static/js/app.js',
  '/formula-tela/static/images/icons/icon-192.svg',
  '/formula-tela/static/images/icons/icon-512.svg',
  '/formula-tela/static/images/icons/dashboard.svg',
  '/formula-tela/static/images/icons/weight.svg',
  '/formula-tela/static/images/icons/nutrition.svg',
  '/formula-tela/static/images/icons/fitness.svg',
  '/formula-tela/static/images/icons/analytics.svg',
  '/formula-tela/static/images/icons/community.svg',
  '/formula-tela/static/images/icons/star.svg',
  '/formula-tela/static/images/icons/diary.svg',
  '/formula-tela/static/images/icons/camera.svg',
  '/formula-tela/static/images/icons/lightbulb.svg',
  '/formula-tela/static/images/icons/shopping.svg',
  '/formula-tela/static/images/icons/home.svg',
  '/formula-tela/static/images/icons/pet.svg',
  '/formula-tela/static/images/icons/clock.svg',
  '/formula-tela/static/images/icons/habits.svg',
  '/formula-tela/static/images/icons/sos.svg',
  '/formula-tela/static/images/icons/profile.svg',
  '/formula-tela/static/images/food/oatmeal.svg',
  '/formula-tela/static/images/food/greek_salad.svg',
  '/formula-tela/static/images/food/chicken_buckwheat.svg',
  '/formula-tela/static/images/food/smoothie.svg',
  '/formula-tela/static/images/food/tofu.svg',
  '/formula-tela/static/images/food/omelette.svg',
  '/formula-tela/static/images/food/fish_quinoa.svg',
  '/formula-tela/static/images/food/yogurt.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => null))
  );
});
