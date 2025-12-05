import { Container, Application } from 'pixi.js';
import { SpinContainer } from './SpinContainer';
import { StaticContainer } from './StaticContainer';
import { signals, SIGNAL_EVENTS, SignalSubscription } from '../controllers/SignalManager';
import { IReelMode } from './ReelController';
import { ResponsiveConfig } from '../utils/ResponsiveManager';
import { SpinMode } from '../types/ISpinConfig';
import { ConfigProvider, IGameConfig } from '@slotclient/config';

export abstract class BaseReelsContainer extends Container {
    protected app: Application;
    protected resizeSubscription?: SignalSubscription;
    protected gameConfig: IGameConfig;

    protected spinContainer?: SpinContainer;
    protected staticContainer?: StaticContainer;

    protected _spinMode: SpinMode;

    constructor(app: Application) {
        super();
        this.app = app;
        this.gameConfig = ConfigProvider.getInstance().getGameConfig();
        this._spinMode = this.gameConfig.SPIN_MODES.NORMAL as SpinMode;
    }

    // ABSTRACT METHODS - Oyunlar implement ETMEK ZORUNDA
    protected abstract createReelAreaMask(): void;
    protected abstract createFrameElements(): void;
    protected onResize(responsiveConfig: ResponsiveConfig): void {
        // Default empty - oyunlar override edebilir
    }

    // OPTIONAL METHODS - Oyunlar override edebilir
    protected setupEventListeners(): void {
        // Default empty - oyunlar override edebilir
    }

    // COMMON METHODS - Tüm oyunlar kullanır
    protected setupResizeHandler(): void {
        this.resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    public setMode(mode: IReelMode): void {
        if (this.spinContainer) {
            this.spinContainer.setMode(mode);
            this.spinContainer.visible = mode !== IReelMode.STATIC;
        }
        if (this.staticContainer) {
            this.staticContainer.visible = mode === IReelMode.STATIC;
        }
    }

    // PUBLIC API - Tüm oyunlar kullanır
    public getSpinContainer(): SpinContainer | undefined {
        return this.spinContainer;
    }

    public setSpinContainer(container: Container): void {
        this.spinContainer = container as SpinContainer;
        this.addChild(container);
    }

    public getStaticContainer(): StaticContainer | undefined {
        return this.staticContainer;
    }

    public setStaticContainer(container: Container): void {
        this.staticContainer = container as StaticContainer;
        this.addChild(container);
    }

    public getSpinMode(): SpinMode {
        return this._spinMode;
    }

    public setSpinMode(value: SpinMode): void {
        this._spinMode = value;
    }

    public destroy(): void {
        if (this.resizeSubscription) {
            this.resizeSubscription.unsubscribe();
        }

        super.destroy();
    }
}