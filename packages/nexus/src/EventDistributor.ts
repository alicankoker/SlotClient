import { eventBus, eventType } from '@slotclient/types';
import { signals } from "@slotclient/engine/controllers/SignalManager";
import { debug } from '@slotclient/engine/utils/debug';

export type EventDirection = 'UI_TO_ENGINE' | 'ENGINE_TO_UI' | 'BI_DIRECTIONAL' | 'INTERNAL';

export interface EventMetadata {
    source: string;
    timestamp: number;
    direction: EventDirection;
    validated: boolean;
}

interface EventRoute {
    direction: EventDirection;
    target: string;
    transform?: (data: any) => any;
}

export class EventDistributor {
    private static instance: EventDistributor;
    private eventLog: Map<string, EventMetadata[]> = new Map();
    private processingEvents: Set<string> = new Set();

    // Event routing configuration
    private eventRoutes: Record<string, EventRoute> = {
        // ==================== UI to Engine events ====================
        'startSpin': { direction: 'UI_TO_ENGINE', target: 'spin' },
        'stopSpin': { direction: 'UI_TO_ENGINE', target: 'spin' },
        'startAutoPlay': { direction: 'UI_TO_ENGINE', target: 'autoplay' },
        'stopAutoPlay': { direction: 'UI_TO_ENGINE', target: 'autoplay' },
        'setSpinSpeed': { direction: 'UI_TO_ENGINE', target: 'speed' },
        'skipWin': { direction: 'UI_TO_ENGINE', target: 'win' },
        'onScreenClick': { direction: 'UI_TO_ENGINE', target: 'screen' },

        // ==================== Bi-Directional events ====================
        // This events can be sent from both UI and Engine
        'setVolume': { direction: 'BI_DIRECTIONAL', target: 'audio' },
        'setBetValueIndex': { direction: 'BI_DIRECTIONAL', target: 'bet' },
        'setLine': { direction: 'BI_DIRECTIONAL', target: 'lines' },

        // ==================== Engine to UI events ====================
        'setBalance': { direction: 'ENGINE_TO_UI', target: 'balance' },
        'setBetValues': { direction: 'ENGINE_TO_UI', target: 'bet' },
        'showErrorPopup': { direction: 'ENGINE_TO_UI', target: 'popup' },
        'setBatchComponentState': { direction: 'ENGINE_TO_UI', target: 'componentState' },
        'setComponentState': { direction: 'ENGINE_TO_UI', target: 'componentState' },
        'setMessageBox': { direction: 'ENGINE_TO_UI', target: 'messageBox' },
        'setWinBox': { direction: 'ENGINE_TO_UI', target: 'winBox' },
        'onWin': { direction: 'ENGINE_TO_UI', target: 'win' },
        'setPaytable': { direction: 'ENGINE_TO_UI', target: 'paytable' },
        'setMaxLine': { direction: 'ENGINE_TO_UI', target: 'lines' },
        'closeWrapperLoading': { direction: 'ENGINE_TO_UI', target: 'loading' },
        'showUI': { direction: 'ENGINE_TO_UI', target: 'ui' },
        'hideUI': { direction: 'ENGINE_TO_UI', target: 'ui' },
        'showToast': { direction: 'ENGINE_TO_UI', target: 'toast' }
    };

    private constructor() {
        this.setupEventListeners();
        debug.log('EventDistributor: Initialized with bi-directional support');
    }

    public static getInstance(): EventDistributor {
        if (!EventDistributor.instance) {
            EventDistributor.instance = new EventDistributor();
        }
        return EventDistributor.instance;
    }

    private setupEventListeners(): void {
        this.setupUIToEngineListeners();
        this.setupEngineToUIListeners();
        this.setupBiDirectionalListeners();
    }

    private setupUIToEngineListeners(): void {
        const uiToEngineEvents: (keyof eventType)[] = [
            'startSpin',
            'stopSpin',
            'startAutoPlay',
            'stopAutoPlay',
            'setSpinSpeed',
            'skipWin',
            'onScreenClick'
        ];

        uiToEngineEvents.forEach(eventName => {
            eventBus.on(eventName, (data: eventType | undefined) => {
                this.distributeEvent(eventName, data, 'UI_TO_ENGINE');
            });
        });
    }

    private setupEngineToUIListeners(): void {
        const engineToUIEvents: (keyof eventType)[] = [
            'setBalance',
            'setBetValues',
            'showErrorPopup',
            'setBatchComponentState',
            'setComponentState',
            'setMessageBox',
            'setWinBox',
            'onWin',
            'setPaytable',
            'setMaxLine',
            'closeWrapperLoading',
            'showUI',
            'hideUI',
            'showToast'
        ];

        engineToUIEvents.forEach(eventName => {
            signals.on(eventName, (data: eventType | undefined) => {
                this.distributeEvent(eventName, data, 'ENGINE_TO_UI');
            });
        });
    }

    private setupBiDirectionalListeners(): void {
        // Bi-directional events: can go both ways
        const biDirectionalEvents: (keyof eventType)[] = [
            'setVolume',
            'setBetValueIndex',
            'setBalance',
        ];

        // Listen from UI side
        biDirectionalEvents.forEach(eventName => {
            eventBus.on(eventName, (data: eventType | undefined) => {
                // Mark as coming from UI
                this.distributeEvent(eventName, data, 'UI_TO_ENGINE');
            });
        });

        // Listen from Engine side
        biDirectionalEvents.forEach(eventName => {
            signals.on(eventName, (data: eventType | undefined) => {
                // Mark as coming from Engine
                this.distributeEvent(eventName, data, 'ENGINE_TO_UI');
            });
        });
    }

    private distributeEvent<K extends keyof eventType>(
        eventName: K | string,
        data: eventType | undefined,
        actualDirection: EventDirection
    ): void {
        // For bi-directional events, use the actual direction passed in
        const eventKey = `${actualDirection}:${eventName}`;
        if (this.processingEvents.has(eventKey)) {
            debug.warn(`EventDistributor: Circular event detected [${eventName}], skipping`);
            return;
        }

        this.processingEvents.add(eventKey);

        try {
            const metadata: EventMetadata = {
                source: actualDirection === 'UI_TO_ENGINE' ? 'UI' : 'Engine',
                timestamp: Date.now(),
                direction: actualDirection,
                validated: false
            };

            metadata.validated = true;
            const transformedData = this.transformEvent(eventName as string, data);
            this.logEvent(eventName as string, metadata);
            this.routeEvent(eventName, transformedData, actualDirection);
        } finally {
            setTimeout(() => {
                this.processingEvents.delete(eventKey);
            }, 100);
        }
    }

    private transformEvent(eventName: string, data: any): any {
        const route = this.eventRoutes[eventName];
        if (route?.transform) {
            return route.transform(data);
        }
        return data;
    }

    private routeEvent<K extends keyof eventType>(
        eventName: K | string,
        data: any,
        direction: EventDirection
    ): void {
        if (direction === 'UI_TO_ENGINE') {
            signals.emit(eventName as string, data);
            debug.log(`EventDistributor: UI → Engine [${eventName}]`, data);

        } else if (direction === 'ENGINE_TO_UI') {
            eventBus.emit(eventName as K, data);
            debug.log(`EventDistributor: Engine → UI [${eventName}]`, data);

        } else if (direction === 'INTERNAL') {
            signals.emit(eventName as string, data);
            debug.log(`EventDistributor: Internal [${eventName}]`, data);
        }
    }

    private logEvent(eventName: string, metadata: EventMetadata): void {
        if (!this.eventLog.has(eventName)) {
            this.eventLog.set(eventName, []);
        }

        const log = this.eventLog.get(eventName)!;
        log.push(metadata);

        if (log.length > 100) {
            log.shift();
        }
    }

    public getEventStats(eventName?: string): any {
        if (eventName) {
            return {
                eventName,
                count: this.eventLog.get(eventName)?.length || 0,
                history: this.eventLog.get(eventName) || []
            };
        }

        const stats: any = {};
        this.eventLog.forEach((history, name) => {
            stats[name] = {
                count: history.length,
                lastTimestamp: history[history.length - 1]?.timestamp,
                direction: this.eventRoutes[name]?.direction || 'UNKNOWN'
            };
        });
        return stats;
    }

    public clearEventLog(): void {
        this.eventLog.clear();
        debug.log('EventDistributor: Event log cleared');
    }

    public getActiveEvents(): string[] {
        return Array.from(this.processingEvents);
    }

    public registerEventRoute(eventName: string, route: EventRoute): void {
        this.eventRoutes[eventName] = route;
        debug.log(`EventDistributor: Registered custom route for ${eventName}`, route);
    }

    // Debug: List all registered events and their directions
    public getAllRegisteredEvents(): {
        uiToEngine: string[];
        engineToUi: string[];
        biDirectional: string[];
        total: number;
    } {
        const uiToEngine = Object.entries(this.eventRoutes)
            .filter(([_, route]) => route.direction === 'UI_TO_ENGINE')
            .map(([name]) => name);

        const engineToUi = Object.entries(this.eventRoutes)
            .filter(([_, route]) => route.direction === 'ENGINE_TO_UI')
            .map(([name]) => name);

        const biDirectional = Object.entries(this.eventRoutes)
            .filter(([_, route]) => route.direction === 'BI_DIRECTIONAL')
            .map(([name]) => name);

        return {
            uiToEngine,
            engineToUi,
            biDirectional,
            total: uiToEngine.length + engineToUi.length + biDirectional.length
        };
    }
}