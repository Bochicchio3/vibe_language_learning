// Sherpa-ONNX TTS Worker - German only (model embedded in .data file)

let tts = null;

self.Module = {
    locateFile: (file) => {
        return '/wasm/sherpa/' + file;
    },
    onRuntimeInitialized: async () => {
        console.log('[Sherpa Worker] Runtime initialized');
        // Initialize TTS immediately after runtime is ready
        initTTS();
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

function initTTS() {
    self.postMessage({ type: 'init-start' });

    if (!self.createOfflineTts) {
        console.error('[Sherpa Worker] createOfflineTts not found');
        self.postMessage({ type: 'error', error: 'createOfflineTts not found' });
        return;
    }

    try {
        console.log('[Sherpa Worker] Creating TTS engine...');



        // The model files are embedded in the .data file
        // Based on the build script, they're renamed to generic names
        const config = {
            offlineTtsModelConfig: {
                offlineTtsVitsModelConfig: {
                    model: 'model.onnx',
                    tokens: 'tokens.txt',
                    dataDir: '/espeak-ng-data',
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
        console.error('[Sherpa Worker] Error message:', e.message);
        console.error('[Sherpa Worker] Error stack:', e.stack);
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
