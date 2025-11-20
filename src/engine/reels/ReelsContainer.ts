import { Container, Application, Graphics, Sprite, Text, Texture } from 'pixi.js';
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
import { Helpers } from '../utils/Helpers';
import { SpinMode } from '../types/ISpinConfig';
import { FreeSpinController } from '../freeSpin/FreeSpinController';
import { gsap } from 'gsap';
import { SpinConfig } from '../../config/SpinConfig';

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
  private floors: Sprite[] = [];
  private holes: Sprite[] = [];
  private adrenalineStripes: Spine[] = [];

  // Position storage
  private reelXPositions: number[] = [];
  private symbolXPositions: number[][] = []; // [reelIndex][symbolPosition] = x

  private _reelBackground!: Sprite;
  private _reelFrame!: Sprite;
  private _leftLantern!: Spine;
  private _rightLantern!: Spine;
  private _headerBackground!: Sprite;
  private _logo!: Sprite;
  private _isFreeSpinMode: boolean = false;
  private _spinMode: SpinMode = GameConfig.SPIN_MODES.NORMAL as SpinMode;
  private _abortController: AbortController | null = null;

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

    this.setupResizeHandler();

    this.eventListeners();
  }

  private eventListeners(): void {
    signals.on("reelStopped", (reelIndex) => {
      this.setChainAnimation(false, false, reelIndex);

      // if ((reelIndex === 2 || reelIndex === 4) && this.adrenalineStripes[reelIndex - 2].visible) {
      //   gsap.fromTo([this.adrenalineStripes[reelIndex - 2], this.adrenalineStripes[reelIndex - 1]], { alpha: 1 }, {
      //     alpha: 0, duration: 0.15, onComplete: () => {
      //       this.adrenalineStripes[reelIndex - 2].visible = false;
      //       this.adrenalineStripes[reelIndex - 2].state.clearTracks();
      //       this.adrenalineStripes[reelIndex - 1].visible = false;
      //       this.adrenalineStripes[reelIndex - 1].state.clearTracks();
      //     }
      //   });
      // }

      // if (reelIndex === 4) {
      //   this.staticContainer!.adrenalinePhase = false;
      // }
    });

    // signals.on("startAdrenalineEffect", () => {
    //   this.adrenalineStripes.forEach(stripe => {
    //     gsap.fromTo(stripe, { alpha: 0 }, {
    //       alpha: 1, duration: 0.15, onStart: () => {
    //         stripe.visible = true
    //         stripe.state.setAnimation(0, "Adrenalin_Glow", true);
    //       }
    //     });
    //   });
    // });

    // signals.on("stopAdrenalineEffect", () => {
    //   this.adrenalineStripes.forEach(stripe => {
    //     gsap.fromTo(stripe, { alpha: 1 }, {
    //       alpha: 0, duration: 0.15, onComplete: () => {
    //         stripe.visible = false;
    //         stripe.state.clearTracks();
    //       }
    //     });
    //   });
    // });
  }

  private createReelFrame(): void {
    // Create a background for the reels
    this._reelBackground = Sprite.from('base_frame_background');
    this._reelBackground.label = 'ReelFrameBackground';
    this._reelBackground.anchor.set(0.5, 0.5);
    this._reelBackground.scale.set(0.5, 0.5);
    this._reelBackground.position.set(960, 545);
    this.addChild(this._reelBackground);
  }

  private setupResizeHandler(): void {
    this.resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
      this.onResize(responsiveConfig);
    });
  }

  private initializeContainers(): void {
    this.clearAllContainers();

    const symbolHeight = GameConfig.REFERENCE_SPRITE_SYMBOL.height; // Default symbol height - can be made configurable

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

    const { atlas, skeleton } = AssetsConfig.ENVIRONMENT_SPINE_ASSET;

    for (let cIndex = 0; cIndex < 6; cIndex++) {
      const floorChain = Spine.from({ atlas, skeleton });
      floorChain.label = `FloorChain_${cIndex}`;
      floorChain.scale.set(0.5, 0.5);
      floorChain.position.set(355 + (cIndex * 242), 305);
      floorChain.state.setAnimation(0, 'Base_chain_hold', false);
      this.frameElementsContainer.addChild(floorChain);

      this.chains.push(floorChain);
    }

    for (let fIndex = 0; fIndex < 2; fIndex++) {
      const floor = Sprite.from('base_floor');
      floor.label = `FloorBase_${fIndex}`;
      floor.anchor.set(0.5, 0.5);
      floor.scale.set(0.5, 0.5);
      floor.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (240 * fIndex) + 425);
      this.frameElementsContainer.addChild(floor);

      this.floors.push(floor);

      for (let cIndex = 0; cIndex < 6; cIndex++) {
        const hole = Sprite.from('base_chain_hole');
        hole.label = `ChainHole_${fIndex}`;
        hole.anchor.set(0.5, 0.5);
        hole.scale.set(0.5, 0.5);
        hole.position.set(355 + (cIndex * 242), 447 + (fIndex * 241));
        this.frameElementsContainer.addChild(hole);

        this.holes.push(hole);

        const floorChain = Spine.from({ atlas, skeleton });
        floorChain.label = `FloorChain_${cIndex}`;
        floorChain.scale.set(0.5, 0.5);
        floorChain.position.set(355 + (cIndex * 242), 565 + (fIndex * 240));
        floorChain.state.setAnimation(0, 'Base_chain_hold', false);
        this.frameElementsContainer.addChild(floorChain);

        this.chains.push(floorChain);
      }
    }

    // for (let index = 0; index < 4; index++) {
    //   const { atlas, skeleton } = AssetsConfig.ENVIRONMENT_SPINE_ASSET;
    //   const adrenalineStripe = Spine.from({ atlas, skeleton });
    //   adrenalineStripe.label = `AdrenalineStripe_${index}`;
    //   adrenalineStripe.position.set(836 + (index * 244), 555);
    //   adrenalineStripe.state.setAnimation(0, "Adrenalin_Glow", true);
    //   adrenalineStripe.visible = false;
    //   this.adrenalineStripes.push(adrenalineStripe);
    //   this.frameElementsContainer.addChild(adrenalineStripe);
    // }

    this._reelFrame = Sprite.from('base_frame');
    this._reelFrame.label = 'ReelFrame';
    this._reelFrame.anchor.set(0.5, 0.5);
    this._reelFrame.scale.set(0.5, 0.5);
    this._reelFrame.position.set(965, 595);
    this.frameElementsContainer.addChild(this._reelFrame);

    this._leftLantern = Spine.from({ atlas, skeleton });
    this._leftLantern.label = 'LeftLanternSpine';
    this._leftLantern.position.set(145, 280);
    this._leftLantern.scale.set(0.8, 0.8);
    const leftTrack = this._leftLantern.state.setAnimation(0, "Base_Lanthern", true);
    leftTrack.trackTime = Math.random() * leftTrack.animationEnd;
    this.frameElementsContainer.addChild(this._leftLantern);

    this._rightLantern = Spine.from({ atlas, skeleton });
    this._rightLantern.label = 'RightLanternSpine';
    this._rightLantern.position.set(1770, 280);
    this._rightLantern.scale.set(0.8, 0.8);
    const rightTrack = this._rightLantern.state.setAnimation(0, "Base_Lanthern", true);
    rightTrack.trackTime = Math.random() * rightTrack.animationEnd;
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
    this._logo.scale.set(0.33, 0.33);
    this._logo.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 120);
    this.frameElementsContainer.addChild(this._logo);
  }

  private createReelAreaMask(): void {
    // Calculate mask dimensions to cover all reels and visible rows
    // Width: cover all reels with proper spacing
    const totalWidth = ((GameRulesConfig.GRID.reelCount * GameConfig.REFERENCE_SPRITE_SYMBOL.width) + (GameConfig.REFERENCE_SPACING.horizontal * GameRulesConfig.GRID.reelCount)) + 25;
    // Height: cover visible rows with proper spacing
    const totalHeight = ((GameRulesConfig.GRID.rowCount * GameConfig.REFERENCE_SPRITE_SYMBOL.height) + (GameConfig.REFERENCE_SPACING.vertical * GameRulesConfig.GRID.rowCount)) + 100;

    // Center the mask
    const maskX = (GameConfig.REFERENCE_RESOLUTION.width / 2) - (totalWidth / 2);
    const maskY = (GameConfig.REFERENCE_RESOLUTION.height / 2) - (totalHeight / 2) - 40;

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
    const frameBackgroundTexture = enabled ? 'freespin_frame_background' : 'base_frame_background';
    this._reelBackground.texture = Texture.from(frameBackgroundTexture);

    const frameTexture = enabled ? 'freespin_frame' : 'base_frame';
    this._reelFrame.texture = Texture.from(frameTexture);

    const lanternAnimationName = enabled ? 'Free_Lanthern' : 'Base_Lanthern';
    const leftTrack = this._leftLantern.state.setAnimation(0, lanternAnimationName, true);
    leftTrack.trackTime = Math.random() * leftTrack.animationEnd;
    const rightTrack = this._rightLantern.state.setAnimation(0, lanternAnimationName, true);
    rightTrack.trackTime = Math.random() * rightTrack.animationEnd;

    const headerTexture = enabled ? 'freespin_header_background' : 'base_header_background';
    this._headerBackground.texture = Texture.from(headerTexture);

    const logoTexture = enabled ? 'freespin_logo' : 'base_logo';
    const logoScale = enabled ? 1 : 0.35;
    this._logo.texture = Texture.from(logoTexture);
    this._logo.scale.set(logoScale);

    const floorTexture = enabled ? `freespin_floor` : `base_floor`;
    this.floors.forEach((floor) => {
      floor.texture = Texture.from(floorTexture);
    });

    this.holes.forEach((hole) => {
      const holeTexture = enabled ? `freespin_chain_hole` : `base_chain_hole`;
      hole.texture = Texture.from(holeTexture);
    });

    const chainAnimationName = enabled ? 'Free_chain_hold' : 'Base_chain_hold';
    this.chains.forEach((chain) => {
      chain.state.setAnimation(0, chainAnimationName, false);
    });
  }

  private onResize(responsiveConfig: ResponsiveConfig): void {
    switch (responsiveConfig.orientation) {
      case GameConfig.ORIENTATION.landscape:
        this.position.set(0, 0);
        this._leftLantern.position.set(145, 280);
        this._rightLantern.position.set(1770, 280);
        break;
      case GameConfig.ORIENTATION.portrait:
        this.position.set(0, -270);
        this._leftLantern.position.set(420, -600);
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

  public async setChainAnimation(isSpinning: boolean, loop: boolean, reelIndex?: number): Promise<void> {    
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    const chainAnimationName = isSpinning
      ? (this._isFreeSpinMode ? 'Free_chain' : 'Base_chain')
      : (this._isFreeSpinMode ? 'Free_chain_hold' : 'Base_chain_hold');

    if (reelIndex === undefined) {
      this.chains.forEach(async (chain, index) => {
        if (this._spinMode === GameConfig.SPIN_MODES.NORMAL) {
          await Helpers.delay(SpinConfig.REEL_SPIN_DURATION * (index % 6), signal);
        } else if (this._spinMode === GameConfig.SPIN_MODES.FAST) {
          await Helpers.delay((SpinConfig.REEL_SPIN_DURATION / 3) * (index % 6), signal);
        }

        chain.state.setAnimation(0, chainAnimationName, loop);
      });
    } else {
      const col = reelIndex % 6;

      const targetIndices = reelIndex === 4 ? [col, col + 1, col + 6, col + 7, col + 12, col + 13] : [col, col + 6, col + 12];

      for (const i of targetIndices) {
        this.chains[i].state.setAnimation(0, chainAnimationName, loop);
      }
    }
  }

  public forceStopChainAnimation(): void {
    this._abortController?.abort();
    this._abortController = null;
  }

  public setAdrenalineMode(enabled: boolean, reelIndex: number): void {
  }

  public getMask(): Graphics {
    return this.reelAreaMask;
  }

  public getElementsContainer(): Container | undefined {
    return this.frameElementsContainer;
  }

  public getSpinMode(): SpinMode {
    return this._spinMode;
  }

  public setSpinMode(value: SpinMode) {
    this._spinMode = value;
  }

  public get isFreeSpinMode(): boolean {
    return this._isFreeSpinMode;
  }

  public set isFreeSpinMode(value: boolean) {
    this._isFreeSpinMode = value;
  }
} 