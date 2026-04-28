# 俺のTODO管理 Web App

GAS HTML Service版から移行した、Git管理の静的Webアプリ版です。

## ファイル構成

```text
todo-dashboard-web/
  index.html
  styles.css
  app.js
  config.js
  config.example.js
  gas-api/
    Code.gs
  docs/
    design.md
```

## 構成

- フロントエンド: HTML / CSS / JavaScript
- API: Google Apps Script Web App
- DB: Googleスプレッドシート

## 初期設定

1. Google Apps Scriptプロジェクトを作成
2. `gas-api/Code.gs` をGASへ貼り付け
3. スクリプトプロパティに必要なら以下を設定
   - `SPREADSHEET_ID`: 既存スプレッドシートID
   - `CALENDAR_IDS`: `primary,xxxx@group.calendar.google.com`
4. GASをWebアプリとしてデプロイ
   - 実行ユーザー: 自分
   - アクセスできるユーザー: フロントから直接利用する場合は「全員」
5. WebアプリURLを `config.js` に設定

```js
window.TODO_DASHBOARD_CONFIG = {
  GAS_API_URL: 'https://script.google.com/macros/s/xxxx/exec'
};
```

## フロントエンドの起動

静的ファイルなので、そのままホスティングできます。

ローカル確認例:

```powershell
cd todo-dashboard-web
python -m http.server 8080
```

ブラウザで `http://localhost:8080` を開きます。

## デプロイ例

### GitHub Pages

1. `todo-dashboard-web` をGitHubへpush
2. GitHub Pagesを有効化
3. 公開URLからアクセス

### Firebase Hosting

将来的な移行先候補です。

```powershell
firebase init hosting
firebase deploy
```

## 既存実装からの移行手順

1. 既存GAS HTML Service版はバックアップとして残す
2. 既存スプレッドシートIDを確認
3. 新GAS APIのスクリプトプロパティ `SPREADSHEET_ID` に既存IDを設定
4. `gas-api/Code.gs` をGASへ反映
   - Driveフォルダ自動作成を使うため、`gas-api/appsscript.json` もGASのマニフェストへ反映してください
5. Webアプリとして再デプロイ
   - Drive権限エラーが出る場合は、GASエディタで `authorizeDriveAccess` を一度手動実行して承認してください
   - `createFolder` の権限エラーが出る場合は、GASエディタで `authorizeDriveCreateAccess` を一度手動実行してDrive作成権限まで承認してください
   - `Service error: Drive` が出る場合は `diagnoseDriveAccess` を実行し、親フォルダIDとGAS実行アカウントの権限を確認してください
   - 親フォルダIDを変更したい場合は `setTaskParentFolderId('フォルダID')` を一度実行してください
6. 発行されたGAS API URLを `config.js` に設定
7. `index.html` を開き、タスク一覧が表示されるか確認
8. 既存Tasksに設計書チェック列が残っていても、新UIでは非表示
9. 新しい `ImprovementIdeas` / `Notifications` シートは初回API実行時に自動作成
10. `Tasks` には `ChatGPT URL` / `フォルダURL` 列が自動追加されます
11. `Tasks` には `進捗` 列が自動追加され、0-100の数値で管理されます
12. 新規タスク追加時はDriveに `A001_タイトル` 形式のフォルダが作成されます

## 必要シート

- `Tasks`
- `QuickLinks`
- `CalendarEvents`
- `Routines`
- `RoutineLogs`
- `ImprovementIdeas`
- `Notifications`

詳細は [docs/design.md](./docs/design.md) を参照してください。

## 注意

ブラウザからGAS Web Appへ直接 `fetch` します。環境によってCORS制約が出る場合は、以下のいずれかで対応してください。

- GAS APIを同一オリジンのプロキシ経由にする
- Cloudflare Workers / Firebase Functionsを薄いAPIプロキシとして置く
- 将来的にFirebase等へAPIごと移行する

指定URLへアクセスしてGoogleログイン画面HTMLが返る場合、GAS Webアプリの公開範囲が不足しています。
その場合はGASの「デプロイを管理」から新しいバージョンを作成し、アクセス権を「全員」にして再デプロイしてください。
