import { Graphics, Sprite, Text } from "pixi.js";
import { WinEventContainer } from "../winEvent/WinEventContainer";
import { WinEventController } from "../winEvent/WinEventController";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameConfig } from "../../config/GameConfig";
import { Counter } from "../utils/Counter";
import SoundManager from "../controllers/SoundManager";
import { eventBus } from "../../communication/EventManagers/WindowEventManager";
import { AssetsConfig } from "../../config/AssetsConfig";
import { WinEventType } from "../types/IWinEvents";
import { SpriteText } from "../utils/SpriteText";

export class WinEvent extends WinEventContainer {
    private static _instance: WinEvent;
    private _controller: WinEventController<WinEvent>;
    private _soundManager: SoundManager;
    private _wins!: Spine;
    private _counterStrip!: Sprite;

    private constructor() {
        super();
        this.position.set(0, -100);
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
        // spine setup
        const { atlas, skeleton } = AssetsConfig.WINEVENT_SPINE_ASSET;

        this._wins = Spine.from({ atlas, skeleton });
        this._wins.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._wins.skeleton.setSlotsToSetupPose();
        this._wins.state.data.defaultMix = 0;
        this.addChild(this._wins);

        this._counterStrip = Sprite.from('win_event_strip');
        this._counterStrip.label = 'counterStrip';
        this._counterStrip.anchor.set(0.5, 0.5);
        this._counterStrip.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 975);
        this.addChild(this._counterStrip);

        // win amount
        this._amountText = new SpriteText("Numbers");
        this._amountText.setAnchor(0.5, 0.5);
        this._amountText.setScale(0.5, 0.5);
        this._amountText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 910);
        this.addChild(this._amountText);

        // counter setup
        this._counter = new Counter({
            text: this._amountText
        });
    }

    // Görsel animasyon
    public playWinEventAnimation(): void {
        eventBus.emit("hideUI");

        this._duration = GameConfig.WIN_EVENT.duration + this._winEventType * GameConfig.WIN_EVENT.duration;

        this._soundManager.playFor("bigwin", this._duration, 0.5);
        this._soundManager.play("coin", false, 0.25);

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

    /** Dışarıdan çağırılacak tek method */
    public async show(amount: number, type: WinEventType): Promise<void> {
        await this._controller.showWinEvent(amount, type);
    }

    public getController(): WinEventController<WinEvent> {
        return this._controller;
    }
}