document.addEventListener('DOMContentLoaded', () => {
    // --- 全体コンテナとモード選択ボタン ---
    const modeSelectionContainer = document.getElementById('mode-selection-container');
    const singleModeContainer = document.getElementById('single-mode-container');
    const multiModeContainer = document.getElementById('multi-mode-container');
    const selectSingleBtn = document.getElementById('select-single-mode');
    const selectMultiBtn = document.getElementById('select-multi-mode');
    const backButtons = document.querySelectorAll('.back-button');

    // --- 単一画像モード要素 ---
    const singleWorkspace = document.getElementById('single-workspace');
    const singleImageLoader = document.getElementById('single-image-loader');
    const singleUploadPrompt = document.getElementById('single-upload-prompt');
    const singlePreviewArea = document.getElementById('single-preview-area');
    const singleGenerateBtn = document.getElementById('single-generate-btn');
    const singleResetBtn = document.getElementById('single-reset-btn');
    const singleFilenameInput = document.getElementById('single-filename-input');
    const sizeOptionsContainer = document.getElementById('size-options');
    let singleImageFile = null;
    let originalImage = new Image();

    // --- 複数画像モード要素 ---
    const multiWorkspace = document.getElementById('multi-workspace');
    const multiImageLoader = document.getElementById('multi-image-loader');
    const multiUploadPrompt = document.getElementById('multi-upload-prompt');
    const multiPreviewContainer = document.getElementById('multi-preview-container');
    const addMoreBtn = document.getElementById('add-more-btn');
    const multiGenerateBtn = document.getElementById('multi-generate-btn');
    const multiResetBtn = document.getElementById('multi-reset-btn');
    const multiFilenameInput = document.getElementById('multi-filename-input');
    const multiImageInfo = document.getElementById('multi-image-info');
    let multiImageFiles = [];

    // --- 初期化 ---
    const SIZES = [16, 24, 32, 48, 64, 128, 256];
    initializeSizeOptions();

    // --- モード切り替えイベント ---
    selectSingleBtn.addEventListener('click', () => switchMode('single'));
    selectMultiBtn.addEventListener('click', () => switchMode('multi'));
    backButtons.forEach(btn => btn.addEventListener('click', () => switchMode('selection')));

    function switchMode(mode) {
        modeSelectionContainer.classList.add('hidden');
        singleModeContainer.classList.add('hidden');
        multiModeContainer.classList.add('hidden');

        if (mode === 'single') {
            singleModeContainer.classList.remove('hidden');
        } else if (mode === 'multi') {
            multiModeContainer.classList.remove('hidden');
        } else {
            modeSelectionContainer.classList.remove('hidden');
            // モードを抜ける時にリセットする
            resetSingleMode();
            resetMultiMode();
        }
    }

    // --- 単一画像モード ---
    function initializeSizeOptions() {
        SIZES.forEach(size => {
            const id = `size-${size}`;
            const label = document.createElement('label');
            label.htmlFor = id;
            label.innerHTML = `<input type="checkbox" id="${id}" value="${size}" checked> ${size}x${size}`;
            sizeOptionsContainer.appendChild(label);
        });
    }

    singleImageLoader.addEventListener('change', e => handleSingleFile(e.target.files[0]));
    setupDragAndDrop(singleWorkspace, file => handleSingleFile(file));
    singleGenerateBtn.addEventListener('click', generateIcoFromSingle);
    singleResetBtn.addEventListener('click', resetSingleMode);

    function handleSingleFile(file) {
        if (!file || !file.type.startsWith('image/png')) {
            alert('PNG画像ファイルを選択してください。');
            return;
        }
        singleImageFile = file;
        const reader = new FileReader();
        reader.onload = e => {
            originalImage.onload = () => {
                if (originalImage.width !== originalImage.height) {
                    alert('正方形の画像を選択してください。');
                    resetSingleMode();
                    return;
                }
                updateSingleUI(true);
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function updateSingleUI(isLoaded) {
        singleUploadPrompt.classList.toggle('hidden', isLoaded);
        singlePreviewArea.classList.toggle('hidden', !isLoaded);
        singleResetBtn.classList.toggle('hidden', !isLoaded);
        singleGenerateBtn.disabled = !isLoaded;

        if(isLoaded) {
            singlePreviewArea.innerHTML = `<img src="${originalImage.src}" alt="プレビュー">`;
        } else {
            singlePreviewArea.innerHTML = '';
        }
    }
    
    function resetSingleMode() {
        singleImageFile = null;
        originalImage.src = '';
        singleImageLoader.value = '';
        updateSingleUI(false);
    }
    
    async function generateIcoFromSingle() {
        const selectedSizes = Array.from(sizeOptionsContainer.querySelectorAll('input:checked')).map(cb => parseInt(cb.value));
        if (selectedSizes.length === 0) {
            alert('作成するサイズを1つ以上選択してください。');
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const imageEntries = await Promise.all(selectedSizes.map(async size => {
            canvas.width = size;
            canvas.height = size;
            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(originalImage, 0, 0, size, size);
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const buffer = await blob.arrayBuffer();

            return { width: size, height: size, buffer: buffer };
        }));

        const icoBlob = createIcoBlob(imageEntries);
        const filename = singleFilenameInput.value.trim() || 'favicon';
        downloadBlob(icoBlob, `${filename}.ico`);
    }

    // --- 複数画像モード ---
    multiImageLoader.addEventListener('change', e => handleMultiFiles(e.target.files));
    setupDragAndDrop(multiWorkspace, files => handleMultiFiles(files, true));
    addMoreBtn.addEventListener('click', () => multiImageLoader.click());
    multiGenerateBtn.addEventListener('click', generateIcoFromMulti);
    multiResetBtn.addEventListener('click', resetMultiMode);
    
    function handleMultiFiles(files, isDrop = false) {
        const fileList = isDrop ? files : Array.from(files);
        fileList.forEach(file => {
            if (multiImageFiles.some(f => f.name === file.name && f.size === file.size)) return;
            
            file.uniqueId = Date.now() + Math.random();
            multiImageFiles.push(file);
            createMultiPreview(file);
        });
        updateMultiUI();
    }

    function createMultiPreview(file) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                file.isValid = img.width === img.height && img.width > 0 && img.width <= 256;
                file.width = img.width;
                file.height = img.height;
                renderMultiPreviewItem(file, e.target.result, img.width, img.height);
                updateMultiUI();
            };
            img.src = e.target.result;
        };
        if (file.type === 'image/png') {
            reader.readAsDataURL(file);
        } else {
            file.isValid = false;
            renderMultiPreviewItem(file, null, 0, 0, 'PNGではありません');
            updateMultiUI();
        }
    }
    
    function renderMultiPreviewItem(file, imgSrc, width, height, error) {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.dataset.id = file.uniqueId;
        if (!file.isValid) item.classList.add('invalid');
        
        const errorMsg = error || (file.isValid ? '' : 'サイズが不適切です');
        item.innerHTML = `
            <button class="remove-btn" title="削除">×</button>
            ${imgSrc ? `<img src="${imgSrc}" draggable="false">` : ''}
            <div class="file-info">${width > 0 ? `${width}x${height}`: file.name}</div>
            ${errorMsg ? `<div class="error-msg">${errorMsg}</div>`: ''}
        `;
        multiPreviewContainer.appendChild(item);
        item.querySelector('.remove-btn').addEventListener('click', () => {
            multiImageFiles = multiImageFiles.filter(f => f.uniqueId !== file.uniqueId);
            item.remove();
            updateMultiUI();
        });
    }

    function updateMultiUI() {
        const hasFiles = multiImageFiles.length > 0;
        const validCount = multiImageFiles.filter(f => f.isValid).length;
        
        multiUploadPrompt.classList.toggle('hidden', hasFiles);
        multiPreviewContainer.classList.toggle('hidden', !hasFiles);
        addMoreBtn.classList.toggle('hidden', !hasFiles);
        multiResetBtn.classList.toggle('hidden', !hasFiles);
        multiGenerateBtn.disabled = validCount === 0;

        if (validCount > 0) {
            multiImageInfo.textContent = `${validCount}個の画像をICOに変換します。`;
        } else if (hasFiles) {
            multiImageInfo.textContent = '有効な画像がありません。';
        } else {
            multiImageInfo.textContent = 'ICOに含める画像ファイルを選択してください。';
        }
    }
    
    function resetMultiMode() {
        multiImageFiles = [];
        multiPreviewContainer.innerHTML = '';
        multiImageLoader.value = '';
        updateMultiUI();
    }
    
    async function generateIcoFromMulti() {
        const validFiles = multiImageFiles.filter(f => f.isValid);
        if (validFiles.length === 0) return;
        
        const imageEntries = await Promise.all(validFiles.map(async file => {
            const buffer = await file.arrayBuffer();
            return { width: file.width, height: file.height, buffer: buffer };
        }));
        
        const icoBlob = createIcoBlob(imageEntries);
        const filename = multiFilenameInput.value.trim() || 'favicon';
        downloadBlob(icoBlob, `${filename}.ico`);
    }

    // --- 共通ヘルパー関数 ---
    function setupDragAndDrop(element, callback) {
        element.addEventListener('dragenter', e => { e.preventDefault(); e.stopPropagation(); element.classList.add('drag-over'); });
        element.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; });
        element.addEventListener('dragleave', e => { e.preventDefault(); e.stopPropagation(); element.classList.remove('drag-over'); });
        element.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                callback(element.id.includes('multi') ? Array.from(files) : files[0]);
            }
        });
    }

    function createIcoBlob(imageEntries) {
        const numImages = imageEntries.length;
        const headerSize = 6;
        const dirEntrySize = 16;
        const totalDirSize = numImages * dirEntrySize;
        const imagesTotalSize = imageEntries.reduce((sum, entry) => sum + entry.buffer.byteLength, 0);
        
        const icoBuffer = new ArrayBuffer(headerSize + totalDirSize + imagesTotalSize);
        const dataView = new DataView(icoBuffer);

        dataView.setUint16(0, 0, true); // Reserved
        dataView.setUint16(2, 1, true); // Type: ICO
        dataView.setUint16(4, numImages, true); // Number of images

        let currentOffset = headerSize + totalDirSize;
        imageEntries.forEach((entry, i) => {
            const entryOffset = headerSize + i * dirEntrySize;
            dataView.setUint8(entryOffset, entry.width === 256 ? 0 : entry.width);
            dataView.setUint8(entryOffset + 1, entry.height === 256 ? 0 : entry.height);
            dataView.setUint8(entryOffset + 2, 0); // Color Palette
            dataView.setUint8(entryOffset + 3, 0); // Reserved
            dataView.setUint16(entryOffset + 4, 1, true); // Color Planes
            dataView.setUint16(entryOffset + 6, 32, true); // Bits Per Pixel
            dataView.setUint32(entryOffset + 8, entry.buffer.byteLength, true); // Image data size
            dataView.setUint32(entryOffset + 12, currentOffset, true); // Image data offset
            currentOffset += entry.buffer.byteLength;
        });
        
        currentOffset = headerSize + totalDirSize;
        imageEntries.forEach(entry => {
            new Uint8Array(icoBuffer, currentOffset, entry.buffer.byteLength).set(new Uint8Array(entry.buffer));
            currentOffset += entry.buffer.byteLength;
        });

        return new Blob([icoBuffer], { type: 'image/x-icon' });
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
});