import { Application, Graphics, Sprite, Text } from "pixi.js";
import { WinEventContainer } from "@slotclient/engine/winEvent/WinEventContainer";
import { WinEventController } from "@slotclient/engine/winEvent/WinEventController";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameConfig } from "@slotclient/config/GameConfig";
import { Counter } from "@slotclient/engine/utils/Counter";
import SoundManager from "@slotclient/engine/controllers/SoundManager";
import { AssetsConfig } from "../configs/AssetsConfig";
import { StyleConfig } from "../configs/StyleConfig";
import { WinEventType } from "@slotclient/engine/types/IWinEvents";
import { SpriteText } from "@slotclient/engine/utils/SpriteText";

export class WinEvent extends WinEventContainer {
    private static _instance: WinEvent;
    private _assetConfig: AssetsConfig;
    private _styleConfig: StyleConfig;
    private _controller: WinEventController<WinEvent>;
    private _soundManager: SoundManager;
    private _wins!: Spine;

    private constructor(app: Application) {
        super(app);
        this._assetConfig = AssetsConfig.getInstance();
        this._styleConfig = StyleConfig.getInstance();
        this.position.set(0, -100);
        this._soundManager = SoundManager.getInstance();
        this._controller = this.createController();
        this.init();
    }

    public static getInstance(app: Application): WinEvent {
        if (!WinEvent._instance) {
            WinEvent._instance = new WinEvent(app);
        }
        return WinEvent._instance;
    }

    private createController(): WinEventController<WinEvent> {
        return new (class extends WinEventController<WinEvent> {
            protected override async stopWinEventAnimation(): Promise<void> {
                // this.view._soundManager.fade("bigwin", 0.5, 0, 0.5);
                // this.view._soundManager.fade("coin", 0.25, 0, 0.5);

                await super.stopWinEventAnimation();

                // this.view._soundManager.stop("bigwin");
                // this.view._soundManager.stop("coin");
                this.view._wins.state.data.defaultMix = 0;
            }
        })(this);
    }

    private init(): void {
        // spine setup
        const { atlas, skeleton } = this._assetConfig.WINEVENT_SPINE_ASSET;

        this._wins = Spine.from({ atlas, skeleton });
        this._wins.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._wins.skeleton.setSlotsToSetupPose();
        this._wins.state.data.defaultMix = 0;
        this.addChild(this._wins);

        // win amount
        this._amountText = new SpriteText("Numbers");
        this._amountText.setAnchor(0.5, 0.5);
        this._amountText.setScale(0.75, 0.75);
        this._amountText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 950);
        this.addChild(this._amountText);

        // counter setup
        this._counter = new Counter({
            text: this._amountText
        });
    }

    public playWinEventAnimation(): void {
        this._duration = GameConfig.WIN_EVENT.duration + this._winEventType * GameConfig.WIN_EVENT.duration;

        // this._soundManager.playFor("bigwin", this._duration, 0.5);
        // this._soundManager.play("coin", false, 0.25);

        this._wins.state.setAnimation(0, "1", false);

        if (this._winEventType > 0) this.playAnimationCycle();
    }

    private playAnimationCycle(): void {
        for (let i = 1; i < this._winEventType + 1; i++) {
            this._wins.state.addAnimation(0, i + "-" + (i + 1), false, GameConfig.WIN_EVENT.duration);
            this._wins.state.addAnimation(0, (i + 1).toString(), false);
        }
    }

    public override skipWinEvent(): void {
        super.skipWinEvent();
        this._wins.state.setAnimation(0, (this._winEventType + 1).toString(), true);
    }

    public async show(amount: number, type: WinEventType): Promise<void> {
        await this._controller.showWinEvent(amount, type);
    }

    public getController(): WinEventController<WinEvent> {
        return this._controller;
    }
}