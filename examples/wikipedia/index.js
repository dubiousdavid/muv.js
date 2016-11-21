import { bus, render } from '../../src/index.js'
import Kefir from 'kefir'
import jsonp from 'b-jsonp'

// Streams
let actions$ = bus()
let query$ = bus()

// Model
let initModel = []

// Update
function update(model, [action, value]) {
  switch (action) {
    case 'results':
      return value
  }
}

// View
function view(model) {
  let v =
    ['div', {},
      [ ['input', {props: {placeholder: "Search Wikipedia"}, on: {input: query$.emit}}],
        ['ul', {},
          model.map(result => ['li', {}, result])]]]

  return v
}

// Http
function http(url) {
  return Kefir.fromNodeCallback(callback => jsonp(url, callback))
}

function eventToUrl(event){
  let query = event.target.value.trim()
  return `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=${query}`
}

let effects$ = query$
  .debounce(150)
  .map(eventToUrl)
  .flatMapLatest(http)
  .map(([,x]) => ['results', x])

// Reduce
let model$ = actions$.merge(effects$).scan(update, initModel)

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
