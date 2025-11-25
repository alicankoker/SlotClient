import { Application } from "pixi.js";
import { SlotGameController } from "./controllers/SlotGameController";
import { ResponsiveManager } from "@slotclient/engine/utils/ResponsiveManager";
import { AssetSizeManager } from "@slotclient/engine/multiResolutionSupport/AssetSizeManager";
import { AssetLoader } from "@slotclient/engine/utils/AssetLoader";
import { AssetsConfig } from "@slotclient/config/AssetsConfig";
import { setConnectionConfig } from "@slotclient/config/ConnectionConfig";
import gameConfig from "./config";
import { debug } from "@slotclient/engine/utils/debug";
import { GameDataManager } from "@slotclient/engine/data/GameDataManager";
import { SocketConnection } from "@slotclient/communication/Connection/SocketConnection";
import SoundManager from "@slotclient/engine/controllers/SoundManager";
import type { AudioBundle } from "@slotclient/engine";

export class JunglejaneMain {
  private app!: Application;
  private responsiveManager!: ResponsiveManager;
  private slotGameController?: SlotGameController;
  private assetLoader!: AssetLoader;
  private assetResolutionChooser!: AssetSizeManager;

  public async init(): Promise<void> {
    try {
      debug.log("🎰 Junglejane initializing...");

      // Initialize connection config from game config
      setConnectionConfig({
        BACKEND_URL: gameConfig.BACKEND_URL,
        USER_ID: gameConfig.USER_ID,
      });

      // Create PixiJS application
      this.app = new Application();
      await this.app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x000000,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        resizeTo: window,
      });

      document.getElementById("pixi-container")?.appendChild(this.app.canvas);

      // Initialize responsive manager
      this.responsiveManager = ResponsiveManager.getInstance();
      this.responsiveManager.init(this.app);

      // Initialize asset resolution chooser
      this.assetResolutionChooser = AssetSizeManager.getInstance();
      this.assetResolutionChooser.init();

      // Initialize asset loader
      this.assetLoader = AssetLoader.getInstance();

      // Connect to backend
      await this.startLoader();

      // Load assets
      const resolution = this.assetResolutionChooser.getResolution();
      await this.loadAssets(resolution);
      await this.loadAudioAssets();

      // Initialize game controller
      this.slotGameController = SlotGameController.getInstance();
      this.slotGameController.init(this.app);

      debug.log("✅ Junglejane initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize Junglejane:", error);
      throw error;
    }
  }

  private async startLoader(): Promise<void> {
    const socketConnection = SocketConnection.getInstance();
    await socketConnection.connect();
  }

  private async loadAssets(res: string): Promise<void> {
    await this.assetLoader.loadBundles(AssetsConfig.getAllAssets(res));
  }

  private async loadAudioAssets(): Promise<void> {
    // Load audio separately through SoundManager (not PixiJS Assets)
    const audioBundle = AssetsConfig.getAudioAssets();
    const soundBundle = audioBundle.bundles.find((bundle) => bundle.name === "audio");
    if (soundBundle) {
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
      debug.log("Audio assets loaded via SoundManager");
    }
  }
}

// Initialize game when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const game = new JunglejaneMain();
    game.init().catch((error) => {
      console.error("Failed to start game:", error);
    });
  });
} else {
  const game = new JunglejaneMain();
  game.init().catch((error) => {
    console.error("Failed to start game:", error);
  });
}
