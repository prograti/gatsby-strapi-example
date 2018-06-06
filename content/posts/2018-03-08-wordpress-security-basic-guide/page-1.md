この記事はQiitaからの転載です。
https://qiita.com/prograti/items/2cb5cc69006c2538fdf0

## はじめに

過去にWordPressの脆弱性に関するケーススタディをご紹介しました。

- [Webアプリケーションの脆弱性ケーススタディ（WordPress編）](https://qiita.com/prograti/items/951949e407fe8a40043b)
- [Webアプリケーションの脆弱性ケーススタディ（WordPress編その２）](https://qiita.com/prograti/items/82409213bb875540a52e)

今回はWordPressのセキュリティ対策を行う上で大切な基本事項をまとめてみたいと思います（本記事はWordPress 4.9.4をもとに書いております。古いバージョンと異なる部分があるかもしれませんので予めご了承ください）。

### :white_check_mark: WordPress本体およびプラグインやテーマのアップデートを行う

WordPress3.7以降では初期状態でマイナーバージョンの自動アップデートが有効になっています（1日に2回WP-Cronイベントで更新チェックが行われます）。つまり、バグフィックスやセキュリティパッチなどは自動的に適用されているわけですが、WordPressサポートチームは常に最新版を使用するように推奨しています。

参考：Supported Versions
https://codex.wordpress.org/Supported_Versions

>The only current officially supported version is WordPress 4.9.2. Previous major releases before this may or may not get security updates as serious exploits are discovered. 

>WordPress will be backported security updates when possible, but there are no guarantee and no timeframe for older releases. There are no fixed period of support nor Long Term Support (LTS) version such as Ubuntu's. None of these are safe to use, except the latest series, which is actively maintained. 

最新のメジャーバージョンにアップデートしていない場合はできる限り最新版にアップデートするようにしてください。もし、メジャーバージョンも自動アップデートしたいのであれば、`allow_major_auto_core_updates`フィルタを利用することでメジャーバージョンも含めることができます。

```php
add_filter('allow_major_auto_core_updates', '__return_true');
```

もしくはwp-config.phpに以下の定数を定義する方法もあります。

```php
define('WP_AUTO_UPDATE_CORE', true);
```

プラグインやテーマは基本的には自動アップデートの対象外になります。 [^1]
管理画面から手動でアップデートするか、もし自動アップデートしたいのであれば、`auto_update_plugin`フィルタと`auto_update_theme`フィルタを利用してください。

```php
add_filter('auto_update_plugin', '__return_true');
add_filter('auto_update_theme', '__return_true');
```

:warning: 自動アップデートでサイトに不具合が出る可能性もありますので、定期的にバックアップを取ることをお勧めいたします。

### :white_check_mark: wp-config.phpについて理解する・カスタマイズする

wp-config.phpはインストール時に自動的に設定されるので、DB接続情報以外は意識することは少ないかもしれません。しかし、重要なファイルの一つですので、いくつかポイントをまとめてみたいと思います。

:one: **認証用ユニークキー**

DB接続情報を設定する箇所の下に認証用ユニークキーを設定する箇所があります。

```php
define('AUTH_KEY',         'put your unique phrase here');
define('SECURE_AUTH_KEY',  'put your unique phrase here');
define('LOGGED_IN_KEY',    'put your unique phrase here');
define('NONCE_KEY',        'put your unique phrase here');
define('AUTH_SALT',        'put your unique phrase here');
define('SECURE_AUTH_SALT', 'put your unique phrase here');
define('LOGGED_IN_SALT',   'put your unique phrase here');
define('NONCE_SALT',       'put your unique phrase here');
```

認証用ユニークキーは以下のURLから発行できるのは周知のとおりだと思います。
https://api.wordpress.org/secret-key/1.1/salt/

では、この認証用ユニークキーはどういう役割を果たしているのかご存知でしょうか:thinking:

WordPressではログインすると認証CookieとログインCookieの2種類が作成されます。Cookieに書きこまれる情報はユーザーIDとパスワードの一部、Cookieの有効期限、ランダム文字列（トークン）などを組み合わせて[hash_hmac](http://php.net/manual/ja/function.hash-hmac.php)関数を使ってハッシュ化し、そこにさらにデータを付加して再度hash_hmac関数でハッシュ化したものになります。このハッシュ化の際に使用される秘密鍵がAUTH_KEYとAUTH_SALT（SSLの場合はSECURE_AUTH_KEYとSECURE_AUTH_SALT）およびLOGGED_IN_KEYとLOGGED_IN_SALTになります。

ユーザーのログイン状態をチェックする時は認証CookieによるチェックとログインCookieによるチェックのダブルチェックを行っています（おそらくCookieを偽装しにくくするため）。NONCE_KEYとNONCE_SALTはnonce（CSRF対策として使われている）を生成するために利用されます。

もしかすると、インストール時に認証用ユニークキーを設定していないという方もいらっしゃるかもしれません。でも、ちゃんとCookieに書き込まれる情報はハッシュ化されます。なぜなら、この認証用ユニークキーはインストール時にDBにも作成されており、wp-config.phpに設定がない場合はDBにある認証用ユニークキーが利用されるからです。

では、何ためにwp-config.phpで設定できるようになっているのでしょうか。ユースケースとして一つ考えられるのは、不正アクセスや何らかのミスで認証用ユニークキーが漏洩してしまった場合です。認証用ユニークキーが分かればCookieを偽装してブルートフォース攻撃をすることも決して難しいことではありません。認証用ユニークキーが漏洩した可能性がある場合は認証用ユニークキーを変更した方が安全でしょう。

それ以外にも、もしユーザー全員のログイン状態（自動ログインも含めて）をクリアしたいケースがあった場合、ユーザー全員のパスワードを変更するのは大変です。そのような場合は認証用ユニークキーを変更すればログイン状態をクリアできます。


:two: **データベーステーブルの接頭辞**

WordPressに作成されるデータベーステーブルの接頭辞は初期状態で"wp_"となっています（共有サーバの場合は既に変更されていると思います）。

```php
$table_prefix  = 'wp_';
```

接頭辞は複数のWordPressを入れても競合しないように提供されているものですが、セキュリティの観点から変更した方が良いと言う方も多くいらっしゃいます。変更することに異論はありませんが、変更したから安全だとは決して考えない方が良いでしょう。

攻撃者が任意のクエリを実行できる状態にあった場合、テーブルの一覧や接頭辞を知ることは難しくありません。

```sql
-- テーブルの一覧を表示
SHOW TABLES;

-- テーブルの接頭辞を表示
SELECT DISTINCT SUBSTRING(`TABLE_NAME` FROM 1 FOR ( LENGTH(`TABLE_NAME`)-8 ) ) 
FROM information_schema.TABLES WHERE 
`TABLE_NAME` LIKE '%postmeta';
```

接頭辞の変更で過信せずに、それ以外のセキュリティ対策も十分に行ってください。

テーブル関連でいうと、WordPressではユーザー情報のテーブル名をwp_users、wp_usermetaから任意の名前に変更することもできます。変更したからセキュリティが高まるとは言い難いのですが、もし変更したい場合は`CUSTOM_USER_TABLE`と`CUSTOM_USER_META_TABLE`をwp-config.phpに定義してください。

```php
define('CUSTOM_USER_TABLE', $table_prefix.'hoge');
define('CUSTOM_USER_META_TABLE', $table_prefix.'hogemeta');
```

[^1]: プラグインでも影響が深刻な場合はWordPressサポートチームの判断によって自動アップデートされることがあります。 ex) https://yoast.com/wordpress-seo-security-release/
