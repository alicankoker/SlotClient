import { WinLinesContainer } from "./WinLinesContainer";

export abstract class WinLinesController<T extends WinLinesContainer> {
    protected view: T;

    constructor(view: T) {
        this.view = view;
    }
}