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
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    typesToHighlight.forEach(type => {
        shapes[type]?.forEach(shape => {
            const speedLimit = shape.SpeedLimit || shape.MapElement?.SpeedLimit || null;

            if (speedLimit && speedLimit * 3.6 < 31) { // Highlight elements with speeds under 31 kph
                const points = shape.Points || shape.MapElement?.Points || [];
                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute("points", points.map(p => `${p.X},${p.Y}`).join(" "));
                polygon.setAttribute("fill", "rgba(255, 0, 0, 0.5)");
                polygon.setAttribute("stroke", "black");
                polygon.setAttribute("stroke-width", "1");

                const name = shape.Name || shape.MapElement?.Name || "Unnamed";
                const speedLimitKph = Math.round(speedLimit * 3.6); // Convert m/s to kph

                // Function to show the tooltip
                const showTooltip = (event) => {
                    const tooltip = document.getElementById("tooltip");
                    tooltip.innerHTML = `
                        <strong>${type}</strong><br>
                        Name: ${name}<br>
                        Speed Limit: ${speedLimitKph} kph<br>
                    `;
                    tooltip.style.display = "block";
                    tooltip.style.left = `${event.pageX + 10}px`;
                    tooltip.style.top = `${event.pageY + 10}px`;
                };

                // Function to hide the tooltip
                const hideTooltip = () => {
                    const tooltip = document.getElementById("tooltip");
                    tooltip.style.display = "none";
                };

                // Add event listeners for hover, click, and touch
                if (isTouchDevice) {
                    polygon.addEventListener("touchstart", (event) => {
                        event.preventDefault(); // Prevent default touch behavior
                        showTooltip(event.touches[0]);
                    });

                    // Hide tooltip when touching outside the shape
                    document.addEventListener("touchstart", (event) => {
                        if (!polygon.contains(event.target)) {
                            hideTooltip();
                        }
                    });
                } else {
                    polygon.addEventListener("mouseenter", showTooltip);
                    polygon.addEventListener("mouseleave", hideTooltip);
                    polygon.addEventListener("click", showTooltip);
                }

                svgCanvas.appendChild(polygon);
            }
        });
    });
}
