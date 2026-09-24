import { useEffect, useRef } from 'react';
import { BoardCanvas } from './BoardCanvas';
import type { Direction } from '../game/types';

const PREVIEW: {
  snake: { x: number; y: number }[];
  food: { x: number; y: number };
  direction: Direction;
} = {
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

type StartScreenProps = {
  best: number;
  coarse: boolean;
  onStart: () => void;
};

export function StartScreen({ best, coarse, onStart }: StartScreenProps) {
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startRef.current?.focus();
  }, []);

  return (
    <section className="card start-screen">
      <header className="start-copy">
        <h1>Змейка</h1>
        <p className="lede">Собирай. Расти. Побей свой рекорд</p>
      </header>

      <div className="preview-wrap" aria-hidden="true">
        <BoardCanvas
          snake={PREVIEW.snake}
          food={PREVIEW.food}
          direction={PREVIEW.direction}
          frameClassName="board-frame preview-frame"
        />
      </div>

      <button ref={startRef} className="btn btn-primary" type="button" onClick={onStart}>
        Начать игру
      </button>

      <p className="record">
        {best > 0 ? `Рекорд: ${best}` : 'Рекорд ещё не установлен'}
      </p>
      <p className="hint">
        {coarse
          ? 'Свайп по полю или кнопки направлений. Кнопка «Пауза» останавливает игру.'
          : 'Стрелки или WASD — движение. Пробел или Esc — пауза. Enter — старт.'}
      </p>
    </section>
  );
}
