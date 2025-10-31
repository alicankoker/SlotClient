import { Sprite } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameConfig } from "../../config/GameConfig";
import { AssetsConfig } from "../../config/AssetsConfig";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { BonusController } from "../bonus/BonusController";
import { BonusContainer } from "../bonus/BonusContainer";
import { debug } from "../utils/debug";

export class Bonus extends BonusContainer {
    private static _instance: Bonus;
    private _controller: BonusController<Bonus>;

    private _background!: Sprite;
    private _sign!: Spine;
    private _leftLantern!: Spine;
    private _rightLantern!: Spine;
    private _dynamites!: Spine[];
    private _trigger!: Spine;

    private constructor() {
        super();

        this._controller = this.createController();

        this.createScene();
        this.eventListeners();
    }

    public static getInstance(): Bonus {
        if (!this._instance) {
            this._instance = new Bonus();
        }
        return this._instance;
    }

    private createController(): BonusController<Bonus> {
        return new (class extends BonusController<Bonus> {
            public onDataReceived(data: any): void {
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

    private createScene(): void {
        this._background = Sprite.from('bonus_background');
        this._background.label = 'BonusBackground';
        this._background.anchor.set(0.5);
        this._background.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this.addChild(this._background);

        const { atlas, skeleton } = AssetsConfig.BONUS_SPINE_ASSET;

        this._leftLantern = Spine.from({ atlas, skeleton });
        this._leftLantern.label = 'BonusLeftLantern';
        this._leftLantern.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._leftLantern.state.setAnimation(0, 'Base_Lanthern_Left', true);
        this.addChild(this._leftLantern);

        this._rightLantern = Spine.from({ atlas, skeleton });
        this._rightLantern.label = 'BonusRightLantern';
        this._rightLantern.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._rightLantern.state.setAnimation(0, 'Base_Lanthern_Right', true);
        this.addChild(this._rightLantern);

        this._dynamites = [];
        for (let index = 0; index < 6; index++) {
            this._dynamites[index] = Spine.from({ atlas, skeleton });
            this._dynamites[index].label = `Dynamite_${index}`;
            this._dynamites[index].position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
            this._dynamites[index].interactive = true;
            this._dynamites[index].cursor = 'pointer';
            this._dynamites[index].state.setAnimation(0, `Horizontal_Tnt_${index + 1}_idle`, true);
            this.addChild(this._dynamites[index]);
        }

        this._trigger = Spine.from({ atlas, skeleton });
        this._trigger.label = 'BonusTrigger';
        this._trigger.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._trigger.state.setAnimation(0, 'Horizontal_Bonus_Tnt1', false);
        this.addChild(this._trigger);

        this._sign = Spine.from({ atlas, skeleton });
        this._sign.label = 'BonusSign';
        this._sign.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 - 100);
        this._sign.state.setAnimation(0, 'Horizontal_Bonus_Sign', true);
        this.addChild(this._sign);
    }

    private eventListeners(): void {
        for (let index = 0; index < this._dynamites.length; index++) {
            this._dynamites[index].on('pointerenter', () => {
                this._dynamites[index].state.setAnimation(0, `Horizontal_Tnt_${index + 1}_selected`, true);
            });
            this._dynamites[index].on('pointerout', () => {
                this._dynamites[index].state.setAnimation(0, `Horizontal_Tnt_${index + 1}_idle`, true);
            });
            this._dynamites[index].on('pointertap', () => {
                // Disable interactions after selection
                this._dynamites[index].off('pointerenter');
                this._dynamites[index].off('pointerout');
                this._dynamites[index].off('pointertap');
                this._dynamites[index].interactive = false;
                this._dynamites[index].cursor = 'default';

                this._dynamites[index].state.setAnimation(0, `Horizontal_Bonus_${index + 1}`, false);

                const listener = {
                    complete: async (entry: any) => {
                        if (entry.animation.name === `Horizontal_Bonus_${index + 1}`) {
                            await this._controller.sendBonusData({ action: 'selectBonus', historyId: index })
                            // listener cleanup
                            this._dynamites[index].state.removeListener(listener);
                        }
                    }
                };

                this._dynamites[index].state.addListener(listener);
            });
        }
    }

    protected beforeSelect(): void {
        // Logic before selecting a bonus (e.g., setup animation)
    }

    protected onBonusSelected(): void {
    }

    protected afterSelect(): void {
        // Logic after a bonus is selected (e.g., transition out)
    }

    protected resetScene(): void {
        // Logic to reset the bonus state and animations

        for (let index = 0; index < this._dynamites.length; index++) {
            this._dynamites[index].state.setAnimation(0, `Horizontal_Tnt_${index + 1}_idle`, true);
        }
    }

    protected onBonusCompleted(): void {
        // Logic when bonus is completed visually
    }

    protected onResize(config?: ResponsiveConfig): void {
        // switch (config?.orientation) {
        //     case 'landscape':
        //         for (let index = 0; index < this.dynamites.length; index++) {
        //             this.dynamites[index].state.setAnimation(0, `Horizontal_Tnt_${index + 1}_idle`, true);
        //         }

        //         this.trigger.state.setAnimation(0, 'Horizontal_Bonus_Tnt1', false);
        //         this.sign.state.setAnimation(0, 'Horizontal_Bonus_Sign', true);
        //         break;
        //     case 'portrait':
        //         for (let index = 0; index < this.dynamites.length; index++) {
        //             this.dynamites[index].state.setAnimation(0, `Vertical_Tnt_${index + 1}_idle`, true);
        //         }

        //         this.trigger.state.setAnimation(0, 'Vertical_Bonus_Tnt1', false);
        //         this.sign.state.setAnimation(0, 'Vertical_Bonus_Sign', true);
        //         break;
        // }
    }

    //#region Controller Methods
    private handleDataReceived(data: any): void {
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
}