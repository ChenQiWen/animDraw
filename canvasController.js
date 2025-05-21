/**
 * @file canvasController.js
 * @description Manages the HTML5 canvas for drawing paths, including initialization, resizing,
 * event handling for drawing, and utility functions for path manipulation on the canvas.
 */

/** @type {HTMLCanvasElement} */
let canvas;
/** @type {CanvasRenderingContext2D} */
let ctx;

/**
 * @typedef {Object} Point
 * @property {number} time - The timestamp of the point.
 * @property {number} x - The x-coordinate.
 * @property {number} y - The y-coordinate.
 */

/**
 * Stores points for drawing the visual path on the canvas.
 * This is distinct from points used in `animationLogic.js` for animation calculation.
 * @type {Point[]}
 */
let canvasDrawingPoints = [];

/**
 * Initializes the canvas element and its 2D rendering context.
 * Sets up initial size and attaches a resize listener.
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} The canvas element and its 2D context.
 * @throws {Error} If the canvas element is not found in the DOM.
 */
export function initializeCanvas() {
    canvas = document.getElementById('drawingCanvas');
    if (!canvas) {
        throw new Error("Canvas element with ID 'drawingCanvas' not found.");
    }
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    console.log("Canvas initialized");
    return { canvas, ctx };
}

/**
 * Resizes the canvas to fill the window.
 * Called on initialization and window resize events.
 * @private
 */
function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

/**
 * Sets up canvas-specific event listeners.
 * Currently, this is for the 'mousedown' event to handle path drawing initiation.
 * @param {function(MouseEvent): void} handleCanvasMouseDown - Callback function to handle mousedown events on the canvas.
 */
export function setupCanvasEventListeners(handleCanvasMouseDown) {
    if (canvas) {
        canvas.addEventListener('mousedown', handleCanvasMouseDown);
    } else {
        console.error("Canvas not initialized before setting up event listeners.");
    }
    console.log("Canvas event listeners set up");
}

/**
 * Draws a path on the canvas based on the provided points.
 * The path is a series of connected lines.
 * @param {Point[]} currentPoints - An array of Point objects representing the path to draw.
 */
export function drawPath(currentPoints) {
    if (!ctx || !canvas) {
        console.warn("Canvas context not available for drawing.");
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!currentPoints || currentPoints.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(currentPoints[0].x, currentPoints[0].y);

    for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
    }

    ctx.strokeStyle = '#3498db'; // Consider making this configurable
    ctx.lineWidth = 2;          // Consider making this configurable
    ctx.stroke();
}

/**
 * Clears the entire canvas.
 */
export function clearCanvas() {
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

/**
 * Retrieves the points currently stored for drawing on the canvas.
 * @returns {Point[]} An array of Point objects.
 */
export function getCanvasPoints() {
    return canvasDrawingPoints;
}

/**
 * Adds a point to the canvas drawing path.
 * @param {Point} point - The Point object to add.
 */
export function addCanvasPoint(point) {
    canvasDrawingPoints.push(point);
}

/**
 * Resets the array of points used for drawing on the canvas.
 * Effectively clears the currently stored path.
 */
export function resetCanvasPoints() {
    canvasDrawingPoints = [];
}

console.log("canvasController.js loaded");
