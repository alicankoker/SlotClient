import { Application, Sprite, Text, TextStyle, Graphics } from 'pixi.js';
import { ResponsiveManager, ResponsivePresets, createResponsiveConfig } from '../engine/controllers/ResponsiveSystem';

export class SlotGame {
    private app: Application;
    private responsiveManager: ResponsiveManager;
    private reels: Sprite[] = [];
    private spinButton?: Sprite;
    private titleText?: Text;
    private balanceText?: Text;

    constructor(app: Application, responsiveManager: ResponsiveManager) {
        this.app = app;
        this.responsiveManager = responsiveManager;
        this.createSlotGame();
    }

    static async create(): Promise<SlotGame> {
        // Create and initialize application
        const app = new Application();
        await app.init({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x2c1810, // Dark brown casino background
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            resizeTo: window
        });

        document.body.appendChild(app.canvas);
        
        // Create responsive manager
        const responsiveManager = new ResponsiveManager(app);

        // Return new instance
        return new SlotGame(app, responsiveManager);
    }

    private createSlotGame(): void {
        this.createTitle();
        this.createReels();
        this.createSpinButton();
        this.createUI();
    }

    private createTitle(): void {
        const titleStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 48,
            fill: '#FFD700', // Gold color
            fontWeight: 'bold',
            stroke: { color: '#8B4513', width: 3 }
        });

        this.titleText = new Text('SLOT MACHINE', titleStyle);
        this.app.stage.addChild(this.titleText);

        // Position title at top center
        this.responsiveManager.addResponsiveObject(this.titleText, createResponsiveConfig({
            ...ResponsivePresets.topCenter,
            y: 0.08  // 8% from top
        }));
    }

    private createReels(): void {
        const reelColors = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xF9CA24, 0xF0932B];
        const reelCount = 5;

        for (let i = 0; i < reelCount; i++) {
            // Create reel background
            const reelGraphics = new Graphics();
            reelGraphics.rect(0, 0, 80, 120);
            reelGraphics.fill(0x333333);
            reelGraphics.stroke({ color: 0xFFD700, width: 2 });

            const reelTexture = this.app.renderer.generateTexture(reelGraphics);
            const reel = new Sprite(reelTexture);
            
            this.app.stage.addChild(reel);
            this.reels.push(reel);

            // Create symbol on reel
            const symbolGraphics = new Graphics();
            symbolGraphics.rect(0, 0, 60, 60);
            symbolGraphics.fill(reelColors[i]);
            
            const symbolTexture = this.app.renderer.generateTexture(symbolGraphics);
            const symbol = new Sprite(symbolTexture);
            
            reel.addChild(symbol);
            symbol.x = 10;
            symbol.y = 30;

            // Position reels horizontally across the screen
            const xPosition = 0.2 + (i * 0.15); // Start at 20%, space by 15%
            
            this.responsiveManager.addResponsiveObject(reel, createResponsiveConfig({
                x: xPosition,
                y: 0.5,
                anchorX: 0.5,
                anchorY: 0.5,
                scaleX: 0.8,
                scaleY: 0.8
            }));
        }
    }

    private createSpinButton(): void {
        // Create spin button background
        const buttonGraphics = new Graphics();
        buttonGraphics.roundRect(0, 0, 120, 60, 10);
        buttonGraphics.fill(0xFF6B6B);
        buttonGraphics.stroke({ color: 0xFFD700, width: 3 });

        const buttonTexture = this.app.renderer.generateTexture(buttonGraphics);
        this.spinButton = new Sprite(buttonTexture);
        
        this.app.stage.addChild(this.spinButton);

        // Add button text
        const buttonTextStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 24,
            fill: '#FFFFFF',
            fontWeight: 'bold'
        });
        
        const buttonText = new Text('SPIN', buttonTextStyle);
        this.spinButton.addChild(buttonText);
        buttonText.anchor.set(0.5);
        buttonText.x = 60;
        buttonText.y = 30;

        // Make button interactive
        this.spinButton.eventMode = 'static';
        this.spinButton.cursor = 'pointer';
        this.spinButton.on('pointerdown', this.onSpinClick.bind(this));

        // Position spin button at bottom center
        this.responsiveManager.addResponsiveObject(this.spinButton, createResponsiveConfig({
            ...ResponsivePresets.bottomCenter,
            y: 0.85  // 85% from top
        }));
    }

    private createUI(): void {
        // Create balance display
        const balanceStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 24,
            fill: '#FFD700',
            fontWeight: 'bold'
        });

        this.balanceText = new Text('BALANCE: $1000', balanceStyle);
        this.app.stage.addChild(this.balanceText);

        // Position balance at top left
        this.responsiveManager.addResponsiveObject(this.balanceText, createResponsiveConfig({
            ...ResponsivePresets.topLeft,
            x: 0.05,  // 5% from left
            y: 0.05   // 5% from top
        }));

        // Create bet amount display
        const betStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 20,
            fill: '#FFFFFF'
        });

        const betText = new Text('BET: $10', betStyle);
        this.app.stage.addChild(betText);

        // Position bet at top right
        this.responsiveManager.addResponsiveObject(betText, createResponsiveConfig({
            ...ResponsivePresets.topRight,
            x: 0.95,  // 95% from left
            y: 0.05   // 5% from top
        }));

        // Create win display
        const winStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 28,
            fill: '#00FF00',
            fontWeight: 'bold'
        });

        const winText = new Text('WIN: $0', winStyle);
        this.app.stage.addChild(winText);

        // Position win display below reels
        this.responsiveManager.addResponsiveObject(winText, createResponsiveConfig({
            ...ResponsivePresets.center,
            y: 0.7  // 70% from top
        }));
    }

    private onSpinClick(): void {

        
        // Simple animation - change reel colors randomly
        this.reels.forEach((reel) => {
            const symbol = reel.children[0] as Sprite;
            if (symbol) {
                // Random color animation
                const colors = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xF9CA24, 0xF0932B, 0x6C5CE7, 0xA29BFE];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                
                // Simple color change (in a real game, you'd have proper animations)
                const newGraphics = new Graphics();
                newGraphics.rect(0, 0, 60, 60);
                newGraphics.fill(randomColor);
                
                const newTexture = this.app.renderer.generateTexture(newGraphics);
                symbol.texture = newTexture;
            }
        });
    }

    public getApp(): Application {
        return this.app;
    }

    public getResponsiveManager(): ResponsiveManager {
        return this.responsiveManager;
    }
}

// Usage example:
// const slotGame = await SlotGame.create(); 