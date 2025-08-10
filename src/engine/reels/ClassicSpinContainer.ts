import { Application } from "pixi.js";
import { SpinContainer, SpinContainerConfig } from "./SpinContainer";
import { ResponsiveManager } from "../controllers/ResponsiveSystem";

export class ClassicSpinContainer extends SpinContainer {
    constructor(app: Application, responsiveManager: ResponsiveManager, config: SpinContainerConfig) {
        super(app, responsiveManager, config);
    }
}