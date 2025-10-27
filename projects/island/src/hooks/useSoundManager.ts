import { Howl, Howler } from 'howler';
import { asset } from '../utils/assetUrl';

const FADE_DURATION = 2000;
const MAX_SAILING_SPEED = 20.0;
const MUSIC_VOLUME = 0.5;
const AMBIENT_BASE_VOLUME = 0.03;
const AMBIENT_MAX_VOLUME = 0.1;
const SAILING_MAX_VOLUME = 0.2;

class SoundManager {
    private music: Howl | null = null;
    private ambientSound: Howl | null = null;
    private sailingSound: Howl | null = null;
    private isInitialized: boolean = false;

    private init() {
        if (this.isInitialized) return;

        Howler.autoUnlock = true;

        this.music = new Howl({
            src: [asset('audio/calm-music.mp3')],
            loop: true,
            volume: 0.0,
        });

        this.ambientSound = new Howl({
            src: [asset('audio/ocean-ambient.mp3')],
            loop: true,
            volume: AMBIENT_BASE_VOLUME,
        });

        this.sailingSound = new Howl({
            src: [asset('audio/ship-sailing.mp3')],
            loop: true,
            volume: 0.0,
        });
    }

    public initializeSounds() {
        if (this.isInitialized) return;
        this.init();
        this.playMusic();
        this.playAmbient();
        this.isInitialized = true;
    }

    private playMusic() {
        if (!this.music) return;
        this.music.once('play', (soundId) => {
            if (this.music) {
                this.music.volume(0.0, soundId);
                this.music.fade(0.0, MUSIC_VOLUME, FADE_DURATION, soundId);
            }
        });
        this.music.play();
    }

    private playAmbient() {
        if (this.ambientSound && !this.ambientSound.playing()) this.ambientSound.play();
        if (this.sailingSound && !this.sailingSound.playing()) this.sailingSound.play();
    }

    public updateSailingSound = (speed: number) => {
        if (!this.isInitialized || !this.ambientSound || !this.sailingSound) return;

        const normalizedSpeed = Math.min(speed, MAX_SAILING_SPEED) / MAX_SAILING_SPEED;
        const dynamicVolumeRange = AMBIENT_MAX_VOLUME - AMBIENT_BASE_VOLUME;
        const targetAmbientVolume = AMBIENT_BASE_VOLUME + (normalizedSpeed * dynamicVolumeRange);
        this.ambientSound.volume(targetAmbientVolume);

        const targetSailingVolume = Math.pow(normalizedSpeed, 2) * SAILING_MAX_VOLUME;
        this.sailingSound.volume(targetSailingVolume);

        const targetRate = 0.7 + normalizedSpeed * 0.8;
        this.sailingSound.rate(targetRate);
    }
}

let soundManager: SoundManager;

if (import.meta.env.PROD) {
    soundManager = new SoundManager();
} else {
    if (!(window as any).__SOUND_MANAGER_INSTANCE__) {
        (window as any).__SOUND_MANAGER_INSTANCE__ = new SoundManager();
    }
    soundManager = (window as any).__SOUND_MANAGER_INSTANCE__;
}

export default soundManager;