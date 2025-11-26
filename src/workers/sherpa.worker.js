// Sherpa-ONNX TTS Worker with Multi-Language Support

let tts = null;
let currentLanguage = null;

self.Module = {
    locateFile: (file) => {
        return '/wasm/sherpa/' + file;
    },
    onRuntimeInitialized: async () => {
        console.log('[Sherpa Worker] Runtime initialized');
        // We wait for the 'init' message to start TTS
        self.postMessage({ type: 'runtime-ready' });
    },
    print: (text) => {
        console.log('[Sherpa WASM]', text);
    },
    printErr: (text) => {
        console.error('[Sherpa WASM Err]', text);
    }
};

// Load the WASM glue code and helper functions
importScripts('/wasm/sherpa/sherpa-onnx-wasm-main-tts.js');
importScripts('/wasm/sherpa/sherpa-onnx-tts.js');

async function loadAndCacheFiles(language) {
    const files = [
        { url: `/wasm/sherpa/models/${language}/model.onnx`, name: 'model.onnx' },
        { url: `/wasm/sherpa/models/${language}/tokens.txt`, name: 'tokens.txt' }
    ];

    const cache = await caches.open(`sherpa-onnx-${language}-v1`);
    const fs = self.Module.FS || self.FS;

    if (!fs) {
        throw new Error('FS not found');
    }

    for (const file of files) {
        let response = await cache.match(file.url);
        if (response) {
            console.log(`[Sherpa Worker] Loaded ${file.name} for ${language} from cache`);
        } else {
            console.log(`[Sherpa Worker] Downloading ${file.name} for ${language}...`);
            await cache.add(file.url);
            response = await cache.match(file.url);
        }

        if (!response) throw new Error(`Failed to load ${file.url}`);

        const buffer = await response.arrayBuffer();
        console.log(`[Sherpa Worker] Got buffer for ${file.name}, size: ${buffer.byteLength}`);

        try {
            if (fs.analyzePath(file.name).exists) {
                console.log(`[Sherpa Worker] File ${file.name} exists, deleting...`);
                fs.unlink(file.name);
            }
        } catch (e) {
            // Ignore error if file doesn't exist (though analyzePath should handle it)
        }

        try {
            const data = new Uint8Array(buffer);
            console.log(`[Sherpa Worker] Writing ${file.name} to FS, data length: ${data.length}`);
            fs.writeFile(file.name, data);
            console.log(`[Sherpa Worker] Wrote ${file.name} to virtual FS`);
        } catch (e) {
            console.error(`[Sherpa Worker] Error writing ${file.name}:`, e);
            throw e;
        }
    }
}

async function initTTS(language) {
    if (language === currentLanguage && tts) {
        self.postMessage({ type: 'init-complete', language });
        return;
    }

    self.postMessage({ type: 'init-start', language });

    if (!self.createOfflineTts) {
        console.error('[Sherpa Worker] createOfflineTts not found');
        self.postMessage({ type: 'error', error: 'createOfflineTts not found' });
        return;
    }

    try {
        console.log(`[Sherpa Worker] Initializing TTS for language: ${language}...`);

        // Load model files into virtual FS
        await loadAndCacheFiles(language);

        // Clean up old TTS instance if exists
        if (tts) {
            // tts.delete(); // If delete method exists? Usually handled by GC or explicit free
            tts = null;
        }

        console.log('[Sherpa Worker] Creating TTS engine...');

        const config = {
            offlineTtsModelConfig: {
                offlineTtsVitsModelConfig: {
                    model: 'model.onnx',
                    tokens: 'tokens.txt',
                    dataDir: '/espeak-ng-data', // Preloaded in .data file
                    noiseScale: 0.667,
                    noiseScaleW: 0.8,
                    lengthScale: 1.0,
                },
                numThreads: 1,
                debug: 1,
                provider: 'cpu'
            }
        };

        tts = createOfflineTts(self.Module, config);
        currentLanguage = language;

        console.log('[Sherpa Worker] TTS Engine created');
        console.log('[Sherpa Worker] Sample rate:', tts.sampleRate);
        console.log('[Sherpa Worker] Num speakers:', tts.numSpeakers);

        self.postMessage({ type: 'init-complete', language });
    } catch (e) {
        console.error('[Sherpa Worker] Error initializing TTS:', e);
        console.error('[Sherpa Worker] Error message:', e.message);
        console.error('[Sherpa Worker] Error stack:', e.stack);
        self.postMessage({ type: 'error', error: e.message || String(e) });
    }
}

self.onmessage = (event) => {
    const { type, text, index, sessionId, language } = event.data;

    if (type === 'init') {
        initTTS(language);
    } else if (type === 'speak') {
        if (!tts) {
            console.error('[Sherpa Worker] TTS not initialized');
            self.postMessage({ type: 'error', error: 'TTS not initialized', sessionId: sessionId });
            return;
        }

        try {
            console.log(`[Sherpa Worker] Generating speech for index ${index} (session ${sessionId}):`, text);
            const startTime = Date.now();

            const audio = tts.generate({
                text: text,
                sid: 0,
                speed: 1.0
            });

            const endTime = Date.now();
            console.log(`[Sherpa Worker] Generated in ${(endTime - startTime) / 1000}s`);

            self.postMessage({
                type: 'audio',
                audio: audio.samples,
                sampling_rate: audio.sampleRate,
                text: text,
                index: index,
                sessionId: sessionId
            });

        } catch (error) {
            console.error('[Sherpa Worker] Generation error:', error);
            self.postMessage({ type: 'error', error: error.message, sessionId: sessionId });
        }
    }
};
