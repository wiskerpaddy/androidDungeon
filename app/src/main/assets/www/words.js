const EXAM_WORDS_DATA = [
    { "text": "TCP/IP", "hint": "Network Protocol" },
    { "text": "DNS", "hint": "Domain Name System" },
    { "text": "HTTP", "hint": "Hypertext Transfer Protocol" },
    { "text": "JSON", "hint": "JavaScript Object Notation" }
];

// 画面から呼び出す追加用関数
function addWordFromUI() {
    const frontInput = document.getElementById('word-front').value;
    const backInput = document.getElementById('word-back').value;

    if (frontInput && backInput) {
        // 配列に追加
        EXAM_WORDS_DATA.push({ front: frontInput, back: backInput });
        
        // 開発中のデバッグ用にコンソール出力
        console.log("追加完了:", EXAM_WORDS_DATA);
        
        // 入力欄をクリアして閉じる
        closeAddModal();
        alert("単語を追加しました！");
    } else {
        alert("両方の項目を入力してください。");
    }
}