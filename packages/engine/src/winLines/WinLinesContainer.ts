import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { SIGNAL_EVENTS, signals, SignalSubscription } from "../controllers/SignalManager";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export abstract class WinLinesContainer extends Container {
    protected _resizeSubscription?: SignalSubscription;
    protected _lineMask: Sprite = new Sprite(Texture.EMPTY);
    protected _lineTextures: Sprite[];
    protected _winLine: (Graphics | Spine | Sprite)[];
    protected _availableLines: number = 0;

    protected constructor() {
        super();

        this._lineTextures = [];
        this._winLine = [];

        this._resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    protected abstract createLineMask(): void;

    protected abstract createWinLines(): void;

    protected abstract createLineNumbers(): void;

    public setAvailableLines(activeLines: number): void {
        this._availableLines = activeLines;

        for (let index = 0; index < this._lineTextures.length; index++) {
            const texture = this._lineTextures[index];
            const isActive = index < activeLines;

            texture.alpha = isActive ? 1 : 0.25;
            texture.interactive = isActive;
            texture.cursor = isActive ? "pointer" : "default";
        }
    }

    public showLine(lineNumber: number): void {
        if (lineNumber < 1 || lineNumber > this._availableLines) return;

        const line = this._winLine[lineNumber - 1];
        const texture = this._lineTextures[lineNumber - 1];
        if (!line || !texture) return;

        if (line instanceof Spine) {
            line.state.clearTrack(0);
            line.state.clearTracks();
            line.state.setAnimation(0, lineNumber.toString(), false);
        }

        setTimeout(() => {
            line.visible = true;
        }, 10);

        for (let i = 0; i < this._lineTextures.length; i++) {
            const t = this._lineTextures[i];
            t.alpha = i < this._availableLines ? (t === texture ? 1 : 0.25) : 0.25;
        }
    }

    public showLines(lineNumbers: number[]): void {
        for (let i = 0; i < this._availableLines; i++) {
            this._lineTextures[i].alpha = 0.25;
        }

        for (const lineNumber of lineNumbers) {
            if (lineNumber < 1 || lineNumber > this._availableLines) continue;

            const line = this._winLine[lineNumber - 1];
            const texture = this._lineTextures[lineNumber - 1];
            if (!line || !texture) continue;

            if (line instanceof Spine) {
                line.state.clearTrack(0);
                line.state.clearTracks();
                line.state.setAnimation(0, lineNumber.toString(), false);
            }

            setTimeout(() => {
                line.visible = true;
            }, 10);

            texture.alpha = 1;
        }
    }

    public showAllLines(): void {
        for (let i = 0; i < this._availableLines; i++) {
            const line = this._winLine[i];
            const texture = this._lineTextures[i];
            if (!line || !texture) continue;

            setTimeout(() => {
                line.visible = true;
            }, 10);

            texture.alpha = 1;
        }
    }

    public hideLine(lineNumber: number): void {
        if (lineNumber < 1 || lineNumber > this._availableLines) return;

        const line = this._winLine[lineNumber - 1];
        if (line) line.visible = false;

        if (line instanceof Spine) {
            line.state.clearTrack(0);
            line.state.clearTracks();
        }

        for (let i = 0; i < this._availableLines; i++) {
            this._lineTextures[i].alpha = 1;
        }
    }

    public hideAllLines(): void {
        for (let i = 0; i < this._availableLines; i++) {
            const line = this._winLine[i];
            if (line) line.visible = false;
            if (line instanceof Spine) {
                line.state.clearTrack(0);
                line.state.clearTracks();
            }
            this._lineTextures[i].alpha = 1;
        }

        for (let i = this._availableLines; i < this._winLine.length; i++) {
            this._winLine[i].visible = false;
            this._lineTextures[i].alpha = 0.25;
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