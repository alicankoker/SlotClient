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

export class AnimationContainer extends Container {
    private static _instance: AnimationContainer;
    protected _resizeSubscription?: SignalSubscription;

    private _winLines: WinLines;
    private _winEvent: WinEvent;

    private _autoPlayCountText: Text;
    private _winText: Text;
    private _spinModeText!: Text;
    private _dimmer!: Graphics;
    private _popup!: Container;
    private _freeSpinRemain!: Container;
    private _freeSpinRemainHolder!: Sprite;
    private _freeSpinRemainText!: Text;
    private _popupBackground!: Sprite;
    private _popupHeader!: Sprite;
    private _popupFreeSpinsText!: Text;
    private _popupCountText!: Text;
    private _transition!: Spine;
    private _buyFreeSpinButton!: Sprite;

    private constructor() {
        super();

        this._winLines = WinLines.getInstance();
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
        this._winText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._winText.visible = false;
        this.addChildAt(this._winText, this.children.length);

        this._spinModeText = new Text({ text: ``, style: GameConfig.style.clone(), });
        this._spinModeText.label = 'SpinModeText';
        this._spinModeText.anchor.set(0.5, 0.5);
        this._spinModeText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._spinModeText.visible = false; // Hide by default
        this.addChild(this._spinModeText);

        this._popup = new Container();
        this._popup.label = 'FreeSpinPopupContainer';
        this._popup.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._popup.visible = false;
        this._popup.alpha = 0;
        this.addChild(this._popup);

        this._dimmer = new Graphics();
        this._dimmer.beginPath();
        this._dimmer.rect(0, 0, GameConfig.REFERENCE_RESOLUTION.width, GameConfig.REFERENCE_RESOLUTION.height);
        this._dimmer.fill({ color: 0x000000, alpha: 0.75 });
        this._dimmer.closePath();
        this._dimmer.pivot.set(this._dimmer.width / 2, this._dimmer.height / 2);
        this._dimmer.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._dimmer.scale.set(3, 3);
        this._popup.addChild(this._dimmer);

        this._popupBackground = Sprite.from("popup_background");
        this._popupBackground.label = 'FreeSpinPopupBackground';
        this._popupBackground.anchor.set(0.5);
        this._popup.addChild(this._popupBackground);

        this._popupHeader = Sprite.from("popup_header");
        this._popupHeader.label = 'FreeSpinPopupHeader';
        this._popupHeader.anchor.set(0.5);
        this._popupHeader.position.set(0, -275);
        this._popup.addChild(this._popupHeader);

        const popupHeaderText = new Text({ text: 'CONGRATULATIONS', style: GameConfig.style.clone() });
        popupHeaderText.label = 'FreeSpinPopupHeaderText';
        popupHeaderText.anchor.set(0.5, 0.5);
        popupHeaderText.position.set(0, -250);
        popupHeaderText.style.fontSize = 58;
        this._popup.addChild(popupHeaderText);

        const popupYouWonText = new Text({ text: 'YOU HAVE WON', style: GameConfig.style.clone() });
        popupYouWonText.label = 'FreeSpinPopupYouWonText';
        popupYouWonText.anchor.set(0.5, 0.5);
        popupYouWonText.position.set(0, -100);
        popupYouWonText.style.fontSize = 46;
        this._popup.addChild(popupYouWonText);

        this._popupCountText = new Text({ text: '', style: GameConfig.style.clone() });
        this._popupCountText.label = 'FreeSpinPopupCountText';
        this._popupCountText.anchor.set(0.5, 0.5);
        this._popupCountText.position.set(0, 30);
        this._popupCountText.style.fontSize = 145;
        this._popup.addChild(this._popupCountText);

        this._popupFreeSpinsText = new Text({ text: '', style: GameConfig.style.clone() });
        this._popupFreeSpinsText.label = 'FreeSpinPopupFreeSpinsText';
        this._popupFreeSpinsText.anchor.set(0.5, 0.5);
        this._popupFreeSpinsText.position.set(0, 160);
        this._popupFreeSpinsText.style.fontSize = 46;
        this._popup.addChild(this._popupFreeSpinsText);

        const popupPressAnywhere = new Text({ text: 'PRESS ANYWHERE TO CONTINUE', style: GameConfig.style.clone() });
        popupPressAnywhere.label = 'FreeSpinPopupPressText';
        popupPressAnywhere.anchor.set(0.5, 0.5);
        popupPressAnywhere.position.set(0, 225);
        popupPressAnywhere.style.fontSize = 20;
        popupPressAnywhere.style.fill = 0xffffff;
        popupPressAnywhere.style.stroke = {
            width: 0,
            color: 0x000000,
        }
        this._popup.addChild(popupPressAnywhere);

        this._freeSpinRemain = new Container();
        this._freeSpinRemain.label = 'FreeSpinRemainContainer';
        this._freeSpinRemain.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 940);
        this._freeSpinRemain.visible = false;
        this.addChild(this._freeSpinRemain);

        this._freeSpinRemainHolder = Sprite.from('freespin_remaining_strip');
        this._freeSpinRemainHolder.label = 'FreeSpinRemainHolder';
        this._freeSpinRemainHolder.anchor.set(0.5, 0.5);
        this._freeSpinRemainHolder.scale.set(0.5, 0.5);
        this._freeSpinRemain.addChild(this._freeSpinRemainHolder);

        this._freeSpinRemainText = new Text({ text: '', style: GameConfig.style.clone() });
        this._freeSpinRemainText.label = 'FreeSpinRemainText';
        this._freeSpinRemainText.anchor.set(0.5, 0.5);
        this._freeSpinRemain.addChild(this._freeSpinRemainText);

        this._buyFreeSpinButton = Sprite.from('freespin_logo');
        this._buyFreeSpinButton.label = 'BuyFreeSpinButtonSpine';
        this._buyFreeSpinButton.anchor.set(0.5, 0.5);
        this._buyFreeSpinButton.scale.set(0.3, 0.3);
        this._buyFreeSpinButton.position.set(1570, 50);
        this._buyFreeSpinButton.interactive = true;
        this._buyFreeSpinButton.cursor = 'pointer';
        this.addChild(this._buyFreeSpinButton);

        const activatedText = new Text({ text: 'FREE SPIN DEACTIVATED', style: GameConfig.style.clone() });
        activatedText.label = 'FreeSpinActivatedText';
        activatedText.anchor.set(0.5, 0.5);
        activatedText.position.set(1570, 90);
        activatedText.style.fontSize = 16;
        activatedText.alpha = 0;
        this.addChild(activatedText);

        this._buyFreeSpinButton.on('pointerenter', () => {
            gsap.to(this._buyFreeSpinButton.scale, { x: 0.4, y: 0.4, duration: 0.2 });
        });

        this._buyFreeSpinButton.on('pointerleave', () => {
            gsap.to(this._buyFreeSpinButton.scale, { x: 0.3, y: 0.3, duration: 0.2 });
        });

        this._buyFreeSpinButton.on('pointerdown', () => {
            GameDataManager.getInstance().freeSpinActive = !GameDataManager.getInstance().freeSpinActive;
            activatedText.text = GameDataManager.getInstance().freeSpinActive ? 'FREE SPIN ACTIVATED' : 'FREE SPIN DEACTIVATED';
            gsap.to(activatedText, {
                alpha: 1, duration: 0.2, onComplete: () => {
                    gsap.to(activatedText, { alpha: 0, duration: 0.2, delay: 1 });
                }
            });
        });

        this._winEvent = WinEvent.getInstance();
        this.addChild(this._winEvent);

        const { atlas, skeleton } = AssetsConfig.TRANSITION_SPINE_ASSET;

        this._transition = Spine.from({ atlas, skeleton });
        this._transition.label = 'TransitionSpine';
        this._transition.scale.set(15, 10);
        this._transition.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._transition.visible = false;
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
        return new Promise((resolve) => {
            if (!GameConfig.WIN_ANIMATION.winTextVisibility) {
                resolve();
                return;
            }

            // Play total win text animation
            gsap.fromTo(this._winText.scale, { x: 0, y: 0 }, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
                    this._winText.text = `$${Helpers.convertToDecimal(totalWinAmount)}`;
                    this._winText.visible = true;
                },
                onComplete: () => {
                    gsap.to(this._winText.scale, {
                        x: 0, y: 0, duration: 0.25, ease: 'back.in(1.7)', delay: 1, onComplete: () => {
                            this._winText.text = ``;
                            this._winText.visible = false;

                            resolve();
                        }
                    });
                }
            });
        });
    }

    public playWinTextAnimation(winAmount: number): void {
        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            // Play single win text animation
            gsap.fromTo(this._winText.scale, { x: 0, y: 0 }, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
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
            this._popup.visible = true;

            const closePopup = () => {
                this._popup.interactive = false;
                this._popup.cursor = 'default';

                window.removeEventListener("keydown", onKeyDown);
                this._popup.off('pointerdown', closePopup);

                gsap.to(this._popup, {
                    alpha: 0,
                    duration: 0.5,
                    ease: 'back.out(1.7)',
                    delay: 0.25,
                    onComplete: () => {
                        this._popup.visible = false;
                        resolve();
                    }
                });
            };

            const onKeyDown = (e: KeyboardEvent) => {
                if (e.code === "Space" || e.code === "Enter") {
                    e.preventDefault();
                    closePopup();
                }
            };

            this._popup.once('pointerdown', closePopup);
            window.addEventListener('keydown', onKeyDown);

            gsap.to(this._popup, {
                alpha: 1,
                duration: 0.5,
                ease: 'back.out(1.7)',
            });
        });
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

    public getSpinModeText(): Text {
        return this._spinModeText;
    }

    public getWinEvent(): WinEvent {
        return this._winEvent;
    }

    public getFreeSpinRemainContainer(): Container {
        return this._freeSpinRemain;
    }

    public getFreeSpinRemainText(): Text {
        return this._freeSpinRemainText;
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

    public getBuyFreeSpinButton(): Sprite {
        return this._buyFreeSpinButton;
    }
}