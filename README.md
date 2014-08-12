oppai.js
========

2D おっぱいをぷるんぷるんさせるJavascript

## How to use

```javascript
var left = {
        // 頂点(いわゆるtiqbi)を指定
        vertex: [236, 427],
        // 周りの範囲(いわゆるtibusa)を指定
        round_coords: [[263, 398], [297, 410], [296, 436], [265, 473], [226, 466], [210, 451], [211, 424], [230, 406]]
    },
    right = {
        vertex: [398, 431],
        round_coords:   [[361, 389], [403, 404], [431, 432], [422, 466], [389, 481], [352, 471], [335, 438], [340, 406]]
    };
var oppai = new Oppai(
                // HTMLCanvasElement もしくは canvas 要素へアクセスできる QueryString を指定 
                "#viewer",
                // 使用する画像のパス
                "img/pai_03.jpg",
                // option, { dpr: Number // device pixel ratio を指定( default 1 ) }
                null,
                // 胸(いわゆるtiti)データを以降の引数に指定
                left,
                right);

oppai.load(function() {
    // ロード完了後、各 API (いわゆるPAI) にアクセスできます    
});
```

簡単なデモが `gulp develop` 実行後、 [http://localhost:8000](http://localhost:8000) にて確認できます。


## Author

[@damele0n](https://twitter.com/damele0n)


## Lisence

Licensed under the MIT license.
