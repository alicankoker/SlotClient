import { Application, Container, Sprite, Text, Texture } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameConfig } from "../configs/GameConfig";
import { AssetsConfig } from "../configs/AssetsConfig";
import { ResponsiveConfig } from "@slotclient/engine/utils/ResponsiveManager";
import { BonusController } from "@slotclient/engine/bonus/BonusController";
import { BonusContainer } from "@slotclient/engine/bonus/BonusContainer";
import { debug } from "@slotclient/engine/utils/debug";
import { IBonusData } from "@slotclient/engine/types/ICommunication";
import { gsap } from "gsap";
import { AnimationContainer } from "./AnimationContainer";
import { GameDataManager } from "@slotclient/engine/data/GameDataManager";
import { Helpers } from "@slotclient/engine/utils/Helpers";
import { BackendToWinEventType } from "@slotclient/engine/types/IWinEvents";
import { SpriteText } from "@slotclient/engine/utils/SpriteText";
import { StyleConfig } from "../configs/StyleConfig";

const PLEASE_SELECT_TEXT: string = "PLEASE SELECT";
const YOU_WON_TEXT: string = "YOU WON X";
const CLICK_ANYWHERE_TEXT: string = "CLICK ANYWHERE";
const CONTINUE_TO_STAGE_TEXT: string = "CONTINUE TO STAGE ";
const CLICK_TO_COLLECT_TEXT: string = "CLICK TO COLLECT";
const CLICK_TO_CONTINUE_TEXT: string = "CLICK TO CONTINUE";

const BonusElementsPositions = [
    { x: 1320, y: 330 },
    { x: 1065, y: -10 },
    { x: 950, y: 190 },
    { x: 510, y: 40 },
    { x: 660, y: 330 },
    { x: 1540, y: 100 }
];

export class Bonus extends BonusContainer {
    private static _instance: Bonus;
    private _app: Application;
    private _assetsConfig: AssetsConfig;
    private _gameConfig: GameConfig;
    private _styleConfig: StyleConfig;
    private _controller: BonusController<Bonus>;
    private _boxContainer!: Container;
    private _rewardContainer!: Container;

    private _background!: Sprite;
    private _bonusLogo!: Spine;
    private _plants!: Spine;
    private _boxes!: Spine[];
    private _infoText1!: Text;
    private _infoText2!: Text;
    private _rewards: (Sprite | SpriteText)[] = [];
    private _glow!: Sprite;
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

        this._assetsConfig = AssetsConfig.getInstance();
        this._gameConfig = GameConfig.getInstance();
        this._styleConfig = StyleConfig.getInstance();

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
        this._background.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, this._gameConfig.REFERENCE_RESOLUTION.height / 2);
        this.addChild(this._background);

        this._boxContainer = new Container();
        this._boxContainer.label = 'BoxContainer';
        this._boxContainer.position.set(0, -250);
        this._boxContainer.sortableChildren = true;
        this.addChild(this._boxContainer);

        this._glow = Sprite.from('glow');
        this._glow.label = 'Glow';
        this._glow.anchor.set(0.5, 0.5);
        this._glow.blendMode = "add";
        this._glow.visible = false;
        this.addChild(this._glow);

        this._rewardContainer = new Container();
        this._rewardContainer.label = 'RewardContainer';
        this.addChild(this._rewardContainer);

        const { atlas, skeleton } = this._assetsConfig.BONUS_SPINE_ASSET;

        this._bonusLogo = Spine.from({ atlas, skeleton });
        this._bonusLogo.label = `BonusLogo`;
        this._bonusLogo.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 265);
        this._bonusLogo.state.setAnimation(0, "bonus", true);
        this.addChild(this._bonusLogo);

        this._plants = Spine.from({ atlas, skeleton });
        this._plants.label = `Bonus_Plants`;
        this._plants.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 280);
        this._plants.state.setAnimation(0, "plants", true);
        this.addChild(this._plants);

        this._boxes = [];
        for (let index = 0; index < 6; index++) {
            this._boxes[index] = Spine.from({ atlas, skeleton });
            this._boxes[index].label = `Box_${index}`;
            this._boxes[index].position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, this._gameConfig.REFERENCE_RESOLUTION.height / 2);
            this._boxes[index].interactive = true;
            this._boxes[index].cursor = 'pointer';
            this._boxes[index].state.setAnimation(0, `${index + 1}_idle`, true);
            this._boxContainer.addChild(this._boxes[index]);
        }

        this._zIndexCounter = this._boxContainer.children.length;

        this._infoText1 = new Text({
            text: '',
            style: this._styleConfig.style_5.clone(),
        });
        this._infoText1.label = `InfoText1`;
        this._infoText1.anchor.set(0.5, 0.5);
        this._infoText1.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 690);
        this._infoText1.visible = false;
        this._infoText1.style.fontSize = 50;
        this.addChild(this._infoText1);

        this._infoText2 = new Text({
            text: PLEASE_SELECT_TEXT,
            style: this._styleConfig.style_5,
        });
        this._infoText2.label = `InfoText2`;
        this._infoText2.anchor.set(0.5, 0.5);
        this._infoText2.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 750);
        this.addChild(this._infoText2);
    }

    private eventListeners(): void {
        for (let index = 0; index < this._boxes.length; index++) {
            this._boxes[index].on('pointerenter', () => {
                this._boxes[index].state.setAnimation(0, `${index + 1}_idle`, true);
            });
            this._boxes[index].on('pointerout', () => {
                this._boxes[index].state.setAnimation(0, `${index + 1}_idle`, true);
            });
            this._boxes[index].on('pointertap', async () => {
                // Disable interactions after selection
                this._boxContainer.interactiveChildren = false;
                this._boxes[index].interactive = false;
                this._boxes[index].cursor = 'default';

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
                this._boxes[index].zIndex = this._zIndexCounter;
                this._boxContainer.sortChildren();

                this._boxes[index].state.setAnimation(0, `${index + 1}_open`, false);

                gsap.fromTo([reward, this._glow], { alpha: 0 }, {
                    alpha: 1, duration: 0.25, delay: 2, onStart: () => {
                        this._glow.position.set(BonusElementsPositions[index].x, BonusElementsPositions[index].y);
                        this._glow.visible = true;
                        gsap.to(this._glow, {angle: "+=360", duration: 5, repeat: -1, ease: "linear"});

                        reward.visible = true;
                        typeof value === 'number' && (this._infoText1.text = YOU_WON_TEXT + `${value}`);
                        typeof value === 'number' && (this._infoText1.visible = true);
                        this._infoText2.text = CLICK_TO_CONTINUE_TEXT;
                        this._infoText2.visible = true;
                    }
                });

                if (this._gameConfig.WIN_EVENT.enabled && GameDataManager.getInstance().getLastSpinResult()?.winEventType !== 'normal') {
                    const winAmount = response.featureWin;
                    const backendType = GameDataManager.getInstance().getLastSpinResult()!.winEventType;
                    const enumType = BackendToWinEventType[backendType]!;

                    await Helpers.delay(2500);
                    await AnimationContainer.instance().playWinEventAnimation(winAmount, enumType);
                }

                this._app.canvas.onpointerdown = () => {
                    this._app.canvas.onpointerdown = null;

                    this._infoText1.visible = false;
                    this._infoText2.visible = false;

                    this._boxes.forEach((element, index) => {
                        if (index !== this._selectedItemIndex) {
                            element.state.setAnimation(0, `${index + 1}_open`, false);

                            gsap.fromTo(this._rewards[index], { alpha: 0 }, {
                                alpha: 1, duration: 0.25, delay: 2, onStart: () => {
                                    this._rewards[index].visible = true;
                                },
                                onComplete: () => {
                                    this._infoText1.text = CLICK_ANYWHERE_TEXT;
                                    this._infoText1.visible = true;
                                    this._infoText2.text = CONTINUE_TO_STAGE_TEXT + this._bonusStage;
                                    this._infoText2.visible = true;

                                    this.afterSelect();
                                }
                            });
                        }
                    });
                };
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
        const total = this._boxes.length;

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
            selectedReward.label = `SelectedMultiplier_${stage}`;
            selectedReward.setAnchor(0.5, 0.5);
            selectedReward.setScale(0.75, 0.75);
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
            this._app.canvas.onpointerdown = async () => {
                await AnimationContainer.instance().startTransitionAnimation(() => {
                    this.resetScene();
                    this._app.canvas.onpointerdown = null;
                });
            };
        }
    }

    protected resetScene(): void {
        // Logic to reset the bonus state and animations
        this._selectedItemIndex = -1;
        this._selectedRewardIndex = -1;
        this._boxContainer.interactiveChildren = true;
        this._zIndexCounter = this._boxContainer.children.length;

        gsap.killTweensOf(this._glow);
        this._glow.visible = false;
        this._glow.alpha = 0;

        this._infoText1.visible = false;
        this._infoText1.text = "";
        this._infoText2.visible = true;
        this._infoText2.text = PLEASE_SELECT_TEXT;

        this._rewards.forEach(reward => {
            this._rewardContainer.removeChild(reward);
        });

        for (let index = 0; index < this._boxes.length; index++) {
            this._boxes[index].zIndex = index;
            this._boxes[index].state.setAnimation(0, `${index + 1}_idle`, true);
            this._boxes[index].interactive = true;
            this._boxes[index].cursor = 'pointer';
        }
    }

    protected onBonusCompleted(): void {
        // Logic when bonus is completed visually
        this._infoText1.visible = false;
        this._infoText2.text = CLICK_TO_COLLECT_TEXT;
        this._infoText2.visible = true;

        this._app.canvas.onpointerdown = async () => {
            this._infoText2.visible = false;
            this._app.canvas.onpointerdown = null;
            AnimationContainer.instance().getPopupCountText().setText(`$` + Helpers.convertToDecimal(this._controller.data.featureWin) as string);
            AnimationContainer.instance().getPopupContentText().text = ``;
            await AnimationContainer.instance().playPopupAnimation();
            await AnimationContainer.instance().startTransitionAnimation(() => {
                this.resetScene();
                this.visible = false;

                if (this.onBonusCompleteCallback) {
                    this.onBonusCompleteCallback();
                }
            });
        };
    }

    public setOnBonusCompleteCallback(callback: () => void): void {
        this.onBonusCompleteCallback = callback;
    }

    protected onResize(config?: ResponsiveConfig): void {
        switch (config?.orientation) {
            case 'landscape':
                this._isLandcape = true;
                this.position.y = 280;

                this._infoText1.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 690);
                this._infoText2.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 770);
                break;
            case 'portrait':
                this._isLandcape = false;
                this.position.y = 0;

                this._infoText1.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 750);
                this._infoText2.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 850);
                break;
        }

        if (config?.deviceType === 'tablet') {
            this.position.y = 280;

            this._infoText1.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 690);
            this._infoText2.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 770);
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