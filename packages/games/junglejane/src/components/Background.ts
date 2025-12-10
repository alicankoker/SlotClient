import { Texture } from "pixi.js";
import { BackgroundContainer } from "@slotclient/engine/background/BackgroundContainer";
import { BackgroundController } from "@slotclient/engine/background/BackgroundController";
import { ResponsiveConfig } from "@slotclient/engine/utils/ResponsiveManager";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { AssetsConfig } from "../configs/AssetsConfig";

export class Background extends BackgroundContainer {
    private static _instance: Background;
    private _controller: BackgroundController<Background>;
    private _assetsConfig: AssetsConfig;
    private _isFreeSpinMode: boolean = false;

    private _cloud!: Spine;
    private _leafs!: Spine;
    private _tree!: Spine;
    private _waterfall!: Spine;
    private _meteor!: Spine;
    private _skynight!: Spine;

    private constructor(texture: Texture) {
        super();

        this._assetsConfig = AssetsConfig.getInstance();

        this.position.set(0, 260);

        this.initialize(texture);

        this._controller = this.createController();

        this.setupBackgroundFilter();
    }

    public static getInstance(texture: Texture): Background {
        if (!this._instance) {
            this._instance = new Background(texture);
        }
        return this._instance;
    }

    public static instance(): Background {
        return this._instance;
    }

    private createController(): BackgroundController<Background> {
        return new (class extends BackgroundController<Background> { })(this);
    }

    private setupBackgroundFilter(): void {
        // const blurFilter = new BlurFilter();
        // blurFilter.strength = 10;
        // blurFilter.quality = 10;
        // this.filters = [blurFilter];
    }

    public createBackgroundElements(): void {
        const { atlas, skeleton } = this._assetsConfig.BACKGROUND_SPINE_ASSET;

        this._meteor = this.createSpineElement(atlas, skeleton, "Meteor", 'Free_meteor', true, 960, 100, false);
        this._waterfall = this.createSpineElement(atlas, skeleton, "Waterfall", 'Base_waterfall_idle', true, 960, 300);
        this._cloud = this.createSpineElement(atlas, skeleton, "Cloud", 'Base_Clouds_idle', true, 960, 400);
        this._tree = this.createSpineElement(atlas, skeleton, "Tree", 'Base_tree_idle', true, 960, 295);
        this._leafs = this.createSpineElement(atlas, skeleton, "Leafs", 'Base_leaf_idle', true, 960, 300);
        this._skynight = this.createSpineElement(atlas, skeleton, "Skynight", 'Free_skynight', true, 960, 200, false);
    }

    protected setupBackgroundElements(): void {
        super.setupBackgroundElements();
    }

    private createSpineElement(
        atlas: any,
        skeleton: any,
        name: string,
        animationName: string,
        loop: boolean,
        positionX: number,
        positionY: number,
        visible: boolean = true
    ): Spine {
        const spineElement = Spine.from({ atlas, skeleton });
        spineElement.label = name;
        spineElement.position.set(positionX, positionY);
        spineElement.visible = visible;
        visible && spineElement.state.setAnimation(0, animationName, loop);
        this.addChild(spineElement);
        return spineElement;
    }

    public setFreeSpinMode(enabled: boolean): void {
        this._isFreeSpinMode = enabled;
        this.setBackgroundTexture(enabled ? 'freespin_background' : 'base_background');

        const animationSuffix = enabled ? 'Free_' : 'Base_';

        this._waterfall.state.setAnimation(0, `${animationSuffix}waterfall_idle`, true);
        this._tree.state.setAnimation(0, `${animationSuffix}tree_idle`, true);
        this._leafs.state.setAnimation(0, `${animationSuffix}leaf_idle`, true);

        if (enabled) {
            this._meteor.state.setAnimation(0, `Free_meteor`, true);
            this._meteor.visible = true;
            this._skynight.state.setAnimation(0, `Free_skynight`, true);
            this._skynight.visible = true;
        } else {
            this._meteor.visible = false;
            this._meteor.state.clearTracks();
            this._skynight.visible = false;
            this._skynight.state.clearTracks();
        }
    }

    public playElementsSpinAnimation():void{
        const animationSuffix = this._isFreeSpinMode ? 'Free_' : 'Base_';

        this._tree.state.setAnimation(0, `${animationSuffix}tree_win`, false);
        this._leafs.state.setAnimation(0, `${animationSuffix}leaf_win`, false);

        this.stopElementsSpinAnimation();
    }

    public stopElementsSpinAnimation():void{
        const animationSuffix = this._isFreeSpinMode ? 'Free_' : 'Base_';

        this._tree.state.addAnimation(0, `${animationSuffix}tree_idle`, true, 0);
        this._leafs.state.addAnimation(0, `${animationSuffix}leaf_idle`, true, 0);
    }

    protected onResize(responsiveConfig: ResponsiveConfig): void {
        super.onResize(responsiveConfig);

        switch (responsiveConfig.orientation) {
            case this._gameConfig.ORIENTATION.landscape:
                this.position.set(0, 260);
                break;
            case this._gameConfig.ORIENTATION.portrait:
                this.position.set(0, -20);
                break;
        }
    }

    public getController(): BackgroundController<Background> {
        return this._controller;
    }
}