export class Utils {
    public static delay(ms: number, signal?: AbortSignal): Promise<void> {
        return new Promise((resolve, reject) => {
            const id = setTimeout(() => resolve(), ms);
    
            if (signal) {
                if (signal.aborted) {
                    clearTimeout(id);
                    resolve();
                    return;
                }
    
                signal.addEventListener("abort", () => {
                    clearTimeout(id);
                    resolve();
                }, { once: true });
            }
        });
    }   

    public static getRandomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}