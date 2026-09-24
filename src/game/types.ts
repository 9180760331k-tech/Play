export type Direction = 'up' | 'down' | 'left' | 'right';

/** Состояние запущенной партии. Стартовый экран живёт отдельно, пока партии нет. */
export type SessionStatus = 'playing' | 'paused' | 'lost' | 'won';

export type ScreenStatus = 'start' | SessionStatus;

export type Point = {
  x: number;
  y: number;
};

export type GameState = {
  snake: Point[];
  direction: Direction;
  queue: Direction[];
  food: Point;
  score: number;
  foodEaten: number;
  status: SessionStatus;
  tickMs: number;
};
