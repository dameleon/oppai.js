oppai.js
========

おっぱいをぷるんぷるんさせるJavascript

## How to use

```javascript
var leftOpp = {
        vertex: [v_x, v_y],
        rect:   [[right_top_x, right_top_y], [left_bottom_x, left_bottom_y]]
};
var rightOpp = {
        vertex: [v_x, v_y],
        rect:   [[right_top_x, right_top_y], [left_bottom_x, left_bottom_y]]
};

oppai('path/to/image', '#canvas_query_string', leftOpp, rightOpp);
```
