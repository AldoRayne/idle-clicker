window.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    if (!app) return;

    const hud = {
        credits: document.getElementById('hud-credits'),
        storage: document.getElementById('hud-storage'),
        storageUsed: document.getElementById('hud-storage-used'),
        storageCapacity: document.getElementById('hud-storage-capacity'),
    };

    const isHudMissing = Object.values(hud).some((element) => !element);

    if (isHudMissing) return;

    const START_STORAGE_CAPACITY = 50;

    const ASTEROID_HP = {
        small: 3,
        medium: 5,
        large: 8,
    };

    const START_ASTEROIDS = [
        { type: 'iron', size: 'large', x: 15, y: 30 },
        { type: 'copper', size: 'medium', x: 42, y: 62 },
        { type: 'ice', size: 'large', x: 62, y: 25 },
        { type: 'gold', size: 'small', x: 80, y: 70 },
        { type: 'iron', size: 'medium', x: 30, y: 85 },
    ];

    const state = {
        asteroids: [],
        credits: 0,
        storageCapacity: START_STORAGE_CAPACITY,
        cargo: {
            iron: 0,
            copper: 0,
            ice: 0,
            gold: 0,
        },
    };

    function spawnAsteroid({ type, size, x, y }) {
        const asteroid = {
            type,
            size,
            x,
            y,
            hp: ASTEROID_HP[size],
            el: null,
        };

        state.asteroids.push(asteroid);
        renderNewAsteroid(asteroid);
    }

    function getCargoTotal() {
        return Object.values(state.cargo).reduce((sum, amount) => sum + amount, 0);
    }

    function isStorageFull() {
        return getCargoTotal() >= state.storageCapacity;
    }

    function hitAsteroid(asteroid) {
        if (isStorageFull()) {
            renderStorageWarning();
            return;
        }

        asteroid.hp -= 1;
        state.cargo[asteroid.type] += 1;
        renderHud();

        if (asteroid.hp <= 0) {
            destroyAsteroid(asteroid);
            return;
        }

        renderAsteroidHit(asteroid);
    }

    function destroyAsteroid(asteroid) {
        state.asteroids = state.asteroids.filter((a) => a !== asteroid);
        asteroid.el.remove();
    }

    function renderNewAsteroid(asteroid) {
        const el = document.createElement('div');
        el.className = `asteroid ${asteroid.type} ${asteroid.size}`;
        el.style.left = `${asteroid.x}%`;
        el.style.top = `${asteroid.y}%`;

        el.addEventListener('click', () => hitAsteroid(asteroid));

        asteroid.el = el;
        app.appendChild(el);
    }

    function restartAnimation(el, className) {
        el.classList.remove(className);
        void el.offsetWidth;
        el.classList.add(className);
    }

    function renderAsteroidHit(asteroid) {
        restartAnimation(asteroid.el, 'is-hit');
    }

    function renderStorageWarning() {
        restartAnimation(hud.storage, 'is-warning');
    }

    function renderHud() {
        hud.credits.textContent = state.credits;
        hud.storageUsed.textContent = getCargoTotal();
        hud.storageCapacity.textContent = state.storageCapacity;

        app.classList.toggle('is-storage-full', isStorageFull());
    }

    START_ASTEROIDS.forEach(spawnAsteroid);
    renderHud();
});
