window.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    if (!app) return;

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

    function hitAsteroid(asteroid) {
        asteroid.hp -= 1;

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

    function renderAsteroidHit(asteroid) {
        asteroid.el.classList.remove('is-hit');
        void asteroid.el.offsetWidth;
        asteroid.el.classList.add('is-hit');
    }

    START_ASTEROIDS.forEach(spawnAsteroid);
});
