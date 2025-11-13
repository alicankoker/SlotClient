import { Container, Sprite, Assets } from "pixi.js";

export class SpriteText extends Container {
    private atlas: any;

    private _anchorX = 0;
    private _anchorY = 0;
    private _scaleX = 1;
    private _scaleY = 1;
    private _offsetX = 0;
    private _offsetY = 0;

    constructor(spriteSheetAlias: string) {
        super();
        this.atlas = Assets.get(spriteSheetAlias);
    }

    // ---- PUBLIC API ----
    public setAnchor(x: number, y: number): void {
        this._anchorX = x;
        this._anchorY = y;
        this.updateAnchor();
    }

    public setScale(x: number, y: number): void {
        this._scaleX = x;
        this._scaleY = y;
        this.scale.set(x, y);
    }

    public setText(text: string, offsetX = 0): void {
        this.removeChildren();

        let currentOffset = 0;

        for (const c of text) {
            const code = c.charCodeAt(0);
            const frameName = String(code);

            const tex = this.atlas.textures[frameName];
            if (!tex) continue;

            const char = new Sprite(tex);

            char.x = currentOffset;
            char.y = 0;

            this.addChild(char);

            currentOffset += char.width + offsetX;
        }

        this.updateAnchor();
    }

    // ---- INTERNAL ----
    private updateAnchor(): void {
        const bounds = this.getLocalBounds();

        this.pivot.x = bounds.x + bounds.width * this._anchorX;
        this.pivot.y = bounds.y + bounds.height * this._anchorY;
    }
}