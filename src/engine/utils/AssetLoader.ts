import { Assets, Texture } from "pixi.js";
import {
  AssetBundle,
  IAssetLoader,
  BundleFile,
  AudioBundle,
} from "../types/IAssetLoader";
import { SIGNAL_EVENTS, signals } from "../controllers/SignalManager";
import { gsap } from "gsap";
import { debug } from "./debug";
import SoundManager from "../controllers/SoundManager";

export class AssetLoader implements IAssetLoader {
  private static instance: AssetLoader;
  private smooth = { percent: 0 }; // GSAP tween state

  constructor() {}

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  private assetsCount(assets: AssetBundle | AudioBundle): number {
    return Array.isArray(assets)
      ? assets.length
      : Object.keys(assets ?? {}).length;
  }

  private emitSmooth(percent: number, label: string) {
    const target = Math.max(this.smooth.percent, Math.min(percent, 100));
    gsap.to(this.smooth, {
      percent: target,
      duration: 0.35,
      ease: "power2.out",
      onUpdate: () => {
        signals.emit(SIGNAL_EVENTS.ASSETS_LOADED, {
          label,
          percent: this.smooth.percent,
        });
        console.log(
          "AssetLoader",
          `Loading ${label}: ${this.smooth.percent.toFixed(2)}%`
        );
      },
    });
  }

  public async loadBundles(manifest: BundleFile): Promise<void> {
    await Assets.init({ manifest });

    const preloadBundle = manifest.bundles?.find((b) => b.name === "preload");

    if (preloadBundle) {
      await Assets.loadBundle(preloadBundle.name); // ensure preload bundle is loaded first
    }

    const bundles = manifest.bundles ?? [];
    if (!bundles.length) {
      debug.warn("AssetLoader", "No bundles in manifest");
      this.emitSmooth(100, "completed");
      return;
    }

    // it can be useful to set weights manually for more realistic loading progress
    const weights = bundles.map(
      (bundle) => bundle.weight ?? this.assetsCount(bundle.assets)
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

    let weightBefore = 0;

    for (let bIndex = 0; bIndex < bundles.length; bIndex++) {
      if (bundles[bIndex].name === "preload") {
        // skip, already loaded
        weightBefore += weights[bIndex];
        continue;
      }

      const bundle = bundles[bIndex];
      const weight = weights[bIndex];

      await Assets.loadBundle(bundle.name, (progress: number) => {
        const overall01 = (weightBefore + progress * weight) / totalWeight;
        const isLast = bIndex === bundles.length - 1;
        const capped01 = isLast ? overall01 : Math.min(overall01, 0.995);
        this.emitSmooth(capped01 * 100, bundle.name);
      });

      weightBefore += weight;
    }

    this.emitSmooth(100, "completed");

    console.log("AssetLoader", "bundles loaded");

    const soundBundle = bundles.find((bundle) => bundle.name === "audio");
    if (!soundBundle) {
      debug.warn("AssetLoader", "No 'audio' bundle found");
      return;
    }

    const soundManager = SoundManager.getInstance();
    const { assets } = soundBundle as { assets: AudioBundle };

    assets.forEach((asset) => {
      soundManager.add([
        {
          alias: Array.isArray(asset.alias) ? asset.alias[0] : asset.alias,
          src: Array.isArray(asset.src) ? asset.src[0] : asset.src,
          channel: (asset.channel as "sfx" | "music") || "sfx",
        },
      ]);
    });

    console.log("AssetLoader", "'audio' bundles added to SoundManager");
  }

  public getAsset(key: string): Texture | undefined {
    const asset = Assets.get(key) as Texture | undefined;
    if (!asset) {
      console.error("AssetLoader", `Asset ${key} not found!`);
    }
    return asset;
  }

  public removeAsset(key: string): void {
    Assets.unload(key);
  }
}
