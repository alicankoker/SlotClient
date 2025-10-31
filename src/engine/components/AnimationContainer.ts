import { Container, Sprite, Text } from "pixi.js";
import { WinLines } from "./WinLines";
import { WinEvent } from "./WinEvent";
import { GameConfig } from "../../config/GameConfig";
import { signals, SIGNAL_EVENTS } from "../controllers/SignalManager";
import { Helpers } from "../utils/Helpers";
import { gsap } from "gsap";
import { AssetsConfig } from "../../config/AssetsConfig";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export class AnimationContainer extends Container {
    private static _instance: AnimationContainer;

    private _winLines: WinLines;
    private _winEvent: WinEvent;

    private _autoPlayCountText: Text;
    private _winText: Text;
    private _spinModeText!: Text;
    private _popup!: Container;
    private _freeSpinCountText!: Text;
    private _popupBackground!: Sprite;
    private _popupText!: Text;
    private _transition!: Spine;

    private constructor() {
        super();

        this._winLines = WinLines.getInstance();
        this.addChild(this._winLines);

        // initialize auto play count indicator
        this._autoPlayCountText = new Text({ text: '', style: GameConfig.style });
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
        this.addChild(this._popup);

        this._popupBackground = Sprite.from("popup_background");
        this._popupBackground.anchor.set(0.5);
        this._popup.addChild(this._popupBackground);

        this._popupText = new Text({ text: '', style: GameConfig.style.clone() });
        this._popupText.label = 'FreeSpinPopupText';
        this._popupText.anchor.set(0.5, 0.5);
        this._popup.addChild(this._popupText);

        this._freeSpinCountText = new Text({ text: '', style: GameConfig.style.clone() });
        this._freeSpinCountText.label = 'FreeSpinCountText';
        this._freeSpinCountText.anchor.set(0.5, 0.5);
        this._freeSpinCountText.position.set(480, 115);
        this._freeSpinCountText.visible = false;
        this.addChild(this._freeSpinCountText);

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
                    this._winText.text = `${Helpers.convertToDecimal(totalWinAmount)}€`;
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
                    this._winText.text = `${Helpers.convertToDecimal(winAmount)}€`;
                    this._winText.visible = true;
                }
            });
        }
    }

    public stopWinTextAnimation(): void {
        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            gsap.to(this._winText.scale, {
                x: 0, y: 0, duration: 0.25, ease: 'back.in(1.7)', onComplete: () => {
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
            this._popup.scale.set(0);
            this._popup.visible = true;
            gsap.to(this._popup.scale, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onComplete: () => {
                    gsap.to(this._popup.scale, {
                        x: 0, y: 0, duration: 0.25, ease: 'back.out(1.7)', delay: 1, onComplete: () => {
                            resolve();
                        }
                    });
                }
            });
        });
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

    public getFreeSpinCountText(): Text {
        return this._freeSpinCountText;
    }

    public getPopupBackground(): Sprite {
        return this._popupBackground;
    }

    public getPopupText(): Text {
        return this._popupText;
    }
}