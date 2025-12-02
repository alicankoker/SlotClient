import { FillGradient, Graphics, Sprite, Text, Texture } from "pixi.js";
import { GameRulesConfig } from "@slotclient/config/GameRulesConfig";
import { GameConfig } from "@slotclient/config/GameConfig";
import { ResponsiveConfig } from "@slotclient/engine/utils/ResponsiveManager";
import { WinLinesContainer } from "@slotclient/engine/winLines/WinLinesContainer";
import { WinLinesController } from "@slotclient/engine/winLines/WinLinesController";
import { AssetsConfig } from "../configs/AssetsConfig";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export class WinLines extends WinLinesContainer {
    private static _instance: WinLines;

    private _controller: WinLinesController<WinLines>;
    private _lineChain!: Sprite;
    private _fixedLineHolder!: Sprite;
    private _fixedValue!: Text;
    private _fixedText!: Text;

    protected constructor() {
        super();

        this._controller = this.createController();

        this.createLineMask();
        this.createLineNumbers();
        this.createWinLines();
        this.setAvailableLines(this._lineTextures.length);
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
        // for (const key of Object.keys(GameRulesConfig.LINES)) {
        //     const line = GameRulesConfig.getLine(Number(key));

        //     const winLine = new Graphics();
        //     winLine.label = `WinLine_${key}`;
        //     winLine.beginPath();
        //     winLine.moveTo(line[0].x, line[0].y);

        //     for (let i = 0; i < line.length; i++) {
        //         winLine.lineTo(line[i].x, line[i].y);
        //         winLine.stroke({
        //             color: 0xFFFFFF,
        //             width: 10,
        //             join: 'round',
        //             cap: 'round'
        //         });
        //     }
        //     winLine.closePath();

        //     winLine.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2) + 15);
        //     winLine.visible = false; // Hidden by default
        //     winLine.tint = Math.floor(Math.random() * 0xFFFFFF); // Random color for each win line

        //     this._winLine.push(winLine);

        //     this.addChild(winLine);
        // }

        const { atlas, skeleton } = AssetsConfig.LINE_SPINE_ASSET;

        for (const key of Object.keys(GameRulesConfig.LINES)) {
            const line = Spine.from({ atlas, skeleton });
            line.label = `WinLine_${key}`;
            line.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2) + 15);
            line.visible = false; // Hidden by default
            line.tint = 0xffc90f; // Gold color for win lines
            line.state.setAnimation(0, key, false);
            line.state.timeScale = 2;
            line.mask = this._lineMask;

            this._winLine.push(line);

            this.addChild(line);
        }
    }

    protected override createLineNumbers(): void {
        this._lineChain = Sprite.from(`base_line_chain`);
        this._lineChain.label = `LineChain`;
        this._lineChain.anchor.set(0.5);
        this._lineChain.scale.set(0.5, 0.5);
        this._lineChain.position.set(325, (GameConfig.REFERENCE_RESOLUTION.height / 2));
        this.addChild(this._lineChain);

        this._fixedLineHolder = Sprite.from(`base_fixed_lines_holder`);
        this._fixedLineHolder.label = `FixedLineHolder`;
        this._fixedLineHolder.anchor.set(0.5);
        this._fixedLineHolder.scale.set(0.5, 0.5);
        this._fixedLineHolder.position.set(325, 555);
        this.addChild(this._fixedLineHolder);

        this._fixedValue = new Text({
            text: '25',
            style: GameConfig.style_1.clone()
        });
        this._fixedValue.style.fontSize = 50;
        this._fixedValue.anchor.set(0.5);
        this._fixedValue.position.set(325, 530);
        this.addChild(this._fixedValue);

        this._fixedText = new Text({
            text: 'LINES',
            style: GameConfig.style_1.clone()
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