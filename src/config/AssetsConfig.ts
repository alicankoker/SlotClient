import { Assets } from "pixi.js";
import { SpineAsset, SpineAssetData, SpineData } from "../engine/types/GameTypes";
import { BundleFile } from "../engine/types/IAssetLoader";
import { debug } from "../engine/utils/debug";

export class AssetsConfig {
    public static readonly SPRITESHEETS: BundleFile = {
        bundles: [
            {
                name: 'symbols',
                assets: [
                    {
                        alias: ['symbols'],
                        src: '/assets/symbols/symbols.json'
                    }
                ]
            }
        ]
    };

    public static readonly IMAGES: BundleFile = {
        bundles: [
            {
                name: 'preload',
                assets: [
                    {
                        alias: 'background_landscape_1440',
                        src: '/assets/Background_Base_Landscape_1440.png'
                    },
                    {
                        alias: 'game_logo_vertical',
                        src: '/assets/raw/Logo_Base_Game_Vertical.png'
                    },
                    {
                        alias: 'loading_bar_fill',
                        src: '/assets/raw/Loading_Bar_Fill.png'
                    },
                    {
                        alias: 'loading_bar_frame',
                        src: '/assets/raw/Loading_Bar_Frame.png'
                    },
                    {
                        alias: 'Nunito Black',
                        src: '/assets/fonts/Nunito-Black.ttf'
                    }
                ]
            },
            {
                name: 'environment',
                assets: [
                    {
                        alias: 'bet_area',
                        src: '/assets/raw/Bet_Amount_Area.png'
                    },
                    {
                        alias: 'frame_background_base',
                        src: '/assets/raw/Frame_Background_Base_Game.png'
                    },
                    {
                        alias: 'game_logo_1000',
                        src: '/assets/raw/Logo_1000_Game.png'
                    },
                    {
                        alias: 'game_logo_super_scatter',
                        src: '/assets/raw/Logo_Super_Scatter_Game.png'
                    },
                    {
                        alias: 'game_logo_vertical',
                        src: '/assets/raw/Logo_Base_Game_Vertical.png'
                    },
                    {
                        alias: 'slider_button_frame',
                        src: '/assets/raw/Slider_Button_Frame_Splash_Scene.png'
                    },
                    {
                        alias: 'slider_button',
                        src: '/assets/raw/Slider_Button_Splash_Scene.png'
                    },
                    {
                        alias: 'spin_button',
                        src: '/assets/raw/Spin_Button.png'
                    },
                    {
                        alias: 'spin_button_icon',
                        src: '/assets/raw/Spin_Button_Icon.png'
                    },
                    {
                        alias: 'volatility_arrow',
                        src: '/assets/raw/Volatility_Arrow.png'
                    }
                ]
            },
            {
                name: 'background',
                assets: [
                    {
                        alias: ['background_landscape_1440'],
                        src: '/assets/Background_Base_Landscape_1440.png'
                    },
                    {
                        alias: ['background_portrait_1440'],
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
                        src: '/assets/symbols/icons.atlas'
                    },
                    {
                        alias: ['icons_data'],
                        src: '/assets/symbols/icons.json'
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
                        alias: ['background_atlas'],
                        src: '/assets/animations/background.atlas'
                    },
                    {
                        alias: ['background_data'],
                        src: '/assets/animations/background.json'
                    }
                ]
            },
            {
                name: 'wins',
                assets: [
                    {
                        alias: ['wins_atlas'],
                        src: '/assets/animations/wins.atlas'
                    },
                    {
                        alias: ['wins_data'],
                        src: '/assets/animations/wins.json'
                    }
                ]
            },
            {
                name: 'elements',
                assets: [
                    {
                        alias: ['elements_atlas'],
                        src: '/assets/animations/elements.atlas'
                    },
                    {
                        alias: ['elements_data'],
                        src: '/assets/animations/elements.json'
                    }
                ]
            },
            {
                name: 'freespin',
                assets: [
                    {
                        alias: ['freespin_atlas'],
                        src: '/assets/animations/freespin.atlas'
                    },
                    {
                        alias: ['freespin_data'],
                        src: '/assets/animations/freespin.json'
                    }
                ]
            }
        ]
    };

    public static readonly AUDIO: BundleFile = {
        bundles: [
            {
                name: 'audio',
                assets: [
                    {
                        alias: 'bigwin',
                        src: ['/assets/sounds/bigwin.mp3', /*'/assets/sounds/bigwin.ogg'*/],
                        channel: 'sfx'
                    },
                    {
                        alias: 'coin',
                        src: ['/assets/sounds/coin.mp3', /*'/assets/sounds/coin.ogg'*/],
                        channel: 'sfx'
                    },
                    {
                        alias: 'spin',
                        src: ['/assets/sounds/spin.mp3', /*'/assets/sounds/spin.ogg'*/],
                        channel: 'sfx'
                    },
                    {
                        alias: 'stop',
                        src: ['/assets/sounds/stop.mp3', /*'/assets/sounds/stop.ogg'*/],
                        channel: 'sfx'
                    },
                    {
                        alias: 'win',
                        src: ['/assets/sounds/win.mp3', /*'/assets/sounds/win.ogg'*/],
                        channel: 'sfx'
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
    public static readonly SYMBOL_SPINE_ASSET: SpineAssetData = { atlas: 'icons_atlas', skeleton: 'icons_data' } as const;

    public static readonly BACKGROUND_SPINE_ASSET: SpineAssetData = { atlas: 'background_atlas', skeleton: 'background_data' } as const;

    public static readonly ELEMENTS_SPINE_ASSET: SpineAssetData = { atlas: 'elements_atlas', skeleton: 'elements_data' } as const;

    public static readonly WINS_SPINE_ASSET: SpineAssetData = { atlas: 'wins_atlas', skeleton: 'wins_data' } as const;

    public static getAllAssets(): BundleFile {
        const allAssets: BundleFile = {
            bundles: [
                ...this.SPRITESHEETS.bundles,
                ...this.IMAGES.bundles,
                ...this.SPINE_SYMBOLS.bundles,
                ...this.ANIMATIONS.bundles,
                ...this.AUDIO.bundles,
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

    public static getSymbolAsset(symbolIndex: number): string {
        const assetName = this.SYMBOL_ASSET_DATA[symbolIndex];
        if (!assetName) {
            debug.warn(`No asset found for symbol index ${symbolIndex}, using default`);
            return 'Symbol1';
        }
        return assetName.idle;
    }

    public static getBlurredSymbolAsset(symbolIndex: number): string {
        const assetName = this.SYMBOL_ASSET_DATA[symbolIndex];
        if (!assetName) {
            debug.warn(`No asset found for symbol index ${symbolIndex}, using default`);
            return 'Symbol1_Blurred';
        }
        return assetName.blurred;
    }

    public static getSpineAsset(asset: SpineAsset): SpineData {
        let atlas: string, skeleton: string;

        switch (asset) {
            case "symbol":
                ({ atlas, skeleton } = this.SYMBOL_SPINE_ASSET);
                break;
            case "background":
                ({ atlas, skeleton } = this.BACKGROUND_SPINE_ASSET);
                break;
            case "elements":
                ({ atlas, skeleton } = this.ELEMENTS_SPINE_ASSET);
                break;
            case "wins":
                ({ atlas, skeleton } = this.WINS_SPINE_ASSET);
                break;
        }

        const atlasData = Assets.get(atlas);
        const skeletonData = Assets.get(skeleton);

        if (!atlasData || !skeletonData) {
            throw new Error(`Missing spine asset data for ${asset}`);
        }

        return { atlasData, skeletonData };
    }

    public static getSymbolIndexFromAsset(assetName: string): number {
        for (const [index, name] of Object.entries(this.SYMBOL_ASSET_DATA)) {
            if (name.idle === assetName) {
                return parseInt(index);
            }
        }
        return -1; // Not found
    }
} 