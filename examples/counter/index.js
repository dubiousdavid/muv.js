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
  .do(x => console.log('Actions', x))
  .scan(update, initModel)
  .startWith(initModel)
  .do(x => console.log('Model', x))

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
