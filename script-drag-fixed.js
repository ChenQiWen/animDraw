document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
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
    
    // 初始化动画元素位置
    function initElement() {
        animatedElement.style.position = 'absolute';
        animatedElement.style.top = '50px';
        animatedElement.style.left = '50px';
        animatedElement.style.cursor = 'grab';
    }
    
    initElement();
    
    // 记录拖拽轨迹和时间
    let isDragging = false;
    let points = [];
    let startTime = 0;
    let startPosition = { x: 0, y: 0 };
    
    // 贝塞尔曲线参数
    let bezierParams = null;
    
    // 元素拖拽事件
    animatedElement.addEventListener('mousedown', (e) => {
        e.preventDefault();
        
        // 记录起始位置
        const rect = animatedElement.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // 记录鼠标与元素中心的偏移量
        const offsetX = e.clientX - (rect.left + rect.width / 2);
        const offsetY = e.clientY - (rect.top + rect.height / 2);
        
        startPosition = {
            x: animatedElement.offsetLeft,
            y: animatedElement.offsetTop,
            offsetX: offsetX,
            offsetY: offsetY
        };
        
        // 重置轨迹
        points = [];
        points.push({
            time: performance.now(),
            elementX: animatedElement.offsetLeft,
            elementY: animatedElement.offsetTop
        });
        
        startTime = performance.now();
        isDragging = true;
        
        // 更改光标样式
        animatedElement.style.cursor = 'grabbing';
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 隐藏SVG路径
        const svgPath = document.getElementById('testPathVis');
        if (svgPath) {
            svgPath.setAttribute('d', 'M 0 0');
            svgPath.style.display = 'none';
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        
        // 计算元素新位置 - 鼠标直接跟随鼠标，但保持鼠标点击位置与元素的相对位置
        const newX = e.clientX - canvasRect.left - animatedElement.offsetWidth / 2;
        const newY = e.clientY - canvasRect.top - animatedElement.offsetHeight / 2;
        
        // 移动元素
        animatedElement.style.left = `${newX}px`;
        animatedElement.style.top = `${newY}px`;
        
        // 记录点 - 只记录元素位置
        points.push({
            time: performance.now(),
            elementX: animatedElement.offsetLeft,
            elementY: animatedElement.offsetTop
        });
        
        // 绘制轨迹
        drawPath();
    });
    
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        
        isDragging = false;
        
        // 更改光标样式
        animatedElement.style.cursor = 'grab';
        
        // 计算贝塞尔曲线参数
        calculateBezier();
        
        // 生成CSS代码
        generateCSS();
        
        // 自动预览动画
        playAnimation();
    });
    
    // 绘制路径
    function drawPath() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (points.length < 2) return;
        
        ctx.beginPath();
        
        // 获取元素中心位置
        const elementCenterOffsetX = animatedElement.offsetWidth / 2;
        const elementCenterOffsetY = animatedElement.offsetHeight / 2;
        
        // 计算第一个点的元素中心
        const firstX = points[0].elementX + elementCenterOffsetX;
        const firstY = points[0].elementY + elementCenterOffsetY;
        ctx.moveTo(firstX, firstY);
        
        for (let i = 1; i < points.length; i++) {
            // 计算每个点的元素中心
            const centerX = points[i].elementX + elementCenterOffsetX;
            const centerY = points[i].elementY + elementCenterOffsetY;
            ctx.lineTo(centerX, centerY);
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
        
        // 选择关键点：起点、1/3点、2/3点、终点
        const startX = points[0].x / canvas.width;
        const startY = points[0].y / canvas.height;
        
        const oneThirdIndex = Math.floor(points.length / 3);
        const twoThirdsIndex = Math.floor(points.length * 2 / 3);
        
        const oneThirdX = points[oneThirdIndex].x / canvas.width;
        const oneThirdY = points[oneThirdIndex].y / canvas.height;
        
        const twoThirdsX = points[twoThirdsIndex].x / canvas.width;
        const twoThirdsY = points[twoThirdsIndex].y / canvas.height;
        
        // 计算贝塞尔参数，映射速度到曲线控制点
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
    
    // 生成SVG路径 - 使用用户实际拖拽的路径
    function generateSVGPath() {
        if (points.length < 2) return 'M 0 0';
        
        // 计算相对路径（相对于第一个点）
        let pathData = `M 0 0`; // 起始位置为原点
        
        // 仅使用元素位置，不使用鼠标位置
        const firstX = points[0].elementX;
        const firstY = points[0].elementY;
        
        // 生成所有其他点的路径，相对于第一个点
        for (let i = 1; i < points.length; i++) {
            const relX = points[i].elementX - firstX;
            const relY = points[i].elementY - firstY;
            pathData += ` L ${relX} ${relY}`;
        }
        
        console.log('生成的实际拖拽路径:', pathData);
        return pathData;
    }
    
    // 生成绝对SVG路径（用于可视化显示）
    function generateAbsoluteSVGPath() {
        if (points.length < 2) return 'M 0 0';
        
        // 生成路径，使用绝对坐标
        let pathData = `M ${points[0].elementX} ${points[0].elementY}`;
        
        for (let i = 1; i < points.length; i++) {
            pathData += ` L ${points[i].elementX} ${points[i].elementY}`;
        }
        
        return pathData;
    }
    
    // 生成CSS代码
    function generateCSS() {
        if (points.length < 3) {
            cssOutput.textContent = '/* 请先拖动元素绘制有效的路径 */';
            return;
        }
        
        // 获取贝塞尔曲线参数
        const { x1, y1, x2, y2 } = bezierParams || { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
        
        // 获取起点和终点位置
        const startX = points[0].elementX;
        const startY = points[0].elementY;
        const endX = points[points.length - 1].elementX;
        const endY = points[points.length - 1].elementY;
        
        // 计算动画时长
        const duration = (points[points.length - 1].time - points[0].time) / 1000;
        const roundedDuration = Math.max(0.5, Math.min(5, Math.round(duration * 10) / 10));
        
        // 获取SVG路径
        const pathData = generateSVGPath();
        
        const cssCode = `.element-animation {
  /* 起始属性 */
  position: absolute;
  top: ${startY}px;
  left: ${startX}px;
  
  /* 使用offset-path实现元素沿曲线移动 */
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
      top: ${startY}px;
      left: ${startX}px;
    }
    100% {
      top: ${endY}px;
      left: ${endX}px;
    }
  }
}`;
        
        cssOutput.textContent = cssCode;
    }
    
    // 播放动画函数 - 抽取为共用函数
    function playAnimation() {
        if (points.length < 3) {
            alert('请先拖动元素绘制路径');
            return;
        }
        
        // 获取贝塞尔曲线参数用于timing-function
        const { x1, y1, x2, y2 } = bezierParams || { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
        
        // 计算动画时长
        const duration = (points[points.length - 1].time - points[0].time) / 1000;
        const roundedDuration = Math.max(0.5, Math.min(5, Math.round(duration * 10) / 10));
        
        // 获取SVG路径元素
        const svgPath = document.getElementById('testPathVis');
        
        // 生成绝对路径和相对路径
        const absolutePathD = generateAbsoluteSVGPath(); // 用于可视化显示
        const relativePathD = generateSVGPath();        // 用于offset-path
        
        // 将绝对路径设置到SVG元素，但不显示
        svgPath.setAttribute('d', absolutePathD);
        svgPath.style.display = 'none';
        
        // 创建临时样式
        let styleElem = document.getElementById('motionPathStyle');
        if (styleElem) styleElem.remove();
        
        styleElem = document.createElement('style');
        styleElem.id = 'motionPathStyle';
        styleElem.textContent = `
            @keyframes moveAlongPath {
                0% { offset-distance: 0%; }
                100% { offset-distance: 100%; }
            }
        `;
        document.head.appendChild(styleElem);
        
        console.log('绝对路径 (SVG显示):', absolutePathD);
        console.log('相对路径 (offset-path):', relativePathD);
        
        // 重置元素的动画属性
        animatedElement.style.animation = '';
        animatedElement.style.offsetPath = '';
        
        // 将元素移动到起始位置
        animatedElement.style.position = 'absolute';
        animatedElement.style.left = `${points[0].elementX}px`;
        animatedElement.style.top = `${points[0].elementY}px`;
        
        // 稍等片刻，确保浏览器已将元素移到起始位置
        setTimeout(() => {
            // 设置动画属性 - 使用实际拖拽路径和速度
            console.log('开始应用offset-path');
            animatedElement.style.offsetPath = `path('${relativePathD}')`;
            animatedElement.style.offsetRotate = '0deg';
            animatedElement.style.animation = `moveAlongPath ${roundedDuration}s cubic-bezier(${x1}, ${y1}, ${x2}, ${y2}) forwards`;
        }, 100);
    }
    
    // 预览动画 - 使用用户实际拖拽的路径
    previewBtn.addEventListener('click', playAnimation);
    
    // 重置按钮
    resetBtn.addEventListener('click', () => {
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
        
        points = [];
        bezierParams = null;
        cssOutput.textContent = '/* 拖动元素绘制路径后将生成CSS代码 */';
        
        // 重置动画元素
        animatedElement.style.transition = 'none';
        animatedElement.style.offsetPath = '';
        animatedElement.style.offsetRotate = '';
        animatedElement.style.animation = '';
        
        // 元素重新回到初始位置
        initElement();
    });
    
    // 复制按钮
    copyBtn.addEventListener('click', () => {
        if (!bezierParams) {
            alert('请先拖动元素绘制路径');
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
});