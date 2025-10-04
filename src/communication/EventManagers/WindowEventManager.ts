type eventType = {
  [K in string]: string;
};

class EventManager<Events extends eventType> {
  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void) {
    const domListener = (e: Event) => {
      listener((e as CustomEvent).detail as Events[K]);
    };

    (listener as any).__domListener = domListener;

    window.addEventListener(event as string, domListener);
  }

  off<K extends keyof Events>(event: K, listener: (payload: any) => void) {
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