import { FreeSpinContainer } from "./FreeSpinContainer";

export abstract class FreeSpinController<T extends FreeSpinContainer> {
    protected view: T;

    constructor(view: T) {
        this.view = view;
    }
}