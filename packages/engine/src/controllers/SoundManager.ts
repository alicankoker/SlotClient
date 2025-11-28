import { Howl, Howler } from "howler";
import { signals } from "./SignalManager";

class SoundManager {
    private static _instance: SoundManager;
    private _sounds: Record<string, Howl> = {};
    private _channel: Record<string, 'sfx' | 'music'> = {};
    private _isSoundFXEnabled: boolean = true;
    private _isMusicEnabled: boolean = true;

    private constructor() {
        this.eventListeners();
     }

    public static getInstance(): SoundManager {
        if (!SoundManager._instance) {
            SoundManager._instance = new SoundManager();
        }
        return SoundManager._instance;
    }

    private eventListeners(): void {
      signals.emit("setVolume", 50);
      this.setVolume(50);

      signals.on("setVolume", (value) => {
        this.setVolume(value);
      });
    }

    /**
     * @description Add sound sources to the manager.
     * @param sources Array of sound sources to add.
     * @example
     * soundManager.add([
     *   { alias: 'background_music', src: ['/assets/music.mp3', '/assets/music.ogg'], channel: 'music' },
     *   { alias: 'click_sound', src: '/assets/click.mp3', channel: 'sfx' }
     * ]);
     */
    public add(sources: { alias: string; src: string | string[]; channel: 'sfx' | 'music' }[]) {
        sources.forEach((source) => {
            this._sounds[source.alias] = new Howl({ src: Array.isArray(source.src) ? source.src : [source.src] });
            this._channel[source.alias] = source.channel;
        });
    }

    /**
     * @description Play a sound.
     * @param alias The alias of the sound to play.
     * @param loop Whether to loop the sound.
     * @param volume The volume of the sound. (0.0 to 1.0)
     * @example
     * soundManager.play('background_music', true, 0.5);
     */
    public play(alias: string, loop: boolean = false, volume: number = 1) {
        const channel = this._channel[alias];
        if ((channel === 'sfx' && this._isSoundFXEnabled) || (channel === 'music' && this._isMusicEnabled)) {
            this._sounds[alias].play();
            this._sounds[alias].loop(loop);
            this._sounds[alias].volume(volume);
        }
    }

    /**
     * @description Play a sound for a specific duration.
     * @param alias The alias of the sound to play.
     * @param duration The duration to play the sound for (in seconds).
     * @param volume The volume of the sound. (0.0 to 1.0)
     * @example
     * soundManager.playFor('background_music', 10, 0.5); // Play for 10 seconds
     */
    public playFor(alias: string, duration: number, volume: number = 1) {
        const channel = this._channel[alias];
        if ((channel === 'sfx' && this._isSoundFXEnabled) || (channel === 'music' && this._isMusicEnabled)) {
            this._sounds[alias].play();
            this._sounds[alias].loop(true);
            this._sounds[alias].volume(volume);

            setTimeout(() => {
                this._sounds[alias].stop();
            }, duration * 1000);
        }
    }

    /**
     * @description Fade a sound's volume.
     * @param alias The alias of the sound to fade.
     * @param from The initial volume (0.0 to 1.0).
     * @param to The target volume (0.0 to 1.0).
     * @param duration The duration of the fade effect (in seconds).
     */
    public fade(alias: string, from: number, to: number, duration: number) {
        this._sounds[alias].fade(from, to, duration * 1000);
    }

    /**
     * @description Register a one-time event listener for a sound.
     * @param event The event to listen for (e.g., 'play', 'end').
     * @param alias The alias of the sound to listen on.
     * @param callback The callback to invoke when the event occurs.
     */
    public once(event: string, alias: string, callback: () => void) {
        this._sounds[alias].once(event, callback);
    }

    /**
     * @description Seek to a specific position in a sound.
     * @param alias The alias of the sound to seek.
     * @param position The position to seek to (in seconds).
     */
    public seek(alias: string, position: number) {
        this._sounds[alias].seek(position);
    }

    /**
     * @description Get the duration of a sound.
     * @param alias The alias of the sound to get duration.
     * @returns The duration of the sound in seconds.
     */
    public getDuration(alias: string): number {
        return this._sounds[alias].duration();
    }

    /**
     * @description Stop playing a sound.
     * @param alias The alias of the sound to stop.
     */
    public stop(alias: string) {
        this._sounds[alias].stop();
    }

    /**
     * @description Pause a sound.
     * @param alias The alias of the sound to pause.
     */
    public pause(alias: string) {
        this._sounds[alias].pause();
    }

    /**
     * @description Resume a paused sound.
     * @param alias The alias of the sound to resume.
     */
    public resume(alias: string) {
        const channel = this._channel[alias];
        if ((channel === 'sfx' && this._isSoundFXEnabled) || (channel === 'music' && this._isMusicEnabled)) {
            if (this._sounds[alias].state() === "loaded") {
                this._sounds[alias].play();
            }
        }
    }

    /**
     * @description Check if a sound is currently playing.
     * @param alias The alias of the sound to check.
     * @returns True if the sound is playing, false otherwise.
     */
    public isPlaying(alias: string): boolean {
        return this._sounds[alias].playing();
    }

    /**
     * @description Enable sound effects.
     */
    public enableSoundFX() {
        this._isSoundFXEnabled = true;
        Howler.volume(1);
    }

    /**
     * @description Disable sound effects.
     */
    public disableSoundFX() {
        this._isSoundFXEnabled = false;
        Howler.volume(0);
    }

    /**
     * @description Enable music.
     */
    public enableMusic() {
        this._isMusicEnabled = true;
        this.updateAllSounds();
    }

    /**
     * @description Disable music.
     */
    public disableMusic() {
        this._isMusicEnabled = false;
        this.updateAllSounds();
    }

    /**
     * @description Check if sound effects are enabled.
     * @returns True if sound effects are enabled, false otherwise.
     */
    public isSoundFXEnabled(): boolean {
        return this._isSoundFXEnabled;
    }

    /**
     * @description Check if music is enabled.
     * @returns True if music is enabled, false otherwise.
     */
    public isMusicEnabled(): boolean {
        return this._isMusicEnabled;
    }

    public setVolume(volume: number) {
        Howler.volume(volume / 100);
    }

    /**
     * @description Internal method to update the mute state of all sounds based on current settings.
     */
    private updateAllSounds() {
        Object.entries(this._sounds).forEach(([alias, sound]) => {
            const channel = this._channel[alias];
            if ((channel === 'sfx' && !this._isSoundFXEnabled) || (channel === 'music' && !this._isMusicEnabled)) {
                sound.mute(true);
            } else {
                sound.mute(false);
            }
        });
    }
}

export default SoundManager;