import { Container, Application, Graphics, Sprite, Text } from 'pixi.js';
import { SpinContainer } from './SpinContainer';
import { StaticContainer } from './StaticContainer';
import { GameConfig } from '../../config/GameConfig';
import { signals, SIGNAL_EVENTS, SignalSubscription } from '../controllers/SignalManager';
import { GridSymbol } from '../symbol/GridSymbol';
import { IReelMode } from './ReelController';
import { debug } from '../utils/debug';
import { GameRulesConfig } from '../../config/GameRulesConfig';
import { WinLines } from '../components/WinLines';
import { ResponsiveConfig } from '../utils/ResponsiveManager';
import { AssetsConfig } from '../../config/AssetsConfig';
import { Spine } from '@esotericsoftware/spine-pixi-v8';

export class ReelsContainer extends Container {
  private app: Application;
  private resizeSubscription?: SignalSubscription;

  // Mask for the entire reel area
  private reelAreaMask: Graphics;

  // ONE SpinContainer and ONE StaticContainer for entire game
  private spinContainer?: SpinContainer;
  private staticContainer?: StaticContainer;
  private winLines?: WinLines;
  private frameElementsContainer?: Container;
  private chains: Spine[] = [];

  // Position storage
  private reelXPositions: number[] = [];
  private symbolXPositions: number[][] = []; // [reelIndex][symbolPosition] = x

  private _reelBackground!: Sprite;
  private _reelFrame!: Sprite;
  private _leftLantern!: Spine;
  private _rightLantern!: Spine;
  private _headerBackground!: Sprite;
  private _logo!: Sprite;
  private _autoPlayCount: number = 0;
  private _autoPlayCountText: Text;

  private readonly numberOfReels: number;
  private readonly symbolsPerReel: number;

  constructor(app: Application) {
    super();

    this.app = app;
    this.numberOfReels = GameConfig.GRID_LAYOUT.columns;
    this.symbolsPerReel = GameConfig.GRID_LAYOUT.visibleRows;

    this.createReelFrame();

    // Create mask for the entire reel area
    this.reelAreaMask = new Graphics();

    this.createReelAreaMask();

    this.initializeContainers();

    // initialize auto play count indicator
    this._autoPlayCountText = new Text({ text: '', style: GameConfig.style });
    this._autoPlayCountText.label = 'AutoPlayCountText';
    this._autoPlayCountText.anchor.set(0.5, 0.5);
    this._autoPlayCountText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 950);
    this._autoPlayCountText.visible = false;
    this.addChild(this._autoPlayCountText);

    this.setupResizeHandler();
  }

  private createReelFrame(): void {
    // Create a background for the reels
    this._reelBackground = Sprite.from('base_frame_background');
    this._reelBackground.label = 'ReelFrameBackground';
    this._reelBackground.anchor.set(0.5, 0.5);
    this._reelBackground.position.set(980, 550);
    this.addChild(this._reelBackground);
  }

  private setupResizeHandler(): void {
    this.resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
      this.onResize(responsiveConfig);
    });
  }

  private initializeContainers(): void {
    this.clearAllContainers();

    const symbolHeight = GameConfig.REFERENCE_SYMBOL.height; // Default symbol height - can be made configurable

    // Create ONE SpinContainer for entire game
    this.createSpinContainer(symbolHeight);

    this.createFrameElements();

    // Create ONE StaticContainer for entire game
    //this.createStaticContainer(symbolHeight);

    this.createWinLines();

    if (this.spinContainer) {
      this.spinContainer.mask = this.reelAreaMask;
    }
  }

  private createSpinContainer(symbolHeight: number): void {
    /*this.spinContainer = new ClassicSpinContainer(this.app, spinContainerConfig);

        // Set initial visibility - hidden by default
        this.spinContainer.visible = false;

        // Add to display
        this.addChild(this.spinContainer!);*/
  }

  /*private createStaticContainer(symbolHeight: number): void {
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
    }*/

  private createWinLines(): void {
    this.winLines = WinLines.getInstance();
  }

  private createFrameElements(): void {
    this.frameElementsContainer = new Container();
    this.frameElementsContainer.label = 'FrameElementsContainer';

    const { atlas, skeleton } = AssetsConfig.BONUS_SPINE_ASSET;

    for (let cIndex = 0; cIndex < 6; cIndex++) {
      const floorChain = Spine.from({ atlas, skeleton });
      floorChain.label = `FloorChain_${cIndex}`;
      floorChain.scale.set(1, 0.8);
      floorChain.position.set(360 + (cIndex * 242), 305);
      floorChain.state.setAnimation(0, 'Base_chain_hold', false);
      this.frameElementsContainer.addChild(floorChain);

      this.chains.push(floorChain);
    }

    for (let fIndex = 0; fIndex < 2; fIndex++) {
      const floor = Sprite.from('base_floor');
      floor.label = `FloorBase_${fIndex}`;
      floor.anchor.set(0.5, 0.5);
      floor.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (240 * fIndex) + 435);
      this.frameElementsContainer.addChild(floor);

      for (let cIndex = 0; cIndex < 6; cIndex++) {
        const hole = Sprite.from('chain_hole');
        hole.label = `ChainHole_${fIndex}`;
        hole.anchor.set(0.5, 0.5);
        hole.scale.set(1.1, 1);
        hole.position.set(360 + (cIndex * 242), 447 + (fIndex * 241));
        this.frameElementsContainer.addChild(hole);

        const floorChain = Spine.from({ atlas, skeleton });
        floorChain.label = `FloorChain_${cIndex}`;
        floorChain.scale.set(1, 0.8);
        floorChain.position.set(360 + (cIndex * 242), 570 + (fIndex * 240));
        floorChain.state.setAnimation(0, 'Base_chain_hold', false);
        this.frameElementsContainer.addChild(floorChain);

        this.chains.push(floorChain);
      }
    }

    this._reelFrame = Sprite.from('base_frame');
    this._reelFrame.label = 'ReelFrame';
    this._reelFrame.anchor.set(0.5, 0.5);
    this._reelFrame.position.set(960, 520);
    this.frameElementsContainer.addChild(this._reelFrame);

    this._leftLantern = Spine.from({ atlas, skeleton });
    this._leftLantern.label = 'LeftLanternSpine';
    this._leftLantern.position.set(155, -20);
    this._leftLantern.scale.set(0.8, 0.8);
    this._leftLantern.state.setAnimation(0, 'Base_Lanthern', true);
    this.frameElementsContainer.addChild(this._leftLantern);

    this._rightLantern = Spine.from({ atlas, skeleton });
    this._rightLantern.label = 'RightLanternSpine';
    this._rightLantern.position.set(1750, -120);
    this._rightLantern.scale.set(0.8, 0.8);
    this._rightLantern.state.setAnimation(0, 'Base_Lanthern', true);
    this.frameElementsContainer.addChild(this._rightLantern);

    this._headerBackground = Sprite.from('base_header_background');
    this._headerBackground.label = 'HeaderBackground';
    this._headerBackground.anchor.set(0.5, 0.5);
    this._headerBackground.scale.set(0.5, 0.5);
    this._headerBackground.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 130);
    this.frameElementsContainer.addChild(this._headerBackground);

    this._logo = Sprite.from('base_logo');
    this._logo.label = 'GameLogo';
    this._logo.anchor.set(0.5, 0.5);
    this._logo.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 120);
    this.frameElementsContainer.addChild(this._logo);
  }

  private createReelAreaMask(): void {
    // Calculate mask dimensions to cover all reels and visible rows
    // Width: cover all reels with proper spacing
    const totalWidth = ((GameRulesConfig.GRID.reelCount * GameConfig.REFERENCE_SYMBOL.width) + (GameConfig.REFERENCE_SPACING.horizontal * GameRulesConfig.GRID.reelCount)) + 25;
    // Height: cover visible rows with proper spacing
    const totalHeight = ((GameRulesConfig.GRID.rowCount * GameConfig.REFERENCE_SYMBOL.height) + (GameConfig.REFERENCE_SPACING.vertical * GameRulesConfig.GRID.rowCount));

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
    // this._reelFrame.state.setAnimation(0, 'Background_Landscape_Frame', true);
  }

  public stopFrameAnimation(): void {
    // this._reelFrame.state.setAnimation(0, 'Background_Landscape_Frame_Hold', false);
  }

  // Container access methods
  public getSpinContainer(): SpinContainer | undefined {
    return this.spinContainer;
  }

  public getStaticContainer(): StaticContainer | undefined {
    return this.getChildByLabel("StaticContainer") as StaticContainer;
  }

  public getWinLines(): WinLines | undefined {
    return this.winLines;
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
      debug.log("ReelsContainer: Spin container visible set to:", this.spinContainer.visible);
    }

    if (this.staticContainer) {
      this.staticContainer.visible = mode === IReelMode.STATIC;
      debug.log("ReelsContainer: Static container visible set to:", this.staticContainer.visible);
    }

    if (mode === IReelMode.SPINNING && this.winLines) {
      this.winLines.hideAllLines();
      debug.log('ReelsContainer: Win lines container visible set to:', this.winLines.visible);
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

  public executeOnAllReels(
    action: (reel: SpinContainer, index: number) => void
  ): void {
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
    return container ? (container.getSymbolAt(position) as GridSymbol) : null;
  }

  public getSymbolIdAt(reelIndex: number, position: number): number | null {
    const container = this.getStaticContainer();
    return container ? container.getSymbolIdAt(position) : null;
  }

  public updateSymbolAt(
    reelIndex: number,
    position: number,
    symbolId: number
  ): boolean {
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
      this.spinContainer = null as unknown as SpinContainer; // Clear the reference
    }

    // Destroy the single staticContainer if it exists
    if (this.staticContainer) {
      this.removeChild(this.staticContainer);
      this.staticContainer.destroy();
      this.staticContainer = undefined; // Clear the reference
    }
  }

  public setFreeSpinMode(enabled: boolean): void {
    const animationName = enabled ? 'FS_Lanthern' : 'Base_Lanthern';
    this._leftLantern.state.setAnimation(0, animationName, true);
    this._rightLantern.state.setAnimation(0, animationName, true);
  }

  private onResize(responsiveConfig: ResponsiveConfig): void {
    switch (responsiveConfig.orientation) {
      case GameConfig.ORIENTATION.landscape:
        this.position.set(0, 0);
        this._leftLantern.position.set(155, -20);
        this._rightLantern.position.set(1750, -120);
        break;
      case GameConfig.ORIENTATION.portrait:
        this.position.set(0, -270);
        this._leftLantern.position.set(420, -540);
        this._rightLantern.position.set(1440, -600);
        break;
    }
  }

  public destroy(): void {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }

    this.clearAllContainers();

    super.destroy();
  }

  public get chainSpeed(): number {
    return this.chains.length > 0 ? this.chains[0].state.timeScale : 0;
  }

  /**
   * @description Set the speed of all chain animations.
   * @param speed The speed multiplier between 0 and 1 for the chain animations.
   */
  public set chainSpeed(speed: number) {
    this.chains.forEach(chain => {
      chain.state.timeScale = speed;
    });
  }

  public setChainAnimation(animationName: string, loop: boolean): void {
    this.chains.forEach(chain => {
      chain.state.setAnimation(0, animationName, loop);
    });
  }

  public setAdrenalineMode(enabled: boolean, reelIndex: number): void {
  }

  public getMask(): Graphics {
    return this.reelAreaMask;
  }

  public getElementsContainer(): Container | undefined {
    return this.frameElementsContainer;
  }
} 