// Engine package exports
// Export all public APIs from the engine

// Controllers
export * from './controllers/GameController';
export * from './controllers/SignalManager';
export * from './controllers/SoundManager';

// Reels
export * from './reels/ReelController';
export * from './reels/ReelsController';
export * from './reels/ReelsContainer';
export { SpinContainer as ReelsSpinContainer } from './reels/SpinContainer';
export * from './reels/StaticContainer';

// Spin
export * from './Spin/SpinController';
export { SpinContainer as AbstractSpinContainer, SpinContainer } from './Spin/SpinContainer';
export * from './Spin/classicSpin/ClassicSpinController';
export * from './Spin/classicSpin/ClassicSpinContainer';
export * from './Spin/cascade/CascadeSpinController';
export * from './Spin/cascade/CascadeSpinContainer';

// Components
export * from './components/AnimationContainer';
export * from './components/Background';
export * from './components/Bonus';
export * from './components/FeatureScreen';
export * from './components/WinEvent';
export * from './components/WinLines';

// Utils
export * from './utils/AssetLoader';
export * from './utils/Counter';
export * from './utils/debug';
export * from './utils/Helpers';
export * from './utils/Loader';
export * from './utils/ResponsiveManager';
export * from './utils/SpriteText';
export * from './utils/Storage';
export * from './utils/Utils';

// Data
export { GameDataManager } from './data/GameDataManager';
export type { GameState } from './data/GameDataManager';

// Types
export * from './types/ICommunication';
export * from './types/IReelSpinStateData';
export * from './types/ISpinConfig';
export * from './types/IWinEvents';
export * from './types/IAssetLoader';
// Re-export shared types from @slotclient/types for convenience
export type { 
  LoaderDurations,
  AutoPlayConfig,
  OrientationConfig,
  ForceStopConfig,
  WinEventConfig,
  WinAnimationConfig,
  IFreeSpin,
  SpinContainerConfig
} from '@slotclient/types';
export { WinEventType, BackendToWinEventType, type BackendWinEventType } from '@slotclient/types';
export type { GameState as IGameState } from './types/IGameStates';

// Multi-resolution support
export * from './multiResolutionSupport/AssetSizeManager';
export * from './multiResolutionSupport/AssetSizeManagerConfig';
export * from './multiResolutionSupport/ResolutionBasedOnScreenSize';
export * from './multiResolutionSupport/AssetSize';

// Background
export * from './background/BackgroundContainer';
export * from './background/BackgroundController';

// Bonus
export * from './bonus/BonusContainer';
export * from './bonus/BonusController';

// Feature Screen
export * from './featureScreen/FeatureScreenContainer';
export * from './featureScreen/FeatureScreenController';

// Free Spin
export * from './freeSpin/FreeSpinController';

// Auto Play
export * from './AutoPlay/AutoPlayController';

// Win Event
export * from './winEvent/WinEventContainer';
export * from './winEvent/WinEventController';

// Win Lines
export * from './winLines/WinLinesContainer';
export * from './winLines/WinLinesController';

// Symbol
export * from './symbol/GridSymbol';
export { SpineSymbol, type SymbolConfig as SpineSymbolConfig } from './symbol/SpineSymbol';
export { Symbol, type SymbolConfig } from './symbol/Symbol';
export * from './symbol/SymbolUtils';

