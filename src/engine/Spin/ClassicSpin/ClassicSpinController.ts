import { SpinContainer } from "../SpinContainer";
import { SpinController, SpinControllerConfig } from "../SpinController";

export class ClassicSpinController extends SpinController {
    constructor(container: SpinContainer, config: SpinControllerConfig) {
        super(container, config);
    }
}