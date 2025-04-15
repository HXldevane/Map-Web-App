export function breakdownJson(jsonData) {
    const shapes = {
        AOZ: [],
        Road: [],
        Reference: [],
        Obstacle: [],
        Station: [],
        Load: [],
        Dump: []
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
        } else {
            console.warn(`Unknown shape type '${type}' at index ${index}. Skipping.`, shape); // Log unknown types
        }
    });

    console.log("Shapes breakdown result:", shapes); // Log the final breakdown result
    return shapes;
}

export function plotShapes(svgCanvas, shapes, filters, nameFilter, showSpeedLimits) {
    svgCanvas.innerHTML = ""; // Clear existing SVG content
    console.log("Cleared SVG canvas."); // Log canvas clearing

    const colors = {
        AOZ: "none",
        Road: "grey",
        Reference: "rgba(255, 255, 0, 0.5)", // Yellow transparent fill for reference shapes
        Obstacle: "none",
        Station: "none",
        Load: "rgba(200, 200, 200, 0.5)", // Light grey fill for load areas
        Dump: "rgba(200, 200, 200, 0.5)"  // Light grey fill for dump areas
    };

    Object.keys(shapes).forEach(type => {
        if (!filters[type]) {
            console.log(`Filter for ${type} is off. Skipping.`); // Log skipped types
            return;
        }

        console.log(`Plotting shapes of type: ${type}`); // Log type being plotted
        shapes[type].forEach(shape => {
            const name = shape.Name || shape.MapElement?.Name || shape.Polygon?.Name || "Unnamed";
            const speedLimit = shape.SpeedLimit || shape.MapElement?.SpeedLimit || shape.Polygon?.SpeedLimit || null;

            if (nameFilter !== "None" && !name.toLowerCase().includes(nameFilter.toLowerCase())) {
                console.log(`Shape '${name}' does not match name filter '${nameFilter}'. Skipping.`); // Log name filter mismatch
                return;
            }

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

            polygon.setAttribute("points", pointsAttribute);
            polygon.setAttribute("fill", colors[type] || "none");
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
                    ${speedLimit ? `Speed Limit: ${(speedLimit * 3.6).toFixed(1)} km/h<br>` : ""}
                `;
                tooltip.style.display = "block";
            });

            polygon.addEventListener("mouseleave", () => {
                const tooltip = document.getElementById("tooltip");
                tooltip.style.display = "none";
            });

            // Display speed limit for specific shape types
            if (showSpeedLimits && ["Road", "Dump", "Load", "Reference"].includes(type) && speedLimit) {
                const centerX = points.reduce((sum, p) => sum + p.X, 0) / points.length;
                const centerY = points.reduce((sum, p) => sum + p.Y, 0) / points.length;

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", centerX);
                text.setAttribute("y", centerY);
                text.setAttribute("fill", "black");
                text.setAttribute("font-size", "12");
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("dominant-baseline", "middle");
                text.textContent = `${(speedLimit * 3.6).toFixed(1)} km/h`; // Convert m/s to km/h
                svgCanvas.appendChild(text);
            }
        });
    });
}

function calculateShortestWidth(points, secondEdgeStartIndex) {
    let shortestWidth = Infinity;
    for (let i = 0; i < secondEdgeStartIndex; i++) {
        const leftPoint = points[i];
        const rightPoint = points[secondEdgeStartIndex + i];
        if (!leftPoint || !rightPoint) continue;

        const dx = rightPoint.X - leftPoint.X;
        const dy = rightPoint.Y - leftPoint.Y;
        const width = Math.sqrt(dx * dx + dy * dy);

        if (width < shortestWidth) {
            shortestWidth = width;
        }
    }
    return shortestWidth;
}

export function highlightNarrowRoads(svgCanvas, shapes) {
    const narrowThreshold = 10;

    shapes.Road.forEach(shape => {
        const points = shape.MapElement?.Points || [];
        const secondEdgeStartIndex = shape.MapElement?.SecondEdgeStartsAtIndex;

        if (points.length > 1 && secondEdgeStartIndex !== undefined) {
            for (let i = 0; i < secondEdgeStartIndex - 1; i++) {
                const leftPoint = points[i];
                const rightPoint = points[secondEdgeStartIndex + i];

                if (!leftPoint || !rightPoint) continue;

                const dx = rightPoint.X - leftPoint.X;
                const dy = rightPoint.Y - leftPoint.Y;
                const width = Math.sqrt(dx * dx + dy * dy);

                if (width < narrowThreshold) {
                    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    polygon.setAttribute(
                        "points",
                        points.map(p => `${p.X},${p.Y}`).join(" ")
                    );
                    polygon.setAttribute("fill", "red");
                    polygon.setAttribute("opacity", "0.5");
                    svgCanvas.appendChild(polygon);
                    break;
                }
            }
        }
    });
}
