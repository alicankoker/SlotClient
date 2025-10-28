import { FreeSpinContainer } from "../freeSpin/FreeSpinContainer";
import { FreeSpinController } from "../freeSpin/FreeSpinController";

export class FreeSpin extends FreeSpinContainer {
    private static _instance: FreeSpin;
    private _controller: FreeSpinController<FreeSpin>;

    private constructor() {
        super();

        this._controller = this.createController();
    }
    
    private createController(): FreeSpinController<FreeSpin> {
        return new (class extends FreeSpinController<FreeSpin> {
            public showPopup(): void {
                // Implementation for showing the free spin popup
                this.view.showPopup();
            }

            public hidePopup(): void {
                // Implementation for hiding the free spin popup
                this.view.hidePopup();
            }
        })(this);
    }

    public static getInstance(): FreeSpin {
        if (!this._instance) {
            this._instance = new FreeSpin();
        }
        return this._instance;
    }

    public showPopup(): void {
        // Actual implementation to show the popup
    }

    public hidePopup(): void {
        // Actual implementation to hide the popup
    }
}