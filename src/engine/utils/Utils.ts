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
}