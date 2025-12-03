import { IAssetsConfig } from './AssetsConfig';

export class AssetsConfigProvider {
  private static instance: AssetsConfigProvider;
  private config: IAssetsConfig | null = null;

  private constructor() {}

  public static getInstance(): AssetsConfigProvider {
    if (!AssetsConfigProvider.instance) {
      AssetsConfigProvider.instance = new AssetsConfigProvider();
    }
    return AssetsConfigProvider.instance;
  }

  public setConfig(config: IAssetsConfig): void {
    this.config = config;
  }

  public getConfig(): IAssetsConfig {
    if (!this.config) {
      throw new Error('AssetsConfig not initialized! Call AssetsConfigProvider.getInstance().setConfig() first.');
    }
    return this.config;
  }

  public hasConfig(): boolean {
    return this.config !== null;
  }
}