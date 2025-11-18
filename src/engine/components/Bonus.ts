import { Application, Container, Sprite, Text, Texture } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameConfig } from "../../config/GameConfig";
import { AssetsConfig } from "../../config/AssetsConfig";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { BonusController } from "../bonus/BonusController";
import { BonusContainer } from "../bonus/BonusContainer";
import { debug } from "../utils/debug";
import { IBonusData } from "../types/ICommunication";
import { gsap } from "gsap";
import { AnimationContainer } from "./AnimationContainer";
import { GameDataManager } from "../data/GameDataManager";
import { eventBus } from "../../communication/EventManagers/WindowEventManager";
import { Helpers } from "../utils/Helpers";
import { BackendToWinEventType } from "../types/IWinEvents";
import { SpriteText } from "../utils/SpriteText";

const SELECT_TEXT: string = "PLEASE SELECT";
const PRESS_TEXT: string = "PRESS ANYWHERE";
const CONTINUE_TEXT: string = "CONTINUE TO STAGE ";
const COLLECT_TEXT: string = "CLICK TO COLLECT";

const BonusElementsPositions = [
    { x: 575, y: 365 },
    { x: 935, y: 520 },
    { x: 1310, y: 475 },
    { x: 700, y: 45 },
    { x: 1000, y: 250 },
    { x: 1300, y: 110 }
];

export class Bonus extends BonusContainer {
    private static _instance: Bonus;
    private _app: Application;
    private _controller: BonusController<Bonus>;
    private _dynamiteContainer!: Container;
    private _rewardContainer!: Container;

    private _background!: Sprite;
    private _sign!: Spine;
    private _dynamites!: Spine[];
    private _trigger!: Spine;
    private _cable!: Sprite;
    private _infoText1!: Text;
    private _infoText2!: Text;
    private _rewards: (Sprite | SpriteText)[] = [];
    private _selectedItemIndex: number = -1;
    private _selectedRewardIndex: number = -1;
    private _isLandcape: boolean = true;
    private _zIndexCounter: number = 0;
    private _bonusStage: number = 1;
    private _isActive: boolean = false;

    private onBonusCompleteCallback?: () => void;

    private constructor(app: Application) {
        super();

        this._app = app;

        this._controller = this.createController();

        this.setupBonusElements();

        this.visible = false;
    }

    public static getInstance(app: Application): Bonus {
        if (!this._instance) {
            this._instance = new Bonus(app);
        }
        return this._instance;
    }

    public static instance(): Bonus {
        return this._instance;
    }

    private createController(): BonusController<Bonus> {
        return new (class extends BonusController<Bonus> {
            public async sendBonusAction(): Promise<IBonusData> {
                return super.sendBonusAction();
            }

            public onDataReceived(data: IBonusData): void {
                this.view.handleDataReceived(data);
                super.onDataReceived(data);
            }

            public resetBonus(): void {
                this.view.handleResetBonus();
            }

            public onBonusCompleted(): void {
                this.view.handleBonusCompleted();
            }
        })(this);
    }

    protected setupBonusElements(): void {
        this.createScene();
        this.eventListeners();
    }

    private createScene(): void {
        this._background = Sprite.from('bonus_background');
        this._background.label = 'BonusBackground';
        this._background.anchor.set(0.5);
        this._background.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this.addChild(this._background);

        this._cable = Sprite.from('tnt_cable_landscape');
        this._cable.label = 'TntCableLandscape';
        this._cable.anchor.set(0.5);
        this._cable.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this.addChild(this._cable);

        this._dynamiteContainer = new Container();
        this._dynamiteContainer.label = 'DynamiteContainer';
        this._dynamiteContainer.sortableChildren = true;
        this.addChild(this._dynamiteContainer);

        this._rewardContainer = new Container();
        this._rewardContainer.label = 'RewardContainer';
        this.addChild(this._rewardContainer);

        const { atlas, skeleton } = AssetsConfig.BONUS_SPINE_ASSET;

        this._dynamites = [];
        for (let index = 0; index < 6; index++) {
            this._dynamites[index] = Spine.from({ atlas, skeleton });
            this._dynamites[index].label = `Dynamite_${index}`;
            this._dynamites[index].position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
            this._dynamites[index].interactive = true;
            this._dynamites[index].cursor = 'pointer';
            this._dynamites[index].state.setAnimation(0, `Horizontal_Tnt_${index + 1}_selected`, true);
            this._dynamiteContainer.addChild(this._dynamites[index]);
        }

        this._zIndexCounter = this._dynamiteContainer.children.length;

        this._trigger = Spine.from({ atlas, skeleton });
        this._trigger.label = 'BonusTrigger';
        this._trigger.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._trigger.state.setAnimation(0, 'Horizontal_Bonus_Tnt1', false);
        this.addChild(this._trigger);

        this._sign = Spine.from({ atlas, skeleton });
        this._sign.label = 'BonusSign';
        this._sign.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 535);
        this._sign.state.setAnimation(0, 'Horizontal_Bonus_Sign', true);
        this._sign.state.data.defaultMix = 0.3;
        this.addChild(this._sign);

        this._infoText1 = new Text({
            text: '',
            style: GameConfig.style_5.clone(),
        });
        this._infoText1.label = `InfoText1`;
        this._infoText1.anchor.set(0.5, 0.5);
        this._infoText1.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 690);
        this._infoText1.visible = false;
        this._infoText1.style.fontSize = 50;
        this.addChild(this._infoText1);

        this._infoText2 = new Text({
            text: SELECT_TEXT,
            style: GameConfig.style_5,
        });
        this._infoText2.label = `InfoText2`;
        this._infoText2.anchor.set(0.5, 0.5);
        this._infoText2.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 750);
        this.addChild(this._infoText2);
    }

    private eventListeners(): void {
        for (let index = 0; index < this._dynamites.length; index++) {
            this._dynamites[index].on('pointerenter', () => {
                this._dynamites[index].state.setAnimation(0, this._isLandcape ? `Horizontal_Tnt_${index + 1}_idle` : `Vertical_Tnt_${index + 1}_idle`, true);
            });
            this._dynamites[index].on('pointerout', () => {
                this._dynamites[index].state.setAnimation(0, this._isLandcape ? `Horizontal_Tnt_${index + 1}_selected` : `Vertical_Tnt_${index + 1}_selected`, true);
            });
            this._dynamites[index].on('pointertap', async () => {
                // Disable interactions after selection
                this._dynamiteContainer.interactiveChildren = false;
                this._dynamites[index].interactive = false;
                this._dynamites[index].cursor = 'default';

                const response = await this._controller.sendBonusAction();

                this._infoText2.visible = false;

                this._selectedItemIndex = index;

                this._selectedRewardIndex = response.selectedIndex;

                const value = response.values[response.selectedIndex];

                const selectedType = typeof value === 'number' ? 'multiplier' : 'key';

                this.layoutRewards(index, this._bonusStage, selectedType);

                if (response.tier > this._bonusStage) {
                    this._bonusStage = response.tier;
                }

                let reward: Sprite | SpriteText = this._rewards[index];

                this._zIndexCounter++;
                this._dynamites[index].zIndex = this._zIndexCounter;
                this._dynamiteContainer.sortChildren();

                this._trigger.state.setAnimation(0, this._isLandcape ? 'Horizontal_Bonus_Tnt1' : 'Vertical_Bonus_Tnt1', false);
                this._trigger.state.addAnimation(0, this._isLandcape ? 'Horizontal_Bonus_Tnt2' : 'Vertical_Bonus_Tnt2', false, 1.5);
                this._sign.state.setAnimation(0, this._isLandcape ? 'Horizontal_Bonus_Sign' : 'Vertical_Bonus_Sign', false);
                this._sign.state.addAnimation(0, this._isLandcape ? 'Horizontal_Bonus_Sign_Explode' : 'Vertical_Bonus_Sign_Explode', false, 1.5);
                this._sign.state.addAnimation(0, this._isLandcape ? 'Horizontal_Bonus_Sign' : 'Vertical_Bonus_Sign', true, 2.4);
                this._dynamites[index].state.setAnimation(0, this._isLandcape ? `Horizontal_Bonus_${index + 1}` : `Vertical_Bonus_${index + 1}`, false);

                gsap.fromTo(reward, { alpha: 0 }, {
                    alpha: 1, duration: 0.25, delay: 2, onStart: () => {
                        (reward instanceof Text) && reward.scale.set(1.5, 1.5);
                        reward.visible = true;
                    }
                });

                if (GameConfig.WIN_EVENT.enabled && GameDataManager.getInstance().getLastSpinResult()?.winEventType !== 'normal') {
                    const winAmount = response.featureWin;
                    const backendType = GameDataManager.getInstance().getLastSpinResult()!.winEventType;
                    const enumType = BackendToWinEventType[backendType]!;

                    await Helpers.delay(2500);
                    await AnimationContainer.getInstance().playWinEventAnimation(winAmount, enumType);
                }

                setTimeout(() => {
                    this._dynamites.forEach((element, index) => {
                        if (index !== this._selectedItemIndex) {
                            element.state.setAnimation(0, this._isLandcape ? `Horizontal_Bonus_${index + 1}` : `Vertical_Bonus_${index + 1}`, false);

                            gsap.fromTo(this._rewards[index], { alpha: 0 }, {
                                alpha: 1, duration: 0.25, delay: 2, onStart: () => {
                                    this._rewards[index].visible = true;
                                },
                                onComplete: () => {
                                    this._infoText1.visible = true;
                                    this._infoText1.text = PRESS_TEXT;
                                    this._infoText2.visible = true;
                                    this._infoText2.text = CONTINUE_TEXT + this._bonusStage;

                                    this.afterSelect();
                                }
                            });
                        }
                    });
                }, 3000);
            });
        }
    }

    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    private layoutRewards(selectedIndex: number, stage: number, selectedType: 'key' | 'multiplier'): void {
        const total = this._dynamites.length;

        let keyCount = stage === 1 ? 2 : (stage === 2 ? 1 : 0);
        let multiplierCount = total - keyCount;

        if (selectedType === 'multiplier') {
            multiplierCount -= 1;
        } else if (selectedType === 'key') {
            keyCount -= 1;
        }

        this._rewards = [];

        for (let index = 0; index < keyCount; index++) {
            const key = Sprite.from("golden_key");
            key.label = `Key_Stage1_${index}`;
            key.anchor.set(0.5, 0.5);
            key.scale.set(0.2, 0.2);
            key.visible = false;
            this._rewardContainer.addChild(key);
            this._rewards.push(key);
        }

        for (let index = 0; index < multiplierCount; index++) {
            const multiplierText = new SpriteText("Numbers");
            multiplierText.label = `MultiplierText_Stage1_${index}`;
            multiplierText.setAnchor(0.5, 0.5);
            multiplierText.setScale(0.5, 0.5);
            multiplierText.visible = false;
            this._rewardContainer.addChild(multiplierText);
            this._rewards.push(multiplierText);
        }

        let selectedReward: Sprite | SpriteText;
        if (selectedType === 'key') {
            selectedReward = Sprite.from("golden_key");
            selectedReward.label = `SelectedKey_${stage}`;
            selectedReward.anchor.set(0.5, 0.5);
            selectedReward.scale.set(0.2);
        } else {
            selectedReward = new SpriteText("Numbers");
            selectedReward.setAnchor(0.5, 0.5);
            selectedReward.label = `SelectedMultiplier_${stage}`;
        }
        selectedReward.visible = false;
        this._rewardContainer.addChild(selectedReward);

        const others = this._rewards;
        this.shuffleArray(others);

        const shuffled: (Sprite | SpriteText)[] = [];
        for (let i = 0; i < total; i++) {
            shuffled.push(i === selectedIndex ? selectedReward : others.shift()!);
        }

        for (let i = 0; i < shuffled.length; i++) {
            shuffled[i].position.set(
                BonusElementsPositions[i].x,
                BonusElementsPositions[i].y
            );
        }

        this._rewards = shuffled;

        const multipliers = this._controller.data.values.filter(value => typeof value === 'number') as number[];
        const selectedMultiplier = this._controller.data.values[this._selectedRewardIndex] as number;
        const otherMultipliers = multipliers.filter(mul => mul !== selectedMultiplier);

        for (let index = 0; index < this._rewards.length; index++) {
            if (this._rewards[index] instanceof SpriteText) {
                if (index === selectedIndex) {
                    (this._rewards[index] as SpriteText).setText(`X${selectedMultiplier}`);
                } else {
                    const randomIndex = Math.floor(Math.random() * otherMultipliers.length);
                    const multiplier = otherMultipliers.splice(randomIndex, 1)[0];
                    (this._rewards[index] as SpriteText).setText(`X${multiplier}`);
                }
            }
        }
    }

    protected beforeSelect(): void {
        // Logic before selecting a bonus (e.g., setup animation)
    }

    protected afterSelect(): void {
        // Logic after a bonus is selected (e.g., transition out)
        if (GameDataManager.getInstance().getResponseData().nextAction !== "bonus") {
            this.onBonusCompleted();
        } else {
            this._app.canvas.onclick = async () => {
                await AnimationContainer.getInstance().startTransitionAnimation(() => {
                    this.resetScene();
                    this._app.canvas.onclick = null;
                });
            }
        }
    }

    protected resetScene(): void {
        // Logic to reset the bonus state and animations
        this._selectedItemIndex = -1;
        this._selectedRewardIndex = -1;
        this._dynamiteContainer.interactiveChildren = true;
        this._zIndexCounter = this._dynamiteContainer.children.length;

        this._infoText1.visible = false;
        this._infoText1.text = "";
        this._infoText2.visible = true;
        this._infoText2.text = SELECT_TEXT;

        this._rewards.forEach(reward => {
            this._rewardContainer.removeChild(reward);
        });

        for (let index = 0; index < this._dynamites.length; index++) {
            this._dynamites[index].zIndex = index;
            this._dynamites[index].state.setAnimation(0, this._isLandcape ? `Horizontal_Tnt_${index + 1}_selected` : `Vertical_Tnt_${index + 1}_selected`, true);
            this._dynamites[index].interactive = true;
            this._dynamites[index].cursor = 'pointer';
        }
    }

    protected onBonusCompleted(): void {
        // Logic when bonus is completed visually
        this._infoText1.visible = false;
        this._infoText2.text = COLLECT_TEXT;
        this._infoText2.visible = true;

        this._app.canvas.onclick = async () => {
            this._infoText2.visible = false;
            this._app.canvas.onclick = null;
            AnimationContainer.getInstance().getPopupCountText().setText(`$` + Helpers.convertToDecimal(this._controller.data.featureWin) as string);
            AnimationContainer.getInstance().getPopupContentText().text = ``;
            await AnimationContainer.getInstance().playPopupAnimation();
            await AnimationContainer.getInstance().startTransitionAnimation(() => {
                this.resetScene();
                this.visible = false;

                if (this.onBonusCompleteCallback) {
                    this.onBonusCompleteCallback();
                }
            });
        }
    }

    public setOnBonusCompleteCallback(callback: () => void): void {
        this.onBonusCompleteCallback = callback;
    }

    protected onResize(config?: ResponsiveConfig): void {
        switch (config?.orientation) {
            case 'landscape':
                this._isLandcape = true;
                this.position.y = 280;

                this._cable.texture = Texture.from('tnt_cable_landscape');
                this._cable.position.set(685, 640);
                this._trigger.state.setAnimation(0, 'Horizontal_Bonus_Tnt1', false);
                this._infoText1.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 690);
                this._infoText2.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 770);
                break;
            case 'portrait':
                this._isLandcape = false;
                this.position.y = 0;

                this._cable.texture = Texture.from('tnt_cable_portrait');
                this._cable.position.set(1115, 1110);
                this._trigger.state.setAnimation(0, 'Vertical_Bonus_Tnt1', false);
                this._infoText1.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 750);
                this._infoText2.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 850);
                break;
        }

        if (config?.deviceType === 'tablet') {
            this.position.y = 280;

            this._cable.texture = Texture.from('tnt_cable_landscape');
            this._cable.position.set(685, 640);
            this._trigger.state.setAnimation(0, 'Horizontal_Bonus_Tnt1', false);
            this._infoText1.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 690);
            this._infoText2.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 770);
        }
    }

    //#region Controller Methods
    private handleSendBonusAction(data: IBonusData): void {
        debug.log("Bonus action sended:", data);
    }

    private handleDataReceived(data: IBonusData): void {
        debug.log("Bonus data:", data);
    }

    private handleResetBonus(): void {
        debug.log("Resetting bonus.");
    }

    private handleBonusCompleted(): void {
        debug.log("Bonus completed.");
    }
    //#endregion

    public getController(): BonusController<Bonus> {
        return this._controller;
    }

    public get isActive(): boolean {
        return this._isActive;
    }

    public set isActive(value: boolean) {
        this._isActive = value;
    }
}