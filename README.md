# müv.js

müv.js incorporates [Snabbdom](https://github.com/snabbdom/snabbdom) virtual dom, FRP (e.g., [RxJs](http://reactivex.io/)), and combines them according to the model/update/view architecture found in [Elm](https://github.com/evancz/elm-architecture-tutorial).

Draws inspiration from: [Elm](https://github.com/evancz/elm-architecture-tutorial), [Cycle.js](https://cycle.js.org/), and [Redux](http://redux.js.org/)

## Examples

1. [Counter](https://dubiousdavid.github.io/muv.js/examples/counter/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/counter/index.js))
2. [Wikipedia](https://dubiousdavid.github.io/muv.js/examples/wikipedia/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/wikipedia/index.js))
3. [Giphy](https://dubiousdavid.github.io/muv.js/examples/giphy/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/giphy/index.js))
4. [Websocket](https://dubiousdavid.github.io/muv.js/examples/websocket/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/websocket/index.js))
5. [TodoMVC](https://dubiousdavid.github.io/muv.js/examples/todomvc/) ([source](https://github.com/dubiousdavid/muv.js/blob/master/examples/todomvc/index.js))

## What FRP libraries can I use?

Any library with a `subscribe` method. Here are a few: [RxJs](http://reactivex.io/), [Bacon.js](https://baconjs.github.io/), [Kefir](http://rpominov.github.io/kefir), [xstream](http://staltz.com/xstream/), [Most](https://github.com/cujojs/most)

## What it looks like

HTML is represented using arrays. For example:

```javascript
['a', {props: {href: 'http://todomvc.com'}}, 'TodoMVC']
```

```javascript
['ul#frp-list', {},
  [ ['li.selected', {}, 'RxJs'],
    ['li', {}, 'Bacon.js'],
    ['li', {}, 'Kefir']]]
```

The `class`, `props`, `style`, and `eventlistener` modules from Snabbdom are automatically loaded. See: https://github.com/snabbdom/snabbdom#modules-documentation for more information.

State is held inside the `scan` method of the data stream and updates with every action that is pushed to the stream. Both the `update` function and `view` function should be pure. The `render` function takes a stream and an element to render the stream of "HTML" to.

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
