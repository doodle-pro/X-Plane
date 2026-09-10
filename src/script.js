import "./style.css"
import * as THREE from "./three.min.js"
import "./TweenMax.min.js"

//////////////////////////* Color Palette///////////////////////

var Colors = {
    red: 0xf25346,
    white: 0xd8d0d1,
    brown: 0x59332e,
    pink: 0xF5986E,
    brownDark: 0x23190f,
    blue: 0x51C4D3,
};

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.engineLowpass = null;
        this.propellerOsc = null;
        this.propellerGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
        this.initialized = true;
        this.setupEngine();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setupEngine() {
        const ctx = this.ctx;
        this.engineLowpass = ctx.createBiquadFilter();
        this.engineLowpass.type = 'lowpass';
        this.engineLowpass.frequency.value = 120; 
        this.engineLowpass.Q.value = 1;

        this.engineOsc = ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 45; 

        this.engineGain = ctx.createGain();
        this.engineGain.gain.value = 0.0;

        this.propellerOsc = ctx.createOscillator();
        this.propellerOsc.type = 'sine';
        this.propellerOsc.frequency.value = 6; 

        this.propellerGain = ctx.createGain();
        this.propellerGain.gain.value = 10; 

        this.propellerOsc.connect(this.propellerGain);
        this.propellerGain.connect(this.engineOsc.frequency);

        this.engineOsc.connect(this.engineLowpass);
        this.engineLowpass.connect(this.engineGain);
        this.engineGain.connect(ctx.destination);

        this.engineOsc.start(0);
        this.propellerOsc.start(0);
    }

    setEngineSpeed(speedRatio) {
        if (!this.initialized || !this.engineOsc) return;
        
        const baseFreq = 45 + speedRatio * 35;
        this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);

        const lfoFreq = 6 + speedRatio * 8;
        this.propellerOsc.frequency.setTargetAtTime(lfoFreq, this.ctx.currentTime, 0.1);

        const targetGain = game.status === "playing" ? (0.08 + speedRatio * 0.06) : 0;
        this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
    }

    playCrash() {
        if (!this.initialized) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const bufferSize = ctx.sampleRate * 0.6; 
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(500, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(10, now + 0.6);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseNode.start(now);

        const thudOsc = ctx.createOscillator();
        const thudGain = ctx.createGain();

        thudOsc.type = 'triangle';
        thudOsc.frequency.setValueAtTime(100, now);
        thudOsc.frequency.exponentialRampToValueAtTime(10, now + 0.3);

        thudGain.gain.setValueAtTime(0.5, now);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        thudOsc.connect(thudGain);
        thudGain.connect(ctx.destination);
        
        thudOsc.start(now);
        thudOsc.stop(now + 0.3);
    }

    playCoin() {
        if (!this.initialized) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); 
        osc.frequency.setValueAtTime(659.25, now + 0.08); 

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }
}

var soundSystem;
