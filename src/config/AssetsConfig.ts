import { Assets } from "pixi.js";
import { BundleFile, SpineAsset, SpineAssetData, SpineData } from "../engine/types/IAssetLoader";

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
  public static readonly SPRITESHEETS: BundleFile = {
    bundles: [
      {
        name: "icons",
        assets: [
          {
            alias: ["icons"],
            src: `${PATHS.ROOT}/spritesheets/icons/icons.json`,
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
            src: PATH + '/assets/images/base_background.jpg'
          },
          {
            alias: 'base_logo',
            src: PATH + '/assets/raw/Logo_Base_Game_Vertical.png'
          },
          {
            alias: 'loading_bar_bg',
            src: PATH + '/assets/raw/loading_bar_bg.png'
          },
          {
            alias: 'loading_bar_fill',
            src: PATH + '/assets/raw/loading_bar_fill.png'
          },
          {
            alias: 'loading_bar_shadow',
            src: PATH + '/assets/raw/loading_bar_shadow.png'
          },
          {
            alias: 'loading_bar_stroke_front',
            src: PATH + '/assets/raw/loading_bar_stroke_front.png'
          },
          {
            alias: 'loading_bar_stroke_back',
            src: PATH + '/assets/raw/loading_bar_stroke_back.png'
          },
          {
            alias: "MikadoBlack",
            src: PATHS.ROOT + `fonts/MikadoBlack.otf`,
          },
          {
            alias: "MikadoMedium",
            src: PATHS.ROOT + `fonts/MikadoMedium.otf`,
          }
        ]
      },
      {
        name: 'elements',
        assets: [
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
            alias: 'floor_hole',
            src: PATH + '/assets/raw/floor_hole.png'
          },
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
            alias: 'gem_left',
            src: PATH + '/assets/raw/gem_left.png'
          },
          {
            alias: 'gem_right',
            src: PATH + '/assets/raw/gem_right.png'
          },
          {
            alias: 'popup_frame',
            src: PATH + '/assets/raw/popup_frame.png'
          },
          {
            alias: 'popup_header',
            src: PATH + '/assets/raw/popup_header.png'
          },
          {
            alias: 'dialogue_box',
            src: PATH + '/assets/raw/dialogue_box.png'
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
          },
          {
            alias: 'line_mask',
            src: PATH + '/assets/raw/line_mask.png'
          },
          {
            alias: 'tnt_cable_landscape',
            src: PATH + '/assets/raw/tnt_cable_landscape.png'
          },
          {
            alias: 'tnt_cable_portrait',
            src: PATH + '/assets/raw/tnt_cable_portrait.png'
          },
          {
            alias: 'golden_key',
            src: PATH + '/assets/raw/golden_key.png'
          }
        ]
      },
      {
        name: 'backgrounds',
        assets: [
          {
            alias: ['base_background'],
            src: PATH + '/assets/images/base_background.jpg'
          },
          {
            alias: ['freespin_background'],
            src: PATH + '/assets/images/freespin_background.jpg'
          },
          {
            alias: ['bonus_background'],
            src: PATH + '/assets/images/bonus_background.jpg'
          }
        ]
      }
    ]
  };

  public static readonly ANIMATIONS: BundleFile = {
    bundles: [
      {
        name: 'symbols',
        assets: [
          {
            alias: ['symbols_atlas'],
            src: PATH + '/assets/animations/symbols/symbols.atlas'
          },
          {
            alias: ['symbols_data'],
            src: PATH + '/assets/animations/symbols/symbols.json'
          }
        ]
      },
      {
        name: 'bonus',
        assets: [
          {
            alias: ['bonus_atlas'],
            src: PATH + '/assets/animations/bonus/bonus.atlas'
          },
          {
            alias: ['bonus_data'],
            src: PATH + '/assets/animations/bonus/bonus.json'
          }
        ]
      },
      {
        name: 'environment',
        assets: [
          {
            alias: ['environment_atlas'],
            src: PATH + '/assets/animations/environment/environment.atlas'
          },
          {
            alias: ['environment_data'],
            src: PATH + '/assets/animations/environment/environment.json'
          }
        ]
      },
      {
        name: 'winevent',
        assets: [
          {
            alias: ['winevent_atlas'],
            src: PATH + '/assets/animations/winevent/winevent.atlas'
          },
          {
            alias: ['winevent_data'],
            src: PATH + '/assets/animations/winevent/winevent.json'
          }
        ]
      },
      {
        name: 'lines',
        assets: [
          {
            alias: ['lines_atlas'],
            src: PATH + '/assets/animations/lines/lines.atlas'
          },
          {
            alias: ['lines_data'],
            src: PATH + '/assets/animations/lines/lines.json'
          }
        ]
      },
      {
        name: 'transition',
        assets: [
          {
            alias: ['transition_atlas'],
            src: PATH + '/assets/animations/transition/transition.atlas'
          },
          {
            alias: ['transition_data'],
            src: PATH + '/assets/animations/transition/transition.json'
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
            alias: "MikadoBlack",
            src: PATHS.ROOT + `fonts/MikadoBlack.otf`,
          },
          {
            alias: "MikadoMedium",
            src: PATHS.ROOT + `fonts/MikadoMedium.otf`,
          }
        ],
      },
    ],
  };

  // spine symbol indexes to asset name mapping
  public static readonly SYMBOL_SPINE_ASSET: SpineAssetData = {
    atlas: "symbols_atlas",
    skeleton: "symbols_data",
  } as const;

  public static readonly BONUS_SPINE_ASSET: SpineAssetData = {
    atlas: 'bonus_atlas',
    skeleton: 'bonus_data'
  } as const;

  public static readonly ENVIRONMENT_SPINE_ASSET: SpineAssetData = {
    atlas: "environment_atlas",
    skeleton: "environment_data",
  } as const;

  public static readonly WINEVENT_SPINE_ASSET: SpineAssetData = {
    atlas: "winevent_atlas",
    skeleton: "winevent_data",
  } as const;

  public static readonly TRANSITION_SPINE_ASSET: SpineAssetData = {
    atlas: "transition_atlas",
    skeleton: "transition_data",
  } as const;

  public static readonly LINE_SPINE_ASSET: SpineAssetData = {
    atlas: "lines_atlas",
    skeleton: "lines_data",
  } as const;

  public static getAllAssets(resolution: string): BundleFile {
    this.RES = RESOLUTIONS.find((r) => r.size === resolution)?.variation!;
    this.setResolution();
    const allAssets: BundleFile = {
      bundles: [
        ...this.SPRITESHEETS.bundles,
        ...this.IMAGES.bundles,
        ...this.ANIMATIONS.bundles,
        ...this.AUDIO.bundles,
        ...this.FONTS.bundles,
      ],
    };

    console.log(allAssets);

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
    return symbolIndex.toString();
  }

  public static getBlurredSymbolAsset(symbolIndex: number): string {
    return `${symbolIndex}_blur`;
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
      case "environment":
        ({ atlas, skeleton } = this.ENVIRONMENT_SPINE_ASSET);
        break;
      case "winevent":
        ({ atlas, skeleton } = this.WINEVENT_SPINE_ASSET);
        break;
      case "transition":
        ({ atlas, skeleton } = this.TRANSITION_SPINE_ASSET);
        break;
      case "line":
        ({ atlas, skeleton } = this.LINE_SPINE_ASSET);
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
}
