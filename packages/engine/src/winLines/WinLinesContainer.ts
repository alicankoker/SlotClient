import { AnimatedSprite, Container, Graphics, Sprite, Texture } from "pixi.js";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { SIGNAL_EVENTS, signals, SignalSubscription } from "../controllers/SignalManager";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { gsap } from "gsap";

export abstract class WinLinesContainer extends Container {
    protected _resizeSubscription?: SignalSubscription;
    protected _lineMask: Sprite = new Sprite(Texture.EMPTY);
    protected _numberContainers: Container[];
    protected _winLines: (Graphics | Spine | Sprite | AnimatedSprite)[];
    protected _staticLines: Sprite[];
    protected _availableLines: number = 0;

    protected constructor() {
        super();

        this._numberContainers = [];
        this._winLines = [];
        this._staticLines = [];

        this._resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    protected abstract createLineMask(): void;

    protected abstract createWinLines(): void;

    protected abstract createLineNumbers(): void;

    public setAvailableLines(activeLines: number): void {
        this._availableLines = activeLines;

        if (this._numberContainers.length <= 0) return;

        for (let index = 0; index < this._numberContainers.length; index++) {
            const container = this._numberContainers[index];
            const isActive = index < activeLines;

            container.alpha = isActive ? 1 : 0.25;
            container.interactive = isActive;
            container.cursor = isActive ? "pointer" : "default";
        }
    }

    public showLine(lineNumber: number): void {
        if (lineNumber < 1 || lineNumber > this._availableLines) return;

        const line = this._winLines[lineNumber - 1];
        const staticLine = this._staticLines[lineNumber - 1];
        const container = this._numberContainers[lineNumber - 1];
        if (!line) return;

        if (line instanceof Spine) {
            line.state.clearTrack(0);
            line.state.clearTracks();
            line.state.setAnimation(0, lineNumber.toString(), false);
        } else if (line instanceof AnimatedSprite) {
            line.alpha = 1;
            line.visible = true;
            line.gotoAndPlay(0);
            line.onFrameChange = () => {
                if (line.currentFrame === line.totalFrames - 6) {
                    gsap.to(line, { alpha: 0, duration: 0.1, ease: "none" });
                    gsap.to(staticLine, { alpha: 1, duration: 0.1, ease: "none" });
                    staticLine.visible = true;
                }
            };
        } else if (line instanceof Sprite) {
            // Handle Sprite type if needed
        } else if (line instanceof Graphics) {
            // Handle Graphics type if needed
        }

        if (this._numberContainers.length <= 0) return;

        for (let i = 0; i < this._numberContainers.length; i++) {
            const container = this._numberContainers[i];
            container.alpha = 0.25;
        }

        (container !== undefined) && (container.alpha = 1);
    }

    public showLines(lineNumbers: number[]): void {
        if (this._numberContainers.length > 0) {
            for (let i = 0; i < this._availableLines; i++) {
                this._numberContainers[i].alpha = 0.25;
            }
        }

        for (const lineNumber of lineNumbers) {
            if (lineNumber < 1 || lineNumber > this._availableLines) continue;

            const line = this._winLines[lineNumber - 1];
            const staticLine = this._staticLines[lineNumber - 1];
            const container = this._numberContainers[lineNumber - 1];
            if (!line) continue;

            if (line instanceof Spine) {
                line.state.clearTrack(0);
                line.state.clearTracks();
                line.state.setAnimation(0, lineNumber.toString(), false);
            } else if (line instanceof AnimatedSprite) {
                line.alpha = 1;
                line.visible = true;
                line.gotoAndPlay(0);
                line.onFrameChange = () => {
                    if (line.currentFrame === line.totalFrames - 6) {
                        gsap.to(line, { alpha: 0, duration: 0.1, ease: "none" });
                        gsap.to(staticLine, { alpha: 1, duration: 0.1, ease: "none" });
                        staticLine.visible = true;
                    }
                };
            } else if (line instanceof Sprite) {
                // Handle Sprite type if needed
            } else if (line instanceof Graphics) {
                // Handle Graphics type if needed
            }

            (container !== undefined) && (container.alpha = 1);
        }
    }

    public showAllLines(): void {
        for (let i = 0; i < this._availableLines; i++) {
            const line = this._winLines[i];
            const staticLine = this._staticLines[i];
            const container = this._numberContainers[i];
            if (!line) continue;

            if (line instanceof Spine) {
                line.state.clearTrack(0);
                line.state.clearTracks();
                line.state.setAnimation(0, (i + 1).toString(), false);
            } else if (line instanceof AnimatedSprite) {
                line.alpha = 1;
                line.visible = true;
                line.gotoAndPlay(0);
                line.onFrameChange = () => {
                    if (line.currentFrame === line.totalFrames - 6) {
                        gsap.to(line, { alpha: 0, duration: 0.1, ease: "none" });
                        gsap.to(staticLine, { alpha: 1, duration: 0.1, ease: "none" });
                        staticLine.visible = true;
                    }
                };
            } else if (line instanceof Sprite) {
                // Handle Sprite type if needed
            } else if (line instanceof Graphics) {
                // Handle Graphics type if needed
            }

            (container !== undefined) && (container.alpha = 1);
        }
    }

    public hideLine(lineNumber: number): void {
        if (lineNumber < 1 || lineNumber > this._winLines.length) return;

        const line = this._winLines[lineNumber - 1];
        const staticLine = this._staticLines[lineNumber - 1];

        if (line instanceof Spine) {
            line.state.clearTrack(0);
            line.state.clearTracks();
        } else if (line instanceof AnimatedSprite) {
            line.gotoAndStop(0);
        } else if (line instanceof Sprite) {
            // Handle Sprite type if needed
        } else if (line instanceof Graphics) {
            // Handle Graphics type if needed
        }

        if (this._numberContainers.length <= 0) return;

        for (let i = 0; i < this._availableLines; i++) {
            this._numberContainers[i].alpha = 1;
        }

        setTimeout(() => {
            line.visible = false;
            staticLine.visible = false;
        }, 10);
    }

    public hideAllLines(): void {
        for (let i = 0; i < this._winLines.length; i++) {
            const line = this._winLines[i];
            const staticLine = this._staticLines[i];

            if (line instanceof Spine) {
                line.state.clearTrack(0);
                line.state.clearTracks();
            } else if (line instanceof AnimatedSprite) {
                line.gotoAndStop(0);
            } else if (line instanceof Sprite) {
                // Handle Sprite type if needed
            } else if (line instanceof Graphics) {
                // Handle Graphics type if needed
            }

            (this._numberContainers[i] !== undefined) && (this._numberContainers[i].alpha = 1);

            setTimeout(() => {
                line.visible = false;
                staticLine.visible = false;
            }, 10);
        }

        for (let i = this._availableLines; i < this._winLines.length; i++) {
            this._winLines[i].visible = false;
            (this._numberContainers[i] !== undefined) && (this._numberContainers[i].alpha = 0.25);
        }
    }

    /**
     * @description Handle resize events
     * @param config Responsive configuration such as orientation, dimensions, etc.
     */
    protected onResize(responsiveConfig: ResponsiveConfig): void { }

    /**
     * @description Clean up resources
     * @param options Destruction options from PIXI.Container
     */
    public override destroy(options?: boolean | { children?: boolean; texture?: boolean; baseTexture?: boolean; }): void {
        this._resizeSubscription?.unsubscribe();
        this._resizeSubscription = undefined;

        super.destroy(options);
    }
}