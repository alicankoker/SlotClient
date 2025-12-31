import { Application, Circle, Container, NineSliceSprite, Sprite, Text, Texture, } from "pixi.js";
import { GameConfig } from "../configs/GameConfig";
import { FeatureScreenContainer } from "@slotclient/engine/featureScreen/FeatureScreenContainer";
import { FeatureScreenController } from "@slotclient/engine/featureScreen/FeatureScreenController";
import { ResponsiveConfig } from "@slotclient/engine/utils/ResponsiveManager";
import gsap from "gsap";
import { Helpers } from "@slotclient/engine/utils/Helpers";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { AssetsConfig } from "../configs/AssetsConfig";
import { StyleConfig } from "../configs/StyleConfig";

export class FeatureScreen extends FeatureScreenContainer {
    private _assetsConfig: AssetsConfig;
    private _gameConfig: GameConfig;
    private _styleConfig: StyleConfig;
    private _controller: FeatureScreenController<FeatureScreen>;
    private _logo!: Sprite;
    private _previewContainer!: Container;
    private _reelContainer!: Container;
    private _linesContainer!: Container;
    private _spinButtonContainer!: Container;
    private _volatilityContainer!: Container;
    private _dontShowContainer!: Container;
    private _previewSymbols: Sprite[] = [];
    private _previewSpecialSymbols: Spine[] = [];
    private _previewText!: Text;
    private _previewButton!: Sprite;
    private _dontShow: boolean = false;
    private _buttonIndex: number = 0;
    private _rafID = 0;
    private _lastTime = 0;
    private _delay = 5000;

    constructor(app: Application) {
        super(app);

        this._assetsConfig = AssetsConfig.getInstance();
        this._gameConfig = GameConfig.getInstance();
        this._styleConfig = StyleConfig.getInstance();

        this._controller = this.createController();

        this.setupFeatureElements();
    }

    private createController(): FeatureScreenController<FeatureScreen> {
        return new (class extends FeatureScreenController<FeatureScreen> {
            public async showFeatureScreen(): Promise<void> {
                gsap.to(this.view, { alpha: 1, duration: 0.3, ease: "none" });
            }

            public async closeFeatureScreen(): Promise<void> {
                gsap.to(this.view, {
                    alpha: 0,
                    duration: 0.3,
                    ease: "none",
                    onComplete: () => {
                        this.view.closeFeatureScreen();
                    }
                });
            }
        })(this);
    }

    protected setupFeatureElements(): void {
        this.setupPreviewElements();
        this.setupLogo();
        this.setupSpinButton();
        this.setupVolatilityIndicator();
        this.setupDontShowButton();

        this.setupPreviewTransition();

        this.startPreviewCycle();
    }

    private setupPreviewElements(): void {
        this._previewContainer = new Container();
        this._previewContainer.label = "PreviewContainer";
        this._previewContainer.position.set(690, 540);
        this.addChild(this._previewContainer);

        this._reelContainer = new Container();
        this._reelContainer.label = "ReelContainer";
        this._previewContainer.addChild(this._reelContainer);

        const previewGridBg = Sprite.from("base_frame_background");
        previewGridBg.label = "PreviewGridBackground";
        previewGridBg.anchor.set(0.5, 0.5);
        previewGridBg.position.set(0, -8);
        previewGridBg.scale.set(0.4, 0.4);
        this._reelContainer.addChild(previewGridBg);

        const frameElements: Container = new Container();
        frameElements.label = "FrameElements";
        this._reelContainer.addChild(frameElements);

        for (let cIndex = 0; cIndex < 6; cIndex++) {
            const floorChain = Sprite.from("base_chain");
            floorChain.label = `FloorChain_${cIndex}`;
            floorChain.anchor.set(0.5, 0.5);
            floorChain.scale.set(0.4, 0.4);
            floorChain.position.set(-485 + (cIndex * 194), -205);
            frameElements.addChild(floorChain);
        }

        for (let fIndex = 0; fIndex < 2; fIndex++) {
            const floor = Sprite.from('base_floor');
            floor.label = `FloorBase_${fIndex}`;
            floor.anchor.set(0.5, 0.5);
            floor.scale.set(0.4, 0.4);
            floor.position.set(0, -110 + (fIndex * 195));
            frameElements.addChild(floor);

            for (let cIndex = 0; cIndex < 6; cIndex++) {
                const hole = Sprite.from('base_chain_hole');
                hole.label = `ChainHole_${fIndex}_${cIndex}`;
                hole.anchor.set(0.5, 0.5);
                hole.scale.set(0.5, 0.5);
                hole.position.set(-485 + (cIndex * 194), -93 + (fIndex * 195));
                frameElements.addChild(hole);

                const floorChain = Sprite.from("base_chain");
                floorChain.label = `FloorChain_${cIndex}`;
                floorChain.anchor.set(0.5, 0.5);
                floorChain.scale.set(0.4, 0.4);
                floorChain.position.set(-485 + (cIndex * 194), 0 + (fIndex * 195));
                frameElements.addChild(floorChain);
            }
        }

        const previewGridFrame = Sprite.from("base_frame");
        previewGridFrame.label = 'PreviewGridFrame';
        previewGridFrame.anchor.set(0.5, 0.5);
        previewGridFrame.position.set(5, 30);
        previewGridFrame.scale.set(0.4, 0.4);
        this._reelContainer.addChild(previewGridFrame);

        this._setupPreviewSymbols(this._reelContainer);

        this._linesContainer = new Container();
        this._linesContainer.label = "LinesContainer";
        this._linesContainer.position.set(-790, -450);
        this._linesContainer.scale.set(0.82, 0.82);
        this._linesContainer.visible = false;
        this._reelContainer.addChild(this._linesContainer);

        this._setupLines(this._linesContainer);

        this._previewText = new Text({
            text: "",
            style: this._styleConfig.style_2.clone()
        });
        this._previewText.label = "PreviewText";
        this._previewText.anchor.set(0.5, 0.5);
        this._previewText.position.set(0, 470);
        this._previewContainer.addChild(this._previewText);

        this._previewText.text = this.setPreviewText(0);
    }

    private _setupPreviewSymbols(parent: Container): Container {
        const symbolsContainer = new Container();
        symbolsContainer.label = "SymbolsContainer";
        parent.addChild(symbolsContainer);

        const grid = Helpers.createGrid(5, 3, 0, 0, 45, 40);
        const forbidden = [8, 10];
        const allowed = Array.from({ length: 10 }, (_, i) => i + 1).filter(n => !forbidden.includes(n));

        const symbolNames = Array.from({ length: grid.length }, () => {
            const random = allowed[Math.floor(Math.random() * allowed.length)];
            return `${random}`;
        });

        for (let index = 0; index < grid.length; index++) {
            const position = grid[index];
            const symbol = Sprite.from(symbolNames[index]);
            symbol.label = "Preview" + symbolNames[index];
            symbol.anchor.set(0.5, 0.5);
            symbol.scale.set(0.75, 0.75);
            symbol.position.set(position.x, position.y);
            symbolsContainer.addChild(symbol);

            this._previewSymbols.push(symbol);
        }

        const specialSymbolContainer = new Container();
        specialSymbolContainer.label = "SpecialSymbolContainer";
        parent.addChild(specialSymbolContainer);

        for (let index = 0; index < 6; index++) {
            const { atlas, skeleton } = this._assetsConfig.SYMBOL_SPINE_ASSET;
            const specialSymbol = Spine.from({ atlas, skeleton });
            specialSymbol.label = "PreviewSpecialSymbol" + index;
            specialSymbol.scale.set(0.75, 0.75);
            specialSymbol.visible = false;
            specialSymbolContainer.addChild(specialSymbol);

            this._previewSpecialSymbols.push(specialSymbol);
        }

        this.setSpecialSymbolVisibility(0);

        return symbolsContainer;
    }

    private _setupLines(parent: Container): void {
        for (let index = 0; index < 2; index++) {
            const chain = Sprite.from(`base_line_chain`);
            chain.label = `LineChain_${index}`;
            chain.anchor.set(0.5, 0.5);
            chain.scale.set(0.5, 0.5);
            chain.position.set(318 + (index * 1285), (this._gameConfig.REFERENCE_RESOLUTION.height / 2));
            parent.addChild(chain);
        }

        for (const key of Object.keys(this._gameConfig.LINE_NUMBER_POSITION)) {
            const position = this._gameConfig.LINE_NUMBER_POSITION[Number(key)];
            const texture = Sprite.from(`base_line_holder`);
            texture.label = `LineHolderTexture_${key}`;
            texture.anchor.set(0.5, 0.5);
            texture.scale.set(0.5, 0.5);
            texture.position.set((this._gameConfig.REFERENCE_RESOLUTION.width / 2) + position.x, (this._gameConfig.REFERENCE_RESOLUTION.height / 2) + position.y);
            parent.addChild(texture);

            const text = new Text({
                text: key.toString(),
                style: this._styleConfig.style_1.clone()
            });
            text.style.fontSize = 56;
            text.anchor.set(0.5, 0.5);
            text.position.set(0, -10);
            texture.addChild(text);
        }
    }

    private setupLogo(): void {
        this._logo = Sprite.from('base_logo');
        this._logo.label = 'GameLogo';
        this._logo.anchor.set(0.5, 0.5);
        this._logo.scale.set(0.5, 0.5);
        this._logo.position.set(1615, 280);
        this.addChild(this._logo);
    }

    private setupSpinButton(): void {
        this._spinButtonContainer = new Container();
        this._spinButtonContainer.label = "SpinButtonContainer";
        this._spinButtonContainer.position.set(1615, 560);
        this._spinButtonContainer.interactive = true;
        this._spinButtonContainer.cursor = "pointer";
        this.addChild(this._spinButtonContainer);

        const spinButton = Sprite.from("splash_spin_button");
        spinButton.label = "SpinButton";
        spinButton.anchor.set(0.5, 0.5);
        this._spinButtonContainer.addChild(spinButton);

        const spinButtonArrow = Sprite.from("splash_spin_button_arrow");
        spinButtonArrow.label = "SpinButtonArrow";
        spinButtonArrow.anchor.set(0.5, 0.5);
        this._spinButtonContainer.addChild(spinButtonArrow);

        this._spinButtonContainer.on("pointerover", () => {
            gsap.killTweensOf(spinButtonArrow);
            gsap.fromTo(spinButtonArrow, { rotation: 0 }, { rotation: Math.PI, duration: 0.5, ease: "power1.out" });
        });

        this._spinButtonContainer.on("pointerout", () => {
            gsap.to(spinButtonArrow, {
                rotation: 0,
                duration: 0.5,
                ease: "power1.out",
            });
        });

        this._spinButtonContainer.on("pointerup", async () => {
            gsap.killTweensOf(spinButton);
            this._spinButtonContainer.off("pointerover");
            this._spinButtonContainer.off("pointerout");
            this._spinButtonContainer.off("pointerup");
            this._spinButtonContainer.interactive = false;

            const element = document.documentElement;
            if (!document.fullscreenElement && element.requestFullscreen) {
                element.requestFullscreen();
            }

            this.closeFeatureScreen();
        });
    }

    private setupVolatilityIndicator(): void {
        this._volatilityContainer = new Container();
        this._volatilityContainer.label = "VolatilityContainer";
        this._volatilityContainer.position.set(1615, 700);
        this.addChild(this._volatilityContainer);

        const volatilityBg = new NineSliceSprite({
            texture: Texture.from('splash_volatility_holder'),
            leftWidth: 300, // Width of the left edge
            rightWidth: 300, // Width of the right edge
            topHeight: 0, // Height of the top edge
            bottomHeight: 0, // Height of the bottom edge

            anchor: 0.5, // Center the sprite's anchor point

            x: 0,
            y: 0,
        });
        volatilityBg.width = 385;
        volatilityBg.height = 50;
        volatilityBg.label = 'VolatilityBackground';
        this._volatilityContainer.addChild(volatilityBg);

        const volatilityText = new Text({
            text: 'VOLATILITY',
            style: {
                fontFamily: 'TrebuchedMSBold',
                fontSize: 20,
                fontWeight: 'bolder',
                fill: 0xFFFFFF,
                align: 'center',
                trim: true,
                padding: 40
            }
        });
        volatilityText.label = 'VolatilityText';
        volatilityText.anchor.set(0, 0.5);
        volatilityText.position.set(-150, 0);
        this._volatilityContainer.addChild(volatilityText);

        const inactiveArrows = 2;
        for (let index = 0; index < 5; index++) {
            const element = Sprite.from('splash_volatility_frame');
            element.label = 'VolatilityIndicator' + index;
            element.anchor.set(0.5, 0.5);
            element.position.set(167 - index * 40, 0);
            element.tint = index < inactiveArrows ? 0x939598 : 0xFBBC31;
            this._volatilityContainer.addChild(element);

            const arrow = Sprite.from('splash_volatility_arrow');
            arrow.label = 'VolatilityArrow' + index;
            arrow.anchor.set(0.5, 0.5);
            arrow.position.set(167 - index * 40, -1);
            arrow.tint = 0x30343C;
            this._volatilityContainer.addChild(arrow);
        }
    }

    private setupDontShowButton(): void {
        this._dontShowContainer = new Container();
        this._dontShowContainer.label = "DontShowContainer";
        this._dontShowContainer.position.set(1585, 950);
        this.addChild(this._dontShowContainer);

        const dontShowTextBg = new NineSliceSprite({
            texture: Texture.from("splash_tick_holder"),
            leftWidth: 5, // Width of the left edge
            rightWidth: 25, // Width of the right edge
            topHeight: 0, // Height of the top edge
            bottomHeight: 0, // Height of the bottom edge

            anchor: 0.5, // Center the sprite's anchor point

            x: 15,
            y: 0,
        });
        dontShowTextBg.width = 575;
        dontShowTextBg.label = "DontShowTextBg";
        this._dontShowContainer.addChild(dontShowTextBg);

        const dontShowButton = Sprite.from("splash_ticked_bg");
        dontShowButton.label = "DontShowButton";
        dontShowButton.anchor.set(0.5, 0.5);
        dontShowButton.position.set(-270, 0);
        dontShowButton.interactive = true;
        dontShowButton.cursor = "pointer";
        dontShowButton.hitArea = new Circle(0, 0, 30);
        this._dontShowContainer.addChild(dontShowButton);

        const dontShowButtonIcon = Sprite.from("splash_ticked");
        dontShowButtonIcon.label = "DontShowButtonIcon";
        dontShowButtonIcon.anchor.set(0.5, 0.5);
        dontShowButtonIcon.visible = false;
        dontShowButton.addChild(dontShowButtonIcon);

        const dontShowText = new Text({
            text: "DON'T SHOW NEXT TIME",
            style: {
                fontFamily: 'TrebuchedMSBold',
                fontSize: 40,
                fontWeight: 'bolder',
                fill: 0x000000,
                align: 'center',
                trim: true,
                padding: 40
            }
        });
        dontShowText.label = "DontShowText";
        dontShowText.anchor.set(0, 0.5);
        dontShowText.position.set(-210, 0);
        this._dontShowContainer.addChild(dontShowText);

        dontShowButton.on("pointerup", () => {
            dontShowButtonIcon.visible = !dontShowButtonIcon.visible;
            this._dontShow = !this._dontShow;
        });
    }

    private setupPreviewTransition(): void {
        const buttonContainer: Container = new Container();
        buttonContainer.label = "ButtonContainer";
        buttonContainer.position.set(0, 370);
        this._previewContainer.addChild(buttonContainer);

        this._previewButton = Sprite.from("splash_radiobutton_inside");
        this._previewButton.label = "Button";
        this._previewButton.anchor.set(0.5, 0.5);
        this._previewButton.position.set(-85 + this._buttonIndex * 85, 0);
        buttonContainer.addChild(this._previewButton);

        for (let index = 0; index < 3; index++) {
            const buttonFrame = Sprite.from("splash_radiobutton_outside");
            buttonFrame.label = `ButtonFrame${index + 1}`;
            buttonFrame.anchor.set(0.5, 0.5);
            buttonFrame.position.set(-85 + index * 85, 0);
            buttonFrame.interactive = true;
            buttonFrame.cursor = "pointer";
            buttonFrame.hitArea = new Circle(0, 0, 30);
            buttonContainer.addChild(buttonFrame);

            buttonFrame.on("pointerup", () => {
                if (this._buttonIndex === index) return;

                this.manualChange(index);
            });
        }
    }

    protected startPreviewCycle() {
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

    protected stopPreviewCycle() {
        cancelAnimationFrame(this._rafID);
    }

    private nextButton() {
        const totalPreviews = 3;

        if (this._buttonIndex < totalPreviews - 1) {
            this.setButtonIndex(this._buttonIndex + 1);
        } else {
            this.setButtonIndex(0);
        }
    }

    private manualChange(index: number) {
        this.setButtonIndex(index);

        this._lastTime = performance.now();
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

        gsap.killTweensOf(this._reelContainer);
        gsap.fromTo(this._reelContainer, { alpha: 1 }, {
            alpha: 0, duration: 0.2, ease: "none", onComplete: () => {
                this.setSpecialSymbolVisibility(index);

                this._linesContainer.visible = index === 2;

                gsap.to(this._reelContainer, { alpha: 1, duration: 0.2, ease: "none" });
            }
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
    }

    private setPreviewText(index: number): string {
        let text = "";
        switch (index) {
            case 0:
                text = `3 OR MORE SCATTER SYMBOLS\nSTART FREESPIN FEATURE`;
                break;
            case 1:
                text = `WIN UP TO 1000X\nIN THE BONUS FEATURE`;
                break;
            case 2:
                text = `WINS ARE CALCULATED\nON 25 LINES`;
                break;
        }

        return text;
    }

    private setSpecialSymbolVisibility(index: number): void {
        // First hide all special symbols
        for (const s of this._previewSpecialSymbols) {
            s.visible = false;
        }

        // Show normal symbols
        for (const s of this._previewSymbols) {
            s.visible = true;
        }

        // index = 2 show nothing
        if (index === 2) return;

        // reels to consider
        const selectedReels = index === 1
            ? [0, 2, 4]   // total 3 reels
            : [0, 1, 2, 3, 4]; // total 5 reels

        // start position for special symbols
        const specialStart = 0;

        // Number of specials to use
        const specialLimit = index === 1 ? 3 : 5;

        let specialCounter = 0;

        for (const reel of selectedReels) {

            if (specialCounter >= specialLimit) break;

            const start = reel * 3;

            // select random slot between 0 and 2
            const randomOffset = Math.floor(Math.random() * 3);
            const posIndex = start + randomOffset;

            const normalSymbol = this._previewSymbols[posIndex];
            normalSymbol.visible = false;

            // correct special symbol
            const specialSymbol = this._previewSpecialSymbols[specialStart + specialCounter];
            specialCounter++;

            // set position of special symbol
            specialSymbol.position.set(normalSymbol.x, normalSymbol.y);

            // animation name to play
            const animationName = index === 1 ? "10_win" : "8_win";

            // show and play animation
            specialSymbol.visible = true;
            specialSymbol.state.setAnimation(0, animationName, true);
        }
    }

    protected closeFeatureScreen(): void {
        localStorage.setItem(
            "featureScreenDontShow",
            this._dontShow ? "true" : "false"
        );

        this.destroy();

        if (this._resolveClose) {
            this._resolveClose();
            this._resolveClose = undefined;
        }
    }

    protected onResize(config?: ResponsiveConfig): void {
        switch (config?.isMobile) {
            case true:
                switch (config?.orientation) {
                    case this._gameConfig.ORIENTATION.portrait:
                        this._logo.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, -200);
                        this._previewContainer.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 330);
                        this._spinButtonContainer.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 970);
                        this._volatilityContainer.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 1130);
                        this._dontShowContainer.position.set(this._gameConfig.REFERENCE_RESOLUTION.width / 2, 1250);
                        break;
                    case this._gameConfig.ORIENTATION.landscape:
                        this._logo.position.set(1615, 260);
                        this._previewContainer.position.set(690, 540);
                        this._spinButtonContainer.position.set(1615, 620);
                        this._volatilityContainer.position.set(1615, 760);
                        this._dontShowContainer.position.set(1585, 900);
                        break;
                }
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

    public getController(): FeatureScreenController<FeatureScreen> {
        return this._controller;
    }
}