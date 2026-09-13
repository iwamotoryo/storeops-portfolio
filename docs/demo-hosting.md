# デモの公開方法とセキュリティヘッダ

`demo/takken/` のデモを公開するときの前提をまとめます。**結論として GitHub Pages は使いません。**

## なぜ GitHub Pages を使わないか

GitHub Pages は**カスタムHTTPレスポンスヘッダを設定できません**。リポジトリに `_headers` を置いても読まれません。

これは見た目の問題ではなく、次の対策が成立しないことを意味します。

| 対策 | ヘッダ | GitHub Pages |
| --- | --- | --- |
| クリックジャッキング防止 | `Content-Security-Policy: frame-ancestors 'none'` | **設定不可** |
| 同上（互換） | `X-Frame-Options: DENY` | **設定不可** |
| 外部通信の遮断 | `Content-Security-Policy: connect-src 'none'` | **設定不可** |
| MIME type sniffing 防止 | `X-Content-Type-Options: nosniff` | **設定不可** |

`frame-ancestors` は `<meta>` では**仕様上無視されます**。`X-Frame-Options` も meta では効きません。つまり meta タグでの代用はできず、「HTMLに書いたから大丈夫」とは言えません。

ヘッダを付けられない場所に置くと、第三者が自分のサイトにこのデモを `<iframe>` で埋め込み、上に透明な要素を重ねて別の操作をさせる（クリックジャッキング）ことを防げません。デモ自体は本番データを持たないため被害範囲は限定的ですが、ポートフォリオとして「対策済み」とは言えない状態になります。

## 使えるホスティング（どちらも無料枠あり）

`_headers`（リポジトリ直下）をそのまま読んでくれます。追加の設定ファイルは要りません。

### Cloudflare Pages（推奨）
1. Cloudflare ダッシュボード → Workers & Pages → Create → Pages → Connect to Git
2. `iwamotoryo/storeops-portfolio` を選択
3. Framework preset: **None**、Build command: **空欄**、Output directory: **`/`**
4. デプロイ後、`_headers` が自動で適用される

### Netlify
1. Add new site → Import an existing project → リポジトリを選択
2. Build command: 空欄、Publish directory: `.`
3. `_headers` が自動で適用される

`netlify.toml` を使う書き方でも同じことができますが、`_headers` 一枚で両対応できるためファイルを増やしていません。

## 公開後に必ず確認するコマンド

```bash
curl -sI https://<公開URL>/demo/takken/index.html | grep -iE 'content-security-policy|x-frame-options|x-content-type|referrer-policy|permissions-policy|x-robots-tag'
```

`frame-ancestors 'none'` と `X-Frame-Options: DENY` の両方が返っていることを確認してください。返っていなければ公開を取り下げます。

## 設定しているヘッダ

`_headers` の内容がそのまま適用されます。デモ配下（`/demo/takken/*`）の CSP は次のとおりです。

```
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' data:;
font-src 'self';
connect-src 'none';
object-src 'none';
media-src 'none';
child-src 'none';
frame-src 'none';
worker-src 'none';
manifest-src 'none';
form-action 'none';
base-uri 'none';
frame-ancestors 'none'
```

補足:

- `script-src 'self'` / `style-src 'self'` に **`'unsafe-inline'` を付けていません**。そのために CSS と JS を `demo.css` / `demo.js` へ分離し、インラインの `onclick` も `style="..."` 属性も生成しない作りにしています（可変の色や幅は CSSOM 経由で設定しています。CSSOM は `style-src` の対象外です）。
- `connect-src 'none'` により、仮にスクリプトが書き換えられても外部への通信自体がブラウザに拒否されます。デモのコードには元から `fetch` 等がありません。
- `form-action 'none'` により、フォームの送信先を差し込まれても送信されません。
- `X-Robots-Tag: noindex, nofollow` はデモ配下だけに付けています。ポートフォリオ本体の検索エンジン向けの扱いは変えていません。

## デモを `<meta>` CSP にしていない理由

1. `frame-ancestors` が meta では無視されるため、肝心のクリックジャッキング対策が入らない
2. meta で `default-src 'self'` を付けると、手元で `index.html` をダブルクリックして開いた場合（`file://`）に `demo.css` / `demo.js` が読めなくなる

ヘッダを正とし、meta は置かない、という判断です。
