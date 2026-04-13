/**
 * Decode compressed image messages from ROS.
 *
 * Converts base64 JPEG/PNG data to an HTMLImageElement.
 */

import type { CompressedImage } from '@/types/ros-messages.ts';

/**
 * Decode a CompressedImage message to an Image element.
 */
export function decodeCompressedImage(
    msg: CompressedImage,
): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to decode image'));

        // Construct data URL from base64 data
        // roslib returns data as base64 string
        const format = msg.format.toLowerCase();
        const mimeType =
            format.includes('jpeg') || format.includes('jpg')
                ? 'image/jpeg'
                : format.includes('png')
                  ? 'image/png'
                  : 'image/jpeg'; // default to jpeg

        img.src = `data:${mimeType};base64,${msg.data}`;
    });
}

/**
 * Draw a decoded image to a canvas, maintaining aspect ratio.
 */
export function drawImageToCanvas(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number,
): void {
    // Calculate scaling to fit image while maintaining aspect ratio
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imgRatio > canvasRatio) {
        // Image is wider than canvas
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imgRatio;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
    } else {
        // Image is taller than canvas
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * imgRatio;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
    }

    // Clear and draw
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}
