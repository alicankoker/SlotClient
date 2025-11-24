import { FillGradient, Graphics, Sprite, Text, Texture } from "pixi.js";
import { GameRulesConfig } from "@slotclient/config/GameRulesConfig";
import { GameConfig } from "@slotclient/config/GameConfig";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { WinLinesContainer } from "../winLines/WinLinesContainer";
import { WinLinesController } from "../winLines/WinLinesController";
import { AssetsConfig } from "@slotclient/config/AssetsConfig";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export class WinLines extends WinLinesContainer {
    private static _instance: WinLines;
    private _controller: WinLinesController<WinLines>;

    private constructor() {
        super();

        this._controller = this.createController();
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
        for (let index = 0; index < 2; index++) {
            const chain = Sprite.from(`base_line_chain`);
            chain.label = `LineChain_${index}`;
            chain.anchor.set(0.5);
            chain.scale.set(0.5, 0.5);
            chain.position.set(318 + (index * 1285), (GameConfig.REFERENCE_RESOLUTION.height / 2));
            this.addChild(chain);
        }

        for (const key of Object.keys(GameRulesConfig.LINE_NUMBER_POSITION)) {
            const position = GameRulesConfig.LINE_NUMBER_POSITION[Number(key)];
            const texture = Sprite.from(`base_line_holder`);
            texture.label = `LineHolderTexture_${key}`;
            texture.anchor.set(0.5);
            texture.scale.set(0.5, 0.5);
            texture.position.set((GameConfig.REFERENCE_RESOLUTION.width / 2) + position.x, (GameConfig.REFERENCE_RESOLUTION.height / 2) + position.y);
            texture.interactive = true;
            texture.cursor = 'pointer';
            this.addChild(texture);

            const text = new Text({
                text: key.toString(),
                style: GameConfig.style_1.clone()
            });
            text.style.fontSize = 56;
            text.anchor.set(0.5);
            text.position.set(0, -10);
            texture.addChild(text);

            this._lineTextures.push(texture);

            texture.on('pointerenter', () => {
                for (let index = 0; index < this._availableLines; index++) {
                    this._lineTextures[index].alpha = index + 1 === Number(key) ? 1 : 0.25;
                }
                this.showLine(Number(key));
            });
            texture.on('pointerleave', () => {
                for (let index = 0; index < this._availableLines; index++) {
                    this._lineTextures[index].alpha = 1;
                }
                this.hideLine(Number(key));
            });
        }
    }
    
    public setFreeSpinMode(enabled: boolean): void {
        this._lineTextures.forEach((texture) => {
            const textureName = enabled ? 'freespin_line_holder' : 'base_line_holder';
            texture.texture = Texture.from(textureName);
        });
    }

    protected override onResize(responsiveConfig: ResponsiveConfig): void { }

    public getController(): WinLinesController<WinLines> {
        return this._controller;
    }
}