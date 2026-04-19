// --- 1. 変数宣言とBGM制御 ---
let bgmIndex = 0;
let bgmNextTime = 0;
let isMuted = false;
let bgmTimer = null;
let audioCtx = null;
let wordsData = []; // ここに words.json をロードする想定
let currentCardIdx = 0;
let cardFlipped = false;

// --- モード開始処理 ---
function startAdventureMode() {
    // 1. 画面の切り替え
    document.getElementById('guide-overlay').style.display = 'none';
    
    // words.js で定義した変数を代入
    wordsData = EXAM_WORDS_DATA;
    console.log("words.js からデータを読み込みました:", wordsData);

    // 2. AudioContextの初期化と再開 (重要！)
    handleAudioResume();

    // 3. ゲームの初期化
    if (!gameState.initialized) {
        init();
    } else {
        draw();
    }
}

// --- 暗記モード開始処理 (asyncを外して同期処理に) ---
function startStudyMode() {
// 1. 他の画面（タイトル）を隠して、暗記画面を出す
    document.getElementById('guide-overlay').style.display = 'none';
    document.getElementById('study-screen').style.display = 'flex';

    // 2. 【ここを追加！】冒険用のログとボタンを隠す
    document.getElementById('log').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    
    // words.js で定義した変数を代入
    wordsData = EXAM_WORDS_DATA;
    console.log("words.js からデータを読み込みました:", wordsData);
    
    currentCardIdx = 0;
    showCard();
}

// --- オーディオ再開用の共通関数 ---
function handleAudioResume() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("Playback resumed successfully");
            // ミュートでなければBGM開始
            if (!bgmTimer && !isMuted) {
                playBGM();
            }
        });
    } else {
        // すでに動いている場合でBGMが止まっていたら再開
        if (!bgmTimer && !isMuted) {
            playBGM();
        }
    }
}

function backToMenu() {
    document.getElementById('study-screen').style.display = 'none';
    document.getElementById('guide-overlay').style.display = 'flex';
}

// --- 暗記カードロジック ---
function handleStudyClick() {
    if (!cardFlipped) {
        // 答えを表示
        document.getElementById('card-a').classList.remove('hidden');
        cardFlipped = true;
    } else {
        // 次のカードへ
        currentCardIdx = (currentCardIdx + 1) % wordsData.length;
        showCard();
    }
}

// ① 暗記モードの「Q.」「A.」明示
function showCard() {
    if (!wordsData || wordsData.length === 0) return;

    cardFlipped = false;
    const card = wordsData[currentCardIdx];

    if (card) {
        // ★ ここを確認！JSONのキー名 「text」 と 「hint」 に合わせます
        // もし card.text が undefined なら、以前の card.q などが残っているかもしれません
        const questionText = card.text || "データなし";
        const answerText = card.hint || "ヒントなし";

        document.getElementById('card-q').innerHTML = `<small style="color:#888;">Q.</small><br>${questionText}`;
        document.getElementById('card-a').innerHTML = `<small style="color:#888;">A.</small><br>${answerText}`;
        
        document.getElementById('card-a').classList.add('hidden');
        document.getElementById('study-progress').textContent = `${currentCardIdx + 1} / ${wordsData.length}`;
    }
}

// エンターキーでも操作可能に
window.addEventListener('keydown', (e) => {
    if (document.getElementById('study-screen').style.display === 'flex') {
        if (e.key === 'Enter') handleStudyClick();
    }
});

function playBGM() {
    if (isMuted || !audioCtx) return;

    // 1. トラックの取得と安全確認
    const isBossFloor = (gameState && gameState.depth === CONFIG.MAX_DEPTH);
    const track = isBossFloor ? SOUND_DATA.BGM_BOSS : SOUND_DATA.BGM_TRACK;
    
    if (!track || track.length === 0) return;

    // 2. 現在のノートを取得
    const note = track[bgmIndex % track.length];
    if (!note || !note.freq) {
        bgmIndex++; // 次へ進めて脱出
        bgmTimer = setTimeout(playBGM, 100);
        return;
    }

    const isBossAlive = gameState.monsters && gameState.monsters.some(m => m.isBoss);
    const currentDur = isBossAlive ? note.dur / 2 : note.dur;
    const now = audioCtx.currentTime;
    if (bgmNextTime < now) bgmNextTime = now;

    // --- 3. メロディと和音の生成 ---
    // oscillator を2つ作り、それぞれを単独の Gain に繋いで出力します
    
    // 【主旋律】
    const osc1 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    osc1.type = isBossAlive ? 'sawtooth' : 'triangle';
    osc1.frequency.setValueAtTime(note.freq, bgmNextTime);
    g1.gain.setValueAtTime(0.02, bgmNextTime);
    g1.gain.exponentialRampToValueAtTime(0.001, bgmNextTime + currentDur);
    osc1.connect(g1).connect(audioCtx.destination);

    // 【伴奏：完全5度上の音】
    // 周波数を「1.5倍」にすると、音楽的に最も安定した「ドとソ」の関係（和音）になります
    // さらに1オクターブ下（0.75倍）にすることで厚みを出します
    const osc2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    osc2.type = 'sine'; 
    osc2.frequency.setValueAtTime(note.freq * 0.75, bgmNextTime); 
    g2.gain.setValueAtTime(0.015, bgmNextTime);
    g2.gain.exponentialRampToValueAtTime(0.001, bgmNextTime + currentDur);
    osc2.connect(g2).connect(audioCtx.destination);

    // 4. 同時再生
    osc1.start(bgmNextTime);
    osc1.stop(bgmNextTime + currentDur);
    osc2.start(bgmNextTime);
    osc2.stop(bgmNextTime + currentDur);

    // 5. 次の準備
    bgmNextTime += currentDur;
    bgmIndex = (bgmIndex + 1) % track.length;

    // 6. ループ
    bgmTimer = setTimeout(playBGM, currentDur * 1000);
}

function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('mute-btn');
    btn.textContent = isMuted ? "🔇" : "🔊";
    if (isMuted) { clearTimeout(bgmTimer); } 
    else { bgmNextTime = audioCtx ? audioCtx.currentTime : 0; playBGM(); }
}

// --- 2. ゲームの状態管理 ---
let curLang = 'en';

// ★gameState の中身は「名前: 値,」の形だけで書きます
let gameState = { 
    depth: 1, 
    player: {}, 
    map: [], 
    explored: [], 
    monsters: [], 
    log: [], 
    gameOver: false, 
    initialized: false,
    totalKills: 0,
    warpCount: 0,
    bossDefeated: false 
}; // ここでしっかりセミコロンで閉じる

// --- 3. システム関数 (言語・音効) ---
function setLang(lang) {
    curLang = lang;
    const T = i18n[curLang];
    
    // 言語ボタンのスタイル更新
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${lang}`);
    if(activeBtn) activeBtn.classList.add('active');

    // ★ ここから下：要素が存在する場合のみ実行するように修正
    const waitBtn = document.getElementById('wait');
    if (waitBtn) {
        waitBtn.textContent = T.wait;
        waitBtn.style.fontSize = T.wait.length > 5 ? "10px" : "14px";
    }

    const warpBtn = document.getElementById('warp-btn');
    if (warpBtn) {
        warpBtn.innerHTML = `${T.warpBtn}<br>(HP-20%)`; // コスト表示を合わせる
    }

    const shockBtn = document.getElementById('shock-btn');
    if (shockBtn) {
        shockBtn.innerHTML = `${T.shockBtn}<br>(HP-20%)`; // コスト表示を合わせる
    }

    // ヘルプボタンのリンク先を openHelp に固定する
    const helpBtn = document.querySelector('.help-circle');
    if (helpBtn) helpBtn.onclick = openHelp;

    const gTitle = document.getElementById('g-title');
    if (gTitle) gTitle.textContent = T.gTitle;

    const gBody = document.getElementById('g-body');
    if (gBody) gBody.innerHTML = T.gBody;

    if (gameState.initialized) draw();
}

function playEffect(data) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const sounds = Array.isArray(data) ? data : [data];
    sounds.forEach(s => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = s.type;
        osc.frequency.setValueAtTime(s.freq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(s.freq * 0.8, audioCtx.currentTime + s.dur);
        gain.gain.setValueAtTime(s.gain || 0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + s.dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + s.dur);
    });
}

// --- 4. 初期化とレベル生成 ---
function init() {
    gameState.player = { x: 0, y: 0, hp: 30, maxHp: 30, atk: 6, exp: 0, lv: 1, nextExp: 15, vision: 4 };
    gameState.depth = 1; 
    gameState.log = []; 
    gameState.gameOver = false;
    // --- ここを追加 ---
    gameState.totalKills = 0;
    gameState.warpCount = 0;
    // ------------------
    addLog('start', 'log-system');
    setupLevel();
    gameState.initialized = true;
}

function findEmptyFloor() {
    let x, y;
    let attempts = 0;
    do {
        x = Math.floor(Math.random() * CONFIG.MAP_W);
        y = Math.floor(Math.random() * CONFIG.MAP_H);
        attempts++;
        // 万が一のための無限ループ防止（1000回探してなければ現在の位置を返す）
        if (attempts > 1000) return { x: gameState.player.x, y: gameState.player.y };
    } while (gameState.map[y][x] !== CONFIG.TILES.FLOOR);
    return { x, y };
}

function setupLevel() {
    const T = CONFIG.TILES;
    const W = CONFIG.MAP_W;
    const H = CONFIG.MAP_H;

    // 1. 最初は全て「壁」で埋める
    gameState.map = Array.from({length: H}, () => Array(W).fill(T.WALL));
    gameState.explored = Array.from({length: H}, () => Array(W).fill(false));
    gameState.monsters = [];

    // 2. 穴掘り開始地点（プレイヤー初期位置）
    let px = Math.floor(W / 2);
    let py = Math.floor(H / 2);
    gameState.player.x = px;
    gameState.player.y = py;

    // 3. ランダムウォークによる通路生成
    // マップ全体の35%〜40%程度が床になるまで掘り進める
    let floorCount = 0;
    const targetFloor = Math.floor(W * H * 0.38); 

    while (floorCount < targetFloor) {
        if (gameState.map[py][px] === T.WALL) {
            gameState.map[py][px] = T.FLOOR;
            floorCount++;
        }
        
        // 上下左右ランダムに移動
        const dir = [[0, 1], [0, -1], [1, 0], [-1, 0]][Math.floor(Math.random() * 4)];
        const nx = px + dir[0];
        const ny = py + dir[1];

        // 端から1マス以内には掘らない（外壁を維持）
        if (nx > 0 && nx < W - 1 && ny > 0 && ny < H - 1) {
            px = nx;
            py = ny;
        }
    }

    // 4. 以降の配置（階段、ボス、モンスター、アイテム）は既存と同じ
    // 全て T.FLOOR の上に配置されるため、必ず到達可能になる
    const exitPos = findEmptyFloor();
    if (gameState.depth < CONFIG.MAX_DEPTH) {
        gameState.map[exitPos.y][exitPos.x] = T.STAIRS;
    } else {
        const boss = { isBoss: true, tile: T.BOSS, hp: 80, atk: 15, color: CONFIG.APPEARANCE.BOSS.color, x: exitPos.x, y: exitPos.y };
        gameState.monsters.push(boss);
        gameState.map[exitPos.y][exitPos.x] = T.BOSS;
        addLog('bossNear', 'log-boss');
    }

    for (let i = 0; i < 3 + gameState.depth; i++) {
        const mPos = findEmptyFloor();
        const typeIdx = Math.min(gameState.depth - 1, 2);
        
        let wordData = { text: "TCP/IP", hint: "Network Protocol" }; // デフォルト値
        if (wordsData!== 'undefined' && wordsData.length > 0) {
            wordData = wordsData[Math.floor(Math.random() * wordsData.length)];
        }  
        gameState.monsters.push({ 
            typeIndex: typeIdx, 
            tile: ['r','A','e'][typeIdx], 
            hp: 10 * gameState.depth, 
            atk: 3 * gameState.depth, 
            color: CONFIG.APPEARANCE.MONSTER.color, 
            x: mPos.x, 
            y: mPos.y,
            // ここに追加
            studyText: wordData.text,
            studyHint: wordData.hint 
        });
        gameState.map[mPos.y][mPos.x] = CONFIG.TILES.MONSTER_GENERIC;
    }
    const itemPos = findEmptyFloor();
    gameState.map[itemPos.y][itemPos.x] = T.POTION;
    updateVision();
    draw();
}

// --- 5. 描画ロジック ---
function getTileDisplay(x, y, isVisible) {
    const p = gameState.player;
    const APP = CONFIG.APPEARANCE;
    const TILE = CONFIG.TILES;
    if (x === p.x && y === p.y) return { c: TILE.PLAYER, color: APP.PLAYER.color };
    if (!isVisible) {
        if (gameState.explored[y][x]) {
            const t = gameState.map[y][x];
            const isEntity = (t === TILE.MONSTER_GENERIC || t === TILE.BOSS || t === TILE.POTION);
            return { c: isEntity ? TILE.FLOOR : t, color: APP.EXPLORED_SHADOW.color };
        }
        return { c: ' ', color: APP.UNEXPLORED.color };
    }
    const tile = gameState.map[y][x];
    if (tile === TILE.MONSTER_GENERIC || tile === TILE.BOSS) {
        const m = gameState.monsters.find(m => m.x === x && m.y === y);
        return { c: m ? m.tile : tile, color: m ? m.color : (tile === TILE.BOSS ? APP.BOSS.color : APP.MONSTER.color) };
    }
    const tileColors = { [TILE.WALL]: APP.WALL.color, [TILE.POTION]: APP.POTION.color, [TILE.STAIRS]: APP.STAIRS.color, [TILE.FLOOR]: APP.FLOOR.color };
    return { c: tile, color: tileColors[tile] || APP.FLOOR.color };
}

function draw() {
    const screen = document.getElementById('screen');
    if (!screen) return;

    const T = i18n[curLang];
    const p = gameState.player;
    
    // HUD（ステータス）部分
    let hud = `Lv:${p.lv}  ${T.hp}:${p.hp}/${p.maxHp}  ${T.atk}:${p.atk}  ${T.floor}:${gameState.depth}\n\n`;
    
    let view = "";
    for (let y = 0; y < CONFIG.MAP_H; y++) {
        for (let x = 0; x < CONFIG.MAP_W; x++) {
            // 視界の計算
            const isVisible = Math.sqrt((x - p.x)**2 + (y - p.y)**2) <= p.vision;
            
            // 既存の関数からタイル情報を取得
            const info = getTileDisplay(x, y, isVisible);
            
            // ★ここを修正：id="cell-x-y" を追加して識別可能にする
            view += `<span id="cell-${x}-${y}" style="color:${info.color};">${info.c}</span>`;
        }
        view += "\n";
    }
    
    hud.innerHTML = hud + view;
    updateLogUI(T);
}

// --- 6. アクションとターン処理 ---
function handleInput(dx, dy) {
    if (gameState.gameOver || isGuideOpen()) return;
    const nx = gameState.player.x + dx, ny = gameState.player.y + dy;
    const tile = gameState.map[ny][nx];
    if (tile === CONFIG.TILES.WALL) {
        playEffect(SOUND_DATA.DUDGE_WALL);
        addLog('wall', 'log-system');
    } else if (tile === CONFIG.TILES.MONSTER_GENERIC || tile === CONFIG.TILES.BOSS) {
        combat(nx, ny);
    } else {
        movePlayer(nx, ny, tile);
    }
    if (!gameState.gameOver) {
        monstersTurn();
        checkAchievements(); // HP1の実績などをチェック
        updateVision(); 
        draw();
    }
}

function movePlayer(nx, ny, tile) {
    const T = CONFIG.TILES;
    gameState.player.x = nx; gameState.player.y = ny;
    if (tile === T.POTION) {
        playEffect(SOUND_DATA.HEAL);
        gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + CONFIG.HEAL_VAL);
        addLog('potion', 'log-player');
        gameState.map[ny][nx] = T.FLOOR;
    } else if (tile === T.STAIRS) {
        gameState.depth++;
        checkAchievements(); // 2F到達の実績などがここで発動する
        playEffect(SOUND_DATA.STAIRS);
        addLog('stairs', 'log-system', { d: gameState.depth });
        setupLevel();
    } else {
        playEffect(SOUND_DATA.MOVE);
    }
}

function combat(nx, ny) {
    const mIndex = gameState.monsters.findIndex(m => m.x === nx && m.y === ny);
    if (mIndex === -1) return;
    const m = gameState.monsters[mIndex];
    
    playEffect(SOUND_DATA.PLAYER_ATTACK);
    // ログ表示
    const sText = m.studyText || "Unknown";
    const sHint = m.studyHint || "No Hint";
    
    // 他の箇所で「ノイズ」のようなテキストが入らないよう、addLogを「checkAnswer」タイプで固定
    if (typeof addLog === 'function') {
        addLog('checkAnswer', 'log-system', { 
            studyText: sText, 
            studyHint: sHint 
        });
    }

    if (!gameState.collection) gameState.collection = {};
    if (!gameState.collection[sText]) {
        gameState.collection[sText] = 0;
    }

    gameState.collection[sText]++;
    const dmg = gameState.player.atk + Math.floor(Math.random()*5);
    m.hp -= dmg;
    addLog('attack', 'log-player', { nIsMonster: true, monsterObj: m, dmg: dmg });

    if (m.hp <= 0) {
         // --- コレクションに追加 ---
        const word = m.studyText;
        if (!gameState.collection[word]) {
            gameState.collection[word] = 0;
        }
        gameState.collection[word]++;
        
        // UIを更新
        updateCollectionUI();
        
        if (Object.keys(monsterEncyclopedia).length >= 3) {
            checkAchievements();
        }

        gameState.totalKills++;

        if (m.isBoss) {
            gameState.bossDefeated = true;
            checkAchievements();
            playEffect(SOUND_DATA.DEFEATED);
            addLog('defeat', 'log-system', { nIsMonster: true, monsterObj: m });
            return endGame(true); // ゲーム勝利
        }

        playEffect(SOUND_DATA.DEFEATED);
        // addLog('defeat', 'log-system', { nIsMonster: true, monsterObj: m });
        
        // 敵を除去
        gameState.map[ny][nx] = CONFIG.TILES.FLOOR;
        gameState.monsters = gameState.monsters.filter(mon => mon !== m);
        
        checkLvUp();
        checkAchievements();
    }
}

function monstersTurn() {
    gameState.monsters.forEach(m => {
        const dx = Math.abs(gameState.player.x - m.x), dy = Math.abs(gameState.player.y - m.y);
        if (dx + dy === 1) {
            const dmg = Math.max(1, m.atk - Math.floor(Math.random()*3));
            gameState.player.hp -= dmg;
            playEffect(m.isBoss ? SOUND_DATA.BOSS_ATTACK : SOUND_DATA.ENEMY_ATTACK);
            
            // --- ここをカスタマイズ ---
            // ログに「問題」として単語とヒントを出す
            addLog('enemyAttack', 'log-enemy', { 
                studyText: m.studyText, 
                firstChar: m.studyText.charAt(0), // 最初の1文字を渡す
                dmg: dmg 
            });            
            if (gameState.player.hp <= 0) endGame(false);
        } else {
            moveMonsterRandomly(m);
        }
    });
}

function moveMonsterRandomly(m) {
    const T = CONFIG.TILES;
    const dx = gameState.player.x - m.x, dy = gameState.player.y - m.y;
    let mx = 0, my = 0;
    if (Math.abs(dx) > Math.abs(dy)) { mx = dx > 0 ? 1 : -1; } 
    else { my = dy > 0 ? 1 : -1; }
    const tx = m.x + mx, ty = m.y + my;
    if (gameState.map[ty][tx] === T.FLOOR && !(tx === gameState.player.x && ty === gameState.player.y)) {
        gameState.map[m.y][m.x] = T.FLOOR; m.x = tx; m.y = ty;
        gameState.map[m.y][m.x] = m.isBoss ? T.BOSS : T.MONSTER_GENERIC;
    }
}

function useSkill() {
    // HPが1以上あれば発動可能にする
if (gameState.player.hp > 0 && !gameState.gameOver) {
        // ...コスト計算
        gameState.warpCount++; // ワープ回数を加算
        checkAchievements();   // チェック
        // 現在のHPの20%を計算（端数切り上げ）
        const cost = Math.ceil(gameState.player.hp * 0.2);
        gameState.player.hp -= cost;

        // --- 追加: 自傷ダメージによる死亡チェック ---
        if (gameState.player.hp <= 0) {
            gameState.player.hp = 0; // 表示を0に固定
            draw(); // 最後の状態を描画
            endGame(false); 
            return; // 以降のワープ処理を中断
        }
        // ---------------------------------------

        // 演出：画面をフラッシュさせる
        const screen = document.getElementById('screen');
        screen.style.backgroundColor = '#444'; 
        setTimeout(() => { screen.style.backgroundColor = '#000'; }, 50);
        
        // 効果音とログ
        playEffect(SOUND_DATA.WARP);
        addLog('warp', 'log-system');

        // ランダムな床へ転送
        const pos = findEmptyFloor();
        gameState.player.x = pos.x; 
        gameState.player.y = pos.y;

        // 転送先でもう一度効果音を鳴らす（移動した感を出す）
        playEffect(SOUND_DATA.WARP);

        // スキル使用後は敵のターンになり、視界を更新
        monstersTurn(); 
        updateVision(); 
        draw();
    }
}

function checkLvUp() {
    const p = gameState.player; p.exp += 10;
    if (p.exp >= p.nextExp) {
        playEffect(SOUND_DATA.LEVEL_UP);
        p.lv++; p.maxHp += 10; p.hp = p.maxHp; p.atk += 4; p.exp = 0;
        addLog('lvup', 'log-lvup', { l: p.lv });
    }
}

function updateVision() {
    for (let y = 0; y < CONFIG.MAP_H; y++) 
        for (let x = 0; x < CONFIG.MAP_W; x++)
            if (Math.sqrt((x-gameState.player.x)**2 + (y-gameState.player.y)**2) <= gameState.player.vision)
                gameState.explored[y][x] = true;
}

// --- 7. UI制御とイベント ---
function addLog(key, type, params = {}) { gameState.log.push({ key, type, params }); }
function updateLogUI(translations) {
    const logContainer = document.getElementById('log');
    
    // 1. ログ表示エリアを一旦空にする
    logContainer.innerHTML = "";

    // 2. 最新の4件だけを取り出す
    // gameState.log の後ろから4つを「表示用リスト」としてコピー
    const recentLogs = gameState.log.slice(-4);

    // 3. 1つずつのログを画面用の文字に変換して表示
    recentLogs.forEach(logData => {
        let message = translations[logData.key] || logData.key;
        const info = logData.params;

        // 冒険モードでは敵の名前を出さないのでコメントアウト
        // if (info.nIsMonster) {
        //     const monster = info.monsterObj;
        //     // ボスならボス名、雑魚なら種別名を取得
        //     const monsterName = monster.isBoss ? translations.bName : translations.mNames[monster.typeIndex];
        //     // {n} という文字を実際のモンスター名に置換
        //     message = message.replace("{n}", monsterName);
        // }

        // 5. その他のパラメータ（ダメージ量 {dmg} など）をすべて数字に置き換える
        for (let key in info) {
            message = message.replace(`{${key}}`, info[key]);
        }

        // 6. 画面に新しい行（div）として追加する
        const logLine = document.createElement('div');
        logLine.className = logData.type; // CSSクラス（log-player, log-enemyなど）を設定
        logLine.textContent = message;    // 組み立てた文章を入れる
        
        logContainer.appendChild(logLine);
    });
}

function isGuideOpen() { return document.getElementById('guide-overlay').style.display === 'flex'; }
function closeGuide() { 
    document.getElementById('guide-overlay').style.display = 'none';
    if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    audioCtx.resume().then(() => {
        playEffect(SOUND_DATA.START_GAME);
        if (!bgmTimer && !isMuted) { playBGM(); }
    });
    if(!gameState.initialized) init();
}

function checkAchievements() {
    Object.values(ACHIEVEMENTS).forEach(ach => {
        // まだ解除されておらず、かつ条件を満たしているか
        if (!unlockedAchievements.includes(ach.id) && ach.check()) {
            unlockedAchievements.push(ach.id);
            localStorage.setItem('rogue_achievements', JSON.stringify(unlockedAchievements));
            
            // ログに通知を表示（i18nに achievement 用のキーがない場合は直接表示）
            addLog(`🏆【実績解除】${ach.name}`, 'log-system');
            
            // お祝いの音（START_GAMEの音を流用、または新規作成）
            playEffect({ freq: 880, type: 'triangle', dur: 0.5, gain: 0.05 });
        }
    });
}

function toggleAchievements() {
    const overlay = document.getElementById('ach-overlay');
    const list = document.getElementById('ach-list');
    
    // 表示の切り替え
    if (overlay.style.display === 'none') {
        // リストを生成
        list.innerHTML = "";
        Object.values(ACHIEVEMENTS).forEach(ach => {
            const isUnlocked = unlockedAchievements.includes(ach.id);
            const div = document.createElement('div');
            div.className = `ach-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            div.innerHTML = `
                <span style="font-size:20px">${isUnlocked ? '🏆' : '🔒'}</span>
                <div>
                    <div style="font-weight:bold; font-size:14px">${ach.name}</div>
                    <div style="font-size:11px; color:#aaa">${ach.desc}</div>
                </div>
            `;
            list.appendChild(div);
        });
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

// function useShockwave() {
//     console.log(document.getElementById("cell-" + px + "-" + py))
//     // 1. まず再描画して ID 付きの <span> を生成させる
//     draw(); 

//     // 2. その直後に要素を取得する
//     const px = gameState.player.x;
//     const py = gameState.player.y;

//     for (let dy = -1; dy <= 1; dy++) {
//         for (let dx = -1; dx <= 1; dx++) {
//             const tx = px + dx;
//             const ty = py + dy;

//             // ID名が draw() で作ったものと完全に一致しているか確認
//             const cell = document.getElementById(`cell-${tx}-${ty}`);
            
//             if (cell) {
//                 // 強制的にスタイルを上書きして確認
//                 cell.style.backgroundColor = "yellow"; 
//                 cell.classList.add('glow-effect');
                
//                 setTimeout(() => {
//                     cell.classList.remove('glow-effect');
//                     cell.style.backgroundColor = ""; // 元に戻す
//                 }, 500);
//             }
//         }
//     }
// }

function endGame(win) { gameState.gameOver = true; alert(win ? i18n[curLang].win : i18n[curLang].lose); location.reload(); }

window.addEventListener('keydown', (e) => {
    const keys = { 'ArrowUp': [0,-1], 'w': [0,-1], '8': [0,-1], 'ArrowDown': [0,1], 's': [0,1], '2': [0,1], 'ArrowLeft': [-1,0], 'a': [-1,0], '4': [-1,0], 'ArrowRight': [1,0], 'd': [1,0], '6': [1,0], ' ': [0,0], '5': [0,0] };
    if (keys[e.key]) handleInput(...keys[e.key]);
});

window.onload = () => {
    const browserLang = (navigator.language || navigator.userLanguage).split('-')[0];
    setLang(['ja', 'en', 'es'].includes(browserLang) ? browserLang : 'en');
    openGuide();
};

// 「？」ボタンやヘルプが必要な時に呼ぶ
function openHelp() {
    const T = i18n[curLang];
    const hTitle = document.getElementById('h-modal-title');
    const hBody = document.getElementById('h-modal-body');
    
    if (hTitle) hTitle.textContent = T.hTitle;
    if (hBody) hBody.innerHTML = T.hContent;

    document.getElementById('help-overlay').style.display = 'flex';

    // BGM停止処理（既存ロジック維持）
    if (bgmTimer) { 
        clearTimeout(bgmTimer); 
        bgmTimer = null; 
    }
}

function closeHelp() {
    document.getElementById('help-overlay').style.display = 'none';
    
    // ② AudioContext のレジューム演出
    // ヘルプを閉じたときに「よし、始めるぞ」のSEを鳴らす
    if (audioCtx) {
        audioCtx.resume().then(() => {
            playEffect(SOUND_DATA.START_GAME);
        });
    }
    
    audioCtx.resume().then(() => {
        playEffect(SOUND_DATA.START_GAME);
        if (!bgmTimer && !isMuted) { playBGM(); }
    });
}

// モード選択画面を開く（既存の openGuide を整理）
function openGuide() {
    // 全てのゲーム画面を一旦隠す
    document.getElementById('study-screen').style.display = 'none';
    document.getElementById('guide-overlay').style.display = 'flex';
    
    // BGM停止処理（既存ロジック維持）
    if (bgmTimer) { 
        clearTimeout(bgmTimer); 
        bgmTimer = null; 
    }
}

// 言語に合わせてヘルプ内容を書き換える関数（setLangから呼ぶと便利）
function updateHelpText() {
    const T = i18n[curLang];
    const helpTitle = document.getElementById('help-modal-title');
    const helpBody = document.getElementById('help-modal-body');
    
    if (helpTitle) helpTitle.textContent = T.helpTitle || "GUIDE";
    // i18nに新しく定義する helpContent を流し込む
    if (helpBody) helpBody.innerHTML = T.helpContent || T.gBody; 
}

function updateCollectionUI() {
    const listDiv = document.getElementById('collection-list');
    if (!listDiv) return;
    listDiv.innerHTML = "";
    
    // --- 修正ポイント：ガード処理 ---
    if (!gameState.collection || typeof gameState.collection !== 'object') return;

    Object.keys(gameState.collection).sort().forEach(word => {
        const item = document.createElement('div');
        item.style.padding = "4px";
        item.style.borderBottom = "1px solid #333";
        item.textContent = `★ ${word} (${gameState.collection[word]})`;
        listDiv.appendChild(item);
    });
}