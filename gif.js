// --- DOM Elements ---
const frameInput = document.getElementById('frame_input');
const addFrameBtn = document.getElementById('add_frame_btn');
const clearFramesBtn = document.getElementById('clear_frames_btn');
const framesList = document.getElementById('frames_list');
const gifPreviewCanvas = document.getElementById('gif_preview_canvas');
const playBtn = document.getElementById('play_btn');
const stopBtn = document.getElementById('stop_btn');
const frameCounter = document.getElementById('frame_counter');
const generateGifBtn = document.getElementById('generate_gif_btn');
const downloadGifBtn = document.getElementById('download_gif_btn');
const gifOutput = document.getElementById('gif_output');
const outputGif = document.getElementById('output_gif');

// Video elements
const videoInput = document.getElementById('video_input');
const addVideoBtn = document.getElementById('add_video_btn');
const videoSettings = document.getElementById('video_settings');
const videoPreview = document.getElementById('video_preview');
const videoStartInput = document.getElementById('video_start');
const videoEndInput = document.getElementById('video_end');
const videoExtractFpsInput = document.getElementById('video_extract_fps');
const estimatedFramesSpan = document.getElementById('estimated_frames');
const extractFramesBtn = document.getElementById('extract_frames_btn');
const cancelVideoBtn = document.getElementById('cancel_video_btn');
const extractionProgress = document.getElementById('extraction_progress');
const extractionFill = document.getElementById('extraction_fill');
const extractionText = document.getElementById('extraction_text');

// Settings inputs
const gifFpsInput = document.getElementById('gif_fps');
const gifWidthInput = document.getElementById('gif_width');
const gifHeightInput = document.getElementById('gif_height');
const gifQualityInput = document.getElementById('gif_quality');
const gifQualityValue = document.getElementById('gif_quality_value');
const gifLoopCheckbox = document.getElementById('gif_loop');

// --- State ---
let frames = []; // Array of { id, img, duration }
let frameIdCounter = 0;
let isPlaying = false;
let playInterval = null;
let currentFrameIndex = 0;
let generatedGifBlob = null;
let currentVideoFile = null;
let isExtracting = false;

const ctx = gifPreviewCanvas.getContext('2d');

// --- Functions ---

function updateFramesList() {
    if (frames.length === 0) {
        framesList.innerHTML = `
            <div class="empty_frames">
                <span>📷</span>
                <p>Dodaj obrazy lub wideo, aby rozpocząć</p>
                <small>Przeciągnij i upuść lub kliknij przyciski powyżej</small>
            </div>
        `;
        generateGifBtn.disabled = true;
        playBtn.disabled = true;
        stopBtn.disabled = true;
    } else {
        framesList.innerHTML = '';
        frames.forEach((frame, index) => {
            const frameItem = document.createElement('div');
            frameItem.className = 'frame_item' + (index === currentFrameIndex ? ' selected' : '');
            frameItem.draggable = true;
            frameItem.dataset.id = frame.id;
            frameItem.innerHTML = `
                <img src="${frame.img.src}" alt="Frame ${index + 1}">
                <span class="frame_number">${index + 1}</span>
                <button class="frame_delete" data-id="${frame.id}">×</button>
            `;
            
            // Click to select frame
            frameItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('frame_delete')) {
                    currentFrameIndex = index;
                    updateFramesList();
                    drawFrame(index);
                }
            });
            
            // Drag events for reordering
            frameItem.addEventListener('dragstart', handleDragStart);
            frameItem.addEventListener('dragover', handleDragOver);
            frameItem.addEventListener('drop', handleDrop);
            frameItem.addEventListener('dragend', handleDragEnd);
            
            framesList.appendChild(frameItem);
        });
        
        generateGifBtn.disabled = false;
        playBtn.disabled = false;
        stopBtn.disabled = false;
        
        // Add delete listeners
        document.querySelectorAll('.frame_delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFrame(parseInt(e.target.dataset.id));
            });
        });
    }
    
    updateFrameCounter();
}

function addFrame(img) {
    const id = ++frameIdCounter;
    frames.push({
        id,
        img,
        duration: 1000 / parseInt(gifFpsInput.value) // ms per frame
    });
    updateFramesList();
    
    // If this is the first frame, draw it
    if (frames.length === 1) {
        resizeCanvas();
        drawFrame(0);
    }
}

function removeFrame(id) {
    const index = frames.findIndex(f => f.id === id);
    if (index !== -1) {
        frames.splice(index, 1);
        if (currentFrameIndex >= frames.length) {
            currentFrameIndex = Math.max(0, frames.length - 1);
        }
        updateFramesList();
        if (frames.length > 0) {
            drawFrame(currentFrameIndex);
        } else {
            clearCanvas();
        }
    }
}

function clearAllFrames() {
    frames = [];
    frameIdCounter = 0;
    currentFrameIndex = 0;
    generatedGifBlob = null;
    downloadGifBtn.disabled = true;
    gifOutput.style.display = 'none';
    updateFramesList();
    clearCanvas();
}

function resizeCanvas() {
    const width = parseInt(gifWidthInput.value) || 400;
    const height = parseInt(gifHeightInput.value) || 300;
    gifPreviewCanvas.width = width;
    gifPreviewCanvas.height = height;
}

function clearCanvas() {
    resizeCanvas();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, gifPreviewCanvas.width, gifPreviewCanvas.height);
}

function drawFrame(index) {
    if (index < 0 || index >= frames.length) return;
    
    const frame = frames[index];
    const canvasW = gifPreviewCanvas.width;
    const canvasH = gifPreviewCanvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasW, canvasH);
    
    // Calculate aspect-fit scaling
    const imgW = frame.img.width;
    const imgH = frame.img.height;
    const scale = Math.min(canvasW / imgW, canvasH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (canvasW - drawW) / 2;
    const drawY = (canvasH - drawH) / 2;
    
    ctx.drawImage(frame.img, drawX, drawY, drawW, drawH);
    currentFrameIndex = index;
    updateFrameCounter();
}

function updateFrameCounter() {
    frameCounter.textContent = `Klatka: ${frames.length > 0 ? currentFrameIndex + 1 : 0} / ${frames.length}`;
}

function playPreview() {
    if (frames.length === 0) return;
    
    stopPreview();
    isPlaying = true;
    playBtn.textContent = '⏸️ Pauza';
    
    const fps = parseInt(gifFpsInput.value) || 10;
    const delay = 1000 / fps;
    
    playInterval = setInterval(() => {
        currentFrameIndex = (currentFrameIndex + 1) % frames.length;
        drawFrame(currentFrameIndex);
        updateFramesList();
    }, delay);
}

function stopPreview() {
    isPlaying = false;
    playBtn.textContent = '▶️ Odtwórz';
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
}

function togglePlay() {
    if (isPlaying) {
        stopPreview();
    } else {
        playPreview();
    }
}

// Create worker blob URL to avoid CORS issues
function createWorkerBlobURL() {
    // Fetch the worker script and create a blob URL
    return fetch('gif.worker.js')
        .then(response => response.text())
        .then(text => {
            const blob = new Blob([text], { type: 'application/javascript' });
            return URL.createObjectURL(blob);
        });
}

let workerBlobURL = null;

async function generateGif() {
    if (frames.length === 0) return;
    
    stopPreview();
    generateGifBtn.disabled = true;
    generateGifBtn.textContent = '⏳ Generowanie...';
    
    const width = parseInt(gifWidthInput.value) || 400;
    const height = parseInt(gifHeightInput.value) || 300;
    const quality = parseInt(gifQualityInput.value) || 10;
    const fps = parseInt(gifFpsInput.value) || 10;
    const loop = gifLoopCheckbox.checked;
    
    try {
        // Create worker blob URL if not already created
        if (!workerBlobURL) {
            workerBlobURL = await createWorkerBlobURL();
        }
        
        const gif = new GIF({
            workers: 2,
            quality: quality,
            width: width,
            height: height,
            workerScript: workerBlobURL
        });
        
        // Create temporary canvas for rendering frames
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Add each frame
        frames.forEach(frame => {
            // Clear temp canvas
            tempCtx.fillStyle = '#000';
            tempCtx.fillRect(0, 0, width, height);
            
            // Calculate aspect-fit scaling
            const imgW = frame.img.width;
            const imgH = frame.img.height;
            const scale = Math.min(width / imgW, height / imgH);
            const drawW = imgW * scale;
            const drawH = imgH * scale;
            const drawX = (width - drawW) / 2;
            const drawY = (height - drawH) / 2;
            
            tempCtx.drawImage(frame.img, drawX, drawY, drawW, drawH);
            
            gif.addFrame(tempCtx, {
                copy: true,
                delay: Math.round(1000 / fps)
            });
        });
        
        gif.on('finished', function(blob) {
            generatedGifBlob = blob;
            const url = URL.createObjectURL(blob);
            outputGif.src = url;
            gifOutput.style.display = 'block';
            downloadGifBtn.disabled = false;
            
            generateGifBtn.disabled = false;
            generateGifBtn.textContent = '🎬 Generuj GIF';
        });
        
        gif.on('progress', function(p) {
            generateGifBtn.textContent = `⏳ ${Math.round(p * 100)}%`;
        });
        
        gif.render();
        
    } catch (error) {
        console.error('Error generating GIF:', error);
        alert('Błąd podczas generowania GIF: ' + error.message);
        generateGifBtn.disabled = false;
        generateGifBtn.textContent = '🎬 Generuj GIF';
    }
}

function downloadGif() {
    if (!generatedGifBlob) return;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(generatedGifBlob);
    link.download = 'animation.gif';
    link.click();
}

// --- Drag and Drop for reordering ---
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    if (draggedItem !== this) {
        const draggedId = parseInt(draggedItem.dataset.id);
        const targetId = parseInt(this.dataset.id);
        
        const draggedIndex = frames.findIndex(f => f.id === draggedId);
        const targetIndex = frames.findIndex(f => f.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Swap frames
            const [removed] = frames.splice(draggedIndex, 1);
            frames.splice(targetIndex, 0, removed);
            updateFramesList();
        }
    }
}

function handleDragEnd() {
    this.style.opacity = '1';
    draggedItem = null;
}

// --- Drag and Drop for adding files ---
framesList.addEventListener('dragover', (e) => {
    e.preventDefault();
    framesList.classList.add('drag-over');
});

framesList.addEventListener('dragleave', () => {
    framesList.classList.remove('drag-over');
});

framesList.addEventListener('drop', (e) => {
    e.preventDefault();
    framesList.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    handleFiles(files);
});

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const img = new Image();
                img.onload = function() {
                    addFrame(img);
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            handleVideoFile(file);
        }
    });
}

// --- Video Functions ---
function handleVideoFile(file) {
    currentVideoFile = file;
    const url = URL.createObjectURL(file);
    videoPreview.src = url;
    
    videoPreview.onloadedmetadata = function() {
        const duration = videoPreview.duration;
        videoStartInput.value = 0;
        videoStartInput.max = duration;
        videoEndInput.value = Math.min(5, duration);
        videoEndInput.max = duration;
        updateEstimatedFrames();
        videoSettings.style.display = 'block';
    };
}

function updateEstimatedFrames() {
    const start = parseFloat(videoStartInput.value) || 0;
    const end = parseFloat(videoEndInput.value) || 5;
    const fps = parseInt(videoExtractFpsInput.value) || 10;
    const duration = Math.max(0, end - start);
    const estimatedCount = Math.ceil(duration * fps);
    estimatedFramesSpan.textContent = `~${estimatedCount} klatek`;
}

function cancelVideoExtraction() {
    videoSettings.style.display = 'none';
    videoPreview.src = '';
    currentVideoFile = null;
    isExtracting = false;
}

async function extractFramesFromVideo() {
    if (!currentVideoFile || isExtracting) return;
    
    isExtracting = true;
    extractFramesBtn.disabled = true;
    extractionProgress.style.display = 'block';
    
    const start = parseFloat(videoStartInput.value) || 0;
    const end = parseFloat(videoEndInput.value) || 5;
    const fps = parseInt(videoExtractFpsInput.value) || 10;
    const duration = Math.max(0, end - start);
    const frameInterval = 1 / fps;
    const totalFrames = Math.ceil(duration * fps);
    
    // Create a temporary video element for seeking
    const video = document.createElement('video');
    video.src = URL.createObjectURL(currentVideoFile);
    video.muted = true;
    
    // Create temporary canvas for extracting frames
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    await new Promise(resolve => {
        video.onloadedmetadata = resolve;
    });
    
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    
    // Update output size to match video aspect ratio if this is first content
    if (frames.length === 0) {
        gifWidthInput.value = Math.min(video.videoWidth, 600);
        const aspectRatio = video.videoHeight / video.videoWidth;
        gifHeightInput.value = Math.round(parseInt(gifWidthInput.value) * aspectRatio);
        gifFpsInput.value = fps;
        resizeCanvas();
    }
    
    let extractedCount = 0;
    
    for (let time = start; time < end && isExtracting; time += frameInterval) {
        // Seek to time
        video.currentTime = time;
        
        await new Promise(resolve => {
            video.onseeked = resolve;
        });
        
        // Draw frame to canvas
        tempCtx.drawImage(video, 0, 0);
        
        // Convert to image
        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
        const img = new Image();
        
        await new Promise(resolve => {
            img.onload = resolve;
            img.src = dataUrl;
        });
        
        addFrame(img);
        extractedCount++;
        
        // Update progress
        const progress = Math.round((extractedCount / totalFrames) * 100);
        extractionFill.style.width = progress + '%';
        extractionText.textContent = `Ekstrakcja: ${progress}% (${extractedCount}/${totalFrames})`;
    }
    
    // Cleanup
    URL.revokeObjectURL(video.src);
    isExtracting = false;
    extractFramesBtn.disabled = false;
    extractionProgress.style.display = 'none';
    extractionFill.style.width = '0%';
    videoSettings.style.display = 'none';
    videoPreview.src = '';
    currentVideoFile = null;
    
    // Draw first frame
    if (frames.length > 0) {
        drawFrame(0);
    }
}

// --- Event Listeners ---

addFrameBtn.addEventListener('click', () => frameInput.click());
addVideoBtn.addEventListener('click', () => videoInput.click());

frameInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    frameInput.value = ''; // Reset to allow adding same files again
});

videoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleVideoFile(e.target.files[0]);
    }
    videoInput.value = '';
});

clearFramesBtn.addEventListener('click', clearAllFrames);
cancelVideoBtn.addEventListener('click', cancelVideoExtraction);
extractFramesBtn.addEventListener('click', extractFramesFromVideo);

// Video settings change listeners
videoStartInput.addEventListener('input', updateEstimatedFrames);
videoEndInput.addEventListener('input', updateEstimatedFrames);
videoExtractFpsInput.addEventListener('input', updateEstimatedFrames);

playBtn.addEventListener('click', togglePlay);
stopBtn.addEventListener('click', stopPreview);

generateGifBtn.addEventListener('click', generateGif);
downloadGifBtn.addEventListener('click', downloadGif);

// Settings changes
gifFpsInput.addEventListener('change', () => {
    stopPreview();
});

gifWidthInput.addEventListener('change', () => {
    resizeCanvas();
    if (frames.length > 0) {
        drawFrame(currentFrameIndex);
    }
});

gifHeightInput.addEventListener('change', () => {
    resizeCanvas();
    if (frames.length > 0) {
        drawFrame(currentFrameIndex);
    }
});

gifQualityInput.addEventListener('input', function() {
    gifQualityValue.textContent = this.value;
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    clearCanvas();
    updateFramesList();
});
