import { SpineAssetData } from "@slotclient/types/IAssetLoader";

export interface IAssetsConfig {
  SYMBOL_SPINE_ASSET: SpineAssetData;
  ENVIRONMENT_SPINE_ASSET: SpineAssetData;
  BONUS_SPINE_ASSET?: SpineAssetData;
  WINEVENT_SPINE_ASSET?: SpineAssetData;
  TRANSITION_SPINE_ASSET?: SpineAssetData;
  LINE_SPINE_ASSET?: SpineAssetData;
  
  getSymbolAsset(symbolIndex: number): string;
  getBlurredSymbolAsset(symbolIndex: number): string;
  getAllAssets(resolution: string): any;
}

export abstract class BaseAssetsConfig implements IAssetsConfig {
  abstract SYMBOL_SPINE_ASSET: SpineAssetData;
  abstract ENVIRONMENT_SPINE_ASSET: SpineAssetData;
  abstract BONUS_SPINE_ASSET?: SpineAssetData;
  abstract WINEVENT_SPINE_ASSET?: SpineAssetData
  abstract TRANSITION_SPINE_ASSET?: SpineAssetData;
  abstract LINE_SPINE_ASSET?: SpineAssetData;
  
  public getSymbolAsset(symbolIndex: number): string {
    return symbolIndex.toString();
  }

  public getBlurredSymbolAsset(symbolIndex: number): string {
    return `${symbolIndex}_blur`;
  }

  abstract getAllAssets(resolution: string): any;
}