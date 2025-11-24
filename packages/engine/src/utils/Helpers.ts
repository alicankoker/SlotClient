import { IReelMode } from "../reels/ReelController";
import { GameConfig } from "@slotclient/config/GameConfig";
import { Point } from "pixi.js";
import { ISpinState } from "../types/ISpinConfig";

export class Helpers {
  public static getReelModeBySpinState(spinState: ISpinState): IReelMode {
    switch (spinState) {
      case ISpinState.IDLE:
        return IReelMode.STATIC;
      case ISpinState.SPINNING:
        return IReelMode.SPINNING;
      case ISpinState.SPEEDING:
        return IReelMode.SPEEDING;
      case ISpinState.SLOWING:
        return IReelMode.SLOWING;
      case ISpinState.STOPPING:
        return IReelMode.STOPPING;
      case ISpinState.STARTING:
        return IReelMode.STARTING;
      case ISpinState.PAUSED:
        return IReelMode.PAUSED;
      case ISpinState.RESUMING:
        return IReelMode.RESUMING;
      case ISpinState.STOPPED:
        return IReelMode.STOPPED;
      case ISpinState.STARTED:
        return IReelMode.STARTED;
      case ISpinState.CASCADING:
        return IReelMode.CASCADING;
      default:
        return IReelMode.STATIC;
    }
  }

  public static copyToClipboard(text: string): Promise<void> {
    // Modern approach
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    // For older browsers
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);

      input.select();
      input.setSelectionRange(0, input.value.length); // for iOS

      const success = document.execCommand("copy");

      document.body.removeChild(input);

      if (success) resolve();
      else reject(new Error("execCommand('copy') failed"));
    });
  }

  /**
   * @description Calculate the X position of a symbol in the grid.
   * @param column The column index of the symbol.
   * @param maxColumn The maximum number of columns in the grid.
   * @param referenceX The reference X position to calculate from.
   * @param gapX The gap between symbols in the X direction.
   * @returns The calculated X position of the symbol.
   */
  public static calculateSymbolX(column: number = 0, maxColumn: number, referenceX: number, gapX?: number): number {
    const symbolWidth = GameConfig.REFERENCE_SPRITE_SYMBOL.width;

    const spacingX = gapX ?? GameConfig.REFERENCE_SPACING.horizontal;

    const reelX = (((column - Math.floor(maxColumn / 2)) * (symbolWidth + spacingX)) + referenceX) + ((maxColumn % 2 == 0) ? (symbolWidth + spacingX) / 2 : 0);

    return reelX;
  }

  /**
   * @description Calculate the Y position of a symbol in the grid.
   * @param row The row index of the symbol.
   * @param maxRow The maximum number of rows in the grid.
   * @param referenceY The reference Y position to calculate from.
   * @param gapY The gap between symbols in the Y direction.
   * @returns The calculated Y position of the symbol.
   */
  public static calculateSymbolY(row: number, maxRow: number, referenceY: number, gapY?: number): number {
    const symbolHeight = GameConfig.REFERENCE_SPRITE_SYMBOL.height;

    const spacingY = gapY ?? GameConfig.REFERENCE_SPACING.vertical;

    const symbolY = (((row - Math.floor(maxRow / 2)) * (symbolHeight + spacingY)) + referenceY) + ((maxRow % 2 == 0) ? (symbolHeight + spacingY) / 2 : 0);

    return symbolY;
  }

  /**
   * @description Create a grid of positions for symbols.
   * @param maxColumn The maximum number of columns in the grid.
   * @param maxRow The maximum number of rows in the grid.
   * @param referenceX The reference X position to calculate from.
   * @param referenceY The reference Y position to calculate from.
   * @param gapX The gap between symbols in the X direction.
   * @param gapY The gap between symbols in the Y direction.
   * @returns An array of positions for the symbols in the grid.
   */
  public static createGrid(maxColumn: number, maxRow: number, referenceX: number, referenceY: number, gapX?: number, gapY?: number): { x: number; y: number }[] {
    const grid: { x: number; y: number }[] = [];

    for (let col = 0; col < maxColumn; col++) {
      for (let row = 0; row < maxRow; row++) {
        const x = this.calculateSymbolX(col, maxColumn, referenceX, gapX);
        const y = this.calculateSymbolY(row, maxRow, referenceY, gapY);
        grid.push({ x, y });
      }
    }

    return grid;
  }

  /**
   * @description Convert an amount or array of amounts to a decimal string representation.
   * @param amount The amount to convert.
   * @param denomination The denomination to divide the amount by (default is 100).
   * @param digit The number of decimal places to include in the result (default is 2).
   * @returns {string} The converted amount or array of amounts as a string.
   */
  public static convertToDecimal(amount: number | number[], denomination: number = 1, digit: number = 2): string | string[] {
    let convertedAmountArray: number[] = [];
    let convertedAmount: number;

    if (typeof amount === "object" || Array.isArray(amount)) {
      amount.forEach((element) => {
        convertedAmount = element / denomination;

        if (isNaN(convertedAmount)) {
          throw new Error("Invalid amount or denomination");
        } else if (digit < 0) {
          throw new Error("Digit must be a non-negative integer");
        }

        convertedAmountArray.push(convertedAmount);
      });

      return convertedAmountArray.map((value) => value.toFixed(digit));
    } else {
      convertedAmount = amount / denomination;

      if (isNaN(convertedAmount)) {
        throw new Error("Invalid amount or denomination");
      } else if (digit < 0) {
        throw new Error("Digit must be a non-negative integer");
      }

      return convertedAmount.toFixed(digit);
    }
  }

  /**
   * @description Returns a promise that resolves after a specified delay.
   * @param ms The delay duration in milliseconds.
   * @param signal An optional AbortSignal to cancel the delay.
   * @returns A promise that resolves after the delay.
   */
  public static delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => resolve(), ms);

      if (signal) {
        if (signal.aborted) {
          clearTimeout(id);
          resolve();
          return;
        }

        signal.addEventListener("abort", () => {
          clearTimeout(id);
          resolve();
        }, { once: true });
      }
    });
  }

  /**
   * @description Generates a path for an arc.
   * @param radius Radius of the arc
   * @param degree Total angle (in degrees)
   * @param segments How many segments to divide the arc into (default is 360)
   * @returns Array of points representing the arc path
   */
  public static generateArcPath(radius: number, degree: number, segments: number = 360): Point[] {
    const points: Point[] = [];
    const radStep = (degree * Math.PI / 180) / segments; // Convert degree to radians and divide by segments

    for (let i = 0; i <= segments; i++) {
      const angle = radStep * i;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      points.push(new Point(x, y));
    }

    return points;
  }

  /**
   * @description Generates a wave path (sine wave).
   * @recommendation For a smooth wave, use fontSize × amplitude for the wavelength (one wave). Multiply by N for the total length.
   * @param axis Axis along which the wave oscillates ('x' or 'y')
   * @param amplitude Peak height of the wave
   * @param wavelength Width of one full wave cycle
   * @param waves Total length of the wave path (default is 1)
   * @param segmentsPerWave How many segments to divide into (default is one wavelength)
   * @returns Array of points representing the wave path
   */
  public static generateWavePath(axis: 'x' | 'y', amplitude: number, wavelength: number, waves: number = 1, segmentsPerWave: number = wavelength): Point[] {
    const points: Point[] = [];
    const totalLength = wavelength * waves;
    const segments = Math.round(segmentsPerWave * waves);
    const step = totalLength / segments;

    for (let i = 0; i <= segments; i++) {
      const x = i * step;
      const y = Math.sin((2 * Math.PI * x) / wavelength) * amplitude;
      points.push(new Point(axis === 'x' ? x : y, axis === 'x' ? y : x));
    }

    return points;
  }
}