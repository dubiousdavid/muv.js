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
