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
        location: document.getElementById('hud-location'),
        locationName: document.getElementById('hud-location-name'),
        shopStorage: document.getElementById('shop-storage'),
        shopStorageLevel: document.getElementById('shop-storage-level'),
        shopStorageCost: document.getElementById('shop-storage-cost'),
        shopDrill: document.getElementById('shop-drill'),
        shopDrillLevel: document.getElementById('shop-drill-level'),
        shopDrillCost: document.getElementById('shop-drill-cost'),
        shopDrone: document.getElementById('shop-drone'),
        shopDroneCount: document.getElementById('shop-drone-count'),
        shopDroneCost: document.getElementById('shop-drone-cost'),
        locations: document.getElementById('locations'),
        locationsClose: document.getElementById('locations-close'),
        locationsSwiper: document.getElementById('locations-swiper'),
        locationsSlides: document.getElementById('locations-slides'),
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

    const ORE_ICONS = {
        iron: 'assets/ore-iron.png',
        copper: 'assets/ore-copper.png',
        gold: 'assets/ore-gold.png',
        diamond: 'assets/ore-diamond.png',
    };

    const LOCATIONS = [
        {
            id: 'inner',
            name: 'Внутрішній пояс',
            background: 'assets/location-inner.jpg',
            unlockCost: 0,
            hpMultiplier: 1,
            speedMultiplier: 1,
            oreWeights: { iron: 50, copper: 30, gold: 15, diamond: 5 },
        },
        {
            id: 'copper',
            name: 'Мідний дрейф',
            background: 'assets/location-copper.jpg',
            unlockCost: 2000,
            hpMultiplier: 3,
            speedMultiplier: 0.7,
            oreWeights: { iron: 25, copper: 45, gold: 22, diamond: 8 },
        },
        {
            id: 'abyss',
            name: 'Алмазна безодня',
            background: 'assets/location-abyss.jpg',
            unlockCost: 15000,
            hpMultiplier: 8,
            speedMultiplier: 1.5,
            oreWeights: { iron: 10, copper: 25, gold: 40, diamond: 25 },
        },
    ];

    const ASTEROID_HP = {
        small: 3,
        medium: 5,
        large: 8,
    };

    const ASTEROID_SIZES = ['small', 'medium', 'large'];
    const ASTEROID_SPAWN_INTERVAL = 1.5;
    const ASTEROID_COUNT = 6;
    const ASTEROID_SPEED = { min: 40, max: 60 };
    const MAX_FRAME_TIME = 0.1;
    const ASTEROID_OFFSCREEN_MARGIN = 50;
    const ASTEROID_TARGET_PADDING = 0.2;

    const state = {
        asteroids: [],
        spawnCooldown: 0,
        credits: 0,
        storageCapacity: START_STORAGE_CAPACITY,
        drillPower: START_DRILL_POWER,
        drones: 0,
        droneProgress: 0,
        locationIndex: 0,
        unlockedLocationIds: ['inner'],
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

    const locationButtons = [];
    let locationsSlider = null;

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

    function getCurrentLocation() {
        return LOCATIONS[state.locationIndex];
    }

    function isLocationUnlocked(location) {
        return state.unlockedLocationIds.includes(location.id);
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
            const type = getRandomWeightedKey(getCurrentLocation().oreWeights);
            state.cargo[type] += 1;
            state.droneProgress -= 1;
        }

        renderHud();
    }

    function chooseLocation(index) {
        const location = LOCATIONS[index];

        if (index === state.locationIndex) return;

        if (!isLocationUnlocked(location)) {
            if (state.credits < location.unlockCost) return;

            state.credits -= location.unlockCost;
            state.unlockedLocationIds.push(location.id);
        }

        travelToLocation(index);
    }

    function travelToLocation(index) {
        state.locationIndex = index;

        removeAllAsteroids();
        state.spawnCooldown = 0;

        renderLocation();
        renderHud();
        closeLocations();
    }

    function spawnAsteroid({ type, size, x, y, speedX, speedY }) {
        const asteroid = {
            type,
            size,
            x,
            y,
            speedX,
            speedY,
            hp: ASTEROID_HP[size] * getCurrentLocation().hpMultiplier,
            el: null,
        };

        state.asteroids.push(asteroid);
        renderNewAsteroid(asteroid);
    }

    function spawnRandomAsteroid() {
        const location = getCurrentLocation();
        const start = getRandomSpawnPoint();
        const target = getRandomTargetPoint();
        const distance = Math.hypot(target.x - start.x, target.y - start.y);
        const speed = getRandomNumber(ASTEROID_SPEED.min, ASTEROID_SPEED.max) * location.speedMultiplier;

        spawnAsteroid({
            type: getRandomWeightedKey(location.oreWeights),
            size: getRandomItem(ASTEROID_SIZES),
            x: start.x,
            y: start.y,
            speedX: ((target.x - start.x) / distance) * speed,
            speedY: ((target.y - start.y) / distance) * speed,
        });
    }

    function runAsteroidSpawner(deltaTime) {
        if (state.asteroids.length >= ASTEROID_COUNT) return;

        state.spawnCooldown -= deltaTime;

        if (state.spawnCooldown > 0) return;

        spawnRandomAsteroid();
        state.spawnCooldown = ASTEROID_SPAWN_INTERVAL;
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
    }

    function removeAllAsteroids() {
        state.asteroids.forEach((asteroid) => asteroid.el.remove());
        state.asteroids = [];
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

    function renderLocation() {
        const location = getCurrentLocation();

        app.style.backgroundImage = `url('${location.background}')`;
        hud.locationName.textContent = location.name;
    }

    function getOreChancesHtml(oreWeights) {
        const totalWeight = Object.values(oreWeights).reduce((sum, weight) => sum + weight, 0);

        return Object.entries(oreWeights)
            .map(([type, weight]) => {
                const percent = Math.round((weight / totalWeight) * 100);
                return `<span class="locations__ore"><img class="hud__ore-icon" src="${ORE_ICONS[type]}" alt="" />${percent}%</span>`;
            })
            .join('');
    }

    function renderLocationSlides() {
        LOCATIONS.forEach((location, index) => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide locations__slide';
            slide.style.backgroundImage = `url('${location.background}')`;
            slide.innerHTML = `
                <div class="locations__content">
                    <h2 class="locations__name">${location.name}</h2>
                    <p class="locations__stats">Міцність астероїдів ×${location.hpMultiplier} · Швидкість ×${location.speedMultiplier}</p>
                    <div class="locations__ores">${getOreChancesHtml(location.oreWeights)}</div>
                    <button class="hud__item hud__button locations__action" type="button"></button>
                </div>
            `;

            const button = slide.querySelector('.locations__action');
            button.addEventListener('click', () => chooseLocation(index));
            locationButtons.push(button);

            hud.locationsSlides.appendChild(slide);
        });
    }

    function renderLocationButtons() {
        LOCATIONS.forEach((location, index) => {
            const button = locationButtons[index];

            if (index === state.locationIndex) {
                button.textContent = 'Ви тут';
                button.disabled = true;
                return;
            }

            if (isLocationUnlocked(location)) {
                button.textContent = 'Летіти';
                button.disabled = false;
                return;
            }

            button.textContent = `Відкрити за ${location.unlockCost} кр.`;
            button.disabled = state.credits < location.unlockCost;
        });
    }

    function openLocations() {
        hud.locations.classList.add('is-open');

        if (!locationsSlider) {
            locationsSlider = new Swiper(hud.locationsSwiper, {
                spaceBetween: 16,
                navigation: {
                    nextEl: hud.locationsSwiper.querySelector('.swiper-button-next'),
                    prevEl: hud.locationsSwiper.querySelector('.swiper-button-prev'),
                },
                pagination: {
                    el: hud.locationsSwiper.querySelector('.swiper-pagination'),
                    clickable: true,
                },
            });
        }

        locationsSlider.slideTo(state.locationIndex, 0);
    }

    function closeLocations() {
        hud.locations.classList.remove('is-open');
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

        renderLocationButtons();

        app.classList.toggle('is-storage-full', isStorageFull());
    }

    let lastFrameTime = performance.now();

    function gameLoop(now) {
        const deltaTime = Math.min((now - lastFrameTime) / 1000, MAX_FRAME_TIME);
        lastFrameTime = now;

        runAsteroidSpawner(deltaTime);
        moveAsteroids(deltaTime);
        runDrones(deltaTime);

        requestAnimationFrame(gameLoop);
    }

    hud.sell.addEventListener('click', sellAllCargo);
    hud.shopStorage.addEventListener('click', buyStorageUpgrade);
    hud.shopDrill.addEventListener('click', buyDrillUpgrade);
    hud.shopDrone.addEventListener('click', buyDrone);
    hud.location.addEventListener('click', openLocations);
    hud.locationsClose.addEventListener('click', closeLocations);

    hud.locations.addEventListener('click', (event) => {
        if (event.target === hud.locations) closeLocations();
    });

    renderLocationSlides();
    renderLocation();
    renderHud();
    requestAnimationFrame(gameLoop);
});
