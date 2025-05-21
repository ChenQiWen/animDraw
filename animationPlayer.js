/**
 * @file animationPlayer.js
 * @description Handles the playback of animations using the Web Animations API.
 * It also manages element style resets and debug marker displays.
 */

import { getPoints, getBezierParams, getMotionKeyframes, getFilteredPoints } from './animationLogic.js';

/** @typedef {import('./animationLogic.js').Point} Point */
/** @typedef {import('./animationLogic.js').Keyframe} Keyframe */
/** @typedef {import('./cssGenerator.js').ElementPosition} ElementPosition */


/**
 * The HTML element to be animated.
 * @type {HTMLElement | null}
 */
let animatedElement = null;

/**
 * Current state of the debug mode.
 * @type {boolean}
 */
let currentDebugMode = false;

/**
 * Initializes the animation player with the target element and initial debug mode state.
 * @param {HTMLElement} element - The HTML element to animate.
 * @param {boolean} initialDebugMode - The initial state of debug mode.
 */
export function initializeAnimationPlayer(element, initialDebugMode) {
    animatedElement = element;
    currentDebugMode = initialDebugMode;
    if (!animatedElement) {
        console.error("AnimationPlayer initialized with no element.");
    }
    console.log("AnimationPlayer initialized");
}

/**
 * Updates the internal debug mode state.
 * @param {boolean} newDebugMode - The new state for debug mode.
 */
export function updateDebugMode(newDebugMode) {
    currentDebugMode = newDebugMode;
}

/**
 * Plays the animation based on the current mode and calculated path data.
 * Uses the Web Animations API to animate the element's `top` and `left` properties.
 * @param {boolean} isPathMode - True if path animation mode is active.
 * @param {ElementPosition} currentElementPosition - The current CSS position of the element,
 * used as the starting point for path animations.
 */
export function playAnimation(isPathMode, currentElementPosition) {
    if (!animatedElement) {
        console.error("Animated element not initialized for playAnimation.");
        return;
    }
    const allRawPoints = getPoints(); // Raw points from animationLogic

    if (!isPathMode || !allRawPoints || allRawPoints.length < 3) {
        if (isPathMode) {
            alert('请先绘制有效的路径 (至少3个点)');
        } else {
            alert('路径模式下才能预览动画');
        }
        return;
    }

    console.log('---- 开始播放动画 (Web Animations API) ----');

    const bezierParamsData = getBezierParams(); // Bezier params from animationLogic
    const { x1, y1, x2, y2 } = bezierParamsData || { x1: 0.42, y1: 0, x2: 0.58, y2: 1 }; // Default Bezier
    const durationMs = (allRawPoints[allRawPoints.length - 1].time - allRawPoints[0].time);
    const roundedDurationSec = Math.max(0.5, Math.min(5, Math.round(durationMs / 100) / 10)); // Duration in seconds

    const filteredPathPoints = getFilteredPoints(); // Filtered points from animationLogic
    if (!filteredPathPoints || filteredPathPoints.length < 2) {
        console.error("播放动画错误：过滤后的点不足 (至少2个点)。");
        return;
    }

    // The visual path starts at `filteredPathPoints[0]`.
    // The element's center should align with this point.
    const pathStartX = filteredPathPoints[0].x;
    const pathStartY = filteredPathPoints[0].y;

    const elementRect = animatedElement.getBoundingClientRect();
    const elementWidth = elementRect.width;
    const elementHeight = elementRect.height;

    // Calculate the element's top-left position to center it on the path's start point.
    const initialAnimTopLeftX = pathStartX - elementWidth / 2;
    const initialAnimTopLeftY = pathStartY - elementHeight / 2;

    resetElementStyles(); // Clear previous styles and animations

    // Log details for debugging
    console.log(`元素尺寸: W=${elementWidth}px, H=${elementHeight}px`);
    console.log(`路径视觉起点 (用户绘制): X=${pathStartX.toFixed(2)}, Y=${pathStartY.toFixed(2)}`);
    console.log(`动画开始时元素左上角目标位置: X=${initialAnimTopLeftX.toFixed(2)}, Y=${initialAnimTopLeftY.toFixed(2)}`);

    /** @type {ComputedKeyframe[]} */
    const keyframesForWAAPI = [];
    const motionKeyframesData = getMotionKeyframes(); // Processed keyframes from animationLogic

    // Set the element's initial position *before* the animation starts.
    // This is the 'ground truth' from which the WAAPI will animate.
    animatedElement.style.position = 'fixed';
    animatedElement.style.left = `${initialAnimTopLeftX.toFixed(2)}px`;
    animatedElement.style.top = `${initialAnimTopLeftY.toFixed(2)}px`;
    
    // Use a microtask (Promise.resolve()) to ensure the initial style is applied
    // and computed before the animation begins. This helps prevent animation glitches.
    Promise.resolve().then(() => {
        const computedStyle = window.getComputedStyle(animatedElement);
        const appliedStartX = parseFloat(computedStyle.left);
        const appliedStartY = parseFloat(computedStyle.top);
        console.log(`动画帧生成前，元素实际应用的左上角位置: X=${appliedStartX.toFixed(2)}, Y=${appliedStartY.toFixed(2)}`);

        // Generate keyframes for the Web Animations API.
        // These keyframes are absolute screen positions for `left` and `top`.
        if (motionKeyframesData && motionKeyframesData.length >= 3) {
            // Use processed keyframes if available
            motionKeyframesData.forEach(kf => {
                // Calculate the screen position for this keyframe:
                // Element's initial animation top-left + (current path point - first path point)
                const screenX = initialAnimTopLeftX + (kf.point.x - pathStartX);
                const screenY = initialAnimTopLeftY + (kf.point.y - pathStartY);
                keyframesForWAAPI.push({
                    offset: kf.progress,
                    left: `${screenX.toFixed(2)}px`,
                    top: `${screenY.toFixed(2)}px`
                });
            });
        } else {
            // Fallback: Use all filtered path points if processed keyframes aren't suitable
            filteredPathPoints.forEach((p, index, arr) => {
                const screenX = initialAnimTopLeftX + (p.x - pathStartX);
                const screenY = initialAnimTopLeftY + (p.y - pathStartY);
                keyframesForWAAPI.push({
                    offset: arr.length === 1 ? 1 : index / (arr.length - 1), // Normalized progress
                    left: `${screenX.toFixed(2)}px`,
                    top: `${screenY.toFixed(2)}px`
                });
            });
        }
        
        // Crucially, ensure the first keyframe of the animation matches the element's *current* (initial) position.
        if (keyframesForWAAPI.length > 0) {
            keyframesForWAAPI[0].left = `${appliedStartX.toFixed(2)}px`;
            keyframesForWAAPI[0].top = `${appliedStartY.toFixed(2)}px`;
        } else {
            console.error("无法生成播放关键帧 (WAAPI)。");
            return;
        }
        
        /** @type {KeyframeAnimationOptions} */
        const timingOptions = {
            duration: roundedDurationSec * 1000, // Duration in milliseconds
            easing: (motionKeyframesData && motionKeyframesData.length >= 3) ? 'linear' : `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
            fill: 'forwards' // Keep element at its final animated state
        };
        
        // Start the animation
        animatedElement.animation = animatedElement.animate(keyframesForWAAPI, timingOptions);

        animatedElement.animation.onfinish = () => {
            console.log('动画 (WAAPI) 完成');
            // Update the application's record of the element's position
            // This is important if the animation's end state is the new "resting" state.
            if (keyframesForWAAPI.length > 0) {
                const lastFrame = keyframesForWAAPI[keyframesForWAAPI.length - 1];
                 if (typeof window.updateCurrentElementPosition === 'function') { // Global function exposed by main.js
                    window.updateCurrentElementPosition({ top: lastFrame.top, left: lastFrame.left });
                }
            }
        };

        // Display debug markers if debug mode is active
        if (currentDebugMode) {
            const adjustedPointsForDebug = filteredPathPoints.map(p => ({
                x: p.x - elementWidth / 2, // Top-left for each point if element was centered on it
                y: p.y - elementHeight / 2
            }));
            displayDebugMarkers(filteredPathPoints, adjustedPointsForDebug);
        }
    });
}

/**
 * Resets all inline styles and cancels any ongoing Web Animation on the animated element.
 * Sets the element to a base visual state (fixed position, no transform, no animation properties).
 * The actual top/left position is not set here; it's typically set by `initElement` or before an animation.
 */
export function resetElementStyles() {
    if (!animatedElement) return;

    const wasAnimating = !!animatedElement.animation; // Check if a WAAPI animation object exists
    if (animatedElement.animation) {
        animatedElement.animation.cancel(); // Cancel the WAAPI
        animatedElement.animation = null;
    }

    // Clear all inline styles
    animatedElement.style.cssText = '';
    
    // Set to a known base state
    animatedElement.style.position = 'fixed';
    // Note: `top` and `left` are explicitly NOT set here. They are determined by other logic
    // (e.g., initElement for centering, or playAnimation for starting path).
    animatedElement.style.transform = 'none'; // Crucial for WAAPI if it animates transform
    animatedElement.style.animation = 'none'; // Clears any CSS-defined animations
    animatedElement.style.transition = 'none'; // Clears any CSS transitions
    
    // Clear properties related to offset-path, even if WAAPI is used, for consistency
    animatedElement.style.offsetPath = 'none';
    animatedElement.style.offsetDistance = '0';
    animatedElement.style.offsetRotate = '0deg';

    if (wasAnimating) {
        // Explicitly clear CSS animation properties that might have been set by old CSS approach
        animatedElement.style.animationName = 'none';
        animatedElement.style.animationDuration = '0s';
    }
    
    // Optional: force a reflow if there are immediate style changes following this reset.
    // void animatedElement.offsetWidth; 
}

/**
 * Displays SVG markers for debugging animation paths.
 * Shows the original path points (element centers) and the calculated top-left points for animation.
 * @param {Point[]} originalPathPoints - The array of points representing the center of the element along the path.
 * @param {Point[]} animatedTopLeftPoints - The array of points representing the top-left corner for WAAPI keyframes.
 * @private
 */
function displayDebugMarkers(originalPathPoints, animatedTopLeftPoints) {
    const svg = document.getElementById('debugPath');
    if (!svg) {
        console.warn("Debug SVG element #debugPath not found.");
        return;
    }
    svg.innerHTML = ''; // Clear previous markers to prevent clutter

    if (!originalPathPoints || originalPathPoints.length === 0) return;

    const firstPathPoint = originalPathPoints[0];

    // Marker for the start of the visual path (element's center)
    let pathStartMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    pathStartMarker.id = 'pathStartMarker';
    pathStartMarker.setAttribute('r', '5');
    pathStartMarker.setAttribute('fill', 'red'); // Red for path center start
    pathStartMarker.setAttribute('cx', firstPathPoint.x.toFixed(2));
    pathStartMarker.setAttribute('cy', firstPathPoint.y.toFixed(2));
    svg.appendChild(pathStartMarker);

    // Marker for the element's top-left corner at the start of the animation
    if (animatedTopLeftPoints && animatedTopLeftPoints.length > 0) {
        let animStartCornerMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        animStartCornerMarker.id = 'cornerMarker';
        animStartCornerMarker.setAttribute('r', '4');
        animStartCornerMarker.setAttribute('fill', 'blue'); // Blue for animation top-left start
        animStartCornerMarker.setAttribute('cx', animatedTopLeftPoints[0].x.toFixed(2));
        animStartCornerMarker.setAttribute('cy', animatedTopLeftPoints[0].y.toFixed(2));
        svg.appendChild(animStartCornerMarker);
    }
    
    // Marker for the element's current actual center (after being positioned for animation start)
    if (animatedElement) {
        const rect = animatedElement.getBoundingClientRect();
        const currentCenterX = rect.left + rect.width / 2;
        const currentCenterY = rect.top + rect.height / 2;
        let actualCenterMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        actualCenterMarker.id = 'centerMarker';
        actualCenterMarker.setAttribute('r', '3');
        actualCenterMarker.setAttribute('fill', 'green'); // Green for current actual center
        actualCenterMarker.setAttribute('cx', currentCenterX.toFixed(2));
        actualCenterMarker.setAttribute('cy', currentCenterY.toFixed(2));
        svg.appendChild(actualCenterMarker);
    }

    // Visualization of the drawn path (using original center points)
    let pathVisualization = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathVisualization.id = 'pathVisualization';
    pathVisualization.setAttribute('fill', 'none');
    pathVisualization.setAttribute('stroke', 'rgba(0, 255, 0, 0.5)'); // Light green for the path itself
    pathVisualization.setAttribute('stroke-width', '2');
    
    let pathDataString = `M ${firstPathPoint.x.toFixed(2)} ${firstPathPoint.y.toFixed(2)}`;
    for (let i = 1; i < originalPathPoints.length; i++) {
        pathDataString += ` L ${originalPathPoints[i].x.toFixed(2)} ${originalPathPoints[i].y.toFixed(2)}`;
    }
    pathVisualization.setAttribute('d', pathDataString);
    svg.appendChild(pathVisualization);

    svg.style.display = 'block'; // Ensure SVG overlay is visible
}

/**
 * Hides the SVG debug markers.
 */
export function hideDebugMarkers() {
    const svg = document.getElementById('debugPath');
    if (svg) {
        svg.style.display = 'none';
    }
}

console.log("animationPlayer.js loaded");
