import { handleZoom, handleDragStart, handleDragMove, handleDragEnd, initializeBoundingBox, rotateMap } from './user.js';
import { breakdownJson, plotShapes, highlightNarrowRoads } from './mapHandler.js';

let isDragging = false; // Declare isDragging to track drag state
let dragStart = { x: 0, y: 0 }; // Declare dragStart to track drag start position
let currentShapes = null;

document.getElementById('file-upload-1').addEventListener('change', event => {
    console.log("File upload triggered."); // Log file upload event
    const file = event.target.files[0];
    if (!file) {
        console.warn("No file selected.");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            console.log("File read successfully."); // Log successful file read
            const jsonData = JSON.parse(reader.result);
            if (!jsonData || !jsonData.MapShapes || !Array.isArray(jsonData.MapShapes)) {
                console.error("Invalid JSON structure: 'MapShapes' is missing or not an array.");
                return;
            }

            console.log("JSON structure validated."); // Log JSON validation success
            currentShapes = breakdownJson(jsonData);
            console.log("Shapes breakdown completed:", currentShapes); // Log breakdown result

            // Initialize bounding box based on the points in the JSON
            const allPoints = jsonData.MapShapes.flatMap(shape => shape.Points || shape.MapElement?.Points || []);
            if (allPoints.length === 0) {
                console.error("No points found in the uploaded JSON.");
                return;
            }

            console.log("Points extracted for bounding box initialization."); // Log points extraction
            initializeBoundingBox(allPoints);
            console.log("Bounding box initialized."); // Log bounding box initialization

            // Ensure the SVG canvas is cleared before plotting new shapes
            const svgCanvas = document.getElementById('svgCanvas');
            if (svgCanvas) {
                svgCanvas.innerHTML = '';
                console.log("SVG canvas cleared."); // Log canvas clearing
            }

            updatePlot();
            console.log("Plot updated successfully."); // Log plot update
        } catch (error) {
            console.error("Invalid JSON file:", error);
        }
    };
    reader.readAsText(file);
});

document.getElementById('clear-file-btn-1').addEventListener('click', () => {
    document.getElementById('file-upload-1').value = '';
    document.getElementById('svgCanvas').innerHTML = '';
    currentShapes = null;
});

document.getElementById('clear-file-btn-2')?.addEventListener('click', () => {
    const fileInput = document.getElementById('file-upload-2');
    if (fileInput) fileInput.value = '';
});

document.getElementById('rotate-left-btn').addEventListener('click', () => rotateMap(-1));
document.getElementById('rotate-right-btn').addEventListener('click', () => rotateMap(1));

document.getElementById('highlight-narrow-roads-btn').addEventListener('click', () => {
    if (currentShapes) {
        const svgCanvas = document.getElementById('svgCanvas');
        highlightNarrowRoads(svgCanvas, currentShapes);
    }
});

function updatePlot() {
    if (!currentShapes) {
        console.warn("No shapes available to plot.");
        return;
    }

    const filters = {
        AOZ: document.getElementById('filter-aoz')?.checked || false,
        Road: document.getElementById('filter-road')?.checked || false,
        Reference: document.getElementById('filter-reference')?.checked || false,
        Obstacle: document.getElementById('filter-obstacle')?.checked || false,
        Station: document.getElementById('filter-station')?.checked || false,
        Load: document.getElementById('filter-load')?.checked || false,
        Dump: document.getElementById('filter-dump')?.checked || false
    };

    console.log("Filters applied:", filters); // Log applied filters

    const nameFilter = document.getElementById('name-filter')?.value || "None";
    console.log("Name filter applied:", nameFilter); // Log name filter

    const showSpeedLimits = document.getElementById('filter-speed-limit')?.checked || false;
    console.log("Show speed limits:", showSpeedLimits); // Log speed limit toggle state

    const svgCanvas = document.getElementById('svgCanvas');
    if (!svgCanvas) {
        console.error("SVG element with ID 'svgCanvas' not found.");
        return;
    }

    console.log("Plotting shapes on canvas..."); // Log before plotting
    plotShapes(svgCanvas, currentShapes, filters, nameFilter, showSpeedLimits);
    console.log("Shapes plotted successfully."); // Log after plotting
}

document.querySelectorAll('#filter-bar input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updatePlot);
});

document.getElementById('name-filter').addEventListener('change', updatePlot);

function determineInteraction(event) {
    console.log(`Event detected: ${event.type}`); // Debugging log
    if (event.type === "mousedown") {
        isDragging = false; // Reset dragging state
        dragStart.x = event.clientX;
        dragStart.y = event.clientY;
        handleDragStart(event); // Start dragging
    } else if (event.type === "mousemove") {
        if (event.buttons === 1) { // Check if the left mouse button is pressed
            const dx = Math.abs(event.clientX - dragStart.x);
            const dy = Math.abs(event.clientY - dragStart.y);

            const dragThreshold = 5; // Minimum movement in pixels to detect a drag
            if (dx > dragThreshold || dy > dragThreshold) {
                isDragging = true; // Mark as dragging if movement exceeds threshold
                handleDragMove(event); // Handle dragging
            }
        }
    } else if (event.type === "mouseup") {
        if (isDragging) {
            handleDragEnd(); // End dragging
        } else {
            console.log("Click detected"); // Placeholder for click handling
        }
        isDragging = false; // Reset dragging state
    } else if (event.type === "wheel") {
        console.log("Scroll detected");
        handleZoom(event); // Pass the scroll event to user.js
    }
}

function translateMouseToSvgCoordinates(event) {
    const svgCanvas = document.getElementById('svgCanvas');
    if (!svgCanvas) {
        console.error("SVG element with ID 'svgCanvas' not found.");
        return null;
    }

    const pt = svgCanvas.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;

    const svgPoint = pt.matrixTransform(svgCanvas.getScreenCTM().inverse());
    console.log("Translated mouse coordinates:", { x: svgPoint.x, y: svgPoint.y }); // Debugging log
    return { x: svgPoint.x, y: svgPoint.y };
}

const svgCanvas = document.getElementById('svgCanvas');
if (svgCanvas) {
    svgCanvas.addEventListener('mousedown', determineInteraction);
    svgCanvas.addEventListener('wheel', determineInteraction);
} else {
    console.error("SVG element with ID 'svgCanvas' not found.");
}

document.addEventListener('mousemove', determineInteraction);
document.addEventListener('mouseup', determineInteraction);

document.addEventListener("mousemove", event => {
    const tooltip = document.getElementById("tooltip");
    if (tooltip.style.display === "block") {
        tooltip.style.left = event.pageX + 10 + "px";
        tooltip.style.top = event.pageY + 10 + "px";
    }
});