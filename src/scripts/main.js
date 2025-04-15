import { handleZoom, handleDragStart, handleDragMove, handleDragEnd, initializeBoundingBox, rotateMap } from './user.js';
import { breakdownJson, plotShapes, highlightNarrowRoads } from './mapHandler.js';

let isDragging = false; // Declare isDragging to track drag state
let dragStart = { x: 0, y: 0 }; // Declare dragStart to track drag start position
let currentShapes = null;

document.getElementById('file-upload-1').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const jsonData = JSON.parse(reader.result);
            currentShapes = breakdownJson(jsonData);

            // Initialize bounding box based on the points in the JSON
            const allPoints = jsonData.MapShapes.flatMap(shape => shape.Polygon?.Points || shape.MapElement.Points || []);
            initializeBoundingBox(allPoints);

            updatePlot();
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
    if (!currentShapes) return;

    const filters = {
        AOZ: document.getElementById('filter-aoz').checked,
        Road: document.getElementById('filter-road').checked,
        Reference: document.getElementById('filter-reference').checked,
        Obstacle: document.getElementById('filter-obstacle').checked,
        Station: document.getElementById('filter-station').checked,
        Load: document.getElementById('filter-load').checked,
        Dump: document.getElementById('filter-dump').checked
    };

    const nameFilter = document.getElementById('name-filter').value;
    const showSpeedLimits = document.getElementById('filter-speed-limit').checked;

    const svgCanvas = document.getElementById('svgCanvas');
    plotShapes(svgCanvas, currentShapes, filters, nameFilter, showSpeedLimits);
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