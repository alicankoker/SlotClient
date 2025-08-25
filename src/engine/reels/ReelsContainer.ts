import { Container, Application, Graphics, Sprite, Texture, Point } from 'pixi.js';
import { SpinContainer, SpinContainerConfig } from './SpinContainer';
import { StaticContainer } from './StaticContainer';
import { GameConfig } from '../../config/GameConfig';
import { signals, SCREEN_SIGNALS, SignalSubscription } from '../controllers/SignalManager';
import {
    InitialGridData,
    CascadeStepData
} from '../types/GameTypes';
import { GridSymbol } from '../symbol/GridSymbol';
import { IReelMode } from './ReelController';
import { debug } from '../utils/debug';
import { GameRulesConfig } from '../../config/GameRulesConfig';
import { WinLinesContainer } from '../components/WinLinesContainer';

export class ReelsContainer extends Container {
    private app: Application;
    private resizeSubscription?: SignalSubscription;

    // Mask for the entire reel area
    private reelAreaMask: Graphics;

    // ONE SpinContainer and ONE StaticContainer for entire game
    private spinContainer?: SpinContainer;
    private staticContainer?: StaticContainer;
    private winLinesContainer?: WinLinesContainer;

    // Position storage
    private reelXPositions: number[] = [];
    private symbolXPositions: number[][] = []; // [reelIndex][symbolPosition] = x

    private reelBackground: Sprite = new Sprite();

    private readonly numberOfReels: number;
    private readonly symbolsPerReel: number;

    constructor(app: Application) {
        super();

        this.app = app;
        this.numberOfReels = GameConfig.GRID_LAYOUT.columns;
        this.symbolsPerReel = GameConfig.GRID_LAYOUT.visibleRows;

        this.createReelBackground();

        // Create mask for the entire reel area
        this.reelAreaMask = new Graphics();

        this.createReelAreaMask();

        this.initializeContainers();
    }

    private createReelBackground(): void {
        // Create a background for the reels
        const texture = Texture.from("reel_background.png");
        this.reelBackground = new Sprite(texture);
        this.reelBackground.anchor.set(0.5);
        this.reelBackground.x = GameConfig.REFERENCE_RESOLUTION.width / 2;
        this.reelBackground.y = GameConfig.REFERENCE_RESOLUTION.height / 2 - 15;
        this.reelBackground.scale.set(0.33);
        this.addChild(this.reelBackground);

        debug.log('ReelsContainer: Reel background created with size:', this.reelBackground.width, 'x', this.reelBackground.height);
    }

    private setupResizeHandler(): void {
        this.resizeSubscription = signals.on(SCREEN_SIGNALS.SCREEN_RESIZE, () => {
            //this.onResize();
        });
    }

    private initializeContainers(): void {
        this.clearAllContainers();

        const symbolHeight = GameConfig.REFERENCE_SYMBOL.height; // Default symbol height - can be made configurable

        // Create ONE SpinContainer for entire game
        this.createSpinContainer(symbolHeight);

        // Create ONE StaticContainer for entire game
        this.createStaticContainer(symbolHeight);

        this.createWinLinesContainer();

        if (this.spinContainer) {
            this.spinContainer.mask = this.reelAreaMask;
        }
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

        this.spinContainer = new SpinContainer(this.app, spinContainerConfig);

        // Set initial visibility - hidden by default
        this.spinContainer.visible = false;

        // Add to display
        this.addChild(this.spinContainer);
    }

    private createStaticContainer(symbolHeight: number): void {
        // Create single StaticContainer for all reels
        this.staticContainer = new StaticContainer(this.app, {
            reelIndex: 0, // Single container manages all reels
            symbolHeight,
            symbolsVisible: this.symbolsPerReel
        });

        // Set initial visibility - visible by default
        this.staticContainer.visible = true;

        // Add to display
        this.addChild(this.staticContainer);
    }

    private createWinLinesContainer(): void {
        this.winLinesContainer = WinLinesContainer.getInstance();
        this.winLinesContainer.visible = false;
        this.addChild(this.winLinesContainer);
    }

    private createReelAreaMask(): void {
        // Calculate mask dimensions to cover all reels and visible rows
        // Width: cover all reels with proper spacing
        const totalWidth = (this.numberOfReels * GameConfig.REFERENCE_SYMBOL.width) + 10;
        // Height: cover visible rows with proper spacing
        const totalHeight = (this.symbolsPerReel * GameConfig.REFERENCE_SYMBOL.height) + 10;

        // Center the mask
        const maskX = (GameConfig.REFERENCE_RESOLUTION.width / 2) - (totalWidth / 2);
        const maskY = (GameConfig.REFERENCE_RESOLUTION.height / 2) - (totalHeight / 2);

        // Redraw the mask
        this.reelAreaMask.beginPath();
        this.reelAreaMask.rect(maskX, maskY, totalWidth, totalHeight);
        this.reelAreaMask.fill(0xffffff); // White fill for the mask
        this.reelAreaMask.closePath();
        this.addChild(this.reelAreaMask);

        debug.log(`ReelsContainer: Created reel area mask at (${maskX}, ${maskY}) with size ${totalWidth}x${totalHeight}`);
    }

    // Container access methods
    public getSpinContainer(): SpinContainer | undefined {
        return this.spinContainer;
    }

    public getStaticContainer(): StaticContainer | undefined {
        return this.staticContainer;
    }

    public getWinLinesContainer(): WinLinesContainer | undefined {
        return this.winLinesContainer;
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
    public setMode(mode: IReelMode): void {
        if (this.spinContainer) {
            this.spinContainer.setMode(mode);
            this.spinContainer.visible = mode !== IReelMode.STATIC;
            debug.log('ReelsContainer: Spin container visible set to:', this.spinContainer.visible);
        }

        if (this.staticContainer) {
            this.staticContainer.visible = mode === IReelMode.STATIC;
            debug.log('ReelsContainer: Static container visible set to:', this.staticContainer.visible);
        }

        if (this.winLinesContainer) {
            this.winLinesContainer.visible = mode === IReelMode.STATIC;
            debug.log('ReelsContainer: Win lines container visible set to:', this.winLinesContainer.visible);
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