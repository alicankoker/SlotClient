import { Application, Sprite, Text, TextStyle, Graphics } from 'pixi.js';

export class SlotGame {
    private app: Application;
    private reels: Sprite[] = [];
    private spinButton?: Sprite;
    private titleText?: Text;
    private balanceText?: Text;

    constructor(app: Application) {
        this.app = app;
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

        // Return new instance
        return new SlotGame(app);
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

        // Create bet amount display
        const betStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 20,
            fill: '#FFFFFF'
        });

        const betText = new Text('BET: $10', betStyle);
        this.app.stage.addChild(betText);

        // Create win display
        const winStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 28,
            fill: '#00FF00',
            fontWeight: 'bold'
        });

        const winText = new Text('WIN: $0', winStyle);
        this.app.stage.addChild(winText);
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
}

// Usage example:
// const slotGame = await SlotGame.create(); 