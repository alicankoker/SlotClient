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
    GameDataManager,
    FreeSpinController,
    ClassicSpinContainer,
    ClassicSpinController,
    Helpers,
    AutoPlayController,
    signals,
    BackendToWinEventType,
    ISpinState,
    debug,
    SIGNAL_EVENTS
} from '@slotclient/engine';
import { Application } from 'pixi.js';
import { GameConfig, spinContainerConfig } from '../configs/GameConfig';
import { eventBus } from '@slotclient/types';
import { ISlotGameController } from '@slotclient/types/ISlotGameController';
import { Background } from '../components/Background';
import { AnimationContainer } from '../components/AnimationContainer';
import { Bonus } from '../components/Bonus';
import { WinConfig } from '@slotclient/engine/types/IWinPresentation';
import { WinLines } from '../components/WinLines';
import { ReelsContainer } from '../components/ReelsContainer';

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

export class SlotGameController implements ISlotGameController {
    private static slotGameInstance: SlotGameController;
    private gameConfig: GameConfig;
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
    private winLines!: WinLines;
    private onPlayerStateChangeCallback?: (state: INexusPlayerData) => void;
    private onSpinResultCallback?: (result: SpinResultData) => void;
    private onCascadeStepCallback?: (step: CascadeStepData) => void;

    constructor(app: Application) {
        this.app = app;
        this.gameConfig = GameConfig.getInstance();
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
        this.spinContainer.position.set(0, 14);
        this.staticContainer = new StaticContainer(this.app, {
            reelIndex: 0,
            symbolHeight: this.gameConfig.REFERENCE_SPRITE_SYMBOL.height,
            symbolsVisible: this.gameConfig.GRID_LAYOUT.visibleRows,
        }, initialGridData as number[][]);
        this.staticContainer.position.set(0, 10);

        this.background = Background.instance();
        this.animationContainer = AnimationContainer.getInstance(this.app);
        this.winLines = WinLines.getInstance();

        this.reelsContainer.setSpinContainer(this.spinContainer);
        this.reelsContainer.addChild(this.reelsContainer.getElementsContainer()!);
        this.reelsContainer.setStaticContainer(this.staticContainer);
        this.spinContainer.mask = this.reelsContainer.getMask();
        this.app.stage.addChild(this.reelsContainer);

        this.spinController = new ClassicSpinController(this.spinContainer as SpinContainer, {
            reelsController: this.reelsController
        });

        this.freeSpinController = FreeSpinController.getInstance(this);

        this.autoPlayController = AutoPlayController.getInstance(this, this.reelsController);

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
        signals.on("allReelsLanded", async () => {
            await this.onAllReelsStopped();
        });

        signals.on("afterSpin", async (response) => {
            await this.onSpinComplete(response);

            this.background.stopElementsSpinAnimation();
            this.reelsContainer.stopElementsSpinAnimation();
            signals.emit("spinCompleted", response);
        });

        signals.on(SIGNAL_EVENTS.WIN_ANIMATION_TOTAL_PLAY, () => { // or use WIN_ANIMATION_TOTAL_PLAY_COMPLETE for just once
            this.reelsContainer.playElementsWinAnimation();
        });

        signals.on(SIGNAL_EVENTS.WIN_ANIMATION_TOTAL_PLAY_COMPLETE, () => {
            this.reelsContainer.stopElementsWinAnimation();
        });

        signals.on(SIGNAL_EVENTS.FREE_SPIN_RETRIGGER, async (extra) => {
            if (extra !== undefined) {
                await this.playScatterHighlightAnimation();

                signals.emit("scatterRetriggered", extra);
            }
        });
    }

    // Convenience method for executing spins
    public async executeGameSpin(action: IPayload["action"]): Promise<void | boolean> {
        const balance: number = GameDataManager.getInstance().getResponseData()?.balance.after ?? GameDataManager.getInstance().getInitialData()!.balance ?? 0;
        const betValues: number[] = GameDataManager.getInstance().getBetValues();
        const betValueIndex: number = GameDataManager.getInstance().getBetValueIndex();
        const line: number = GameDataManager.getInstance().getCurrentLine();
        const bet: number = betValues[betValueIndex] * line;

        if ((balance - bet) < 0) {
            for (let betIndex = betValues.length - 1; betIndex >= 0; betIndex--) {
                const betValue = betValues[betIndex];

                const adjustedBet = betValue * line;

                if (balance - adjustedBet >= 0) {
                    GameDataManager.getInstance().setBetValueIndex(betIndex);

                    eventBus.emit("setBetValueIndex", betIndex);
                    eventBus.emit("showToast", { type: "info", message: "Bet adjusted due to insufficient balance!" });
                    eventBus.emit("setMessageBox");

                    signals.emit("spinCompleted");

                    return false;
                }
            }

            eventBus.emit("showToast", { type: "warning", message: "Insufficient Balance to place a spin!" });
            eventBus.emit("setMessageBox");

            signals.emit("spinCompleted");

            return false;
        } else {
            const response: IResponseData = await this.gameServer.processRequest(action);

            eventBus.emit("setSpinId", response._id.toString());
            eventBus.emit("setBalance", response.balance.before);

            if (this.spinController && response) {
                if (this.autoPlayController.isRunning) {
                    eventBus.emit("setBatchComponentState", {
                        componentNames: ['mobileBetButton', 'betButton', 'settingsButton', 'creditButton'],
                        stateOrUpdates: { disabled: true }
                    });
                } else {
                    eventBus.emit("setBatchComponentState", {
                        componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton', 'settingsButton', 'creditButton'],
                        stateOrUpdates: { disabled: true }
                    });
                }

                this.resetWinAnimations();
                this.winLines.hideAllLines();
                this.background.playElementsSpinAnimation();
                this.reelsContainer.playElementsSpinAnimation();
                await this.spinController.executeSpin();
            }
        }
    }

    public forceStop(): void {
        this.spinController.forceStop();
    }

    private async onAllReelsStopped(): Promise<void> {
        const response: IResponseData = GameDataManager.getInstance().getResponseData();
        this.spinController.setState(ISpinState.IDLE)
        FreeSpinController.instance().isRunning === false && (FreeSpinController.instance().isRunning = GameDataManager.getInstance().checkFreeSpins());
        Bonus.instance().isActive = (response as IResponseData).bonus !== undefined ? true : false;

        eventBus.emit('setComponentState', {
            componentName: 'spinButton',
            stateOrUpdates: 'default',
        });

        if (this.gameConfig.WIN_EVENT.enabled && (response as IResponseData).winEventType !== 'normal') {
            const winAmount = (response as IResponseData).totalWin;
            const backendType = (response as IResponseData).winEventType;
            const enumType = BackendToWinEventType[backendType]!;

            eventBus.emit("hideUI");
            await this.animationContainer.playWinEventAnimation(winAmount, enumType);
            eventBus.emit("showUI");
        }

        const isSkipped = GameDataManager.getInstance().isWinAnimationSkipped && ((AutoPlayController.instance().isRunning && AutoPlayController.instance().autoPlayCount > 0) || (FreeSpinController.instance().isRunning === true));
        this.gameConfig.WIN_ANIMATION.enabled && await this.setupWinAnimation(isSkipped);

        eventBus.emit("setBalance", (response as IResponseData).balance.after);

        signals.emit("afterSpin", response);
    }

    private async onSpinComplete(response: IResponseData): Promise<void> {
        if (response.freeSpin && GameDataManager.getInstance().checkFreeSpins() && response.freeSpin.playedRounds === 0) {
            this.reelsContainer.playElementsScatterAnimation();
            await this.startFreeSpinState(response.freeSpin.totalRounds, response.freeSpin.totalRounds, response.totalWin);
        } else if (response.bonus && GameDataManager.getInstance().checkBonus()) {
            await this.startBonusState();
        }

        if (this.autoPlayController.isRunning && (this.gameConfig.AUTO_PLAY.stopOnWin || this.gameConfig.AUTO_PLAY.stopOnFeature)) {
            this.autoPlayController.stopAutoPlay();
        }

        if (this.autoPlayController.isRunning && FreeSpinController.instance().isRunning === false && Bonus.instance().isActive === false) {
            this.autoPlayController.continueAutoPlay();
        }

        return;
    }

    public async startFreeSpinState(totalRounds: number, remainRounds: number, initialWin: number): Promise<void> {
        this.freeSpinController.isRunning = true;
        this.staticContainer.allowLoop = false;
        this.staticContainer.isFreeSpinMode = true;

        await this.playScatterHighlightAnimation();
        
        this.reelsContainer.isFreeSpinMode = true;

        await this.animationContainer.startTransitionAnimation(() => {
            this.reelsContainer.setFreeSpinMode(true);
            this.background.setFreeSpinMode(true);
            this.winLines.setFreeSpinMode(true);

            eventBus.emit("setBatchComponentState", {
                componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton', 'settingsButton', 'creditButton'],
                stateOrUpdates: { disabled: true }
            });
            eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(initialWin) as string });
            eventBus.emit("setMessageBox", { variant: "freeSpin", message: remainRounds.toString() });
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
                eventBus.emit("setBatchComponentState", {
                    componentNames: ['autoplayButton', 'mobileAutoplayButton'],
                    stateOrUpdates: { disabled: false }
                });
            } else {
                eventBus.emit("setBatchComponentState", {
                    componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton', 'settingsButton', 'creditButton'],
                    stateOrUpdates: { disabled: false }
                });
            }
            this.reelsContainer.setFreeSpinMode(false);
            this.background.setFreeSpinMode(false);
            this.winLines.setFreeSpinMode(false);
        });

        this.freeSpinController.isRunning = false;
        this.staticContainer.allowLoop = true;
        this.staticContainer.isFreeSpinMode = false;
        this.reelsContainer.isFreeSpinMode = false;
    }

    private async playScatterHighlightAnimation(): Promise<void> {
        if (GameDataManager.getInstance().getResponseData() === undefined || GameDataManager.getInstance().getResponseData().reels === undefined) {
            return;
        }

        const reels: number[][] = GameDataManager.getInstance().getResponseData().reels;
        const scatterPositions: number[][] = reels.map(reel => {
            const positions: number[] = [];

            for (let i = 0; i < reel.length; i++) {
                if (reel[i] === 8) positions.push(i);
            }

            return positions.length > 0 ? positions : [-1];
        });
        this.reelsContainer.playElementsScatterAnimation();
        await this.staticContainer.playHighlightSymbols(scatterPositions);
    }

    public async executeFreeSpin(totalRounds: number, remainRounds: number, initialWin: number): Promise<{ totalWin: number, freeSpinCount: number }> {
        return await this.freeSpinController.executeFreeSpin(totalRounds, remainRounds, initialWin);
    }

    public async startBonusState(): Promise<void> {
        eventBus.emit("hideUI");
        Bonus.instance().isActive = true;
        this.staticContainer.isBonusMode = true;

        this.reelsContainer.playElementsBonusAnimation();
        await this.staticContainer.playHighlightSymbols(GameDataManager.getInstance().getResponseData().bonus?.positions!);

        await this.animationContainer.startTransitionAnimation(() => {
            this.animationContainer.setBonusMode(true);
            Bonus.instance().visible = true;
        });

        Bonus.instance().setOnBonusCompleteCallback(async () => {
            this.animationContainer.setBonusMode(false);
            this.staticContainer.isBonusMode = false;
            Bonus.instance().isActive = false;
            eventBus.emit("setBalance", GameDataManager.getInstance().getLastSpinResult()!.balance.after);
            eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(GameDataManager.getInstance().getResponseData().bonus?.history[0].featureWin!) as string });
            eventBus.emit("showUI");

            if (this.autoPlayController.isRunning && FreeSpinController.instance().isRunning === false && Bonus.instance().isActive === false) {
                setTimeout(() => {
                    this.autoPlayController.continueAutoPlay();
                }, this.gameConfig.AUTO_PLAY.delay || 1000);
            }
        });
    }

    /**
     * @description Play a random win animation.
     * @param isSkipped Whether the animation is skipped.
     */
    public async setupWinAnimation(isSkipped: boolean = false): Promise<void> {
        // set win display datas
        const spinResultData = GameDataManager.getInstance().getLastSpinResult();
        let winConfigs: WinConfig[] = [];

        if (spinResultData?.ws.length! <= 0) {
            if (FreeSpinController.instance().isRunning === false && AutoPlayController.instance().isRunning === false) {
                eventBus.emit("setMessageBox", { variant: "default", message: "PLACE YOUR BET" });
            }

            this.resetWinAnimations();
            return;
        }

        if (spinResultData) {
            for (const winData of spinResultData.ws) {
                const winConfig: WinConfig = {
                    symbolIds: winData.positions,
                    line: winData.line,
                    amount: winData.payout,
                    multiplier: Math.max(1, Math.floor(Math.random() * 5))
                }

                winConfigs.push(winConfig);
            }
        }

        const staticContainer = this.reelsContainer.getStaticContainer();

        if (this.winLines && this.gameConfig.WIN_ANIMATION.winlineVisibility) {
            this.winLines.visible = true;
        }

        const winDatas = [...winConfigs];
        const amount = winConfigs.reduce((sum, win) => sum + win.amount, 0);
        const lines = winConfigs.map(win => win.line);

        eventBus.emit("onWin", amount);

        // Play the win animations. If skipped, play the skipped animation, otherwise play the full animation.
        if (isSkipped) {
            await staticContainer?.playSkippedWinAnimation(amount, lines);
        } else {
            await staticContainer?.setupAnimation(winDatas);
        }
    }

    /**
     * @description Skip all win animations.
     */
    public skipWinAnimations(): void {
        AnimationContainer.instance().stopTotalWinAnimation();
        this.reelsContainer.getStaticContainer()?.skipWinAnimations();
    }

    /**
     * @description Reset all win animations.
     */
    public resetWinAnimations(): void {
        if (!this.reelsContainer) {
            debug.warn(
                "ReelsController: reelsContainer not set, skipping resetWinAnimations"
            );
            return;
        }

        const animationContainer = AnimationContainer.instance();

        animationContainer.stopWinTextAnimation();

        const staticContainer = this.reelsContainer.getStaticContainer();

        staticContainer?.resetWinAnimations();
    }

    public getFreeSpinController(): FreeSpinController {
        return this.freeSpinController;
    }

    public getAutoPlayController(): AutoPlayController {
        return this.autoPlayController;
    }
}