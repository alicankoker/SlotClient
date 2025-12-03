import { BaseAssetsConfig } from '@slotclient/config/AssetsConfig';

export class ConfigManager {
  private static instance: ConfigManager;
  private assetsConfig?: BaseAssetsConfig;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public setAssetsConfig(config: BaseAssetsConfig): void {
    this.assetsConfig = config;
  }

  public getAssetsConfig(): BaseAssetsConfig {
    if (!this.assetsConfig) {
      throw new Error('AssetsConfig not initialized! Call ConfigManager.getInstance().setAssetsConfig() first.');
    }
    return this.assetsConfig;
  }
}