import { Container, Sprite, Text } from "pixi.js";
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
        this._lineMask.scale.set(0.95, 1);
        this._lineMask.position.set(957, 550);
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
                    tint: 0x91ff17,
                    interactive: false
                }
            );

            const staticLine = Sprite.from(`${key}/idle`);
            staticLine.label = `StaticWinLine_${key}`;
            staticLine.anchor.set(0.5, 0.5);
            staticLine.scale.set(1, (1 * lineConfig.rotation));
            staticLine.position.set(lineConfig.position.x, lineConfig.position.y);
            staticLine.visible = false;
            staticLine.tint = 0x91ff17;

            this._winLines.push(line);
            this._staticLines.push(staticLine);

            this._linesContainer.addChild(line);
            this._linesContainer.addChild(staticLine);
        }
    }

    protected override createLineNumbers(): void {
        for (const key of Object.keys(this._gameConfig.LINE_NUMBER_POSITION)) {
            const numberContainer: Container = new Container();
            numberContainer.label = `LineNumberContainer_${key}`;
            this.addChild(numberContainer);

            const position = this._gameConfig.LINE_NUMBER_POSITION[Number(key)];

            const text = new Text({
                text: key.toString(),
                style: this._styleConfig.style_1.clone()
            });
            text.label = `LineNumber_${key}`;
            text.anchor.set(0.5, 0.5);
            text.position.set((this._gameConfig.REFERENCE_RESOLUTION.width / 2) + position.x, (this._gameConfig.REFERENCE_RESOLUTION.height / 2) + position.y);
            text.interactive = true;
            text.cursor = "pointer";
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

    protected override onResize(responsiveConfig: ResponsiveConfig): void { }

    public getController(): WinLinesController<WinLines> {
        return this._controller;
    }
}