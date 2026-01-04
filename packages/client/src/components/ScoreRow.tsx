import { Color, ROW_NUMBERS, RowState } from '@qwixx/shared';

interface ScoreRowProps {
  color: Color;
  row: RowState;
  availableNumbers: number[];
  onMark: (number: number) => void;
  globallyLocked: boolean;
  pendingNumber: number | null;
}

export function ScoreRow({ color, row, availableNumbers, onMark, globallyLocked, pendingNumber }: ScoreRowProps) {
  const numbers = ROW_NUMBERS[color];
  const isLocked = row.locked || globallyLocked;

  return (
    <div className={`score-row score-row-${color} ${isLocked ? 'locked' : ''}`}>
      {numbers.map((num) => {
        const isMarked = row.marked.includes(num);
        const isPending = pendingNumber === num;
        const isAvailable = !isMarked && !isLocked && availableNumbers.includes(num);
        const isLastNumber = num === numbers[numbers.length - 1];

        return (
          <button
            key={num}
            className={`score-cell ${isMarked ? 'marked' : ''} ${isPending ? 'pending' : ''} ${isAvailable ? 'available' : ''} ${isLastNumber ? 'last-number' : ''}`}
            onClick={() => isAvailable && onMark(num)}
            disabled={!isAvailable}
          >
            {num}
            {isMarked && <span className="mark">X</span>}
            {isPending && <span className="mark pending-mark">?</span>}
          </button>
        );
      })}
      <div className={`lock-cell ${isLocked ? 'locked' : ''}`}>
        {isLocked ? '🔒' : ''}
      </div>
    </div>
  );
}
