import { Assets } from "pixi.js";
import { SpineAssetData, SpineData } from "../engine/types/GameTypes";
import { BundleFile } from "../engine/types/IAssetLoader";
import { debug } from "../engine/utils/debug";

export class AssetsConfig {
    public static readonly SPRITESHEETS: BundleFile = {
        bundles: [
            {
                name: 'symbols',
                assets: [
                    {
                        alias: 'symbols',
                        src: '/assets/symbols/symbols.json'
                    }
                ]
            }
        ]
    };

    public static readonly IMAGES: BundleFile = {
        bundles: [
            {
                name: 'environment',
                assets: [
                    {
                        alias: 'multipacked-0',
                        src: '/assets/environment/multipacked_transparent-0.json'
                    },
                    {
                        alias: 'multipacked-1',
                        src: '/assets/environment/multipacked_transparent-1.json'
                    },
                    {
                        alias: 'line',
                        src: '/assets/line.png'
                    }
                ]
            },
            {
                name: 'background',
                assets: [
                    {
                        alias: 'background_landscape_1440',
                        src: '/assets/Background_Base_Landscape_1440.png'
                    },
                    {
                        alias: 'background_portrait_1440',
                        src: '/assets/Background_Base_Portrait_1440.png'
                    }
                ]
            }
        ]
    };

    public static readonly SPINE_SYMBOLS: BundleFile = {
        bundles: [
            {
                name: 'icons',
                assets: [
                    {
                        alias: ['icons_atlas'],
                        src: [
                            '/assets/symbols/icons.atlas',
                        ]
                    },
                    {
                        alias: ['icons_data'],
                        src: [
                            '/assets/symbols/icons.json'
                        ]
                    }
                ]
            }
        ]
    }

    public static readonly ANIMATIONS: BundleFile = {
        bundles: [
            {
                name: 'background_animations',
                assets: [
                    {
                        alias: 'background_atlas',
                        src: '/assets/animations/background.atlas'
                    },
                    {
                        alias: 'background_data',
                        src: '/assets/animations/background.json'
                    }
                ]
            }
        ]
    };

    public static readonly FONTS: BundleFile = {
        bundles: [
            {
                name: 'fonts',
                assets: [
                    {
                        alias: 'Nunito Black',
                        src: '/assets/fonts/Nunito-Black.ttf'
                    }
                ]
            }
        ]
    };

    // abi bunların 3'ünü de tek bir constdan çekebilirdim ama ne olur ne olmaz diye 3'e ayırdım,
    // isimleri değişebilir hala değişiklikler yapılıyor assetlerde
    public static readonly SYMBOL_ASSET_DATA: { [key: number]: { idle: string, blurred: string, prefix: string } } = {
        0: { idle: 'Symbol1', blurred: 'Symbol1_Blurred', prefix: 'Symbol1' },
        1: { idle: 'Symbol2', blurred: 'Symbol2_Blurred', prefix: 'Symbol2' },
        2: { idle: 'Symbol3', blurred: 'Symbol3_Blurred', prefix: 'Symbol3' },
        3: { idle: 'Symbol4', blurred: 'Symbol4_Blurred', prefix: 'Symbol4' },
        4: { idle: 'Symbol5', blurred: 'Symbol5_Blurred', prefix: 'Symbol5' },
        5: { idle: 'Symbol6', blurred: 'Symbol6_Blurred', prefix: 'Symbol6' },
        6: { idle: 'Symbol7', blurred: 'Symbol7_Blurred', prefix: 'Symbol7' },
        7: { idle: 'Symbol8', blurred: 'Symbol8_Blurred', prefix: 'Symbol8' },
        8: { idle: 'Symbol9', blurred: 'Symbol9_Blurred', prefix: 'Symbol9' },
        9: { idle: 'Symbol10', blurred: 'Symbol10_Blurred', prefix: 'Symbol10' },
        10: { idle: 'Symbol11', blurred: 'Symbol11_Blurred', prefix: 'Symbol11' },
        11: { idle: 'Symbol12', blurred: 'Symbol12_Blurred', prefix: 'Symbol12' },
        12: { idle: 'Symbol13', blurred: 'Symbol13_Blurred', prefix: 'Symbol13' }
    };

    // spine symbol indexes to asset name mapping
    public static readonly SPINE_SYMBOL_ASSET: SpineAssetData = { atlas: 'icons_atlas', skeleton: 'icons_data' } as const;

    public static readonly BACKGROUND_ANIMATIONS_ASSET: SpineAssetData = { atlas: 'background_atlas', skeleton: 'background_data' } as const;

    public static getAllAssets(): BundleFile {
        const allAssets: BundleFile = {
            bundles: [
                ...this.SPRITESHEETS.bundles,
                ...this.IMAGES.bundles,
                ...this.SPINE_SYMBOLS.bundles,
                ...this.ANIMATIONS.bundles,
                ...this.FONTS.bundles
            ]
        };

        return allAssets;
    }

    public static getSpritesheetAssets(): BundleFile {
        return this.SPRITESHEETS;
    }

    public static getImageAssets(): BundleFile {
        return this.IMAGES;
    }

    public static getSymbolAssetName(symbolIndex: number): string {
        const assetName = this.SYMBOL_ASSET_DATA[symbolIndex];
        if (!assetName) {
            debug.warn(`No asset found for symbol index ${symbolIndex}, using default`);
            return 'Symbol1';
        }
        return assetName.idle;
    }

    public static getBlurredSymbolAssetName(symbolIndex: number): string {
        const assetName = this.SYMBOL_ASSET_DATA[symbolIndex];
        if (!assetName) {
            debug.warn(`No asset found for symbol index ${symbolIndex}, using default`);
            return 'Symbol1_Blurred';
        }
        return assetName.blurred;
    }

    public static getSpineSymbolAssetName(): SpineData {
        const { atlas, skeleton }: SpineAssetData = this.SPINE_SYMBOL_ASSET;
        const atlasData = Assets.get(atlas);
        const skeletonData = Assets.get(skeleton);

        if (!atlasData || !skeletonData) {
            throw new Error(`Missing spine asset data for symbols`);
        }

        return { atlasData, skeletonData };
    }

    public static getSymbolIndexFromAssetName(assetName: string): number {
        for (const [index, name] of Object.entries(this.SYMBOL_ASSET_DATA)) {
            if (name.idle === assetName) {
                return parseInt(index);
            }
        }
        return -1; // Not found
    }
} 