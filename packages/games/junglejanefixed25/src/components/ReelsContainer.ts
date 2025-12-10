import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { BaseReelsContainer, ResponsiveConfig, signals } from "@slotclient/engine";
import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import { AssetsConfig } from "../configs/AssetsConfig";
import { gsap } from "gsap";

export class ReelsContainer extends BaseReelsContainer {
    private assetsConfig: AssetsConfig;
    private frameElementsContainer?: Container;
    private adrenalineElementsContainer!: Container;

    private _reelAreaMask!: Graphics; // Alt sınıflar oluşturacak
    private _adrenalineStripes: Spine[] = [];
    private _reelBackground!: Sprite;
    private _reelFrame!: Sprite;
    private _owl!: Spine;
    private _character!: Spine;
    private _characterMask!: Graphics;
    private _logo!: Spine;
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
        const totalWidth = ((this.gameConfig.GRID.reelCount * this.gameConfig.REFERENCE_SPRITE_SYMBOL.width) + (this.gameConfig.REFERENCE_SPACING.horizontal * this.gameConfig.GRID.reelCount)) + 100;
        // Height: cover visible rows with proper spacing
        const totalHeight = ((this.gameConfig.GRID.rowCount * this.gameConfig.REFERENCE_SPRITE_SYMBOL.height) + (this.gameConfig.REFERENCE_SPACING.vertical * this.gameConfig.GRID.rowCount)) + 20;

        // Center the mask
        const maskX = (this.gameConfig.REFERENCE_RESOLUTION.width / 2) - (totalWidth / 2);
        const maskY = (this.gameConfig.REFERENCE_RESOLUTION.height / 2) - (totalHeight / 2) + 6;

        // Redraw the mask
        this._reelAreaMask = new Graphics();
        this._reelAreaMask.beginPath();
        this._reelAreaMask.rect(maskX, maskY, totalWidth, totalHeight);
        this._reelAreaMask.fill({ color: 0xffffff, alpha: 1 }); // White fill for the mask
        this._reelAreaMask.closePath();
        this.addChild(this._reelAreaMask);
    }

    protected createFrameElements(): void {
        this._reelBackground = Sprite.from('base_frame_background');
        this._reelBackground.label = 'ReelFrameBackground';
        this._reelBackground.anchor.set(0.5, 0.5);
        this._reelBackground.scale.set(0.5, 0.5);
        this._reelBackground.position.set(960, 500);
        this.addChild(this._reelBackground);

        this.frameElementsContainer = new Container();
        this.frameElementsContainer.label = 'FrameElementsContainer';

        this.createAdrenalineElements();

        this._reelFrame = Sprite.from('base_frame');
        this._reelFrame.label = 'ReelFrame';
        this._reelFrame.anchor.set(0.5, 0.5);
        this._reelFrame.scale.set(0.5, 0.5);
        this._reelFrame.position.set(960, 517);
        this.frameElementsContainer.addChild(this._reelFrame);

        const frameShadow = Sprite.from('frame_shadow');
        frameShadow.label = 'FrameShadow';
        frameShadow.anchor.set(0.5, 0.5);
        frameShadow.scale.set(0.5, 0.5);
        frameShadow.position.set(960, 1335);
        frameShadow.blendMode = "difference";
        this.frameElementsContainer.addChild(frameShadow);

        this._owl = Spine.from(this.assetsConfig.BACKGROUND_SPINE_ASSET);
        this._owl.label = `Owl`;
        this._owl.scale.set(0.5, 0.5);
        this._owl.position.set(165, 227);
        this._owl.visible = false;
        this.frameElementsContainer.addChild(this._owl);

        this._character = Spine.from(this.assetsConfig.CHARACTER_SPINE_ASSET);
        this._character.label = `GameCharacter`;
        this._character.scale.set(0.4, 0.4);
        this._character.position.set(1845, 580);
        this._character.skeleton.setSkinByName('Base/Base');
        this._character.state.setAnimation(0, "Base_idle", true);
        this.frameElementsContainer.addChild(this._character);

        this._characterMask = new Graphics();
        this._characterMask.label = "CharacterMask";
        this._characterMask.beginPath();
        this._characterMask.rect(600, -640, 720, 700);
        this._characterMask.fill({
            color: 0xffffff,
            alpha: 0
        });
        this._characterMask.closePath();
        this.frameElementsContainer.addChild(this._characterMask);

        this._logo = Spine.from(this.assetsConfig.LOGO_SPINE_ASSET);
        this._logo.label = 'GameLogo';
        this._logo.scale.set(0.475, 0.475);
        this._logo.position.set(950, 70);
        this._logo.state.setAnimation(0, "Base_hold", true);
        this.frameElementsContainer.addChild(this._logo);
    }

    private createAdrenalineElements(): void {
        this.adrenalineElementsContainer = new Container();
        this.adrenalineElementsContainer.label = 'AdrenalineElementsContainer';
        this.adrenalineElementsContainer.visible = false;
        this.frameElementsContainer!.addChild(this.adrenalineElementsContainer);

        const { atlas, skeleton } = this.assetsConfig.ANTICIPATE_SPINE_ASSET;

        const adrenalineStripeLeft = Spine.from({ atlas, skeleton });
        adrenalineStripeLeft.label = `AdrenalineStripe_Left`;
        adrenalineStripeLeft.position.set(1360, 575);
        adrenalineStripeLeft.scale.set(0.65, 0.65);
        this._adrenalineStripes.push(adrenalineStripeLeft);
        this.adrenalineElementsContainer.addChild(adrenalineStripeLeft);

        const adrenalineStripeRight = Spine.from({ atlas, skeleton });
        adrenalineStripeRight.label = `AdrenalineStripe_Right`;
        adrenalineStripeRight.position.set(1620, 575);
        adrenalineStripeRight.scale.set(0.65, 0.65);
        this._adrenalineStripes.push(adrenalineStripeRight);
        this.adrenalineElementsContainer.addChild(adrenalineStripeRight);
    }

    private startAnticipationEffect(): void {
        gsap.fromTo(this.adrenalineElementsContainer, { alpha: 0 }, {
            alpha: 1, duration: 0.25, onStart: () => {
                this.adrenalineElementsContainer.visible = true;

                this._adrenalineStripes.forEach(stripe => {
                    stripe.state.setAnimation(0, "anticipate", true);
                });
            }
        });
    }

    private stopAnticipationEffect(): void {
        gsap.to(this.adrenalineElementsContainer, {
            alpha: 0, duration: 0.25, onComplete: () => {
                this.adrenalineElementsContainer.visible = false;

                this._adrenalineStripes.forEach(stripe => {
                    stripe.state.setAnimation(0, "anticipate", false);
                });
            }
        });
    }

    public playElementsSpinAnimation(): void {
        this._isFreeSpinMode && this._owl.state.setAnimation(0, `Free_owl_back_win`, false);
        this._isFreeSpinMode && this._owl.state.addAnimation(0, `Free_owl_back_idle`, false, 0);
    }

    public stopElementsSpinAnimation(): void {
        this._isFreeSpinMode && this._owl.state.setAnimation(0, `Free_owl_back_idle`, true);
    }

    public playElementsWinAnimation(): void {
        this._character.state.setAnimation(0, this._isFreeSpinMode ? "Free_win2" : "Base_win2", false);
        this._character.state.addAnimation(0, this._isFreeSpinMode ? "Free_idle" : "Base_idle", true, 0);
        this._logo.state.setAnimation(0, this._isFreeSpinMode ? "Free_win" : "Base_win", false);
        this._logo.state.addAnimation(0, this._isFreeSpinMode ? "Free_hold" : "Base_hold", true, 0);
    }

    public stopElementsWinAnimation(): void {
        this._character.state.setAnimation(0, this._isFreeSpinMode ? "Free_idle" : "Base_idle", true);
        this._logo.state.setAnimation(0, this._isFreeSpinMode ? "Free_hold" : "Base_hold", true);
    }

    public playElementsScatterAnimation(): void {
        this._character.state.setAnimation(0, this._isFreeSpinMode ? "Free_win1" : "Base_win1", false);
        this._character.state.addAnimation(0, this._isFreeSpinMode ? "Free_idle" : "Base_idle", true, 0);
    }

    public playElementsBonusAnimation(): void {
        this._character.state.setAnimation(0, "Base_win3", false);
        this._character.state.addAnimation(0, "Base_idle", true, 0);
    }

    public setFreeSpinMode(enabled: boolean): void {
        const frameBackgroundTexture = enabled ? 'freespin_frame_background' : 'base_frame_background';
        this._reelBackground.texture = Texture.from(frameBackgroundTexture);

        const frameTexture = enabled ? 'freespin_frame' : 'base_frame';
        this._reelFrame.texture = Texture.from(frameTexture);

        const animationName = enabled ? 'Free_hold' : 'Base_hold';
        this._logo.state.setAnimation(0, animationName, true);

        const characterAnimationName = enabled ? 'Free_idle' : 'Base_idle';
        this._character.state.setAnimation(0, characterAnimationName, true);
        this._isFreeSpinMode = enabled;

        if (enabled) {
            this._owl.state.setAnimation(0, `Free_owl_back_idle`, true);
            this._owl.visible = true;
        } else {
            this._owl.visible = false;
            this._owl.state.clearTracks();
        }
    }

    protected onResize(responsiveConfig: ResponsiveConfig): void {
        switch (responsiveConfig.orientation) {
            case this.gameConfig.ORIENTATION.landscape:
                this.position.set(0, 0);
                this._character.position.set(1845, 580);
                this._character.scale.set(0.4, 0.4);
                this._character.mask = null;
                break;
            case this.gameConfig.ORIENTATION.portrait:
                this.position.set(0, -270);
                this._character.position.set(this.gameConfig.REFERENCE_RESOLUTION.width / 2, 165);
                this._character.scale.set(0.5, 0.5);
                this._character.mask = this._characterMask;
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