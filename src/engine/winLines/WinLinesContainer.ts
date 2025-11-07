import { Container, Graphics, Sprite } from "pixi.js";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { SIGNAL_EVENTS, signals, SignalSubscription } from "../controllers/SignalManager";

export abstract class WinLinesContainer extends Container {
    protected _resizeSubscription?: SignalSubscription;
    protected _lineTextures: Sprite[];
    protected _winLine: Graphics[];

    protected constructor() {
        super();

        this._lineTextures = [];
        this._winLine = [];

        this.createLineNumbers();
        this.createWinLines();

        this._resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    protected abstract createWinLines(): void;

    protected abstract createLineNumbers(): void;

    public showLine(lineNumber: number): void {
        if (lineNumber < 1 || lineNumber > this._winLine.length) return;
        
        const line = this._winLine[lineNumber - 1];
        const texture = this._lineTextures[lineNumber - 1];
        
        if (line && texture) {
            line.visible = true;

            for (const t of this._lineTextures) {
                t.alpha = (t === texture) ? 1 : 0.25;
            }
        }
    }

    public showLines(lineNumbers: number[]): void {
        for (const t of this._lineTextures) {
            t.alpha = 0.25;
        }

        for (const lineNumber of lineNumbers) {
            if (lineNumber < 1 || lineNumber > this._winLine.length) continue;

            const line = this._winLine[lineNumber - 1];
            const texture = this._lineTextures[lineNumber - 1];

            if (line && texture) {
                line.visible = true;
                texture.alpha = 1;
            }
        }
    }

    public showAllLines(): void {
        this._winLine.forEach(line => line.visible = true);

        for (const t of this._lineTextures) {
            t.alpha = 1;
        }
    }

    public hideLine(lineNumber: number): void {
        const line = this._winLine[lineNumber - 1];

        if (line) {
            line.visible = false;
            for (const t of this._lineTextures) {
                t.alpha = 1;
            }
        }
    }

    public hideAllLines(): void {
        this._winLine.forEach(line => line.visible = false);

        for (const t of this._lineTextures) {
            t.alpha = 1;
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