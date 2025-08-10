import { ResponsiveManager } from '../controllers/ResponsiveSystem';
import { Symbol, SymbolConfig } from './Symbol';

export interface GridSymbolConfig extends SymbolConfig {
    gridX: number;               // Grid column (0-4)
    gridY: number;               // Grid row (can be negative for symbols above mask)
}

export class GridSymbol extends Symbol {
    private _gridX: number;
    private _gridY: number;

    constructor(responsiveManager: ResponsiveManager, config: GridSymbolConfig) {
        // Pass the base SymbolConfig to the parent Symbol class
        super(responsiveManager, {
            symbolId: config.symbolId,
            position: config.position,
            scale: config.scale,
            useContainerPositioning: config.useContainerPositioning
        });

        this._gridX = config.gridX;
        this._gridY = config.gridY;
    }

    // Grid position getters and setters
    public get gridX(): number {
        return this._gridX;
    }

    public set gridX(value: number) {
        this._gridX = value;
    }

    public get gridY(): number {
        return this._gridY;
    }

    public set gridY(value: number) {
        this._gridY = value;
    }

    // Update both grid position and visual position
    public updateGridPosition(gridX: number, gridY: number, visualPosition: { x: number, y: number }): void {
        this._gridX = gridX;
        this._gridY = gridY;
        this.updatePosition(visualPosition);
    }

    // Get grid position as a tuple
    public getGridPosition(): [number, number] {
        return [this._gridX, this._gridY];
    }

    // Override destroy to handle any grid-specific cleanup
    public override destroy(): void {
        // Any grid-specific cleanup can go here
        super.destroy();
    }
} 