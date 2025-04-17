document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const startPoint = document.getElementById('startPoint');
    const animatedElement = document.getElementById('animatedElement');
    const resetBtn = document.getElementById('resetBtn');
    const previewBtn = document.getElementById('previewBtn');
    const copyBtn = document.getElementById('copyBtn');
    const cssOutput = document.getElementById('cssOutput');
    
    // 设置画布尺寸
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 记录鼠标轨迹和时间
    let isDrawing = false;
    let points = [];
    let startTime = 0;
    
    // 贝塞尔曲线参数
    let bezierParams = null;
    
    // 初始化起点位置
    function initPoints() {
        const startRect = startPoint.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // 调整动画元素到起点位置
        animatedElement.style.position = 'absolute';
        animatedElement.style.top = `${startPoint.offsetTop}px`;
        animatedElement.style.left = `${startPoint.offsetLeft}px`;
    }
    
    initPoints();
    window.addEventListener('resize', initPoints);
    
    // 画布鼠标事件处理
    canvas.addEventListener('mousedown', (e) => {
        const canvasRect = canvas.getBoundingClientRect();
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
        
        // 强制从起点元素开始绘制
        const startX = startPoint.offsetLeft + startPoint.offsetWidth / 2;
        const startY = startPoint.offsetTop + startPoint.offsetHeight / 2;
        
        points = [];
        points.push({
            x: startX,  // 使用起点元素位置作为第一个点
            y: startY,
            time: performance.now()
        });
        
        // 添加点击位置作为第二个点，确保曲线从起点开始
        points.push({
            x: x,
            y: y,
            time: performance.now() + 1
        });
        
        startTime = performance.now();
        isDrawing = true;
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制初始路径
        drawPath();
        
        // 重置动画元素
        animatedElement.classList.remove('animate');
        animatedElement.style.top = `${startPoint.offsetTop}px`;
        animatedElement.style.left = `${startPoint.offsetLeft}px`;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
        
        points.push({
            x: x,
            y: y,
            time: performance.now()
        });
        
        // 绘制路径
        drawPath();
    });
    
    canvas.addEventListener('mouseup', () => {
        if (!isDrawing) return;
        isDrawing = false;
        
        // 计算贝塞尔曲线参数
        calculateBezier();
        
        // 生成CSS代码
        generateCSS();
    });
    
    canvas.addEventListener('mouseleave', () => {
        if (isDrawing) {
            isDrawing = false;
            
            // 计算贝塞尔曲线参数
            calculateBezier();
            
            // 生成CSS代码
            generateCSS();
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
    
    // 计算贝塞尔曲线参数
    function calculateBezier() {
        if (points.length < 3) {
            console.error('需要更多的点来计算贝塞尔曲线');
            return;
        }
        
        // 为了简化，我们使用三阶贝塞尔曲线
        // 选择关键点：起点、1/3点、2/3点、终点
        const startX = points[0].x / canvas.width;
        const startY = points[0].y / canvas.height;
        
        const oneThirdIndex = Math.floor(points.length / 3);
        const twoThirdsIndex = Math.floor(points.length * 2 / 3);
        
        const oneThirdX = points[oneThirdIndex].x / canvas.width;
        const oneThirdY = points[oneThirdIndex].y / canvas.height;
        
        const twoThirdsX = points[twoThirdsIndex].x / canvas.width;
        const twoThirdsY = points[twoThirdsIndex].y / canvas.height;
        
        // 由于CSS cubic-bezier函数使用的是相对值，我们需要进行换算
        // cubic-bezier(x1, y1, x2, y2)中的x值表示时间比例，y值表示进度比例
        // 起点是(0,0)，终点是(1,1)，所以我们只需要计算两个控制点
        
        // 粗略的速度映射，将轨迹上点之间的速度映射到贝塞尔控制点
        const firstControlDuration = (points[oneThirdIndex].time - points[0].time) / (points[points.length - 1].time - points[0].time);
        const secondControlDuration = (points[twoThirdsIndex].time - points[0].time) / (points[points.length - 1].time - points[0].time);
        
        // 限制贝塞尔曲线参数在[0,1]范围内
        const x1 = Math.max(0, Math.min(1, firstControlDuration));
        const y1 = Math.max(0, Math.min(1, oneThirdY));
        
        const x2 = Math.max(0, Math.min(1, secondControlDuration));
        const y2 = Math.max(0, Math.min(1, twoThirdsY));
        
        bezierParams = { x1, y1, x2, y2 };
        console.log('贝塞尔曲线参数：', bezierParams);
    }
    
    // 生成SVG路径
    function generateSVGPath() {
        if (points.length < 2) return '';
        
        // 生成相对路径，从原点开始
        // 记录起点元素的位置
        const firstX = points[0].x;
        const firstY = points[0].y;
        
        // 路径从原点(0,0)开始
        let pathData = `M 0 0`;
        
        // 生成相对于起点元素的路径
        for (let i = 1; i < points.length; i++) {
            // 计算相对位置
            const relativeX = points[i].x - firstX;
            const relativeY = points[i].y - firstY;
            
            if (i === 1 && points.length <= 3) {
                // 如果只有两个点，添加中间控制点使路径看起来更平滑
                pathData += ` C ${relativeX/3} ${relativeY/3}, ${relativeX*2/3} ${relativeY*2/3}, ${relativeX} ${relativeY}`;
            } else {
                pathData += ` L ${relativeX} ${relativeY}`;
            }
        }
        
        return pathData;
    }
    
    // 生成CSS代码
    function generateCSS() {
        if (points.length < 3) {
            cssOutput.textContent = '/* 请先绘制有效的路径 */';
            return;
        }
        
        // 获取贝塞尔曲线参数用于timing-function
        const { x1, y1, x2, y2 } = bezierParams || { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
        
        // 获取起点位置
        const startTop = startPoint.offsetTop;
        const startLeft = startPoint.offsetLeft;
        
        // 计算轨迹绘制中最后一个点相对于起点的位置（用于兼容性回退）
        const lastPoint = points[points.length - 1];
        const firstPoint = points[0];
        const endTop = startTop + (lastPoint.y - firstPoint.y);
        const endLeft = startLeft + (lastPoint.x - firstPoint.x);
        
        // 计算动画时长（基于轨迹绘制时长）
        const duration = (points[points.length - 1].time - points[0].time) / 1000;
        const roundedDuration = Math.max(0.5, Math.min(5, Math.round(duration * 10) / 10));
        
        // 获取SVG路径
        const pathData = generateSVGPath();
        
        const cssCode = `.element-animation {
  /* 起始属性，确保定位在正确的起点 */
  position: absolute;
  top: ${startTop}px;
  left: ${startLeft}px;
  
  /* 使用offset-path (Motion Path)实现元素沿曲线移动 */
  offset-path: path('${pathData}');
  offset-rotate: 0deg; /* 保持元素方向不变 */
  animation: followPath ${roundedDuration}s forwards;
  animation-timing-function: cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)});
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
    animation: moveAlongPath ${roundedDuration}s forwards;
    animation-timing-function: cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)});
  }
  
  @keyframes moveAlongPath {
    0% {
      top: ${startTop}px;
      left: ${startLeft}px;
    }
    100% {
      top: ${endTop}px;
      left: ${endLeft}px;
    }
  }
}`;
        
        cssOutput.textContent = cssCode;
    }
    
    // 预览按钮
    previewBtn.addEventListener('click', () => {
        if (!bezierParams) {
            alert('请先绘制路径');
            return;
        }
        
        const { x1, y1, x2, y2 } = bezierParams;
        
        // 计算动画时长
        const duration = (points[points.length - 1].time - points[0].time) / 1000;
        const roundedDuration = Math.max(0.5, Math.min(5, Math.round(duration * 10) / 10));
        
        // 计算最后一个点相对于起点的位置
        const lastPoint = points[points.length - 1];
        const firstPoint = points[0];
        const diffX = lastPoint.x - firstPoint.x;
        const diffY = lastPoint.y - firstPoint.y;
        
        // 创建临时样式表
        const styleSheet = document.createElement('style');
        styleSheet.id = 'tempAnimationStyle';
        styleSheet.textContent = `
            @keyframes tempFollowPath {
                0% {
                    offset-distance: 0%;
                }
                100% {
                    offset-distance: 100%;
                }
            }
        `;
        document.head.appendChild(styleSheet);
        
        // 检查浏览器是否支持offset-path
        const supportsOffsetPath = CSS.supports && CSS.supports('offset-path', 'path("M0,0")');
        
        // 确保元素在起点位置
        animatedElement.style.position = 'absolute';
        animatedElement.style.top = `${startPoint.offsetTop}px`;
        animatedElement.style.left = `${startPoint.offsetLeft}px`;
        
        // 获取SVG路径
        const pathData = generateSVGPath();
        
        if (supportsOffsetPath) {
            // 应用动画样式 - 沿着路径移动
            animatedElement.style.offsetPath = `path('${pathData}')`;
            animatedElement.style.offsetRotate = '0deg';
            animatedElement.style.animation = `tempFollowPath ${roundedDuration}s cubic-bezier(${x1}, ${y1}, ${x2}, ${y2}) forwards`;
            
            // 添加调试信息
            console.log('起点:', startPoint.offsetLeft, startPoint.offsetTop);
            console.log('路径:', pathData);
        } else {
            // 回退到简单动画 - 移动到最后绘制的点
            animatedElement.style.transition = `all ${roundedDuration}s cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
            animatedElement.style.top = `${startPoint.offsetTop + diffY}px`;
            animatedElement.style.left = `${startPoint.offsetLeft + diffX}px`;
        }
        
        // 移除临时样式表的定时器（但不重置元素位置）
        setTimeout(() => {
            // 移除临时样式表
            if (document.getElementById('tempAnimationStyle')) {
                document.getElementById('tempAnimationStyle').remove();
            }
            
            // 保留元素在最后位置，只移除动画属性
            animatedElement.style.animation = 'none';
        }, roundedDuration * 1000 + 100);
    });
    
    // 重置按钮
    resetBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        points = [];
        bezierParams = null;
        cssOutput.textContent = '/* 绘制路径后将生成CSS代码 */';
        
        // 重置动画元素
        animatedElement.style.transition = 'none';
        animatedElement.style.offsetPath = '';
        animatedElement.style.offsetRotate = '';
        animatedElement.style.animation = '';
        animatedElement.style.top = `${startPoint.offsetTop}px`;
        animatedElement.style.left = `${startPoint.offsetLeft}px`;
    });
    
    // 复制按钮
    copyBtn.addEventListener('click', () => {
        if (!bezierParams) {
            alert('请先绘制路径');
            return;
        }
        
        // 复制CSS代码到剪贴板
        const cssCode = cssOutput.textContent;
        navigator.clipboard.writeText(cssCode)
            .then(() => {
                alert('CSS代码已复制到剪贴板');
            })
            .catch(err => {
                console.error('复制失败：', err);
                alert('复制失败，请手动复制');
            });
    });
    
    // 使起点可拖动
    function makeDraggable(element) {
        let isDragging = false;
        let offsetX, offsetY;
        
        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const parent = element.parentElement;
            const parentRect = parent.getBoundingClientRect();
            
            let newLeft = e.clientX - parentRect.left - offsetX;
            let newTop = e.clientY - parentRect.top - offsetY;
            
            // 边界检查
            newLeft = Math.max(0, Math.min(parentRect.width - element.offsetWidth, newLeft));
            newTop = Math.max(0, Math.min(parentRect.height - element.offsetHeight, newTop));
            
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
            
            // 如果移动了起点，重新生成CSS
            if (bezierParams) {
                generateCSS();
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    makeDraggable(startPoint);
});