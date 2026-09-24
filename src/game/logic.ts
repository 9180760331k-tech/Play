import {
  FOODS_PER_SPEEDUP,
  GRID_SIZE,
  INITIAL_LENGTH,
  INITIAL_TICK_MS,
  MAX_INPUT_QUEUE,
  MIN_TICK_MS,
  POINTS_PER_FOOD,
  TICK_STEP_MS,
} from './config';
import type { Direction, GameState, Point } from './types';

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b;
}

export function sameCell(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function tickMsForFoodEaten(foodEaten: number): number {
  const stages = Math.floor(Math.max(0, foodEaten) / FOODS_PER_SPEEDUP);
  return Math.max(MIN_TICK_MS, INITIAL_TICK_MS - stages * TICK_STEP_MS);
}

export function createInitialSnake(): Point[] {
  const y = Math.floor((GRID_SIZE - 1) / 2);
  const headX = Math.floor(GRID_SIZE / 2);
  const snake: Point[] = [];

  for (let index = 0; index < INITIAL_LENGTH; index += 1) {
    const x = headX - index;
    if (x < 0 || x >= GRID_SIZE) break;
    snake.push({ x, y });
  }

  return snake;
}

/** Свободные клетки в порядке обхода слева направо, сверху вниз. */
export function freeCells(occupied: readonly Point[]): Point[] {
  const taken = new Set(occupied.map((cell) => `${cell.x},${cell.y}`));
  const free: Point[] = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }

  return free;
}

export function placeFood(occupied: readonly Point[], rng: () => number = Math.random): Point | null {
  const free = freeCells(occupied);
  if (free.length === 0) return null;
  const index = Math.min(free.length - 1, Math.floor(rng() * free.length));
  return free[index];
}

export function createInitialState(rng: () => number = Math.random): GameState {
  const snake = createInitialSnake();
  const food = placeFood(snake, rng);

  if (!food) {
    return {
      snake,
      direction: 'right',
      queue: [],
      food: { x: 0, y: 0 },
      score: 0,
      foodEaten: 0,
      status: 'won',
      tickMs: INITIAL_TICK_MS,
    };
  }

  return {
    snake,
    direction: 'right',
    queue: [],
    food,
    score: 0,
    foodEaten: 0,
    status: 'playing',
    tickMs: INITIAL_TICK_MS,
  };
}

/**
 * Ставит поворот в очередь. Новый ход сравнивается с последним уже принятым
 * направлением: текущим, если очередь пуста, иначе с последним в очереди.
 * Разворот на 180° и повтор того же направления отбрасываются.
 */
export function enqueueDirection(state: GameState, next: Direction): GameState {
  if (state.status !== 'playing') return state;

  const last = state.queue.length > 0 ? state.queue[state.queue.length - 1] : state.direction;
  if (next === last || isOpposite(next, last)) return state;
  if (state.queue.length >= MAX_INPUT_QUEUE) return state;

  return { ...state, queue: [...state.queue, next] };
}

function outside(point: Point): boolean {
  return point.x < 0 || point.y < 0 || point.x >= GRID_SIZE || point.y >= GRID_SIZE;
}

/**
 * Один игровой шаг. За шаг применяется не больше одного поворота.
 * Клетка, которую хвост освобождает на этом шаге, не считается столкновением.
 */
export function step(state: GameState, rng: () => number = Math.random): GameState {
  if (state.status !== 'playing') return state;

  let direction = state.direction;
  let queue = state.queue;

  if (queue.length > 0) {
    const [next, ...rest] = queue;
    queue = rest;
    if (next !== direction && !isOpposite(next, direction)) {
      direction = next;
    }
  }

  const head = state.snake[0];
  const delta = DELTA[direction];
  const nextHead = { x: head.x + delta.x, y: head.y + delta.y };

  if (outside(nextHead)) {
    return { ...state, direction, queue, status: 'lost' };
  }

  const eating = sameCell(nextHead, state.food);
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (body.some((part) => sameCell(part, nextHead))) {
    return { ...state, direction, queue, status: 'lost' };
  }

  const snake = eating ? [nextHead, ...state.snake] : [nextHead, ...state.snake.slice(0, -1)];

  if (!eating) {
    return { ...state, snake, direction, queue };
  }

  const foodEaten = state.foodEaten + 1;
  const score = state.score + POINTS_PER_FOOD;
  const tickMs = tickMsForFoodEaten(foodEaten);
  const grown: GameState = {
    ...state,
    snake,
    direction,
    queue,
    score,
    foodEaten,
    tickMs,
  };

  if (snake.length >= GRID_SIZE * GRID_SIZE) {
    return { ...grown, status: 'won' };
  }

  const food = placeFood(snake, rng);
  if (!food) {
    return { ...grown, status: 'won' };
  }

  return { ...grown, food };
}
