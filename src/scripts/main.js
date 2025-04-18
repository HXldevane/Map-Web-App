import { handleZoom, handleDragStart, handleDragMove, handleDragEnd, initializeBoundingBox, rotateMap, enableTooltips, disableTooltips } from './user.js';
import { breakdownJson, plotShapes, initializeBoundingBoxes, calculateAozBoundingBox } from './mapHandler.js';
import { highlightNarrowRoads, highlightOldReferences, highlightPSFocus } from './analysis.js';
import { exportBoundingBoxToPDF } from './export.js';

// Ensure boundingBoxes is imported or defined
import { boundingBoxes } from './mapHandler.js';

let isDragging = false; // Declare isDragging to track drag state
let dragStart = { x: 0, y: 0 }; // Declare dragStart to track drag start position
let currentShapes = null;
let tooltipsEnabled = false; // Disable tooltips by default

// Ensure viewBox is defined globally
let viewBox = { x: 0, y: 0, width: 1000, height: 1000 }; // Default viewBox

document.addEventListener("DOMContentLoaded", () => {
    console.log("viewBox initialized:", viewBox);

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
    const recentUtcToggle = document.getElementById('highlight-recent-utc-toggle');
    const exportBtn = document.getElementById("export-btn");

    const zoomDisplay = document.getElementById('zoom-container');
    if (zoomDisplay) {
        zoomDisplay.textContent = 'Zoom: 100%'; // Ensure initial text is set
    }

    const zoomContainer = document.getElementById('zoom-container');

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
                disableTooltips(); // Disable tooltips if no file is selected
                return;
            }

            if (file && zoomContainer) {
                zoomContainer.style.display = 'block'; // Show the zoom container
            }

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const jsonData = JSON.parse(reader.result);
                    if (!jsonData || !jsonData.MapShapes || !Array.isArray(jsonData.MapShapes)) {
                        console.error("Invalid JSON structure: 'MapShapes' is missing or not an array.");
                        disableTooltips(); // Disable tooltips if JSON is invalid
                        return;
                    }

                    currentShapes = breakdownJson(jsonData);
                    initializeBoundingBoxes(currentShapes); // Initialize bounding boxes for name filters
                    enableTooltips(); // Enable tooltips when a valid map file is loaded
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
                    disableTooltips(); // Disable tooltips if JSON parsing fails
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
            disableTooltips(); // Disable tooltips when the file is cleared
            if (zoomContainer) {
                zoomContainer.style.display = 'none'; // Hide the zoom container
            }
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

    if (recentUtcToggle) {
        recentUtcToggle.addEventListener('change', () => {
            if (currentShapes && svgCanvas) {
                updatePlot(); // Re-plot shapes when the toggle changes
            }
        });
    }

    if (nameFilter) {
        nameFilter.addEventListener('change', () => {
            updatePlot();
            if (currentShapes) {
                initializeBoundingBoxes(currentShapes);
            }
        });
    }

    document.querySelectorAll('#filter-bar input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updatePlot);
    });

    // Add event listener for Drivable toggle
    const drivableToggle = document.getElementById('filter-drivable');
    if (drivableToggle) {
        drivableToggle.addEventListener('change', () => {
            if (currentShapes && svgCanvas) {
                updatePlot(); // Re-plot shapes when the toggle changes
            }
        });
    }

    // Add event listeners for shape filters
    const shapeFilters = [
        'filter-aoz',
        'filter-road',
        'filter-reference',
        'filter-obstacle',
        'filter-station',
        'filter-drivable',
        'filter-load',
        'filter-dump'
    ];

    shapeFilters.forEach(filterId => {
        const filterElement = document.getElementById(filterId);
        if (filterElement) {
            filterElement.addEventListener('change', updatePlot); // Trigger updatePlot on toggle
        } else {
            console.warn(`Element with ID '${filterId}' not found.`);
        }
    });

    if (svgCanvas) {
        svgCanvas.addEventListener('mousedown', determineInteraction);
        svgCanvas.addEventListener('wheel', determineInteraction);
        svgCanvas.style.cursor = "grab";
    }

    document.addEventListener('mousemove', determineInteraction);
    document.addEventListener('mouseup', determineInteraction);

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            if (!currentShapes) {
                console.warn("No shapes available for export.");
                return;
            }

            const nameFilter = getNameFilter();
            const boundingBox = nameFilter === "None"
                ? calculateAozBoundingBox(currentShapes)
                : boundingBoxes[nameFilter];

            if (!boundingBox) {
                console.warn("No bounding box available for export.");
                return;
            }

            exportBoundingBoxToPDF(svgCanvas, boundingBox, nameFilter);
        });
    }

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
        const highlightRecentUtc = recentUtcToggle?.checked || false;

        if (!svgCanvas) {
            console.error("SVG element with ID 'svgCanvas' not found.");
            return;
        }

        // Reset shapes to their normal color if no highlights are toggled
        if (!highlightOldReferences && !highlightPSFocus && !highlightRecentUtc) {
            console.log("No highlights toggled. Resetting shapes to normal color.");
            plotShapes(svgCanvas, currentShapes, filters, nameFilter, showSpeedLimits, false, false, false);
            return;
        }

        // Calculate AOZ bounding box if no name filter is selected
        if (nameFilter === "None") {
            const aozBoundingBox = calculateAozBoundingBox(currentShapes);
            if (aozBoundingBox) {
                console.log("AOZ bounding box calculated but not plotted:", aozBoundingBox);
            }
        }

        console.log("Plotting shapes on canvas...");
        plotShapes(svgCanvas, currentShapes, filters, nameFilter, showSpeedLimits, highlightOldReferences, highlightPSFocus, highlightRecentUtc);
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
            Dump: document.getElementById('filter-dump')?.checked || false,
            Drivable: document.getElementById('filter-drivable')?.checked || false // Ensure Drivable filter is included
        };
    }

    function getNameFilter() {
        return nameFilter?.value || "None";
    }

    function getShowSpeedLimits() {
        return document.getElementById('filter-speed-limit')?.checked || false;
    }

    document.addEventListener("mousemove", event => {
        if (!tooltipsEnabled) return; // Disable tooltips if no file is uploaded

        const tooltip = document.getElementById("tooltip");
        if (!tooltip) {
            console.warn("Tooltip element not found.");
            return;
        }
        if (tooltip.style.display === "block") {
            tooltip.style.left = event.pageX + 10 + "px";
            tooltip.style.top = event.pageY + 10 + "px";
        }
    });

    function determineInteraction(event) {
        console.log(`Event detected: ${event.type}`);

        // Ensure viewBox is defined before proceeding
        if (!viewBox) {
            console.warn("viewBox is not defined. Skipping interaction.");
            return;
        }

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
            }
            isDragging = false;
        } else if (event.type === "wheel") {
            handleZoom(event);
            const zoomPercentage = Math.round((1000 / viewBox.width) * 100);
            console.log(`Current scale: ${event.deltaY > 0 ? "Zooming out" : "Zooming in"} (${zoomPercentage}%)`);
        }
    }

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
});