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

