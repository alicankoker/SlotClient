import { Application } from "pixi.js";
import { SpinContainer, SpinContainerConfig } from "../SpinContainer";
import { SpinConfig } from "../../../config/SpinConfig";
import { IReelMode } from "../../reels/ReelController";
import { GridSymbol } from "../../symbol/GridSymbol";
import { Sprite } from "pixi.js";
import { debug } from "../../utils/debug";

export class ClassicSpinContainer extends SpinContainer {
    protected currentSpeed: number = SpinConfig.SPIN_SPEED;
    protected bottomSymbolYPos: number = 0;
    protected topSymbolYPos: number = 0;
    constructor(app: Application, config: SpinContainerConfig) {
        super(app, config);
    }

    updateSpinProgress(deltaTime: number): void {            
        if (this.currentMode === IReelMode.SLOWING && this.currentSpeed > SpinConfig.REEL_SLOW_DOWN_SPEED_LIMIT) {
            this.currentSpeed -= SpinConfig.REEL_SLOW_DOWN_COEFFICIENT;
        }

        if (this.currentMode === IReelMode.SPEEDING) {
            this.currentSpeed -= SpinConfig.REEL_SPEED_UP_COEFFICIENT;
        }
        this.symbols.forEach((reelSymbols: (GridSymbol | Sprite | null)[], reelIndex: number) => {
            debug.log(`${this.currentSpeed}`);
            reelSymbols.forEach((symbol: GridSymbol | Sprite | null, symbolIndex: number) => {
                if (symbol) {
                    if (symbol.position.y > this.bottomSymbolYPos) {
                        symbol.position.y = this.topSymbolYPos;
                    } else {
                        symbol.position.y += this.currentSpeed;
                    }
                }
            });
        });
    }
}