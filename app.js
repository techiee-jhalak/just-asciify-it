const video = document.getElementById('webcam');
const uploadImg = document.getElementById('hidden-img');
const canvas = document.getElementById('hidden-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const asciiContainer = document.getElementById('ascii-container');

// View Overlays
const dashboardOverlay = document.getElementById('dashboard-overlay');
const appWorkspace = document.getElementById('app-workspace');
const btnStartCore = document.getElementById('btn-start-core');

// Elements
const pSize = document.getElementById('param-size');
const pGain = document.getElementById('param-gain');
const pContrast = document.getElementById('param-contrast');
const pMode = document.getElementById('param-mode');
const pColor = document.getElementById('param-color');
const pUpload = document.getElementById('param-upload');
const btnTxt = document.getElementById('btn-screenshot-txt');
const btnPng = document.getElementById('btn-screenshot-png');

const lblSize = document.getElementById('lbl-size');
const lblGain = document.getElementById('lbl-gain');
const lblContrast = document.getElementById('lbl-contrast');

const characterSets = {
    simple: " .:-=+*#%@",
    complex: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
    binary: "01 ",
    blocks: " ░▒▓█"
};

function getOptimalDimensions() {
    const isMobile = window.innerWidth <= 768;
    return {
        width: isMobile ? 80 : 120,    
        height: isMobile ? 40 : 60     
    };
}

const dimensions = getOptimalDimensions();
const BASE_WIDTH = dimensions.width;
const BASE_HEIGHT = dimensions.height;

const colorThemes = {
    matrix: "#00ff66",
    cyan: "#00f3ff",
    pink: "#ff007f",
    purple: "#9d00ff",
    red: "#ff1111",
    yellow: "#ffea00",
    bw: "#ffffff"
};

let activeSourceType = 'webcam';

window.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 768 && pSize) {
        pSize.value = 5; 
        if (lblSize) lblSize.textContent = "5px";
    }
});

btnStartCore.addEventListener('click', () => {
    dashboardOverlay.classList.add('hidden');
    appWorkspace.classList.remove('hidden');
    setupCamera();
});

async function setupCamera() {
    activeSourceType = 'webcam';
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 } 
            } 
        });
        video.srcObject = stream;
        video.addEventListener('playing', onMediaReady);
    } catch (e) {
        asciiContainer.textContent = "CRITICAL ERROR: CAPTURE DEVICE NOT FOUND";
    }
}

function onMediaReady() {
    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;
    processFrame();
}

pUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileURL = URL.createObjectURL(file);

    if (file.type.startsWith('image/')) {
        activeSourceType = 'image';
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        uploadImg.src = fileURL;
        uploadImg.onload = () => {
            onMediaReady();
        };
    } else if (file.type.startsWith('video/')) {
        activeSourceType = 'video';
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        video.srcObject = null;
        video.videoWidth = BASE_WIDTH;
        video.videoHeight = BASE_HEIGHT;
        video.src = fileURL;
        video.load();
        video.play();
        video.addEventListener('playing', onMediaReady);
    }
});

function processFrame() {
    if ((activeSourceType === 'webcam' || activeSourceType === 'video') && (video.paused || video.ended)) {
        requestAnimationFrame(processFrame);
        return;
    }

    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    if (activeSourceType === 'image') {
        ctx.drawImage(uploadImg, 0, 0, BASE_WIDTH, BASE_HEIGHT);
    } else {
        ctx.drawImage(video, 0, 0, BASE_WIDTH, BASE_HEIGHT);
    }

    const imgData = ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
    const pixels = imgData.data;

    const gain = parseFloat(pGain.value);
    const contrast = parseFloat(pContrast.value);
    const currentSet = characterSets[pMode.value];
    const colorMode = pColor.value;

    let outputHTML = "";
    let outputText = "";

    lblSize.textContent = `${pSize.value}px`;
    lblGain.textContent = gain.toFixed(1);
    lblContrast.textContent = contrast.toFixed(1);
    
    if (window.innerWidth > 768) {
        asciiContainer.style.fontSize = `${pSize.value}px`;
    }

    if (colorThemes[colorMode]) {
        document.documentElement.style.setProperty('--g-color', colorThemes[colorMode]);
    }

    for (let y = 0; y < BASE_HEIGHT; y++) {
        for (let x = 0; x < BASE_WIDTH; x++) {
            const idx = (y * BASE_WIDTH + x) * 4;
            let r = pixels[idx] * gain;
            let g = pixels[idx+1] * gain;
            let b = pixels[idx+2] * gain;

            let normBright = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            normBright = 0.5 + contrast * (normBright - 0.5);
            normBright = Math.max(0, Math.min(1, normBright));

            const charIdx = Math.floor(normBright * (currentSet.length - 1));
            let char = currentSet[charIdx];
            if (char === " ") char = "&nbsp;";

            if (colorMode === 'cyber') {
                outputHTML += `<span style="color: rgb(${Math.min(255,r)},${Math.min(255,g)},${Math.min(255,b)})">${char}</span>`;
            } else {
                outputHTML += char;
            }
            outputText += (char === "&nbsp;") ? " " : char;
        }
        outputHTML += "\n";
        outputText += "\n";
    }

    if (colorMode === 'cyber') {
        asciiContainer.innerHTML = outputHTML;
    } else {
        asciiContainer.textContent = outputText;
    }

    requestAnimationFrame(processFrame);
}

btnTxt.addEventListener('click', () => {
    const textToSave = asciiContainer.textContent;
    const blob = new Blob([textToSave], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = `ascii-capture-${Date.now()}.txt`;
    link.href = window.URL.createObjectURL(blob);
    link.click();
});

btnPng.addEventListener('click', () => {
    const lines = asciiContainer.textContent.split('\n');
    const fontSize = parseInt(pSize.value);
    
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    
    const charWidth = fontSize * 0.6; 
    const charHeight = fontSize * 0.75;

    exportCanvas.width = BASE_WIDTH * charWidth;
    exportCanvas.height = BASE_HEIGHT * charHeight;

    exportCtx.fillStyle = "#050805";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    exportCtx.font = `bold ${fontSize}px 'Courier New', Courier, monospace`;
    
    const themeColor = colorThemes[pColor.value] || "#00ff66";

    for (let y = 0; y < lines.length; y++) {
        const line = lines[y];
        for (let x = 0; x < line.length; x++) {
            const char = line[x];
            
            if (pColor.value === 'cyber') {
                const pixelIdx = (y * BASE_WIDTH + x) * 4;
                const imgData = ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
                const r = imgData.data[pixelIdx] * parseFloat(pGain.value);
                const g = imgData.data[pixelIdx+1] * parseFloat(pGain.value);
                const b = imgData.data[pixelIdx+2] * parseFloat(pGain.value);
                exportCtx.fillStyle = `rgb(${Math.min(255,r)},${Math.min(255,g)},${Math.min(255,b)})`;
            } else {
                exportCtx.fillStyle = themeColor;
            }

            exportCtx.fillText(char, x * charWidth, (y + 1) * charHeight - (charHeight * 0.15));
        }
    }

    const link = document.createElement('a');
    link.download = `ascii-wallpaper-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
});