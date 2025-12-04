import { IAssetsConfig } from './AssetsConfig';
import { IStyleConfig } from './StyleConfig';

export class ConfigProvider {
  private static instance: ConfigProvider;
  private assetsConfig: IAssetsConfig | null = null;
  private styleConfig: IStyleConfig | null = null;

  private constructor() { }

  public static getInstance(): ConfigProvider {
    if (!ConfigProvider.instance) {
      ConfigProvider.instance = new ConfigProvider();
    }
    return ConfigProvider.instance;
  }

  // Assets Config
  public setAssetsConfig(config: IAssetsConfig): void {
    this.assetsConfig = config;
  }

  public getAssetsConfig(): IAssetsConfig {
    if (!this.assetsConfig) {
      throw new Error('AssetsConfig not initialized! Call ConfigProvider.getInstance().setConfig() first.');
    }
    return this.assetsConfig;
  }

  public hasAssetsConfig(): boolean {
    return this.assetsConfig !== null;
  }

  // Style Config
  public setStyleConfig(config: IStyleConfig): void {
    this.styleConfig = config;
  }

  public getStyleConfig(): IStyleConfig {
    if (!this.styleConfig) {
      throw new Error('StyleConfig not initialized!');
    }
    return this.styleConfig;
  }

  public hasStyleConfig(): boolean {
    return this.styleConfig !== null;
  }

  // Set all configs at once
  public setAllConfigs(configs: {
    assets: IAssetsConfig;
    style: IStyleConfig;
  }): void {
    this.setAssetsConfig(configs.assets);
    this.setStyleConfig(configs.style);
  }

  public reset(): void {
    this.assetsConfig = null;
    this.styleConfig = null;
  }
}