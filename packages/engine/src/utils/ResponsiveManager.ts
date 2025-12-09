import { Application, isMobile } from "pixi.js";
import { debug } from "./debug";
import { SIGNAL_EVENTS, signals } from '../controllers/SignalManager';
import { ConfigProvider, IGameConfig } from "@slotclient/config";

export interface ResponsiveConfig {
    isMobile: boolean;
    deviceType: DeviceType;
    viewportWidth: number;
    viewportHeight: number;
    safeWidth: number;
    safeHeight: number;
    orientation: string;
    scale: number;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export type Alignment = "topleft" | "bottomleft" | "bottomright" | "topright" | "center";

export class ResponsiveManager {
    private static _instance: ResponsiveManager;
    private _app: Application;
    private _gameConfig: IGameConfig;
    private _resizeTimeOut: number = 100; // timeout for resize event
    private _resizeTimer: number | undefined;
    private _alignment: Alignment = "center"; // default alignment
    private _orientation: string; // default orientation
    private _boundOnResize: () => void;

    /**
     *
     * @description Singleton instance of ResponsiveManager.
     * @param app Pixi Application instance
     * @returns {ResponsiveManager} The instance of ResponsiveManager.
     * @private
     */
    private constructor(app: Application) {
        this._app = app;
        this._gameConfig = ConfigProvider.getInstance().getGameConfig();
        this._orientation = this._gameConfig.ORIENTATION.landscape;
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
        this._orientation = viewportWidth >= viewportHeight ? this._gameConfig.ORIENTATION.landscape : this._gameConfig.ORIENTATION.portrait;

        // reference width/height
        const refWidth: number = this._gameConfig.REFERENCE_RESOLUTION.width;
        const refHeight: number = this._gameConfig.REFERENCE_RESOLUTION.height;

        // safe width/height
        const safeWidth: number = this._orientation === this._gameConfig.ORIENTATION.landscape ? this._gameConfig.SAFE_AREA.landscape.width : this._gameConfig.SAFE_AREA.portrait.width;
        const safeHeight: number = this._orientation === this._gameConfig.ORIENTATION.landscape ? this._gameConfig.SAFE_AREA.landscape.height : this._gameConfig.SAFE_AREA.portrait.height;
        // effective width/height (clamped between reference and safe area)
        const effectiveWidth = Math.min(Math.max(viewportWidth, Math.max(refWidth, safeWidth)), safeWidth);
        const effectiveHeight = Math.min(Math.max(viewportHeight, Math.max(refHeight, safeHeight)), safeHeight);

        // calculated width/height
        let calculatedWidth: number;
        let calculatedHeight: number;

        if (effectiveHeight / effectiveWidth > viewportHeight / viewportWidth) {
            calculatedHeight = viewportHeight;
            calculatedWidth = (calculatedHeight * effectiveWidth) / effectiveHeight;
        } else {
            calculatedWidth = viewportWidth;
            calculatedHeight = (calculatedWidth * effectiveHeight) / effectiveWidth;
        }

        // scale
        const scale: number = Math.round((this._orientation === this._gameConfig.ORIENTATION.landscape ? calculatedHeight / effectiveHeight : calculatedWidth / effectiveWidth) * 10000) / 10000;

        this._app.stage.scale.set(scale);

        // final stage width/height (reference size scaled)
        const stageWidth = refWidth * scale;
        const stageHeight = refHeight * scale * 1.025;

        // alignment
        const padding = this.resolveAlignment({ width: viewportWidth, height: viewportHeight }, { width: stageWidth, height: stageHeight });

        // resize + position
        this._app.renderer.resize(viewportWidth, viewportHeight);
        this._app.stage.position.set(padding.x, padding.y);

        const deviceType: DeviceType = this.detectDeviceType();

        // send the payload:
        // isMobile, viewportWidth, viewportHeight, orientation, scale
        const responsiveConfig: ResponsiveConfig = {
            isMobile: deviceType === 'mobile' || deviceType === 'tablet',
            deviceType: deviceType,
            viewportWidth: viewportWidth,
            viewportHeight: viewportHeight,
            safeWidth: safeWidth,
            safeHeight: safeHeight,
            orientation: this._orientation,
            scale: scale
        };

        debug.log("ResponsiveManager", "Viewport resized: isMobile:", responsiveConfig.isMobile, "viewportWidth:", responsiveConfig.viewportWidth, "viewportHeight:", responsiveConfig.viewportHeight, "orientation:", responsiveConfig.orientation, "scale:", responsiveConfig.scale);
        signals.emit(SIGNAL_EVENTS.SCREEN_RESIZE, responsiveConfig);
    }

    /**
     * @description Resolve alignment based on the specified alignment setting.
     * @param viewport The current viewport dimensions.
     * @param calculated The calculated stage dimensions.
     * @returns {number} The x and y coordinates for the stage position.
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

        return { x: left, y: top };
    }

    private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
        const ua = navigator.userAgent.toLowerCase();
        if (/ipad|tablet|android(?!.*mobile)/.test(ua) || ('ontouchend' in document && navigator.userAgent.includes('Mac'))) return 'tablet';
        if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(ua)) return 'mobile';
        return 'desktop';
    }

    public getOrientation(): string {
        return this._orientation;
    }

    public destroy(): void {
        clearTimeout(this._resizeTimeOut);
        window.removeEventListener("resize", this._boundOnResize);
    }
}