export class debug {
  private static isActive: boolean = false;

  public static setActive(activeness: boolean): void {
    console.log("[Debug]", "Debug mode is now", activeness ? "active" : "inactive");
    this.isActive = activeness;
  }

  public static log(prefix: string | null, ...args: any[]): void {
    if (this.isActive) {
      const formattedPrefix = prefix ? `[${prefix}] ` : "";
      console.log(`%c${formattedPrefix}[LOG]`, "color: orange;", ...args);
    }
  }

  public static warn(prefix: string | null, ...args: any[]): void {
    if (this.isActive) {
      const formattedPrefix = prefix ? `[${prefix}] ` : "";
      console.warn(`%c${formattedPrefix}[WARN]`, "color: yellow;", ...args);
    }
  }

  public static error(prefix: string | null, ...args: any[]): void {
    if (this.isActive) {
      const formattedPrefix = prefix ? `[${prefix}] ` : "";
      console.error(`%c${formattedPrefix}[ERROR]`, "color: red;", ...args);
    }
  }
}