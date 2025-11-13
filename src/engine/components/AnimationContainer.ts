import { Container, Graphics, Sprite, Text, Ticker } from "pixi.js";
import { WinLines } from "./WinLines";
import { WinEvent } from "./WinEvent";
import { GameConfig } from "../../config/GameConfig";
import { signals, SIGNAL_EVENTS, SignalSubscription } from "../controllers/SignalManager";
import { Helpers } from "../utils/Helpers";
import { gsap } from "gsap";
import { AssetsConfig } from "../../config/AssetsConfig";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { GameDataManager } from "../data/GameDataManager";
import { ResponsiveConfig } from "../utils/ResponsiveManager";
import { eventBus } from "../../communication/EventManagers/WindowEventManager";

interface ParticleAnimationOptions {
    element: Sprite | Spine | Graphics;
    life: number;
    maxLife: number;
    maxCount: number;
    rotationSpeed?: number;
    gravity?: number;
    friction?: number;
}

interface InternalParticle {
    sprite: Sprite | Spine | Graphics;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    rotationSpeed: number;
    gravity: number;
    friction: number;
}

export class AnimationContainer extends Container {
    private static _instance: AnimationContainer;
    protected _resizeSubscription?: SignalSubscription;

    private _winLines: WinLines;
    private _particleContainer: Container;
    private _particleList: InternalParticle[] = [];
    private _particleTicker?: Ticker;
    private _winEvent: WinEvent;
    private _winContainer!: Container;
    private _winStrap!: Sprite;
    private _winText: Text;
    private _winStrapLines: Sprite[] = [];
    private _dimmer!: Graphics;
    private _popup!: Container;
    private _popupBackground!: Sprite;
    private _popupHeader!: Sprite;
    private _popupFreeSpinsText!: Text;
    private _popupCountText!: Text;
    private _transition!: Spine;
    private _totalWinAmount: number = 0;

    private totalWinTween?: gsap.core.Tween;
    private totalWinResolver?: () => void;

    private constructor() {
        super();

        this._winLines = WinLines.getInstance();
        this._winLines.setAvailableLines(GameDataManager.getInstance().getMaxLine());
        this.addChild(this._winLines);

        this._particleContainer = new Container();
        this._particleContainer.label = 'ParticleContainer';
        this._particleContainer.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2) + 15);
        this.addChild(this._particleContainer);

        this._winContainer = new Container();
        this._winContainer.label = 'WinContainer';
        this._winContainer.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, (GameConfig.REFERENCE_RESOLUTION.height / 2) + 15);
        this._winContainer.visible = false;
        this.addChild(this._winContainer);

        this._winStrap = Sprite.from("win_strap");
        this._winStrap.label = 'WinStrap';
        this._winStrap.anchor.set(0.5, 0.5);
        this._winStrap.tint = 0x5f061f;
        this._winContainer.addChild(this._winStrap);

        this._winText = new Text({ text: '', style: GameConfig.style.clone() });
        this._winText.style.fontSize = 150;
        this._winText.label = 'WinText';
        this._winText.anchor.set(0.5, 0.5);
        this._winContainer.addChild(this._winText);

        for (let i = 0; i < 2; i++) {
            const line = Sprite.from("win_strap_line");
            line.label = `WinStrapLine_${i}`;
            line.anchor.set(0.5, 0.5);
            line.position.set(0, i === 0 ? -78 : 78);
            line.tint = 0xffc90f;
            this._winContainer.addChild(line);
            this._winStrapLines.push(line);
        }

        this._dimmer = new Graphics();
        this._dimmer.beginPath();
        this._dimmer.rect(0, 0, GameConfig.REFERENCE_RESOLUTION.width, GameConfig.REFERENCE_RESOLUTION.height);
        this._dimmer.fill({ color: 0x010b14, alpha: 0.75 });
        this._dimmer.closePath();
        this._dimmer.pivot.set(this._dimmer.width / 2, this._dimmer.height / 2);
        this._dimmer.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._dimmer.scale.set(4, 4);
        this._dimmer.visible = false;
        this._dimmer.alpha = 0;
        this.addChild(this._dimmer);

        this._popup = new Container();
        this._popup.label = 'FreeSpinPopupContainer';
        this._popup.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._popup.visible = false;
        this.addChild(this._popup);

        this._popupBackground = Sprite.from("popup_frame");
        this._popupBackground.label = 'FreeSpinPopupBackground';
        this._popupBackground.anchor.set(0.5);
        this._popup.addChild(this._popupBackground);

        this._popupHeader = Sprite.from("popup_header");
        this._popupHeader.label = 'FreeSpinPopupHeader';
        this._popupHeader.anchor.set(0.5);
        this._popupHeader.position.set(0, -295);
        this._popup.addChild(this._popupHeader);

        const popupHeaderText = new Text({
            text: 'CONGRATULATIONS',
            style: GameConfig.style_4
        });
        popupHeaderText.label = 'FreeSpinPopupHeaderText';
        popupHeaderText.anchor.set(0.5, 0.5);
        popupHeaderText.position.set(0, -295);
        this._popup.addChild(popupHeaderText);

        const popupYouWonText = new Text({
            text: 'YOU HAVE WON',
            style: GameConfig.style_2
        });
        popupYouWonText.label = 'FreeSpinPopupYouWonText';
        popupYouWonText.anchor.set(0.5, 0.5);
        popupYouWonText.position.set(0, -120);
        this._popup.addChild(popupYouWonText);

        this._popupCountText = new Text({ text: '', style: GameConfig.style.clone() });
        this._popupCountText.label = 'FreeSpinPopupCountText';
        this._popupCountText.anchor.set(0.5, 0.5);
        this._popupCountText.position.set(0, -15);
        this._popupCountText.style.fontSize = 145;
        this._popup.addChild(this._popupCountText);

        this._popupFreeSpinsText = new Text({
            text: '',
            style: GameConfig.style_2
        });
        this._popupFreeSpinsText.label = 'FreeSpinPopupFreeSpinsText';
        this._popupFreeSpinsText.anchor.set(0.5, 0.5);
        this._popupFreeSpinsText.position.set(0, 100);
        this._popup.addChild(this._popupFreeSpinsText);

        const popupPressAnywhere = new Text({
            text: 'PRESS ANYWHERE TO CONTINUE',
            style: GameConfig.style_1
        });
        popupPressAnywhere.label = 'FreeSpinPopupPressText';
        popupPressAnywhere.anchor.set(0.5, 0.5);
        popupPressAnywhere.position.set(0, 200);
        this._popup.addChild(popupPressAnywhere);

        this._winEvent = WinEvent.getInstance();
        this.addChild(this._winEvent);

        const { atlas, skeleton } = AssetsConfig.TRANSITION_SPINE_ASSET;

        this._transition = Spine.from({ atlas, skeleton });
        this._transition.label = 'TransitionSpine';
        this._transition.scale.set(15, 10);
        this._transition.position.set(GameConfig.REFERENCE_RESOLUTION.width / 2, GameConfig.REFERENCE_RESOLUTION.height / 2);
        this._transition.visible = false;
        this._transition.state.timeScale = 0.50;
        this.addChild(this._transition);

        this.eventListeners();
    }

    public static getInstance(): AnimationContainer {
        if (!AnimationContainer._instance) {
            AnimationContainer._instance = new AnimationContainer();
        }
        return AnimationContainer._instance;
    }

    private eventListeners(): void {
        signals.on(SIGNAL_EVENTS.WIN_ANIMATION_PLAY, (winAmount: number | undefined) => {
            if (winAmount !== undefined) {
                this.playWinTextAnimation(winAmount);
            }
        });

        signals.on(SIGNAL_EVENTS.WIN_ANIMATION_COMPLETE, () => {
            this.stopWinTextAnimation();
        });

        this._resizeSubscription = signals.on(SIGNAL_EVENTS.SCREEN_RESIZE, (responsiveConfig) => {
            this.onResize(responsiveConfig);
        });
    }

    public playTotalWinAnimation(totalWinAmount: number): Promise<void> {
        this._totalWinAmount = totalWinAmount;

        return new Promise((resolve) => {
            this.totalWinResolver = resolve;

            if (!GameConfig.WIN_ANIMATION.winTextVisibility) {
                eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this._totalWinAmount) as string });
                resolve();
                return;
            }

            if (this.totalWinTween) {
                this.totalWinTween.kill();
                this.totalWinTween = undefined;
            }

            eventBus.emit("setWinBox", { variant: "default", amount: "0" });

            if (GameDataManager.getInstance().isFreeSpinning !== false && GameDataManager.getInstance().isAutoPlaying !== false) {
                eventBus.emit("setMessageBox", { variant: "default", message: "" });
            }

            let tweenObj = { value: 0 };
            let currentAmount = "0";

            this.totalWinTween = gsap.to(tweenObj, {
                value: totalWinAmount,
                duration: 1.5,
                ease: "power1",
                onUpdate: () => {
                    if (!this.totalWinResolver) {
                        eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this._totalWinAmount) as string });
                        gsap.killTweensOf(tweenObj);
                        this._totalWinAmount = 0;

                        return;
                    }

                    currentAmount = Helpers.convertToDecimal(Math.floor(tweenObj.value)) as string;
                    eventBus.emit("setWinBox", { variant: "default", amount: currentAmount });
                }
            });

            // Play total win text animation
            gsap.fromTo(this._winContainer.scale, { x: 0, y: 0 }, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
                    this._winText.style.fontSize = 150;
                    this._winText.text = `$${Helpers.convertToDecimal(totalWinAmount)}`;
                    this._winStrap.scale.set(1, 1);
                    this._winStrapLines.forEach((line, index) => {
                        line.scale.set(1, 1);
                        line.position.y = index === 0 ? -78 : 78;
                    });
                    this._winContainer.visible = true;
                },
                onComplete: () => {
                    gsap.to(this._winContainer.scale, {
                        x: 0, y: 0, duration: 0.25, ease: 'back.in(1.7)', delay: 1, onComplete: () => {
                            this._winContainer.visible = false;
                            this._winText.text = ``;
                            this._winText.style.fontSize = 75;
                            this._winStrap.scale.set(0.75, 0.5);
                            this._winStrapLines.forEach((line, index) => {
                                line.scale.set(0.75, 0.5);
                                line.position.y = index === 0 ? -39 : 39;
                            });

                            if (this.totalWinResolver) {
                                this.totalWinResolver();
                                this.totalWinResolver = undefined;
                            }

                            this.totalWinTween = undefined;
                        }
                    });
                }
            });
        });
    }

    public stopTotalWinAnimation(): void {
        eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(this._totalWinAmount) as string });
        this._totalWinAmount = 0;

        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            if (this.totalWinTween) {
                this.totalWinTween.kill();
                this.totalWinTween = undefined;
            }

            gsap.to(this._winContainer.scale, {
                x: 0, y: 0, duration: 0.1, ease: 'back.in(1.7)', onComplete: () => {
                    this._winText.text = ``;
                    this._winContainer.visible = false;
                    this._winText.style.fontSize = 75;
                    this._winStrap.scale.set(0.75, 0.5);
                    this._winStrapLines.forEach((line, index) => {
                        line.scale.set(0.75, 0.5);
                        line.position.y = index === 0 ? -39 : 39;
                    });

                    if (this.totalWinResolver) {
                        this.totalWinResolver();
                        this.totalWinResolver = undefined;
                    }
                }
            });
        }
    }

    public playWinTextAnimation(winAmount: number): void {
        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            // Play single win text animation
            gsap.fromTo(this._winContainer.scale, { x: 0, y: 0 }, {
                x: 1, y: 1, duration: 0.25, ease: 'back.out(1.7)', onStart: () => {
                    this._winText.text = `$${Helpers.convertToDecimal(winAmount)}`;
                    this._winContainer.visible = true;
                }
            });
        }
    }

    public stopWinTextAnimation(): void {
        if (GameConfig.WIN_ANIMATION.winTextVisibility) {
            gsap.to(this._winContainer.scale, {
                x: 0, y: 0, duration: 0.1, ease: 'back.in(1.7)', onComplete: () => {
                    this._winText.text = ``;
                    this._winContainer.visible = false;
                }
            });
        }
    }

    public playWinEventAnimation(): void {
        this._winEvent.playWinEventAnimation();
    }

    public async startTransitionAnimation(callback?: ((resolve?: () => void) => Promise<void> | void)): Promise<void> {
        this._transition.visible = true;
        await this.playAnimation("intro", false);

        if (callback) {
            if (callback.length > 0) {
                await new Promise<void>((resolve) => callback(resolve));
            } else {
                await callback();
            }
        }

        await this.playAnimation("outro", false);
    }

    private playAnimation(name: string, loop: boolean): Promise<void> {
        return new Promise((resolve) => {
            const entry = this._transition.state.setAnimation(0, name, loop);
            entry.listener = {
                complete: () => resolve()
            };
        });
    }

    public playPopupAnimation(): Promise<void> {
        return new Promise((resolve) => {
            this._popup.interactive = true;
            this._popup.cursor = 'pointer';
            this._dimmer.interactive = true;
            this._dimmer.cursor = 'pointer';

            this._popup.visible = true;
            this._dimmer.visible = true;

            const closePopup = () => {
                this._popup.interactive = false;
                this._popup.cursor = 'default';
                this._dimmer.interactive = false;
                this._dimmer.cursor = 'default';

                window.removeEventListener("keydown", onKeyDown);
                this._popup.off('pointerdown', closePopup);
                this._dimmer.off('pointerdown', closePopup);
                eventBus.off("startSpin", closePopup);
                eventBus.off("onScreenClick", closePopup);

                gsap.to([this._dimmer], {
                    alpha: 0,
                    duration: 0.4
                });
                gsap.to([this._popup.scale], {
                    x: 0,
                    y: 0,
                    duration: 0.4,
                    ease: 'back.in(1.7)',
                    onComplete: () => {
                        this._popup.visible = false;
                        this._dimmer.visible = false;
                        resolve();
                    }
                });
            };

            const onKeyDown = (e: KeyboardEvent) => {
                if (e.code === "Space") {
                    e.preventDefault();
                    closePopup();
                }
            };

            gsap.to([this._dimmer], {
                alpha: 1,
                duration: 0.4
            });
            gsap.fromTo([this._popup.scale], { x: 0, y: 0 }, {
                x: 1,
                y: 1,
                duration: 0.4,
                ease: 'back.out(1.7)',
                onComplete: () => {
                    window.addEventListener('keydown', onKeyDown);
                    this._popup.once('pointerdown', closePopup);
                    this._dimmer.once('pointerdown', closePopup);
                    eventBus.on("startSpin", closePopup);
                    eventBus.on("onScreenClick", closePopup);
                }
            });
        });
    }

    public startParticleAnimation(options: ParticleAnimationOptions): void {
        const particleList: InternalParticle[] = [];
        const rotationSpeed = options.rotationSpeed ?? 0; // dönmesin
        const gravity = options.gravity ?? 0;             // aşağı düşmesin
        const friction = options.friction ?? 1;           // hız azalmayacak

        for (let i = 0; i < options.maxCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;

            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            // sprite klonlama
            const particle =
                options.element instanceof Sprite
                    ? Sprite.from(options.element.texture)
                    : options.element instanceof Graphics
                        ? options.element.clone()
                        : options.element instanceof Spine
                            ? new Spine(options.element.skeleton.data)
                            : null;

            if (!particle) continue;

            particle.alpha = 1;
            particle.scale.set(0.2 + Math.random() * 0.3);

            console.log(particle)

            this._particleContainer.addChild(particle);

            particleList.push({
                sprite: particle,
                vx,
                vy,
                life: options.life,
                maxLife: options.maxLife,
                rotationSpeed,
                gravity,
                friction,
            });
        }

        this._particleList = particleList;

        this._particleTicker = new Ticker();
        this._particleTicker.add(this._updateParticleAnimation);
        this._particleTicker.start();
    }

    private _updateParticleAnimation = (ticker: Ticker) => {
        const delta = ticker.deltaTime;
        if (!this._particleList || this._particleList.length === 0) return;

        for (let i = this._particleList.length - 1; i >= 0; i--) {
            const p = this._particleList[i];

            // friction uygulanır (verilmediyse friction = 1 → hız değişmez)
            p.vx *= p.friction;
            p.vy = p.vy * p.friction + p.gravity;

            // pozisyon
            p.sprite.x += p.vx * delta;
            p.sprite.y += p.vy * delta;

            // rotation (verilmediyse rotationSpeed=0 → dönmez)
            p.sprite.rotation += p.rotationSpeed * delta;

            // life
            p.life--;

            // fade-out
            p.sprite.alpha = p.life / p.maxLife;

            // life biterse sil
            if (p.life <= 0) {
                this._particleContainer.removeChild(p.sprite);
                p.sprite.destroy();
                this._particleList.splice(i, 1);
            }
        }

        // tüm particle'lar bittiğinde animasyon stop
        if (this._particleList.length === 0) {
            this.stopParticleAnimation();
        }
    };

    public stopParticleAnimation(): void {
        // ticker durdur
        if (this._particleTicker) {
            this._particleTicker.stop();
            this._particleTicker.destroy();
            this._particleTicker = undefined;
        }

        // particle temizle
        for (const p of this._particleList) {
            p.sprite.parent?.removeChild(p.sprite);
            p.sprite.destroy();
        }

        this._particleList = [];
    }

    public setBonusMode(isActive: boolean): void {
        this._winLines.visible = !isActive;
    }

    private onResize(responsiveConfig: ResponsiveConfig): void {
        switch (responsiveConfig.orientation) {
            case GameConfig.ORIENTATION.landscape:
                this.position.set(0, 0);
                break;
            case GameConfig.ORIENTATION.portrait:
                this.position.set(0, -270);
                break;
        }
    }

    public getWinLines(): WinLines {
        return this._winLines;
    }

    public getWinContainer(): Container {
        return this._winContainer;
    }

    public getWinText(): Text {
        return this._winText;
    }

    public getWinEvent(): WinEvent {
        return this._winEvent;
    }

    public getPopupBackground(): Sprite {
        return this._popupBackground;
    }

    public getPopupCountText(): Text {
        return this._popupCountText;
    }

    public getPopupFreeSpinsText(): Text {
        return this._popupFreeSpinsText;
    }
}