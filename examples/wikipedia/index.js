import { render } from '../../src/index.js'
import Rx from 'rxjs/Rx'
import jsonp from 'b-jsonp'

// Streams
let actions$ = new Rx.Subject()
let query$ = new Rx.Subject()

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
      [ ['input', {props: {placeholder: 'Search Wikipedia', autofocus: true}, on: {input: onInput}}],
        ['ul', {},
          model.map(result => ['li', {}, result])]]]

  return v
}

function onInput(e) {
  query$.next(e)
}

// Http
let http = Rx.Observable.bindNodeCallback(jsonp)

function eventToUrl(e){
  let query = encodeURIComponent(e.target.value.trim())
  return `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=${query}`
}

let effects$ = query$
  .debounceTime(150)
  .map(eventToUrl)
  .switchMap(http)
  .map(([,x]) => ['results', x])

// Reduce
let model$ = actions$
  .merge(effects$)
  .scan(update, initModel)
  .startWith(initModel)
  .do(x => console.log('Model', x))

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
