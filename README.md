# müv.js

müv.js incorporates [Snabbdom](https://github.com/snabbdom/snabbdom) virtual dom, FRP (e.g., [RxJs](http://reactivex.io/)), and combines them according to the model/update/view architecture found in [Elm](https://github.com/evancz/elm-architecture-tutorial).

## Examples

1. [Counter](https://dubiousdavid.github.io/muv.js/examples/counter/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/counter/index.js))
2. [Wikipedia](https://dubiousdavid.github.io/muv.js/examples/wikipedia/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/wikipedia/index.js))
3. [Giphy](https://dubiousdavid.github.io/muv.js/examples/giphy/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/giphy/index.js))
4. [Websocket](https://dubiousdavid.github.io/muv.js/examples/websocket/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/websocket/index.js))
5. [TodoMVC](https://dubiousdavid.github.io/muv.js/examples/todomvc/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/todomvc/index.js))

## What FRP libraries can I use?

Any library with a subscribe method.

## What it looks like

HTML is represented using arrays, which are automatically converted to hyperscript.

```Javascript
import { render } from '../../src/index.js'
import Rx from 'rxjs/Rx'

// Stream
let actions$ = new Rx.Subject()

// Model
let initModel = 0

// Update
function update(model, action) {
  switch (action) {
    case 'add':
      return model + 1
    case 'subtract':
      return model - 1
  }
}

// View
function button(action, text) {
  return ['button', { on: { click: e => actions$.next(action) } }, text]
}

function view(model) {
  let v =
    ['div', {},
      [ button('subtract', '-'),
        ['span', {}, ` ${model} `],
        button('add', '+')]]

  return v
}

// Reduce
let model$ = actions$
  .scan(update, initModel)
  .startWith(initModel)

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
```
