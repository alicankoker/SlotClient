import { Application } from 'pixi.js';
import { signals, SCREEN_SIGNALS } from './SignalManager';

export interface ResponsiveConfig {
    x?: number;          // 0-1 relative to screen width
    y?: number;          // 0-1 relative to screen height
    width?: number;      // 0-1 relative to screen width
    height?: number;     // 0-1 relative to screen height
    scaleX?: number;     // 0-1 relative scale
    scaleY?: number;     // 0-1 relative scale
    anchorX?: number;    // 0-1 anchor point
    anchorY?: number;    // 0-1 anchor point
}

export class ResponsiveManager {
    private app: Application;
    private responsiveObjects: Map<any, ResponsiveConfig> = new Map();
    private resizeCallbacks: Set<() => void> = new Set();

    constructor(app: Application) {
        this.app = app;
        this.setupResizeHandler();
    }

    public addResponsiveObject(displayObject: any, config: ResponsiveConfig): void {
        this.responsiveObjects.set(displayObject, config);
        this.updateObjectTransform(displayObject, config);
    }

    public removeResponsiveObject(displayObject: any): void {
        this.responsiveObjects.delete(displayObject);
    }

    public updateResponsiveConfig(displayObject: any, config: Partial<ResponsiveConfig>): void {
        const existingConfig = this.responsiveObjects.get(displayObject);
        if (existingConfig) {
            const newConfig = { ...existingConfig, ...config };
            this.responsiveObjects.set(displayObject, newConfig);
            this.updateObjectTransform(displayObject, newConfig);
        }
    }

    private setupResizeHandler(): void {
        // Handle regular window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.handleResize();
        });

        // Handle webkit fullscreen changes (Safari)
        document.addEventListener('webkitfullscreenchange', () => {
            this.handleResize();
        });

        // Handle mozilla fullscreen changes (Firefox)
        document.addEventListener('mozfullscreenchange', () => {
            this.handleResize();
        });

        // Handle orientation changes on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100); // Small delay for orientation change
        });
    }

    private handleResize(): void {
        // Force PIXI to resize its renderer
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        
        // Small delay to ensure the app has updated its screen dimensions
        setTimeout(() => {
            this.updateAllTransforms();
        }, 50);
    }

    private updateAllTransforms(): void {
        this.responsiveObjects.forEach((config, displayObject) => {
            this.updateObjectTransform(displayObject, config);
        });
        
        // Call all registered resize callbacks
        this.resizeCallbacks.forEach(callback => callback());
        
        // Emit resize signal for components using the signal system

        signals.emit(SCREEN_SIGNALS.SCREEN_RESIZE);
    }

    private updateObjectTransform(displayObject: any, config: ResponsiveConfig): void {
        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;

        // Set anchor if specified
        if ((config.anchorX !== undefined || config.anchorY !== undefined) && 'anchor' in displayObject) {
            const anchor = displayObject.anchor as any;
            if (anchor && anchor.set) {
                anchor.set(
                    config.anchorX !== undefined ? config.anchorX : anchor.x,
                    config.anchorY !== undefined ? config.anchorY : anchor.y
                );
            }
        }

        // Set position
        if (config.x !== undefined) {
            displayObject.x = screenWidth * config.x;
        }
        if (config.y !== undefined) {
            displayObject.y = screenHeight * config.y;
        }

        // Set scale using uniform scaling to maintain aspect ratio
        if (config.scaleX !== undefined || config.scaleY !== undefined) {
            // Use uniform scaling - take the smaller dimension to prevent distortion
            const scaleFactorX = screenWidth / 1920;
            const scaleFactorY = screenHeight / 1280;  // Use GameConfig reference height
            const uniformScale = Math.min(scaleFactorX, scaleFactorY);
            
            // Apply the same scale to both dimensions to maintain square shapes
            const targetScale = config.scaleX !== undefined ? config.scaleX : config.scaleY;
            if (targetScale !== undefined) {
                displayObject.scale.x = targetScale * uniformScale;
                displayObject.scale.y = targetScale * uniformScale;
            }
        }

        // Set size (for sprites with width/height properties)
        if (config.width !== undefined && 'width' in displayObject) {
            (displayObject as any).width = screenWidth * config.width;
        }
        if (config.height !== undefined && 'height' in displayObject) {
            (displayObject as any).height = screenHeight * config.height;
        }

        // PIXI will automatically handle updateTransform on next render cycle
    }

    public getScreenWidth(): number {
        return this.app.screen.width;
    }

    public getScreenHeight(): number {
        return this.app.screen.height;
    }

    public forceResize(): void {
        // Public method to manually trigger a resize update
        this.handleResize();
    }

    public addResizeCallback(callback: () => void): void {
        this.resizeCallbacks.add(callback);
    }

    public removeResizeCallback(callback: () => void): void {
        this.resizeCallbacks.delete(callback);
    }
}

// Helper function to create responsive configs
export const createResponsiveConfig = (config: ResponsiveConfig): ResponsiveConfig => config;

// Predefined common positions
export const ResponsivePresets = {
    center: { x: 0.5, y: 0.5, anchorX: 0.5, anchorY: 0.5 },
    topLeft: { x: 0, y: 0, anchorX: 0, anchorY: 0 },
    topRight: { x: 1, y: 0, anchorX: 1, anchorY: 0 },
    bottomLeft: { x: 0, y: 1, anchorX: 0, anchorY: 1 },
    bottomRight: { x: 1, y: 1, anchorX: 1, anchorY: 1 },
    topCenter: { x: 0.5, y: 0, anchorX: 0.5, anchorY: 0 },
    bottomCenter: { x: 0.5, y: 1, anchorX: 0.5, anchorY: 1 },
    leftCenter: { x: 0, y: 0.5, anchorX: 0, anchorY: 0.5 },
    rightCenter: { x: 1, y: 0.5, anchorX: 1, anchorY: 0.5 },
}; 