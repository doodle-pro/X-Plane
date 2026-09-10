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

// GAME VARIABLES
var game;
var newTime = new Date().getTime();;
var oldTime = new Date().getTime();;
var deltaTime = 0;
var ennemiesPool = [];
var particlesPool = [];
var particlesInUse = [];

function resetGame() {
    game = {
        speed: 0,
        initSpeed: .00035,
        baseSpeed: .00035,
        targetBaseSpeed: .00035,
        incrementSpeedByTime: .0000025,
        incrementSpeedByLevel: .000005,
        distanceForSpeedUpdate: 100,
        speedLastUpdate: 0,

        distance: 0,
        ratioSpeedDistance: 50,
        energy: 100,
        ratioSpeedEnergy: 3,

        level: 1,
        levelLastUpdate: 0,
        distanceForLevelUpdate: 1000,

        planeDefaultHeight: 100,
        planeAmpHeight: 80,
        planeAmpWidth: 75,
        planeMoveSensivity: 0.005,
        planeRotXSensivity: 0.0008,
        planeRotZSensivity: 0.0004,
        planeFallSpeed: .001,
        planeMinSpeed: 1.2,
        planeMaxSpeed: 1.6,
        planeSpeed: 0,
        planeCollisionDisplacementX: 0,
        planeCollisionSpeedX: 0,

        planeCollisionDisplacementY: 0,
        planeCollisionSpeedY: 0,

        seaRadius: 600,
        seaLength: 800,
        //seaRotationSpeed:0.006,
        wavesMinAmp: 5,
        wavesMaxAmp: 20,
        wavesMinSpeed: 0.001,
        wavesMaxSpeed: 0.003,

        cameraFarPos: 500,
        cameraNearPos: 150,
        cameraSensivity: 0.002,

        coinDistanceTolerance: 15,
        coinValue: 3,
        coinsSpeed: .5,
        coinLastSpawn: 0,
        distanceForCoinsSpawn: 100,

        ennemyDistanceTolerance: 10,
        ennemyValue: 10,
        ennemiesSpeed: .6,
        ennemyLastSpawn: 0,
        distanceForEnnemiesSpawn: 50,

        status: "playing",
    };
    fieldLevel.innerHTML = Math.floor(game.level);
}




//////////////////////////* Canvas//////////////////////////////
const canvas = document.querySelector('canvas.webgl')

//////////////////////////* Scene///////////////////////////////
const scene = new THREE.Scene()
//////////////////////////* Fog/////////////////////////////////
scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);



//////////////////////////* Objects/////////////////////////////


//! SEA

class Sea {
    constructor () {
        var geom = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
        geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
        geom.mergeVertices();
        var l = geom.vertices.length;

        this.waves = [];

        for (var i = 0; i < l; i++) {
            var v = geom.vertices[i];
            this.waves.push({
                y: v.y,
                x: v.x,
                z: v.z,
                ang: Math.random() * Math.PI * 2,
                amp: 5 + Math.random() * 15,
                speed: 0.016 + Math.random() * 0.032
            });
        };
        var mat = new THREE.MeshPhongMaterial({
            color: Colors.blue,
            transparent: true,
            opacity: .8,
            shading: THREE.FlatShading,

        });

        this.mesh = new THREE.Mesh(geom, mat);
        this.mesh.receiveShadow = true;

    }
}

Sea.prototype.moveWaves = function () {
    var verts = this.mesh.geometry.vertices;
    var l = verts.length;
    for (var i = 0; i < l; i++) {
        var v = verts[i];
        var vprops = this.waves[i];
        v.x = vprops.x + Math.cos(vprops.ang) * vprops.amp;
        v.y = vprops.y + Math.sin(vprops.ang) * vprops.amp;
        vprops.ang += vprops.speed;
    }
    this.mesh.geometry.verticesNeedUpdate = true;
    sea.mesh.rotation.z += .005;
}


var sea;

function createSea() {
    sea = new Sea();

    // push it a little bit at the bottom of the scene
    sea.mesh.position.y = -600;

    // add the mesh of the sea to the scene
    scene.add(sea.mesh);
}


//! CLOUD

class Cloud {
    constructor () {
        // Create an empty container that will hold the different parts of the cloud
        this.mesh = new THREE.Object3D();

        // create a cube geometry;
        // this shape will be duplicated to create the cloud
        var geom = new THREE.BoxGeometry(20, 20, 20);

        // create a material; a simple white material will do the trick
        var mat = new THREE.MeshPhongMaterial({
            color: Colors.white,
        });

        // duplicate the geometry a random number of times
        var nBlocs = 3 + Math.floor(Math.random() * 3);
        for (var i = 0; i < nBlocs; i++) {

            // create the mesh by cloning the geometry
            var m = new THREE.Mesh(geom, mat);

            // set the position and the rotation of each cube randomly
            m.position.x = i * 15;
            m.position.y = Math.random() * 10;
            m.position.z = Math.random() * 10;
            m.rotation.z = Math.random() * Math.PI * 2;
            m.rotation.y = Math.random() * Math.PI * 2;

            // set the size of the cube randomly
            var s = .1 + Math.random() * .9;
            m.scale.set(s, s, s);

            // allow each cube to cast and to receive shadows
            m.castShadow = true;
            m.receiveShadow = true;

            // add the cube to the container we first created
            this.mesh.add(m);
        }
    }
}




//! SKY

// Define a Sky Object
class Sky {
    constructor () {
        // Create an empty container
        this.mesh = new THREE.Object3D();
        this.nClouds = 20;
        this.clouds = [];
        var stepAngle = Math.PI * 2 / this.nClouds;
        for (var i = 0; i < this.nClouds; i++) {
            var c = new Cloud();
            this.clouds.push(c);
            var a = stepAngle * i;
            var h = game.seaRadius + 150 + Math.random() * 200;
            c.mesh.position.y = Math.sin(a) * h;
            c.mesh.position.x = Math.cos(a) * h;
            c.mesh.position.z = -300 - Math.random() * 500;
            c.mesh.rotation.z = a + Math.PI / 2;
            var s = 1 + Math.random() * 2;
            c.mesh.scale.set(s, s, s);
            this.mesh.add(c.mesh);
        }
    }
}
Sky.prototype.moveClouds = function () {
    for (var i = 0; i < this.nClouds; i++) {
        var c = this.clouds[i];
        //    c.rotate()
    }
    this.mesh.rotation.z += game.speed * deltaTime;

}



// Now we instantiate the sky and push its center a bit
// towards the bottom of the screen

var sky;

function createSky() {
    sky = new Sky();
    sky.mesh.position.y = -600;
    scene.add(sky.mesh);
}


class AirPlane {
    constructor () {

        this.mesh = new THREE.Object3D();
        this.mesh.name = "airPlane";

        // Cabin

        var geomCabin = new THREE.BoxGeometry(80, 50, 50, 1, 1, 1);
        var matCabin = new THREE.MeshPhongMaterial({ color: Colors.red, shading: THREE.FlatShading });

        geomCabin.vertices[4].y -= 10;
        geomCabin.vertices[4].z += 20;
        geomCabin.vertices[5].y -= 10;
        geomCabin.vertices[5].z -= 20;
