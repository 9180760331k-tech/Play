import { GameScreen } from './components/GameScreen';
import { StartScreen } from './components/StartScreen';
import { useCoarsePointer } from './hooks/useCoarsePointer';
import { useSnakeGame } from './hooks/useSnakeGame';

export function App() {
  const game = useSnakeGame();
  const coarse = useCoarsePointer();

  return (
    <main className="app">
      <div className="shell">
        {game.status === 'start' ? (
          <StartScreen best={game.best} coarse={coarse} onStart={game.start} />
        ) : (
          <GameScreen game={game} coarse={coarse} />
        )}
      </div>
    </main>
  );
}
