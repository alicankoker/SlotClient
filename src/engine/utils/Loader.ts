import { Application, Container, Graphics, Text } from "pixi.js";
import { signals, SCREEN_SIGNALS } from '../controllers/SignalManager';
import { gsap } from "gsap";
import { debug } from "./debug";

export class Loader extends Container {
    private static _instance: Loader;
    private app?: Application;
    private smooth = { percent: 0 };
    private onLoaded!: (itemName: string, progress: number) => void;
    private completionPromise: Promise<void>;
    private resolveCompletion!: () => void;

    private track!: Graphics;
    private fill!: Graphics;
    private percentageLabel!: Text;
    private progressStatus!: Text;

    private barWidth: number = 450;
    private barHeight: number = 26;
    private padding: number = 4;

    private constructor() {
        super();
        this.completionPromise = new Promise<void>(resolve => (this.resolveCompletion = resolve));

        this.onLoaded = async (label: string, percent: number) => {
            debug.log("Loader", `${label} is loading...`);
            this.tweenToPercent(percent);

            this.progressStatus.text = `Loading ${label}...`;

            if (label === "completed") {
                await this.completeProgress();
            }
        };

        signals.on(SCREEN_SIGNALS.ASSETS_LOADED, (data: any) => {
            // If data is an array [label, percent], destructure it
            // If data is an object { label, percent }, access properties
            // Adjust according to SignalManager emit implementation
            const [label, percent] = Array.isArray(data) ? data : [data.label, data.percent];
            this.onLoaded(label, percent);
        });
    }

    public static getInstance(): Loader {
        if (!Loader._instance) {
            Loader._instance = new Loader();
        }
        return Loader._instance;
    }

    public init(): void {
        if (!this.track) this.create();
    }

    private create(): void {
        this.track = new Graphics()
            .roundRect(0, 0, this.barWidth, this.barHeight, this.barHeight / 2)
            .fill(0x22242a);
        this.addChild(this.track);

        this.fill = new Graphics();
        this.addChild(this.fill);
        this.redrawFill(0);

        this.percentageLabel = new Text({
            text: "0%",
            style: { fontFamily: "Inter, Arial", fontSize: 15, fill: 0xffffff },
        });
        this.percentageLabel.anchor.set(0.5, 0.5);
        this.percentageLabel.position.set(this.barWidth / 2, this.barHeight / 2);
        this.addChild(this.percentageLabel);

        this.progressStatus = new Text({
            text: "Loading...",
            style: { fontFamily: "Inter, Arial", fontSize: 18, fill: 0x000000 },
        });
        this.progressStatus.anchor.set(0.5, 0.5);
        this.progressStatus.position.set(this.barWidth / 2, this.barHeight / 2 + 30);
        this.addChild(this.progressStatus);
    }

    private redrawFill(ratio01: number) {
        const clamped = Math.max(0, Math.min(1, ratio01));
        const width = clamped * (this.barWidth - this.padding * 2);
        this.fill
            .clear()
            .roundRect(
                this.padding,
                this.padding,
                width,
                this.barHeight - this.padding * 2,
                (this.barHeight - this.padding * 2) / 2
            )
            .fill(0x30d158);
    }

    public mount(app: Application) {
        this.app = app;
        app.stage.addChild(this);
        app.stage.sortableChildren = true;
        this.zIndex = 9999;

        this.position.set(
            (app.screen.width - this.barWidth) / 2,
            (app.screen.height - this.barHeight) / 2
        );

        // pulse animation
        gsap.to(this.fill, {
            alpha: 0.5,
            duration: 0.25,
            ease: "none",
            yoyo: true,
            repeat: -1
        });
    }

    public unmount() {
        if (this.app) {
            this.app.stage.removeChild(this);
            this.app = undefined;
        }

        gsap.killTweensOf(this.smooth);
        gsap.killTweensOf(this.fill);
        // event off
        signals.off(SCREEN_SIGNALS.ASSETS_LOADED);
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
        if (this.smooth.percent < 100) {
            this.setPercent(100);
        }

        await new Promise<void>((resolve) => {
            gsap.to(this, {
                alpha: 0,
                duration: 0.25,
                ease: "none",
                onComplete: () => {
                    this.unmount();
                    resolve();
                }
            });
        });

        this.resolveCompletion?.();
    }

    public resize(width: number) {
        this.barWidth = width;
        this.track
            .clear()
            .roundRect(0, 0, this.barWidth, this.barHeight, this.barHeight / 2)
            .fill(0x22242a);
        this.percentageLabel.position.set(this.barWidth / 2, this.barHeight / 2);
        this.redrawFill(this.smooth.percent / 100);
    }

    public get progress(): Promise<void> {
        return this.completionPromise;
    }
}