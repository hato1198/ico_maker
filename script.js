// ES Modules 形式で to-ico ライブラリをCDNから直接インポート
import toIco from 'https://cdn.jsdelivr.net/npm/to-ico@2.0.0/dist/index.mjs';

document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInputButton = document.getElementById('file-input-button');
    const previewArea = document.getElementById('preview-area');
    const previewGrid = document.getElementById('preview-grid');
    const generateButton = document.getElementById('generate-button');
    const generateButtonText = document.getElementById('generate-button-text');
    const spinner = document.getElementById('spinner');
    const resultArea = document.getElementById('result-area');
    const downloadLink = document.getElementById('download-link');

    // 選択されたファイルを管理する配列
    let selectedFiles = [];

    // --- イベントリスナーの設定 ---

    // ファイル選択ボタンのクリック
    fileInputButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // ドラッグ＆ドロップ関連
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // プレビュー画像の削除（イベント委任）
    previewGrid.addEventListener('click', handleRemoveImage);

    // ICO生成ボタンのクリック
    generateButton.addEventListener('click', handleGenerateIco);


    // --- 関数定義 ---

    /**
     * ファイルが選択されたときの処理（input or drop）
     * @param {Event} e 
     */
    function handleFileSelect(e) {
        const files = e.target.files || e.dataTransfer.files;
        addFiles(files);
    }

    /**
     * ドラッグオーバー時の処理
     * @param {DragEvent} e 
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    }

    /**
     * ドラッグが離れたときの処理
     * @param {DragEvent} e 
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    }
    
    /**
     * ドロップ時の処理
     * @param {DragEvent} e 
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        addFiles(files);
    }

    /**
     * ファイルリストを処理してプレビューを追加
     * @param {FileList} files 
     */
    function addFiles(files) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            alert('画像ファイルを選択してください。');
            return;
        }

        imageFiles.forEach(file => {
            // 重複チェック
            if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push(file);
                createPreview(file);
            }
        });
        updateUI();
    }

    /**
     * 画像のプレビューを生成してDOMに追加
     * @param {File} file 
     */
    function createPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const card = document.createElement('div');
            card.className = 'preview-card';
            card.dataset.fileName = file.name;
            card.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}" class="preview-card__image">
                <div class="preview-card__info">${file.name}</div>
                <button type="button" class="preview-card__remove" title="削除">×</button>
            `;
            previewGrid.appendChild(card);
        };
        reader.readAsDataURL(file);
    }
    
    /**
     * 画像削除ボタンの処理
     * @param {MouseEvent} e 
     */
    function handleRemoveImage(e) {
        if (e.target.classList.contains('preview-card__remove')) {
            const card = e.target.closest('.preview-card');
            const fileName = card.dataset.fileName;
            
            // 配列からファイルを削除
            selectedFiles = selectedFiles.filter(file => file.name !== fileName);
            
            // DOMからプレビューを削除
            card.remove();
            
            updateUI();
        }
    }

    /**
     * ICO生成処理
     */
    async function handleGenerateIco() {
        if (selectedFiles.length === 0) return;
        
        setLoading(true);
        resultArea.hidden = true;

        try {
            // 全てのファイルをArrayBufferに変換する
            const imageBuffers = await Promise.all(
                selectedFiles.map(file => file.arrayBuffer())
            );
            
            // to-icoライブラリでICOファイルを生成
            // importした toIco 関数を直接使用
            const icoBuffer = await toIco(imageBuffers);

            // ダウンロードリンクを生成
            const blob = new Blob([icoBuffer], { type: 'image/x-icon' });
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            
            resultArea.hidden = false;

        } catch (error) {
            console.error('ICO生成エラー:', error);
            alert('ICOファイルの生成に失敗しました。コンソールで詳細を確認してください。');
        } finally {
            setLoading(false);
        }
    }

    /**
     * UIの状態を更新する
     */
    function updateUI() {
        const hasFiles = selectedFiles.length > 0;
        previewArea.hidden = !hasFiles;
        generateButton.disabled = !hasFiles;
        
        // ファイルがなくなったら結果表示も隠す
        if (!hasFiles) {
            resultArea.hidden = true;
        }
    }

    /**
     * ローディング状態を設定
     * @param {boolean} isLoading 
     */
    function setLoading(isLoading) {
        generateButton.disabled = isLoading;
        spinner.hidden = !isLoading;
        generateButtonText.textContent = isLoading ? '生成中...' : 'ICOを生成';
    }
});