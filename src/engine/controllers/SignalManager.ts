import { debug } from "../utils/debug";

export type SignalCallback<T = any> = (data?: T) => void;

export interface SignalSubscription {
    unsubscribe(): void;
}

export class SignalManager {
    private static instance: SignalManager;
    private listeners: Map<string, SignalCallback[]> = new Map();

    private constructor() {
        // Private constructor for singleton pattern
    }

    public static getInstance(): SignalManager {
        if (!SignalManager.instance) {
            SignalManager.instance = new SignalManager();
        }
        return SignalManager.instance;
    }

    /**
     * Subscribe to a signal
     * @param signalName - The name of the signal to listen for
     * @param callback - The callback function to execute when signal is dispatched
     * @returns SignalSubscription object with unsubscribe method
     */
    public on<T = any>(signalName: string, callback: SignalCallback<T>): SignalSubscription {
        if (!this.listeners.has(signalName)) {
            this.listeners.set(signalName, []);
        }

        const callbacks = this.listeners.get(signalName)!;
        callbacks.push(callback);

        // Return subscription object
        return {
            unsubscribe: () => {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
                
                // Clean up empty arrays
                if (callbacks.length === 0) {
                    this.listeners.delete(signalName);
                }
            }
        };
    }

    /**
     * Subscribe to a signal only once
     * @param signalName - The name of the signal to listen for
     * @param callback - The callback function to execute when signal is dispatched
     * @returns SignalSubscription object with unsubscribe method
     */
    public once<T = any>(signalName: string, callback: SignalCallback<T>): SignalSubscription {
        const subscription = this.on<T>(signalName, (data) => {
            callback(data);
            subscription.unsubscribe();
        });
        return subscription;
    }

    /**
     * Dispatch a signal to all listeners
     * @param signalName - The name of the signal to dispatch
     * @param data - Optional data to pass to listeners
     */
    public emit<T = any>(signalName: string, data?: T): void {
        const callbacks = this.listeners.get(signalName);
        if (callbacks) {
            // Create a copy of callbacks array to avoid issues if listeners are modified during iteration
            const callbacksCopy = [...callbacks];
            callbacksCopy.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    debug.error(`Error in signal listener for '${signalName}':`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for a specific signal
     * @param signalName - The name of the signal to clear
     */
    public off(signalName: string): void {
        this.listeners.delete(signalName);
    }

    /**
     * Remove all listeners for all signals
     */
    public clear(): void {
        this.listeners.clear();
    }

    /**
     * Check if a signal has any listeners
     * @param signalName - The name of the signal to check
     * @returns true if signal has listeners, false otherwise
     */
    public hasListeners(signalName: string): boolean {
        const callbacks = this.listeners.get(signalName);
        return callbacks ? callbacks.length > 0 : false;
    }

    /**
     * Get the number of listeners for a signal
     * @param signalName - The name of the signal to check
     * @returns number of listeners
     */
    public getListenerCount(signalName: string): number {
        const callbacks = this.listeners.get(signalName);
        return callbacks ? callbacks.length : 0;
    }

    /**
     * Get all signal names that have listeners
     * @returns array of signal names
     */
    public getSignalNames(): string[] {
        return Array.from(this.listeners.keys());
    }
}

// Common signal names as constants to avoid typos
export const SIGNAL_EVENTS = {
    // Reel signals
    REEL_SPIN_START: 'reel:spin:start',
    REEL_SPIN_STOP: 'reel:spin:stop',
    REEL_SPIN_COMPLETE: 'reel:spin:complete',
    ALL_REELS_STOPPED: 'reels:all:stopped',
    
    // Game signals
    GAME_START: 'game:start',
    GAME_OVER: 'game:over',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',

    // Storage signals
    REGISTRY_ITEM_CHANGE: 'storage:registry:item_change',
    
    // UI signals
    SPIN_BUTTON_CLICKED: 'ui:spin:clicked',
    BET_CHANGED: 'ui:bet:changed',
    BALANCE_UPDATED: 'ui:balance:updated',
    
    // Win signals
    WIN_CALCULATED: 'win:calculated',
    WIN_ANIMATION_START: 'win:animation:start',
    WIN_ANIMATION_COMPLETE: 'win:animation:complete',
    WIN_ANIMATION_PLAY: 'win:animation:play',
    
    // System signals
    SCREEN_RESIZE: 'system:resize',
    ASSETS_LOADED: 'system:assets:loaded',
    FULLSCREEN_CHANGE: 'system:fullscreen:change',

    // Win Event signals
    WIN_EVENT_STARTED: 'winevent:started',
    WIN_EVENT_STOPPED: 'winevent:stopped',

    // Free Spin signals
    FREE_SPIN_STARTED: 'freespin:started',
    FREE_SPIN_COMPLETED: 'freespin:completed',
    FREE_SPIN_BEFORE_SPIN: 'freespin:before_spin',
    FREE_SPIN_AFTER_SPIN: 'freespin:after_spin',
    FREE_SPIN_RETRIGGER: 'freespin:retrigger',
} as const;

// Export singleton instance for convenience
export const signals = SignalManager.getInstance(); 