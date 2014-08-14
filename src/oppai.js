;(function(global, undefined) {
'use strict';

var Math = global.Math;
var Date = global.Date;
var document = global.document;
var env = __getEnv(global.navigator.userAgent);
var events = {
        touchStart: env.isTouchDevice && "touchstart" || "mousedown",
        touchMove:  env.isTouchDevice && "touchmove"  || "mousemove",
        touchEnd:   env.isTouchDevice && "touchend"   || "mouseup"
};
var raf = global.requestAnimationFrame ||
          global.webkitRequestAnimationFrame ||
          global.mozRequestAnimationFrame ||
          global.oRequestAnimationFrame ||
          global.msRequestAnimationFrame ||
          (function(timing) { return function(cb) { global.setTimeout(cb, timing); } })(1000/60);
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
    _createAction     : _createAction,
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
    var minX, minY, maxX, maxY;

    // NOTE. 描画領域設定用のダミー値
    minX = minY = 99999999;
    maxX = maxY = 0;

    canvas.width = image.width;
    canvas.height = image.height;
    if (this.setting.dpr > 1) {
        var dpr = this.setting.dpr;

        canvas.style.width = (image.width / dpr) + 'px';
        canvas.style.height = (image.height / dpr) + 'px';
    }
    // 最初の一回描画
    ctx.drawImage(image, 0, 0);

    for (var i = 0, opp, b; opp = oppList[i]; i++) {
        b = breasts[i] = new Oppai.Breast(ctx, image, opp);
        minX = Math.min(minX, b.minX);
        minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX);
        maxY = Math.max(maxY, b.maxY);
    }
    // NOTE. 設定する余白(一旦決め打ちで 20px )
    var allowance = 20;

    this.bgDrawRect = {
        x: Math.max(0, minX - allowance),
        y: Math.max(0, minY - allowance),
        w: Math.min(canvas.width , maxX + allowance),
        h: Math.min(canvas.height, maxY + allowance)
    };
    // 基準値からの幅と高さなので、それぞれ x, y を引く
    this.bgDrawRect.w -= this.bgDrawRect.x;
    this.bgDrawRect.h -= this.bgDrawRect.y;
    this.bgDrawRect.center = {
        x: this.bgDrawRect.x + (this.bgDrawRect.w / 2),
        y: this.bgDrawRect.y + (this.bgDrawRect.h / 2),
    };

    if (env.isTouchDevice && 'ondevicemotion' in global) {
        this._initTouchHandler();
    }
    if (this.setting.enableTouch) {
        canvas.addEventListener(env.isTouchDevice ? 'touchstart' : 'click', this);
    }
    this.update();
}

function _handleEvent(ev) {
    var canvas = this.canvas;
    var bgDrawRect = this.bgDrawRect;
    var x = __getTouchInfo(ev, 'pageX') - canvas.clientLeft;
    var y = __getTouchInfo(ev, 'pageY') - canvas.clientTop;
    if (!(bgDrawRect.x < x && x < (bgDrawRect.x + bgDrawRect.w)) ||
        !(bgDrawRect.y < y && y < (bgDrawRect.y + bgDrawRect.h))) {
            return;
    }
    this.bounce(80, 2000);
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

    image.onload = function() {
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
}

function _update() {
    var breasts = this.breasts;
    var bgDrawRect = this.bgDrawRect;

    if (!bgDrawRect) {
        console.warn('bgDrawRect is not set yet');
        return;
    }
    // 胸の範囲を再描画
    this.ctx.drawImage(this.image,
                       bgDrawRect.x, bgDrawRect.y, bgDrawRect.w, bgDrawRect.h,
                       bgDrawRect.x, bgDrawRect.y, bgDrawRect.w, bgDrawRect.h);
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
    var action = this._createAction(duration || 3000, handler);

    action.start(
        { start: 0, end: x },
        { start: 0, end: y }
    );
}

function _bounce(value, duration) {
    var that = this;
    var handler = function(val) {
            that.moveAll(0, value - val);
    };
    var action = this._createAction(duration || 3000, handler);

    action.start({ start: 0, end: value });
}

function _roll(value, duration) {
    var that = this;
    var handler = function(val) {
            that.moveAll(value - val, 0);
    };
    var action = this._createAction(duration || 3000, handler);

    action.start({ start: 0, end: value });
}

function _createAction(duration, handler, endHandler) {
    var that = this;

    if (this.action) {
        this.action.end();
    }
    var _endHandler = function() {
        that.action = null;
        endHandler && endHandler();
    };

    return this.action = new Oppai.Action(duration, handler, _endHandler);
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
                (res.versionString = ua.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/))) {
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

function __getTouchInfo(ev, name) {
    return env.isTouchDevice ? ev.changedTouches[0][name] : ev[name];
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
