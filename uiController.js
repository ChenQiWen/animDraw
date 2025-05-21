/**
 * @file uiController.js
 * @description Manages all UI elements, interactions, and updates for the animation tool.
 * This includes button event listeners, modal controls, and dynamic text updates.
 */

// DOM Elements
/** @type {HTMLElement} */
let cssOutput;
/** @type {HTMLElement} */
let pathIndicator;
/** @type {HTMLElement} */
let modeDescription;
/** @type {HTMLElement} */
let codeModal;
/** @type {HTMLButtonElement} */
let viewCodeBtn;
/** @type {HTMLElement} */
let closeModal;
/** @type {HTMLButtonElement} */
let copyBtnInModal;
/** @type {HTMLButtonElement} */
let resetBtn;
/** @type {HTMLButtonElement} */
let previewBtn;
/** @type {HTMLInputElement} */
let modeToggle;

/**
 * Initializes DOM element variables used by the UI controller.
 * Queries the DOM for necessary elements and stores references to them.
 */
export function initializeUIElements() {
    resetBtn = document.getElementById('resetBtn');
    previewBtn = document.getElementById('previewBtn');
    modeToggle = document.getElementById('modeToggle');
    cssOutput = document.getElementById('cssOutput');
    pathIndicator = document.getElementById('pathIndicator');
    modeDescription = document.getElementById('modeDescription');
    codeModal = document.getElementById('codeModal');
    viewCodeBtn = document.getElementById('viewCodeBtn');
    closeModal = document.getElementById('closeModal');
    copyBtnInModal = document.getElementById('copyBtnInModal');

    // Basic check to ensure critical elements are found
    if (!resetBtn || !previewBtn || !modeToggle || !cssOutput || !codeModal) {
        console.error("Critical UI elements not found during initialization!");
    }

    console.log("UI elements initialized");
}

/**
 * Sets up event listeners for UI elements.
 * @param {function(boolean): void} handleModeToggle - Callback function to handle mode changes.
 * @param {function(): void} handleResetAll - Callback function to handle reset action.
 * @param {function(): void} handlePreviewAnimation - Callback function to handle preview animation action.
 * @param {function(): boolean} getIsPathMode - Function to get the current path mode status.
 * @param {function(): string} getCssOutputText - Function to get the current CSS output text.
 */
export function setupEventListeners(
    handleModeToggle,
    handleResetAll,
    handlePreviewAnimation,
    getIsPathMode,
    getCssOutputText
) {
    if (modeToggle) {
        modeToggle.addEventListener('change', () => {
            const isPathMode = modeToggle.checked;
            // The existing logic for 'change' event remains the same here
            if (isPathMode) {
                if(modeDescription) modeDescription.textContent = '当前模式：路径模式 - 拖动鼠标绘制元素移动路径，松开后点击预览可查看动画效果';
                document.body.classList.add('path-mode');
            } else {
                if(modeDescription) modeDescription.textContent = '当前模式：元素定位模式 - 拖动元素调整其在页面上的固定位置';
                document.body.classList.remove('path-mode');
            }
            handleModeToggle(isPathMode); // Callback from main.js
        });
    } else {
        // Log an error if modeToggle is not found, so it's clear in the console why the toggle won't work.
        console.error("UIController: modeToggle element not found. 'change' event listener not attached.");
    }

    if(resetBtn) resetBtn.addEventListener('click', handleResetAll);
    if(previewBtn) previewBtn.addEventListener('click', handlePreviewAnimation);

    if(viewCodeBtn) viewCodeBtn.addEventListener('click', () => {
        const cssCode = getCssOutputText();
        
        if (cssCode.includes('请先') || cssCode.length < 20) {
            alert('请先拖动元素或绘制路径');
            return;
        }
        
        const canvas = document.getElementById('drawingCanvas');
        if(canvas) canvas.style.pointerEvents = 'none';
        if(codeModal) {
            codeModal.style.display = 'flex';
            setTimeout(() => {
                codeModal.classList.add('show');
                document.body.style.overflow = 'hidden'; 
            }, 10); // Delay for CSS transition
        }
    });

    if(closeModal) closeModal.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideModal();
    });

    if(codeModal) codeModal.addEventListener('click', (e) => {
        if (e.target === codeModal) { // Click on modal backdrop
            hideModal();
        }
    });

    if(copyBtnInModal) copyBtnInModal.addEventListener('click', () => {
        const cssCode = getCssOutputText();
        
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
                console.error('复制CSS失败：', err);
                alert('复制失败，请手动复制');
            });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && codeModal && codeModal.style.display !== 'none') {
            hideModal();
        }
    });

    console.log("UI event listeners set up");
}

/**
 * Hides the CSS code modal.
 * Manages body overflow and canvas pointer events.
 * @private
 */
function hideModal() {
    if(codeModal) {
        codeModal.classList.remove('show');
        document.body.style.overflow = ''; // Restore body scroll
        
        // Wait for transition before setting display to none
        setTimeout(() => {
            codeModal.style.display = 'none';
            const canvas = document.getElementById('drawingCanvas');
            if(canvas) {
                 canvas.style.pointerEvents = 'auto'; // Restore canvas interaction
            }
        }, 300); // Match this duration to CSS transition duration for .modal
    }
}

/**
 * Updates the content of the CSS output display area.
 * @param {string} text - The CSS code or message to display.
 */
export function updateCssOutput(text) {
    if (cssOutput) {
        cssOutput.textContent = text;
    }
}

/**
 * Toggles the visibility of the path drawing indicator.
 * @param {boolean} isActive - True to show the indicator, false to hide it.
 */
export function updatePathIndicator(isActive) {
    if (pathIndicator) {
        if (isActive) {
            pathIndicator.classList.add('active');
        } else {
            pathIndicator.classList.remove('active');
        }
    }
}

/**
 * Sets the initial description text for the current mode.
 * @param {boolean} isPathMode - True if path mode is active, false otherwise.
 */
export function setInitialModeDescription(isPathMode) {
    if (modeDescription) {
        if (isPathMode) {
            modeDescription.textContent = '当前模式：路径模式 - 拖动鼠标绘制元素移动路径，松开后点击预览可查看动画效果';
        } else {
            modeDescription.textContent = '当前模式：元素定位模式 - 拖动元素调整其在页面上的固定位置';
        }
    }
}

/**
 * Updates the title attribute of the animated element based on the current mode.
 * @param {boolean} isPathMode - True if path mode is active.
 * @param {HTMLElement} element - The animated element.
 */
export function updateAnimatedElementTitle(isPathMode, element) {
    if(element) {
        if (isPathMode) {
            element.title = '点击并拖动鼠标绘制路径';
        } else {
            element.title = '拖动我调整位置';
        }
    }
}

console.log("uiController.js loaded");
