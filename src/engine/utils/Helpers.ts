import { AtlasAttachmentLoader, SkeletonData, SkeletonJson } from "@esotericsoftware/spine-pixi-v8";
import { IReelMode } from "../reels/ReelController";
import { ISpinState, SpineAsset } from "../types/GameTypes";
import { AssetsConfig } from "../../config/AssetsConfig";

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