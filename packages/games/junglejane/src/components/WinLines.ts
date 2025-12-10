import { Container, Sprite, Text } from "pixi.js";
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
        for (const key of Object.keys(this._gameConfig.LINE_NUMBER_POSITION)) {
            const lineContainer: Container = new Container();
            lineContainer.label = `LineNumberContainer_${key}`;
            this.addChild(lineContainer);

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
            lineContainer.addChild(text);

            this._linesContainer.push(lineContainer);

            lineContainer.on('pointerenter', () => {
                this.showLine(Number(key));
            });
            lineContainer.on('pointerleave', () => {
                this.hideLine(Number(key));
            });
        }
    }

    protected override onResize(responsiveConfig: ResponsiveConfig): void { }

    public getController(): WinLinesController<WinLines> {
        return this._controller;
    }
}