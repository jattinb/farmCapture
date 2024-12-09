const EventEmitter = require('events');
const { formatTime, parseTimeToMilliseconds } = require('./../helpers/formatTime');
const Timer = require('./timer');
const PokemonDataManager = require('./pokemonDataManager');
const HuntingWindowManager = require('./huntingWindowManager');
const CaptureManager = require('./captureManager');
const OCRSession = require('./OCRSession');
const EncounterManager = require('./encounterManager');
const PokemonListManager = require('./pokemonListManager');

class HuntSession extends EventEmitter {
    constructor() {
        super();
        if (HuntSession.instance) {
            return HuntSession.instance;
        }

        this.huntingWindowManager = new HuntingWindowManager();
        this.pokemonDataManager = new PokemonDataManager();
        this.timer = new Timer();
        this.ocrSession = new OCRSession();
        this.captureManager = new CaptureManager(this.huntingWindowManager, this.ocrSession);
        this.pokemonListManager = null;
        this.encounterManager = null;

        // Bind events
        this.timer.on('update-timer', (timeString) => this.emit('update-timer', timeString));

        // Initialize managers asynchronously
        this.initializeManagers();

        HuntSession.instance = this;
    }

    async initializeManagers() {
        try {
            this.pokemonListManager = await new PokemonListManager();
            this.encounterManager = new EncounterManager(this.pokemonDataManager, this.pokemonListManager);
        } catch (error) {
            console.error('Error initializing managers:', error);
        }
    }

    setUpWindow(window, displayId) {
        this.huntingWindowManager.setWindowAndDisplayId(window, displayId);
    }

    loadState(pokemonCounts = {}, wildCount = 0, timeStr) {
        this.pokemonDataManager.loadState(pokemonCounts, wildCount);

        if (!timeStr) {
            this.timer.reset();
        } else {
            this.timer.loadTime(parseTimeToMilliseconds(timeStr));
        }
        // this.emit('update-time', this.timer.getFormattedTime());
    }

    async handleNoEncounter() {
        if (!this.encounterManager) {
            console.error('EncounterManager is not initialized.');
            return;
        }

        this.encounterManager.handleNoEncounter();
        this.emit('noEncounter', this.pokemonDataManager.getData());
    }

    async handleEncounter(curPoke) {
        if (!this.encounterManager) {
            console.error('EncounterManager is not initialized.');
            return;
        }

        await this.encounterManager.handleEncounter(curPoke);
        this.emit('newEncounter', this.pokemonDataManager.getData());
    }

    async reset() {
        if (this.captureManager.intervalID) {
            console.log('Cannot reset while session is running');
            return;
        }

        this.pokemonDataManager.reset();
        this.loadState();
        this.emit('reset-count', this.pokemonDataManager.dataState);
    }

    async exportSessionToCSV(filename) {
        if (!this.fileManager) {
            console.error('FileManager is not initialized.');
            return;
        }
        this.fileManager.exportSessionToCSV(filename);
    }

    async importSessionFromCSV(data) {
        if (!this.fileManager) {
            console.error('FileManager is not initialized.');
            return;
        }
        this.fileManager.importSessionFromCSV(data);
    }

    isActive() {
        return !!this.captureManager.intervalID;
    }

    async startCaptureInterval(interval = 1000) {
        await this.captureManager.startCaptureInterval(interval);
        this.timer.start()
        this.captureManager.captureAndRecognize().then(result => {
            if (!result.success) {
                console.log(`No encounter: ${result.reason}`);
                this.handleNoEncounter();
            } else {
                this.handleEncounter(result.curPoke);
            }
        });
    }

    async stopCaptureInterval() {
        await this.captureManager.stopCaptureInterval();
        this.emit('stop');
        this.timer.stop()
    }

    static getInstance() {
        if (!HuntSession.instance) {
            console.log('Creating new Hunt Session instance');
            HuntSession.instance = new HuntSession();
        }
        return HuntSession.instance;
    }
}

module.exports = HuntSession;
