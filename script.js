document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const imageLoader = document.getElementById('image-loader');
    const uploadPrompt = document.getElementById('upload-prompt');
    const previewContainer = document.getElementById('preview-container');
    const workspace = document.querySelector('.workspace');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const imageInfo = document.getElementById('image-info');
    const filenameInput = document.getElementById('filename-input');
    const addMoreBtn = document.getElementById('add-more-btn');

    // アップロードされたファイルを管理する配列
    let imageFiles = [];

    // --- イベントリスナーの設定 ---
    imageLoader.addEventListener('change', (e) => handleFiles(e.target.files));
    addMoreBtn.addEventListener('click', () => imageLoader.click());
    generateBtn.addEventListener('click', generateIcoFile);
    resetBtn.addEventListener('click', resetUploader);
    
    // ドラッグ＆ドロップのイベント
    workspace.addEventListener('dragenter', handleDragEnter, false);
    workspace.addEventListener('dragover', handleDragOver, false);
    workspace.addEventListener('dragleave', handleDragLeave, false);
    workspace.addEventListener('drop', handleDrop, false);

    // --- ドラッグ＆ドロップ ハンドラ ---
    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        workspace.classList.add('drag-over');
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        workspace.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        workspace.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    }

    // --- ファイル処理 ---
    function handleFiles(files) {
        Array.from(files).forEach(file => {
            file.uniqueId = Date.now() + Math.random(); 
            imageFiles.push(file);
            createPreview(file);
        });
        updateUIState();
    }

    function createPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                file.isValid = img.width === img.height && img.width > 0 && img.width <= 256;
                file.width = img.width;
                file.height = img.height;
                renderPreviewItem(file, e.target.result, img.width, img.height);
                updateUIState();
            };
            img.src = e.target.result;
        };

        if (file.type === 'image/png') {
            reader.readAsDataURL(file);
        } else {
            file.isValid = false;
            renderPreviewItem(file, null, 0, 0, "PNGファイルではありません");
            updateUIState();
        }
    }
    
    function renderPreviewItem(file, imgSrc, width, height, customError = null) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.dataset.id = file.uniqueId;

        let errorMsg = customError;
        if (!errorMsg && !file.isValid) {
            errorMsg = "サイズが不正です";
        }
        
        if (!file.isValid) {
            previewItem.classList.add('invalid');
        }

        const imgTag = imgSrc ? `<img src="${imgSrc}" alt="${file.name}" draggable="false">` : '';
        const infoTag = width > 0 ? `<div class="file-info">${width} x ${height}</div>` : `<div class="file-info">${file.name}</div>`;
        const errorTag = errorMsg ? `<div class="error-msg">${errorMsg}</div>` : '';

        previewItem.innerHTML = `
            <button class="remove-btn" title="削除">×</button>
            ${imgTag}
            ${infoTag}
            ${errorTag}
        `;
        
        previewContainer.appendChild(previewItem);
        previewItem.querySelector('.remove-btn').addEventListener('click', () => removeFile(file.uniqueId));
    }

    function removeFile(id) {
        imageFiles = imageFiles.filter(f => f.uniqueId != id);
        const previewItem = previewContainer.querySelector(`[data-id='${id}']`);
        if (previewItem) {
            previewItem.remove();
        }
        updateUIState();
    }
    
    // --- UI状態管理 ---
    function updateUIState() {
        const hasFiles = imageFiles.length > 0;
        const validFilesCount = imageFiles.filter(f => f.isValid).length;

        // 表示エリアの切り替え
        uploadPrompt.classList.toggle('hidden', hasFiles);
        previewContainer.classList.toggle('hidden', !hasFiles);
        addMoreBtn.classList.toggle('hidden', !hasFiles);
        resetBtn.classList.toggle('hidden', !hasFiles);
        
        // 生成ボタンの状態
        generateBtn.disabled = validFilesCount === 0;

        // 情報テキストの更新
        if (validFilesCount > 0) {
            imageInfo.textContent = `${validFilesCount}個の有効な画像をICOに変換します。`;
        } else if (hasFiles) {
            imageInfo.textContent = '有効な画像がありません。';
        } else {
            imageInfo.textContent = 'ICOに含める画像ファイルを選択してください。';
        }
    }
    
    function resetUploader() {
        imageFiles = [];
        previewContainer.innerHTML = '';
        imageLoader.value = '';
        filenameInput.value = 'favicon';
        updateUIState();
    }

    // --- ICO生成ロジック ---
    async function generateIcoFile() {
        const validFiles = imageFiles.filter(f => f.isValid);
        if (validFiles.length === 0) {
            return;
        }

        const imageBuffers = await Promise.all(validFiles.map(file => file.arrayBuffer()));

        const numImages = validFiles.length;
        const headerSize = 6;
        const dirEntrySize = 16;
        const totalDirSize = numImages * dirEntrySize;
        const imagesTotalSize = imageBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
        
        const icoBuffer = new ArrayBuffer(headerSize + totalDirSize + imagesTotalSize);
        const dataView = new DataView(icoBuffer);

        // ヘッダーを書き込む
        dataView.setUint16(0, 0, true);
        dataView.setUint16(2, 1, true);
        dataView.setUint16(4, numImages, true);

        // イメージディレクトリを書き込む
        let currentOffset = headerSize + totalDirSize;
        for (let i = 0; i < numImages; i++) {
            const file = validFiles[i];
            const buffer = imageBuffers[i];
            const entryOffset = headerSize + i * dirEntrySize;
            
            dataView.setUint8(entryOffset, file.width === 256 ? 0 : file.width);
            dataView.setUint8(entryOffset + 1, file.height === 256 ? 0 : file.height);
            dataView.setUint8(entryOffset + 2, 0);
            dataView.setUint8(entryOffset + 3, 0);
            dataView.setUint16(entryOffset + 4, 1, true);
            dataView.setUint16(entryOffset + 6, 32, true);
            dataView.setUint32(entryOffset + 8, buffer.byteLength, true);
            dataView.setUint32(entryOffset + 12, currentOffset, true);
            currentOffset += buffer.byteLength;
        }

        // PNGイメージデータを書き込む
        currentOffset = headerSize + totalDirSize;
        for (let i = 0; i < imageBuffers.length; i++) {
            new Uint8Array(icoBuffer, currentOffset, imageBuffers[i].byteLength).set(new Uint8Array(imageBuffers[i]));
            currentOffset += imageBuffers[i].byteLength;
        }

        // ファイルをダウンロードさせる
        const blob = new Blob([icoBuffer], { type: 'image/x-icon' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        const filename = filenameInput.value.trim() || 'favicon';
        link.download = `${filename}.ico`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
});