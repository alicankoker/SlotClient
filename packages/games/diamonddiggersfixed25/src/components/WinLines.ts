import { Container, Sprite, Text, Texture } from "pixi.js";
import { ResponsiveConfig } from "@slotclient/engine/utils/ResponsiveManager";
import { WinLinesContainer } from "@slotclient/engine/winLines/WinLinesContainer";
import { WinLinesController } from "@slotclient/engine/winLines/WinLinesController";
import { GameDataManager } from "@slotclient/engine";
import { AnimatedSpriteFactory } from "@slotclient/engine/utils/AnimatedSpriteFactory";
import { AssetsConfig } from "../configs/AssetsConfig";
import { GameConfig } from "../configs/GameConfig";
import { StyleConfig } from "../configs/StyleConfig";

export class WinLines extends WinLinesContainer {
    private static _instance: WinLines;
    private _assetConfig: AssetsConfig;
    private _gameConfig: GameConfig;
    private _styleConfig: StyleConfig;

    private _controller: WinLinesController<WinLines>;

    private _linesContainer!: Container;
    private _lineChain!: Sprite;
    private _fixedLineHolder!: Sprite;
    private _fixedValue!: Text;
    private _fixedText!: Text;

    protected constructor() {
        super();

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
        this._linesContainer = new Container();
        this._linesContainer.label = 'WinLinesContainer';
        this._linesContainer.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, this._gameConfig.REFERENCE_RESOLUTION.height / 2);
        this._linesContainer.mask = this._lineMask;
        this.addChild(this._linesContainer);

        for (const key of Object.keys(this._gameConfig.LINES)) {
            const lineConfig = this._gameConfig.WIN_LINES_CONFIG[Number(key)];

            const line = AnimatedSpriteFactory.create(
                {
                    alias: 'lines',
                    folder: key.toString(),
                    start: 0,
                    end: 14,
                    animationSpeed: 0.25,
                    loop: false
                },
                {
                    label: `WinLine_${key}`,
                    anchor: { x: 0.5, y: 0.5 },
                    scale: { x: 2, y: (2 * lineConfig.rotation) },
                    position: { x: lineConfig.position.x, y: lineConfig.position.y },
                    visible: false,
                    tint: 0xffc90f,
                    interactive: false
                }
            );

            const staticLine = Sprite.from(`${key}/idle`);
            staticLine.label = `StaticWinLine_${key}`;
            staticLine.anchor.set(0.5, 0.5);
            staticLine.scale.set(1, (1 * lineConfig.rotation));
            staticLine.position.set(lineConfig.position.x, lineConfig.position.y);
            staticLine.visible = false;
            staticLine.tint = 0xffc90f;

            this._winLines.push(line);
            this._staticLines.push(staticLine);

            this._linesContainer.addChild(line);
            this._linesContainer.addChild(staticLine);
        }
    }

    protected override createLineNumbers(): void {
        this._lineChain = Sprite.from(`base_line_chain`);
        this._lineChain.label = `LineChain`;
        this._lineChain.anchor.set(0.5);
        this._lineChain.scale.set(0.5, 0.5);
        this._lineChain.position.set(325, (this._gameConfig.REFERENCE_RESOLUTION.height / 2));
        this.addChild(this._lineChain);

        this._fixedLineHolder = Sprite.from(`base_fixed_lines_holder`);
        this._fixedLineHolder.label = `FixedLineHolder`;
        this._fixedLineHolder.anchor.set(0.5);
        this._fixedLineHolder.scale.set(0.5, 0.5);
        this._fixedLineHolder.position.set(325, 555);
        this.addChild(this._fixedLineHolder);

        this._fixedValue = new Text({
            text: '25',
            style: this._styleConfig.style_1.clone()
        });
        this._fixedValue.style.fontSize = 50;
        this._fixedValue.anchor.set(0.5);
        this._fixedValue.position.set(325, 530);
        this.addChild(this._fixedValue);

        this._fixedText = new Text({
            text: 'LINES',
            style: this._styleConfig.style_1.clone()
        });
        this._fixedText.style.fontSize = 22;
        this._fixedText.anchor.set(0.5);
        this._fixedText.position.set(325, 565);
        this.addChild(this._fixedText);
    }

    public setFreeSpinMode(enabled: boolean): void {
        const chainTextureName = enabled ? 'freespin_line_chain' : 'base_line_chain';
        this._lineChain.texture = Texture.from(chainTextureName);

        const holderTextureName = enabled ? 'freespin_fixed_lines_holder' : 'base_fixed_lines_holder';
        this._fixedLineHolder.texture = Texture.from(holderTextureName);
    }

    protected override onResize(responsiveConfig: ResponsiveConfig): void { }

    public getController(): WinLinesController<WinLines> {
        return this._controller;
    }
}