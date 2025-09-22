import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { signals, SIGNAL_EVENTS } from "../controllers/SignalManager";
import { gsap } from "gsap";
import { debug } from "./debug";
import { GameConfig } from "../../config/GameConfig";
import { ResponsiveConfig } from "./ResponsiveManager";

export class Loader extends Container {
    private static _instance: Loader;
    private app?: Application;

    private smooth = { percent: 0 };
    private startedAt = 0;
    private minDisplayTime = 900;
    private transitionTo100 = 600;
    private holdAfter100 = 350;
    private fadeOut = 300;

    private completionPromise: Promise<void>;
    private resolveCompletion!: () => void;

    private frame!: Sprite;
    private fill!: Sprite;
    private fillMask!: Graphics;
    private percentageLabel!: Text;
    private progressStatus!: Text;

    private padding: number = 1533;

    private constructor(app: Application) {
        super();

        this.app = app;

        this.completionPromise = new Promise<void>((resolve) => (this.resolveCompletion = resolve));
        signals.on(SIGNAL_EVENTS.ASSETS_LOADED, this.handleAssetsLoaded);

        app.stage.addChild(this);
        app.stage.sortableChildren = true;
        this.zIndex = 9999;
    }

    public static getInstance(app: Application): Loader {
        if (!Loader._instance) {
            Loader._instance = new Loader(app);
        }
        return Loader._instance;
    }

    public async create(): Promise<void> {
        const backgroundTextureLandscape = await Assets.load('background_landscape_1440');
        const backgroundTexturePortrait = await Assets.load('background_portrait_1440');
        const logoTexture = await Assets.load('game_logo_vertical');
        const frameTexture = await Assets.load('loading_bar_frame');
        const fillTexture = await Assets.load('loading_bar_fill');

        const background = Sprite.from(Texture.EMPTY);
        background.anchor.set(0.5, 0.5);
        background.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this.addChild(background);

        signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig?: ResponsiveConfig) => {
            background.texture = responsiveConfig?.orientation === "portrait" ? backgroundTexturePortrait : backgroundTextureLandscape;
        });

        const logo = Sprite.from(logoTexture);
        logo.anchor.set(0.5, 0.5);
        logo.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this.addChild(logo);

        this.frame = Sprite.from(frameTexture);
        this.frame.anchor.set(0.5, 0.5);
        this.frame.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 + 300);
        this.addChild(this.frame);

        this.fill = Sprite.from(fillTexture);
        this.fill.anchor.set(1, 0.5);
        this.fill.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2 - this.frame.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 + 299);
        this.addChild(this.fill);

        this.fillMask = new Graphics();
        this.fillMask.roundRect(
            GameConfig.REFERENCE_RESOLUTION.width / 2 - this.fill.width / 2,
            GameConfig.REFERENCE_RESOLUTION.height / 2 - this.fill.height / 2 + 299,
            this.fill.width,
            this.fill.height,
            20
        );
        this.fillMask.fill({ color: 0xffffff, alpha: 0 });
        this.addChild(this.fillMask);
        this.fill.mask = this.fillMask;

        this.percentageLabel = new Text({
            text: "0%",
            style: {
                fontFamily: "Nunito Black",
                fontSize: 35,
                fill: 0x000000,
                trim: true
            },
        });
        this.percentageLabel.anchor.set(0.5, 0.5);
        this.percentageLabel.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 + 300);
        this.addChild(this.percentageLabel);

        this.progressStatus = new Text({
            text: "Loading...",
            style: {
                fontFamily: "Nunito Black",
                fontSize: 35,
                fill: 0x000000,
                trim: true
            },
        });
        this.progressStatus.anchor.set(0.5, 0.5);
        this.progressStatus.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 750);
        this.addChild(this.progressStatus);

        const bePatientText = new Text({
            text: "Please be patient, this may take a while...",
            style: {
                fontFamily: "Nunito Black",
                fontSize: 35,
                fill: 0x000000,
                trim: true
            },
        });
        bePatientText.anchor.set(0.5, 0.5);
        bePatientText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 930);
        this.addChild(bePatientText);
    }

    private onLoaded(label: string, percent: number) {
        debug.log("Loader", `${label} is loading...`);
        this.tweenToPercent(percent);
        this.progressStatus.text = `Loading ${label}...`;

        if (label === "completed") {
            void this.completeProgress();
        }
    }

    // reference of handler (for unsubscribe)
    private handleAssetsLoaded = (data: any) => {
        const [label, percent] = Array.isArray(data) ? data : [data.label, data.percent];
        this.onLoaded(label as string, percent as number);
    };

    private redrawFill(ratio01: number) {
        const clamped = Math.max(0, Math.min(1, ratio01));
        const width = clamped * this.padding;
        this.fill.position.x = width;
    }

    public mount() {
        // pulse effect
        gsap.to(this.fill, {
            alpha: 0.5,
            duration: 0.25,
            ease: "none",
            yoyo: true,
            repeat: -1
        });

        this.startedAt = performance.now();
    }

    public unmount() {
        if (this.app) {
            this.app.stage.removeChild(this);
            this.app = undefined;
        }

        gsap.killTweensOf(this.smooth);
        gsap.killTweensOf(this.fill);
        // remove event listeners
        signals.off(SIGNAL_EVENTS.ASSETS_LOADED);
        Loader._instance = null as any;
        this.destroy({ children: true });
    }

    public tweenToPercent(percent: number) {
        const target = Math.max(this.smooth.percent, Math.min(percent, 100));
        gsap.to(this.smooth, {
            percent: target,
            duration: 0.25,
            ease: "power2.out",
            onUpdate: () => {
                const ratio = this.smooth.percent / 100;
                this.redrawFill(ratio);
                this.percentageLabel.text = `${Math.round(this.smooth.percent)}%`;
            },
        });
    }

    public setPercent(percent: number) {
        this.smooth.percent = Math.max(0, Math.min(percent, 100));
        const ratio = this.smooth.percent / 100;
        this.redrawFill(ratio);
        this.percentageLabel.text = `${Math.round(this.smooth.percent)}%`;
    }

    public async completeProgress(): Promise<void> {
        const elapsed = performance.now() - this.startedAt;
        const waitMs = Math.max(0, this.minDisplayTime - elapsed);
        if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));

        await new Promise<void>((resolve) => {
            gsap.to(this.smooth, {
                percent: 100,
                duration: this.transitionTo100 / 1000,
                ease: "power2.out",
                onUpdate: () => {
                    const ratio = this.smooth.percent / 100;
                    this.redrawFill(ratio);
                    this.percentageLabel.text = `${Math.round(this.smooth.percent)}%`;
                },
                onComplete: resolve,
            });
        });

        // wait a bit after reaching 100%
        if (this.holdAfter100 > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.holdAfter100));
        }

        // fade-out + close
        await new Promise<void>((resolve) => {
            gsap.to(this, {
                alpha: 0,
                duration: this.fadeOut / 1000,
                ease: "none",
                onComplete: () => {
                    this.unmount();
                    resolve();
                }
            });
        });

        this.resolveCompletion?.();
    }

    public get progress(): Promise<void> {
        return this.completionPromise;
    }

    // we can easily adjust these timings from the outside if we want
    public setTimings(opts: Partial<{ minDisplayTime: number; transitionTo100: number; holdAfter100: number; fadeOut: number }>) {
        Object.assign(this, opts);
    }
}