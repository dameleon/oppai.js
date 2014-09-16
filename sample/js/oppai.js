/*! oppai.js / @version:0.1.0 @author:dameleon <dameleon@gmail.com> @license:MIT */ 
;(function(global, undefined) {
'use strict';

var Math = global.Math;
var document = global.document;
var env = __getEnv(global.navigator.userAgent);
var events = {
        touchStart : env.isTouchDevice && "touchstart" || "mousedown",
        touchMove  : env.isTouchDevice && "touchmove"  || "mousemove",
        touchEnd   : env.isTouchDevice && "touchend"   || "mouseup",
        tap        : env.isTouchDevice && "touchstart" || "click",
};
var raf = global.requestAnimationFrame ||
          global.webkitRequestAnimationFrame ||
          global.mozRequestAnimationFrame ||
          global.oRequestAnimationFrame ||
          global.msRequestAnimationFrame ||
          (function(timing) { return function(cb) { global.setTimeout(cb, timing); }; })(1000/60);
var defaultSetting = {
        dpr: 1,
        enableTouch: false
};

/**
 * @param {String|HTMLCanvasElement} canvas
 * @param {String} imagePath
 * @param {Object} option
 * @param {Object} opp[]
 * @param {Array}  opp[].vertex     [x, y]
 * @param {Array}  opp[].round_coods [[x, y], [x, y], ...]
 */
function Oppai() {
    var args = [].slice.call(arguments);
    var canvas = args.shift();
    var imgPath = args.shift();
    var option = args.shift();

    this.setting = _extend({
        imgPath: imgPath
    }, defaultSetting, option);
    this.canvas = __getCanvas(canvas);
    this.ctx = this.canvas.getContext('2d');
    this.image = null;
    this.breasts = [];
    this._oppList = args;
}

//// static methods & properties
Oppai.getTouchInfoFromEvent = _getTouchInfo;
Oppai.extend = _extend;
Oppai.env = env;
Oppai.requestAnimationFrame = raf;
Oppai._debug = false;

function _getTouchInfo(event, name) {
    return env.isTouchDevice ? event.changedTouches[0][name] : event[name];
}

function _extend() {
    if (arguments.length < 2) {
        return arguments[0];
    }
    var deepTargetRe = /(object|array)/;
    var args = [].slice.call(arguments);
    var res = args.shift();
    var i = 0, arg;

    while ((arg = args[i])) {
        var j = 0;

        switch (typeof arg) {
            case 'array':
                for (var jz = arg.length; j < jz; j++) {
                    extend(j, res, arg);
                }
                break;
            case 'object':
                var donorKeys = Object.keys(arg);

                for (var key; key = donorKeys[j]; j++) {
                    extend(key, res, arg);
                }
                break;
        }
        i++;
    }

    return res;

    function extend(key, target, donor) {
        var val = donor[key];
        var targetVal = target[key];
        var donorValType = (val && typeof val) || '';
        var targetValType = (targetVal && typeof targetVal) || '';

        if (deepTargetRe.test(donorValType)) {
            if (targetValType !== donorValType) {
                target[key] = (donorValType === 'object') ? {} : [];
            }
            _extend(target[key], val);
        } else {
            target[key] = val;
        }
    }
}


//// instance methods
Oppai.prototype = {
    constructor: Oppai,
    _createAnimation  : _createAnimation,
    _init             : _init,
    _initTouchHandler : _initTouchHandler,
    _loadImage        : _loadImage,
    bounce            : _bounce,
    load              : _load,
    handleEvent       : _handleEvent,
    moveAll           : _moveAll,
    roll              : _roll,
    swing             : _swing,
    update            : _update,
};

function _load(callback) {
    var that = this;

    this._loadImage(this.setting.imgPath, function() {
        that._init();
        callback && callback();
    });
}

function _init() {
    var oppList = this._oppList;
    var canvas = this.canvas;
    var ctx = this.ctx;
    var image = this.image;
    var breasts = this.breasts;
    var bb, minX, minY, maxX, maxY;

    // NOTE. 最小座標生成用
    minX = minY = 99999;
    maxX = maxY = 0;

    canvas.width = image.width;
    canvas.height = image.height;
    // devicepixelratioが指定されている場合は、canvasのサイズを調整する
    if (this.setting.dpr > 1) {
        var dpr = this.setting.dpr;

        canvas.style.width = (image.width / dpr) + 'px';
        canvas.style.height = (image.height / dpr) + 'px';
    }
    // 最初の一回描画
    ctx.drawImage(image, 0, 0);

    for (var i = 0, opp; opp = oppList[i]; i++) {
        breasts[i] = new Oppai.Breast(ctx, image, opp);
        bb = breasts[i].getBoundingBox();
        minX = Math.min(minX, bb.minX);
        minY = Math.min(minY, bb.minY);
        maxX = Math.max(maxX, bb.maxX);
        maxY = Math.max(maxY, bb.maxY);
    }
    // NOTE. 設定する余白(一旦決め打ちで 20px )
    var allowance = 20;

    this.drawAABB = {
        x: Math.max(0, minX - allowance),
        y: Math.max(0, minY - allowance),
        w: Math.min(canvas.width , maxX + allowance),
        h: Math.min(canvas.height, maxY + allowance)
    };
    // 基準値からの幅と高さなので、それぞれ x, y を引く
    this.drawAABB.w -= this.drawAABB.x;
    this.drawAABB.h -= this.drawAABB.y;
    this.drawAABB.center = {
        x: this.drawAABB.x + (this.drawAABB.w / 2),
        y: this.drawAABB.y + (this.drawAABB.h / 2),
    };

    if (env.isTouchDevice && 'ondevicemotion' in global) {
        this._initTouchHandler();
    }
    if (this.setting.enableTouch) {
        canvas.addEventListener(events.tap, this);
    }
    this.update();
}

function _handleEvent() {
    this.bounce(80, 3000);
}

function _initTouchHandler() {
    var that = this;

    this.motionHandler = new Oppai.MotionHandler(function(vector) {
        var distance = vector.distance;

        that.swing(
            Math.min(90, (vector.x / distance) * 100),
            Math.min(90, (vector.y / distance) * 100));
    });
    this.motionHandler.on();
}

function _loadImage(src, callback) {
    var that = this;
    var image = new Image();
    var loadCallback = function() {
        var img = that.image = document.createElement('canvas');

        img.width = image.naturalWidth;
        img.height = image.naturalHeight;
        img.getContext('2d').drawImage(image, 0, 0);
        callback();
    };

    image.onerror = function() {
        throw new Error('cannot load image [src]: ' + src);
    };
    image.src = src;
    if (env.isIE) {
        if (image.width !== 0) {
            loadCallback();
        } else {
            image.onload = function() {
                setTimeout(loadCallback, 200);
            };
        }
    } else {
        image.onload = loadCallback;
    }
}

function _update() {
    var breasts = this.breasts;
    var drawAABB = this.drawAABB;

    if (!drawAABB) {
        console.warn('drawAABB is not set yet');
        return;
    }
    // 胸の範囲を再描画
    // FIXME. そもそも renderbuffer の方でやりたい人生だった
    this.ctx.drawImage(this.image,
                       drawAABB.x, drawAABB.y, drawAABB.w, drawAABB.h,
                       drawAABB.x, drawAABB.y, drawAABB.w, drawAABB.h);
    for (var i = 0, b; b = breasts[i]; i++) {
        b.draw();
    }
}

function _moveAll(dx, dy) {
    var breasts = this.breasts;

    for (var i = 0, b; b = breasts[i]; i++) {
        b.moveTo(dx, dy);
    }
    this.update();
}

function _swing(x, y, duration) {
    var that = this;
    var handler = function(dx, dy) {
            that.moveAll(x - dx, y - dy);
    };
    var animaton = this._createAnimation(duration || 3000, handler);

    animaton.start(
        { start: 0, end: x },
        { start: 0, end: y }
    );
}

function _bounce(value, duration) {
    var that = this;
    var handler = function(val) {
            that.moveAll(0, value - val);
    };
    var animaton = this._createAnimation(duration || 3000, handler);

    animaton.start({ start: 0, end: value });
}

function _roll(value, duration) {
    var that = this;
    var handler = function(val) {
            that.moveAll(value - val, 0);
    };
    var animaton = this._createAnimation(duration || 3000, handler);

    animaton.start({ start: 0, end: value });
}

function _createAnimation(duration, handler, endHandler) {
    var that = this;

    if (this.animation) {
        this.animation.end();
    }
    var _endHandler = function() {
        that.animation = null;
        endHandler && endHandler();
    };

    return this.animation = new Oppai.Animation(duration, handler, _endHandler);
}


//// private methods
function __getCanvas(canvas) {
    var element;

    if (typeof canvas === 'string') {
        element = document.querySelector(canvas);
        if (!element) {
            throw new Error('');
        }
    } else if (canvas && (canvas.tagName.toLowerCase() === 'canvas')) {
        element = canvas;
    } else {
        throw new Error('');
    }
    return element;
}

function __getEnv(ua) {
    var res = {};

    ua = ua.toLowerCase();
    res.isAndroid = /android/.test(ua);
    res.isIos = /ip(hone|od|ad)/.test(ua);
    res.isTouchDevice = 'ontouchstart' in global;
    res.versionString = null;
    res.version = [];

    // for smartphone
    if (res.isAndroid || res.isIos) {
        res.isChrome = /(chrome|crios)/.test(ua);
        res.isAndroidBrowser = !res.isChrome && res.isAndroid && /applewebkit/.test(ua);
        res.isMobileSafari = !res.isAndroid && res.isIos && /applewebkit/.test(ua);
        res.versionString =
            (res.isAndroidBrowser || res.isAndroid && res.isChrome) ? ua.match(/android\s(\S.*?)\;/) :
            (res.isMobileSafari || res.isIos && res.isChrome) ? ua.match(/os\s(\S.*?)\s/) :
            null;
        res.versionString = res.versionString ?
            // iOS だったら、_ を . に直す
            (res.isIos ? res.versionString[1].replace('_', '.') : res.versionString[1]) :
            null;
        if (res.versionString) {
            res.version = res.versionString.split('.');
        }
    }
    // IE様特別仕様
    else {
        res.isIE = /trident/.test(ua) || /msie/.test(ua);
        if (res.isIE) {
            if ((res.versionString = ua.match(/rv:([\d\.]+)/)) ||
                (res.versionString = ua.match(/msie\s([0-9]{1,}[\.0-9]{0,})/))) {
                    res.versionString = res.versionString[1];
                    res.version = res.versionString.split('.');
            }
        }
    }
    if (res.version) {
        for (var i = 0, val; val = res.version[i]; i++) {
            res.version[i] = val|0;
        }
    }
    return res;
}

//// export
global.Oppai = Oppai;
// for AMD
if (!('process' in global) && (typeof global.define === 'function' && global.define.amd)) {
    define([], function() {
        return Oppai;
    });
}

})(this.self || global, void 0);

;(function(global, undefined) {
'use strict';

if (!global.Oppai) {
    throw new Error('Undefined object: "Oppai"');
}
var Math = global.Math;
var Date = global.Date;
var raf = global.Oppai.requestAnimationFrame;

function Animation(duration, handler, endHandler) {
    this.isPlaying = false;
    this._animate = true;
    this.valueList = [];
    this.handler = handler;
    this.endHandler = endHandler;
    this.duration = duration || 1500;
    this.startTime = null;
    this.endTime = null;
    this.currentTime = null;
}

Animation.prototype = {
    constructor: Animation,
    start: function(/** { start: , end: } */) {
        this.valueList = this.valueList.concat([].slice.call(arguments));
        this.isPlaying = true;
        this.startTime = Date.now();
        this.endTime = this.startTime + this.duration;
        this._animation();
    },
    end: function() {
        this.isPlaying = false;
        this._animate = false;
        this.endHandler && this.endHandler();
    },
    reset: function() {
        var emptyValList = [];

        for (var i = 0, iz = this.valueList.length; i < iz; i++) {
            emptyValList[emptyValList.length] = 0;
        }
        this.handler.apply(null, emptyValList);
        this.end();
    },
    _animation: function() {
        var that = this;
        var duration = this.duration;
        var currentTime = this.currentTime = Date.now();
        var elapsedTime = currentTime - this.startTime;
        var isEnd = (currentTime >= this.endTime);
        var valueList = this.valueList;
        var calcValList = [];
        // NOTE: 幻の oppai easing 係数
        var position = duration * 0.11782;

        for (var i = 0, v; v = valueList[i]; i++) {
            calcValList[calcValList.length] = isEnd ? v.end : __elasticEaseOut(elapsedTime, v.start, v.end, duration, null, position);
        }
        this.handler.apply(null, calcValList);

        if (isEnd) {
            this.end();
        } else if (this._animate) {
            raf(function() {
                that._animation();
            });
        }
    }
};

function __elasticEaseOut(t, b, c, d, a, p){
    if (t===0) {
        return b;
    }
    if ((t/=d)===1) {
        return b + c;
    }
    if (!p) {
        p = d * 0.3;
    }
    var s;
    if (!a || a < Math.abs(c)) {
        a = c;
        s = p / 4;
    } else {
        s = p / (2 * Math.PI) * Math.asin(c / a);
    }
    return (a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b);
}

// export
global.Oppai.Animation = Animation;

})(this.self || global, void 0);


;(function(global, undefined) {
'use strict';

if (!global.Oppai) {
    throw new Error('Undefined object: "Oppai"');
}
var Math = global.Math;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} image
 * @param {Object} opp
 * @param {Array}  opp.vertex     [x, y]
 * @param {Array}  opp.area_coods [[x, y], [x, y], ...]
 */
function Breast(ctx, image, opp) {
    this.isDebug = global.Oppai._debug;
    this.vertexPoint = null;
    this.radiallyLines = [];
    this.ctx = ctx;
    this.drawBufferCtx = null;
    this.image = null;
    this.resolution = 2;
    this.initialize(opp, image);
}

Breast.prototype = {
    constructor: Breast,
    draw             : _draw,
    drawBetweenLines : _drawBetweenLines,
    drawTriangle     : _drawTriangle,
    initialize       : _initialize,
    moveTo           : _moveTo,
    getBoundingBox   : _getBoundingBox
};

function _moveTo(rateX, rateY) {
    var resolution = this.resolution;
    var vertexPoint = this.vertexPoint;
    var vx = (rateX / 100) * (
                (rateX < 0) ? vertexPoint.x :
                (rateX > 0) ? (this.width - vertexPoint.x) : 0);
    var vy = (rateY / 100) * (
                (rateY < 0) ? vertexPoint.y :
                (rateY > 0) ? (this.height - vertexPoint.y) : 0);
    var radiallyLines = this.radiallyLines;
    var radian = Math.atan2(vy, vx);
    var angle = __getAngleByRadian(radian);
    var dist = Math.sqrt(vx * vx + vy * vy);
    var weightBase = 1 / this.resolution;
    var line, point;
    var i = 0, j;

    // 頂点の移動距離を制限するので、現在のangleと中心から四方に4分割したうち該当する方向の円の半径と比較する
    var limitDist, limitX, limitY;

    if (0 <= angle && angle < 90) {
        limitX = this.width - vertexPoint.x;
        limitY = vertexPoint.y;
    }
    else if (90 <= angle && angle < 180) {
        limitX = vertexPoint.x;
        limitY = vertexPoint.y;
    }
    else if (180 <= angle && angle < 270) {
        limitX = vertexPoint.x;
        limitY = this.height - vertexPoint.y;
    }
    else if (270 <= angle) {
        limitX = this.width - vertexPoint.x;
        limitY = this.height - vertexPoint.y;
    }
    limitDist = Math.sqrt(limitX * limitX + limitY * limitY);
    // 制限を超えているので、頂点座標などを修正する
    if (dist > limitDist) {
        dist = limitDist;
        vx = limitDist * Math.cos(radian) + vertexPoint.x;
        vy = limitDist * Math.sin(radian) + vertexPoint.y;
    }

    this.drawBufferCtx = this.bufferHandler.getDrawBufferCtx();
    this.drawBufferCtx.clearRect(0, 0, this.width + 1, this.height + 1);
    vertexPoint.setMoveValue(vx, vy);
    for (; line = radiallyLines[i]; i++) {
        // 一番外側は動かない
        j = line.length - resolution;

        while ((point = line[j])) {
            var direction = Math.abs(angle - point.angle);
            var weight = weightBase * (j + 1);

            // 同方向
            if (direction < 60) {
                // NOTE. 移動距離がこのpointの距離より短い場合、このpointの移動距離をより短くする
                if (point.distance > dist) {
                    weight *= 0.5;
                }
                // NOTE. 同方向のpointの基本移動距離は短めにする
                else {
                    weight *= 0.85;
                }
            }
            // 逆方向
            else if (direction > 300) {
                // NOTE. 逆方向の場合、移動距離は長めにする
                weight *= 1.2;
            }
            point.setMoveValue(vx * weight, vy * weight);
            j--;
        }
        if (i > 0) {
            this.drawBetweenLines(
                radiallyLines[i - 1],
                line
            );
        }
    }
    this.drawBetweenLines(
        radiallyLines[i - 1],
        radiallyLines[0]
    );
    this.bufferHandler.drawComplete();
}

function _initialize(opp, img) {
    var vertex = opp.vertex;
    var resolution = this.resolution;
    var roundCoords = opp.round_coords;
    var radiallyLines = this.radiallyLines;
    var minX, minY, maxX, maxY;
    var width, height;
    var i, coord;

    // NOTE. 描画領域設定用
    minX = minY = 99999;
    maxX = maxY = 0;

    for (i = 0, coord = null; coord = roundCoords[i]; i++) {
        minX = Math.min(minX, coord[0]);
        minY = Math.min(minY, coord[1]);
        maxX = Math.max(maxX, coord[0]);
        maxY = Math.max(maxY, coord[1]);
    }

    var vx = vertex[0] - minX;
    var vy = vertex[1] - minY;

    this.vertexPoint = new Point(vx, vy);
    // FIXME. 2回回すのはダサいが…
    for (i = 0, coord = null; coord = roundCoords[i]; i++) {
        radiallyLines[radiallyLines.length] = _getLinePointList(
            vx, vy,
            coord[0] - minX,
            coord[1] - minY,
            resolution);
    }

    this.baseX = minX;
    this.baseY = minY;
    this.width = width = maxX - minX;
    this.height = height = maxY - minY;
    this.bufferHandler = new Oppai.RenderBufferHandler(img, minX, minY, width, height);
    this.image = this.bufferHandler.getSrcCanvas();

    function _getLinePointList(vx, vy, ox, oy, resolution) {
        var res = [];

        if (resolution > 1) {
            var dx = (ox - vx) / resolution;
            var dy = (oy - vy) / resolution;

            for (var i = 1; i < resolution; i++) {
                res[res.length] = new Point(vx + (dx * i), vy + (dy * i), vx, vy);
            }
        }
        res[res.length] = new Point(ox, oy, vx, vy);
        return res;
    }
}

function _draw() {
    this.ctx.drawImage(
        this.bufferHandler.getDrewCanvas(),
        this.baseX, this.baseY
    );
}

function _drawBetweenLines(line1, line2) {
    var i = 0, j;

    this.drawTriangle(line1[i], line2[i], this.vertexPoint);
    while (!!line1[(j = i + 1)]) {
        this.drawTriangle(line1[i], line2[i], line1[j]);
        this.drawTriangle(line2[i], line1[j], line2[j]);
        ++i;
    }
}

function _drawTriangle(p0, p1, p2) {
    var ctx = this.drawBufferCtx;
    var img = this.image;

    // 各ポイントが動いている現在の座標系
    var p0coord = p0.getCurrentXY();
    var p1coord = p1.getCurrentXY();
    var p2coord = p2.getCurrentXY();
    var p0x = p0coord.x;
    var p0y = p0coord.y;
    var p1x = p1coord.x;
    var p1y = p1coord.y;
    var p2x = p2coord.x;
    var p2y = p2coord.y;

    var ax = p1x - p0x;
    var ay = p1y - p0y;
    var bx = p2x - p0x;
    var by = p2y - p0y;

    // uv座標
    // FIXME. UV座標用のMatrixはキャッシュできそう
    var uvAx = (p1.x - p0.x);
    var uvAy = (p1.y - p0.y);
    var uvBx = (p2.x - p0.x);
    var uvBy = (p2.y - p0.y);

    var m = new MatrixUtil(uvAx, uvAy, uvBx, uvBy);
    var mInvert = m.getInvert();

    if (!mInvert) {
        return;
    }
    var a, b, c, d;

    a = mInvert.a * ax + mInvert.b * bx;
    c = mInvert.c * ax + mInvert.d * bx;
    b = mInvert.a * ay + mInvert.b * by;
    d = mInvert.c * ay + mInvert.d * by;

    // 描画
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.lineTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d,
        p0x - (a * p0.x + c * p0.y),
        p0y - (b * p0.x + d * p0.y));
    ctx.drawImage(img, 0, 0);
    if (this.isDebug) {
        ctx.strokeStyle = 'blue';
        ctx.stroke();
    }
    ctx.restore();
}

function _getBoundingBox() {
    return {
        minX: this.baseX,
        minY: this.baseY,
        maxX: this.baseX + this.width,
        maxY: this.baseY + this.height
    };
}

function Point(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.moveX = 0;
    this.moveY = 0;
    // 頂点が入力された場合は、頂点からの距離, ratian, 角度を生成
    if (vx !== undefined && vy !== undefined) {
        this.distX = vx - this.x;
        this.distY = vy - this.y;
        this.distance = Math.sqrt(this.distX * this.distX + this.distY * this.distY);
        this.radian = Math.atan2(this.distY, this.distX);
        this.angle = __getAngleByRadian(this.radian);
    } else {
        this.distX = 0;
        this.distY = 0;
        this.distance = 0;
        this.radian = null;
        this.angle = null;
    }
}

Point.prototype = {
    constructor: Point,
    getCurrentXY: _getCurrentXY,
    setMoveValue: _setMoveValue
};

function _getCurrentXY() {
    return {
        x: this.x + this.moveX,
        y: this.y + this.moveY
    };
}

function _setMoveValue(x, y) {
    this.moveX = x;
    this.moveY = -y;
}

function MatrixUtil(a, b, c, d) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
}

MatrixUtil.prototype.getInvert = function() {
    var det = this.a * this.d - this.b * this.c;

    if (det > -0.0001 && det < 0.0001) {
        return null;
    }
    return (new MatrixUtil(
        this.d / det,
        -this.b / det,
        -this.c / det,
        this.a / det
    ));
};

function __getAngleByRadian(rad) {
    return rad * (180 / Math.PI);
}

//// export
global.Oppai.Breast = Breast;

})(this.self || global, void 0);

;(function(global, undefined) {
'use strict';

if (!global.Oppai) {
    throw new Error('Undefined object: "Oppai"');
}
var Math = global.Math;
var STATES = {
        NONE: 0,
        WAIT: 1,
};

function MotionHandler(handler) {
    this.startThreshold = 12;
    this.endThreshold = 7;
    this.handler = handler;
    this.state = STATES.NONE;
    this.currentVector = null;
}

MotionHandler.prototype = {
    constructor: MotionHandler,
    handleEvent: function(ev) {
        var acceleration = ev.acceleration;
        var distance = Math.sqrt(acceleration.x * acceleration.x + acceleration.y * acceleration.y);

        if (this.state === STATES.NONE && distance >= this.startThreshold) {
            this.currentVector = {
                distance: distance,
                x: acceleration.x,
                y: acceleration.y
            };
            this.state = STATES.WAIT;
        }
        // 既に開始されていてふり終わるのを待ってる
        else if (this.state === STATES.WAIT && distance < this.endThreshold) {
            // 重いので一旦イベントの処理は外す
            this.off();
            this.handler(this.currentVector);
            this.currentVector = null;
            this.state = STATES.NONE;
            // 再度 bind するです
            this.on();
        }
    },
    on: function() {
        global.addEventListener('devicemotion', this);
    },
    off: function() {
        global.removeEventListener('devicemotion', this);
    }
};

// export
global.Oppai.MotionHandler = MotionHandler;

})(this.self || global, void 0);


;(function(global, undefined) {
'use strict';

if (!global.Oppai) {
    throw new Error('Undefined object: "Oppai"');
}
var document = global.document;

function RenderBufferHandler(img, x, y, width, height) {
    var srcCanvas = this.srcCanvas = document.createElement('canvas');

    srcCanvas.width = width;
    srcCanvas.height = height;
    this.srcCtx = srcCanvas.getContext('2d');

    this.canvases = [];
    this.contexts = [];

    for (var i = 0, iz = 2, canvas; i < iz; i++) {
        canvas = srcCanvas.cloneNode();
        this.canvases.push(canvas);
        this.contexts.push(canvas.getContext('2d'));
    }

    this.currentBufferIndex = 0;
    this.drewBufferIndex = 1;

    this.srcCtx.drawImage(img,
                          x, y, width, height,
                          0, 0, width, height);

    if (global.Oppai._debug) {
        document.body.appendChild(this.srcCanvas);
        for (var j = 0, c; c = this.canvases[j]; j++) {
            document.body.appendChild(c);
        }
    }
}

RenderBufferHandler.prototype = {
    constructor: RenderBufferHandler,
    getSrcCanvas: function() {
        return this.srcCanvas;
    },
    getDrawBufferCtx: function() {
        return this.contexts[this.currentBufferIndex];
    },
    drawComplete: function() {
        var drew = this.drewBufferIndex;

        this.drewBufferIndex = this.currentBufferIndex;
        this.currentBufferIndex = drew;
    },
    getDrewCanvas: function() {
        return this.canvases[this.drewBufferIndex];
    }
};

//// export
global.Oppai.RenderBufferHandler = RenderBufferHandler;

})(this.self || global, void 0);
