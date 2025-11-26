import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const WORK_DIR = path.join(ROOT_DIR, 'build_wasm_work');
const DEST_DIR = path.join(ROOT_DIR, 'public/wasm/sherpa');

// Ensure work directory exists
if (!fs.existsSync(WORK_DIR)) {
    fs.mkdirSync(WORK_DIR, { recursive: true });
}

// Clone sherpa-onnx
const SHERPA_REPO = path.join(WORK_DIR, 'sherpa-onnx');
if (!fs.existsSync(SHERPA_REPO)) {
    console.log('Cloning sherpa-onnx...');
    execSync('git clone --depth 1 https://github.com/k2-fsa/sherpa-onnx.git', { cwd: WORK_DIR, stdio: 'inherit' });
} else {
    console.log('sherpa-onnx already cloned, pulling latest...');
    execSync('git pull', { cwd: SHERPA_REPO, stdio: 'inherit' });
}

// Prepare assets
const ASSETS_DIR = path.join(SHERPA_REPO, 'wasm/tts/assets');
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Download espeak-ng-data if needed
const ESPEAK_DIR = path.join(ASSETS_DIR, 'espeak-ng-data');
if (!fs.existsSync(ESPEAK_DIR)) {
    console.log('Downloading espeak-ng-data...');
    const TAR_FILE = 'vits-piper-de_DE-thorsten_emotional-medium.tar.bz2';
    const URL = `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${TAR_FILE}`;

    execSync(`curl -L -O ${URL}`, { cwd: ASSETS_DIR, stdio: 'inherit' });
    execSync(`tar xf ${TAR_FILE}`, { cwd: ASSETS_DIR, stdio: 'inherit' });

    // Move espeak-ng-data to assets root
    const EXTRACTED_DIR = path.join(ASSETS_DIR, 'vits-piper-de_DE-thorsten_emotional-medium');
    fs.renameSync(path.join(EXTRACTED_DIR, 'espeak-ng-data'), ESPEAK_DIR);

    // Cleanup
    fs.rmSync(path.join(ASSETS_DIR, TAR_FILE));
    fs.rmSync(EXTRACTED_DIR, { recursive: true });
}

// Modify CMakeLists.txt
const CMAKE_FILE = path.join(SHERPA_REPO, 'wasm/tts/CMakeLists.txt');
let cmakeContent = fs.readFileSync(CMAKE_FILE, 'utf8');

// Remove model.onnx check
// Look for: if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/assets/model.onnx") ... endif()
const checkRegex = /if\(NOT EXISTS "\${CMAKE_CURRENT_SOURCE_DIR}\/assets\/model\.onnx"\)[\s\S]*?endif\(\)/;
if (checkRegex.test(cmakeContent)) {
    console.log('Removing model.onnx check from CMakeLists.txt...');
    cmakeContent = cmakeContent.replace(checkRegex, '# model.onnx check removed');
}

// Update preload-file to only include espeak-ng-data
// Look for: string(APPEND MY_FLAGS "--preload-file ${CMAKE_CURRENT_SOURCE_DIR}/assets@. ")
const preloadRegex = /string\(APPEND MY_FLAGS "--preload-file \${CMAKE_CURRENT_SOURCE_DIR}\/assets@\. "\)/;
if (preloadRegex.test(cmakeContent)) {
    console.log('Updating preload path in CMakeLists.txt...');
    // Mount espeak-ng-data at /espeak-ng-data in virtual FS
    cmakeContent = cmakeContent.replace(preloadRegex, 'string(APPEND MY_FLAGS "--preload-file ${CMAKE_CURRENT_SOURCE_DIR}/assets/espeak-ng-data@/espeak-ng-data ")');
}

fs.writeFileSync(CMAKE_FILE, cmakeContent);

// Run build in Docker
console.log('Building WASM in Docker (this may take a while)...');
const dockerCmd = `docker run --rm -v "${SHERPA_REPO}":/workspace -w /workspace emscripten/emsdk:3.1.53 /bin/bash -c "./build-wasm-simd-tts.sh"`;
execSync(dockerCmd, { stdio: 'inherit' });

// Copy artifacts
console.log('Copying artifacts...');
if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
}

const BUILD_DIR = path.join(SHERPA_REPO, 'build-wasm-simd-tts/install/bin/wasm/tts');
const ARTIFACTS = [
    'sherpa-onnx-wasm-main-tts.js',
    'sherpa-onnx-wasm-main-tts.wasm',
    'sherpa-onnx-wasm-main-tts.data'
];

ARTIFACTS.forEach(file => {
    fs.copyFileSync(path.join(BUILD_DIR, file), path.join(DEST_DIR, file));
});

// Also copy sherpa-onnx-tts.js
fs.copyFileSync(path.join(SHERPA_REPO, 'wasm/tts/sherpa-onnx-tts.js'), path.join(DEST_DIR, 'sherpa-onnx-tts.js'));

console.log(`Build complete! Artifacts copied to ${DEST_DIR}`);
