import { BaseAssetsConfig } from '@slotclient/config/AssetsConfig';
import { BundleFile, SpineAssetData } from "@slotclient/types/IAssetLoader";

export const PATH = document.body.dataset.path;

const PATHS = {
  ART: PATH + "/assets/art/",
  RAW: PATH + "/assets/raw/environment/",
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

export class AssetsConfig extends BaseAssetsConfig {
  private static _instance: AssetsConfig;

  public static getInstance(): AssetsConfig {
    if (!this._instance) {
      this._instance = new AssetsConfig();
    }
    return this._instance;
  }

  public RES: string = "{{resolution}}";
  
  public readonly SPRITESHEETS: BundleFile = {
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

  public readonly IMAGES: BundleFile = {
    bundles: [
      {
        name: 'preload',
        assets: [
          {
            alias: 'base_logo',
            src: PATH + '/assets/raw/environment/base_logo.png'
          },
          {
            alias: 'loading_bar_bg',
            src: PATH + '/assets/raw/environment/loading_bar_bg.png'
          },
          {
            alias: 'loading_bar_fill',
            src: PATH + '/assets/raw/environment/loading_bar_fill.png'
          },
          {
            alias: 'loading_bar_shadow',
            src: PATH + '/assets/raw/environment/loading_bar_shadow.png'
          },
          {
            alias: 'loading_bar_stroke_front',
            src: PATH + '/assets/raw/environment/loading_bar_stroke_front.png'
          },
          {
            alias: 'loading_bar_stroke_back',
            src: PATH + '/assets/raw/environment/loading_bar_stroke_back.png'
          },
          {
            alias: "MikadoBlack",
            src: PATHS.ROOT + `fonts/MikadoBlack.otf`,
          },
          {
            alias: "MikadoMedium",
            src: PATHS.ROOT + `fonts/MikadoMedium.otf`,
          },
          {
            alias: "TrebuchedMSBold",
            src: PATHS.ROOT + `fonts/TrebuchedMSBold.ttf`,
          }
        ]
      },
      {
        name: 'elements',
        assets: [
          // #region Base Frame and UI Assets
          {
            alias: 'base_chain',
            src: PATH + '/assets/raw/environment/base_chain.png'
          },
          {
            alias: 'base_chain_hole',
            src: PATH + '/assets/raw/environment/base_chain_hole.png'
          },
          {
            alias: 'base_fixed_lines_holder',
            src: PATH + '/assets/raw/environment/base_fixed_lines_holder.png'
          },
          {
            alias: 'base_floor',
            src: PATH + '/assets/raw/environment/base_floor.png'
          },
          {
            alias: 'base_frame',
            src: PATH + '/assets/raw/environment/base_frame.png'
          },
          {
            alias: 'base_frame_background',
            src: PATH + '/assets/raw/environment/base_frame_background.png'
          },
          {
            alias: 'base_header_background',
            src: PATH + '/assets/raw/environment/base_header_background.png'
          },
          {
            alias: 'base_line_chain',
            src: PATH + '/assets/raw/environment/base_line_chain.png'
          },
          // #endregion
          // #region Freespin Frame and UI Assets
          {
            alias: 'freespin_chain',
            src: PATH + '/assets/raw/environment/freespin_chain.png'
          },
          {
            alias: 'freespin_chain_hole',
            src: PATH + '/assets/raw/environment/freespin_chain_hole.png'
          },
          {
            alias: 'freespin_fixed_lines_holder',
            src: PATH + '/assets/raw/environment/freespin_fixed_lines_holder.png'
          },
          {
            alias: 'freespin_floor',
            src: PATH + '/assets/raw/environment/freespin_floor.png'
          },
          {
            alias: 'freespin_frame',
            src: PATH + '/assets/raw/environment/freespin_frame.png'
          },
          {
            alias: 'freespin_frame_background',
            src: PATH + '/assets/raw/environment/freespin_frame_background.png'
          },
          {
            alias: 'freespin_header_background',
            src: PATH + '/assets/raw/environment/freespin_header_background.png'
          },
          {
            alias: 'freespin_line_chain',
            src: PATH + '/assets/raw/environment/freespin_line_chain.png'
          },
          {
            alias: 'freespin_logo',
            src: PATH + '/assets/raw/environment/freespin_logo.png'
          },
          {
            alias: 'freespin_remaining_strip',
            src: PATH + '/assets/raw/environment/freespin_remaining_strip.png'
          },
          // #endregion
          {
            alias: 'popup_frame',
            src: PATH + '/assets/raw/environment/popup_frame.png'
          },
          {
            alias: 'popup_header',
            src: PATH + '/assets/raw/environment/popup_header.png'
          },
          {
            alias: 'dialog_box',
            src: PATH + '/assets/raw/environment/dialog_box.png'
          },
          {
            alias: 'glow',
            src: PATH + '/assets/raw/environment/glow.png'
          },
          {
            alias: 'splash_volatility_holder',
            src: PATH + '/assets/raw/environment/splash_volatility_holder.png'
          },
          {
            alias: 'splash_tick_holder',
            src: PATH + '/assets/raw/environment/splash_tick_holder.png'
          },
          {
            alias: 'splash_radiobutton_outside',
            src: PATH + '/assets/raw/environment/splash_radiobutton_outside.png'
          },
          {
            alias: 'splash_radiobutton_inside',
            src: PATH + '/assets/raw/environment/splash_radiobutton_inside.png'
          },
          {
            alias: 'splash_spin_button',
            src: PATH + '/assets/raw/environment/splash_spin_button.png'
          },
          {
            alias: 'splash_spin_button_arrow',
            src: PATH + '/assets/raw/environment/splash_spin_button_arrow.png'
          },
          {
            alias: 'splash_spin_button_icon',
            src: PATH + '/assets/raw/environment/splash_spin_button_icon.png'
          },
          {
            alias: 'splash_ticked',
            src: PATH + '/assets/raw/environment/splash_ticked.png'
          },
          {
            alias: 'splash_ticked_bg',
            src: PATH + '/assets/raw/environment/splash_ticked_bg.png'
          },
          {
            alias: 'splash_volatility_arrow',
            src: PATH + '/assets/raw/environment/splash_volatility_arrow.png'
          },
          {
            alias: 'line_mask',
            src: PATH + '/assets/raw/environment/line_mask.png'
          },
          {
            alias: 'tnt_cable_landscape',
            src: PATH + '/assets/raw/environment/tnt_cable_landscape.png'
          },
          {
            alias: 'tnt_cable_portrait',
            src: PATH + '/assets/raw/environment/tnt_cable_portrait.png'
          },
          {
            alias: 'golden_key',
            src: PATH + '/assets/raw/environment/golden_key.png'
          },
          {
            alias: 'win_event_strip',
            src: PATH + '/assets/raw/environment/win_event_strip.png'
          },
          {
            alias: 'win_strap',
            src: PATH + '/assets/raw/environment/win_strap.png'
          },
          {
            alias: 'win_strap_line',
            src: PATH + '/assets/raw/environment/win_strap_line.png'
          },
          {
            alias: 'win_strap_particle',
            src: PATH + '/assets/raw/environment/win_strap_particle.png'
          }
        ]
      },
      {
        name: 'backgrounds',
        assets: [
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

  public readonly ANIMATIONS: BundleFile = {
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

  public readonly AUDIO: BundleFile = {
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

  public readonly FONTS: BundleFile = {
    bundles: [
      {
        name: "fonts",
        assets: [
          {
            alias: "Numbers",
            src: `${PATHS.ROOT}/spritesheets/numbers/numbers.json`,
          }
        ],
      },
    ],
  };

  // spine symbol indexes to asset name mapping
  public readonly SYMBOL_SPINE_ASSET: SpineAssetData = {
    atlas: "symbols_atlas",
    skeleton: "symbols_data",
  } as const;

  public readonly BONUS_SPINE_ASSET: SpineAssetData = {
    atlas: 'bonus_atlas',
    skeleton: 'bonus_data'
  } as const;

  public readonly ENVIRONMENT_SPINE_ASSET: SpineAssetData = {
    atlas: "environment_atlas",
    skeleton: "environment_data",
  } as const;

  public readonly WINEVENT_SPINE_ASSET: SpineAssetData = {
    atlas: "winevent_atlas",
    skeleton: "winevent_data",
  } as const;

  public readonly TRANSITION_SPINE_ASSET: SpineAssetData = {
    atlas: "transition_atlas",
    skeleton: "transition_data",
  } as const;

  public readonly LINE_SPINE_ASSET: SpineAssetData = {
    atlas: "lines_atlas",
    skeleton: "lines_data",
  } as const;

  public getAllAssets(resolution: string): BundleFile {
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

    return allAssets;
  }

  private setResolution() {
    const multiResolutionAssets: BundleFile = {
      bundles: [...this.SPRITESHEETS.bundles],
    };

    multiResolutionAssets.bundles.forEach((bundle: any) => {
      bundle.assets.forEach((asset: any) => {
        asset.src = (asset.src as string).replace("{{resolution}}", this.RES);
      });
    });
  }

  public getSpritesheetAssets(): BundleFile {
    return this.SPRITESHEETS;
  }

  public getImageAssets(): BundleFile {
    return this.IMAGES;
  }

  public getSymbolAsset(symbolIndex: number): string {
    return symbolIndex.toString();
  }

  public getBlurredSymbolAsset(symbolIndex: number): string {
    return `${symbolIndex}_blur`;
  }
}