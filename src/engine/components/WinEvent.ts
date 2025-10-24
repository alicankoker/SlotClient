import { Graphics, Text } from "pixi.js";
import { WinEventContainer } from "../winEvent/WinEventContainer";
import { WinEventController } from "../winEvent/WinEventController";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameConfig } from "../../config/GameConfig";
import { WinEventType } from "../types/GameTypes";
import { Counter } from "../utils/Counter";
import SoundManager from "../controllers/SoundManager";
import { eventBus } from "../utils/WindowEventManager";
import { AssetsConfig } from "../../config/AssetsConfig";

export class WinEvent extends WinEventContainer {
    private static _instance: WinEvent;
    private _controller: WinEventController<WinEvent>;
    private _soundManager: SoundManager;
    private _wins!: Spine;
    private _dimmer!: Graphics;

    private constructor() {
        super();
        this._soundManager = SoundManager.getInstance();
        this._controller = this.createController();
        this.init();
    }

    public static getInstance(): WinEvent {
        if (!WinEvent._instance) {
            WinEvent._instance = new WinEvent();
        }
        return WinEvent._instance;
    }

    private createController(): WinEventController<WinEvent> {
        return new (class extends WinEventController<WinEvent> {
            protected override async stopWinEventAnimation(): Promise<void> {
                this.view._soundManager.fade("bigwin", 0.5, 0, 0.5);
                this.view._soundManager.fade("coin", 0.25, 0, 0.5);

                await super.stopWinEventAnimation();

                this.view._soundManager.stop("bigwin");
                this.view._soundManager.stop("coin");
                this.view._wins.state.data.defaultMix = 0;

                eventBus.emit("showUI");
            }
        })(this);
    }

    private init(): void {
        // background dim
        this._dimmer = new Graphics();
        this._dimmer.beginPath();
        this._dimmer.rect(0, 0, GameConfig.REFERENCE_RESOLUTION.width, GameConfig.REFERENCE_RESOLUTION.height);
        this._dimmer.fill({ color: 0x000000, alpha: 0.75 });
        this._dimmer.closePath();
        this._dimmer.pivot.set(this._dimmer.width / 2, this._dimmer.height / 2);
        this._dimmer.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._dimmer.scale.set(3, 3);
        this.addChild(this._dimmer);

        // spine setup
        const { atlas, skeleton } = AssetsConfig.WINS_SPINE_ASSET;

        this._wins = Spine.from({ atlas, skeleton });
        this._wins.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._wins.skeleton.setSlotsToSetupPose();
        this._wins.state.data.defaultMix = 0;
        this.addChild(this._wins);

        // win amount
        this._amountText = new Text({
            text: "0",
            style: GameConfig.style.clone(),
        });
        this._amountText.style.fontSize = 120;
        this._amountText.anchor.set(0.5);
        this._amountText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this.addChild(this._amountText);

        // counter setup
        this._counter = new Counter({
            text: this._amountText,
        });
    }

    // Görsel animasyon
    public playWinEventAnimation(): void {
        eventBus.emit("hideUI");

        this._duration = GameConfig.WIN_EVENT.duration + this.winEventType * GameConfig.WIN_EVENT.duration;

        this._soundManager.playFor("bigwin", this._duration, 0.5);
        this._soundManager.play("coin", false, 0.25);

        this._wins.state.setAnimation(0, Object.values(WinEventType)[0] + "_Landing", false);
        this._wins.state.addAnimation(0, Object.values(WinEventType)[0] + "_Loop", true);

        if (this.winEventType > 0) this.playAnimationCycle();
    }

    private playAnimationCycle(): void {
        this._wins.state.data.defaultMix = 0.25;

        for (let i = 1; i < this.winEventType + 1; i++) {
            this._wins.state.addAnimation(0, Object.values(WinEventType)[i] + "_Landing", false, GameConfig.WIN_EVENT.duration / 2);
            this._wins.state.addAnimation(0, Object.values(WinEventType)[i] + "_Loop", true);
        }
    }

    public override skipWinEvent(): void {
        super.skipWinEvent();
        this._wins.state.setAnimation(0, Object.values(WinEventType)[this.winEventType] + "_Loop", true);
    }

    /** Dışarıdan çağırılacak tek method */
    public async show(amount: number, type: WinEventType): Promise<void> {
        await this._controller.showWinEvent(amount, type);
    }

    public getController(): WinEventController<WinEvent> {
        return this._controller;
    }
}