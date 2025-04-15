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

export function highlightOldReferences(svgCanvas, shapes, highlightOldReferences, now) {
    if (!highlightOldReferences) return;

    shapes.Reference.forEach(shape => {
        const utcTime = shape.UtcTime || shape.MapElement?.UtcTime || null;
        const shapeDate = utcTime ? new Date(utcTime) : null;
        const timeDifference = shapeDate ? now - shapeDate : null;

        if (timeDifference && timeDifference > 24 * 60 * 60 * 1000) {
            const points = shape.Points || shape.MapElement?.Points || [];
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            polygon.setAttribute("points", points.map(p => `${p.X},${p.Y}`).join(" "));
            polygon.setAttribute("fill", "rgba(255, 0, 0, 0.5)");
            polygon.setAttribute("stroke", "black");
            polygon.setAttribute("stroke-width", "1");
            svgCanvas.appendChild(polygon);
        }
    });
}

export function highlightPSFocus(svgCanvas, shapes, highlightPSFocus) {
    if (!highlightPSFocus) return;

    const typesToHighlight = ["Reference", "Road", "Load", "Dump"];

    typesToHighlight.forEach(type => {
        shapes[type]?.forEach(shape => {
            const speedLimit = shape.SpeedLimit || shape.MapElement?.SpeedLimit || null;

            if (speedLimit && speedLimit * 3.6 < 31) { // Highlight elements with speeds under 20 kph
                const points = shape.Points || shape.MapElement?.Points || [];
                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute("points", points.map(p => `${p.X},${p.Y}`).join(" "));
                polygon.setAttribute("fill", "rgba(255, 0, 0, 0.5)");
                polygon.setAttribute("stroke", "black");
                polygon.setAttribute("stroke-width", "1");
                svgCanvas.appendChild(polygon);
            }
        });
    });
}
