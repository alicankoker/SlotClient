import { Sprite, Texture, Application, Container, Assets } from "pixi.js";
import { signals, SCREEN_SIGNALS, SignalSubscription } from '../controllers/SignalManager';
import { GameConfig } from "../../config/GameConfig";
import { debug } from "../utils/debug";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { AtlasAttachmentLoader, SkeletonJson, Spine } from "@esotericsoftware/spine-pixi-v8";
import { AssetsConfig } from "../../config/AssetsConfig";

export class BackgroundContainer extends Container {
    private app: Application;
    private backgroundSprite: Sprite;

    private resizeSubscription?: SignalSubscription;

    constructor(app: Application) {
        super();

        this.app = app;

        this.backgroundSprite = new Sprite();
        this.backgroundSprite.label = 'BackgroundSprite';
        this.addChild(this.backgroundSprite);

        // Set initial size and position
        this.setupBackground();
        this.setupBackgroundElements();
        this.setupResizeHandler();
    }

    private setupBackground(): void {
        this.backgroundSprite.anchor.set(0.5, 0.5);
        this.backgroundSprite.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
    }

    private setupBackgroundElements(): void {
        // const { atlas, skeleton } = AssetsConfig.BACKGROUND_ANIMATIONS_ASSET;
        // const atlasAsset = Assets.get(atlas);
        // const skeletonAsset = Assets.get(skeleton);

        // const attachmentLoader = new AtlasAttachmentLoader(atlasAsset);
        // const json = new SkeletonJson(attachmentLoader);
        // const skeletonData = json.readSkeletonData(skeletonAsset);

        // const cloud = new Spine(skeletonData);

        // cloud.skeleton.setSlotsToSetupPose();

        // cloud.state.data.defaultMix = 0.5;

        // cloud.state.setAnimation(0, 'Background_Landscape_Cloud', true);
        // cloud.label = 'CloudSpine';
        // cloud.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        // this.addChild(cloud);

        // const rabbit = new Spine(skeletonData);

        // rabbit.skeleton.setSlotsToSetupPose();

        // rabbit.state.data.defaultMix = 0.5;

        // rabbit.state.setAnimation(0, 'Background_Landscape_Rabbit', true);
        // rabbit.label = 'RabbitSpine';
        // rabbit.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        // this.addChild(rabbit);

        // const glows = new Spine(skeletonData);

        // glows.skeleton.setSlotsToSetupPose();

        // glows.state.data.defaultMix = 0.5;

        // glows.state.setAnimation(0, 'Background_Landscape_Glows', true);
        // glows.label = 'GlowsSpine';
        // glows.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        // this.addChild(glows);
    }

    private setupResizeHandler(): void {
        // Subscribe to resize events using the signal system
        this.resizeSubscription = signals.on(SCREEN_SIGNALS.SCREEN_RESIZE, this.onResize.bind(this));
    }

    private onResize(responsiveConfig?: ResponsiveConfig): void {
        const assetName = responsiveConfig?.isMobile ? (responsiveConfig.orientation === GameConfig.ORIENTATION.landscape ? "background_landscape_1440" : "background_portrait_1440") : "background_landscape_1440";
        this.backgroundSprite.texture = Texture.from(assetName);
    }

    public destroy(): void {
        // Clean up resize subscription
        if (this.resizeSubscription) {
            this.resizeSubscription.unsubscribe();
            this.resizeSubscription = undefined;
        }

        // Call parent destroy
        super.destroy();
    }
}