;(function(global, undefined) {
'use strict';

if (!global.Oppai) {
    throw new Error('Undefined object: "Oppai"');
}
var document = global.document;

function DoubleBufferingHandler(img, x, y, width, height) {
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

DoubleBufferingHandler.prototype = {
    constructor: DoubleBufferingHandler,
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
global.Oppai.DoubleBufferingHandler = DoubleBufferingHandler;

})(this.self || global, void 0);
