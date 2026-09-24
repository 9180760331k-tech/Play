(function () {
  'use strict';

  /*
   * Параметры партии. Цвета и размеры интерфейса — в styles.css (:root).
   */
  var CONFIG = {
    gridSize: 20,
    initialLength: 3,
    initialTickMs: 250,
    minTickMs: 140,
    tickStepMs: 10,
    foodsPerSpeedup: 5,
    pointsPerFood: 10,
    maxInputQueue: 2,
    bestScoreKey: 'snake-best-score',
  };

  var MAX_FRAME_DELTA_MS = 250;
  var MAX_STEPS_PER_FRAME = 8;
  var SWIPE_THRESHOLD = 24;

  var OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  var DELTA = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  var PREVIEW = {
    snake: [
      { x: 12, y: 9 },
      { x: 11, y: 9 },
      { x: 10, y: 9 },
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 9, y: 11 },
      { x: 8, y: 11 },
    ],
    food: { x: 15, y: 7 },
    direction: 'right',
  };

  var FALLBACK_COLORS = {
    board: '#10182A',
    grid: 'rgba(245, 247, 251, 0.06)',
    accent: '#8CF5C2',
    head: '#D9FFEE',
    food: '#FF7D87',
    eye: '#0B1020',
  };

  var memoryBest = 0;
  var lastTime = 0;
  var accumulator = 0;
  var focusedScreen = '';
  var controlMode = 'mouse';
  var mousePoint = null;
  var mouseArmed = false;
  var blockMouse = false;

  var state = {
    screen: 'start',
    snake: [],
    direction: 'right',
    queue: [],
    food: null,
    score: 0,
    foodEaten: 0,
    tickMs: CONFIG.initialTickMs,
    best: 0,
    isNewRecord: false,
  };

  var startScreen = document.getElementById('start-screen');
  var gameScreen = document.getElementById('game-screen');
  var startButton = document.getElementById('start-button');
  var startRecord = document.getElementById('start-record');
  var startHint = document.getElementById('start-hint');
  var scoreValue = document.getElementById('score-value');
  var bestValue = document.getElementById('best-value');
  var pauseButton = document.getElementById('pause-button');
  var pauseOverlay = document.getElementById('pause-overlay');
  var resumeButton = document.getElementById('resume-button');
  var resultOverlay = document.getElementById('result-overlay');
  var resultTitle = document.getElementById('result-title');
  var finalScore = document.getElementById('final-score');
  var finalBest = document.getElementById('final-best');
  var newRecord = document.getElementById('new-record');
  var restartButton = document.getElementById('restart-button');
  var homeButton = document.getElementById('home-button');
  var gameHint = document.getElementById('game-hint');
  var touchControls = document.getElementById('touch-controls');
  var liveStatus = document.getElementById('live-status');
  var previewFrame = document.getElementById('preview-frame');
  var previewCanvas = document.getElementById('preview-canvas');
  var boardFrame = document.getElementById('board-frame');
  var boardCanvas = document.getElementById('board-canvas');

  var previewContext = previewCanvas.getContext('2d');
  var boardContext = boardCanvas.getContext('2d');
  var coarseQuery = window.matchMedia('(pointer: coarse), (hover: none)');

  function isOpposite(a, b) {
    return OPPOSITE[a] === b;
  }

  function sameCell(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function tickMsForFoodEaten(foodEaten) {
    var stages = Math.floor(Math.max(0, foodEaten) / CONFIG.foodsPerSpeedup);
    return Math.max(CONFIG.minTickMs, CONFIG.initialTickMs - stages * CONFIG.tickStepMs);
  }

  function createInitialSnake() {
    var y = Math.floor((CONFIG.gridSize - 1) / 2);
    var headX = Math.floor(CONFIG.gridSize / 2);
    var snake = [];
    var index;
    var x;

    for (index = 0; index < CONFIG.initialLength; index += 1) {
      x = headX - index;
      if (x < 0 || x >= CONFIG.gridSize) break;
      snake.push({ x: x, y: y });
    }

    return snake;
  }

  function freeCells(occupied) {
    var taken = {};
    var free = [];
    var y;
    var x;

    for (y = 0; y < occupied.length; y += 1) {
      taken[occupied[y].x + ',' + occupied[y].y] = true;
    }

    for (y = 0; y < CONFIG.gridSize; y += 1) {
      for (x = 0; x < CONFIG.gridSize; x += 1) {
        if (!taken[x + ',' + y]) free.push({ x: x, y: y });
      }
    }

    return free;
  }

  function placeFood(occupied) {
    var free = freeCells(occupied);
    if (free.length === 0) return null;
    var index = Math.min(free.length - 1, Math.floor(Math.random() * free.length));
    return free[index];
  }

  function loadBest() {
    try {
      var raw = localStorage.getItem(CONFIG.bestScoreKey);
      if (raw == null || String(raw).trim() === '') return 0;
      var value = Number(raw);
      if (!isFinite(value) || value < 0) return 0;
      return Math.floor(value);
    } catch (error) {
      return memoryBest;
    }
  }

  function saveBest(score) {
    if (!isFinite(score) || score < 0) return;
    memoryBest = Math.floor(score);
    state.best = memoryBest;
    try {
      localStorage.setItem(CONFIG.bestScoreKey, String(memoryBest));
    } catch (error) {
      /* Рекорд остаётся в памяти до закрытия страницы. */
    }
  }

  function resetClock() {
    lastTime = 0;
    accumulator = 0;
  }

  function enqueueDirection(next) {
    if (state.screen !== 'playing') return;
    var last = state.queue.length > 0 ? state.queue[state.queue.length - 1] : state.direction;
    if (next === last || isOpposite(next, last)) return;
    if (state.queue.length >= CONFIG.maxInputQueue) return;
    state.queue.push(next);
  }

  function stepState() {
    if (state.screen !== 'playing' || state.snake.length === 0) return;

    var direction = state.direction;
    if (state.queue.length > 0) {
      var queued = state.queue.shift();
      if (queued !== direction && !isOpposite(queued, direction)) direction = queued;
    }

    var head = state.snake[0];
    var delta = DELTA[direction];
    var nextHead = { x: head.x + delta.x, y: head.y + delta.y };
    state.direction = direction;

    if (
      nextHead.x < 0 ||
      nextHead.y < 0 ||
      nextHead.x >= CONFIG.gridSize ||
      nextHead.y >= CONFIG.gridSize
    ) {
      state.screen = 'lost';
      return;
    }

    var eating = state.food && sameCell(nextHead, state.food);
    var body = eating ? state.snake : state.snake.slice(0, -1);
    var index;

    for (index = 0; index < body.length; index += 1) {
      if (sameCell(body[index], nextHead)) {
        state.screen = 'lost';
        return;
      }
    }

    if (eating) state.snake.unshift(nextHead);
    else {
      state.snake.pop();
      state.snake.unshift(nextHead);
    }

    if (!eating) return;

    state.foodEaten += 1;
    state.score += CONFIG.pointsPerFood;
    state.tickMs = tickMsForFoodEaten(state.foodEaten);

    if (state.snake.length >= CONFIG.gridSize * CONFIG.gridSize) {
      state.screen = 'won';
      state.food = null;
      return;
    }

    state.food = placeFood(state.snake);
    if (!state.food) state.screen = 'won';
  }

  function finishRound() {
    state.isNewRecord = state.score > state.best;
    if (state.isNewRecord) saveBest(state.score);
    resetClock();
  }

  function beginRound() {
    var snake = createInitialSnake();
    var food = placeFood(snake);
    state.snake = snake;
    state.direction = 'right';
    state.queue = [];
    state.food = food;
    state.score = 0;
    state.foodEaten = 0;
    state.tickMs = CONFIG.initialTickMs;
    state.isNewRecord = false;
    state.screen = food ? 'playing' : 'won';
    disarmMouse();
    resetClock();
    if (state.screen === 'won') finishRound();
  }

  function readPalette() {
    var style = getComputedStyle(document.documentElement);
    function pick(name, fallback) {
      var value = style.getPropertyValue(name).trim();
      return value || fallback;
    }
    return {
      board: pick('--color-board', FALLBACK_COLORS.board),
      grid: pick('--color-grid', FALLBACK_COLORS.grid),
      accent: pick('--color-accent', FALLBACK_COLORS.accent),
      head: pick('--color-head', FALLBACK_COLORS.head),
      food: pick('--color-food', FALLBACK_COLORS.food),
      eye: pick('--color-bg', FALLBACK_COLORS.eye),
    };
  }

  function fillRoundRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function drawEyes(ctx, point, direction, cell, color) {
    var cx = point.x * cell + cell / 2;
    var cy = point.y * cell + cell / 2;
    var forwardX = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    var forwardY = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
    var sideX = -forwardY;
    var sideY = forwardX;
    var forward = cell * 0.16;
    var side = cell * 0.15;
    var radius = Math.max(0.8, cell * 0.07);
    var sign;

    ctx.fillStyle = color;
    for (sign = -1; sign <= 1; sign += 2) {
      ctx.beginPath();
      ctx.arc(
        cx + forwardX * forward + sideX * side * sign,
        cy + forwardY * forward + sideY * side * sign,
        radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  function drawBoard(ctx, cssSize, model) {
    if (!ctx || cssSize < 1) return;
    var dpr = window.devicePixelRatio || 1;
    var pixels = Math.max(1, Math.round(cssSize * dpr));
    var canvas = ctx.canvas;
    var palette = readPalette();
    var cell = cssSize / CONFIG.gridSize;
    var index;
    var line;
    var part;
    var pad;
    var head;

    if (canvas.width !== pixels || canvas.height !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, cssSize, cssSize);

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (index = 1; index < CONFIG.gridSize; index += 1) {
      line = index * cell;
      ctx.moveTo(line, 0);
      ctx.lineTo(line, cssSize);
      ctx.moveTo(0, line);
      ctx.lineTo(cssSize, line);
    }
    ctx.stroke();

    if (model.food) {
      ctx.save();
      ctx.fillStyle = palette.food;
      ctx.shadowColor = palette.food;
      ctx.shadowBlur = cell * 0.9;
      ctx.beginPath();
      ctx.arc(model.food.x * cell + cell / 2, model.food.y * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (index = 1; index < model.snake.length; index += 1) {
      part = model.snake[index];
      pad = cell * 0.16;
      ctx.fillStyle = palette.accent;
      fillRoundRect(ctx, part.x * cell + pad, part.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.28);
    }

    head = model.snake[0];
    if (!head) return;
    pad = cell * 0.07;
    ctx.fillStyle = palette.head;
    fillRoundRect(ctx, head.x * cell + pad, head.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.36);
    drawEyes(ctx, head, model.direction, cell, palette.eye);
  }

  function paintPreview() {
    drawBoard(previewContext, previewFrame.clientWidth, PREVIEW);
  }

  function paintBoard() {
    drawBoard(boardContext, boardFrame.clientWidth, state);
  }

  function directionFromCode(code) {
    if (code === 'ArrowUp' || code === 'KeyW') return 'up';
    if (code === 'ArrowDown' || code === 'KeyS') return 'down';
    if (code === 'ArrowLeft' || code === 'KeyA') return 'left';
    if (code === 'ArrowRight' || code === 'KeyD') return 'right';
    return null;
  }

  function directionFromSwipe(dx, dy) {
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (Math.max(absX, absY) < SWIPE_THRESHOLD) return null;
    if (absX > absY) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  function announcement() {
    if (state.screen === 'paused') return 'Пауза';
    if (state.screen === 'lost') {
      return (
        'Игра окончена. Счёт ' +
        state.score +
        '. Лучший результат ' +
        state.best +
        '.' +
        (state.isNewRecord ? ' Новый рекорд!' : '')
      );
    }
    if (state.screen === 'won') {
      return (
        'Поле пройдено! Счёт ' +
        state.score +
        '. Лучший результат ' +
        state.best +
        '.' +
        (state.isNewRecord ? ' Новый рекорд!' : '')
      );
    }
    return '';
  }

  function disarmMouse() {
    mouseArmed = false;
    mousePoint = null;
  }

  function syncModeButtons() {
    var buttons = document.querySelectorAll('[data-control-mode]');
    var index;
    for (index = 0; index < buttons.length; index += 1) {
      buttons[index].setAttribute('aria-pressed', buttons[index].getAttribute('data-control-mode') === controlMode ? 'true' : 'false');
    }
  }

  function setControlMode(mode) {
    controlMode = mode === 'keyboard' ? 'keyboard' : 'mouse';
    if (controlMode !== 'mouse') disarmMouse();
    syncModeButtons();
    applyPointerMode();
  }

  function eventToBoard(event) {
    var rect = boardCanvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var logicalWidth = boardCanvas.width / dpr;
    var logicalHeight = boardCanvas.height / dpr;
    var x;
    var y;

    if (rect.width < 1 || rect.height < 1 || logicalWidth < 1 || logicalHeight < 1) return null;
    x = ((event.clientX - rect.left) / rect.width) * logicalWidth;
    y = ((event.clientY - rect.top) / rect.height) * logicalHeight;
    if (x < 0 || y < 0 || x > logicalWidth || y > logicalHeight) return null;
    return { x: x, y: y };
  }

  function directionFromMousePoint(point) {
    var head = state.snake[0];
    var dpr;
    var cssSize;
    var cell;
    var dx;
    var dy;

    if (!head || !point) return null;
    dpr = window.devicePixelRatio || 1;
    cssSize = boardCanvas.width / dpr;
    if (cssSize < 1) cssSize = boardFrame.clientWidth;
    cell = cssSize / CONFIG.gridSize;
    dx = point.x - (head.x * cell + cell / 2);
    dy = point.y - (head.y * cell + cell / 2);
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cell / 2) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'down' : 'up';
  }

  function steerFromMouse() {
    var next;
    if (controlMode !== 'mouse' || !mouseArmed || !mousePoint || state.queue.length > 0) return;
    next = directionFromMousePoint(mousePoint);
    if (!next || next === state.direction || isOpposite(next, state.direction)) return;
    state.direction = next;
  }

  function applyPointerMode() {
    var coarse = coarseQuery.matches;
    var mouseHint = 'Веди курсор по полю — змейка поворачивает в его сторону';
    gameScreen.classList.toggle('has-touch', coarse);
    gameScreen.classList.toggle('is-mouse', controlMode === 'mouse' && !coarse);
    touchControls.hidden = !coarse;
    if (coarse) {
      startHint.textContent = 'Свайп по полю или кнопки направлений. Кнопка «Пауза» останавливает игру.';
      gameHint.textContent = 'Свайп по полю или кнопки ниже. Кнопка «Пауза» останавливает игру.';
    } else if (controlMode === 'mouse') {
      startHint.textContent = mouseHint;
      gameHint.textContent = mouseHint;
    } else {
      startHint.textContent = 'Стрелки или WASD — движение. Пробел или Esc — пауза. Enter — старт.';
      gameHint.textContent = 'Стрелки или WASD — ход. Пробел или Esc — пауза.';
    }
  }

  function syncView() {
    var playing = state.screen === 'playing';
    var paused = state.screen === 'paused';
    var finished = state.screen === 'lost' || state.screen === 'won';
    var buttons;
    var index;

    startScreen.hidden = state.screen !== 'start';
    gameScreen.hidden = state.screen === 'start';
    startRecord.textContent = state.best > 0 ? 'Рекорд: ' + state.best : 'Рекорд ещё не установлен';
    scoreValue.textContent = String(state.score);
    bestValue.textContent = String(state.best);
    pauseButton.textContent = paused ? 'Продолжить' : 'Пауза';
    pauseButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pauseButton.disabled = finished;
    pauseOverlay.hidden = !paused;
    resultOverlay.hidden = !finished;
    resultTitle.textContent = state.screen === 'won' ? 'Поле пройдено!' : 'Игра окончена';
    finalScore.textContent = String(state.score);
    finalBest.textContent = String(state.best);
    newRecord.hidden = !state.isNewRecord;
    liveStatus.textContent = announcement();

    buttons = touchControls.querySelectorAll('button');
    for (index = 0; index < buttons.length; index += 1) buttons[index].disabled = !playing;

    if (state.screen === 'start') paintPreview();
    else paintBoard();

    if (focusedScreen === state.screen) return;
    focusedScreen = state.screen;
    if (state.screen === 'start') startButton.focus();
    else if (state.screen === 'paused') resumeButton.focus();
    else if (finished) restartButton.focus();
  }

  function showStart() {
    state.screen = 'start';
    state.queue = [];
    resetClock();
    syncView();
  }

  function togglePause() {
    if (state.screen === 'playing') {
      state.screen = 'paused';
      resetClock();
      syncView();
      return;
    }
    if (state.screen === 'paused') {
      state.screen = 'playing';
      disarmMouse();
      resetClock();
      syncView();
    }
  }

  function onFrame(now) {
    var steps = 0;

    if (state.screen !== 'playing') {
      resetClock();
    } else {
      var delta = lastTime === 0 ? 0 : Math.min(MAX_FRAME_DELTA_MS, Math.max(0, now - lastTime));
      lastTime = now;
      accumulator += delta;

      while (
        state.screen === 'playing' &&
        steps < MAX_STEPS_PER_FRAME &&
        state.tickMs > 0 &&
        accumulator >= state.tickMs
      ) {
        accumulator -= state.tickMs;
        steerFromMouse();
        stepState();
        steps += 1;
      }

      if (state.screen === 'lost' || state.screen === 'won') finishRound();
      if (steps > 0) syncView();
    }

    requestAnimationFrame(onFrame);
  }

  function turnFromControl(event) {
    var button = event.target.closest('button');
    if (!button || button.disabled || !button.dataset.direction) return;
    if (event.type === 'pointerdown' && event.button !== 0) return;
    enqueueDirection(button.dataset.direction);
  }

  function onKeyDown(event) {
    var target;
    var onButton;
    var direction;

    if (event.metaKey || event.ctrlKey || event.altKey) return;
    target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }

    onButton = target instanceof Element && Boolean(target.closest('button'));

    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      if (onButton) return;
      if (state.screen === 'start' || state.screen === 'lost' || state.screen === 'won') {
        event.preventDefault();
        beginRound();
        syncView();
      }
      return;
    }

    if (event.code === 'Space' || event.code === 'Escape') {
      if (event.code === 'Space' && onButton) return;
      if (state.screen === 'playing' || state.screen === 'paused') {
        event.preventDefault();
        togglePause();
      }
      return;
    }

    direction = directionFromCode(event.code);
    if (!direction || state.screen !== 'playing') return;
    event.preventDefault();
    if (controlMode !== 'keyboard') return;
    enqueueDirection(direction);
  }

  function bindCanvas(frame, paint) {
    var observer = new ResizeObserver(paint);
    observer.observe(frame);
    window.addEventListener('resize', paint);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', paint);
    window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)').addEventListener('change', paint);
  }

  function bindInput() {
    var tracking = false;
    var startX = 0;
    var startY = 0;

    startButton.addEventListener('click', function () {
      beginRound();
      syncView();
    });
    pauseButton.addEventListener('click', togglePause);
    resumeButton.addEventListener('click', togglePause);
    restartButton.addEventListener('click', function () {
      beginRound();
      syncView();
    });
    homeButton.addEventListener('click', showStart);
    touchControls.addEventListener('pointerdown', turnFromControl);
    touchControls.addEventListener('click', turnFromControl);
    touchControls.addEventListener('touchstart', function () {
      blockMouse = true;
    }, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state.screen === 'playing') {
        state.screen = 'paused';
        resetClock();
        syncView();
      }
    });

    boardFrame.addEventListener(
      'touchstart',
      function (event) {
        var target;
        blockMouse = true;
        if (state.screen !== 'playing' || event.touches.length !== 1) {
          tracking = false;
          return;
        }
        target = event.target;
        if (target instanceof Element && target.closest('button')) {
          tracking = false;
          return;
        }
        tracking = true;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
      },
      { passive: true },
    );

    boardFrame.addEventListener(
      'touchmove',
      function (event) {
        if (!tracking) return;
        event.preventDefault();
      },
      { passive: false },
    );

    boardFrame.addEventListener('touchend', function (event) {
      var touch;
      var direction;
      if (!tracking) return;
      tracking = false;
      touch = event.changedTouches[0];
      if (!touch) return;
      direction = directionFromSwipe(touch.clientX - startX, touch.clientY - startY);
      if (direction) enqueueDirection(direction);
    });

    boardFrame.addEventListener('touchcancel', function () {
      tracking = false;
    });

    boardCanvas.addEventListener('mousemove', function (event) {
      var point;
      if (blockMouse) {
        blockMouse = false;
        return;
      }
      if (controlMode !== 'mouse' || state.screen !== 'playing') return;
      point = eventToBoard(event);
      if (!point) return;
      mousePoint = point;
      mouseArmed = true;
    });

    boardCanvas.addEventListener('mouseleave', function () {
      disarmMouse();
    });

    var modeSwitches = document.querySelectorAll('.mode-switch');
    var modeIndex;
    for (modeIndex = 0; modeIndex < modeSwitches.length; modeIndex += 1) {
      modeSwitches[modeIndex].addEventListener('click', function (event) {
        var button = event.target.closest('[data-control-mode]');
        if (!button) return;
        setControlMode(button.getAttribute('data-control-mode'));
      });
    }

    if (coarseQuery.addEventListener) coarseQuery.addEventListener('change', applyPointerMode);
    else if (coarseQuery.addListener) coarseQuery.addListener(applyPointerMode);
  }

  memoryBest = loadBest();
  state.best = memoryBest;
  applyPointerMode();
  bindCanvas(previewFrame, paintPreview);
  bindCanvas(boardFrame, paintBoard);
  bindInput();
  syncView();
  requestAnimationFrame(onFrame);
})();
