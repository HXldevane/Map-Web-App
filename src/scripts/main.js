import { handleZoom, handleDragStart, handleDragMove, handleDragEnd, initializeBoundingBox, rotateMap } from './user.js';
import { breakdownJson, plotShapes } from './mapHandler.js';
import { highlightNarrowRoads, highlightOldReferences, highlightPSFocus } from './analysis.js';

let isDragging = false; // Declare isDragging to track drag state
let dragStart = { x: 0, y: 0 }; // Declare dragStart to track drag start position
let currentShapes = null;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize and check all required elements early
    const narrowRoadsToggle = document.getElementById('highlight-narrow-roads-toggle');
    const fileUpload1 = document.getElementById('file-upload-1');
    const clearFileBtn1 = document.getElementById('clear-file-btn-1');
    const clearFileBtn2 = document.getElementById('clear-file-btn-2');
    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const highlightNarrowRoadsBtn = document.getElementById('highlight-narrow-roads-btn');
    const highlightOldReferencesBtn = document.getElementById('highlight-old-references-btn');
    const highlightPSFocusBtn = document.getElementById('highlight-ps-focus-btn');
    const oldReferencesToggle = document.getElementById('highlight-old-references-toggle');
    const psFocusToggle = document.getElementById('highlight-ps-focus-toggle');
    const highlightOldReferencesToggle = document.getElementById("highlightOldReferencesToggle");
    const highlightPSFocusToggle = document.getElementById("highlightPSFocusToggle");
    const nameFilter = document.getElementById('name-filter');
    const svgCanvas = document.getElementById('svgCanvas');

    // Add event listeners only if elements exist
    if (narrowRoadsToggle) {
        narrowRoadsToggle.addEventListener('change', () => {
            if (currentShapes) {
                const highlightNarrowRoadsChecked = narrowRoadsToggle.checked;
                if (highlightNarrowRoadsChecked) {
                    highlightNarrowRoads(svgCanvas, currentShapes);
                    console.log("Highlighted narrow roads.");
                } else {
                    updatePlot();
                }
            } else {
                console.warn("No shapes available to highlight narrow roads.");
            }
        });
    } else {
        console.warn("Element with ID 'highlight-narrow-roads-toggle' not found.");
    }

    if (fileUpload1) {
        fileUpload1.addEventListener('change', event => {
            console.log("File upload triggered.");
            const file = event.target.files[0];
            if (!file) {
                console.warn("No file selected.");
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const jsonData = JSON.parse(reader.result);
                    if (!jsonData || !jsonData.MapShapes || !Array.isArray(jsonData.MapShapes)) {
                        console.error("Invalid JSON structure: 'MapShapes' is missing or not an array.");
                        return;
                    }

                    currentShapes = breakdownJson(jsonData);
                    const allPoints = jsonData.MapShapes.flatMap(shape => shape.Points || shape.MapElement?.Points || []);
                    if (allPoints.length === 0) {
                        console.error("No points found in the uploaded JSON.");
                        return;
                    }

                    initializeBoundingBox(allPoints);
                    if (svgCanvas) svgCanvas.innerHTML = '';
                    updatePlot();
                } catch (error) {
                    console.error("Invalid JSON file:", error);
                }
            };
            reader.readAsText(file);
        });
    } else {
        console.warn("Element with ID 'file-upload-1' not found.");
    }

    if (clearFileBtn1) {
        clearFileBtn1.addEventListener('click', () => {
            if (fileUpload1) fileUpload1.value = '';
            if (svgCanvas) svgCanvas.innerHTML = '';
            currentShapes = null;
        });
    }

    if (clearFileBtn2) {
        clearFileBtn2.addEventListener('click', () => {
            const fileInput = document.getElementById('file-upload-2');
            if (fileInput) fileInput.value = '';
        });
    }

    if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', () => rotateMap(-1));
    if (rotateRightBtn) rotateRightBtn.addEventListener('click', () => rotateMap(1));

    if (highlightNarrowRoadsBtn) {
        highlightNarrowRoadsBtn.addEventListener('click', () => {
            if (currentShapes && svgCanvas) {
                highlightNarrowRoads(svgCanvas, currentShapes);
            }
        });
    }

    if (highlightOldReferencesBtn) {
        highlightOldReferencesBtn.addEventListener('click', () => {
            if (currentShapes && svgCanvas) {
                plotShapes(svgCanvas, currentShapes, getFilters(), getNameFilter(), getShowSpeedLimits(), true, false);
            }
        });
    }

    if (highlightPSFocusBtn) {
        highlightPSFocusBtn.addEventListener('click', () => {
            if (currentShapes && svgCanvas) {
                plotShapes(svgCanvas, currentShapes, getFilters(), getNameFilter(), getShowSpeedLimits(), false, true);
            }
        });
    }

    if (oldReferencesToggle) {
        oldReferencesToggle.addEventListener('change', () => {
            if (currentShapes && svgCanvas) {
                const highlightOldReferencesChecked = oldReferencesToggle.checked;
                highlightOldReferences(svgCanvas, currentShapes, highlightOldReferencesChecked, new Date());
            }
        });
    }

    if (psFocusToggle) {
        psFocusToggle.addEventListener('change', () => {
            if (currentShapes && svgCanvas) {
                const highlightPSFocusChecked = psFocusToggle.checked;
                highlightPSFocus(svgCanvas, currentShapes, highlightPSFocusChecked);
            }
        });
    }

    if (highlightOldReferencesToggle) {
        highlightOldReferencesToggle.addEventListener("change", updatePlot);
    }

    if (highlightPSFocusToggle) {
        highlightPSFocusToggle.addEventListener("change", updatePlot);
    }

    if (nameFilter) {
        nameFilter.addEventListener('change', updatePlot);
    }

    document.querySelectorAll('#filter-bar input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updatePlot);
    });

    if (svgCanvas) {
        svgCanvas.addEventListener('mousedown', determineInteraction);
        svgCanvas.addEventListener('wheel', determineInteraction);
        svgCanvas.style.cursor = "grab";
    }

    document.addEventListener('mousemove', determineInteraction);
    document.addEventListener('mouseup', determineInteraction);

    function updatePlot() {
        if (!currentShapes) {
            console.warn("No shapes available to plot.");
            return;
        }

        const filters = getFilters();
        console.log("Filters applied:", filters);

        const nameFilter = getNameFilter();
        console.log("Name filter applied:", nameFilter);

        const showSpeedLimits = getShowSpeedLimits();
        console.log("Show speed limits:", showSpeedLimits);

        const highlightOldReferences = oldReferencesToggle?.checked || false;
        const highlightPSFocus = psFocusToggle?.checked || false;

        if (!svgCanvas) {
            console.error("SVG element with ID 'svgCanvas' not found.");
            return;
        }

        console.log("Plotting shapes on canvas...");
        plotShapes(svgCanvas, currentShapes, filters, nameFilter, showSpeedLimits, highlightOldReferences, highlightPSFocus);
        console.log("Shapes plotted successfully.");
    }

    function getFilters() {
        return {
            AOZ: document.getElementById('filter-aoz')?.checked || false,
            Road: document.getElementById('filter-road')?.checked || false,
            Reference: document.getElementById('filter-reference')?.checked || false,
            Obstacle: document.getElementById('filter-obstacle')?.checked || false,
            Station: document.getElementById('filter-station')?.checked || false,
            Load: document.getElementById('filter-load')?.checked || false,
            Dump: document.getElementById('filter-dump')?.checked || false
        };
    }

    function getNameFilter() {
        return nameFilter?.value || "None";
    }

    function getShowSpeedLimits() {
        return document.getElementById('filter-speed-limit')?.checked || false;
    }

    document.addEventListener("mousemove", event => {
        const tooltip = document.getElementById("tooltip");
        if (tooltip.style.display === "block") {
            tooltip.style.left = event.pageX + 10 + "px";
            tooltip.style.top = event.pageY + 10 + "px";
        }
    });

    function determineInteraction(event) {
        console.log(`Event detected: ${event.type}`);
        if (event.type === "mousedown") {
            isDragging = false;
            dragStart.x = event.clientX;
            dragStart.y = event.clientY;
            handleDragStart(event);
        } else if (event.type === "mousemove") {
            if (event.buttons === 1) {
                const dx = Math.abs(event.clientX - dragStart.x);
                const dy = Math.abs(event.clientY - dragStart.y);

                const dragThreshold = 5;
                if (dx > dragThreshold || dy > dragThreshold) {
                    isDragging = true;
                    handleDragMove(event);
                }
            }
        } else if (event.type === "mouseup") {
            if (isDragging) {
                handleDragEnd();
            } else {
                console.log("Click detected");
            }
            isDragging = false;
        } else if (event.type === "wheel") {
            console.log("Scroll detected");
            handleZoom(event);
        }
    }
});

function translateMouseToSvgCoordinates(event) {
    if (!svgCanvas) {
        console.error("SVG element with ID 'svgCanvas' not found.");
        return null;
    }

    const pt = svgCanvas.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;

    const svgPoint = pt.matrixTransform(svgCanvas.getScreenCTM().inverse());
    console.log("Translated mouse coordinates:", { x: svgPoint.x, y: svgPoint.y });
    return { x: svgPoint.x, y: svgPoint.y };
}