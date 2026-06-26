'use strict';

const gameplay = (() => {
  const state = {
    canvas: null,
    ctx: null,
    width: 1024,
    height: 576,
    running: false,
    lastTimestamp: 0,
    stars: [],
    bullets: [],
    enemies: [],
    impacts: [],
    input: {
      keys: {},
      mouse: { x: 512, y: 288, active: false, down: false },
      touch: { x: 512, y: 288, active: false, down: false }
    },
    player: {
      x: 512,
      y: 500,
      speed: 360,
      fireCooldown: 0
    },
    audio: {
      context: null
    }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function initializeStars() {
    state.stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      z: 0.3 + Math.random() * 1.2
    }));
  }

  function resizeCanvas() {
    if (!state.canvas || !state.ctx) return;

    const titleHeight = document.querySelector('h1')?.offsetHeight ?? 0;
    const availableWidth = window.innerWidth;
    const availableHeight = Math.max(1, window.innerHeight - titleHeight - 16);
    const aspect = state.width / state.height;

    let renderWidth = availableWidth;
    let renderHeight = renderWidth / aspect;

    if (renderHeight > availableHeight) {
      renderHeight = availableHeight;
      renderWidth = renderHeight * aspect;
    }

    const dpr = window.devicePixelRatio || 1;
    state.canvas.style.width = `${Math.floor(renderWidth)}px`;
    state.canvas.style.height = `${Math.floor(renderHeight)}px`;
    state.canvas.width = Math.floor(renderWidth * dpr);
    state.canvas.height = Math.floor(renderHeight * dpr);
    state.ctx.setTransform(dpr * (renderWidth / state.width), 0, 0, dpr * (renderHeight / state.height), 0, 0);
  }

  function mapClientToWorld(clientX, clientY) {
    const rect = state.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: state.player.x, y: state.player.y };
    return {
      x: ((clientX - rect.left) / rect.width) * state.width,
      y: ((clientY - rect.top) / rect.height) * state.height
    };
  }

  function setupAudio() {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        state.audio.context = new AudioContextCtor();
      }
    } catch {
      state.audio.context = null;
    }
  }

  function playShotSound() {
    const ctx = state.audio.context;
    if (!ctx || ctx.state === 'suspended') return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(280, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.09);
  }

  function spawnEnemy(dt) {
    if (Math.random() < dt * 0.8) {
      state.enemies.push({
        x: 70 + Math.random() * (state.width - 140),
        y: -40,
        speed: 80 + Math.random() * 130,
        radius: 14
      });
    }
  }

  function fire() {
    if (state.player.fireCooldown > 0) return;

    state.bullets.push({
      x: state.player.x,
      y: state.player.y - 16,
      speed: 560,
      radius: 3
    });

    state.player.fireCooldown = 0.17;
    playShotSound();
  }

  function updateInputDrivenFire() {
    if (
      state.input.keys.Space ||
      state.input.mouse.down ||
      state.input.touch.down
    ) {
      fire();
    }
  }

  function updatePlayer(dt) {
    const player = state.player;
    const keys = state.input.keys;
    let dx = 0;
    let dy = 0;

    if (keys.ArrowLeft || keys.KeyA) dx -= 1;
    if (keys.ArrowRight || keys.KeyD) dx += 1;
    if (keys.ArrowUp || keys.KeyW) dy -= 1;
    if (keys.ArrowDown || keys.KeyS) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy) || 1;
      player.x += (dx / length) * player.speed * dt;
      player.y += (dy / length) * player.speed * dt;
    }

    if (state.input.mouse.active) {
      player.x += (state.input.mouse.x - player.x) * Math.min(1, dt * 18);
      player.y += (state.input.mouse.y - player.y) * Math.min(1, dt * 18);
    } else if (state.input.touch.active) {
      player.x += (state.input.touch.x - player.x) * Math.min(1, dt * 18);
      player.y += (state.input.touch.y - player.y) * Math.min(1, dt * 18);
    }

    player.x = clamp(player.x, 30, state.width - 30);
    player.y = clamp(player.y, state.height * 0.45, state.height - 30);

    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  }

  function updateWorld(dt) {
    for (const star of state.stars) {
      star.y += 50 * star.z * dt;
      if (star.y > state.height) {
        star.y = 0;
        star.x = Math.random() * state.width;
      }
    }

    for (const bullet of state.bullets) {
      bullet.y -= bullet.speed * dt;
    }
    state.bullets = state.bullets.filter((bullet) => bullet.y > -20);

    for (const enemy of state.enemies) {
      enemy.y += enemy.speed * dt;
    }
    state.enemies = state.enemies.filter((enemy) => enemy.y < state.height + 60);

    for (const impact of state.impacts) {
      impact.ttl -= dt;
    }
    state.impacts = state.impacts.filter((impact) => impact.ttl > 0);

    spawnEnemy(dt);
  }

  function handleCollisions() {
    const remainingBullets = [];

    for (const bullet of state.bullets) {
      let hit = false;

      for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = state.enemies[i];
        const distance = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);

        if (distance <= bullet.radius + enemy.radius) {
          state.enemies.splice(i, 1);
          state.impacts.push({ x: enemy.x, y: enemy.y, ttl: 0.25 });
          hit = true;
          break;
        }
      }

      if (!hit) {
        remainingBullets.push(bullet);
      }
    }

    state.bullets = remainingBullets;
  }

  function drawVectorShip(x, y, scale, color) {
    const ctx = state.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 16 * scale);
    ctx.lineTo(x - 10 * scale, y + 10 * scale);
    ctx.lineTo(x, y + 5 * scale);
    ctx.lineTo(x + 10 * scale, y + 10 * scale);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 5 * scale, y + 2 * scale);
    ctx.lineTo(x + 5 * scale, y + 2 * scale);
    ctx.stroke();
  }

  function render() {
    const ctx = state.ctx;
    ctx.clearRect(0, 0, state.width, state.height);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, state.width, state.height);

    for (const star of state.stars) {
      const alpha = 0.25 + star.z * 0.5;
      ctx.fillStyle = `rgba(180,220,255,${alpha})`;
      ctx.fillRect(star.x, star.y, 2 * star.z, 2 * star.z);
    }

    ctx.strokeStyle = '#2f8cff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 2, state.width - 4, state.height - 4);

    drawVectorShip(state.player.x, state.player.y, 1.2, '#99e5ff');

    for (const bullet of state.bullets) {
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bullet.x, bullet.y + 6);
      ctx.lineTo(bullet.x, bullet.y - 8);
      ctx.stroke();
    }

    for (const enemy of state.enemies) {
      drawVectorShip(enemy.x, enemy.y, 1, '#ff6f6f');
    }

    for (const impact of state.impacts) {
      const k = impact.ttl / 0.25;
      ctx.strokeStyle = `rgba(255,180,80,${k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, (1 - k) * 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(state.player.x - 15, state.player.y);
    ctx.lineTo(state.player.x + 15, state.player.y);
    ctx.moveTo(state.player.x, state.player.y - 15);
    ctx.lineTo(state.player.x, state.player.y + 15);
    ctx.stroke();
  }

  function loop(timestamp) {
    if (!state.running) return;

    const dt = Math.min(0.033, (timestamp - state.lastTimestamp) / 1000 || 0.016);
    state.lastTimestamp = timestamp;

    updateInputDrivenFire();
    updatePlayer(dt);
    updateWorld(dt);
    handleCollisions();
    render();

    window.requestAnimationFrame(loop);
  }

  function registerEvents() {
    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('keydown', (event) => {
      state.input.keys[event.code] = true;
      if (event.code === 'Space') {
        event.preventDefault();
        if (state.audio.context?.state === 'suspended') {
          state.audio.context.resume().catch(() => {});
        }
      }
    });

    window.addEventListener('keyup', (event) => {
      state.input.keys[event.code] = false;
    });

    state.canvas.addEventListener('mousemove', (event) => {
      state.input.mouse.active = true;
      const point = mapClientToWorld(event.clientX, event.clientY);
      state.input.mouse.x = point.x;
      state.input.mouse.y = point.y;
    });

    state.canvas.addEventListener('mousedown', () => {
      state.input.mouse.down = true;
      if (state.audio.context?.state === 'suspended') {
        state.audio.context.resume().catch(() => {});
      }
    });

    window.addEventListener('mouseup', () => {
      state.input.mouse.down = false;
    });

    state.canvas.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      const point = mapClientToWorld(touch.clientX, touch.clientY);
      state.input.touch.active = true;
      state.input.touch.down = true;
      state.input.touch.x = point.x;
      state.input.touch.y = point.y;
      if (state.audio.context?.state === 'suspended') {
        state.audio.context.resume().catch(() => {});
      }
    }, { passive: false });

    state.canvas.addEventListener('touchmove', (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      const point = mapClientToWorld(touch.clientX, touch.clientY);
      state.input.touch.x = point.x;
      state.input.touch.y = point.y;
    }, { passive: false });

    state.canvas.addEventListener('touchend', () => {
      state.input.touch.down = false;
      state.input.touch.active = false;
    });
  }

  function init(canvasId = 'gameCanvas') {
    state.canvas = document.getElementById(canvasId);
    if (!state.canvas) {
      throw new Error(`No se encontró canvas con id "${canvasId}"`);
    }

    state.ctx = state.canvas.getContext('2d');
    if (!state.ctx) {
      throw new Error('No se pudo inicializar el contexto 2D del canvas');
    }

    initializeStars();
    resizeCanvas();
    setupAudio();
    registerEvents();
  }

  function Run() {
    if (!state.canvas || !state.ctx) {
      init();
    }
    if (state.running) return;

    state.running = true;
    state.lastTimestamp = performance.now();
    window.requestAnimationFrame(loop);
  }

  return {
    init,
    Run
  };
})();

window.addEventListener('DOMContentLoaded', () => {
  gameplay.init();
  gameplay.Run();
});
