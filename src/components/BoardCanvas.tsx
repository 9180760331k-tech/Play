import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { directionFromSwipe } from '../game/input';
import { drawBoard } from '../game/render';
import type { Direction, Point } from '../game/types';

type BoardCanvasProps = {
  snake: readonly Point[];
  food: Point | null;
  direction: Direction;
  frameClassName?: string;
  onSwipe?: (direction: Direction) => void;
  children?: ReactNode;
};

export function BoardCanvas({
  snake,
  food,
  direction,
  frameClassName = 'board-frame',
  onSwipe,
  children,
}: BoardCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef({ snake, food, direction });
  const paintRef = useRef<() => void>(() => {});
  modelRef.current = { snake, food, direction };

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const paint = () => {
      const size = frame.clientWidth;
      if (size < 1) return;
      drawBoard(context, size, modelRef.current);
    };

    paintRef.current = paint;
    paint();

    const observer = new ResizeObserver(paint);
    observer.observe(frame);
    window.addEventListener('resize', paint);
    window.visualViewport?.addEventListener('resize', paint);
    const resolution = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    resolution.addEventListener('change', paint);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', paint);
      window.visualViewport?.removeEventListener('resize', paint);
      resolution.removeEventListener('change', paint);
    };
  }, []);

  useLayoutEffect(() => {
    paintRef.current();
  }, [snake, food, direction]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !onSwipe) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const stop = () => {
      tracking = false;
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        stop();
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest('button')) {
        stop();
        return;
      }
      tracking = true;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      event.preventDefault();
    };

    const onEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const next = directionFromSwipe(touch.clientX - startX, touch.clientY - startY);
      if (next) onSwipe(next);
    };

    frame.addEventListener('touchstart', onStart, { passive: true });
    frame.addEventListener('touchmove', onMove, { passive: false });
    frame.addEventListener('touchend', onEnd);
    frame.addEventListener('touchcancel', stop);

    return () => {
      frame.removeEventListener('touchstart', onStart);
      frame.removeEventListener('touchmove', onMove);
      frame.removeEventListener('touchend', onEnd);
      frame.removeEventListener('touchcancel', stop);
    };
  }, [onSwipe]);

  return (
    <div className={frameClassName} ref={frameRef}>
      <div className="board-canvas-clip">
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}
