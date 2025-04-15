export function breakdownJson(jsonData) {
    const shapes = {
        AOZ: [],
        Road: [],
        Reference: [],
        Obstacle: [],
        Station: []
    };

    jsonData.MapShapes.forEach(shape => {
        const type = shape.MapElement.$type;
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
        }
    });

    return shapes;
}

export function plotShapes(svgCanvas, shapes, filters, nameFilter, showSpeedLimits) {
    svgCanvas.innerHTML = ""; // Clear existing SVG content

    const colors = {
        AOZ: "none",
        Road: "grey",
        Reference: "none",
        Obstacle: "none",
        Station: "none",
        Load: "yellow",
        Dump: "yellow"
    };

    Object.keys(shapes).forEach(type => {
        if (!filters[type]) return;

        shapes[type].forEach(shape => {
            const name = shape.MapElement.Name || "";
            if (nameFilter !== "None" && !name.toLowerCase().includes(nameFilter.toLowerCase())) return;

            const points = shape.Polygon?.Points || shape.MapElement.Points || [];
            if (points.length > 0) {
                // Draw the polygon
                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute(
                    "points",
                    points.map(p => `${p.X},${p.Y}`).join(" ")
                );
                polygon.setAttribute("fill", colors[type] || "none");
                polygon.setAttribute("stroke", "black");
                polygon.setAttribute("stroke-width", "1");
                svgCanvas.appendChild(polygon);

                // Display speed limit in the center of the shape
                if (showSpeedLimits && shape.MapElement.SpeedLimit) {
                    const centerX = points.reduce((sum, p) => sum + p.X, 0) / points.length;
                    const centerY = points.reduce((sum, p) => sum + p.Y, 0) / points.length;

                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("x", centerX);
                    text.setAttribute("y", centerY);
                    text.setAttribute("fill", "black");
                    text.setAttribute("font-size", "12");
                    text.setAttribute("text-anchor", "middle");
                    text.setAttribute("dominant-baseline", "middle");
                    text.textContent = `${shape.MapElement.SpeedLimit.toFixed(1)} m/s`;
                    svgCanvas.appendChild(text);
                }
            }
        });
    });
}

export function highlightNarrowRoads(svgCanvas, shapes) {
    const narrowThreshold = 30;

    shapes.Road.forEach(shape => {
        const points = shape.Polygon?.Points || shape.MapElement.Points || [];
        if (points.length > 1) {
            for (let i = 0; i < points.length - 1; i++) {
                const dx = points[i + 1].X - points[i].X;
                const dy = points[i + 1].Y - points[i].Y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < narrowThreshold) {
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
