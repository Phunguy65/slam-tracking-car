/**
 * Parse OccupancyGrid messages and render to Canvas.
 */

import type { OccupancyGrid } from '@/types/ros-messages.ts';

// Colors for occupancy values
const COLOR_UNKNOWN = [50, 50, 60, 255]; // Dark gray
const COLOR_FREE = [20, 20, 30, 255]; // Near black
const COLOR_OCCUPIED = [200, 200, 200, 255]; // Light gray

/**
 * Render an OccupancyGrid to a Canvas.
 *
 * @param ctx - Canvas 2D context
 * @param grid - OccupancyGrid message
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns The scale factor used (pixels per meter)
 */
export function renderOccupancyGrid(
    ctx: CanvasRenderingContext2D,
    grid: OccupancyGrid,
    canvasWidth: number,
    canvasHeight: number,
): { scale: number; offsetX: number; offsetY: number } {
    const { width, height, resolution } = grid.info;
    const mapWidthMeters = width * resolution;
    const mapHeightMeters = height * resolution;

    // Calculate scale to fit map in canvas
    const scaleX = canvasWidth / mapWidthMeters;
    const scaleY = canvasHeight / mapHeightMeters;
    const scale = Math.min(scaleX, scaleY) * 0.95; // 95% to leave some margin

    // Calculate offset to center the map
    const mapPixelWidth = mapWidthMeters * scale;
    const mapPixelHeight = mapHeightMeters * scale;
    const offsetX = (canvasWidth - mapPixelWidth) / 2;
    const offsetY = (canvasHeight - mapPixelHeight) / 2;

    // Create ImageData for the map
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < grid.data.length; i++) {
        const value = grid.data[i];
        const pixelIndex = i * 4;

        let color: number[];
        if (value === -1) {
            color = COLOR_UNKNOWN;
        } else if (value < 50) {
            color = COLOR_FREE;
        } else {
            color = COLOR_OCCUPIED;
        }

        data[pixelIndex] = color[0];
        data[pixelIndex + 1] = color[1];
        data[pixelIndex + 2] = color[2];
        data[pixelIndex + 3] = color[3];
    }

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Create temporary canvas for scaling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return { scale, offsetX, offsetY };

    tempCtx.putImageData(imageData, 0, 0);

    // Draw scaled map to main canvas
    // Note: OccupancyGrid origin is bottom-left, but canvas origin is top-left
    // Need to flip vertically
    ctx.save();
    ctx.translate(offsetX, offsetY + mapPixelHeight);
    ctx.scale(1, -1);
    ctx.drawImage(tempCanvas, 0, 0, mapPixelWidth, mapPixelHeight);
    ctx.restore();

    return { scale, offsetX, offsetY };
}

/**
 * Convert world coordinates to canvas coordinates.
 */
export function worldToCanvas(
    worldX: number,
    worldY: number,
    grid: OccupancyGrid,
    scale: number,
    offsetX: number,
    offsetY: number,
    canvasHeight: number,
): { x: number; y: number } {
    const { origin, resolution } = grid.info;

    // Convert world to grid coordinates
    const gridX = (worldX - origin.position.x) / resolution;
    const gridY = (worldY - origin.position.y) / resolution;

    // Convert grid to canvas coordinates
    const canvasX = offsetX + gridX * scale * resolution;
    const canvasY = canvasHeight - (offsetY + gridY * scale * resolution);

    return { x: canvasX, y: canvasY };
}
