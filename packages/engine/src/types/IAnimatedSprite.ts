export interface IAnimatedSprite {
    alias: string;
    folder?: string;
    start: number;
    end?: number;
    animationSpeed?: number;
    loop?: boolean;
}

export interface IDisplayObject {
    label: string;
    anchor: {
        x: number;
        y: number
    };
    scale?: {
        x: number;
        y: number
    };
    position: {
        x: number;
        y: number
    };
    width?: number;
    height?: number;
    rotation?: number;
    visible?: boolean;
    tint?: number;
    interactive?: boolean;
}