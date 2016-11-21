import snabbdom from 'snabbdom/snabbdom.js'
import h from 'snabbdom/h.js'
import snabClass from 'snabbdom/modules/class.js'
import snabProps from 'snabbdom/modules/props.js'
import snabStyle from 'snabbdom/modules/style.js'
import snabEvent from 'snabbdom/modules/eventlisteners.js'
import Kefir from 'kefir'

export function mkEmit(stream$) {
  return function emit(action, value) {
    return [stream$.emit, [action, value]]
  }
}

export function bus() {
  let emitter
  let stream = Kefir.stream(_emitter => {
    emitter = _emitter
    return function() {
      emitter = null
    }
  })
  stream.emit = function(x) {
    emitter && emitter.emit(x)
  }
  return stream
}

/*
   ['div', {},
    [['button', { on: { click: emit('add') } }, 'Click Me!'],
     ['span', {}, model]]]
*/

function convertToHyperScript(node) {
  let [sel, data, children] = node

  if (Array.isArray(children)) {
    return h(sel, data, children.map(convertToHyperScript))
  } else {
    return h.apply(null, node)
  }
}

export function render(view$, container) {
  let patch = snabbdom.init([snabClass, snabProps, snabStyle, snabEvent])
  let vnode = container

  view$
    .map(convertToHyperScript)
    .onValue(newVnode => {
      patch(vnode, newVnode)
      vnode = newVnode
    })
}
