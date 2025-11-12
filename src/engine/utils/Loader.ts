import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { signals, SIGNAL_EVENTS } from "../controllers/SignalManager";
import { gsap } from "gsap";
import { debug } from "./debug";
import { GameConfig } from "../../config/GameConfig";
import { Background } from "../components/Background";

export class Loader extends Container {
    private static _instance: Loader;
    private app: Application;

    private smooth = { percent: 0 };
    private startedAt = 0;
    private minDisplayTime = 900;
    private transitionTo100 = 600;
    private holdAfter100 = 350;
    private fadeOut = 300;

    private completionPromise: Promise<void>;
    private resolveCompletion!: () => void;

    private background!: Sprite;
    private fill!: Sprite;
    private fillMask!: Graphics;
    private percentageLabel!: Text;
    private progressStatus!: Text;

    private padding: number = 1420; //1533

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
        const backgroundTexture = await Assets.load('base_background');
        const logoTexture = await Assets.load('base_logo');

        const fShadow = await Assets.load('loading_bar_shadow');
        const fBackground = await Assets.load('loading_bar_bg');
        const fStrokeBack = await Assets.load('loading_bar_stroke_back');
        const fStrokeFront = await Assets.load('loading_bar_stroke_front');
        const fFill = await Assets.load('loading_bar_fill');

        const backgroundContainer = Background.getInstance(backgroundTexture);
        this.app?.stage.addChildAt(backgroundContainer, 0);

        const logo = Sprite.from(logoTexture);
        logo.label = "LoaderLogo";
        logo.anchor.set(0.5, 0.5);
        logo.scale.set(0.6, 0.6);
        logo.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2) - 80);
        this.addChild(logo);

        const shadow = Sprite.from(fShadow);
        shadow.label = "LoaderShadow";
        shadow.anchor.set(0.5, 0.5);
        shadow.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 + 300);
        shadow.scale.set(0.805, 0.850);
        shadow.tint = 0x000000;
        this.addChild(shadow);

        this.background = Sprite.from(fBackground);
        this.background.label = "LoaderFrame";
        this.background.anchor.set(0.5, 0.5);
        this.background.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 + 300);
        this.background.scale.set(0.8, 0.8);
        this.background.tint = 0x2a2c40;
        this.addChild(this.background);

        const strokeBack = Sprite.from(fStrokeBack);
        strokeBack.label = "LoaderGradient";
        strokeBack.anchor.set(0.5, 0.5);
        strokeBack.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 + 300);
        strokeBack.scale.set(0.8, 0.8);
        strokeBack.tint = 0xfff0dc;
        this.addChild(strokeBack);

        const strokeFront = Sprite.from(fStrokeFront);
        strokeFront.label = "LoaderStroke";
        strokeFront.anchor.set(0.5, 0.5);
        strokeFront.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 + 300);
        strokeFront.scale.set(0.8, 0.8);
        strokeFront.tint = 0xffa200;
        this.addChild(strokeFront);

        this.fill = Sprite.from(fFill);
        this.fill.label = "LoaderFill";
        this.fill.anchor.set(1, 0.5);
        this.fill.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2 - this.background.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 + 300);
        this.fill.scale.set(0.8, 0.8);
        this.fill.tint = 0x1dd4df;
        this.addChild(this.fill);

        this.fillMask = new Graphics();
        this.fillMask.label = "LoaderFillMask";
        this.fillMask.roundRect(
            GameConfig.REFERENCE_RESOLUTION.width / 2 - this.fill.width / 2,
            GameConfig.REFERENCE_RESOLUTION.height / 2 - this.fill.height / 2 + 300,
            this.fill.width,
            this.fill.height,
            30
        );
        this.fillMask.fill({ color: 0xffffff, alpha: 0 });
        this.addChild(this.fillMask);
        this.fill.mask = this.fillMask;

        this.percentageLabel = new Text({
            text: "0%",
            style: {
                fontFamily: "MikadoMedium",
                fontSize: 30,
                fill: 0xffffff,
                trim: true,
                dropShadow: {
                    color: '#000000',
                    distance: 2,
                    blur: 7.5,
                    alpha: 1,
                    angle: Math.PI / 2
                },
                stroke:{
                    color: '#000000',
                    width: 1,
                    alpha: 0.5
                },
                padding: 50
            },
        });
        this.percentageLabel.label = "LoaderPercentageLabel";
        this.percentageLabel.anchor.set(0.5, 0.5);
        this.percentageLabel.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2 + 300);
        this.addChild(this.percentageLabel);

        this.progressStatus = new Text({
            text: "Loading...",
            style: {
                fontFamily: "MikadoMedium",
                fontSize: 35,
                fill: 0xffffff,
                trim: true,
                dropShadow: {
                    color: '#000000',
                    distance: 2,
                    blur: 7.5,
                    alpha: 1,
                    angle: Math.PI / 2
                },
                stroke:{
                    color: '#000000',
                    width: 1,
                    alpha: 0.5
                },
                padding: 50
            },
        });
        this.progressStatus.label = "LoaderProgressStatus";
        this.progressStatus.anchor.set(0.5, 0.5);
        this.progressStatus.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 765);
        this.addChild(this.progressStatus);

        const bePatientText = new Text({
            text: "Please be patient, this may take a while...",
            style: {
                fontFamily: "MikadoMedium",
                fontSize: 35,
                fill: 0xffffff,
                trim: true,
                dropShadow: {
                    color: '#000000',
                    distance: 2,
                    blur: 7.5,
                    alpha: 1,
                    angle: Math.PI / 2
                },
                stroke:{
                    color: '#000000',
                    width: 1,
                    alpha: 0.5
                },
                padding: 50
            },
        });
        bePatientText.label = "LoaderBePatientText";
        bePatientText.anchor.set(0.5, 0.5);
        bePatientText.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, 915);
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
        if (!this.fill) return; // Guard against undefined fill
        const clamped = Math.max(0, Math.min(1, ratio01));
        const width = clamped * this.padding;
        this.fill.position.x = width;
    }

    public mount() {
        // pulse effect
        // gsap.to(this.fill, {
        //     alpha: 0.5,
        //     duration: 0.25,
        //     ease: "none",
        //     yoyo: true,
        //     repeat: -1
        // });

        this.startedAt = performance.now();
    }

    public unmount() {
        this.app.stage.removeChild(this);

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
                if (this.percentageLabel) {
                    this.percentageLabel.text = `${Math.round(this.smooth.percent)}%`;
                }
            },
        });
    }

    public setPercent(percent: number) {
        this.smooth.percent = Math.max(0, Math.min(percent, 100));
        const ratio = this.smooth.percent / 100;
        this.redrawFill(ratio);
        if (this.percentageLabel) {
            this.percentageLabel.text = `${Math.round(this.smooth.percent)}%`;
        }
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
                    if (this.percentageLabel) {
                        this.percentageLabel.text = `${Math.round(this.smooth.percent)}%`;
                    }
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