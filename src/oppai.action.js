;(function(global, undefined) {
'use strict';

if (!global.Oppai) {
    throw new Error('Undefined objecct: "Oppai"');
}
var Math = global.Math;
var Date = global.Date;
var raf = global.Oppai.requestAnimationFrame;

function Action(duration, handler, endHandler) {
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

Action.prototype = {
    constructor: Action,
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
    if (t==0)      return b;
    if ((t/=d)==1) return b + c;
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
global.Oppai.Action = Action;

})(this.self || global, void 0);

