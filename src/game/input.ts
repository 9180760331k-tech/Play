import type { Direction } from './types';

/** Физические клавиши: стрелки и WASD остаются на своих местах при русской раскладке. */
export function directionFromCode(code: string): Direction | null {
  switch (code) {
    case 'ArrowUp':
    case 'KeyW':
      return 'up';
    case 'ArrowDown':
    case 'KeyS':
      return 'down';
    case 'ArrowLeft':
    case 'KeyA':
      return 'left';
    case 'ArrowRight':
    case 'KeyD':
      return 'right';
    default:
      return null;
  }
}

export function directionFromSwipe(dx: number, dy: number, threshold = 24): Direction | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) < threshold) return null;
  if (absX > absY) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
