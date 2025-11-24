import { Container, Sprite, Assets } from "pixi.js";

export class SpriteText extends Container {
    private atlas: any;
    private _anchorX = 0;
    private _anchorY = 0;

    private static CUSTOM_MAP: Record<string, string | number> = {};

    constructor(spriteSheetAlias: string) {
        super();
        this.atlas = Assets.get(spriteSheetAlias);
    }

    public static registerCharMap(map: Record<string, string | number>): void {
        Object.assign(SpriteText.CUSTOM_MAP, map);
    }

    public setAnchor(x: number, y: number): void {
        this._anchorX = x;
        this._anchorY = y;
        this.updateAnchor();
    }

    public setScale(x: number, y: number): void {
        this.scale.set(x, y);
        this.updateAnchor();
    }

    public setText(text: string, offsetX = 0): void {
        this.removeChildren();

        let currentOffset = 0;

        for (const c of text) {
            const frameName = this.resolveFrameName(c);

            const tex = this.atlas.textures[frameName];
            if (!tex) continue; // atlas'ta yoksa atla

            const char = new Sprite(tex);
            char.x = currentOffset;
            char.y = 0;

            this.addChild(char);

            currentOffset += char.width + offsetX;
        }

        this.updateAnchor();
    }

    private resolveFrameName(c: string): string {
        // custom map varsa kullan
        if (SpriteText.CUSTOM_MAP[c] !== undefined) {
            return String(SpriteText.CUSTOM_MAP[c]);
        }

        // yoksa unicode decimal karşılığını kullan
        const code = c.charCodeAt(0);
        return String(code);
    }

    private updateAnchor(): void {
        const bounds = this.getLocalBounds();
        this.pivot.x = bounds.x + bounds.width * this._anchorX;
        this.pivot.y = bounds.y + bounds.height * this._anchorY;
    }
}