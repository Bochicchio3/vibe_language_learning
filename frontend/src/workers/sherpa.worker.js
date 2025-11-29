// Sherpa-ONNX TTS Worker - German only (model embedded in .data file)

let tts = null;

self.Module = {
    locateFile: (file) => {
        return '/wasm/sherpa/' + file;
    },
    onRuntimeInitialized: async () => {
        console.log('[Sherpa Worker] Runtime initialized');
        // Initialize TTS immediately after runtime is ready
        await initTTS();
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

async function downloadAndWrite(url, path) {
    console.log(`[Sherpa Worker] Downloading ${url}...`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}: ${response.statusText}`);
    const buffer = await response.arrayBuffer();

    const fs = self.Module.FS || self.FS;
    if (!fs) throw new Error('FS not found');

    fs.writeFile(path, new Uint8Array(buffer));
    console.log(`[Sherpa Worker] Wrote ${path} (${buffer.byteLength} bytes)`);
}

async function initTTS() {
    self.postMessage({ type: 'init-start' });

    if (!self.createOfflineTts) {
        console.error('[Sherpa Worker] createOfflineTts not found');
        self.postMessage({ type: 'error', error: 'createOfflineTts not found' });
        return;
    }

    try {
        console.log('[Sherpa Worker] Fetching model files...');

        // Fetch and write model files to FS
        await downloadAndWrite('/wasm/sherpa/models/de/model.onnx', '/model.onnx');
        await downloadAndWrite('/wasm/sherpa/models/de/tokens.txt', '/tokens.txt');

        console.log('[Sherpa Worker] Creating TTS engine...');

        const config = {
            offlineTtsModelConfig: {
                offlineTtsVitsModelConfig: {
                    model: '/model.onnx',
                    tokens: '/tokens.txt',
                    dataDir: '/espeak-ng-data', // This should still be in the .data file
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

        console.log('[Sherpa Worker] TTS Engine created');
        console.log('[Sherpa Worker] Sample rate:', tts.sampleRate);
        console.log('[Sherpa Worker] Num speakers:', tts.numSpeakers);

        self.postMessage({ type: 'init-complete' });
    } catch (e) {
        console.error('[Sherpa Worker] Error initializing TTS:', e);
        self.postMessage({ type: 'error', error: e.message || String(e) });
    }
}

self.onmessage = (event) => {
    const { type, text, index, sessionId } = event.data;

    if (type === 'speak') {
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
