/**
 * @file animationLogic.js
 * @description Handles the core logic for processing user-drawn paths,
 * calculating animation parameters (keyframes, Bezier curves), and generating SVG path data.
 */

/**
 * @typedef {Object} Point
 * @property {number} time - The timestamp of the point.
 * @property {number} x - The x-coordinate.
 * @property {number} y - The y-coordinate.
 */

/**
 * @typedef {Object} Keyframe
 * @property {number} progress - The progress of the keyframe in the animation (0 to 1).
 * @property {Point} point - The Point object associated with this keyframe.
 */

/**
 * @typedef {Object} BezierParams
 * @property {number} x1 - The x-coordinate of the first control point.
 * @property {number} y1 - The y-coordinate of the first control point.
 * @property {number} x2 - The x-coordinate of the second control point.
 * @property {number} y2 - The y-coordinate of the second control point.
 */

/**
 * Stores the raw points drawn by the user for animation path calculation.
 * @type {Point[]}
 */
let points = [];

/**
 * Stores the calculated Bezier curve parameters.
 * @type {BezierParams | null}
 */
let bezierParams = null;

/**
 * Stores the calculated keyframes for CSS animation.
 * @type {Keyframe[] | null}
 */
let motionKeyframes = null;

// --- Point and Path Calculation ---

/**
 * Adds a raw point from user input to the `points` array.
 * @param {Point} point - The point object to add.
 */
export function addPoint(point) {
    points.push(point);
}

/**
 * Resets all stored animation data including points, Bezier parameters, and motion keyframes.
 */
export function resetPoints() {
    points = [];
    bezierParams = null;
    motionKeyframes = null;
}

/**
 * Gets the raw animation path points.
 * @returns {Point[]} The array of raw points.
 */
export function getPoints() {
    return points;
}

/**
 * Gets the calculated Bezier parameters.
 * @returns {BezierParams | null} The Bezier parameters or null if not calculated.
 */
export function getBezierParams() {
    return bezierParams;
}

/**
 * Gets the calculated motion keyframes.
 * @returns {Keyframe[] | null} The array of keyframes or null if not calculated.
 */
export function getMotionKeyframes() {
    return motionKeyframes;
}

/**
 * Calculates the Euclidean distance between two points.
 * @param {Point} point1 - The first point.
 * @param {Point} point2 - The second point.
 * @returns {number} The distance between the two points.
 * @private
 */
function getDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) +
        Math.pow(point1.y - point2.y, 2)
    );
}

/**
 * Filters an array of points to remove points that are too close to each other,
 * reducing noise and simplifying the path.
 * @param {Point[]} inputPoints - The array of points to filter.
 * @returns {Point[]} The filtered array of points.
 * @private
 */
function filterPoints(inputPoints) {
    if (inputPoints.length === 0) return [];
    const minDistance = 2; // Minimum distance between points to be kept
    const minDistanceSquared = minDistance * minDistance;
    let result = [inputPoints[0]]; // Always keep the first point

    for (let i = 1; i < inputPoints.length; i++) {
        const lastPoint = result[result.length - 1];
        const dx = inputPoints[i].x - lastPoint.x;
        const dy = inputPoints[i].y - lastPoint.y;
        const squaredDistance = dx * dx + dy * dy;
        if (squaredDistance >= minDistanceSquared) {
            result.push(inputPoints[i]);
        }
    }

    // Ensure the last original point is included if it's different from the last added point
    const lastOriginalPoint = inputPoints[inputPoints.length - 1];
    if (result[result.length - 1] !== lastOriginalPoint) {
        result.push(lastOriginalPoint);
    }
    return result;
}

// --- Keyframe Generation and Processing ---

/**
 * Creates an initial set of keyframes from filtered points.
 * Each point becomes a keyframe, and progress is based on time.
 * @param {Point[]} filteredPoints - The array of filtered points.
 * @returns {{keyframes: Keyframe[], totalDuration: number}} An object containing the array of keyframes and the total duration of the path.
 * @private
 */
function createKeyframes(filteredPoints) {
    if (filteredPoints.length < 2) return { keyframes: [], totalDuration: 0 };
    const totalDuration = filteredPoints[filteredPoints.length - 1].time - filteredPoints[0].time;
    const keyframes = [];

    for (let i = 0; i < filteredPoints.length; i++) {
        const progress = totalDuration > 0 ? (filteredPoints[i].time - filteredPoints[0].time) / totalDuration : 0;
        keyframes.push({
            progress: progress,
            point: filteredPoints[i]
        });
    }
    return { keyframes, totalDuration };
}

/**
 * Calculates the speed between consecutive keyframes.
 * @param {Keyframe[]} keyframes - An array of keyframes.
 * @returns {Array<{index: number, speed: number, progress: number}>} An array of objects containing speed information.
 * @private
 */
function calculateSpeeds(keyframes) {
    let speeds = [];
    for (let i = 1; i < keyframes.length; i++) {
        const timeDiff = keyframes[i].point.time - keyframes[i - 1].point.time;
        if (timeDiff <= 0) continue; // Avoid division by zero or negative time
        const distance = getDistance(keyframes[i].point, keyframes[i - 1].point);
        speeds.push({
            index: i, // Index of the *ending* point of the segment
            speed: distance / timeDiff,
            progress: keyframes[i].progress
        });
    }
    return speeds;
}

/**
 * Extracts keyframes where speed changes significantly.
 * This helps in creating more dynamic and representative animations.
 * @param {Keyframe[]} keyframes - The initial array of keyframes.
 * @param {Array<{index: number, speed: number, progress: number}>} speeds - Array of speed data.
 * @returns {Keyframe[]} A refined array of keyframes focusing on speed changes.
 * @private
 */
function extractKeySpeedPoints(keyframes, speeds) {
    if (keyframes.length === 0) return [];
    let result = [keyframes[0]]; // Always include the first keyframe
    const threshold = 0.2; // Threshold for detecting significant speed change
    let lastSpeed = speeds.length > 0 ? speeds[0].speed : 0;

    for (let i = 1; i < speeds.length; i++) {
        const speedChange = Math.abs(speeds[i].speed - lastSpeed) / Math.max(lastSpeed, 0.1); // Avoid division by zero
        if (speedChange > threshold) {
            // If speed changes significantly, add the keyframe before the change and the keyframe at the change
            result.push(keyframes[speeds[i - 1].index]);
            result.push(keyframes[speeds[i].index]);
            lastSpeed = speeds[i].speed;
        }
    }
    
    // Ensure the last keyframe is always included
    const lastKeyframe = keyframes[keyframes.length - 1];
    if (result.length > 0 && result[result.length-1] && result[result.length - 1].point.time !== lastKeyframe.point.time) {
        result.push(lastKeyframe);
    } else if (result.length === 0 && keyframes.length > 0) {
        // Fallback if no significant speed changes were detected but points exist
        result.push(keyframes[0]);
        if (keyframes.length > 1) result.push(keyframes[keyframes.length-1]);
    }

    // Deduplicate points that might have been added multiple times due to overlapping conditions
    return result.filter((item, index, self) =>
        index === self.findIndex((t) => (
            t.point.time === item.point.time && t.point.x === item.point.x && t.point.y === item.point.y
        ))
    );
}

/**
 * Normalizes the number of keyframes. If too few, adds intermediate points. If too many, samples them.
 * @param {Keyframe[]} speedKeyframes - Keyframes selected based on speed.
 * @param {Keyframe[]} originalKeyframes - The full set of keyframes before speed processing.
 * @returns {Keyframe[]} A normalized array of keyframes.
 * @private
 */
function normalizeKeyframeCount(speedKeyframes, originalKeyframes) {
    // If too few keyframes and original path was detailed, add more points
    if (speedKeyframes.length < 5 && originalKeyframes.length > 10) {
        const result = [originalKeyframes[0]];
        const step = Math.floor(originalKeyframes.length / 8); // Aim for around 8-10 keyframes
        if (step > 0) {
            for (let i = step; i < originalKeyframes.length - step; i += step) {
                result.push(originalKeyframes[i]);
            }
        }
        result.push(originalKeyframes[originalKeyframes.length - 1]);
        return result.filter((item, index, self) => index === self.findIndex(t => t.point.time === item.point.time)); // Deduplicate
    }
    // If too many keyframes, reduce them
    else if (speedKeyframes.length > 20) {
        const result = [speedKeyframes[0]];
        const step = Math.floor(speedKeyframes.length / 20); // Aim for around 20 keyframes
        if (step > 0) {
            for (let i = step; i < speedKeyframes.length - step; i += step) {
                result.push(speedKeyframes[i]);
            }
        }
        result.push(speedKeyframes[speedKeyframes.length - 1]);
        return result.filter((item, index, self) => index === self.findIndex(t => t.point.time === item.point.time)); // Deduplicate
    }
    return speedKeyframes;
}

/**
 * Finds the keyframe in an array that is closest to a target progress value.
 * @param {Keyframe[]} keyframes - The array of keyframes to search.
 * @param {number} targetProgress - The target progress value (0 to 1).
 * @returns {Keyframe} The keyframe closest to the target progress.
 * @private
 */
function findClosestKeyframeByProgress(keyframes, targetProgress) {
    if (!keyframes || keyframes.length === 0) return null;
    let closestIndex = 0;
    let minDiff = 1.0;
    for (let i = 0; i < keyframes.length; i++) {
        const diff = Math.abs(keyframes[i].progress - targetProgress);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    }
    return keyframes[closestIndex];
}

/**
 * Smooths keyframes by adding intermediate points if the progress gap between keyframes is large.
 * @param {Keyframe[]} keyframes - The array of keyframes to smooth.
 * @param {Keyframe[]} originalKeyframes - The original, more detailed set of keyframes.
 * @returns {Keyframe[]} The smoothed array of keyframes.
 * @private
 */
function smoothKeyframes(keyframes, originalKeyframes) {
    if (keyframes.length < 2) return keyframes;
    let result = [];
    for (let i = 0; i < keyframes.length - 1; i++) {
        const current = keyframes[i];
        const next = keyframes[i + 1];
        result.push(current);
        // If progress difference is significant, add a midpoint from the original keyframes
        if (next.progress - current.progress > 0.1) { // 10% threshold
            const middleProgress = (current.progress + next.progress) / 2;
            const closestKeyframe = findClosestKeyframeByProgress(originalKeyframes, middleProgress);
            if (closestKeyframe && result[result.length-1].point.time !== closestKeyframe.point.time) { // Avoid duplicates
                 result.push(closestKeyframe);
            }
        }
    }
    result.push(keyframes[keyframes.length - 1]); // Add the very last keyframe
    return result;
}

/**
 * Processes raw keyframes through various refinement steps (speed analysis, normalization, smoothing).
 * @param {Keyframe[]} keyframes - The initial set of keyframes.
 * @param {number} pointCount - The number of points in the original filtered path.
 * @returns {Keyframe[]} The processed and refined array of keyframes.
 * @private
 */
function processKeyframes(keyframes, pointCount) {
    if (!keyframes || keyframes.length === 0) return [];
    const speeds = calculateSpeeds(keyframes);
    let speedKeyframes = extractKeySpeedPoints(keyframes, speeds);
    speedKeyframes = normalizeKeyframeCount(speedKeyframes, keyframes);
    if (pointCount > 5 && speedKeyframes.length >= 3) { // Only smooth if enough points/keyframes
        speedKeyframes = smoothKeyframes(speedKeyframes, originalKeyframes); // originalKeyframes might be better here
    }
    return speedKeyframes;
}


// --- Bezier Calculation ---

/**
 * Calculates cubic Bezier curve parameters based on the distribution of points over time.
 * This provides a simple heuristic for a timing function that reflects the user's drawing speed.
 * @param {Point[]} filteredPoints - The filtered array of points.
 * @param {number} totalDuration - The total duration of the path.
 * @returns {BezierParams} The calculated Bezier parameters.
 * @private
 */
function calculateBezierParameters(filteredPoints, totalDuration) {
    // Default Bezier, often a good starting point for smooth animations
    if (filteredPoints.length < 2 || totalDuration <= 0) return { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1.0 };

    // Use points at 1/3 and 2/3 of the path to influence Bezier handles
    const oneThirdIndex = Math.floor(filteredPoints.length / 3);
    const twoThirdsIndex = Math.floor(filteredPoints.length * 2 / 3);

    // Calculate time progression at these points
    const firstControlDuration = (filteredPoints[oneThirdIndex].time - filteredPoints[0].time) / totalDuration;
    const secondControlDuration = (filteredPoints[twoThirdsIndex].time - filteredPoints[0].time) / totalDuration;
    
    // Bezier X coordinates are based on time progression
    const x1 = Math.max(0, Math.min(1, firstControlDuration));
    // Bezier Y coordinates are based on spatial progression (how many points have been covered)
    const y1 = Math.max(0, Math.min(1, oneThirdIndex / (filteredPoints.length -1) ));
    
    const x2 = Math.max(0, Math.min(1, secondControlDuration));
    const y2 = Math.max(0, Math.min(1, twoThirdsIndex / (filteredPoints.length -1) ));

    return { x1, y1, x2, y2 };
}

// --- Main Calculation Orchestrator ---

/**
 * Orchestrates the calculation of all animation data.
 * This includes filtering points, creating keyframes, processing keyframes, and calculating Bezier parameters.
 * The results are stored in module-level variables (`motionKeyframes`, `bezierParams`).
 */
export function calculateAnimationData() {
    if (points.length < 3) {
        console.error('需要至少3个点来创建路径 (calculateAnimationData)');
        motionKeyframes = null;
        bezierParams = null;
        return;
    }

    const currentFilteredPoints = filterPoints(points);
    console.log('原始点数:', points.length, '过滤后点数:', currentFilteredPoints.length);

    if (currentFilteredPoints.length < 2) {
         console.error('过滤后点数不足2，无法生成动画数据');
        motionKeyframes = null;
        bezierParams = null;
        return;
    }
    
    const { keyframes: generatedKeyframes, totalDuration } = createKeyframes(currentFilteredPoints);
    
    // Pass original keyframes (generatedKeyframes) for smoothing reference
    motionKeyframes = processKeyframes(generatedKeyframes, currentFilteredPoints.length, generatedKeyframes); 
    console.log('处理后的动态关键帧：', motionKeyframes);
    
    bezierParams = calculateBezierParameters(currentFilteredPoints, totalDuration);
    console.log('贝塞尔曲线参数：', bezierParams);
}

// --- SVG Path Generation ---

/**
 * Generates an SVG path string (`d` attribute) from an array of points.
 * The path is relative to the first point (or an overridden first point), starting at "M 0 0".
 * @param {Point[]} animationPoints - The points to generate the path from.
 * @param {Point | null} [firstPointOverride=null] - If provided, path coordinates are relative to this point instead of `animationPoints[0]`.
 * @returns {string} The SVG path data string.
 */
export function generateSVGPath(animationPoints, firstPointOverride = null) {
    if (!animationPoints || animationPoints.length < 2) return 'M 0 0'; // Default empty path
    
    const firstX = firstPointOverride ? firstPointOverride.x : animationPoints[0].x;
    const firstY = firstPointOverride ? firstPointOverride.y : animationPoints[0].y;

    // Start path at origin (0,0) as it's relative for offset-path
    let pathData = `M 0 0`; 
    for (let i = 1; i < animationPoints.length; i++) {
        const relX = animationPoints[i].x - firstX;
        const relY = animationPoints[i].y - firstY;
        pathData += ` L ${relX.toFixed(2)} ${relY.toFixed(2)}`; // Add toFixed for cleaner SVG output
    }
    // console.log('生成的相对路径:', pathData); // Usually not needed for final version
    return pathData;
}

/**
 * Generates an absolute SVG path string from an array of points.
 * Useful for direct rendering or debugging, but not typically for `offset-path`.
 * @param {Point[]} animationPoints - The points to generate the path from.
 * @returns {string} The absolute SVG path data string.
 */
export function generateAbsoluteSVGPath(animationPoints) {
    if (!animationPoints || animationPoints.length < 2) return 'M 0 0';
    let pathData = `M ${animationPoints[0].x.toFixed(2)} ${animationPoints[0].y.toFixed(2)}`;
    for (let i = 1; i < animationPoints.length; i++) {
        pathData += ` L ${animationPoints[i].x.toFixed(2)} ${animationPoints[i].y.toFixed(2)}`;
    }
    return pathData;
}

/**
 * Gets the filtered points. This function re-filters the current raw points.
 * Useful for modules that need the processed point data for CSS or animation playback.
 * @returns {Point[]} The array of filtered points.
 */
export function getFilteredPoints() {
    return filterPoints(points); // Ensure it always returns freshly filtered points from current raw data
}

console.log("animationLogic.js loaded");
