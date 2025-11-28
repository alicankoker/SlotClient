import { Nexus, PlayerController, INexusPlayerData, SpinTransaction } from '@slotclient/nexus';
import { GameServer } from '@slotclient/server';
import {
    SpinResultData,
    CascadeStepData,
    GridData,
    IResponseData,
    IPayload,
    SpinController,
    SpinContainer,
    ReelsController,
    StaticContainer,
    ReelsContainer,
    GameDataManager,
    AnimationContainer,
    FreeSpinController,
    Background,
    ClassicSpinContainer,
    ClassicSpinController,
    Helpers,
    Bonus,
    AutoPlayController,
    signals,
    BackendToWinEventType,
    ISpinState,
    debug,
    SpinMode
} from '@slotclient/engine';
import { Application } from 'pixi.js';
import { GameConfig, spinContainerConfig } from '@slotclient/config/GameConfig';

export interface SlotSpinRequest {
    playerId: string;
    betAmount: number;
    gameMode?: string;
}

export interface SlotSpinResponse {
    success: boolean;
    error?: string;
    transaction?: SpinTransaction;
    gameResult?: SpinResultData;
    playerState?: INexusPlayerData;
}

export class SlotGameController {
    private static slotGameInstance: SlotGameController;
    private nexusInstance: Nexus;
    private playerController: PlayerController;
    private gameServer: GameServer;
    private app: Application;
    public spinController!: SpinController;
    public spinContainer!: SpinContainer;
    public staticContainer!: StaticContainer;
    public reelsContainer!: ReelsContainer;
    public reelsController!: ReelsController;
    public freeSpinController!: FreeSpinController;
    private autoPlayController!: AutoPlayController;
    private background!: Background;
    private animationContainer!: AnimationContainer;
    private onPlayerStateChangeCallback?: (state: INexusPlayerData) => void;
    private onSpinResultCallback?: (result: SpinResultData) => void;
    private onCascadeStepCallback?: (step: CascadeStepData) => void;
    private _isKeyHeld: boolean = false;
    private _isSpinning: boolean = false;
    private _currentSpinSpeed: number = 1;

    constructor(app: Application) {
        this.app = app;
        this.nexusInstance = Nexus.getInstance();
        this.playerController = this.nexusInstance.getPlayerController();
        this.gameServer = GameServer.getInstance();

        this.eventListeners();
    }

    public initialize(): void {
        // Create ReelsContainer first
        this.reelsContainer = new ReelsContainer(this.app);

        // Create ReelsController with the ReelsContainer
        const initialGridData = GameDataManager.getInstance().getInitialSymbols();
        debug.log('SlotGameController: Initial grid data for ReelsController:', initialGridData);
        this.reelsController = new ReelsController(this.app, initialGridData as number[][], this.reelsContainer);

        this.spinContainer = new ClassicSpinContainer(this.app, spinContainerConfig) as ClassicSpinContainer;
        this.staticContainer = new StaticContainer(this.app, {
            reelIndex: 0,
            symbolHeight: GameConfig.REFERENCE_SPRITE_SYMBOL.height,
            symbolsVisible: GameConfig.GRID_LAYOUT.visibleRows,
        }, initialGridData as number[][]);

        this.background = Background.getInstance();
        this.animationContainer = AnimationContainer.getInstance(this.app);

        this.reelsContainer.addChild(this.spinContainer);
        this.reelsContainer.addChild(this.reelsContainer.getElementsContainer()!);
        this.reelsContainer.addChild(this.staticContainer);
        this.spinContainer.mask = this.reelsContainer.getMask();
        this.staticContainer.mask = this.reelsContainer.getMask();
        this.app.stage.addChild(this.reelsContainer);

        this.spinController = new ClassicSpinController(this.spinContainer as SpinContainer, {
            reelsController: this.reelsController
        });

        this.freeSpinController = FreeSpinController.getInstance();

        this.autoPlayController = AutoPlayController.getInstance();

        this.connectControllers();
    }

    public static getInstance(): SlotGameController {
        return SlotGameController.slotGameInstance;
    }

    private connectControllers(): void {
        // Get the single containers that handle all reels
        const spinContainer = this.spinContainer;

        const staticContainer = this.staticContainer;
        if (!spinContainer) {
            debug.error('ReelsController: No SpinContainer available');
            return;
        }

        if (!staticContainer) {
            debug.error('ReelsController: No StaticContainer available');
            return;
        }
    }

    // Event handlers for the unified controller
    public onPlayerStateChange(callback: (state: INexusPlayerData) => void): void {
        this.onPlayerStateChangeCallback = callback;
    }

    public onSpinResult(callback: (result: SpinResultData) => void): void {
        this.onSpinResultCallback = callback;
    }

    public onCascadeStep(callback: (step: CascadeStepData) => void): void {
        this.onCascadeStepCallback = callback;
    }

    // Utility methods using PlayerController directly
    public getPlayerState(playerId: string): INexusPlayerData | null {
        return this.playerController.getPlayerState(playerId);
    }

    public getDefaultPlayer(): INexusPlayerData | null {
        const defaultPlayer = this.playerController.getDefaultPlayer();
        return defaultPlayer ? defaultPlayer.getPlayerState() : null;
    }

    public generateInitialGrid(): GridData {
        return this.gameServer.generateInitialGridData();
    }

    //TODO: Needs to be moved to Nexus
    public canPlayerSpin(playerId: string, betAmount: number): boolean {
        // Check both game rules and player balance using PlayerController
        return this.isValidBetAmount(betAmount) &&
            this.playerController.canPlayerAffordBet(playerId, betAmount);
    }

    //TODO: Needs to be moved to Nexus
    public getGameRules(): any {
        return {
            minBet: 0.01,
            maxBet: 100.00,
            gridSize: { columns: 5, rows: 3 },
            symbolCount: 10,
            minMatchLength: 3
        };
    }

    //TODO: Needs to be moved to Nexus
    private isValidBetAmount(betAmount: number): boolean {
        // This checks game rules, not player balance
        const minBet = 0.01;
        const maxBet = 100.00;
        return betAmount >= minBet && betAmount <= maxBet;
    }

    //TODO: Needs to be moved to Nexus
    public calculateTheoreticalWin(betAmount: number): number {
        // This could be used for RTP calculations or bet validation
        // For now, just return a simple calculation
        return betAmount * 0.96; // 96% RTP example
    }

    //TODO: Needs to be moved to Nexus
    public getPlayerTransactions(playerId: string, limit: number = 10): any[] {
        return this.nexusInstance.getPlayerTransactions(playerId, limit);
    }

    private eventListeners(): void {
        signals.on("executeSpin", () => {
            GameDataManager.getInstance().isSpinning = true;
            this.spinController.executeSpin();
        });

        signals.on("allReelsLanded", async () => {
            GameDataManager.getInstance().isSpinning = false;
            this.reelsContainer.setChainAnimation(false, false);
            await this.onAllReelsStopped();
        });

        signals.on("afterSpin", async (response) => {
            await this.onSpinComplete(response);

            signals.emit("spinCompleted", response);
        });

        signals.on('startSpin', async () => {
            if (this.reelsController && this.reelsController.getStaticContainer()?.isPlaying === true) {
                this.reelsController.skipWinAnimations();
            }
        });

        signals.on("stopSpin", () => {
            if (
                this.spinController &&
                this.spinController.getIsSpinning() &&
                (this.spinController.getSpinMode() === GameConfig.SPIN_MODES.NORMAL || this.freeSpinController.isRunning === true) &&
                GameConfig.FORCE_STOP.enabled
            ) {
                this.spinController.forceStop();
            }
        });

        signals.on("startAutoPlay", async (autoSpinCount) => {
            if (
                this.spinController &&
                this.spinController.getIsSpinning() === false &&
                this.autoPlayController.isRunning === false &&
                this.animationContainer.getWinEvent().isWinEventActive === false &&
                this.freeSpinController.isRunning === false &&
                Bonus.instance().isActive === false
            ) {
                await this.autoPlayController.startAutoPlay(autoSpinCount);
            }
        });

        signals.on("stopAutoPlay", () => {
            if (
                this.spinController &&
                this.autoPlayController.isRunning &&
                this.autoPlayController.autoPlayCount > 0
            ) {
                this.autoPlayController.stopAutoPlay();
            }
        });

        signals.on("spinCompleted", () => {
            this._isSpinning = false;
            this._isKeyHeld = false;

            // Restore the last set spin speed
            this.setSpinSpeed(this._currentSpinSpeed);

            if (this.freeSpinController.isRunning === false) {
                signals.emit("setBatchComponentState", {
                    componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton', 'settingsButton', 'creditButton', 'spinButton'],
                    stateOrUpdates: { disabled: false }
                });
            }
        });

        signals.on("setSpinSpeed", (phase) => {
            this._currentSpinSpeed = phase; // Save the current spin speed
            this.setSpinSpeed(phase);
        });

        window.addEventListener("keyup", (event) => {
            if (event.code === "Space") this._isKeyHeld = false;
        });

        window.addEventListener("blur", () => {
            this._isKeyHeld = false;
        });

        const spin = async () => {
            if (this.spinController &&
                this.spinController.getIsSpinning() === false &&
                this.animationContainer.getWinEvent().isWinEventActive === false &&
                this.autoPlayController.isRunning === false &&
                this.freeSpinController.isRunning === false &&
                Bonus.instance().isActive === false
            ) {
                this._isSpinning = true;
                this.nexusInstance.progressSpin('spin');
            }
        }

        window.addEventListener("keydown", async (event: KeyboardEvent) => {
            switch (event.code) {
                case "Space":
                    if (this.reelsController && this.reelsController.getStaticContainer()?.isPlaying === true) {
                        this.reelsController.skipWinAnimations();
                    }

                    if (
                        this.spinController &&
                        this.spinController.getIsSpinning() &&
                        (this.spinController.getSpinMode() === GameConfig.SPIN_MODES.NORMAL || this.freeSpinController.isRunning === true) &&
                        GameConfig.FORCE_STOP.enabled
                    ) {
                        this.spinController.forceStop();
                    }

                    if (this._isKeyHeld || this._isSpinning) return;

                    this._isKeyHeld = true;

                    await spin();
                    break;
            }
        });
    }

    private setSpinSpeed(phase: number): void {
        switch (phase) {
            case 1:
                if (this.spinController) {
                    this.spinController.setSpinMode(GameConfig.SPIN_MODES.NORMAL as SpinMode);
                }
                break;
            case 2:
                if (this.spinController) {
                    this.spinController.setSpinMode(GameConfig.SPIN_MODES.FAST as SpinMode);
                }
                break;
            case 3:
                if (this.spinController) {
                    this.spinController.setSpinMode(GameConfig.SPIN_MODES.TURBO as SpinMode);
                }
                break;
        }
    }

    private async onAllReelsStopped(): Promise<void> {
        const response: IResponseData = GameDataManager.getInstance().getResponseData();
        this.spinController.setState(ISpinState.IDLE)
        FreeSpinController.getInstance().isRunning === false && (FreeSpinController.getInstance().isRunning = GameDataManager.getInstance().checkFreeSpins());
        Bonus.instance().isActive = (response as IResponseData).bonus !== undefined ? true : false;

        signals.emit('setComponentState', {
            componentName: 'spinButton',
            stateOrUpdates: 'default',
        });

        if (GameConfig.WIN_EVENT.enabled && (response as IResponseData).winEventType !== 'normal') {
            const winAmount = (response as IResponseData).totalWin;
            const backendType = (response as IResponseData).winEventType;
            const enumType = BackendToWinEventType[backendType]!;

            signals.emit("hideUI");
            await this.animationContainer.playWinEventAnimation(winAmount, enumType);
            signals.emit("showUI");
        }

        const isSkipped = GameDataManager.getInstance().isWinAnimationSkipped && ((AutoPlayController.getInstance().isRunning && AutoPlayController.getInstance().autoPlayCount > 0) || (FreeSpinController.getInstance().isRunning === true));
        GameConfig.WIN_ANIMATION.enabled && await this.reelsController.setupWinAnimation(isSkipped);

        signals.emit("setBalance", (response as IResponseData).balance.after);

        signals.emit("afterSpin", response);
    }

    private async onSpinComplete(response: IResponseData): Promise<void> {
        if (response.freeSpin && GameDataManager.getInstance().checkFreeSpins() && response.freeSpin.playedRounds === 0) {
            await this.startFreeSpinState(response.freeSpin.totalRounds, response.freeSpin.totalRounds, response.totalWin);
        } else if (response.bonus && GameDataManager.getInstance().checkBonus()) {
            await this.startBonusState();
        }

        if (this.autoPlayController.isRunning && (GameConfig.AUTO_PLAY.stopOnWin || GameConfig.AUTO_PLAY.stopOnFeature)) {
            this.autoPlayController.stopAutoPlay();
        }

        if (this.autoPlayController.isRunning && FreeSpinController.getInstance().isRunning === false && Bonus.instance().isActive === false) {
            this.autoPlayController.continueAutoPlay();
        }

        return;
    }

    public async startFreeSpinState(totalRounds: number, remainRounds: number, initialWin: number): Promise<void> {
        this.freeSpinController.isRunning = true;
        this.staticContainer.allowLoop = false;
        this.staticContainer.isFreeSpinMode = true;
        this.reelsContainer.isFreeSpinMode = true;

        await this.animationContainer.startTransitionAnimation(() => {
            this.reelsContainer.setFreeSpinMode(true);
            this.background.setFreeSpinMode(true);
            this.animationContainer.getWinLines().setFreeSpinMode(true);

            signals.emit("setBatchComponentState", {
                componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton', 'settingsButton', 'creditButton'],
                stateOrUpdates: { disabled: true }
            });
            signals.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(initialWin) as string });
            signals.emit("setMessageBox", { variant: "freeSpin", message: remainRounds.toString() });
        });

        this.animationContainer.getPopupCountText().setText(`${remainRounds}`);
        this.animationContainer.getPopupContentText().text = `FREESPINS`;
        await this.animationContainer.playPopupAnimation();

        const { totalWin, freeSpinCount } = await this.executeFreeSpin(totalRounds, remainRounds, initialWin);

        this.animationContainer.getPopupCountText().setText(`$ ${Helpers.convertToDecimal(totalWin)}`);
        this.animationContainer.getPopupContentText().text = `IN ${freeSpinCount} FREESPINS`;
        await this.animationContainer.playPopupAnimation();

        await this.animationContainer.startTransitionAnimation(() => {
            if (this.autoPlayController.isRunning) {
                signals.emit("setBatchComponentState", {
                    componentNames: ['autoplayButton', 'mobileAutoplayButton'],
                    stateOrUpdates: { disabled: false }
                });
            } else {
                signals.emit("setBatchComponentState", {
                    componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton', 'settingsButton', 'creditButton'],
                    stateOrUpdates: { disabled: false }
                });
            }
            this.reelsContainer.setFreeSpinMode(false);
            this.background.setFreeSpinMode(false);
            this.animationContainer.getWinLines().setFreeSpinMode(false);
        });

        this.freeSpinController.isRunning = false;
        this.staticContainer.allowLoop = true;
        this.staticContainer.isFreeSpinMode = false;
        this.reelsContainer.isFreeSpinMode = false;
    }

    public async executeFreeSpin(totalRounds: number, remainRounds: number, initialWin: number): Promise<{ totalWin: number, freeSpinCount: number }> {
        return await this.freeSpinController.executeFreeSpin(totalRounds, remainRounds, initialWin);
    }

    public async startBonusState(): Promise<void> {
        signals.emit("hideUI");
        Bonus.instance().isActive = true;
        await this.staticContainer.playHighlightSymbols(GameDataManager.getInstance().getResponseData().bonus?.positions!);
        await this.animationContainer.startTransitionAnimation(() => {
            this.animationContainer.setBonusMode(true);
            Bonus.instance().visible = true;
        });

        Bonus.instance().setOnBonusCompleteCallback(async () => {
            this.animationContainer.setBonusMode(false);
            Bonus.instance().isActive = false;
            signals.emit("setBalance", GameDataManager.getInstance().getLastSpinResult()!.balance.after);
            signals.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(GameDataManager.getInstance().getResponseData().bonus?.history[0].featureWin!) as string });
            signals.emit("showUI");

            if (this.autoPlayController.isRunning && FreeSpinController.getInstance().isRunning === false && Bonus.instance().isActive === false) {
                setTimeout(() => {
                    this.autoPlayController.continueAutoPlay();
                }, GameConfig.AUTO_PLAY.delay || 1000);
            }
        });
    }

    //TODO: Needs to be moved to Nexus
    // For demo purposes - method to add balance using PlayerController
    public addPlayerBalance(playerId: string, amount: number): boolean {
        const player = this.playerController.getPlayerState(playerId);
        if (!player) return false;

        const success = this.playerController.updatePlayerBalance(playerId, player.balance + amount);

        if (success && this.onPlayerStateChangeCallback) {
            const updatedState = this.playerController.getPlayerState(playerId);
            if (updatedState) {
                this.onPlayerStateChangeCallback(updatedState);
            }
        }

        return success;
    }

    public getFreeSpinController(): FreeSpinController {
        return this.freeSpinController;
    }

    public getAutoPlayController(): AutoPlayController {
        return this.autoPlayController;
    }
}