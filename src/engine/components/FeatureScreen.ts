
import {
  Application,
  Circle,
  Container, 
  MeshRope,
  NineSliceSprite,
  Point,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import { GameConfig } from "../../config/GameConfig";
import {
  SIGNAL_EVENTS,
  signals,
  SignalSubscription,
} from "../controllers/SignalManager";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import gsap from "gsap";
import { Helpers } from "../utils/Helpers";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { eventBus } from "../utils/WindowEventManager";

export class FeatureScreen extends Container {
  private _app: Application;
  private _background!: Sprite;
  private _logo!: Sprite;
  private _previewContainer!: Container;
  private _spinButtonContainer!: Container;
  private _volatilityContainer!: Container;
  private _dontShowContainer!: Container;
  private _resizeSubscription?: SignalSubscription;
  private _resolveClose?: () => void;
  private _previewElements: any[][] = [];
  private _previewText!: Text;
  private _previewButton!: Sprite;
  private _dontShow: boolean = false;
  private _buttonIndex: number = 0;
  private _rafID = 0;
  private _lastTime = 0;
  private _delay = 5000;

  constructor(app: Application) {
    super();

    this._app = app;

    this.setupFeatureElenments();

    this.setupResizeHandler();
  }

  private setupFeatureElenments(): void {
    this.setupBackground();
    this.setupLogo();
    this.setupPreview();
    this.setupSpinButton();
    this.setupVolatilityIndicator();
    this.setupDontShowButton();

    this.startPreviewCycle();
  }

  private setupBackground(): void {
    this._background = new Sprite(Texture.EMPTY);
    this._background.label = "Background";
    this._background.anchor.set(0.5, 0.5);
    this._background.position.set(
      GameConfig.REFERENCE_RESOLUTION.width / 2,
      GameConfig.REFERENCE_RESOLUTION.height / 2
    );
    this.addChild(this._background);
  }

  private setupLogo(): void {
    this._logo = Sprite.from("game_logo_vertical");
    this._logo.label = "GameLogo";
    this._logo.anchor.set(0.5, 0.5);
    this._logo.position.set(1550, 260);
    this.addChild(this._logo);
  }

  private setupPreview(): void {
    this._previewContainer = new Container();
    this._previewContainer.label = "PreviewContainer";
    this._previewContainer.position.set(690, 460);
    this.addChild(this._previewContainer);

    const previewGridBg = Sprite.from("frame_background_base");
    previewGridBg.label = "PreviewGridBackground";
    previewGridBg.anchor.set(0.5, 0.5);
    previewGridBg.scale.set(0.75, 0.75);
    this._previewContainer.addChild(previewGridBg);

    const skeleton = Helpers.getSpineSkeletonData("background");

    const previewGridFrame = new Spine(skeleton);
    previewGridFrame.label = "PreviewGridFrame";
    previewGridFrame.skeleton.setSlotsToSetupPose();
    previewGridFrame.state.setAnimation(0, "Background_Landscape_Frame", true);
    previewGridFrame.position.set(8, 11);
    previewGridFrame.scale.set(0.745, 0.745);
    this._previewContainer.addChild(previewGridFrame);

    this._previewElements.push([
      previewGridBg,
      previewGridFrame,
      this.setupPreviewSymbols(),
    ]);

    const feature1000: Sprite = Sprite.from("game_logo_1000");
    feature1000.label = "FeatureLogo1000";
    feature1000.anchor.set(0.5, 0.5);
    feature1000.position.set(0, 0);
    feature1000.visible = false;
    this._previewContainer.addChild(feature1000);

    this._previewElements.push([feature1000]);

    const featureScatter: Sprite = Sprite.from("game_logo_super_scatter");
    featureScatter.label = "FeatureLogoSuperScatter";
    featureScatter.anchor.set(0.5, 0.5);
    featureScatter.position.set(0, 0);
    featureScatter.visible = false;
    this._previewContainer.addChild(featureScatter);

    this._previewElements.push([featureScatter]);

    this._previewText = new Text({
      text: this.setPreviewText(this._buttonIndex),
      style: GameConfig.style.clone(),
    });
    this._previewText.label = "PreviewText";
    this._previewText.style.fontSize = 45;
    this._previewText.style.wordWrap = true;
    this._previewText.style.wordWrapWidth = 650;
    this._previewText.anchor.set(0.5, 0.5);
    this._previewText.position.set(0, 470);
    this._previewContainer.addChild(this._previewText);

    this.setupPreviewTransition();
  }

  private setupPreviewTransition(): void {
    const buttonContainer: Container = new Container();
    buttonContainer.label = "ButtonContainer";
    buttonContainer.position.set(0, 370);
    this._previewContainer.addChild(buttonContainer);

    this._previewButton = Sprite.from("slider_button");
    this._previewButton.label = "Button";
    this._previewButton.anchor.set(0.5, 0.5);
    this._previewButton.position.set(-85 + this._buttonIndex * 85, 0);
    buttonContainer.addChild(this._previewButton);

    for (let index = 0; index < 3; index++) {
      const buttonFrame = Sprite.from("slider_button_frame");
      buttonFrame.label = `ButtonFrame${index + 1}`;
      buttonFrame.anchor.set(0.5, 0.5);
      buttonFrame.position.set(-85 + index * 85, 0);
      buttonFrame.interactive = true;
      buttonFrame.cursor = "pointer";
      buttonFrame.hitArea = new Circle(0, 0, 30);
      buttonContainer.addChild(buttonFrame);

      buttonFrame.on("pointerover", () => {
        gsap.killTweensOf(buttonFrame);

        if (this._buttonIndex === index) return;

        gsap.to(buttonFrame, {
          angle: 360,
          duration: 2,
          ease: "none",
          repeat: -1,
        });
      });
      buttonFrame.on("pointerout", () => {
        gsap.killTweensOf(buttonFrame);

        if (this._buttonIndex === index) return;

        buttonFrame.angle = 0;
      });
      buttonFrame.on("pointerup", () => {
        this.setButtonIndex(index);

        if (this._buttonIndex === index) return;

        gsap.killTweensOf(buttonFrame);
        buttonFrame.angle = 0;
      });
    }
  }

  private setupPreviewSymbols(): Container {
    const symbolsContainer = new Container();
    symbolsContainer.label = "SymbolsContainer";
    this._previewContainer.addChild(symbolsContainer);

    const grid = Helpers.createGrid(6, 5, 0, 0, 15, -20);
    const symbolNames = Array.from(
      { length: grid.length },
      () => `Symbol${Math.floor(Math.random() * 11) + 1}.png`
    );

    for (let index = 0; index < grid.length; index++) {
      const position = grid[index];
      const symbol = Sprite.from(symbolNames[index]);
      symbol.label = "Preview" + symbolNames[index];
      symbol.anchor.set(0.5, 0.5);
      symbol.scale.set(0.75, 0.75);
      symbol.position.set(position.x, position.y);
      symbolsContainer.addChild(symbol);
    }

    return symbolsContainer;
  }

  private setupSpinButton(): void {
    this._spinButtonContainer = new Container();
    this._spinButtonContainer.label = "SpinButtonContainer";
    this._spinButtonContainer.position.set(1550, 620);
    this.addChild(this._spinButtonContainer);

    const spinButtonFrame = Sprite.from("spin_button");
    spinButtonFrame.label = "SpinButtonFrame";
    spinButtonFrame.anchor.set(0.5, 0.5);
    spinButtonFrame.interactive = true;
    spinButtonFrame.cursor = "pointer";
    spinButtonFrame.hitArea = new Circle(0, 0, 91);
    this._spinButtonContainer.addChild(spinButtonFrame);

    const spinButton = Sprite.from("spin_button");
    spinButton.label = "SpinButton";
    spinButton.anchor.set(0.5, 0.5);
    spinButton.scale.set(0.97, 0.97);
    spinButton.tint = 0x30343c;
    this._spinButtonContainer.addChild(spinButton);

    const spinButtonIcon = Sprite.from("spin_button_icon");
    spinButtonIcon.label = "SpinButtonIcon";
    spinButtonIcon.anchor.set(0.5, 0.5);
    this._spinButtonContainer.addChild(spinButtonIcon);

    const spinButtonTextPlace = Sprite.from("spin_button");
    spinButtonTextPlace.label = "SpinButtonTextPlace";
    spinButtonTextPlace.anchor.set(0.5, 0.5);
    spinButtonTextPlace.scale.set(0.55, 0.55);
    spinButtonTextPlace.tint = 0x58b056;
    this._spinButtonContainer.addChild(spinButtonTextPlace);

    const spinButtonText = new Text({
      text: "START",
      style: {
        fontFamily: "Arial",
        fontSize: 25,
        fill: 0xffffff,
        align: "center",
      },
    });
    spinButtonText.label = "SpinButtonText";
    spinButtonText.anchor.set(0.5, 0.5);
    this._spinButtonContainer.addChild(spinButtonText);

    spinButtonFrame.on("pointerover", () => {
      gsap.killTweensOf(spinButtonIcon);
      gsap.fromTo(
        spinButtonIcon,
        { rotation: 0 },
        { rotation: Math.PI, duration: 0.5, ease: "power1.out" }
      );
    });
    spinButtonFrame.on("pointerout", () => {
      gsap.to(spinButtonIcon, {
        rotation: 0,
        duration: 0.5,
        ease: "power1.out",
      });
    });
    spinButtonFrame.on("pointerup", () => {
      gsap.killTweensOf(spinButton);
      spinButtonFrame.off("pointerover");
      spinButtonFrame.off("pointerout");
      spinButtonFrame.off("pointerup");
      spinButtonFrame.interactive = false;

      localStorage.setItem(
        "featureScreenDontShow",
        this._dontShow ? "true" : "false"
      );

      eventBus.emit("showUI");

      this.destroy();

      if (this._resolveClose) {
        this._resolveClose();
        this._resolveClose = undefined;
      }
    });
  }

    private setupDontShowButton(): void {
        this._dontShowContainer = new Container();
        this._dontShowContainer.label = 'DontShowContainer';
        this._dontShowContainer.position.set(1550, 900);
        this.addChild(this._dontShowContainer);

        const dontShowTextBg = new NineSliceSprite({
            texture: Texture.from('bet_area'),
            leftWidth: 100, // Width of the left edge
            rightWidth: 100, // Width of the right edge
            topHeight: 0, // Height of the top edge
            bottomHeight: 0, // Height of the bottom edge

            anchor: 0.5, // Center the sprite's anchor point

            x: -10,
            y: 0,
        });
        dontShowTextBg.width = 575;
        dontShowTextBg.label = 'DontShowTextBg';
        this._dontShowContainer.addChild(dontShowTextBg);

        const dontShowButton = Sprite.from('slider_button_frame');
        dontShowButton.label = 'DontShowButton';
        dontShowButton.anchor.set(0.5, 0.5);
        dontShowButton.position.set(-270, 0);
        dontShowButton.interactive = true;
        dontShowButton.cursor = 'pointer';
        dontShowButton.hitArea = new Circle(0, 0, 30);
        this._dontShowContainer.addChild(dontShowButton);

        const dontShowButtonIcon = Sprite.from('slider_button');
        dontShowButtonIcon.label = 'DontShowButtonIcon';
        dontShowButtonIcon.anchor.set(0.5, 0.5);
        dontShowButtonIcon.visible = false;
        dontShowButton.addChild(dontShowButtonIcon);

        const dontShowText = new Text({
            text: "DON'T SHOW NEXT TIME!",
            style: {
                fontFamily: 'Nunito Black',
                fontSize: 32,
                fill: 0xFFFFFF,
                align: 'center',
                trim: true
            }
        });
        dontShowText.label = 'DontShowText';
        dontShowText.anchor.set(0, 0.5);
        dontShowText.position.set(-220, 0);
        this._dontShowContainer.addChild(dontShowText);

        const amplitude = 10;
        const length = dontShowText.style.fontSize * amplitude;
        const points = Helpers.generateWavePath('x', amplitude, length);
        const ropeTexture = this._app.renderer.generateTexture(dontShowText);

        const rope = new MeshRope({ texture: ropeTexture, points });
        rope.label = 'DontShowTextRope';
        rope.position.set(-600, -500);
        this._dontShowContainer.addChild(rope);
        //gsap.to(rope, { angle: '+=360', duration: 5, ease: 'none', repeat: -1 });

        dontShowButton.on('pointerup', () => {
            dontShowButtonIcon.visible = !dontShowButtonIcon.visible;
            this._dontShow = !this._dontShow;
        });
    }
  }

  private setupDontShowButton(): void {
    this._dontShowContainer = new Container();
    this._dontShowContainer.label = "DontShowContainer";
    this._dontShowContainer.position.set(1550, 900);
    this.addChild(this._dontShowContainer);

    const dontShowTextBg = new NineSliceSprite({
      texture: Texture.from("bet_area"),
      leftWidth: 100, // Width of the left edge
      rightWidth: 100, // Width of the right edge
      topHeight: 0, // Height of the top edge
      bottomHeight: 0, // Height of the bottom edge

      anchor: 0.5, // Center the sprite's anchor point

      x: -10,
      y: 0,
    });
    dontShowTextBg.width = 575;
    dontShowTextBg.label = "DontShowTextBg";
    this._dontShowContainer.addChild(dontShowTextBg);

    const dontShowButton = Sprite.from("slider_button_frame");
    dontShowButton.label = "DontShowButton";
    dontShowButton.anchor.set(0.5, 0.5);
    dontShowButton.position.set(-270, 0);
    dontShowButton.interactive = true;
    dontShowButton.cursor = "pointer";
    dontShowButton.hitArea = new Circle(0, 0, 30);
    this._dontShowContainer.addChild(dontShowButton);

    const dontShowButtonIcon = Sprite.from("slider_button");
    dontShowButtonIcon.label = "DontShowButtonIcon";
    dontShowButtonIcon.anchor.set(0.5, 0.5);
    dontShowButtonIcon.visible = false;
    dontShowButton.addChild(dontShowButtonIcon);

    const dontShowText = new Text({
      text: "DON'T SHOW NEXT TIME",
      style: {
        fontFamily: "Nunito Black",
        fontSize: 32,
        fill: 0xffffff,
        align: "center",
        trim: true,
      },
    });
    dontShowText.label = "DontShowText";
    dontShowText.anchor.set(0, 0.5);
    dontShowText.position.set(-220, 0);
    this._dontShowContainer.addChild(dontShowText);

    dontShowButton.on("pointerup", () => {
      dontShowButtonIcon.visible = !dontShowButtonIcon.visible;
      this._dontShow = !this._dontShow;
    });
  }

  private startPreviewCycle() {
    const loop = (time: number) => {
      if (time - this._lastTime >= this._delay) {
        this._lastTime = time;
        this.nextButton();
      }
      this._rafID = requestAnimationFrame(loop);
    };

    this._lastTime = performance.now();
    this._rafID = requestAnimationFrame(loop);
  }

  private stopPreviewCycle() {
    cancelAnimationFrame(this._rafID);
  }

  private nextButton() {
    if (this._buttonIndex < this._previewElements.length - 1) {
      this.setButtonIndex(this._buttonIndex + 1);
    } else {
      this.setButtonIndex(0);
    }
  }

  private manualChange(index: number) {
    this.setButtonIndex(index);

    this._lastTime = performance.now();
  }

  public async waitForClose(): Promise<void> {
    return new Promise<void>((resolve) => {
      this._resolveClose = resolve;
    });
  }

  private setupResizeHandler(): void {
    // Subscribe to resize events using the signal system
    this._resizeSubscription = signals.on(
      SIGNAL_EVENTS.SCREEN_RESIZE,
      this.onResize.bind(this)
    );
  }

  private onResize(responsiveConfig?: ResponsiveConfig): void {
    const assetName = responsiveConfig?.isMobile
      ? responsiveConfig.orientation === GameConfig.ORIENTATION.landscape
        ? "background_landscape_1440"
        : "background_portrait_1440"
      : "background_landscape_1440";
    this._background.texture = Texture.from(assetName);

    switch (responsiveConfig?.isMobile) {
      case true:
        switch (responsiveConfig?.orientation) {
          case GameConfig.ORIENTATION.portrait:
            this._background.texture = Texture.from("background_portrait_1440");

            this._logo.position.set(
              GameConfig.REFERENCE_RESOLUTION.width / 2,
              -200
            );
            this._previewContainer.position.set(
              GameConfig.REFERENCE_RESOLUTION.width / 2,
              330
            );
            this._spinButtonContainer.position.set(
              GameConfig.REFERENCE_RESOLUTION.width / 2,
              970
            );
            this._volatilityContainer.position.set(
              GameConfig.REFERENCE_RESOLUTION.width / 2,
              1130
            );
            this._dontShowContainer.position.set(
              GameConfig.REFERENCE_RESOLUTION.width / 2,
              1250
            );
            break;
          case GameConfig.ORIENTATION.landscape:
            this._background.texture = Texture.from(
              "background_landscape_1440"
            );

            this._logo.position.set(1550, 260);
            this._previewContainer.position.set(690, 460);
            this._spinButtonContainer.position.set(1550, 620);
            this._volatilityContainer.position.set(1550, 760);
            this._dontShowContainer.position.set(1550, 900);
            break;
        }
        break;
      default:
        this._background.texture = Texture.from("background_landscape_1440");
        break;
    }
  }

  public destroy(): void {
    // Clean up resize subscription
    if (this._resizeSubscription) {
      this._resizeSubscription.unsubscribe();
      this._resizeSubscription = undefined;
    }

    this.stopPreviewCycle();

    // Call parent destroy
    super.destroy();
  }

  private setButtonIndex(index: number) {
    if (this._buttonIndex === index) return;

    gsap.to(this._previewButton.position, {
      x: -85 + index * 85,
      duration: 0.4,
      ease: "power1.out",
    });
    gsap.to(this._previewButton.scale, {
      x: 0.5,
      y: 0.5,
      duration: 0.2,
      ease: "power1.out",
      onComplete: () => {
        gsap.to(this._previewButton.scale, {
          x: 1,
          y: 1,
          duration: 0.2,
          ease: "power1.out",
        });
      },
    });

    this._previewElements[this._buttonIndex].forEach((element) => {
      gsap.killTweensOf(element);
      gsap.fromTo(
        element,
        { alpha: 1 },
        {
          alpha: 0,
          duration: 0.4,
          ease: "none",
          onComplete: () => {
            element.visible = false;
          },
        }
      );
    });
    this._previewElements[index].forEach((element) => {
      gsap.killTweensOf(element);
      gsap.fromTo(
        element,
        { alpha: 0 },
        {
          alpha: 1,
          duration: 0.4,
          ease: "none",
          onStart: () => {
            element.visible = true;
          },
        }
      );
    });

    this._buttonIndex = index;

    gsap.killTweensOf(this._previewText);
    gsap.to(this._previewText, {
      alpha: 0,
      duration: 0.2,
      ease: "none",
      onComplete: () => {
        this._previewText.text = this.setPreviewText(index);

        gsap.to(this._previewText, { alpha: 1, duration: 0.2, ease: "none" });
      },
    });

    this.manualChange(index);
  }

  private setPreviewText(index: number): string {
    let text = "";
    switch (index) {
      case 0:
        text = `SYMBOLS PAY ANYWHERE ON THE SCREEN!`;
        break;
      case 1:
        text = `EARN 1000x FROM WIN BIG!`;
        break;
      case 2:
        text = `LAND 3 OR MORE SCATTERS TO TRIGGER FREE SPINS!`;
        break;
    }

    return text;
  }
}
