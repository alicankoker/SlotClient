export interface AssetConfig {
    alias: string;
    src: string;
}

export interface SpritesheetConfig extends AssetConfig {
    data?: string; // Path to JSON file for spritesheet
}

export class AssetsConfig {
    public static readonly SPRITESHEETS: SpritesheetConfig[] = [
        {
            alias: 'symbols',
            src: '/assets/symbols/symbols.png',
            data: '/assets/symbols/symbols.json'
        }
    ];

    public static readonly IMAGES: AssetConfig[] = [
        {
            alias: 'background',
            src: '/assets/symbol.png' // Keep as fallback
        }
    ];

    public static readonly SYMBOL_NAMES = {
        SYMBOL_1_STATIC: 'symbol_1_static.png',
        SYMBOL_2_STATIC: 'symbol_2_static.png',
        SYMBOL_3_STATIC: 'symbol_3_static.png',
        SYMBOL_4_STATIC: 'symbol_4_static.png',
        SYMBOL_5_STATIC: 'symbol_5_static.png',
        SYMBOL_6_STATIC: 'symbol_6_static.png',
        SYMBOL_7_STATIC: 'symbol_7_static.png',
        SYMBOL_8_STATIC: 'symbol_8_static.png',
        SYMBOL_9_STATIC: 'symbol_9_static.png',
        SYMBOL_10_STATIC: 'symbol_10_static.png'
    } as const;

    // Symbol index to asset name mapping
    public static readonly SYMBOL_INDEX_TO_ASSET: { [key: number]: string } = {
        0: 'symbol_1_static.png',
        1: 'symbol_2_static.png',
        2: 'symbol_3_static.png',
        3: 'symbol_4_static.png',
        4: 'symbol_5_static.png',
        5: 'symbol_6_static.png',
        6: 'symbol_7_static.png',
        7: 'symbol_8_static.png',
        8: 'symbol_9_static.png',
        9: 'symbol_10_static.png'
    };

    public static getAllAssets(): (AssetConfig | SpritesheetConfig)[] {
        return [...this.SPRITESHEETS, ...this.IMAGES];
    }

    public static getSpritesheetAssets(): SpritesheetConfig[] {
        return this.SPRITESHEETS;
    }

    public static getImageAssets(): AssetConfig[] {
        return this.IMAGES;
    }

    public static getSymbolAssetName(symbolIndex: number): string {
        const assetName = this.SYMBOL_INDEX_TO_ASSET[symbolIndex];
        if (!assetName) {
            console.warn(`No asset found for symbol index ${symbolIndex}, using default`);
            return 'symbol_1_static.png';
        }
        return assetName;
    }

    public static getSymbolIndexFromAssetName(assetName: string): number {
        for (const [index, name] of Object.entries(this.SYMBOL_INDEX_TO_ASSET)) {
            if (name === assetName) {
                return parseInt(index);
            }
        }
        return -1; // Not found
    }
} 