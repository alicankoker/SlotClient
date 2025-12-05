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
        barFill: 0x0bbf14,
        barBackground: 0x3a1c06,
        barStrokeFront: 0xffef64,
        barStrokeBack: 0xf1ff7f,
        barShadow: 0xffffff,
        fontStyle: "PaytoneOneRegular"
    };

    public readonly style_1: TextStyle = new TextStyle({
        fill: new FillGradient({
            colorStops: [
                {
                    offset: 0.3,
                    color: 0xf7e1c1
                },
                {
                    offset: 0.5,
                    color: 0xf7e1c1
                },
                {
                    offset: 1,
                    color: 0xf7e1c1
                }
            ]
        }),
        dropShadow: {
            alpha: 0.7,
            angle: 1.4,
            color: 0x000000,
            distance: 4
        },
        fontFamily: "PaytoneOneRegular",
        fontSize: 28,
        fontWeight: "bolder",
        stroke: {
            color: 0x316d1f,
            join: 'round',
            width: 0
        },
        align: 'center',
        trim: true,
        padding: 40
    });

    public readonly style_2: TextStyle = new TextStyle({
        fill: new FillGradient({
            colorStops: [
                {
                    offset: 0.5,
                    color: 0xf4fa6f
                },
                {
                    offset: 0.3,
                    color: 0xfdfed9
                },
                {
                    offset: 1,
                    color: 0x1e6a31
                }
            ]
        }),
        dropShadow: {
            alpha: 0.7,
            angle: 1.4,
            color: 0x000000,
            distance: 4
        },
        fontFamily: "PaytoneOneRegular",
        fontSize: 54,
        fontWeight: "bolder",
        stroke: {
            color: 0x316d1f,
            join: 'round',
            width: 1
        },
        align: 'center',
        trim: true,
        padding: 40
    });

    public readonly style_3: TextStyle = new TextStyle({
        fill: 0xffffff,
        fontFamily: "PaytoneOneRegular",
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
                    offset: 0,
                    color: 0xfcfec0
                },
                {
                    offset: 0.33,
                    color: 0xaac551
                },
                {
                    offset: 0.66,
                    color: 0x3e6b1d
                },
                {
                    offset: 1,
                    color: 0x256015
                }
            ]
        }),
        dropShadow: {
            alpha: 1,
            angle: 1.4,
            color: '#2d1b06',
            distance: 5
        },
        fontFamily: "PaytoneOneRegular",
        fontSize: 84,
        fontWeight: "bolder",
        stroke: {
            color: 0x76cc36,
            join: 'round',
            width: 2
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
        fontFamily: "PaytoneOneRegular",
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