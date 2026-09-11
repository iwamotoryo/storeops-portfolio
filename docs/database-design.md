# DB設計例（一般化）

> 本ドキュメントは、店舗業務システムを一般化したDB設計の**例**です。本番DBの実テーブル・実カラム・実データではありません。実際の案件では、要件に応じてテーブル構成・カラム・制約は異なります。
>
> 参考までに、実案件では美容室で約30、ドッグサロンで約80のモデル（Prisma）を扱っています。予約（Appointment）と来店・会計（Visit）の分離、犬種 × コースの料金マトリクスなどの考え方は各ケーススタディで説明しています。

## 設計の考え方

- 店舗（stores）を起点に、顧客・スタッフ・予約・売上などを関連付ける
- 個人情報を持つテーブル（customers など）はアクセス制御の対象とする
- 重要な操作は監査ログ（audit_logs）に残し、追跡できるようにする
- 業種によって必要なテーブルは異なる（ペット業ならpets、レンタカー業ならvehicles など）

## テーブル一覧

| テーブル | 目的 |
| --- | --- |
| stores | 店舗（拠点）情報 |
| users | システム利用者（ログインアカウント） |
| customers | 顧客（エンドユーザー）情報 |
| pets | ペット情報（ペット業向け） |
| vehicles | 車両情報（レンタカー業向け） |
| reservations | 予約のヘッダ情報 |
| reservation_items | 予約の明細（メニュー・オプションなど） |
| sales | 売上（会計）情報 |
| staff | スタッフ情報 |
| audit_logs | 操作の監査ログ |

---

## stores（店舗）

店舗・拠点を表すテーブル。複数店舗を扱う場合、ほかのテーブルから参照される起点になります。

主なカラム例：
- `id`：店舗ID（主キー）
- `name`：店舗名
- `status`：状態（営業中／休止など）
- `created_at` / `updated_at`：作成・更新日時

## users（利用者アカウント）

システムにログインするアカウント。スタッフや管理者が利用します。

主なカラム例：
- `id`：ユーザーID（主キー）
- `login_id`：ログイン識別子
- `password_hash`：パスワードのハッシュ（平文は保持しない）
- `role`：権限（管理者／スタッフなど）
- `store_id`：所属店舗（stores への参照）
- `created_at` / `updated_at`

## customers（顧客）

エンドユーザー（顧客）情報。個人情報を含むため、アクセス制御の対象です。

主なカラム例：
- `id`：顧客ID（主キー）
- `store_id`：登録店舗（stores への参照）
- `name`：氏名（※ポートフォリオには実データを載せない）
- `contact`：連絡先（※同上）
- `note`：メモ（施術上の注意点など）
- `created_at` / `updated_at`

## pets（ペット）

ペット業向け。1人の顧客（飼い主）に複数のペットが紐づきます。

主なカラム例：
- `id`：ペットID（主キー）
- `customer_id`：飼い主（customers への参照）
- `breed`：犬種など
- `size`：体格区分
- `note`：性格・注意点
- `created_at` / `updated_at`

## vehicles（車両）

レンタカー業向け。店舗に紐づく車両を管理します。

主なカラム例：
- `id`：車両ID（主キー）
- `store_id`：所属店舗（stores への参照）
- `car_type`：車種区分
- `status`：状態（貸出可／貸出中／整備中など）
- `created_at` / `updated_at`

## reservations（予約ヘッダ）

予約の基本情報。誰が・いつ・どの店舗で予約したかを表します。

主なカラム例：
- `id`：予約ID（主キー）
- `store_id`：店舗（stores への参照）
- `customer_id`：顧客（customers への参照）
- `staff_id`：担当スタッフ（staff への参照、任意）
- `start_at` / `end_at`：予約の開始・終了日時
- `status`：状態（予約済／完了／キャンセルなど）
- `created_at` / `updated_at`

## reservation_items（予約明細）

1件の予約に含まれるメニュー・コース・オプションなどの明細。予約ヘッダに対して複数の明細が紐づきます。

主なカラム例：
- `id`：明細ID（主キー）
- `reservation_id`：予約（reservations への参照）
- `item_type`：種別（メニュー／オプションなど）
- `name`：項目名
- `price`：金額
- `quantity`：数量
- `created_at` / `updated_at`

## sales（売上）

会計・売上情報。予約や顧客と紐づけて集計します。

主なカラム例：
- `id`：売上ID（主キー）
- `store_id`：店舗（stores への参照）
- `reservation_id`：対象予約（reservations への参照、任意）
- `staff_id`：担当スタッフ（staff への参照）
- `total_amount`：合計金額
- `payment_method`：支払い方法
- `sold_at`：売上計上日時
- `created_at` / `updated_at`

## staff（スタッフ）

施術・接客を担当するスタッフ情報。売上やスタッフ別実績の集計に利用します。

主なカラム例：
- `id`：スタッフID（主キー）
- `store_id`：所属店舗（stores への参照）
- `name`：氏名（※ポートフォリオには実データを載せない）
- `status`：状態（在籍／退職など）
- `created_at` / `updated_at`

## audit_logs（監査ログ）

「誰が・いつ・何をしたか」を記録するテーブル。重要な操作の追跡や、不正・誤操作の調査に利用します。

主なカラム例：
- `id`：ログID（主キー）
- `user_id`：操作したユーザー（users への参照）
- `action`：操作内容（作成／更新／削除など）
- `target`：対象（テーブル名・レコードIDなど）
- `created_at`：操作日時

---

## 注意（本番DBについて）

本ドキュメントは設計の考え方を示す**一般化した例**です。**本番DBの実テーブル名・実カラム・実データ・スキーマダンプは一切含めていません。** 実データやダンプファイル（`*.dump`、`*.sqlite`、`*.db` など）は公開リポジトリに含めない方針です（[.gitignore](../.gitignore) 参照）。
