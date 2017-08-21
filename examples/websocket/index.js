import { render } from '../../src/index.js';
import WebSocket from 'reconnecting-websocket';
import Rx from 'rxjs/Rx';

// Streams
let actions$ = new Rx.Subject();
let socketOutgoing$ = new Rx.Subject();

// Model
let initModel = { text: '', messages: [], connected: false };

// Update
function update(model, [action, value]) {
  let { text, messages, connected } = model;

  switch (action) {
    case 'message':
      return { ...model, messages: [...messages, value] };
    case 'changeText':
      return { ...model, text: value };
    case 'clearText':
      return { ...model, text: '' };
    case 'connected':
      return { ...model, connected: value };
  }
}

// View
// prettier-ignore
function view({text, messages, connected}) {
  return (
    ['div', {},
      ['input', {props: {placeholder: 'Send message', autofocus: true, value: text},
        on: {input: handleInput}, hook: {postpatch: focusElement}}],
      ['button', {props: {disabled: !connected}, on: {click: [handleClick, text]}}, 'Send'],
      ['span', {}, connected ? '' : ' Connecting...'],
      ['div', {style: {paddingTop: '7px'}}, ...messages.map(displayMessage)]]
  )
}

function focusElement(oldVnode, vnode) {
  return vnode.elm.focus();
}

function displayMessage(msg) {
  return ['div', {}, msg];
}

function handleInput(e) {
  let value = e.target.value.trim();
  actions$.next(['changeText', value]);
}

function handleClick(text) {
  actions$.next(['clearText']);
  socketOutgoing$.next(text);
}

// Websocket
let ws = new WebSocket('wss://echo.websocket.org');

let online$ = Rx.Observable.interval(500).map(() => navigator.onLine).distinctUntilChanged();

let socketConnected$ = Rx.Observable.create(subscriber => {
  ws.onopen = () => subscriber.next(true);
  ws.onclose = () => subscriber.next(false);
});

let connected$ = socketConnected$
  .combineLatest(online$, (connected, online) => connected && online)
  .publishBehavior(false)
  .refCount();

socketOutgoing$
  .withLatestFrom(connected$, (msg, connected) => [msg, connected])
  .filter(([, connected]) => connected)
  .subscribe(([msg]) => ws.send(msg));

let socketIncoming$ = Rx.Observable.create(subscriber => {
  ws.onmessage = msg => subscriber.next(msg);
});

let effects$ = socketIncoming$
  .map(msgEvent => ['message', msgEvent.data])
  .merge(connected$.map(connected => ['connected', connected]));

// Reduce
let model$ = actions$
  .merge(effects$)
  .do(x => console.log('Actions', x))
  .scan(update, initModel)
  .startWith(initModel)
  .do(x => console.log('Model', x));

// Render
let view$ = model$.map(view);
render(view$, document.getElementById('container'));
