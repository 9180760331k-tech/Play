import type { Direction } from '../game/types';

const CONTROLS: { direction: Direction; label: string; glyph: string }[] = [
  { direction: 'up', label: 'Вверх', glyph: '↑' },
  { direction: 'left', label: 'Влево', glyph: '←' },
  { direction: 'down', label: 'Вниз', glyph: '↓' },
  { direction: 'right', label: 'Вправо', glyph: '→' },
];

type TouchControlsProps = {
  disabled: boolean;
  onTurn: (direction: Direction) => void;
};

export function TouchControls({ disabled, onTurn }: TouchControlsProps) {
  return (
    <div className="dpad" role="group" aria-label="Направления">
      {CONTROLS.map((control) => (
        <button
          key={control.direction}
          className={`btn btn-direction dir-${control.direction}`}
          type="button"
          disabled={disabled}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            onTurn(control.direction);
          }}
          onClick={() => onTurn(control.direction)}
        >
          <span aria-hidden="true">{control.glyph}</span>
          <span className="sr-only">{control.label}</span>
        </button>
      ))}
    </div>
  );
}
