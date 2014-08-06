;(function(global, undefined) {

if (!global.Oppai) {
    throw new Error('Undefined objecct: "Oppai"');
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} image
 * @param {Object} opp
 * @param {Array}  opp.vertex     [x, y]
 * @param {Array}  opp.area_coods [[x, y], [x, y], ...]
 */
function Breast(ctx, image, opp) {
    var roundCoords = opp.round_coords;
    var roundPoints;

    this.ctx = ctx;
    this.image = image;
    this.vertexPoint = new Point(opp.vertex[0], opp.vertex[1]);
    this.roundPoints = roundPoints = [];
    for (var i = 0, coord; coord = roundCoords[i]; i++) {
        roundPoints.push(new Point(coord[0], coord[1]));
    }
    this.draw();
}

Breast.prototype = {
    constructor: Breast,
    update: _update,
    draw: _draw,
    drawTriangle: _drawTriangle,
};

function _update() {

}

function _draw() {
    var that = this;
    var vertexPoint =  that.vertexPoint;
    var roundPoints = that.roundPoints;
    var rp, nextRp;
    var i = 0, j;

    for (; rp = roundPoints[i]; i++) {
        nextRp = roundPoints[i + 1] || roundPoints[0];
        that.drawTriangle(rp, nextRp, vertexPoint);
        console.log(rp, nextRp, vertexPoint);
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
    var a = mInvert.a * uvAx + mInvert.b * uvBx;
    var b = mInvert.c * uvAx + mInvert.d * uvBx;
    var c = mInvert.a * uvAy + mInvert.b * uvBy;
    var d = mInvert.c * uvAy + mInvert.d * uvBy;

    // 描画
    with (ctx) {
        save();
        beginPath();
        moveTo(p0x, p0y);
        lineTo(p1x, p1y);
        lineTo(p2x, p2y);
        closePath();
        clip();
        transform(a, b, c, d,
            p0x - (a * p0.x + c * p0.y),
            p0y - (b * p0.x + d * p0.y));
        drawImage(img, 0, 0);
        restore();
    }
}

////
function Point(x, y) {
    this.x = x;
    this.y = y;
}

Point.prototype = {
    constructor: Point,
    getCurrentXY: _getCurrentXY
};

function _getCurrentXY() {
    return {
        x: this.x,
        y: this.y
    };
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

//// export
global.Oppai.Breast = Breast;

})(this.self || global, void 0);
