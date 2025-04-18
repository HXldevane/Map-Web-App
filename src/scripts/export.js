export async function exportBoundingBoxToPDF(svgCanvas, boundingBox, nameFilter) {
    if (!boundingBox) {
        console.error("No bounding box available for export.");
        return;
    }

    if (!svgCanvas) {
        console.error("SVG canvas not found.");
        return;
    }

    // Dynamically load jsPDF from the UMD build
    const { jsPDF } = await import("../libs/jspdf.umd.js");

    // Create a new jsPDF instance for an A4 page
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    // Extract the content within the bounding box
    const svgContent = svgCanvas.cloneNode(true);
    const elements = Array.from(svgContent.querySelectorAll("polygon, rect, text"));
    elements.forEach(element => {
        const bbox = element.getBBox();
        if (
            bbox.x + bbox.width < boundingBox.x ||
            bbox.x > boundingBox.x + boundingBox.width ||
            bbox.y + bbox.height < boundingBox.y ||
            bbox.y > boundingBox.y + boundingBox.height
        ) {
            element.remove(); // Remove elements outside the bounding box
        }
    });

    // Serialize the SVG content
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgContent);

    // Convert the SVG to an image
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        // Add the image to the PDF
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 10, 10, 277, 190); // Fit to A4 landscape dimensions

        // Save the PDF
        const fileName = nameFilter === "None" ? "AOZ_Export.pdf" : `${nameFilter}_Export.pdf`;
        pdf.save(fileName);
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgString)}`;
}
