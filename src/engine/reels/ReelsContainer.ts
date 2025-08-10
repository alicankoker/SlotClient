import { Container, Application, Graphics, Sprite, Texture } from 'pixi.js';
import { ResponsiveManager } from '../controllers/ResponsiveSystem';
import { SpinContainer, SpinContainerConfig } from './SpinContainer';
import { StaticContainer } from './StaticContainer';
import { GameConfig } from '../../config/GameConfig';
// SymbolConfig import removed - using direct calculations
import { SymbolUtils } from '../symbol/SymbolUtils';
import { signals, SCREEN_SIGNALS, SignalSubscription } from '../controllers/SignalManager';
import { 
    InitialGridData, 
    CascadeStepData
} from '../types/GameTypes';
import { GridSymbol } from '../symbol/GridSymbol';
import { IReelMode } from './ReelController';
import { Background } from '../Background';
export class ReelsContainer extends Container {
    private app: Application;
    private responsiveManager: ResponsiveManager;
    private resizeSubscription?: SignalSubscription;
    
    // Mask for the entire reel area
    private reelAreaMask: Graphics;
    
    // ONE SpinContainer and ONE StaticContainer for entire game
    private spinContainer?: SpinContainer;
    private staticContainer?: StaticContainer;
    
    // Position storage
    private reelXPositions: number[] = [];
    private symbolXPositions: number[][] = []; // [reelIndex][symbolPosition] = x

    private reelBackground: Sprite = new Sprite();
    
    private readonly numberOfReels: number;
    private readonly symbolsPerReel: number;

    constructor(app: Application, responsiveManager: ResponsiveManager) {
        super();
        
        this.app = app;
        this.responsiveManager = responsiveManager;
        this.numberOfReels = GameConfig.GRID_LAYOUT.columns;
        this.symbolsPerReel = GameConfig.GRID_LAYOUT.visibleRows;
        
        // Create mask for the entire reel area
        this.reelAreaMask = new Graphics();

        this.createReelBackground();
        this.addChild(this.reelAreaMask);
        
        this.setupResizeHandler();
        this.initializeContainers();
        this.calculatePositions();
       
        this.createReelAreaMask();
    }

    private createReelBackground(): void {
        this.reelBackground = new Background(Texture.from("reel_background.png"), this.app, this.responsiveManager);
        this.addChild(this.reelBackground);
    }

    private setupResizeHandler(): void {
        this.resizeSubscription = signals.on(SCREEN_SIGNALS.SCREEN_RESIZE, () => {
            this.onResize();
        });
    }

    private initializeContainers(): void {
        this.clearAllContainers();
        
        const symbolHeight = 100; // Default symbol height - can be made configurable
        
        // Create ONE SpinContainer for entire game
        this.createSpinContainer(symbolHeight);
        
        // Create ONE StaticContainer for entire game
        this.createStaticContainer(symbolHeight);
        
        this.updateAllPositions();
    }

    private createSpinContainer(symbolHeight: number): void {
        const spinContainerConfig: SpinContainerConfig = {
            reelIndex: 0, // Single container manages all reels, but still needs this for compatibility
            numberOfReels: this.numberOfReels, // Will handle all reels
            symbolHeight,
            symbolsVisible: this.symbolsPerReel,
            rowsAboveMask: GameConfig.GRID_LAYOUT.rowsAboveMask,
            rowsBelowMask: GameConfig.GRID_LAYOUT.rowsBelowMask,
            spinSpeed: 10,
            spinDuration: 2000
        };
        
        this.spinContainer = new SpinContainer(this.app, this.responsiveManager, spinContainerConfig);
        
        // Set initial visibility - hidden by default
        this.spinContainer.visible = false;
        
        // Add to display
        this.addChild(this.spinContainer);
    }

    private createStaticContainer(symbolHeight: number): void {
        // Create single StaticContainer for all reels
        this.staticContainer = new StaticContainer(this.app, this.responsiveManager, {
            reelIndex: 0, // Single container manages all reels
            symbolHeight,
            symbolsVisible: this.symbolsPerReel
        });
        
        // Set initial visibility - visible by default
        this.staticContainer.visible = true;
        
        // Add to display
        this.addChild(this.staticContainer);
    }

    private onResize(): void {
        this.calculatePositions();
        this.updateAllPositions();
        // DISABLED: Mask update on resize commented out
        this.updateReelAreaMask();
        const scale = GameConfig.getReferenceSymbolScale(this.app.screen.width, this.app.screen.height  );
        this.reelBackground.scale.set(scale[0], scale[1]); // Scale the background to the new size 
        const textureWidth = this.reelBackground.texture.width;
        const textureHeight = this.reelBackground.texture.height;
        this.reelBackground.x = 0//textureWidth / 2 + textureWidth * 0.5;
        this.reelBackground.y = 0//textureHeight / 2 + textureHeight * 0.5;
        this.reelBackground.anchor.set(0.5);
        /*this.reelBackground.x = -this.app.screen.width / 2;
        this.reelBackground.y = -this.app.screen.height / 2;*/
    }

    private createReelAreaMask(): void {
        this.updateReelAreaMask();
        // Apply the mask to this container so all child containers are masked
        if (this.spinContainer) {
            this.spinContainer.mask = this.reelAreaMask;
            console.log('ReelsContainer: Reel area mask created and applied');
        }
        if(this.staticContainer) {
            this.staticContainer.mask = this.reelAreaMask;
            console.log('ReelsContainer: Reel area mask created and applied');
        }
    }

    private updateReelAreaMask(): void {
        // Use proper scaled symbol dimensions (like original Reel.ts)
        const scaledSymbol = GameConfig.getScaledSymbolSize(this.app.screen.width, this.app.screen.height);
        const horizontalSpacing = SymbolUtils.calculateHorizontalSpacing(this.app.screen.width, this.app.screen.height);
        const verticalSpacing = SymbolUtils.calculateVerticalSpacing(this.app.screen.width, this.app.screen.height);
        
        // Calculate mask dimensions to cover all reels and visible rows
        // Width: cover all reels with proper spacing
        const totalWidth = (this.numberOfReels) * horizontalSpacing * this.app.screen.width + scaledSymbol.width * 1.2;
        // Height: cover visible rows with proper spacing
        const totalHeight = this.symbolsPerReel * verticalSpacing * this.app.screen.height * 1;
        
        // Center the mask
        const maskX = -totalWidth / 2;//* (this.numberOfReels - 3.5 ) * 0.91;
        const maskY = -totalHeight / 2;
        
        // Clear and redraw the mask
        this.reelAreaMask.clear();
        this.reelAreaMask.rect(maskX, maskY, totalWidth, totalHeight);
        this.reelAreaMask.fill(0xffffff); // White fill for the mask
        
        console.log(`ReelsContainer: Mask updated - ${totalWidth.toFixed(0)}x${totalHeight.toFixed(0)} at (${maskX.toFixed(0)}, ${maskY.toFixed(0)})`);
        console.log(`ReelsContainer: Scaled symbol: ${scaledSymbol.width}x${scaledSymbol.height}, H-spacing: ${(horizontalSpacing * this.app.screen.width).toFixed(0)}px, V-spacing: ${(verticalSpacing * this.app.screen.height).toFixed(0)}px`);
    }

    private calculatePositions(): void {
        this.reelXPositions = [];
        this.symbolXPositions = [];
        
        const horizontalSpacing = SymbolUtils.calculateHorizontalSpacing(this.app.screen.width, this.app.screen.height);
        
        for (let reelIndex = 0; reelIndex < this.numberOfReels; reelIndex++) {
            // Calculate reel X position in relative coordinates (not pixels)
            const reelX = (reelIndex - Math.floor(this.numberOfReels / 2)) * horizontalSpacing;
            // Store as relative coordinates for container positioning
            this.reelXPositions[reelIndex] = reelX;
            
            // Calculate symbol X positions (convert to pixels only for symbol positioning)
            this.symbolXPositions[reelIndex] = [];
            const pixelX = reelX * this.app.screen.width;
            for (let symbolPos = 0; symbolPos < this.symbolsPerReel; symbolPos++) {
                this.symbolXPositions[reelIndex][symbolPos] = pixelX; // Pixels for symbols
            }
        }
    }

    private updateAllPositions(): void {
        this.x = this.app.screen.width / 2;
        this.y = this.app.screen.height / 2;
        for (let i = 0; i < this.numberOfReels; i++) {
           // this.updateContainerPosition(i);
        }
    }

    private updateContainerPosition(reelIndex: number): void {
        const relativeX = this.reelXPositions[reelIndex]; // Now correctly relative coordinates
        const reelY = 0; // Default Y position - can be made configurable
        
        // Convert relative coordinates to pixels for container positioning
        const pixelX = relativeX * this.app.screen.width;
        
        // Update StaticContainer position
        if (this.staticContainer) {
            this.staticContainer.position.set(0, reelY);
        }
    }

    // Container access methods
    public getSpinContainer(): SpinContainer | undefined {
        return this.spinContainer;
    }

    public getStaticContainer(): StaticContainer | undefined {
        return this.staticContainer;
    }

    public getAllStaticContainers(): StaticContainer[] {
        return this.staticContainer ? [this.staticContainer] : [];
    }

    // Position access methods
    public getReelXPosition(reelIndex: number): number {
        return this.reelXPositions[reelIndex] || 0;
    }

    public getSymbolXPosition(reelIndex: number, symbolPosition: number): number {
        return this.symbolXPositions[reelIndex]?.[symbolPosition] || 0;
    }

    public getAllReelXPositions(): number[] {
        return [...this.reelXPositions];
    }

    // Mode management
    public setMode(mode:IReelMode): void {
        if (this.spinContainer) {
            this.spinContainer.setMode(mode);
            this.spinContainer.visible = mode !== 'static'; 
            console.log('ReelsContainer: Spin container visible set to:', this.spinContainer.visible);
        
        }

        if (this.staticContainer) {
            this.staticContainer.visible = mode === 'static';
            console.log('ReelsContainer: Static container visible set to:', this.staticContainer.visible);
        }
    }

    // Legacy methods for compatibility - updated to use single SpinContainer
    public executeOnReel(action: (reel: SpinContainer) => void): boolean {
        const container = this.getSpinContainer();
        if (container) {
            action(container);
            return true;
        }
        return false;
    }

    public executeOnAllReels(action: (reel: SpinContainer, index: number) => void): void {
        // Single SpinContainer handles all reels
        const container = this.getSpinContainer();
        if (container) {
            action(container, 0); // Call once for the single container
        }
    }

    /*public displayInitialGrid(gridData: InitialGridData): void {2
        this.setMode('cascading');
        const spinContainer = this.getSpinContainer();
        if (spinContainer) {
            spinContainer.displayInitialGrid(gridData);
        }
    }

    /*public processCascadeStep(stepData: CascadeStepData): void {
        const spinContainer = this.getSpinContainer();
        if (spinContainer) {
            spinContainer.processCascadeStep(stepData);
        }
    }*/

    // Symbol access methods - unified API
    public getSymbolAt(reelIndex: number, position: number): GridSymbol | null {
        const container = this.getStaticContainer();
        return container ? container.getSymbolAt(position) as GridSymbol : null;
    }

    public getSymbolIdAt(reelIndex: number, position: number): number | null {
        const container = this.getStaticContainer();
        return container ? container.getSymbolIdAt(position) : null;
    }

    public updateSymbolAt(reelIndex: number, position: number, symbolId: number): boolean {
        const container = this.getStaticContainer();
        return container ? container.updateSymbolAt(position, symbolId) : false;
    }

    // Cleanup methods
    private clearAllContainers(): void {
        // Destroy the single spinContainer if it exists
        if (this.spinContainer) {
            this.removeChild(this.spinContainer);
            this.spinContainer.destroy();
            this.spinContainer = undefined; // Clear the reference
        }
        
        // Destroy the single staticContainer if it exists
        if (this.staticContainer) {
            this.removeChild(this.staticContainer);
            this.staticContainer.destroy();
            this.staticContainer = undefined; // Clear the reference
        }
    }

    public destroy(): void {
        if (this.resizeSubscription) {
            this.resizeSubscription.unsubscribe();
        }
        
        this.clearAllContainers();
        
        // Clean up the reel area mask
        if (this.reelAreaMask) {
            this.reelAreaMask.destroy();
        }
        
        super.destroy();
    }
} 