document$.subscribe(function () {
    // Wait for the SVG to be inserted by the snippet
    const initPanZoom = () => {
        // Select the SVG directly from the wrapper
        const wrapper = document.querySelector('.mermaid-wrapper');
        if (!wrapper) return;

        const svgElement = wrapper.querySelector('svg');

        if (svgElement) {
            console.log("Mermaid Zoom: Found inline SVG");

            // Ensure SVG has an ID
            if (!svgElement.id) {
                svgElement.id = "schema-diagram-svg";
            }

            // Ensure SVG fills the wrapper
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';

            if (window.svgPanZoom) {
                console.log("Mermaid Zoom: Initializing svgPanZoom");

                // Destroy existing instance if any
                if (svgElement._panZoom) {
                    svgElement._panZoom.destroy();
                    delete svgElement._panZoom;
                }

                try {
                    const panZoom = svgPanZoom(svgElement, {
                        zoomEnabled: true,
                        controlIconsEnabled: false,
                        fit: true,
                        center: true,
                        minZoom: 0.1,
                        maxZoom: 10,
                        mouseWheelZoomEnabled: true,
                        dblClickZoomEnabled: true,
                        preventMouseEventsDefault: true
                    });

                    svgElement._panZoom = panZoom;

                    // Bind external controls
                    const zoomInBtn = document.getElementById('zoom-in');
                    const zoomOutBtn = document.getElementById('zoom-out');
                    const resetBtn = document.getElementById('zoom-reset');

                    if (zoomInBtn) {
                        zoomInBtn.onclick = (e) => {
                            e.preventDefault();
                            panZoom.zoomIn();
                        };
                    }
                    if (zoomOutBtn) {
                        zoomOutBtn.onclick = (e) => {
                            e.preventDefault();
                            panZoom.zoomOut();
                        };
                    }
                    if (resetBtn) {
                        resetBtn.onclick = (e) => {
                            e.preventDefault();
                            panZoom.resetZoom();
                            panZoom.center();
                        };
                    }

                    console.log("Mermaid Zoom: Controls bound to inline SVG");
                } catch (e) {
                    console.error("Mermaid Zoom: Error initializing", e);
                }
            }
        }
    };

    // Use MutationObserver to detect when the snippet is inserted
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                const svg = document.querySelector('.mermaid-wrapper svg');
                if (svg && !svg._panZoom) {
                    initPanZoom();
                }
            }
        });
    });

    const wrapper = document.querySelector('.mermaid-wrapper');
    if (wrapper) {
        observer.observe(wrapper, { childList: true, subtree: true });
        // Try immediately too
        initPanZoom();
    } else {
        // If wrapper not found yet (unlikely with document$.subscribe but possible)
        observer.observe(document.body, { childList: true, subtree: true });
    }
});
