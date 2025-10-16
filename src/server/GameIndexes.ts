import { ClassicSpinGame } from './Games/ClassicSpinGame/ClassicSpinGame';
import { CascadeSpinGame } from './Games/CascadeSpinGame';

export enum GameIndexes {
    "ClassicSpinGame" = 0,
    "CascadeSpinGame" = 1,
}

// Game registry mapping enum values to game classes
export const gameRegistry = new Map<GameIndexes, new () => any>([
    [GameIndexes.ClassicSpinGame, ClassicSpinGame],
    [GameIndexes.CascadeSpinGame, CascadeSpinGame]
]);

// Factory function to create game instances
export function createGame(gameIndex: GameIndexes): any {
    const GameClass = gameRegistry.get(gameIndex);
    if (!GameClass) {
        throw new Error(`Game with index ${gameIndex} not found`);
    }
    return new GameClass();
}

// Get all available game classes
export const gamesList = [
    ClassicSpinGame,
    CascadeSpinGame
];