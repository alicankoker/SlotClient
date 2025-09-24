import { Container, Application, Graphics, Sprite, Texture, Point, Text } from 'pixi.js';
import { SpinContainer, SpinContainerConfig } from './SpinContainer';
import { StaticContainer } from './StaticContainer';
import { GameConfig } from '../../config/GameConfig';
import { signals, SIGNAL_EVENTS, SignalSubscription } from '../controllers/SignalManager';
import {
    InitialGridData,
    CascadeStepData
} from '../types/GameTypes';
import { GridSymbol } from '../symbol/GridSymbol';
import { IReelMode } from './ReelController';
import { debug } from '../utils/debug';
import { GameRulesConfig } from '../../config/GameRulesConfig';
import { WinLinesContainer } from '../components/WinLinesContainer';
import { AtlasAttachmentLoader, SkeletonJson, Spine } from '@esotericsoftware/spine-pixi-v8';
import { AssetsConfig } from '../../config/AssetsConfig';
import { Helpers } from '../utils/Helpers';

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

    private _reelBackground: Sprite = new Sprite();
    private _reelFrame!: Spine;
    private _autoPlayCount: number = 0;
    private _autoPlayCountText: Text;

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

        // initialize auto play count indicator
        this._autoPlayCountText = new Text({ text: '', style: GameConfig.style });
        this._autoPlayCountText.label = 'AutoPlayCountText';
        this._autoPlayCountText.anchor.set(0.5, 0.5);
        this._autoPlayCountText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 830);
        this._autoPlayCountText.visible = false;
        this.addChild(this._autoPlayCountText);
    }

    private createReelBackground(): void {
        // Create a background for the reels
        const texture = Texture.from("frame_background_base");
        this._reelBackground = new Sprite(texture);
        this._reelBackground.anchor.set(0.5, 0.5);
        this._reelBackground.x = GameConfig.REFERENCE_RESOLUTION.width / 2;
        this._reelBackground.y = GameConfig.REFERENCE_RESOLUTION.height / 2;
        this._reelBackground.scale.set(0.625, 0.475);
        this.addChild(this._reelBackground);

        const skeleton = Helpers.getSpineSkeletonData("background");

        this._reelFrame = new Spine(skeleton);
        this._reelFrame.position.set(966, 548);
        this._reelFrame.scale.set(0.62, 0.475);
        this._reelFrame.state.setAnimation(0, 'Background_Landscape_Frame_Hold', true);
        this.addChild(this._reelFrame);

        debug.log('ReelsContainer: Reel background created with size:', this._reelBackground.width, 'x', this._reelBackground.height);
    }

    private setupResizeHandler(): void {
        this.resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, () => {
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
        const totalWidth = ((GameRulesConfig.GRID.reelCount * GameConfig.REFERENCE_SYMBOL.width) + (GameConfig.REFERENCE_SPACING.horizontal * GameRulesConfig.GRID.reelCount)) + 10;
        // Height: cover visible rows with proper spacing
        const totalHeight = ((GameRulesConfig.GRID.rowCount * GameConfig.REFERENCE_SYMBOL.height) + (GameConfig.REFERENCE_SPACING.vertical * GameRulesConfig.GRID.rowCount) - 5);

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

    public playFrameAnimation(): void {
        this._reelFrame.state.setAnimation(0, 'Background_Landscape_Frame', true);
    }

    public stopFrameAnimation(): void {
        this._reelFrame.state.setAnimation(0, 'Background_Landscape_Frame_Hold', false);
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

    public getAutoPlayCount(): number {
        return this._autoPlayCount;
    }

    /**
     * @description Set the auto play count and update the display text.
     * @param count The new auto play count.
     * @param text The display text for the auto play count.
     */
    public setAutoPlayCount(count: number, text: string): void {
        this._autoPlayCount = count;
        this._autoPlayCountText.text = text;
    }

    public getAutoPlayCountText(): Text {
        return this._autoPlayCountText;
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