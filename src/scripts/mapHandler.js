const GLOBAL_SPEED_LIMIT = 50; // Default global speed limit in m/s

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
            const points = shape.Points || shape.MapElement?.Points || shape.Polygon?.Points || [];
            if (points.length === 0) {
                console.warn(`Shape '${name}' has no points. Skipping.`); // Log shapes with no points
                return;
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

                if (timeDifference && timeDifference <= 48 * 60 * 60 * 1000) {
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
