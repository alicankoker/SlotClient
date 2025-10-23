import { Assets } from "pixi.js";
import {
  SpineAsset,
  SpineAssetData,
  SpineData,
} from "../engine/types/GameTypes";
import { BundleFile } from "../engine/types/IAssetLoader";
import { debug } from "../engine/utils/debug";
const PATHS = {
  ART: "assets/art/",
  RAW: "assets/raw/",
  SOUNDS: "assets/sounds/",
  ROOT: "assets/",
};

const RESOURCE_GROUP_PREFIX = "pixiResources";

const RESOLUTIONS = [
  { size: "UltraHD", variation: "@3x" },
  { size: "QuadHD", variation: "@2x" },
  { size: "FullHD", variation: "@1.5x" },
  { size: "HD", variation: "@1x" },
];

export class AssetsConfig {
  public static RES: string = "{{resolution}}";
  public static SPRITESHEETS: BundleFile = {
    bundles: [
      {
        name: "symbols",
        assets: [
          {
            alias: ["symbols"],
            src: `${PATHS.ROOT}/symbols/symbols.json`,
          },
        ],
      },
    ],
  };

  public static readonly IMAGES: BundleFile = {
    bundles: [
      {
        name: 'preload',
        assets: [
          {
            alias: 'background_base',
            src: '/assets/Asset 2.png'
          },
          {
            alias: 'game_logo',
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
            src: '/assets/raw/Base_Frame_Background_UI.png'
          },
          {
            alias: 'header_background',
            src: '/assets/raw/Base_Header_Background_UI.png'
          },
          {
            alias: 'reel_chain',
            src: '/assets/raw/Base_Frame_Chain_UI.png'
          },
          {
            alias: 'line_chain',
            src: '/assets/raw/Base_Line_Chain_UI.png'
          },
          {
            alias: 'floor',
            src: '/assets/raw/Base_Frame_Symbol_Holder_UI.png'
          },
          {
            alias: 'floor2',
            src: '/assets/raw/Base_Frame_Symbol_Holder_UI2.png'
          },
          {
            alias: 'line_holder',
            src: '/assets/raw/Base_Line_Holder_UI.png'
          },
          {
            alias: 'frame_base',
            src: '/assets/raw/Base_Frame_UI.png'
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
            alias: 'game_logo',
            src: '/assets/raw/Base_Logo_UI.png'
          },
          {
            alias: 'freespin_logo',
            src: '/assets/raw/Freespin_Logo_UI.png'
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
            alias: ['background_base'],
            src: '/assets/Background_Base.png'
          },
          {
            alias: ['background_freespin'],
            src: '/assets/Background_Freespin.png'
          },
          {
            alias: ['background_bonus'],
            src: '/assets/Background_Bonus.png'
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
        name: 'bonus',
        assets: [
          {
            alias: ['bonus_atlas'],
            src: '/assets/animations/bonus.atlas'
          },
          {
            alias: ['bonus_data'],
            src: '/assets/animations/bonus.json'
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
      }
    ]
  };

  public static readonly AUDIO: BundleFile = {
    bundles: [
      {
        name: "audio",
        assets: [
          {
            alias: "bigwin",
            src: [`${PATHS.SOUNDS}bigwin.mp3` /*'/assets/sounds/bigwin.ogg'*/],
            channel: "sfx",
          },
          {
            alias: "coin",
            src: [`${PATHS.SOUNDS}coin.mp3` /*'/assets/sounds/coin.ogg'*/],
            channel: "sfx",
          },
          {
            alias: "spin",
            src: [`${PATHS.SOUNDS}spin.mp3` /*'/assets/sounds/spin.ogg'*/],
            channel: "sfx",
          },
          {
            alias: "stop",
            src: [`${PATHS.SOUNDS}stop.mp3` /*'/assets/sounds/stop.ogg'*/],
            channel: "sfx",
          },
          {
            alias: "win",
            src: [`${PATHS.SOUNDS}win.mp3` /*'/assets/sounds/win.ogg'*/],
            channel: "sfx",
          },
        ],
      },
    ],
  };

  public static readonly FONTS: BundleFile = {
    bundles: [
      {
        name: "fonts",
        assets: [
          {
            alias: "Nunito Black",
            src: `${PATHS.ART}fonts/Nunito-Black.ttf`,
          },
        ],
      },
    ],
  };

  // abi bunların 3'ünü de tek bir constdan çekebilirdim ama ne olur ne olmaz diye 3'e ayırdım,
  // isimleri değişebilir hala değişiklikler yapılıyor assetlerde
  public static readonly SYMBOL_ASSET_DATA: { [key: number]: { idle: string, blurred: string, prefix: string } } = {
    0: { idle: 'Symbol_1', blurred: 'Symbol_1_Blur', prefix: 'Symbol1' },
    1: { idle: 'Symbol_2', blurred: 'Symbol_2_Blur', prefix: 'Symbol2' },
    2: { idle: 'Symbol_3', blurred: 'Symbol_3_Blur', prefix: 'Symbol3' },
    3: { idle: 'Symbol_4', blurred: 'Symbol_4_Blur', prefix: 'Symbol4' },
    4: { idle: 'Symbol_5', blurred: 'Symbol_5_Blur', prefix: 'Symbol5' },
    5: { idle: 'Symbol_6', blurred: 'Symbol_6_Blur', prefix: 'Symbol6' },
    6: { idle: 'Symbol_7', blurred: 'Symbol_7_Blur', prefix: 'Symbol7' },
    7: { idle: 'Symbol_8', blurred: 'Symbol_8_Blur', prefix: 'Symbol8' },
    8: { idle: 'Symbol_9', blurred: 'Symbol_9_Blur', prefix: 'Symbol9' },
    9: { idle: 'Symbol_10', blurred: 'Symbol_10_Blur', prefix: 'Symbol10' },
    10: { idle: 'Symbol_11', blurred: 'Symbol_11_Blur', prefix: 'Symbol11' },
    11: { idle: 'Symbol_12', blurred: 'Symbol_12_Blur', prefix: 'Symbol12' },
    12: { idle: 'Symbol_13', blurred: 'Symbol_13_Blur', prefix: 'Symbol13' }
  };

  // spine symbol indexes to asset name mapping
  public static readonly SYMBOL_SPINE_ASSET: SpineAssetData = {
    atlas: "icons_atlas",
    skeleton: "icons_data",
  } as const;

  public static readonly BONUS_SPINE_ASSET: SpineAssetData = { atlas: 'bonus_atlas', skeleton: 'bonus_data' } as const;

  public static readonly ELEMENTS_SPINE_ASSET: SpineAssetData = {
    atlas: "elements_atlas",
    skeleton: "elements_data",
  } as const;

  public static readonly WINS_SPINE_ASSET: SpineAssetData = {
    atlas: "wins_atlas",
    skeleton: "wins_data",
  } as const;

  public static getAllAssets(resolution: string): BundleFile {
    this.RES = RESOLUTIONS.find((r) => r.size === resolution)?.variation!;
    this.setResolution();
    const allAssets: BundleFile = {
      bundles: [
        ...this.SPRITESHEETS.bundles,
        ...this.IMAGES.bundles,
        ...this.SPINE_SYMBOLS.bundles,
        ...this.ANIMATIONS.bundles,
        ...this.AUDIO.bundles,
        ...this.FONTS.bundles,
      ],
    };

    return allAssets;
  }

  private static setResolution() {
    const multiResolutionAssets: BundleFile = {
      bundles: [...AssetsConfig.SPRITESHEETS.bundles],
    };

    multiResolutionAssets.bundles.forEach((bundle) => {
      bundle.assets.forEach((asset) => {
        asset.src = (asset.src as string).replace("{{resolution}}", this.RES);
      });
    });
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
      return 'Symbol_1';
    }
    return assetName.idle;
  }

  public static getBlurredSymbolAsset(symbolIndex: number): string {
    const assetName = this.SYMBOL_ASSET_DATA[symbolIndex];
    if (!assetName) {
      debug.warn(`No asset found for symbol index ${symbolIndex}, using default`);
      return 'Symbol_1_Blur';
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
        ({ atlas, skeleton } = this.BONUS_SPINE_ASSET);
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
