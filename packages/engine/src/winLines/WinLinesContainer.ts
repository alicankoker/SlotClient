import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { SIGNAL_EVENTS, signals, SignalSubscription } from "../controllers/SignalManager";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export abstract class WinLinesContainer extends Container {
    protected _resizeSubscription?: SignalSubscription;
    protected _lineMask: Sprite = new Sprite(Texture.EMPTY);
    protected _linesContainer: Container[];
    protected _winLine: (Graphics | Spine | Sprite)[];
    protected _availableLines: number = 0;

    protected constructor() {
        super();

        this._linesContainer = [];
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

        if (this._linesContainer.length <= 0) return;

        for (let index = 0; index < this._linesContainer.length; index++) {
            const container = this._linesContainer[index];
            const isActive = index < activeLines;

            container.alpha = isActive ? 1 : 0.25;
            container.interactive = isActive;
            container.cursor = isActive ? "pointer" : "default";
        }
    }

    public showLine(lineNumber: number): void {
        if (lineNumber < 1 || lineNumber > this._availableLines) return;

        const line = this._winLine[lineNumber - 1];
        const container = this._linesContainer[lineNumber - 1];
        if (!line) return;

        if (line instanceof Spine) {
            line.state.clearTrack(0);
            line.state.clearTracks();
            line.state.setAnimation(0, lineNumber.toString(), false);
        }

        setTimeout(() => {
            line.visible = true;
        }, 10);

        if (this._linesContainer.length <= 0) return;

        for (let i = 0; i < this._linesContainer.length; i++) {
            const container = this._linesContainer[i];
            container.alpha = 0.25;
        }

        (container !== undefined) && (container.alpha = 1);
    }

    public showLines(lineNumbers: number[]): void {
        if (this._linesContainer.length > 0) {
            for (let i = 0; i < this._availableLines; i++) {
                this._linesContainer[i].alpha = 0.25;
            }
        }

        for (const lineNumber of lineNumbers) {
            if (lineNumber < 1 || lineNumber > this._availableLines) continue;

            const line = this._winLine[lineNumber - 1];
            const container = this._linesContainer[lineNumber - 1];
            if (!line) continue;

            if (line instanceof Spine) {
                line.state.clearTrack(0);
                line.state.clearTracks();
                line.state.setAnimation(0, lineNumber.toString(), false);
            }

            setTimeout(() => {
                line.visible = true;
            }, 10);

            (container !== undefined) && (container.alpha = 1);
        }
    }

    public showAllLines(): void {
        for (let i = 0; i < this._availableLines; i++) {
            const line = this._winLine[i];
            const container = this._linesContainer[i];
            if (!line) continue;

            setTimeout(() => {
                line.visible = true;
            }, 10);

            (container !== undefined) && (container.alpha = 1);
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

        if (this._linesContainer.length <= 0) return;

        for (let i = 0; i < this._availableLines; i++) {
            this._linesContainer[i].alpha = 1;
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

            (this._linesContainer[i] !== undefined) && (this._linesContainer[i].alpha = 1);
        }

        for (let i = this._availableLines; i < this._winLine.length; i++) {
            this._winLine[i].visible = false;
            (this._linesContainer[i] !== undefined) && (this._linesContainer[i].alpha = 0.25);
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