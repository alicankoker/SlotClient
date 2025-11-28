import { Application, Container, Graphics, Sprite, Text, Ticker } from "pixi.js";
import { WinLines } from "./WinLines";
import { WinEvent } from "./WinEvent";
import { GameConfig } from "@slotclient/config/GameConfig";
import { signals, SIGNAL_EVENTS, SignalSubscription } from "../controllers/SignalManager";
import { Helpers } from "../utils/Helpers";
import { gsap } from "gsap";
import { AssetsConfig } from "@slotclient/config/AssetsConfig";
import { MeshAttachment, RegionAttachment, Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameDataManager } from "../data/GameDataManager";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { WinEventType } from "../types/IWinEvents";
import { SpriteText } from "../utils/SpriteText";
import { AutoPlayController } from "../AutoPlay/AutoPlayController";
import { FreeSpinController } from "../freeSpin/FreeSpinController";

interface ParticleAnimationOptions {
    element: Sprite | Spine | Graphics;
    life: number;
    maxLife: number;
    maxCount: number;
    maxOnScreen?: number;
    spawnInterval?: number;
    rotationSpeed?: number;
    gravity?: number;
    friction?: number;
}

interface InternalParticle {
    sprite: Sprite | Spine | Graphics;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    rotationSpeed: number;
    gravity: number;
    friction: number;
}

export class AnimationContainer extends Container {
    private static _instance: AnimationContainer;
    private _app: Application;
    private _resizeSubscription?: SignalSubscription;

    private _winLines: WinLines;
    private _particleContainer: Container;
    private _particleList: InternalParticle[] = [];
    private _particleTicker?: Ticker;
    private _spawnTimer = 0;
    private _currentOptions!: ParticleAnimationOptions;
    private _winEvent: WinEvent;
    private _winContainer!: Container;
    private _winStrap!: Sprite;
    private _winText: SpriteText;
    private _winStrapLines: Sprite[] = [];
    private _dimmer!: Graphics;
    private _popup!: Container;
    private _popupBackground!: Sprite;
    private _popupHeader!: Sprite;
    private _popupContentText!: Text;
    private _popupCountText!: SpriteText;
    private _dialogBox!: Container;
    private _dialogBoxBackground!: Sprite;
    private _dialogCountText!: SpriteText;
    private _dialogContentText!: Text;
    private _transition!: Spine;
    private _totalWinAmount: number = 0;

    private totalWinTween?: gsap.core.Tween;
    private totalWinResolver?: () => void;

    private constructor(app: Application) {
        super();

        this._app = app;

        this._winLines = WinLines.getInstance();
        this._winLines.setAvailableLines(GameDataManager.getInstance().getMaxLine());
        this.addChild(this._winLines);

        this._winContainer = new Container();
        this._winContainer.label = 'WinContainer';
        this._winContainer.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2) + 15);
        this._winContainer.visible = false;
        this.addChild(this._winContainer);

        this._winStrap = Sprite.from("win_strap");
        this._winStrap.label = 'WinStrap';
        this._winStrap.anchor.set(0.5, 0.5);
        this._winStrap.tint = 0x5f061f;
        this._winContainer.addChild(this._winStrap);

        this._winText = new SpriteText("Numbers");
        this._winText.label = 'WinText';
        this._winText.setAnchor(0.5, 0.5);
        this._winContainer.addChild(this._winText);

        for (let i = 0; i < 2; i++) {
            const line = Sprite.from("win_strap_line");
            line.label = `WinStrapLine_${i}`;
            line.anchor.set(0.5, 0.5);
            line.position.set(0, i === 0 ? -78 : 78);
            line.tint = 0xffc90f;
            this._winContainer.addChild(line);
            this._winStrapLines.push(line);
        }

        this._dimmer = new Graphics();
        this._dimmer.beginPath();
        this._dimmer.rect(0, 0, GameConfig.REFERENCE_RESOLUTION.width, GameConfig.REFERENCE_RESOLUTION.height);
        this._dimmer.fill({ color: 0x010b14, alpha: 0.75 });
        this._dimmer.closePath();
        this._dimmer.pivot.set(this._dimmer.width / 2, this._dimmer.height / 2);
        this._dimmer.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._dimmer.scale.set(4, 4);
        this._dimmer.visible = false;
        this._dimmer.alpha = 0;
        this.addChild(this._dimmer);

        this._particleContainer = new Container();
        this._particleContainer.label = 'ParticleContainer';
        this._particleContainer.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2) + 15);
        this.addChild(this._particleContainer);

        this._popup = new Container();
        this._popup.label = 'PopupContainer';
        this._popup.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._popup.visible = false;
        this.addChild(this._popup);

        this._popupBackground = Sprite.from("popup_frame");
        this._popupBackground.label = 'PopupBackground';
        this._popupBackground.anchor.set(0.5);
        this._popup.addChild(this._popupBackground);

        this._popupHeader = Sprite.from("popup_header");
        this._popupHeader.label = 'PopupHeader';
        this._popupHeader.anchor.set(0.5);
        this._popupHeader.position.set(0, -295);
        this._popup.addChild(this._popupHeader);

        const popupHeaderText = new Text({
            text: 'CONGRATULATIONS',
            style: GameConfig.style_4
        });
        popupHeaderText.label = 'PopupHeaderText';
        popupHeaderText.anchor.set(0.5, 0.5);
        popupHeaderText.position.set(0, -295);
        this._popup.addChild(popupHeaderText);

        const popupYouWonText = new Text({
            text: 'YOU HAVE WON',
            style: GameConfig.style_2
        });
        popupYouWonText.label = 'PopupYouWonText';
        popupYouWonText.anchor.set(0.5, 0.5);
        popupYouWonText.position.set(0, -120);
        this._popup.addChild(popupYouWonText);

        this._popupCountText = new SpriteText("Numbers");
        this._popupCountText.label = 'PopupCountText';
        this._popupCountText.setAnchor(0.5, 0.5);
        this._popupCountText.setScale(0.7, 0.7);
        this._popup.addChild(this._popupCountText);

        this._popupContentText = new Text({
            text: '',
            style: GameConfig.style_2
        });
        this._popupContentText.label = 'PopupContentText';
        this._popupContentText.anchor.set(0.5, 0.5);
        this._popupContentText.position.set(0, 100);
        this._popup.addChild(this._popupContentText);

        const popupPressAnywhere = new Text({
            text: 'PRESS ANYWHERE TO CONTINUE',
            style: GameConfig.style_1
        });
        popupPressAnywhere.label = 'PopupPressText';
        popupPressAnywhere.anchor.set(0.5, 0.5);
        popupPressAnywhere.position.set(0, 200);
        this._popup.addChild(popupPressAnywhere);

        this._dialogBox = new Container();
        this._dialogBox.label = 'DialogBoxContainer';
        this._dialogBox.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 580);
        this._dialogBox.visible = false;
        this.addChild(this._dialogBox);

        this._dialogBoxBackground = Sprite.from("dialog_box");
        this._dialogBoxBackground.label = 'DialogBoxBackground';
        this._dialogBoxBackground.anchor.set(0.5, 0.5);
        this._dialogBox.addChild(this._dialogBoxBackground);

        this._dialogCountText = new SpriteText("Numbers");
        this._dialogCountText.label = 'DialogCountText';
        this._dialogCountText.setAnchor(0.5, 0.5);
        this._dialogCountText.setScale(0.7, 0.7);
        this._dialogCountText.position.set(0, -50);
        this._dialogBox.addChild(this._dialogCountText);

        this._dialogContentText = new Text({
            text: 'FREESPINS',
            style: GameConfig.style_2
        });
        this._dialogContentText.label = 'DialogContentText';
        this._dialogContentText.anchor.set(0.5, 0.5);
        this._dialogContentText.position.set(0, 60);
        this._dialogBox.addChild(this._dialogContentText);

        this._winEvent = WinEvent.getInstance(this._app);
        this.addChild(this._winEvent);

        const { atlas, skeleton } = AssetsConfig.TRANSITION_SPINE_ASSET;

        this._transition = Spine.from({ atlas, skeleton });
        this._transition.label = 'TransitionSpine';
        this._transition.scale.set(15, 10);
        this._transition.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._transition.visible = false;
        this._transition.state.timeScale = 0.50;
        this.addChild(this._transition);

        this.eventListeners();
    }

    public static getInstance(app: Application): AnimationContainer {
        if (!AnimationContainer._instance) {
            AnimationContainer._instance = new AnimationContainer(app);
        }
        return AnimationContainer._instance;
    }

    public static instance(): AnimationContainer {
        return AnimationContainer._instance;
    }

    private eventListeners(): void {
        signals.on(SIGNAL_EVENTS.WIN_ANIMATION_PLAY, (winAmount: number | undefined) => {
            if (winAmount !== undefined) {
                this.playWinTextAnimation(winAmount);
            }
        });

        signals.on(SIGNAL_EVENTS.WIN_ANIMATION_COMPLETE, () => {
            this.stopWinTextAnimation();
        });

        this._resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    public playTotalWinAnimation(totalWinAmount: number): Promise<void> {
        const isShow = (FreeSpinController.getInstance().isRunning === false);
        this._totalWinAmount = totalWinAmount;

        return new Promise((resolve) => {
            this.totalWinResolver = resolve;

            if (!GameConfig.WIN_ANIMATION.winTextVisibility) {
                if (isShow) {
                    signals.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this._totalWinAmount) as string });
                }
                resolve();
                return;
            }

            if (this.totalWinTween) {
                this.totalWinTween.kill();
                this.totalWinTween = undefined;
            }

            if (isShow) {
                signals.emit("setWinBox", { variant: "default", amount: "0" });

                AutoPlayController.getInstance().isRunning === false && signals.emit("setMessageBox", { variant: "default", message: "" });
            }

            const particle = Sprite.from('win_strap_particle');
            particle.anchor.set(0.5, 0.5);

            this.stopParticleAnimation();
            this.startParticleAnimation({ element: particle, life: 75, maxLife: 150, maxCount: 50, friction: 0.97, spawnInterval: 15, maxOnScreen: 50 });

            let tweenObj = { value: 0 };
            let currentAmount = "0";

            this.totalWinTween = gsap.to(tweenObj, {
                value: totalWinAmount,
                duration: 1.5,
                ease: "power1",
                onUpdate: () => {
                    if (!this.totalWinResolver) {
                        if (isShow) {
                            signals.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this._totalWinAmount) as string });
                        }
                        gsap.killTweensOf(tweenObj);
                        this._totalWinAmount = 0;

                        return;
                    }

                    if (isShow) {
                        currentAmount = Helpers.convertToDecimal(Math.floor(tweenObj.value)) as string;
                        signals.emit("setWinBox", { variant: "default", amount: currentAmount });
                    }
                }
            });

            // Play total win text animation
            gsap.fromTo(this._winContainer.scale, { x: 0, y: 0 }, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
                    this._winText.setScale(0.6, 0.6);
                    this._winText.setText(`$${Helpers.convertToDecimal(totalWinAmount)}`, -10);
                    this._winStrap.scale.set(1, 1);
                    this._winStrapLines.forEach((line, index) => {
                        line.scale.set(1, 1);
                        line.position.y = index === 0 ? -78 : 78;
                    });
                    this._winContainer.visible = true;
                },
                onComplete: () => {
                    gsap.to(this._winContainer.scale, {
                        x: 0, y: 0, duration: 0.25, ease: 'back.in(1.7)', delay: 1, onComplete: () => {
                            this._winContainer.visible = false;
                            this._winText.setText(``);
                            this._winText.setScale(0.3, 0.3);
                            this._winStrap.scale.set(0.75, 0.5);
                            this._winStrapLines.forEach((line, index) => {
                                line.scale.set(0.75, 0.5);
                                line.position.y = index === 0 ? -39 : 39;
                            });

                            if (this.totalWinResolver) {
                                this.totalWinResolver();
                                this.totalWinResolver = undefined;
                            }

                            this.totalWinTween = undefined;

                            this.stopParticleAnimation();
                        }
                    });
                }
            });
        });
    }

    public stopTotalWinAnimation(): void {
        const isShow = (FreeSpinController.getInstance().isRunning === false);

        if (isShow) {
            signals.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this._totalWinAmount) as string });
        }

        this._totalWinAmount = 0;

        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            if (this.totalWinTween) {
                this.totalWinTween.kill();
                this.totalWinTween = undefined;
            }

            gsap.to(this._winContainer.scale, {
                x: 0, y: 0, duration: 0.1, ease: 'back.in(1.7)', onComplete: () => {
                    this._winText.setText(``);
                    this._winContainer.visible = false;
                    this._winText.setScale(0.3, 0.3);
                    this._winStrap.scale.set(0.75, 0.5);
                    this._winStrapLines.forEach((line, index) => {
                        line.scale.set(0.75, 0.5);
                        line.position.y = index === 0 ? -39 : 39;
                    });

                    if (this.totalWinResolver) {
                        this.totalWinResolver();
                        this.totalWinResolver = undefined;
                    }

                    this.stopParticleAnimation();
                }
            });
        }
    }

    public playWinTextAnimation(winAmount: number): void {
        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            const particle = Sprite.from('win_strap_particle');
            particle.anchor.set(0.5, 0.5);

            this.stopParticleAnimation();
            this.startParticleAnimation({ element: particle, life: 75, maxLife: 150, maxCount: 50, friction: 0.97, spawnInterval: 15, maxOnScreen: 50 });
            // Play single win text animation
            gsap.fromTo(this._winContainer.scale, { x: 0, y: 0 }, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
                    this._winText.setText(`$${Helpers.convertToDecimal(winAmount)}`, -10);
                    this._winContainer.visible = true;
                }
            });
        }
    }

    public stopWinTextAnimation(): void {
        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            gsap.to(this._winContainer.scale, {
                x: 0, y: 0, duration: 0.1, ease: 'back.in(1.7)', onComplete: () => {
                    this._winText.setText(``);
                    this._winContainer.visible = false;

                    this.stopParticleAnimation();
                }
            });
        }
    }

    public async playWinEventAnimation(winAmount: number, winEventType: WinEventType): Promise<void> {
        this._dimmer.visible = true;
        this._dimmer.alpha = 1;

        const { atlas, skeleton } = AssetsConfig.WINEVENT_SPINE_ASSET;
        const particle = Spine.from({ atlas, skeleton });
        particle.state.setAnimation(0, "coin", true);

        this.stopParticleAnimation();
        this.startParticleAnimation({ element: particle, life: 200, maxLife: 350, maxCount: 20, friction: 1, rotationSpeed: 0.1, spawnInterval: 50, maxOnScreen: 50 });
        this._winEvent.getController().onWinEventComplete(() => {
            this.stopParticleAnimation();
        });

        await this._winEvent.show(winAmount, winEventType);

        this._dimmer.visible = false;
        this._dimmer.alpha = 0;
    }

    public async startTransitionAnimation(callback?: ((resolve?: () => void) => Promise<void> | void)): Promise<void> {
        this._transition.visible = true;
        await this.playAnimation("intro", false);

        if (callback) {
            if (callback.length > 0) {
                await new Promise<void>((resolve) => callback(resolve));
            } else {
                await callback();
            }
        }

        await this.playAnimation("outro", false);
    }

    private playAnimation(name: string, loop: boolean): Promise<void> {
        return new Promise((resolve) => {
            const entry = this._transition.state.setAnimation(0, name, loop);
            entry.listener = {
                complete: () => resolve()
            };
        });
    }

    public playPopupAnimation(): Promise<void> {
        return new Promise((resolve) => {
            this._popup.interactive = true;
            this._popup.cursor = 'pointer';
            this._dimmer.interactive = true;
            this._dimmer.cursor = 'pointer';

            this._popup.visible = true;
            this._dimmer.visible = true;

            const closePopup = () => {
                this._popup.interactive = false;
                this._popup.cursor = 'default';
                this._dimmer.interactive = false;
                this._dimmer.cursor = 'default';

                window.removeEventListener("keydown", onKeyDown);
                this._popup.off('pointerdown', closePopup);
                this._dimmer.off('pointerdown', closePopup);

                gsap.to([this._dimmer], {
                    alpha: 0,
                    duration: 0.4
                });
                gsap.to([this._popup.scale], {
                    x: 0,
                    y: 0,
                    duration: 0.4,
                    ease: 'back.in(1.7)',
                    onComplete: () => {
                        this._popup.visible = false;
                        this._dimmer.visible = false;
                        resolve();
                    }
                });
            };

            const onKeyDown = (e: KeyboardEvent) => {
                if (e.code === "Space") {
                    e.preventDefault();
                    closePopup();
                }
            };

            gsap.to([this._dimmer], {
                alpha: 1,
                duration: 0.4
            });
            gsap.fromTo([this._popup.scale], { x: 0, y: 0 }, {
                x: 1,
                y: 1,
                duration: 0.4,
                ease: 'back.out(1.7)',
                onComplete: () => {
                    window.addEventListener('keydown', onKeyDown);
                    this._popup.once('pointerdown', closePopup);
                    this._dimmer.once('pointerdown', closePopup);
                }
            });
        });
    }

    public playDialogBoxAnimation(): Promise<void> {
        return new Promise((resolve) => {
            this._dialogBox.interactive = true;
            this._dialogBox.cursor = 'pointer';
            this._dimmer.interactive = true;
            this._dimmer.cursor = 'pointer';

            this._dialogBox.visible = true;
            this._dimmer.visible = true;

            const closePopup = () => {
                this._dialogBox.interactive = false;
                this._dialogBox.cursor = 'default';
                this._dimmer.interactive = false;
                this._dimmer.cursor = 'default';

                window.removeEventListener("keydown", onKeyDown);
                this._dialogBox.off('pointerdown', closePopup);
                this._dimmer.off('pointerdown', closePopup);

                gsap.to([this._dimmer], {
                    alpha: 0,
                    duration: 0.4
                });
                gsap.to([this._dialogBox.scale], {
                    x: 0,
                    y: 0,
                    duration: 0.4,
                    ease: 'back.in(1.7)',
                    onComplete: () => {
                        this._dialogBox.visible = false;
                        this._dimmer.visible = false;
                        resolve();
                    }
                });
            };

            const onKeyDown = (e: KeyboardEvent) => {
                if (e.code === "Space") {
                    e.preventDefault();
                    closePopup();
                }
            };

            gsap.to([this._dimmer], {
                alpha: 1,
                duration: 0.4
            });
            gsap.fromTo([this._dialogBox.scale], { x: 0, y: 0 }, {
                x: 1,
                y: 1,
                duration: 0.4,
                ease: 'back.out(1.7)',
                onComplete: () => {
                    window.addEventListener('keydown', onKeyDown);
                    this._dialogBox.once('pointerdown', closePopup);
                    this._dimmer.once('pointerdown', closePopup);
                }
            });
        });
    }

    public startParticleAnimation(options: ParticleAnimationOptions): void {
        this.stopParticleAnimation();

        this._particleList = [];
        this._spawnTimer = 0;
        this._currentOptions = options;

        this._particleTicker = new Ticker();
        this._particleTicker.add(this._updateParticleAnimation);
        this._particleTicker.start();
    }

    private _cloneSpine(source: Spine): Spine {
        const clone = new Spine(source.skeleton.data);

        for (let i = 0; i < source.skeleton.slots.length; i++) {
            const sourceSlot = source.skeleton.slots[i];
            const cloneSlot = clone.skeleton.slots[i];

            const srcAttachment = sourceSlot.getAttachment();
            const cloneAttachment = cloneSlot.getAttachment();

            if (!srcAttachment || !cloneAttachment) continue;

            if (srcAttachment instanceof RegionAttachment &&
                cloneAttachment instanceof RegionAttachment) {

                cloneAttachment.region = srcAttachment.region;
                continue;
            }

            if (srcAttachment instanceof MeshAttachment &&
                cloneAttachment instanceof MeshAttachment) {

                cloneAttachment.region = srcAttachment.region;
                continue;
            }
        }

        clone.skeleton.setToSetupPose();
        return clone;
    }

    private _updateParticleAnimation = (ticker: Ticker) => {
        const delta = ticker.deltaTime;

        const interval = this._currentOptions.spawnInterval ?? 10;

        this._spawnTimer += delta;
        if (this._spawnTimer >= interval) {
            this._spawnTimer = 0;

            if (this._currentOptions.maxOnScreen && this._particleList.length >= this._currentOptions.maxOnScreen) {
                return;
            }

            for (let i = 0; i < this._currentOptions.maxCount; i++) {
                this._spawnParticle(this._currentOptions);
            }
        }

        for (let i = this._particleList.length - 1; i >= 0; i--) {
            const p = this._particleList[i];

            p.vx *= p.friction;
            p.vy = p.vy * p.friction + p.gravity;

            p.sprite.x += p.vx * delta;
            p.sprite.y += p.vy * delta;

            p.sprite.rotation += p.rotationSpeed * delta;

            p.life--;
            p.sprite.alpha = Math.max(0, Math.min(1, p.life / p.maxLife));

            if (p.life <= 0) {
                p.sprite.alpha = 0;
                this._particleContainer.removeChild(p.sprite);
                p.sprite.destroy();
                this._particleList.splice(i, 1);
            }
        }
    };

    private _spawnParticle(options: ParticleAnimationOptions) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const particle =
            options.element instanceof Sprite
                ? new Sprite(options.element.texture)
                : options.element instanceof Graphics
                    ? options.element.clone()
                    : options.element instanceof Spine
                        ? this._cloneSpine(options.element)
                        : null;

        if (!particle) return;

        if (particle instanceof Spine) {
            particle.state.setAnimation(0, "coin", true);
        } else {
            particle.tint = 0xffc90f;
        }

        particle.alpha = 1;
        particle.scale.set(0.2 + Math.random() * 0.3);

        this._particleContainer.addChild(particle);

        this._particleList.push({
            sprite: particle,
            vx,
            vy,
            life: options.life,
            maxLife: options.maxLife,
            rotationSpeed: options.rotationSpeed ?? 0,
            gravity: options.gravity ?? 0,
            friction: options.friction ?? 1,
        });
    }

    public stopParticleAnimation(): void {
        if (this._particleTicker) {
            this._particleTicker.stop();
            this._particleTicker.destroy();
            this._particleTicker = undefined;
        }

        for (const p of this._particleList) {
            p.sprite.parent?.removeChild(p.sprite);
            p.sprite.destroy();
        }

        this._particleContainer.removeChildren();
        this._particleList = [];
    }

    public setBonusMode(isActive: boolean): void {
        this._winLines.visible = !isActive;
    }

    private onResize(responsiveConfig: ResponsiveConfig): void {
        switch (responsiveConfig.orientation) {
            case GameConfig.ORIENTATION.landscape:
                this.position.set(0, 0);
                break;
            case GameConfig.ORIENTATION.portrait:
                this.position.set(0, -270);
                break;
        }
    }

    public getWinLines(): WinLines {
        return this._winLines;
    }

    public getWinContainer(): Container {
        return this._winContainer;
    }

    public getWinText(): SpriteText {
        return this._winText;
    }

    public getWinEvent(): WinEvent {
        return this._winEvent;
    }

    public getPopupBackground(): Sprite {
        return this._popupBackground;
    }

    public getPopupCountText(): SpriteText {
        return this._popupCountText;
    }

    public getPopupContentText(): Text {
        return this._popupContentText;
    }

    public getDialogCountText(): SpriteText {
        return this._dialogCountText;
    }
}