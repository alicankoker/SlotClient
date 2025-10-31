type eventType = {
  error: string;
  spinIt: null;
  spin: null;
  setComponentState: TSetComponentStateEventMap;
  setBatchComponentState: TSetBatchComponentStateEventMap;
  showUI: null;
  hideUI: null;
  startAutoPlay: {
    numberOfAutoSpins: number;
    selectedSpinType: 'turbo' | 'quick' | 'skip';
  };
  stopAutoPlay: null;
  closeWrapperLoading: null;
  setWinData1: string;
  setWinData2: string;
  switchSetting: {
    name: 'quickSpin' | 'ambientMusic' | 'gameSounds' | 'introScreen';
    value: boolean;
  };
  onWin: number;
};

class EventManager<Events extends eventType> {
  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void) {
    const domListener = (e: Event) => {
      listener((e as CustomEvent).detail as Events[K]);
    };

    (listener as any).__domListener = domListener;

    window.addEventListener(event as string, domListener);
  }

  off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void) {
    const domListener = (listener as any).__domListener;
    if (domListener) {
      window.removeEventListener(event as string, domListener);
    }
  }

  emit<K extends keyof Events>(event: K, payload?: Events[K]) {
    const eventPayload = payload === undefined ? null : payload;
    window.dispatchEvent(
      new CustomEvent(event as string, { detail: eventPayload })
    );
  }
}

export const eventBus = new EventManager<eventType>();

export type { eventType };

// Common properties for Batch Update that exist in all components
type TCommonComponentProperties = {
  disabled?: boolean;
  onPress?: () => void;
};
// Intersection of all component variants for Batch Update (only 'default' exists in all)
type TCommonVariants = 'default';

type TSetComponentStateEventMap = {
  [K in TComponentNames]: {
    componentName: K;
    stateOrUpdates: TComponentVariants[K] | TComponentUpdates[K];
  };
}[TComponentNames];

type TSetBatchComponentStateEventMap = {
  componentNames: TComponentNames[];
  stateOrUpdates: TCommonVariants | TCommonComponentProperties;
};

type TComponentNames =
  | 'mobileBetButton'
  | 'mobileAutoplayButton'
  | 'spinButton'
  | 'infoButton'
  | 'settingsButton'
  | 'volumeButton'
  | 'creditButton'
  | 'betButton'
  | 'autoplayButton';

type TComponentVariants = {
  mobileBetButton: 'default';
  mobileAutoplayButton: 'default';
  spinButton: 'default' | 'spinning';
  infoButton: 'default' | 'active';
  settingsButton: 'default' | 'active';
  volumeButton: 'default' | 'active' | 'passive';
  creditButton: 'default';
  betButton: 'default' | 'active' | 'pressable';
  autoplayButton: 'default' | 'spinning' | 'active';
};

// Component updates mapping type
type TComponentUpdates = {
  mobileBetButton: Partial<IOutlinedButton>;
  mobileAutoplayButton: Partial<IOutlinedButton>;
  spinButton: Partial<IOutlinedButton>;
  infoButton: Partial<IInfoButton>;
  settingsButton: Partial<IIconButton>;
  volumeButton: Partial<IIconButton>;
  creditButton: Partial<ILabeledPriceButton>;
  betButton: Partial<ILabeledPriceButton>;
  autoplayButton: Partial<ISvgButton>;
};

type TOutlinedButtonSpan =
  | {
    label: string;
    iconSvgPath?: undefined;
    iconSvgFillColor?: undefined;
    iconSvgClassName?: undefined;
  }
  | {
    label?: undefined;
    iconSvgPath: string;
    iconSvgFillColor: TSvgFillColor;
    iconSvgClassName?: string;
  };

type TOutlinedButtonOutline =
  | {
    outlineSvgPath?: undefined;
    outlineSvgFillColor?: undefined;
    outlineSvgClassName?: undefined;
  }
  | {
    outlineSvgPath: string;
    outlineSvgFillColor: TSvgFillColor;
    outlineSvgClassName?: string;
  };

type IOutlinedButton = TOutlinedButtonSpan &
  TOutlinedButtonOutline & {
    variant: TButtonVariants;
    onPress?: () => void;
    outlineColor?: TColors;
    bgColor?: TColors;
    color?: TColors;
    disabled?: boolean;
  };

interface IInfoButton {
  variant: TButtonVariants;
  onPress?: () => void;
  fillColor: TSvgFillColor;
  disabled?: boolean;
}

type TSvgFillColor =
  | `#${string}`
  | `rgb(${number},${number},${number})`
  | `rgba(${number},${number},${number},${number})`
  | 'transparent'
  | 'currentColor';

type TColors =
  | 'background'
  | 'blue'
  | 'green'
  | 'orange'
  | 'white'
  | 'black'
  | 'red';
type TButtonVariants =
  | 'default'
  | 'pressable'
  | 'active'
  | 'spinning'
  | 'passive';

interface IIconButton {
  variant: TButtonVariants;
  icon: string;
  onPress?: () => void;
  color?: string;
  disabled?: boolean;
}

type TLabeledPriceButtonLabel =
  | {
    label: string;
    labelColor: string;
  }
  | {
    label?: undefined;
    labelColor?: undefined;
  };

type TLabeledPriceButtonRightIcon =
  | {
    rightIconSvgPath: string;
    rightIconBgColor: string;
    rightIconSvgFillColor: TSvgFillColor;
  }
  | {
    rightIconSvgPath?: undefined;
    rightIconBgColor?: undefined;
    rightIconSvgFillColor?: undefined;
  };

type ILabeledPriceButton = TLabeledPriceButtonLabel &
  TLabeledPriceButtonRightIcon & {
    variant: TButtonVariants;
    onPress?: () => void;
    value?: number;
    disabled?: boolean;
  };


interface ISvgButton {
  variant: TButtonVariants;
  svgFilePath: string;
  fillColor: TSvgFillColor;
  onPress?: () => void;
  children?: HTMLElement;
  disabled?: boolean;
}