import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { BaseReelsContainer, Helpers, ResponsiveConfig, signals } from "@slotclient/engine";
import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import { AssetsConfig } from "../configs/AssetsConfig";
import { SpinConfig } from "@slotclient/config/SpinConfig";
import { gsap } from "gsap";

export class ReelsContainer extends BaseReelsContainer {
    private assetsConfig: AssetsConfig;
    private frameElementsContainer?: Container;
    private adrenalineElementsContainer!: Container;

    private _reelAreaMask!: Graphics; // Alt sınıflar oluşturacak
    private _chains: Spine[] = [];
    private _floors: Sprite[] = [];
    private _holes: Sprite[] = [];
    private _adrenalineStripes: Spine[] = [];
    private _spark!: Spine;
    private _reelBackground!: Sprite;
    private _reelFrame!: Sprite;
    private _leftLantern!: Spine;
    private _rightLantern!: Spine;
    private _headerBackground!: Sprite;
    private _logo!: Sprite;
    private _sparkEnabled: boolean = false;
    private _abortController: AbortController | null = null;
    private _isFreeSpinMode: boolean = false;

    constructor(app: Application) {
        super(app);

        this.assetsConfig = AssetsConfig.getInstance();

        // Template Method Pattern - sıralama önemli!
        this.createReelAreaMask();      // 1. Mask oluştur
        this.createFrameElements();     // 2. Frame elements oluştur
        this.setupResizeHandler();      // 3. Resize handler kur
        this.setupEventListeners();     // 4. Event listeners kur
    }

    protected setupEventListeners(): void {
        super.setupEventListeners();

        signals.on("reelStopped", (reelIndex) => {
            this.setChainAnimation(false, false, reelIndex);
        });

        signals.on("startAdrenalineEffect", () => {
            this.startAnticipationEffect();
        });

        signals.on("stopAdrenalineEffect", () => {
            this.stopAnticipationEffect();
        });
    }

    protected createReelAreaMask(): void {
        // Calculate mask dimensions to cover all reels and visible rows
        // Width: cover all reels with proper spacing
        const totalWidth = ((this.gameConfig.GRID.reelCount * this.gameConfig.REFERENCE_SPRITE_SYMBOL.width) + (this.gameConfig.REFERENCE_SPACING.horizontal * this.gameConfig.GRID.reelCount)) + 25;
        // Height: cover visible rows with proper spacing
        const totalHeight = ((this.gameConfig.GRID.rowCount * this.gameConfig.REFERENCE_SPRITE_SYMBOL.height) + (this.gameConfig.REFERENCE_SPACING.vertical * this.gameConfig.GRID.rowCount)) + 100;

        // Center the mask
        const maskX = (this.gameConfig.REFERENCE_RESOLUTION.width / 2) - (totalWidth / 2);
        const maskY = (this.gameConfig.REFERENCE_RESOLUTION.height / 2) - (totalHeight / 2) - 40;

        // Redraw the mask
        this._reelAreaMask = new Graphics();
        this._reelAreaMask.beginPath();
        this._reelAreaMask.rect(maskX, maskY, totalWidth, totalHeight);
        this._reelAreaMask.fill(0xffffff); // White fill for the mask
        this._reelAreaMask.closePath();
        this.addChild(this._reelAreaMask);
    }

    protected createFrameElements(): void {
        this._reelBackground = Sprite.from('base_frame_background');
        this._reelBackground.label = 'ReelFrameBackground';
        this._reelBackground.anchor.set(0.5, 0.5);
        this._reelBackground.scale.set(0.5, 0.5);
        this._reelBackground.position.set(960, 545);
        this.addChild(this._reelBackground);

        this.frameElementsContainer = new Container();
        this.frameElementsContainer.label = 'FrameElementsContainer';

        const { atlas, skeleton } = this.assetsConfig.ENVIRONMENT_SPINE_ASSET;

        for (let cIndex = 0; cIndex < 6; cIndex++) {
            const floorChain = Spine.from({ atlas, skeleton });
            floorChain.label = `FloorChain_${cIndex}`;
            floorChain.scale.set(0.5, 0.5);
            floorChain.position.set(355 + (cIndex * 242), 305);
            floorChain.state.setAnimation(0, 'Base_chain_hold', false);
            this.frameElementsContainer.addChild(floorChain);

            this._chains.push(floorChain);
        }

        for (let fIndex = 0; fIndex < 2; fIndex++) {
            const floor = Sprite.from('base_floor');
            floor.label = `FloorBase_${fIndex}`;
            floor.anchor.set(0.5, 0.5);
            floor.scale.set(0.5, 0.5);
            floor.position.set(this.gameConfig.REFERENCE_RESOLUTION.width / 2, (240 * fIndex) + 425);
            this.frameElementsContainer.addChild(floor);

            this._floors.push(floor);

            for (let cIndex = 0; cIndex < 6; cIndex++) {
                const hole = Sprite.from('base_chain_hole');
                hole.label = `ChainHole_${fIndex}`;
                hole.anchor.set(0.5, 0.5);
                hole.scale.set(0.5, 0.5);
                hole.position.set(355 + (cIndex * 242), 447 + (fIndex * 241));
                this.frameElementsContainer.addChild(hole);

                this._holes.push(hole);

                const floorChain = Spine.from({ atlas, skeleton });
                floorChain.label = `FloorChain_${cIndex}`;
                floorChain.scale.set(0.5, 0.5);
                floorChain.position.set(355 + (cIndex * 242), 565 + (fIndex * 240));
                floorChain.state.setAnimation(0, 'Base_chain_hold', false);
                this.frameElementsContainer.addChild(floorChain);

                this._chains.push(floorChain);
            }
        }

        this.createAdrenalineElements();

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
        this._headerBackground.position.set(this.gameConfig.REFERENCE_RESOLUTION.width / 2, 130);
        this.frameElementsContainer.addChild(this._headerBackground);

        this._logo = Sprite.from('base_logo');
        this._logo.label = 'GameLogo';
        this._logo.anchor.set(0.5, 0.5);
        this._logo.scale.set(0.33, 0.33);
        this._logo.position.set(this.gameConfig.REFERENCE_RESOLUTION.width / 2, 120);
        this.frameElementsContainer.addChild(this._logo);
    }

    private createAdrenalineElements(): void {
        this.adrenalineElementsContainer = new Container();
        this.adrenalineElementsContainer.label = 'AdrenalineElementsContainer';
        this.adrenalineElementsContainer.visible = false;
        this.frameElementsContainer!.addChild(this.adrenalineElementsContainer);

        const { atlas, skeleton } = this.assetsConfig.ENVIRONMENT_SPINE_ASSET;

        const adrenalineStripeLeft = Spine.from({ atlas, skeleton });
        adrenalineStripeLeft.label = `AdrenalineStripe_Left`;
        adrenalineStripeLeft.position.set(1324, 555);
        this._adrenalineStripes.push(adrenalineStripeLeft);
        this.adrenalineElementsContainer.addChild(adrenalineStripeLeft);

        const adrenalineStripeRight = Spine.from({ atlas, skeleton });
        adrenalineStripeRight.label = `AdrenalineStripe_Right`;
        adrenalineStripeRight.position.set(1568, 555);
        this._adrenalineStripes.push(adrenalineStripeRight);
        this.adrenalineElementsContainer.addChild(adrenalineStripeRight);

        const adrenalineStripeTop = Spine.from({ atlas, skeleton });
        adrenalineStripeTop.label = `AdrenalineStripe_Top`;
        adrenalineStripeTop.scale.set(0.6, 0.4);
        adrenalineStripeTop.position.set(1450, 200);
        adrenalineStripeTop.angle = 90;
        this._adrenalineStripes.push(adrenalineStripeTop);
        this.adrenalineElementsContainer.addChild(adrenalineStripeTop);

        const adrenalineStripeBottom = Spine.from({ atlas, skeleton });
        adrenalineStripeBottom.label = `AdrenalineStripe_Bottom`;
        adrenalineStripeBottom.scale.set(0.6, 0.4);
        adrenalineStripeBottom.position.set(1450, 900);
        adrenalineStripeBottom.angle = 90;
        this._adrenalineStripes.push(adrenalineStripeBottom);
        this.adrenalineElementsContainer.addChild(adrenalineStripeBottom);

        this._spark = Spine.from({ atlas, skeleton });
        this._spark.label = `AdrenalineSpark`;
        this._spark.scale.set(0.3, 0.3);
        this._spark.position.set(1325, 200);
        this._spark.state.setAnimation(0, "Spark", false);
        this.adrenalineElementsContainer.addChild(this._spark);
    }

    private startAnticipationEffect(): void {
        gsap.fromTo(this.adrenalineElementsContainer, { alpha: 0 }, {
            alpha: 1, duration: 0.25, onStart: () => {
                this.adrenalineElementsContainer.visible = true;

                this._adrenalineStripes.forEach(stripe => {
                    stripe.state.setAnimation(0, "Adrenalin_Glow", true);
                });

                this._chains.forEach((chain, index) => {
                    if (index === 4 || index === 5 || index === 10 || index === 11 || index === 166 || index === 17) {
                        chain.state.setAnimation(0, "Adrenalin_chain", true);
                    }
                });

                this._sparkEnabled = true;
                this.setSparkEffect();
            }
        });
    }

    private setSparkEffect(): void {
        if (this._sparkEnabled === false) return;

        const positionX = Math.random() < 0.5 ? 1325 : 1570;
        const positionY = 200 + Math.random() * (900 - 200);
        const scaleX = positionX === 1325 ? 0.3 : -0.3;
        const scaleY = positionY < 700 ? 0.3 : -0.3;
        const speed = Math.random() + 0.5;

        this._spark.position.set(positionX, positionY);
        this._spark.scale.set(scaleX, scaleY);
        this._spark.state.timeScale = speed;

        const entry = this._spark.state.setAnimation(0, "Spark", false);

        entry.listener = {
            complete: () => {
                if (this._sparkEnabled) {
                    this.setSparkEffect();
                }
            }
        };
    }

    private stopAnticipationEffect(): void {
        gsap.to(this.adrenalineElementsContainer, {
            alpha: 0, duration: 0.25, onComplete: () => {
                this.adrenalineElementsContainer.visible = false;

                this._sparkEnabled = false;
                this._adrenalineStripes.forEach(stripe => {
                    stripe.state.setAnimation(0, "Adrenalin_Glow", false);
                });
            }
        });
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
        this._floors.forEach((floor) => {
            floor.texture = Texture.from(floorTexture);
        });

        this._holes.forEach((hole) => {
            const holeTexture = enabled ? `freespin_chain_hole` : `base_chain_hole`;
            hole.texture = Texture.from(holeTexture);
        });

        const chainAnimationName = enabled ? 'Free_chain_hold' : 'Base_chain_hold';
        this._chains.forEach((chain) => {
            chain.state.setAnimation(0, chainAnimationName, false);
        });
    }

    public get chainSpeed(): number {
        return this._chains.length > 0 ? this._chains[0].state.timeScale : 0;
    }

    /**
     * @description Set the speed of all chain animations.
     * @param speed The speed multiplier between 0 and 1 for the chain animations.
     */
    public set chainSpeed(speed: number) {
        this._chains.forEach(chain => {
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
            this._chains.forEach(async (chain, index) => {
                if (this._spinMode === this.gameConfig.SPIN_MODES.NORMAL) {
                    await Helpers.delay(SpinConfig.REEL_SPIN_DURATION * (index % 6), signal);
                } else if (this._spinMode === this.gameConfig.SPIN_MODES.FAST) {
                    await Helpers.delay((SpinConfig.REEL_SPIN_DURATION / 3) * (index % 6), signal);
                }

                chain.state.setAnimation(0, chainAnimationName, loop);
            });
        } else {
            const col = reelIndex % 6;

            const targetIndices = reelIndex === 4 ? [col, col + 1, col + 6, col + 7, col + 12, col + 13] : [col, col + 6, col + 12];

            for (const i of targetIndices) {
                this._chains[i].state.setAnimation(0, chainAnimationName, loop);
            }
        }
    }

    public forceStopChainAnimation(): void {
        this._abortController?.abort();
        this._abortController = null;
    }

    protected onResize(responsiveConfig: ResponsiveConfig): void {
        switch (responsiveConfig.orientation) {
            case this.gameConfig.ORIENTATION.landscape:
                this.position.set(0, 0);
                this._leftLantern.position.set(145, 280);
                this._rightLantern.position.set(1770, 280);
                break;
            case this.gameConfig.ORIENTATION.portrait:
                this.position.set(0, -270);
                this._leftLantern.position.set(420, -600);
                this._rightLantern.position.set(1440, -600);
                break;
        }
    }

    public getElementsContainer(): Container | undefined {
        return this.frameElementsContainer;
    }

    public getMask(): Graphics {
        return this._reelAreaMask;
    }

    public get isFreeSpinMode(): boolean {
        return this._isFreeSpinMode;
    }

    public set isFreeSpinMode(value: boolean) {
        this._isFreeSpinMode = value;
    }
}