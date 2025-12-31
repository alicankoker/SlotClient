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
    private _lineTextures: Sprite[] = [];
    private _lineChains: Sprite[] = [];

    private constructor() {
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
        for (let index = 0; index < 2; index++) {
            const chain = Sprite.from(`base_line_chain`);
            chain.label = `LineChain_${index}`;
            chain.anchor.set(0.5);
            chain.scale.set(0.5, 0.5);
            chain.position.set(318 + (index * 1285), (this._gameConfig.REFERENCE_RESOLUTION.height / 2));
            this._lineChains.push(chain);
            this.addChild(chain);
        }

        for (const key of Object.keys(this._gameConfig.LINE_NUMBER_POSITION)) {
            const numberContainer: Container = new Container();
            numberContainer.label = `LineNumberContainer_${key}`;
            this.addChild(numberContainer);

            const position = this._gameConfig.LINE_NUMBER_POSITION[Number(key)];

            const texture = Sprite.from(`base_line_holder`);
            texture.label = `LineHolderTexture_${key}`;
            texture.anchor.set(0.5);
            texture.scale.set(0.5, 0.5);
            texture.position.set((this._gameConfig.REFERENCE_RESOLUTION.width / 2) + position.x, (this._gameConfig.REFERENCE_RESOLUTION.height / 2) + position.y);
            texture.interactive = true;
            texture.cursor = 'pointer';
            this._lineTextures.push(texture);
            numberContainer.addChild(texture);

            const text = new Text({
                text: key.toString(),
                style: this._styleConfig.style_1.clone()
            });
            text.anchor.set(0.5, 0.5);
            text.position.set((this._gameConfig.REFERENCE_RESOLUTION.width / 2) + position.x + 1, (this._gameConfig.REFERENCE_RESOLUTION.height / 2) + position.y - 3);
            numberContainer.addChild(text);

            this._numberContainers.push(numberContainer);

            numberContainer.on('pointerenter', () => {
                this.showLine(Number(key));
            });
            numberContainer.on('pointerleave', () => {
                this.hideLine(Number(key));
            });
        }
    }

    public setFreeSpinMode(enabled: boolean): void {
        this._lineTextures.forEach((texture) => {
            const textureName = enabled ? 'freespin_line_holder' : 'base_line_holder';
            texture.texture = Texture.from(textureName);
        });
        this._lineChains.forEach((chain) => {
            const chainTextureName = enabled ? 'freespin_line_chain' : 'base_line_chain';
            chain.texture = Texture.from(chainTextureName);
        });
    }

    protected override onResize(responsiveConfig: ResponsiveConfig): void { }

    public getController(): WinLinesController<WinLines> {
        return this._controller;
    }
}