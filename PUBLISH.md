# iPhoneで毎回開きやすくする手順

このアプリをiPhoneで毎回開きやすくするには、HTTPSで公開してからSafariの「ホーム画面に追加」を使います。
おすすめはGitHub Pagesです。

## 1. GitHubにリポジトリを作る

GitHubで新しいリポジトリを作ります。
無料プランでGitHub Pagesを使う場合は、公開リポジトリにするのが分かりやすいです。

例：

```text
kusayakyu-mvp
```

## 2. MacからGitHubへ送る

GitHubで表示されるリポジトリURLを使って、Macのターミナルで実行します。

```bash
cd "/Users/shu/Documents/codex作業用/kusayakyu-mvp"
git remote add origin https://github.com/あなたのGitHub名/kusayakyu-mvp.git
git push -u origin main
```

すでに `origin` がある場合は、`git remote add origin ...` は不要です。

## 3. GitHub Pagesを有効にする

GitHubのリポジトリ画面で以下を設定します。

1. `Settings` を開く
2. 左メニューの `Pages` を開く
3. `Build and deployment` の `Source` を `Deploy from a branch` にする
4. `Branch` を `main`、フォルダを `/root` にする
5. `Save` を押す

数分待つと、次のようなURLで開けます。

```text
https://あなたのGitHub名.github.io/kusayakyu-mvp/
```

## 4. SupabaseのURL設定を公開URLに変える

Supabaseで以下を開きます。

```text
Authentication → URL Configuration
```

`Site URL` にGitHub PagesのURLを入れます。

```text
https://あなたのGitHub名.github.io/kusayakyu-mvp/
```

`Redirect URLs` にも追加します。

```text
https://あなたのGitHub名.github.io/kusayakyu-mvp/**
```

## 5. iPhoneでホーム画面に追加する

1. iPhoneのSafariでGitHub PagesのURLを開く
2. 共有ボタンを押す
3. `ホーム画面に追加` を押す
4. 名前を `草野球ログ` にして追加する

次回からホーム画面のアイコンで開けます。

## 6. 公開URLで同期設定をやり直す

公開URLは、Macで一時表示していたURLとは別の場所です。
そのため最初だけ、公開URL側で同期設定を入力し直します。

1. ホーム画面の `草野球ログ` を開く
2. `同期設定` タブを開く
3. Supabase URL、anon / publishable key、メール、パスワードを入力
4. `ログイン` を押す
5. `クラウドから読み込み` を押す

これでiPhoneから普段使いできる状態になります。
