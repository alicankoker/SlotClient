// EventTypes - Game-specific event type definitions
// This file contains all the event types used throughout the game

export enum GameEvents {

    // Spin events
    SPIN_STARTED = 'spin:started',
    SPIN_COMPLETED = 'spin:completed',
    SPIN_FAILED = 'spin:failed',
    
    // Reel events
    REEL_STARTED = 'reel:started',
    REEL_STOPPED = 'reel:stopped',
    REEL_SLOWING = 'reel:slowing',
    
    // Win events
    WIN_DETECTED = 'win:detected',
    WIN_ANIMATION_STARTED = 'win:animation:started',
    WIN_ANIMATION_COMPLETED = 'win:animation:completed',
    BIG_WIN_TRIGGERED = 'win:big:triggered',
    
    // Player events
    PLAYER_BALANCE_CHANGED = 'player:balance:changed',
    PLAYER_BET_CHANGED = 'player:bet:changed',
    PLAYER_LEVEL_UP = 'player:level:up',
    
    // UI events
    UI_BUTTON_CLICKED = 'ui:button:clicked',
    UI_PANEL_OPENED = 'ui:panel:opened',
    UI_PANEL_CLOSED = 'ui:panel:closed',
    
    // System events
    SYSTEM_ERROR = 'system:error',
    SYSTEM_WARNING = 'system:warning',
    SYSTEM_INFO = 'system:info'
}

export enum CommunicationEvents {
    SPIN_REQUEST = 'spin:request',
    SPIN_RESPONSE = 'spin:response',
    BALANCE_REQUEST = 'balance:request',
    BALANCE_RESPONSE = 'balance:response',
    GAME_STATE_REQUEST = 'game:state:request',
    GAME_STATE_RESPONSE = 'game:state:response',
}

// Additional event type categories for better organization
export enum SpinEvents {
    REQUEST = 'spin:request',
    STARTED = 'spin:started',
    COMPLETED = 'spin:completed',
    FAILED = 'spin:failed'
}

export enum ReelEvents {
    STARTED = 'reel:started',
    STOPPED = 'reel:stopped',
    SLOWING = 'reel:slowing'
}

export enum WinEvents {
    DETECTED = 'win:detected',
    ANIMATION_STARTED = 'win:animation:started',
    ANIMATION_COMPLETED = 'win:animation:completed',
    BIG_WIN_TRIGGERED = 'win:big:triggered'
}

export enum PlayerEvents {
    BALANCE_CHANGED = 'player:balance:changed',
    BET_CHANGED = 'player:bet:changed',
    LEVEL_UP = 'player:level:up',
    GET_PLAYER_DATA = 'player:get:data'
}

export enum UIEvents {
    BUTTON_CLICKED = 'ui:button:clicked',
    PANEL_OPENED = 'ui:panel:opened',
    PANEL_CLOSED = 'ui:panel:closed'
}

export enum SystemEvents {
    ERROR = 'system:error',
    WARNING = 'system:warning',
    INFO = 'system:info'
}

// Event type groups for filtering
export const EVENT_CHANNELS = {
    SPIN: Object.values(SpinEvents),
    REEL: Object.values(ReelEvents),
    WIN: Object.values(WinEvents),
    PLAYER: Object.values(PlayerEvents),
    UI: Object.values(UIEvents),
    SYSTEM: Object.values(SystemEvents)
} as const;

// Type for all event types
export type AllEventTypes = GameEvents | SpinEvents | ReelEvents | WinEvents | PlayerEvents | UIEvents | SystemEvents;
