import { BoardCanvas } from './BoardCanvas';
import { PauseOverlay, ResultOverlay } from './Overlays';
import { TouchControls } from './TouchControls';
import type { SnakeGame } from '../hooks/useSnakeGame';

type GameScreenProps = {
  game: SnakeGame;
  coarse: boolean;
};

export function GameScreen({ game, coarse }: GameScreenProps) {
  const playing = game.status === 'playing';
  const paused = game.status === 'paused';
  const finished = game.status === 'lost' || game.status === 'won';

  const announcement =
    game.status === 'paused'
      ? 'Пауза'
      : game.status === 'lost'
        ? `Игра окончена. Счёт ${game.score}. Лучший результат ${game.best}.${game.isNewRecord ? ' Новый рекорд!' : ''}`
        : game.status === 'won'
          ? `Поле пройдено! Счёт ${game.score}. Лучший результат ${game.best}.${game.isNewRecord ? ' Новый рекорд!' : ''}`
          : '';

  return (
    <section className={coarse ? 'card game-screen has-touch' : 'card game-screen'}>
      <h1 className="sr-only">Змейка</h1>
      <div className="hud">
        <div className="hud-stats">
          <p className="stat">
            <span className="stat-label">Счёт</span>
            <span className="stat-value accent">{game.score}</span>
          </p>
          <p className="stat">
            <span className="stat-label">Рекорд</span>
            <span className="stat-value">{game.best}</span>
          </p>
        </div>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={game.togglePause}
          disabled={finished}
          aria-pressed={paused}
        >
          {paused ? 'Продолжить' : 'Пауза'}
        </button>
      </div>

      <BoardCanvas
        snake={game.snake}
        food={game.food}
        direction={game.direction}
        onSwipe={playing ? game.turn : undefined}
      >
        {paused ? <PauseOverlay onResume={game.togglePause} /> : null}
        {game.status === 'lost' || game.status === 'won' ? (
          <ResultOverlay
            status={game.status}
            score={game.score}
            best={game.best}
            isNewRecord={game.isNewRecord}
            onRestart={game.start}
            onHome={game.goHome}
          />
        ) : null}
      </BoardCanvas>

      <p className="hint">
        {coarse
          ? 'Свайп по полю или кнопки ниже. Кнопка «Пауза» останавливает игру.'
          : 'Стрелки или WASD — ход. Пробел или Esc — пауза.'}
      </p>

      {coarse ? <TouchControls disabled={!playing} onTurn={game.turn} /> : null}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
