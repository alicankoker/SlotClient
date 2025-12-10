import { Sprite, Text, Texture } from "pixi.js";
import { ResponsiveConfig } from "@slotclient/engine/utils/ResponsiveManager";
import { WinLinesContainer } from "@slotclient/engine/winLines/WinLinesContainer";
import { WinLinesController } from "@slotclient/engine/winLines/WinLinesController";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameDataManager } from "@slotclient/engine";
import { AssetsConfig } from "../configs/AssetsConfig";
import { GameConfig } from "../configs/GameConfig";
import { StyleConfig } from "../configs/StyleConfig";

export class WinLines extends WinLinesContainer {
    private static _instance: WinLines;
    private _assetConfig: AssetsConfig;
    private _gameConfig: GameConfig;
    private _styleConfig: StyleConfig

    private _controller: WinLinesController<WinLines>;
    private _fixedLineHolder!: Sprite;
    private _fixedValue!: Text;
    private _fixedText!: Text;

    private constructor() {
        super();

        this.position.set(10, 0);

        this._assetConfig = AssetsConfig.getInstance();
        this._gameConfig = GameConfig.getInstance();
        this._styleConfig = StyleConfig.getInstance();

        this._controller = this.createController();

        this.createLineMask();
        this.createLineNumbers();
        this.createWinLines();
        this.setAvailableLines(GameDataManager.getInstance().getMaxLine());
    }

    public static getInstance(): WinLines {
        if (!this._instance) {
            this._instance = new WinLines();
        }
        return this._instance;
    }

    private createController(): WinLinesController<WinLines> {
        return new (class extends WinLinesController<WinLines> { })(this);
    }

    protected override createLineMask(): void {
        this._lineMask = Sprite.from('line_mask');
        this._lineMask.label = 'LineMask';
        this._lineMask.anchor.set(0.5, 0.5);
        this._lineMask.position.set(962, 550);
        this._lineMask.width = 1210;
        this._lineMask.height = 700;
        this._lineMask.alpha = 0;
        this.addChild(this._lineMask);
    }

    protected override createWinLines(): void {
        const { atlas, skeleton } = this._assetConfig.LINE_SPINE_ASSET;

        for (const key of Object.keys(this._gameConfig.LINES)) {
            const line = Spine.from({ atlas, skeleton });
            line.label = `WinLine_${key}`;
            line.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, (this._gameConfig.REFERENCE_RESOLUTION.height / 2) + 15);
            line.visible = false; // Hidden by default
            line.tint = 0x91ff17; // Green tint for win lines
            line.state.setAnimation(0, key, false);
            line.state.timeScale = 2;
            line.mask = this._lineMask;

            this._winLine.push(line);

            this.addChild(line);
        }
    }

    protected override createLineNumbers(): void {
        this._fixedLineHolder = Sprite.from(`base_fixed_lines_holder`);
        this._fixedLineHolder.label = `FixedLineHolder`;
        this._fixedLineHolder.anchor.set(0.5);
        this._fixedLineHolder.scale.set(1.5, 1.5);
        this._fixedLineHolder.position.set(260, 550);
        this.addChild(this._fixedLineHolder);

        this._fixedValue = new Text({
            text: '25',
            style: this._styleConfig.style_1.clone()
        });
        this._fixedValue.style.fontSize = 50;
        this._fixedValue.anchor.set(0.5);
        this._fixedValue.position.set(260, 530);
        this.addChild(this._fixedValue);

        this._fixedText = new Text({
            text: 'LINES',
            style: this._styleConfig.style_1.clone()
        });
        this._fixedText.style.fontSize = 22;
        this._fixedText.anchor.set(0.5);
        this._fixedText.position.set(260, 565);
        this.addChild(this._fixedText);
    }

    public setFreeSpinMode(enabled: boolean): void {
        const holderTextureName = enabled ? 'freespin_fixed_lines_holder' : 'base_fixed_lines_holder';
        this._fixedLineHolder.texture = Texture.from(holderTextureName);
    }

    protected override onResize(responsiveConfig: ResponsiveConfig): void { }

    public getController(): WinLinesController<WinLines> {
        return this._controller;
    }
}