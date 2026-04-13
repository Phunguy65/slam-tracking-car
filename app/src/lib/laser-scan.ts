/**
 * Parse LaserScan messages and render to Canvas as radar view.
 */

import type { LaserScan } from '@/types/ros-messages.ts';

// Colors
const RADAR_POINT_COLOR = 'rgba(0, 255, 128, 0.8)';
const RADAR_GRID_COLOR = 'rgba(255, 255, 255, 0.1)';
const RADAR_CENTER_COLOR = 'rgba(0, 200, 255, 0.8)';

/**
 * Render a LaserScan to a Canvas as a radar-style view.
 *
 * @param ctx - Canvas 2D context
 * @param scan - LaserScan message
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 */
export function renderLaserScan(
    ctx: CanvasRenderingContext2D,
    scan: LaserScan,
    canvasWidth: number,
    canvasHeight: number,
): void {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.9;

    // Calculate scale: pixels per meter
    const rangeMax = Math.min(scan.range_max, 12); // Cap at 12m for display
    const scale = maxRadius / rangeMax;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw grid circles
    ctx.strokeStyle = RADAR_GRID_COLOR;
    ctx.lineWidth = 1;
    const gridStep = rangeMax / 4;
    for (let r = gridStep; r <= rangeMax; r += gridStep) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r * scale, 0, 2 * Math.PI);
        ctx.stroke();
    }

    // Draw crosshairs
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvasWidth, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvasHeight);
    ctx.stroke();

    // Draw robot position
    ctx.fillStyle = RADAR_CENTER_COLOR;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Draw direction indicator (forward arrow)
    ctx.strokeStyle = RADAR_CENTER_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - 20);
    ctx.moveTo(centerX - 5, centerY - 15);
    ctx.lineTo(centerX, centerY - 20);
    ctx.lineTo(centerX + 5, centerY - 15);
    ctx.stroke();

    // Draw scan points
    ctx.fillStyle = RADAR_POINT_COLOR;

    let angle = scan.angle_min;
    for (let i = 0; i < scan.ranges.length; i++) {
        const range = scan.ranges[i];

        // Skip invalid readings
        if (
            range < scan.range_min
            || range > scan.range_max
            || !Number.isFinite(range)
        ) {
            angle += scan.angle_increment;
            continue;
        }

        // Convert polar to cartesian
        // In ROS, angle 0 is forward (positive X), angle increases counterclockwise
        // On canvas, we want forward to be up (negative Y)
        const x = centerX + range * scale * Math.sin(angle);
        const y = centerY - range * scale * Math.cos(angle);

        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();

        angle += scan.angle_increment;
    }
}

/**
 * Convert a laser scan point to Canvas coordinates.
 */
export function scanPointToCanvas(
    range: number,
    angle: number,
    centerX: number,
    centerY: number,
    scale: number,
): { x: number; y: number } {
    const x = centerX + range * scale * Math.sin(angle);
    const y = centerY - range * scale * Math.cos(angle);
    return { x, y };
}

/**
 * Render LaserScan as overlay on a map (without background/grid).
 *
 * This draws only the scan points, suitable for overlaying on an occupancy map.
 * Robot position and heading should come from a separate RobotMarker component.
 *
 * @param ctx - Canvas 2D context
 * @param scan - LaserScan message
 * @param robotX - Robot X position in canvas coordinates
 * @param robotY - Robot Y position in canvas coordinates
 * @param robotYaw - Robot heading in radians (0 = right, CCW positive)
 * @param scale - Scale factor (pixels per meter) from occupancy grid
 * @param pointColor - Color for the scan points (default: cyan)
 */
export function renderLaserScanOverlay(
    ctx: CanvasRenderingContext2D,
    scan: LaserScan,
    robotX: number,
    robotY: number,
    robotYaw: number,
    scale: number,
    pointColor: string = 'rgba(0, 255, 200, 0.7)',
): void {
    ctx.fillStyle = pointColor;

    let angle = scan.angle_min;
    for (let i = 0; i < scan.ranges.length; i++) {
        const range = scan.ranges[i];

        // Skip invalid readings
        if (
            range < scan.range_min
            || range > scan.range_max
            || !Number.isFinite(range)
        ) {
            angle += scan.angle_increment;
            continue;
        }

        // Convert polar to cartesian in robot frame, then transform to map frame
        // In ROS, angle 0 is forward (positive X in robot frame)
        // Robot yaw rotates the robot frame relative to map frame
        const worldAngle = robotYaw + angle;
        const dx = range * Math.cos(worldAngle);
        const dy = range * Math.sin(worldAngle);

        // Apply to canvas coordinates
        // Note: canvas Y is inverted (positive up in map, positive down in canvas)
        const x = robotX + dx * scale;
        const y = robotY - dy * scale;

        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();

        angle += scan.angle_increment;
    }
}
