;(function(global, undefined) {
'use strict';

if (!global.Oppai) {
    throw new Error('Undefined objecct: "Oppai"');
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
    var roundCoords = opp.round_coords;

    this.isDebug = global.Oppai._debug;
    this.vertexPoint = null;
    this.radiallyLines = [];
    this.ctx = ctx;
    this.image = image;
    this.resolution = 2;
    this.createPoints(opp);
}

Breast.prototype = {
    constructor: Breast,
    draw: _draw,
    drawTriangle: _drawTriangle,
    createPoints: _createPoints,
    moveTo: _moveTo
};

function _moveTo(rateX, rateY) {
    var vertexPoint = this.vertexPoint;
    var vx = (rateX / 100) * (
                (rateX < 0) ? (vertexPoint.x - this.minX) :
                (rateX > 0) ? (this.maxX - vertexPoint.x) : 0);
    var vy = (rateY / 100) * (
                (rateY < 0) ? (vertexPoint.y - this.minY) :
                (rateY > 0) ? (this.maxY - vertexPoint.y) : 0);
    var radiallyLines = this.radiallyLines;
    var radian = Math.atan2(vy, vx);
    var angle = __getAngleByRadian(radian);
    var dist = Math.sqrt(vx * vx + vy * vy);
    var minDist = dist;
    var weightBase = 1 / this.resolution;
    var ral, point;
    var i = 0, j;

    for (; ral = radiallyLines[i]; i++) {
        // 一番外側から2番目が動く(一番外側は動かさない)
        j = ral.length - 2;

        while ((point = ral[j])) {
            var direction = Math.abs(angle - point.angle);
            var weight = weightBase * (j + 1);

            switch (true) {
                // 同方向
                case (direction < 60):
                    if (point.distance > dist) {
                        if (minDist > point.distance) {
                            minDist = point.distance;
                            vx = minDist * Math.cos(radian) + vertexPoint.x;
                            vy = minDist * Math.sin(radian) + vertexPoint.y;
                        }
                        weight *= 0.5;
                    } else {
                        weight *= 0.85;
                    }
                    break;
                // 逆方向
                case (direction > 300):
                    weight *= 1.2;
                    break;
            }
            point.setMoveVolume(vx * weight, vy * weight);
            j--;
        }
    }
    vertexPoint.setMoveVolume(vx, vy);
}

function _createPoints(opp) {
    var vertex = opp.vertex;
    var resolution = this.resolution;
    var roundCoords = opp.round_coords;
    var radiallyLines = this.radiallyLines;
    var linePointList;
    var minX, minY, maxX, maxY;

    // 描画領域設定用
    minX = minY = 99999999;
    maxX = maxY = 0;

    this.vertexPoint = new Point(vertex[0], vertex[1]);
    for (var i = 0, coord; coord = roundCoords[i]; i++) {
        radiallyLines[radiallyLines.length] = _getLinePointList(vertex, coord, resolution);
        minX = Math.min(minX, coord[0]);
        minY = Math.min(minY, coord[1]);
        maxX = Math.max(maxX, coord[0]);
        maxY = Math.max(maxY, coord[1]);
    }

    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
    this.moveRangeX = (maxX - minX) / 2;
    this.moveRangeY = (maxY - minY) / 2;

    function _getLinePointList(vertex, outer, resolution) {
        var res = [];

        if (resolution > 1) {
            var vx = vertex[0];
            var vy = vertex[1];
            var dx = (outer[0] - vx) / resolution;
            var dy = (outer[1] - vy) / resolution;

            for (var i = 1; i < resolution; i++) {
                res[res.length] = new Point(vx + (dx * i), vy + (dy * i), vertex[0], vertex[1]);
            }
        }
        res[res.length] = new Point(outer[0], outer[1], vertex[0], vertex[1]);
        return res;
    }
}

function _draw() {
    var vertexPoint = this.vertexPoint;
    var radiallyLines = this.radiallyLines;
    var ral, nextRal;
    var i = 0, j, k;

    for (; ral = radiallyLines[i]; i++) {
        nextRal = radiallyLines[i + 1] || radiallyLines[0];
        j = 0;

        this.drawTriangle(ral[j], nextRal[j], vertexPoint);
        while (!!ral[(k = j + 1)]) {
            this.drawTriangle(ral[j], nextRal[j], ral[k]);
            this.drawTriangle(nextRal[j], ral[k], nextRal[k]);
            j++;
        }
    }
}


function _drawTriangle(p0, p1, p2) {
    var ctx = this.ctx;
    var img = this.image;
    var imgWidth = img.width;
    var imgHeight = img.height;

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
    ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
    if (this.isDebug) {
        ctx.strokeStyle = 'blue';
        ctx.stroke();
    }
    ctx.restore();
}

function Point(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.moveX = 0;
    this.moveY = 0;
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
    setMoveVolume: _setMoveVolume
};

function _getCurrentXY() {
    return {
        x: this.x + this.moveX,
        y: this.y + this.moveY
    };
}

function _setMoveVolume(x, y) {
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
