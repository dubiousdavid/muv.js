# muv.js

[Snabbdom](https://github.com/snabbdom/snabbdom) + [Kefir](http://rpominov.github.io/kefir) + ["The Elm Architecture"](https://github.com/evancz/elm-architecture-tutorial)

muv.js combines the above to make frontend development simple and fun.

## Examples

1. [Counter](http://dubiousdavid.github.io/muv.js/examples/counter/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/counter/index.js))
2. [Wikipedia](http://dubiousdavid.github.io/muv.js/examples/wikipedia/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/wikipedia/index.js))

## What it looks like

HTML is represented using arrays, which are automatically converted to hyperscript.

```Javascript
import { bus, render, mkEmit } from '../../src/index.js'

// Stream
let actions$ = bus()
let emit = mkEmit(actions$)

// Model
let initModel = 0

// Update
function update(model, [action]) {
  switch (action) {
    case 'add':
      return model + 1
  }
}

// View
function view(model) {
  let v =
    ['div', {},
      [['button', { on: { click: emit('add') } }, 'Click Me!'],
        ['span', {}, ` ${model}`]]]

  return v
}

// Reduce
let model$ = actions$.scan(update, initModel)
model$.log()

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
```
