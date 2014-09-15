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
    this.bufferHandler = new Oppai.DoubleBufferingHandler(img, minX, minY, width, height);
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
