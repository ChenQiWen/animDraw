/**
 * @file cssGenerator.js
 * @description Generates CSS code for element animation (path-based or fixed positioning).
 * It uses data from `animationLogic.js` to create appropriate CSS rules and @keyframes.
 */

import { getPoints, getBezierParams, getMotionKeyframes, generateSVGPath, getFilteredPoints } from './animationLogic.js';

/**
 * @typedef {import('./animationLogic.js').Point} Point
 * @typedef {import('./animationLogic.js').Keyframe} Keyframe
 * @typedef {Object} ElementPosition
 * @property {string} top - The top CSS value (e.g., '100px').
 * @property {string} left - The left CSS value (e.g., '150px').
 */

/**
 * Stores the most recently generated CSS output.
 * @type {string}
 */
let currentCssOutput = '';

/**
 * Generates CSS for either path animation or fixed positioning based on the current mode.
 * @param {boolean} isPathMode - True if path mode is active, false for positioning mode.
 * @param {ElementPosition} currentElementPosition - The current top/left position of the element.
 *        In path mode, this is the starting position of the element for the path animation.
 * @returns {string} The generated CSS code.
 */
export function generateDynamicCSS(isPathMode, currentElementPosition) {
    if (isPathMode) {
        const rawPoints = getPoints(); // Raw points from animationLogic
        if (!rawPoints || rawPoints.length < 3) {
            currentCssOutput = '/* 请先绘制有效的路径 (至少3个点) */';
            return currentCssOutput;
        }

        const filteredPathPoints = getFilteredPoints(); // Filtered points from animationLogic
        if (!filteredPathPoints || filteredPathPoints.length < 2) {
            currentCssOutput = '/* 过滤后点数不足 (至少2个点)，无法生成路径CSS */';
            return currentCssOutput;
        }
        
        // The SVG path for `offset-path` should be relative to the element's starting point on the path.
        // `filteredPathPoints[0]` is the first point of the visual path drawn by the user.
        const svgPathData = generateSVGPath(filteredPathPoints, filteredPathPoints[0]);
        
        // Calculate animation duration from raw points' timestamps
        const duration = (rawPoints[rawPoints.length - 1].time - rawPoints[0].time) / 1000;
        const roundedDuration = Math.max(0.5, Math.min(5, Math.round(duration * 10) / 10)); // Duration between 0.5s and 5s

        const motionKeyframesData = getMotionKeyframes(); // Keyframes from animationLogic
        const bezierParamsData = getBezierParams(); // Bezier params from animationLogic

        if (motionKeyframesData && motionKeyframesData.length >= 3) {
            currentCssOutput = generateKeyframeCSS(roundedDuration, svgPathData, motionKeyframesData, currentElementPosition, filteredPathPoints);
        } else if (bezierParamsData) {
            const { x1, y1, x2, y2 } = bezierParamsData;
            currentCssOutput = generateBezierCSS(roundedDuration, svgPathData, x1, y1, x2, y2, currentElementPosition, filteredPathPoints);
        } else {
            currentCssOutput = '/* 无法确定动画参数 (keyframes or bezier)，请重试 */';
        }
    } else {
        currentCssOutput = generatePositionCSS(currentElementPosition);
    }
    return currentCssOutput;
}

/**
 * Generates CSS for path animation using dynamic keyframes.
 * Includes `offset-path` and a fallback using `top`/`left` keyframes.
 * @param {number} duration - The animation duration in seconds.
 * @param {string} pathData - The SVG path data string for `offset-path`.
 * @param {Keyframe[]} keyframes - The animation keyframes.
 * @param {ElementPosition} currentElementPosition - The initial CSS position of the element before animation.
 * @param {Point[]} filteredPathPoints - The filtered points of the drawn path, used for fallback.
 * @returns {string} The generated CSS code.
 * @private
 */
function generateKeyframeCSS(duration, pathData, keyframes, currentElementPosition, filteredPathPoints) {
    let offsetPathKeyframesCSS = '@keyframes followPath {\n';
    for (let i = 0; i < keyframes.length; i++) {
        const percent = Math.round(keyframes[i].progress * 1000) / 10; // Progress as percentage string
        offsetPathKeyframesCSS += `  ${percent}% {\n    offset-distance: ${percent}%;\n  }\n`;
    }
    offsetPathKeyframesCSS += '}\n\n';

    // Fallback keyframes: animate 'top' and 'left'
    // The first point of the filtered path is the visual start of the user's drawing.
    const firstDrawnPoint = filteredPathPoints[0];
    let fallbackTopLeftKeyframesCSS = '@keyframes moveAlongPath {\n';
    for (let i = 0; i < keyframes.length; i++) {
        const percent = Math.round(keyframes[i].progress * 1000) / 10;
        // Calculate the position for fallback: element's initial fixed position + displacement along the path
        const displacementX = keyframes[i].point.x - firstDrawnPoint.x;
        const displacementY = keyframes[i].point.y - firstDrawnPoint.y;
        
        const top = parseFloat(currentElementPosition.top) + displacementY;
        const left = parseFloat(currentElementPosition.left) + displacementX;
        
        fallbackTopLeftKeyframesCSS += `  ${percent}% {\n    top: ${top.toFixed(2)}px;\n    left: ${left.toFixed(2)}px;\n  }\n`;
    }
    fallbackTopLeftKeyframesCSS += '}';
    
    const initialTop = parseFloat(currentElementPosition.top);
    const initialLeft = parseFloat(currentElementPosition.left);

    // Main CSS rule for the animated element
    return `.element-animation {
  /* Element's fixed position at the start of the path animation */
  position: fixed;
  top: ${initialTop.toFixed(2)}px;
  left: ${initialLeft.toFixed(2)}px;
  
  /* Visually center the element on its 'top'/'left' coordinates */
  transform: translate(-50%, -50%);
  transform-origin: center center;
  
  /* Modern animation using offset-path */
  offset-path: path('${pathData}');
  offset-rotate: 0deg; /* Keep element orientation consistent */
  animation: followPath ${duration}s linear forwards;
}

${offsetPathKeyframesCSS}

/* Fallback for browsers not supporting offset-path */
@supports not (offset-path: path('')) {
  .element-animation {
    /* Fallback uses 'top'/'left' animation */
    animation: moveAlongPath ${duration}s linear forwards;
    /* transform and transform-origin are still useful for centering */
  }
  
  ${fallbackTopLeftKeyframesCSS}
}`;
}

/**
 * Generates CSS for path animation using a single cubic-bezier timing function.
 * Includes `offset-path` and a fallback using `top`/`left` keyframes.
 * @param {number} duration - The animation duration in seconds.
 * @param {string} pathData - The SVG path data string for `offset-path`.
 * @param {number} x1 - Bezier control point x1.
 * @param {number} y1 - Bezier control point y1.
 * @param {number} x2 - Bezier control point x2.
 * @param {number} y2 - Bezier control point y2.
 * @param {ElementPosition} currentElementPosition - The initial CSS position of the element.
 * @param {Point[]} filteredPathPoints - The filtered points of the drawn path, used for fallback.
 * @returns {string} The generated CSS code.
 * @private
 */
function generateBezierCSS(duration, pathData, x1, y1, x2, y2, currentElementPosition, filteredPathPoints) {
    const bezierTiming = `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
    
    const initialTop = parseFloat(currentElementPosition.top);
    const initialLeft = parseFloat(currentElementPosition.left);

    // For fallback, the 100% keyframe needs the element's final position.
    // This is the element's initial fixed position + total displacement of the path.
    const firstDrawnPoint = filteredPathPoints[0];
    const lastDrawnPoint = filteredPathPoints[filteredPathPoints.length - 1];
    
    const finalTop = initialTop + (lastDrawnPoint.y - firstDrawnPoint.y);
    const finalLeft = initialLeft + (lastDrawnPoint.x - firstDrawnPoint.x);

    return `.element-animation {
  /* Element's fixed position at the start of the path animation */
  position: fixed;
  top: ${initialTop.toFixed(2)}px;
  left: ${initialLeft.toFixed(2)}px;
  
  /* Visually center the element */
  transform: translate(-50%, -50%);
  transform-origin: center center;
  
  /* Modern animation using offset-path */
  offset-path: path('${pathData}');
  offset-rotate: 0deg;
  animation: followPath ${duration}s ${bezierTiming} forwards;
}

/* Keyframes for offset-distance (used with offset-path) */
@keyframes followPath {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

/* Fallback for browsers not supporting offset-path */
@supports not (offset-path: path('')) {
  .element-animation {
    /* Fallback uses 'top'/'left' animation with the same Bezier timing */
    animation: moveAlongPath ${duration}s ${bezierTiming} forwards;
  }
  
  /* Keyframes for fallback 'top'/'left' animation */
  @keyframes moveAlongPath {
    0% {
      top: ${initialTop.toFixed(2)}px;
      left: ${initialLeft.toFixed(2)}px;
    }
    100% {
      top: ${finalTop.toFixed(2)}px;
      left: ${finalLeft.toFixed(2)}px;
    }
  }
}
`;
}

/**
 * Generates CSS for positioning an element at a fixed top/left.
 * This is used in "element positioning mode".
 * @param {ElementPosition} currentElementPosition - The target top/left position.
 * @returns {string} The generated CSS code.
 */
export function generatePositionCSS(currentElementPosition) {
    const top = parseFloat(currentElementPosition.top);
    const left = parseFloat(currentElementPosition.left);

    // Ensure top and left are valid numbers; default to 0 if not.
    const cssTop = (isNaN(top) ? 0 : top).toFixed(2);
    const cssLeft = (isNaN(left) ? 0 : left).toFixed(2);

    currentCssOutput = `.positioned-element {
  position: fixed;
  top: ${cssTop}px;
  left: ${cssLeft}px;
  width: 50px; /* Default width, consider making this dynamic if element size can change */
  height: 50px; /* Default height */
  background-color: #2ecc71; /* Default style */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
  /* Optional: Add translate(-50%, -50%) if top/left should refer to the element's center */
  /* transform: translate(-50%, -50%); */
}`;
    return currentCssOutput;
}

/**
 * Gets the most recently generated CSS output.
 * @returns {string} The stored CSS code.
 */
export function getCurrentCssOutput() {
    return currentCssOutput;
}

console.log("cssGenerator.js loaded");
