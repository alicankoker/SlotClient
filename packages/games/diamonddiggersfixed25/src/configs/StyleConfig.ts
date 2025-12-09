import { BaseStyleConfig } from '@slotclient/config/StyleConfig';
import { TextStyle, FillGradient } from 'pixi.js';

export class StyleConfig extends BaseStyleConfig {
    private static instance: StyleConfig;

    public static getInstance(): StyleConfig {
        if (!StyleConfig.instance) {
            StyleConfig.instance = new StyleConfig();
        }
        return StyleConfig.instance;
    }

    public readonly loaderStyles = {
        barFill: 0x1dd4df,
        barBackground: 0x2a2c40,
        barStrokeFront: 0xffa200,
        barStrokeBack: 0xfff0dc,
        barShadow: 0xffffff,
        fontStyle: "TrebuchedMSBold"
    };

    public readonly style_1: TextStyle = new TextStyle({
        fill: 0xffffff,
        fontFamily: "MikadoBlack",
        fontSize: 28,
        fontWeight: "bolder",
        align: 'center',
        trim: true,
        padding: 40
    });

    public readonly style_2: TextStyle = new TextStyle({
        fill: new FillGradient({
            colorStops: [
                {
                    offset: 0.4,
                    color: 0xfffdf8
                },
                {
                    offset: 0.9,
                    color: 0xf0a760
                }
            ]
        }),
        dropShadow: {
            alpha: 0.75,
            angle: 1.4,
            color: 0x000000,
            distance: 4
        },
        fontFamily: "MikadoBlack",
        fontSize: 48,
        fontWeight: "bolder",
        stroke: {
            color: 0x5b240f,
            join: 'round',
            width: 1
        },
        align: 'center',
        trim: true,
        padding: 40
    });

    public readonly style_3: TextStyle = new TextStyle({
        fill: 0xffffff,
        fontFamily: "MikadoBlack",
        fontSize: 28,
        fontWeight: "bolder",
        align: 'center',
        trim: true,
        padding: 40
    });

    public readonly style_4: TextStyle = new TextStyle({
        fill: new FillGradient({
            colorStops: [
                {
                    offset: 0.4,
                    color: 0x895467
                },
                {
                    offset: 0.6,
                    color: 0x4e0f52
                },
                {
                    offset: 0.8,
                    color: 0xf8616c
                }
            ]
        }),
        dropShadow: {
            angle: 0.9,
            color: 0x510c59,
        },
        fontFamily: "MikadoBlack",
        fontSize: 62,
        fontWeight: "bolder",
        stroke: {
            color: 0xffffff,
            join: 'round',
            width: 6
        },
        align: 'center',
        trim: true,
        padding: 40
    });

    public readonly style_5: TextStyle = new TextStyle({
        fill: new FillGradient({
            colorStops: [
                {
                    offset: 0.4,
                    color: 0xffffff
                },
                {
                    offset: 0.9,
                    color: 0xffffff
                }
            ]
        }),
        dropShadow: {
            angle: 1.9,
            color: 0x000000,
            blur: 24,
            distance: 4
        },
        fontFamily: "MikadoBlack",
        fontSize: 74,
        fontWeight: "bolder",
        stroke: {
            color: 0xa3a3a3,
            join: 'round',
            width: 3
        },
        align: 'center',
        trim: true,
        padding: 40
    });
}