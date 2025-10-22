import { Graphics, Text } from "pixi.js";
import { BigWinContainer } from "./BigWinContainer";
import { gsap } from "gsap";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Helpers } from "../utils/Helpers";
import { GameConfig } from "../../config/GameConfig";
import { Counter } from "../utils/Counter";
import SoundManager from "../controllers/SoundManager";
import { eventBus } from "../../communication/EventManagers/WindowEventManager";
import { BigWinType } from "../types/IWinEvents";

export class BigWin extends BigWinContainer {
  private static _instance: BigWin;

  private _soundManager: SoundManager;
  private _wins!: Spine;
  private _dimmer!: Graphics;

  private constructor() {
    super();
    this._soundManager = SoundManager.getInstance();

    this.init();
  }

  public static getInstance(): BigWin {
    if (!BigWin._instance) {
      BigWin._instance = new BigWin();
    }
    return BigWin._instance;
  }

  private init(): void {
    this._dimmer = new Graphics();
    this._dimmer.beginPath();
    this._dimmer.rect(
      0,
      0,
      GameConfig.REFERENCE_RESOLUTION.width,
      GameConfig.REFERENCE_RESOLUTION.height
    );
    this._dimmer.fill({ color: 0x000000, alpha: 0.75 });
    this._dimmer.closePath();
    this._dimmer.pivot.set(this._dimmer.width / 2, this._dimmer.height / 2);
    this._dimmer.position.set(
      GameConfig.REFERENCE_RESOLUTION.width / 2,
      GameConfig.REFERENCE_RESOLUTION.height / 2
    );
    this._dimmer.scale.set(3, 3);
    this.addChild(this._dimmer);

    const skeleton = Helpers.getSpineSkeletonData("wins");

    this._wins = new Spine(skeleton);
    this._wins.position.set(
      GameConfig.REFERENCE_RESOLUTION.width / 2,
      GameConfig.REFERENCE_RESOLUTION.height / 2
    );
    this._wins.skeleton.setSlotsToSetupPose();
    this._wins.state.data.defaultMix = 0;
    this.addChild(this._wins);

    this._amountText = new Text({ text: "0", style: GameConfig.style.clone() });
    this._amountText.style.fontSize = 120;
    this._amountText.anchor.set(0.5);
    this._amountText.position.set(
      GameConfig.REFERENCE_RESOLUTION.width / 2,
      GameConfig.REFERENCE_RESOLUTION.height / 2
    );
    this.addChild(this._amountText);

    this._counter = new Counter({
      text: this._amountText,
    });
  }

  // Implement the big win animation logic here
  protected playBigWinAnimation(): void {
    eventBus.emit("hideUI");

    this._duration =
      GameConfig.BIG_WIN.duration +
      this._bigWinType * GameConfig.BIG_WIN.duration;

    this._soundManager.playFor("bigwin", this._duration, 0.5);
    this._soundManager.play("coin", false, 0.25);

    this._wins.state.setAnimation(
      0,
      Object.values(BigWinType)[0] + "_Landing",
      false
    );
    this._wins.state.addAnimation(
      0,
      Object.values(BigWinType)[0] + "_Loop",
      true
    );

    this._bigWinType > 0 && this.playAnimationCycle();
  }

  private playAnimationCycle(): void {
    this._wins.state.data.defaultMix = 0.25;

    for (let i = 1; i < this._bigWinType + 1; i++) {
      this._wins.state.addAnimation(
        0,
        Object.values(BigWinType)[i] + "_Landing",
        false,
        GameConfig.BIG_WIN.duration / 2
      );
      this._wins.state.addAnimation(
        0,
        Object.values(BigWinType)[i] + "_Loop",
        true
      );
    }
  }

  protected playCoinAnimation(): void {
    // Implement the coin animation logic here
  }

  protected stopCoinAnimation(): void {
    // Implement the logic to stop the coin animation here
  }

  protected override skipBigWin(): void {
    super.skipBigWin();

    this._wins.state.setAnimation(
      0,
      Object.values(BigWinType)[this._bigWinType] + "_Loop",
      true
    );
  }

  protected override async stopBigWinAnimation(): Promise<void> {
    this._soundManager.fade("bigwin", 0.5, 0, 0.5);
    this._soundManager.fade("coin", 0.25, 0, 0.5);

    await super.stopBigWinAnimation();

    this._soundManager.stop("bigwin");
    this._soundManager.stop("coin");

    eventBus.emit("showUI");

    this._wins.state.data.defaultMix = 0;
  }
}
