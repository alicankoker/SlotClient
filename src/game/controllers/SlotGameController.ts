import { Nexus } from '../../nexus/Nexus';
import { PlayerController } from '../../nexus/player/PlayerController';
import { GameServer } from '../../server/GameServer';
import { SpinResultData, CascadeStepData, GridData, IResponseData, IPayload } from '../../engine/types/ICommunication';
import { INexusPlayerData, SpinTransaction } from '../../nexus/NexusInterfaces';
import { debug } from '../../engine/utils/debug';
import { SpinController } from '../../engine/Spin/SpinController';
import { SpinContainer } from '../../engine/Spin/SpinContainer';
import { ReelsController } from '../../engine/reels/ReelsController';
import { Application } from 'pixi.js/lib/app/Application';
import { GameConfig, spinContainerConfig } from '../../config/GameConfig';
import { StaticContainer } from '../../engine/reels/StaticContainer';
import { ReelsContainer } from '../../engine/reels/ReelsContainer';
import { GameDataManager } from '../../engine/data/GameDataManager';
import { AnimationContainer } from '../../engine/components/AnimationContainer';
import { FreeSpinController } from '../../engine/freeSpin/FreeSpinController';
import { Background } from '../../engine/components/Background';
import { ClassicSpinContainer } from '../../engine/Spin/classicSpin/ClassicSpinContainer';
import { ClassicSpinController } from '../../engine/Spin/classicSpin/ClassicSpinController';
import { Helpers } from '../../engine/utils/Helpers';
import { eventBus } from '../../communication/EventManagers/WindowEventManager';
import { Bonus } from '../../engine/components/Bonus';
import { AutoPlayController } from '../../engine/AutoPlay/AutoPlayController';
import { signals } from '../../engine/controllers/SignalManager';
import { BackendToWinEventType } from '../../engine/types/IWinEvents';
import { ISpinState } from '../../engine/types/ISpinConfig';

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
        this.animationContainer = AnimationContainer.getInstance();

        this.reelsContainer.addChild(this.spinContainer);
        this.reelsContainer.addChild(this.reelsContainer.getElementsContainer()!);
        this.reelsContainer.addChild(this.staticContainer);
        this.spinContainer.mask = this.reelsContainer.getMask();
        this.staticContainer.mask = this.reelsContainer.getMask();
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
            console.log("All reels landed");
            this.reelsContainer.setChainAnimation(false, false);
            await this.onAllReelsStopped();
        });

        signals.on("afterSpin", async (response) => {
            console.log("After spin");
            await this.onSpinComplete(response);

            signals.emit("spinCompleted", response);
        });
    }

    // Convenience method for executing spins
    public async executeGameSpin(action: IPayload["action"]): Promise<void> {
        const response: IResponseData = await this.gameServer.processRequest(action);

        eventBus.emit("setSpinId", response._id.toString());
        eventBus.emit("setBalance", response.balance.before);

        if (this.spinController && response) {
            await this.spinController.executeSpin();
        }
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

        if (GameConfig.WIN_EVENT.enabled && (response as IResponseData).winEventType !== 'normal') {
            const winAmount = (response as IResponseData).totalWin;
            const backendType = (response as IResponseData).winEventType;
            const enumType = BackendToWinEventType[backendType]!;

            eventBus.emit("hideUI");
            await AnimationContainer.getInstance().playWinEventAnimation(winAmount, enumType);
            eventBus.emit("showUI");
        }

        const isSkipped = GameDataManager.getInstance().isWinAnimationSkipped && ((AutoPlayController.instance().isRunning && AutoPlayController.instance().autoPlayCount > 0) || (FreeSpinController.instance().isRunning === true));
        GameConfig.WIN_ANIMATION.enabled && await this.reelsController.setupWinAnimation(isSkipped);

        eventBus.emit("setBalance", (response as IResponseData).balance.after);

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

        if (this.autoPlayController.isRunning && FreeSpinController.instance().isRunning === false && Bonus.instance().isActive === false) {
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

            eventBus.emit("setBatchComponentState", { componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton'], stateOrUpdates: { disabled: true } });
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
            eventBus.emit("setBatchComponentState", { componentNames: ['mobileBetButton', 'betButton', 'autoplayButton', 'mobileAutoplayButton'], stateOrUpdates: { disabled: false } });
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
        eventBus.emit("hideUI");
        Bonus.instance().isActive = true;
        await this.staticContainer.playHighlightSymbols(GameDataManager.getInstance().getResponseData().bonus?.positions!);
        await this.animationContainer.startTransitionAnimation(() => {
            this.animationContainer.setBonusMode(true);
            Bonus.instance().visible = true;
        });

        Bonus.instance().setOnBonusCompleteCallback(async () => {
            this.animationContainer.setBonusMode(false);
            Bonus.instance().isActive = false;
            eventBus.emit("setBalance", GameDataManager.getInstance().getLastSpinResult()!.balance.after);
            eventBus.emit("setWinBox", { variant: "default", amount: Helpers.convertToDecimal(GameDataManager.getInstance().getResponseData().bonus?.history[0].featureWin!) as string });
            eventBus.emit("showUI");

            if (this.autoPlayController.isRunning && FreeSpinController.instance().isRunning === false && Bonus.instance().isActive === false) {
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