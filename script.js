// --- DOM Elements ---
const previewCanvas = document.getElementById('preview_canvas');
const userInput = document.getElementById('user_input');
const bgImageInput = document.getElementById('bg_image');
const bgImageBtn = document.getElementById('bg_image_btn');
const customColorInput = document.getElementById('custom_color');
const fontSizeInput = document.getElementById('font_size');
const fontSizeDisplay = document.getElementById('font_size_display');
const bgColorInput = document.getElementById('bg_color');
const textBgEnabledCheckbox = document.getElementById('text_bg_enabled');
const fontFamilyInput = document.getElementById('font_family');
const processTextCheckbox = document.getElementById('process_text');
const chatMessages = document.getElementById('chat_messages');
const dwnlTrsBtn = document.getElementById('dwnl_trs');
const dwnlBcgBtn = document.getElementById('dwnl_bcg');
const dwnlImgBtn = document.getElementById('dwnl_img');
const clearAllImagesBtn = document.getElementById('clear_all_images');
const imageSizeControls = document.getElementById('image_size_controls');
const imageWidthInput = document.getElementById('image_width');
const imageHeightInput = document.getElementById('image_height');
const applySizeBtn = document.getElementById('apply_size');
const imageEffectsControls = document.getElementById('image_effects_controls');
const effectBlur = document.getElementById('effect_blur');
const effectContrast = document.getElementById('effect_contrast');
const effectSaturation = document.getElementById('effect_saturation');
const effectBrightness = document.getElementById('effect_brightness');
const resetEffectsBtn = document.getElementById('reset_effects');
const blurValue = document.getElementById('blur_value');
const contrastValue = document.getElementById('contrast_value');
const saturationValue = document.getElementById('saturation_value');
const brightnessValue = document.getElementById('brightness_value');
const effectGrain = document.getElementById('effect_grain');
const grainValue = document.getElementById('grain_value');
const effectGrainBlur = document.getElementById('effect_grain_blur');
const grainBlurValue = document.getElementById('grain_blur_value');
const textBlocksContainer = document.getElementById('text_blocks_container');
const textBlocksList = document.getElementById('text_blocks_list');
const addTextBlockBtn = document.getElementById('add_text_block');
const multiTextCheckbox = document.getElementById('multi_text_enabled');
const inputContainer = document.getElementById('input_container');
const imagesContainer = document.getElementById('images_container');
const imagesList = document.getElementById('images_list');

// Drawing sidebar elements
const drawingSidebar = document.getElementById('drawing_sidebar');
const drawingColorInput = document.getElementById('drawing_color');
const drawingSizeInput = document.getElementById('drawing_size');
const drawingSizeLabel = document.getElementById('drawing_size_label');
const shapeFilledCheckbox = document.getElementById('shape_filled');
const clearDrawingBtn = document.getElementById('clear_drawing');
const toolButtons = document.querySelectorAll('.tool_btn');
const layersList = document.getElementById('layers_list');
const addLayerBtn = document.getElementById('add_layer_btn');

// --- State Variables ---
let backgroundImg = null;
let originalBackgroundImg = null;
let textPosition = { x: 50, y: 100 };
let imagePosition = { x: 0, y: 0 };
let viewportSize = { width: 800, height: 600 };
let isDragging = false;
let isImageDragging = false;
let dragOffset = { x: 0, y: 0 };
let imageEffects = { blur: 0, contrast: 100, saturation: 100, brightness: 100, grain: 0, grainBlur: 0 };

// Multiple images state
let images = []; // Array of { id, img, x, y, cropX, cropY, cropW, cropH, origW, origH, name, opacity }
let selectedImageId = null;
let imageIdCounter = 0;
let isCropping = false;
let cropStart = { x: 0, y: 0 };
let cropEnd = { x: 0, y: 0 };

// Undo history
let undoHistory = []; // Stack of image states
const MAX_UNDO_HISTORY = 50;
let lastScaleSaveTime = 0; // For debouncing scale undo saves

// Angled crop state
let isAngledCropping = false;
let angledCropLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
let angledCropSide = 'left'; // Which side to keep: 'left' or 'right' of the line

// Multi-text state
let textBlocks = [];
let selectedTextBlockId = null;
let textBlockIdCounter = 0;

// Drawing state
let currentDrawingTool = null; // null, 'pencil', 'brush', 'eraser', 'line', 'rectangle', 'circle', 'arrow'
let isDrawing = false;
let drawingStartPoint = { x: 0, y: 0 };
let currentPath = []; // Current freehand path being drawn

// Layer system
let drawingLayers = []; // Array of { id, name, visible, drawings: [] }
let selectedLayerId = null;
let layerIdCounter = 0;

// Drawing undo/redo history (separate from image undo)
let drawingUndoHistory = [];
let drawingRedoHistory = [];
const MAX_DRAWING_UNDO = 30;

// Settings
let settings = {
    fontSize: 12,
    fontFamily: 'Arial',
    bgColor: '#161616',
    maxWidth: 1200
};

// --- FUNCTIONS (defined first) ---

// Function to apply grain effect with colored dots (white, red, blue)
// Directional blur: 40% horizontal, 60% vertical
function applyGrain(ctx, width, height, intensity, grainBlur = 0) {
    // If blur is needed, draw grain on a separate canvas first
    if (grainBlur > 0) {
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = width;
        grainCanvas.height = height;
        const grainCtx = grainCanvas.getContext('2d');
        
        // Create grain on transparent canvas
        const grainImageData = grainCtx.createImageData(width, height);
        const grainData = grainImageData.data;
        const grainDensity = intensity / 100;
        
        for (let i = 0; i < grainData.length; i += 4) {
            if (Math.random() < grainDensity * 0.3) {
                const grainType = Math.random();
                const brightness = 20 + Math.random() * 40;
                
                if (grainType < 0.4) {
                    grainData[i] = brightness;
                    grainData[i + 1] = brightness;
                    grainData[i + 2] = brightness;
                } else if (grainType < 0.6) {
                    grainData[i] = brightness;
                    grainData[i + 1] = 0;
                    grainData[i + 2] = 0;
                } else if (grainType < 0.8) {
                    grainData[i] = 0;
                    grainData[i + 1] = 0;
                    grainData[i + 2] = brightness;
                } else {
                    grainData[i] = 0;
                    grainData[i + 1] = brightness * 0.7;
                    grainData[i + 2] = 0;
                }
                grainData[i + 3] = 255; // Full opacity for grain dots
            }
        }
        
        grainCtx.putImageData(grainImageData, 0, 0);
        
        // Apply directional blur: 40% horizontal, 60% vertical
        // Create horizontal blur by squashing vertically, blurring, then stretching back
        const hBlurCanvas = document.createElement('canvas');
        hBlurCanvas.width = width;
        hBlurCanvas.height = Math.max(1, Math.round(height * 0.1)); // Squash vertically
        const hBlurCtx = hBlurCanvas.getContext('2d');
        hBlurCtx.drawImage(grainCanvas, 0, 0, width, hBlurCanvas.height);
        
        const hResultCanvas = document.createElement('canvas');
        hResultCanvas.width = width;
        hResultCanvas.height = height;
        const hResultCtx = hResultCanvas.getContext('2d');
        hResultCtx.filter = `blur(${grainBlur * 0.4}px)`;
        hResultCtx.drawImage(hBlurCanvas, 0, 0, width, height);
        hResultCtx.filter = 'none';
        
        // Create vertical blur by squashing horizontally, blurring, then stretching back
        const vBlurCanvas = document.createElement('canvas');
        vBlurCanvas.width = Math.max(1, Math.round(width * 0.1)); // Squash horizontally
        vBlurCanvas.height = height;
        const vBlurCtx = vBlurCanvas.getContext('2d');
        vBlurCtx.drawImage(grainCanvas, 0, 0, vBlurCanvas.width, height);
        
        const vResultCanvas = document.createElement('canvas');
        vResultCanvas.width = width;
        vResultCanvas.height = height;
        const vResultCtx = vResultCanvas.getContext('2d');
        vResultCtx.filter = `blur(${grainBlur * 0.6}px)`;
        vResultCtx.drawImage(vBlurCanvas, 0, 0, width, height);
        vResultCtx.filter = 'none';
        
        // Combine horizontal and vertical blur results
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.4;
        ctx.drawImage(hResultCanvas, 0, 0);
        ctx.globalAlpha = 0.6;
        ctx.drawImage(vResultCanvas, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    } else {
        // Original direct method (no blur)
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const grainDensity = intensity / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < grainDensity * 0.3) {
                const grainType = Math.random();
                const brightness = 20 + Math.random() * 40;
                
                if (grainType < 0.4) {
                    data[i] = Math.min(255, data[i] + brightness);
                    data[i + 1] = Math.min(255, data[i + 1] + brightness);
                    data[i + 2] = Math.min(255, data[i + 2] + brightness);
                } else if (grainType < 0.6) {
                    data[i] = Math.min(255, data[i] + brightness);
                } else if (grainType < 0.8) {
                    data[i + 2] = Math.min(255, data[i + 2] + brightness);
                } else {
                    data[i + 1] = Math.min(255, data[i + 1] + brightness * 0.7);
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
}

// Image management functions
function addImage(img, name) {
    const id = ++imageIdCounter;
    images.push({
        id,
        img,
        x: 0,
        y: 0,
        cropX: 0,
        cropY: 0,
        cropW: img.width,
        cropH: img.height,
        origW: img.width,
        origH: img.height,
        scale: 1,
        opacity: 100,
        name: name || `Obraz ${id}`
    });
    
    // Show controls on first image
    if (images.length === 1) {
        viewportSize = { width: img.width, height: img.height };
        imageWidthInput.value = img.width;
        imageHeightInput.value = img.height;
        clearAllImagesBtn.style.display = 'inline';
        imageSizeControls.style.display = 'flex';
        imageEffectsControls.style.display = 'flex';
        imagesContainer.style.display = 'block';
        dwnlImgBtn.style.display = 'inline';
        drawingSidebar.style.display = 'flex';
        // Auto-create first layer
        if (drawingLayers.length === 0) {
            addLayer('L 1');
        }
        backgroundImg = img; // Keep for compatibility
    }
    
    renderImagesList();
    selectImage(id);
    updatePreview();
    return id;
}

function removeImage(id) {
    images = images.filter(i => i.id !== id);
    if (selectedImageId === id) {
        selectedImageId = images.length > 0 ? images[0].id : null;
    }
    
    // Hide controls if no images
    if (images.length === 0) {
        clearAllImagesBtn.style.display = 'none';
        imageSizeControls.style.display = 'none';
        imageEffectsControls.style.display = 'none';
        imagesContainer.style.display = 'none';
        dwnlImgBtn.style.display = 'none';
        textBlocksContainer.style.display = 'none';
        inputContainer.style.display = 'block';
        multiTextCheckbox.checked = false;
        drawingSidebar.style.display = 'none';
        // Clear layers when no images
        drawingLayers = [];
        selectedLayerId = null;
        layerIdCounter = 0;
        drawingUndoHistory = [];
        currentDrawingTool = null;
        toolButtons.forEach(btn => btn.classList.remove('active'));
        renderLayersList();
        backgroundImg = null;
    }
    
    renderImagesList();
    if (selectedImageId) selectImage(selectedImageId);
    updatePreview();
}

function selectImage(id) {
    selectedImageId = id;
    renderImagesList();
    updatePreview();
}

// Save current state of all images for undo
function saveStateForUndo() {
    const state = images.map(imgObj => ({
        id: imgObj.id,
        imgSrc: imgObj.img.src,
        x: imgObj.x,
        y: imgObj.y,
        cropX: imgObj.cropX,
        cropY: imgObj.cropY,
        cropW: imgObj.cropW,
        cropH: imgObj.cropH,
        origW: imgObj.origW,
        origH: imgObj.origH,
        scale: imgObj.scale,
        opacity: imgObj.opacity,
        name: imgObj.name
    }));
    undoHistory.push(JSON.stringify(state));
    if (undoHistory.length > MAX_UNDO_HISTORY) {
        undoHistory.shift(); // Remove oldest state
    }
}

// Undo last action
function undo() {
    if (undoHistory.length === 0) return;
    
    const stateStr = undoHistory.pop();
    const state = JSON.parse(stateStr);
    
    // Restore images from state
    let loadedCount = 0;
    const totalImages = state.length;
    
    if (totalImages === 0) {
        images = [];
        selectedImageId = null;
        renderImagesList();
        updatePreview();
        return;
    }
    
    const newImages = [];
    state.forEach(savedImg => {
        const img = new Image();
        img.onload = function() {
            newImages.push({
                id: savedImg.id,
                img: img,
                x: savedImg.x,
                y: savedImg.y,
                cropX: savedImg.cropX,
                cropY: savedImg.cropY,
                cropW: savedImg.cropW,
                cropH: savedImg.cropH,
                origW: savedImg.origW,
                origH: savedImg.origH,
                scale: savedImg.scale,
                opacity: savedImg.opacity,
                name: savedImg.name
            });
            loadedCount++;
            if (loadedCount === totalImages) {
                // Sort by original order (id)
                newImages.sort((a, b) => {
                    const aIndex = state.findIndex(s => s.id === a.id);
                    const bIndex = state.findIndex(s => s.id === b.id);
                    return aIndex - bIndex;
                });
                images = newImages;
                if (selectedImageId && !images.find(i => i.id === selectedImageId)) {
                    selectedImageId = images.length > 0 ? images[0].id : null;
                }
                renderImagesList();
                updatePreview();
            }
        };
        img.src = savedImg.imgSrc;
    });
}

function updateImageCrop(id, cropX, cropY, cropW, cropH) {
    const imgObj = images.find(i => i.id === id);
    if (imgObj) {
        imgObj.cropX = Math.max(0, Math.min(cropX, imgObj.origW - 1));
        imgObj.cropY = Math.max(0, Math.min(cropY, imgObj.origH - 1));
        imgObj.cropW = Math.max(1, Math.min(cropW, imgObj.origW - imgObj.cropX));
        imgObj.cropH = Math.max(1, Math.min(cropH, imgObj.origH - imgObj.cropY));
        updatePreview();
    }
}

function renderImagesList() {
    imagesList.innerHTML = '';
    images.forEach((imgObj, index) => {
        const div = document.createElement('div');
        div.className = 'image-item' + (imgObj.id === selectedImageId ? ' selected' : '');
        const shortName = imgObj.name.length > 15 ? imgObj.name.substring(0, 12) + '...' : imgObj.name;
        div.innerHTML = `
            <div class="image-item-header">
                <span class="image-item-label" data-id="${imgObj.id}">${index + 1}. ${shortName}</span>
                <button class="image-item-delete" data-id="${imgObj.id}">×</button>
            </div>
            <div class="image-item-opacity">
                <label>Przezroczystość: <span class="opacity-value" data-id="${imgObj.id}">${imgObj.opacity}</span>%</label>
                <input type="range" class="image-opacity-slider" data-id="${imgObj.id}" min="0" max="100" value="${imgObj.opacity}" step="5">
            </div>
        `;
        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('image-item-delete') && !e.target.classList.contains('image-opacity-slider')) {
                selectImage(imgObj.id);
            }
        });
        imagesList.appendChild(div);
    });
    
    // Add delete listeners
    document.querySelectorAll('.image-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeImage(parseInt(e.target.dataset.id));
        });
    });
    
    // Add opacity slider listeners
    document.querySelectorAll('.image-opacity-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            e.stopPropagation();
            const id = parseInt(e.target.dataset.id);
            const imgObj = images.find(i => i.id === id);
            if (imgObj) {
                imgObj.opacity = parseInt(e.target.value);
                const valueSpan = document.querySelector(`.opacity-value[data-id="${id}"]`);
                if (valueSpan) valueSpan.textContent = imgObj.opacity;
                updatePreview();
            }
        });
    });
}

// Draw a single image with crop
function drawImage(ctx, imgObj, applyFilter = true) {
    const prevAlpha = ctx.globalAlpha;
    if (applyFilter) {
        ctx.filter = `blur(${imageEffects.blur}px) contrast(${imageEffects.contrast}%) saturate(${imageEffects.saturation}%) brightness(${imageEffects.brightness}%)`;
        ctx.globalAlpha = imgObj.opacity / 100;
    }
    // Draw cropped region of image at its position with scale
    const drawW = imgObj.cropW * imgObj.scale;
    const drawH = imgObj.cropH * imgObj.scale;
    ctx.drawImage(
        imgObj.img,
        imgObj.cropX, imgObj.cropY, imgObj.cropW, imgObj.cropH, // Source crop
        imgObj.x, imgObj.y, drawW, drawH // Destination with scale
    );
    if (applyFilter) {
        ctx.filter = 'none';
        ctx.globalAlpha = prevAlpha;
    }
    
    // Draw selection border for selected image
    if (imgObj.id === selectedImageId) {
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(imgObj.x, imgObj.y, drawW, drawH);
        ctx.setLineDash([]);
    }
}

// Text block management functions
function addTextBlock(text = '', x = 50, y = 100) {
    const id = ++textBlockIdCounter;
    textBlocks.push({ id, text, x, y });
    renderTextBlocksList();
    selectTextBlock(id);
    updatePreview();
    return id;
}

function removeTextBlock(id) {
    textBlocks = textBlocks.filter(b => b.id !== id);
    if (selectedTextBlockId === id) {
        selectedTextBlockId = textBlocks.length > 0 ? textBlocks[0].id : null;
    }
    renderTextBlocksList();
    updatePreview();
}

function selectTextBlock(id, skipRender = false) {
    selectedTextBlockId = id;
    if (!skipRender) {
        renderTextBlocksList();
    } else {
        // Just update the visual selection without re-rendering
        document.querySelectorAll('.text-block-item').forEach(item => {
            const input = item.querySelector('.text-block-input');
            if (input && parseInt(input.dataset.id) === id) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
}

function updateTextBlockContent(id, text) {
    const block = textBlocks.find(b => b.id === id);
    if (block) {
        block.text = text;
        updatePreview();
    }
}

function renderTextBlocksList() {
    textBlocksList.innerHTML = '';
    textBlocks.forEach((block, index) => {
        const div = document.createElement('div');
        div.className = 'text-block-item' + (block.id === selectedTextBlockId ? ' selected' : '');
        div.innerHTML = `
            <span class="text-block-label">Tekst ${index + 1}</span>
            <textarea class="text-block-input" data-id="${block.id}" placeholder="Wpisz tekst...">${block.text}</textarea>
            <button class="text-block-delete" data-id="${block.id}">×</button>
        `;
        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('text-block-delete') && !e.target.classList.contains('text-block-input')) {
                selectTextBlock(block.id, true);
                updatePreview();
            }
        });
        textBlocksList.appendChild(div);
    });
    
    // Add event listeners
    document.querySelectorAll('.text-block-input').forEach(input => {
        input.addEventListener('input', (e) => {
            updateTextBlockContent(parseInt(e.target.dataset.id), e.target.value);
        });
        input.addEventListener('focus', (e) => {
            selectTextBlock(parseInt(e.target.dataset.id), true);
            updatePreview();
        });
    });
    document.querySelectorAll('.text-block-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTextBlock(parseInt(e.target.dataset.id));
        });
    });
}

// Helper to draw a single text block on canvas
function drawTextBlock(ctx, block) {
    let text = block.text;
    // Note: processText is called by the caller before passing text to this function
    
    ctx.font = `${settings.fontSize}px ${settings.fontFamily}`;
    ctx.textBaseline = 'top';
    const lines = (text || '').split('\n');
    const lineHeight = settings.fontSize + 5;
    
    lines.forEach((line, i) => {
        const parsedLine = parseTextColor(line);
        const y = block.y + i * lineHeight;
        
        // Draw text background if enabled
        if (textBgEnabledCheckbox.checked && parsedLine.text) {
            const textWidth = ctx.measureText(parsedLine.text).width;
            const bgPadding = 4;
            ctx.fillStyle = settings.bgColor;
            ctx.fillRect(block.x - bgPadding, y - bgPadding, textWidth + bgPadding * 2, settings.fontSize + bgPadding * 2);
        }
        
        // Draw sharp text outline by rendering text offset in 8 directions
        ctx.fillStyle = 'black';
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                    ctx.fillText(parsedLine.text, block.x + dx, y + dy);
                }
            }
        }
        
        // Draw text fill with parsed color
        ctx.fillStyle = parsedLine.color;
        ctx.fillText(parsedLine.text, block.x, y);
    });
    
    // Draw selection indicator for selected block
    if (block.id === selectedTextBlockId && lines.length > 0) {
        const firstLine = lines[0] || '';
        const parsedFirst = parseTextColor(firstLine);
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(parseTextColor(l).text).width));
        const totalHeight = lines.length * lineHeight;
        ctx.strokeStyle = '#fbf724';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(block.x - 5, block.y - 5, maxWidth + 10, totalHeight + 5);
        ctx.setLineDash([]);
    }
}

// Function to parse text and return {text, color}
function parseTextColor(line) {
    // Check for custom color markup: [color=#hex]...[/color]
    const colorTagRegex = /^\[color=(#[0-9a-fA-F]{3,6})\](.*)\[\/color\]$/;
    const match = line.match(colorTagRegex);
    if (match) {
        return {
            text: match[2],
            color: match[1]
        };
    }
    if (line.includes('(telefon)')) {
        return {
            text: line,
            color: '#fbf724'
        };
    } else if (line.includes('szepcze:')) {
        return {
            text: line,
            color: '#a6a6a6'
        };
    } else if (/\$\d+/.test(line)) {
        return {
            text: line,
            color: '#56d64b'
        };
    } else if (line.startsWith('**')) {
        return {
            text: line,
            color: '#979aed'
        };
    } else if (line.startsWith('*')) {
        return {
            text: line,
            color: '#c2a3da'
        };
    } else {
        return {
            text: line,
            color: '#f1f1f1'
        };
    }
}

// Function to process text - remove timestamps and reverse order
function processText(text) {
    const lines = text.split('\n');
    const filteredLines = lines.filter(line => {
        return !/^\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(line.trim()) && !line.trim().startsWith('/');
    });
    return filteredLines.reverse().join('\n');
}

// Function to create image with text and transparent background
function createTransparentImage(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const fontSize = settings.fontSize;
    const fontFamily = settings.fontFamily;
    const lineHeight = fontSize + 5;
    const padding = 13;
    const maxWidth = settings.maxWidth;
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    const textLines = text.split('\n');
    const lines = [];
    
    for (let textLine of textLines) {
        if (textLine === '') {
            lines.push('');
            continue;
        }
        
        const words = textLine.split(' ');
        let currentLine = '';
        
        for (let word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth - padding * 2 && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
    }
    
    let actualWidth = 0;
    lines.forEach(line => {
        const parsedLine = parseTextColor(line);
        const metrics = ctx.measureText(parsedLine.text);
        actualWidth = Math.max(actualWidth, metrics.width);
    });
    
    canvas.width = Math.max(Math.min(actualWidth + padding * 2, maxWidth), 100);
    canvas.height = Math.max(lineHeight * lines.length + padding * 2, 50);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'black';
    
    lines.forEach((line, index) => {
        const parsedLine = parseTextColor(line);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                    ctx.fillText(parsedLine.text, padding + dx, padding + index * lineHeight + dy);
                }
            }
        }
    });
    
    lines.forEach((line, index) => {
        const parsedLine = parseTextColor(line);
        ctx.fillStyle = parsedLine.color;
        ctx.fillText(parsedLine.text, padding, padding + index * lineHeight);
    });
    
    return canvas;
}

// Function to convert text to image with background
function textToImage(text, canvas = null) {
    if (!canvas) {
        canvas = document.createElement('canvas');
    }
    const ctx = canvas.getContext('2d');
    
    const fontSize = settings.fontSize;
    const fontFamily = settings.fontFamily;
    const lineHeight = fontSize + 5;
    const padding = 13;
    const maxWidth = settings.maxWidth;
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    const textLines = (text || '').split('\n');
    const lines = [];
    
    for (let textLine of textLines) {
        if (textLine === '') {
            lines.push('');
            continue;
        }
        
        const words = textLine.split(' ');
        let currentLine = '';
        
        for (let word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth - padding * 2 && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
    }
    
    // If no lines, add a placeholder
    if (lines.length === 0) {
        lines.push('');
    }
    
    let actualWidth = 0;
    lines.forEach(line => {
        const parsedLine = parseTextColor(line);
        const metrics = ctx.measureText(parsedLine.text);
        actualWidth = Math.max(actualWidth, metrics.width);
    });
    
    // Ensure minimum canvas size
    canvas.width = Math.max(Math.min(actualWidth + padding * 2, maxWidth), 200);
    canvas.height = Math.max(lineHeight * lines.length + padding * 2, 50);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    
    // Draw backgrounds
    ctx.fillStyle = settings.bgColor;
    lines.forEach((line, index) => {
        const parsedLine = parseTextColor(line);
        const textWidth = ctx.measureText(parsedLine.text).width;
        const bgPadding = 4;
        if (parsedLine.text) {
            ctx.fillRect(padding - bgPadding, padding + index * lineHeight - bgPadding, textWidth + bgPadding * 2, fontSize + bgPadding * 2);
        }
    });
    
    // Draw outlines
    ctx.fillStyle = 'black';
    lines.forEach((line, index) => {
        const parsedLine = parseTextColor(line);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                    ctx.fillText(parsedLine.text, padding + dx, padding + index * lineHeight + dy);
                }
            }
        }
    });
    
    // Draw text
    lines.forEach((line, index) => {
        const parsedLine = parseTextColor(line);
        ctx.fillStyle = parsedLine.color;
        ctx.fillText(parsedLine.text, padding, padding + index * lineHeight);
    });
    
    return canvas;
}

// Function to update preview
function updatePreview() {
    let text = userInput.value;
    if (processTextCheckbox.checked) {
        text = processText(text);
    }
    
    if (images.length > 0) {
        // Use viewport size for canvas
        previewCanvas.width = viewportSize.width;
        previewCanvas.height = viewportSize.height;
        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        // Draw all images in order
        images.forEach(imgObj => {
            drawImage(ctx, imgObj, true);
        });
        
        // Draw crop rectangle if cropping
        if (isCropping && selectedImageId) {
            const imgObj = images.find(i => i.id === selectedImageId);
            if (imgObj) {
                const minX = Math.min(cropStart.x, cropEnd.x);
                const maxX = Math.max(cropStart.x, cropEnd.x);
                const minY = Math.min(cropStart.y, cropEnd.y);
                const maxY = Math.max(cropStart.y, cropEnd.y);
                
                // Convert image coords to canvas coords
                const rectX = imgObj.x + (minX - imgObj.cropX) * imgObj.scale;
                const rectY = imgObj.y + (minY - imgObj.cropY) * imgObj.scale;
                const rectW = (maxX - minX) * imgObj.scale;
                const rectH = (maxY - minY) * imgObj.scale;
                
                // Draw semi-transparent overlay outside crop area
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, previewCanvas.width, rectY);
                ctx.fillRect(0, rectY, rectX, rectH);
                ctx.fillRect(rectX + rectW, rectY, previewCanvas.width - rectX - rectW, rectH);
                ctx.fillRect(0, rectY + rectH, previewCanvas.width, previewCanvas.height - rectY - rectH);
                
                // Draw crop border
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(rectX, rectY, rectW, rectH);
                ctx.setLineDash([]);
            }
        }
        
        // Draw angled crop line if angled cropping
        if (isAngledCropping && selectedImageId) {
            const imgObj = images.find(i => i.id === selectedImageId);
            if (imgObj) {
                // Convert image coords to canvas coords
                const x1 = imgObj.x + (angledCropLine.x1 - imgObj.cropX) * imgObj.scale;
                const y1 = imgObj.y + (angledCropLine.y1 - imgObj.cropY) * imgObj.scale;
                const x2 = imgObj.x + (angledCropLine.x2 - imgObj.cropX) * imgObj.scale;
                const y2 = imgObj.y + (angledCropLine.y2 - imgObj.cropY) * imgObj.scale;
                
                // Calculate extended line to cover the whole canvas
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                    const nx = -dy / len; // Normal vector (perpendicular)
                    const ny = dx / len;
                    
                    // Extend line beyond canvas
                    const extend = Math.max(previewCanvas.width, previewCanvas.height) * 2;
                    const lineX1 = x1 - dx * extend;
                    const lineY1 = y1 - dy * extend;
                    const lineX2 = x2 + dx * extend;
                    const lineY2 = y2 + dy * extend;
                    
                    // Draw semi-transparent overlay on the side to be removed
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.beginPath();
                    if (angledCropSide === 'left') {
                        // Shade left side of line
                        ctx.moveTo(lineX1, lineY1);
                        ctx.lineTo(lineX2, lineY2);
                        ctx.lineTo(lineX2 + nx * extend, lineY2 + ny * extend);
                        ctx.lineTo(lineX1 + nx * extend, lineY1 + ny * extend);
                    } else {
                        // Shade right side of line
                        ctx.moveTo(lineX1, lineY1);
                        ctx.lineTo(lineX2, lineY2);
                        ctx.lineTo(lineX2 - nx * extend, lineY2 - ny * extend);
                        ctx.lineTo(lineX1 - nx * extend, lineY1 - ny * extend);
                    }
                    ctx.closePath();
                    ctx.fill();
                    
                    // Draw the cut line
                    ctx.strokeStyle = '#ff6600';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([10, 5]);
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Draw start and end points
                    ctx.fillStyle = '#00ff00';
                    ctx.beginPath();
                    ctx.arc(x1, y1, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(x2, y2, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Apply grain effect
        if (imageEffects.grain > 0) {
            applyGrain(ctx, previewCanvas.width, previewCanvas.height, imageEffects.grain, imageEffects.grainBlur);
        }
        
        // Draw all saved drawings
        drawAllDrawings(ctx);
        
        // Draw current shape preview while drawing
        if (isDrawing && currentDrawingTool && ['line', 'rectangle', 'circle', 'arrow'].includes(currentDrawingTool)) {
            drawShapePreview(ctx);
        }
        
        // Draw text based on mode
        if (multiTextCheckbox.checked) {
            // Draw all text blocks
            textBlocks.forEach(block => {
                const blockText = processTextCheckbox.checked ? processText(block.text) : block.text;
                drawTextBlock(ctx, { ...block, text: blockText });
            });
        } else {
            // Single text mode - use the main textarea
            drawTextBlock(ctx, { id: 0, text: text, x: textPosition.x, y: textPosition.y });
        }
        
        // Scale preview display to 80% (20% smaller)
        previewCanvas.style.width = (previewCanvas.width * 0.8) + 'px';
        previewCanvas.style.height = (previewCanvas.height * 0.8) + 'px';
    } else {
        textToImage(text, previewCanvas);
        previewCanvas.style.width = previewCanvas.width + 'px';
        previewCanvas.style.height = previewCanvas.height + 'px';
    }
}

// Function to create image with background image and text (for download)
function createImageWithBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = viewportSize.width;
    canvas.height = viewportSize.height;
    const ctx = canvas.getContext('2d');
    
    // Temporarily hide selections
    const originalSelectedImage = selectedImageId;
    const originalSelectedText = selectedTextBlockId;
    selectedImageId = null;
    selectedTextBlockId = null;
    
    // Draw all images
    images.forEach(imgObj => {
        drawImage(ctx, imgObj, true);
    });
    
    // Apply grain effect
    if (imageEffects.grain > 0) {
        applyGrain(ctx, canvas.width, canvas.height, imageEffects.grain);
    }
    
    // Draw all drawings
    drawAllDrawings(ctx);
    
    // Draw text based on mode
    if (multiTextCheckbox.checked) {
        textBlocks.forEach(block => {
            const blockText = processTextCheckbox.checked ? processText(block.text) : block.text;
            drawTextBlock(ctx, { ...block, text: blockText });
        });
    } else {
        // Single text mode
        let text = userInput.value;
        if (processTextCheckbox.checked) {
            text = processText(text);
        }
        drawTextBlock(ctx, { id: 0, text: text, x: textPosition.x, y: textPosition.y });
    }
    
    // Restore selections
    selectedImageId = originalSelectedImage;
    selectedTextBlockId = originalSelectedText;
    
    return canvas;
}

// Function to add message to chat
function addMessageToChat(text) {
    let processedText = text;
    if (processTextCheckbox.checked) {
        processedText = processText(text);
    }
    if (!processedText.trim()) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat_message';
    
    const canvas = textToImage(processedText);
    const imageUrl = canvas.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Message image';
    
    messageDiv.appendChild(img);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Layer Functions ---
function addLayer(name) {
    const id = ++layerIdCounter;
    drawingLayers.push({
        id,
        name: name || `L ${id}`,
        visible: true,
        drawings: []
    });
    selectedLayerId = id;
    renderLayersList();
    return id;
}

function removeLayer(id) {
    drawingLayers = drawingLayers.filter(l => l.id !== id);
    if (selectedLayerId === id) {
        selectedLayerId = drawingLayers.length > 0 ? drawingLayers[drawingLayers.length - 1].id : null;
    }
    renderLayersList();
    updatePreview();
}

function selectLayer(id) {
    selectedLayerId = id;
    renderLayersList();
}

function toggleLayerVisibility(id) {
    const layer = drawingLayers.find(l => l.id === id);
    if (layer) {
        layer.visible = !layer.visible;
        renderLayersList();
        updatePreview();
    }
}

function renderLayersList() {
    layersList.innerHTML = '';
    // Render in reverse order (top layers first)
    [...drawingLayers].reverse().forEach(layer => {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer_item' + (layer.id === selectedLayerId ? ' selected' : '');
        layerItem.innerHTML = `
            <button class="layer_visibility" data-id="${layer.id}" title="${layer.visible ? 'Ukryj' : 'Pokaż'}">
                ${layer.visible ? '👁️' : '👁️‍🗨️'}
            </button>
            <span class="layer_name" data-id="${layer.id}">${layer.name}</span>
            <button class="layer_delete" data-id="${layer.id}" title="Usuń">×</button>
        `;
        layerItem.querySelector('.layer_name').addEventListener('click', () => selectLayer(layer.id));
        layerItem.querySelector('.layer_visibility').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLayerVisibility(layer.id);
        });
        layerItem.querySelector('.layer_delete').addEventListener('click', (e) => {
            e.stopPropagation();
            removeLayer(layer.id);
        });
        layersList.appendChild(layerItem);
    });
}

function saveDrawingState() {
    // Save current state to undo history
    const state = JSON.stringify(drawingLayers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        drawings: l.drawings
    })));
    drawingUndoHistory.push(state);
    if (drawingUndoHistory.length > MAX_DRAWING_UNDO) {
        drawingUndoHistory.shift();
    }
    // Clear redo history when new action is performed
    drawingRedoHistory = [];
}

function undoDrawing() {
    if (drawingUndoHistory.length === 0) return false;
    // Save current state to redo history before undoing
    const currentState = JSON.stringify(drawingLayers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        drawings: l.drawings
    })));
    drawingRedoHistory.push(currentState);
    
    const state = JSON.parse(drawingUndoHistory.pop());
    drawingLayers = state.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        drawings: l.drawings
    }));
    // Restore layer counter
    if (drawingLayers.length > 0) {
        layerIdCounter = Math.max(...drawingLayers.map(l => l.id));
    }
    // Make sure selected layer still exists
    if (!drawingLayers.find(l => l.id === selectedLayerId)) {
        selectedLayerId = drawingLayers.length > 0 ? drawingLayers[drawingLayers.length - 1].id : null;
    }
    renderLayersList();
    updatePreview();
    return true;
}

function redoDrawing() {
    if (drawingRedoHistory.length === 0) return false;
    // Save current state to undo history before redoing
    const currentState = JSON.stringify(drawingLayers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        drawings: l.drawings
    })));
    drawingUndoHistory.push(currentState);
    
    const state = JSON.parse(drawingRedoHistory.pop());
    drawingLayers = state.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        drawings: l.drawings
    }));
    // Restore layer counter
    if (drawingLayers.length > 0) {
        layerIdCounter = Math.max(...drawingLayers.map(l => l.id));
    }
    // Make sure selected layer still exists
    if (!drawingLayers.find(l => l.id === selectedLayerId)) {
        selectedLayerId = drawingLayers.length > 0 ? drawingLayers[drawingLayers.length - 1].id : null;
    }
    renderLayersList();
    updatePreview();
    return true;
}

// --- Drawing Functions ---
function drawAllDrawings(ctx) {
    // Draw all visible layers in order
    drawingLayers.forEach(layer => {
        if (!layer.visible) return;
        
        layer.drawings.forEach(drawing => {
            ctx.save();
            ctx.strokeStyle = drawing.color;
            ctx.fillStyle = drawing.color;
            ctx.lineWidth = drawing.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            switch (drawing.type) {
                case 'path':
                    if (drawing.points.length > 1) {
                        ctx.beginPath();
                        ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
                        for (let i = 1; i < drawing.points.length; i++) {
                            ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
                        }
                        ctx.stroke();
                    }
                    break;
                case 'eraser':
                    if (drawing.points.length > 1) {
                        ctx.globalCompositeOperation = 'destination-out';
                        ctx.beginPath();
                        ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
                        for (let i = 1; i < drawing.points.length; i++) {
                            ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
                        }
                        ctx.stroke();
                    }
                    break;
                case 'line':
                    ctx.beginPath();
                    ctx.moveTo(drawing.x1, drawing.y1);
                    ctx.lineTo(drawing.x2, drawing.y2);
                    ctx.stroke();
                    break;
                case 'arrow':
                    drawArrow(ctx, drawing.x1, drawing.y1, drawing.x2, drawing.y2, drawing.size);
                    break;
                case 'rectangle':
                    if (drawing.filled) {
                        ctx.fillRect(drawing.x, drawing.y, drawing.w, drawing.h);
                    } else {
                        ctx.strokeRect(drawing.x, drawing.y, drawing.w, drawing.h);
                    }
                    break;
                case 'circle':
                    ctx.beginPath();
                    ctx.ellipse(drawing.cx, drawing.cy, drawing.rx, drawing.ry, 0, 0, Math.PI * 2);
                    if (drawing.filled) {
                        ctx.fill();
                    } else {
                        ctx.stroke();
                    }
                    break;
            }
            ctx.restore();
        });
    });
}

function drawArrow(ctx, x1, y1, x2, y2, size) {
    const headLength = size * 4;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

function drawShapePreview(ctx) {
    const color = drawingColorInput.value;
    const size = parseInt(drawingSizeInput.value);
    const filled = shapeFilledCheckbox.checked;
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([5, 5]);
    
    const x1 = drawingStartPoint.x;
    const y1 = drawingStartPoint.y;
    const x2 = currentPath.length > 0 ? currentPath[currentPath.length - 1].x : x1;
    const y2 = currentPath.length > 0 ? currentPath[currentPath.length - 1].y : y1;
    
    switch (currentDrawingTool) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            break;
        case 'arrow':
            drawArrow(ctx, x1, y1, x2, y2, size);
            break;
        case 'rectangle':
            const rectX = Math.min(x1, x2);
            const rectY = Math.min(y1, y2);
            const rectW = Math.abs(x2 - x1);
            const rectH = Math.abs(y2 - y1);
            if (filled) {
                ctx.globalAlpha = 0.5;
                ctx.fillRect(rectX, rectY, rectW, rectH);
            } else {
                ctx.strokeRect(rectX, rectY, rectW, rectH);
            }
            break;
        case 'circle':
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;
            const rx = Math.abs(x2 - x1) / 2;
            const ry = Math.abs(y2 - y1) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            if (filled) {
                ctx.globalAlpha = 0.5;
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
    }
    ctx.restore();
}

// --- EVENT LISTENERS (after functions are defined) ---

// Always update preview on input/settings change
userInput.addEventListener('input', updatePreview);
fontSizeInput.addEventListener('input', function() {
    settings.fontSize = parseInt(this.value);
    fontSizeDisplay.textContent = this.value + 'px';
    updatePreview();
});
bgColorInput.addEventListener('change', function() {
    settings.bgColor = this.value;
    updatePreview();
});
fontFamilyInput.addEventListener('change', function() {
    settings.fontFamily = this.value;
    updatePreview();
});
processTextCheckbox.addEventListener('change', updatePreview);

// Custom file button click
bgImageBtn.addEventListener('click', function() {
    bgImageInput.click();
});

// Background image upload
bgImageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
        const img = new window.Image();
        img.onload = function() {
            addImage(img, file.name);
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    
    // Reset input to allow adding same file again
    bgImageInput.value = '';
});

// Text background checkbox
textBgEnabledCheckbox.addEventListener('change', updatePreview);

// Multiple text checkbox
multiTextCheckbox.addEventListener('change', function() {
    if (this.checked) {
        // Show text blocks, hide single input
        textBlocksContainer.style.display = 'block';
        inputContainer.style.display = 'none';
        // Add initial block if none exist
        if (textBlocks.length === 0) {
            addTextBlock('', 50, 100);
        }
    } else {
        // Hide text blocks, show single input
        textBlocksContainer.style.display = 'none';
        inputContainer.style.display = 'block';
    }
    updatePreview();
});

// Clear all images
clearAllImagesBtn.addEventListener('click', function() {
    images = [];
    selectedImageId = null;
    imageIdCounter = 0;
    backgroundImg = null;
    originalBackgroundImg = null;
    bgImageInput.value = '';
    clearAllImagesBtn.style.display = 'none';
    imageSizeControls.style.display = 'none';
    imageEffectsControls.style.display = 'none';
    imagesContainer.style.display = 'none';
    textBlocksContainer.style.display = 'none';
    inputContainer.style.display = 'block';
    dwnlImgBtn.style.display = 'none';
    drawingSidebar.style.display = 'none';
    textBgEnabledCheckbox.checked = false;
    multiTextCheckbox.checked = false;
    // Clear text blocks
    textBlocks = [];
    selectedTextBlockId = null;
    textBlockIdCounter = 0;
    renderTextBlocksList();
    renderImagesList();
    // Clear layers and drawings
    drawingLayers = [];
    selectedLayerId = null;
    layerIdCounter = 0;
    drawingUndoHistory = [];
    currentDrawingTool = null;
    toolButtons.forEach(btn => btn.classList.remove('active'));
    renderLayersList();
    // Reset effects
    imageEffects = { blur: 0, contrast: 100, saturation: 100, brightness: 100, grain: 0, grainBlur: 0 };
    effectBlur.value = 0; blurValue.textContent = '0';
    effectContrast.value = 100; contrastValue.textContent = '100';
    effectSaturation.value = 100; saturationValue.textContent = '100';
    effectBrightness.value = 100; brightnessValue.textContent = '100';
    effectGrain.value = 0; grainValue.textContent = '0';
    effectGrainBlur.value = 0; grainBlurValue.textContent = '0';
    imagePosition = { x: 0, y: 0 };
    viewportSize = { width: 800, height: 600 };
    updatePreview();
});

// Apply output size (viewport)
applySizeBtn.addEventListener('click', function() {
    if (!backgroundImg) return;
    const newWidth = parseInt(imageWidthInput.value);
    const newHeight = parseInt(imageHeightInput.value);
    if (newWidth < 100 || newHeight < 100) {
        alert('Minimum size is 100x100');
        return;
    }
    
    viewportSize = { width: newWidth, height: newHeight };
    updatePreview();
});

// Image effects listeners
effectBlur.addEventListener('input', function() {
    imageEffects.blur = parseInt(this.value);
    blurValue.textContent = this.value;
    updatePreview();
});
effectContrast.addEventListener('input', function() {
    imageEffects.contrast = parseInt(this.value);
    contrastValue.textContent = this.value;
    updatePreview();
});
effectSaturation.addEventListener('input', function() {
    imageEffects.saturation = parseInt(this.value);
    saturationValue.textContent = this.value;
    updatePreview();
});
effectBrightness.addEventListener('input', function() {
    imageEffects.brightness = parseInt(this.value);
    brightnessValue.textContent = this.value;
    updatePreview();
});
effectGrain.addEventListener('input', function() {
    imageEffects.grain = parseInt(this.value);
    grainValue.textContent = this.value;
    updatePreview();
});
effectGrainBlur.addEventListener('input', function() {
    imageEffects.grainBlur = parseInt(this.value);
    grainBlurValue.textContent = this.value;
    updatePreview();
});
resetEffectsBtn.addEventListener('click', function() {
    imageEffects = { blur: 0, contrast: 100, saturation: 100, brightness: 100, grain: 0, grainBlur: 0 };
    effectBlur.value = 0; blurValue.textContent = '0';
    effectContrast.value = 100; contrastValue.textContent = '100';
    effectSaturation.value = 100; saturationValue.textContent = '100';
    effectBrightness.value = 100; brightnessValue.textContent = '100';
    effectGrain.value = 0; grainValue.textContent = '0';
    effectGrainBlur.value = 0; grainBlurValue.textContent = '0';
    updatePreview();
});

// Add text block button
addTextBlockBtn.addEventListener('click', function() {
    // Add new block at a slightly offset position
    const offsetY = textBlocks.length * 30;
    addTextBlock('', 50, 100 + offsetY);
});

// Drawing tool selection
toolButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        const tool = this.dataset.tool;
        if (currentDrawingTool === tool) {
            // Deselect tool
            currentDrawingTool = null;
            this.classList.remove('active');
        } else {
            // Select new tool
            currentDrawingTool = tool;
            toolButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        }
    });
});

// Drawing size slider
drawingSizeInput.addEventListener('input', function() {
    drawingSizeLabel.textContent = this.value;
});

// Clear current layer drawings button
clearDrawingBtn.addEventListener('click', function() {
    if (!selectedLayerId) return;
    const layer = drawingLayers.find(l => l.id === selectedLayerId);
    if (layer) {
        saveDrawingState();
        layer.drawings = [];
        updatePreview();
    }
});

// Add new layer button
addLayerBtn.addEventListener('click', function() {
    addLayer();
});

// Mouse events for dragging text and image
previewCanvas.addEventListener('mousedown', function(e) {
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // Handle drawing mode (left click only, no modifiers, must have selected layer)
    if (currentDrawingTool && e.button === 0 && !e.ctrlKey && !e.shiftKey && images.length > 0 && selectedLayerId) {
        const layer = drawingLayers.find(l => l.id === selectedLayerId);
        if (layer && layer.visible) {
            saveDrawingState(); // Save state before drawing
            isDrawing = true;
            drawingStartPoint = { x: mouseX, y: mouseY };
            currentPath = [{ x: mouseX, y: mouseY }];
            e.preventDefault();
            return;
        }
    }
    
    // Ctrl+Shift+click to start angled cropping
    if (images.length > 0 && e.ctrlKey && e.shiftKey && e.button === 0 && selectedImageId) {
        const imgObj = images.find(i => i.id === selectedImageId);
        if (imgObj) {
            // Save state before cropping
            saveStateForUndo();
            
            // Convert canvas coords to image coords
            const imgX = (mouseX - imgObj.x) / imgObj.scale;
            const imgY = (mouseY - imgObj.y) / imgObj.scale;
            
            // Start angled crop line from current mouse position
            isAngledCropping = true;
            angledCropLine.x1 = Math.max(0, Math.min(imgObj.origW, imgObj.cropX + imgX));
            angledCropLine.y1 = Math.max(0, Math.min(imgObj.origH, imgObj.cropY + imgY));
            angledCropLine.x2 = angledCropLine.x1;
            angledCropLine.y2 = angledCropLine.y1;
            angledCropSide = 'left'; // Default to removing left side
            e.preventDefault();
            return;
        }
    }
    
    // Ctrl+click (without shift) to start rectangular cropping selected image
    if (images.length > 0 && e.ctrlKey && !e.shiftKey && e.button === 0 && selectedImageId) {
        const imgObj = images.find(i => i.id === selectedImageId);
        if (imgObj) {
            // Save state before cropping
            saveStateForUndo();
            
            // Convert canvas coords to image coords
            const imgX = (mouseX - imgObj.x) / imgObj.scale;
            const imgY = (mouseY - imgObj.y) / imgObj.scale;
            
            // Start crop from current mouse position (relative to original image)
            isCropping = true;
            cropStart.x = Math.max(0, Math.min(imgObj.origW, imgObj.cropX + imgX));
            cropStart.y = Math.max(0, Math.min(imgObj.origH, imgObj.cropY + imgY));
            cropEnd.x = cropStart.x;
            cropEnd.y = cropStart.y;
            e.preventDefault();
            return;
        }
    }

    // Shift+click or right-click to drag selected image
    if (images.length > 0 && (e.shiftKey || e.button === 2)) {
        // Check if clicking on an image (in reverse order for z-index)
        for (let i = images.length - 1; i >= 0; i--) {
            const imgObj = images[i];
            const drawW = imgObj.cropW * imgObj.scale;
            const drawH = imgObj.cropH * imgObj.scale;
            if (mouseX >= imgObj.x && mouseX <= imgObj.x + drawW &&
                mouseY >= imgObj.y && mouseY <= imgObj.y + drawH) {
                // Save state before moving
                saveStateForUndo();
                selectImage(imgObj.id);
                isImageDragging = true;
                dragOffset.x = mouseX - imgObj.x;
                dragOffset.y = mouseY - imgObj.y;
                e.preventDefault();
                return;
            }
        }
        e.preventDefault();
        return;
    }
    
    // Handle text block dragging - check all blocks and select/drag the clicked one
    if (images.length === 0) return;
    
    const ctx = previewCanvas.getContext('2d');
    ctx.font = `${settings.fontSize}px ${settings.fontFamily}`;
    const lineHeight = settings.fontSize + 5;
    
    // Single text mode
    if (!multiTextCheckbox.checked) {
        let singleText = userInput.value;
        if (processTextCheckbox.checked) {
            singleText = processText(singleText);
        }
        const lines = (singleText || '').split('\n');
        
        let maxWidth = 0;
        lines.forEach(line => {
            const parsed = parseTextColor(line);
            const w = ctx.measureText(parsed.text).width;
            if (w > maxWidth) maxWidth = w;
        });
        const totalHeight = lines.length * lineHeight;
        
        if (
            mouseX >= textPosition.x - 5 &&
            mouseX <= textPosition.x + maxWidth + 5 &&
            mouseY >= textPosition.y - 5 &&
            mouseY <= textPosition.y + totalHeight + 5
        ) {
            isDragging = true;
            dragOffset.x = mouseX - textPosition.x;
            dragOffset.y = mouseY - textPosition.y;
        }
        return;
    }
    
    // Multiple text mode - check each text block (in reverse to prioritize top-most/last added)
    for (let b = textBlocks.length - 1; b >= 0; b--) {
        const block = textBlocks[b];
        let blockText = block.text;
        if (processTextCheckbox.checked) {
            blockText = processText(blockText);
        }
        const lines = (blockText || '').split('\n');
        
        // Calculate block bounds
        let maxWidth = 0;
        lines.forEach(line => {
            const parsed = parseTextColor(line);
            const w = ctx.measureText(parsed.text).width;
            if (w > maxWidth) maxWidth = w;
        });
        const totalHeight = lines.length * lineHeight;
        
        if (
            mouseX >= block.x - 5 &&
            mouseX <= block.x + maxWidth + 5 &&
            mouseY >= block.y - 5 &&
            mouseY <= block.y + totalHeight + 5
        ) {
            selectTextBlock(block.id);
            isDragging = true;
            dragOffset.x = mouseX - block.x;
            dragOffset.y = mouseY - block.y;
            updatePreview();
            break;
        }
    }
});

// Prevent context menu on canvas for right-click dragging
previewCanvas.addEventListener('contextmenu', function(e) {
    if (images.length > 0) {
        e.preventDefault();
    }
});

// Mouse wheel + Alt to scale selected image, or scroll during angled crop to toggle side
previewCanvas.addEventListener('wheel', function(e) {
    // During angled cropping, scroll to toggle which side to remove
    if (isAngledCropping) {
        e.preventDefault();
        angledCropSide = angledCropSide === 'left' ? 'right' : 'left';
        updatePreview();
        return;
    }
    
    if (!e.altKey) return; // Only scale when Alt is held
    if (images.length === 0 || !selectedImageId) return;
    
    const imgObj = images.find(i => i.id === selectedImageId);
    if (!imgObj) return;
    
    // Check if mouse is over the selected image
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const drawW = imgObj.cropW * imgObj.scale;
    const drawH = imgObj.cropH * imgObj.scale;
    
    if (mouseX >= imgObj.x && mouseX <= imgObj.x + drawW &&
        mouseY >= imgObj.y && mouseY <= imgObj.y + drawH) {
        e.preventDefault();
        
        // Save state for undo (debounced - only once per 500ms of scaling)
        const now = Date.now();
        if (now - lastScaleSaveTime > 500) {
            saveStateForUndo();
            lastScaleSaveTime = now;
        }
        
        // Scale factor based on scroll direction
        const scaleDelta = e.deltaY > 0 ? 0.95 : 1.05;
        const newScale = Math.max(0.1, Math.min(10, imgObj.scale * scaleDelta));
        
        // Scale around mouse position
        const mouseRelX = mouseX - imgObj.x;
        const mouseRelY = mouseY - imgObj.y;
        const scaleRatio = newScale / imgObj.scale;
        
        imgObj.x = mouseX - mouseRelX * scaleRatio;
        imgObj.y = mouseY - mouseRelY * scaleRatio;
        imgObj.scale = newScale;
        
        updatePreview();
    }
}, { passive: false });

window.addEventListener('mousemove', function(e) {
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // Handle drawing
    if (isDrawing && currentDrawingTool) {
        currentPath.push({ x: mouseX, y: mouseY });
        
        // For freehand tools, draw incrementally
        if (['pencil', 'brush', 'eraser'].includes(currentDrawingTool)) {
            updatePreview();
            // Draw current path on top
            const ctx = previewCanvas.getContext('2d');
            ctx.save();
            ctx.strokeStyle = currentDrawingTool === 'eraser' ? '#000' : drawingColorInput.value;
            ctx.lineWidth = currentDrawingTool === 'brush' ? parseInt(drawingSizeInput.value) * 2 : parseInt(drawingSizeInput.value);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (currentDrawingTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
            }
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.stroke();
            ctx.restore();
        } else {
            // For shapes, just update preview to show preview shape
            updatePreview();
        }
        return;
    }
    
    // Handle angled cropping
    if (isAngledCropping && selectedImageId) {
        const imgObj = images.find(i => i.id === selectedImageId);
        if (imgObj) {
            // Convert canvas coords to original image coords
            const imgX = (mouseX - imgObj.x) / imgObj.scale;
            const imgY = (mouseY - imgObj.y) / imgObj.scale;
            angledCropLine.x2 = Math.max(0, Math.min(imgObj.origW, imgObj.cropX + imgX));
            angledCropLine.y2 = Math.max(0, Math.min(imgObj.origH, imgObj.cropY + imgY));
            updatePreview();
        }
        return;
    }
    
    // Handle rectangular cropping
    if (isCropping && selectedImageId) {
        const imgObj = images.find(i => i.id === selectedImageId);
        if (imgObj) {
            // Convert canvas coords to original image coords
            const imgX = (mouseX - imgObj.x) / imgObj.scale;
            const imgY = (mouseY - imgObj.y) / imgObj.scale;
            cropEnd.x = Math.max(0, Math.min(imgObj.origW, imgObj.cropX + imgX));
            cropEnd.y = Math.max(0, Math.min(imgObj.origH, imgObj.cropY + imgY));
            updatePreview();
        }
        return;
    }
    
    // Handle image dragging
    if (isImageDragging && selectedImageId) {
        const imgObj = images.find(i => i.id === selectedImageId);
        if (imgObj) {
            imgObj.x = mouseX - dragOffset.x;
            imgObj.y = mouseY - dragOffset.y;
            updatePreview();
        }
        return;
    }
    
    // Handle text dragging
    if (!isDragging) return;
    
    // Single text mode
    if (!multiTextCheckbox.checked) {
        textPosition.x = mouseX - dragOffset.x;
        textPosition.y = mouseY - dragOffset.y;
        updatePreview();
        return;
    }
    
    // Multiple text mode - drag selected block
    if (!selectedTextBlockId) return;
    const block = textBlocks.find(b => b.id === selectedTextBlockId);
    if (block) {
        block.x = mouseX - dragOffset.x;
        block.y = mouseY - dragOffset.y;
        updatePreview();
    }
});

window.addEventListener('mouseup', function(e) {
    // Finalize drawing
    if (isDrawing && currentDrawingTool && selectedLayerId) {
        const layer = drawingLayers.find(l => l.id === selectedLayerId);
        if (!layer) {
            isDrawing = false;
            currentPath = [];
            return;
        }
        
        const color = drawingColorInput.value;
        const size = currentDrawingTool === 'brush' ? parseInt(drawingSizeInput.value) * 2 : parseInt(drawingSizeInput.value);
        const filled = shapeFilledCheckbox.checked;
        
        const x1 = drawingStartPoint.x;
        const y1 = drawingStartPoint.y;
        const x2 = currentPath.length > 0 ? currentPath[currentPath.length - 1].x : x1;
        const y2 = currentPath.length > 0 ? currentPath[currentPath.length - 1].y : y1;
        
        switch (currentDrawingTool) {
            case 'pencil':
            case 'brush':
                if (currentPath.length > 1) {
                    layer.drawings.push({
                        type: 'path',
                        points: [...currentPath],
                        color: color,
                        size: size
                    });
                }
                break;
            case 'eraser':
                if (currentPath.length > 1) {
                    layer.drawings.push({
                        type: 'eraser',
                        points: [...currentPath],
                        color: '#000',
                        size: size
                    });
                }
                break;
            case 'line':
                layer.drawings.push({
                    type: 'line',
                    x1: x1, y1: y1, x2: x2, y2: y2,
                    color: color,
                    size: size
                });
                break;
            case 'arrow':
                layer.drawings.push({
                    type: 'arrow',
                    x1: x1, y1: y1, x2: x2, y2: y2,
                    color: color,
                    size: size
                });
                break;
            case 'rectangle':
                layer.drawings.push({
                    type: 'rectangle',
                    x: Math.min(x1, x2),
                    y: Math.min(y1, y2),
                    w: Math.abs(x2 - x1),
                    h: Math.abs(y2 - y1),
                    color: color,
                    size: size,
                    filled: filled
                });
                break;
            case 'circle':
                layer.drawings.push({
                    type: 'circle',
                    cx: (x1 + x2) / 2,
                    cy: (y1 + y2) / 2,
                    rx: Math.abs(x2 - x1) / 2,
                    ry: Math.abs(y2 - y1) / 2,
                    color: color,
                    size: size,
                    filled: filled
                });
                break;
        }
        
        isDrawing = false;
        currentPath = [];
        updatePreview();
        return;
    }
    
    // Finalize angled cropping
    if (isAngledCropping && selectedImageId) {
        const imgObj = images.find(i => i.id === selectedImageId);
        if (imgObj) {
            const x1 = angledCropLine.x1;
            const y1 = angledCropLine.y1;
            const x2 = angledCropLine.x2;
            const y2 = angledCropLine.y2;
            
            const lineLen = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
            
            // Only apply if line is meaningful (at least 10px)
            if (lineLen >= 10) {
                // Create a new canvas to apply the angled crop
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imgObj.origW;
                tempCanvas.height = imgObj.origH;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Draw the original image
                tempCtx.drawImage(imgObj.img, 0, 0);
                
                // Calculate line direction and normal
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len; // Normal vector
                const ny = dx / len;
                
                // Create clipping path for the side to keep
                const extend = Math.max(imgObj.origW, imgObj.origH) * 3;
                
                // Clear the side we want to remove
                tempCtx.globalCompositeOperation = 'destination-out';
                tempCtx.beginPath();
                
                // Extend line points
                const lineX1 = x1 - dx * extend;
                const lineY1 = y1 - dy * extend;
                const lineX2 = x2 + dx * extend;
                const lineY2 = y2 + dy * extend;
                
                if (angledCropSide === 'left') {
                    // Remove left side (where normal points)
                    tempCtx.moveTo(lineX1, lineY1);
                    tempCtx.lineTo(lineX2, lineY2);
                    tempCtx.lineTo(lineX2 + nx * extend, lineY2 + ny * extend);
                    tempCtx.lineTo(lineX1 + nx * extend, lineY1 + ny * extend);
                } else {
                    // Remove right side
                    tempCtx.moveTo(lineX1, lineY1);
                    tempCtx.lineTo(lineX2, lineY2);
                    tempCtx.lineTo(lineX2 - nx * extend, lineY2 - ny * extend);
                    tempCtx.lineTo(lineX1 - nx * extend, lineY1 - ny * extend);
                }
                tempCtx.closePath();
                tempCtx.fill();
                
                // Create new image from the result
                const newImg = new Image();
                newImg.onload = function() {
                    imgObj.img = newImg;
                    imgObj.x = 0;
                    imgObj.y = 0;
                    updatePreview();
                };
                newImg.src = tempCanvas.toDataURL();
            }
            updatePreview();
        }
    }
    
    // Finalize rectangular cropping
    if (isCropping && selectedImageId) {
        const imgObj = images.find(i => i.id === selectedImageId);
        if (imgObj) {
            const minX = Math.min(cropStart.x, cropEnd.x);
            const maxX = Math.max(cropStart.x, cropEnd.x);
            const minY = Math.min(cropStart.y, cropEnd.y);
            const maxY = Math.max(cropStart.y, cropEnd.y);
            
            const newCropW = maxX - minX;
            const newCropH = maxY - minY;
            
            // Only apply if crop area is meaningful (at least 10px)
            if (newCropW >= 10 && newCropH >= 10) {
                imgObj.cropX = Math.round(minX);
                imgObj.cropY = Math.round(minY);
                imgObj.cropW = Math.round(newCropW);
                imgObj.cropH = Math.round(newCropH);
                // Reset position to origin after crop
                imgObj.x = 0;
                imgObj.y = 0;
            }
            updatePreview();
        }
    }
    
    isDragging = false;
    isImageDragging = false;
    isCropping = false;
    isAngledCropping = false;
});

// Text color selection handler
customColorInput.addEventListener('input', function() {
    // Determine which textarea to use based on mode
    let textarea;
    if (multiTextCheckbox.checked && selectedTextBlockId !== null) {
        textarea = document.querySelector(`.text-block-input[data-id="${selectedTextBlockId}"]`);
    } else {
        textarea = userInput;
    }
    
    if (!textarea) {
        updatePreview();
        return;
    }
    
    const color = customColorInput.value;
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    if (start === end) {
        // Nothing selected, just update preview
        updatePreview();
        return;
    }
    let value = textarea.value;

    const before = value.substring(0, start);
    const selected = value.substring(start, end);
    const after = value.substring(end);

    const colorTagRegex = /\[color=#[0-9a-fA-F]{3,6}\]([\s\S]*?)\[\/color\]/g;
    let match, found = false;
    let newValue = value;
    while ((match = colorTagRegex.exec(value)) !== null) {
        const tagStart = match.index;
        const tagEnd = colorTagRegex.lastIndex;
        const innerStart = tagStart + match[0].indexOf(match[1]);
        const innerEnd = innerStart + match[1].length;
        if (start >= innerStart && end <= innerEnd) {
            const newTag = '[color=' + color + ']' + match[1] + '[/color]';
            newValue = value.substring(0, tagStart) + newTag + value.substring(tagEnd);
            textarea.value = newValue;
            textarea.selectionStart = start + (newTag.length - match[0].length);
            textarea.selectionEnd = end + (newTag.length - match[0].length);
            textarea.focus();
            // Update the block's text if in multi-text mode
            if (multiTextCheckbox.checked && selectedTextBlockId !== null) {
                updateTextBlockContent(selectedTextBlockId, textarea.value);
            } else {
                updatePreview();
            }
            found = true;
            break;
        }
    }
    if (!found) {
        textarea.value = before + '[color=' + color + ']' + selected + '[/color]' + after;
        textarea.selectionStart = before.length + ('[color=' + color + ']').length;
        textarea.selectionEnd = textarea.selectionStart + selected.length;
        textarea.focus();
        // Update the block's text if in multi-text mode
        if (multiTextCheckbox.checked && selectedTextBlockId !== null) {
            updateTextBlockContent(selectedTextBlockId, textarea.value);
        } else {
            updatePreview();
        }
    }
});

// Handle Enter key
userInput.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        const text = userInput.value;
        addMessageToChat(text);
        userInput.value = '';
        updatePreview();
    } else if (event.key === 'Enter' && !event.ctrlKey) {
        event.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const text = this.value;
        this.value = text.substring(0, start) + '\n' + text.substring(end);
        this.selectionStart = this.selectionEnd = start + 1;
        updatePreview();
    }
});

// Download buttons
dwnlTrsBtn.addEventListener('click', function() {
    let text = userInput.value;
    if (processTextCheckbox.checked) {
        text = processText(text);
    }
    if (!text.trim()) {
        alert('Please enter some text first!');
        return;
    }
    const canvas = createTransparentImage(text);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'message_transparent.png';
    link.click();
});

dwnlBcgBtn.addEventListener('click', function() {
    let text = userInput.value;
    if (processTextCheckbox.checked) {
        text = processText(text);
    }
    if (!text.trim()) {
        alert('Please enter some text first!');
        return;
    }
    const canvas = textToImage(text);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'message_background.png';
    link.click();
});

// Download with background image
dwnlImgBtn.addEventListener('click', function() {
    let text = userInput.value;
    if (processTextCheckbox.checked) {
        text = processText(text);
    }
    if (images.length === 0) {
        alert('Najpierw dodaj obraz!');
        return;
    }
    const canvas = createImageWithBackground(text);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'message_with_image.png';
    link.click();
});

// Initialize preview on load
window.addEventListener('DOMContentLoaded', function() {
    updatePreview();
});

// Ctrl+Z to undo, Ctrl+Shift+Z to redo (image operations or drawing)
window.addEventListener('keydown', function(e) {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
        // Only undo/redo if not typing in a text field
        const activeEl = document.activeElement;
        if (activeEl.tagName !== 'TEXTAREA' && activeEl.tagName !== 'INPUT') {
            e.preventDefault();
            if (e.shiftKey) {
                // Ctrl+Shift+Z = Redo
                if (drawingRedoHistory.length > 0) {
                    redoDrawing();
                }
            } else {
                // Ctrl+Z = Undo
                if (drawingUndoHistory.length > 0) {
                    undoDrawing();
                } else {
                    // Fall back to image undo
                    undo();
                }
            }
        }
    }
});

// Also call updatePreview immediately in case DOM is already loaded
updatePreview();
