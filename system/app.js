/**
 * Random Sound Player Logic
 * Class-based Refactoring
 */

class RandomSoundPlayer {
    constructor() {
        // --- データ定義 ---
        this.defaultData = {
            files: ["breach.mp3", "kayo.mp3", "phoenix.mp3", "skye.mp3", "yoru.mp3"],
            groups: [
                { name: "全て", files: ["breach.mp3", "kayo.mp3", "phoenix.mp3", "skye.mp3", "yoru.mp3"] },
                { name: "イニシエーター", files: ["breach.mp3", "kayo.mp3", "skye.mp3"] },
                { name: "デュエリスト", files: ["phoenix.mp3", "yoru.mp3"] },
                { name: "breach", files: ["breach.mp3"] },
                { name: "kayo", files: ["kayo.mp3"] },
                { name: "phoenix", files: ["phoenix.mp3"] },
                { name: "skye", files: ["skye.mp3"] },
                { name: "yoru", files: ["yoru.mp3"] }
            ]
        };
        this.appData = { files: [], groups: [] };
        
        // --- 状態管理 ---
        this.isRunning = false;
        this.timerId = null;
        this.currentProbability = 0;
        this.lastPlayedFile = null;

        // --- DOM要素のキャッシュ ---
        this.dom = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            statusDisplay: document.getElementById('statusDisplay'),
            mainGroupSelect: document.getElementById('mainGroupSelect'),
            reduceRepeatCheck: document.getElementById('reduceRepeat'),
            volumeRange: document.getElementById('volumeRange'),
            volDisplay: document.getElementById('volDisplay'),
            intervalRange: document.getElementById('intervalRange'),
            intervalDisplay: document.getElementById('intervalDisplay'),
            
            // 確率設定
            initProb: document.getElementById('initProb'),
            stepProb: document.getElementById('stepProb'),
            multiProb: document.getElementById('multiProb'),
            probModeRadios: document.getElementsByName('probMode'),
            linearSetting: document.getElementById('linearSetting'),
            exponentialSetting: document.getElementById('exponentialSetting'),

            // ファイル・グループ管理
            fileListContainer: document.getElementById('fileListContainer'),
            newFileName: document.getElementById('newFileName'),
            addFileBtn: document.getElementById('addFileBtn'),
            browseBtn: document.getElementById('browseBtn'),
            filePicker: document.getElementById('filePicker'),
            
            editGroupSelect: document.getElementById('editGroupSelect'),
            newGroupName: document.getElementById('newGroupName'),
            createGroupBtn: document.getElementById('createGroupBtn'),
            deleteGroupBtn: document.getElementById('deleteGroupBtn'),
            groupEditorArea: document.getElementById('groupEditorArea'),
            groupFileCheckboxes: document.getElementById('groupFileCheckboxes'),
            saveGroupConfigBtn: document.getElementById('saveGroupConfigBtn'),

            // IO
            exportBtn: document.getElementById('exportBtn'),
            importFile: document.getElementById('importFile'),
        };
    }

    /**
     * アプリケーションの初期化
     */
    init() {
        this.loadData();
        this.bindEvents();
        this.updateDisplays(); // 音量や間隔の初期値表示
        this.renderAll();
    }

    /**
     * イベントリスナーの一括設定
     */
    bindEvents() {
        // 再生制御
        this.dom.startBtn.addEventListener('click', () => this.start());
        this.dom.stopBtn.addEventListener('click', () => this.stop());

        // スライダー表示更新
        this.dom.volumeRange.addEventListener('input', (e) => {
            this.dom.volDisplay.textContent = (e.target.value * 100).toFixed(0) + "%";
        });
        this.dom.intervalRange.addEventListener('input', (e) => {
            this.dom.intervalDisplay.textContent = e.target.value + "秒";
        });

        // 確率モード切替
        this.dom.probModeRadios.forEach(r => {
            r.addEventListener('change', () => this.toggleProbMode(r.value));
        });

        // ファイル管理
        this.dom.addFileBtn.addEventListener('click', () => this.registerFile(this.dom.newFileName.value));
        this.dom.browseBtn.addEventListener('click', () => this.dom.filePicker.click());
        this.dom.filePicker.addEventListener('change', (e) => {
            if (e.target.files[0]) this.registerFile(e.target.files[0].name);
        });

        // グループ管理
        this.dom.createGroupBtn.addEventListener('click', () => this.createGroup());
        this.dom.deleteGroupBtn.addEventListener('click', () => this.deleteGroup());
        this.dom.editGroupSelect.addEventListener('change', () => this.renderGroupEditor());
        this.dom.saveGroupConfigBtn.addEventListener('click', () => this.saveGroupConfig());

        // IO
        this.dom.exportBtn.addEventListener('click', () => this.exportData());
        this.dom.importFile.addEventListener('change', (e) => this.importData(e));
    }

    /* ============================================================
     * 💾 データ管理 (Storage / Logic)
     * ============================================================ */

    loadData() {
        const saved = localStorage.getItem('soundPlayerConfig');
        this.appData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(this.defaultData));
    }

    saveData() {
        localStorage.setItem('soundPlayerConfig', JSON.stringify(this.appData));
        this.renderAll();
    }

    /* ============================================================
     * 🖥️ UI描画・更新
     * ============================================================ */
    
    renderAll() {
        this.renderFileList();
        this.renderGroupSelects();
        this.renderGroupEditor();
    }

    updateDisplays() {
        this.dom.volDisplay.textContent = (this.dom.volumeRange.value * 100).toFixed(0) + "%";
        this.dom.intervalDisplay.textContent = this.dom.intervalRange.value + "秒";
    }

    toggleProbMode(mode) {
        if (mode === 'linear') {
            this.dom.linearSetting.classList.remove('hidden');
            this.dom.exponentialSetting.classList.add('hidden');
        } else {
            this.dom.linearSetting.classList.add('hidden');
            this.dom.exponentialSetting.classList.remove('hidden');
        }
    }

    updateStatus(msg) {
        this.dom.statusDisplay.textContent = msg;
    }

    // --- ファイルリスト ---
    renderFileList() {
        this.dom.fileListContainer.innerHTML = '';
        this.appData.files.forEach((file, index) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `<span>${file}</span>`;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-sm btn-danger';
            delBtn.textContent = '削除';
            delBtn.onclick = () => this.removeFile(index);
            
            div.appendChild(delBtn);
            this.dom.fileListContainer.appendChild(div);
        });
    }

    // --- グループ選択肢 ---
    renderGroupSelects() {
        const currentMain = this.dom.mainGroupSelect.value;
        const currentEdit = this.dom.editGroupSelect.value;

        this.dom.mainGroupSelect.innerHTML = '';
        this.dom.editGroupSelect.innerHTML = '<option value="">-- グループを選択 --</option>';

        this.appData.groups.forEach((group, index) => {
            // Main Select
            const op1 = document.createElement('option');
            op1.value = index;
            op1.textContent = `${group.name} (${group.files.length}個)`;
            this.dom.mainGroupSelect.appendChild(op1);

            // Edit Select
            const op2 = document.createElement('option');
            op2.value = index;
            op2.textContent = group.name;
            this.dom.editGroupSelect.appendChild(op2);
        });

        // 選択状態の維持
        if (currentMain && this.appData.groups[currentMain]) this.dom.mainGroupSelect.value = currentMain;
        if (currentEdit && this.appData.groups[currentEdit]) this.dom.editGroupSelect.value = currentEdit;
    }

    // --- グループ編集エリア ---
    renderGroupEditor() {
        const idx = this.dom.editGroupSelect.value;
        if (idx === "") {
            this.dom.groupEditorArea.classList.add('hidden');
            return;
        }
        this.dom.groupEditorArea.classList.remove('hidden');
        
        const targetGroup = this.appData.groups[idx];
        this.dom.groupFileCheckboxes.innerHTML = '';

        this.appData.files.forEach(fileName => {
            const label = document.createElement('label');
            label.className = 'file-checkbox';
            const isChecked = targetGroup.files.includes(fileName);
            if (isChecked) label.classList.add('checked');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = fileName;
            checkbox.checked = isChecked;
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) label.classList.add('checked');
                else label.classList.remove('checked');
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${fileName}`));
            this.dom.groupFileCheckboxes.appendChild(label);
        });
    }

    /* ============================================================
     * 🔧 ロジック操作（ファイル/グループ）
     * ============================================================ */

    registerFile(rawName) {
        let name = rawName.trim();
        if (!name) return;
        if (!name.toLowerCase().endsWith('.mp3')) name += '.mp3';

        if (!this.appData.files.includes(name)) {
            this.appData.files.push(name);
            this.saveData();
            this.dom.newFileName.value = '';
            this.dom.filePicker.value = ''; 
            alert(`「${name}」を追加しました。\n必ず sound フォルダにファイルを配置してください。`);
        } else {
            alert("既に登録されています。");
        }
    }

    removeFile(index) {
        if (!confirm(`ファイル「${this.appData.files[index]}」を削除しますか？`)) return;
        
        const fileName = this.appData.files[index];
        // グループからも削除
        this.appData.groups.forEach(g => {
            g.files = g.files.filter(f => f !== fileName);
        });
        this.appData.files.splice(index, 1);
        this.saveData();
    }

    createGroup() {
        const name = this.dom.newGroupName.value.trim();
        if (name) {
            this.appData.groups.push({ name: name, files: [] });
            this.dom.newGroupName.value = '';
            this.saveData();
            // 新規作成したグループを選択状態にして編集エリアを開く
            this.dom.editGroupSelect.value = this.appData.groups.length - 1;
            this.renderGroupEditor();
        }
    }

    deleteGroup() {
        const idx = this.dom.editGroupSelect.value;
        if (idx === "") return;
        if (confirm("このグループ設定を削除しますか？")) {
            this.appData.groups.splice(idx, 1);
            this.saveData();
            this.dom.groupEditorArea.classList.add('hidden');
        }
    }

    saveGroupConfig() {
        const idx = this.dom.editGroupSelect.value;
        if (idx === "") return;

        const checkboxes = this.dom.groupFileCheckboxes.querySelectorAll('input[type="checkbox"]');
        const selectedFiles = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

        this.appData.groups[idx].files = selectedFiles;
        this.saveData();
        alert("グループ内容を更新しました。");
    }

    /* ============================================================
     * ▶️ 再生プレイヤー制御
     * ============================================================ */

    start() {
        if (this.isRunning) return;

        const groupIdx = this.dom.mainGroupSelect.value;
        const targetFiles = this.appData.groups[groupIdx]?.files;

        if (!targetFiles || targetFiles.length === 0) {
            alert("選択されたグループにはファイルが登録されていません。");
            return;
        }

        this.isRunning = true;
        this.toggleButtons(true);
        this.currentProbability = parseFloat(this.dom.initProb.value);
        this.lastPlayedFile = null;
        
        this.updateStatus("開始: 判定待ち...");
        const wait = parseFloat(this.dom.intervalRange.value) * 1000;
        this.timerId = setTimeout(() => this.processLoop(), wait);
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearTimeout(this.timerId);
        this.toggleButtons(false);
        this.updateStatus("停止しました");
    }

    toggleButtons(running) {
        this.dom.startBtn.disabled = running;
        this.dom.stopBtn.disabled = !running;
    }

    processLoop() {
        if (!this.isRunning) return;

        const dice = Math.random() * 100;
        // 確率ヒット
        if (dice < this.currentProbability) {
            this.updateStatus("♪ 再生中...");
            this.playSound(() => {
                // 再生完了後の処理
                if (!this.isRunning) return;
                this.currentProbability = parseFloat(this.dom.initProb.value);
                // 再開まで少し待機
                this.timerId = setTimeout(() => {
                    this.updateStatus("判定再開");
                    this.processLoop();
                }, 500);
            });
        } else {
            // 外れ：確率増加
            this.increaseProbability();
            this.updateStatus(`... (次: ${this.currentProbability.toFixed(1)}%)`);
            
            const base = parseFloat(this.dom.intervalRange.value) * 1000;
            const jitter = Math.random() * 500; // 揺らぎ
            this.timerId = setTimeout(() => this.processLoop(), base + jitter);
        }
    }

    increaseProbability() {
        const mode = document.querySelector('input[name="probMode"]:checked').value;
        if (mode === 'linear') {
            this.currentProbability += parseFloat(this.dom.stepProb.value);
        } else {
            this.currentProbability *= parseFloat(this.dom.multiProb.value);
        }
        if (this.currentProbability > 100) this.currentProbability = 100;
    }

    playSound(onEndedCallback) {
        const groupIdx = this.dom.mainGroupSelect.value;
        const fileList = this.appData.groups[groupIdx].files;

        if (!fileList || fileList.length === 0) {
            if (onEndedCallback) onEndedCallback();
            return;
        }

        let selectedFile;
        const useReduce = this.dom.reduceRepeatCheck.checked;

        // 前回と同じファイルの確率を下げるロジック
        if (useReduce && this.lastPlayedFile && fileList.includes(this.lastPlayedFile) && fileList.length > 1) {
            const weights = fileList.map(f => (f === this.lastPlayedFile) ? 0.5 : 1.0);
            const totalW = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * totalW;
            
            for (let i = 0; i < fileList.length; i++) {
                if (r < weights[i]) {
                    selectedFile = fileList[i];
                    break;
                }
                r -= weights[i];
            }
        } else {
            selectedFile = fileList[Math.floor(Math.random() * fileList.length)];
        }

        if (!selectedFile) selectedFile = fileList[0];
        this.lastPlayedFile = selectedFile;

        const audio = new Audio(`./sound/${selectedFile}`);
        audio.volume = parseFloat(this.dom.volumeRange.value);

        audio.addEventListener('ended', () => {
            if (onEndedCallback) onEndedCallback();
        });

        audio.addEventListener('error', (e) => {
            console.error("再生エラー:", e);
            this.updateStatus(`エラー: ${selectedFile} 不在`);
            setTimeout(() => { if (onEndedCallback) onEndedCallback(); }, 1000);
        });

        audio.play().catch(e => {
            console.error("再生開始失敗:", e);
            if (onEndedCallback) onEndedCallback();
        });
    }

    /* ============================================================
     * 📤 IO (Import/Export)
     * ============================================================ */

    exportData() {
        const blob = new Blob([JSON.stringify(this.appData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sound_player_config.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const loaded = JSON.parse(evt.target.result);
                if (loaded.files && loaded.groups) {
                    this.appData = loaded;
                    this.saveData();
                    alert("設定ファイルを読み込みました。");
                } else {
                    alert("無効な設定ファイル形式です。");
                }
            } catch (err) {
                alert("読み込みエラー: " + err);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    const app = new RandomSoundPlayer();
    app.init();
});