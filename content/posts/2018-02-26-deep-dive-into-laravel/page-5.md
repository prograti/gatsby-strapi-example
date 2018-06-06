## ビュー

[公式サイト]Views
https://laravel.com/docs/5.6/views

ビューの作成はviewヘルパーを使って行います。

```php
Route::get('/', function () {
  return view('welcome', $data);
});
```

ビューには名前空間を付けることができます。例えばAppServiceProviderでViewファサードを使って以下のように名前空間を付けます。

```php
View::addNamespace('pc', resource_path('views/pc'));
View::addNamespace('sp', resource_path('views/sp'));
```

コントローラ側で名前空間を指定することでビューを切り替えることができます。

```php
return view('sp::welcome');
```

では、もう少しビューが作成されるまでの処理を詳しく見てみましょう。viewヘルパーの内部ではサービス コンテナからViewの作成を行うFactoryクラスを取得してViewインスタンスの作成を行っています。Factoryクラスは指定されたビュー名からファイルのパスを取得し、ファイルの拡張子でレンダリングエンジンを決定します。

LaravelにはFileエンジン、PHPエンジン、Compilerエンジンの3つのレンダリングエンジンがあり、Fileエンジンは拡張子が`.css`、PHPエンジンは拡張子が`.php`、Compilerエンジンは`.blade.php`となります。

PHPエンジンの場合はビューファイルがincludeされる際にviewヘルパーで渡したデータ配列が`extract`関数で展開されるためファイル内でデータを参照することができます。Fileエンジンの方は`file_get_contents`関数でファイルを取得するだけなのでデータ配列を渡しても意味はありません。

FactoryクラスでViewインスタンスが作成されるとcreatingイベントがdispatchされます。Viewクリエイターを登録することで、このイベントをキャッチすることができます。例えば、ビューに結合したいデータがある場合、AppServiceProviderでViewクリエイターを登録すればViewインスタンスが作成される度にデータを結合することができます。

```php
// クロージャではなくクラス名も指定可。クラスの場合はcreateメソッドを実装する
View::creator(['post', 'page'], function ($view) {
  $view->with('status', 1);
});
```

コントローラ側でwithメソッドを使って、Viewクリエイターで結合したデータを上書きすることもできます。

```php
return view('welcome')->with('status', 2);
```

Viewインスタンスが作成され、コントローラからルーターにViewインスタンスが返されると、ルーターはViewインスタンスをもとにResponseオブジェクトを作成します。

```php
public static function toResponse($request, $response)
{
  ...

  } elseif (! $response instanceof SymfonyResponse) {
    $response = new Response($response);
  }

  ...
}
```

Viewクラスの`__toString`でレンダリング処理が行われているため、ResponseオブジェクトにViewインスタンスを渡した時点でビューのレンダリングが始まります。

```php
public function __toString()
{
  return $this->render();
}
```

まず、レンダリング開始直前にcomposingイベントがdispatchされます。Viewコンポーザーを登録することで、このイベントをキャッチすることができます。

```php
// クロージャではなくクラス名も指定可。クラスの場合はcomposeメソッドを実装する
View::composer(['post', 'page'], function ($view) {
  $view->with('status', 1);
});
```

composingイベントの後、Viewインスタンスはレンダリングエンジンにビューファイルのパスとデータを渡します（Viewファサードのshareメソッドで共有されたデータもマージされる）。Compilerエンジンの場合、ビューファイルの最終更新日時とキャッシュファイル（`storage\framework\views`）の最終更新日時を比較し、ビューファイルが更新されていればコンパイル処理を開始します。

コンパイラは[token_get_all](http://php.net/manual/ja/function.token-get-all.php)関数でビューファイルをPHPトークンに分割し、トークンIDが`T_INLINE_HTML`のコンテンツを`Illuminate\View\Compilers\Concerns`にある14個のコンパイルトレイトを使用してパースします。これを繰り返し全てのパースが終わって結果をマージし、ファイルをキャッシュフォルダに出力します（ファイル名はファイルパスをsha1でハッシュ化した値）。

キャッシュファイルはBladeの記法から普通のPHPの記法に変換されているので、最後にviewヘルパーで渡したデータ配列を`extract`関数で展開してキャッシュファイルに適用しレンダリングが終了となります。

以上がビュー作成の大まかな流れになります。

## おまけ

Laravelのソースを眺めていてパイプラインの処理が面白かったので紹介します。

Laravelではミドルウェアの処理をパイプラインを使って実装しています。以下がミドルウェアを通してルーターにリクエストを渡している処理を抜粋したものです。

```php
protected function sendRequestThroughRouter($request)
{
  $this->app->instance('request', $request);
  Facade::clearResolvedInstance('request');
  $this->bootstrap();

  return (new Pipeline($this->app))
    ->send($request)
    ->through($this->app->shouldSkipMiddleware() ? [] : $this->middleware)
    ->then($this->dispatchToRouter());
}
```

`send()->through()->then()`とメソッドチェーンで処理が繋がっていて、まさにパイプラインのような形になっています。では、Pipelineの実装を見てみましょう。

```php
public function send($passable)
{
  $this->passable = $passable;

  return $this;
}

public function through($pipes)
{
  $this->pipes = is_array($pipes) ? $pipes : func_get_args();

  return $this;
}

public function then(Closure $destination)
{
  $pipeline = array_reduce(
    array_reverse($this->pipes), 
    $this->carry(),
    $this->prepareDestination($destination)
  );

  return $pipeline($this->passable);
}
```

`send`メソッドでリクエストを`passable`という変数に格納し、`through`メソッドでミドルウェアの配列を`pipes`という変数に格納しています。そして、`then`メソッドでは[array_reduce](http://php.net/manual/ja/function.array-reduce.php)を使って反転したミドルウェアの配列の各要素に対して`carry()`というコールバック関数を適用し、返ってきたクロージャにリクエストを渡しています。`prepareDestination()`は処理の最初で使用されますので、以下の順番でコールバック関数が適用されることになります。

```
prepareDestination() -> middleware3 -> middleware2 -> middleware1
```

prepareDestinationの実装は以下のように、リクエストを`dispatchToRouter()`に受け渡すクロージャを返すようになっています。

```php
protected function prepareDestination(Closure $destination)
{
  return function ($passable) use ($destination) {
    return $destination($passable);
  };
}
```

carryの実装は以下のようになっています。

```php
protected function carry()
{
  return function ($stack, $pipe) {
    return function ($passable) use ($stack, $pipe) {
      if (is_callable($pipe)) {
        return $pipe($passable, $stack);
      } elseif (! is_object($pipe)) {
        list($name, $parameters) = $this->parsePipeString($pipe);
        $pipe = $this->getContainer()->make($name);
        $parameters = array_merge([$passable, $stack], $parameters);
      } else {
        $parameters = [$passable, $stack];
      }

      // $this->method = 'handle'
      return method_exists($pipe, $this->method)
        ? $pipe->{$this->method}(...$parameters)
        : $pipe(...$parameters);
    };
  };
}
```

`$stack`に前回の反復処理の結果、`$pipe`に現在の反復処理の値が入りますので、以下のような順番になります。

|実行順|$stackに入る値|$pipeに入る値|
|:-:|:--|:--|
|①|prepareDestination()のリターン|middleware3|
|②|①のリターン（クロージャ）|middleware2|
|③|②のリターン（クロージャ）|middleware1|

従ってリクエストの処理は③⇒②⇒①の順番で行われることになります。まず、`$pipe`がmiddleware1になりますので1番目と2番目のif文はパスして`$parameters = [$passable, $stack];`でパラメータにリクエストと②のリターンが格納されて、middleware1のhandleメソッドが実行されます。ミドルウェアの実装が以下のようになりますので、前処理が入った後に`$next`つまり②のリターンにリクエストが渡されます。

```php
class SampleMiddleware
{
  public function handle($request, Closure $next)
  {
    /* 何か前処理が入る */

    $response = $next($request);
    
    /* 何か後処理が入る */

    return $response;
  }
}
```

そうすると今度は`$stack`に①のリターン、`$pipe`にmiddleware2が入りますので、またmiddleware2のhandleメソッドが実行されます。middleware2の前処理が終わると①のリターンにリクエストが渡り`$stack`にprepareDestination()のリターン、`$pipe`にmiddleware3が入ります。また、middleware3のhandleメソッドが実行され、middleware3の前処理が終わるとprepareDestination()のリターンにリクエストが渡ります。prepareDestination()のリターンはルーターにリクエストを渡すクロージャなので、つまりコントローラにリクエスト渡り、レスポンスが返って来ます。その後は、middleware3の後処理、middleware2の後処理、middleware1の後処理が行われてクライアントにミドルウェアの処理を通したレスポンスが返されることになります。

```
middleware1 -> middleware2 -> middleware3 -> コントローラ -> middleware3 -> middleware2 -> middleware1
```

`send()->through()->then()`の流れが個人的に好きだったので取り上げてみました:sweat_smile:

## まとめ

タイトルにDeep Diveと書きましたが、一連の流れを書きたかったのでそこまで深く書けなかったかもしれません。期待した方ゴメンナサイ:bow:

機会があれば個別の機能ごとにDeep Diveしてみたいと思います。皆さんも興味があればDeep Diveしてみてください。きっと今まで知らなかったLaravelの機能やPHPの関数、随所にちりばめられたテクニックの数々を発見できると思います。

（内容に間違いなどありましたらコメント・編集リクエストを頂けると幸いです）
