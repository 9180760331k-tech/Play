import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GRID_SIZE, INITIAL_TICK_MS, MIN_TICK_MS, POINTS_PER_FOOD } from './config';
import { directionFromCode, directionFromSwipe } from './input';
import {
  createInitialState,
  enqueueDirection,
  freeCells,
  placeFood,
  sameCell,
  step,
  tickMsForFoodEaten,
} from './logic';
import { loadBestScore, saveBestScore } from './storage';
import type { GameState, Point } from './types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ],
    direction: 'right',
    queue: [],
    food: { x: 0, y: 0 },
    score: 0,
    foodEaten: 0,
    status: 'playing',
    tickMs: INITIAL_TICK_MS,
    ...overrides,
  };
}

function occupies(cells: readonly Point[], point: Point): boolean {
  return cells.some((cell) => sameCell(cell, point));
}

describe('начальная партия', () => {
  it('ставит змейку длины 3 у центра, смотрящую вправо', () => {
    const state = createInitialState(() => 0);
    assert.equal(state.snake.length, 3);
    assert.equal(state.direction, 'right');
    assert.equal(state.status, 'playing');
    assert.equal(state.score, 0);
    assert.deepEqual(state.queue, []);
    assert.equal(state.tickMs, INITIAL_TICK_MS);
    assert.deepEqual(state.snake[0], { x: 10, y: 9 });
    assert.equal(occupies(state.snake, state.food), false);
  });
});

describe('столкновения', () => {
  it('завершает игру у стены', () => {
    const next = step(
      makeState({
        snake: [
          { x: GRID_SIZE - 1, y: 5 },
          { x: GRID_SIZE - 2, y: 5 },
          { x: GRID_SIZE - 3, y: 5 },
        ],
        direction: 'right',
      }),
    );

    assert.equal(next.status, 'lost');
    assert.deepEqual(next.snake[0], { x: GRID_SIZE - 1, y: 5 });
  });

  it('завершает игру при столкновении с телом', () => {
    const next = step(
      makeState({
        direction: 'up',
        snake: [
          { x: 2, y: 2 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 3, y: 2 },
          { x: 3, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 1 },
        ],
        food: { x: 0, y: 0 },
      }),
    );

    assert.equal(next.status, 'lost');
  });
});

describe('клетка хвоста', () => {
  it('разрешает ход в клетку, которую хвост освобождает', () => {
    const state = makeState({
      direction: 'up',
      food: { x: 19, y: 19 },
      snake: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 1, y: 2 },
        { x: 0, y: 2 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    });

    const next = step(state);
    assert.equal(next.status, 'playing');
    assert.deepEqual(next.snake[0], { x: 1, y: 0 });
    assert.equal(next.snake.length, state.snake.length);
    assert.deepEqual(next.snake.at(-1), { x: 0, y: 0 });
  });
});

describe('еда', () => {
  it('ставит еду только на свободную клетку', () => {
    const occupied = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    assert.deepEqual(placeFood(occupied, () => 0), { x: 2, y: 0 });

    const food = placeFood(occupied, () => 1);
    assert.notEqual(food, null);
    assert.equal(occupies(occupied, food!), false);
    assert.deepEqual(food, { x: GRID_SIZE - 1, y: GRID_SIZE - 1 });
  });

  it('возвращает null, если свободных клеток нет', () => {
    const occupied = freeCells([]);
    assert.equal(occupied.length, GRID_SIZE * GRID_SIZE);
    assert.equal(placeFood(occupied, () => 0), null);
  });

  it('начисляет очки и удлиняет змейку', () => {
    const state = makeState({ food: { x: 6, y: 5 } });
    const next = step(state, () => 0);

    assert.equal(next.status, 'playing');
    assert.equal(next.score, POINTS_PER_FOOD);
    assert.equal(next.snake.length, state.snake.length + 1);
    assert.deepEqual(next.snake[0], { x: 6, y: 5 });
    assert.equal(occupies(next.snake, next.food), false);
    assert.equal(next.foodEaten, 1);
  });

  it('не меняет исходное состояние', () => {
    const state = makeState({ food: { x: 6, y: 5 } });
    const snake = state.snake;
    step(state, () => 0);
    assert.equal(state.snake, snake);
    assert.equal(state.score, 0);
    assert.deepEqual(state.snake[0], { x: 5, y: 5 });
  });
});

describe('заполнение поля', () => {
  it('объявляет победу, когда змейка занимает все клетки', () => {
    const food = { x: 19, y: 19 };
    const snake: Point[] = [{ x: 18, y: 19 }];

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if ((x === 19 && y === 19) || (x === 18 && y === 19)) continue;
        snake.push({ x, y });
      }
    }

    assert.equal(snake.length, GRID_SIZE * GRID_SIZE - 1);

    const next = step(makeState({ snake, food, direction: 'right' }), () => 0);
    assert.equal(next.status, 'won');
    assert.equal(next.snake.length, GRID_SIZE * GRID_SIZE);
    assert.equal(next.score, POINTS_PER_FOOD);
  });
});

describe('повороты', () => {
  it('запрещает разворот на 180° и повтор того же направления', () => {
    const state = makeState();
    assert.deepEqual(enqueueDirection(state, 'left').queue, []);
    assert.deepEqual(enqueueDirection(state, 'right').queue, []);
  });

  it('сравнивает новый ход с последним принятым, а не только с текущим', () => {
    const state = makeState();
    const queued = enqueueDirection(enqueueDirection(state, 'up'), 'down');
    assert.deepEqual(queued.queue, ['up']);

    const both = enqueueDirection(enqueueDirection(state, 'up'), 'left');
    assert.deepEqual(both.queue, ['up', 'left']);
    assert.deepEqual(enqueueDirection(both, 'down').queue, ['up', 'left']);
  });

  it('применяет не больше одного поворота за шаг', () => {
    const queued = enqueueDirection(enqueueDirection(makeState(), 'up'), 'left');
    const next = step(queued);

    assert.equal(next.direction, 'up');
    assert.deepEqual(next.queue, ['left']);
    assert.deepEqual(next.snake[0], { x: 5, y: 4 });
    assert.equal(next.status, 'playing');
  });

  it('не применяет разворот, даже если он оказался в очереди', () => {
    const next = step(makeState({ queue: ['left'] }));
    assert.equal(next.direction, 'right');
    assert.deepEqual(next.queue, []);
    assert.deepEqual(next.snake[0], { x: 6, y: 5 });
    assert.equal(next.status, 'playing');
  });

  it('не меняет очередь вне активной игры', () => {
    const paused = makeState({ status: 'paused' });
    assert.equal(enqueueDirection(paused, 'up'), paused);
  });
});

describe('скорость', () => {
  it('уменьшает интервал каждые 5 единиц еды, но не ниже минимума', () => {
    assert.equal(tickMsForFoodEaten(0), 150);
    assert.equal(tickMsForFoodEaten(4), 150);
    assert.equal(tickMsForFoodEaten(5), 140);
    assert.equal(tickMsForFoodEaten(10), 130);
    assert.equal(tickMsForFoodEaten(40), MIN_TICK_MS);
    assert.equal(tickMsForFoodEaten(80), MIN_TICK_MS);
  });

  it('ускоряется на шаге, когда съедена пятая еда', () => {
    const next = step(makeState({ food: { x: 6, y: 5 }, foodEaten: 4 }), () => 0);
    assert.equal(next.tickMs, 140);
    assert.equal(next.foodEaten, 5);
  });

  it('новая партия не наследует прежнюю скорость', () => {
    const fresh = createInitialState(() => 0);
    assert.equal(fresh.tickMs, INITIAL_TICK_MS);
    assert.equal(fresh.foodEaten, 0);
  });
});

describe('клавиши и свайп', () => {
  it('читает стрелки и WASD по физическому коду', () => {
    assert.equal(directionFromCode('ArrowUp'), 'up');
    assert.equal(directionFromCode('KeyW'), 'up');
    assert.equal(directionFromCode('KeyA'), 'left');
    assert.equal(directionFromCode('KeyS'), 'down');
    assert.equal(directionFromCode('KeyD'), 'right');
    assert.equal(directionFromCode('KeyQ'), null);
  });

  it('определяет направление свайпа', () => {
    assert.equal(directionFromSwipe(40, 5), 'right');
    assert.equal(directionFromSwipe(-40, 10), 'left');
    assert.equal(directionFromSwipe(4, 30), 'down');
    assert.equal(directionFromSwipe(0, -30), 'up');
    assert.equal(directionFromSwipe(10, 8), null);
  });
});

describe('рекорд', () => {
  it('читает число и отбрасывает повреждённые данные', () => {
    const store = new Map<string, string>();
    const previous = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: () => null,
      length: 0,
    };

    try {
      assert.equal(loadBestScore(), 0);
      saveBestScore(40);
      assert.equal(loadBestScore(), 40);

      store.set('snake-best-score', 'нет');
      assert.equal(loadBestScore(), 0);
      store.set('snake-best-score', '-5');
      assert.equal(loadBestScore(), 0);
      store.set('snake-best-score', '12.9');
      assert.equal(loadBestScore(), 12);
    } finally {
      globalThis.localStorage = previous;
    }
  });

  it('не падает, если хранилище недоступно', () => {
    const previous = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
      clear: () => {
        throw new Error('denied');
      },
      key: () => null,
      length: 0,
    };

    try {
      assert.equal(loadBestScore(), 0);
      assert.doesNotThrow(() => saveBestScore(15));
    } finally {
      globalThis.localStorage = previous;
    }
  });
});
