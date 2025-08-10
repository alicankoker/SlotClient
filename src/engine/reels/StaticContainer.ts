import { Container, Application } from 'pixi.js';
import { ResponsiveManager, createResponsiveConfig } from '../controllers/ResponsiveSystem';
import { GameConfig } from '../../config/GameConfig';
import { Symbol } from '../symbol/Symbol';
// SymbolUtils import removed - using Symbol class for rendering
import { GridSymbol } from '../symbol/GridSymbol';

export interface StaticContainerConfig {
    reelIndex: number;           // 0-4 for 5 reels
    symbolHeight: number;
    symbolsVisible: number;
    x?: number;                  // Relative X position (0-1)
    y?: number;                  // Relative Y position (0-1)
    // enableMask removed - masking handled at reel area level
}

export class StaticContainer extends Container {
    private app: Application;
    private responsiveManager: ResponsiveManager;
    private config: StaticContainerConfig;
    private symbolsContainer: Container;
    private symbols: Map<number, Symbol[]> = new Map(); // Map of reelIndex -> symbols array
    private resizeCallback: () => void;

    constructor(app: Application, responsiveManager: ResponsiveManager, config: StaticContainerConfig) {
        super();
        
        this.app = app;
        this.responsiveManager = responsiveManager;
        this.config = config;
        this.symbolsContainer = new Container();
        
        // Create resize callback to update positions on resize
        this.resizeCallback = () => this.onResize();
        
        // Add containers to this static container
        this.addChild(this.symbolsContainer);

        this.initializeContainer();
        
        // Register for resize events
        this.responsiveManager.addResizeCallback(this.resizeCallback);
    }

    private initializeContainer(): void {
        // Don't create individual masks - let the parent handle masking for the whole reel area
        this.positionContainer();
        console.log(`StaticContainer ${this.config.reelIndex}: Initialized (symbols will be set later)`);
    }

    private positionContainer(): void {
        // Position the entire container using responsive system if coordinates provided
        if (this.config.x !== undefined && this.config.y !== undefined) {
            this.responsiveManager.addResponsiveObject(this, createResponsiveConfig({
                x: this.config.x,
                y: this.config.y,
                anchorX: 0.5,
                anchorY: 0.5
            }));
        }
    }

    /*private getVerticalSpacing(): number {
        // Calculate vertical spacing between symbol centers
        const referenceSymbolHeight = GameConfig.REFERENCE_SYMBOL.height;
        const referenceSpacingY = GameConfig.REFERENCE_SPACING.vertical; // Should be 0 for touching symbols
        
        const scaledSymbol = GameConfig.getScaledSymbolSize(this.app.screen.width, this.app.screen.height);
        const actualCenterToCenterY = (referenceSymbolHeight + referenceSpacingY) * scaledSymbol.scale;
        
        return actualCenterToCenterY / this.app.screen.height;
    }*/

    public setSymbols(symbolIds: number[], reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        this.clearSymbolsForReel(targetReelIndex);
        this.createSymbolsFromIds(symbolIds, targetReelIndex);
    }

    private clearSymbolsForReel(reelIndex: number): void {
        const reelSymbols = this.symbols.get(reelIndex);
        if (reelSymbols) {
            reelSymbols.forEach(symbol => {
                this.symbolsContainer.removeChild(symbol);
                symbol.destroy();
            });
            this.symbols.delete(reelIndex);
        }
    }

    private createSymbolsFromIds(symbolIds: number[], reelIndex: number): void {
        console.log(`StaticContainer: Creating symbols for reel ${reelIndex} from IDs:`, symbolIds);
        
        // Initialize symbols array for this reel
        if (!this.symbols.has(reelIndex)) {
            this.symbols.set(reelIndex, []);
        }
        const reelSymbols = this.symbols.get(reelIndex)!;
        
        // Create symbols with buffer for smooth scrolling (like original Reel.ts)
        const totalSymbols = this.config.symbolsVisible + 2; // 1 above + visible + 1 below
        const symbolsToCreate = Math.max(totalSymbols, symbolIds.length);
        
        // Calculate the middle symbol index (for 3 visible + 2 buffer = 5 total, middle visible is index 2)
        const middleSymbolIndex = Math.floor(totalSymbols / 2);
        
        // Calculate actual pixel positions using responsive scaling
        const scaledSymbol = GameConfig.getScaledSymbolSize(this.app.screen.width, this.app.screen.height);
        const symbolScale = GameConfig.getReferenceSymbolScale(this.app.screen.width, this.app.screen.height);
        const symbolWidth = scaledSymbol.width;
        const symbolHeight = scaledSymbol.height;
        const spacingX = GameConfig.REFERENCE_SPACING.horizontal * scaledSymbol.scale;
        const spacingY = GameConfig.REFERENCE_SPACING.vertical * scaledSymbol.scale;
        
        const reelX = (reelIndex - 2) * (symbolWidth + spacingX) // Center of symbol
        
        for (let i = 0; i < symbolsToCreate; i++) {
            // Calculate vertical position (actual pixels)
            const symbolY = (i - middleSymbolIndex) * (symbolHeight + spacingY);
            
            // Get symbol ID (use provided IDs or generate random for testing)
            const symbolId = i < symbolIds.length ? symbolIds[i] : Math.floor(Math.random() * 10);
            
            console.log(`StaticContainer: Creating symbol ${i} for reel ${reelIndex} with ID ${symbolId} at pixel position (${Math.round(reelX)}, ${Math.round(symbolY)})`);
            
            // Create symbol with container positioning to avoid conflicts with ReelsContainer offset
            const symbol = new Symbol(this.responsiveManager, {
                symbolId: symbolId,
                position: {
                    x: reelX, // Offset for container position
                    y: symbolY // Offset for container position
                },
                scale: symbolScale[0], // Use responsive scale
                useContainerPositioning: true // Use container coordinates
            });
            
            // Add to symbols container and array
            this.symbolsContainer.addChild(symbol);
            reelSymbols.push(symbol);
            
            console.log(`StaticContainer: Symbol ${i} for reel ${reelIndex} added at pixel position (${Math.round(reelX)}, ${Math.round(symbolY)})`);
        }
        
        console.log(`StaticContainer: Created ${symbolsToCreate} symbols for reel ${reelIndex} with responsive scaling (scale: ${scaledSymbol.scale.toFixed(3)})`);
    }

    private onResize(): void {
        // Update both symbol positions AND sizes for resize
        this.updateSymbolPositionsAndSizes();
    }

    private updateSymbolPositionsAndSizes(): void {
        // Update symbols for ALL reels, not just this.config.reelIndex
        for (const [reelIndex, reelSymbols] of this.symbols.entries()) {
            if (!reelSymbols || reelSymbols.length === 0) continue;
            
            // Calculate the middle symbol index
            const middleSymbolIndex = Math.floor(reelSymbols.length / 2);
            
            // Use responsive scaling instead of hardcoded values
            const scaledSymbol = GameConfig.getScaledSymbolSize(this.app.screen.width, this.app.screen.height);
            const symbolScale = GameConfig.getReferenceSymbolScale(this.app.screen.width, this.app.screen.height);
            const symbolWidth = scaledSymbol.width;
            const symbolHeight = scaledSymbol.height;
            const spacingX = GameConfig.REFERENCE_SPACING.horizontal * scaledSymbol.scale;
            const spacingY = GameConfig.REFERENCE_SPACING.vertical * scaledSymbol.scale;
            
            // Calculate horizontal position for this reel (actual pixels)
            const reelX = (reelIndex - 2) * (symbolWidth + spacingX); // Center of symbol
            
            reelSymbols.forEach((symbol, index) => {
                // Calculate vertical position (actual pixels)
                const symbolY = (index - middleSymbolIndex) * (symbolHeight + spacingY);
                
                // Update both position AND scale
                symbol.updatePosition({
                    x: reelX, // Offset for container position
                    y: symbolY // Offset for container position
                });
                
                // Update symbol scale based on new screen size
                // Symbols in StaticContainer use container positioning, so update scale directly
                symbol.scale.set(symbolScale[0], symbolScale[1]);
            });
            
            console.log(`StaticContainer: Updated ${reelSymbols.length} symbol positions and scales for reel ${reelIndex} during resize with responsive scaling (scale: ${scaledSymbol.scale.toFixed(3)})`);
        }
    }

    private updateSymbolPositions(): void {
        // Deprecated method - use updateSymbolPositionsAndSizes instead
        console.warn('StaticContainer: updateSymbolPositions is deprecated, use updateSymbolPositionsAndSizes for proper resize handling');
        this.updateSymbolPositionsAndSizes();
    }

    // Public symbol management methods
    public setSymbolsByIndex(symbolIndexes: number[], reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        if (symbolIndexes.length !== this.config.symbolsVisible) {
            console.warn(`StaticContainer: Expected ${this.config.symbolsVisible} symbols, got ${symbolIndexes.length} for reel ${targetReelIndex}`);
            return;
        }

        const visibleSymbols = this.getVisibleSymbols(targetReelIndex);
        
        visibleSymbols.forEach((symbol, index) => {
            const symbolIndex = symbolIndexes[index];
            symbol.setSymbolId(symbolIndex);
        });
    }

    public setSymbolsFromServerData(symbolIds: number[], reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        
        if (symbolIds.length !== reelSymbols?.length) {
            console.warn(`StaticContainer: Expected ${reelSymbols?.length} symbols, got ${symbolIds.length} for reel ${targetReelIndex}`);
            return;
        }

        reelSymbols?.forEach((symbol, index) => {
            symbol.setSymbolId(symbolIds[index]);
        });
    }

    // generateDefaultSymbolIds method removed - not needed anymore

    public updateSymbolAt(index: number, symbolId: number, reelIndex?: number): boolean {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            console.warn(`StaticContainer: Invalid symbol index: ${index} for reel ${targetReelIndex}`);
            return false;
        }

        reelSymbols[index].setSymbolId(symbolId);
        return true;
    }

    public getSymbolAt(index: number, reelIndex?: number): Symbol | GridSymbol | null {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            return null;
        }
        
        return reelSymbols[index];
    }

    public getSymbolIdAt(index: number, reelIndex?: number): number | null {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            return null;
        }
        
        return reelSymbols[index].symbolId;
    }

    public getSymbolCount(reelIndex?: number): number {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        return this.symbols.get(targetReelIndex)?.length || 0;
    }

    public getVisibleSymbols(reelIndex?: number): Symbol[] {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols) return [];
        // Return only the visible symbols (exclude the buffer symbols)
        if (reelSymbols.length === this.config.symbolsVisible + 2) {
            return reelSymbols.slice(1, this.config.symbolsVisible + 1);
        }
        return reelSymbols;
    }

    public addSymbol(symbolId: number, position?: number, reelIndex?: number): void {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const symbol = new Symbol(this.responsiveManager, {
            symbolId: symbolId,
            position: {
                x: 0,
                y: 0 // Will be set by repositionSymbols
            },
            useContainerPositioning: false // Use responsive system consistently
        });
        
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols) {
            this.symbols.set(targetReelIndex, [symbol]);
            this.symbolsContainer.addChild(symbol);
        } else {
            if (position !== undefined && position >= 0 && position <= reelSymbols.length) {
                // Insert at specific position
                reelSymbols.splice(position, 0, symbol);
                this.symbolsContainer.addChildAt(symbol, position);
                this.repositionSymbols(targetReelIndex);
            } else {
                // Add at the end
                reelSymbols.push(symbol);
                this.symbolsContainer.addChild(symbol);
                this.repositionSymbols(targetReelIndex);
            }
        }
    }

    public removeSymbolAt(index: number, reelIndex?: number): boolean {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (!reelSymbols || index < 0 || index >= reelSymbols.length) {
            console.warn('StaticContainer: Invalid symbol index for removal:', index);
            return false;
        }

        const symbol = reelSymbols[index];
        this.symbolsContainer.removeChild(symbol);
        symbol.destroy();
        reelSymbols.splice(index, 1);
        
        // Reposition remaining symbols
        this.repositionSymbols(targetReelIndex);
        return true;
    }

    private repositionSymbols(reelIndex?: number): void {
        if (reelIndex !== undefined) {
            // Reposition symbols for a specific reel
            const reelSymbols = this.symbols.get(reelIndex);
            if (!reelSymbols || reelSymbols.length === 0) return;
            
            const middleSymbolIndex = Math.floor(reelSymbols.length / 2);
            
            // Calculate actual pixel positions
            const scaledSymbol = GameConfig.getScaledSymbolSize(this.app.screen.width, this.app.screen.height);
            const symbolWidth = scaledSymbol.width;
            const symbolHeight = scaledSymbol.height;
            const spacingX = GameConfig.REFERENCE_SPACING.horizontal * scaledSymbol.scale;
            const spacingY = GameConfig.REFERENCE_SPACING.vertical * scaledSymbol.scale;
            
            // Calculate horizontal position for this reel (actual pixels)
            const totalWidth = 5 * symbolWidth + 4 * spacingX; // 5 reels, 4 gaps
            const startX = (this.app.screen.width - totalWidth) / 2;
            const reelX = startX + reelIndex * (symbolWidth + spacingX) + symbolWidth / 2; // Center of symbol
            
            reelSymbols.forEach((symbol, index) => {
                // Calculate vertical position (actual pixels)
                const symbolY = this.app.screen.height / 2 + (index - middleSymbolIndex) * (symbolHeight + spacingY);
                
                symbol.updatePosition({
                    x: reelX - this.app.screen.width / 2, // Offset for container position
                    y: symbolY - this.app.screen.height / 2 // Offset for container position
                });
            });
            
            console.log(`StaticContainer: Repositioned ${reelSymbols.length} symbols for reel ${reelIndex} with pixel coordinates`);
        } else {
            // Reposition symbols for ALL reels
            for (const [reelIdx, reelSymbols] of this.symbols.entries()) {
                this.repositionSymbols(reelIdx);
            }
        }
    }

    public clearSymbols(reelIndex?: number): void {
        // Clear symbols for ALL reels
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (reelSymbols) {
            reelSymbols.forEach(symbol => {
                this.symbolsContainer.removeChild(symbol);
                symbol.destroy();
            });
        }
        this.symbols.delete(targetReelIndex); // Clear the specific reel's Map entry
    }

    public getAllSymbols(reelIndex?: number): Symbol[] {
        // Return symbols from ALL reels
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const allSymbols: Symbol[] = [];
        const reelSymbols = this.symbols.get(targetReelIndex);
        if (reelSymbols) {
            allSymbols.push(...reelSymbols);
        }
        return allSymbols;
    }

    public clone(reelIndex?: number): StaticContainer {
        const targetReelIndex = reelIndex !== undefined ? reelIndex : this.config.reelIndex;
        const clonedContainer = new StaticContainer(this.app, this.responsiveManager, this.config);
        
        // Copy current symbol IDs
        const symbolIds = this.symbols.get(targetReelIndex)?.map(symbol => symbol.symbolId) || [];
        clonedContainer.setSymbolsFromServerData(symbolIds, targetReelIndex);
        
        return clonedContainer;
    }

    // Getters
    public get reelIndex(): number {
        return this.config.reelIndex;
    }

    public get symbolsVisible(): number {
        return this.config.symbolsVisible;
    }

    public get symbolHeight(): number {
        return this.config.symbolHeight;
    }

    public destroy(): void {
        // Clean up resize callback
        this.responsiveManager.removeResizeCallback(this.resizeCallback);
        
        // Clean up symbols (they handle their own responsive cleanup)
        this.clearSymbols();
        
        // Clean up responsive objects
        this.responsiveManager.removeResponsiveObject(this);
        
        // Destroy the container
        super.destroy({ children: true });
    }
} 