import { BackgroundContainer } from "../background/BackgroundContainer";

export abstract class BackgroundController<T extends BackgroundContainer> {
    protected view: T;

    constructor(view: T) {
        this.view = view;
    }
}