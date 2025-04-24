document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const contentContainer = document.getElementById('contentContainer');
    const addTextBtn = document.getElementById('addTextBtn');
    const printBtn = document.getElementById('printBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    const a4Page = document.getElementById('a4Page');
    let draggedElement = null;
    let currentScale = 1;
    let isMobile = window.innerWidth <= 768;

    // 检测设备类型
    function updateDeviceStatus() {
        isMobile = window.innerWidth <= 768;
        // 在移动设备上自动设置初始缩放
        if (isMobile && currentScale === 1) {
            currentScale = 0.95;
            updateZoomLevel();
        }
    }

    // 窗口大小变化时更新设备状态
    window.addEventListener('resize', updateDeviceStatus);
    updateDeviceStatus();

    // 缩放控制
    function updateZoomLevel() {
        a4Page.style.transform = `scale(${currentScale})`;
        zoomLevelDisplay.textContent = `${Math.round(currentScale * 100)}%`;
    }

    zoomInBtn.addEventListener('click', () => {
        currentScale += 0.1;
        if (currentScale > 2) currentScale = 2;
        updateZoomLevel();
    });

    zoomOutBtn.addEventListener('click', () => {
        currentScale -= 0.1;
        if (currentScale < 0.5) currentScale = 0.5;
        updateZoomLevel();
    });

    resetZoomBtn.addEventListener('click', () => {
        currentScale = 1;
        updateZoomLevel();
    });

    // 触摸手势支持
    if (window.Hammer) {
        const hammer = new Hammer(a4Page);
        hammer.get('pinch').set({ enable: true });
        
        hammer.on('pinch', (e) => {
            // 缩放手势
            let newScale = currentScale * e.scale;
            if (newScale > 2) newScale = 2;
            if (newScale < 0.5) newScale = 0.5;
            a4Page.style.transform = `scale(${newScale})`;
        });
        
        hammer.on('pinchend', (e) => {
            // 更新当前缩放级别
            currentScale = currentScale * e.scale;
            if (currentScale > 2) currentScale = 2;
            if (currentScale < 0.5) currentScale = 0.5;
            updateZoomLevel();
        });
    }

    // 在当前光标位置插入内容
    function insertAtCursor(element) {
        const selection = window.getSelection();
        if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(element);
            // 移动光标到插入的内容后面
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            contentContainer.appendChild(element);
        }
    }

    // 处理图片文件上传
    imageInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (validFiles.length === 0) {
            alert('请选择有效的图片文件');
            return;
        }

        try {
            for (const file of validFiles) {
                const img = await createImageElement(file);
                insertImageToContent(img);
            }
        } catch (error) {
            console.error('Error processing images:', error);
            alert('处理图片时出错');
        }
    });

    // 处理粘贴事件
    contentContainer.addEventListener('paste', async (e) => {
        e.preventDefault();
        const items = Array.from(e.clipboardData.items);

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                // 处理粘贴的图片
                const file = item.getAsFile();
                try {
                    const img = await createImageElement(file);
                    // 在光标位置插入图片
                    insertAtCursor(img);
                } catch (error) {
                    console.error('Error processing pasted image:', error);
                }
            } else if (item.type === 'text/plain') {
                // 处理粘贴的文字
                item.getAsString((text) => {
                    // 使用 execCommand 在当前光标位置插入文本
                    document.execCommand('insertText', false, text);
                });
            }
        }
    });

    // 添加文本块
    addTextBtn.addEventListener('click', () => {
        const p = document.createElement('p');
        p.innerHTML = '<br>'; // 确保空段落有高度
        // 在光标位置插入新段落
        const selection = window.getSelection();
        if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            range.insertNode(p);
        } else {
            contentContainer.appendChild(p);
        }
        // 聚焦到段落开始位置
        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        p.focus();
    });

    // 图片拖拽排序 - 增强触摸支持
    let touchTimeout; // 用于区分点击和拖动
    let isTouchDragging = false;
    let touchStartY = 0;
    let lastTouchedElement = null;

    // 桌面端拖拽支持
    contentContainer.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG') {
            draggedElement = e.target;
            draggedElement.style.opacity = '0.5';
            e.dataTransfer.setData('text/plain', '');
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    contentContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    contentContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const target = e.target;
        
        if (!draggedElement || target === draggedElement) {
            return;
        }

        if (target.tagName === 'IMG') {
            // 判断拖放位置
            const rect = target.getBoundingClientRect();
            const insertBefore = e.clientY < rect.top + rect.height / 2;
            
            // 确保元素被移动而不是复制
            draggedElement.remove();
            target.parentNode.insertBefore(draggedElement, insertBefore ? target : target.nextSibling);
        }
    });

    contentContainer.addEventListener('dragend', (e) => {
        if (draggedElement) {
            draggedElement.style.opacity = '1';
            draggedElement = null;
        }
    });

    // 移动设备触摸支持
    if (isMobile) {
        // 触摸开始
        contentContainer.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'IMG') {
                lastTouchedElement = e.target;
                touchStartY = e.touches[0].clientY;
                
                // 设置超时区分点击和拖动
                touchTimeout = setTimeout(() => {
                    // 长按进入拖动模式
                    isTouchDragging = true;
                    lastTouchedElement.style.opacity = '0.5';
                    // 振动反馈（如果设备支持）
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }, 300);
            }
        }, { passive: false });

        // 触摸移动
        contentContainer.addEventListener('touchmove', (e) => {
            if (isTouchDragging && lastTouchedElement) {
                e.preventDefault();
                // 通过触摸位置找到最近的可放置元素
                const touch = e.touches[0];
                const elemBelow = document.elementFromPoint(
                    touch.clientX,
                    touch.clientY
                );
                
                if (elemBelow && elemBelow.tagName === 'IMG' && elemBelow !== lastTouchedElement) {
                    const rect = elemBelow.getBoundingClientRect();
                    const insertBefore = touch.clientY < rect.top + rect.height / 2;
                    
                    // 将拖动元素移动到新位置
                    lastTouchedElement.remove();
                    elemBelow.parentNode.insertBefore(
                        lastTouchedElement,
                        insertBefore ? elemBelow : elemBelow.nextSibling
                    );
                }
            }
        }, { passive: false });

        // 触摸结束
        contentContainer.addEventListener('touchend', () => {
            clearTimeout(touchTimeout);
            if (lastTouchedElement) {
                lastTouchedElement.style.opacity = '1';
            }
            isTouchDragging = false;
            lastTouchedElement = null;
        });
    }

    // 创建图片元素
    function createImageElement(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    img.draggable = true;
                    // 添加触摸友好的样式
                    if (isMobile) {
                        img.classList.add('touch-friendly');
                    }
                    resolve(img);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 将图片插入到内容区域
    function insertImageToContent(img) {
        // 移除占位符文本
        removePlaceholder();
        // 在光标位置插入图片
        insertAtCursor(img);
    }

    // 移除占位符文本
    function removePlaceholder() {
        const placeholder = contentContainer.querySelector('.placeholder');
        if (placeholder) {
            placeholder.remove();
        }
    }

    // 处理内容区域的点击事件
    contentContainer.addEventListener('click', (e) => {
        const isEmptyContainer = contentContainer.childNodes.length === 0;
        const isClickingPlaceholder = e.target.classList && e.target.classList.contains('placeholder');
        const isClickingContainer = e.target === contentContainer;

        // 只有在点击空容器、占位符，或者容器本身且没有其他内容时才创建新段落
        if (isClickingPlaceholder || (isClickingContainer && isEmptyContainer)) {
            // 移除占位符文本
            removePlaceholder();
            
            // // 创建新的段落并插入到开始位置
            // const p = document.createElement('p');
            // p.innerHTML = '<br>'; // 确保空段落有高度
            // contentContainer.insertBefore(p, contentContainer.firstChild);
            
            // 设置光标位置到段落开始处
            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            p.focus();
        }
    });

    // 在移动设备上，点击内容区域外的地方失去焦点时隐藏键盘
    document.addEventListener('click', (e) => {
        if (isMobile && !contentContainer.contains(e.target) && document.activeElement === contentContainer) {
            contentContainer.blur();
        }
    });

    // 打印前的准备
    printBtn.addEventListener('click', () => {
        removePlaceholder();
        window.print();
    });

    // 生成当前日期文件名
    function getCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    // 保存为 PDF
    savePdfBtn.addEventListener('click', async () => {
        removePlaceholder();
        const element = document.querySelector('.a4');
        
        // 1. 备份原始高度设置
        const originalMinHeight = contentContainer.style.minHeight;
        const originalHeight = contentContainer.style.height;
        const originalTransform = a4Page.style.transform;
        
        // 2. 处理内容容器样式，以避免额外的空白
        contentContainer.style.minHeight = 'unset';
        contentContainer.style.height = 'auto';
        
        // 3. 临时移除可能导致空白页的样式
        const tempStyle = document.createElement('style');
        tempStyle.textContent = `
            @media print {
                .a4 {
                    min-height: 0 !important;
                    height: auto !important;
                }
                .content-container {
                    min-height: 0 !important;
                    height: auto !important;
                }
            }
        `;
        document.head.appendChild(tempStyle);
        
        // 在生成 PDF 时重置缩放，避免缩放导致的问题
        a4Page.style.transform = 'scale(1)';
        
        const opt = {
            margin: [10, 10, 10, 10], // 设置适当的边距 [上，左，下，右]
            filename: `${getCurrentDate()}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { 
                scale: isMobile ? 1 : 2, // 移动设备使用较低缩放以减少内存使用
                useCORS: true,
                letterRendering: true,
                backgroundColor: null
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true
            },
            pagebreak: { 
                mode: ['avoid-all', 'css', 'legacy'],
                avoid: ['img', 'table', 'div']
            }
        };

        try {
            // 临时隐藏可编辑状态的视觉提示
            contentContainer.style.outline = 'none';
            contentContainer.style.caretColor = 'transparent';
            
            // 显示加载提示（移动设备上特别有用）
            const loadingMsg = document.createElement('div');
            loadingMsg.textContent = '正在生成 PDF，请稍候...';
            loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:white;padding:15px;border-radius:5px;z-index:9999;';
            document.body.appendChild(loadingMsg);
            
            // 让 UI 有时间更新
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 使用 html2pdf 生成 PDF
            await html2pdf()
                .set(opt)
                .from(element)
                .toPdf() // 转换为 PDF 对象
                .get('pdf') // 获取 jsPDF 实例
                .then((pdf) => {
                    // 移除空白页
                    if (pdf.internal.getNumberOfPages() > 1) {
                        // 检查最后一页是否为空白
                        let lastPage = pdf.internal.getNumberOfPages();
                        if (lastPage > 1) {
                            pdf.deletePage(lastPage);
                        }
                    }
                    return pdf;
                })
                .save();
            
            // 清理并恢复样式
            document.head.removeChild(tempStyle);
            contentContainer.style.outline = '';
            contentContainer.style.caretColor = '';
            contentContainer.style.minHeight = originalMinHeight;
            contentContainer.style.height = originalHeight;
            a4Page.style.transform = originalTransform;
            document.body.removeChild(loadingMsg);
        } catch (error) {
            console.error('Error saving PDF:', error);
            alert('保存 PDF 时出错');
            
            // 确保清理并恢复样式
            document.head.removeChild(tempStyle);
            contentContainer.style.outline = '';
            contentContainer.style.caretColor = '';
            contentContainer.style.minHeight = originalMinHeight;
            contentContainer.style.height = originalHeight;
            a4Page.style.transform = originalTransform;
            
            const loadingMsg = document.querySelector('div[style*="正在生成 PDF"]');
            if (loadingMsg) document.body.removeChild(loadingMsg);
        }
    });

    // 处理拖放文件
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            imageInput.files = e.dataTransfer.files;
            imageInput.dispatchEvent(new Event('change'));
        }
    });
});
