import { SkeletonData, Spine } from '@esotericsoftware/spine-pixi-v8';
import { AssetsConfig } from '../../config/AssetsConfig';
import { debug } from '../utils/debug';

export interface SymbolConfig {
    symbolId: number;           // Symbol index (0-9) - provided by server/game logic
    position: {
        x: number;              // Relative X position
        y: number;              // Relative Y position
    };
    scale?: number;             // Optional override scale
}

export class SpineSymbol extends Spine {
    private _symbolId: number;
    private _prefix: string;
    private _skeletonData: SkeletonData;
    private config: SymbolConfig;

    constructor(config: SymbolConfig) {
        debug.log(`Symbol: Creating symbol with ID ${config.symbolId}, position:`, config.position);
        
        const { atlas, skeleton } = AssetsConfig.SYMBOL_SPINE_ASSET;

        const spine = Spine.from({ atlas, skeleton });
        const spineData = spine.state.data.skeletonData;

        super(spineData);

        this._skeletonData = this.state.data.skeletonData;

        this._prefix = AssetsConfig.SYMBOL_ASSET_DATA[config.symbolId]?.prefix || 'Symbol1';

        this.position.set(config.position.x, config.position.y);
        this.scale.set(config.scale || 1);

        this.skeleton.setSlotsToSetupPose();

        this.state.data.defaultMix = 0.05;

        this.label = `Symbol_${config.symbolId}`;

        this.setIdle();

        this._symbolId = config.symbolId;
        this.config = config;

        debug.log(`Symbol: Initialized symbol at:`, this.position.x, this.position.y, 'scale:', this.scale.x, 'visible:', this.visible);
    }

    // Getter for symbolId (for backward compatibility)
    public get symbolId(): number {
        return this._symbolId;
    }

    /**
     * @description Sets the symbol to its idle state.
     * @returns void
     */
    public setIdle(): void {
        this.state.setAnimation(0, `${this._prefix}_idle`, false);
    }

    /**
     * @description Sets the symbol to its landing state.
     * @param onComplete - Callback function to call when the animation completes.
     * @returns void
     */
    public setLanding(onComplete?: () => void): Promise<void> {
        this.skeleton.setSlotsToSetupPose();
        this.state.clearTrack(0);
        const track = this.state.setAnimation(0, `${this._prefix}_landing`, false);
        if (track) track.timeScale = 1;

        return new Promise<void>((resolve) => {
            const listener = {
                complete: (entry: any) => {
                    if (entry.animation.name === `${this._prefix}_landing`) {
                        // first call the callback if it exists
                        if (onComplete) onComplete();

                        // then resolve the Promise
                        resolve();

                        // listener cleanup
                        this.state.removeListener(listener);
                    }
                }
            };
            this.state.addListener(listener);
        });
    }

    /**
     * @description Sets the symbol to its win animation state.
     * @param loop - Whether the animation should loop.
     * @param onComplete - Callback function to call when the animation completes.
     * @returns Promise that resolves when the animation completes.
     */
    public setWinAnimation(loop: boolean = false, onComplete?: () => void): Promise<void> {
        const animationName = `${this._prefix}_win`;

        this.state.clearTrack(0);
        const track = this.state.setAnimation(0, animationName, loop);
        if (track) track.timeScale = 1;

        const duration = this._skeletonData.findAnimation(animationName)?.duration ?? 1.0;

        return new Promise<void>((resolve) => {
            let resolved = false;

            const listener = {
                complete: (entry: any) => {
                    if (entry.animation.name === animationName) {
                        resolved = true;

                        // first call the callback if it exists
                        if (onComplete) onComplete();

                        // then resolve the Promise
                        resolve();

                        // listener cleanup
                        this.state.removeListener(listener);
                    }
                }
            };
            this.state.addListener(listener);

            setTimeout(() => {
                if (!resolved) {
                    debug.warn(`Win animation "${animationName}" timeout after ${duration}s, forcing resolve`);
                    resolved = true;
                    resolve();
                    this.state.removeListener(listener);
                }
            }, (duration * 1000) + 50);
        });
    }

    /**
     * @description Sets the symbol to a blackout (dark gray tint) state.
     * @returns void
     */
    public setBlackout(): void {
        this.tint = 0x555555;
    }

    /**
     * @description Clears the blackout tint, restoring the symbol's original colors.
     * @returns void
     */
    public clearBlackout(): void {
        this.tint = 0xFFFFFF;
    }

    /**
     * @description Sets the symbol to its ID and prefix. After setting the ID and prefix, the symbol is set to its landing state.
     * @returns void
     */
    public async setSymbol(symbolId: number): Promise<void> {
        this._symbolId = symbolId;
        this._prefix = AssetsConfig.SYMBOL_ASSET_DATA[symbolId]?.prefix || 'Symbol_1';
        this.state.data.defaultMix = 0.05;
        this.label = `Symbol_${symbolId}`;
        await this.setLanding();
    }
}