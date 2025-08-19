import { AtlasAttachmentLoader, SkeletonJson, Spine } from '@esotericsoftware/spine-pixi-v8';
import { AssetsConfig } from '../../config/AssetsConfig';
import { debug } from '../utils/debug';

export interface SymbolConfig {
    symbolId: number;           // Symbol index (0-9) - provided by server/game logic
    position: {
        x: number;              // Relative X position (0-1)
        y: number;              // Relative Y position (0-1)
    };
    scale?: number;             // Optional override scale
}

export class SpineSymbol extends Spine {
    private _symbolId: number;
    private config: SymbolConfig;

    constructor(config: SymbolConfig) {
        debug.log(`Symbol: Creating symbol with ID ${config.symbolId}, position:`, config.position);

        // Get the texture for this symbol
        const { atlasData, skeletonData } = AssetsConfig.getSpineSymbolAssetName();
        const prefix = AssetsConfig.SYMBOL_ASSET_DATA[config.symbolId]?.prefix || 'Symbol1';

        if (!atlasData || !skeletonData) {
            throw new Error(`Texture not found for symbol ID: ${config.symbolId}`);
        }

        const attachmentLoader = new AtlasAttachmentLoader(atlasData as any);
        const json = new SkeletonJson(attachmentLoader);
        const skeleton = json.readSkeletonData(skeletonData);

        super(skeleton);

        this.position.set(config.position.x, config.position.y);
        this.scale.set(config.scale || 1);

        this.skeleton.setSlotsToSetupPose();

        this.state.data.defaultMix = 0.5;

        this.state.setAnimation(0, `${prefix}_Landing`, false);
        // this.state.addAnimation(0, `${prefix}_Win`, false, 2);

        this._symbolId = config.symbolId;
        this.config = config;

        debug.log(`Symbol: Initialized symbol at:`, this.x, this.y, 'scale:', this.scale.x, 'visible:', this.visible);
    }

    // Getter for symbolId (for backward compatibility)
    public get symbolId(): number {
        return this._symbolId;
    }

    public setSymbol(symbolId: number): void {
        this._symbolId = symbolId;
        const prefix = AssetsConfig.SYMBOL_ASSET_DATA[symbolId]?.prefix || 'Symbol1';
        this.state.setAnimation(this.state.tracks.length - 1, `${prefix}_Landing`, false);
    }

    public updatePosition(position: { x: number, y: number }): void {
        this.config.position = position;

        // Update position directly - simple pixel coordinates
        this.x = position.x;
        this.y = position.y;
    }
}