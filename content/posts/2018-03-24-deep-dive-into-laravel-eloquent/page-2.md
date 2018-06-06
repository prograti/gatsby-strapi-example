:notebook_with_decorative_cover: **Read系メソッド一覧**

Read系メソッドでよく使うものをリストアップしてご紹介します。（:fire:は発行されるイベント）

:black_small_square: **all**
:fire: retrieved

レコード全件を取得します。

```php
$users = User::all();
```

:black_small_square: **find**
:fire: retrieved

主キーで検索し、該当するレコードを取得します。

```php
$user = User::find(1); // 主キーの値が1のレコードを取得
$users = User::find([1, 2]); // 主キーの値が1か2のレコードを取得
$user = User::find(1, ['id', 'name']); // 取得するカラムを指定
```

:black_small_square: **findOrFail**
:fire: retrieved

主キーで検索し、該当するレコードがない場合は`ModelNotFoundException`をスローします（例外をキャッチしない場合は例外ハンドラで`NotFoundHttpException`にチェーンされて404ページへ遷移する）。

```php
$user = User::findOrFail(1);
```

:black_small_square: **findOrNew**
:fire: retrieved

主キーで検索し、該当するレコードがない場合はnewしたモデルインスタンスを返します。

```php
$user = User::findOrNew(1); // 下と同じ
$user = User::find(1) ?? new User;
```

:black_small_square: **firstOrNew**
:fire: retrieved

attributeにマッチしたレコードの1レコード目を返します。該当するレコードがない場合はnewしたモデルインスタンスに指定したattributeをセットして返します。

```php
$user = User::firstOrNew(['name' => 'qiita']); // レコードがない場合はnewしたモデルにnameをセット
```

:black_small_square: **firstOrFail**
:fire: retrieved

条件に該当するレコードの1レコード目を返します。該当するレコードがない場合は`ModelNotFoundException`をスローします。

```php
$user = User::where('active', 1)->firstOrFail();
```

:black_small_square: **firstOr**
:fire: retrieved

条件に該当するレコードの1レコード目を返します。該当するレコードがない場合は指定したコールバック関数を実行した結果を返します。

```php
$user = User::where('active', 1)->firstOr(function(){
    return new User;
});
```

:black_small_square: **value**
:fire: retrieved

レコードセットの1レコード目から指定したシングルカラムの値を取得します。

```php
$age = User::where('age', '>', 20)->value('age');
```

:black_small_square: **get**
:fire: retrieved

クエリの結果を取得します。

```php
$users = User::where('age', '>', 20)
  ->orderBy('age', 'desc')
  ->get();
```

:black_small_square: **pluck**
:fire: retrieved

レコードセットから指定したカラムだけを取り出してコレクションとして返します。

```php
$ages = User::where('age', '>', 20)->pluck('age');
```

※retrievedイベントが発行されるのは指定したカラムのアクセサーや日付ミューテタ、属性キャストが設定されている場合のみです。

```php
class Post extends Model
{
  // アクセサー
  public function getTitleAttribute($value)
  {
    return strtoupper($value);
  }
}
```

:black_small_square: **cursor**
:fire: retrieved

レコードセットから一行ずつレコードを取得します。レコードセットが配列に全件分展開されないため、バッチ処理のような大量のデータを扱う場合にメモリの使用量を抑えることができます。

```php
foreach (User::where('active', 1)->cursor() as $user) {
  // do something
}
```

:black_small_square: **chunk**
:fire: retrieved

指定した件数ずつレコードを取得し、結果をコールバック関数に渡します。コールバック関数の中でfalseをリターンするとそこでレコードの取得は終了します。

```php
$bool = User::where('active', 1)->chunk(100, function($users, $page) {
  // do something
});
```

:black_small_square: **chunkById**
:fire: retrieved

指定した件数ずつレコードを取得し、結果をコールバック関数に渡します。chunkの方はOFFSETを使用しているため、後ろに行けば行くほどOFFSETの位置まで読み込むオーバーヘッドが大きくなりパフォーマンスが低下します。chunkByIdは`SELECT * FROM users WHERE id > ? ORDER BY id LIMIT 100;`のようにidを使って開始位置を移動するためOFFSETよりもパフォーマンスが良くなります。キーがオートインクリメントのIDで大量のレコードを扱う場合には、chunkよりもこちらを利用するとパフォーマンスの向上が期待できます。

```php
$bool = User::where('active', 1)->chunkById(100, function($users) {
  // do something
});
```

:black_small_square: **each**
:fire: retrieved

指定した件数ずつレコードを取得し、結果をコールバック関数に渡します。コールバック関数の中でfalseをリターンするとそこでレコードの取得は終了します。chunkとほぼ同じですが、chunkのコールバックの引数はレコードセットなのに対し、こちらは単一レコードになります。

```php
$bool = User::where('active', 1)->each(function($user) {
  // do something
}, 100);
```

:black_small_square: **paginate、simplePaginate**
:fire: retrieved

OFFSETを利用したページング検索結果を返します。paginateはページ番号のリンクを作成するためにレコードの件数をカウントするクエリを実行した上でOFFSETのクエリを実行しますが、simplePaginateは「次」「前」のリンクしか作成しないためOFFSETのクエリのみで済みます。

```php
// GETで送られてきたpage番号から10件を取得する
$users = User::where('active', 1)->paginate(10);
$users = User::where('active', 1)->simplePaginate(10);
```

:black_small_square: **fresh**
:fire: retrieved

モデルをDBから再取得し、新しいモデルインスタンスを返します。

```php
$user = User::find(1);
$user2 = $user->fresh(); // idが1のレコードを再取得する
var_dump($user === $user2); // false
```

:black_small_square: **refresh**
:fire: retrieved

モデルをDBから再取得し、取得したデータでモデルのattributeを更新します。

```php
$user = User::find(1);
$user2 = $user->refresh(); // idが1のレコードを再取得する
var_dump($user === $user2); // true
```
