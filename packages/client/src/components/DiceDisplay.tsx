import { DiceRoll } from '@qwixx/shared';

interface DiceDisplayProps {
  dice: DiceRoll | null;
}

export function DiceDisplay({ dice }: DiceDisplayProps) {
  if (!dice) {
    return <div className="dice-display">Waiting for roll...</div>;
  }

  const whiteSum = dice.white1 + dice.white2;

  return (
    <div className="dice-display">
      <div className="dice-row">
        <div className="dice white">{dice.white1}</div>
        <div className="dice white">{dice.white2}</div>
        <span className="sum">= {whiteSum}</span>
      </div>
      <div className="dice-row">
        <div className="dice red">{dice.red}</div>
        <div className="dice yellow">{dice.yellow}</div>
        <div className="dice green">{dice.green}</div>
        <div className="dice blue">{dice.blue}</div>
      </div>
      <div className="dice-sums">
        <span className="sum-label">White + Color:</span>
        <span className="sum red">{dice.white1 + dice.red} or {dice.white2 + dice.red}</span>
        <span className="sum yellow">{dice.white1 + dice.yellow} or {dice.white2 + dice.yellow}</span>
        <span className="sum green">{dice.white1 + dice.green} or {dice.white2 + dice.green}</span>
        <span className="sum blue">{dice.white1 + dice.blue} or {dice.white2 + dice.blue}</span>
      </div>
    </div>
  );
}
