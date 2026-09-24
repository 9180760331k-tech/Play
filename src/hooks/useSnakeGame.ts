import { useCallback, useEffect, useRef, useState } from 'react';
import { directionFromCode } from '../game/input';
import { createInitialState, enqueueDirection, step } from '../game/logic';
import { loadBestScore, saveBestScore } from '../game/storage';
import type { Direction, GameState, Point, ScreenStatus } from '../game/types';

/** Не догоняем длинную паузу кадра: после настоящей паузы цикл и так создаётся заново. */
const MAX_FRAME_DELTA_MS = 250;
const MAX_STEPS_PER_FRAME = 8;

export type SnakeView = {
  status: ScreenStatus;
  score: number;
  best: number;
  snake: Point[];
  food: Point | null;
  direction: Direction;
  isNewRecord: boolean;
};

function createView(): SnakeView {
  return {
    status: 'start',
    score: 0,
    best: loadBestScore(),
    snake: [],
    food: null,
    direction: 'right',
    isNewRecord: false,
  };
}

export function useSnakeGame() {
  const [view, setView] = useState<SnakeView>(createView);
  const stateRef = useRef<GameState | null>(null);
  const bestRef = useRef(view.best);
  const screenRef = useRef<ScreenStatus>(view.status);

  const publish = useCallback((state: GameState | null, patch?: Partial<SnakeView>) => {
    if (!state) {
      screenRef.current = 'start';
      setView((prev) => ({
        ...prev,
        status: 'start',
        score: 0,
        snake: [],
        food: null,
        direction: 'right',
        isNewRecord: false,
        best: bestRef.current,
        ...patch,
      }));
      return;
    }

    screenRef.current = state.status;
    setView((prev) => ({
      ...prev,
      status: state.status,
      score: state.score,
      snake: state.snake,
      food: state.food,
      direction: state.direction,
      best: bestRef.current,
      ...patch,
      isNewRecord: patch?.isNewRecord ?? prev.isNewRecord,
    }));
  }, []);

  const conclude = useCallback(
    (state: GameState) => {
      const isNewRecord = state.score > bestRef.current;
      if (isNewRecord) {
        bestRef.current = state.score;
        saveBestScore(state.score);
      }
      stateRef.current = state;
      publish(state, { isNewRecord });
    },
    [publish],
  );

  const start = useCallback(() => {
    const next = createInitialState();
    stateRef.current = next;
    publish(next, { isNewRecord: false });
  }, [publish]);

  const goHome = useCallback(() => {
    stateRef.current = null;
    publish(null);
  }, [publish]);

  const togglePause = useCallback(() => {
    const current = stateRef.current;
    if (!current || (current.status !== 'playing' && current.status !== 'paused')) return;
    const next: GameState = {
      ...current,
      status: current.status === 'playing' ? 'paused' : 'playing',
    };
    stateRef.current = next;
    publish(next);
  }, [publish]);

  const turn = useCallback((direction: Direction) => {
    const current = stateRef.current;
    if (!current) return;
    stateRef.current = enqueueDirection(current, direction);
  }, []);

  useEffect(() => {
    if (view.status !== 'playing') return;

    let last = performance.now();
    let accumulator = 0;
    let frameId = 0;
    let active = true;

    const frame = (now: number) => {
      if (!active) return;
      const current = stateRef.current;
      if (!current || current.status !== 'playing') return;

      accumulator += Math.min(MAX_FRAME_DELTA_MS, Math.max(0, now - last));
      last = now;

      let steps = 0;
      while (active && stateRef.current?.status === 'playing' && steps < MAX_STEPS_PER_FRAME) {
        const tick = stateRef.current.tickMs;
        if (tick <= 0 || accumulator < tick) break;
        accumulator -= tick;
        const next = step(stateRef.current);
        stateRef.current = next;
        steps += 1;
        if (next.status !== 'playing') {
          conclude(next);
          return;
        }
      }

      if (steps > 0 && active && stateRef.current) {
        publish(stateRef.current);
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [view.status, conclude, publish]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const onButton = Boolean(target?.closest('button'));
      const status = screenRef.current;

      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        if (onButton) return;
        if (status === 'start' || status === 'lost' || status === 'won') {
          event.preventDefault();
          start();
        }
        return;
      }

      if (event.code === 'Space' || event.code === 'Escape') {
        if (event.code === 'Space' && onButton) return;
        if (status === 'playing' || status === 'paused') {
          event.preventDefault();
          togglePause();
        }
        return;
      }

      const direction = directionFromCode(event.code);
      if (!direction || status !== 'playing') return;
      event.preventDefault();
      turn(direction);
    };

    const onVisibility = () => {
      if (document.hidden && stateRef.current?.status === 'playing') {
        const next: GameState = { ...stateRef.current, status: 'paused' };
        stateRef.current = next;
        publish(next);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [publish, start, togglePause, turn]);

  return {
    ...view,
    start,
    goHome,
    togglePause,
    turn,
  };
}

export type SnakeGame = ReturnType<typeof useSnakeGame>;
