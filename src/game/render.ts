import { GRID_SIZE } from './config';
import type { Direction, Point } from './types';

export type DrawModel = {
  snake: readonly Point[];
  food: Point | null;
  direction: Direction;
};

type Palette = {
  board: string;
  grid: string;
  accent: string;
  head: string;
  food: string;
  eye: string;
};

const FALLBACK: Palette = {
  board: '#10182A',
  grid: 'rgba(245, 247, 251, 0.06)',
  accent: '#8CF5C2',
  head: '#D9FFEE',
  food: '#FF7D87',
  eye: '#0B1020',
};

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    board: pick('--color-board', FALLBACK.board),
    grid: pick('--color-grid', FALLBACK.grid),
    accent: pick('--color-accent', FALLBACK.accent),
    head: pick('--color-head', FALLBACK.head),
    food: pick('--color-food', FALLBACK.food),
    eye: pick('--color-bg', FALLBACK.eye),
  };
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  point: Point,
  direction: Direction,
  cell: number,
  color: string,
) {
  const cx = point.x * cell + cell / 2;
  const cy = point.y * cell + cell / 2;
  const forwardX = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
  const forwardY = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
  const sideX = -forwardY;
  const sideY = forwardX;
  const forward = cell * 0.16;
  const side = cell * 0.15;
  const radius = Math.max(0.8, cell * 0.07);

  ctx.fillStyle = color;
  for (const sign of [-1, 1]) {
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

export function drawBoard(ctx: CanvasRenderingContext2D, cssSize: number, model: DrawModel) {
  const dpr = window.devicePixelRatio || 1;
  const pixels = Math.max(1, Math.round(cssSize * dpr));
  const canvas = ctx.canvas;

  if (canvas.width !== pixels || canvas.height !== pixels) {
    canvas.width = pixels;
    canvas.height = pixels;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const palette = readPalette();
  const cell = cssSize / GRID_SIZE;

  ctx.clearRect(0, 0, cssSize, cssSize);
  ctx.fillStyle = palette.board;
  ctx.fillRect(0, 0, cssSize, cssSize);

  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let index = 1; index < GRID_SIZE; index += 1) {
    const line = index * cell;
    ctx.moveTo(line, 0);
    ctx.lineTo(line, cssSize);
    ctx.moveTo(0, line);
    ctx.lineTo(cssSize, line);
  }
  ctx.stroke();

  if (model.food) {
    const cx = model.food.x * cell + cell / 2;
    const cy = model.food.y * cell + cell / 2;
    const radius = cell * 0.28;
    ctx.save();
    ctx.fillStyle = palette.food;
    ctx.shadowColor = palette.food;
    ctx.shadowBlur = cell * 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  model.snake.forEach((part, index) => {
    if (index === 0) return;
    const pad = cell * 0.16;
    ctx.fillStyle = palette.accent;
    fillRoundRect(
      ctx,
      part.x * cell + pad,
      part.y * cell + pad,
      cell - pad * 2,
      cell - pad * 2,
      cell * 0.28,
    );
  });

  const head = model.snake[0];
  if (!head) return;

  const headPad = cell * 0.07;
  ctx.fillStyle = palette.head;
  fillRoundRect(
    ctx,
    head.x * cell + headPad,
    head.y * cell + headPad,
    cell - headPad * 2,
    cell - headPad * 2,
    cell * 0.36,
  );
  drawEyes(ctx, head, model.direction, cell, palette.eye);
}
