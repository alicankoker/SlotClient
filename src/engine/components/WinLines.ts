import { Graphics, Sprite, Text } from "pixi.js";
import { GameRulesConfig } from "../../config/GameRulesConfig";
import { GameConfig } from "../../config/GameConfig";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { WinLinesContainer } from "../winLines/WinLinesContainer";
import { WinLinesController } from "../winLines/WinLinesController";

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

    protected override createWinLines(): void {
        for (const key of Object.keys(GameRulesConfig.LINES)) {
            const line = GameRulesConfig.getLine(Number(key));

            const winLine = new Graphics();
            winLine.label = `WinLine_${key}`;
            winLine.beginPath();
            winLine.moveTo(line[0].x, line[0].y);

            for (let i = 0; i < line.length; i++) {
                winLine.lineTo(line[i].x, line[i].y);
                winLine.stroke({
                    color: 0xFFFFFF,
                    width: 10,
                    join: 'round',
                    cap: 'round'
                });
            }
            winLine.closePath();

            winLine.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2) + 15);
            winLine.visible = false; // Hidden by default
            winLine.tint = Math.floor(Math.random() * 0xFFFFFF); // Random color for each win line

            this._winLine.push(winLine);

            this.addChild(winLine);
        }
    }

    protected override createLineNumbers(): void {
        for (let index = 0; index < 2; index++) {
            const chain = Sprite.from(`base_line_chain`);
            chain.label = `LineChain_${index}`;
            chain.anchor.set(0.5);
            chain.position.set(305 + (index * 1285), (GameConfig.REFERENCE_RESOLUTION.height / 2));
            this.addChild(chain);
        }

        for (const key of Object.keys(GameRulesConfig.LINE_NUMBER_POSITION)) {
            const position = GameRulesConfig.LINE_NUMBER_POSITION[Number(key)];
            const texture = Sprite.from(`base_line_holder`);
            texture.label = `LineHolderTexture_${key}`;
            texture.anchor.set(0.5);
            texture.position.set((GameConfig.REFERENCE_RESOLUTION.width / 2) + position.x, (GameConfig.REFERENCE_RESOLUTION.height / 2) + position.y);
            texture.interactive = true;
            texture.cursor = 'pointer';
            this.addChild(texture);

            const text = new Text({ text: key.toString(), style: GameConfig.style.clone() });
            text.label = `LineHolderText_${key}`;
            text.style.fontSize = 25;
            text.anchor.set(0.5);
            texture.addChild(text);

            this._lineTextures.push(texture);

            texture.on('pointerenter', () => {
                for (const t of this._lineTextures) {
                    if (t !== texture) {
                        t.alpha = 0.25;
                    }
                }
                this.showLine(Number(key));
            });
            texture.on('pointerleave', () => {
                for (const t of this._lineTextures) {
                    t.alpha = 1;
                }
                this.hideLine(Number(key));
            });
        }
    }

    protected override onResize(responsiveConfig: ResponsiveConfig): void {
        switch (responsiveConfig.orientation) {
            case GameConfig.ORIENTATION.landscape:
                this.position.set(0, 0);
                break;
            case GameConfig.ORIENTATION.portrait:
                this.position.set(0, -270);
                break;
        }
    }

    public getController(): WinLinesController<WinLines> {
        return this._controller;
    }
}