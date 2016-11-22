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
    case 'subtract':
      return model - 1
  }
}

// View
function button(action, text) {
  return ['button', { on: { click: emit(action) } }, text]
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
let model$ = actions$.scan(update, initModel)
model$.log('Model')

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
