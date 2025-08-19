import { Application, isMobile } from "pixi.js";
import { debug } from "./debug";
import { SCREEN_SIGNALS, signals } from '../controllers/SignalManager';
import { GameConfig } from "../../config/GameConfig";

export interface ResponsiveConfig {
    isMobile: boolean;
    viewportWidth: number;
    viewportHeight: number;
    safeWidth: number;
    safeHeight: number;
    orientation: string;
    scale: number;
}
export class ResponsiveManager {
    private static _instance: ResponsiveManager;
    private _app: Application;
    private _resizeTimeOut: number = 100; // timeout for resize event
    private _resizeTimer: number | undefined;
    private _alignment: string = "center"; // default alignment
    private _boundOnResize: () => void;

    /**
     *
     * @description Singleton instance of ResizeManager.
     * @param app Pixi Application instance
     * @returns {ResponsiveManager} The instance of ResizeManager.
     * @private
     */
    private constructor(app: Application) {
        this._app = app;
        this._boundOnResize = this.onResize.bind(this);
        this.init();
    }

    public static getInstance(app: Application): ResponsiveManager {
        if (!ResponsiveManager._instance) {
            ResponsiveManager._instance = new ResponsiveManager(app);
        }
        return ResponsiveManager._instance;
    }

    private init(): void {
        window.addEventListener("resize", this.debouncedResize.bind(this));
        // resize game
        this.onResize();
    }

    /**
     * @description Delayed resize handler to prevent excessive calls during rapid resize events.
     */
    private debouncedResize(): void {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = window.setTimeout(() => {
            this._boundOnResize();
        }, this._resizeTimeOut);
    }

    /**
     * @description Handle the resize event and adjust the game viewport accordingly.
     */
    public onResize() {
        // viewport width and height
        const viewportWidth: number = window.innerWidth;
        const viewportHeight: number = window.innerHeight;

        // set orientation
        const orientation = viewportWidth >= viewportHeight ? GameConfig.ORIENTATION.landscape : GameConfig.ORIENTATION.portrait;

        // game width and height
        const gameWidth: number = GameConfig.REFERENCE_RESOLUTION.width * this._app.renderer.resolution;
        const gameHeight: number = GameConfig.REFERENCE_RESOLUTION.height * this._app.renderer.resolution;

        // safe width and height
        const safeWidth: number = (orientation == GameConfig.ORIENTATION.landscape ? GameConfig.SAFE_AREA.landscape.width : GameConfig.SAFE_AREA.portrait.width) * this._app.renderer.resolution;
        const safeHeight: number = (orientation == GameConfig.ORIENTATION.landscape ? GameConfig.SAFE_AREA.landscape.height : GameConfig.SAFE_AREA.portrait.height) * this._app.renderer.resolution;

        // new width and height
        let calculatedWidth: number;
        let calculatedHeight: number;
        if (gameHeight / gameWidth > viewportHeight / viewportWidth) {
            if (safeHeight / gameWidth > viewportHeight / viewportWidth) {
                calculatedHeight = (viewportHeight * gameHeight) / safeHeight;
                calculatedWidth = (calculatedHeight * gameWidth) / gameHeight;
            } else {
                calculatedWidth = viewportWidth;
                calculatedHeight = (calculatedWidth * gameHeight) / gameWidth;
            }
        } else {
            if (gameHeight / safeWidth > viewportHeight / viewportWidth) {
                calculatedHeight = viewportHeight;
                calculatedWidth = (calculatedHeight * gameWidth) / gameHeight;
            } else {
                calculatedWidth = (viewportWidth * gameWidth) / safeWidth;
                calculatedHeight = (calculatedWidth * gameHeight) / gameWidth;
            }
        }

        // aligns screen with padding
        const padding = this.resolveAlignment({ width: viewportWidth, height: viewportHeight }, { width: calculatedWidth, height: calculatedHeight });

        // set viewport scale
        const scale: number = Math.round((orientation == GameConfig.ORIENTATION.landscape ? calculatedHeight / gameHeight : calculatedWidth / gameWidth) * this._app.renderer.resolution * 10000) / 10000;
        this._app.stage.scale.set(scale);

        // set game new size
        this._app.renderer.resize(viewportWidth, viewportHeight);
        this._app.stage.position.set(padding.x, padding.y);

        // send the payload:
        // isMobile, viewportWidth, viewportHeight, orientation, scale
        const responsiveConfig: ResponsiveConfig = {
            isMobile: isMobile.phone || isMobile.tablet,
            viewportWidth: viewportWidth,
            viewportHeight: viewportHeight,
            safeWidth: safeWidth,
            safeHeight: safeHeight,
            orientation: orientation,
            scale: scale
        };

        debug.log("ResizeManager", "Viewport resized: isMobile:", responsiveConfig.isMobile, "viewportWidth:", responsiveConfig.viewportWidth, "viewportHeight:", responsiveConfig.viewportHeight, "orientation:", responsiveConfig.orientation, "scale:", responsiveConfig.scale);
        signals.emit(SCREEN_SIGNALS.SCREEN_RESIZE, responsiveConfig);
    }

    /**
     * @description Get the current viewport width.
     * @returns {number} The viewport width.
     */
    private resolveAlignment(viewport: { width: number; height: number }, calculated: { width: number; height: number }): { x: number; y: number } {
        let left, top;
        switch (this._alignment) {
            case "topleft":
                left = 0;
                top = 0;
                break;
            case "bottomleft":
                left = 0;
                top = Math.round(viewport.height - calculated.height);
                break;
            case "center":
                left = Math.round((viewport.width - calculated.width) / 2);
                top = Math.round((viewport.height - calculated.height) / 2);
                break;
            case "topright":
                left = Math.round(viewport.width - calculated.width);
                top = 0;
                break;
            case "bottomright":
                left = Math.round(viewport.width - calculated.width);
                top = Math.round(viewport.height - calculated.height);
                break;
        }

        return { x: left!, y: top! };
    }

    public destroy(): void {
        clearTimeout(this._resizeTimeOut);
        window.removeEventListener("resize", this._boundOnResize);
    }
}