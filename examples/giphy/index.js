import { bus, render } from '../../src/index.js'
import Kefir from 'kefir'
import jsonp from 'b-jsonp'

// Streams
let actions$ = bus()
let query$ = bus()

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
        ['button', {on: {click: e => query$.emit(model)}}, 'More Please!'],
        ['br'],
        error ? ['div', {}, error] : ['img', {props: {src: url}}]]]

  return v
}

function handleInput(e){
  let value = e.target.value.trim()
  actions$.emit(['changeTopic', value])
}

// Http
function http(url) {
  return Kefir.fromNodeCallback(callback => jsonp(url, callback))
}

function topicToUrl({topic}){
  return `https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=${topic}`
}

function parseResponse({data: {image_url}}) {
  return image_url ? ['result', image_url] : ['error', 'No images found']
}

let effects$ = query$
  .map(topicToUrl)
  .flatMapFirst(http)
  .map(parseResponse)
  .flatMapErrors(e => Kefir.constant(['error', e.message]))

effects$.spy('Effects')

// Reduce
let model$ = actions$.merge(effects$).scan(update, initModel)
model$.spy('Model')

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))

// Init
query$.emit(initModel)
