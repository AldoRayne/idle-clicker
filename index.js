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

    const ASTEROID_TYPES = ['iron', 'copper', 'ice', 'gold'];
    const ASTEROID_SIZES = ['small', 'medium', 'large'];
    const ASTEROID_RESPAWN_DELAY_MS = 1500;
    const ASTEROID_COUNT = 6;
    const ASTEROID_OFFSCREEN_MARGIN = 50;
    const ASTEROID_SPEED = { min: 40, max: 60 };
    const ASTEROID_TARGET_PADDING = 0.2;
    const MAX_FRAME_TIME = 0.1;

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

    function spawnAsteroid({ type, size, x, y, speedX, speedY }) {
        const asteroid = {
            type,
            size,
            x,
            y,
            speedX,
            speedY,
            hp: ASTEROID_HP[size],
            el: null,
        };

        state.asteroids.push(asteroid);
        renderNewAsteroid(asteroid);
    }

    function getRandomItem(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    function getRandomNumber(min, max) {
        return min + Math.random() * (max - min);
    }

    function getFlightArea() {
        return {
            left: -ASTEROID_OFFSCREEN_MARGIN,
            right: app.clientWidth + ASTEROID_OFFSCREEN_MARGIN,
            top: -ASTEROID_OFFSCREEN_MARGIN,
            bottom: app.clientHeight + ASTEROID_OFFSCREEN_MARGIN,
        };
    }

    function getRandomSpawnPoint() {
        const area = getFlightArea();
        const side = getRandomItem(['top', 'right', 'bottom', 'left']);

        if (side === 'top') return { x: getRandomNumber(area.left, area.right), y: area.top };
        if (side === 'bottom') return { x: getRandomNumber(area.left, area.right), y: area.bottom };
        if (side === 'left') return { x: area.left, y: getRandomNumber(area.top, area.bottom) };

        return { x: area.right, y: getRandomNumber(area.top, area.bottom) };
    }

    function getRandomTargetPoint() {
        const width = app.clientWidth;
        const height = app.clientHeight;

        return {
            x: getRandomNumber(width * ASTEROID_TARGET_PADDING, width * (1 - ASTEROID_TARGET_PADDING)),
            y: getRandomNumber(height * ASTEROID_TARGET_PADDING, height * (1 - ASTEROID_TARGET_PADDING)),
        };
    }

    function spawnRandomAsteroid() {
        const start = getRandomSpawnPoint();
        const target = getRandomTargetPoint();
        const distance = Math.hypot(target.x - start.x, target.y - start.y);
        const speed = getRandomNumber(ASTEROID_SPEED.min, ASTEROID_SPEED.max);

        spawnAsteroid({
            type: getRandomItem(ASTEROID_TYPES),
            size: getRandomItem(ASTEROID_SIZES),
            x: start.x,
            y: start.y,
            speedX: ((target.x - start.x) / distance) * speed,
            speedY: ((target.y - start.y) / distance) * speed,
        });
    }

    function isAsteroidOutsideFlightArea(asteroid) {
        const area = getFlightArea();

        return (
            asteroid.x < area.left ||
            asteroid.x > area.right ||
            asteroid.y < area.top ||
            asteroid.y > area.bottom
        );
    }

    function moveAsteroids(deltaTime) {
        state.asteroids.forEach((asteroid) => {
            asteroid.x += asteroid.speedX * deltaTime;
            asteroid.y += asteroid.speedY * deltaTime;
            renderAsteroidPosition(asteroid);
        });

        state.asteroids.filter(isAsteroidOutsideFlightArea).forEach(destroyAsteroid);
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

        setTimeout(spawnRandomAsteroid, ASTEROID_RESPAWN_DELAY_MS);
    }

    function renderNewAsteroid(asteroid) {
        const el = document.createElement('div');
        el.className = `asteroid ${asteroid.type} ${asteroid.size}`;

        el.addEventListener('click', () => hitAsteroid(asteroid));

        asteroid.el = el;
        renderAsteroidPosition(asteroid);
        app.appendChild(el);
    }

    function renderAsteroidPosition(asteroid) {
        asteroid.el.style.left = `${asteroid.x}px`;
        asteroid.el.style.top = `${asteroid.y}px`;
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

    let lastFrameTime = performance.now();

    function gameLoop(now) {
        const deltaTime = Math.min((now - lastFrameTime) / 1000, MAX_FRAME_TIME);
        lastFrameTime = now;

        moveAsteroids(deltaTime);

        requestAnimationFrame(gameLoop);
    }

    for (let i = 0; i < ASTEROID_COUNT; i++) {
        setTimeout(spawnRandomAsteroid, i * ASTEROID_RESPAWN_DELAY_MS);
    }

    renderHud();
    requestAnimationFrame(gameLoop);
});
