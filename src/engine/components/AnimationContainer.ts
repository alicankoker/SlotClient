import { Container, Text } from "pixi.js";
import { WinLines } from "./WinLines";
import { WinEvent } from "./WinEvent";
import { GameConfig } from "../../config/GameConfig";
import { signals, SIGNAL_EVENTS } from "../controllers/SignalManager";
import { Helpers } from "../utils/Helpers";
import { gsap } from "gsap";

export class AnimationContainer extends Container {
    private static _instance: AnimationContainer;

    private _winLines: WinLines;
    private _winEvent: WinEvent;

    private _autoPlayCountText: Text;
    private _winText: Text;
    private _spinModeText!: Text;

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
        this._winText.style.fontSize = 100;
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

        this._winEvent = WinEvent.getInstance();
        this.addChild(this._winEvent);

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
            console.log("ReelsContainer: Received WIN_ANIMATION_PLAY signal");
            if (winAmount !== undefined) {
                this.playWinAnimation(winAmount);
            }
        });

        signals.on(SIGNAL_EVENTS.WIN_ANIMATION_COMPLETE, () => {
            console.log("ReelsContainer: Received WIN_ANIMATION_COMPLETE signal");
            this.stopWinAnimation();
        });
    }

    private playWinAnimation(winAmount: number): void {
        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            // Play win text animation
            gsap.fromTo(this._winText.scale, { x: 0, y: 0 }, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
                    this._winText.text = `${Helpers.convertToDecimal(winAmount)}€`;
                    this._winText.visible = true;
                }
            });
        }
    }

    private stopWinAnimation(): void {
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
}