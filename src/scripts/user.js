let viewBox = { x: 0, y: 0, width: 1000, height: 1000 }; // Initial viewBox
const zoomFactor = 0.1; // Zoom sensitivity
const minZoom = 100; // Minimum width/height for zooming
const maxZoom = 10000; // Maximum width/height for zooming

let boundingBox = { x: -5000, y: -5000, width: 20000, height: 20000 }; // Placeholder, updated dynamically
let rotationAngle = 0; // Initial rotation angle

let isDragging = false;
let dragStart = { x: 0, y: 0 };

export function initializeBoundingBox(points) {
    const xValues = points.map(p => p.X);
    const yValues = points.map(p => p.Y);

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    boundingBox = {
        x: minX - 1000,
        y: minY - 1000,
        width: maxX - minX + 2000,
        height: maxY - minY + 2000
    };
}

export function handleZoom(event) {
    event.preventDefault();

    const svgCanvas = document.getElementById('svgCanvas');
    if (!svgCanvas) return;

    const { offsetX, offsetY, deltaY } = event;
    const zoomDirection = deltaY > 0 ? 1 : -1;
    const zoomAmount = viewBox.width * zoomFactor * zoomDirection;

    const newWidth = viewBox.width - zoomAmount;
    const newHeight = viewBox.height - zoomAmount;

    if (newWidth < minZoom || newWidth > maxZoom) return;

    const zoomCenterX = viewBox.x + (offsetX / svgCanvas.clientWidth) * viewBox.width;
    const zoomCenterY = viewBox.y + (offsetY / svgCanvas.clientHeight) * viewBox.height;

    viewBox.width = newWidth;
    viewBox.height = newHeight;
    viewBox.x += zoomAmount * (zoomCenterX - viewBox.x) / viewBox.width;
    viewBox.y += zoomAmount * (zoomCenterY - viewBox.y) / viewBox.height;

    // Ensure the viewBox stays within the bounding box
    constrainViewBox();

    svgCanvas.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
}

export function handleDragStart(event) {
    isDragging = true;
    dragStart.x = event.clientX;
    dragStart.y = event.clientY;
}

export function handleDragMove(event) {
    if (!isDragging) return;

    const svgCanvas = document.getElementById('svgCanvas');
    if (!svgCanvas) return;

    const dx = (event.clientX - dragStart.x) * (viewBox.width / svgCanvas.clientWidth);
    const dy = (event.clientY - dragStart.y) * (viewBox.height / svgCanvas.clientHeight);

    viewBox.x -= dx;
    viewBox.y -= dy;

    // Ensure the viewBox stays within the bounding box
    constrainViewBox();

    svgCanvas.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);

    dragStart.x = event.clientX;
    dragStart.y = event.clientY;
}

export function handleDragEnd() {
    isDragging = false;
}

export function rotateMapPoints(points, direction) {
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    const angle = (direction * 15 * Math.PI) / 180; // Convert degrees to radians

    return points.map(point => {
        const dx = point.X - centerX;
        const dy = point.Y - centerY;

        const rotatedX = centerX + dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotatedY = centerY + dx * Math.sin(angle) + dy * Math.cos(angle);

        return { ...point, X: rotatedX, Y: rotatedY };
    });
}

export function rotateMap(direction) {
    const svgCanvas = document.getElementById('svgCanvas');
    if (!svgCanvas) return;

    rotationAngle += direction * 15; // Update rotation angle
    const allShapes = Array.from(svgCanvas.querySelectorAll('polygon'));

    allShapes.forEach(shape => {
        const points = shape.getAttribute('points')
            .split(' ')
            .map(pair => {
                const [x, y] = pair.split(',').map(Number);
                return { X: x, Y: y };
            });

        const rotatedPoints = rotateMapPoints(points, direction);
        const newPoints = rotatedPoints.map(p => `${p.X},${p.Y}`).join(' ');

        shape.setAttribute('points', newPoints);
    });
}

// Ensure the viewBox stays within the theoretical bounding box
function constrainViewBox() {
    const maxX = boundingBox.x + boundingBox.width - viewBox.width;
    const maxY = boundingBox.y + boundingBox.height - viewBox.height;

    viewBox.x = Math.max(boundingBox.x, Math.min(viewBox.x, maxX));
    viewBox.y = Math.max(boundingBox.y, Math.min(viewBox.y, maxY));
}
