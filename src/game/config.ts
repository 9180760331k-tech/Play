/** Сторона поля в клетках. */
export const GRID_SIZE = 20;

/** Длина змейки в начале партии. Хвост должен помещаться левее головы. */
export const INITIAL_LENGTH = 3;

/** Интервал шага в начале партии, мс. */
export const INITIAL_TICK_MS = 150;

/** Нижний предел интервала шага, мс. */
export const MIN_TICK_MS = 70;

/** На сколько миллисекунд ускоряется игра после очередной порции еды. */
export const TICK_STEP_MS = 10;

/** Сколько единиц еды нужно съесть, чтобы ускориться один раз. */
export const FOODS_PER_SPEEDUP = 5;

/** Очки за одну единицу еды. */
export const POINTS_PER_FOOD = 10;

/** Сколько поворотов можно накопить между шагами. */
export const MAX_INPUT_QUEUE = 2;

/** Ключ рекорда в localStorage. */
export const BEST_SCORE_STORAGE_KEY = 'snake-best-score';
