/**
 * Oppai.js
 *
 * @name     oppai.js
 * @author   kei takahashi (twitter@damele0n)
 * @mail     dameleon[at]gmail.com
 * @url      https://github.com/dameleon/oppai.js
 * @license  Creative Commons Attribution-ShareAlike 2.1 Japan License
 * @required tt.js (@see https://github.com/dameleon/tt.js)
 */

;(function(global, document, tt, undefined) {
    var NS = "oppai",
        supportTouch = ("ontouchstart" in global),
        events = {
            touchStart: supportTouch ? "touchstart" : "mousedown",
            touchMove:  supportTouch ? "touchmove"  : "mousemove",
            touchEnd:   supportTouch ? "touchend"   : "mouseup",
        },
        isSmartphone = (tt.env.android || tt.env.ios),

        // easing function from JSTween
        // @name   JSTween
        // @author Marco Wolfsheimer
        // @url    http://www.jstween.org/
        easingFunctions = {
            linear:  function(t, b, c, d) {
                return c * t / d + b;
            },
            bounseout: function(t, b, c, d) {
                if ((t /= d) < (1 / 3)) {
					return c * (10.5625 * t * t) + b;

				} else if (t < (2 / 3)) {
					return c * (10.5625 * (t -= (1.5 / 2.75)) * t + 0.75) + b;

				} else if (t < (2.5 / 3)) {
					return c * (10.5625 * (t -= (2.25 / 2.75)) * t + 0.9375) + b;

				} else {
					return c * (10.5625 * (t -= (2.625 / 2.75)) * t + 0.984375) + b;
				}
            }
        };

    global.requestAnimationFrame =
        global.requestAnimationFrame ||
        global.webkitRequestAnimationFrame ||
        global.mozRequestAnimationFrame ||
        global.oRequestAnimationFrame ||
        global.msRequestAnimationFrame ||
        function(callback) {
            global.setTimeout(callback, 1000 / 60);
        };

    global[NS] = global[NS] || function(img_path, viewer_selector, set_1, set_2) {
        var viewer = tt(viewer_selector),
            img = new Image(),
            op_1, op_2;

        viewer.on(events.touchMove, function(ev) {
            ev.preventDefault();
        });
        img.onload = function() {
            viewer.css({
                "position":   "relative",
                "margin":     "0",
                "width":      img.width + "px",
                "height":     img.height + "px",
                "background": "url(" + img_path + ") no-repeat left top",
                "zoom":       isSmartphone ? "0.5" : "1"
            });
            op_1 = new Oppai(img, viewer.get(), set_1.vertex, set_1.rect);
            op_2 = new Oppai(img, viewer.get(), set_2.vertex, set_2.rect);
        };
        img.src = img_path;
    };

    function Oppai(img, canvas, vertex, rect) {
        return (this instanceof Oppai) ?
                    this.init(img, canvas, vertex, rect) :
                    new Oppai(img, canvas, vertex, rect);
    }

    Oppai.prototype = {
        constructor: Oppai,
        init: function(img, viewer, vertex, rect) {
            var threshold = 35;

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
            this.img = img;

            // 切り出す幅を設定
            this.width = rect[1][0] - rect[0][0];
            this.height = rect[1][1] - rect[0][1];

            // ルートの座標を保存
            this.rootCoords = {
                x: rect[0][0],
                y: rect[0][1]
            };

            // 初期の頂点座標をcanvasの座標系にあわせる
            this.vertex = {
                x: vertex[0] - rect[0][0],
                y: vertex[1] - rect[0][1]
            };

            // 左上,右上,右下,左下の順で座標を設定
            this.coords = [
                { x: 0,          y: 0},
                { x: this.width, y: 0},
                { x: this.width, y: this.height},
                { x: 0,          y: this.height}
            ];

            // 頂点の動き制限範囲
            this.threshold = {
                min: { x: this.vertex.x - threshold, y: this.vertex.y - threshold },
                max: { x: this.vertex.x + threshold, y: this.vertex.y + threshold }
            };

            this.animation = new Animation2D("bounseout");

            // set canvas element
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            tt(this.canvas).css({
                "position": "absolute",
                "top": rect[0][1] + "px",
                "left": rect[0][0] + "px"
            });

            // binding events
            this.canvas.addEventListener(events.touchStart, this, false);
            this.canvas.addEventListener(events.touchMove,  this, false);
            this.canvas.addEventListener(events.touchEnd,   this, false);
            if (tt.env.ios) {
                global.addEventListener("devicemotion", this, false);
            }

            // initial running
            viewer.appendChild(this.canvas);
            this.draw();
        },
        draw: function() {
            this.ctx.drawImage(
                this.img,
                this.rootCoords.x,
                this.rootCoords.y,
                this.width,
                this.height,
                0,
                0,
                this.width,
                this.height
            );
        },
        transform: function(vertex) {
            var ctx = this.ctx,
                current, next;

            ctx.clearRect(0, 0, this.width, this.height);

            for (var i = 0, iz = 3; i <= iz; ++i) {
                current = this.coords[i];
                next = this.coords[(i !== iz) ? (i + 1) : 0];
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(current.x, current.y);
                ctx.lineTo(next.x, next.y);
                ctx.lineTo(vertex.x, vertex.y);
                ctx.closePath();
                ctx.clip();
                this.triangles[i].call(this, vertex);
                this.draw();
                ctx.restore();
            }
        },
        triangles: [
            function(vertex) {
                this.ctx.setTransform(
                    1,
                    0,
                    (vertex.x - this.vertex.x) / this.height,
                    (vertex.y - this.vertex.y) / this.height + 1,
                    0,
                    0
                );
            },
            function(vertex) {
                var x = this.vertex.x - vertex.x,
                    y = this.vertex.y - vertex.y;

                this.ctx.setTransform(
                    x / this.width + 1,
                    y / this.width,
                    0,
                    1,
                    -x,
                    -y
                );
            },
            function(vertex) {
                var x = this.vertex.x - vertex.x,
                    y = this.vertex.y - vertex.y;

                this.ctx.setTransform(
                    1,
                    0,
                    x / this.height,
                    y / this.height + 1,
                    -x,
                    -y
                );
            },
            function(vertex) {
                this.ctx.setTransform(
                    (vertex.x - this.vertex.x) / this.width + 1,
                    (vertex.y - this.vertex.y) / this.width,
                    0,
                    1,
                    0,
                    1
                );
            }
        ],
        handleEvent: function(ev) {
            ev.preventDefault();
            switch (ev.type) {
            case "devicemotion":
                this._startVertex || this._deviceMotion(ev);
                break;
            case events.touchStart:
                this._touchStart(ev);
                break;
            case events.touchMove:
                if (!this.animation.playing && this._startVertex) {
                    this._touchMove(ev);
                }
                break;
            case events.touchEnd:
                this._startVertex && this._touchEnd(ev);
                break;
            }
        },
        _deviceMotion: function(ev) {
            var self = this,
                accX = (ev.acceleration.x * 5) | 0,
                accY = (ev.acceleration.y * 5) | 0,
                currentVertex;

            currentVertex = this._getRangedVertex({
                                x: accX + this.vertex.x,
                                y: accY + this.vertex.y
                            });
            //self.transform(currentVertex);
            global.setTimeout(function() {
                !this._startVertex && self.transform(currentVertex);
            });
        },
        _touchAnimation: function(fromVertex) {
            var self = this;

            this.animation.play(fromVertex, this.vertex, 600, function(value, isContinue) {
                self.transform(value);
                isContinue || (self._startVertex = null);
            });
        },
        _touchStart: function(ev) {
            this._startVertex = this._getTouchVertex(ev);
        },
        _touchMove: function(ev) {
            var vertex = this._getTouchVertex(ev, true);

            this.transform(vertex);
        },
        _touchEnd: function(ev) {
            var vertex = this._getTouchVertex(ev, true);

            this._touchAnimation(vertex);
        },
        _getRangedVertex: function(vertex) {
            return {
                x: getRangedNumber(vertex.x, this.threshold.min.x, this.threshold.max.x),
                y: getRangedNumber(vertex.y, this.threshold.min.y, this.threshold.max.y)
            };
        },
        _getTouchVertex: function(ev, round) {
            var currentVertex = {
                x: getTouchInfo(ev, "pageX") - (isSmartphone ? this.rootCoords.x * 0.5 : this.rootCoords.x),
                y: getTouchInfo(ev, "pageY") - (isSmartphone ? this.rootCoords.y * 0.5 : this.rootCoords.y)
            };

            return round ? this._getRangedVertex(currentVertex) : currentVertex;
        }
    };

    function Animation2D(type) {
        return (this instanceof Animation2D) ?
                    this.init(type) :
                    new Animation2D(type);
    }

    Animation2D.prototype = {
        constructor: Animation2D,
        init: function(type) {
            this.type = type;
            this.easing = easingFunctions[type];
            return this;
        },
        play: function(from, to, duration, callback, type) {
            this.set(from, to, duration, callback, type);
            this.exec();
        },
        stop: function() {
            this._continue = false;
        },
        set: function(from, to, duration, callback, type) {
            this.from = from;
            this.to = to;
            this.changein = {
                x: to.x - from.x,
                y: to.y - from.y
            };
            this.duration = duration;
            this.callback = callback;
            type && this.init(type);
        },
        exec: function() {
            var self = this;

            this.startAt = new Date;
            this._continue = true;
            _loop();

            function _loop() {
                self._animate() && global.requestAnimationFrame(_loop);
            }
        },
        _animate: function() {
            var elapsedTime = (new Date) - this.startAt,
                value = {};

            this.playing = this._continue && (elapsedTime <= this.duration);

            value.x = this.playing ?
                        this.easing(elapsedTime, this.from.x, this.changein.x, this.duration) :
                        this.to.x;
            value.y = this.playing ?
                        this.easing(elapsedTime, this.from.y, this.changein.y, this.duration) :
                        this.to.y;

            this.callback(value, this.playing);
            return this.playing;
        }
    };

    function getRangedNumber(target, min, max) {
        return (target <= min) ? min :
               (target >= max) ? max :
               target;
    }

    function getTouchInfo(event, name) {
        return supportTouch ? event.changedTouches[0][name] : event[name];
    }

})(this, document, this.tt);
