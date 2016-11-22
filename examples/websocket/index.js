import { bus, render } from '../../src/index.js'
import Kefir from 'kefir'
import WebSocket from 'reconnecting-websocket'

// Streams
let actions$ = bus()
let socketOutgoing$ = bus()

// Model
let initModel = {text: '', messages: [], connected: false}

// Update
function update({text, messages, connected}, [action, value]) {
  switch (action) {
    case 'message':
      return {text, messages: [...messages, value], connected}
    case 'changeText':
      return {text: value, messages, connected}
    case 'clearText':
      return {text: '', messages, connected}
    case 'connected':
      return {text, messages, connected: value}
  }
}

// View
function view({text, messages, connected}) {
  let v =
    ['div', {},
      [ ['input', {props: {placeholder: 'Send message', value: text}, on: {input: handleInput}}],
        ['button', {props: {disabled: !connected}, on: {click: [handleClick, text]}}, 'Send'],
        ['span', {}, connected ? '' : ' Connecting...'],
        ['div', {style: {paddingTop: '7px'}}, messages.map(displayMessage)]]]

  return v
}

function displayMessage(msg) {
  return ['div', {}, msg]
}

function handleInput(e) {
  let value = e.target.value.trim()
  actions$.emit(['changeText', value])
}

function handleClick(text) {
  actions$.emit(['clearText'])
  socketOutgoing$.emit(text)
}

// Websocket
let ws = new WebSocket('wss://echo.websocket.org')

let online$ = Kefir.fromPoll(500, () => navigator.onLine).skipDuplicates()

let socketConnected$ = Kefir.stream(emitter => {
  ws.onopen = () => emitter.emit(true)
  ws.onclose = () => emitter.emit(false)
})

let connected$ = socketConnected$
  .combine(online$, (connected, online) => connected && online)
  .toProperty(() => false)

socketOutgoing$.filterBy(connected$).onValue(ws.send)

let socketIncoming$ = Kefir.stream(emitter => {
  ws.onmessage = emitter.emit
})

let effects$ = socketIncoming$
  .map(msgEvent => ['message', msgEvent.data])
  .merge(connected$.map(connected => ['connected', connected]))
effects$.log('Effects')

// Reduce
let model$ = actions$.merge(effects$).scan(update, initModel)
model$.log('Model')

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
