## サービスコンテナ

[公式サイト]Service Container
https://laravel.com/docs/5.6/container

Laravelのサービスコンテナは`Illuminate\Foundation\Application`です。サービスコンテナが実装しているインターフェースは以下のようなメソッドが定義されています（理解しやすいように順番を並び替えてグルーピングしています）。

```php
// コンテナにコンポーネントを登録する
public function bind($abstract, $concrete = null, $shared = false);
public function bindIf($abstract, $concrete = null, $shared = false);
public function singleton($abstract, $concrete = null);
public function instance($abstract, $instance);
public function extend($abstract, Closure $closure);
public function when($concrete);

// コンテナからコンポーネントを取得する
public function make($abstract, array $parameters = []);
public function factory($abstract);
public function call($callback, array $parameters = [], $defaultMethod = null);

// コンテナの状態を判定する
public function bound($abstract);
public function resolved($abstract);

// コンポーネントに情報を付加する
public function alias($abstract, $alias);
public function tag($abstracts, $tags);
public function tagged($tag);

// コンテナのイベントを監視する
public function resolving($abstract, Closure $callback = null);
public function afterResolving($abstract, Closure $callback = null);
```

```php
// アプリケーションの情報・状態など
public function version();
public function basePath();
public function environment();
public function isDownForMaintenance();
public function getCachedServicesPath();
public function getCachedPackagesPath();
public function runningInConsole();
public function runningUnitTests();

// サービス プロバイダの登録・起動
public function registerConfiguredProviders();
public function register($provider, $options = [], $force = false);
public function registerDeferredProvider($provider, $service = null);
public function boot();

// 起動イベントを監視する
public function booting($callback);
public function booted($callback);
```

```php
// リクエストの処理
public function handle(Request $request, $type = self::MASTER_REQUEST, $catch = true);
```

インターフェースを見て分かるようにApplication（サービスコンテナ）の主な役割はコンポーネントの登録・管理、サービス プロバイダの登録・管理、リクエストの処理になります。

ただし、リクエストの処理に関しては、標準的なプロジェクト構成では`Kernel`が直接リクエストを処理するようになっています。

```php
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
  $request = Illuminate\Http\Request::capture()
);
```

なお、サービス コンテナの`boot`メソッド（サービス プロバイダの起動）は、前述したリクエスト ライフサイクルのbootstrapperの最後で、`BootProviders`というサービス プロバイダによって実行されます。

次にコンポーネントの登録・取得の内部動作を簡単に見てみましょう。

```php
/* コンポーネントの登録例 */
$this->app->bind('App\Services\Twitter', function ($app) {
  return new App\Services\Twitter($app->make('App\Libraries\OAuthClient'));
});

// インターフェース名と実装クラス名を指定
$this->app->bind('App\Contracts\SocialMedia', 'App\Services\Twitter');
$this->app->bind(\App\Contracts\SocialMedia::class, \App\Services\Twitter::class);

/* コンポーネントの取得例 */
App::make('App\Services\Twitter'); // Appファサード利用
app('App\Services\Twitter'); // appヘルパー利用
```

コンポーネントを登録する場合は、上の例のように第1引数に実装クラス名やインターフェース名、第2引数にクロージャや実装クラス名を指定します。コンポーネントを取得する場合は、バインドする際に指定した実装クラス名やインターフェース名を指定します。

コンテナ内部ではbindメソッドで連想配列にバインド情報を保存し、makeメソッドでクロージャを実行して結果を返しています（singletonの場合は結果を保存）。第2引数に実装クラス名を指定した場合はリフレクションを使って実装クラスをインスタンス化します。実装クラスのコンストラクタに引数が指定されている場合も依存性を解決してインスタンス化してくれます。

```php
// OAuthClientをインスタンス化して注入
class Twitter {
  public function __construct(OAuthClient $client) {}
}

// OAuthClientをインスタンス化して注入、$keyはデフォルト値が入る
class Twitter {
  public function __construct(OAuthClient $client, $key = 'xxxx') {}
}

// $keyが解決できないのでエラー
// 取得の際にkeyを指定すればOK　app('App\Services\Twitter', ['key' => 'xxxxx']);
class Twitter {
  public function __construct(OAuthClient $client, $key) {}
}
```

なお、bindメソッドの第1引数にはインターフェース名（もしくは実装クラス名）を指定しますが、ユニークな文字列であればインターフェース名でなくても構いません。

```php
$this->app->bind('socialmedia', 'App\Services\Twitter');
```

インスタンス結合も同様にクラス名である必要はないため、セッションやリクエストを使わずに値を引き継ぐような用途でも利用できます。

```php
$this->app->instance('debug', true);
```

## サービス プロバイダ

[公式サイト]Service Providers
https://laravel.com/docs/5.6/providers

サービス プロバイダは"eager"と"deferred"の2種類に分かれます。"eager"のサービス プロバイダはbootstrapperでコンテナに登録されるタイミングで`register`メソッドが実行され、全てのプロバイダの登録が完了したらすぐに`boot`メソッドが実行されます。

"deferred"のサービス プロバイダはコンテナからコンポーネントを取得するタイミングで、そのコンポーネントがまだコンテナに登録されていない場合にプロバイダがコンテナに登録されて`register`メソッドと`boot`メソッドが実行されます。

もう少し分かりやすいように実例でご説明します。
BroadcastServiceProviderは`provides`メソッドで3つのクラス名を返しています。

```php
public function provides()
{
  return [
    BroadcastManager::class,
    BroadcastingFactory::class,
    BroadcasterContract::class,
  ];
}
```

そして、前述したManifestファイルの作成のときに上記情報が参照されて以下のような内容のファイルが作られます。

```php
'deferred' => 
  array (
    'Illuminate\\Broadcasting\\BroadcastManager' => 'Illuminate\\Broadcasting\\BroadcastServiceProvider',
    'Illuminate\\Contracts\\Broadcasting\\Factory' => 'Illuminate\\Broadcasting\\BroadcastServiceProvider',
    'Illuminate\\Contracts\\Broadcasting\\Broadcaster' => 'Illuminate\\Broadcasting\\BroadcastServiceProvider',
```

この情報により３つのコンポーネントがBroadcastServiceProviderによって依存性を注入されるということをコンテナが把握します。そして、上記3つのうちどれか一つのコンポーネントをコンテナから取得しようとしたタイミングでBroadcastServiceProviderが呼ばれて`register`メソッドおよび`boot`メソッドが実行されます。一度プロバイダが実行されるとコンポーネントの依存性は解決されてコンテナに登録されるため、次回以降コンテナからコンポーネントを取得する際はプロバイダは実行されなくなります。

なお、フレームワーク内にあるサービス プロバイダの一覧を以下に列挙します。

|サービス プロバイダ|app.phpに定義あり|遅延|概要|
|:--|:-:|:-:|:--|
|Illuminate\Auth\AuthServiceProvider|○||認証・認可で必要となるコンポーネントを登録する|
|Illuminate\Auth\Passwords\PasswordResetServiceProvider|○|○|パスワードリセットで必要となるコンポーネントを登録する|
|Illuminate\Broadcasting\BroadcastServiceProvider|○|○|ブロードキャストで必要となるコンポーネントを登録する|
|Illuminate\Bus\BusServiceProvider|○|○|同期・非同期ジョブで必要となるコンポーネントを登録する|
|Illuminate\Cache\CacheServiceProvider|○|○|キャッシュで必要となるコンポーネントを登録する|
|Illuminate\Cookie\CookieServiceProvider|○||セッションで必要となるクッキー関連のコンポーネントを登録する|
|Illuminate\Database\DatabaseServiceProvider|○||データベース接続で必要となるコンポーネントの登録を行う。また、プロバイダのboot時にEloquentモデルにConnectionResolverやEventDispatcherをセットする|
|Illuminate\Database\MigrationServiceProvider||○|DBのマイグレーションで必要となるコンポーネントを登録する。このプロバイダはConsoleSupportServiceProvider内で登録される（configの記述不要）|
|Illuminate\Encryption\EncryptionServiceProvider|○||暗号化で必要となるコンポーネントを登録する|
|Illuminate\Events\EventServiceProvider|||イベントで必要となるコンポーネントを登録する。このプロバイダはフレームワーク内で自動的に登録される（configの記述不要）|
|Illuminate\Filesystem\FilesystemServiceProvider|○||ファイルストレージで必要となるコンポーネントを登録する|
|Illuminate\Foundation\Providers\ArtisanServiceProvider||○|Artisanコンソールの全コマンドを登録する。このプロバイダはConsoleSupportServiceProvider内で登録される（configの記述不要）|
|Illuminate\Foundation\Providers\ComposerServiceProvider||○|フレームワーク内のComposer関連の処理で必要となるコンポーネントを登録する。このプロバイダはConsoleSupportServiceProvider内で登録される（configの記述不要）|
|Illuminate\Foundation\Providers\FormRequestServiceProvider|||プロバイダのboot時にコンテナイベント（フォームリクエストの初期処理、バリデーションエラー処理）を登録する。このプロバイダはFoundationServiceProvider内で登録される（configの記述不要）|
|Illuminate\Foundation\Providers\ConsoleSupportServiceProvider|○||MigrationServiceProvider、ArtisanServiceProvider、ArtisanServiceProviderを登録するためのアグリゲーションプロバイダ|
|Illuminate\Foundation\Providers\FoundationServiceProvider|○||FormRequestServiceProviderの登録およびリクエストのvalidateマクロを設定する|
|Illuminate\Foundation\Support\Providers\AuthServiceProvider|||認可のポリシーの登録を行う。アプリ側のAuthServiceProviderが継承する親クラス|
|Illuminate\Foundation\Support\Providers\EventServiceProvider|||イベントのlistenerとsubscriberを登録する。アプリ側のEventServiceProviderが継承する親クラス|
|Illuminate\Foundation\Support\Providers\RouteServiceProvider|||アプリケーションのルート情報を読み込む。アプリ側のRouteServiceProviderが継承する親クラス|
|Illuminate\Hashing\HashServiceProvider|○|○|ハッシュで必要となるコンポーネントを登録する。デフォルトはCRYPT_BLOWFISH アルゴリズムだが、ドライバを指定することでArgon2 アルゴリズムも利用可能（php7.2以降）|
|Illuminate\Log\LogServiceProvider|||ログで必要となるコンポーネントを登録する。このプロバイダはフレームワーク内で自動的に登録される（configの記述不要）|
|Illuminate\Mail\MailServiceProvider|○|○|メールで必要となるコンポーネントを登録する|
|Illuminate\Notifications\NotificationServiceProvider|○||通知で必要となるコンポーネントの登録およびboot時にビューに名前空間"notifications"を作成する|
|Illuminate\Pagination\PaginationServiceProvider|○||ページネーションで必要となるコンポーネントの設定およびboot時にビューに名前空間"pagination"を作成する|
|Illuminate\Pipeline\PipelineServiceProvider|○|○|パイプラインHubで必要となるコンポーネントを登録する|
|Illuminate\Queue\QueueServiceProvider|○|○|同期・非同期ジョブで必要となるコンポーネントを登録する|
|Illuminate\Redis\RedisServiceProvider|○|○|Redisで必要となるコンポーネントを登録する|
|Illuminate\Routing\RoutingServiceProvider|||ルーティングで必要となるコンポーネントを登録する。このプロバイダはフレームワーク内で自動的に登録される（configの記述不要）|
|Illuminate\Session\SessionServiceProvider|○||セッションで必要となるコンポーネントを登録する|
|Illuminate\Translation\TranslationServiceProvider|○|○|多言語化で必要となるコンポーネントを登録する|
|Illuminate\Validation\ValidationServiceProvider|○|○|バリデーションで必要となるコンポーネントを登録する|
|Illuminate\View\ViewServiceProvider|○||ビューで必要となるコンポーネントやビューエンジン（file、php、blade）を登録する|
