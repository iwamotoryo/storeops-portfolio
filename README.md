# Ryo Iwamoto — Business / DX / Product Portfolio

**事業・現場・ITをつなぎ、企画から実装・運用改善まで。**

新規事業の立ち上げ、店舗の運営、自治体事業の受託運営、業務システムの開発と本番運用に携わってきました。現場の課題を整理するところから、必要であれば自分で実装して運用改善まで担当します。

| 強み | 内容 |
| --- | --- |
| **Business / BizDev** | 新規事業の企画・提案、会社・店舗の立ち上げと運営、自治体との調整 |
| **PM / Requirements** | ヒアリング、業務フロー整理、要件定義、優先順位付け、導入計画 |
| **DX / Business Process** | 分散した台帳・ツールの統合、データ移行・名寄せ、運用ルールの設計 |
| **Web / System Development** | UI・DB・API 設計、実装、VPS での本番運用、障害対応 |
| **AI-assisted Development** | 生成AIを設計・実装・テストに活用。判断と検証は自分で行う |

## Selected Projects

| # | プロジェクト | 状態 | 役割 | キーワード |
| --- | --- | --- | --- | --- |
| 1 | [美容室向け業務管理システム](case-studies/salon-admin.md)（moon hair） | `Production` | 要件整理〜実装・本番運用 | Notion等からの移行 / 会計・値引き / 指名売上レポート |
| 2 | [ドッグサロン向け予約・顧客管理システム](case-studies/dogsalon-admin.md)（moon fur） | `Production` | 要件定義〜実装・本番運用 | LINE Login・LIFF / 複数ペット / 犬種×コース料金 / ホテル |
| 3 | [レンタカー予約・会員・管理システム](case-studies/rentacar-system.md) | `Production` | 要件整理〜実装・VPS運用 | 空き判定 / 料金計算 / LINE Mini App |
| 4 | [宅建学習・分析システム](case-studies/takken-training.md)（[▶ デモ](demo/takken/index.html)） | `Beta` | 企画〜実装・テスト | 肢単位の分析 / ローカルファースト / CI |
| 5 | [介護用品レンタル会社の業務改善・DX](case-studies/care-dx-planning.md) | `Case Study` | 現状分析・要件定義・設計・導入計画 | ヒアリング / 業務フロー / v1範囲定義 |
| 6 | [自治体向けフリーランス育成事業](case-studies/rocks-municipal-education.md)（Rocks合同会社） | `Business` | 企画・提案・PM・運営 | 新規事業 / 自治体受託 / 教育 |

`Production` 本番運用中 ／ `Beta` 限定公開に向けて準備中 ／ `Case Study` 設計・計画フェーズ（実装前） ／ `Business` 事業の企画・運営の事例

## 仕事の進め方

```
事業・現場の課題を理解 → 業務フロー整理 → 要件定義 → UI / DB / システム設計
  → 実装（AI支援を活用） → 本番導入 → 運用改善
```

各ケーススタディは、背景・課題、自分の役割、主な意思決定、設計、技術構成、導入・運用、成果、公開範囲の順にまとめています。数値は資料で確認できたものだけを記載しています。

## ドキュメント

- [システム構成と技術](docs/system-architecture.md)：実案件で使っている3つの構成パターン
- [セキュリティ方針](docs/security-policy.md)：公開する情報・しない情報、スクリーンショットの扱い
- [AI活用方針](docs/ai-assisted-development-policy.md)
- [DB設計例](docs/database-design.md) ／ [API設計例](docs/api-design.md)（一般化した例）
- [スクリーンショット一覧](screenshots/README.md)（ダミーデータ・デモデータのみ）

このリポジトリは、実案件を匿名化・一般化した資料です。本番のソースコード・顧客情報・シークレット・サーバ情報は含めていません。
