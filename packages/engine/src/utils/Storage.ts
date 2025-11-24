import { SIGNAL_EVENTS, signals } from "../controllers/SignalManager";

export class Storage {
    private static _instance: Storage;
    private _storage: Map<string, any>;

    private constructor() {
        this._storage = new Map();
    }

    public static get instance() {
        if (!Storage._instance) {
            throw new Error("Storage instance not initialized");
        }
        return Storage._instance;
    }

    /**
     *
     * @description Get the singleton instance of Storage
     * @returns {Storage} The singleton instance of Storage
     */
    public static getInstance(): Storage {
        if (!Storage._instance) {
            Storage._instance = new Storage();
        }
        return Storage._instance;
    }

    /**
     *
     * @description Set an item in storage
     * @param key The key to set the item under
     * @param value The value to store
     */
    public setItem(key: string, value: any): void {
        const oldValue = this._storage.get(key);
        this._storage.set(key, value);

        this.emitChange(key, value, oldValue);
    }

    /**
     *
     * @description Emit a change event for the storage
     * @param key The key that changed
     * @param newValue The new value of the item
     * @param oldValue The old value of the item
     */
    private emitChange(key: string, newValue: any, oldValue: any): void {
        const changed = oldValue !== newValue;

        signals.emit(SIGNAL_EVENTS.REGISTRY_ITEM_CHANGE, { key, newValue, oldValue, changed });
    }

    /**
     *
     * @description Get an item from storage
     * @param key The key of the item to retrieve
     * @returns {any} The value stored under the key, or undefined if not found
     */
    public getItem(key: string): any {
        return this._storage.get(key);
    }

    /**
     *
     * @description Check if an item exists in storage
     * @param key The key to check for
     * @returns {boolean} True if the item exists, false otherwise
     */
    public hasItem(key: string): boolean {
        return this._storage.has(key);
    }

    /**
     *
     * @description Remove an item from storage
     * @param key The key of the item to remove
     */
    public removeItem(key: string): void {
        this._storage.delete(key);
    }

    // Uncomment if you want to clear all items from storage
    // Note: This will remove all items from the storage, so we use with caution!
    // public clear(): void {
    //     this._storage.clear();
    // }
}