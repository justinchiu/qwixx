import {
  Color,
  DiceRoll,
  PlayerSheet,
  RowState,
  GameState,
  ROW_NUMBERS,
  SCORING,
} from './types.js';

export function createEmptySheet(): PlayerSheet {
  return {
    red: { marked: [], locked: false },
    yellow: { marked: [], locked: false },
    green: { marked: [], locked: false },
    blue: { marked: [], locked: false },
    penalties: 0,
  };
}

export function rollDice(): DiceRoll {
  const roll = () => Math.floor(Math.random() * 6) + 1;
  return {
    white1: roll(),
    white2: roll(),
    red: roll(),
    yellow: roll(),
    green: roll(),
    blue: roll(),
  };
}

export function getWhiteSum(dice: DiceRoll): number {
  return dice.white1 + dice.white2;
}

export function getColorSum(dice: DiceRoll, color: Color): number {
  return dice.white1 + dice.white2 + dice[color];
}

export function getAvailableWhiteSums(dice: DiceRoll): number[] {
  // White sum can be marked in any row
  return [getWhiteSum(dice)];
}

export function getAvailableColorSums(dice: DiceRoll): { color: Color; sum: number }[] {
  const colors: Color[] = ['red', 'yellow', 'green', 'blue'];
  return colors.map((color) => ({
    color,
    sum: dice.white1 + dice[color],
  })).concat(
    colors.map((color) => ({
      color,
      sum: dice.white2 + dice[color],
    }))
  );
}

export function canMarkNumber(
  sheet: PlayerSheet,
  color: Color,
  number: number,
  globallyLocked: Color[]
): boolean {
  const row = sheet[color];
  const rowNumbers = ROW_NUMBERS[color];

  // Can't mark if row is locked (globally or by player)
  if (row.locked || globallyLocked.includes(color)) {
    return false;
  }

  // Check if number is valid for this row
  const numberIndex = rowNumbers.indexOf(number);
  if (numberIndex === -1) {
    return false;
  }

  // Check if number is already marked
  if (row.marked.includes(number)) {
    return false;
  }

  // Find the rightmost marked number's index
  let rightmostMarkedIndex = -1;
  for (const marked of row.marked) {
    const idx = rowNumbers.indexOf(marked);
    if (idx > rightmostMarkedIndex) {
      rightmostMarkedIndex = idx;
    }
  }

  // New number must be to the right of all marked numbers
  if (numberIndex <= rightmostMarkedIndex) {
    return false;
  }

  // To mark the last number (index 10), must have at least 5 marks already
  if (numberIndex === 10 && row.marked.length < 5) {
    return false;
  }

  return true;
}

export function markNumber(
  sheet: PlayerSheet,
  color: Color,
  number: number
): PlayerSheet {
  const newSheet = structuredClone(sheet);
  newSheet[color].marked.push(number);

  // Check if this locks the row (marking the last number)
  const rowNumbers = ROW_NUMBERS[color];
  const lastNumber = rowNumbers[rowNumbers.length - 1];
  if (number === lastNumber) {
    newSheet[color].locked = true;
  }

  return newSheet;
}

export function addPenalty(sheet: PlayerSheet): PlayerSheet {
  const newSheet = structuredClone(sheet);
  newSheet.penalties += 1;
  return newSheet;
}

export function calculateRowScore(row: RowState): number {
  // If locked, the lock counts as an additional mark
  const marks = row.locked ? row.marked.length + 1 : row.marked.length;
  return SCORING[marks] || 0;
}

export function calculateScore(sheet: PlayerSheet): number {
  const redScore = calculateRowScore(sheet.red);
  const yellowScore = calculateRowScore(sheet.yellow);
  const greenScore = calculateRowScore(sheet.green);
  const blueScore = calculateRowScore(sheet.blue);
  const penaltyScore = sheet.penalties * -5;

  return redScore + yellowScore + greenScore + blueScore + penaltyScore;
}

export function isGameOver(state: GameState): boolean {
  // Game ends if 2 rows are locked globally
  if (state.lockedRows.length >= 2) {
    return true;
  }

  // Game ends if any player has 4 penalties
  for (const player of state.players) {
    if (player.sheet.penalties >= 4) {
      return true;
    }
  }

  return false;
}

export function getValidWhiteMarks(
  sheet: PlayerSheet,
  dice: DiceRoll,
  globallyLocked: Color[]
): { color: Color; number: number }[] {
  const whiteSum = getWhiteSum(dice);
  const colors: Color[] = ['red', 'yellow', 'green', 'blue'];
  const validMarks: { color: Color; number: number }[] = [];

  for (const color of colors) {
    if (canMarkNumber(sheet, color, whiteSum, globallyLocked)) {
      validMarks.push({ color, number: whiteSum });
    }
  }

  return validMarks;
}

export function getValidColorMarks(
  sheet: PlayerSheet,
  dice: DiceRoll,
  globallyLocked: Color[]
): { color: Color; number: number }[] {
  const colors: Color[] = ['red', 'yellow', 'green', 'blue'];
  const validMarks: { color: Color; number: number }[] = [];

  for (const color of colors) {
    // Can use white1 + colored die or white2 + colored die
    const sum1 = dice.white1 + dice[color];
    const sum2 = dice.white2 + dice[color];

    if (canMarkNumber(sheet, color, sum1, globallyLocked)) {
      validMarks.push({ color, number: sum1 });
    }
    if (sum1 !== sum2 && canMarkNumber(sheet, color, sum2, globallyLocked)) {
      validMarks.push({ color, number: sum2 });
    }
  }

  return validMarks;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
