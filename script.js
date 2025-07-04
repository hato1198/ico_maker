
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const imageLoader = document.getElementById('image-loader');
    const uploadPrompt = document.getElementById('upload-prompt');
    const previewContainer = document.getElementById('preview-container');
    const workspace = document.querySelector('.workspace');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const imageInfo = document.getElementById('image-info');

    // アップロードされたファイルを管理する配列
    let imageFiles = [];

    // --- イベントリスナーの設定 ---
    imageLoader.addEventListener('change', (e) => handleFiles(e.target.files));
    generateBtn.addEventListener('click', generateIcoFile);
    resetBtn.addEventListener('click', resetUploader);
    
    // ドラッグ＆ドロップのイベント
    workspace.addEventListener('dragenter', handleDragEnter, false);
    workspace.addEventListener('dragover', handleDragOver, false);
    workspace.addEventListener('dragleave', handleDragLeave, false);
    workspace.addEventListener('drop', handleDrop, false);

    // --- 主要な関数 ---
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

    // ファイルが選択されたときのメイン処理
    function handleFiles(files) {
        // UIをアップロード後の状態に更新
        uploadPrompt.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        resetBtn.classList.remove('hidden');

        // ファイルリストを非同期で処理
        Array.from(files).forEach(file => {
            // ユニークIDを付与して重複を避ける
            file.uniqueId = Date.now() + Math.random(); 
            // 既存のリストに追加
            imageFiles.push(file);
            // プレビューを生成
            createPreview(file);
        });
        updateUIState();
    }

    // 画像ファイルのプレビューと検証
    function createPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 検証
                const isValid = img.width === img.height && img.width <= 256;
                file.isValid = isValid;
                file.width = img.width;
                file.height = img.height;

                // プレビュー要素を作成
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.dataset.id = file.uniqueId;
                if (!isValid) {
                    previewItem.classList.add('invalid');
                }

                const errorMsg = !isValid ? `<div class="error-msg">不正なサイズです</div>` : '';
                
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <div class="file-info">${img.width} x ${img.height}</div>
                    ${errorMsg}
                    <button class="remove-btn" title="削除">×</button>
                `;
                
                previewContainer.appendChild(previewItem);
                
                // 削除ボタンにイベントリスナーを追加
                previewItem.querySelector('.remove-btn').addEventListener('click', () => {
                    removeFile(file.uniqueId);
                });

                // 検証が終わったらUI状態を更新
                updateUIState();
            };
            img.src = e.target.result;
        };
        // PNG以外はエラーとして扱う
        if (file.type === 'image/png') {
            reader.readAsDataURL(file);
        } else {
            file.isValid = false;
            // エラー表示用のプレビュー
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item invalid';
            previewItem.dataset.id = file.uniqueId;
            previewItem.innerHTML = `
                <div class="file-info">${file.name}</div>
                <div class="error-msg">PNGファイルではありません</div>
                <button class="remove-btn" title="削除">×</button>
            `;
            previewContainer.appendChild(previewItem);
            previewItem.querySelector('.remove-btn').addEventListener('click', () => {
                removeFile(file.uniqueId);
            });
            updateUIState();
        }
    }

    // ファイルをリストとプレビューから削除
    function removeFile(id) {
        imageFiles = imageFiles.filter(f => f.uniqueId != id);
        const previewItem = previewContainer.querySelector(`[data-id='${id}']`);
        if (previewItem) {
            previewItem.remove();
        }
        updateUIState();
    }
    
    // UIの状態を更新（ボタンの有効/無効など）
    function updateUIState() {
        const validFilesCount = imageFiles.filter(f => f.isValid).length;
        if (validFilesCount > 0) {
            generateBtn.disabled = false;
            imageInfo.textContent = `${validFilesCount}個の有効な画像をICOに変換します。`;
        } else {
            generateBtn.disabled = true;
            imageInfo.textContent = 'ICOに含める有効な画像ファイルがありません。';
        }
        
        // 全てのファイルが削除されたら初期状態に戻す
        if (imageFiles.length === 0) {
            resetUploader();
        }
    }
    
    // 全てをリセットして初期状態に戻す
    function resetUploader() {
        imageFiles = [];
        previewContainer.innerHTML = '';
        previewContainer.classList.add('hidden');
        uploadPrompt.classList.remove('hidden');
        generateBtn.disabled = true;
        resetBtn.classList.add('hidden');
        imageLoader.value = ''; // ファイル選択をリセット
        imageInfo.textContent = 'ICOに含める画像ファイルを選択してください。';
    }

    // --- ICO生成ロジック ---
    async function generateIcoFile() {
        const validFiles = imageFiles.filter(f => f.isValid);
        if (validFiles.length === 0) return;

        // 各PNGファイルをArrayBufferとして読み込む
        const imageBuffers = await Promise.all(
            validFiles.map(file => file.arrayBuffer())
        );

        // ICOファイルの構造を組み立てる
        const numImages = validFiles.length;
        const headerSize = 6;
        const dirEntrySize = 16;
        const totalDirSize = numImages * dirEntrySize;
        const imagesTotalSize = imageBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
        
        const icoTotalSize = headerSize + totalDirSize + imagesTotalSize;
        const icoBuffer = new ArrayBuffer(icoTotalSize);
        const dataView = new DataView(icoBuffer);

        // 1. ヘッダーを書き込む (6 bytes)
        dataView.setUint16(0, 0, true); // Reserved, must be 0
        dataView.setUint16(2, 1, true); // Type, 1 for ICO
        dataView.setUint16(4, numImages, true); // Number of images

        let currentOffset = headerSize + totalDirSize;

        // 2. イメージディレクトリを書き込む (16 bytes per image)
        for (let i = 0; i < numImages; i++) {
            const file = validFiles[i];
            const buffer = imageBuffers[i];
            const entryOffset = headerSize + i * dirEntrySize;
            
            // Width & Height (0 means 256)
            dataView.setUint8(entryOffset, file.width === 256 ? 0 : file.width);
            dataView.setUint8(entryOffset + 1, file.height === 256 ? 0 : file.height);
            dataView.setUint8(entryOffset + 2, 0); // Color Palette, 0 for PNG
            dataView.setUint8(entryOffset + 3, 0); // Reserved
            dataView.setUint16(entryOffset + 4, 1, true); // Color Planes
            dataView.setUint16(entryOffset + 6, 32, true); // Bits Per Pixel
            dataView.setUint32(entryOffset + 8, buffer.byteLength, true); // Image data size
            dataView.setUint32(entryOffset + 12, currentOffset, true); // Image data offset

            currentOffset += buffer.byteLength;
        }

        // 3. PNGイメージデータを書き込む
        currentOffset = headerSize + totalDirSize;
        for (let i = 0; i < imageBuffers.length; i++) {
            const imageUint8Array = new Uint8Array(imageBuffers[i]);
            const icoUint8Array = new Uint8Array(icoBuffer, currentOffset, imageUint8Array.length);
            icoUint8Array.set(imageUint8Array);
            currentOffset += imageUint8Array.length;
        }

        // 4. ファイルをダウンロードさせる
        const blob = new Blob([icoBuffer], { type: 'image/x-icon' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'favicon.ico';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
});
