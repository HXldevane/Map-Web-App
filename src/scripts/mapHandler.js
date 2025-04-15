const GLOBAL_SPEED_LIMIT = 50; // Default global speed limit in m/s

let boundingBoxes = {}; // Store bounding boxes for name filters

export function initializeBoundingBoxes(shapes) {
    const nameFilters = ["Delta", "Zulu", "Bravo"]; // Add more filters as needed

    nameFilters.forEach(nameFilter => {
        const filteredShapes = Object.values(shapes).flat().filter(shape => {
            const name = shape.Name || shape.MapElement?.Name || shape.Polygon?.Name || "Unnamed";
            return name === nameFilter;
        });

        if (filteredShapes.length > 0) {
            const allPoints = filteredShapes.flatMap(shape => shape.Points || shape.MapElement?.Points || []);
            const xValues = allPoints.map(p => p.X);
            const yValues = allPoints.map(p => p.Y);

            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            const minY = Math.min(...yValues);
            const maxY = Math.max(...yValues);

            boundingBoxes[nameFilter] = {
                x: minX - 100,
                y: minY - 100,
                width: maxX - minX + 200,
                height: maxY - minY + 200
            };

            console.log(`Bounding box for ${nameFilter}:`, boundingBoxes[nameFilter]);
        }
    });
}

export function breakdownJson(jsonData) {
    const shapes = {
        AOZ: [],
        Road: [],
        Reference: [],
        Obstacle: [],
        Station: [],
        Load: [],
        Dump: [],
        Drivable: [] // Add Drivable category
    };

    if (!jsonData.MapShapes || !Array.isArray(jsonData.MapShapes)) {
        console.error("Invalid JSON structure: 'MapShapes' is missing or not an array.");
        return shapes;
    }

    console.log("Processing MapShapes:", jsonData.MapShapes); // Log the entire MapShapes array

    jsonData.MapShapes.forEach((shape, index) => {
        const type = shape.$type || shape.MapElement?.$type || ""; // Check both root and nested $type
        if (!type) {
            console.warn(`Shape at index ${index} is missing a '$type' field. Skipping.`, shape);
            return;
        }

        console.log(`Processing shape at index ${index}:`, shape); // Log each shape

        if (type.includes("AozShapeDto")) {
            shapes.AOZ.push(shape);
        } else if (type.includes("RoadShapeDto")) {
            shapes.Road.push(shape);
        } else if (type.includes("ReferenceShapeDto")) {
            shapes.Reference.push(shape);
        } else if (type.includes("ObstacleShapeDto")) {
            shapes.Obstacle.push(shape);
        } else if (type.includes("StationShapeDto")) {
            shapes.Station.push(shape);
        } else if (type.includes("LoadShapeDto")) {
            shapes.Load.push(shape);
        } else if (type.includes("EdgeDumpShapeDto")) {
            shapes.Dump.push(shape);
        } else if (type.includes("DrivableShapeDto_V1")) {
            shapes.Drivable.push(shape); // Add Drivable shapes
        } else {
            console.warn(`Unknown shape type '${type}' at index ${index}. Skipping.`, shape); // Log unknown types
        }
    });

    console.log("Shapes breakdown result:", shapes); // Log the final breakdown result
    return shapes;
}

export function plotShapes(svgCanvas, shapes, filters, nameFilter, showSpeedLimits, highlightOldReferences, highlightPSFocus, highlightRecentUtc) {
    svgCanvas.innerHTML = ""; // Clear existing SVG content
    console.log("Cleared SVG canvas."); // Log canvas clearing

    const colors = {
        AOZ: "none",
        Road: "grey",
        Reference: "rgba(255, 255, 0, 0.5)", // Yellow transparent fill for reference shapes
        Obstacle: "none",
        Station: "none",
        Load: "rgba(200, 200, 200, 0.5)", // Light grey fill for load areas
        Dump: "rgba(200, 200, 200, 0.5)", // Light grey fill for dump areas
        Drivable: "rgba(92, 91, 91, 0.5)", // Light grey fill for drivable shapes
    };

    const now = new Date();

    // If a name filter is applied, filter all points to ensure they are within the bounding box
    let boundingBox = null;
    if (nameFilter !== "None") {
        const filteredShapes = Object.values(shapes).flat().filter(shape => {
            const name = shape.Name || shape.MapElement?.Name || shape.Polygon?.Name || "Unnamed";
            return name.toLowerCase().includes(nameFilter.toLowerCase());
        });

        if (filteredShapes.length > 0) {
            const allPoints = filteredShapes.flatMap(shape => shape.Points || shape.MapElement?.Points || []);
            if (allPoints.length > 0) {
                const xValues = allPoints.map(p => p.X);
                const yValues = allPoints.map(p => p.Y);

                const minX = Math.min(...xValues);
                const maxX = Math.max(...xValues);
                const minY = Math.min(...yValues);
                const maxY = Math.max(...yValues);

                boundingBox = {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY
                };

                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", boundingBox.x);
                rect.setAttribute("y", boundingBox.y);
                rect.setAttribute("width", boundingBox.width);
                rect.setAttribute("height", boundingBox.height);
                rect.setAttribute("fill", "none");
                rect.setAttribute("stroke", "blue");
                rect.setAttribute("stroke-width", "2");
                rect.setAttribute("stroke-dasharray", "5,5"); // Dashed line for the bounding box
                svgCanvas.appendChild(rect);
                console.log(`Bounding box for '${nameFilter}' drawn:`, boundingBox);
            }
        } else {
            console.warn(`No shapes found for name filter '${nameFilter}'.`);
            return; // Exit early if no shapes match the name filter
        }
    }

    // Plot shapes, filtering points based on the bounding box if it exists
    Object.keys(shapes).forEach(type => {
        if (!filters[type]) {
            console.log(`Filter for ${type} is off. Skipping.`); // Log skipped types
            return;
        }

        console.log(`Plotting shapes of type: ${type}`); // Log type being plotted
        shapes[type].forEach(shape => {
            const name = shape.Name || shape.MapElement?.Name || shape.Polygon?.Name || "Unnamed";
            const speedLimitMps = shape.SpeedLimit || shape.MapElement?.SpeedLimit || GLOBAL_SPEED_LIMIT; // Use SpeedLimit or fallback
            const speedLimitKph = Math.round(speedLimitMps * 3.6); // Convert m/s to kph and round to whole number

            // Validate SpeedLimit
            if (typeof speedLimitMps !== "number") {
                console.warn(`Invalid SpeedLimit for shape '${name}':`, speedLimitMps);
                return;
            }

            console.log(`Shape '${name}' SpeedLimit: ${speedLimitMps} m/s (${speedLimitKph} kph)`); // Log speed in both units

            // Extract points from the correct location
            let points = shape.Points || shape.MapElement?.Points || shape.Polygon?.Points || [];
            if (points.length === 0) {
                console.warn(`Shape '${name}' has no points. Skipping.`); // Log shapes with no points
                return;
            }

            // Filter points based on the bounding box if it exists
            if (boundingBox) {
                points = points.filter(point =>
                    point.X >= boundingBox.x &&
                    point.X <= boundingBox.x + boundingBox.width &&
                    point.Y >= boundingBox.y &&
                    point.Y <= boundingBox.y + boundingBox.height
                );

                if (points.length === 0) {
                    console.log(`Shape '${name}' has no points within the bounding box. Skipping.`);
                    return;
                }
            }

            console.log(`Shape '${name}' points:`, points); // Log points data

            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const pointsAttribute = points.map(p => `${p.X},${p.Y}`).join(" ");
            if (!pointsAttribute) {
                console.warn(`Shape '${name}' has invalid points data. Skipping.`);
                return;
            }

            // Determine fill color based on toggles
            let fillColor = colors[type] || "none";

            // Highlight shapes with UTC within the last 24 hours
            if (highlightRecentUtc) {
                const utcTime = shape.UtcTime || shape.MapElement?.UtcTime || null;
                const shapeDate = utcTime ? new Date(utcTime) : null;
                const timeDifference = shapeDate ? now - shapeDate : null;

                if (timeDifference && timeDifference <= 24 * 60 * 60 * 1000) {
                    fillColor = "rgba(0, 255, 0, 0.5)"; // Green transparent fill for recent UTC
                }
            }

            polygon.setAttribute("points", pointsAttribute);
            polygon.setAttribute("fill", fillColor);
            polygon.setAttribute("stroke", "black");
            polygon.setAttribute("stroke-width", "1");

            console.log(`Polygon created for shape '${name}' with points: ${pointsAttribute}`); // Log polygon creation
            svgCanvas.appendChild(polygon);

            // Add hover functionality
            polygon.addEventListener("mouseenter", () => {
                const tooltip = document.getElementById("tooltip");
                tooltip.innerHTML = `
                    <strong>${type}</strong><br>
                    Name: ${name}<br>
                    ${speedLimitKph > 51 ? `<span style="color: red;">Error</span><br>` : `Speed Limit: ${speedLimitKph} kph<br>`}
                `;
                tooltip.style.display = "block";
            });

            polygon.addEventListener("mouseleave", () => {
                const tooltip = document.getElementById("tooltip");
                tooltip.style.display = "none";
            });

            // Display speed limit for specific shape types
            if (showSpeedLimits && ["Road", "Dump", "Load", "Reference", "Drivable"].includes(type)) {
                const centerX = points.reduce((sum, p) => sum + p.X, 0) / points.length;
                const centerY = points.reduce((sum, p) => sum + p.Y, 0) / points.length;

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", centerX);
                text.setAttribute("y", centerY);
                text.setAttribute("fill", speedLimitKph > 51 ? "red" : "black");
                text.setAttribute("font-size", "12");
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("dominant-baseline", "middle");
                text.textContent = speedLimitKph > 51 ? "Error" : `${speedLimitKph} kph`; // Display error if speed exceeds 51 kph
                svgCanvas.appendChild(text);
            }
        });
    });
}
