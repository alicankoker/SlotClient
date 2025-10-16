
import Communication from '../../communication';
import { debug } from './../../engine/utils/debug';

export class SlotUI {
    private static instance: SlotUI;

    private constructor() {
        // Initialize UI components
        // Add keyboard handlers
        window.addEventListener('keydown', (event) => {
            switch (event.key.toLowerCase()) {
                case ' ':
                    console.log('🎲 Manual spin triggered');
                    Communication.getInstance().requestSpin();
                    break;
                case 'a':
                    console.log('🔄 Auto-play triggered');
                    // Auto-play would need to be implemented differently now
                    break;
                case 'w':
                    console.log('Show random win animation');
                    
                    break;
                case 's':
                    console.log('Skip win animations');
                    
                    break;
                case 'x':
                    console.log('⏹️ Stop auto-play');
                    // Stop functionality would need to be implemented
                    break;
                case '1':
                    console.log('⚡ Fast mode enabled');
                    // Fast mode would be handled differently
                    break;
                case '2':
                    console.log('🚀 Instant mode enabled');
                    // Instant mode would be handled differently
                    break;
                case '3':
                    console.log('🐌 Slow mode enabled');
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