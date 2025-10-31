import { Assets } from "pixi.js";
import { BundleFile, SpineAsset, SpineAssetData, SpineData } from "../engine/types/IAssetLoader";
import { debug } from "../engine/utils/debug";

const PATH = document.body.dataset.path;

const PATHS = {
  ART: PATH + "/assets/art/",
  RAW: PATH + "/assets/raw/",
  SOUNDS: PATH + "/assets/sounds/",
  ROOT: PATH + "/assets/",
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
            alias: 'base_background',
            src: PATH + '/assets/base_background.png'
          },
          {
            alias: 'base_logo',
            src: PATH + '/assets/raw/Logo_Base_Game_Vertical.png'
          },
          {
            alias: 'loading_bar_fill',
            src: PATH + '/assets/raw/Loading_Bar_Fill.png'
          },
          {
            alias: 'loading_bar_frame',
            src: PATH + '/assets/raw/Loading_Bar_Frame.png'
          },
          {
            alias: 'Nunito Black',
            src: PATH + '/assets/fonts/Nunito-Black.ttf'
          }
        ]
      },
      {
        name: 'environment',
        assets: [
          {
            alias: 'chain_hole',
            src: PATH + '/assets/raw/Chain_Hole.png'
          },
          // #region Base Frame and UI Assets
          {
            alias: 'base_floor',
            src: PATH + '/assets/raw/base_floor.png'
          },
          {
            alias: 'base_frame',
            src: PATH + '/assets/raw/base_frame.png'
          },
          {
            alias: 'base_frame_background',
            src: PATH + '/assets/raw/base_frame_background.png'
          },
          {
            alias: 'base_header_background',
            src: PATH + '/assets/raw/base_header_background.png'
          },
          {
            alias: 'base_line_chain',
            src: PATH + '/assets/raw/base_line_chain.png'
          },
          {
            alias: 'base_line_holder',
            src: PATH + '/assets/raw/base_line_holder.png'
          },
          {
            alias: 'base_logo',
            src: PATH + '/assets/raw/base_logo.png'
          },
          // #endregion
          // #region Freespin Frame and UI Assets
          {
            alias: 'freespin_floor',
            src: PATH + '/assets/raw/freespin_floor.png'
          },
          {
            alias: 'freespin_frame',
            src: PATH + '/assets/raw/freespin_frame.png'
          },
          {
            alias: 'freespin_frame_background',
            src: PATH + '/assets/raw/freespin_frame_background.png'
          },
          {
            alias: 'freespin_header_background',
            src: PATH + '/assets/raw/freespin_header_background.png'
          },
          {
            alias: 'freespin_line_chain',
            src: PATH + '/assets/raw/freespin_line_chain.png'
          },
          {
            alias: 'freespin_line_holder',
            src: PATH + '/assets/raw/freespin_line_holder.png'
          },
          {
            alias: 'freespin_logo',
            src: PATH + '/assets/raw/freespin_logo.png'
          },
          {
            alias: 'freespin_remaining_strip',
            src: PATH + '/assets/raw/freespin_remaining_strip.png'
          },
          // #endregion
          {
            alias: 'bet_area',
            src: PATH + '/assets/raw/Bet_Amount_Area.png'
          },
          {
            alias: 'game_logo_1000',
            src: PATH + '/assets/raw/Logo_1000_Game.png'
          },
          {
            alias: 'game_logo_super_scatter',
            src: PATH + '/assets/raw/Logo_Super_Scatter_Game.png'
          },
          {
            alias: 'popup_background',
            src: PATH + '/assets/raw/UI_Pop_Up_Background.png'
          },
          {
            alias: 'slider_button_frame',
            src: PATH + '/assets/raw/Slider_Button_Frame_Splash_Scene.png'
          },
          {
            alias: 'slider_button',
            src: PATH + '/assets/raw/Slider_Button_Splash_Scene.png'
          },
          {
            alias: 'spin_button',
            src: PATH + '/assets/raw/Spin_Button.png'
          },
          {
            alias: 'spin_button_icon',
            src: PATH + '/assets/raw/Spin_Button_Icon.png'
          },
          {
            alias: 'volatility_arrow',
            src: PATH + '/assets/raw/Volatility_Arrow.png'
          }
        ]
      },
      {
        name: 'background',
        assets: [
          {
            alias: ['base_background'],
            src: PATH + '/assets/base_background.png'
          },
          {
            alias: ['freespin_background'],
            src: PATH + '/assets/freespin_background.png'
          },
          {
            alias: ['bonus_background'],
            src: PATH + '/assets/bonus_background.png'
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
            src: PATH + '/assets/symbols/icons.atlas'
          },
          {
            alias: ['icons_data'],
            src: PATH + '/assets/symbols/icons.json'
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
            src: PATH + '/assets/animations/bonus.atlas'
          },
          {
            alias: ['bonus_data'],
            src: PATH + '/assets/animations/bonus.json'
          }
        ]
      },
      {
        name: 'elements',
        assets: [
          {
            alias: ['elements_atlas'],
            src: PATH + '/assets/animations/elements.atlas'
          },
          {
            alias: ['elements_data'],
            src: PATH + '/assets/animations/elements.json'
          }
        ]
      },
      {
        name: 'freespin',
        assets: [
          {
            alias: ['freespin_atlas'],
            src: PATH + '/assets/animations/freespin.atlas'
          },
          {
            alias: ['freespin_data'],
            src: PATH + '/assets/animations/freespin.json'
          }
        ]
      },
      {
        name: 'wins',
        assets: [
          {
            alias: ['wins_atlas'],
            src: PATH + '/assets/animations/wins.atlas'
          },
          {
            alias: ['wins_data'],
            src: PATH + '/assets/animations/wins.json'
          }
        ]
      },
      {
        name: 'chain',
        assets: [
          {
            alias: ['chain_atlas'],
            src: PATH + '/assets/animations/chain.atlas'
          },
          {
            alias: ['chain_data'],
            src: PATH + '/assets/animations/chain.json'
          }
        ]
      },
      {
        name: 'transition',
        assets: [
          {
            alias: ['transition_atlas'],
            src: PATH + '/assets/animations/transition.atlas'
          },
          {
            alias: ['transition_data'],
            src: PATH + '/assets/animations/transition.json'
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
    0: { idle: 'Symbol_1', blurred: 'Symbol_1_Blur', prefix: '0' },
    1: { idle: 'Symbol_2', blurred: 'Symbol_2_Blur', prefix: '1' },
    2: { idle: 'Symbol_3', blurred: 'Symbol_3_Blur', prefix: '2' },
    3: { idle: 'Symbol_4', blurred: 'Symbol_4_Blur', prefix: '3' },
    4: { idle: 'Symbol_5', blurred: 'Symbol_5_Blur', prefix: '4' },
    5: { idle: 'Symbol_6', blurred: 'Symbol_6_Blur', prefix: '5' },
    6: { idle: 'Symbol_7', blurred: 'Symbol_7_Blur', prefix: '6' },
    7: { idle: 'Symbol_8', blurred: 'Symbol_8_Blur', prefix: '7' },
    8: { idle: 'Symbol_9', blurred: 'Symbol_9_Blur', prefix: '8' },
    9: { idle: 'Symbol_10', blurred: 'Symbol_10_Blur', prefix:  '9' },
    10: { idle: 'Symbol_11', blurred: 'Symbol_11_Blur', prefix: '10' }
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

  public static readonly CHAIN_SPINE_ASSET: SpineAssetData = {
    atlas: "chain_atlas",
    skeleton: "chain_data",
  } as const;

  public static readonly TRANSITION_SPINE_ASSET: SpineAssetData = {
    atlas: "transition_atlas",
    skeleton: "transition_data",
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
      case "chain":
        ({ atlas, skeleton } = this.CHAIN_SPINE_ASSET);
        break;
      case "transition":
        ({ atlas, skeleton } = this.CHAIN_SPINE_ASSET);
        break;
      default:
        throw new Error(`Unknown spine asset type: ${asset}`);
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
