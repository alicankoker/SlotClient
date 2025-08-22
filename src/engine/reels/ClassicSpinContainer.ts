import { Application } from "pixi.js";
import { SpinContainer, SpinContainerConfig } from "./SpinContainer";

export class ClassicSpinContainer extends SpinContainer {
    constructor(app: Application, config: SpinContainerConfig) {
        super(app, config);
    }
}