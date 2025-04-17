document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const animatedElement = document.getElementById('animatedElement');
    const resetBtn = document.getElementById('resetBtn');
    const previewBtn = document.getElementById('previewBtn');
    const copyBtn = document.getElementById('copyBtn');
    const cssOutput = document.getElementById('cssOutput');
    const modeToggle = document.getElementById('modeToggle');
    const modeDescription = document.getElementById('modeDescription');
    const pathIndicator = document.getElementById('pathIndicator');
    
    // 调试模式 - 按Shift+D启用，显示路径可视化
    window.debugMode = false;
    document.addEventListener('keydown', (e) => {
        // Shift+D 组合键切换调试模式
        if (e.shiftKey && e.key === 'D') {
            window.debugMode = !window.debugMode;
            console.log('调试模式：', window.debugMode ? '已启用' : '已禁用');
            
            // 如果有正在显示的路径，更新其可见性
            const testPath = document.getElementById('testPathVis');
            if (testPath) {
                testPath.style.display = window.debugMode ? 'block' : 'none';
            }
            
            const generatedPath = document.getElementById('generatedPathVis');
            if (generatedPath) {
                generatedPath.style.display = window.debugMode ? 'block' : 'none';
            }
        }
    });
    
    // 设置画布尺寸
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 初始化动画元素位置 - 将元素放置在屏幕中央
    function initElement() {
        // 获取窗口尺寸
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 获取元素尺寸
        const elementWidth = animatedElement.offsetWidth || 50; // 默认50px
        const elementHeight = animatedElement.offsetHeight || 50; // 默认50px
        
        // 计算中心位置
        const centerX = Math.max(0, (windowWidth - elementWidth) / 2);
        const centerY = Math.max(0, (windowHeight - elementHeight) / 2);
        
        // 设置元素位置
        animatedElement.style.position = 'fixed';
        animatedElement.style.top = `${centerY}px`;
        animatedElement.style.left = `${centerX}px`;
        animatedElement.style.cursor = 'grab';
        
        // 更新当前元素位置记录
        currentElementPosition = { top: `${centerY}px`, left: `${centerX}px` };
        
        return { top: centerY, left: centerX };
    }
    
    // 记录拖拽轨迹和时间
    let isDragging = false;
    let points = [];
    let startTime = 0;
    let startPosition = { x: 0, y: 0 };
    
    // 贝塞尔曲线参数
    let bezierParams = null;
    
    // 模式切换状态
    let isPathMode = false;
    
    // 当前元素位置（定位模式）
    let currentElementPosition = { top: '0px', left: '0px' };
    
    // 初始化元素位置
    initElement();
    
    // 设置初始提示
    animatedElement.title = '拖动我调整位置';
    
    // 当窗口大小变化时，保持元素在中心
    window.addEventListener('resize', () => {
        if (!isDragging) {
            initElement();
        }
    });
    
    // 模式切换处理
    modeToggle.addEventListener('change', () => {
        isPathMode = modeToggle.checked;
        
        if (isPathMode) {
            modeDescription.textContent = '当前模式：路径模式 - 拖动鼠标绘制元素移动路径，松开后点击预览可查看动画效果';
            document.body.classList.add('path-mode');
            animatedElement.title = '点击并拖动鼠标绘制路径';
        } else {
            modeDescription.textContent = '当前模式：元素定位模式 - 拖动元素调整其在页面上的固定位置';
            document.body.classList.remove('path-mode');
            animatedElement.title = '拖动我调整位置';
        }
        
        // 重置状态
        resetAll();
    });
    
    // 元素拖拽事件 - 支持两种模式
    animatedElement.addEventListener('mousedown', (e) => {
        e.preventDefault();
        
        if (isPathMode) {
            // 路径模式 - 从元素当前位置开始绘制路径
            const rect = animatedElement.getBoundingClientRect();
            
            // 重置轨迹
            points = [];
            points.push({
                time: performance.now(),
                x: e.clientX,
                y: e.clientY
            });
            
            startTime = performance.now();
            isDragging = true;
            
            // 显示路径绘制指示器
            pathIndicator.classList.add('active');
            
            // 清除画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 隐藏SVG路径
            const svgPath = document.getElementById('testPathVis');
            if (svgPath) {
                svgPath.setAttribute('d', 'M 0 0');
                svgPath.style.display = 'none';
            }
        } else {
            // 定位模式 - 拖动元素设置位置
            const rect = animatedElement.getBoundingClientRect();
            
            // 记录鼠标与元素中心的偏移量
            const offsetX = e.clientX - (rect.left + rect.width / 2);
            const offsetY = e.clientY - (rect.top + rect.height / 2);
            
            startPosition = {
                x: rect.left,
                y: rect.top,
                offsetX: offsetX,
                offsetY: offsetY
            };
            
            isDragging = true;
            
            // 更改光标样式
            animatedElement.style.cursor = 'grabbing';
        }
    });
    
    // 画布拖拽事件 - 路径模式
    canvas.addEventListener('mousedown', (e) => {
        if (!isPathMode) return; // 定位模式下不处理画布事件
        if (isDragging) return; // 如果已经在拖动中，不重复处理
        
        // 重置轨迹
        points = [];
        points.push({
            time: performance.now(),
            x: e.clientX,
            y: e.clientY
        });
        
        startTime = performance.now();
        isDragging = true;
        
        // 显示路径绘制指示器
        pathIndicator.classList.add('active');
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 隐藏SVG路径
        const svgPath = document.getElementById('testPathVis');
        if (svgPath) {
            svgPath.setAttribute('d', 'M 0 0');
            svgPath.style.display = 'none';
        }
    });
    
    // 鼠标移动事件
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        if (isPathMode) {
            // 路径模式 - 记录鼠标轨迹
            points.push({
                time: performance.now(),
                x: e.clientX,
                y: e.clientY
            });
            
            // 绘制路径
            drawPath();
        } else {
            // 定位模式 - 移动元素
            const newX = e.clientX - startPosition.offsetX - animatedElement.offsetWidth / 2;
            const newY = e.clientY - startPosition.offsetY - animatedElement.offsetHeight / 2;
            
            // 移动元素
            animatedElement.style.left = `${newX}px`;
            animatedElement.style.top = `${newY}px`;
            
            // 更新当前位置
            currentElementPosition = {
                top: `${newY}px`,
                left: `${newX}px`
            };
        }
    });
    
    // 鼠标释放事件
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        
        isDragging = false;
        
        if (isPathMode) {
            // 路径模式 - 计算贝塞尔曲线和生成CSS
            pathIndicator.classList.remove('active');
            
            if (points.length >= 3) {
                calculateBezier();
                generateCSS();
            } else {
                console.error('需要更多的点来计算贝塞尔曲线');
            }
        } else {
            // 定位模式 - 更新CSS代码
            animatedElement.style.cursor = 'grab';
            generatePositionCSS();
        }
    });
    
    // 绘制路径
    function drawPath() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // 计算动画参数（关键帧或贝塞尔曲线）
    function calculateBezier() {
        if (points.length < 3) {
            console.error('需要至少3个点来创建路径');
            return;
        }
        
        // 1. 预处理点数据
        const filteredPoints = filterPoints(points);
        console.log('原始点数:', points.length, '过滤后点数:', filteredPoints.length);
        
        // 2. 创建关键帧
        const { keyframes, totalDuration } = createKeyframes(filteredPoints);
        
        // 3. 智能关键帧处理
        const speedKeyframes = processKeyframes(keyframes, filteredPoints.length);
        
        // 4. 保存处理后的关键帧用于生成CSS
        window.motionKeyframes = speedKeyframes;
        console.log('处理后的动态关键帧：', speedKeyframes);
        
        // 5. 同时计算贝塞尔曲线参数作为备选方案
        bezierParams = calculateBezierParameters(filteredPoints, totalDuration);
        console.log('贝塞尔曲线参数：', bezierParams);
    }
    
    // 过滤点，去除太近的点以减少抖动
    function filterPoints(inputPoints) {
        // 减小最小距离阈值，保留更多原始点
        const minDistance = 2; // 从3减小到2，保留更多细节
        let result = [inputPoints[0]]; // 始终保留第一个点
        
        for (let i = 1; i < inputPoints.length; i++) {
            const lastPoint = result[result.length - 1];
            const distance = getDistance(inputPoints[i], lastPoint);
            
            // 只添加移动距离超过阈值的点
            if (distance >= minDistance) {
                result.push(inputPoints[i]);
            }
        }
        
        // 确保最后一个点被保留
        const lastOriginalPoint = inputPoints[inputPoints.length - 1];
        const lastFilteredPoint = result[result.length - 1];
        
        if (lastFilteredPoint !== lastOriginalPoint) {
            result.push(lastOriginalPoint);
        }
        
        return result;
    }
    
    // 计算两点之间的距离
    function getDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) + 
            Math.pow(point1.y - point2.y, 2)
        );
    }
    
    // 为过滤后的点创建关键帧
    function createKeyframes(filteredPoints) {
        const totalDuration = filteredPoints[filteredPoints.length - 1].time - filteredPoints[0].time;
        const keyframes = [];
        
        // 计算每个点对应的进度百分比
        for (let i = 0; i < filteredPoints.length; i++) {
            const progress = (filteredPoints[i].time - filteredPoints[0].time) / totalDuration;
            keyframes.push({
                progress: progress,
                point: filteredPoints[i]
            });
        }
        
        return { keyframes, totalDuration };
    }
    
    // 处理关键帧，进行速度分析和平滑化
    function processKeyframes(keyframes, pointCount) {
        // 1. 计算每个点的速度
        const speeds = calculateSpeeds(keyframes);
        
        // 2. 提取速度变化显著的关键帧
        let speedKeyframes = extractKeySpeedPoints(keyframes, speeds);
        
        // 3. 确保关键帧数量适当
        speedKeyframes = normalizeKeyframeCount(speedKeyframes, keyframes);
        
        // 4. 平滑化关键帧之间的过渡
        if (pointCount > 5 && speedKeyframes.length >= 3) {
            speedKeyframes = smoothKeyframes(speedKeyframes, keyframes);
        }
        
        return speedKeyframes;
    }
    
    // 计算每个点的速度
    function calculateSpeeds(keyframes) {
        let speeds = [];
        
        for (let i = 1; i < keyframes.length; i++) {
            const timeDiff = keyframes[i].point.time - keyframes[i-1].point.time;
            if (timeDiff <= 0) continue; // 防止除以0
            
            const distance = getDistance(keyframes[i].point, keyframes[i-1].point);
            const speed = distance / timeDiff;
            
            speeds.push({
                index: i,
                speed: speed,
                progress: keyframes[i].progress
            });
        }
        
        return speeds;
    }
    
    // 提取速度变化显著的关键帧
    function extractKeySpeedPoints(keyframes, speeds) {
        let result = [keyframes[0]]; // 始终保留第一个关键帧
        const threshold = 0.2; // 速度变化阈值
        
        let lastSpeed = speeds.length > 0 ? speeds[0].speed : 0;
        
        for (let i = 1; i < speeds.length; i++) {
            const speedChange = Math.abs(speeds[i].speed - lastSpeed) / Math.max(lastSpeed, 0.1);
            
            if (speedChange > threshold) {
                // 速度变化超过阈值，添加这个点及其前一点作为控制点
                result.push(keyframes[speeds[i-1].index]);
                result.push(keyframes[speeds[i].index]);
                lastSpeed = speeds[i].speed;
            }
        }
        
        // 添加最后一个关键帧
        const lastKeyframe = keyframes[keyframes.length - 1];
        if (result[result.length - 1].point.time !== lastKeyframe.point.time) {
            result.push(lastKeyframe);
        }
        
        return result;
    }
    
    // 关键帧数量标准化
    function normalizeKeyframeCount(speedKeyframes, originalKeyframes) {
        // 关键帧太少时增加
        if (speedKeyframes.length < 5 && originalKeyframes.length > 10) {
            const result = [originalKeyframes[0]];
            const step = Math.floor(originalKeyframes.length / 8);
            
            for (let i = step; i < originalKeyframes.length - step; i += step) {
                result.push(originalKeyframes[i]);
            }
            
            result.push(originalKeyframes[originalKeyframes.length - 1]);
            return result;
        } 
        // 关键帧太多时减少
        else if (speedKeyframes.length > 20) {
            const result = [speedKeyframes[0]];
            const step = Math.floor(speedKeyframes.length / 20);
            
            for (let i = step; i < speedKeyframes.length - step; i += step) {
                result.push(speedKeyframes[i]);
            }
            
            result.push(speedKeyframes[speedKeyframes.length - 1]);
            return result;
        }
        
        return speedKeyframes;
    }
    
    // 平滑化关键帧之间的过渡
    function smoothKeyframes(keyframes, originalKeyframes) {
        let result = [];
        
        for (let i = 0; i < keyframes.length - 1; i++) {
            const current = keyframes[i];
            const next = keyframes[i + 1];
            
            // 添加当前关键帧
            result.push(current);
            
            // 如果与下一个关键帧间隔超过10%，添加中间点
            if (next.progress - current.progress > 0.1) {
                const middleProgress = (current.progress + next.progress) / 2;
                
                // 找到最接近这个进度的实际点
                const closestKeyframe = findClosestKeyframeByProgress(originalKeyframes, middleProgress);
                result.push(closestKeyframe);
            }
        }
        
        // 添加最后一个关键帧
        result.push(keyframes[keyframes.length - 1]);
        
        return result;
    }
    
    // 找到最接近指定进度的关键帧
    function findClosestKeyframeByProgress(keyframes, targetProgress) {
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
    
    // 计算贝塞尔曲线参数
    function calculateBezierParameters(filteredPoints, totalDuration) {
        const oneThirdIndex = Math.floor(filteredPoints.length / 3);
        const twoThirdsIndex = Math.floor(filteredPoints.length * 2 / 3);
        
        // 粗略的速度映射，将轨迹上点之间的速度映射到贝塞尔控制点
        const firstControlDuration = (filteredPoints[oneThirdIndex].time - filteredPoints[0].time) / totalDuration;
        const secondControlDuration = (filteredPoints[twoThirdsIndex].time - filteredPoints[0].time) / totalDuration;
        
        // 限制贝塞尔曲线参数在[0,1]范围内
        const x1 = Math.max(0, Math.min(1, firstControlDuration));
        const y1 = Math.max(0, Math.min(1, oneThirdIndex / filteredPoints.length));
        
        const x2 = Math.max(0, Math.min(1, secondControlDuration));
        const y2 = Math.max(0, Math.min(1, twoThirdsIndex / filteredPoints.length));
        
        return { x1, y1, x2, y2 };
    }
    
    // 生成SVG路径 - 使用用户绘制的路径
    function generateSVGPath() {
        if (points.length < 2) return 'M 0 0';
        
        // 计算相对路径（相对于第一个点）
        let pathData = `M 0 0`; // 起始位置为原点
        
        const firstX = points[0].x;
        const firstY = points[0].y;
        
        // 生成所有其他点的路径，相对于第一个点
        for (let i = 1; i < points.length; i++) {
            const relX = points[i].x - firstX;
            const relY = points[i].y - firstY;
            pathData += ` L ${relX} ${relY}`;
        }
        
        console.log('生成的相对路径:', pathData);
        return pathData;
    }
    
    // 生成绝对SVG路径（用于可视化显示）
    function generateAbsoluteSVGPath() {
        if (points.length < 2) return 'M 0 0';
        
        // 生成路径，使用绝对坐标
        let pathData = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 1; i < points.length; i++) {
            pathData += ` L ${points[i].x} ${points[i].y}`;
        }
        
        return pathData;
    }
    
    // 生成路径模式CSS代码
    function generateCSS() {
        if (points.length < 3) {
            cssOutput.textContent = '/* 请先绘制有效的路径 */';
            return;
        }
        
        // 准备数据
        const filteredPoints = filterPoints(points);
        const pathData = generateSVGPath();
        const duration = (points[points.length - 1].time - points[0].time) / 1000;
        const roundedDuration = Math.max(0.5, Math.min(5, Math.round(duration * 10) / 10));
        
        // 决定使用哪种动画方式
        let cssCode;
        if (window.motionKeyframes && window.motionKeyframes.length >= 3) {
            cssCode = generateKeyframeCSS(roundedDuration, pathData);
        } else {
            const { x1, y1, x2, y2 } = bezierParams || { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
            cssCode = generateBezierCSS(roundedDuration, pathData, x1, y1, x2, y2);
        }
        
        cssOutput.textContent = cssCode;
    }
    
    // 生成关键帧动画CSS
    function generateKeyframeCSS(duration, pathData) {
        const keyframes = window.motionKeyframes;
        
        // 生成offset-distance关键帧
        let keyframesCSS = '@keyframes followPath {\n';
        for (let i = 0; i < keyframes.length; i++) {
            const percent = Math.round(keyframes[i].progress * 1000) / 10; // 提高精度
            keyframesCSS += `  ${percent}% {\n    offset-distance: ${percent}%;\n  }\n`;
        }
        keyframesCSS += '}\n\n';
        
        // 生成兼容性回退的关键帧
        const firstPoint = keyframes[0].point;
        
        let fallbackKeyframesCSS = '@keyframes moveAlongPath {\n';
        for (let i = 0; i < keyframes.length; i++) {
            const percent = Math.round(keyframes[i].progress * 1000) / 10;
            const relativeX = keyframes[i].point.x - firstPoint.x;
            const relativeY = keyframes[i].point.y - firstPoint.y;
            
            // 计算在生成的路径上的相对位置
            const top = parseFloat(currentElementPosition.top) + relativeY;
            const left = parseFloat(currentElementPosition.left) + relativeX;
            
            fallbackKeyframesCSS += `  ${percent}% {\n    top: ${top}px;\n    left: ${left}px;\n  }\n`;
        }
        fallbackKeyframesCSS += '}';
        
        // 生成主要CSS
        return `.element-animation {
  /* 起始属性 */
  position: fixed;
  top: ${currentElementPosition.top};
  left: ${currentElementPosition.left};
  
  /* 元素居中调整 */
  transform: translate(-50%, -50%);
  transform-origin: center center;
  
  /* 使用offset-path实现元素沿曲线移动 */
  offset-path: path('${pathData}');
  offset-rotate: 0deg; /* 保持元素方向不变 */
  animation: followPath ${duration}s linear forwards;
}

${keyframesCSS}

/* 兼容性回退 */
@supports not (offset-path: path('')) {
  .element-animation {
    animation: moveAlongPath ${duration}s linear forwards;
    transform: translate(-50%, -50%);
    transform-origin: center center;
  }
  
  ${fallbackKeyframesCSS}
}`;
    }
    
    // 生成贝塞尔曲线CSS
    function generateBezierCSS(duration, pathData, x1, y1, x2, y2) {
        // 格式化贝塞尔曲线参数
        const bezierTiming = `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
        
        return `.element-animation {
  /* 起始属性 */
  position: fixed;
  top: ${currentElementPosition.top};
  left: ${currentElementPosition.left};
  
  /* 元素居中调整 */
  transform: translate(-50%, -50%);
  transform-origin: center center;
  
  /* 使用offset-path实现元素沿曲线移动 */
  offset-path: path('${pathData}');
  offset-rotate: 0deg; /* 保持元素方向不变 */
  animation: followPath ${duration}s ${bezierTiming} forwards;
}

@keyframes followPath {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

/* 兼容性回退 */
@supports not (offset-path: path('')) {
  .element-animation {
    animation: moveAlongPath ${duration}s ${bezierTiming} forwards;
    transform: translate(-50%, -50%);
    transform-origin: center center;
  }
  
  @keyframes moveAlongPath {
    0% {
      top: ${currentElementPosition.top};
      left: ${currentElementPosition.left};
    }
    100% {
      top: ${points[points.length - 1].y}px;
      left: ${points[points.length - 1].x}px;
    }
  }
}
`;
    }
    
    // 生成定位模式CSS代码
    function generatePositionCSS() {
        const cssCode = `.positioned-element {
  position: fixed;
  top: ${currentElementPosition.top};
  left: ${currentElementPosition.left};
  width: 50px;
  height: 50px;
  background-color: #2ecc71;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
}`;
        
        cssOutput.textContent = cssCode;
    }
    
    // 播放动画函数
    function playAnimation() {
        if (!isPathMode || points.length < 3) {
            if (isPathMode) {
                alert('请先绘制有效的路径');
            } else {
                alert('路径模式下才能预览动画');
            }
            return;
        }
        
        console.log('---- 开始播放动画 ----');
        
        // 1. 准备动画参数
        const { x1, y1, x2, y2 } = bezierParams || { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
        const duration = (points[points.length - 1].time - points[0].time) / 1000;
        const roundedDuration = Math.max(0.5, Math.min(5, Math.round(duration * 10) / 10));
        
        // 2. 获取路径数据和元素尺寸
        const filteredPoints = filterPoints(points);
        const pathStartX = filteredPoints[0].x;
        const pathStartY = filteredPoints[0].y;
        
        // 更精确地获取元素尺寸 - 重要！
        // 只计算一次，避免多次获取可能的微小差异
        const elementRect = animatedElement.getBoundingClientRect();
        const elementWidth = elementRect.width;
        const elementHeight = elementRect.height;
        
        // 3. 计算元素的精确左上角位置（重要：不使用transform）
        const startX = pathStartX - elementWidth/2;
        const startY = pathStartY - elementHeight/2;

        // 4. 移除旧样式和动画
        let styleElem = document.getElementById('motionPathStyle');
        if (styleElem) styleElem.remove();
        
        // 移除动画
        if (animatedElement.animation) {
            animatedElement.animation.cancel();
            animatedElement.animation = null;
        }
        
        // 5. 强制重置元素 - 徻底清除所有样式并立即应用
        resetElementStyles();

        console.log('使用Web Animations API方法');
        console.log('元素尺寸:', elementWidth, elementHeight);
        console.log('路径起点:', pathStartX, pathStartY);
        console.log('调整后的左上角:', startX, startY);

        // 6. 准备关键帧数据 - 为Web Animations API准备
        const keyframes = [];
        
        // 预处理所有点，计算为元素左上角精确位置
        const adjustedPoints = [];
        for (let i = 0; i < filteredPoints.length; i++) {
            adjustedPoints.push({
                x: filteredPoints[i].x - elementWidth/2,
                y: filteredPoints[i].y - elementHeight/2
            });
        }
        
        // 7. 精确设置初始位置并创建关键帧
        // 直接使用绝对精确的像素值，避免任何浏览器计算差异
        animatedElement.style.position = 'fixed';
        animatedElement.style.left = `${startX}px`;
        animatedElement.style.top = `${startY}px`;
        
        // 8. 创建动画关键帧
        if (window.motionKeyframes && window.motionKeyframes.length >= 3) {
            // 使用处理过的关键帧
            for (let i = 0; i < window.motionKeyframes.length; i++) {
                const kf = window.motionKeyframes[i];
                const adjustedX = kf.point.x - elementWidth/2;
                const adjustedY = kf.point.y - elementHeight/2;
                
                keyframes.push({
                    offset: kf.progress,
                    left: `${adjustedX}px`,
                    top: `${adjustedY}px`
                });
            }
        } else {
            // 使用所有过滤后的点
            for (let i = 0; i < adjustedPoints.length; i++) {
                keyframes.push({
                    offset: i / (adjustedPoints.length - 1),
                    left: `${adjustedPoints[i].x}px`,
                    top: `${adjustedPoints[i].y}px`
                });
            }
        }
        
        // 9. 使用双重延迟策略确保位置稳定后再应用动画
        // 第一个setTimeout等待浏览器完成元素位置的计算和应用
        setTimeout(() => {
            // 重新确认元素位置，确保没有发生任何变化
            const currentLeft = parseFloat(window.getComputedStyle(animatedElement).left);
            const currentTop = parseFloat(window.getComputedStyle(animatedElement).top);
            
            // 检查位置是否精确，如果不是则再次设置
            if (Math.abs(currentLeft - startX) > 0.1 || Math.abs(currentTop - startY) > 0.1) {
                console.warn('元素位置发生了变化，重新设置...');
                console.log('应为:', startX, startY);
                console.log('实际:', currentLeft, currentTop);
                
                animatedElement.style.left = `${startX}px`;
                animatedElement.style.top = `${startY}px`;
                
                // 强制重绘
                void animatedElement.offsetWidth;
            }
            
            // 使用requestAnimationFrame确保在下一帧绘制前应用动画
            requestAnimationFrame(() => {
                // 10. 使用Web Animations API创建动画，完全避开CSS动画
                const timing = {
                    duration: roundedDuration * 1000, // 转换为毫秒
                    easing: window.motionKeyframes && window.motionKeyframes.length >= 3 ?
                        'linear' :
                        `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
                    fill: 'forwards'
                };
                
                // 应用动画并保存引用
                animatedElement.animation = animatedElement.animate(keyframes, timing);
                
                // 动画开始和结束事件处理
                animatedElement.animation.onfinish = () => {
                    console.log('动画完成');
                };
                
                // 添加调试标记
                if (window.debugMode) {
                    displayDebugMarkers(filteredPoints, adjustedPoints);
                }
            });
        }, 150); // 增加等待时间，确保元素位置完全稳定
    }
    
    // 重置元素所有样式到基本状态
    function resetElementStyles() {
        // 保存位置
        const wasAnimating = !!animatedElement.animation;
        
        // 取消任何正在进行的动画
        if (animatedElement.animation) {
            animatedElement.animation.cancel();
            animatedElement.animation = null;
        }
        
        // 完全清除所有样式
        animatedElement.style.cssText = '';
        
        // 设置基本样式
        animatedElement.style.position = 'fixed';
        
        // 确保没有偏移属性，全部设为初始值，不影响布局
        animatedElement.style.transform = 'none';
        animatedElement.style.animation = 'none';
        animatedElement.style.transition = 'none';
        animatedElement.style.offsetPath = 'none';
        animatedElement.style.offsetDistance = '0';
        
        // 如果元素曾经有动画，额外重置相关属性
        if (wasAnimating) {
            animatedElement.style.offsetRotate = '0deg';
            // 确保没有残留的动画属性
            animatedElement.style.animationName = 'none';
            animatedElement.style.animationDuration = '0s';
        }
        
        // 强制多次重绘，确保所有变化生效
        void animatedElement.offsetWidth;
        requestAnimationFrame(() => {
            void animatedElement.offsetWidth;
        });
    }
    
    // 显示调试标记
    function displayDebugMarkers(points, adjustedPoints) {
        // 显示路径
        const svg = document.getElementById('debugPath');
        const pathStartX = points[0].x;
        const pathStartY = points[0].y;
        
        // 创建或更新起点标记
        let startMarker = document.getElementById('pathStartMarker');
        if (!startMarker) {
            startMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            startMarker.id = 'pathStartMarker';
            startMarker.setAttribute('r', '5');
            startMarker.setAttribute('fill', 'red');
            svg.appendChild(startMarker);
        }
        
        startMarker.setAttribute('cx', pathStartX);
        startMarker.setAttribute('cy', pathStartY);
        startMarker.style.display = 'block';
        
        // 创建或更新左上角标记
        let cornerMarker = document.getElementById('cornerMarker');
        if (!cornerMarker) {
            cornerMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            cornerMarker.id = 'cornerMarker';
            cornerMarker.setAttribute('r', '3');
            cornerMarker.setAttribute('fill', 'blue');
            svg.appendChild(cornerMarker);
        }
        
        // 设置左上角标记位置
        if (adjustedPoints && adjustedPoints.length > 0) {
            cornerMarker.setAttribute('cx', adjustedPoints[0].x);
            cornerMarker.setAttribute('cy', adjustedPoints[0].y);
            cornerMarker.style.display = 'block';
        }
        
        // 创建或更新元素中心点标记
        let centerMarker = document.getElementById('centerMarker');
        if (!centerMarker) {
            centerMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            centerMarker.id = 'centerMarker';
            centerMarker.setAttribute('r', '3');
            centerMarker.setAttribute('fill', 'green');
            svg.appendChild(centerMarker);
        }
        
        // 设置中心点位置
        const rect = animatedElement.getBoundingClientRect();
        const centerX = rect.left + rect.width/2;
        const centerY = rect.top + rect.height/2;
        centerMarker.setAttribute('cx', centerX);
        centerMarker.setAttribute('cy', centerY);
        centerMarker.style.display = 'block';
        
        // 创建或更新路径
        let pathVis = document.getElementById('pathVisualization');
        if (!pathVis) {
            pathVis = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathVis.id = 'pathVisualization';
            pathVis.setAttribute('fill', 'none');
            pathVis.setAttribute('stroke', 'rgba(0, 255, 0, 0.5)');
            pathVis.setAttribute('stroke-width', '2');
            svg.appendChild(pathVis);
        }
        
        // 绘制路径
        let pathData = `M ${pathStartX} ${pathStartY}`;
        for (let i = 1; i < points.length; i++) {
            pathData += ` L ${points[i].x} ${points[i].y}`;
        }
        
        pathVis.setAttribute('d', pathData);
        pathVis.style.display = 'block';
    }
    
    // 重置所有状态
    function resetAll() {
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 清除SVG路径
        const svgPath = document.getElementById('testPathVis');
        if (svgPath) {
            svgPath.setAttribute('d', 'M 0 0');
            svgPath.style.display = 'none';
        }
        
        // 移除临时样式
        let styleElem = document.getElementById('motionPathStyle');
        if (styleElem) styleElem.remove();
        
        // 重置数据
        points = [];
        bezierParams = null;
        
        // 重置指示器
        pathIndicator.classList.remove('active');
        
        // 重置CSS输出
        if (isPathMode) {
            cssOutput.textContent = '/* 绘制路径后将生成CSS代码 */';
        } else {
            cssOutput.textContent = '/* 拖动元素后将生成CSS代码 */';
        }
        
        // 重置动画元素
        animatedElement.style.transition = 'none';
        animatedElement.style.transform = ''; // 重置变换
        animatedElement.style.offsetPath = '';
        animatedElement.style.offsetRotate = '';
        animatedElement.style.animation = '';
        
        // 如果不在路径模式，恢复元素位置
        if (!isPathMode) {
            // 元素重新回到初始位置或保持当前位置
            animatedElement.style.left = currentElementPosition.left;
            animatedElement.style.top = currentElementPosition.top;
        } else {
            // 路径模式下重置到初始位置
            initElement();
        }
        
        // 确保所有重置完成后强制重绘
        void animatedElement.offsetWidth;
    }
    
    // 预览按钮
    previewBtn.addEventListener('click', playAnimation);
    
    // 重置按钮
    resetBtn.addEventListener('click', resetAll);
    
    // 弹窗相关元素
    const codeModal = document.getElementById('codeModal');
    const viewCodeBtn = document.getElementById('viewCodeBtn');
    const closeModal = document.getElementById('closeModal');
    const copyBtnInModal = document.getElementById('copyBtnInModal');
    
    // 查看CSS代码按钮
    viewCodeBtn.addEventListener('click', () => {
        const cssCode = cssOutput.textContent;
        
        if (cssCode.includes('请先') || cssCode.length < 20) {
            alert('请先拖动元素或绘制路径');
            return;
        }
        
        // 显示弹窗
        // 先暂停铁层例如画布的事件
        canvas.style.pointerEvents = 'none';
        // 显示弹窗
        codeModal.style.display = 'flex';
        setTimeout(() => {
            codeModal.classList.add('show');
            document.body.style.overflow = 'hidden'; // 防止背景滚动
        }, 10);
    });
    
    // 关闭弹窗
    closeModal.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 防止事件冒泡
        console.log('关闭按钮被点击');
        
        codeModal.classList.remove('show');
        document.body.style.overflow = '';
        
        // 立即隐藏弹窗，不等待动画
        codeModal.style.display = 'none';
        
        // 恢复画布的事件
        setTimeout(() => {
            canvas.style.pointerEvents = 'auto';
        }, 100);
    });
    
    // 点击弹窗外部关闭
    codeModal.addEventListener('click', (e) => {
        if (e.target === codeModal) {
            console.log('点击弹窗外部');
            // 直接关闭，不通过关闭按钮
            codeModal.classList.remove('show');
            document.body.style.overflow = '';
            codeModal.style.display = 'none';
            
            // 恢复画布的事件
            setTimeout(() => {
                canvas.style.pointerEvents = 'auto';
            }, 100);
        }
    });
    
    // 弹窗内复制按钮
    copyBtnInModal.addEventListener('click', () => {
        const cssCode = cssOutput.textContent;
        
        navigator.clipboard.writeText(cssCode)
            .then(() => {
                copyBtnInModal.textContent = '已复制';
                copyBtnInModal.classList.add('copied');
                
                setTimeout(() => {
                    copyBtnInModal.textContent = '复制代码';
                    copyBtnInModal.classList.remove('copied');
                }, 2000);
            })
            .catch(err => {
                console.error('复制失败：', err);
                alert('复制失败，请手动复制');
            });
    });
    
    // 添加ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && codeModal.style.display !== 'none') {
            console.log('ESC键关闭弹窗');
            // 直接关闭，不通过关闭按钮
            codeModal.classList.remove('show');
            document.body.style.overflow = '';
            codeModal.style.display = 'none';
            
            // 恢复画布的事件
            setTimeout(() => {
                canvas.style.pointerEvents = 'auto';
            }, 100);
        }
    });
    
    // 初始生成一次定位CSS
    generatePositionCSS();
});