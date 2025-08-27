
import { debug } from './../../engine/utils/debug';

export class SlotUI {
    private static instance: SlotUI;

    private constructor() {
        // Initialize UI components
        // Add keyboard handlers
        window.addEventListener('keydown', (event) => {
            switch (event.key.toLowerCase()) {
                case ' ':
                    debug.log('🎲 Manual spin triggered');
                    if (this.spinController) {
                        this.nexusInstance?.requestSpin({
                            betAmount: 10,
                            gameMode: 'manual'
                        });
                    }
                    break;
                case 'a':
                    debug.log('🔄 Auto-play triggered');
                    // Auto-play would need to be implemented differently now
                    break;
                case 'w':
                    debug.log('Show random win animation');
                    if (this.reelsController && !this.reelsController.getIsSpinning()) {
                        this.reelsController.playRandomWinAnimation();
                    }
                    break;
                case 's':
                    debug.log('Skip win animations');
                    if (this.reelsController) {
                        this.reelsController.skipWinAnimations();
                    }
                    break;
                case 'x':
                    debug.log('⏹️ Stop auto-play');
                    // Stop functionality would need to be implemented
                    break;
                case '1':
                    debug.log('⚡ Fast mode enabled');
                    // Fast mode would be handled differently
                    break;
                case '2':
                    debug.log('🚀 Instant mode enabled');
                    // Instant mode would be handled differently
                    break;
                case '3':
                    debug.log('🐌 Slow mode enabled');
                    // Slow mode would be handled differently
                    break;
            }
        });
    }

    public static getInstance(): SlotUI {
        if (!SlotUI.instance) {
            SlotUI.instance = new SlotUI();
        }
        return SlotUI.instance;
    }
}