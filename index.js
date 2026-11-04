window.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    if (!app) return;

    const asteroids = [
        { type: 'iron', size: 'large', x: 15, y: 30 },
        { type: 'copper', size: 'medium', x: 42, y: 62 },
        { type: 'ice', size: 'large', x: 62, y: 25 },
        { type: 'gold', size: 'small', x: 80, y: 70 },
        { type: 'iron', size: 'medium', x: 30, y: 85 },
    ];

    function createAsteroid({ type, size, x, y }) {
        const el = document.createElement('div');

        el.className = `asteroid ${type} ${size}`;
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;

        return el;
    }

    asteroids.forEach((data) => app.appendChild(createAsteroid(data)));
});
