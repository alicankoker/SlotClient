import { Sprite, Texture, Application } from "pixi.js";
import { ResponsiveManager } from './controllers/ResponsiveSystem';
import { signals, SCREEN_SIGNALS, SignalSubscription } from './controllers/SignalManager';
import { GameConfig } from "../config/GameConfig";

export class Background extends Sprite {
    private app: Application;
    private responsiveManager: ResponsiveManager;
    private resizeSubscription?: SignalSubscription;

    constructor(texture: Texture, app: Application, responsiveManager: ResponsiveManager) {
        super(texture);
        
        this.app = app;
        this.responsiveManager = responsiveManager;
        
        // Set initial size and position
        this.setupBackground();
        
        // Subscribe to resize events
        this.setupResizeHandler();
    }

    private setupBackground(): void {
        this.anchor.set(0.5);
        this.x = this.app.screen.width / 2;
        this.y = this.app.screen.height / 2;
        this.width = this.app.screen.width;
        this.height = this.app.screen.height;
    }

    private setupResizeHandler(): void {
        // Subscribe to resize events using the signal system
        this.resizeSubscription = signals.on(SCREEN_SIGNALS.SCREEN_RESIZE, () => {
            this.onResize();
        });
    }

    private onResize(): void {
        // Update background size and position on resize
        this.width = this.app.screen.width;
        this.height = this.app.screen.height;
        this.x = this.app.screen.width / 2;
        this.y = this.app.screen.height / 2;
        
        console.log(`Background: Resized to ${this.width}x${this.height} at (${this.x}, ${this.y})`);
        console.log(`Screen size: ${this.app.screen.width}x${this.app.screen.height}`);
    }

    public destroy(): void {
        // Clean up resize subscription
        if (this.resizeSubscription) {
            this.resizeSubscription.unsubscribe();
            this.resizeSubscription = undefined;
        }
        
        // Call parent destroy
        super.destroy();
    }
}