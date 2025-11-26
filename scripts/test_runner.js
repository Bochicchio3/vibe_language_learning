import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function runTests() {
    console.log("Running tests...");
    let passed = 0;
    let failed = 0;

    // Find all .test.js files in src
    const findTests = (dir) => {
        const files = fs.readdirSync(dir);
        let testFiles = [];
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                testFiles = testFiles.concat(findTests(fullPath));
            } else if (file.endsWith('.test.js')) {
                testFiles.push(fullPath);
            }
        }
        return testFiles;
    };

    const testFiles = findTests(path.join(rootDir, 'src'));

    for (const file of testFiles) {
        console.log(`\nTesting ${path.relative(rootDir, file)}...`);
        try {
            await import(file);
            passed++;
        } catch (error) {
            console.error(`FAILED: ${path.relative(rootDir, file)}`);
            console.error(error);
            failed++;
        }
    }

    console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();
