import { Container, Graphics, MeshRope, Point, Texture } from "pixi.js";
import { GameRulesConfig } from "../../config/GameRulesConfig";
import { GameConfig } from "../../config/GameConfig";

export class WinLinesContainer extends Container {
    private static _instance: WinLinesContainer;
    private winLine: Graphics[];

    private constructor() {
        super();

        this.winLine = [];
        this.createWinLines();
    }

    public static getInstance(): WinLinesContainer {
        if (!this._instance) {
            this._instance = new WinLinesContainer();
        }
        return this._instance;
    }

    private createWinLines(): void {
        for (const key of Object.keys(GameRulesConfig.LINES)) {
            const line = GameRulesConfig.getLine(Number(key));

            const winLine = new Graphics();
            winLine.label = `WinLine_${key}`;
            winLine.beginPath();

            let preline: Point = new Point();
            let postline: Point = new Point();

            switch (GameRulesConfig.LINES[Number(key)][0]) {
                case 1:
                    preline = new Point((-GameConfig.REFERENCE_SYMBOL.width * 2) - (GameConfig.REFERENCE_SYMBOL.width / 2), -GameConfig.REFERENCE_SYMBOL.height);
                    break;
                case 6:
                    preline = new Point((-GameConfig.REFERENCE_SYMBOL.width * 2) - (GameConfig.REFERENCE_SYMBOL.width / 2), 0);
                    break;
                case 11:
                    preline = new Point((-GameConfig.REFERENCE_SYMBOL.width * 2) - (GameConfig.REFERENCE_SYMBOL.width / 2), GameConfig.REFERENCE_SYMBOL.height);
                    break;
            }

            switch (GameRulesConfig.LINES[Number(key)][GameRulesConfig.LINES[Number(key)].length - 1]) {
                case 5:
                    postline = new Point((GameConfig.REFERENCE_SYMBOL.width * 2) + (GameConfig.REFERENCE_SYMBOL.width / 2), -GameConfig.REFERENCE_SYMBOL.height);
                    break;
                case 10:
                    postline = new Point((GameConfig.REFERENCE_SYMBOL.width * 2) + (GameConfig.REFERENCE_SYMBOL.width / 2), 0);
                    break;
                case 15:
                    postline = new Point((GameConfig.REFERENCE_SYMBOL.width * 2) + (GameConfig.REFERENCE_SYMBOL.width / 2), GameConfig.REFERENCE_SYMBOL.height);
                    break;
            }

            winLine.moveTo(preline.x, preline.y);

            for (let i = 0; i < line.length; i++) {
                winLine.lineTo(line[i].x, line[i].y);
                winLine.stroke({
                    color: 0xFFFFFF,
                    width: 5,
                    join: 'round',
                    cap: 'round'
                });
            }
            winLine.lineTo(postline.x, postline.y);
            winLine.stroke({
                color: 0xFFFFFF,
                width: 5,
                join: 'round',
                cap: 'round'
            });
            winLine.closePath();

            winLine.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2));
            winLine.visible = false; // Hidden by default
            winLine.tint = Math.floor(Math.random() * 0xFFFFFF); // Random color for each win line

            this.winLine.push(winLine);

            this.addChild(winLine);

            // we can use MeshRope tho
            // const texture = Texture.from("line");
            // const points: Point[] = [preline, ...line, postline];

            // const rope = new MeshRope({ texture, points });

            // rope.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
            // rope.roundPixels = true;
            // rope.label = `Rope_WinLine_${key}`;
            // rope.visible = false;

            // this.addChild(rope);
        }
    }

    public showLine(lineNumber: number): void {
        const line = this.winLine[lineNumber - 1];
        if (line) {
            line.visible = true;
        }
    }

    public showLines(lineNumbers: number[]): void {
        lineNumbers.forEach(lineNumber => this.showLine(lineNumber));
    }

    public showAllLines(): void {
        this.winLine.forEach(line => line.visible = true);
    }

    public hideLine(lineNumber: number): void {
        const line = this.winLine[lineNumber - 1];
        if (line) {
            line.visible = false;
        }
    }

    public hideAllLines(): void {
        this.winLine.forEach(line => line.visible = false);
    }
}