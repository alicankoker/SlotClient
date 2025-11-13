import { Container, Graphics, Sprite, Text } from "pixi.js";
import { WinLines } from "./WinLines";
import { WinEvent } from "./WinEvent";
import { GameConfig } from "../../config/GameConfig";
import { signals, SIGNAL_EVENTS, SignalSubscription } from "../controllers/SignalManager";
import { Helpers } from "../utils/Helpers";
import { gsap } from "gsap";
import { AssetsConfig } from "../../config/AssetsConfig";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameDataManager } from "../data/GameDataManager";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { eventBus } from "../../communication/EventManagers/WindowEventManager";

export class AnimationContainer extends Container {
    private static _instance: AnimationContainer;
    protected _resizeSubscription?: SignalSubscription;

    private _winLines: WinLines;
    private _winEvent: WinEvent;

    private _autoPlayCountText: Text;
    private _winText: Text;
    private _dimmer!: Graphics;
    private _popup!: Container;
    private _popupBackground!: Sprite;
    private _popupHeader!: Sprite;
    private _popupFreeSpinsText!: Text;
    private _popupCountText!: Text;
    private _transition!: Spine;
    private _totalWinAmount: number = 0;

    private totalWinTween?: gsap.core.Tween;
    private totalWinResolver?: () => void;

    private constructor() {
        super();

        this._winLines = WinLines.getInstance();
        this._winLines.setAvailableLines(GameDataManager.getInstance().getMaxLine());
        this.addChild(this._winLines);

        // initialize auto play count indicator
        this._autoPlayCountText = new Text({ text: '', style: GameConfig.style.clone() });
        this._autoPlayCountText.label = 'AutoPlayCountText';
        this._autoPlayCountText.anchor.set(0.5, 0.5);
        this._autoPlayCountText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 950);
        this._autoPlayCountText.visible = false;
        this.addChild(this._autoPlayCountText);

        this._winText = new Text({ text: '', style: GameConfig.style.clone() });
        this._winText.style.fontSize = 150;
        this._winText.label = 'WinText';
        this._winText.anchor.set(0.5);
        this._winText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2) + 15);
        this._winText.visible = false;
        this.addChildAt(this._winText, this.children.length);

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

        this._popup = new Container();
        this._popup.label = 'FreeSpinPopupContainer';
        this._popup.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._popup.visible = false;
        this.addChild(this._popup);

        this._popupBackground = Sprite.from("popup_frame");
        this._popupBackground.label = 'FreeSpinPopupBackground';
        this._popupBackground.anchor.set(0.5);
        this._popup.addChild(this._popupBackground);

        this._popupHeader = Sprite.from("popup_header");
        this._popupHeader.label = 'FreeSpinPopupHeader';
        this._popupHeader.anchor.set(0.5);
        this._popupHeader.position.set(0, -295);
        this._popup.addChild(this._popupHeader);

        const popupHeaderText = new Text({
            text: 'CONGRATULATIONS',
            style: GameConfig.style_4
        });
        popupHeaderText.label = 'FreeSpinPopupHeaderText';
        popupHeaderText.anchor.set(0.5, 0.5);
        popupHeaderText.position.set(0, -295);
        this._popup.addChild(popupHeaderText);

        const popupYouWonText = new Text({
            text: 'YOU HAVE WON',
            style: GameConfig.style_2
        });
        popupYouWonText.label = 'FreeSpinPopupYouWonText';
        popupYouWonText.anchor.set(0.5, 0.5);
        popupYouWonText.position.set(0, -120);
        this._popup.addChild(popupYouWonText);

        this._popupCountText = new Text({ text: '', style: GameConfig.style.clone() });
        this._popupCountText.label = 'FreeSpinPopupCountText';
        this._popupCountText.anchor.set(0.5, 0.5);
        this._popupCountText.position.set(0, -15);
        this._popupCountText.style.fontSize = 145;
        this._popup.addChild(this._popupCountText);

        this._popupFreeSpinsText = new Text({
            text: '',
            style: GameConfig.style_2
        });
        this._popupFreeSpinsText.label = 'FreeSpinPopupFreeSpinsText';
        this._popupFreeSpinsText.anchor.set(0.5, 0.5);
        this._popupFreeSpinsText.position.set(0, 100);
        this._popup.addChild(this._popupFreeSpinsText);

        const popupPressAnywhere = new Text({
            text: 'PRESS ANYWHERE TO CONTINUE',
            style: GameConfig.style_1
        });
        popupPressAnywhere.label = 'FreeSpinPopupPressText';
        popupPressAnywhere.anchor.set(0.5, 0.5);
        popupPressAnywhere.position.set(0, 200);
        this._popup.addChild(popupPressAnywhere);

        this._winEvent = WinEvent.getInstance();
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

    public static getInstance(): AnimationContainer {
        if (!AnimationContainer._instance) {
            AnimationContainer._instance = new AnimationContainer();
        }
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
        this._totalWinAmount = totalWinAmount;

        return new Promise((resolve) => {
            this.totalWinResolver = resolve;

            if (!GameConfig.WIN_ANIMATION.winTextVisibility) {
                eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this._totalWinAmount) as string });
                resolve();
                return;
            }

            if (this.totalWinTween) {
                this.totalWinTween.kill();
                this.totalWinTween = undefined;
            }

            eventBus.emit("setWinBox", { variant: "default", amount: "0" });

            if (GameDataManager.getInstance().isFreeSpinning !== false && GameDataManager.getInstance().isAutoPlaying !== false) {
                eventBus.emit("setMessageBox", { variant: "default", message: "" });
            }

            let tweenObj = { value: 0 };
            let currentAmount = "0";

            this.totalWinTween = gsap.to(tweenObj, {
                value: totalWinAmount,
                duration: 1.5,
                ease: "power1",
                onUpdate: () => {
                    if (!this.totalWinResolver) {
                        eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this._totalWinAmount) as string });
                        gsap.killTweensOf(tweenObj);
                        this._totalWinAmount = 0;

                        return;
                    }

                    currentAmount = Helpers.convertToDecimal(Math.floor(tweenObj.value)) as string;
                    eventBus.emit("setWinBox", { variant: "default", amount: currentAmount });
                }
            });

            // Play total win text animation
            gsap.fromTo(this._winText.scale, { x: 0, y: 0 }, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
                    this._winText.style.fontSize = 150;
                    this._winText.text = `$${Helpers.convertToDecimal(totalWinAmount)}`;
                    this._winText.visible = true;
                },
                onComplete: () => {
                    gsap.to(this._winText.scale, {
                        x: 0, y: 0, duration: 0.25, ease: 'back.in(1.7)', delay: 1, onComplete: () => {
                            this._winText.text = ``;
                            this._winText.visible = false;

                            if (this.totalWinResolver) {
                                this.totalWinResolver();
                                this.totalWinResolver = undefined;
                            }

                            this.totalWinTween = undefined;
                        }
                    });
                }
            });
        });
    }

    public stopTotalWinAnimation(): void {
        eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this._totalWinAmount) as string });
        this._totalWinAmount = 0;

        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            if (this.totalWinTween) {
                this.totalWinTween.kill();
                this.totalWinTween = undefined;
            }

            gsap.to(this._winText.scale, {
                x: 0, y: 0, duration: 0.1, ease: 'back.in(1.7)', onComplete: () => {
                    this._winText.text = ``;
                    this._winText.visible = false;

                    if (this.totalWinResolver) {
                        this.totalWinResolver();
                        this.totalWinResolver = undefined;
                    }
                }
            });
        }
    }

    public playWinTextAnimation(winAmount: number): void {
        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            // Play single win text animation
            gsap.fromTo(this._winText.scale, { x: 0, y: 0 }, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
                    this._winText.style.fontSize = 75;
                    this._winText.text = `$${Helpers.convertToDecimal(winAmount)}`;
                    this._winText.visible = true;
                }
            });
        }
    }

    public stopWinTextAnimation(): void {
        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            gsap.to(this._winText.scale, {
                x: 0, y: 0, duration: 0.1, ease: 'back.in(1.7)', onComplete: () => {
                    this._winText.text = ``;
                    this._winText.visible = false;
                }
            });
        }
    }

    public playWinEventAnimation(): void {
        this._winEvent.playWinEventAnimation();
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

    public playFreeSpinPopupAnimation(): Promise<void> {
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
                eventBus.off("startSpin", closePopup);
                eventBus.off("onScreenClick", closePopup);

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
                    eventBus.on("startSpin", closePopup);
                    eventBus.on("onScreenClick", closePopup);
                }
            });
        });
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

    public getAutoPlayCountText(): Text {
        return this._autoPlayCountText;
    }

    public getWinText(): Text {
        return this._winText;
    }

    public getWinEvent(): WinEvent {
        return this._winEvent;
    }

    public getPopupBackground(): Sprite {
        return this._popupBackground;
    }

    public getPopupCountText(): Text {
        return this._popupCountText;
    }

    public getPopupFreeSpinsText(): Text {
        return this._popupFreeSpinsText;
    }
}