export interface SpinAnimationConfig {
    reelSpinDuration: number;       // Duration for each reel spin (ms)
    cascadeDelay: number;           // Delay between cascade steps (ms)
    winCelebrationDuration: number; // Duration for win celebration (ms)
    autoPlayDelay: number;          // Delay between auto-play spins (ms)
}

export interface SymbolAnimationConfig {
    dropDuration: number;           // Symbol drop animation duration (ms)
    scaleDuration: number;          // Symbol scale animation duration (ms)
    positionDuration: number;       // Symbol position animation duration (ms)
    bounceDuration: number;         // Symbol bounce effect duration (ms)
}

export interface ReelAnimationConfig {
    spinUpDuration: number;         // Time to reach full spin speed (ms)
    spinDownDuration: number;       // Time to decelerate and stop (ms)
    reelStopDelay: number;          // Delay between stopping each reel (ms)
    anticipationDelay: number;      // Delay before spin starts (ms)
}

export interface EasingConfig {
    dropEasing: string;             // Easing for drop animations
    scaleEasing: string;            // Easing for scale animations
    spinEasing: string;             // Easing for spin animations
    bounceEasing: string;           // Easing for bounce effects
}

export class AnimationConfig {
    // Spin-related animations
    public static readonly SPIN: SpinAnimationConfig = {
        reelSpinDuration: 1500,         // Each reel spins for 1.5 seconds
        cascadeDelay: 200,              // 200ms delay between cascade steps
        winCelebrationDuration: 2000,   // 2 second win celebration
        autoPlayDelay: 1000             // 1 second between auto-play spins
    };

    // Symbol-specific animations
    public static readonly SYMBOL: SymbolAnimationConfig = {
        dropDuration: 300,              // 300ms for symbol drops
        scaleDuration: 300,             // 300ms for scaling effects
        positionDuration: 300,          // 300ms for position changes
        bounceDuration: 200             // 200ms for bounce effects
    };

    // Reel-specific animations  
    public static readonly REEL: ReelAnimationConfig = {
        spinUpDuration: 500,            // 500ms to reach full speed
        spinDownDuration: 800,          // 800ms to decelerate
        reelStopDelay: 150,             // 150ms delay between reel stops
        anticipationDelay: 100          // 100ms anticipation before spin
    };

    // Easing functions
    public static readonly EASING: EasingConfig = {
        dropEasing: 'ease-out',         // Natural falling motion
        scaleEasing: 'ease-in-out',     // Smooth scaling
        spinEasing: 'ease-in-out',      // Smooth spin acceleration/deceleration
        bounceEasing: 'bounce-out'      // Bounce effect for wins
    };

    // Development/Debug modes
    public static readonly DEBUG_MODES = {
        INSTANT: {
            reelSpinDuration: 0,
            cascadeDelay: 0,
            winCelebrationDuration: 0,
            autoPlayDelay: 100
        },
        FAST: {
            reelSpinDuration: 300,
            cascadeDelay: 50,
            winCelebrationDuration: 500,
            autoPlayDelay: 200
        },
        SLOW: {
            reelSpinDuration: 3000,
            cascadeDelay: 500,
            winCelebrationDuration: 4000,
            autoPlayDelay: 2000
        }
    };
} 