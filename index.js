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
        shop: document.getElementById('shop'),
        shopToggle: document.getElementById('shop-toggle'),
        newGame: document.getElementById('new-game'),
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
        order: document.getElementById('order'),
        orderIcon: document.getElementById('order-icon'),
        orderOreName: document.getElementById('order-ore-name'),
        orderProgress: document.getElementById('order-progress'),
        orderAmount: document.getElementById('order-amount'),
        orderReward: document.getElementById('order-reward'),
        orderDeliver: document.getElementById('order-deliver'),
        orderSkip: document.getElementById('order-skip'),
        orderSkipCost: document.getElementById('order-skip-cost'),
        sellPanel: document.getElementById('sell-panel'),
        sellPanelIcon: document.getElementById('sell-panel-icon'),
        sellPanelName: document.getElementById('sell-panel-name'),
        sellPanelClose: document.getElementById('sell-panel-close'),
        sellPanelRange: document.getElementById('sell-panel-range'),
        sellPanelConfirm: document.getElementById('sell-panel-confirm'),
        sellPanelAmount: document.getElementById('sell-panel-amount'),
        sellPanelPrice: document.getElementById('sell-panel-price'),
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

    const ORE_NAMES = {
        iron: 'Залізо',
        copper: 'Мідь',
        gold: 'Золото',
        diamond: 'Алмаз',
    };

    const ORDER_SIZE = { min: 0.3, max: 0.6 };
    const ORDER_MIN_AMOUNT = 5;
    const ORDER_REWARD_MULTIPLIER = 2;
    const ORDER_SKIP_COST_SHARE = 0.25;

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
    const SAVE_KEY = 'space-mine-save';
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
        order: null,
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
    let sellPanelOreType = null;
    let isShopCollapsed = false;

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

    function sellOre(type, amount) {
        const soldAmount = Math.min(amount, state.cargo[type]);

        state.cargo[type] -= soldAmount;
        state.credits += soldAmount * ORE_PRICES[type];

        renderHud();
    }

    function openSellPanel(type) {
        sellPanelOreType = type;
        hud.sellPanelRange.max = state.cargo[type];
        hud.sellPanelRange.value = state.cargo[type];

        renderSellPanel();
    }

    function closeSellPanel() {
        sellPanelOreType = null;
        renderSellPanel();
    }

    function confirmSellPanel() {
        sellOre(sellPanelOreType, Number(hud.sellPanelRange.value));
        closeSellPanel();
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

    function createOrder() {
        const oreWeights = { ...getCurrentLocation().oreWeights };

        if (state.order) delete oreWeights[state.order.type];

        const type = getRandomWeightedKey(oreWeights);
        const size = getRandomNumber(ORDER_SIZE.min, ORDER_SIZE.max);
        const amount = Math.max(ORDER_MIN_AMOUNT, Math.round(state.storageCapacity * size));

        state.order = {
            type,
            amount,
            reward: amount * ORE_PRICES[type] * ORDER_REWARD_MULTIPLIER,
        };

        restartAnimation(hud.order, 'is-new');
    }

    function canDeliverOrder() {
        return state.cargo[state.order.type] >= state.order.amount;
    }

    function deliverOrder() {
        if (!canDeliverOrder()) return;

        state.cargo[state.order.type] -= state.order.amount;
        state.credits += state.order.reward;

        createOrder();
        renderHud();
    }

    function getOrderSkipCost() {
        return Math.round(state.order.reward * ORDER_SKIP_COST_SHARE);
    }

    function canSkipOrder() {
        return state.credits >= getOrderSkipCost();
    }

    function skipOrder() {
        if (!canSkipOrder()) return;

        state.credits -= getOrderSkipCost();

        createOrder();
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
                    <button class="hud__item hud__button locations__action"></button>
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

    function renderSellPanel() {
        const isOpen = sellPanelOreType !== null;

        hud.sellPanel.classList.toggle('is-open', isOpen);

        if (!isOpen) return;

        const available = state.cargo[sellPanelOreType];
        hud.sellPanelRange.max = Math.max(available, 1);
        hud.sellPanelRange.disabled = available === 0;

        const amount = available === 0 ? 0 : Number(hud.sellPanelRange.value);

        hud.sellPanelIcon.src = ORE_ICONS[sellPanelOreType];
        hud.sellPanelName.textContent = `${ORE_NAMES[sellPanelOreType]} · є ${available}`;
        hud.sellPanelAmount.textContent = amount;
        hud.sellPanelPrice.textContent = amount * ORE_PRICES[sellPanelOreType];
        hud.sellPanelConfirm.disabled = amount === 0;
    }

    function renderOrder() {
        const { type, amount, reward } = state.order;

        hud.orderIcon.src = ORE_ICONS[type];
        hud.orderOreName.textContent = ORE_NAMES[type];
        hud.orderProgress.textContent = Math.min(state.cargo[type], amount);
        hud.orderAmount.textContent = amount;
        hud.orderReward.textContent = reward;
        hud.orderDeliver.disabled = !canDeliverOrder();
        hud.orderSkipCost.textContent = getOrderSkipCost();
        hud.orderSkip.disabled = !canSkipOrder();
    }

    function saveGame() {
        const saveData = {
            credits: state.credits,
            storageCapacity: state.storageCapacity,
            drillPower: state.drillPower,
            drones: state.drones,
            locationIndex: state.locationIndex,
            unlockedLocationIds: state.unlockedLocationIds,
            order: state.order,
            upgradeLevels: state.upgradeLevels,
            cargo: state.cargo,
        };

        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        } catch {
            return;
        }
    }

    function loadGame() {
        let saveData = null;

        try {
            saveData = JSON.parse(localStorage.getItem(SAVE_KEY));
        } catch {
            return;
        }

        if (!saveData) return;

        const { upgradeLevels, cargo, ...simpleValues } = saveData;

        Object.assign(state, simpleValues);
        Object.assign(state.upgradeLevels, upgradeLevels);
        Object.assign(state.cargo, cargo);

        if (!LOCATIONS[state.locationIndex]) state.locationIndex = 0;
    }

    function startNewGame() {
        if (!window.confirm('Почати нову гру? Весь прогрес буде втрачено.')) return;

        window.removeEventListener('pagehide', saveGame);

        try {
            localStorage.removeItem(SAVE_KEY);
        } catch {
            return;
        }

        window.location.reload();
    }

    function toggleShop() {
        isShopCollapsed = !isShopCollapsed;

        hud.shop.classList.toggle('is-collapsed', isShopCollapsed);
        hud.shopToggle.setAttribute('aria-expanded', String(!isShopCollapsed));
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

        renderSellPanel();
        renderOrder();
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
    hud.shopToggle.addEventListener('click', toggleShop);
    hud.newGame.addEventListener('click', startNewGame);
    hud.locationsClose.addEventListener('click', closeLocations);
    hud.orderDeliver.addEventListener('click', deliverOrder);
    hud.orderSkip.addEventListener('click', skipOrder);
    hud.sellPanelClose.addEventListener('click', closeSellPanel);
    hud.sellPanelConfirm.addEventListener('click', confirmSellPanel);
    hud.sellPanelRange.addEventListener('input', renderSellPanel);

    document.querySelectorAll('[data-sell-ore]').forEach((button) => {
        button.addEventListener('click', () => openSellPanel(button.dataset.sellOre));
    });

    hud.locations.addEventListener('click', (event) => {
        if (event.target === hud.locations) closeLocations();
    });

    loadGame();

    if (!state.order) createOrder();

    renderLocationSlides();
    renderLocation();
    renderHud();
    requestAnimationFrame(gameLoop);

    window.addEventListener('pagehide', saveGame);
});
