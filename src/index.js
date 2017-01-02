import snabbdom from 'snabbdom/snabbdom.js'
import h from 'snabbdom/h.js'
import snabClass from 'snabbdom/modules/class.js'
import snabProps from 'snabbdom/modules/props.js'
import snabStyle from 'snabbdom/modules/style.js'
import snabEvent from 'snabbdom/modules/eventlisteners.js'

export function convertToHyperScript(node) {
  if (Array.isArray(node)) {
    let [sel, data, children] = node

    if (Array.isArray(children)) {
      return h(sel, data, children.map(convertToHyperScript))
    }
    return h.apply(null, node)
  }
  return node
}

export function render(view$, container) {
  let patch = snabbdom.init([snabClass, snabProps, snabStyle, snabEvent])
  let vnode = container

  view$
    .map(convertToHyperScript)
    .subscribe(newVnode => {
      patch(vnode, newVnode)
      vnode = newVnode
    })
}
