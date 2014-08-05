;(function(global, undefined) {
var DEBUG = false;
var document = global.document;
var env = __getEnv(global.navigation.userAgent);
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

/**
 * @param {String|HTMLCanvasElement} canvas
 * @param {String} imagePath
 * @param {Object} opps[]
 * @param {Array}  opps[].vertex     [x, y]
 * @param {Array}  opps[].area_coods [[x, y], [x, y], ...]
 */
function Oppai() {
    var that = this;
    var args = [].slice.call(arguments);
    var canvas = args.shift();
    var imgPath = args.shift();

    this.canvas = __getCanvas(canvas);
    this.ctx = this.canvas.getContext('2d');
    this.imgPath = imgPath;
    this.hooters = [];
    this._opps = args;
    this._loadImage(function() {
        that._initHooters();
    });
}


//// static methods
Oppai.getTouchInfoFromEvent = _getTouchInfo;

function _getTouchInfo(event, name) {
    return env.isTouchDevice ? event.changedTouches[0][name] : event[name];
}


//// instance methods
Oppai.prototype = {
    constructor: Oppai,
    update: _update,
    _init: _init,
    _loadImage: _loadImage
};

function _update() {
    var that = this;
    var hooters = this.hooters;

    raf(function() {
        that.update();
    });
}

function _init() {
    var opps = this._oops;
    var canvas = this.canvas;
    var image = this.image;

    for (var i = 0, opp; opp = args[i]; i++) {
        this.hooters.push(new Oppai.Breast(ctx, image, opp));
    }
}

function _loadImage(callback) {
    var image = this.image = new Image();

    image.onload = callback;
    image.onerror = function() {
        throw new Error('');
    };
    image.src = this.imgPath;
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
    var version;

    ua = ua.toLowerCase();
    res.isAndroid = /android/.test(ua);
    res.isIos = /ip(hone|od|ad)/.test(ua);
    res.isChrome = /(chrome|crios)/.test(ua);
    res.isAndroidBrowser = !res.chrome && res.android && /applewebkit/.test(ua);
    res.isMobileSafari = !res.chrome && res.ios && /applewebkit/.test(ua);
    res.isTouchDevice = 'ontouchstart' in global;

    res.versionString =
        (res.androidBrowser || res.android && res.chrome) ? ua.match(/android\s(\S.*?)\;/) :
        (res.mobileSafari || res.ios && res.chrome) ? ua.match(/os\s(\S.*?)\s/) :
        null;
    res.versionString = res.versionString ?
        // iOS だったら、_ を . に直す
        (res.ios ? res.versionString[1].replace('_', '.') : res.versionString[1]) :
        null;
    res.version = version = res.versionString ? res.versionString.split('.') : null;

    return res;
}

//// export
global.Oppai = Oppai;

})(this.self || global, void 0);
