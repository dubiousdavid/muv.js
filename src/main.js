import snabbdom from '../node_modules/snabbdom/snabbdom.js'
import Kefir from '../node_modules/kefir/src/index.js'

snabbdom.init([])
btnClicks = Kefir.fromEvents(document.getElementById('my-button'), 'click')
btnClicks.onValue(x => console.log(x))
