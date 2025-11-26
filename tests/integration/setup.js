// This file is a polyfill script. Its purpose is to simulate a browser environment within Node.js so that the PDF processing library (pdfjs-dist) can run without crashing.
// Here is a breakdown of why it's needed:
// Missing Browser APIs: The pdfjs-dist library is primarily built for browsers. It relies on specific global objects like DOMMatrix, Path2D, and document (specifically for Canvas operations) to parse and render PDFs. These objects do not exist in a standard Node.js environment.
// Mocking the Environment: The script defines these missing globals (global.DOMMatrix, global.document, etc.) with minimal mock implementations. For example, it mocks document.createElement('canvas') and its context methods so that pdfjs-dist thinks it can draw text, even though we are just extracting it.
// Promise.withResolvers: This is a newer JavaScript feature that pdfjs-dist uses. Since your Node.js version (v19) is slightly older than the feature's release, I added a polyfill for it so the library doesn't fail with TypeError: Promise.withResolvers is not a function.
// In short, it "tricks" the PDF library into working in your terminal so we can run integration tests without needing a real browser.

if (!Promise.withResolvers) {
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

global.DOMMatrix = class DOMMatrix { };
global.Path2D = class Path2D { };
global.ImageData = class ImageData { };
global.document = {
    createElement: () => {
        return {
            getContext: () => ({
                measureText: () => ({ width: 0 }),
                fillText: () => { },
                strokeText: () => { },
                save: () => { },
                restore: () => { },
                translate: () => { },
                scale: () => { },
                rotate: () => { },
                transform: () => { },
                beginPath: () => { },
                closePath: () => { },
                moveTo: () => { },
                lineTo: () => { },
                bezierCurveTo: () => { },
                quadraticCurveTo: () => { },
                arc: () => { },
                fill: () => { },
                stroke: () => { },
                clip: () => { },
                drawImage: () => { },
            })
        };
    }
};
