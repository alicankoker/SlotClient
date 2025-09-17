import { AtlasAttachmentLoader, SkeletonData, SkeletonJson } from "@esotericsoftware/spine-pixi-v8";
import { IReelMode } from "../reels/ReelController";
import { ISpinState, SpineAsset } from "../types/GameTypes";
import { AssetsConfig } from "../../config/AssetsConfig";
import { GameConfig } from "../../config/GameConfig";

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

    /**
     * @description Calculate the X position of a symbol in the grid.
     * @param column The column index of the symbol.
     * @param maxColumn The maximum number of columns in the grid.
     * @param referenceX The reference X position to calculate from.
     * @param gapX The gap between symbols in the X direction.
     * @returns The calculated X position of the symbol.
     */
    public static calculateSymbolX(column: number = 0, maxColumn: number, referenceX: number, gapX?: number): number {
        const symbolWidth = GameConfig.REFERENCE_SYMBOL.width;

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
        const symbolHeight = GameConfig.REFERENCE_SYMBOL.height;

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
    public static createGrid(maxColumn: number, maxRow: number, referenceX: number, referenceY: number, gapX?: number, gapY?: number): { x: number, y: number }[] {
        const grid: { x: number, y: number }[] = [];

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
     * @description Get the Spine skeleton data for a specific asset.
     * @param asset The Spine asset to retrieve the skeleton data for.
     * @returns The SkeletonData for the specified asset.
     */
    public static getSpineSkeletonData(asset: SpineAsset): SkeletonData {
        // Get the texture for this asset
        const { atlasData, skeletonData } = AssetsConfig.getSpineAsset(asset);

        if (!atlasData || !skeletonData) {
            throw new Error(`Texture not found for ${asset}`);
        }

        const attachmentLoader = new AtlasAttachmentLoader(atlasData as any);
        const json = new SkeletonJson(attachmentLoader);
        const skeleton = json.readSkeletonData(skeletonData);

        return skeleton;
    }

    /**
     * @description Convert an amount or array of amounts to a decimal string representation.
     * @param amount The amount to convert.
     * @param denomination The denomination to divide the amount by (default is 100).
     * @param digit The number of decimal places to include in the result (default is 2).
     * @returns {string} The converted amount or array of amounts as a string.
     */
    public static convertToDecimal(amount: number | number[], denomination: number = 100, digit: number = 2): string | string[] {
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
}