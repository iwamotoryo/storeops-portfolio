"use strict";
/* ==================================================================
   ポートフォリオ用デモ — 本体

   設計上の約束（公開時のハードニング）
   1. innerHTML / outerHTML / insertAdjacentHTML / document.write /
      eval / new Function / 文字列 setTimeout は使わない。
      DOM は createElement と textContent だけで組み立てる。
   2. style="..." 属性を生成しない。可変値は CSSOM（style.setProperty）で
      渡す。CSSOM は CSP の style-src の対象外なので 'unsafe-inline' が要らない。
   3. インラインの on* ハンドラを書かない。addEventListener だけ。
   4. 外部通信を行う API を一切呼ばない（fetch / XHR / WebSocket /
      EventSource / sendBeacon / RTCPeerConnection / 動的 import）。
   5. localStorage は portfolio-takken-demo-* のみ。Cookie と
      sessionStorage は使わない。読み戻した値は必ず検証してから使う。
   6. hash route は allowlist。未知の値は dashboard に落とす。
================================================================== */

/* ==================================================================
   0. DOM ビルダ（唯一の DOM 生成経路）
================================================================== */

/* 生成してよい属性だけを列挙する。ここに無い名前は黙って捨てる。 */
var ATTR_OK = {
  id:1, type:1, role:1, title:1, name:1, value:1, placeholder:1, disabled:1,
  checked:1, colspan:1, rowspan:1, maxlength:1, inputmode:1, autocomplete:1,
  rows:1, min:1, max:1, step:1, readonly:1, tabindex:1, hidden:1,
  "aria-pressed":1, "aria-label":1, "aria-modal":1, "aria-live":1,
  "aria-atomic":1, "aria-hidden":1, "aria-current":1, href:1
};
var SVG_ATTR_OK = {
  viewBox:1, width:1, height:1, points:1, d:1, x:1, y:1, x1:1, y1:1, x2:1, y2:1,
  cx:1, cy:1, r:1, "text-anchor":1, role:1, "aria-label":1, class:1
};
var SVGNS = "http://www.w3.org/2000/svg";

/* href は内部ハッシュルートだけ許す。javascript: 等は通さない。 */
function safeHref(v) {
  var str = String(v);
  return /^#\/[a-z]+$/.test(str) ? str : "#/dashboard";
}

function appendKids(el, kids) {
  if (kids === null || kids === undefined || kids === false) return;
  if (Array.isArray(kids)) { kids.forEach(function (k) { appendKids(el, k); }); return; }
  if (kids instanceof Node) { el.appendChild(kids); return; }
  el.appendChild(document.createTextNode(String(kids)));
}

function applyProps(el, props, allow, isSvg) {
  if (!props) return;
  Object.keys(props).forEach(function (k) {
    var v = props[k];
    if (v === null || v === undefined || v === false) return;
    if (k === "text") { el.textContent = String(v); return; }
    if (k === "class") { if (isSvg) el.setAttribute("class", String(v)); else el.className = String(v); return; }
    if (k === "on") { Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); }); return; }
    if (k === "css") { Object.keys(v).forEach(function (p) { el.style.setProperty(p, String(v[p])); }); return; }
    if (k === "href") { el.setAttribute("href", safeHref(v)); return; }
    if (!allow[k]) return;                       // allowlist 外は無視
    if (v === true) { el.setAttribute(k, ""); return; }
    el.setAttribute(k, String(v));
  });
}

function h(tag, props, kids) {
  var el = document.createElement(tag);
  applyProps(el, props, ATTR_OK, false);
  appendKids(el, kids);
  return el;
}
function svgEl(tag, props, kids) {
  var el = document.createElementNS(SVGNS, tag);
  applyProps(el, props, SVG_ATTR_OK, true);
  appendKids(el, kids);
  return el;
}
function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/* ==================================================================
   1. デモ専用の保存領域
================================================================== */
var DEMO_PREFIX = "portfolio-takken-demo-";
var STATE_KEY = DEMO_PREFIX + "state-v1";

function readRaw() {
  try {
    var raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);                       // 壊れていれば catch へ
  } catch (e) { return null; }                    // 不正 JSON は初期状態へ
}
function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(S)); } catch (e) { /* 保存不可でも表示は続ける */ }
}
function resetDemo() {
  try {
    var kill = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(DEMO_PREFIX) === 0) kill.push(k);
    }
    kill.forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) { /* 読めなくてもメモリ上は初期化する */ }
  S = defaultState();
  // ここで saveState() は呼ばない。呼ぶと消したばかりのキーを作り直してしまう。
}

/* ==================================================================
   2. 架空データ（100%フィクション）
   実在の受講生・教室・メールアドレス・宅建の過去問本文・模試本文は含まない。
================================================================== */

/* --- 2-1. 体験用ミニ模試（5問） ---------------------------------- */
var MINI = [
  {
    n: 1, subject: "宅建業法", topic: "媒介契約", type: "SELECT_TRUE",
    stem: "【架空・デモ用】宅地建物取引業者が売主から媒介の依頼を受けた場合に関する次の記述のうち、正しいものはどれか。",
    statements: [
      { o: 1, topic: "媒介契約", text: "デモ肢1（媒介契約の書面）：このデモでは【誤りの肢】として設定しています。", truth: false },
      { o: 2, topic: "媒介契約", text: "デモ肢2（専任媒介の有効期間）：このデモでは【誤りの肢】として設定しています。", truth: false },
      { o: 3, topic: "媒介契約", text: "デモ肢3（書面の作成と交付）：このデモでは【正しい肢】として設定しています。", truth: true },
      { o: 4, topic: "業務処理状況", text: "デモ肢4（業務処理状況の報告）：このデモでは【誤りの肢】として設定しています。", truth: false }
    ],
    options: [{ o: 1, label: "1" }, { o: 2, label: "2" }, { o: 3, label: "3" }, { o: 4, label: "4" }],
    correct: 3, hasKey: true
  },
  {
    n: 2, subject: "権利関係", topic: "意思表示", type: "SELECT_FALSE",
    stem: "【架空・デモ用】意思表示に関する次の記述のうち、誤っているものはどれか。",
    statements: [
      { o: 1, topic: "意思表示", text: "デモ肢1：このデモでは【正しい肢】として設定しています。", truth: true },
      { o: 2, topic: "代理", text: "デモ肢2：このデモでは【誤りの肢】として設定しています。", truth: false },
      { o: 3, topic: "時効", text: "デモ肢3：このデモでは【正しい肢】として設定しています。", truth: true },
      { o: 4, topic: "物権変動", text: "デモ肢4：このデモでは【正しい肢】として設定しています。", truth: true }
    ],
    options: [{ o: 1, label: "1" }, { o: 2, label: "2" }, { o: 3, label: "3" }, { o: 4, label: "4" }],
    correct: 2, hasKey: true
  },
  {
    /* 個数問題：選択肢は「肢」ではなく個数。肢の判断から最終回答は自動で決まらない。 */
    n: 3, subject: "宅建業法", topic: "重要事項説明", type: "COUNT_TRUE",
    stem: "【架空・デモ用】次のア〜エの記述のうち、正しいものはいくつあるか。",
    statements: [
      { o: 1, label: "ア", topic: "重要事項説明", text: "デモ肢ア：このデモでは【正しい肢】として設定しています。", truth: true },
      { o: 2, label: "イ", topic: "重要事項説明", text: "デモ肢イ：このデモでは【正しい肢】として設定しています。", truth: true },
      { o: 3, label: "ウ", topic: "37条書面", text: "デモ肢ウ：このデモでは【誤りの肢】として設定しています。", truth: false },
      { o: 4, label: "エ", topic: "37条書面", text: "デモ肢エ：このデモでは【誤りの肢】として設定しています。", truth: false }
    ],
    options: [{ o: 1, label: "一つ" }, { o: 2, label: "二つ" }, { o: 3, label: "三つ" }, { o: 4, label: "四つ" }],
    correct: 2, hasKey: true
  },
  {
    n: 4, subject: "法令上の制限", topic: "都市計画法", type: "SELECT_FALSE",
    stem: "【架空・デモ用】都市計画法に関する次の記述のうち、誤っているものはどれか。",
    statements: [
      { o: 1, topic: "都市計画法", text: "デモ肢1：このデモでは【正しい肢】として設定しています。", truth: true },
      { o: 2, topic: "開発許可", text: "デモ肢2：このデモでは【正しい肢】として設定しています。", truth: true },
      { o: 3, topic: "開発許可", text: "デモ肢3：このデモでは【誤りの肢】として設定しています。", truth: false },
      { o: 4, topic: "建築基準法", text: "デモ肢4：このデモでは【正しい肢】として設定しています。", truth: true }
    ],
    options: [{ o: 1, label: "1" }, { o: 2, label: "2" }, { o: 3, label: "3" }, { o: 4, label: "4" }],
    correct: 3, hasKey: true
  },
  {
    /* 採点不可の実演：公式正答が無い問題は 0点ではなく母数から外す。 */
    n: 5, subject: "5問免除", topic: "統計", type: "SELECT_TRUE",
    stem: "【架空・デモ用】統計に関する次の記述のうち、正しいものはどれか。（この問はデモ上「公式正答なし」として登録しています）",
    statements: [
      { o: 1, topic: "統計", text: "デモ肢1：この問は正答キーを持たないため、肢の正誤も設定していません。", truth: null },
      { o: 2, topic: "統計", text: "デモ肢2：この問は正答キーを持たないため、肢の正誤も設定していません。", truth: null },
      { o: 3, topic: "統計", text: "デモ肢3：この問は正答キーを持たないため、肢の正誤も設定していません。", truth: null },
      { o: 4, topic: "統計", text: "デモ肢4：この問は正答キーを持たないため、肢の正誤も設定していません。", truth: null }
    ],
    options: [{ o: 1, label: "1" }, { o: 2, label: "2" }, { o: 3, label: "3" }, { o: 4, label: "4" }],
    correct: null, hasKey: false
  }
];
var MINI_BY_N = {};
MINI.forEach(function (q) { MINI_BY_N[q.n] = q; });

/* --- 2-2. 50問の実力測定（架空の履歴4件） ------------------------ */
var BLUEPRINT = [
  { subject: "権利関係", from: 1, to: 14, topics: ["意思表示", "代理", "時効", "物権変動", "抵当権", "債務不履行", "契約不適合責任", "相続", "借地借家法", "区分所有法", "不動産登記法"] },
  { subject: "法令上の制限", from: 15, to: 22, topics: ["都市計画法", "開発許可", "建築基準法", "国土利用計画法", "農地法", "土地区画整理法", "宅地造成"] },
  { subject: "税・その他", from: 23, to: 25, topics: ["不動産取得税", "印紙税", "地価公示"] },
  { subject: "宅建業法", from: 26, to: 45, topics: ["免許", "宅建士", "営業保証金", "保証協会", "媒介契約", "広告規制", "重要事項説明", "37条書面", "8種制限", "クーリング・オフ", "報酬", "監督処分"] },
  { subject: "5問免除", from: 46, to: 50, topics: ["住宅金融支援機構", "景品表示法", "統計", "土地", "建物"] }
];
var UNSCORABLE_Q = 48;
var UNSCORABLE_REASON = "出典が省略";
var SUBJECTS = ["宅建業法", "法令上の制限", "権利関係", "税・その他", "5問免除"];
var TARGETS = {
  "宅建業法": { t: 18, max: 20 }, "法令上の制限": { t: 7, max: 8 }, "権利関係": { t: 8, max: 14 },
  "税・その他": { t: 2, max: 3 }, "5問免除": { t: 4, max: 4 }
};
var CORRECT_BY_SUBJECT = [
  { id: "m1", title: "デモ実力測定 第1回", date: "2026-06-14", minutes: 118, n: { "権利関係": 5, "法令上の制限": 4, "税・その他": 1, "宅建業法": 17, "5問免除": 4 } },
  { id: "m2", title: "デモ実力測定 第2回", date: "2026-07-12", minutes: 115, n: { "権利関係": 6, "法令上の制限": 5, "税・その他": 1, "宅建業法": 18, "5問免除": 4 } },
  { id: "m3", title: "デモ実力測定 第3回", date: "2026-08-09", minutes: 112, n: { "権利関係": 6, "法令上の制限": 5, "税・その他": 2, "宅建業法": 19, "5問免除": 4 } },
  { id: "m4", title: "デモ実力測定 第4回", date: "2026-09-06", minutes: 108, n: { "権利関係": 7, "法令上の制限": 6, "税・その他": 2, "宅建業法": 19, "5問免除": 4 } }
];

function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a += 0x6D2B79F5; a = a >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function subjectOf(n) {
  for (var i = 0; i < BLUEPRINT.length; i++) if (n >= BLUEPRINT[i].from && n <= BLUEPRINT[i].to) return BLUEPRINT[i].subject;
  return "";
}
function topicOf(n) {
  for (var i = 0; i < BLUEPRINT.length; i++) {
    var b = BLUEPRINT[i];
    if (n >= b.from && n <= b.to) return b.topics[(n - b.from) % b.topics.length];
  }
  return "";
}
function buildMeasurements() {
  return CORRECT_BY_SUBJECT.map(function (m, mi) {
    var r = rng(1000 + mi * 37);
    var perQ = {};
    BLUEPRINT.forEach(function (b) {
      var pool = [];
      for (var n = b.from; n <= b.to; n++) {
        if (n === UNSCORABLE_Q) { perQ[n] = { state: "UNAVAILABLE", reason: UNSCORABLE_REASON }; continue; }
        pool.push({ n: n, k: r() });
      }
      pool.sort(function (a, c) { return c.k - a.k; });
      var want = m.n[b.subject] || 0;
      pool.forEach(function (p, i) {
        var correct = i < want;
        var risky = correct && (p.k * 7919 % 1) > 0.66;
        perQ[p.n] = { state: correct ? (risky ? "RISK" : "STABLE") : "WRONG" };
      });
    });
    var r2 = rng(5000 + mi * 91);
    for (var n = 1; n <= 50; n++) {
      var q = perQ[n];
      if (q.state === "UNAVAILABLE") { q.cell = { allMarks: 0, aligned: 0, misconception: 0, uncertain: 0, unknown: 0 }; continue; }
      var all = 4;
      var mis = q.state === "WRONG" ? 1 + Math.floor(r2() * 2) : (q.state === "RISK" ? Math.floor(r2() * 2) : 0);
      var unc = q.state === "RISK" ? 1 + Math.floor(r2() * 2) : Math.floor(r2() * 1.4);
      var unk = q.state === "WRONG" ? Math.floor(r2() * 2) : 0;
      if (mis + unc + unk > all) { unk = 0; unc = Math.max(0, all - mis); }
      q.cell = { allMarks: all, aligned: all - mis - unc - unk, misconception: mis, uncertain: unc, unknown: unk };
    }
    var correctCount = 0, scorable = 0;
    for (var k = 1; k <= 50; k++) {
      if (perQ[k].state === "UNAVAILABLE") continue;
      scorable++;
      if (perQ[k].state !== "WRONG") correctCount++;
    }
    return { id: m.id, title: m.title, date: m.date, minutes: m.minutes, perQ: perQ, score: correctCount, max: scorable };
  });
}
var MEASUREMENTS = buildMeasurements();
var LATEST = MEASUREMENTS[MEASUREMENTS.length - 1];

/* --- 2-3. みんなの成績（架空の教室・架空の受講生） ---------------- */
var PEER_CLASSROOM = "デモ教室 2026年度（架空）";
var PEERS = [
  { name: "山田 太郎", score: 41, max: 49, count: 4, date: "2026-09-06" },
  { name: "佐藤 花子", score: 44, max: 49, count: 4, date: "2026-09-07" },
  { name: "鈴木 一郎", score: 33, max: 49, count: 3, date: "2026-09-05" },
  { name: "田中 美咲", score: 36, max: 49, count: 4, date: "2026-09-06" },
  { name: "高橋 健", score: 29, max: 49, count: 2, date: "2026-08-30" },
  { name: "渡辺 あおい", score: 39, max: 49, count: 4, date: "2026-09-07" },
  { name: "あなた（デモ）", score: LATEST.score, max: LATEST.max, count: MEASUREMENTS.length, date: LATEST.date, self: true }
];

/* --- 2-4. 用語辞書 ------------------------------------------------ */
var GLOSSARY = [
  { term: "宅地建物取引業", reading: "たくちたてものとりひきぎょう", body: "宅地・建物の売買や交換、売買・交換・貸借の代理や媒介を、業として行うこと。デモ用の簡略な説明です。" },
  { term: "媒介契約", reading: "ばいかいけいやく", body: "宅地建物取引業者が、売買などの相手方を探すことを依頼者から引き受ける契約。一般・専任・専属専任の型がある。" },
  { term: "重要事項説明", reading: "じゅうようじこうせつめい", body: "契約の前に、取引の判断に影響する事項を書面などで説明する手続き。" },
  { term: "37条書面", reading: "さんじゅうななじょうしょめん", body: "契約が成立したときに交付する、契約内容を記載した書面。重要事項説明とは交付のタイミングも目的も別。" },
  { term: "クーリング・オフ", reading: "くーりんぐおふ", body: "一定の場所でした申込み・契約を、条件を満たす間は撤回・解除できる制度。" },
  { term: "開発許可", reading: "かいはつきょか", body: "一定規模以上の土地の区画形質の変更について、あらかじめ受ける必要がある許可。" },
  { term: "区分所有", reading: "くぶんしょゆう", body: "1棟の建物を構造上・利用上分けて、それぞれを所有すること。マンションが典型。" },
  { term: "抵当権", reading: "ていとうけん", body: "債務の担保として不動産に設定し、返済されないときに優先して弁済を受けられる権利。" },
  { term: "固定資産税評価額", reading: "こていしさんぜいひょうかがく", body: "市町村が定める、固定資産税などの計算の基礎となる評価額。" },
  { term: "営業保証金", reading: "えいぎょうほしょうきん", body: "取引の相手方を保護するために供託しておくお金。保証協会に加入する方法もある。" },
  { term: "8種制限", reading: "はちしゅせいげん", body: "宅地建物取引業者が自ら売主となる取引に限って適用される、買主保護のための制限のまとまり。" },
  { term: "登記", reading: "とうき", body: "不動産に関する権利関係を公の帳簿に記録すること。第三者に対する主張の場面で意味を持つ。" }
];

/* --- 2-5. デモ用アカウント（架空・認証なし） ---------------------- */
/* example.invalid は規格上必ず存在しないドメイン。実在の連絡先は置かない。 */
var ACCOUNT = {
  nickname: "デモ 太郎",
  handle: "demo-taro",
  email: "demo-user@example.invalid",
  classroom: PEER_CLASSROOM,
  role: "受講生（デモ）",
  status: "受講中",
  startedOn: "2026-04-01",
  examDate: "2026-10-18",
  plan: "教室プラン（デモ）",
  dailyMinutes: 120,
  notify: [
    { key: "review", label: "復習の通知", desc: "今日の30分セットができたら知らせる", on: true },
    { key: "classroom", label: "教室からのお知らせ", desc: "担当者からの連絡を受け取る", on: true },
    { key: "weekly", label: "週次のふりかえり", desc: "1週間の学習サマリーを受け取る", on: false }
  ]
};

/* ==================================================================
   3. 判定ロジック
   採点できない理由は「出典が省略」「公式正答なし」の2つだけ。
================================================================== */
var OUTCOME = {
  STABLE: { label: "安定正解" }, RISK: { label: "正解だが要復習" },
  WRONG: { label: "不正解" }, UNAVAILABLE: { label: "採点不可" }
};
var BINARY = { CORRECT: { label: "正解" }, WRONG: { label: "不正解" }, UNAVAILABLE: { label: "採点不可" } };
var ALL_BUCKETS = ["STABLE", "RISK", "WRONG", "UNAVAILABLE", "CORRECT"];

function bucketOf(state, mode) {
  if (mode === "FOUR") return state;
  if (state === "UNAVAILABLE") return "UNAVAILABLE";
  return state === "WRONG" ? "WRONG" : "CORRECT";
}
function bucketLabel(key, mode) { return (mode === "FOUR" ? OUTCOME : BINARY)[key].label; }
function bucketList(mode) {
  return mode === "FOUR" ? ["STABLE", "RISK", "WRONG", "UNAVAILABLE"] : ["CORRECT", "WRONG", "UNAVAILABLE"];
}
function weaknessRate(cell) {
  if (!cell || cell.allMarks === 0) return null;
  var judged = cell.aligned + cell.misconception + cell.uncertain + cell.unknown;
  if (judged === 0) return null;
  return (cell.misconception + cell.uncertain + cell.unknown) / judged;
}
function averageRate(list) {
  var xs = list.filter(function (v) { return v !== null && v !== undefined; });
  if (!xs.length) return null;
  return xs.reduce(function (a, b) { return a + b; }, 0) / xs.length;
}
function pct(v, digits) { return (v === null || v === undefined) ? "—" : (v * 100).toFixed(digits || 0) + "%"; }
function subjectBreakdown(meas) {
  return SUBJECTS.map(function (s) {
    var correct = 0, total = 0;
    for (var n = 1; n <= 50; n++) {
      if (subjectOf(n) !== s) continue;
      var q = meas.perQ[n];
      if (q.state === "UNAVAILABLE") continue;
      total++;
      if (q.state !== "WRONG") correct++;
    }
    var tg = TARGETS[s] || { t: 0, max: total };
    return {
      subject: s, correct: correct, total: total,
      rate: total ? correct / total : null,
      targetRate: tg.max ? tg.t / tg.max : null, target: tg.t, max: tg.max
    };
  });
}
/* 復習キュー（弱点から作る）。採点不可は載せない。 */
function reviewQueue() {
  var out = [];
  for (var n = 1; n <= 50; n++) {
    var q = LATEST.perQ[n];
    if (q.state !== "RISK" && q.state !== "WRONG") continue;
    out.push({
      n: n, subject: subjectOf(n), topic: topicOf(n), state: q.state,
      rate: weaknessRate(q.cell), minutes: q.state === "WRONG" ? 4 : 2
    });
  }
  out.sort(function (a, b) {
    if (a.state !== b.state) return a.state === "WRONG" ? -1 : 1;
    return (b.rate || 0) - (a.rate || 0);
  });
  return out;
}
function todaySet() {
  var acc = 0, out = [];
  reviewQueue().forEach(function (x) { if (acc + x.minutes <= 30) { out.push(x); acc += x.minutes; } });
  return out;
}
/* 初期サンプルとして、今日の分の一部を「復習済み」にしておく。 */
function initialReviewDone() {
  var done = {};
  todaySet().slice(0, 3).forEach(function (x) { done[String(x.n)] = true; });
  return done;
}

/* ==================================================================
   4. 状態（localStorage から読み戻した値は必ず検証する）
================================================================== */
var MARKS_OK = { TRUE: 1, FALSE: 1, UNCERTAIN: 1, UNKNOWN: 1 };

function defaultState() {
  return {
    attempt: null, results: [], reviewDone: initialReviewDone(),
    qmap: { mode: "FOUR", hidden: [] }, heat: { sort: null, dir: "WEAK" }, peerView: "TABLE"
  };
}
function clampInt(v, lo, hi) {
  var n = Number(v);
  if (!Number.isFinite(n)) return lo;
  n = Math.round(n);
  return Math.min(hi, Math.max(lo, n));
}
function sanitizeAttempt(raw) {
  if (!raw || typeof raw !== "object") return null;
  var a = {
    startedAt: Date.now(), elapsed: clampInt(raw.elapsed, 0, 1000 * 60 * 60 * 24),
    paused: true,                                  // 読み戻したら必ず停止状態から
    cur: clampInt(raw.cur, 0, MINI.length - 1),
    marks: {}, finals: {}, flags: {}, submitted: raw.submitted === true
  };
  MINI.forEach(function (q) {
    var srcM = (raw.marks && typeof raw.marks === "object") ? raw.marks[q.n] : null;
    if (srcM && typeof srcM === "object") {
      var m = {};
      q.statements.forEach(function (st) {
        var v = srcM[st.o];
        if (typeof v === "string" && MARKS_OK[v]) m[st.o] = v;
      });
      if (Object.keys(m).length) a.marks[q.n] = m;
    }
    var f = (raw.finals && typeof raw.finals === "object") ? Number(raw.finals[q.n]) : NaN;
    if (q.options.some(function (o) { return o.o === f; })) a.finals[q.n] = f;
    if (raw.flags && typeof raw.flags === "object" && raw.flags[q.n] === true) a.flags[q.n] = true;
  });
  return a;
}
function sanitizeState(raw) {
  var s = defaultState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return s;

  if (raw.qmap && typeof raw.qmap === "object") {
    s.qmap.mode = raw.qmap.mode === "BINARY" ? "BINARY" : "FOUR";
    s.qmap.hidden = Array.isArray(raw.qmap.hidden)
      ? raw.qmap.hidden.filter(function (k) { return ALL_BUCKETS.indexOf(k) >= 0; })
      : [];
  }
  if (raw.heat && typeof raw.heat === "object") {
    var srt = raw.heat.sort;
    var okIdx = Number.isInteger(srt) && srt >= 0 && srt < MEASUREMENTS.length;
    s.heat.sort = (srt === "avg" || okIdx) ? srt : null;
    s.heat.dir = raw.heat.dir === "STABLE" ? "STABLE" : "WEAK";
  }
  s.peerView = raw.peerView === "CHART" ? "CHART" : "TABLE";

  if (raw.reviewDone && typeof raw.reviewDone === "object" && !Array.isArray(raw.reviewDone)) {
    s.reviewDone = {};
    Object.keys(raw.reviewDone).slice(0, 60).forEach(function (k) {
      var n = Number(k);
      if (Number.isInteger(n) && n >= 1 && n <= 50 && raw.reviewDone[k] === true) s.reviewDone[String(n)] = true;
    });
  }
  if (Array.isArray(raw.results)) {
    s.results = raw.results.slice(0, 50).map(function (r) {
      if (!r || typeof r !== "object") return null;
      return {
        correct: clampInt(r.correct, 0, MINI.length),
        scorable: clampInt(r.scorable, 0, MINI.length),
        elapsed: clampInt(r.elapsed, 0, 1000 * 60 * 60 * 24),
        /* 表示は textContent なので実害は無いが、長さだけは切っておく */
        at: typeof r.at === "string" ? r.at.slice(0, 40) : ""
      };
    }).filter(Boolean);
  }
  s.attempt = sanitizeAttempt(raw.attempt);
  return s;
}
var S = sanitizeState(readRaw());

/* 採点結果は保存せず、marks / finals から毎回導出する（改ざん耐性）。 */
function computePer(a) {
  return MINI.map(function (q) {
    var marks = a.marks[q.n] || {};
    var final = a.finals[q.n] || null;
    if (!q.hasKey) return { n: q.n, state: "UNAVAILABLE", reason: "公式正答なし", final: final, q: q, marks: marks };
    var ok = final === q.correct;
    var hesitated = q.statements.some(function (st) {
      var m = marks[st.o];
      if (!m) return false;
      if (m === "UNCERTAIN" || m === "UNKNOWN") return true;
      return st.truth !== null && ((m === "TRUE") !== (st.truth === true));
    });
    return { n: q.n, state: ok ? (hesitated ? "RISK" : "STABLE") : "WRONG", final: final, q: q, marks: marks };
  });
}
function attemptScore(per) {
  return {
    scorable: per.filter(function (p) { return p.state !== "UNAVAILABLE"; }).length,
    correct: per.filter(function (p) { return p.state === "STABLE" || p.state === "RISK"; }).length
  };
}

/* ==================================================================
   5. トースト / モーダル
================================================================== */
function toast(message, note, kind) {
  var host = document.getElementById("toastHost");
  if (!host) return;
  var box = h("div", { class: "toast toast--" + (kind || "info") }, [
    h("span", { text: message }),
    note ? h("span", { class: "toast__note", text: note }) : null
  ]);
  host.appendChild(box);
  setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 4200);
}
function closeModal() { clear(document.getElementById("modalHost")); }
function openModal(opts) {
  var host = document.getElementById("modalHost");
  clear(host);
  var panel = h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": opts.title },
    [h("div", { class: "modal__title", text: opts.title }),
     opts.desc ? h("p", { class: "modal__desc", text: opts.desc }) : null,
     opts.body || null,
     h("div", { class: "modal__row" }, opts.actions || [])]);
  if (opts.width) panel.style.setProperty("--mw", opts.width);
  var overlay = h("div", { class: "overlay", on: {
    click: function (e) { if (e.target === overlay) closeModal(); }
  } }, panel);
  host.appendChild(overlay);
  return panel;
}

/* ==================================================================
   6. 疑似操作（見た目だけ成功。送信も保存もしない）
   実際に行うのは「モーダルを閉じてトーストを出す」ことだけ。
================================================================== */
var DEMO_NOTE = "デモのため実際には送信されません。";

function pseudoSubmit(message) {
  closeModal();
  toast(message, DEMO_NOTE, "ok");
  /* ここで通信も保存もしない。localStorage / sessionStorage / Cookie に触れない。 */
}
function blockedAction() {
  toast("ポートフォリオ用デモでは変更できません。", "本番のアカウント・教室・通知設定にはつながっていません。", "info");
}

/* 「この問題を報告」「問い合わせ」。入力内容はどこにも残さない。 */
function openReportModal(subjectLabel) {
  var kind = h("select", { class: "field__select", "aria-label": "報告の種類" }, [
    h("option", { text: "問題文の誤字・脱字" }), h("option", { text: "正答が違うと思う" }),
    h("option", { text: "解説が分かりにくい" }), h("option", { text: "その他" })
  ]);
  var body = h("textarea", { class: "field__area", placeholder: "気づいた点を書いてください（デモでは送信されません）", maxlength: "800" });
  var form = h("form", { class: "report-form", on: {
    submit: function (e) {
      e.preventDefault();                     // 送信させない（form action も持たせない）
      pseudoSubmit("報告を送信しました（デモ）");
    }
  } }, [
    subjectLabel ? h("div", { class: "field" }, [h("span", { class: "field__label", text: "対象" }), h("div", { text: subjectLabel })]) : null,
    h("div", { class: "field" }, [h("label", { class: "field__label", text: "種類" }), kind]),
    h("div", { class: "field" }, [h("label", { class: "field__label", text: "内容" }), body,
      h("div", { class: "field__hint", text: "入力内容は画面を閉じると消えます。保存も送信もしません。" })]),
    h("div", { class: "modal__row" }, [
      h("button", { class: "btn", type: "button", text: "やめる", on: { click: closeModal } }),
      h("button", { class: "btn btn--primary", type: "submit", text: "送信する（デモ）" })
    ])
  ]);
  openModal({ title: "この内容を報告", desc: "デモでは通信を行いません。ボタンの反応だけ確認できます。", body: form, width: "460px" });
}

/* ==================================================================
   7. 画面
================================================================== */
var ROUTES = [
  { id: "dashboard", label: "ダッシュボード" }, { id: "exam", label: "模試を受ける" },
  { id: "result", label: "結果" }, { id: "qmap", label: "問題マップ" },
  { id: "analysis", label: "科目・単元分析" }, { id: "weak", label: "弱点" },
  { id: "review", label: "復習" }, { id: "glossary", label: "用語辞書" },
  { id: "peers", label: "みんなの成績" }, { id: "account", label: "アカウント" }
];
var ROUTE_IDS = ROUTES.map(function (r) { return r.id; });

/* hash route は allowlist。未知・不正な値はすべて dashboard。 */
function currentRoute() {
  var raw = String(location.hash || "");
  var m = /^#\/([a-z]+)$/.exec(raw);
  if (!m) return "dashboard";
  return ROUTE_IDS.indexOf(m[1]) >= 0 ? m[1] : "dashboard";
}
function go(id) { location.hash = "#/" + (ROUTE_IDS.indexOf(id) >= 0 ? id : "dashboard"); }

function card(titleText, kids, titleClass) {
  return h("div", { class: "card" }, [
    titleText ? h("div", { class: "card-title" + (titleClass ? " " + titleClass : ""), text: titleText }) : null,
    kids
  ]);
}
function statCard(label, valueText, unitText, valueClass, subLabel) {
  return h("div", { class: "card" }, [
    h("div", { class: "label", text: label }),
    h("div", { class: "stat" + (valueClass ? " " + valueClass : "") },
      [document.createTextNode(valueText), unitText ? h("small", { class: "stat__unit", text: " " + unitText }) : null]),
    subLabel ? h("div", { class: "label", text: subLabel }) : null
  ]);
}
function tableEl(headers, rows, opts) {
  var o = opts || {};
  return h("div", { class: "scroll-x" }, h("table", { class: "data" + (o.narrow ? " data--narrow" : "") }, [
    h("thead", null, h("tr", null, headers.map(function (hd) {
      return h("th", { class: hd.num ? "num" : null, text: hd.label });
    }))),
    h("tbody", null, rows)
  ]));
}
function td(text, isNum, cls) { return h("td", { class: (isNum ? "num" : "") + (cls ? " " + cls : "") || null, text: text }); }

/* ---------------- ダッシュボード ---------------- */
function viewDashboard(v) {
  var sb = subjectBreakdown(LATEST);
  var weakest = sb.filter(function (x) { return x.rate !== null; })
    .sort(function (a, b) { return (a.rate - a.targetRate) - (b.rate - b.targetRate); })[0];
  var riskCount = 0, wrongCount = 0;
  for (var n = 1; n <= 50; n++) {
    if (LATEST.perQ[n].state === "RISK") riskCount++;
    if (LATEST.perQ[n].state === "WRONG") wrongCount++;
  }
  var doneCount = Object.keys(S.reviewDone).length;

  v.appendChild(h("div", { class: "page-title", text: "ダッシュボード" }));
  v.appendChild(h("div", { class: "page-desc", text: "デモ用の学習状況です。すべて架空のデータです。" }));
  v.appendChild(h("div", { class: "note", text: "このデモは、正解／不正解だけでなく肢ごとの判断（正・誤・△・？）を記録して弱点を出す、という考え方を体験するためのものです。" }));

  v.appendChild(h("div", { class: "grid grid--c4" }, [
    statCard("最新の実力測定", String(LATEST.score), "/ " + LATEST.max, null, LATEST.title),
    statCard("得点率", pct(LATEST.score / LATEST.max), null, null, "採点対象のみで計算"),
    statCard("正解だが要復習", String(riskCount), "問", "stat--risk", "正解＝理解とは限らない"),
    statCard("採点不可", "1", "問", "stat--na", UNSCORABLE_REASON + "（0点にしない）")
  ]));

  v.appendChild(h("div", { class: "grid grid--c2" }, [
    card("得点の推移（架空）", [
      sparkline(),
      tableEl(
        [{ label: "測定" }, { label: "実施日" }, { label: "得点", num: true }, { label: "得点率", num: true }, { label: "所要", num: true }],
        MEASUREMENTS.map(function (m) {
          return h("tr", null, [
            td(m.title), td(m.date, false, "muted small"),
            h("td", { class: "num" }, [h("b", { text: String(m.score) }), document.createTextNode(" / " + m.max)]),
            td(pct(m.score / m.max), true), td(m.minutes + "分", true)
          ]);
        }), { narrow: true })
    ]),
    card("いま優先する科目", [
      weakest ? h("div", { class: "stat stat--sm", text: weakest.subject }) : null,
      weakest ? h("div", { class: "label", text: "現在 " + weakest.correct + " / " + weakest.total + "（" + pct(weakest.rate) + "）・目標 " + pct(weakest.targetRate) }) : null,
      h("div", { class: "small muted mt", text: "目標値は「予想合格点」ではなく、自分で決めた安全ラインです。" }),
      h("dl", { class: "kv mt" }, [
        h("dt", { text: "不正解" }), h("dd", { text: wrongCount + " 問" }),
        h("dt", { text: "復習キュー" }), h("dd", { text: reviewQueue().length + " 問（うち完了 " + doneCount + "）" }),
        h("dt", { text: "所属教室" }), h("dd", { text: ACCOUNT.classroom })
      ]),
      h("div", { class: "btn-row btn-row--mt" }, [
        h("button", { class: "btn btn--primary", type: "button", text: "体験ミニ模試を始める", on: { click: function () { go("exam"); } } }),
        h("button", { class: "btn", type: "button", text: "科目・単元分析を見る", on: { click: function () { go("analysis"); } } })
      ])
    ])
  ]));
}
function sparkline() {
  var w = 260, ht = 70, pad = 6;
  var xs = MEASUREMENTS.map(function (m, i) { return pad + i * ((w - pad * 2) / (MEASUREMENTS.length - 1)); });
  var ys = MEASUREMENTS.map(function (m) { return ht - pad - (m.score / m.max) * (ht - pad * 2); });
  var d = xs.map(function (x, i) { return (i ? "L" : "M") + x.toFixed(1) + " " + ys[i].toFixed(1); }).join(" ");
  return svgEl("svg", { class: "spark", viewBox: "0 0 " + w + " " + ht, role: "img", "aria-label": "得点の推移（架空データ）" },
    [svgEl("path", { class: "spark__line", d: d })].concat(
      xs.map(function (x, i) { return svgEl("circle", { class: "spark__dot", cx: x.toFixed(1), cy: ys[i].toFixed(1), r: "3" }); })));
}

/* ---------------- 模試 ---------------- */
function newAttempt() {
  return { startedAt: Date.now(), elapsed: 0, paused: true, cur: 0, marks: {}, finals: {}, flags: {}, submitted: false };
}
function fmtTime(ms) {
  var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  return String(m).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
var tickHandle = null;

function viewExam(v) {
  if (!S.attempt) return examStart(v);
  if (S.attempt.submitted) return go("result");
  return examRun(v);
}
function examStart(v) {
  v.appendChild(h("div", { class: "page-title", text: "体験ミニ模試" }));
  v.appendChild(h("div", { class: "page-desc", text: "全5問・架空データ。ログインは不要です。" }));
  v.appendChild(card("この体験でできること", [
    h("ul", { class: "list" }, [
      h("li", { text: "各肢に 正 / 誤 / △（迷った）/ ？（分からない）を付ける" }),
      h("li", { text: "最終回答は肢の判断とは別に選ぶ（自動では入りません）" }),
      h("li", { text: "カウントアップのタイマー（一時停止あり）" }),
      h("li", { text: "採点では「公式正答が無い問題」を0点にせず母数から外す" })
    ]),
    h("div", { class: "note", text: "問題文・肢の文言は機能確認用の架空データです。実際の宅建試験の問題・解説・正答は含みません。" }),
    h("button", { class: "btn btn--primary", type: "button", text: "開始する", on: { click: function () {
      S.attempt = newAttempt(); S.attempt.paused = false; saveState(); render();
    } } })
  ]));
  v.appendChild(card("これまでの体験結果", S.results.length
    ? tableEl([{ label: "回" }, { label: "得点", num: true }, { label: "得点率", num: true }, { label: "日時" }],
      S.results.map(function (r, i) {
        return h("tr", null, [
          td((i + 1) + "回目"),
          h("td", { class: "num" }, [h("b", { text: String(r.correct) }), document.createTextNode(" / " + r.scorable)]),
          td(r.scorable ? pct(r.correct / r.scorable) : "—", true),
          td(r.at, false, "muted small")
        ]);
      }), { narrow: true })
    : h("p", { class: "muted small", text: "まだありません。" })));
}
function examRun(v) {
  var a = S.attempt;
  var q = MINI[a.cur];
  var answered = MINI.filter(function (x) { return a.finals[x.n]; }).length;

  v.appendChild(h("div", { class: "page-title", text: "体験ミニ模試" }));
  v.appendChild(h("div", { class: "page-desc", text: "問 " + q.n + " / " + MINI.length + " ・ " + q.subject + " ・ " + q.topic }));

  var clock = h("span", { class: "timer", id: "clock", text: "00:00" });
  v.appendChild(h("div", { class: "card exam-bar" }, [
    clock,
    h("button", { class: "btn", type: "button", text: a.paused ? "再開" : "一時停止", on: { click: function () {
      if (!a.paused) { a.elapsed += Date.now() - a.startedAt; a.paused = true; }
      else { a.startedAt = Date.now(); a.paused = false; }
      saveState(); render();
    } } }),
    h("span", { class: "label", text: "回答済み " + answered + " / " + MINI.length }),
    h("span", { class: "spacer" }),
    h("button", { class: "btn", type: "button", "aria-pressed": a.flags[q.n] ? "true" : "false",
      text: a.flags[q.n] ? "★ フラグ中" : "☆ フラグ",
      on: { click: function () { a.flags[q.n] = !a.flags[q.n]; saveState(); render(); } } })
  ]));

  v.appendChild(h("div", { class: "qnav" }, MINI.map(function (x, i) {
    var cls = "qnav__btn" + (a.finals[x.n] ? " qnav__btn--done" : "") + (i === a.cur ? " qnav__btn--cur" : "");
    return h("button", { class: cls, type: "button", text: String(x.n),
      on: { click: function () { a.cur = i; saveState(); render(); } } });
  })));

  v.appendChild(h("div", { class: "card" }, [
    h("div", { class: "stem", text: q.stem }),
    q.statements.map(function (st) {
      var cur = (a.marks[q.n] || {})[st.o] || null;
      return h("div", { class: "stmt" }, [
        h("div", { class: "stmt-text" }, [h("b", { text: String(st.label || st.o) }), document.createTextNode("　" + st.text)]),
        h("div", { class: "marks" }, [["TRUE", "正"], ["FALSE", "誤"], ["UNCERTAIN", "△"], ["UNKNOWN", "？"]].map(function (pair) {
          return h("button", { class: "mark", type: "button", text: pair[1],
            "aria-pressed": cur === pair[0] ? "true" : "false",
            on: { click: function () {
              a.marks[q.n] = a.marks[q.n] || {};
              a.marks[q.n][st.o] = (a.marks[q.n][st.o] === pair[0]) ? null : pair[0];
              saveState(); render();
            } } });
        }))
      ]);
    }),
    h("div", { class: "card-title mt", text: "最終回答" + (q.type === "COUNT_TRUE" ? "（この問の選択肢は「個数」です）" : "") }),
    h("div", { class: "small muted mb", text: "肢に付けた判断からは自動で入りません。自分で選んでください。" }),
    h("div", { class: "opts" }, q.options.map(function (op) {
      return h("button", { class: "opt", type: "button", text: op.label,
        "aria-pressed": a.finals[q.n] === op.o ? "true" : "false",
        on: { click: function () {
          a.finals[q.n] = (a.finals[q.n] === op.o) ? null : op.o;
          saveState(); render();
        } } });
    })),
    h("div", { class: "btn-row btn-row--mt" }, [
      h("button", { class: "btn", type: "button", text: "この問題を報告",
        on: { click: function () { openReportModal("問" + q.n + "（" + q.subject + "）"); } } })
    ])
  ]));

  v.appendChild(h("div", { class: "btn-row" }, [
    h("button", { class: "btn", type: "button", text: "前の問題", disabled: a.cur === 0 ? true : null,
      on: { click: function () { a.cur = Math.max(0, a.cur - 1); saveState(); render(); } } }),
    h("button", { class: "btn", type: "button", text: "次の問題", disabled: a.cur === MINI.length - 1 ? true : null,
      on: { click: function () { a.cur = Math.min(MINI.length - 1, a.cur + 1); saveState(); render(); } } }),
    h("span", { class: "spacer" }),
    h("button", { class: "btn btn--primary", type: "button", text: "採点する", on: { click: gradeAttempt } })
  ]));

  function paint() { clock.textContent = fmtTime(a.elapsed + (a.paused ? 0 : Date.now() - a.startedAt)); }
  paint();
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(paint, 500);
}
function gradeAttempt() {
  var a = S.attempt;
  if (!a.paused) { a.elapsed += Date.now() - a.startedAt; a.paused = true; }
  var sc = attemptScore(computePer(a));
  a.submitted = true;
  S.results.push({ correct: sc.correct, scorable: sc.scorable, at: new Date().toLocaleString("ja-JP"), elapsed: a.elapsed });
  saveState();
  go("result");
}

/* ---------------- 結果 ---------------- */
function viewResult(v) {
  var a = S.attempt;
  v.appendChild(h("div", { class: "page-title", text: "結果" }));
  if (!a || !a.submitted) {
    v.appendChild(card(null, [
      h("p", { class: "muted mb", text: "まだ体験ミニ模試を採点していません。" }),
      h("button", { class: "btn btn--primary", type: "button", text: "体験ミニ模試を始める", on: { click: function () { go("exam"); } } })
    ]));
    return;
  }
  var per = computePer(a);
  var sc = attemptScore(per);
  var na = per.filter(function (p) { return p.state === "UNAVAILABLE"; }).length;

  v.appendChild(h("div", { class: "page-desc", text: "体験ミニ模試（架空データ）の採点結果です。" }));
  v.appendChild(h("div", { class: "grid grid--c4" }, [
    statCard("得点", String(sc.correct), "/ " + sc.scorable, null, "採点対象のみ"),
    statCard("得点率", sc.scorable ? pct(sc.correct / sc.scorable) : "—"),
    statCard("所要時間", fmtTime(a.elapsed)),
    statCard("採点不可", String(na), "問", "stat--na", "母数から除外")
  ]));
  v.appendChild(h("div", { class: "note", text: "採点できない理由は2つだけです。「出典がその問を収録していない」「公式正答が無い」。内容の属性（統計だから等）では採点対象から外しません。正答が無い問題を0点として扱うと、得点率が実力より低く出てしまうためです。" }));

  v.appendChild(card("問題ごとの結果", tableEl(
    [{ label: "問" }, { label: "科目" }, { label: "あなたの回答" }, { label: "正答" }, { label: "判定" }, { label: "" }],
    per.map(function (p) {
      var fin = p.final ? (p.q.options.filter(function (o) { return o.o === p.final; })[0] || {}).label : "未回答";
      var key = p.q.hasKey ? (p.q.options.filter(function (o) { return o.o === p.q.correct; })[0] || {}).label : "—";
      return h("tr", null, [
        td("問" + p.n), td(p.q.subject), td(fin), td(key),
        h("td", null, [
          h("span", { class: "dot dot--" + p.state }), document.createTextNode(" " + OUTCOME[p.state].label),
          p.reason ? h("span", { class: "muted small", text: " (" + p.reason + ")" }) : null
        ]),
        h("td", null, h("button", { class: "btn", type: "button", text: "報告",
          on: { click: function () { openReportModal("問" + p.n + "（" + p.q.subject + "）"); } } }))
      ]);
    }))));

  v.appendChild(card("肢ごとの判断", [
    h("div", { class: "small muted mb", text: "正解した問題でも、迷った肢・分からない肢があれば「正解だが要復習」として復習に回します。" }),
    per.map(function (p) {
      return h("div", { class: "stmt" }, [
        h("div", { class: "stmt-text" }, [h("b", { text: "問" + p.n }), document.createTextNode(" " + p.q.topic)]),
        h("div", { class: "small" }, p.q.statements.map(function (st) {
          var m = p.marks[st.o];
          var lab = m ? ({ TRUE: "正", FALSE: "誤", UNCERTAIN: "△", UNKNOWN: "？" })[m] : "—";
          var truth = st.truth === null ? "正誤なし" : (st.truth ? "正しい" : "誤り");
          return h("div", null, [
            document.createTextNode(String(st.label || st.o) + "：あなたの判断 "),
            h("b", { text: lab }), document.createTextNode(" ／ デモ設定 " + truth)
          ]);
        }))
      ]);
    })
  ]));

  v.appendChild(h("div", { class: "btn-row" }, [
    h("button", { class: "btn", type: "button", text: "復習に進む", on: { click: function () { go("review"); } } }),
    h("button", { class: "btn", type: "button", text: "もう一度受ける",
      on: { click: function () { S.attempt = null; saveState(); go("exam"); } } })
  ]));
}

/* ---------------- 問題マップ ---------------- */
function viewQmap(v) {
  var mode = S.qmap.mode, hidden = S.qmap.hidden;
  var counts = {};
  bucketList(mode).forEach(function (k) { counts[k] = 0; });
  for (var n = 1; n <= 50; n++) counts[bucketOf(LATEST.perQ[n].state, mode)]++;

  v.appendChild(h("div", { class: "page-title", text: "問題マップ" }));
  v.appendChild(h("div", { class: "page-desc", text: LATEST.title + "（架空）・50問の位置をそのまま並べています。" }));

  var cells = [];
  for (var i = 1; i <= 50; i++) {
    var b = bucketOf(LATEST.perQ[i].state, mode);
    var dim = hidden.indexOf(b) >= 0;
    cells.push(h("div", { class: "qcell qcell--" + b + (dim ? " qcell--dim" : ""), text: String(i),
      title: "問" + i + "：" + bucketLabel(b, mode) }));
  }
  v.appendChild(h("div", { class: "card" }, [
    h("div", { class: "btn-row btn-row--mb" }, [
      h("button", { class: "btn", type: "button", text: "4分類", "aria-pressed": mode === "FOUR" ? "true" : "false",
        on: { click: function () { S.qmap.mode = "FOUR"; S.qmap.hidden = []; saveState(); render(); } } }),
      h("button", { class: "btn", type: "button", text: "正誤", "aria-pressed": mode === "BINARY" ? "true" : "false",
        on: { click: function () { S.qmap.mode = "BINARY"; S.qmap.hidden = []; saveState(); render(); } } })
    ]),
    h("div", { class: "legend" }, bucketList(mode).map(function (k) {
      return h("button", { class: "legend__btn", type: "button", "aria-pressed": hidden.indexOf(k) < 0 ? "true" : "false",
        on: { click: function () {
          var idx = S.qmap.hidden.indexOf(k);
          if (idx < 0) S.qmap.hidden.push(k); else S.qmap.hidden.splice(idx, 1);
          saveState(); render();
        } } },
        [h("span", { class: "dot dot--" + k }), document.createTextNode(bucketLabel(k, mode) + " " + counts[k])]);
    })),
    h("div", { class: "qmap" }, cells),
    h("div", { class: "small muted mt", text: "凡例を押すと、その分類を伏せられます。「正誤」表示では安定正解と要復習をまとめて「正解」にしますが、採点不可は正解にも不正解にも入れません。" })
  ]));
}

/* ---------------- 科目・単元分析 ---------------- */
function radarSvg(rows) {
  var size = 260, cx = size / 2, cy = size / 2 + 6, R = 88, N = rows.length;
  function pt(i, r) {
    var ang = -Math.PI / 2 + (i * 2 * Math.PI / N);
    return [cx + Math.cos(ang) * R * r, cy + Math.sin(ang) * R * r];
  }
  function poly(vals) {
    return vals.map(function (r, i) {
      var p = pt(i, Math.max(0, Math.min(1, r)));
      return p[0].toFixed(1) + "," + p[1].toFixed(1);
    }).join(" ");
  }
  var kids = [];
  [0.25, 0.5, 0.75, 1].forEach(function (r) {
    kids.push(svgEl("polygon", { class: "radar__grid", points: poly(rows.map(function () { return r; })) }));
  });
  rows.forEach(function (_, i) {
    var p = pt(i, 1);
    kids.push(svgEl("line", { class: "radar__spoke", x1: String(cx), y1: String(cy), x2: p[0].toFixed(1), y2: p[1].toFixed(1) }));
  });
  kids.push(svgEl("polygon", { class: "radar__target", points: poly(rows.map(function (r) { return r.targetRate || 0; })) }));
  kids.push(svgEl("polygon", { class: "radar__current", points: poly(rows.map(function (r) { return r.rate || 0; })) }));
  rows.forEach(function (r, i) {
    var p = pt(i, 1.24);
    var anchor = p[0] < cx - 6 ? "end" : (p[0] > cx + 6 ? "start" : "middle");
    kids.push(svgEl("text", { class: "radar__label", x: p[0].toFixed(1), y: (p[1] + 4).toFixed(1), "text-anchor": anchor, text: r.subject }));
  });
  return svgEl("svg", { class: "radar", viewBox: "0 0 " + size + " " + (size + 10), role: "img",
    "aria-label": "科目別の得点率（現在値と目標値・架空データ）" }, kids);
}
function lineKey(cls, label) {
  return h("span", { class: "legend-line" }, [
    svgEl("svg", { class: "legend-line__swatch legend-line__swatch--" + cls, width: "26", height: "8" },
      svgEl("line", { x1: "0", y1: "4", x2: "26", y2: "4" })),
    document.createTextNode(label)
  ]);
}
function viewAnalysis(v) {
  var rows = subjectBreakdown(LATEST);
  var topics = [];
  BLUEPRINT.forEach(function (b) { b.topics.forEach(function (t) { topics.push({ subject: b.subject, topic: t }); }); });
  function rateFor(meas, subject, topic) {
    var cells = [];
    for (var n = 1; n <= 50; n++) {
      if (subjectOf(n) !== subject || topicOf(n) !== topic) continue;
      var r = weaknessRate(meas.perQ[n].cell);
      if (r !== null) cells.push(r);
    }
    return averageRate(cells);
  }
  var heatRows = topics.map(function (t) {
    var vals = MEASUREMENTS.map(function (m) { return rateFor(m, t.subject, t.topic); });
    return { subject: t.subject, topic: t.topic, vals: vals, avg: averageRate(vals) };
  });
  var sortIdx = S.heat.sort, dir = S.heat.dir;
  if (sortIdx !== null && sortIdx !== undefined) {
    var keyOf = function (r) { return sortIdx === "avg" ? r.avg : r.vals[sortIdx]; };
    heatRows = heatRows.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
      var av = keyOf(a.r), bv = keyOf(b.r);
      if (av === null && bv === null) return a.i - b.i;
      if (av === null) return 1;
      if (bv === null) return -1;
      return dir === "WEAK" ? bv - av : av - bv;
    }).map(function (x) { return x.r; });
  }

  v.appendChild(h("div", { class: "page-title", text: "科目・単元分析" }));
  v.appendChild(h("div", { class: "page-desc", text: LATEST.title + " までの架空データ。" }));
  v.appendChild(h("div", { class: "grid grid--c2" }, [
    card("科目別の得点率", [
      radarSvg(rows),
      h("div", { class: "small mt" }, [lineKey("solid", "現在値"), lineKey("dash", "目標値")])
    ]),
    card("科目ごとの現在値と目標", [
      tableEl([{ label: "科目" }, { label: "正解", num: true }, { label: "得点率", num: true }, { label: "目標", num: true }, { label: "状態" }],
        rows.map(function (r) {
          var met = r.rate !== null && r.targetRate !== null && r.rate >= r.targetRate;
          return h("tr", null, [
            td(r.subject), td(r.correct + " / " + r.total, true), td(pct(r.rate), true), td(pct(r.targetRate), true),
            h("td", null, h("span", { class: met ? "badge badge--ok" : "badge badge--warn", text: met ? "目標到達" : "未達" }))
          ]);
        }), { narrow: true }),
      h("div", { class: "small muted mt", text: "問48 は採点対象外のため、5問免除の母数は 4 です。" })
    ])
  ]));

  var sortButtons = [h("button", { class: "btn", type: "button", text: "平均で並べ替え",
    on: { click: function () { toggleSort("avg"); } } })];
  MEASUREMENTS.forEach(function (m, i) {
    sortButtons.push(h("button", { class: "btn", type: "button", text: m.title.replace("デモ実力測定 ", "") + "で並べ替え",
      on: { click: function () { toggleSort(i); } } }));
  });
  sortButtons.push(h("button", { class: "btn", type: "button", text: "元に戻す",
    on: { click: function () { S.heat.sort = null; saveState(); render(); } } }));
  sortButtons.push(h("span", { class: "label", text: "並び：" + (sortIdx === null || sortIdx === undefined ? "既定" : (dir === "WEAK" ? "要復習が多い順" : "安定している順")) }));

  var heatTable = h("table", { class: "heat" }, [
    h("thead", null, h("tr", null, [h("th", { text: "単元" }), h("th", { text: "科目" })]
      .concat(MEASUREMENTS.map(function (m) { return h("th", { text: m.title.replace("デモ実力測定 ", "") }); }))
      .concat([h("th", { text: "平均" })]))),
    h("tbody", null, heatRows.map(function (r) {
      return h("tr", null, [h("td", { text: r.topic }), h("td", { class: "muted", text: r.subject })]
        .concat(r.vals.map(function (x) { return heatCell(x, false); }))
        .concat([heatCell(r.avg, true)]));
    }))
  ]);

  v.appendChild(card("単元ヒートマップ（弱点率）", [
    h("div", { class: "small muted mb", text: "弱点率＝(勘違い＋迷い＋分からない) ÷ 判断した肢。判断が無い単元は「—」にして、0% とは表示しません。" }),
    h("div", { class: "btn-row btn-row--mb" }, sortButtons),
    h("div", { class: "scroll-x" }, heatTable)
  ]));

  function toggleSort(key) {
    if (S.heat.sort === key) S.heat.dir = (S.heat.dir === "WEAK" ? "STABLE" : "WEAK");
    else { S.heat.sort = key; S.heat.dir = "WEAK"; }
    saveState(); render();
  }
}
/* 弱点率の濃さは CSSOM で --heat に渡す（style 属性は作らない）。 */
function heatCell(value, bold) {
  var cell = h("td", { class: value === null ? "heat-cell--na" : "heat-cell" },
    bold ? h("b", { text: pct(value) }) : pct(value));
  if (value !== null) cell.style.setProperty("--heat", String(value.toFixed(3)));
  return cell;
}

/* ---------------- 弱点 ---------------- */
function viewWeak(v) {
  var risky = [], wrong = [];
  for (var n = 1; n <= 50; n++) {
    var q = LATEST.perQ[n];
    var row = { n: n, subject: subjectOf(n), topic: topicOf(n), cell: q.cell, rate: weaknessRate(q.cell) };
    if (q.state === "RISK") risky.push(row);
    if (q.state === "WRONG") wrong.push(row);
  }
  var byRate = function (a, b) { return (b.rate || 0) - (a.rate || 0); };
  risky.sort(byRate); wrong.sort(byRate);

  function tbl(rows) {
    if (!rows.length) return h("p", { class: "muted small", text: "該当なし。" });
    return tableEl([{ label: "問" }, { label: "科目" }, { label: "単元" }, { label: "勘違い", num: true },
      { label: "迷い", num: true }, { label: "不明", num: true }, { label: "弱点率", num: true }],
      rows.map(function (r) {
        return h("tr", null, [
          td("問" + r.n), td(r.subject), td(r.topic),
          td(String(r.cell.misconception), true), td(String(r.cell.uncertain), true), td(String(r.cell.unknown), true),
          h("td", { class: "num" }, h("b", { text: pct(r.rate) }))
        ]);
      }));
  }
  v.appendChild(h("div", { class: "page-title", text: "弱点" }));
  v.appendChild(h("div", { class: "page-desc", text: LATEST.title + "（架空）の肢の判断から抽出しています。" }));
  v.appendChild(h("div", { class: "note", text: "正解＝理解している、とは限りません。正解した問題でも、迷った肢や勘違いしていた肢があれば「正解だが要復習」として拾い上げます。四択アプリの正答率だけでは、この層が見えません。" }));
  v.appendChild(card("正解だが要復習（" + risky.length + "問）", tbl(risky), "card-title--risk"));
  v.appendChild(card("不正解（" + wrong.length + "問）", tbl(wrong), "card-title--wrong"));
  v.appendChild(card("採点不可（1問）",
    h("p", { class: "small", text: "問" + UNSCORABLE_Q + "：" + UNSCORABLE_REASON + "。0点にはせず、得点の母数からも弱点の母数からも外しています。" }),
    "card-title--na"));
}

/* ---------------- 復習 ---------------- */
function viewReview(v) {
  var queue = reviewQueue();
  var today = todaySet();
  var acc = today.reduce(function (a, x) { return a + x.minutes; }, 0);
  var doneList = queue.filter(function (x) { return S.reviewDone[String(x.n)]; });

  v.appendChild(h("div", { class: "page-title", text: "復習" }));
  v.appendChild(h("div", { class: "page-desc", text: "弱点から作った「今日の30分セット」（架空データ）。" }));
  v.appendChild(h("div", { class: "grid grid--c3" }, [
    statCard("復習キュー全体", String(queue.length), "問"),
    statCard("今日の30分セット", String(today.length), "問", null, "目安 " + acc + " 分"),
    statCard("復習済み", String(doneList.length), "問", "stat--stable", "チェックすると増えます")
  ]));
  v.appendChild(h("div", { class: "note", text: "年度によって数字が変わる統計の問題は、得点には数えても復習キューには載せません。いま覚え直す知識ではないためです。" }));

  v.appendChild(card("今日やる分", tableEl(
    [{ label: "" }, { label: "問" }, { label: "科目" }, { label: "単元" }, { label: "理由" }, { label: "目安", num: true }],
    today.map(function (x) {
      var cb = h("input", { type: "checkbox", "aria-label": "問" + x.n + " を復習済みにする" });
      cb.checked = !!S.reviewDone[String(x.n)];
      cb.addEventListener("change", function () {
        if (cb.checked) S.reviewDone[String(x.n)] = true;
        else delete S.reviewDone[String(x.n)];
        saveState(); render();
      });
      return h("tr", null, [
        h("td", null, cb), td("問" + x.n), td(x.subject), td(x.topic),
        h("td", null, [h("span", { class: "dot dot--" + x.state }), document.createTextNode(" " + OUTCOME[x.state].label)]),
        td(x.minutes + "分", true)
      ]);
    }))));

  v.appendChild(card("復習済み（" + doneList.length + "問）", doneList.length
    ? tableEl([{ label: "問" }, { label: "科目" }, { label: "単元" }, { label: "弱点率", num: true }],
      doneList.map(function (x) {
        return h("tr", null, [td("問" + x.n), td(x.subject), td(x.topic), td(pct(x.rate), true)]);
      }))
    : h("p", { class: "muted small", text: "まだありません。" })));
}

/* ---------------- 用語辞書 ---------------- */
function viewGlossary(v) {
  v.appendChild(h("div", { class: "page-title", text: "用語辞書" }));
  v.appendChild(h("div", { class: "page-desc", text: "デモ用の簡略な説明です。学習用の正確な定義ではありません。" }));

  var input = h("input", { class: "field__input", type: "search", placeholder: "用語を検索", "aria-label": "用語を検索", maxlength: "60" });
  var list = h("div");
  v.appendChild(h("div", { class: "card" }, input));
  v.appendChild(list);

  function paint() {
    var qv = String(input.value || "").trim();
    var found = GLOSSARY.filter(function (g) {
      return !qv || g.term.indexOf(qv) >= 0 || g.reading.indexOf(qv) >= 0 || g.body.indexOf(qv) >= 0;
    });
    clear(list);
    if (!found.length) {
      /* 検索語をそのまま画面に出す唯一の箇所。textContent 経由なので HTML にはならない。 */
      list.appendChild(card(null, h("p", { class: "muted small", text: "「" + qv + "」に一致する用語はありません。" })));
      return;
    }
    found.forEach(function (g) {
      list.appendChild(h("div", { class: "card" }, [
        h("div", { class: "card-title" }, [
          document.createTextNode(g.term),
          h("span", { class: "label", text: "  " + g.reading })
        ]),
        h("div", { class: "small", text: g.body })
      ]));
    });
  }
  input.addEventListener("input", paint);
  paint();
}

/* ---------------- みんなの成績 ---------------- */
function viewPeers(v) {
  var rows = PEERS.slice().sort(function (a, b) { return (b.score / b.max) - (a.score / a.max); });
  var avg = rows.reduce(function (a, r) { return a + r.score / r.max; }, 0) / rows.length;
  var view = S.peerView;

  v.appendChild(h("div", { class: "page-title", text: "みんなの成績" }));
  v.appendChild(h("div", { class: "page-desc", text: PEER_CLASSROOM + " ・ 実力測定の点数だけを比べています。" }));
  v.appendChild(h("div", { class: "note", text: "架空の受講生です。共有するのは 表示名・点数・満点・受験回数・最新受験日 だけで、回答・肢ごとの判断・メモ・復習履歴は共有しません。教室ごとにON/OFFでき、既定はOFFです。満点が違っても比べられるよう、比較は得点率を中心にしています。" }));

  var body;
  if (view === "TABLE") {
    body = tableEl([{ label: "受講生" }, { label: "得点", num: true }, { label: "得点率", num: true },
      { label: "実力測定", num: true }, { label: "最新受験日" }],
      rows.map(function (r) {
        return h("tr", { class: r.self ? "self" : null }, [
          h("td", null, [document.createTextNode(r.name), r.self ? h("span", { class: "badge badge--self", text: "あなた" }) : null]),
          td(r.score + " / " + r.max, true),
          h("td", { class: "num" }, h("b", { text: pct(r.score / r.max) })),
          td(r.count + "回", true), td(r.date, false, "muted small")
        ]);
      }).concat([
        h("tr", null, [
          h("td", null, h("b", { text: "教室平均" })), td("—", true, "muted"),
          h("td", { class: "num" }, h("b", { text: pct(avg) })), td("—", true, "muted"), td("")
        ])
      ]));
  } else {
    body = h("div", { class: "bars" }, rows.map(function (r) {
      var p = r.score / r.max;
      var fill = h("div", { class: "bar__fill" + (r.self ? " bar__fill--self" : "") });
      fill.style.setProperty("--w", (p * 100).toFixed(1) + "%");
      var marker = h("div", { class: "bar__avg" });
      marker.style.setProperty("--avg", (avg * 100).toFixed(1) + "%");
      return h("div", null, [
        h("div", { class: "bar-head" }, [
          h("span", null, [document.createTextNode(r.name), r.self ? h("span", { class: "badge badge--self", text: "あなた" }) : null]),
          h("span", { class: "muted", text: pct(p) + "（" + r.score + "/" + r.max + "）" })
        ]),
        h("div", { class: "bar" }, [fill, marker])
      ]);
    }).concat([
      h("div", { class: "small muted" }, [h("span", { class: "avg-key" }), document.createTextNode(" 教室平均 " + pct(avg))])
    ]));
  }

  v.appendChild(h("div", { class: "card" }, [
    h("div", { class: "btn-row btn-row--mb" }, [
      h("button", { class: "btn", type: "button", text: "表", "aria-pressed": view === "TABLE" ? "true" : "false",
        on: { click: function () { S.peerView = "TABLE"; saveState(); render(); } } }),
      h("button", { class: "btn", type: "button", text: "グラフ", "aria-pressed": view === "CHART" ? "true" : "false",
        on: { click: function () { S.peerView = "CHART"; saveState(); render(); } } })
    ]),
    body
  ]));
}

/* ---------------- アカウント（すべて疑似操作） ---------------- */
function viewAccount(v) {
  v.appendChild(h("div", { class: "page-title", text: "アカウント" }));
  v.appendChild(h("div", { class: "page-desc", text: "架空のプロフィールです。ログイン機能はありません。" }));
  v.appendChild(h("div", { class: "locked" }, [
    h("span", { text: "🔒" }),
    h("span", { text: "このデモではアカウントの作成・変更・退会・教室参加はできません。ボタンは反応しますが、通信も保存も行いません。" })
  ]));

  v.appendChild(h("div", { class: "grid grid--c2" }, [
    card("プロフィール", [
      h("dl", { class: "kv" }, [
        h("dt", { text: "ニックネーム" }), h("dd", { text: ACCOUNT.nickname }),
        h("dt", { text: "ユーザー名" }), h("dd", { text: ACCOUNT.handle }),
        h("dt", { text: "メール" }), h("dd", { text: ACCOUNT.email }),
        h("dt", { text: "所属教室" }), h("dd", { text: ACCOUNT.classroom }),
        h("dt", { text: "区分" }), h("dd", { text: ACCOUNT.role }),
        h("dt", { text: "状態" }), h("dd", null, h("span", { class: "badge badge--ok", text: ACCOUNT.status })),
        h("dt", { text: "プラン" }), h("dd", { text: ACCOUNT.plan })
      ]),
      h("div", { class: "small muted mt", text: "メールアドレスは規格上必ず存在しないドメイン（example.invalid）を使った架空の値です。" })
    ]),
    card("学習設定", [
      h("dl", { class: "kv" }, [
        h("dt", { text: "学習開始日" }), h("dd", { text: ACCOUNT.startedOn }),
        h("dt", { text: "受験予定日" }), h("dd", { text: ACCOUNT.examDate }),
        h("dt", { text: "1日の目安" }), h("dd", { text: ACCOUNT.dailyMinutes + " 分" })
      ]),
      h("div", { class: "card-title mt", text: "科目別の目標" }),
      tableEl([{ label: "科目" }, { label: "目標", num: true }], SUBJECTS.map(function (s) {
        var t = TARGETS[s];
        return h("tr", null, [td(s), td(t.t + " / " + t.max, true)]);
      }), { narrow: true })
    ])
  ]));

  /* プロフィール編集フォーム：submit は必ず preventDefault、保存もしない。 */
  var nick = h("input", { class: "field__input", type: "text", value: ACCOUNT.nickname, maxlength: "40", "aria-label": "ニックネーム" });
  var exam = h("input", { class: "field__input", type: "text", value: ACCOUNT.examDate, maxlength: "20", "aria-label": "受験予定日" });
  var profForm = h("form", { on: { submit: function (e) { e.preventDefault(); blockedAction(); } } }, [
    h("div", { class: "field" }, [h("label", { class: "field__label", text: "ニックネーム" }), nick]),
    h("div", { class: "field" }, [h("label", { class: "field__label", text: "受験予定日" }), exam,
      h("div", { class: "field__hint", text: "入力しても保存されません（デモ）。" })]),
    h("div", { class: "btn-row" }, [
      h("button", { class: "btn btn--primary", type: "submit", text: "保存する" }),
      h("button", { class: "btn", type: "button", text: "問い合わせ", on: { click: function () { openReportModal("アカウントについて"); } } })
    ])
  ]);
  v.appendChild(card("プロフィールを編集", profForm));

  v.appendChild(card("通知設定", [
    h("div", null, ACCOUNT.notify.map(function (nf) {
      var box = h("input", { type: "checkbox", "aria-label": nf.label });
      box.checked = nf.on;
      box.addEventListener("change", function () {
        box.checked = nf.on;          // 変更を戻す＝保存されないことを見せる
        blockedAction();
      });
      return h("div", { class: "switch-row" }, [
        h("div", null, [h("div", { text: nf.label }), h("div", { class: "label", text: nf.desc })]),
        box
      ]);
    })),
    h("div", { class: "small muted mt", text: "切り替えても元に戻ります。デモでは設定を保存しません。" })
  ]));

  v.appendChild(card("アカウント操作", [
    h("p", { class: "small muted mb", text: "本番では次の操作ができますが、このデモではすべて無効です。" }),
    h("div", { class: "btn-row" }, [
      h("button", { class: "btn", type: "button", text: "メールアドレスを変更", on: { click: blockedAction } }),
      h("button", { class: "btn", type: "button", text: "パスワードを変更", on: { click: blockedAction } }),
      h("button", { class: "btn", type: "button", text: "教室に参加する", on: { click: blockedAction } }),
      h("button", { class: "btn", type: "button", text: "招待を受け入れる", on: { click: blockedAction } })
    ]),
    h("div", { class: "btn-row btn-row--mt" }, [
      h("button", { class: "btn btn--danger", type: "button", text: "退会する", disabled: true }),
      h("span", { class: "label", text: "退会はデモでは押せないようにしています。" })
    ])
  ]));
}

/* ---------------- リセット確認 ---------------- */
function askReset() {
  openModal({
    title: "デモをリセットしますか？",
    desc: "このデモ専用の保存データ（体験ミニ模試の回答・表示設定・復習のチェック）だけを消して、初期のサンプルデータに戻します。他のサイトやアプリのデータには触れません。",
    actions: [
      h("button", { class: "btn", type: "button", text: "やめる", on: { click: closeModal } }),
      h("button", { class: "btn btn--danger", type: "button", text: "リセットする", on: { click: function () {
        resetDemo(); closeModal(); go("dashboard"); render();
        toast("デモをリセットしました。", "初期のサンプルデータに戻しました。", "ok");
      } } })
    ]
  });
}

/* ==================================================================
   8. ルーティング
================================================================== */
var VIEWS = {
  dashboard: viewDashboard, exam: viewExam, result: viewResult, qmap: viewQmap,
  analysis: viewAnalysis, weak: viewWeak, review: viewReview,
  glossary: viewGlossary, peers: viewPeers, account: viewAccount
};

function renderTabs(cur) {
  var nav = clear(document.getElementById("tabs"));
  ROUTES.forEach(function (r) {
    nav.appendChild(h("a", { class: "tab" + (r.id === cur ? " tab--on" : ""), href: "#/" + r.id,
      text: r.label, "aria-current": r.id === cur ? "page" : null }));
  });
}
function render() {
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  var cur = currentRoute();
  renderTabs(cur);
  var v = clear(document.getElementById("view"));
  VIEWS[cur](v);
  window.scrollTo(0, 0);
}

document.getElementById("resetBtn").addEventListener("click", askReset);
window.addEventListener("hashchange", render);
document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
render();
