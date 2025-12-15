import { AnimatedSprite, Texture, Assets } from "pixi.js";
import { IAnimatedSprite, IDisplayObject } from "../types/IAnimatedSprite";
import { debug } from "./debug";

export class AnimatedSpriteFactory {
    /**
     * @description Creates an AnimatedSprite based on the provided options and configuration.
     * @param options The animation options including alias, folder, frame range, speed, and loop settings.
     * @param config The display object configuration including position, anchor, size, visibility, and interactivity.
     * @returns An instance of AnimatedSprite configured with the provided options and display settings.
     * @example
     * const animSprite = AnimatedSpriteFactory.create(
     *   { alias: 'character_run', folder: 'run', start: 0, end: 10, animationSpeed: 0.5, loop: true },
     *   { label: 'RunAnimation', position: { x: 100, y: 200 }, anchor: { x: 0.5, y: 0.5 }, visible: true, interactive: false }
     * );
     */
    public static create(options: IAnimatedSprite, config: IDisplayObject): AnimatedSprite {
        const { alias, folder, start, end, animationSpeed, loop } = options;
        const { label, position, anchor, scale, width, height, visible, tint, interactive } = config;

        const textures = this._buildTextures(alias, folder, start, end);

        const anim = new AnimatedSprite({
            textures,
            label,
            anchor: { x: anchor.x ?? 0.5, y: anchor.y ?? 0.5 },
            scale: { x: scale?.x ?? 1, y: scale?.y ?? 1 },
            position: { x: position.x, y: position.y },
            width,
            height,
            visible: visible ?? true,
            tint: tint ?? 0xFFFFFF,
            interactive: interactive ?? false
        });

        anim.animationSpeed = animationSpeed ?? 1;
        anim.loop = loop ?? false;

        return anim;
    }

    /**
     * @description Updates an existing AnimatedSprite with new animation options.
     * @param sprite The AnimatedSprite instance to update.
     * @param options The new animation options including alias, folder, frame range, speed, and loop settings.
     * @example
     * AnimatedSpriteFactory.update(animSprite, 
     *   { alias: 'character_jump', folder: 'jump', start: 0, end: 5, animationSpeed: 0.7, loop: false },
     *   { label: 'JumpAnimation', position: { x: 150, y: 250 }, anchor: { x: 0.5, y: 0.5 }, visible: true, interactive: false }
     * );
     */
    public static update(sprite: AnimatedSprite, options: IAnimatedSprite): void {
        const { alias, folder, start, end, animationSpeed = 1, loop = false } = options;

        const textures = this._buildTextures(alias, folder, start, end);

        sprite.textures = textures;
        sprite.animationSpeed = animationSpeed;
        sprite.loop = loop;
        sprite.gotoAndStop(0);
    }

    /**
     * @description Universal texture builder
     * - Supports foldered atlases: apple/0, apple/1, ...
     * - Supports flat atlases: 0, 1, 2, ...
     * - Auto-detects max frame count if end is not specified
     */
    private static _buildTextures(alias: string, folder?: string, start: number = 0, end?: number): Texture[] {
        const atlas = Assets.get(alias);
        if (!atlas) {
            debug.error("AnimatedSprite", `Atlas "${alias}" not found.`);
            return [];
        }

        let frameNames = Object.keys(atlas.textures);

        // if folder is specified, filter frame names
        if (folder) {
            frameNames = frameNames.filter(name => name.startsWith(folder + "/"));
        }

        // extract numeric parts and sort
        const numericFrames = frameNames
            .map(name => {
                const parts = name.split("/");
                const last = parts[parts.length - 1];
                const num = parseInt(last.replace(/\D/g, ""), 10);
                return { name, num };
            })
            .filter(f => !isNaN(f.num))
            .sort((a, b) => a.num - b.num);

        if (numericFrames.length === 0) {
            debug.error("AnimatedSprite", `No numeric frames found in atlas "${alias}"`);
            return [];
        }

        // if end is not specified, take the last numeric frame
        const finalEnd = end !== undefined
            ? end
            : numericFrames[numericFrames.length - 1].num;

        const textures: Texture[] = [];

        for (let i = start; i <= finalEnd; i++) {
            const frameName = folder ? `${folder}/${i}` : `${i}`;
            const texture = atlas.textures[frameName];

            if (!texture) continue;
            textures.push(texture);
        }

        return textures;
    }
}