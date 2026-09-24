import { useEffect, useRef } from 'react';
import type { ScreenStatus } from '../game/types';

type PauseOverlayProps = {
  onResume: () => void;
};

export function PauseOverlay({ onResume }: PauseOverlayProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div className="overlay">
      <div className="overlay-card">
        <h2>Пауза</h2>
        <button ref={buttonRef} className="btn btn-primary" type="button" onClick={onResume}>
          Продолжить
        </button>
      </div>
    </div>
  );
}

type ResultOverlayProps = {
  status: Extract<ScreenStatus, 'lost' | 'won'>;
  score: number;
  best: number;
  isNewRecord: boolean;
  onRestart: () => void;
  onHome: () => void;
};

export function ResultOverlay({
  status,
  score,
  best,
  isNewRecord,
  onRestart,
  onHome,
}: ResultOverlayProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div className="overlay">
      <div className="overlay-card" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">{status === 'won' ? 'Поле пройдено!' : 'Игра окончена'}</h2>
        <dl className="result-stats">
          <div>
            <dt>Итоговый счёт</dt>
            <dd>{score}</dd>
          </div>
          <div>
            <dt>Лучший результат</dt>
            <dd>{best}</dd>
          </div>
        </dl>
        {isNewRecord ? <p className="record-banner">Новый рекорд!</p> : null}
        <div className="stack">
          <button ref={buttonRef} className="btn btn-primary" type="button" onClick={onRestart}>
            Играть снова
          </button>
          <button className="btn btn-secondary" type="button" onClick={onHome}>
            На главный экран
          </button>
        </div>
      </div>
    </div>
  );
}
