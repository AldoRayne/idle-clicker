window.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    if (!app) return;

    const hud = {
        credits: document.getElementById('hud-credits'),
        storage: document.getElementById('hud-storage'),
        storageUsed: document.getElementById('hud-storage-used'),
        storageCapacity: document.getElementById('hud-storage-capacity'),
        sell: document.getElementById('hud-sell'),
        sellValue: document.getElementById('hud-sell-value'),
        shopStorage: document.getElementById('shop-storage'),
        shopStorageLevel: document.getElementById('shop-storage-level'),
        shopStorageCost: document.getElementById('shop-storage-cost'),
        shopDrill: document.getElementById('shop-drill'),
        shopDrillLevel: document.getElementById('shop-drill-level'),
        shopDrillCost: document.getElementById('shop-drill-cost'),
        shopDrone: document.getElementById('shop-drone'),
        shopDroneCount: document.getElementById('shop-drone-count'),
        shopDroneCost: document.getElementById('shop-drone-cost'),
        cargo: {
            iron: document.getElementById('hud-cargo-iron'),
            copper: document.getElementById('hud-cargo-copper'),
            gold: document.getElementById('hud-cargo-gold'),
            diamond: document.getElementById('hud-cargo-diamond'),
        },
    };

    const isHudMissing = [...Object.values(hud), ...Object.values(hud.cargo)].some((element) => !element);

    if (isHudMissing) return;

    const START_STORAGE_CAPACITY = 50;
    const START_DRILL_POWER = 1;
    const STORAGE_UPGRADE_STEP = 25;
    const DRONE_ORE_PER_SECOND = 0.5;

    const UPGRADES = {
        storage: { baseCost: 100, costMultiplier: 1.5 },
        drill: { baseCost: 75, costMultiplier: 2.2 },
        drone: { baseCost: 150, costMultiplier: 1.6 },
    };

    const ORE_PRICES = {
        iron: 1,
        copper: 3,
        gold: 5,
        diamond: 15,
    };

    const ASTEROID_HP = {
        small: 3,
        medium: 5,
        large: 8,
    };

    const ASTEROID_TYPE_WEIGHTS = {
        iron: 50,
        copper: 30,
        gold: 15,
        diamond: 5,
    };

    const ASTEROID_SIZES = ['small', 'medium', 'large'];
    const ASTEROID_RESPAWN_DELAY_MS = 1500;
    const ASTEROID_COUNT = 6;
    const ASTEROID_SPEED = { min: 40, max: 60 };
    const MAX_FRAME_TIME = 0.1;
    const ASTEROID_OFFSCREEN_MARGIN = 50;
    const ASTEROID_TARGET_PADDING = 0.2;

    const state = {
        asteroids: [],
        credits: 0,
        storageCapacity: START_STORAGE_CAPACITY,
        drillPower: START_DRILL_POWER,
        drones: 0,
        droneProgress: 0,
        upgradeLevels: {
            storage: 0,
            drill: 0,
            drone: 0,
        },
        cargo: {
            iron: 0,
            copper: 0,
            gold: 0,
            diamond: 0,
        },
    };

    function getRandomItem(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    function getRandomWeightedKey(weights) {
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        let roll = Math.random() * totalWeight;

        for (const [key, weight] of Object.entries(weights)) {
            roll -= weight;

            if (roll < 0) return key;
        }

        return Object.keys(weights)[0];
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

    function isAsteroidOutsideFlightArea(asteroid) {
        const area = getFlightArea();

        return (
            asteroid.x < area.left ||
            asteroid.x > area.right ||
            asteroid.y < area.top ||
            asteroid.y > area.bottom
        );
    }

    function getCargoTotal() {
        return Object.values(state.cargo).reduce((sum, amount) => sum + amount, 0);
    }

    function isStorageFull() {
        return getCargoTotal() >= state.storageCapacity;
    }

    function getCargoValue() {
        return Object.entries(state.cargo).reduce((sum, [type, amount]) => sum + amount * ORE_PRICES[type], 0);
    }

    function sellAllCargo() {
        state.credits += getCargoValue();

        Object.keys(state.cargo).forEach((type) => {
            state.cargo[type] = 0;
        });

        renderHud();
    }

    function getUpgradeCost(name) {
        const { baseCost, costMultiplier } = UPGRADES[name];
        return Math.round(baseCost * costMultiplier ** state.upgradeLevels[name]);
    }

    function canAffordUpgrade(name) {
        return state.credits >= getUpgradeCost(name);
    }

    function payForUpgrade(name) {
        if (!canAffordUpgrade(name)) return false;

        state.credits -= getUpgradeCost(name);
        state.upgradeLevels[name] += 1;
        return true;
    }

    function buyStorageUpgrade() {
        if (!payForUpgrade('storage')) return;

        state.storageCapacity += STORAGE_UPGRADE_STEP;
        renderHud();
    }

    function buyDrillUpgrade() {
        if (!payForUpgrade('drill')) return;

        state.drillPower += 1;
        renderHud();
    }

    function buyDrone() {
        if (!payForUpgrade('drone')) return;

        state.drones += 1;
        renderHud();
    }

    function runDrones(deltaTime) {
        if (state.drones === 0) return;

        if (isStorageFull()) {
            state.droneProgress = 0;
            return;
        }

        state.droneProgress += state.drones * DRONE_ORE_PER_SECOND * deltaTime;

        if (state.droneProgress < 1) return;

        while (state.droneProgress >= 1 && !isStorageFull()) {
            const type = getRandomWeightedKey(ASTEROID_TYPE_WEIGHTS);
            state.cargo[type] += 1;
            state.droneProgress -= 1;
        }

        renderHud();
    }

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

    function spawnRandomAsteroid() {
        const start = getRandomSpawnPoint();
        const target = getRandomTargetPoint();
        const distance = Math.hypot(target.x - start.x, target.y - start.y);
        const speed = getRandomNumber(ASTEROID_SPEED.min, ASTEROID_SPEED.max);

        spawnAsteroid({
            type: getRandomWeightedKey(ASTEROID_TYPE_WEIGHTS),
            size: getRandomItem(ASTEROID_SIZES),
            x: start.x,
            y: start.y,
            speedX: ((target.x - start.x) / distance) * speed,
            speedY: ((target.y - start.y) / distance) * speed,
        });
    }

    function moveAsteroids(deltaTime) {
        state.asteroids.forEach((asteroid) => {
            asteroid.x += asteroid.speedX * deltaTime;
            asteroid.y += asteroid.speedY * deltaTime;
            renderAsteroidPosition(asteroid);
        });

        state.asteroids.filter(isAsteroidOutsideFlightArea).forEach(destroyAsteroid);
    }

    function hitAsteroid(asteroid) {
        if (isStorageFull()) {
            renderStorageWarning();
            return;
        }

        const freeSpace = state.storageCapacity - getCargoTotal();
        const minedAmount = Math.min(state.drillPower, asteroid.hp, freeSpace);

        asteroid.hp -= minedAmount;
        state.cargo[asteroid.type] += minedAmount;
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

    function restartAnimation(el, className) {
        el.classList.remove(className);
        void el.offsetWidth;
        el.classList.add(className);
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

        Object.entries(state.cargo).forEach(([type, amount]) => {
            hud.cargo[type].textContent = amount;
        });

        hud.sellValue.textContent = getCargoValue();
        hud.sell.disabled = getCargoTotal() === 0;

        hud.shopStorageLevel.textContent = state.upgradeLevels.storage;
        hud.shopStorageCost.textContent = getUpgradeCost('storage');
        hud.shopStorage.disabled = !canAffordUpgrade('storage');

        hud.shopDrillLevel.textContent = state.upgradeLevels.drill;
        hud.shopDrillCost.textContent = getUpgradeCost('drill');
        hud.shopDrill.disabled = !canAffordUpgrade('drill');

        hud.shopDroneCount.textContent = state.drones;
        hud.shopDroneCost.textContent = getUpgradeCost('drone');
        hud.shopDrone.disabled = !canAffordUpgrade('drone');

        app.classList.toggle('is-storage-full', isStorageFull());
    }

    let lastFrameTime = performance.now();

    function gameLoop(now) {
        const deltaTime = Math.min((now - lastFrameTime) / 1000, MAX_FRAME_TIME);
        lastFrameTime = now;

        moveAsteroids(deltaTime);
        runDrones(deltaTime);

        requestAnimationFrame(gameLoop);
    }

    for (let i = 0; i < ASTEROID_COUNT; i++) {
        setTimeout(spawnRandomAsteroid, i * ASTEROID_RESPAWN_DELAY_MS);
    }

    hud.sell.addEventListener('click', sellAllCargo);
    hud.shopStorage.addEventListener('click', buyStorageUpgrade);
    hud.shopDrill.addEventListener('click', buyDrillUpgrade);
    hud.shopDrone.addEventListener('click', buyDrone);

    renderHud();
    requestAnimationFrame(gameLoop);
});
