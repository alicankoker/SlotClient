import { Application, Text } from "pixi.js";
import { BigWinContainer } from "./BigWinContainer";
import { gsap } from "gsap";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Helpers } from "../utils/Helpers";
import { GameConfig } from "../../config/GameConfig";
import { BigWinType, BigWinTypeValue } from "../types/GameTypes";
import { Counter } from "../utils/Counter";

export class BigWin extends BigWinContainer {
    private static _instance: BigWin;

    private _wins!: Spine;

    private constructor() {
        super();

        this.init();
    }

    public static getInstance(): BigWin {
        if (!BigWin._instance) {
            BigWin._instance = new BigWin();
        }
        return BigWin._instance;
    }

    private init(): void {
        const skeleton = Helpers.getSpineSkeletonData("wins");

        this._wins = new Spine(skeleton);
        this._wins.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._wins.skeleton.setSlotsToSetupPose();
        this._wins.state.data.defaultMix = 0;
        this.addChild(this._wins);

        this._amountText = new Text({ text: "0", style: GameConfig.style.clone() });
        this._amountText.style.fontSize = 120;
        this._amountText.anchor.set(0.5);
        this._amountText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this.addChild(this._amountText);

        this._counter = new Counter({
            text: this._amountText
        });
    }

    // Implement the big win animation logic here
    protected playBigWinAnimation(): void {
        this._duration = GameConfig.BIG_WIN.duration + (this._bigWinType * GameConfig.BIG_WIN.duration);

        this._wins.state.setAnimation(0, Object.values(BigWinType)[0] + '_Landing', false);
        this._wins.state.addAnimation(0, Object.values(BigWinType)[0] + '_Loop', true);

        this._bigWinType > 0 && this.playAnimationCycle();
    }

    private playAnimationCycle(): void {
        this._wins.state.data.defaultMix = 0.25;

        for (let i = 1; i < this._bigWinType + 1; i++) {
            this._wins.state.addAnimation(0, Object.values(BigWinType)[i] + '_Landing', false, GameConfig.BIG_WIN.duration / 2);
            this._wins.state.addAnimation(0, Object.values(BigWinType)[i] + '_Loop', true);
        }
    }

    protected playCoinAnimation(): void {
        // Implement the coin animation logic here
    }

    protected stopCoinAnimation(): void {
        // Implement the logic to stop the coin animation here
    }

    protected override skipBigWin(): void {
        this._wins.state.setAnimation(0, Object.values(BigWinType)[this._bigWinType] + '_Loop', true);

        super.skipBigWin();
    }

    protected override async stopBigWinAnimation(): Promise<void> {
        await super.stopBigWinAnimation();

        this._wins.state.data.defaultMix = 0;
    }
}