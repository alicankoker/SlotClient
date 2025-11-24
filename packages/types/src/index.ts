// Shared type definitions for slot client packages
// These types are used across multiple packages to avoid circular dependencies

// Asset Loader types
export * from './IAssetLoader';

// Auto Play types
export * from './IAutoPlay';

// Game State types
export * from './IGameStates';

// Spin Configuration types
export * from './ISpinConfig';

// Spin Container types
export * from './ISpinContainer';

// Win Event types
export * from './IWinEvents';

// Win Presentation types
export * from './IWinPresentation';

// Free Spin types
export * from './IFreeSpin';

// Event Bus (moved from communication to break circular dependency)
export { eventBus, type eventType } from './EventBus';

