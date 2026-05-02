# 個人用TODOダッシュボード 設計書

## 構成変更

### 変更前

```text
GAS HTML Service
  ├─ Code.gs
  ├─ Index.html
  ├─ css.html
  └─ js.html

DB: Googleスプレッドシート
```

### 変更後

```text
Git管理フロントエンド
  ├─ index.html
  ├─ styles.css
  ├─ app.js
  └─ config.js

GAS API
  └─ gas-api/Code.gs

DB: Googleスプレッドシート
```

## 目的

- GAS HTML Serviceの描画負荷を下げる
- UIコードをGitで差分管理しやすくする
- GASをAPI役へ限定する
- 将来的にFirebase、Cloud Run、Supabaseなどへ移行しやすい境界にする

## 画面構成

- 上部: 検索、フィルター、クイックリンク、通知ベル、新規タスク
- 左: 開閉可能なサイドバー
- 中央: タスク一覧テーブル、タスク詳細編集、通知センター
- 右: 今日のスケジュール

## UI方針

- タスクはカード形式ではなくテーブル形式で表示する
- 中央のタスク管理を主役にする
- 右側のスケジュールは補助情報としてコンパクトに表示する
- ルーティンはスケジュールのタイムライン内バーにはせず、タイムライン上部に現在時間帯の1行表示として出す
- 通知センターはタスク詳細の右側エリアに表示する
- 現在時刻ラインを右側スケジュールに表示する
- 左サイドバーの開閉状態は `localStorage` に保存する

## スプレッドシート構成

### Tasks

| 列 | 内容 |
| --- | --- |
| ID | タスクID |
| タイトル | タスク名 |
| 内容 | 詳細 |
| ステータス | 未着手 / 作業中 / 保留 / 完了 |
| 優先度 | 高 / 中 / 低 |
| 進捗 | 0-100の数値。UIでは横棒グラフ表示 |
| 今日やるフラグ | boolean |
| 期限 | yyyy-MM-dd |
| カテゴリ | 任意 |
| 種別 | 任意 |
| 関連URL | 将来連携用。現UIでは非表示 |
| ChatGPT URL | ChatGPT会話や設計相談リンク |
| フォルダURL | タスク追加時に自動作成するDriveフォルダURL |
| 次アクション | 次にやること |
| 並び順 | 表示順 |
| 作成日 | 作成日時 |
| 更新日 | 更新日時 |

設計書チェック列はUI/APIの新仕様では使用しない。
既存シートに列が残っていても読み書き対象から外す。

### ImprovementIdeas

| 列 | 内容 |
| --- | --- |
| ID | 改善アイディアID |
| TaskID | 紐づくTasks.ID |
| タイトル | 改善アイディア名 |
| 内容 | 詳細 |
| ステータス | 未着手 / 検討中 / 採用 / 保留 / 完了 / 反映済み |
| 優先度 | 高 / 中 / 低 |
| 作成日 | 作成日時 |
| 更新日 | 更新日時 |

### QuickLinks

| 列 | 内容 |
| --- | --- |
| ID | クイックリンクID |
| 名前 | 表示名 |
| URL | 遷移先URL |
| アイコン画像URL | favicon等 |
| 並び順 | 表示順 |
| 表示フラグ | boolean |
| 作成日 | 作成日時 |
| 更新日 | 更新日時 |

### CalendarEvents

| 列 | 内容 |
| --- | --- |
| ID | GoogleカレンダーイベントID |
| 予定名 | タイトル |
| 開始時刻 | Date |
| 終了時刻 | Date |
| カレンダー種別 | カレンダー名 |
| 場所 | 場所 |
| URL | カレンダーURL |
| 説明 | 説明 |
| 取得日 | 取得日時 |

### Routines

| 列 | 内容 |
| --- | --- |
| ID | ルーティンID |
| ルーティン名 | 名称 |
| 説明 | 説明 |
| 頻度 | 毎日 / 平日 / 休日 / 曜日指定 |
| 曜日 | 曜日指定用 |
| 祝日フラグ | 祝日実行可否 |
| 実行目安時刻 | HH:mm |
| 有効/無効 | boolean |

### RoutineLogs

| 列 | 内容 |
| --- | --- |
| ID | ログID |
| ルーティンID | 紐づくRoutines.ID |
| 実行日 | yyyy-MM-dd |
| 完了フラグ | boolean |

### Notifications

| 列 | 内容 |
| --- | --- |
| ID | 通知ID |
| 種別 | slack / gmail / system / rss |
| タイトル | 通知タイトル |
| 内容 | 1行説明 |
| ステータス | success / error / action_required / info |
| 優先度 | high / medium / low |
| 発生時刻 | HH:mm または日時 |
| リンクURL | 外部リンク |
| リンクラベル | リンクボタン表示名 |
| 確認済みフラグ | boolean |
| 要対応フラグ | boolean |
| 所要時間 | 自動処理の実行時間 |
| 詳細 | エラー詳細など |
| 作成日 | 作成日時 |
| 更新日 | 更新日時 |

### QuickTodos

クイックTODOを一時的に管理するシート。必要に応じて案件化して `Tasks` に移す。
新規列は既存データ保護のため末尾に追加する。

| 列 | 内容 |
| --- | --- |
| ID | QuickTodo ID |
| タイトル | TODO名 |
| 完了フラグ | boolean |
| 作成日 | 作成日時 |
| 更新日 | 更新日時 |
| 参考URL | Amazon、記事、メモなど外部リンク。空欄可 |
| 期限 | yyyy-MM-dd。空欄可 |
| 優先度 | 高 / 中 / 低 |

### ShoppingList

買い物リストを管理するシート。
新規列は既存データ保護のため末尾に追加する。

| 列 | 内容 |
| --- | --- |
| ID | 買い物リストID |
| 商品名 | 商品名 |
| 完了フラグ | boolean |
| 作成日 | 作成日時 |
| 更新日 | 更新日時 |
| 参考URL | 商品ページなど外部リンク。空欄可 |
| カテゴリ | 任意 |
| 数量 | 任意 |

## API設計

GAS Web AppのURLへ `action` を渡す。
フロントエンドから直接呼ぶため、GAS Webアプリは利用者がアクセス可能な公開範囲にする。

### GET

- `getInitialData`
- `getTasks`
- `getQuickLinks`
- `getTodayEvents`
- `refreshTodayEvents`
- `getRoutines`
- `getImprovementIdeas`
- `getNotifications`
- `getQuickTodos`
- `getShoppingList`

### POST

JSON body:

```json
{
  "action": "updateTask",
  "payload": {}
}
```

対応アクション:

- `addTask`
- `updateTask`
- `deleteTask`
- `setRoutineLog`
- `addImprovementIdea`
- `updateImprovementIdea`
- `deleteImprovementIdea`
- `markImprovementDone`
- `markNotificationRead`
- `addQuickTodo`
- `updateQuickTodo`
- `deleteQuickTodo`
- `convertQuickTodoToTask`
- `addShoppingItem`
- `updateShoppingItem`
- `deleteShoppingItem`

## タスク作成

- 新規タスクIDは `A001` 形式で採番する
- 既存の `A-001` 形式IDは `setupSpreadsheet()` 実行時に `A001` 形式へ変換する
- 新規タスク追加時のみ、親フォルダ `13ieQmaXSYh3UeUPkfputJioe3tQJh6pG` 配下にDriveフォルダを作成する
- フォルダ名は `タスクID_タイトル` とし、取得したURLを `フォルダURL` に保存する
- `関連URL` と `ChatGPT URL` は別列で管理する

## 改善アイディア

- 通常表示は未反映のみ
- `反映済み` タブで反映済みアイディアを表示する
- `markImprovementDone(id)` は対象行の `ステータス` を `反映済み`、`更新日` を現在日時に更新する

## QuickTodos / ShoppingList

- `QuickTodos` と `ShoppingList` は独立ページとして表示し、案件管理ダッシュボードの右カラムには表示しない
- ページ切り替えはヘッダーのボタンで行う
- ヘッダーは全ページ共通で表示する
- ページ状態は `dashboard` / `quickTodos` / `shoppingList` を持つ
- ページ切り替え時は現在ページのUIのみを描画し、非アクティブページは画面DOMから外す
- `dashboard` 以外では Tasks / 通知センター / カレンダー / ウィークリーレポートを表示しない
- 入力フォームには本文と `参考URL` を持つ
- `参考URL` は空欄可。URL形式でなくても保存可能とする
- 表示時は `参考URL` がある場合のみ小さめpill型の `開く` ボタンを表示し、`target="_blank"` で開く
- `QuickTodos` は未完了 / 完了済み切り替え、期限、優先度、編集、削除を持つ
- `QuickTodos` は `案件化` ボタンで `Tasks` に通常タスクとして追加できる
- `QuickTodos` の案件化は既存の `Tasks` 構造を変更しない
- `ShoppingList` は未購入 / 購入済み切り替え、カテゴリ、数量、編集、削除を持つ
- `ShoppingList` はチェック状態を保存できる
- 通知センターには影響を与えない

## 通知センター

既存の自動実行ログデータを通知データとして扱う。
通知データは `Notifications` シートから `getNotifications` / `getInitialData` 経由で取得する。
`setupSpreadsheet()` は `Notifications` シートとヘッダーを作成するが、通知のダミーデータは投入しない。

表示仕様:
- 通知センターはタスク詳細右側にカードリスト形式で表示する
- テーブルヘッダーは置かず、1通知を1カードとしてタイトル、内容、発生時刻、ステータス、種別、アクションを表示する
- 並び順は要対応、エラー、未確認、完了・確認済みの優先順位とし、同カテゴリ内は新しい順にする
- 要対応通知は通知センター上部に固定表示する
- 完了通知は緑系、エラー通知は赤系、要対応通知は黄系、情報通知はグレー系で区別する
- 詳細はカード内で開閉表示せず、必要な場合は `リンクURL` のリンク先で確認する
- 通常表示は未確認のみ
- `アーカイブ` タブで確認済み通知を表示する
- `確認済みにする` は `確認済みフラグ` を `TRUE` に更新する
- 失敗通知も再実行ボタンは表示せず、`確認済みにする` のみ表示する
- link_url がある通知は「開く」を表示する

拡張フィールド:
- `id`
- `type`: slack / gmail / system / rss
- `title`
- `description`
- `status`: success / error / action_required / info
- `priority`: high / medium / low
- `created_at`
- `link_url`
- `link_label`
- `is_read`
- `requires_action`
- `detail`

- 10:32 インスタグラム巡回 完了
- 10:35 AI関連記事収集 完了
- 10:40 自動化ツール実行状況 失敗

将来的にはGAS側に `AutomationLogs` シート、Slack/Gmail通知、外部ログAPIを追加し、同じ通知センターUIに接続する。
