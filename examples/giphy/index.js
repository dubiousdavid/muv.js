import { render } from '../../src/index.js'
import Rx from 'rxjs/Rx'
import jsonp from 'b-jsonp'

// Streams
let actions$ = new Rx.Subject()
let query$ = new Rx.Subject()

// Model
let initModel = {topic: 'cats', url: 'loading.gif', error: null}

// Update
function update({topic, url}, [action, value]) {
  switch (action) {
    case 'changeTopic':
      return {topic: value, url}
    case 'result':
      return {topic, url: value}
    case 'error':
      return {topic, error: value}
  }
}

// View
function view(model) {
  let {topic, url, error} = model
  let v =
    ['div', {},
      [ ['input', {props: {placeholder: 'Giphy Topic', value: topic}, on: {input: handleInput}}],
        ['button', {on: {click: e => query$.next(topic)}}, 'More Please!'],
        ['br'],
        error ? ['div', {}, error] : ['img', {props: {src: url}}]]]

  return v
}

function handleInput(e){
  let value = e.target.value.trim()
  actions$.next(['changeTopic', value])
}

// Http
let http = Rx.Observable.bindNodeCallback(jsonp)

function topicToUrl(topic){
  return `https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=${topic}`
}

function parseResponse({data: {image_url}}) {
  return image_url ? ['result', image_url] : ['error', 'No images found']
}

let effects$ = query$
  .startWith(initModel.topic)
  .map(topicToUrl)
  .switchMap(http)
  .map(parseResponse)
  .catch(e => Rx.Observable.of(['error', e.message]))

// Reduce
let model$ = actions$
  .merge(effects$)
  .do(x => console.log('Actions', x))
  .scan(update, initModel)
  .startWith(initModel)
  .do(x => console.log('Model', x))

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
