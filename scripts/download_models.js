import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const handleResponse = (response) => {
            console.log(`Response for ${url}: ${response.statusCode}`);
            if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307) {
                let newUrl = response.headers.location;
                console.log(`Redirect location: ${newUrl}`);
                if (!newUrl.startsWith('http')) {
                    const parsedUrl = new URL(url);
                    newUrl = `${parsedUrl.protocol}//${parsedUrl.host}${newUrl}`;
                }
                console.log(`Redirecting to ${newUrl}...`);
                https.get(newUrl, handleResponse).on('error', reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }

            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
            file.on('error', (err) => {
                fs.unlink(dest, () => { });
                reject(err);
            });
        };

        https.get(url, handleResponse).on('error', reject);
    });
};

const SHERPA_DIR = path.join(__dirname, '../public/wasm/sherpa');

// Available language models
const LANGUAGE_MODELS = {
    de: {
        name: 'German',
        model: 'vits-piper-de_DE-thorsten_emotional-medium',
        url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-de_DE-thorsten_emotional-medium.tar.bz2'
    },
    en: {
        name: 'English',
        model: 'vits-piper-en_US-amy-medium',
        url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-amy-medium.tar.bz2'
    },
    es: {
        name: 'Spanish',
        model: 'vits-piper-es_ES-davefx-medium',
        url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-es_ES-davefx-medium.tar.bz2'
    },
    fr: {
        name: 'French',
        model: 'vits-piper-fr_FR-siwis-medium',
        url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-fr_FR-siwis-medium.tar.bz2'
    }
};

const downloadSherpaFiles = async () => {
    if (!fs.existsSync(SHERPA_DIR)) {
        fs.mkdirSync(SHERPA_DIR, { recursive: true });
    }

    const files = [
        {
            url: 'https://huggingface.co/spaces/k2-fsa/web-assembly-tts-sherpa-onnx-de/resolve/main/sherpa-onnx-wasm-main-tts.js',
            name: 'sherpa-onnx-wasm-main-tts.js'
        },
        {
            url: 'https://huggingface.co/spaces/k2-fsa/web-assembly-tts-sherpa-onnx-de/resolve/main/sherpa-onnx-wasm-main-tts.wasm',
            name: 'sherpa-onnx-wasm-main-tts.wasm'
        },
        {
            url: 'https://huggingface.co/spaces/k2-fsa/web-assembly-tts-sherpa-onnx-de/resolve/main/sherpa-onnx-wasm-main-tts.data',
            name: 'sherpa-onnx-wasm-main-tts.data'
        },
        {
            url: 'https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/master/wasm/tts/sherpa-onnx-tts.js',
            name: 'sherpa-onnx-tts.js'
        }
    ];

    console.log('Downloading Sherpa-ONNX WASM files...');
    for (const file of files) {
        const dest = path.join(SHERPA_DIR, file.name);
        if (fs.existsSync(dest)) {
            console.log(`Skipping ${file.name} (already exists)`);
            continue;
        }
        console.log(`Downloading ${file.name}...`);
        await downloadFile(file.url, dest);
    }
};

const downloadLanguageModel = async (langCode) => {
    const modelInfo = LANGUAGE_MODELS[langCode];
    if (!modelInfo) {
        throw new Error(`Unknown language code: ${langCode}`);
    }

    const modelDir = path.join(SHERPA_DIR, 'models', langCode);
    if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
    }

    // Check if model already exists
    if (fs.existsSync(path.join(modelDir, 'model.onnx'))) {
        console.log(`${modelInfo.name} model already exists, skipping download`);
        return;
    }

    console.log(`Downloading ${modelInfo.name} model...`);
    const tarName = `${modelInfo.model}.tar.bz2`;
    const tarDest = path.join(modelDir, tarName);
    const extractedDir = path.join(modelDir, modelInfo.model);

    await downloadFile(modelInfo.url, tarDest);

    console.log(`Extracting ${modelInfo.name} model...`);
    await new Promise((resolve, reject) => {
        exec(`tar -xjf ${tarName}`, { cwd: modelDir }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });

    // Move files from extracted directory to modelDir
    // Find the .onnx file (it has a language-specific name)
    const extractedFiles = fs.readdirSync(extractedDir);
    const onnxFile = extractedFiles.find(f => f.endsWith('.onnx'));

    if (onnxFile) {
        // Rename to model.onnx
        fs.copyFileSync(path.join(extractedDir, onnxFile), path.join(modelDir, 'model.onnx'));
        console.log(`Copied ${onnxFile} -> model.onnx`);
    }

    // Copy tokens.txt if it exists
    if (fs.existsSync(path.join(extractedDir, 'tokens.txt'))) {
        fs.copyFileSync(path.join(extractedDir, 'tokens.txt'), path.join(modelDir, 'tokens.txt'));
    }

    // Copy espeak-ng-data directory if it exists
    const espeakSrc = path.join(extractedDir, 'espeak-ng-data');
    const espeakDest = path.join(modelDir, 'espeak-ng-data');
    if (fs.existsSync(espeakSrc)) {
        fs.cpSync(espeakSrc, espeakDest, { recursive: true });
    }

    // Clean up
    fs.unlinkSync(tarDest);
    fs.rmSync(extractedDir, { recursive: true, force: true });
    console.log(`${modelInfo.name} model extraction complete`);
};

// Main execution
(async () => {
    try {
        await downloadSherpaFiles();

        // Download default language (German) by default
        console.log('\nDownloading default language model (German)...');
        await downloadLanguageModel('de');

        console.log('\nAll downloads complete!');
        console.log('\nTo download additional languages, run:');
        console.log('  node scripts/download_models.js en  # English');
        console.log('  node scripts/download_models.js es  # Spanish');
        console.log('  node scripts/download_models.js fr  # French');
    } catch (error) {
        console.error('Error downloading files:', error);
        process.exit(1);
    }
})();
