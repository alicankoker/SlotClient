import { FeatureScreenContainer } from "./FeatureScreenContainer";

export abstract class FeatureScreenController<T extends FeatureScreenContainer> {
    protected view: T;

    constructor(view: T) {
        this.view = view;
    }

    /**
     * @description Feature ekranını gösterir.
     */
    public abstract showFeatureScreen(): Promise<void>;

    /**
     * @description Feature ekranını kapatır.
     */
    public abstract closeFeatureScreen(): Promise<void>;
}