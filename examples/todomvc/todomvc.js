var vnode = function (sel, data, children, text, elm) {
  var key = data === undefined ? undefined : data.key;
  return { sel: sel, data: data, children: children,
    text: text, elm: elm, key: key };
};

var is$1 = {
  array: Array.isArray,
  primitive: function (s) {
    return typeof s === 'string' || typeof s === 'number';
  }
};

function createElement(tagName) {
  return document.createElement(tagName);
}

function createElementNS(namespaceURI, qualifiedName) {
  return document.createElementNS(namespaceURI, qualifiedName);
}

function createTextNode(text) {
  return document.createTextNode(text);
}

function insertBefore(parentNode, newNode, referenceNode) {
  parentNode.insertBefore(newNode, referenceNode);
}

function removeChild(node, child) {
  node.removeChild(child);
}

function appendChild(node, child) {
  node.appendChild(child);
}

function parentNode(node) {
  return node.parentElement;
}

function nextSibling(node) {
  return node.nextSibling;
}

function tagName(node) {
  return node.tagName;
}

function setTextContent(node, text) {
  node.textContent = text;
}

var htmldomapi = {
  createElement: createElement,
  createElementNS: createElementNS,
  createTextNode: createTextNode,
  appendChild: appendChild,
  removeChild: removeChild,
  insertBefore: insertBefore,
  parentNode: parentNode,
  nextSibling: nextSibling,
  tagName: tagName,
  setTextContent: setTextContent
};

var VNode = vnode;
var is = is$1;
var domApi = htmldomapi;

function isUndef(s) {
  return s === undefined;
}
function isDef(s) {
  return s !== undefined;
}

var emptyNode = VNode('', {}, [], undefined, undefined);

function sameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  var i,
      map = {},
      key;
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) map[key] = i;
  }
  return map;
}

var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

function init(modules, api) {
  var i,
      j,
      cbs = {};

  if (isUndef(api)) api = domApi;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (modules[j][hooks[i]] !== undefined) cbs[hooks[i]].push(modules[j][hooks[i]]);
    }
  }

  function emptyNodeAt(elm) {
    var id = elm.id ? '#' + elm.id : '';
    var c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
    return VNode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
  }

  function createRmCb(childElm, listeners) {
    return function () {
      if (--listeners === 0) {
        var parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }

  function createElm(vnode$$1, insertedVnodeQueue) {
    var i,
        data = vnode$$1.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) {
        i(vnode$$1);
        data = vnode$$1.data;
      }
    }
    var elm,
        children = vnode$$1.children,
        sel = vnode$$1.sel;
    if (isDef(sel)) {
      // Parse selector
      var hashIdx = sel.indexOf('#');
      var dotIdx = sel.indexOf('.', hashIdx);
      var hash = hashIdx > 0 ? hashIdx : sel.length;
      var dot = dotIdx > 0 ? dotIdx : sel.length;
      var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      elm = vnode$$1.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag) : api.createElement(tag);
      if (hash < dot) elm.id = sel.slice(hash + 1, dot);
      if (dotIdx > 0) elm.className = sel.slice(dot + 1).replace(/\./g, ' ');
      if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
          api.appendChild(elm, createElm(children[i], insertedVnodeQueue));
        }
      } else if (is.primitive(vnode$$1.text)) {
        api.appendChild(elm, api.createTextNode(vnode$$1.text));
      }
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode$$1);
      i = vnode$$1.data.hook; // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode$$1);
        if (i.insert) insertedVnodeQueue.push(vnode$$1);
      }
    } else {
      elm = vnode$$1.elm = api.createTextNode(vnode$$1.text);
    }
    return vnode$$1.elm;
  }

  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      api.insertBefore(parentElm, createElm(vnodes[startIdx], insertedVnodeQueue), before);
    }
  }

  function invokeDestroyHook(vnode$$1) {
    var i,
        j,
        data = vnode$$1.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode$$1);
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode$$1);
      if (isDef(i = vnode$$1.children)) {
        for (j = 0; j < vnode$$1.children.length; ++j) {
          invokeDestroyHook(vnode$$1.children[j]);
        }
      }
    }
  }

  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var i,
          listeners,
          rm,
          ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch);
          listeners = cbs.remove.length + 1;
          rm = createRmCb(ch.elm, listeners);
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm);
          } else {
            rm();
          }
        } else {
          // Text node
          api.removeChild(parentElm, ch.elm);
        }
      }
    }
  }

  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    var oldStartIdx = 0,
        newStartIdx = 0;
    var oldEndIdx = oldCh.length - 1;
    var oldStartVnode = oldCh[0];
    var oldEndVnode = oldCh[oldEndIdx];
    var newEndIdx = newCh.length - 1;
    var newStartVnode = newCh[0];
    var newEndVnode = newCh[newEndIdx];
    var oldKeyToIdx, idxInOld, elmToMove, before;

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) {
          // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        } else {
          elmToMove = oldCh[idxInOld];
          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
          oldCh[idxInOld] = undefined;
          api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    if (oldStartIdx > oldEndIdx) {
      before = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }

  function patchVnode(oldVnode, vnode$$1, insertedVnodeQueue) {
    var i, hook;
    if (isDef(i = vnode$$1.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
      i(oldVnode, vnode$$1);
    }
    var elm = vnode$$1.elm = oldVnode.elm,
        oldCh = oldVnode.children,
        ch = vnode$$1.children;
    if (oldVnode === vnode$$1) return;
    if (!sameVnode(oldVnode, vnode$$1)) {
      var parentElm = api.parentNode(oldVnode.elm);
      elm = createElm(vnode$$1, insertedVnodeQueue);
      api.insertBefore(parentElm, elm, oldVnode.elm);
      removeVnodes(parentElm, [oldVnode], 0, 0);
      return;
    }
    if (isDef(vnode$$1.data)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode$$1);
      i = vnode$$1.data.hook;
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode$$1);
    }
    if (isUndef(vnode$$1.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode$$1.text) {
      api.setTextContent(elm, vnode$$1.text);
    }
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode$$1);
    }
  }

  return function (oldVnode, vnode$$1) {
    var i, elm, parent;
    var insertedVnodeQueue = [];
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    if (isUndef(oldVnode.sel)) {
      oldVnode = emptyNodeAt(oldVnode);
    }

    if (sameVnode(oldVnode, vnode$$1)) {
      patchVnode(oldVnode, vnode$$1, insertedVnodeQueue);
    } else {
      elm = oldVnode.elm;
      parent = api.parentNode(elm);

      createElm(vnode$$1, insertedVnodeQueue);

      if (parent !== null) {
        api.insertBefore(parent, vnode$$1.elm, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }

    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
    }
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    return vnode$$1;
  };
}

var snabbdom = { init: init };

var VNode$1 = vnode;
var is$3 = is$1;

function addNS(data, children, sel) {
  data.ns = 'http://www.w3.org/2000/svg';

  if (sel !== 'foreignObject' && children !== undefined) {
    for (var i = 0; i < children.length; ++i) {
      addNS(children[i].data, children[i].children, children[i].sel);
    }
  }
}

var h = function h(sel, b, c) {
  var data = {},
      children,
      text,
      i;
  if (c !== undefined) {
    data = b;
    if (is$3.array(c)) {
      children = c;
    } else if (is$3.primitive(c)) {
      text = c;
    }
  } else if (b !== undefined) {
    if (is$3.array(b)) {
      children = b;
    } else if (is$3.primitive(b)) {
      text = b;
    } else {
      data = b;
    }
  }
  if (is$3.array(children)) {
    for (i = 0; i < children.length; ++i) {
      if (is$3.primitive(children[i])) children[i] = VNode$1(undefined, undefined, undefined, children[i]);
    }
  }
  if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
    addNS(data, children, sel);
  }
  return VNode$1(sel, data, children, text, undefined);
};

function updateClass(oldVnode, vnode) {
  var cur,
      name,
      elm = vnode.elm,
      oldClass = oldVnode.data.class,
      klass = vnode.data.class;

  if (!oldClass && !klass) return;
  oldClass = oldClass || {};
  klass = klass || {};

  for (name in oldClass) {
    if (!klass[name]) {
      elm.classList.remove(name);
    }
  }
  for (name in klass) {
    cur = klass[name];
    if (cur !== oldClass[name]) {
      elm.classList[cur ? 'add' : 'remove'](name);
    }
  }
}

var _class = { create: updateClass, update: updateClass };

function updateProps(oldVnode, vnode) {
  var key,
      cur,
      old,
      elm = vnode.elm,
      oldProps = oldVnode.data.props,
      props = vnode.data.props;

  if (!oldProps && !props) return;
  oldProps = oldProps || {};
  props = props || {};

  for (key in oldProps) {
    if (!props[key]) {
      delete elm[key];
    }
  }
  for (key in props) {
    cur = props[key];
    old = oldProps[key];
    if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
      elm[key] = cur;
    }
  }
}

var props = { create: updateProps, update: updateProps };

var raf = typeof window !== 'undefined' && window.requestAnimationFrame || setTimeout;
var nextFrame = function (fn) {
  raf(function () {
    raf(fn);
  });
};

function setNextFrame(obj, prop, val) {
  nextFrame(function () {
    obj[prop] = val;
  });
}

function updateStyle(oldVnode, vnode) {
  var cur,
      name,
      elm = vnode.elm,
      oldStyle = oldVnode.data.style,
      style = vnode.data.style;

  if (!oldStyle && !style) return;
  oldStyle = oldStyle || {};
  style = style || {};
  var oldHasDel = 'delayed' in oldStyle;

  for (name in oldStyle) {
    if (!style[name]) {
      elm.style[name] = '';
    }
  }
  for (name in style) {
    cur = style[name];
    if (name === 'delayed') {
      for (name in style.delayed) {
        cur = style.delayed[name];
        if (!oldHasDel || cur !== oldStyle.delayed[name]) {
          setNextFrame(elm.style, name, cur);
        }
      }
    } else if (name !== 'remove' && cur !== oldStyle[name]) {
      elm.style[name] = cur;
    }
  }
}

function applyDestroyStyle(vnode) {
  var style,
      name,
      elm = vnode.elm,
      s = vnode.data.style;
  if (!s || !(style = s.destroy)) return;
  for (name in style) {
    elm.style[name] = style[name];
  }
}

function applyRemoveStyle(vnode, rm) {
  var s = vnode.data.style;
  if (!s || !s.remove) {
    rm();
    return;
  }
  var name,
      elm = vnode.elm,
      idx,
      i = 0,
      maxDur = 0,
      compStyle,
      style = s.remove,
      amount = 0,
      applied = [];
  for (name in style) {
    applied.push(name);
    elm.style[name] = style[name];
  }
  compStyle = getComputedStyle(elm);
  var props = compStyle['transition-property'].split(', ');
  for (; i < props.length; ++i) {
    if (applied.indexOf(props[i]) !== -1) amount++;
  }
  elm.addEventListener('transitionend', function (ev) {
    if (ev.target === elm) --amount;
    if (amount === 0) rm();
  });
}

var style = { create: updateStyle, update: updateStyle, destroy: applyDestroyStyle, remove: applyRemoveStyle };

function invokeHandler(handler, vnode, event) {
  if (typeof handler === "function") {
    // call function handler
    handler.call(vnode, event, vnode);
  } else if (typeof handler === "object") {
    // call handler with arguments
    if (typeof handler[0] === "function") {
      // special case for single argument for performance
      if (handler.length === 2) {
        handler[0].call(vnode, handler[1], event, vnode);
      } else {
        var args = handler.slice(1);
        args.push(event);
        args.push(vnode);
        handler[0].apply(vnode, args);
      }
    } else {
      // call multiple handlers
      for (var i = 0; i < handler.length; i++) {
        invokeHandler(handler[i]);
      }
    }
  }
}

function handleEvent(event, vnode) {
  var name = event.type,
      on = vnode.data.on;

  // call event handler(s) if exists
  if (on && on[name]) {
    invokeHandler(on[name], vnode, event);
  }
}

function createListener() {
  return function handler(event) {
    handleEvent(event, handler.vnode);
  };
}

function updateEventListeners(oldVnode, vnode) {
  var oldOn = oldVnode.data.on,
      oldListener = oldVnode.listener,
      oldElm = oldVnode.elm,
      on = vnode && vnode.data.on,
      elm = vnode && vnode.elm,
      name;

  // optimization for reused immutable handlers
  if (oldOn === on) {
    return;
  }

  // remove existing listeners which no longer used
  if (oldOn && oldListener) {
    // if element changed or deleted we remove all existing listeners unconditionally
    if (!on) {
      for (name in oldOn) {
        // remove listener if element was changed or existing listeners removed
        oldElm.removeEventListener(name, oldListener, false);
      }
    } else {
      for (name in oldOn) {
        // remove listener if existing listener removed
        if (!on[name]) {
          oldElm.removeEventListener(name, oldListener, false);
        }
      }
    }
  }

  // add new listeners which has not already attached
  if (on) {
    // reuse existing listener or create new
    var listener = vnode.listener = oldVnode.listener || createListener();
    // update vnode for listener
    listener.vnode = vnode;

    // if element changed or added we add all needed listeners unconditionally
    if (!oldOn) {
      for (name in on) {
        // add listener if element was changed or new listeners added
        elm.addEventListener(name, listener, false);
      }
    } else {
      for (name in on) {
        // add listener if new listener added
        if (!oldOn[name]) {
          elm.addEventListener(name, listener, false);
        }
      }
    }
  }
}

var eventlisteners = {
  create: updateEventListeners,
  update: updateEventListeners,
  destroy: updateEventListeners
};

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};



function unwrapExports (x) {
	return x && x.__esModule ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var kefir = createCommonjsModule(function (module, exports) {
	/*! Kefir.js v3.6.0
  *  https://github.com/rpominov/kefir
  */

	(function (global, factory) {
		typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : factory(global.Kefir = global.Kefir || {});
	})(commonjsGlobal, function (exports) {
		'use strict';

		function createObj(proto) {
			var F = function () {};
			F.prototype = proto;
			return new F();
		}

		function extend(target /*, mixin1, mixin2...*/) {
			var length = arguments.length,
			    i = void 0,
			    prop = void 0;
			for (i = 1; i < length; i++) {
				for (prop in arguments[i]) {
					target[prop] = arguments[i][prop];
				}
			}
			return target;
		}

		function inherit(Child, Parent /*, mixin1, mixin2...*/) {
			var length = arguments.length,
			    i = void 0;
			Child.prototype = createObj(Parent.prototype);
			Child.prototype.constructor = Child;
			for (i = 2; i < length; i++) {
				extend(Child.prototype, arguments[i]);
			}
			return Child;
		}

		var NOTHING = ['<nothing>'];
		var END = 'end';
		var VALUE = 'value';
		var ERROR = 'error';
		var ANY = 'any';

		function concat(a, b) {
			var result = void 0,
			    length = void 0,
			    i = void 0,
			    j = void 0;
			if (a.length === 0) {
				return b;
			}
			if (b.length === 0) {
				return a;
			}
			j = 0;
			result = new Array(a.length + b.length);
			length = a.length;
			for (i = 0; i < length; i++, j++) {
				result[j] = a[i];
			}
			length = b.length;
			for (i = 0; i < length; i++, j++) {
				result[j] = b[i];
			}
			return result;
		}

		function find(arr, value) {
			var length = arr.length,
			    i = void 0;
			for (i = 0; i < length; i++) {
				if (arr[i] === value) {
					return i;
				}
			}
			return -1;
		}

		function findByPred(arr, pred) {
			var length = arr.length,
			    i = void 0;
			for (i = 0; i < length; i++) {
				if (pred(arr[i])) {
					return i;
				}
			}
			return -1;
		}

		function cloneArray(input) {
			var length = input.length,
			    result = new Array(length),
			    i = void 0;
			for (i = 0; i < length; i++) {
				result[i] = input[i];
			}
			return result;
		}

		function remove(input, index) {
			var length = input.length,
			    result = void 0,
			    i = void 0,
			    j = void 0;
			if (index >= 0 && index < length) {
				if (length === 1) {
					return [];
				} else {
					result = new Array(length - 1);
					for (i = 0, j = 0; i < length; i++) {
						if (i !== index) {
							result[j] = input[i];
							j++;
						}
					}
					return result;
				}
			} else {
				return input;
			}
		}

		function map(input, fn) {
			var length = input.length,
			    result = new Array(length),
			    i = void 0;
			for (i = 0; i < length; i++) {
				result[i] = fn(input[i]);
			}
			return result;
		}

		function forEach(arr, fn) {
			var length = arr.length,
			    i = void 0;
			for (i = 0; i < length; i++) {
				fn(arr[i]);
			}
		}

		function fillArray(arr, value) {
			var length = arr.length,
			    i = void 0;
			for (i = 0; i < length; i++) {
				arr[i] = value;
			}
		}

		function contains(arr, value) {
			return find(arr, value) !== -1;
		}

		function slide(cur, next, max) {
			var length = Math.min(max, cur.length + 1),
			    offset = cur.length - length + 1,
			    result = new Array(length),
			    i = void 0;
			for (i = offset; i < length; i++) {
				result[i - offset] = cur[i];
			}
			result[length - 1] = next;
			return result;
		}

		function callSubscriber(type, fn, event) {
			if (type === ANY) {
				fn(event);
			} else if (type === event.type) {
				if (type === VALUE || type === ERROR) {
					fn(event.value);
				} else {
					fn();
				}
			}
		}

		function Dispatcher() {
			this._items = [];
			this._spies = [];
			this._inLoop = 0;
			this._removedItems = null;
		}

		extend(Dispatcher.prototype, {
			add: function (type, fn) {
				this._items = concat(this._items, [{ type: type, fn: fn }]);
				return this._items.length;
			},
			remove: function (type, fn) {
				var index = findByPred(this._items, function (x) {
					return x.type === type && x.fn === fn;
				});

				// if we're currently in a notification loop,
				// remember this subscriber was removed
				if (this._inLoop !== 0 && index !== -1) {
					if (this._removedItems === null) {
						this._removedItems = [];
					}
					this._removedItems.push(this._items[index]);
				}

				this._items = remove(this._items, index);
				return this._items.length;
			},
			addSpy: function (fn) {
				this._spies = concat(this._spies, [fn]);
				return this._spies.length;
			},

			// Because spies are only ever a function that perform logging as
			// their only side effect, we don't need the same complicated
			// removal logic like in remove()
			removeSpy: function (fn) {
				this._spies = remove(this._spies, this._spies.indexOf(fn));
				return this._spies.length;
			},
			dispatch: function (event) {
				this._inLoop++;
				for (var i = 0, spies = this._spies; this._spies !== null && i < spies.length; i++) {
					spies[i](event);
				}

				for (var _i = 0, items = this._items; _i < items.length; _i++) {

					// cleanup was called
					if (this._items === null) {
						break;
					}

					// this subscriber was removed
					if (this._removedItems !== null && contains(this._removedItems, items[_i])) {
						continue;
					}

					callSubscriber(items[_i].type, items[_i].fn, event);
				}
				this._inLoop--;
				if (this._inLoop === 0) {
					this._removedItems = null;
				}
			},
			cleanup: function () {
				this._items = null;
				this._spies = null;
			}
		});

		function Observable() {
			this._dispatcher = new Dispatcher();
			this._active = false;
			this._alive = true;
			this._activating = false;
			this._logHandlers = null;
			this._spyHandlers = null;
		}

		extend(Observable.prototype, {

			_name: 'observable',

			_onActivation: function () {},
			_onDeactivation: function () {},
			_setActive: function (active) {
				if (this._active !== active) {
					this._active = active;
					if (active) {
						this._activating = true;
						this._onActivation();
						this._activating = false;
					} else {
						this._onDeactivation();
					}
				}
			},
			_clear: function () {
				this._setActive(false);
				this._dispatcher.cleanup();
				this._dispatcher = null;
				this._logHandlers = null;
			},
			_emit: function (type, x) {
				switch (type) {
					case VALUE:
						return this._emitValue(x);
					case ERROR:
						return this._emitError(x);
					case END:
						return this._emitEnd();
				}
			},
			_emitValue: function (value) {
				if (this._alive) {
					this._dispatcher.dispatch({ type: VALUE, value: value });
				}
			},
			_emitError: function (value) {
				if (this._alive) {
					this._dispatcher.dispatch({ type: ERROR, value: value });
				}
			},
			_emitEnd: function () {
				if (this._alive) {
					this._alive = false;
					this._dispatcher.dispatch({ type: END });
					this._clear();
				}
			},
			_on: function (type, fn) {
				if (this._alive) {
					this._dispatcher.add(type, fn);
					this._setActive(true);
				} else {
					callSubscriber(type, fn, { type: END });
				}
				return this;
			},
			_off: function (type, fn) {
				if (this._alive) {
					var count = this._dispatcher.remove(type, fn);
					if (count === 0) {
						this._setActive(false);
					}
				}
				return this;
			},
			onValue: function (fn) {
				return this._on(VALUE, fn);
			},
			onError: function (fn) {
				return this._on(ERROR, fn);
			},
			onEnd: function (fn) {
				return this._on(END, fn);
			},
			onAny: function (fn) {
				return this._on(ANY, fn);
			},
			offValue: function (fn) {
				return this._off(VALUE, fn);
			},
			offError: function (fn) {
				return this._off(ERROR, fn);
			},
			offEnd: function (fn) {
				return this._off(END, fn);
			},
			offAny: function (fn) {
				return this._off(ANY, fn);
			},
			observe: function (observerOrOnValue, onError, onEnd) {
				var _this = this;
				var closed = false;

				var observer = !observerOrOnValue || typeof observerOrOnValue === 'function' ? { value: observerOrOnValue, error: onError, end: onEnd } : observerOrOnValue;

				var handler = function (event) {
					if (event.type === END) {
						closed = true;
					}
					if (event.type === VALUE && observer.value) {
						observer.value(event.value);
					} else if (event.type === ERROR && observer.error) {
						observer.error(event.value);
					} else if (event.type === END && observer.end) {
						observer.end(event.value);
					}
				};

				this.onAny(handler);

				return {
					unsubscribe: function () {
						if (!closed) {
							_this.offAny(handler);
							closed = true;
						}
					},

					get closed() {
						return closed;
					}
				};
			},

			// A and B must be subclasses of Stream and Property (order doesn't matter)
			_ofSameType: function (A, B) {
				return A.prototype.getType() === this.getType() ? A : B;
			},
			setName: function (sourceObs /* optional */, selfName) {
				this._name = selfName ? sourceObs._name + '.' + selfName : sourceObs;
				return this;
			},
			log: function () {
				var name = arguments.length <= 0 || arguments[0] === undefined ? this.toString() : arguments[0];

				var isCurrent = void 0;
				var handler = function (event) {
					var type = '<' + event.type + (isCurrent ? ':current' : '') + '>';
					if (event.type === END) {
						console.log(name, type);
					} else {
						console.log(name, type, event.value);
					}
				};

				if (this._alive) {
					if (!this._logHandlers) {
						this._logHandlers = [];
					}
					this._logHandlers.push({ name: name, handler: handler });
				}

				isCurrent = true;
				this.onAny(handler);
				isCurrent = false;

				return this;
			},
			offLog: function () {
				var name = arguments.length <= 0 || arguments[0] === undefined ? this.toString() : arguments[0];

				if (this._logHandlers) {
					var handlerIndex = findByPred(this._logHandlers, function (obj) {
						return obj.name === name;
					});
					if (handlerIndex !== -1) {
						this.offAny(this._logHandlers[handlerIndex].handler);
						this._logHandlers.splice(handlerIndex, 1);
					}
				}

				return this;
			},
			spy: function () {
				var name = arguments.length <= 0 || arguments[0] === undefined ? this.toString() : arguments[0];

				var handler = function (event) {
					var type = '<' + event.type + '>';
					if (event.type === END) {
						console.log(name, type);
					} else {
						console.log(name, type, event.value);
					}
				};
				if (this._alive) {
					if (!this._spyHandlers) {
						this._spyHandlers = [];
					}
					this._spyHandlers.push({ name: name, handler: handler });
					this._dispatcher.addSpy(handler);
				}
				return this;
			},
			offSpy: function () {
				var name = arguments.length <= 0 || arguments[0] === undefined ? this.toString() : arguments[0];

				if (this._spyHandlers) {
					var handlerIndex = findByPred(this._spyHandlers, function (obj) {
						return obj.name === name;
					});
					if (handlerIndex !== -1) {
						this._dispatcher.removeSpy(this._spyHandlers[handlerIndex].handler);
						this._spyHandlers.splice(handlerIndex, 1);
					}
				}
				return this;
			}
		});

		// extend() can't handle `toString` in IE8
		Observable.prototype.toString = function () {
			return '[' + this._name + ']';
		};

		function Stream() {
			Observable.call(this);
		}

		inherit(Stream, Observable, {

			_name: 'stream',

			getType: function () {
				return 'stream';
			}
		});

		function Property() {
			Observable.call(this);
			this._currentEvent = null;
		}

		inherit(Property, Observable, {

			_name: 'property',

			_emitValue: function (value) {
				if (this._alive) {
					this._currentEvent = { type: VALUE, value: value };
					if (!this._activating) {
						this._dispatcher.dispatch({ type: VALUE, value: value });
					}
				}
			},
			_emitError: function (value) {
				if (this._alive) {
					this._currentEvent = { type: ERROR, value: value };
					if (!this._activating) {
						this._dispatcher.dispatch({ type: ERROR, value: value });
					}
				}
			},
			_emitEnd: function () {
				if (this._alive) {
					this._alive = false;
					if (!this._activating) {
						this._dispatcher.dispatch({ type: END });
					}
					this._clear();
				}
			},
			_on: function (type, fn) {
				if (this._alive) {
					this._dispatcher.add(type, fn);
					this._setActive(true);
				}
				if (this._currentEvent !== null) {
					callSubscriber(type, fn, this._currentEvent);
				}
				if (!this._alive) {
					callSubscriber(type, fn, { type: END });
				}
				return this;
			},
			getType: function () {
				return 'property';
			}
		});

		var neverS = new Stream();
		neverS._emitEnd();
		neverS._name = 'never';

		function never() {
			return neverS;
		}

		function timeBased(mixin) {

			function AnonymousStream(wait, options) {
				var _this = this;

				Stream.call(this);
				this._wait = wait;
				this._intervalId = null;
				this._$onTick = function () {
					return _this._onTick();
				};
				this._init(options);
			}

			inherit(AnonymousStream, Stream, {
				_init: function () {},
				_free: function () {},
				_onTick: function () {},
				_onActivation: function () {
					this._intervalId = setInterval(this._$onTick, this._wait);
				},
				_onDeactivation: function () {
					if (this._intervalId !== null) {
						clearInterval(this._intervalId);
						this._intervalId = null;
					}
				},
				_clear: function () {
					Stream.prototype._clear.call(this);
					this._$onTick = null;
					this._free();
				}
			}, mixin);

			return AnonymousStream;
		}

		var S = timeBased({

			_name: 'later',

			_init: function (_ref) {
				var x = _ref.x;

				this._x = x;
			},
			_free: function () {
				this._x = null;
			},
			_onTick: function () {
				this._emitValue(this._x);
				this._emitEnd();
			}
		});

		function later(wait, x) {
			return new S(wait, { x: x });
		}

		var S$1 = timeBased({

			_name: 'interval',

			_init: function (_ref) {
				var x = _ref.x;

				this._x = x;
			},
			_free: function () {
				this._x = null;
			},
			_onTick: function () {
				this._emitValue(this._x);
			}
		});

		function interval(wait, x) {
			return new S$1(wait, { x: x });
		}

		var S$2 = timeBased({

			_name: 'sequentially',

			_init: function (_ref) {
				var xs = _ref.xs;

				this._xs = cloneArray(xs);
			},
			_free: function () {
				this._xs = null;
			},
			_onTick: function () {
				if (this._xs.length === 1) {
					this._emitValue(this._xs[0]);
					this._emitEnd();
				} else {
					this._emitValue(this._xs.shift());
				}
			}
		});

		function sequentially(wait, xs) {
			return xs.length === 0 ? never() : new S$2(wait, { xs: xs });
		}

		var S$3 = timeBased({

			_name: 'fromPoll',

			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_onTick: function () {
				var fn = this._fn;
				this._emitValue(fn());
			}
		});

		function fromPoll(wait, fn) {
			return new S$3(wait, { fn: fn });
		}

		function emitter(obs) {

			function value(x) {
				obs._emitValue(x);
				return obs._active;
			}

			function error(x) {
				obs._emitError(x);
				return obs._active;
			}

			function end() {
				obs._emitEnd();
				return obs._active;
			}

			function event(e) {
				obs._emit(e.type, e.value);
				return obs._active;
			}

			return {
				value: value,
				error: error,
				end: end,
				event: event,

				// legacy
				emit: value,
				emitEvent: event
			};
		}

		var S$4 = timeBased({

			_name: 'withInterval',

			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
				this._emitter = emitter(this);
			},
			_free: function () {
				this._fn = null;
				this._emitter = null;
			},
			_onTick: function () {
				var fn = this._fn;
				fn(this._emitter);
			}
		});

		function withInterval(wait, fn) {
			return new S$4(wait, { fn: fn });
		}

		function S$5(fn) {
			Stream.call(this);
			this._fn = fn;
			this._unsubscribe = null;
		}

		inherit(S$5, Stream, {

			_name: 'stream',

			_onActivation: function () {
				var fn = this._fn;
				var unsubscribe = fn(emitter(this));
				this._unsubscribe = typeof unsubscribe === 'function' ? unsubscribe : null;

				// fix https://github.com/rpominov/kefir/issues/35
				if (!this._active) {
					this._callUnsubscribe();
				}
			},
			_callUnsubscribe: function () {
				if (this._unsubscribe !== null) {
					this._unsubscribe();
					this._unsubscribe = null;
				}
			},
			_onDeactivation: function () {
				this._callUnsubscribe();
			},
			_clear: function () {
				Stream.prototype._clear.call(this);
				this._fn = null;
			}
		});

		function stream(fn) {
			return new S$5(fn);
		}

		function fromCallback(callbackConsumer) {

			var called = false;

			return stream(function (emitter) {

				if (!called) {
					callbackConsumer(function (x) {
						emitter.emit(x);
						emitter.end();
					});
					called = true;
				}
			}).setName('fromCallback');
		}

		function fromNodeCallback(callbackConsumer) {

			var called = false;

			return stream(function (emitter) {

				if (!called) {
					callbackConsumer(function (error, x) {
						if (error) {
							emitter.error(error);
						} else {
							emitter.emit(x);
						}
						emitter.end();
					});
					called = true;
				}
			}).setName('fromNodeCallback');
		}

		function spread(fn, length) {
			switch (length) {
				case 0:
					return function () {
						return fn();
					};
				case 1:
					return function (a) {
						return fn(a[0]);
					};
				case 2:
					return function (a) {
						return fn(a[0], a[1]);
					};
				case 3:
					return function (a) {
						return fn(a[0], a[1], a[2]);
					};
				case 4:
					return function (a) {
						return fn(a[0], a[1], a[2], a[3]);
					};
				default:
					return function (a) {
						return fn.apply(null, a);
					};
			}
		}

		function apply(fn, c, a) {
			var aLength = a ? a.length : 0;
			if (c == null) {
				switch (aLength) {
					case 0:
						return fn();
					case 1:
						return fn(a[0]);
					case 2:
						return fn(a[0], a[1]);
					case 3:
						return fn(a[0], a[1], a[2]);
					case 4:
						return fn(a[0], a[1], a[2], a[3]);
					default:
						return fn.apply(null, a);
				}
			} else {
				switch (aLength) {
					case 0:
						return fn.call(c);
					default:
						return fn.apply(c, a);
				}
			}
		}

		function fromSubUnsub(sub, unsub, transformer /* Function | falsey */) {
			return stream(function (emitter) {

				var handler = transformer ? function () {
					emitter.emit(apply(transformer, this, arguments));
				} : function (x) {
					emitter.emit(x);
				};

				sub(handler);
				return function () {
					return unsub(handler);
				};
			}).setName('fromSubUnsub');
		}

		var pairs = [['addEventListener', 'removeEventListener'], ['addListener', 'removeListener'], ['on', 'off']];

		function fromEvents(target, eventName, transformer) {
			var sub = void 0,
			    unsub = void 0;

			for (var i = 0; i < pairs.length; i++) {
				if (typeof target[pairs[i][0]] === 'function' && typeof target[pairs[i][1]] === 'function') {
					sub = pairs[i][0];
					unsub = pairs[i][1];
					break;
				}
			}

			if (sub === undefined) {
				throw new Error('target don\'t support any of ' + 'addEventListener/removeEventListener, addListener/removeListener, on/off method pair');
			}

			return fromSubUnsub(function (handler) {
				return target[sub](eventName, handler);
			}, function (handler) {
				return target[unsub](eventName, handler);
			}, transformer).setName('fromEvents');
		}

		// HACK:
		//   We don't call parent Class constructor, but instead putting all necessary
		//   properties into prototype to simulate ended Property
		//   (see Propperty and Observable classes).

		function P(value) {
			this._currentEvent = { type: 'value', value: value, current: true };
		}

		inherit(P, Property, {
			_name: 'constant',
			_active: false,
			_activating: false,
			_alive: false,
			_dispatcher: null,
			_logHandlers: null
		});

		function constant(x) {
			return new P(x);
		}

		// HACK:
		//   We don't call parent Class constructor, but instead putting all necessary
		//   properties into prototype to simulate ended Property
		//   (see Propperty and Observable classes).

		function P$1(value) {
			this._currentEvent = { type: 'error', value: value, current: true };
		}

		inherit(P$1, Property, {
			_name: 'constantError',
			_active: false,
			_activating: false,
			_alive: false,
			_dispatcher: null,
			_logHandlers: null
		});

		function constantError(x) {
			return new P$1(x);
		}

		function createConstructor(BaseClass, name) {
			return function AnonymousObservable(source, options) {
				var _this = this;

				BaseClass.call(this);
				this._source = source;
				this._name = source._name + '.' + name;
				this._init(options);
				this._$handleAny = function (event) {
					return _this._handleAny(event);
				};
			};
		}

		function createClassMethods(BaseClass) {
			return {
				_init: function () {},
				_free: function () {},
				_handleValue: function (x) {
					this._emitValue(x);
				},
				_handleError: function (x) {
					this._emitError(x);
				},
				_handleEnd: function () {
					this._emitEnd();
				},
				_handleAny: function (event) {
					switch (event.type) {
						case VALUE:
							return this._handleValue(event.value);
						case ERROR:
							return this._handleError(event.value);
						case END:
							return this._handleEnd();
					}
				},
				_onActivation: function () {
					this._source.onAny(this._$handleAny);
				},
				_onDeactivation: function () {
					this._source.offAny(this._$handleAny);
				},
				_clear: function () {
					BaseClass.prototype._clear.call(this);
					this._source = null;
					this._$handleAny = null;
					this._free();
				}
			};
		}

		function createStream(name, mixin) {
			var S = createConstructor(Stream, name);
			inherit(S, Stream, createClassMethods(Stream), mixin);
			return S;
		}

		function createProperty(name, mixin) {
			var P = createConstructor(Property, name);
			inherit(P, Property, createClassMethods(Property), mixin);
			return P;
		}

		var P$2 = createProperty('toProperty', {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._getInitialCurrent = fn;
			},
			_onActivation: function () {
				if (this._getInitialCurrent !== null) {
					var getInitial = this._getInitialCurrent;
					this._emitValue(getInitial());
				}
				this._source.onAny(this._$handleAny); // copied from patterns/one-source
			}
		});

		function toProperty(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

			if (fn !== null && typeof fn !== 'function') {
				throw new Error('You should call toProperty() with a function or no arguments.');
			}
			return new P$2(obs, { fn: fn });
		}

		var S$6 = createStream('changes', {
			_handleValue: function (x) {
				if (!this._activating) {
					this._emitValue(x);
				}
			},
			_handleError: function (x) {
				if (!this._activating) {
					this._emitError(x);
				}
			}
		});

		function changes(obs) {
			return new S$6(obs);
		}

		function fromPromise(promise) {

			var called = false;

			var result = stream(function (emitter) {
				if (!called) {
					var onValue = function (x) {
						emitter.emit(x);
						emitter.end();
					};
					var onError = function (x) {
						emitter.error(x);
						emitter.end();
					};
					var _promise = promise.then(onValue, onError);

					// prevent libraries like 'Q' or 'when' from swallowing exceptions
					if (_promise && typeof _promise.done === 'function') {
						_promise.done();
					}

					called = true;
				}
			});

			return toProperty(result, null).setName('fromPromise');
		}

		function getGlodalPromise() {
			if (typeof Promise === 'function') {
				return Promise;
			} else {
				throw new Error('There isn\'t default Promise, use shim or parameter');
			}
		}

		function toPromise(obs) {
			var Promise = arguments.length <= 1 || arguments[1] === undefined ? getGlodalPromise() : arguments[1];

			var last = null;
			return new Promise(function (resolve, reject) {
				obs.onAny(function (event) {
					if (event.type === END && last !== null) {
						(last.type === VALUE ? resolve : reject)(last.value);
						last = null;
					} else {
						last = event;
					}
				});
			});
		}

		var commonjsGlobal$$1 = typeof window !== 'undefined' ? window : typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : typeof self !== 'undefined' ? self : {};

		function createCommonjsModule$$1(fn, module) {
			return module = { exports: {} }, fn(module, module.exports), module.exports;
		}

		var ponyfill = createCommonjsModule$$1(function (module, exports) {
			'use strict';

			Object.defineProperty(exports, "__esModule", {
				value: true
			});
			exports['default'] = symbolObservablePonyfill;
			function symbolObservablePonyfill(root) {
				var result;
				var _Symbol = root.Symbol;

				if (typeof _Symbol === 'function') {
					if (_Symbol.observable) {
						result = _Symbol.observable;
					} else {
						result = _Symbol('observable');
						_Symbol.observable = result;
					}
				} else {
					result = '@@observable';
				}

				return result;
			}
		});

		var require$$0$1 = ponyfill && typeof ponyfill === 'object' && 'default' in ponyfill ? ponyfill['default'] : ponyfill;

		var index$1 = createCommonjsModule$$1(function (module, exports) {
			'use strict';

			Object.defineProperty(exports, "__esModule", {
				value: true
			});

			var _ponyfill = require$$0$1;

			var _ponyfill2 = _interopRequireDefault(_ponyfill);

			function _interopRequireDefault(obj) {
				return obj && obj.__esModule ? obj : { 'default': obj };
			}

			var root = undefined; /* global window */

			if (typeof commonjsGlobal$$1 !== 'undefined') {
				root = commonjsGlobal$$1;
			} else if (typeof window !== 'undefined') {
				root = window;
			}

			var result = (0, _ponyfill2['default'])(root);
			exports['default'] = result;
		});

		var require$$0 = index$1 && typeof index$1 === 'object' && 'default' in index$1 ? index$1['default'] : index$1;

		var index = createCommonjsModule$$1(function (module) {
			module.exports = require$$0;
		});

		var $$observable = index && typeof index === 'object' && 'default' in index ? index['default'] : index;

		function fromESObservable(_observable) {
			var observable = _observable[$$observable] ? _observable[$$observable]() : _observable;
			return stream(function (emitter) {
				var unsub = observable.subscribe({
					error: function (error) {
						emitter.error(error);
						emitter.end();
					},
					next: function (value) {
						emitter.emit(value);
					},
					complete: function () {
						emitter.end();
					}
				});

				if (unsub.unsubscribe) {
					return function () {
						unsub.unsubscribe();
					};
				} else {
					return unsub;
				}
			}).setName('fromESObservable');
		}

		function ESObservable(observable) {
			this._observable = observable.takeErrors(1);
		}

		extend(ESObservable.prototype, {
			subscribe: function (observerOrOnNext, onError, onComplete) {
				var _this = this;

				var observer = typeof observerOrOnNext === 'function' ? { next: observerOrOnNext, error: onError, complete: onComplete } : observerOrOnNext;

				var fn = function (event) {
					if (event.type === END) {
						closed = true;
					}

					if (event.type === VALUE && observer.next) {
						observer.next(event.value);
					} else if (event.type === ERROR && observer.error) {
						observer.error(event.value);
					} else if (event.type === END && observer.complete) {
						observer.complete(event.value);
					}
				};

				this._observable.onAny(fn);
				var closed = false;

				var subscription = {
					unsubscribe: function () {
						closed = true;
						_this._observable.offAny(fn);
					},
					get closed() {
						return closed;
					}
				};
				return subscription;
			}
		});

		// Need to assign directly b/c Symbols aren't enumerable.
		ESObservable.prototype[$$observable] = function () {
			return this;
		};

		function toESObservable() {
			return new ESObservable(this);
		}

		function defaultErrorsCombinator(errors) {
			var latestError = void 0;
			for (var i = 0; i < errors.length; i++) {
				if (errors[i] !== undefined) {
					if (latestError === undefined || latestError.index < errors[i].index) {
						latestError = errors[i];
					}
				}
			}
			return latestError.error;
		}

		function Combine(active, passive, combinator) {
			var _this = this;

			Stream.call(this);
			this._activeCount = active.length;
			this._sources = concat(active, passive);
			this._combinator = combinator ? spread(combinator, this._sources.length) : function (x) {
				return x;
			};
			this._aliveCount = 0;
			this._latestValues = new Array(this._sources.length);
			this._latestErrors = new Array(this._sources.length);
			fillArray(this._latestValues, NOTHING);
			this._emitAfterActivation = false;
			this._endAfterActivation = false;
			this._latestErrorIndex = 0;

			this._$handlers = [];

			var _loop = function (i) {
				_this._$handlers.push(function (event) {
					return _this._handleAny(i, event);
				});
			};

			for (var i = 0; i < this._sources.length; i++) {
				_loop(i);
			}
		}

		inherit(Combine, Stream, {

			_name: 'combine',

			_onActivation: function () {
				this._aliveCount = this._activeCount;

				// we need to suscribe to _passive_ sources before _active_
				// (see https://github.com/rpominov/kefir/issues/98)
				for (var i = this._activeCount; i < this._sources.length; i++) {
					this._sources[i].onAny(this._$handlers[i]);
				}
				for (var _i = 0; _i < this._activeCount; _i++) {
					this._sources[_i].onAny(this._$handlers[_i]);
				}

				if (this._emitAfterActivation) {
					this._emitAfterActivation = false;
					this._emitIfFull();
				}
				if (this._endAfterActivation) {
					this._emitEnd();
				}
			},
			_onDeactivation: function () {
				var length = this._sources.length,
				    i = void 0;
				for (i = 0; i < length; i++) {
					this._sources[i].offAny(this._$handlers[i]);
				}
			},
			_emitIfFull: function () {
				var hasAllValues = true;
				var hasErrors = false;
				var length = this._latestValues.length;
				var valuesCopy = new Array(length);
				var errorsCopy = new Array(length);

				for (var i = 0; i < length; i++) {
					valuesCopy[i] = this._latestValues[i];
					errorsCopy[i] = this._latestErrors[i];

					if (valuesCopy[i] === NOTHING) {
						hasAllValues = false;
					}

					if (errorsCopy[i] !== undefined) {
						hasErrors = true;
					}
				}

				if (hasAllValues) {
					var combinator = this._combinator;
					this._emitValue(combinator(valuesCopy));
				}
				if (hasErrors) {
					this._emitError(defaultErrorsCombinator(errorsCopy));
				}
			},
			_handleAny: function (i, event) {

				if (event.type === VALUE || event.type === ERROR) {

					if (event.type === VALUE) {
						this._latestValues[i] = event.value;
						this._latestErrors[i] = undefined;
					}
					if (event.type === ERROR) {
						this._latestValues[i] = NOTHING;
						this._latestErrors[i] = {
							index: this._latestErrorIndex++,
							error: event.value
						};
					}

					if (i < this._activeCount) {
						if (this._activating) {
							this._emitAfterActivation = true;
						} else {
							this._emitIfFull();
						}
					}
				} else {
					// END

					if (i < this._activeCount) {
						this._aliveCount--;
						if (this._aliveCount === 0) {
							if (this._activating) {
								this._endAfterActivation = true;
							} else {
								this._emitEnd();
							}
						}
					}
				}
			},
			_clear: function () {
				Stream.prototype._clear.call(this);
				this._sources = null;
				this._latestValues = null;
				this._latestErrors = null;
				this._combinator = null;
				this._$handlers = null;
			}
		});

		function combine(active) {
			var passive = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
			var combinator = arguments[2];

			if (typeof passive === 'function') {
				combinator = passive;
				passive = [];
			}
			return active.length === 0 ? never() : new Combine(active, passive, combinator);
		}

		var Observable$1 = {
			empty: function () {
				return never();
			},

			// Monoid based on merge() seems more useful than one based on concat().
			concat: function (a, b) {
				return a.merge(b);
			},
			of: function (x) {
				return constant(x);
			},
			map: function (fn, obs) {
				return obs.map(fn);
			},
			bimap: function (fnErr, fnVal, obs) {
				return obs.mapErrors(fnErr).map(fnVal);
			},

			// This ap strictly speaking incompatible with chain. If we derive ap from chain we get
			// different (not very useful) behavior. But spec requires that if method can be derived
			// it must have the same behavior as hand-written method. We intentionally violate the spec
			// in hope that it won't cause many troubles in practice. And in return we have more useful type.
			ap: function (obsFn, obsVal) {
				return combine([obsFn, obsVal], function (fn, val) {
					return fn(val);
				});
			},
			chain: function (fn, obs) {
				return obs.flatMap(fn);
			}
		};

		var staticLand = Object.freeze({
			Observable: Observable$1
		});

		var mixin = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleValue: function (x) {
				var fn = this._fn;
				this._emitValue(fn(x));
			}
		};

		var S$7 = createStream('map', mixin);
		var P$3 = createProperty('map', mixin);

		var id = function (x) {
			return x;
		};

		function map$1(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? id : arguments[1];

			return new (obs._ofSameType(S$7, P$3))(obs, { fn: fn });
		}

		var mixin$1 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleValue: function (x) {
				var fn = this._fn;
				if (fn(x)) {
					this._emitValue(x);
				}
			}
		};

		var S$8 = createStream('filter', mixin$1);
		var P$4 = createProperty('filter', mixin$1);

		var id$1 = function (x) {
			return x;
		};

		function filter(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? id$1 : arguments[1];

			return new (obs._ofSameType(S$8, P$4))(obs, { fn: fn });
		}

		var mixin$2 = {
			_init: function (_ref) {
				var n = _ref.n;

				this._n = n;
				if (n <= 0) {
					this._emitEnd();
				}
			},
			_handleValue: function (x) {
				this._n--;
				this._emitValue(x);
				if (this._n === 0) {
					this._emitEnd();
				}
			}
		};

		var S$9 = createStream('take', mixin$2);
		var P$5 = createProperty('take', mixin$2);

		function take(obs, n) {
			return new (obs._ofSameType(S$9, P$5))(obs, { n: n });
		}

		var mixin$3 = {
			_init: function (_ref) {
				var n = _ref.n;

				this._n = n;
				if (n <= 0) {
					this._emitEnd();
				}
			},
			_handleError: function (x) {
				this._n--;
				this._emitError(x);
				if (this._n === 0) {
					this._emitEnd();
				}
			}
		};

		var S$10 = createStream('takeErrors', mixin$3);
		var P$6 = createProperty('takeErrors', mixin$3);

		function takeErrors(obs, n) {
			return new (obs._ofSameType(S$10, P$6))(obs, { n: n });
		}

		var mixin$4 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleValue: function (x) {
				var fn = this._fn;
				if (fn(x)) {
					this._emitValue(x);
				} else {
					this._emitEnd();
				}
			}
		};

		var S$11 = createStream('takeWhile', mixin$4);
		var P$7 = createProperty('takeWhile', mixin$4);

		var id$2 = function (x) {
			return x;
		};

		function takeWhile(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? id$2 : arguments[1];

			return new (obs._ofSameType(S$11, P$7))(obs, { fn: fn });
		}

		var mixin$5 = {
			_init: function () {
				this._lastValue = NOTHING;
			},
			_free: function () {
				this._lastValue = null;
			},
			_handleValue: function (x) {
				this._lastValue = x;
			},
			_handleEnd: function () {
				if (this._lastValue !== NOTHING) {
					this._emitValue(this._lastValue);
				}
				this._emitEnd();
			}
		};

		var S$12 = createStream('last', mixin$5);
		var P$8 = createProperty('last', mixin$5);

		function last(obs) {
			return new (obs._ofSameType(S$12, P$8))(obs);
		}

		var mixin$6 = {
			_init: function (_ref) {
				var n = _ref.n;

				this._n = Math.max(0, n);
			},
			_handleValue: function (x) {
				if (this._n === 0) {
					this._emitValue(x);
				} else {
					this._n--;
				}
			}
		};

		var S$13 = createStream('skip', mixin$6);
		var P$9 = createProperty('skip', mixin$6);

		function skip(obs, n) {
			return new (obs._ofSameType(S$13, P$9))(obs, { n: n });
		}

		var mixin$7 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleValue: function (x) {
				var fn = this._fn;
				if (this._fn !== null && !fn(x)) {
					this._fn = null;
				}
				if (this._fn === null) {
					this._emitValue(x);
				}
			}
		};

		var S$14 = createStream('skipWhile', mixin$7);
		var P$10 = createProperty('skipWhile', mixin$7);

		var id$3 = function (x) {
			return x;
		};

		function skipWhile(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? id$3 : arguments[1];

			return new (obs._ofSameType(S$14, P$10))(obs, { fn: fn });
		}

		var mixin$8 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
				this._prev = NOTHING;
			},
			_free: function () {
				this._fn = null;
				this._prev = null;
			},
			_handleValue: function (x) {
				var fn = this._fn;
				if (this._prev === NOTHING || !fn(this._prev, x)) {
					this._prev = x;
					this._emitValue(x);
				}
			}
		};

		var S$15 = createStream('skipDuplicates', mixin$8);
		var P$11 = createProperty('skipDuplicates', mixin$8);

		var eq = function (a, b) {
			return a === b;
		};

		function skipDuplicates(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? eq : arguments[1];

			return new (obs._ofSameType(S$15, P$11))(obs, { fn: fn });
		}

		var mixin$9 = {
			_init: function (_ref) {
				var fn = _ref.fn;
				var seed = _ref.seed;

				this._fn = fn;
				this._prev = seed;
			},
			_free: function () {
				this._prev = null;
				this._fn = null;
			},
			_handleValue: function (x) {
				if (this._prev !== NOTHING) {
					var fn = this._fn;
					this._emitValue(fn(this._prev, x));
				}
				this._prev = x;
			}
		};

		var S$16 = createStream('diff', mixin$9);
		var P$12 = createProperty('diff', mixin$9);

		function defaultFn(a, b) {
			return [a, b];
		}

		function diff(obs, fn) {
			var seed = arguments.length <= 2 || arguments[2] === undefined ? NOTHING : arguments[2];

			return new (obs._ofSameType(S$16, P$12))(obs, { fn: fn || defaultFn, seed: seed });
		}

		var P$13 = createProperty('scan', {
			_init: function (_ref) {
				var fn = _ref.fn;
				var seed = _ref.seed;

				this._fn = fn;
				this._seed = seed;
				if (seed !== NOTHING) {
					this._emitValue(seed);
				}
			},
			_free: function () {
				this._fn = null;
				this._seed = null;
			},
			_handleValue: function (x) {
				var fn = this._fn;
				if (this._currentEvent === null || this._currentEvent.type === ERROR) {
					this._emitValue(this._seed === NOTHING ? x : fn(this._seed, x));
				} else {
					this._emitValue(fn(this._currentEvent.value, x));
				}
			}
		});

		function scan(obs, fn) {
			var seed = arguments.length <= 2 || arguments[2] === undefined ? NOTHING : arguments[2];

			return new P$13(obs, { fn: fn, seed: seed });
		}

		var mixin$10 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleValue: function (x) {
				var fn = this._fn;
				var xs = fn(x);
				for (var i = 0; i < xs.length; i++) {
					this._emitValue(xs[i]);
				}
			}
		};

		var S$17 = createStream('flatten', mixin$10);

		var id$4 = function (x) {
			return x;
		};

		function flatten(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? id$4 : arguments[1];

			return new S$17(obs, { fn: fn });
		}

		var END_MARKER = {};

		var mixin$11 = {
			_init: function (_ref) {
				var _this = this;

				var wait = _ref.wait;

				this._wait = Math.max(0, wait);
				this._buff = [];
				this._$shiftBuff = function () {
					var value = _this._buff.shift();
					if (value === END_MARKER) {
						_this._emitEnd();
					} else {
						_this._emitValue(value);
					}
				};
			},
			_free: function () {
				this._buff = null;
				this._$shiftBuff = null;
			},
			_handleValue: function (x) {
				if (this._activating) {
					this._emitValue(x);
				} else {
					this._buff.push(x);
					setTimeout(this._$shiftBuff, this._wait);
				}
			},
			_handleEnd: function () {
				if (this._activating) {
					this._emitEnd();
				} else {
					this._buff.push(END_MARKER);
					setTimeout(this._$shiftBuff, this._wait);
				}
			}
		};

		var S$18 = createStream('delay', mixin$11);
		var P$14 = createProperty('delay', mixin$11);

		function delay(obs, wait) {
			return new (obs._ofSameType(S$18, P$14))(obs, { wait: wait });
		}

		var now = Date.now ? function () {
			return Date.now();
		} : function () {
			return new Date().getTime();
		};

		var mixin$12 = {
			_init: function (_ref) {
				var _this = this;

				var wait = _ref.wait;
				var leading = _ref.leading;
				var trailing = _ref.trailing;

				this._wait = Math.max(0, wait);
				this._leading = leading;
				this._trailing = trailing;
				this._trailingValue = null;
				this._timeoutId = null;
				this._endLater = false;
				this._lastCallTime = 0;
				this._$trailingCall = function () {
					return _this._trailingCall();
				};
			},
			_free: function () {
				this._trailingValue = null;
				this._$trailingCall = null;
			},
			_handleValue: function (x) {
				if (this._activating) {
					this._emitValue(x);
				} else {
					var curTime = now();
					if (this._lastCallTime === 0 && !this._leading) {
						this._lastCallTime = curTime;
					}
					var remaining = this._wait - (curTime - this._lastCallTime);
					if (remaining <= 0) {
						this._cancelTrailing();
						this._lastCallTime = curTime;
						this._emitValue(x);
					} else if (this._trailing) {
						this._cancelTrailing();
						this._trailingValue = x;
						this._timeoutId = setTimeout(this._$trailingCall, remaining);
					}
				}
			},
			_handleEnd: function () {
				if (this._activating) {
					this._emitEnd();
				} else {
					if (this._timeoutId) {
						this._endLater = true;
					} else {
						this._emitEnd();
					}
				}
			},
			_cancelTrailing: function () {
				if (this._timeoutId !== null) {
					clearTimeout(this._timeoutId);
					this._timeoutId = null;
				}
			},
			_trailingCall: function () {
				this._emitValue(this._trailingValue);
				this._timeoutId = null;
				this._trailingValue = null;
				this._lastCallTime = !this._leading ? 0 : now();
				if (this._endLater) {
					this._emitEnd();
				}
			}
		};

		var S$19 = createStream('throttle', mixin$12);
		var P$15 = createProperty('throttle', mixin$12);

		function throttle(obs, wait) {
			var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

			var _ref2$leading = _ref2.leading;
			var leading = _ref2$leading === undefined ? true : _ref2$leading;
			var _ref2$trailing = _ref2.trailing;
			var trailing = _ref2$trailing === undefined ? true : _ref2$trailing;

			return new (obs._ofSameType(S$19, P$15))(obs, { wait: wait, leading: leading, trailing: trailing });
		}

		var mixin$13 = {
			_init: function (_ref) {
				var _this = this;

				var wait = _ref.wait;
				var immediate = _ref.immediate;

				this._wait = Math.max(0, wait);
				this._immediate = immediate;
				this._lastAttempt = 0;
				this._timeoutId = null;
				this._laterValue = null;
				this._endLater = false;
				this._$later = function () {
					return _this._later();
				};
			},
			_free: function () {
				this._laterValue = null;
				this._$later = null;
			},
			_handleValue: function (x) {
				if (this._activating) {
					this._emitValue(x);
				} else {
					this._lastAttempt = now();
					if (this._immediate && !this._timeoutId) {
						this._emitValue(x);
					}
					if (!this._timeoutId) {
						this._timeoutId = setTimeout(this._$later, this._wait);
					}
					if (!this._immediate) {
						this._laterValue = x;
					}
				}
			},
			_handleEnd: function () {
				if (this._activating) {
					this._emitEnd();
				} else {
					if (this._timeoutId && !this._immediate) {
						this._endLater = true;
					} else {
						this._emitEnd();
					}
				}
			},
			_later: function () {
				var last = now() - this._lastAttempt;
				if (last < this._wait && last >= 0) {
					this._timeoutId = setTimeout(this._$later, this._wait - last);
				} else {
					this._timeoutId = null;
					if (!this._immediate) {
						this._emitValue(this._laterValue);
						this._laterValue = null;
					}
					if (this._endLater) {
						this._emitEnd();
					}
				}
			}
		};

		var S$20 = createStream('debounce', mixin$13);
		var P$16 = createProperty('debounce', mixin$13);

		function debounce(obs, wait) {
			var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

			var _ref2$immediate = _ref2.immediate;
			var immediate = _ref2$immediate === undefined ? false : _ref2$immediate;

			return new (obs._ofSameType(S$20, P$16))(obs, { wait: wait, immediate: immediate });
		}

		var mixin$14 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleError: function (x) {
				var fn = this._fn;
				this._emitError(fn(x));
			}
		};

		var S$21 = createStream('mapErrors', mixin$14);
		var P$17 = createProperty('mapErrors', mixin$14);

		var id$5 = function (x) {
			return x;
		};

		function mapErrors(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? id$5 : arguments[1];

			return new (obs._ofSameType(S$21, P$17))(obs, { fn: fn });
		}

		var mixin$15 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleError: function (x) {
				var fn = this._fn;
				if (fn(x)) {
					this._emitError(x);
				}
			}
		};

		var S$22 = createStream('filterErrors', mixin$15);
		var P$18 = createProperty('filterErrors', mixin$15);

		var id$6 = function (x) {
			return x;
		};

		function filterErrors(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? id$6 : arguments[1];

			return new (obs._ofSameType(S$22, P$18))(obs, { fn: fn });
		}

		var mixin$16 = {
			_handleValue: function () {}
		};

		var S$23 = createStream('ignoreValues', mixin$16);
		var P$19 = createProperty('ignoreValues', mixin$16);

		function ignoreValues(obs) {
			return new (obs._ofSameType(S$23, P$19))(obs);
		}

		var mixin$17 = {
			_handleError: function () {}
		};

		var S$24 = createStream('ignoreErrors', mixin$17);
		var P$20 = createProperty('ignoreErrors', mixin$17);

		function ignoreErrors(obs) {
			return new (obs._ofSameType(S$24, P$20))(obs);
		}

		var mixin$18 = {
			_handleEnd: function () {}
		};

		var S$25 = createStream('ignoreEnd', mixin$18);
		var P$21 = createProperty('ignoreEnd', mixin$18);

		function ignoreEnd(obs) {
			return new (obs._ofSameType(S$25, P$21))(obs);
		}

		var mixin$19 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleEnd: function () {
				var fn = this._fn;
				this._emitValue(fn());
				this._emitEnd();
			}
		};

		var S$26 = createStream('beforeEnd', mixin$19);
		var P$22 = createProperty('beforeEnd', mixin$19);

		function beforeEnd(obs, fn) {
			return new (obs._ofSameType(S$26, P$22))(obs, { fn: fn });
		}

		var mixin$20 = {
			_init: function (_ref) {
				var min = _ref.min;
				var max = _ref.max;

				this._max = max;
				this._min = min;
				this._buff = [];
			},
			_free: function () {
				this._buff = null;
			},
			_handleValue: function (x) {
				this._buff = slide(this._buff, x, this._max);
				if (this._buff.length >= this._min) {
					this._emitValue(this._buff);
				}
			}
		};

		var S$27 = createStream('slidingWindow', mixin$20);
		var P$23 = createProperty('slidingWindow', mixin$20);

		function slidingWindow(obs, max) {
			var min = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

			return new (obs._ofSameType(S$27, P$23))(obs, { min: min, max: max });
		}

		var mixin$21 = {
			_init: function (_ref) {
				var fn = _ref.fn;
				var flushOnEnd = _ref.flushOnEnd;

				this._fn = fn;
				this._flushOnEnd = flushOnEnd;
				this._buff = [];
			},
			_free: function () {
				this._buff = null;
			},
			_flush: function () {
				if (this._buff !== null && this._buff.length !== 0) {
					this._emitValue(this._buff);
					this._buff = [];
				}
			},
			_handleValue: function (x) {
				this._buff.push(x);
				var fn = this._fn;
				if (!fn(x)) {
					this._flush();
				}
			},
			_handleEnd: function () {
				if (this._flushOnEnd) {
					this._flush();
				}
				this._emitEnd();
			}
		};

		var S$28 = createStream('bufferWhile', mixin$21);
		var P$24 = createProperty('bufferWhile', mixin$21);

		var id$7 = function (x) {
			return x;
		};

		function bufferWhile(obs, fn) {
			var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

			var _ref2$flushOnEnd = _ref2.flushOnEnd;
			var flushOnEnd = _ref2$flushOnEnd === undefined ? true : _ref2$flushOnEnd;

			return new (obs._ofSameType(S$28, P$24))(obs, { fn: fn || id$7, flushOnEnd: flushOnEnd });
		}

		var mixin$22 = {
			_init: function (_ref) {
				var count = _ref.count;
				var flushOnEnd = _ref.flushOnEnd;

				this._count = count;
				this._flushOnEnd = flushOnEnd;
				this._buff = [];
			},
			_free: function () {
				this._buff = null;
			},
			_flush: function () {
				if (this._buff !== null && this._buff.length !== 0) {
					this._emitValue(this._buff);
					this._buff = [];
				}
			},
			_handleValue: function (x) {
				this._buff.push(x);
				if (this._buff.length >= this._count) {
					this._flush();
				}
			},
			_handleEnd: function () {
				if (this._flushOnEnd) {
					this._flush();
				}
				this._emitEnd();
			}
		};

		var S$29 = createStream('bufferWithCount', mixin$22);
		var P$25 = createProperty('bufferWithCount', mixin$22);

		function bufferWhile$1(obs, count) {
			var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

			var _ref2$flushOnEnd = _ref2.flushOnEnd;
			var flushOnEnd = _ref2$flushOnEnd === undefined ? true : _ref2$flushOnEnd;

			return new (obs._ofSameType(S$29, P$25))(obs, { count: count, flushOnEnd: flushOnEnd });
		}

		var mixin$23 = {
			_init: function (_ref) {
				var _this = this;

				var wait = _ref.wait;
				var count = _ref.count;
				var flushOnEnd = _ref.flushOnEnd;

				this._wait = wait;
				this._count = count;
				this._flushOnEnd = flushOnEnd;
				this._intervalId = null;
				this._$onTick = function () {
					return _this._flush();
				};
				this._buff = [];
			},
			_free: function () {
				this._$onTick = null;
				this._buff = null;
			},
			_flush: function () {
				if (this._buff !== null) {
					this._emitValue(this._buff);
					this._buff = [];
				}
			},
			_handleValue: function (x) {
				this._buff.push(x);
				if (this._buff.length >= this._count) {
					clearInterval(this._intervalId);
					this._flush();
					this._intervalId = setInterval(this._$onTick, this._wait);
				}
			},
			_handleEnd: function () {
				if (this._flushOnEnd && this._buff.length !== 0) {
					this._flush();
				}
				this._emitEnd();
			},
			_onActivation: function () {
				this._intervalId = setInterval(this._$onTick, this._wait);
				this._source.onAny(this._$handleAny); // copied from patterns/one-source
			},
			_onDeactivation: function () {
				if (this._intervalId !== null) {
					clearInterval(this._intervalId);
					this._intervalId = null;
				}
				this._source.offAny(this._$handleAny); // copied from patterns/one-source
			}
		};

		var S$30 = createStream('bufferWithTimeOrCount', mixin$23);
		var P$26 = createProperty('bufferWithTimeOrCount', mixin$23);

		function bufferWithTimeOrCount(obs, wait, count) {
			var _ref2 = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

			var _ref2$flushOnEnd = _ref2.flushOnEnd;
			var flushOnEnd = _ref2$flushOnEnd === undefined ? true : _ref2$flushOnEnd;

			return new (obs._ofSameType(S$30, P$26))(obs, { wait: wait, count: count, flushOnEnd: flushOnEnd });
		}

		function xformForObs(obs) {
			return {
				'@@transducer/step': function (res, input) {
					obs._emitValue(input);
					return null;
				},
				'@@transducer/result': function () {
					obs._emitEnd();
					return null;
				}
			};
		}

		var mixin$24 = {
			_init: function (_ref) {
				var transducer = _ref.transducer;

				this._xform = transducer(xformForObs(this));
			},
			_free: function () {
				this._xform = null;
			},
			_handleValue: function (x) {
				if (this._xform['@@transducer/step'](null, x) !== null) {
					this._xform['@@transducer/result'](null);
				}
			},
			_handleEnd: function () {
				this._xform['@@transducer/result'](null);
			}
		};

		var S$31 = createStream('transduce', mixin$24);
		var P$27 = createProperty('transduce', mixin$24);

		function transduce(obs, transducer) {
			return new (obs._ofSameType(S$31, P$27))(obs, { transducer: transducer });
		}

		var mixin$25 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._handler = fn;
				this._emitter = emitter(this);
			},
			_free: function () {
				this._handler = null;
				this._emitter = null;
			},
			_handleAny: function (event) {
				this._handler(this._emitter, event);
			}
		};

		var S$32 = createStream('withHandler', mixin$25);
		var P$28 = createProperty('withHandler', mixin$25);

		function withHandler(obs, fn) {
			return new (obs._ofSameType(S$32, P$28))(obs, { fn: fn });
		}

		var isArray = Array.isArray || function (xs) {
			return Object.prototype.toString.call(xs) === '[object Array]';
		};

		function Zip(sources, combinator) {
			var _this = this;

			Stream.call(this);

			this._buffers = map(sources, function (source) {
				return isArray(source) ? cloneArray(source) : [];
			});
			this._sources = map(sources, function (source) {
				return isArray(source) ? never() : source;
			});

			this._combinator = combinator ? spread(combinator, this._sources.length) : function (x) {
				return x;
			};
			this._aliveCount = 0;

			this._$handlers = [];

			var _loop = function (i) {
				_this._$handlers.push(function (event) {
					return _this._handleAny(i, event);
				});
			};

			for (var i = 0; i < this._sources.length; i++) {
				_loop(i);
			}
		}

		inherit(Zip, Stream, {

			_name: 'zip',

			_onActivation: function () {

				// if all sources are arrays
				while (this._isFull()) {
					this._emit();
				}

				var length = this._sources.length;
				this._aliveCount = length;
				for (var i = 0; i < length && this._active; i++) {
					this._sources[i].onAny(this._$handlers[i]);
				}
			},
			_onDeactivation: function () {
				for (var i = 0; i < this._sources.length; i++) {
					this._sources[i].offAny(this._$handlers[i]);
				}
			},
			_emit: function () {
				var values = new Array(this._buffers.length);
				for (var i = 0; i < this._buffers.length; i++) {
					values[i] = this._buffers[i].shift();
				}
				var combinator = this._combinator;
				this._emitValue(combinator(values));
			},
			_isFull: function () {
				for (var i = 0; i < this._buffers.length; i++) {
					if (this._buffers[i].length === 0) {
						return false;
					}
				}
				return true;
			},
			_handleAny: function (i, event) {
				if (event.type === VALUE) {
					this._buffers[i].push(event.value);
					if (this._isFull()) {
						this._emit();
					}
				}
				if (event.type === ERROR) {
					this._emitError(event.value);
				}
				if (event.type === END) {
					this._aliveCount--;
					if (this._aliveCount === 0) {
						this._emitEnd();
					}
				}
			},
			_clear: function () {
				Stream.prototype._clear.call(this);
				this._sources = null;
				this._buffers = null;
				this._combinator = null;
				this._$handlers = null;
			}
		});

		function zip(observables, combinator /* Function | falsey */) {
			return observables.length === 0 ? never() : new Zip(observables, combinator);
		}

		var id$8 = function (x) {
			return x;
		};

		function AbstractPool() {
			var _this = this;

			var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

			var _ref$queueLim = _ref.queueLim;
			var queueLim = _ref$queueLim === undefined ? 0 : _ref$queueLim;
			var _ref$concurLim = _ref.concurLim;
			var concurLim = _ref$concurLim === undefined ? -1 : _ref$concurLim;
			var _ref$drop = _ref.drop;
			var drop = _ref$drop === undefined ? 'new' : _ref$drop;

			Stream.call(this);

			this._queueLim = queueLim < 0 ? -1 : queueLim;
			this._concurLim = concurLim < 0 ? -1 : concurLim;
			this._drop = drop;
			this._queue = [];
			this._curSources = [];
			this._$handleSubAny = function (event) {
				return _this._handleSubAny(event);
			};
			this._$endHandlers = [];
			this._currentlyAdding = null;

			if (this._concurLim === 0) {
				this._emitEnd();
			}
		}

		inherit(AbstractPool, Stream, {

			_name: 'abstractPool',

			_add: function (obj, toObs /* Function | falsey */) {
				toObs = toObs || id$8;
				if (this._concurLim === -1 || this._curSources.length < this._concurLim) {
					this._addToCur(toObs(obj));
				} else {
					if (this._queueLim === -1 || this._queue.length < this._queueLim) {
						this._addToQueue(toObs(obj));
					} else if (this._drop === 'old') {
						this._removeOldest();
						this._add(obj, toObs);
					}
				}
			},
			_addAll: function (obss) {
				var _this2 = this;

				forEach(obss, function (obs) {
					return _this2._add(obs);
				});
			},
			_remove: function (obs) {
				if (this._removeCur(obs) === -1) {
					this._removeQueue(obs);
				}
			},
			_addToQueue: function (obs) {
				this._queue = concat(this._queue, [obs]);
			},
			_addToCur: function (obs) {
				if (this._active) {

					// HACK:
					//
					// We have two optimizations for cases when `obs` is ended. We don't want
					// to add such observable to the list, but only want to emit events
					// from it (if it has some).
					//
					// Instead of this hacks, we could just did following,
					// but it would be 5-8 times slower:
					//
					//     this._curSources = concat(this._curSources, [obs]);
					//     this._subscribe(obs);
					//

					// #1
					// This one for cases when `obs` already ended
					// e.g., Kefir.constant() or Kefir.never()
					if (!obs._alive) {
						if (obs._currentEvent) {
							this._emit(obs._currentEvent.type, obs._currentEvent.value);
						}
						return;
					}

					// #2
					// This one is for cases when `obs` going to end synchronously on
					// first subscriber e.g., Kefir.stream(em => {em.emit(1); em.end()})
					this._currentlyAdding = obs;
					obs.onAny(this._$handleSubAny);
					this._currentlyAdding = null;
					if (obs._alive) {
						this._curSources = concat(this._curSources, [obs]);
						if (this._active) {
							this._subToEnd(obs);
						}
					}
				} else {
					this._curSources = concat(this._curSources, [obs]);
				}
			},
			_subToEnd: function (obs) {
				var _this3 = this;

				var onEnd = function () {
					return _this3._removeCur(obs);
				};
				this._$endHandlers.push({ obs: obs, handler: onEnd });
				obs.onEnd(onEnd);
			},
			_subscribe: function (obs) {
				obs.onAny(this._$handleSubAny);

				// it can become inactive in responce of subscribing to `obs.onAny` above
				if (this._active) {
					this._subToEnd(obs);
				}
			},
			_unsubscribe: function (obs) {
				obs.offAny(this._$handleSubAny);

				var onEndI = findByPred(this._$endHandlers, function (obj) {
					return obj.obs === obs;
				});
				if (onEndI !== -1) {
					obs.offEnd(this._$endHandlers[onEndI].handler);
					this._$endHandlers.splice(onEndI, 1);
				}
			},
			_handleSubAny: function (event) {
				if (event.type === VALUE) {
					this._emitValue(event.value);
				} else if (event.type === ERROR) {
					this._emitError(event.value);
				}
			},
			_removeQueue: function (obs) {
				var index = find(this._queue, obs);
				this._queue = remove(this._queue, index);
				return index;
			},
			_removeCur: function (obs) {
				if (this._active) {
					this._unsubscribe(obs);
				}
				var index = find(this._curSources, obs);
				this._curSources = remove(this._curSources, index);
				if (index !== -1) {
					if (this._queue.length !== 0) {
						this._pullQueue();
					} else if (this._curSources.length === 0) {
						this._onEmpty();
					}
				}
				return index;
			},
			_removeOldest: function () {
				this._removeCur(this._curSources[0]);
			},
			_pullQueue: function () {
				if (this._queue.length !== 0) {
					this._queue = cloneArray(this._queue);
					this._addToCur(this._queue.shift());
				}
			},
			_onActivation: function () {
				for (var i = 0, sources = this._curSources; i < sources.length && this._active; i++) {
					this._subscribe(sources[i]);
				}
			},
			_onDeactivation: function () {
				for (var i = 0, sources = this._curSources; i < sources.length; i++) {
					this._unsubscribe(sources[i]);
				}
				if (this._currentlyAdding !== null) {
					this._unsubscribe(this._currentlyAdding);
				}
			},
			_isEmpty: function () {
				return this._curSources.length === 0;
			},
			_onEmpty: function () {},
			_clear: function () {
				Stream.prototype._clear.call(this);
				this._queue = null;
				this._curSources = null;
				this._$handleSubAny = null;
				this._$endHandlers = null;
			}
		});

		function Merge(sources) {
			AbstractPool.call(this);
			this._addAll(sources);
			this._initialised = true;
		}

		inherit(Merge, AbstractPool, {

			_name: 'merge',

			_onEmpty: function () {
				if (this._initialised) {
					this._emitEnd();
				}
			}
		});

		function merge(observables) {
			return observables.length === 0 ? never() : new Merge(observables);
		}

		function S$33(generator) {
			var _this = this;

			Stream.call(this);
			this._generator = generator;
			this._source = null;
			this._inLoop = false;
			this._iteration = 0;
			this._$handleAny = function (event) {
				return _this._handleAny(event);
			};
		}

		inherit(S$33, Stream, {

			_name: 'repeat',

			_handleAny: function (event) {
				if (event.type === END) {
					this._source = null;
					this._getSource();
				} else {
					this._emit(event.type, event.value);
				}
			},
			_getSource: function () {
				if (!this._inLoop) {
					this._inLoop = true;
					var generator = this._generator;
					while (this._source === null && this._alive && this._active) {
						this._source = generator(this._iteration++);
						if (this._source) {
							this._source.onAny(this._$handleAny);
						} else {
							this._emitEnd();
						}
					}
					this._inLoop = false;
				}
			},
			_onActivation: function () {
				if (this._source) {
					this._source.onAny(this._$handleAny);
				} else {
					this._getSource();
				}
			},
			_onDeactivation: function () {
				if (this._source) {
					this._source.offAny(this._$handleAny);
				}
			},
			_clear: function () {
				Stream.prototype._clear.call(this);
				this._generator = null;
				this._source = null;
				this._$handleAny = null;
			}
		});

		function repeat(generator) {
			return new S$33(generator);
		}

		function concat$1(observables) {
			return repeat(function (index) {
				return observables.length > index ? observables[index] : false;
			}).setName('concat');
		}

		function Pool() {
			AbstractPool.call(this);
		}

		inherit(Pool, AbstractPool, {

			_name: 'pool',

			plug: function (obs) {
				this._add(obs);
				return this;
			},
			unplug: function (obs) {
				this._remove(obs);
				return this;
			}
		});

		function FlatMap(source, fn, options) {
			var _this = this;

			AbstractPool.call(this, options);
			this._source = source;
			this._fn = fn;
			this._mainEnded = false;
			this._lastCurrent = null;
			this._$handleMain = function (event) {
				return _this._handleMain(event);
			};
		}

		inherit(FlatMap, AbstractPool, {
			_onActivation: function () {
				AbstractPool.prototype._onActivation.call(this);
				if (this._active) {
					this._source.onAny(this._$handleMain);
				}
			},
			_onDeactivation: function () {
				AbstractPool.prototype._onDeactivation.call(this);
				this._source.offAny(this._$handleMain);
				this._hadNoEvSinceDeact = true;
			},
			_handleMain: function (event) {

				if (event.type === VALUE) {
					// Is latest value before deactivation survived, and now is 'current' on this activation?
					// We don't want to handle such values, to prevent to constantly add
					// same observale on each activation/deactivation when our main source
					// is a `Kefir.conatant()` for example.
					var sameCurr = this._activating && this._hadNoEvSinceDeact && this._lastCurrent === event.value;
					if (!sameCurr) {
						this._add(event.value, this._fn);
					}
					this._lastCurrent = event.value;
					this._hadNoEvSinceDeact = false;
				}

				if (event.type === ERROR) {
					this._emitError(event.value);
				}

				if (event.type === END) {
					if (this._isEmpty()) {
						this._emitEnd();
					} else {
						this._mainEnded = true;
					}
				}
			},
			_onEmpty: function () {
				if (this._mainEnded) {
					this._emitEnd();
				}
			},
			_clear: function () {
				AbstractPool.prototype._clear.call(this);
				this._source = null;
				this._lastCurrent = null;
				this._$handleMain = null;
			}
		});

		function FlatMapErrors(source, fn) {
			FlatMap.call(this, source, fn);
		}

		inherit(FlatMapErrors, FlatMap, {

			// Same as in FlatMap, only VALUE/ERROR flipped
			_handleMain: function (event) {

				if (event.type === ERROR) {
					var sameCurr = this._activating && this._hadNoEvSinceDeact && this._lastCurrent === event.value;
					if (!sameCurr) {
						this._add(event.value, this._fn);
					}
					this._lastCurrent = event.value;
					this._hadNoEvSinceDeact = false;
				}

				if (event.type === VALUE) {
					this._emitValue(event.value);
				}

				if (event.type === END) {
					if (this._isEmpty()) {
						this._emitEnd();
					} else {
						this._mainEnded = true;
					}
				}
			}
		});

		function createConstructor$1(BaseClass, name) {
			return function AnonymousObservable(primary, secondary, options) {
				var _this = this;

				BaseClass.call(this);
				this._primary = primary;
				this._secondary = secondary;
				this._name = primary._name + '.' + name;
				this._lastSecondary = NOTHING;
				this._$handleSecondaryAny = function (event) {
					return _this._handleSecondaryAny(event);
				};
				this._$handlePrimaryAny = function (event) {
					return _this._handlePrimaryAny(event);
				};
				this._init(options);
			};
		}

		function createClassMethods$1(BaseClass) {
			return {
				_init: function () {},
				_free: function () {},
				_handlePrimaryValue: function (x) {
					this._emitValue(x);
				},
				_handlePrimaryError: function (x) {
					this._emitError(x);
				},
				_handlePrimaryEnd: function () {
					this._emitEnd();
				},
				_handleSecondaryValue: function (x) {
					this._lastSecondary = x;
				},
				_handleSecondaryError: function (x) {
					this._emitError(x);
				},
				_handleSecondaryEnd: function () {},
				_handlePrimaryAny: function (event) {
					switch (event.type) {
						case VALUE:
							return this._handlePrimaryValue(event.value);
						case ERROR:
							return this._handlePrimaryError(event.value);
						case END:
							return this._handlePrimaryEnd(event.value);
					}
				},
				_handleSecondaryAny: function (event) {
					switch (event.type) {
						case VALUE:
							return this._handleSecondaryValue(event.value);
						case ERROR:
							return this._handleSecondaryError(event.value);
						case END:
							this._handleSecondaryEnd(event.value);
							this._removeSecondary();
					}
				},
				_removeSecondary: function () {
					if (this._secondary !== null) {
						this._secondary.offAny(this._$handleSecondaryAny);
						this._$handleSecondaryAny = null;
						this._secondary = null;
					}
				},
				_onActivation: function () {
					if (this._secondary !== null) {
						this._secondary.onAny(this._$handleSecondaryAny);
					}
					if (this._active) {
						this._primary.onAny(this._$handlePrimaryAny);
					}
				},
				_onDeactivation: function () {
					if (this._secondary !== null) {
						this._secondary.offAny(this._$handleSecondaryAny);
					}
					this._primary.offAny(this._$handlePrimaryAny);
				},
				_clear: function () {
					BaseClass.prototype._clear.call(this);
					this._primary = null;
					this._secondary = null;
					this._lastSecondary = null;
					this._$handleSecondaryAny = null;
					this._$handlePrimaryAny = null;
					this._free();
				}
			};
		}

		function createStream$1(name, mixin) {
			var S = createConstructor$1(Stream, name);
			inherit(S, Stream, createClassMethods$1(Stream), mixin);
			return S;
		}

		function createProperty$1(name, mixin) {
			var P = createConstructor$1(Property, name);
			inherit(P, Property, createClassMethods$1(Property), mixin);
			return P;
		}

		var mixin$26 = {
			_handlePrimaryValue: function (x) {
				if (this._lastSecondary !== NOTHING && this._lastSecondary) {
					this._emitValue(x);
				}
			},
			_handleSecondaryEnd: function () {
				if (this._lastSecondary === NOTHING || !this._lastSecondary) {
					this._emitEnd();
				}
			}
		};

		var S$34 = createStream$1('filterBy', mixin$26);
		var P$29 = createProperty$1('filterBy', mixin$26);

		function filterBy(primary, secondary) {
			return new (primary._ofSameType(S$34, P$29))(primary, secondary);
		}

		var id2 = function (_, x) {
			return x;
		};

		function sampledBy(passive, active, combinator) {
			var _combinator = combinator ? function (a, b) {
				return combinator(b, a);
			} : id2;
			return combine([active], [passive], _combinator).setName(passive, 'sampledBy');
		}

		var mixin$27 = {
			_handlePrimaryValue: function (x) {
				if (this._lastSecondary !== NOTHING) {
					this._emitValue(x);
				}
			},
			_handleSecondaryEnd: function () {
				if (this._lastSecondary === NOTHING) {
					this._emitEnd();
				}
			}
		};

		var S$35 = createStream$1('skipUntilBy', mixin$27);
		var P$30 = createProperty$1('skipUntilBy', mixin$27);

		function skipUntilBy(primary, secondary) {
			return new (primary._ofSameType(S$35, P$30))(primary, secondary);
		}

		var mixin$28 = {
			_handleSecondaryValue: function () {
				this._emitEnd();
			}
		};

		var S$36 = createStream$1('takeUntilBy', mixin$28);
		var P$31 = createProperty$1('takeUntilBy', mixin$28);

		function takeUntilBy(primary, secondary) {
			return new (primary._ofSameType(S$36, P$31))(primary, secondary);
		}

		var mixin$29 = {
			_init: function () {
				var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

				var _ref$flushOnEnd = _ref.flushOnEnd;
				var flushOnEnd = _ref$flushOnEnd === undefined ? true : _ref$flushOnEnd;

				this._buff = [];
				this._flushOnEnd = flushOnEnd;
			},
			_free: function () {
				this._buff = null;
			},
			_flush: function () {
				if (this._buff !== null) {
					this._emitValue(this._buff);
					this._buff = [];
				}
			},
			_handlePrimaryEnd: function () {
				if (this._flushOnEnd) {
					this._flush();
				}
				this._emitEnd();
			},
			_onActivation: function () {
				this._primary.onAny(this._$handlePrimaryAny);
				if (this._alive && this._secondary !== null) {
					this._secondary.onAny(this._$handleSecondaryAny);
				}
			},
			_handlePrimaryValue: function (x) {
				this._buff.push(x);
			},
			_handleSecondaryValue: function () {
				this._flush();
			},
			_handleSecondaryEnd: function () {
				if (!this._flushOnEnd) {
					this._emitEnd();
				}
			}
		};

		var S$37 = createStream$1('bufferBy', mixin$29);
		var P$32 = createProperty$1('bufferBy', mixin$29);

		function bufferBy(primary, secondary, options /* optional */) {
			return new (primary._ofSameType(S$37, P$32))(primary, secondary, options);
		}

		var mixin$30 = {
			_init: function () {
				var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

				var _ref$flushOnEnd = _ref.flushOnEnd;
				var flushOnEnd = _ref$flushOnEnd === undefined ? true : _ref$flushOnEnd;
				var _ref$flushOnChange = _ref.flushOnChange;
				var flushOnChange = _ref$flushOnChange === undefined ? false : _ref$flushOnChange;

				this._buff = [];
				this._flushOnEnd = flushOnEnd;
				this._flushOnChange = flushOnChange;
			},
			_free: function () {
				this._buff = null;
			},
			_flush: function () {
				if (this._buff !== null) {
					this._emitValue(this._buff);
					this._buff = [];
				}
			},
			_handlePrimaryEnd: function () {
				if (this._flushOnEnd) {
					this._flush();
				}
				this._emitEnd();
			},
			_handlePrimaryValue: function (x) {
				this._buff.push(x);
				if (this._lastSecondary !== NOTHING && !this._lastSecondary) {
					this._flush();
				}
			},
			_handleSecondaryEnd: function () {
				if (!this._flushOnEnd && (this._lastSecondary === NOTHING || this._lastSecondary)) {
					this._emitEnd();
				}
			},
			_handleSecondaryValue: function (x) {
				if (this._flushOnChange && !x) {
					this._flush();
				}

				// from default _handleSecondaryValue
				this._lastSecondary = x;
			}
		};

		var S$38 = createStream$1('bufferWhileBy', mixin$30);
		var P$33 = createProperty$1('bufferWhileBy', mixin$30);

		function bufferWhileBy(primary, secondary, options /* optional */) {
			return new (primary._ofSameType(S$38, P$33))(primary, secondary, options);
		}

		var f = function () {
			return false;
		};
		var t = function () {
			return true;
		};

		function awaiting(a, b) {
			var result = merge([map$1(a, t), map$1(b, f)]);
			result = skipDuplicates(result);
			result = toProperty(result, f);
			return result.setName(a, 'awaiting');
		}

		var mixin$31 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleValue: function (x) {
				var fn = this._fn;
				var result = fn(x);
				if (result.convert) {
					this._emitError(result.error);
				} else {
					this._emitValue(x);
				}
			}
		};

		var S$39 = createStream('valuesToErrors', mixin$31);
		var P$34 = createProperty('valuesToErrors', mixin$31);

		var defFn = function (x) {
			return { convert: true, error: x };
		};

		function valuesToErrors(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? defFn : arguments[1];

			return new (obs._ofSameType(S$39, P$34))(obs, { fn: fn });
		}

		var mixin$32 = {
			_init: function (_ref) {
				var fn = _ref.fn;

				this._fn = fn;
			},
			_free: function () {
				this._fn = null;
			},
			_handleError: function (x) {
				var fn = this._fn;
				var result = fn(x);
				if (result.convert) {
					this._emitValue(result.value);
				} else {
					this._emitError(x);
				}
			}
		};

		var S$40 = createStream('errorsToValues', mixin$32);
		var P$35 = createProperty('errorsToValues', mixin$32);

		var defFn$1 = function (x) {
			return { convert: true, value: x };
		};

		function errorsToValues(obs) {
			var fn = arguments.length <= 1 || arguments[1] === undefined ? defFn$1 : arguments[1];

			return new (obs._ofSameType(S$40, P$35))(obs, { fn: fn });
		}

		var mixin$33 = {
			_handleError: function (x) {
				this._emitError(x);
				this._emitEnd();
			}
		};

		var S$41 = createStream('endOnError', mixin$33);
		var P$36 = createProperty('endOnError', mixin$33);

		function endOnError(obs) {
			return new (obs._ofSameType(S$41, P$36))(obs);
		}

		Observable.prototype.toProperty = function (fn) {
			return toProperty(this, fn);
		};

		Observable.prototype.changes = function () {
			return changes(this);
		};

		Observable.prototype.toPromise = function (Promise) {
			return toPromise(this, Promise);
		};

		Observable.prototype.toESObservable = toESObservable;
		Observable.prototype[$$observable] = toESObservable;

		Observable.prototype.map = function (fn) {
			return map$1(this, fn);
		};

		Observable.prototype.filter = function (fn) {
			return filter(this, fn);
		};

		Observable.prototype.take = function (n) {
			return take(this, n);
		};

		Observable.prototype.takeErrors = function (n) {
			return takeErrors(this, n);
		};

		Observable.prototype.takeWhile = function (fn) {
			return takeWhile(this, fn);
		};

		Observable.prototype.last = function () {
			return last(this);
		};

		Observable.prototype.skip = function (n) {
			return skip(this, n);
		};

		Observable.prototype.skipWhile = function (fn) {
			return skipWhile(this, fn);
		};

		Observable.prototype.skipDuplicates = function (fn) {
			return skipDuplicates(this, fn);
		};

		Observable.prototype.diff = function (fn, seed) {
			return diff(this, fn, seed);
		};

		Observable.prototype.scan = function (fn, seed) {
			return scan(this, fn, seed);
		};

		Observable.prototype.flatten = function (fn) {
			return flatten(this, fn);
		};

		Observable.prototype.delay = function (wait) {
			return delay(this, wait);
		};

		Observable.prototype.throttle = function (wait, options) {
			return throttle(this, wait, options);
		};

		Observable.prototype.debounce = function (wait, options) {
			return debounce(this, wait, options);
		};

		Observable.prototype.mapErrors = function (fn) {
			return mapErrors(this, fn);
		};

		Observable.prototype.filterErrors = function (fn) {
			return filterErrors(this, fn);
		};

		Observable.prototype.ignoreValues = function () {
			return ignoreValues(this);
		};

		Observable.prototype.ignoreErrors = function () {
			return ignoreErrors(this);
		};

		Observable.prototype.ignoreEnd = function () {
			return ignoreEnd(this);
		};

		Observable.prototype.beforeEnd = function (fn) {
			return beforeEnd(this, fn);
		};

		Observable.prototype.slidingWindow = function (max, min) {
			return slidingWindow(this, max, min);
		};

		Observable.prototype.bufferWhile = function (fn, options) {
			return bufferWhile(this, fn, options);
		};

		Observable.prototype.bufferWithCount = function (count, options) {
			return bufferWhile$1(this, count, options);
		};

		Observable.prototype.bufferWithTimeOrCount = function (wait, count, options) {
			return bufferWithTimeOrCount(this, wait, count, options);
		};

		Observable.prototype.transduce = function (transducer) {
			return transduce(this, transducer);
		};

		Observable.prototype.withHandler = function (fn) {
			return withHandler(this, fn);
		};

		Observable.prototype.combine = function (other, combinator) {
			return combine([this, other], combinator);
		};

		Observable.prototype.zip = function (other, combinator) {
			return zip([this, other], combinator);
		};

		Observable.prototype.merge = function (other) {
			return merge([this, other]);
		};

		Observable.prototype.concat = function (other) {
			return concat$1([this, other]);
		};

		var pool = function () {
			return new Pool();
		};

		Observable.prototype.flatMap = function (fn) {
			return new FlatMap(this, fn).setName(this, 'flatMap');
		};
		Observable.prototype.flatMapLatest = function (fn) {
			return new FlatMap(this, fn, { concurLim: 1, drop: 'old' }).setName(this, 'flatMapLatest');
		};
		Observable.prototype.flatMapFirst = function (fn) {
			return new FlatMap(this, fn, { concurLim: 1 }).setName(this, 'flatMapFirst');
		};
		Observable.prototype.flatMapConcat = function (fn) {
			return new FlatMap(this, fn, { queueLim: -1, concurLim: 1 }).setName(this, 'flatMapConcat');
		};
		Observable.prototype.flatMapConcurLimit = function (fn, limit) {
			return new FlatMap(this, fn, { queueLim: -1, concurLim: limit }).setName(this, 'flatMapConcurLimit');
		};

		Observable.prototype.flatMapErrors = function (fn) {
			return new FlatMapErrors(this, fn).setName(this, 'flatMapErrors');
		};

		Observable.prototype.filterBy = function (other) {
			return filterBy(this, other);
		};

		Observable.prototype.sampledBy = function (other, combinator) {
			return sampledBy(this, other, combinator);
		};

		Observable.prototype.skipUntilBy = function (other) {
			return skipUntilBy(this, other);
		};

		Observable.prototype.takeUntilBy = function (other) {
			return takeUntilBy(this, other);
		};

		Observable.prototype.bufferBy = function (other, options) {
			return bufferBy(this, other, options);
		};

		Observable.prototype.bufferWhileBy = function (other, options) {
			return bufferWhileBy(this, other, options);
		};

		// Deprecated
		// -----------------------------------------------------------------------------

		var DEPRECATION_WARNINGS = true;
		function dissableDeprecationWarnings() {
			DEPRECATION_WARNINGS = false;
		}

		function warn(msg) {
			if (DEPRECATION_WARNINGS && console && typeof console.warn === 'function') {
				var msg2 = '\nHere is an Error object for you containing the call stack:';
				console.warn(msg, msg2, new Error());
			}
		}

		Observable.prototype.awaiting = function (other) {
			warn('You are using deprecated .awaiting() method, see https://github.com/rpominov/kefir/issues/145');
			return awaiting(this, other);
		};

		Observable.prototype.valuesToErrors = function (fn) {
			warn('You are using deprecated .valuesToErrors() method, see https://github.com/rpominov/kefir/issues/149');
			return valuesToErrors(this, fn);
		};

		Observable.prototype.errorsToValues = function (fn) {
			warn('You are using deprecated .errorsToValues() method, see https://github.com/rpominov/kefir/issues/149');
			return errorsToValues(this, fn);
		};

		Observable.prototype.endOnError = function () {
			warn('You are using deprecated .endOnError() method, see https://github.com/rpominov/kefir/issues/150');
			return endOnError(this);
		};

		// Exports
		// --------------------------------------------------------------------------

		var Kefir = { Observable: Observable, Stream: Stream, Property: Property, never: never, later: later, interval: interval, sequentially: sequentially,
			fromPoll: fromPoll, withInterval: withInterval, fromCallback: fromCallback, fromNodeCallback: fromNodeCallback, fromEvents: fromEvents, stream: stream,
			constant: constant, constantError: constantError, fromPromise: fromPromise, fromESObservable: fromESObservable, combine: combine, zip: zip, merge: merge,
			concat: concat$1, Pool: Pool, pool: pool, repeat: repeat, staticLand: staticLand };

		Kefir.Kefir = Kefir;

		exports.dissableDeprecationWarnings = dissableDeprecationWarnings;
		exports.Kefir = Kefir;
		exports.Observable = Observable;
		exports.Stream = Stream;
		exports.Property = Property;
		exports.never = never;
		exports.later = later;
		exports.interval = interval;
		exports.sequentially = sequentially;
		exports.fromPoll = fromPoll;
		exports.withInterval = withInterval;
		exports.fromCallback = fromCallback;
		exports.fromNodeCallback = fromNodeCallback;
		exports.fromEvents = fromEvents;
		exports.stream = stream;
		exports.constant = constant;
		exports.constantError = constantError;
		exports.fromPromise = fromPromise;
		exports.fromESObservable = fromESObservable;
		exports.combine = combine;
		exports.zip = zip;
		exports.merge = merge;
		exports.concat = concat$1;
		exports.Pool = Pool;
		exports.pool = pool;
		exports.repeat = repeat;
		exports.staticLand = staticLand;
		exports['default'] = Kefir;

		Object.defineProperty(exports, '__esModule', { value: true });
	});
});

var Kefir = unwrapExports(kefir);

function bus() {
  let emitter;
  let stream = Kefir.stream(_emitter => {
    emitter = _emitter;
    return function () {
      emitter = null;
    };
  });
  stream.emit = function (x) {
    emitter && emitter.emit(x);
  };
  return stream;
}

function convertToHyperScript(node) {
  if (Array.isArray(node)) {
    let [sel, data, children] = node;

    if (Array.isArray(children)) {
      return h(sel, data, children.map(convertToHyperScript));
    }
    return h.apply(null, node);
  }
  return node;
}

function render(view$, container) {
  let patch = snabbdom.init([_class, props, style, eventlisteners]);
  let vnode = container;

  view$.map(convertToHyperScript).onValue(newVnode => {
    patch(vnode, newVnode);
    vnode = newVnode;
  });
}

// Streams
let actions$ = bus();

// Model
function getFromStorage() {
  let json = localStorage.getItem('todos-muvjs');
  if (json) {
    return JSON.parse(json);
  }
}

function getFilterFromHash() {
  let hash = location.hash;
  let filter;

  if (hash) {
    filter = hash.slice(2);
  }
  return !filter ? 'all' : filter;
}

let initModel = getFromStorage() || { items: [], allCompleted: false, filter: getFilterFromHash(), text: '', uid: 0 };

// Update
function update(model, [action, value]) {
  let { items, allCompleted, filter, text, uid } = model;
  let newItems;

  switch (action) {
    case 'changeText':
      return Object.assign({}, model, { text: value });
    case 'addItem':
      return Object.assign({}, model, { text: '', allCompleted: false, items: [...items, newItem(value, uid)], uid: uid + 1 });
    case 'toggleItem':
      newItems = items.map(item => {
        return item.id == value ? Object.assign({}, item, { completed: !item.completed }) : item;
      });
      return Object.assign({}, model, { items: newItems, allCompleted: allItemsCompleted(newItems) });
    case 'editItem':
      newItems = items.map(item => {
        return item.id == value ? Object.assign({}, item, { editing: true }) : item;
      });
      return Object.assign({}, model, { items: newItems });
    case 'updateItem':
      if (value == '') {
        let index = items.findIndex(item => item.editing);
        newItems = removeItem(items, items[index].id);
      } else {
        newItems = items.map(item => {
          return item.editing ? Object.assign({}, item, { editing: false, text: value }) : item;
        });
      }
      return Object.assign({}, model, { items: newItems });
    case 'removeItem':
      newItems = removeItem(items, value);
      return Object.assign({}, model, { items: newItems, allCompleted: allItemsCompleted(newItems) });
    case 'toggleAll':
      let newAllCompleted = !allCompleted;

      newItems = items.map(item => {
        return Object.assign({}, item, { completed: newAllCompleted });
      });
      return Object.assign({}, model, { items: newItems, allCompleted: newAllCompleted });
    case 'changeFilter':
      return Object.assign({}, model, { filter: value });
    case 'clearCompleted':
      newItems = items.filter(item => !item.completed);
      return Object.assign({}, model, { items: newItems });
  }
}

function removeItem(items, id) {
  return items.filter(item => item.id != id);
}

function allItemsCompleted(items) {
  return items.every(item => item.completed);
}

function newItem(text, id) {
  return { id, text, completed: false, editing: false };
}

// View
function view(model) {
  let { text } = model;
  let numItems = model.items.length;

  let v = ['div', {}, [['section.todoapp', {}, [['header.header', {}, [['h1', {}, 'todos'], ['input.new-todo', { props: { placeholder: 'What needs to be done?', autofocus: true, value: text },
    on: { input: handleInput, keydown: onEnter } }]]], numItems > 0 ? main(model) : '', numItems > 0 ? footer(model) : '']], info()]];
  return v;
}

function handleInput(e) {
  let value = e.target.value.trim();
  actions$.emit(['changeText', value]);
}

function onEnter(e) {
  if (e.code == 'Enter') {
    let text = e.target.value.trim();
    actions$.emit(['addItem', text]);
  }
}

function main({ items, filter, allCompleted }) {
  function isVisible(item) {
    switch (filter) {
      case 'all':
        return true;
      case 'completed':
        return item.completed;
      case 'active':
        return !item.completed;
    }
  }

  let v = ['section.main', {}, [['input.toggle-all', { props: { type: 'checkbox', checked: allCompleted }, on: { click: toggleAll } }], ['label', { props: { htmlFor: 'toggle-all' } }, 'Mark all as complete'], ['ul.todo-list', {}, items.filter(isVisible).map(viewItem)]]];
  return v;
}

function toggleAll() {
  actions$.emit(['toggleAll']);
}

function viewItem(item) {
  let { id, completed, editing, text } = item;
  let v = ['li', { class: { completed, editing } }, [['div.view', {}, [['input.toggle', { props: { type: 'checkbox', checked: completed },
    on: { click: [checkboxClick, id] } }], ['label', { on: { dblclick: [itemClick, id] } }, text], ['button.destroy', { on: { click: [destroyClick, id] } }]]], ['input.edit', { props: { value: text }, on: { keydown: onEditDone, blur: onBlur }, hook: { postpatch: focusElement } }]]];
  return v;
}

function focusElement(oldVnode, vnode) {
  return vnode.elm.focus();
}

function onEditDone(e) {
  if (e.code == 'Enter' || e.code == 'Escape') {
    let text = e.target.value.trim();
    actions$.emit(['updateItem', text]);
  }
}

function onBlur(e) {
  let text = e.target.value.trim();
  actions$.emit(['updateItem', text]);
}

function itemClick(id) {
  actions$.emit(['editItem', id]);
}

function checkboxClick(id) {
  actions$.emit(['toggleItem', id]);
}

function destroyClick(id) {
  actions$.emit(['removeItem', id]);
}

function numUncompleted(items) {
  return items.filter(item => !item.completed).length;
}

function numCompleted(items) {
  return items.filter(item => item.completed).length;
}

function footer({ items, filter }) {
  let numLeft = numUncompleted(items);
  let numDone = numCompleted(items);

  let v = ['footer.footer', {}, [['span.todo-count', {}, [['strong', {}, `${ numLeft } item${ numLeft == 1 ? '' : 's' } left`]]], ['ul.filters', {}, [viewFilter('#/', 'all', filter), viewFilter('#/active', 'active', filter), viewFilter('#/completed', 'completed', filter)]], numDone >= 1 ? ['button.clear-completed', { on: { click: clearCompleted } }, `Clear Completed (${ numDone })`] : '']];
  return v;
}

function clearCompleted(e) {
  actions$.emit(['clearCompleted']);
}

function viewFilter(href, filter, currentFilter) {
  let v = ['li', {}, [['a', { props: { href: href }, class: { selected: filter == currentFilter } }, filter]]];
  return v;
}

function info() {
  let v = ['footer.info', {}, [['p', {}, 'Double-click to edit a todo'], ['p', {}, ['Created by ', ['a', { props: { href: 'https://github.com/dubiousdavid' } }, 'David Sargeant']]], ['p', {}, ['Part of ', ['a', { props: { href: 'http://todomvc.com' } }, 'TodoMVC']]]]];
  return v;
}

// Reduce
let model$ = actions$.scan(update, initModel);
model$.log();

// Save to local storage
function disableEditing(model) {
  let newItems = model.items.map(item => {
    return Object.assign({}, item, { editing: false });
  });
  return Object.assign({}, model, { items: newItems });
}

model$.map(disableEditing).onValue(model => localStorage.setItem('todos-muvjs', JSON.stringify(model)));

// Handle hash change
function changeFilter() {
  actions$.emit(['changeFilter', getFilterFromHash()]);
}

window.onhashchange = changeFilter;

// Render
let view$ = model$.map(view);
render(view$, document.getElementById('container'));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS92bm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9pcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9odG1sZG9tYXBpLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL3NuYWJiZG9tLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9jbGFzcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9rZWZpci9kaXN0L2tlZmlyLmpzIiwiLi4vLi4vc3JjL2luZGV4LmpzIiwiaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzZWwsIGRhdGEsIGNoaWxkcmVuLCB0ZXh0LCBlbG0pIHtcbiAgdmFyIGtleSA9IGRhdGEgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IGRhdGEua2V5O1xuICByZXR1cm4ge3NlbDogc2VsLCBkYXRhOiBkYXRhLCBjaGlsZHJlbjogY2hpbGRyZW4sXG4gICAgICAgICAgdGV4dDogdGV4dCwgZWxtOiBlbG0sIGtleToga2V5fTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYXJyYXk6IEFycmF5LmlzQXJyYXksXG4gIHByaW1pdGl2ZTogZnVuY3Rpb24ocykgeyByZXR1cm4gdHlwZW9mIHMgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzID09PSAnbnVtYmVyJzsgfSxcbn07XG4iLCJmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZ05hbWUpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgcXVhbGlmaWVkTmFtZSl7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBxdWFsaWZpZWROYW1lKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVGV4dE5vZGUodGV4dCl7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBpbnNlcnRCZWZvcmUocGFyZW50Tm9kZSwgbmV3Tm9kZSwgcmVmZXJlbmNlTm9kZSl7XG4gIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUNoaWxkKG5vZGUsIGNoaWxkKXtcbiAgbm9kZS5yZW1vdmVDaGlsZChjaGlsZCk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZENoaWxkKG5vZGUsIGNoaWxkKXtcbiAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG59XG5cbmZ1bmN0aW9uIHBhcmVudE5vZGUobm9kZSl7XG4gIHJldHVybiBub2RlLnBhcmVudEVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIG5leHRTaWJsaW5nKG5vZGUpe1xuICByZXR1cm4gbm9kZS5uZXh0U2libGluZztcbn1cblxuZnVuY3Rpb24gdGFnTmFtZShub2RlKXtcbiAgcmV0dXJuIG5vZGUudGFnTmFtZTtcbn1cblxuZnVuY3Rpb24gc2V0VGV4dENvbnRlbnQobm9kZSwgdGV4dCl7XG4gIG5vZGUudGV4dENvbnRlbnQgPSB0ZXh0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlRWxlbWVudDogY3JlYXRlRWxlbWVudCxcbiAgY3JlYXRlRWxlbWVudE5TOiBjcmVhdGVFbGVtZW50TlMsXG4gIGNyZWF0ZVRleHROb2RlOiBjcmVhdGVUZXh0Tm9kZSxcbiAgYXBwZW5kQ2hpbGQ6IGFwcGVuZENoaWxkLFxuICByZW1vdmVDaGlsZDogcmVtb3ZlQ2hpbGQsXG4gIGluc2VydEJlZm9yZTogaW5zZXJ0QmVmb3JlLFxuICBwYXJlbnROb2RlOiBwYXJlbnROb2RlLFxuICBuZXh0U2libGluZzogbmV4dFNpYmxpbmcsXG4gIHRhZ05hbWU6IHRhZ05hbWUsXG4gIHNldFRleHRDb250ZW50OiBzZXRUZXh0Q29udGVudFxufTtcbiIsIi8vIGpzaGludCBuZXdjYXA6IGZhbHNlXG4vKiBnbG9iYWwgcmVxdWlyZSwgbW9kdWxlLCBkb2N1bWVudCwgTm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVk5vZGUgPSByZXF1aXJlKCcuL3Zub2RlJyk7XG52YXIgaXMgPSByZXF1aXJlKCcuL2lzJyk7XG52YXIgZG9tQXBpID0gcmVxdWlyZSgnLi9odG1sZG9tYXBpJyk7XG5cbmZ1bmN0aW9uIGlzVW5kZWYocykgeyByZXR1cm4gcyA9PT0gdW5kZWZpbmVkOyB9XG5mdW5jdGlvbiBpc0RlZihzKSB7IHJldHVybiBzICE9PSB1bmRlZmluZWQ7IH1cblxudmFyIGVtcHR5Tm9kZSA9IFZOb2RlKCcnLCB7fSwgW10sIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcblxuZnVuY3Rpb24gc2FtZVZub2RlKHZub2RlMSwgdm5vZGUyKSB7XG4gIHJldHVybiB2bm9kZTEua2V5ID09PSB2bm9kZTIua2V5ICYmIHZub2RlMS5zZWwgPT09IHZub2RlMi5zZWw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUtleVRvT2xkSWR4KGNoaWxkcmVuLCBiZWdpbklkeCwgZW5kSWR4KSB7XG4gIHZhciBpLCBtYXAgPSB7fSwga2V5O1xuICBmb3IgKGkgPSBiZWdpbklkeDsgaSA8PSBlbmRJZHg7ICsraSkge1xuICAgIGtleSA9IGNoaWxkcmVuW2ldLmtleTtcbiAgICBpZiAoaXNEZWYoa2V5KSkgbWFwW2tleV0gPSBpO1xuICB9XG4gIHJldHVybiBtYXA7XG59XG5cbnZhciBob29rcyA9IFsnY3JlYXRlJywgJ3VwZGF0ZScsICdyZW1vdmUnLCAnZGVzdHJveScsICdwcmUnLCAncG9zdCddO1xuXG5mdW5jdGlvbiBpbml0KG1vZHVsZXMsIGFwaSkge1xuICB2YXIgaSwgaiwgY2JzID0ge307XG5cbiAgaWYgKGlzVW5kZWYoYXBpKSkgYXBpID0gZG9tQXBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBob29rcy5sZW5ndGg7ICsraSkge1xuICAgIGNic1tob29rc1tpXV0gPSBbXTtcbiAgICBmb3IgKGogPSAwOyBqIDwgbW9kdWxlcy5sZW5ndGg7ICsraikge1xuICAgICAgaWYgKG1vZHVsZXNbal1baG9va3NbaV1dICE9PSB1bmRlZmluZWQpIGNic1tob29rc1tpXV0ucHVzaChtb2R1bGVzW2pdW2hvb2tzW2ldXSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZW1wdHlOb2RlQXQoZWxtKSB7XG4gICAgdmFyIGlkID0gZWxtLmlkID8gJyMnICsgZWxtLmlkIDogJyc7XG4gICAgdmFyIGMgPSBlbG0uY2xhc3NOYW1lID8gJy4nICsgZWxtLmNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJy4nKSA6ICcnO1xuICAgIHJldHVybiBWTm9kZShhcGkudGFnTmFtZShlbG0pLnRvTG93ZXJDYXNlKCkgKyBpZCArIGMsIHt9LCBbXSwgdW5kZWZpbmVkLCBlbG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlUm1DYihjaGlsZEVsbSwgbGlzdGVuZXJzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tbGlzdGVuZXJzID09PSAwKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBhcGkucGFyZW50Tm9kZShjaGlsZEVsbSk7XG4gICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnQsIGNoaWxkRWxtKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICB2YXIgaSwgZGF0YSA9IHZub2RlLmRhdGE7XG4gICAgaWYgKGlzRGVmKGRhdGEpKSB7XG4gICAgICBpZiAoaXNEZWYoaSA9IGRhdGEuaG9vaykgJiYgaXNEZWYoaSA9IGkuaW5pdCkpIHtcbiAgICAgICAgaSh2bm9kZSk7XG4gICAgICAgIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZWxtLCBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuLCBzZWwgPSB2bm9kZS5zZWw7XG4gICAgaWYgKGlzRGVmKHNlbCkpIHtcbiAgICAgIC8vIFBhcnNlIHNlbGVjdG9yXG4gICAgICB2YXIgaGFzaElkeCA9IHNlbC5pbmRleE9mKCcjJyk7XG4gICAgICB2YXIgZG90SWR4ID0gc2VsLmluZGV4T2YoJy4nLCBoYXNoSWR4KTtcbiAgICAgIHZhciBoYXNoID0gaGFzaElkeCA+IDAgPyBoYXNoSWR4IDogc2VsLmxlbmd0aDtcbiAgICAgIHZhciBkb3QgPSBkb3RJZHggPiAwID8gZG90SWR4IDogc2VsLmxlbmd0aDtcbiAgICAgIHZhciB0YWcgPSBoYXNoSWR4ICE9PSAtMSB8fCBkb3RJZHggIT09IC0xID8gc2VsLnNsaWNlKDAsIE1hdGgubWluKGhhc2gsIGRvdCkpIDogc2VsO1xuICAgICAgZWxtID0gdm5vZGUuZWxtID0gaXNEZWYoZGF0YSkgJiYgaXNEZWYoaSA9IGRhdGEubnMpID8gYXBpLmNyZWF0ZUVsZW1lbnROUyhpLCB0YWcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBhcGkuY3JlYXRlRWxlbWVudCh0YWcpO1xuICAgICAgaWYgKGhhc2ggPCBkb3QpIGVsbS5pZCA9IHNlbC5zbGljZShoYXNoICsgMSwgZG90KTtcbiAgICAgIGlmIChkb3RJZHggPiAwKSBlbG0uY2xhc3NOYW1lID0gc2VsLnNsaWNlKGRvdCArIDEpLnJlcGxhY2UoL1xcLi9nLCAnICcpO1xuICAgICAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBjcmVhdGVFbG0oY2hpbGRyZW5baV0sIGluc2VydGVkVm5vZGVRdWV1ZSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzLnByaW1pdGl2ZSh2bm9kZS50ZXh0KSkge1xuICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCkpO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5jcmVhdGUubGVuZ3RoOyArK2kpIGNicy5jcmVhdGVbaV0oZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICBpID0gdm5vZGUuZGF0YS5ob29rOyAvLyBSZXVzZSB2YXJpYWJsZVxuICAgICAgaWYgKGlzRGVmKGkpKSB7XG4gICAgICAgIGlmIChpLmNyZWF0ZSkgaS5jcmVhdGUoZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICAgIGlmIChpLmluc2VydCkgaW5zZXJ0ZWRWbm9kZVF1ZXVlLnB1c2godm5vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlbG0gPSB2bm9kZS5lbG0gPSBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCk7XG4gICAgfVxuICAgIHJldHVybiB2bm9kZS5lbG07XG4gIH1cblxuICBmdW5jdGlvbiBhZGRWbm9kZXMocGFyZW50RWxtLCBiZWZvcmUsIHZub2Rlcywgc3RhcnRJZHgsIGVuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbSh2bm9kZXNbc3RhcnRJZHhdLCBpbnNlcnRlZFZub2RlUXVldWUpLCBiZWZvcmUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGludm9rZURlc3Ryb3lIb29rKHZub2RlKSB7XG4gICAgdmFyIGksIGosIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgIGlmIChpc0RlZihkYXRhKSkge1xuICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLmhvb2spICYmIGlzRGVmKGkgPSBpLmRlc3Ryb3kpKSBpKHZub2RlKTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMuZGVzdHJveS5sZW5ndGg7ICsraSkgY2JzLmRlc3Ryb3lbaV0odm5vZGUpO1xuICAgICAgaWYgKGlzRGVmKGkgPSB2bm9kZS5jaGlsZHJlbikpIHtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IHZub2RlLmNoaWxkcmVuLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgaW52b2tlRGVzdHJveUhvb2sodm5vZGUuY2hpbGRyZW5bal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgdm5vZGVzLCBzdGFydElkeCwgZW5kSWR4KSB7XG4gICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgdmFyIGksIGxpc3RlbmVycywgcm0sIGNoID0gdm5vZGVzW3N0YXJ0SWR4XTtcbiAgICAgIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKGlzRGVmKGNoLnNlbCkpIHtcbiAgICAgICAgICBpbnZva2VEZXN0cm95SG9vayhjaCk7XG4gICAgICAgICAgbGlzdGVuZXJzID0gY2JzLnJlbW92ZS5sZW5ndGggKyAxO1xuICAgICAgICAgIHJtID0gY3JlYXRlUm1DYihjaC5lbG0sIGxpc3RlbmVycyk7XG4gICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5yZW1vdmUubGVuZ3RoOyArK2kpIGNicy5yZW1vdmVbaV0oY2gsIHJtKTtcbiAgICAgICAgICBpZiAoaXNEZWYoaSA9IGNoLmRhdGEpICYmIGlzRGVmKGkgPSBpLmhvb2spICYmIGlzRGVmKGkgPSBpLnJlbW92ZSkpIHtcbiAgICAgICAgICAgIGkoY2gsIHJtKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm0oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIFRleHQgbm9kZVxuICAgICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnRFbG0sIGNoLmVsbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVDaGlsZHJlbihwYXJlbnRFbG0sIG9sZENoLCBuZXdDaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIG9sZFN0YXJ0SWR4ID0gMCwgbmV3U3RhcnRJZHggPSAwO1xuICAgIHZhciBvbGRFbmRJZHggPSBvbGRDaC5sZW5ndGggLSAxO1xuICAgIHZhciBvbGRTdGFydFZub2RlID0gb2xkQ2hbMF07XG4gICAgdmFyIG9sZEVuZFZub2RlID0gb2xkQ2hbb2xkRW5kSWR4XTtcbiAgICB2YXIgbmV3RW5kSWR4ID0gbmV3Q2gubGVuZ3RoIC0gMTtcbiAgICB2YXIgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWzBdO1xuICAgIHZhciBuZXdFbmRWbm9kZSA9IG5ld0NoW25ld0VuZElkeF07XG4gICAgdmFyIG9sZEtleVRvSWR4LCBpZHhJbk9sZCwgZWxtVG9Nb3ZlLCBiZWZvcmU7XG5cbiAgICB3aGlsZSAob2xkU3RhcnRJZHggPD0gb2xkRW5kSWR4ICYmIG5ld1N0YXJ0SWR4IDw9IG5ld0VuZElkeCkge1xuICAgICAgaWYgKGlzVW5kZWYob2xkU3RhcnRWbm9kZSkpIHtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdOyAvLyBWbm9kZSBoYXMgYmVlbiBtb3ZlZCBsZWZ0XG4gICAgICB9IGVsc2UgaWYgKGlzVW5kZWYob2xkRW5kVm5vZGUpKSB7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgfSBlbHNlIGlmIChzYW1lVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3U3RhcnRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRTdGFydFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBvbGRTdGFydFZub2RlID0gb2xkQ2hbKytvbGRTdGFydElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdFbmRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRFbmRWbm9kZSwgbmV3RW5kVm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCByaWdodFxuICAgICAgICBwYXRjaFZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgb2xkU3RhcnRWbm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhvbGRFbmRWbm9kZS5lbG0pKTtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCBsZWZ0XG4gICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBvbGRFbmRWbm9kZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgb2xkRW5kVm5vZGUgPSBvbGRDaFstLW9sZEVuZElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc1VuZGVmKG9sZEtleVRvSWR4KSkgb2xkS2V5VG9JZHggPSBjcmVhdGVLZXlUb09sZElkeChvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgICAgIGlkeEluT2xkID0gb2xkS2V5VG9JZHhbbmV3U3RhcnRWbm9kZS5rZXldO1xuICAgICAgICBpZiAoaXNVbmRlZihpZHhJbk9sZCkpIHsgLy8gTmV3IGVsZW1lbnRcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgY3JlYXRlRWxtKG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSksIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWxtVG9Nb3ZlID0gb2xkQ2hbaWR4SW5PbGRdO1xuICAgICAgICAgIHBhdGNoVm5vZGUoZWxtVG9Nb3ZlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgIG9sZENoW2lkeEluT2xkXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgZWxtVG9Nb3ZlLmVsbSwgb2xkU3RhcnRWbm9kZS5lbG0pO1xuICAgICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAob2xkU3RhcnRJZHggPiBvbGRFbmRJZHgpIHtcbiAgICAgIGJlZm9yZSA9IGlzVW5kZWYobmV3Q2hbbmV3RW5kSWR4KzFdKSA/IG51bGwgOiBuZXdDaFtuZXdFbmRJZHgrMV0uZWxtO1xuICAgICAgYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCBuZXdDaCwgbmV3U3RhcnRJZHgsIG5ld0VuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICB9IGVsc2UgaWYgKG5ld1N0YXJ0SWR4ID4gbmV3RW5kSWR4KSB7XG4gICAgICByZW1vdmVWbm9kZXMocGFyZW50RWxtLCBvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIHZhciBpLCBob29rO1xuICAgIGlmIChpc0RlZihpID0gdm5vZGUuZGF0YSkgJiYgaXNEZWYoaG9vayA9IGkuaG9vaykgJiYgaXNEZWYoaSA9IGhvb2sucHJlcGF0Y2gpKSB7XG4gICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICAgIHZhciBlbG0gPSB2bm9kZS5lbG0gPSBvbGRWbm9kZS5lbG0sIG9sZENoID0gb2xkVm5vZGUuY2hpbGRyZW4sIGNoID0gdm5vZGUuY2hpbGRyZW47XG4gICAgaWYgKG9sZFZub2RlID09PSB2bm9kZSkgcmV0dXJuO1xuICAgIGlmICghc2FtZVZub2RlKG9sZFZub2RlLCB2bm9kZSkpIHtcbiAgICAgIHZhciBwYXJlbnRFbG0gPSBhcGkucGFyZW50Tm9kZShvbGRWbm9kZS5lbG0pO1xuICAgICAgZWxtID0gY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGVsbSwgb2xkVm5vZGUuZWxtKTtcbiAgICAgIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIFtvbGRWbm9kZV0sIDAsIDApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaXNEZWYodm5vZGUuZGF0YSkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMudXBkYXRlLmxlbmd0aDsgKytpKSBjYnMudXBkYXRlW2ldKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgICBpID0gdm5vZGUuZGF0YS5ob29rO1xuICAgICAgaWYgKGlzRGVmKGkpICYmIGlzRGVmKGkgPSBpLnVwZGF0ZSkpIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICB9XG4gICAgaWYgKGlzVW5kZWYodm5vZGUudGV4dCkpIHtcbiAgICAgIGlmIChpc0RlZihvbGRDaCkgJiYgaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChvbGRDaCAhPT0gY2gpIHVwZGF0ZUNoaWxkcmVuKGVsbSwgb2xkQ2gsIGNoLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKGlzRGVmKG9sZFZub2RlLnRleHQpKSBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCAnJyk7XG4gICAgICAgIGFkZFZub2RlcyhlbG0sIG51bGwsIGNoLCAwLCBjaC5sZW5ndGggLSAxLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihvbGRDaCkpIHtcbiAgICAgICAgcmVtb3ZlVm5vZGVzKGVsbSwgb2xkQ2gsIDAsIG9sZENoLmxlbmd0aCAtIDEpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihvbGRWbm9kZS50ZXh0KSkge1xuICAgICAgICBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCAnJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvbGRWbm9kZS50ZXh0ICE9PSB2bm9kZS50ZXh0KSB7XG4gICAgICBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCB2bm9kZS50ZXh0KTtcbiAgICB9XG4gICAgaWYgKGlzRGVmKGhvb2spICYmIGlzRGVmKGkgPSBob29rLnBvc3RwYXRjaCkpIHtcbiAgICAgIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24ob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGksIGVsbSwgcGFyZW50O1xuICAgIHZhciBpbnNlcnRlZFZub2RlUXVldWUgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnByZS5sZW5ndGg7ICsraSkgY2JzLnByZVtpXSgpO1xuXG4gICAgaWYgKGlzVW5kZWYob2xkVm5vZGUuc2VsKSkge1xuICAgICAgb2xkVm5vZGUgPSBlbXB0eU5vZGVBdChvbGRWbm9kZSk7XG4gICAgfVxuXG4gICAgaWYgKHNhbWVWbm9kZShvbGRWbm9kZSwgdm5vZGUpKSB7XG4gICAgICBwYXRjaFZub2RlKG9sZFZub2RlLCB2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxtID0gb2xkVm5vZGUuZWxtO1xuICAgICAgcGFyZW50ID0gYXBpLnBhcmVudE5vZGUoZWxtKTtcblxuICAgICAgY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuXG4gICAgICBpZiAocGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50LCB2bm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhlbG0pKTtcbiAgICAgICAgcmVtb3ZlVm5vZGVzKHBhcmVudCwgW29sZFZub2RlXSwgMCwgMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGluc2VydGVkVm5vZGVRdWV1ZS5sZW5ndGg7ICsraSkge1xuICAgICAgaW5zZXJ0ZWRWbm9kZVF1ZXVlW2ldLmRhdGEuaG9vay5pbnNlcnQoaW5zZXJ0ZWRWbm9kZVF1ZXVlW2ldKTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGNicy5wb3N0Lmxlbmd0aDsgKytpKSBjYnMucG9zdFtpXSgpO1xuICAgIHJldHVybiB2bm9kZTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7aW5pdDogaW5pdH07XG4iLCJ2YXIgVk5vZGUgPSByZXF1aXJlKCcuL3Zub2RlJyk7XG52YXIgaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbmZ1bmN0aW9uIGFkZE5TKGRhdGEsIGNoaWxkcmVuLCBzZWwpIHtcbiAgZGF0YS5ucyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc7XG5cbiAgaWYgKHNlbCAhPT0gJ2ZvcmVpZ25PYmplY3QnICYmIGNoaWxkcmVuICE9PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICBhZGROUyhjaGlsZHJlbltpXS5kYXRhLCBjaGlsZHJlbltpXS5jaGlsZHJlbiwgY2hpbGRyZW5baV0uc2VsKTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBoKHNlbCwgYiwgYykge1xuICB2YXIgZGF0YSA9IHt9LCBjaGlsZHJlbiwgdGV4dCwgaTtcbiAgaWYgKGMgIT09IHVuZGVmaW5lZCkge1xuICAgIGRhdGEgPSBiO1xuICAgIGlmIChpcy5hcnJheShjKSkgeyBjaGlsZHJlbiA9IGM7IH1cbiAgICBlbHNlIGlmIChpcy5wcmltaXRpdmUoYykpIHsgdGV4dCA9IGM7IH1cbiAgfSBlbHNlIGlmIChiICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoaXMuYXJyYXkoYikpIHsgY2hpbGRyZW4gPSBiOyB9XG4gICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGIpKSB7IHRleHQgPSBiOyB9XG4gICAgZWxzZSB7IGRhdGEgPSBiOyB9XG4gIH1cbiAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgaWYgKGlzLnByaW1pdGl2ZShjaGlsZHJlbltpXSkpIGNoaWxkcmVuW2ldID0gVk5vZGUodW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgY2hpbGRyZW5baV0pO1xuICAgIH1cbiAgfVxuICBpZiAoc2VsWzBdID09PSAncycgJiYgc2VsWzFdID09PSAndicgJiYgc2VsWzJdID09PSAnZycpIHtcbiAgICBhZGROUyhkYXRhLCBjaGlsZHJlbiwgc2VsKTtcbiAgfVxuICByZXR1cm4gVk5vZGUoc2VsLCBkYXRhLCBjaGlsZHJlbiwgdGV4dCwgdW5kZWZpbmVkKTtcbn07XG4iLCJmdW5jdGlvbiB1cGRhdGVDbGFzcyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGN1ciwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkQ2xhc3MgPSBvbGRWbm9kZS5kYXRhLmNsYXNzLFxuICAgICAga2xhc3MgPSB2bm9kZS5kYXRhLmNsYXNzO1xuXG4gIGlmICghb2xkQ2xhc3MgJiYgIWtsYXNzKSByZXR1cm47XG4gIG9sZENsYXNzID0gb2xkQ2xhc3MgfHwge307XG4gIGtsYXNzID0ga2xhc3MgfHwge307XG5cbiAgZm9yIChuYW1lIGluIG9sZENsYXNzKSB7XG4gICAgaWYgKCFrbGFzc1tuYW1lXSkge1xuICAgICAgZWxtLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgfVxuICB9XG4gIGZvciAobmFtZSBpbiBrbGFzcykge1xuICAgIGN1ciA9IGtsYXNzW25hbWVdO1xuICAgIGlmIChjdXIgIT09IG9sZENsYXNzW25hbWVdKSB7XG4gICAgICBlbG0uY2xhc3NMaXN0W2N1ciA/ICdhZGQnIDogJ3JlbW92ZSddKG5hbWUpO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZUNsYXNzLCB1cGRhdGU6IHVwZGF0ZUNsYXNzfTtcbiIsImZ1bmN0aW9uIHVwZGF0ZVByb3BzKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIga2V5LCBjdXIsIG9sZCwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkUHJvcHMgPSBvbGRWbm9kZS5kYXRhLnByb3BzLCBwcm9wcyA9IHZub2RlLmRhdGEucHJvcHM7XG5cbiAgaWYgKCFvbGRQcm9wcyAmJiAhcHJvcHMpIHJldHVybjtcbiAgb2xkUHJvcHMgPSBvbGRQcm9wcyB8fCB7fTtcbiAgcHJvcHMgPSBwcm9wcyB8fCB7fTtcblxuICBmb3IgKGtleSBpbiBvbGRQcm9wcykge1xuICAgIGlmICghcHJvcHNba2V5XSkge1xuICAgICAgZGVsZXRlIGVsbVtrZXldO1xuICAgIH1cbiAgfVxuICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgIGN1ciA9IHByb3BzW2tleV07XG4gICAgb2xkID0gb2xkUHJvcHNba2V5XTtcbiAgICBpZiAob2xkICE9PSBjdXIgJiYgKGtleSAhPT0gJ3ZhbHVlJyB8fCBlbG1ba2V5XSAhPT0gY3VyKSkge1xuICAgICAgZWxtW2tleV0gPSBjdXI7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NyZWF0ZTogdXBkYXRlUHJvcHMsIHVwZGF0ZTogdXBkYXRlUHJvcHN9O1xuIiwidmFyIHJhZiA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB8fCBzZXRUaW1lb3V0O1xudmFyIG5leHRGcmFtZSA9IGZ1bmN0aW9uKGZuKSB7IHJhZihmdW5jdGlvbigpIHsgcmFmKGZuKTsgfSk7IH07XG5cbmZ1bmN0aW9uIHNldE5leHRGcmFtZShvYmosIHByb3AsIHZhbCkge1xuICBuZXh0RnJhbWUoZnVuY3Rpb24oKSB7IG9ialtwcm9wXSA9IHZhbDsgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVN0eWxlKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgY3VyLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sXG4gICAgICBvbGRTdHlsZSA9IG9sZFZub2RlLmRhdGEuc3R5bGUsXG4gICAgICBzdHlsZSA9IHZub2RlLmRhdGEuc3R5bGU7XG5cbiAgaWYgKCFvbGRTdHlsZSAmJiAhc3R5bGUpIHJldHVybjtcbiAgb2xkU3R5bGUgPSBvbGRTdHlsZSB8fCB7fTtcbiAgc3R5bGUgPSBzdHlsZSB8fCB7fTtcbiAgdmFyIG9sZEhhc0RlbCA9ICdkZWxheWVkJyBpbiBvbGRTdHlsZTtcblxuICBmb3IgKG5hbWUgaW4gb2xkU3R5bGUpIHtcbiAgICBpZiAoIXN0eWxlW25hbWVdKSB7XG4gICAgICBlbG0uc3R5bGVbbmFtZV0gPSAnJztcbiAgICB9XG4gIH1cbiAgZm9yIChuYW1lIGluIHN0eWxlKSB7XG4gICAgY3VyID0gc3R5bGVbbmFtZV07XG4gICAgaWYgKG5hbWUgPT09ICdkZWxheWVkJykge1xuICAgICAgZm9yIChuYW1lIGluIHN0eWxlLmRlbGF5ZWQpIHtcbiAgICAgICAgY3VyID0gc3R5bGUuZGVsYXllZFtuYW1lXTtcbiAgICAgICAgaWYgKCFvbGRIYXNEZWwgfHwgY3VyICE9PSBvbGRTdHlsZS5kZWxheWVkW25hbWVdKSB7XG4gICAgICAgICAgc2V0TmV4dEZyYW1lKGVsbS5zdHlsZSwgbmFtZSwgY3VyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobmFtZSAhPT0gJ3JlbW92ZScgJiYgY3VyICE9PSBvbGRTdHlsZVtuYW1lXSkge1xuICAgICAgZWxtLnN0eWxlW25hbWVdID0gY3VyO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBseURlc3Ryb3lTdHlsZSh2bm9kZSkge1xuICB2YXIgc3R5bGUsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSwgcyA9IHZub2RlLmRhdGEuc3R5bGU7XG4gIGlmICghcyB8fCAhKHN0eWxlID0gcy5kZXN0cm95KSkgcmV0dXJuO1xuICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICBlbG0uc3R5bGVbbmFtZV0gPSBzdHlsZVtuYW1lXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBseVJlbW92ZVN0eWxlKHZub2RlLCBybSkge1xuICB2YXIgcyA9IHZub2RlLmRhdGEuc3R5bGU7XG4gIGlmICghcyB8fCAhcy5yZW1vdmUpIHtcbiAgICBybSgpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbmFtZSwgZWxtID0gdm5vZGUuZWxtLCBpZHgsIGkgPSAwLCBtYXhEdXIgPSAwLFxuICAgICAgY29tcFN0eWxlLCBzdHlsZSA9IHMucmVtb3ZlLCBhbW91bnQgPSAwLCBhcHBsaWVkID0gW107XG4gIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgIGFwcGxpZWQucHVzaChuYW1lKTtcbiAgICBlbG0uc3R5bGVbbmFtZV0gPSBzdHlsZVtuYW1lXTtcbiAgfVxuICBjb21wU3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsbSk7XG4gIHZhciBwcm9wcyA9IGNvbXBTdHlsZVsndHJhbnNpdGlvbi1wcm9wZXJ0eSddLnNwbGl0KCcsICcpO1xuICBmb3IgKDsgaSA8IHByb3BzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYoYXBwbGllZC5pbmRleE9mKHByb3BzW2ldKSAhPT0gLTEpIGFtb3VudCsrO1xuICB9XG4gIGVsbS5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgZnVuY3Rpb24oZXYpIHtcbiAgICBpZiAoZXYudGFyZ2V0ID09PSBlbG0pIC0tYW1vdW50O1xuICAgIGlmIChhbW91bnQgPT09IDApIHJtKCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZVN0eWxlLCB1cGRhdGU6IHVwZGF0ZVN0eWxlLCBkZXN0cm95OiBhcHBseURlc3Ryb3lTdHlsZSwgcmVtb3ZlOiBhcHBseVJlbW92ZVN0eWxlfTtcbiIsImZ1bmN0aW9uIGludm9rZUhhbmRsZXIoaGFuZGxlciwgdm5vZGUsIGV2ZW50KSB7XG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgLy8gY2FsbCBmdW5jdGlvbiBoYW5kbGVyXG4gICAgaGFuZGxlci5jYWxsKHZub2RlLCBldmVudCwgdm5vZGUpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcIm9iamVjdFwiKSB7XG4gICAgLy8gY2FsbCBoYW5kbGVyIHdpdGggYXJndW1lbnRzXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyWzBdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIHNwZWNpYWwgY2FzZSBmb3Igc2luZ2xlIGFyZ3VtZW50IGZvciBwZXJmb3JtYW5jZVxuICAgICAgaWYgKGhhbmRsZXIubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGhhbmRsZXJbMF0uY2FsbCh2bm9kZSwgaGFuZGxlclsxXSwgZXZlbnQsIHZub2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gaGFuZGxlci5zbGljZSgxKTtcbiAgICAgICAgYXJncy5wdXNoKGV2ZW50KTtcbiAgICAgICAgYXJncy5wdXNoKHZub2RlKTtcbiAgICAgICAgaGFuZGxlclswXS5hcHBseSh2bm9kZSwgYXJncyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNhbGwgbXVsdGlwbGUgaGFuZGxlcnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGFuZGxlci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbnZva2VIYW5kbGVyKGhhbmRsZXJbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCwgdm5vZGUpIHtcbiAgdmFyIG5hbWUgPSBldmVudC50eXBlLFxuICAgICAgb24gPSB2bm9kZS5kYXRhLm9uO1xuXG4gIC8vIGNhbGwgZXZlbnQgaGFuZGxlcihzKSBpZiBleGlzdHNcbiAgaWYgKG9uICYmIG9uW25hbWVdKSB7XG4gICAgaW52b2tlSGFuZGxlcihvbltuYW1lXSwgdm5vZGUsIGV2ZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVMaXN0ZW5lcigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQpIHtcbiAgICBoYW5kbGVFdmVudChldmVudCwgaGFuZGxlci52bm9kZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlRXZlbnRMaXN0ZW5lcnMob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBvbGRPbiA9IG9sZFZub2RlLmRhdGEub24sXG4gICAgICBvbGRMaXN0ZW5lciA9IG9sZFZub2RlLmxpc3RlbmVyLFxuICAgICAgb2xkRWxtID0gb2xkVm5vZGUuZWxtLFxuICAgICAgb24gPSB2bm9kZSAmJiB2bm9kZS5kYXRhLm9uLFxuICAgICAgZWxtID0gdm5vZGUgJiYgdm5vZGUuZWxtLFxuICAgICAgbmFtZTtcblxuICAvLyBvcHRpbWl6YXRpb24gZm9yIHJldXNlZCBpbW11dGFibGUgaGFuZGxlcnNcbiAgaWYgKG9sZE9uID09PSBvbikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHJlbW92ZSBleGlzdGluZyBsaXN0ZW5lcnMgd2hpY2ggbm8gbG9uZ2VyIHVzZWRcbiAgaWYgKG9sZE9uICYmIG9sZExpc3RlbmVyKSB7XG4gICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGRlbGV0ZWQgd2UgcmVtb3ZlIGFsbCBleGlzdGluZyBsaXN0ZW5lcnMgdW5jb25kaXRpb25hbGx5XG4gICAgaWYgKCFvbikge1xuICAgICAgZm9yIChuYW1lIGluIG9sZE9uKSB7XG4gICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lciBpZiBlbGVtZW50IHdhcyBjaGFuZ2VkIG9yIGV4aXN0aW5nIGxpc3RlbmVycyByZW1vdmVkXG4gICAgICAgIG9sZEVsbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9sZExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXIgaWYgZXhpc3RpbmcgbGlzdGVuZXIgcmVtb3ZlZFxuICAgICAgICBpZiAoIW9uW25hbWVdKSB7XG4gICAgICAgICAgb2xkRWxtLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb2xkTGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGFkZCBuZXcgbGlzdGVuZXJzIHdoaWNoIGhhcyBub3QgYWxyZWFkeSBhdHRhY2hlZFxuICBpZiAob24pIHtcbiAgICAvLyByZXVzZSBleGlzdGluZyBsaXN0ZW5lciBvciBjcmVhdGUgbmV3XG4gICAgdmFyIGxpc3RlbmVyID0gdm5vZGUubGlzdGVuZXIgPSBvbGRWbm9kZS5saXN0ZW5lciB8fCBjcmVhdGVMaXN0ZW5lcigpO1xuICAgIC8vIHVwZGF0ZSB2bm9kZSBmb3IgbGlzdGVuZXJcbiAgICBsaXN0ZW5lci52bm9kZSA9IHZub2RlO1xuXG4gICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGFkZGVkIHdlIGFkZCBhbGwgbmVlZGVkIGxpc3RlbmVycyB1bmNvbmRpdGlvbmFsbHlcbiAgICBpZiAoIW9sZE9uKSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb24pIHtcbiAgICAgICAgLy8gYWRkIGxpc3RlbmVyIGlmIGVsZW1lbnQgd2FzIGNoYW5nZWQgb3IgbmV3IGxpc3RlbmVycyBhZGRlZFxuICAgICAgICBlbG0uYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb24pIHtcbiAgICAgICAgLy8gYWRkIGxpc3RlbmVyIGlmIG5ldyBsaXN0ZW5lciBhZGRlZFxuICAgICAgICBpZiAoIW9sZE9uW25hbWVdKSB7XG4gICAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlOiB1cGRhdGVFdmVudExpc3RlbmVycyxcbiAgdXBkYXRlOiB1cGRhdGVFdmVudExpc3RlbmVycyxcbiAgZGVzdHJveTogdXBkYXRlRXZlbnRMaXN0ZW5lcnNcbn07XG4iLCIvKiEgS2VmaXIuanMgdjMuNi4wXG4gKiAgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyXG4gKi9cblxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuXHQoZmFjdG9yeSgoZ2xvYmFsLktlZmlyID0gZ2xvYmFsLktlZmlyIHx8IHt9KSkpO1xufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cblx0ZnVuY3Rpb24gY3JlYXRlT2JqKHByb3RvKSB7XG5cdCAgdmFyIEYgPSBmdW5jdGlvbiAoKSB7fTtcblx0ICBGLnByb3RvdHlwZSA9IHByb3RvO1xuXHQgIHJldHVybiBuZXcgRigpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZXh0ZW5kKHRhcmdldCAvKiwgbWl4aW4xLCBtaXhpbjIuLi4qLykge1xuXHQgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBwcm9wID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZm9yIChwcm9wIGluIGFyZ3VtZW50c1tpXSkge1xuXHQgICAgICB0YXJnZXRbcHJvcF0gPSBhcmd1bWVudHNbaV1bcHJvcF07XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiB0YXJnZXQ7XG5cdH1cblxuXHRmdW5jdGlvbiBpbmhlcml0KENoaWxkLCBQYXJlbnQgLyosIG1peGluMSwgbWl4aW4yLi4uKi8pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBDaGlsZC5wcm90b3R5cGUgPSBjcmVhdGVPYmooUGFyZW50LnByb3RvdHlwZSk7XG5cdCAgQ2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2hpbGQ7XG5cdCAgZm9yIChpID0gMjsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBleHRlbmQoQ2hpbGQucHJvdG90eXBlLCBhcmd1bWVudHNbaV0pO1xuXHQgIH1cblx0ICByZXR1cm4gQ2hpbGQ7XG5cdH1cblxuXHR2YXIgTk9USElORyA9IFsnPG5vdGhpbmc+J107XG5cdHZhciBFTkQgPSAnZW5kJztcblx0dmFyIFZBTFVFID0gJ3ZhbHVlJztcblx0dmFyIEVSUk9SID0gJ2Vycm9yJztcblx0dmFyIEFOWSA9ICdhbnknO1xuXG5cdGZ1bmN0aW9uIGNvbmNhdChhLCBiKSB7XG5cdCAgdmFyIHJlc3VsdCA9IHZvaWQgMCxcblx0ICAgICAgbGVuZ3RoID0gdm9pZCAwLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBqID0gdm9pZCAwO1xuXHQgIGlmIChhLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGI7XG5cdCAgfVxuXHQgIGlmIChiLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGE7XG5cdCAgfVxuXHQgIGogPSAwO1xuXHQgIHJlc3VsdCA9IG5ldyBBcnJheShhLmxlbmd0aCArIGIubGVuZ3RoKTtcblx0ICBsZW5ndGggPSBhLmxlbmd0aDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGorKykge1xuXHQgICAgcmVzdWx0W2pdID0gYVtpXTtcblx0ICB9XG5cdCAgbGVuZ3RoID0gYi5sZW5ndGg7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBqKyspIHtcblx0ICAgIHJlc3VsdFtqXSA9IGJbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kKGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChhcnJbaV0gPT09IHZhbHVlKSB7XG5cdCAgICAgIHJldHVybiBpO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kQnlQcmVkKGFyciwgcHJlZCkge1xuXHQgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHByZWQoYXJyW2ldKSkge1xuXHQgICAgICByZXR1cm4gaTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2xvbmVBcnJheShpbnB1dCkge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2ldID0gaW5wdXRbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmUoaW5wdXQsIGluZGV4KSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gdm9pZCAwLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBqID0gdm9pZCAwO1xuXHQgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgbGVuZ3RoKSB7XG5cdCAgICBpZiAobGVuZ3RoID09PSAxKSB7XG5cdCAgICAgIHJldHVybiBbXTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGggLSAxKTtcblx0ICAgICAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICAgIGlmIChpICE9PSBpbmRleCkge1xuXHQgICAgICAgICAgcmVzdWx0W2pdID0gaW5wdXRbaV07XG5cdCAgICAgICAgICBqKys7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHJldHVybiByZXN1bHQ7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHJldHVybiBpbnB1dDtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBtYXAoaW5wdXQsIGZuKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCksXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaV0gPSBmbihpbnB1dFtpXSk7XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmb3JFYWNoKGFyciwgZm4pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGZuKGFycltpXSk7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gZmlsbEFycmF5KGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGFycltpXSA9IHZhbHVlO1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnRhaW5zKGFyciwgdmFsdWUpIHtcblx0ICByZXR1cm4gZmluZChhcnIsIHZhbHVlKSAhPT0gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBzbGlkZShjdXIsIG5leHQsIG1heCkge1xuXHQgIHZhciBsZW5ndGggPSBNYXRoLm1pbihtYXgsIGN1ci5sZW5ndGggKyAxKSxcblx0ICAgICAgb2Zmc2V0ID0gY3VyLmxlbmd0aCAtIGxlbmd0aCArIDEsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IG9mZnNldDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaSAtIG9mZnNldF0gPSBjdXJbaV07XG5cdCAgfVxuXHQgIHJlc3VsdFtsZW5ndGggLSAxXSA9IG5leHQ7XG5cdCAgcmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCBldmVudCkge1xuXHQgIGlmICh0eXBlID09PSBBTlkpIHtcblx0ICAgIGZuKGV2ZW50KTtcblx0ICB9IGVsc2UgaWYgKHR5cGUgPT09IGV2ZW50LnR5cGUpIHtcblx0ICAgIGlmICh0eXBlID09PSBWQUxVRSB8fCB0eXBlID09PSBFUlJPUikge1xuXHQgICAgICBmbihldmVudC52YWx1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBmbigpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XG5cdCAgdGhpcy5faXRlbXMgPSBbXTtcblx0ICB0aGlzLl9zcGllcyA9IFtdO1xuXHQgIHRoaXMuX2luTG9vcCA9IDA7XG5cdCAgdGhpcy5fcmVtb3ZlZEl0ZW1zID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChEaXNwYXRjaGVyLnByb3RvdHlwZSwge1xuXHQgIGFkZDogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IGNvbmNhdCh0aGlzLl9pdGVtcywgW3sgdHlwZTogdHlwZSwgZm46IGZuIH1dKTtcblx0ICAgIHJldHVybiB0aGlzLl9pdGVtcy5sZW5ndGg7XG5cdCAgfSxcblx0ICByZW1vdmU6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgdmFyIGluZGV4ID0gZmluZEJ5UHJlZCh0aGlzLl9pdGVtcywgZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgcmV0dXJuIHgudHlwZSA9PT0gdHlwZSAmJiB4LmZuID09PSBmbjtcblx0ICAgIH0pO1xuXG5cdCAgICAvLyBpZiB3ZSdyZSBjdXJyZW50bHkgaW4gYSBub3RpZmljYXRpb24gbG9vcCxcblx0ICAgIC8vIHJlbWVtYmVyIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgaWYgKHRoaXMuX2luTG9vcCAhPT0gMCAmJiBpbmRleCAhPT0gLTEpIHtcblx0ICAgICAgaWYgKHRoaXMuX3JlbW92ZWRJdGVtcyA9PT0gbnVsbCkge1xuXHQgICAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcy5wdXNoKHRoaXMuX2l0ZW1zW2luZGV4XSk7XG5cdCAgICB9XG5cblx0ICAgIHRoaXMuX2l0ZW1zID0gcmVtb3ZlKHRoaXMuX2l0ZW1zLCBpbmRleCk7XG5cdCAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgYWRkU3B5OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHRoaXMuX3NwaWVzID0gY29uY2F0KHRoaXMuX3NwaWVzLCBbZm5dKTtcblx0ICAgIHJldHVybiB0aGlzLl9zcGllcy5sZW5ndGg7XG5cdCAgfSxcblxuXG5cdCAgLy8gQmVjYXVzZSBzcGllcyBhcmUgb25seSBldmVyIGEgZnVuY3Rpb24gdGhhdCBwZXJmb3JtIGxvZ2dpbmcgYXNcblx0ICAvLyB0aGVpciBvbmx5IHNpZGUgZWZmZWN0LCB3ZSBkb24ndCBuZWVkIHRoZSBzYW1lIGNvbXBsaWNhdGVkXG5cdCAgLy8gcmVtb3ZhbCBsb2dpYyBsaWtlIGluIHJlbW92ZSgpXG5cdCAgcmVtb3ZlU3B5OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHRoaXMuX3NwaWVzID0gcmVtb3ZlKHRoaXMuX3NwaWVzLCB0aGlzLl9zcGllcy5pbmRleE9mKGZuKSk7XG5cdCAgICByZXR1cm4gdGhpcy5fc3BpZXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgZGlzcGF0Y2g6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgdGhpcy5faW5Mb29wKys7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc3BpZXMgPSB0aGlzLl9zcGllczsgdGhpcy5fc3BpZXMgIT09IG51bGwgJiYgaSA8IHNwaWVzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHNwaWVzW2ldKGV2ZW50KTtcblx0ICAgIH1cblxuXHQgICAgZm9yICh2YXIgX2kgPSAwLCBpdGVtcyA9IHRoaXMuX2l0ZW1zOyBfaSA8IGl0ZW1zLmxlbmd0aDsgX2krKykge1xuXG5cdCAgICAgIC8vIGNsZWFudXAgd2FzIGNhbGxlZFxuXHQgICAgICBpZiAodGhpcy5faXRlbXMgPT09IG51bGwpIHtcblx0ICAgICAgICBicmVhaztcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgICBpZiAodGhpcy5fcmVtb3ZlZEl0ZW1zICE9PSBudWxsICYmIGNvbnRhaW5zKHRoaXMuX3JlbW92ZWRJdGVtcywgaXRlbXNbX2ldKSkge1xuXHQgICAgICAgIGNvbnRpbnVlO1xuXHQgICAgICB9XG5cblx0ICAgICAgY2FsbFN1YnNjcmliZXIoaXRlbXNbX2ldLnR5cGUsIGl0ZW1zW19pXS5mbiwgZXZlbnQpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5faW5Mb29wLS07XG5cdCAgICBpZiAodGhpcy5faW5Mb29wID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBjbGVhbnVwOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IG51bGw7XG5cdCAgICB0aGlzLl9zcGllcyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBPYnNlcnZhYmxlKCkge1xuXHQgIHRoaXMuX2Rpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpO1xuXHQgIHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuXHQgIHRoaXMuX2FsaXZlID0gdHJ1ZTtcblx0ICB0aGlzLl9hY3RpdmF0aW5nID0gZmFsc2U7XG5cdCAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHQgIHRoaXMuX3NweUhhbmRsZXJzID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXG5cdCAgX25hbWU6ICdvYnNlcnZhYmxlJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge30sXG5cdCAgX3NldEFjdGl2ZTogZnVuY3Rpb24gKGFjdGl2ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSAhPT0gYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX2FjdGl2ZSA9IGFjdGl2ZTtcblx0ICAgICAgaWYgKGFjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSB0cnVlO1xuXHQgICAgICAgIHRoaXMuX29uQWN0aXZhdGlvbigpO1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSBmYWxzZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9vbkRlYWN0aXZhdGlvbigpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3NldEFjdGl2ZShmYWxzZSk7XG5cdCAgICB0aGlzLl9kaXNwYXRjaGVyLmNsZWFudXAoKTtcblx0ICAgIHRoaXMuX2Rpc3BhdGNoZXIgPSBudWxsO1xuXHQgICAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2VtaXQ6IGZ1bmN0aW9uICh0eXBlLCB4KSB7XG5cdCAgICBzd2l0Y2ggKHR5cGUpIHtcblx0ICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdFZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RXJyb3I6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9hbGl2ZSA9IGZhbHNlO1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRU5EIH0pO1xuXHQgICAgICB0aGlzLl9jbGVhcigpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uOiBmdW5jdGlvbiAodHlwZSwgZm4pIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmFkZCh0eXBlLCBmbik7XG5cdCAgICAgIHRoaXMuX3NldEFjdGl2ZSh0cnVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB7IHR5cGU6IEVORCB9KTtcblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgX29mZjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdmFyIGNvdW50ID0gdGhpcy5fZGlzcGF0Y2hlci5yZW1vdmUodHlwZSwgZm4pO1xuXHQgICAgICBpZiAoY291bnQgPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9zZXRBY3RpdmUoZmFsc2UpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIG9uVmFsdWU6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKFZBTFVFLCBmbik7XG5cdCAgfSxcblx0ICBvbkVycm9yOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb25FbmQ6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEVORCwgZm4pO1xuXHQgIH0sXG5cdCAgb25Bbnk6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEFOWSwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmVmFsdWU6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihWQUxVRSwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRXJyb3I6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRW5kOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoRU5ELCBmbik7XG5cdCAgfSxcblx0ICBvZmZBbnk6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihBTlksIGZuKTtcblx0ICB9LFxuXHQgIG9ic2VydmU6IGZ1bmN0aW9uIChvYnNlcnZlck9yT25WYWx1ZSwgb25FcnJvciwgb25FbmQpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cdCAgICB2YXIgY2xvc2VkID0gZmFsc2U7XG5cblx0ICAgIHZhciBvYnNlcnZlciA9ICFvYnNlcnZlck9yT25WYWx1ZSB8fCB0eXBlb2Ygb2JzZXJ2ZXJPck9uVmFsdWUgPT09ICdmdW5jdGlvbicgPyB7IHZhbHVlOiBvYnNlcnZlck9yT25WYWx1ZSwgZXJyb3I6IG9uRXJyb3IsIGVuZDogb25FbmQgfSA6IG9ic2VydmVyT3JPblZhbHVlO1xuXG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUgJiYgb2JzZXJ2ZXIudmFsdWUpIHtcblx0ICAgICAgICBvYnNlcnZlci52YWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IgJiYgb2JzZXJ2ZXIuZXJyb3IpIHtcblx0ICAgICAgICBvYnNlcnZlci5lcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIG9ic2VydmVyLmVuZCkge1xuXHQgICAgICAgIG9ic2VydmVyLmVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cblx0ICAgIHRoaXMub25BbnkoaGFuZGxlcik7XG5cblx0ICAgIHJldHVybiB7XG5cdCAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgaWYgKCFjbG9zZWQpIHtcblx0ICAgICAgICAgIF90aGlzLm9mZkFueShoYW5kbGVyKTtcblx0ICAgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgICAgfVxuXHQgICAgICB9LFxuXG5cdCAgICAgIGdldCBjbG9zZWQoKSB7XG5cdCAgICAgICAgcmV0dXJuIGNsb3NlZDtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICB9LFxuXG5cblx0ICAvLyBBIGFuZCBCIG11c3QgYmUgc3ViY2xhc3NlcyBvZiBTdHJlYW0gYW5kIFByb3BlcnR5IChvcmRlciBkb2Vzbid0IG1hdHRlcilcblx0ICBfb2ZTYW1lVHlwZTogZnVuY3Rpb24gKEEsIEIpIHtcblx0ICAgIHJldHVybiBBLnByb3RvdHlwZS5nZXRUeXBlKCkgPT09IHRoaXMuZ2V0VHlwZSgpID8gQSA6IEI7XG5cdCAgfSxcblx0ICBzZXROYW1lOiBmdW5jdGlvbiAoc291cmNlT2JzIC8qIG9wdGlvbmFsICovLCBzZWxmTmFtZSkge1xuXHQgICAgdGhpcy5fbmFtZSA9IHNlbGZOYW1lID8gc291cmNlT2JzLl9uYW1lICsgJy4nICsgc2VsZk5hbWUgOiBzb3VyY2VPYnM7XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIGxvZzogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIG5hbWUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRvU3RyaW5nKCkgOiBhcmd1bWVudHNbMF07XG5cblxuXHQgICAgdmFyIGlzQ3VycmVudCA9IHZvaWQgMDtcblx0ICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHZhciB0eXBlID0gJzwnICsgZXZlbnQudHlwZSArIChpc0N1cnJlbnQgPyAnOmN1cnJlbnQnIDogJycpICsgJz4nO1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgaWYgKCF0aGlzLl9sb2dIYW5kbGVycykge1xuXHQgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fbG9nSGFuZGxlcnMucHVzaCh7IG5hbWU6IG5hbWUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XG5cdCAgICB9XG5cblx0ICAgIGlzQ3VycmVudCA9IHRydWU7XG5cdCAgICB0aGlzLm9uQW55KGhhbmRsZXIpO1xuXHQgICAgaXNDdXJyZW50ID0gZmFsc2U7XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgb2ZmTG9nOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXG5cdCAgICBpZiAodGhpcy5fbG9nSGFuZGxlcnMpIHtcblx0ICAgICAgdmFyIGhhbmRsZXJJbmRleCA9IGZpbmRCeVByZWQodGhpcy5fbG9nSGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgICByZXR1cm4gb2JqLm5hbWUgPT09IG5hbWU7XG5cdCAgICAgIH0pO1xuXHQgICAgICBpZiAoaGFuZGxlckluZGV4ICE9PSAtMSkge1xuXHQgICAgICAgIHRoaXMub2ZmQW55KHRoaXMuX2xvZ0hhbmRsZXJzW2hhbmRsZXJJbmRleF0uaGFuZGxlcik7XG5cdCAgICAgICAgdGhpcy5fbG9nSGFuZGxlcnMuc3BsaWNlKGhhbmRsZXJJbmRleCwgMSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBzcHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICB2YXIgdHlwZSA9ICc8JyArIGV2ZW50LnR5cGUgKyAnPic7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgaWYgKCF0aGlzLl9zcHlIYW5kbGVycykge1xuXHQgICAgICAgIHRoaXMuX3NweUhhbmRsZXJzID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fc3B5SGFuZGxlcnMucHVzaCh7IG5hbWU6IG5hbWUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuYWRkU3B5KGhhbmRsZXIpO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBvZmZTcHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICBpZiAodGhpcy5fc3B5SGFuZGxlcnMpIHtcblx0ICAgICAgdmFyIGhhbmRsZXJJbmRleCA9IGZpbmRCeVByZWQodGhpcy5fc3B5SGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgICByZXR1cm4gb2JqLm5hbWUgPT09IG5hbWU7XG5cdCAgICAgIH0pO1xuXHQgICAgICBpZiAoaGFuZGxlckluZGV4ICE9PSAtMSkge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIucmVtb3ZlU3B5KHRoaXMuX3NweUhhbmRsZXJzW2hhbmRsZXJJbmRleF0uaGFuZGxlcik7XG5cdCAgICAgICAgdGhpcy5fc3B5SGFuZGxlcnMuc3BsaWNlKGhhbmRsZXJJbmRleCwgMSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH1cblx0fSk7XG5cblx0Ly8gZXh0ZW5kKCkgY2FuJ3QgaGFuZGxlIGB0b1N0cmluZ2AgaW4gSUU4XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiAnWycgKyB0aGlzLl9uYW1lICsgJ10nO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIFN0cmVhbSgpIHtcblx0ICBPYnNlcnZhYmxlLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFN0cmVhbSwgT2JzZXJ2YWJsZSwge1xuXG5cdCAgX25hbWU6ICdzdHJlYW0nLFxuXG5cdCAgZ2V0VHlwZTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuICdzdHJlYW0nO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gUHJvcGVydHkoKSB7XG5cdCAgT2JzZXJ2YWJsZS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFByb3BlcnR5LCBPYnNlcnZhYmxlLCB7XG5cblx0ICBfbmFtZTogJ3Byb3BlcnR5JyxcblxuXHQgIF9lbWl0VmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9O1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFcnJvcjogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH07XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdEVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlID0gZmFsc2U7XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFTkQgfSk7XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fY2xlYXIoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5hZGQodHlwZSwgZm4pO1xuXHQgICAgICB0aGlzLl9zZXRBY3RpdmUodHJ1ZSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ICE9PSBudWxsKSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB0aGlzLl9jdXJyZW50RXZlbnQpO1xuXHQgICAgfVxuXHQgICAgaWYgKCF0aGlzLl9hbGl2ZSkge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgeyB0eXBlOiBFTkQgfSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiAncHJvcGVydHknO1xuXHQgIH1cblx0fSk7XG5cblx0dmFyIG5ldmVyUyA9IG5ldyBTdHJlYW0oKTtcblx0bmV2ZXJTLl9lbWl0RW5kKCk7XG5cdG5ldmVyUy5fbmFtZSA9ICduZXZlcic7XG5cblx0ZnVuY3Rpb24gbmV2ZXIoKSB7XG5cdCAgcmV0dXJuIG5ldmVyUztcblx0fVxuXG5cdGZ1bmN0aW9uIHRpbWVCYXNlZChtaXhpbikge1xuXG5cdCAgZnVuY3Rpb24gQW5vbnltb3VzU3RyZWFtKHdhaXQsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fb25UaWNrKCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpbmhlcml0KEFub255bW91c1N0cmVhbSwgU3RyZWFtLCB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblx0ICB9LCBtaXhpbik7XG5cblx0ICByZXR1cm4gQW5vbnltb3VzU3RyZWFtO1xuXHR9XG5cblx0dmFyIFMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdsYXRlcicsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB4ID0gX3JlZi54O1xuXG5cdCAgICB0aGlzLl94ID0geDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94ID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94KTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGxhdGVyKHdhaXQsIHgpIHtcblx0ICByZXR1cm4gbmV3IFMod2FpdCwgeyB4OiB4IH0pO1xuXHR9XG5cblx0dmFyIFMkMSA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2ludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIHggPSBfcmVmLng7XG5cblx0ICAgIHRoaXMuX3ggPSB4O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3ggPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3gpO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gaW50ZXJ2YWwod2FpdCwgeCkge1xuXHQgIHJldHVybiBuZXcgUyQxKHdhaXQsIHsgeDogeCB9KTtcblx0fVxuXG5cdHZhciBTJDIgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdzZXF1ZW50aWFsbHknLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgeHMgPSBfcmVmLnhzO1xuXG5cdCAgICB0aGlzLl94cyA9IGNsb25lQXJyYXkoeHMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hzID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl94cy5sZW5ndGggPT09IDEpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzWzBdKTtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzLnNoaWZ0KCkpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc2VxdWVudGlhbGx5KHdhaXQsIHhzKSB7XG5cdCAgcmV0dXJuIHhzLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgUyQyKHdhaXQsIHsgeHM6IHhzIH0pO1xuXHR9XG5cblx0dmFyIFMkMyA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2Zyb21Qb2xsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbigpKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGZyb21Qb2xsKHdhaXQsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDMod2FpdCwgeyBmbjogZm4gfSk7XG5cdH1cblxuXHRmdW5jdGlvbiBlbWl0dGVyKG9icykge1xuXG5cdCAgZnVuY3Rpb24gdmFsdWUoeCkge1xuXHQgICAgb2JzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXJyb3IoeCkge1xuXHQgICAgb2JzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZW5kKCkge1xuXHQgICAgb2JzLl9lbWl0RW5kKCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXZlbnQoZSkge1xuXHQgICAgb2JzLl9lbWl0KGUudHlwZSwgZS52YWx1ZSk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIHtcblx0ICAgIHZhbHVlOiB2YWx1ZSxcblx0ICAgIGVycm9yOiBlcnJvcixcblx0ICAgIGVuZDogZW5kLFxuXHQgICAgZXZlbnQ6IGV2ZW50LFxuXG5cdCAgICAvLyBsZWdhY3lcblx0ICAgIGVtaXQ6IHZhbHVlLFxuXHQgICAgZW1pdEV2ZW50OiBldmVudFxuXHQgIH07XG5cdH1cblxuXHR2YXIgUyQ0ID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnd2l0aEludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBlbWl0dGVyKHRoaXMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBmbih0aGlzLl9lbWl0dGVyKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHdpdGhJbnRlcnZhbCh3YWl0LCBmbikge1xuXHQgIHJldHVybiBuZXcgUyQ0KHdhaXQsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gUyQ1KGZuKSB7XG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fZm4gPSBmbjtcblx0ICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFMkNSwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ3N0cmVhbScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciB1bnN1YnNjcmliZSA9IGZuKGVtaXR0ZXIodGhpcykpO1xuXHQgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSB0eXBlb2YgdW5zdWJzY3JpYmUgPT09ICdmdW5jdGlvbicgPyB1bnN1YnNjcmliZSA6IG51bGw7XG5cblx0ICAgIC8vIGZpeCBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzM1XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9jYWxsVW5zdWJzY3JpYmUoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jYWxsVW5zdWJzY3JpYmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl91bnN1YnNjcmliZSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSgpO1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2NhbGxVbnN1YnNjcmliZSgpO1xuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc3RyZWFtKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDUoZm4pO1xuXHR9XG5cblx0ZnVuY3Rpb24gZnJvbUNhbGxiYWNrKGNhbGxiYWNrQ29uc3VtZXIpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgY2FsbGJhY2tDb25zdW1lcihmdW5jdGlvbiAoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9KTtcblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tQ2FsbGJhY2snKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21Ob2RlQ2FsbGJhY2soY2FsbGJhY2tDb25zdW1lcikge1xuXG5cdCAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuXG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICBjYWxsYmFja0NvbnN1bWVyKGZ1bmN0aW9uIChlcnJvciwgeCkge1xuXHQgICAgICAgIGlmIChlcnJvcikge1xuXHQgICAgICAgICAgZW1pdHRlci5lcnJvcihlcnJvcik7XG5cdCAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICB9XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbU5vZGVDYWxsYmFjaycpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc3ByZWFkKGZuLCBsZW5ndGgpIHtcblx0ICBzd2l0Y2ggKGxlbmd0aCkge1xuXHQgICAgY2FzZSAwOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIHJldHVybiBmbigpO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAxOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDI6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMzpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSA0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG5cdCAgICAgIH07XG5cdCAgICBkZWZhdWx0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICAgIH07XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwbHkoZm4sIGMsIGEpIHtcblx0ICB2YXIgYUxlbmd0aCA9IGEgPyBhLmxlbmd0aCA6IDA7XG5cdCAgaWYgKGMgPT0gbnVsbCkge1xuXHQgICAgc3dpdGNoIChhTGVuZ3RoKSB7XG5cdCAgICAgIGNhc2UgMDpcblx0ICAgICAgICByZXR1cm4gZm4oKTtcblx0ICAgICAgY2FzZSAxOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdKTtcblx0ICAgICAgY2FzZSAyOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgY2FzZSAzOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdKTtcblx0ICAgICAgY2FzZSA0OlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdLCBhWzNdKTtcblx0ICAgICAgZGVmYXVsdDpcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHN3aXRjaCAoYUxlbmd0aCkge1xuXHQgICAgICBjYXNlIDA6XG5cdCAgICAgICAgcmV0dXJuIGZuLmNhbGwoYyk7XG5cdCAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KGMsIGEpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21TdWJVbnN1YihzdWIsIHVuc3ViLCB0cmFuc2Zvcm1lciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSB0cmFuc2Zvcm1lciA/IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgZW1pdHRlci5lbWl0KGFwcGx5KHRyYW5zZm9ybWVyLCB0aGlzLCBhcmd1bWVudHMpKTtcblx0ICAgIH0gOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICB9O1xuXG5cdCAgICBzdWIoaGFuZGxlcik7XG5cdCAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gdW5zdWIoaGFuZGxlcik7XG5cdCAgICB9O1xuXHQgIH0pLnNldE5hbWUoJ2Zyb21TdWJVbnN1YicpO1xuXHR9XG5cblx0dmFyIHBhaXJzID0gW1snYWRkRXZlbnRMaXN0ZW5lcicsICdyZW1vdmVFdmVudExpc3RlbmVyJ10sIFsnYWRkTGlzdGVuZXInLCAncmVtb3ZlTGlzdGVuZXInXSwgWydvbicsICdvZmYnXV07XG5cblx0ZnVuY3Rpb24gZnJvbUV2ZW50cyh0YXJnZXQsIGV2ZW50TmFtZSwgdHJhbnNmb3JtZXIpIHtcblx0ICB2YXIgc3ViID0gdm9pZCAwLFxuXHQgICAgICB1bnN1YiA9IHZvaWQgMDtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzBdXSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzFdXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgICBzdWIgPSBwYWlyc1tpXVswXTtcblx0ICAgICAgdW5zdWIgPSBwYWlyc1tpXVsxXTtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9XG5cdCAgfVxuXG5cdCAgaWYgKHN1YiA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ3RhcmdldCBkb25cXCd0IHN1cHBvcnQgYW55IG9mICcgKyAnYWRkRXZlbnRMaXN0ZW5lci9yZW1vdmVFdmVudExpc3RlbmVyLCBhZGRMaXN0ZW5lci9yZW1vdmVMaXN0ZW5lciwgb24vb2ZmIG1ldGhvZCBwYWlyJyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIGZyb21TdWJVbnN1YihmdW5jdGlvbiAoaGFuZGxlcikge1xuXHQgICAgcmV0dXJuIHRhcmdldFtzdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcblx0ICAgIHJldHVybiB0YXJnZXRbdW5zdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgdHJhbnNmb3JtZXIpLnNldE5hbWUoJ2Zyb21FdmVudHMnKTtcblx0fVxuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQKHZhbHVlKSB7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiAndmFsdWUnLCB2YWx1ZTogdmFsdWUsIGN1cnJlbnQ6IHRydWUgfTtcblx0fVxuXG5cdGluaGVyaXQoUCwgUHJvcGVydHksIHtcblx0ICBfbmFtZTogJ2NvbnN0YW50Jyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0ZnVuY3Rpb24gY29uc3RhbnQoeCkge1xuXHQgIHJldHVybiBuZXcgUCh4KTtcblx0fVxuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQJDEodmFsdWUpIHtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6ICdlcnJvcicsIHZhbHVlOiB2YWx1ZSwgY3VycmVudDogdHJ1ZSB9O1xuXHR9XG5cblx0aW5oZXJpdChQJDEsIFByb3BlcnR5LCB7XG5cdCAgX25hbWU6ICdjb25zdGFudEVycm9yJyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0ZnVuY3Rpb24gY29uc3RhbnRFcnJvcih4KSB7XG5cdCAgcmV0dXJuIG5ldyBQJDEoeCk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb25zdHJ1Y3RvcihCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShzb3VyY2UsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgICAgdGhpcy5fbmFtZSA9IHNvdXJjZS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9pbml0KG9wdGlvbnMpO1xuXHQgICAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDbGFzc01ldGhvZHMoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblx0ICAgIF9pbml0OiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZUVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVORDpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfSxcblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblx0ICAgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBCYXNlQ2xhc3MucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTdHJlYW0obmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUyA9IGNyZWF0ZUNvbnN0cnVjdG9yKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyhTdHJlYW0pLCBtaXhpbik7XG5cdCAgcmV0dXJuIFM7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVQcm9wZXJ0eShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBQID0gY3JlYXRlQ29uc3RydWN0b3IoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyhQcm9wZXJ0eSksIG1peGluKTtcblx0ICByZXR1cm4gUDtcblx0fVxuXG5cdHZhciBQJDIgPSBjcmVhdGVQcm9wZXJ0eSgndG9Qcm9wZXJ0eScsIHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2dldEluaXRpYWxDdXJyZW50ID0gZm47XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQgIT09IG51bGwpIHtcblx0ICAgICAgdmFyIGdldEluaXRpYWwgPSB0aGlzLl9nZXRJbml0aWFsQ3VycmVudDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGdldEluaXRpYWwoKSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHRvUHJvcGVydHkob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIGlmIChmbiAhPT0gbnVsbCAmJiB0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHRocm93IG5ldyBFcnJvcignWW91IHNob3VsZCBjYWxsIHRvUHJvcGVydHkoKSB3aXRoIGEgZnVuY3Rpb24gb3Igbm8gYXJndW1lbnRzLicpO1xuXHQgIH1cblx0ICByZXR1cm4gbmV3IFAkMihvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIFMkNiA9IGNyZWF0ZVN0cmVhbSgnY2hhbmdlcycsIHtcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNoYW5nZXMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDYob2JzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21Qcm9taXNlKHByb21pc2UpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHZhciByZXN1bHQgPSBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIHZhciBvblZhbHVlID0gZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIG9uRXJyb3IgPSBmdW5jdGlvbiAoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZXJyb3IoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIF9wcm9taXNlID0gcHJvbWlzZS50aGVuKG9uVmFsdWUsIG9uRXJyb3IpO1xuXG5cdCAgICAgIC8vIHByZXZlbnQgbGlicmFyaWVzIGxpa2UgJ1EnIG9yICd3aGVuJyBmcm9tIHN3YWxsb3dpbmcgZXhjZXB0aW9uc1xuXHQgICAgICBpZiAoX3Byb21pc2UgJiYgdHlwZW9mIF9wcm9taXNlLmRvbmUgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgICAgICBfcHJvbWlzZS5kb25lKCk7XG5cdCAgICAgIH1cblxuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pO1xuXG5cdCAgcmV0dXJuIHRvUHJvcGVydHkocmVzdWx0LCBudWxsKS5zZXROYW1lKCdmcm9tUHJvbWlzZScpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0R2xvZGFsUHJvbWlzZSgpIHtcblx0ICBpZiAodHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHJldHVybiBQcm9taXNlO1xuXHQgIH0gZWxzZSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzblxcJ3QgZGVmYXVsdCBQcm9taXNlLCB1c2Ugc2hpbSBvciBwYXJhbWV0ZXInKTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiB0b1Byb21pc2UgKG9icykge1xuXHQgIHZhciBQcm9taXNlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZ2V0R2xvZGFsUHJvbWlzZSgpIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgdmFyIGxhc3QgPSBudWxsO1xuXHQgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICBvYnMub25BbnkoZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQgJiYgbGFzdCAhPT0gbnVsbCkge1xuXHQgICAgICAgIChsYXN0LnR5cGUgPT09IFZBTFVFID8gcmVzb2x2ZSA6IHJlamVjdCkobGFzdC52YWx1ZSk7XG5cdCAgICAgICAgbGFzdCA9IG51bGw7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgbGFzdCA9IGV2ZW50O1xuXHQgICAgICB9XG5cdCAgICB9KTtcblx0ICB9KTtcblx0fVxuXG5cdHZhciBjb21tb25qc0dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDoge31cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21tb25qc01vZHVsZShmbiwgbW9kdWxlKSB7XG5cdFx0cmV0dXJuIG1vZHVsZSA9IHsgZXhwb3J0czoge30gfSwgZm4obW9kdWxlLCBtb2R1bGUuZXhwb3J0cyksIG1vZHVsZS5leHBvcnRzO1xuXHR9XG5cblx0dmFyIHBvbnlmaWxsID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdFx0dmFsdWU6IHRydWVcblx0fSk7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IHN5bWJvbE9ic2VydmFibGVQb255ZmlsbDtcblx0ZnVuY3Rpb24gc3ltYm9sT2JzZXJ2YWJsZVBvbnlmaWxsKHJvb3QpIHtcblx0XHR2YXIgcmVzdWx0O1xuXHRcdHZhciBfU3ltYm9sID0gcm9vdC5TeW1ib2w7XG5cblx0XHRpZiAodHlwZW9mIF9TeW1ib2wgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdGlmIChfU3ltYm9sLm9ic2VydmFibGUpIHtcblx0XHRcdFx0cmVzdWx0ID0gX1N5bWJvbC5vYnNlcnZhYmxlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVzdWx0ID0gX1N5bWJvbCgnb2JzZXJ2YWJsZScpO1xuXHRcdFx0XHRfU3ltYm9sLm9ic2VydmFibGUgPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCA9ICdAQG9ic2VydmFibGUnO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH07XG5cdH0pO1xuXG5cdHZhciByZXF1aXJlJCQwJDEgPSAocG9ueWZpbGwgJiYgdHlwZW9mIHBvbnlmaWxsID09PSAnb2JqZWN0JyAmJiAnZGVmYXVsdCcgaW4gcG9ueWZpbGwgPyBwb255ZmlsbFsnZGVmYXVsdCddIDogcG9ueWZpbGwpO1xuXG5cdHZhciBpbmRleCQxID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdFx0dmFsdWU6IHRydWVcblx0fSk7XG5cblx0dmFyIF9wb255ZmlsbCA9IHJlcXVpcmUkJDAkMTtcblxuXHR2YXIgX3BvbnlmaWxsMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3BvbnlmaWxsKTtcblxuXHRmdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikge1xuXHRcdHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07XG5cdH1cblxuXHR2YXIgcm9vdCA9IHVuZGVmaW5lZDsgLyogZ2xvYmFsIHdpbmRvdyAqL1xuXG5cdGlmICh0eXBlb2YgY29tbW9uanNHbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0cm9vdCA9IGNvbW1vbmpzR2xvYmFsO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0cm9vdCA9IHdpbmRvdztcblx0fVxuXG5cdHZhciByZXN1bHQgPSAoMCwgX3BvbnlmaWxsMlsnZGVmYXVsdCddKShyb290KTtcblx0ZXhwb3J0c1snZGVmYXVsdCddID0gcmVzdWx0O1xuXHR9KTtcblxuXHR2YXIgcmVxdWlyZSQkMCA9IChpbmRleCQxICYmIHR5cGVvZiBpbmRleCQxID09PSAnb2JqZWN0JyAmJiAnZGVmYXVsdCcgaW4gaW5kZXgkMSA/IGluZGV4JDFbJ2RlZmF1bHQnXSA6IGluZGV4JDEpO1xuXG5cdHZhciBpbmRleCA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUpIHtcblx0bW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlJCQwO1xuXHR9KTtcblxuXHR2YXIgJCRvYnNlcnZhYmxlID0gKGluZGV4ICYmIHR5cGVvZiBpbmRleCA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIGluZGV4ID8gaW5kZXhbJ2RlZmF1bHQnXSA6IGluZGV4KTtcblxuXHRmdW5jdGlvbiBmcm9tRVNPYnNlcnZhYmxlKF9vYnNlcnZhYmxlKSB7XG5cdCAgdmFyIG9ic2VydmFibGUgPSBfb2JzZXJ2YWJsZVskJG9ic2VydmFibGVdID8gX29ic2VydmFibGVbJCRvYnNlcnZhYmxlXSgpIDogX29ic2VydmFibGU7XG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXHQgICAgdmFyIHVuc3ViID0gb2JzZXJ2YWJsZS5zdWJzY3JpYmUoe1xuXHQgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG5cdCAgICAgICAgZW1pdHRlci5lcnJvcihlcnJvcik7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSxcblx0ICAgICAgbmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHZhbHVlKTtcblx0ICAgICAgfSxcblx0ICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9KTtcblxuXHQgICAgaWYgKHVuc3ViLnVuc3Vic2NyaWJlKSB7XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgdW5zdWIudW5zdWJzY3JpYmUoKTtcblx0ICAgICAgfTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJldHVybiB1bnN1Yjtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tRVNPYnNlcnZhYmxlJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBFU09ic2VydmFibGUob2JzZXJ2YWJsZSkge1xuXHQgIHRoaXMuX29ic2VydmFibGUgPSBvYnNlcnZhYmxlLnRha2VFcnJvcnMoMSk7XG5cdH1cblxuXHRleHRlbmQoRVNPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXHQgIHN1YnNjcmliZTogZnVuY3Rpb24gKG9ic2VydmVyT3JPbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGUpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciBvYnNlcnZlciA9IHR5cGVvZiBvYnNlcnZlck9yT25OZXh0ID09PSAnZnVuY3Rpb24nID8geyBuZXh0OiBvYnNlcnZlck9yT25OZXh0LCBlcnJvcjogb25FcnJvciwgY29tcGxldGU6IG9uQ29tcGxldGUgfSA6IG9ic2VydmVyT3JPbk5leHQ7XG5cblx0ICAgIHZhciBmbiA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSAmJiBvYnNlcnZlci5uZXh0KSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIubmV4dChldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IgJiYgb2JzZXJ2ZXIuZXJyb3IpIHtcblx0ICAgICAgICBvYnNlcnZlci5lcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIG9ic2VydmVyLmNvbXBsZXRlKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICB0aGlzLl9vYnNlcnZhYmxlLm9uQW55KGZuKTtcblx0ICAgIHZhciBjbG9zZWQgPSBmYWxzZTtcblxuXHQgICAgdmFyIHN1YnNjcmlwdGlvbiA9IHtcblx0ICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICBjbG9zZWQgPSB0cnVlO1xuXHQgICAgICAgIF90aGlzLl9vYnNlcnZhYmxlLm9mZkFueShmbik7XG5cdCAgICAgIH0sXG5cdCAgICAgIGdldCBjbG9zZWQoKSB7XG5cdCAgICAgICAgcmV0dXJuIGNsb3NlZDtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICAgIHJldHVybiBzdWJzY3JpcHRpb247XG5cdCAgfVxuXHR9KTtcblxuXHQvLyBOZWVkIHRvIGFzc2lnbiBkaXJlY3RseSBiL2MgU3ltYm9scyBhcmVuJ3QgZW51bWVyYWJsZS5cblx0RVNPYnNlcnZhYmxlLnByb3RvdHlwZVskJG9ic2VydmFibGVdID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHRvRVNPYnNlcnZhYmxlKCkge1xuXHQgIHJldHVybiBuZXcgRVNPYnNlcnZhYmxlKHRoaXMpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IoZXJyb3JzKSB7XG5cdCAgdmFyIGxhdGVzdEVycm9yID0gdm9pZCAwO1xuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgZXJyb3JzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAoZXJyb3JzW2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgaWYgKGxhdGVzdEVycm9yID09PSB1bmRlZmluZWQgfHwgbGF0ZXN0RXJyb3IuaW5kZXggPCBlcnJvcnNbaV0uaW5kZXgpIHtcblx0ICAgICAgICBsYXRlc3RFcnJvciA9IGVycm9yc1tpXTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gbGF0ZXN0RXJyb3IuZXJyb3I7XG5cdH1cblxuXHRmdW5jdGlvbiBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9hY3RpdmVDb3VudCA9IGFjdGl2ZS5sZW5ndGg7XG5cdCAgdGhpcy5fc291cmNlcyA9IGNvbmNhdChhY3RpdmUsIHBhc3NpdmUpO1xuXHQgIHRoaXMuX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gc3ByZWFkKGNvbWJpbmF0b3IsIHRoaXMuX3NvdXJjZXMubGVuZ3RoKSA6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICByZXR1cm4geDtcblx0ICB9O1xuXHQgIHRoaXMuX2FsaXZlQ291bnQgPSAwO1xuXHQgIHRoaXMuX2xhdGVzdFZhbHVlcyA9IG5ldyBBcnJheSh0aGlzLl9zb3VyY2VzLmxlbmd0aCk7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbmV3IEFycmF5KHRoaXMuX3NvdXJjZXMubGVuZ3RoKTtcblx0ICBmaWxsQXJyYXkodGhpcy5fbGF0ZXN0VmFsdWVzLCBOT1RISU5HKTtcblx0ICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JJbmRleCA9IDA7XG5cblx0ICB0aGlzLl8kaGFuZGxlcnMgPSBbXTtcblxuXHQgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIChpKSB7XG5cdCAgICBfdGhpcy5fJGhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGksIGV2ZW50KTtcblx0ICAgIH0pO1xuXHQgIH07XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIF9sb29wKGkpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQ29tYmluZSwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ2NvbWJpbmUnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYWxpdmVDb3VudCA9IHRoaXMuX2FjdGl2ZUNvdW50O1xuXG5cdCAgICAvLyB3ZSBuZWVkIHRvIHN1c2NyaWJlIHRvIF9wYXNzaXZlXyBzb3VyY2VzIGJlZm9yZSBfYWN0aXZlX1xuXHQgICAgLy8gKHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzk4KVxuXHQgICAgZm9yICh2YXIgaSA9IHRoaXMuX2FjdGl2ZUNvdW50OyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgdGhpcy5fYWN0aXZlQ291bnQ7IF9pKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tfaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW19pXSk7XG5cdCAgICB9XG5cblx0ICAgIGlmICh0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSBmYWxzZTtcblx0ICAgICAgdGhpcy5fZW1pdElmRnVsbCgpO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbikge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBsZW5ndGggPSB0aGlzLl9zb3VyY2VzLmxlbmd0aCxcblx0ICAgICAgICBpID0gdm9pZCAwO1xuXHQgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub2ZmQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdElmRnVsbDogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGhhc0FsbFZhbHVlcyA9IHRydWU7XG5cdCAgICB2YXIgaGFzRXJyb3JzID0gZmFsc2U7XG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fbGF0ZXN0VmFsdWVzLmxlbmd0aDtcblx0ICAgIHZhciB2YWx1ZXNDb3B5ID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cdCAgICB2YXIgZXJyb3JzQ29weSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHZhbHVlc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RWYWx1ZXNbaV07XG5cdCAgICAgIGVycm9yc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RFcnJvcnNbaV07XG5cblx0ICAgICAgaWYgKHZhbHVlc0NvcHlbaV0gPT09IE5PVEhJTkcpIHtcblx0ICAgICAgICBoYXNBbGxWYWx1ZXMgPSBmYWxzZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChlcnJvcnNDb3B5W2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgICBoYXNFcnJvcnMgPSB0cnVlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIGlmIChoYXNBbGxWYWx1ZXMpIHtcblx0ICAgICAgdmFyIGNvbWJpbmF0b3IgPSB0aGlzLl9jb21iaW5hdG9yO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXNDb3B5KSk7XG5cdCAgICB9XG5cdCAgICBpZiAoaGFzRXJyb3JzKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihkZWZhdWx0RXJyb3JzQ29tYmluYXRvcihlcnJvcnNDb3B5KSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoaSwgZXZlbnQpIHtcblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFIHx8IGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0VmFsdWVzW2ldID0gZXZlbnQudmFsdWU7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0gdW5kZWZpbmVkO1xuXHQgICAgICB9XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdFZhbHVlc1tpXSA9IE5PVEhJTkc7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0ge1xuXHQgICAgICAgICAgaW5kZXg6IHRoaXMuX2xhdGVzdEVycm9ySW5kZXgrKyxcblx0ICAgICAgICAgIGVycm9yOiBldmVudC52YWx1ZVxuXHQgICAgICAgIH07XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0SWZGdWxsKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICAvLyBFTkRcblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICAgIGlmICh0aGlzLl9hbGl2ZUNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgICAgICB0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICAgICAgfVxuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXRlc3RWYWx1ZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbWJpbmUoYWN0aXZlKSB7XG5cdCAgdmFyIHBhc3NpdmUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBbXSA6IGFyZ3VtZW50c1sxXTtcblx0ICB2YXIgY29tYmluYXRvciA9IGFyZ3VtZW50c1syXTtcblxuXHQgIGlmICh0eXBlb2YgcGFzc2l2ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgY29tYmluYXRvciA9IHBhc3NpdmU7XG5cdCAgICBwYXNzaXZlID0gW107XG5cdCAgfVxuXHQgIHJldHVybiBhY3RpdmUubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcik7XG5cdH1cblxuXHR2YXIgT2JzZXJ2YWJsZSQxID0ge1xuXHQgIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gbmV2ZXIoKTtcblx0ICB9LFxuXG5cblx0ICAvLyBNb25vaWQgYmFzZWQgb24gbWVyZ2UoKSBzZWVtcyBtb3JlIHVzZWZ1bCB0aGFuIG9uZSBiYXNlZCBvbiBjb25jYXQoKS5cblx0ICBjb25jYXQ6IGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gYS5tZXJnZShiKTtcblx0ICB9LFxuXHQgIG9mOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIGNvbnN0YW50KHgpO1xuXHQgIH0sXG5cdCAgbWFwOiBmdW5jdGlvbiAoZm4sIG9icykge1xuXHQgICAgcmV0dXJuIG9icy5tYXAoZm4pO1xuXHQgIH0sXG5cdCAgYmltYXA6IGZ1bmN0aW9uIChmbkVyciwgZm5WYWwsIG9icykge1xuXHQgICAgcmV0dXJuIG9icy5tYXBFcnJvcnMoZm5FcnIpLm1hcChmblZhbCk7XG5cdCAgfSxcblxuXG5cdCAgLy8gVGhpcyBhcCBzdHJpY3RseSBzcGVha2luZyBpbmNvbXBhdGlibGUgd2l0aCBjaGFpbi4gSWYgd2UgZGVyaXZlIGFwIGZyb20gY2hhaW4gd2UgZ2V0XG5cdCAgLy8gZGlmZmVyZW50IChub3QgdmVyeSB1c2VmdWwpIGJlaGF2aW9yLiBCdXQgc3BlYyByZXF1aXJlcyB0aGF0IGlmIG1ldGhvZCBjYW4gYmUgZGVyaXZlZFxuXHQgIC8vIGl0IG11c3QgaGF2ZSB0aGUgc2FtZSBiZWhhdmlvciBhcyBoYW5kLXdyaXR0ZW4gbWV0aG9kLiBXZSBpbnRlbnRpb25hbGx5IHZpb2xhdGUgdGhlIHNwZWNcblx0ICAvLyBpbiBob3BlIHRoYXQgaXQgd29uJ3QgY2F1c2UgbWFueSB0cm91YmxlcyBpbiBwcmFjdGljZS4gQW5kIGluIHJldHVybiB3ZSBoYXZlIG1vcmUgdXNlZnVsIHR5cGUuXG5cdCAgYXA6IGZ1bmN0aW9uIChvYnNGbiwgb2JzVmFsKSB7XG5cdCAgICByZXR1cm4gY29tYmluZShbb2JzRm4sIG9ic1ZhbF0sIGZ1bmN0aW9uIChmbiwgdmFsKSB7XG5cdCAgICAgIHJldHVybiBmbih2YWwpO1xuXHQgICAgfSk7XG5cdCAgfSxcblx0ICBjaGFpbjogZnVuY3Rpb24gKGZuLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMuZmxhdE1hcChmbik7XG5cdCAgfVxuXHR9O1xuXG5cblxuXHR2YXIgc3RhdGljTGFuZCA9IE9iamVjdC5mcmVlemUoe1xuXHQgIE9ic2VydmFibGU6IE9ic2VydmFibGUkMVxuXHR9KTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHgpKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNyA9IGNyZWF0ZVN0cmVhbSgnbWFwJywgbWl4aW4pO1xuXHR2YXIgUCQzID0gY3JlYXRlUHJvcGVydHkoJ21hcCcsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIG1hcCQxKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkNywgUCQzKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDggPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlcicsIG1peGluJDEpO1xuXHR2YXIgUCQ0ID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlcicsIG1peGluJDEpO1xuXG5cdHZhciBpZCQxID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmaWx0ZXIob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkMSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDgsIFAkNCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ5ID0gY3JlYXRlU3RyZWFtKCd0YWtlJywgbWl4aW4kMik7XG5cdHZhciBQJDUgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZScsIG1peGluJDIpO1xuXG5cdGZ1bmN0aW9uIHRha2Uob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkOSwgUCQ1KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxMCA9IGNyZWF0ZVN0cmVhbSgndGFrZUVycm9ycycsIG1peGluJDMpO1xuXHR2YXIgUCQ2ID0gY3JlYXRlUHJvcGVydHkoJ3Rha2VFcnJvcnMnLCBtaXhpbiQzKTtcblxuXHRmdW5jdGlvbiB0YWtlRXJyb3JzKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDEwLCBQJDYpKShvYnMsIHsgbjogbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ0ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDExID0gY3JlYXRlU3RyZWFtKCd0YWtlV2hpbGUnLCBtaXhpbiQ0KTtcblx0dmFyIFAkNyA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlV2hpbGUnLCBtaXhpbiQ0KTtcblxuXHR2YXIgaWQkMiA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gdGFrZVdoaWxlKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDIgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMSwgUCQ3KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSBOT1RISU5HO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2xhc3RWYWx1ZSA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSB4O1xuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RWYWx1ZSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fbGFzdFZhbHVlKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTIgPSBjcmVhdGVTdHJlYW0oJ2xhc3QnLCBtaXhpbiQ1KTtcblx0dmFyIFAkOCA9IGNyZWF0ZVByb3BlcnR5KCdsYXN0JywgbWl4aW4kNSk7XG5cblx0ZnVuY3Rpb24gbGFzdChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMiwgUCQ4KSkob2JzKTtcblx0fVxuXG5cdHZhciBtaXhpbiQ2ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIG4gPSBfcmVmLm47XG5cblx0ICAgIHRoaXMuX24gPSBNYXRoLm1heCgwLCBuKTtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX24tLTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTMgPSBjcmVhdGVTdHJlYW0oJ3NraXAnLCBtaXhpbiQ2KTtcblx0dmFyIFAkOSA9IGNyZWF0ZVByb3BlcnR5KCdza2lwJywgbWl4aW4kNik7XG5cblx0ZnVuY3Rpb24gc2tpcChvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMywgUCQ5KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fZm4gIT09IG51bGwgJiYgIWZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9mbiA9PT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE0ID0gY3JlYXRlU3RyZWFtKCdza2lwV2hpbGUnLCBtaXhpbiQ3KTtcblx0dmFyIFAkMTAgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcFdoaWxlJywgbWl4aW4kNyk7XG5cblx0dmFyIGlkJDMgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNraXBXaGlsZShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQzIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTQsIFAkMTApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDggPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fcHJldiA9IE5PVEhJTkc7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgICAgdGhpcy5fcHJldiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICh0aGlzLl9wcmV2ID09PSBOT1RISU5HIHx8ICFmbih0aGlzLl9wcmV2LCB4KSkge1xuXHQgICAgICB0aGlzLl9wcmV2ID0geDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNSA9IGNyZWF0ZVN0cmVhbSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbiQ4KTtcblx0dmFyIFAkMTEgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbiQ4KTtcblxuXHR2YXIgZXEgPSBmdW5jdGlvbiAoYSwgYikge1xuXHQgIHJldHVybiBhID09PSBiO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNraXBEdXBsaWNhdGVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGVxIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTUsIFAkMTEpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIHNlZWQgPSBfcmVmLnNlZWQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9wcmV2ID0gc2VlZDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9wcmV2ID0gbnVsbDtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9wcmV2ICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fcHJldiwgeCkpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fcHJldiA9IHg7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE2ID0gY3JlYXRlU3RyZWFtKCdkaWZmJywgbWl4aW4kOSk7XG5cdHZhciBQJDEyID0gY3JlYXRlUHJvcGVydHkoJ2RpZmYnLCBtaXhpbiQ5KTtcblxuXHRmdW5jdGlvbiBkZWZhdWx0Rm4oYSwgYikge1xuXHQgIHJldHVybiBbYSwgYl07XG5cdH1cblxuXHRmdW5jdGlvbiBkaWZmKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxNiwgUCQxMikpKG9icywgeyBmbjogZm4gfHwgZGVmYXVsdEZuLCBzZWVkOiBzZWVkIH0pO1xuXHR9XG5cblx0dmFyIFAkMTMgPSBjcmVhdGVQcm9wZXJ0eSgnc2NhbicsIHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgc2VlZCA9IF9yZWYuc2VlZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3NlZWQgPSBzZWVkO1xuXHQgICAgaWYgKHNlZWQgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHNlZWQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX3NlZWQgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ID09PSBudWxsIHx8IHRoaXMuX2N1cnJlbnRFdmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fc2VlZCA9PT0gTk9USElORyA/IHggOiBmbih0aGlzLl9zZWVkLCB4KSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fY3VycmVudEV2ZW50LnZhbHVlLCB4KSk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBzY2FuKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IFAkMTMob2JzLCB7IGZuOiBmbiwgc2VlZDogc2VlZCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxMCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgeHMgPSBmbih4KTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHhzW2ldKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTcgPSBjcmVhdGVTdHJlYW0oJ2ZsYXR0ZW4nLCBtaXhpbiQxMCk7XG5cblx0dmFyIGlkJDQgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGZsYXR0ZW4ob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkNCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgUyQxNyhvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIEVORF9NQVJLRVIgPSB7fTtcblxuXHR2YXIgbWl4aW4kMTEgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fJHNoaWZ0QnVmZiA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdmFyIHZhbHVlID0gX3RoaXMuX2J1ZmYuc2hpZnQoKTtcblx0ICAgICAgaWYgKHZhbHVlID09PSBFTkRfTUFSS0VSKSB7XG5cdCAgICAgICAgX3RoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBfdGhpcy5fZW1pdFZhbHVlKHZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICAgIHRoaXMuXyRzaGlmdEJ1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKEVORF9NQVJLRVIpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxOCA9IGNyZWF0ZVN0cmVhbSgnZGVsYXknLCBtaXhpbiQxMSk7XG5cdHZhciBQJDE0ID0gY3JlYXRlUHJvcGVydHkoJ2RlbGF5JywgbWl4aW4kMTEpO1xuXG5cdGZ1bmN0aW9uIGRlbGF5KG9icywgd2FpdCkge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE4LCBQJDE0KSkob2JzLCB7IHdhaXQ6IHdhaXQgfSk7XG5cdH1cblxuXHR2YXIgbm93ID0gRGF0ZS5ub3cgPyBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIERhdGUubm93KCk7XG5cdH0gOiBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHR9O1xuXG5cdHZhciBtaXhpbiQxMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGxlYWRpbmcgPSBfcmVmLmxlYWRpbmc7XG5cdCAgICB2YXIgdHJhaWxpbmcgPSBfcmVmLnRyYWlsaW5nO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9sZWFkaW5nID0gbGVhZGluZztcblx0ICAgIHRoaXMuX3RyYWlsaW5nID0gdHJhaWxpbmc7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gMDtcblx0ICAgIHRoaXMuXyR0cmFpbGluZ0NhbGwgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fdHJhaWxpbmdDYWxsKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJHRyYWlsaW5nQ2FsbCA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB2YXIgY3VyVGltZSA9IG5vdygpO1xuXHQgICAgICBpZiAodGhpcy5fbGFzdENhbGxUaW1lID09PSAwICYmICF0aGlzLl9sZWFkaW5nKSB7XG5cdCAgICAgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gY3VyVGltZTtcblx0ICAgICAgfVxuXHQgICAgICB2YXIgcmVtYWluaW5nID0gdGhpcy5fd2FpdCAtIChjdXJUaW1lIC0gdGhpcy5fbGFzdENhbGxUaW1lKTtcblx0ICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fY2FuY2VsVHJhaWxpbmcoKTtcblx0ICAgICAgICB0aGlzLl9sYXN0Q2FsbFRpbWUgPSBjdXJUaW1lO1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl90cmFpbGluZykge1xuXHQgICAgICAgIHRoaXMuX2NhbmNlbFRyYWlsaW5nKCk7XG5cdCAgICAgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IHg7XG5cdCAgICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kdHJhaWxpbmdDYWxsLCByZW1haW5pbmcpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkKSB7XG5cdCAgICAgICAgdGhpcy5fZW5kTGF0ZXIgPSB0cnVlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NhbmNlbFRyYWlsaW5nOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fdGltZW91dElkICE9PSBudWxsKSB7XG5cdCAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0SWQpO1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3RyYWlsaW5nQ2FsbDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3RyYWlsaW5nVmFsdWUpO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gIXRoaXMuX2xlYWRpbmcgPyAwIDogbm93KCk7XG5cdCAgICBpZiAodGhpcy5fZW5kTGF0ZXIpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxOSA9IGNyZWF0ZVN0cmVhbSgndGhyb3R0bGUnLCBtaXhpbiQxMik7XG5cdHZhciBQJDE1ID0gY3JlYXRlUHJvcGVydHkoJ3Rocm90dGxlJywgbWl4aW4kMTIpO1xuXG5cdGZ1bmN0aW9uIHRocm90dGxlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGxlYWRpbmcgPSBfcmVmMi5sZWFkaW5nO1xuXHQgIHZhciBsZWFkaW5nID0gX3JlZjIkbGVhZGluZyA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGxlYWRpbmc7XG5cdCAgdmFyIF9yZWYyJHRyYWlsaW5nID0gX3JlZjIudHJhaWxpbmc7XG5cdCAgdmFyIHRyYWlsaW5nID0gX3JlZjIkdHJhaWxpbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiR0cmFpbGluZztcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE5LCBQJDE1KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGxlYWRpbmc6IGxlYWRpbmcsIHRyYWlsaW5nOiB0cmFpbGluZyB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxMyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGltbWVkaWF0ZSA9IF9yZWYuaW1tZWRpYXRlO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9pbW1lZGlhdGUgPSBpbW1lZGlhdGU7XG5cdCAgICB0aGlzLl9sYXN0QXR0ZW1wdCA9IDA7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXJWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2xhdGVyKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2xhc3RBdHRlbXB0ID0gbm93KCk7XG5cdCAgICAgIGlmICh0aGlzLl9pbW1lZGlhdGUgJiYgIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJGxhdGVyLCB0aGlzLl93YWl0KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSB4O1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkICYmICF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9lbmRMYXRlciA9IHRydWU7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfbGF0ZXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBsYXN0ID0gbm93KCkgLSB0aGlzLl9sYXN0QXR0ZW1wdDtcblx0ICAgIGlmIChsYXN0IDwgdGhpcy5fd2FpdCAmJiBsYXN0ID49IDApIHtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kbGF0ZXIsIHRoaXMuX3dhaXQgLSBsYXN0KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICAgIGlmICghdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2xhdGVyVmFsdWUpO1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICh0aGlzLl9lbmRMYXRlcikge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyMCA9IGNyZWF0ZVN0cmVhbSgnZGVib3VuY2UnLCBtaXhpbiQxMyk7XG5cdHZhciBQJDE2ID0gY3JlYXRlUHJvcGVydHkoJ2RlYm91bmNlJywgbWl4aW4kMTMpO1xuXG5cdGZ1bmN0aW9uIGRlYm91bmNlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGltbWVkaWF0ZSA9IF9yZWYyLmltbWVkaWF0ZTtcblx0ICB2YXIgaW1tZWRpYXRlID0gX3JlZjIkaW1tZWRpYXRlID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IF9yZWYyJGltbWVkaWF0ZTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDIwLCBQJDE2KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGltbWVkaWF0ZTogaW1tZWRpYXRlIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDE0ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcihmbih4KSk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDIxID0gY3JlYXRlU3RyZWFtKCdtYXBFcnJvcnMnLCBtaXhpbiQxNCk7XG5cdHZhciBQJDE3ID0gY3JlYXRlUHJvcGVydHkoJ21hcEVycm9ycycsIG1peGluJDE0KTtcblxuXHR2YXIgaWQkNSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gbWFwRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDUgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMSwgUCQxNykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTUgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKGZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjIgPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlckVycm9ycycsIG1peGluJDE1KTtcblx0dmFyIFAkMTggPSBjcmVhdGVQcm9wZXJ0eSgnZmlsdGVyRXJyb3JzJywgbWl4aW4kMTUpO1xuXG5cdHZhciBpZCQ2ID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmaWx0ZXJFcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkNiA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDIyLCBQJDE4KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxNiA9IHtcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICgpIHt9XG5cdH07XG5cblx0dmFyIFMkMjMgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZVZhbHVlcycsIG1peGluJDE2KTtcblx0dmFyIFAkMTkgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlVmFsdWVzJywgbWl4aW4kMTYpO1xuXG5cdGZ1bmN0aW9uIGlnbm9yZVZhbHVlcyhvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMywgUCQxOSkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTcgPSB7XG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDI0ID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVFcnJvcnMnLCBtaXhpbiQxNyk7XG5cdHZhciBQJDIwID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZUVycm9ycycsIG1peGluJDE3KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVFcnJvcnMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjQsIFAkMjApKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE4ID0ge1xuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHt9XG5cdH07XG5cblx0dmFyIFMkMjUgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZUVuZCcsIG1peGluJDE4KTtcblx0dmFyIFAkMjEgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlRW5kJywgbWl4aW4kMTgpO1xuXG5cdGZ1bmN0aW9uIGlnbm9yZUVuZChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNSwgUCQyMSkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKCkpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyNiA9IGNyZWF0ZVN0cmVhbSgnYmVmb3JlRW5kJywgbWl4aW4kMTkpO1xuXHR2YXIgUCQyMiA9IGNyZWF0ZVByb3BlcnR5KCdiZWZvcmVFbmQnLCBtaXhpbiQxOSk7XG5cblx0ZnVuY3Rpb24gYmVmb3JlRW5kKG9icywgZm4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNiwgUCQyMikpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbWluID0gX3JlZi5taW47XG5cdCAgICB2YXIgbWF4ID0gX3JlZi5tYXg7XG5cblx0ICAgIHRoaXMuX21heCA9IG1heDtcblx0ICAgIHRoaXMuX21pbiA9IG1pbjtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBzbGlkZSh0aGlzLl9idWZmLCB4LCB0aGlzLl9tYXgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX21pbikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI3ID0gY3JlYXRlU3RyZWFtKCdzbGlkaW5nV2luZG93JywgbWl4aW4kMjApO1xuXHR2YXIgUCQyMyA9IGNyZWF0ZVByb3BlcnR5KCdzbGlkaW5nV2luZG93JywgbWl4aW4kMjApO1xuXG5cdGZ1bmN0aW9uIHNsaWRpbmdXaW5kb3cob2JzLCBtYXgpIHtcblx0ICB2YXIgbWluID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8gMCA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDI3LCBQJDIzKSkob2JzLCB7IG1pbjogbWluLCBtYXg6IG1heCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKCFmbih4KSkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjggPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldoaWxlJywgbWl4aW4kMjEpO1xuXHR2YXIgUCQyNCA9IGNyZWF0ZVByb3BlcnR5KCdidWZmZXJXaGlsZScsIG1peGluJDIxKTtcblxuXHR2YXIgaWQkNyA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gYnVmZmVyV2hpbGUob2JzLCBmbikge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyOCwgUCQyNCkpKG9icywgeyBmbjogZm4gfHwgaWQkNywgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fY291bnQgPSBjb3VudDtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9jb3VudCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjkgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhDb3VudCcsIG1peGluJDIyKTtcblx0dmFyIFAkMjUgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aENvdW50JywgbWl4aW4kMjIpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlJDEob2JzLCBjb3VudCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyOSwgUCQyNSkpKG9icywgeyBjb3VudDogY291bnQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9jb3VudCA9IGNvdW50O1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fZmx1c2goKTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fY291bnQpIHtcblx0ICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9LFxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTsgLy8gY29waWVkIGZyb20gcGF0dGVybnMvb25lLXNvdXJjZVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzAgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhUaW1lT3JDb3VudCcsIG1peGluJDIzKTtcblx0dmFyIFAkMjYgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aFRpbWVPckNvdW50JywgbWl4aW4kMjMpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldpdGhUaW1lT3JDb3VudChvYnMsIHdhaXQsIGNvdW50KSB7XG5cdCAgdmFyIF9yZWYyID0gYXJndW1lbnRzLmxlbmd0aCA8PSAzIHx8IGFyZ3VtZW50c1szXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbM107XG5cblx0ICB2YXIgX3JlZjIkZmx1c2hPbkVuZCA9IF9yZWYyLmZsdXNoT25FbmQ7XG5cdCAgdmFyIGZsdXNoT25FbmQgPSBfcmVmMiRmbHVzaE9uRW5kID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkZmx1c2hPbkVuZDtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDMwLCBQJDI2KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGNvdW50OiBjb3VudCwgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHhmb3JtRm9yT2JzKG9icykge1xuXHQgIHJldHVybiB7XG5cdCAgICAnQEB0cmFuc2R1Y2VyL3N0ZXAnOiBmdW5jdGlvbiAocmVzLCBpbnB1dCkge1xuXHQgICAgICBvYnMuX2VtaXRWYWx1ZShpbnB1dCk7XG5cdCAgICAgIHJldHVybiBudWxsO1xuXHQgICAgfSxcblx0ICAgICdAQHRyYW5zZHVjZXIvcmVzdWx0JzogZnVuY3Rpb24gKCkge1xuXHQgICAgICBvYnMuX2VtaXRFbmQoKTtcblx0ICAgICAgcmV0dXJuIG51bGw7XG5cdCAgICB9XG5cdCAgfTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB0cmFuc2R1Y2VyID0gX3JlZi50cmFuc2R1Y2VyO1xuXG5cdCAgICB0aGlzLl94Zm9ybSA9IHRyYW5zZHVjZXIoeGZvcm1Gb3JPYnModGhpcykpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hmb3JtID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3N0ZXAnXShudWxsLCB4KSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3Jlc3VsdCddKG51bGwpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9yZXN1bHQnXShudWxsKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzEgPSBjcmVhdGVTdHJlYW0oJ3RyYW5zZHVjZScsIG1peGluJDI0KTtcblx0dmFyIFAkMjcgPSBjcmVhdGVQcm9wZXJ0eSgndHJhbnNkdWNlJywgbWl4aW4kMjQpO1xuXG5cdGZ1bmN0aW9uIHRyYW5zZHVjZShvYnMsIHRyYW5zZHVjZXIpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMSwgUCQyNykpKG9icywgeyB0cmFuc2R1Y2VyOiB0cmFuc2R1Y2VyIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDI1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5faGFuZGxlciA9IGZuO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IGVtaXR0ZXIodGhpcyk7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5faGFuZGxlciA9IG51bGw7XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgdGhpcy5faGFuZGxlcih0aGlzLl9lbWl0dGVyLCBldmVudCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMyID0gY3JlYXRlU3RyZWFtKCd3aXRoSGFuZGxlcicsIG1peGluJDI1KTtcblx0dmFyIFAkMjggPSBjcmVhdGVQcm9wZXJ0eSgnd2l0aEhhbmRsZXInLCBtaXhpbiQyNSk7XG5cblx0ZnVuY3Rpb24gd2l0aEhhbmRsZXIob2JzLCBmbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDMyLCBQJDI4KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcblx0ICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcblx0fTtcblxuXHRmdW5jdGlvbiBaaXAoc291cmNlcywgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuXHQgIHRoaXMuX2J1ZmZlcnMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IGNsb25lQXJyYXkoc291cmNlKSA6IFtdO1xuXHQgIH0pO1xuXHQgIHRoaXMuX3NvdXJjZXMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IG5ldmVyKCkgOiBzb3VyY2U7XG5cdCAgfSk7XG5cblx0ICB0aGlzLl9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IHNwcmVhZChjb21iaW5hdG9yLCB0aGlzLl9zb3VyY2VzLmxlbmd0aCkgOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdCAgfTtcblx0ICB0aGlzLl9hbGl2ZUNvdW50ID0gMDtcblxuXHQgIHRoaXMuXyRoYW5kbGVycyA9IFtdO1xuXG5cdCAgdmFyIF9sb29wID0gZnVuY3Rpb24gKGkpIHtcblx0ICAgIF90aGlzLl8kaGFuZGxlcnMucHVzaChmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoaSwgZXZlbnQpO1xuXHQgICAgfSk7XG5cdCAgfTtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgX2xvb3AoaSk7XG5cdCAgfVxuXHR9XG5cblx0aW5oZXJpdChaaXAsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICd6aXAnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXG5cdCAgICAvLyBpZiBhbGwgc291cmNlcyBhcmUgYXJyYXlzXG5cdCAgICB3aGlsZSAodGhpcy5faXNGdWxsKCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgfVxuXG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fc291cmNlcy5sZW5ndGg7XG5cdCAgICB0aGlzLl9hbGl2ZUNvdW50ID0gbGVuZ3RoO1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGggJiYgdGhpcy5fYWN0aXZlOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vZmZBbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KHRoaXMuX2J1ZmZlcnMubGVuZ3RoKTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB2YWx1ZXNbaV0gPSB0aGlzLl9idWZmZXJzW2ldLnNoaWZ0KCk7XG5cdCAgICB9XG5cdCAgICB2YXIgY29tYmluYXRvciA9IHRoaXMuX2NvbWJpbmF0b3I7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXMpKTtcblx0ICB9LFxuXHQgIF9pc0Z1bGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICBpZiAodGhpcy5fYnVmZmVyc1tpXS5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICByZXR1cm4gZmFsc2U7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0cnVlO1xuXHQgIH0sXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGksIGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fYnVmZmVyc1tpXS5wdXNoKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgaWYgKHRoaXMuX2lzRnVsbCgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICBpZiAodGhpcy5fYWxpdmVDb3VudCA9PT0gMCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmZXJzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHppcChvYnNlcnZhYmxlcywgY29tYmluYXRvciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IFppcChvYnNlcnZhYmxlcywgY29tYmluYXRvcik7XG5cdH1cblxuXHR2YXIgaWQkOCA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gQWJzdHJhY3RQb29sKCkge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgdmFyIF9yZWYkcXVldWVMaW0gPSBfcmVmLnF1ZXVlTGltO1xuXHQgIHZhciBxdWV1ZUxpbSA9IF9yZWYkcXVldWVMaW0gPT09IHVuZGVmaW5lZCA/IDAgOiBfcmVmJHF1ZXVlTGltO1xuXHQgIHZhciBfcmVmJGNvbmN1ckxpbSA9IF9yZWYuY29uY3VyTGltO1xuXHQgIHZhciBjb25jdXJMaW0gPSBfcmVmJGNvbmN1ckxpbSA9PT0gdW5kZWZpbmVkID8gLTEgOiBfcmVmJGNvbmN1ckxpbTtcblx0ICB2YXIgX3JlZiRkcm9wID0gX3JlZi5kcm9wO1xuXHQgIHZhciBkcm9wID0gX3JlZiRkcm9wID09PSB1bmRlZmluZWQgPyAnbmV3JyA6IF9yZWYkZHJvcDtcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXG5cdCAgdGhpcy5fcXVldWVMaW0gPSBxdWV1ZUxpbSA8IDAgPyAtMSA6IHF1ZXVlTGltO1xuXHQgIHRoaXMuX2NvbmN1ckxpbSA9IGNvbmN1ckxpbSA8IDAgPyAtMSA6IGNvbmN1ckxpbTtcblx0ICB0aGlzLl9kcm9wID0gZHJvcDtcblx0ICB0aGlzLl9xdWV1ZSA9IFtdO1xuXHQgIHRoaXMuX2N1clNvdXJjZXMgPSBbXTtcblx0ICB0aGlzLl8kaGFuZGxlU3ViQW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVN1YkFueShldmVudCk7XG5cdCAgfTtcblx0ICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBbXTtcblx0ICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXG5cdCAgaWYgKHRoaXMuX2NvbmN1ckxpbSA9PT0gMCkge1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQWJzdHJhY3RQb29sLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnYWJzdHJhY3RQb29sJyxcblxuXHQgIF9hZGQ6IGZ1bmN0aW9uIChvYmosIHRvT2JzIC8qIEZ1bmN0aW9uIHwgZmFsc2V5ICovKSB7XG5cdCAgICB0b09icyA9IHRvT2JzIHx8IGlkJDg7XG5cdCAgICBpZiAodGhpcy5fY29uY3VyTGltID09PSAtMSB8fCB0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA8IHRoaXMuX2NvbmN1ckxpbSkge1xuXHQgICAgICB0aGlzLl9hZGRUb0N1cih0b09icyhvYmopKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGlmICh0aGlzLl9xdWV1ZUxpbSA9PT0gLTEgfHwgdGhpcy5fcXVldWUubGVuZ3RoIDwgdGhpcy5fcXVldWVMaW0pIHtcblx0ICAgICAgICB0aGlzLl9hZGRUb1F1ZXVlKHRvT2JzKG9iaikpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX2Ryb3AgPT09ICdvbGQnKSB7XG5cdCAgICAgICAgdGhpcy5fcmVtb3ZlT2xkZXN0KCk7XG5cdCAgICAgICAgdGhpcy5fYWRkKG9iaiwgdG9PYnMpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfYWRkQWxsOiBmdW5jdGlvbiAob2Jzcykge1xuXHQgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cblx0ICAgIGZvckVhY2gob2JzcywgZnVuY3Rpb24gKG9icykge1xuXHQgICAgICByZXR1cm4gX3RoaXMyLl9hZGQob2JzKTtcblx0ICAgIH0pO1xuXHQgIH0sXG5cdCAgX3JlbW92ZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgaWYgKHRoaXMuX3JlbW92ZUN1cihvYnMpID09PSAtMSkge1xuXHQgICAgICB0aGlzLl9yZW1vdmVRdWV1ZShvYnMpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2FkZFRvUXVldWU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX3F1ZXVlID0gY29uY2F0KHRoaXMuX3F1ZXVlLCBbb2JzXSk7XG5cdCAgfSxcblx0ICBfYWRkVG9DdXI6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblxuXHQgICAgICAvLyBIQUNLOlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBXZSBoYXZlIHR3byBvcHRpbWl6YXRpb25zIGZvciBjYXNlcyB3aGVuIGBvYnNgIGlzIGVuZGVkLiBXZSBkb24ndCB3YW50XG5cdCAgICAgIC8vIHRvIGFkZCBzdWNoIG9ic2VydmFibGUgdG8gdGhlIGxpc3QsIGJ1dCBvbmx5IHdhbnQgdG8gZW1pdCBldmVudHNcblx0ICAgICAgLy8gZnJvbSBpdCAoaWYgaXQgaGFzIHNvbWUpLlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBJbnN0ZWFkIG9mIHRoaXMgaGFja3MsIHdlIGNvdWxkIGp1c3QgZGlkIGZvbGxvd2luZyxcblx0ICAgICAgLy8gYnV0IGl0IHdvdWxkIGJlIDUtOCB0aW1lcyBzbG93ZXI6XG5cdCAgICAgIC8vXG5cdCAgICAgIC8vICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgICAgLy8gICAgIHRoaXMuX3N1YnNjcmliZShvYnMpO1xuXHQgICAgICAvL1xuXG5cdCAgICAgIC8vICMxXG5cdCAgICAgIC8vIFRoaXMgb25lIGZvciBjYXNlcyB3aGVuIGBvYnNgIGFscmVhZHkgZW5kZWRcblx0ICAgICAgLy8gZS5nLiwgS2VmaXIuY29uc3RhbnQoKSBvciBLZWZpci5uZXZlcigpXG5cdCAgICAgIGlmICghb2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIGlmIChvYnMuX2N1cnJlbnRFdmVudCkge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdChvYnMuX2N1cnJlbnRFdmVudC50eXBlLCBvYnMuX2N1cnJlbnRFdmVudC52YWx1ZSk7XG5cdCAgICAgICAgfVxuXHQgICAgICAgIHJldHVybjtcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vICMyXG5cdCAgICAgIC8vIFRoaXMgb25lIGlzIGZvciBjYXNlcyB3aGVuIGBvYnNgIGdvaW5nIHRvIGVuZCBzeW5jaHJvbm91c2x5IG9uXG5cdCAgICAgIC8vIGZpcnN0IHN1YnNjcmliZXIgZS5nLiwgS2VmaXIuc3RyZWFtKGVtID0+IHtlbS5lbWl0KDEpOyBlbS5lbmQoKX0pXG5cdCAgICAgIHRoaXMuX2N1cnJlbnRseUFkZGluZyA9IG9icztcblx0ICAgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXHQgICAgICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXHQgICAgICBpZiAob2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2N1clNvdXJjZXMgPSBjb25jYXQodGhpcy5fY3VyU291cmNlcywgW29ic10pO1xuXHQgICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9zdWJUb0VuZDogZnVuY3Rpb24gKG9icykge1xuXHQgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cblx0ICAgIHZhciBvbkVuZCA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzMy5fcmVtb3ZlQ3VyKG9icyk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fJGVuZEhhbmRsZXJzLnB1c2goeyBvYnM6IG9icywgaGFuZGxlcjogb25FbmQgfSk7XG5cdCAgICBvYnMub25FbmQob25FbmQpO1xuXHQgIH0sXG5cdCAgX3N1YnNjcmliZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXG5cdCAgICAvLyBpdCBjYW4gYmVjb21lIGluYWN0aXZlIGluIHJlc3BvbmNlIG9mIHN1YnNjcmliaW5nIHRvIGBvYnMub25BbnlgIGFib3ZlXG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIG9icy5vZmZBbnkodGhpcy5fJGhhbmRsZVN1YkFueSk7XG5cblx0ICAgIHZhciBvbkVuZEkgPSBmaW5kQnlQcmVkKHRoaXMuXyRlbmRIYW5kbGVycywgZnVuY3Rpb24gKG9iaikge1xuXHQgICAgICByZXR1cm4gb2JqLm9icyA9PT0gb2JzO1xuXHQgICAgfSk7XG5cdCAgICBpZiAob25FbmRJICE9PSAtMSkge1xuXHQgICAgICBvYnMub2ZmRW5kKHRoaXMuXyRlbmRIYW5kbGVyc1tvbkVuZEldLmhhbmRsZXIpO1xuXHQgICAgICB0aGlzLl8kZW5kSGFuZGxlcnMuc3BsaWNlKG9uRW5kSSwgMSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU3ViQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3JlbW92ZVF1ZXVlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kKHRoaXMuX3F1ZXVlLCBvYnMpO1xuXHQgICAgdGhpcy5fcXVldWUgPSByZW1vdmUodGhpcy5fcXVldWUsIGluZGV4KTtcblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXHQgIF9yZW1vdmVDdXI6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUob2JzKTtcblx0ICAgIH1cblx0ICAgIHZhciBpbmRleCA9IGZpbmQodGhpcy5fY3VyU291cmNlcywgb2JzKTtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSByZW1vdmUodGhpcy5fY3VyU291cmNlcywgaW5kZXgpO1xuXHQgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuXHQgICAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fcHVsbFF1ZXVlKCk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyU291cmNlcy5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9vbkVtcHR5KCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXHQgIF9yZW1vdmVPbGRlc3Q6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3JlbW92ZUN1cih0aGlzLl9jdXJTb3VyY2VzWzBdKTtcblx0ICB9LFxuXHQgIF9wdWxsUXVldWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9xdWV1ZS5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fcXVldWUgPSBjbG9uZUFycmF5KHRoaXMuX3F1ZXVlKTtcblx0ICAgICAgdGhpcy5fYWRkVG9DdXIodGhpcy5fcXVldWUuc2hpZnQoKSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc291cmNlcyA9IHRoaXMuX2N1clNvdXJjZXM7IGkgPCBzb3VyY2VzLmxlbmd0aCAmJiB0aGlzLl9hY3RpdmU7IGkrKykge1xuXHQgICAgICB0aGlzLl9zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwLCBzb3VyY2VzID0gdGhpcy5fY3VyU291cmNlczsgaSA8IHNvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudGx5QWRkaW5nICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKHRoaXMuX2N1cnJlbnRseUFkZGluZyk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaXNFbXB0eTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoID09PSAwO1xuXHQgIH0sXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3F1ZXVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZVN1YkFueSA9IG51bGw7XG5cdCAgICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gTWVyZ2Uoc291cmNlcykge1xuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2FkZEFsbChzb3VyY2VzKTtcblx0ICB0aGlzLl9pbml0aWFsaXNlZCA9IHRydWU7XG5cdH1cblxuXHRpbmhlcml0KE1lcmdlLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9uYW1lOiAnbWVyZ2UnLFxuXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9pbml0aWFsaXNlZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBtZXJnZShvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IE1lcmdlKG9ic2VydmFibGVzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIFMkMzMoZ2VuZXJhdG9yKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2dlbmVyYXRvciA9IGdlbmVyYXRvcjtcblx0ICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgIHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cdCAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KFMkMzMsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdyZXBlYXQnLFxuXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2dldFNvdXJjZSgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdChldmVudC50eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZ2V0U291cmNlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2luTG9vcCkge1xuXHQgICAgICB0aGlzLl9pbkxvb3AgPSB0cnVlO1xuXHQgICAgICB2YXIgZ2VuZXJhdG9yID0gdGhpcy5fZ2VuZXJhdG9yO1xuXHQgICAgICB3aGlsZSAodGhpcy5fc291cmNlID09PSBudWxsICYmIHRoaXMuX2FsaXZlICYmIHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3NvdXJjZSA9IGdlbmVyYXRvcih0aGlzLl9pdGVyYXRpb24rKyk7XG5cdCAgICAgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9nZXRTb3VyY2UoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZ2VuZXJhdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHJlcGVhdCAoZ2VuZXJhdG9yKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDMzKGdlbmVyYXRvcik7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25jYXQkMShvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiByZXBlYXQoZnVuY3Rpb24gKGluZGV4KSB7XG5cdCAgICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID4gaW5kZXggPyBvYnNlcnZhYmxlc1tpbmRleF0gOiBmYWxzZTtcblx0ICB9KS5zZXROYW1lKCdjb25jYXQnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIFBvb2woKSB7XG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFBvb2wsIEFic3RyYWN0UG9vbCwge1xuXG5cdCAgX25hbWU6ICdwb29sJyxcblxuXHQgIHBsdWc6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX2FkZChvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICB1bnBsdWc6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX3JlbW92ZShvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBGbGF0TWFwKHNvdXJjZSwgZm4sIG9wdGlvbnMpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdCAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgIHRoaXMuX2ZuID0gZm47XG5cdCAgdGhpcy5fbWFpbkVuZGVkID0gZmFsc2U7XG5cdCAgdGhpcy5fbGFzdEN1cnJlbnQgPSBudWxsO1xuXHQgIHRoaXMuXyRoYW5kbGVNYWluID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZU1haW4oZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KEZsYXRNYXAsIEFic3RyYWN0UG9vbCwge1xuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIEFic3RyYWN0UG9vbC5wcm90b3R5cGUuX29uQWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZU1haW4pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9vbkRlYWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlTWFpbik7XG5cdCAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IHRydWU7XG5cdCAgfSxcblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICAvLyBJcyBsYXRlc3QgdmFsdWUgYmVmb3JlIGRlYWN0aXZhdGlvbiBzdXJ2aXZlZCwgYW5kIG5vdyBpcyAnY3VycmVudCcgb24gdGhpcyBhY3RpdmF0aW9uP1xuXHQgICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGhhbmRsZSBzdWNoIHZhbHVlcywgdG8gcHJldmVudCB0byBjb25zdGFudGx5IGFkZFxuXHQgICAgICAvLyBzYW1lIG9ic2VydmFsZSBvbiBlYWNoIGFjdGl2YXRpb24vZGVhY3RpdmF0aW9uIHdoZW4gb3VyIG1haW4gc291cmNlXG5cdCAgICAgIC8vIGlzIGEgYEtlZmlyLmNvbmF0YW50KClgIGZvciBleGFtcGxlLlxuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9tYWluRW5kZWQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVNYWluID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIEZsYXRNYXBFcnJvcnMoc291cmNlLCBmbikge1xuXHQgIEZsYXRNYXAuY2FsbCh0aGlzLCBzb3VyY2UsIGZuKTtcblx0fVxuXG5cdGluaGVyaXQoRmxhdE1hcEVycm9ycywgRmxhdE1hcCwge1xuXG5cdCAgLy8gU2FtZSBhcyBpbiBGbGF0TWFwLCBvbmx5IFZBTFVFL0VSUk9SIGZsaXBwZWRcblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29uc3RydWN0b3IkMShCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fcHJpbWFyeSA9IHByaW1hcnk7XG5cdCAgICB0aGlzLl9zZWNvbmRhcnkgPSBzZWNvbmRhcnk7XG5cdCAgICB0aGlzLl9uYW1lID0gcHJpbWFyeS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0gTk9USElORztcblx0ICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVTZWNvbmRhcnlBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlUHJpbWFyeUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ2xhc3NNZXRob2RzJDEoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblx0ICAgIF9pbml0OiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IHg7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeUVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5QW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgICAgdGhpcy5fcmVtb3ZlU2Vjb25kYXJ5KCk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfcmVtb3ZlU2Vjb25kYXJ5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBudWxsO1xuXHQgICAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub25BbnkodGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3ByaW1hcnkub25BbnkodGhpcy5fJGhhbmRsZVByaW1hcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3ByaW1hcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgQmFzZUNsYXNzLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fcHJpbWFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZVByaW1hcnlBbnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVN0cmVhbSQxKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFMgPSBjcmVhdGVDb25zdHJ1Y3RvciQxKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKFN0cmVhbSksIG1peGluKTtcblx0ICByZXR1cm4gUztcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVByb3BlcnR5JDEobmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUCA9IGNyZWF0ZUNvbnN0cnVjdG9yJDEoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKFByb3BlcnR5KSwgbWl4aW4pO1xuXHQgIHJldHVybiBQO1xuXHR9XG5cblx0dmFyIG1peGluJDI2ID0ge1xuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORyAmJiB0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ID09PSBOT1RISU5HIHx8ICF0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzQgPSBjcmVhdGVTdHJlYW0kMSgnZmlsdGVyQnknLCBtaXhpbiQyNik7XG5cdHZhciBQJDI5ID0gY3JlYXRlUHJvcGVydHkkMSgnZmlsdGVyQnknLCBtaXhpbiQyNik7XG5cblx0ZnVuY3Rpb24gZmlsdGVyQnkocHJpbWFyeSwgc2Vjb25kYXJ5KSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTJDM0LCBQJDI5KSkocHJpbWFyeSwgc2Vjb25kYXJ5KTtcblx0fVxuXG5cdHZhciBpZDIgPSBmdW5jdGlvbiAoXywgeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNhbXBsZWRCeShwYXNzaXZlLCBhY3RpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gZnVuY3Rpb24gKGEsIGIpIHtcblx0ICAgIHJldHVybiBjb21iaW5hdG9yKGIsIGEpO1xuXHQgIH0gOiBpZDI7XG5cdCAgcmV0dXJuIGNvbWJpbmUoW2FjdGl2ZV0sIFtwYXNzaXZlXSwgX2NvbWJpbmF0b3IpLnNldE5hbWUocGFzc2l2ZSwgJ3NhbXBsZWRCeScpO1xuXHR9XG5cblx0dmFyIG1peGluJDI3ID0ge1xuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM1ID0gY3JlYXRlU3RyZWFtJDEoJ3NraXBVbnRpbEJ5JywgbWl4aW4kMjcpO1xuXHR2YXIgUCQzMCA9IGNyZWF0ZVByb3BlcnR5JDEoJ3NraXBVbnRpbEJ5JywgbWl4aW4kMjcpO1xuXG5cdGZ1bmN0aW9uIHNraXBVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNSwgUCQzMCkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjggPSB7XG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM2ID0gY3JlYXRlU3RyZWFtJDEoJ3Rha2VVbnRpbEJ5JywgbWl4aW4kMjgpO1xuXHR2YXIgUCQzMSA9IGNyZWF0ZVByb3BlcnR5JDEoJ3Rha2VVbnRpbEJ5JywgbWl4aW4kMjgpO1xuXG5cdGZ1bmN0aW9uIHRha2VVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNiwgUCQzMSkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9wcmltYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSAmJiB0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZmx1c2goKTtcblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM3ID0gY3JlYXRlU3RyZWFtJDEoJ2J1ZmZlckJ5JywgbWl4aW4kMjkpO1xuXHR2YXIgUCQzMiA9IGNyZWF0ZVByb3BlcnR5JDEoJ2J1ZmZlckJ5JywgbWl4aW4kMjkpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlckJ5KHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyAvKiBvcHRpb25hbCAqLykge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNywgUCQzMikpKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblx0ICAgIHZhciBfcmVmJGZsdXNoT25DaGFuZ2UgPSBfcmVmLmZsdXNoT25DaGFuZ2U7XG5cdCAgICB2YXIgZmx1c2hPbkNoYW5nZSA9IF9yZWYkZmx1c2hPbkNoYW5nZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBfcmVmJGZsdXNoT25DaGFuZ2U7XG5cblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fZmx1c2hPbkNoYW5nZSA9IGZsdXNoT25DaGFuZ2U7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcgJiYgIXRoaXMuX2xhc3RTZWNvbmRhcnkpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCAmJiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORyB8fCB0aGlzLl9sYXN0U2Vjb25kYXJ5KSkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkNoYW5nZSAmJiAheCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXG5cdCAgICAvLyBmcm9tIGRlZmF1bHQgX2hhbmRsZVNlY29uZGFyeVZhbHVlXG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0geDtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzggPSBjcmVhdGVTdHJlYW0kMSgnYnVmZmVyV2hpbGVCeScsIG1peGluJDMwKTtcblx0dmFyIFAkMzMgPSBjcmVhdGVQcm9wZXJ0eSQxKCdidWZmZXJXaGlsZUJ5JywgbWl4aW4kMzApO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlQnkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zIC8qIG9wdGlvbmFsICovKSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTJDM4LCBQJDMzKSkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdHZhciBmID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBmYWxzZTtcblx0fTtcblx0dmFyIHQgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIHRydWU7XG5cdH07XG5cblx0ZnVuY3Rpb24gYXdhaXRpbmcoYSwgYikge1xuXHQgIHZhciByZXN1bHQgPSBtZXJnZShbbWFwJDEoYSwgdCksIG1hcCQxKGIsIGYpXSk7XG5cdCAgcmVzdWx0ID0gc2tpcER1cGxpY2F0ZXMocmVzdWx0KTtcblx0ICByZXN1bHQgPSB0b1Byb3BlcnR5KHJlc3VsdCwgZik7XG5cdCAgcmV0dXJuIHJlc3VsdC5zZXROYW1lKGEsICdhd2FpdGluZycpO1xuXHR9XG5cblx0dmFyIG1peGluJDMxID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciByZXN1bHQgPSBmbih4KTtcblx0ICAgIGlmIChyZXN1bHQuY29udmVydCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IocmVzdWx0LmVycm9yKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzkgPSBjcmVhdGVTdHJlYW0oJ3ZhbHVlc1RvRXJyb3JzJywgbWl4aW4kMzEpO1xuXHR2YXIgUCQzNCA9IGNyZWF0ZVByb3BlcnR5KCd2YWx1ZXNUb0Vycm9ycycsIG1peGluJDMxKTtcblxuXHR2YXIgZGVmRm4gPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB7IGNvbnZlcnQ6IHRydWUsIGVycm9yOiB4IH07XG5cdH07XG5cblx0ZnVuY3Rpb24gdmFsdWVzVG9FcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZGVmRm4gOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzOSwgUCQzNCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHJlc3VsdCA9IGZuKHgpO1xuXHQgICAgaWYgKHJlc3VsdC5jb252ZXJ0KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShyZXN1bHQudmFsdWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ0MCA9IGNyZWF0ZVN0cmVhbSgnZXJyb3JzVG9WYWx1ZXMnLCBtaXhpbiQzMik7XG5cdHZhciBQJDM1ID0gY3JlYXRlUHJvcGVydHkoJ2Vycm9yc1RvVmFsdWVzJywgbWl4aW4kMzIpO1xuXG5cdHZhciBkZWZGbiQxID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geyBjb252ZXJ0OiB0cnVlLCB2YWx1ZTogeCB9O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGVycm9yc1RvVmFsdWVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGRlZkZuJDEgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ0MCwgUCQzNSkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzMgPSB7XG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ0MSA9IGNyZWF0ZVN0cmVhbSgnZW5kT25FcnJvcicsIG1peGluJDMzKTtcblx0dmFyIFAkMzYgPSBjcmVhdGVQcm9wZXJ0eSgnZW5kT25FcnJvcicsIG1peGluJDMzKTtcblxuXHRmdW5jdGlvbiBlbmRPbkVycm9yKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDQxLCBQJDM2KSkob2JzKTtcblx0fVxuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvUHJvcGVydHkgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gdG9Qcm9wZXJ0eSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY2hhbmdlcyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gY2hhbmdlcyh0aGlzKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1Byb21pc2UgPSBmdW5jdGlvbiAoUHJvbWlzZSkge1xuXHQgIHJldHVybiB0b1Byb21pc2UodGhpcywgUHJvbWlzZSk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9FU09ic2VydmFibGUgPSB0b0VTT2JzZXJ2YWJsZTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGVbJCRvYnNlcnZhYmxlXSA9IHRvRVNPYnNlcnZhYmxlO1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBtYXAkMSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlcih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZSA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2UodGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZUVycm9ycyA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2VFcnJvcnModGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZVdoaWxlID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHRha2VXaGlsZSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubGFzdCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbGFzdCh0aGlzKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwID0gZnVuY3Rpb24gKG4pIHtcblx0ICByZXR1cm4gc2tpcCh0aGlzLCBuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwV2hpbGUgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gc2tpcFdoaWxlKHRoaXMsIGZuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwRHVwbGljYXRlcyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBza2lwRHVwbGljYXRlcyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uIChmbiwgc2VlZCkge1xuXHQgIHJldHVybiBkaWZmKHRoaXMsIGZuLCBzZWVkKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5zY2FuID0gZnVuY3Rpb24gKGZuLCBzZWVkKSB7XG5cdCAgcmV0dXJuIHNjYW4odGhpcywgZm4sIHNlZWQpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXR0ZW4gPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gZmxhdHRlbih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbiAod2FpdCkge1xuXHQgIHJldHVybiBkZWxheSh0aGlzLCB3YWl0KTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50aHJvdHRsZSA9IGZ1bmN0aW9uICh3YWl0LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIHRocm90dGxlKHRoaXMsIHdhaXQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRlYm91bmNlID0gZnVuY3Rpb24gKHdhaXQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gZGVib3VuY2UodGhpcywgd2FpdCwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWFwRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG1hcEVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlckVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVWYWx1ZXModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRXJyb3JzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFcnJvcnModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRW5kID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFbmQodGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYmVmb3JlRW5kID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGJlZm9yZUVuZCh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2xpZGluZ1dpbmRvdyA9IGZ1bmN0aW9uIChtYXgsIG1pbikge1xuXHQgIHJldHVybiBzbGlkaW5nV2luZG93KHRoaXMsIG1heCwgbWluKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaGlsZSA9IGZ1bmN0aW9uIChmbiwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZSh0aGlzLCBmbiwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2l0aENvdW50ID0gZnVuY3Rpb24gKGNvdW50LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGJ1ZmZlcldoaWxlJDEodGhpcywgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldpdGhUaW1lT3JDb3VudCA9IGZ1bmN0aW9uICh3YWl0LCBjb3VudCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaXRoVGltZU9yQ291bnQodGhpcywgd2FpdCwgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRyYW5zZHVjZSA9IGZ1bmN0aW9uICh0cmFuc2R1Y2VyKSB7XG5cdCAgcmV0dXJuIHRyYW5zZHVjZSh0aGlzLCB0cmFuc2R1Y2VyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS53aXRoSGFuZGxlciA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB3aXRoSGFuZGxlcih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29tYmluZSA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiBjb21iaW5lKFt0aGlzLCBvdGhlcl0sIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnppcCA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiB6aXAoW3RoaXMsIG90aGVyXSwgY29tYmluYXRvcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWVyZ2UgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gbWVyZ2UoW3RoaXMsIG90aGVyXSk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIGNvbmNhdCQxKFt0aGlzLCBvdGhlcl0pO1xuXHR9O1xuXG5cdHZhciBwb29sID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBuZXcgUG9vbCgpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXAgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXAnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcExhdGVzdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBjb25jdXJMaW06IDEsIGRyb3A6ICdvbGQnIH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBMYXRlc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcEZpcnN0ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwRmlyc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcENvbmNhdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBxdWV1ZUxpbTogLTEsIGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwQ29uY2F0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBDb25jdXJMaW1pdCA9IGZ1bmN0aW9uIChmbiwgbGltaXQpIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgcXVldWVMaW06IC0xLCBjb25jdXJMaW06IGxpbWl0IH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBDb25jdXJMaW1pdCcpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBFcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXBFcnJvcnModGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBFcnJvcnMnKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5maWx0ZXJCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBmaWx0ZXJCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2FtcGxlZEJ5ID0gZnVuY3Rpb24gKG90aGVyLCBjb21iaW5hdG9yKSB7XG5cdCAgcmV0dXJuIHNhbXBsZWRCeSh0aGlzLCBvdGhlciwgY29tYmluYXRvcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcFVudGlsQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gc2tpcFVudGlsQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VVbnRpbEJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIHRha2VVbnRpbEJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJCeSh0aGlzLCBvdGhlciwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2hpbGVCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZUJ5KHRoaXMsIG90aGVyLCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyBEZXByZWNhdGVkXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIERFUFJFQ0FUSU9OX1dBUk5JTkdTID0gdHJ1ZTtcblx0ZnVuY3Rpb24gZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzKCkge1xuXHQgIERFUFJFQ0FUSU9OX1dBUk5JTkdTID0gZmFsc2U7XG5cdH1cblxuXHRmdW5jdGlvbiB3YXJuKG1zZykge1xuXHQgIGlmIChERVBSRUNBVElPTl9XQVJOSU5HUyAmJiBjb25zb2xlICYmIHR5cGVvZiBjb25zb2xlLndhcm4gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHZhciBtc2cyID0gJ1xcbkhlcmUgaXMgYW4gRXJyb3Igb2JqZWN0IGZvciB5b3UgY29udGFpbmluZyB0aGUgY2FsbCBzdGFjazonO1xuXHQgICAgY29uc29sZS53YXJuKG1zZywgbXNnMiwgbmV3IEVycm9yKCkpO1xuXHQgIH1cblx0fVxuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmF3YWl0aW5nID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5hd2FpdGluZygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ1Jyk7XG5cdCAgcmV0dXJuIGF3YWl0aW5nKHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS52YWx1ZXNUb0Vycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAudmFsdWVzVG9FcnJvcnMoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0OScpO1xuXHQgIHJldHVybiB2YWx1ZXNUb0Vycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZXJyb3JzVG9WYWx1ZXMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLmVycm9yc1RvVmFsdWVzKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDknKTtcblx0ICByZXR1cm4gZXJyb3JzVG9WYWx1ZXModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmVuZE9uRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5lbmRPbkVycm9yKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNTAnKTtcblx0ICByZXR1cm4gZW5kT25FcnJvcih0aGlzKTtcblx0fTtcblxuXHQvLyBFeHBvcnRzXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIEtlZmlyID0geyBPYnNlcnZhYmxlOiBPYnNlcnZhYmxlLCBTdHJlYW06IFN0cmVhbSwgUHJvcGVydHk6IFByb3BlcnR5LCBuZXZlcjogbmV2ZXIsIGxhdGVyOiBsYXRlciwgaW50ZXJ2YWw6IGludGVydmFsLCBzZXF1ZW50aWFsbHk6IHNlcXVlbnRpYWxseSxcblx0ICBmcm9tUG9sbDogZnJvbVBvbGwsIHdpdGhJbnRlcnZhbDogd2l0aEludGVydmFsLCBmcm9tQ2FsbGJhY2s6IGZyb21DYWxsYmFjaywgZnJvbU5vZGVDYWxsYmFjazogZnJvbU5vZGVDYWxsYmFjaywgZnJvbUV2ZW50czogZnJvbUV2ZW50cywgc3RyZWFtOiBzdHJlYW0sXG5cdCAgY29uc3RhbnQ6IGNvbnN0YW50LCBjb25zdGFudEVycm9yOiBjb25zdGFudEVycm9yLCBmcm9tUHJvbWlzZTogZnJvbVByb21pc2UsIGZyb21FU09ic2VydmFibGU6IGZyb21FU09ic2VydmFibGUsIGNvbWJpbmU6IGNvbWJpbmUsIHppcDogemlwLCBtZXJnZTogbWVyZ2UsXG5cdCAgY29uY2F0OiBjb25jYXQkMSwgUG9vbDogUG9vbCwgcG9vbDogcG9vbCwgcmVwZWF0OiByZXBlYXQsIHN0YXRpY0xhbmQ6IHN0YXRpY0xhbmQgfTtcblxuXHRLZWZpci5LZWZpciA9IEtlZmlyO1xuXG5cdGV4cG9ydHMuZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzID0gZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzO1xuXHRleHBvcnRzLktlZmlyID0gS2VmaXI7XG5cdGV4cG9ydHMuT2JzZXJ2YWJsZSA9IE9ic2VydmFibGU7XG5cdGV4cG9ydHMuU3RyZWFtID0gU3RyZWFtO1xuXHRleHBvcnRzLlByb3BlcnR5ID0gUHJvcGVydHk7XG5cdGV4cG9ydHMubmV2ZXIgPSBuZXZlcjtcblx0ZXhwb3J0cy5sYXRlciA9IGxhdGVyO1xuXHRleHBvcnRzLmludGVydmFsID0gaW50ZXJ2YWw7XG5cdGV4cG9ydHMuc2VxdWVudGlhbGx5ID0gc2VxdWVudGlhbGx5O1xuXHRleHBvcnRzLmZyb21Qb2xsID0gZnJvbVBvbGw7XG5cdGV4cG9ydHMud2l0aEludGVydmFsID0gd2l0aEludGVydmFsO1xuXHRleHBvcnRzLmZyb21DYWxsYmFjayA9IGZyb21DYWxsYmFjaztcblx0ZXhwb3J0cy5mcm9tTm9kZUNhbGxiYWNrID0gZnJvbU5vZGVDYWxsYmFjaztcblx0ZXhwb3J0cy5mcm9tRXZlbnRzID0gZnJvbUV2ZW50cztcblx0ZXhwb3J0cy5zdHJlYW0gPSBzdHJlYW07XG5cdGV4cG9ydHMuY29uc3RhbnQgPSBjb25zdGFudDtcblx0ZXhwb3J0cy5jb25zdGFudEVycm9yID0gY29uc3RhbnRFcnJvcjtcblx0ZXhwb3J0cy5mcm9tUHJvbWlzZSA9IGZyb21Qcm9taXNlO1xuXHRleHBvcnRzLmZyb21FU09ic2VydmFibGUgPSBmcm9tRVNPYnNlcnZhYmxlO1xuXHRleHBvcnRzLmNvbWJpbmUgPSBjb21iaW5lO1xuXHRleHBvcnRzLnppcCA9IHppcDtcblx0ZXhwb3J0cy5tZXJnZSA9IG1lcmdlO1xuXHRleHBvcnRzLmNvbmNhdCA9IGNvbmNhdCQxO1xuXHRleHBvcnRzLlBvb2wgPSBQb29sO1xuXHRleHBvcnRzLnBvb2wgPSBwb29sO1xuXHRleHBvcnRzLnJlcGVhdCA9IHJlcGVhdDtcblx0ZXhwb3J0cy5zdGF0aWNMYW5kID0gc3RhdGljTGFuZDtcblx0ZXhwb3J0c1snZGVmYXVsdCddID0gS2VmaXI7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpOyIsImltcG9ydCBzbmFiYmRvbSBmcm9tICdzbmFiYmRvbS9zbmFiYmRvbS5qcydcbmltcG9ydCBoIGZyb20gJ3NuYWJiZG9tL2guanMnXG5pbXBvcnQgc25hYkNsYXNzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvY2xhc3MuanMnXG5pbXBvcnQgc25hYlByb3BzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvcHJvcHMuanMnXG5pbXBvcnQgc25hYlN0eWxlIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMnXG5pbXBvcnQgc25hYkV2ZW50IGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvZXZlbnRsaXN0ZW5lcnMuanMnXG5pbXBvcnQgS2VmaXIgZnJvbSAna2VmaXInXG5cbmV4cG9ydCBmdW5jdGlvbiBidXMoKSB7XG4gIGxldCBlbWl0dGVyXG4gIGxldCBzdHJlYW0gPSBLZWZpci5zdHJlYW0oX2VtaXR0ZXIgPT4ge1xuICAgIGVtaXR0ZXIgPSBfZW1pdHRlclxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGVtaXR0ZXIgPSBudWxsXG4gICAgfVxuICB9KVxuICBzdHJlYW0uZW1pdCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBlbWl0dGVyICYmIGVtaXR0ZXIuZW1pdCh4KVxuICB9XG4gIHJldHVybiBzdHJlYW1cbn1cblxuZnVuY3Rpb24gY29udmVydFRvSHlwZXJTY3JpcHQobm9kZSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgIGxldCBbc2VsLCBkYXRhLCBjaGlsZHJlbl0gPSBub2RlXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgIHJldHVybiBoKHNlbCwgZGF0YSwgY2hpbGRyZW4ubWFwKGNvbnZlcnRUb0h5cGVyU2NyaXB0KSlcbiAgICB9XG4gICAgcmV0dXJuIGguYXBwbHkobnVsbCwgbm9kZSlcbiAgfVxuICByZXR1cm4gbm9kZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHZpZXckLCBjb250YWluZXIpIHtcbiAgbGV0IHBhdGNoID0gc25hYmJkb20uaW5pdChbc25hYkNsYXNzLCBzbmFiUHJvcHMsIHNuYWJTdHlsZSwgc25hYkV2ZW50XSlcbiAgbGV0IHZub2RlID0gY29udGFpbmVyXG5cbiAgdmlldyRcbiAgICAubWFwKGNvbnZlcnRUb0h5cGVyU2NyaXB0KVxuICAgIC5vblZhbHVlKG5ld1Zub2RlID0+IHtcbiAgICAgIHBhdGNoKHZub2RlLCBuZXdWbm9kZSlcbiAgICAgIHZub2RlID0gbmV3Vm5vZGVcbiAgICB9KVxufVxuIiwiaW1wb3J0IHsgYnVzLCByZW5kZXIgfSBmcm9tICcuLi8uLi9zcmMvaW5kZXguanMnXG5pbXBvcnQgS2VmaXIgZnJvbSAna2VmaXInXG5cbi8vIFN0cmVhbXNcbmxldCBhY3Rpb25zJCA9IGJ1cygpXG5cbi8vIE1vZGVsXG5mdW5jdGlvbiBnZXRGcm9tU3RvcmFnZSgpIHtcbiAgbGV0IGpzb24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndG9kb3MtbXV2anMnKVxuICBpZiAoanNvbikge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGpzb24pXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RmlsdGVyRnJvbUhhc2goKSB7XG4gIGxldCBoYXNoID0gbG9jYXRpb24uaGFzaFxuICBsZXQgZmlsdGVyXG5cbiAgaWYgKGhhc2gpIHtcbiAgICBmaWx0ZXIgPSBoYXNoLnNsaWNlKDIpXG4gIH1cbiAgcmV0dXJuICFmaWx0ZXIgPyAnYWxsJyA6IGZpbHRlclxufVxuXG5sZXQgaW5pdE1vZGVsID0gZ2V0RnJvbVN0b3JhZ2UoKSB8fFxuICB7aXRlbXM6IFtdLCBhbGxDb21wbGV0ZWQ6IGZhbHNlLCBmaWx0ZXI6IGdldEZpbHRlckZyb21IYXNoKCksIHRleHQ6ICcnLCB1aWQ6IDB9XG5cbi8vIFVwZGF0ZVxuZnVuY3Rpb24gdXBkYXRlKG1vZGVsLCBbYWN0aW9uLCB2YWx1ZV0pIHtcbiAgbGV0IHtpdGVtcywgYWxsQ29tcGxldGVkLCBmaWx0ZXIsIHRleHQsIHVpZH0gPSBtb2RlbFxuICBsZXQgbmV3SXRlbXNcblxuICBzd2l0Y2ggKGFjdGlvbikge1xuICAgIGNhc2UgJ2NoYW5nZVRleHQnOlxuICAgICAgcmV0dXJuIHsuLi5tb2RlbCwgdGV4dDogdmFsdWV9XG4gICAgY2FzZSAnYWRkSXRlbSc6XG4gICAgICByZXR1cm4gey4uLm1vZGVsLCB0ZXh0OiAnJywgYWxsQ29tcGxldGVkOiBmYWxzZSwgaXRlbXM6IFsuLi5pdGVtcywgbmV3SXRlbSh2YWx1ZSwgdWlkKV0sIHVpZDogdWlkICsgMX1cbiAgICBjYXNlICd0b2dnbGVJdGVtJzpcbiAgICAgIG5ld0l0ZW1zID0gaXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgICAgICByZXR1cm4gaXRlbS5pZCA9PSB2YWx1ZSA/IHsuLi5pdGVtLCBjb21wbGV0ZWQ6ICFpdGVtLmNvbXBsZXRlZH0gOiBpdGVtXG4gICAgICB9KVxuICAgICAgcmV0dXJuIHsuLi5tb2RlbCwgaXRlbXM6IG5ld0l0ZW1zLCBhbGxDb21wbGV0ZWQ6IGFsbEl0ZW1zQ29tcGxldGVkKG5ld0l0ZW1zKX1cbiAgICBjYXNlICdlZGl0SXRlbSc6XG4gICAgICBuZXdJdGVtcyA9IGl0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgICAgcmV0dXJuIGl0ZW0uaWQgPT0gdmFsdWUgPyB7Li4uaXRlbSwgZWRpdGluZzogdHJ1ZX0gOiBpdGVtXG4gICAgICB9KVxuICAgICAgcmV0dXJuIHsuLi5tb2RlbCwgaXRlbXM6IG5ld0l0ZW1zfVxuICAgIGNhc2UgJ3VwZGF0ZUl0ZW0nOlxuICAgICAgaWYgKHZhbHVlID09ICcnKSB7XG4gICAgICAgIGxldCBpbmRleCA9IGl0ZW1zLmZpbmRJbmRleChpdGVtID0+IGl0ZW0uZWRpdGluZylcbiAgICAgICAgbmV3SXRlbXMgPSByZW1vdmVJdGVtKGl0ZW1zLCBpdGVtc1tpbmRleF0uaWQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdJdGVtcyA9IGl0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgICAgICByZXR1cm4gaXRlbS5lZGl0aW5nID8gey4uLml0ZW0sIGVkaXRpbmc6IGZhbHNlLCB0ZXh0OiB2YWx1ZX0gOiBpdGVtXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gey4uLm1vZGVsLCBpdGVtczogbmV3SXRlbXN9XG4gICAgY2FzZSAncmVtb3ZlSXRlbSc6XG4gICAgICBuZXdJdGVtcyA9IHJlbW92ZUl0ZW0oaXRlbXMsIHZhbHVlKVxuICAgICAgcmV0dXJuIHsuLi5tb2RlbCwgaXRlbXM6IG5ld0l0ZW1zLCBhbGxDb21wbGV0ZWQ6IGFsbEl0ZW1zQ29tcGxldGVkKG5ld0l0ZW1zKX1cbiAgICBjYXNlICd0b2dnbGVBbGwnOlxuICAgICAgbGV0IG5ld0FsbENvbXBsZXRlZCA9ICFhbGxDb21wbGV0ZWRcblxuICAgICAgbmV3SXRlbXMgPSBpdGVtcy5tYXAoaXRlbSA9PiB7XG4gICAgICAgIHJldHVybiB7Li4uaXRlbSwgY29tcGxldGVkOiBuZXdBbGxDb21wbGV0ZWR9XG4gICAgICB9KVxuICAgICAgcmV0dXJuIHsuLi5tb2RlbCwgaXRlbXM6IG5ld0l0ZW1zLCBhbGxDb21wbGV0ZWQ6IG5ld0FsbENvbXBsZXRlZH1cbiAgICBjYXNlICdjaGFuZ2VGaWx0ZXInOlxuICAgICAgcmV0dXJuIHsuLi5tb2RlbCwgZmlsdGVyOiB2YWx1ZX1cbiAgICBjYXNlICdjbGVhckNvbXBsZXRlZCc6XG4gICAgICBuZXdJdGVtcyA9IGl0ZW1zLmZpbHRlcihpdGVtID0+ICFpdGVtLmNvbXBsZXRlZClcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtc31cbiAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVJdGVtKGl0ZW1zLCBpZCkge1xuICByZXR1cm4gaXRlbXMuZmlsdGVyKGl0ZW0gPT4gaXRlbS5pZCAhPSBpZClcbn1cblxuZnVuY3Rpb24gYWxsSXRlbXNDb21wbGV0ZWQoaXRlbXMpIHtcbiAgcmV0dXJuIGl0ZW1zLmV2ZXJ5KGl0ZW0gPT4gaXRlbS5jb21wbGV0ZWQpXG59XG5cbmZ1bmN0aW9uIG5ld0l0ZW0odGV4dCwgaWQpIHtcbiAgcmV0dXJuIHtpZCwgdGV4dCwgY29tcGxldGVkOiBmYWxzZSwgZWRpdGluZzogZmFsc2V9XG59XG5cbi8vIFZpZXdcbmZ1bmN0aW9uIHZpZXcobW9kZWwpIHtcbiAgbGV0IHt0ZXh0fSA9IG1vZGVsXG4gIGxldCBudW1JdGVtcyA9IG1vZGVsLml0ZW1zLmxlbmd0aFxuXG4gIGxldCB2ID1cbiAgICBbJ2RpdicsIHt9LFxuICAgICAgWyBbJ3NlY3Rpb24udG9kb2FwcCcsIHt9LFxuICAgICAgICBbIFsnaGVhZGVyLmhlYWRlcicsIHt9LFxuICAgICAgICAgIFsgWydoMScsIHt9LCAndG9kb3MnXSxcbiAgICAgICAgICAgIFsnaW5wdXQubmV3LXRvZG8nLFxuICAgICAgICAgICAgICB7IHByb3BzOiB7cGxhY2Vob2xkZXI6ICdXaGF0IG5lZWRzIHRvIGJlIGRvbmU/JywgYXV0b2ZvY3VzOiB0cnVlLCB2YWx1ZTogdGV4dH0sXG4gICAgICAgICAgICAgICAgb246IHtpbnB1dDogaGFuZGxlSW5wdXQsIGtleWRvd246IG9uRW50ZXJ9fV1dXSxcbiAgICAgICAgICBudW1JdGVtcyA+IDAgPyBtYWluKG1vZGVsKSA6ICcnLFxuICAgICAgICAgIG51bUl0ZW1zID4gMCA/IGZvb3Rlcihtb2RlbCkgOiAnJ11dLFxuICAgICAgaW5mbygpXV1cbiAgcmV0dXJuIHZcbn1cblxuZnVuY3Rpb24gaGFuZGxlSW5wdXQoZSkge1xuICBsZXQgdmFsdWUgPSBlLnRhcmdldC52YWx1ZS50cmltKClcbiAgYWN0aW9ucyQuZW1pdChbJ2NoYW5nZVRleHQnLCB2YWx1ZV0pXG59XG5cbmZ1bmN0aW9uIG9uRW50ZXIoZSkge1xuICBpZiAoZS5jb2RlID09ICdFbnRlcicpIHtcbiAgICBsZXQgdGV4dCA9IGUudGFyZ2V0LnZhbHVlLnRyaW0oKVxuICAgIGFjdGlvbnMkLmVtaXQoWydhZGRJdGVtJywgdGV4dF0pXG4gIH1cbn1cblxuXG5mdW5jdGlvbiBtYWluKHtpdGVtcywgZmlsdGVyLCBhbGxDb21wbGV0ZWR9KSB7XG4gIGZ1bmN0aW9uIGlzVmlzaWJsZShpdGVtKSB7XG4gICAgc3dpdGNoIChmaWx0ZXIpIHtcbiAgICAgIGNhc2UgJ2FsbCc6XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICBjYXNlICdjb21wbGV0ZWQnOlxuICAgICAgICByZXR1cm4gaXRlbS5jb21wbGV0ZWRcbiAgICAgIGNhc2UgJ2FjdGl2ZSc6XG4gICAgICAgIHJldHVybiAhaXRlbS5jb21wbGV0ZWRcbiAgICB9XG4gIH1cblxuICBsZXQgdiA9XG4gICAgWydzZWN0aW9uLm1haW4nLCB7fSxcbiAgICAgIFsgWydpbnB1dC50b2dnbGUtYWxsJywge3Byb3BzOiB7dHlwZTogJ2NoZWNrYm94JywgY2hlY2tlZDogYWxsQ29tcGxldGVkfSwgb246IHtjbGljazogdG9nZ2xlQWxsfX1dLFxuICAgICAgICBbJ2xhYmVsJywge3Byb3BzOiB7aHRtbEZvcjogJ3RvZ2dsZS1hbGwnfX0sICdNYXJrIGFsbCBhcyBjb21wbGV0ZSddLFxuICAgICAgICBbJ3VsLnRvZG8tbGlzdCcsIHt9LCBpdGVtcy5maWx0ZXIoaXNWaXNpYmxlKS5tYXAodmlld0l0ZW0pXV1dXG4gIHJldHVybiB2XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZUFsbCgpIHtcbiAgYWN0aW9ucyQuZW1pdChbJ3RvZ2dsZUFsbCddKVxufVxuXG5mdW5jdGlvbiB2aWV3SXRlbShpdGVtKSB7XG4gIGxldCB7aWQsIGNvbXBsZXRlZCwgZWRpdGluZywgdGV4dH0gPSBpdGVtXG4gIGxldCB2ID1cbiAgICBbJ2xpJywge2NsYXNzOiB7Y29tcGxldGVkLCBlZGl0aW5nfX0sXG4gICAgICBbIFsnZGl2LnZpZXcnLCB7fSxcbiAgICAgICAgICBbIFsnaW5wdXQudG9nZ2xlJywge3Byb3BzOiB7dHlwZTogJ2NoZWNrYm94JywgY2hlY2tlZDogY29tcGxldGVkfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uOiB7Y2xpY2s6IFtjaGVja2JveENsaWNrLCBpZF19fV0sXG4gICAgICAgICAgICBbJ2xhYmVsJywge29uOiB7ZGJsY2xpY2s6IFtpdGVtQ2xpY2ssIGlkXX19LCB0ZXh0XSxcbiAgICAgICAgICAgIFsnYnV0dG9uLmRlc3Ryb3knLCB7b246IHtjbGljazogW2Rlc3Ryb3lDbGljaywgaWRdfX1dXV0sXG4gICAgICAgIFsnaW5wdXQuZWRpdCcsIHtwcm9wczoge3ZhbHVlOiB0ZXh0fSwgb246IHtrZXlkb3duOiBvbkVkaXREb25lLCBibHVyOiBvbkJsdXJ9LCBob29rOiB7cG9zdHBhdGNoOiBmb2N1c0VsZW1lbnR9fV1dXVxuICByZXR1cm4gdlxufVxuXG5mdW5jdGlvbiBmb2N1c0VsZW1lbnQob2xkVm5vZGUsIHZub2RlKSB7XG4gIHJldHVybiB2bm9kZS5lbG0uZm9jdXMoKVxufVxuXG5mdW5jdGlvbiBvbkVkaXREb25lKGUpIHtcbiAgaWYgKGUuY29kZSA9PSAnRW50ZXInIHx8IGUuY29kZSA9PSAnRXNjYXBlJykge1xuICAgIGxldCB0ZXh0ID0gZS50YXJnZXQudmFsdWUudHJpbSgpXG4gICAgYWN0aW9ucyQuZW1pdChbJ3VwZGF0ZUl0ZW0nLCB0ZXh0XSlcbiAgfVxufVxuXG5mdW5jdGlvbiBvbkJsdXIoZSkge1xuICBsZXQgdGV4dCA9IGUudGFyZ2V0LnZhbHVlLnRyaW0oKVxuICBhY3Rpb25zJC5lbWl0KFsndXBkYXRlSXRlbScsIHRleHRdKVxufVxuXG5mdW5jdGlvbiBpdGVtQ2xpY2soaWQpIHtcbiAgYWN0aW9ucyQuZW1pdChbJ2VkaXRJdGVtJywgaWRdKVxufVxuXG5mdW5jdGlvbiBjaGVja2JveENsaWNrKGlkKSB7XG4gIGFjdGlvbnMkLmVtaXQoWyd0b2dnbGVJdGVtJywgaWRdKVxufVxuXG5mdW5jdGlvbiBkZXN0cm95Q2xpY2soaWQpIHtcbiAgYWN0aW9ucyQuZW1pdChbJ3JlbW92ZUl0ZW0nLCBpZF0pXG59XG5cbmZ1bmN0aW9uIG51bVVuY29tcGxldGVkKGl0ZW1zKSB7XG4gIHJldHVybiBpdGVtcy5maWx0ZXIoaXRlbSA9PiAhaXRlbS5jb21wbGV0ZWQpLmxlbmd0aFxufVxuXG5mdW5jdGlvbiBudW1Db21wbGV0ZWQoaXRlbXMpIHtcbiAgcmV0dXJuIGl0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0uY29tcGxldGVkKS5sZW5ndGhcbn1cblxuZnVuY3Rpb24gZm9vdGVyKHtpdGVtcywgZmlsdGVyfSkge1xuICBsZXQgbnVtTGVmdCA9IG51bVVuY29tcGxldGVkKGl0ZW1zKVxuICBsZXQgbnVtRG9uZSA9IG51bUNvbXBsZXRlZChpdGVtcylcblxuICBsZXQgdiA9XG4gICAgWydmb290ZXIuZm9vdGVyJywge30sXG4gICAgICBbIFsnc3Bhbi50b2RvLWNvdW50Jywge30sXG4gICAgICAgICAgW1snc3Ryb25nJywge30sIGAke251bUxlZnR9IGl0ZW0ke251bUxlZnQgPT0gMSA/ICcnIDogJ3MnfSBsZWZ0YF1dXSxcbiAgICAgICAgWyd1bC5maWx0ZXJzJywge30sXG4gICAgICAgICAgWyB2aWV3RmlsdGVyKCcjLycsICdhbGwnLCBmaWx0ZXIpLFxuICAgICAgICAgICAgdmlld0ZpbHRlcignIy9hY3RpdmUnLCAnYWN0aXZlJywgZmlsdGVyKSxcbiAgICAgICAgICAgIHZpZXdGaWx0ZXIoJyMvY29tcGxldGVkJywgJ2NvbXBsZXRlZCcsIGZpbHRlcildXSxcbiAgICAgICAgbnVtRG9uZSA+PSAxID9cbiAgICAgICAgICBbJ2J1dHRvbi5jbGVhci1jb21wbGV0ZWQnLCB7b246IHtjbGljazogY2xlYXJDb21wbGV0ZWR9fSwgYENsZWFyIENvbXBsZXRlZCAoJHtudW1Eb25lfSlgXSA6XG4gICAgICAgICAgJyddXVxuICByZXR1cm4gdlxufVxuXG5mdW5jdGlvbiBjbGVhckNvbXBsZXRlZChlKSB7XG4gIGFjdGlvbnMkLmVtaXQoWydjbGVhckNvbXBsZXRlZCddKVxufVxuXG5mdW5jdGlvbiB2aWV3RmlsdGVyKGhyZWYsIGZpbHRlciwgY3VycmVudEZpbHRlcikge1xuICBsZXQgdiA9XG4gICAgWydsaScsIHt9LFxuICAgICAgWyBbJ2EnLCB7cHJvcHM6IHtocmVmOiBocmVmfSwgY2xhc3M6IHtzZWxlY3RlZDogZmlsdGVyID09IGN1cnJlbnRGaWx0ZXJ9fSwgZmlsdGVyXV1dXG4gIHJldHVybiB2XG59XG5cbmZ1bmN0aW9uIGluZm8oKSB7XG4gIGxldCB2ID1cbiAgICBbJ2Zvb3Rlci5pbmZvJywge30sXG4gICAgICBbIFsncCcsIHt9LCAnRG91YmxlLWNsaWNrIHRvIGVkaXQgYSB0b2RvJ10sXG4gICAgICAgIFsncCcsIHt9LFxuICAgICAgICAgIFsnQ3JlYXRlZCBieSAnLCBbJ2EnLCB7cHJvcHM6IHtocmVmOiAnaHR0cHM6Ly9naXRodWIuY29tL2R1YmlvdXNkYXZpZCd9fSwgJ0RhdmlkIFNhcmdlYW50J11dXSxcbiAgICAgICAgWydwJywge30sXG4gICAgICAgICAgWydQYXJ0IG9mICcsIFsnYScsIHtwcm9wczoge2hyZWY6ICdodHRwOi8vdG9kb212Yy5jb20nfX0sICdUb2RvTVZDJ11dXV1dXG4gIHJldHVybiB2XG59XG5cbi8vIFJlZHVjZVxubGV0IG1vZGVsJCA9IGFjdGlvbnMkLnNjYW4odXBkYXRlLCBpbml0TW9kZWwpXG5tb2RlbCQubG9nKClcblxuLy8gU2F2ZSB0byBsb2NhbCBzdG9yYWdlXG5mdW5jdGlvbiBkaXNhYmxlRWRpdGluZyhtb2RlbCkge1xuICBsZXQgbmV3SXRlbXMgPSBtb2RlbC5pdGVtcy5tYXAoaXRlbSA9PiB7XG4gICAgcmV0dXJuIHsuLi5pdGVtLCBlZGl0aW5nOiBmYWxzZX1cbiAgfSlcbiAgcmV0dXJuIHsuLi5tb2RlbCwgaXRlbXM6IG5ld0l0ZW1zfVxufVxuXG5tb2RlbCRcbiAgLm1hcChkaXNhYmxlRWRpdGluZylcbiAgLm9uVmFsdWUobW9kZWwgPT4gbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3RvZG9zLW11dmpzJywgSlNPTi5zdHJpbmdpZnkobW9kZWwpKSlcblxuLy8gSGFuZGxlIGhhc2ggY2hhbmdlXG5mdW5jdGlvbiBjaGFuZ2VGaWx0ZXIoKSB7XG4gIGFjdGlvbnMkLmVtaXQoWydjaGFuZ2VGaWx0ZXInLCBnZXRGaWx0ZXJGcm9tSGFzaCgpXSlcbn1cblxud2luZG93Lm9uaGFzaGNoYW5nZSA9IGNoYW5nZUZpbHRlclxuXG4vLyBSZW5kZXJcbmxldCB2aWV3JCA9IG1vZGVsJC5tYXAodmlldylcbnJlbmRlcih2aWV3JCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRhaW5lcicpKVxuIl0sIm5hbWVzIjpbInNlbCIsImRhdGEiLCJjaGlsZHJlbiIsInRleHQiLCJlbG0iLCJrZXkiLCJ1bmRlZmluZWQiLCJBcnJheSIsImlzQXJyYXkiLCJzIiwiY3JlYXRlRWxlbWVudCIsInRhZ05hbWUiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnROUyIsIm5hbWVzcGFjZVVSSSIsInF1YWxpZmllZE5hbWUiLCJjcmVhdGVUZXh0Tm9kZSIsImluc2VydEJlZm9yZSIsInBhcmVudE5vZGUiLCJuZXdOb2RlIiwicmVmZXJlbmNlTm9kZSIsInJlbW92ZUNoaWxkIiwibm9kZSIsImNoaWxkIiwiYXBwZW5kQ2hpbGQiLCJwYXJlbnRFbGVtZW50IiwibmV4dFNpYmxpbmciLCJzZXRUZXh0Q29udGVudCIsInRleHRDb250ZW50IiwiVk5vZGUiLCJyZXF1aXJlJCQyIiwiaXMiLCJyZXF1aXJlJCQxIiwiZG9tQXBpIiwicmVxdWlyZSQkMCIsImlzVW5kZWYiLCJpc0RlZiIsImVtcHR5Tm9kZSIsInNhbWVWbm9kZSIsInZub2RlMSIsInZub2RlMiIsImNyZWF0ZUtleVRvT2xkSWR4IiwiYmVnaW5JZHgiLCJlbmRJZHgiLCJpIiwibWFwIiwiaG9va3MiLCJpbml0IiwibW9kdWxlcyIsImFwaSIsImoiLCJjYnMiLCJsZW5ndGgiLCJwdXNoIiwiZW1wdHlOb2RlQXQiLCJpZCIsImMiLCJjbGFzc05hbWUiLCJzcGxpdCIsImpvaW4iLCJ0b0xvd2VyQ2FzZSIsImNyZWF0ZVJtQ2IiLCJjaGlsZEVsbSIsImxpc3RlbmVycyIsInBhcmVudCIsImNyZWF0ZUVsbSIsInZub2RlIiwiaW5zZXJ0ZWRWbm9kZVF1ZXVlIiwiaG9vayIsImhhc2hJZHgiLCJpbmRleE9mIiwiZG90SWR4IiwiaGFzaCIsImRvdCIsInRhZyIsInNsaWNlIiwiTWF0aCIsIm1pbiIsIm5zIiwicmVwbGFjZSIsImFycmF5IiwicHJpbWl0aXZlIiwiY3JlYXRlIiwiaW5zZXJ0IiwiYWRkVm5vZGVzIiwicGFyZW50RWxtIiwiYmVmb3JlIiwidm5vZGVzIiwic3RhcnRJZHgiLCJpbnZva2VEZXN0cm95SG9vayIsImRlc3Ryb3kiLCJyZW1vdmVWbm9kZXMiLCJybSIsImNoIiwicmVtb3ZlIiwidXBkYXRlQ2hpbGRyZW4iLCJvbGRDaCIsIm5ld0NoIiwib2xkU3RhcnRJZHgiLCJuZXdTdGFydElkeCIsIm9sZEVuZElkeCIsIm9sZFN0YXJ0Vm5vZGUiLCJvbGRFbmRWbm9kZSIsIm5ld0VuZElkeCIsIm5ld1N0YXJ0Vm5vZGUiLCJuZXdFbmRWbm9kZSIsIm9sZEtleVRvSWR4IiwiaWR4SW5PbGQiLCJlbG1Ub01vdmUiLCJwYXRjaFZub2RlIiwib2xkVm5vZGUiLCJwcmVwYXRjaCIsInVwZGF0ZSIsInBvc3RwYXRjaCIsInByZSIsInBvc3QiLCJhZGROUyIsImgiLCJiIiwidXBkYXRlQ2xhc3MiLCJjdXIiLCJuYW1lIiwib2xkQ2xhc3MiLCJjbGFzcyIsImtsYXNzIiwiY2xhc3NMaXN0IiwidXBkYXRlUHJvcHMiLCJvbGQiLCJvbGRQcm9wcyIsInByb3BzIiwicmFmIiwid2luZG93IiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwic2V0VGltZW91dCIsIm5leHRGcmFtZSIsImZuIiwic2V0TmV4dEZyYW1lIiwib2JqIiwicHJvcCIsInZhbCIsInVwZGF0ZVN0eWxlIiwib2xkU3R5bGUiLCJzdHlsZSIsIm9sZEhhc0RlbCIsImRlbGF5ZWQiLCJhcHBseURlc3Ryb3lTdHlsZSIsImFwcGx5UmVtb3ZlU3R5bGUiLCJpZHgiLCJtYXhEdXIiLCJjb21wU3R5bGUiLCJhbW91bnQiLCJhcHBsaWVkIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJldiIsInRhcmdldCIsImludm9rZUhhbmRsZXIiLCJoYW5kbGVyIiwiZXZlbnQiLCJjYWxsIiwiYXJncyIsImFwcGx5IiwiaGFuZGxlRXZlbnQiLCJ0eXBlIiwib24iLCJjcmVhdGVMaXN0ZW5lciIsInVwZGF0ZUV2ZW50TGlzdGVuZXJzIiwib2xkT24iLCJvbGRMaXN0ZW5lciIsImxpc3RlbmVyIiwib2xkRWxtIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImdsb2JhbCIsImZhY3RvcnkiLCJleHBvcnRzIiwibW9kdWxlIiwiZGVmaW5lIiwiYW1kIiwiS2VmaXIiLCJ0aGlzIiwiY3JlYXRlT2JqIiwicHJvdG8iLCJGIiwicHJvdG90eXBlIiwiZXh0ZW5kIiwiYXJndW1lbnRzIiwiaW5oZXJpdCIsIkNoaWxkIiwiUGFyZW50IiwiY29uc3RydWN0b3IiLCJOT1RISU5HIiwiRU5EIiwiVkFMVUUiLCJFUlJPUiIsIkFOWSIsImNvbmNhdCIsImEiLCJyZXN1bHQiLCJmaW5kIiwiYXJyIiwidmFsdWUiLCJmaW5kQnlQcmVkIiwicHJlZCIsImNsb25lQXJyYXkiLCJpbnB1dCIsImluZGV4IiwiZm9yRWFjaCIsImZpbGxBcnJheSIsImNvbnRhaW5zIiwic2xpZGUiLCJuZXh0IiwibWF4Iiwib2Zmc2V0IiwiY2FsbFN1YnNjcmliZXIiLCJEaXNwYXRjaGVyIiwiX2l0ZW1zIiwiX3NwaWVzIiwiX2luTG9vcCIsIl9yZW1vdmVkSXRlbXMiLCJ4Iiwic3BpZXMiLCJfaSIsIml0ZW1zIiwiT2JzZXJ2YWJsZSIsIl9kaXNwYXRjaGVyIiwiX2FjdGl2ZSIsIl9hbGl2ZSIsIl9hY3RpdmF0aW5nIiwiX2xvZ0hhbmRsZXJzIiwiX3NweUhhbmRsZXJzIiwiYWN0aXZlIiwiX29uQWN0aXZhdGlvbiIsIl9vbkRlYWN0aXZhdGlvbiIsIl9zZXRBY3RpdmUiLCJjbGVhbnVwIiwiX2VtaXRWYWx1ZSIsIl9lbWl0RXJyb3IiLCJfZW1pdEVuZCIsImRpc3BhdGNoIiwiX2NsZWFyIiwiYWRkIiwiY291bnQiLCJfb24iLCJfb2ZmIiwib2JzZXJ2ZXJPck9uVmFsdWUiLCJvbkVycm9yIiwib25FbmQiLCJfdGhpcyIsImNsb3NlZCIsIm9ic2VydmVyIiwiZXJyb3IiLCJlbmQiLCJvbkFueSIsIm9mZkFueSIsIkEiLCJCIiwiZ2V0VHlwZSIsInNvdXJjZU9icyIsInNlbGZOYW1lIiwiX25hbWUiLCJ0b1N0cmluZyIsImlzQ3VycmVudCIsImxvZyIsImhhbmRsZXJJbmRleCIsInNwbGljZSIsImFkZFNweSIsInJlbW92ZVNweSIsIlN0cmVhbSIsIlByb3BlcnR5IiwiX2N1cnJlbnRFdmVudCIsIm5ldmVyUyIsIm5ldmVyIiwidGltZUJhc2VkIiwibWl4aW4iLCJBbm9ueW1vdXNTdHJlYW0iLCJ3YWl0Iiwib3B0aW9ucyIsIl93YWl0IiwiX2ludGVydmFsSWQiLCJfJG9uVGljayIsIl9vblRpY2siLCJfaW5pdCIsInNldEludGVydmFsIiwiX2ZyZWUiLCJTIiwiX3JlZiIsIl94IiwibGF0ZXIiLCJTJDEiLCJpbnRlcnZhbCIsIlMkMiIsInhzIiwiX3hzIiwic2hpZnQiLCJzZXF1ZW50aWFsbHkiLCJTJDMiLCJfZm4iLCJmcm9tUG9sbCIsImVtaXR0ZXIiLCJvYnMiLCJlIiwiX2VtaXQiLCJTJDQiLCJfZW1pdHRlciIsIndpdGhJbnRlcnZhbCIsIlMkNSIsIl91bnN1YnNjcmliZSIsInVuc3Vic2NyaWJlIiwiX2NhbGxVbnN1YnNjcmliZSIsInN0cmVhbSIsImZyb21DYWxsYmFjayIsImNhbGxiYWNrQ29uc3VtZXIiLCJjYWxsZWQiLCJlbWl0Iiwic2V0TmFtZSIsImZyb21Ob2RlQ2FsbGJhY2siLCJzcHJlYWQiLCJhTGVuZ3RoIiwiZnJvbVN1YlVuc3ViIiwic3ViIiwidW5zdWIiLCJ0cmFuc2Zvcm1lciIsInBhaXJzIiwiZnJvbUV2ZW50cyIsImV2ZW50TmFtZSIsIkVycm9yIiwiUCIsImN1cnJlbnQiLCJjb25zdGFudCIsIlAkMSIsImNvbnN0YW50RXJyb3IiLCJjcmVhdGVDb25zdHJ1Y3RvciIsIkJhc2VDbGFzcyIsIkFub255bW91c09ic2VydmFibGUiLCJzb3VyY2UiLCJfc291cmNlIiwiXyRoYW5kbGVBbnkiLCJfaGFuZGxlQW55IiwiY3JlYXRlQ2xhc3NNZXRob2RzIiwiX2hhbmRsZVZhbHVlIiwiX2hhbmRsZUVycm9yIiwiX2hhbmRsZUVuZCIsImNyZWF0ZVN0cmVhbSIsImNyZWF0ZVByb3BlcnR5IiwiUCQyIiwiX2dldEluaXRpYWxDdXJyZW50IiwiZ2V0SW5pdGlhbCIsInRvUHJvcGVydHkiLCJTJDYiLCJjaGFuZ2VzIiwiZnJvbVByb21pc2UiLCJwcm9taXNlIiwib25WYWx1ZSIsIl9wcm9taXNlIiwidGhlbiIsImRvbmUiLCJnZXRHbG9kYWxQcm9taXNlIiwiUHJvbWlzZSIsInRvUHJvbWlzZSIsImxhc3QiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29tbW9uanNHbG9iYWwiLCJzZWxmIiwiY3JlYXRlQ29tbW9uanNNb2R1bGUiLCJwb255ZmlsbCIsImRlZmluZVByb3BlcnR5Iiwic3ltYm9sT2JzZXJ2YWJsZVBvbnlmaWxsIiwicm9vdCIsIl9TeW1ib2wiLCJTeW1ib2wiLCJvYnNlcnZhYmxlIiwicmVxdWlyZSQkMCQxIiwiaW5kZXgkMSIsIl9wb255ZmlsbCIsIl9wb255ZmlsbDIiLCJfaW50ZXJvcFJlcXVpcmVEZWZhdWx0IiwiX19lc01vZHVsZSIsIiQkb2JzZXJ2YWJsZSIsImZyb21FU09ic2VydmFibGUiLCJfb2JzZXJ2YWJsZSIsInN1YnNjcmliZSIsIkVTT2JzZXJ2YWJsZSIsInRha2VFcnJvcnMiLCJvYnNlcnZlck9yT25OZXh0Iiwib25Db21wbGV0ZSIsImNvbXBsZXRlIiwic3Vic2NyaXB0aW9uIiwidG9FU09ic2VydmFibGUiLCJkZWZhdWx0RXJyb3JzQ29tYmluYXRvciIsImVycm9ycyIsImxhdGVzdEVycm9yIiwiQ29tYmluZSIsInBhc3NpdmUiLCJjb21iaW5hdG9yIiwiX2FjdGl2ZUNvdW50IiwiX3NvdXJjZXMiLCJfY29tYmluYXRvciIsIl9hbGl2ZUNvdW50IiwiX2xhdGVzdFZhbHVlcyIsIl9sYXRlc3RFcnJvcnMiLCJfZW1pdEFmdGVyQWN0aXZhdGlvbiIsIl9lbmRBZnRlckFjdGl2YXRpb24iLCJfbGF0ZXN0RXJyb3JJbmRleCIsIl8kaGFuZGxlcnMiLCJfbG9vcCIsIl9lbWl0SWZGdWxsIiwiaGFzQWxsVmFsdWVzIiwiaGFzRXJyb3JzIiwidmFsdWVzQ29weSIsImVycm9yc0NvcHkiLCJjb21iaW5lIiwiT2JzZXJ2YWJsZSQxIiwibWVyZ2UiLCJmbkVyciIsImZuVmFsIiwibWFwRXJyb3JzIiwib2JzRm4iLCJvYnNWYWwiLCJmbGF0TWFwIiwic3RhdGljTGFuZCIsIk9iamVjdCIsImZyZWV6ZSIsIlMkNyIsIlAkMyIsIm1hcCQxIiwiX29mU2FtZVR5cGUiLCJtaXhpbiQxIiwiUyQ4IiwiUCQ0IiwiaWQkMSIsImZpbHRlciIsIm1peGluJDIiLCJuIiwiX24iLCJTJDkiLCJQJDUiLCJ0YWtlIiwibWl4aW4kMyIsIlMkMTAiLCJQJDYiLCJtaXhpbiQ0IiwiUyQxMSIsIlAkNyIsImlkJDIiLCJ0YWtlV2hpbGUiLCJtaXhpbiQ1IiwiX2xhc3RWYWx1ZSIsIlMkMTIiLCJQJDgiLCJtaXhpbiQ2IiwiUyQxMyIsIlAkOSIsInNraXAiLCJtaXhpbiQ3IiwiUyQxNCIsIlAkMTAiLCJpZCQzIiwic2tpcFdoaWxlIiwibWl4aW4kOCIsIl9wcmV2IiwiUyQxNSIsIlAkMTEiLCJlcSIsInNraXBEdXBsaWNhdGVzIiwibWl4aW4kOSIsInNlZWQiLCJTJDE2IiwiUCQxMiIsImRlZmF1bHRGbiIsImRpZmYiLCJQJDEzIiwiX3NlZWQiLCJzY2FuIiwibWl4aW4kMTAiLCJTJDE3IiwiaWQkNCIsImZsYXR0ZW4iLCJFTkRfTUFSS0VSIiwibWl4aW4kMTEiLCJfYnVmZiIsIl8kc2hpZnRCdWZmIiwiUyQxOCIsIlAkMTQiLCJkZWxheSIsIm5vdyIsIkRhdGUiLCJnZXRUaW1lIiwibWl4aW4kMTIiLCJsZWFkaW5nIiwidHJhaWxpbmciLCJfbGVhZGluZyIsIl90cmFpbGluZyIsIl90cmFpbGluZ1ZhbHVlIiwiX3RpbWVvdXRJZCIsIl9lbmRMYXRlciIsIl9sYXN0Q2FsbFRpbWUiLCJfJHRyYWlsaW5nQ2FsbCIsIl90cmFpbGluZ0NhbGwiLCJjdXJUaW1lIiwicmVtYWluaW5nIiwiX2NhbmNlbFRyYWlsaW5nIiwiUyQxOSIsIlAkMTUiLCJ0aHJvdHRsZSIsIl9yZWYyIiwiX3JlZjIkbGVhZGluZyIsIl9yZWYyJHRyYWlsaW5nIiwibWl4aW4kMTMiLCJpbW1lZGlhdGUiLCJfaW1tZWRpYXRlIiwiX2xhc3RBdHRlbXB0IiwiX2xhdGVyVmFsdWUiLCJfJGxhdGVyIiwiX2xhdGVyIiwiUyQyMCIsIlAkMTYiLCJkZWJvdW5jZSIsIl9yZWYyJGltbWVkaWF0ZSIsIm1peGluJDE0IiwiUyQyMSIsIlAkMTciLCJpZCQ1IiwibWl4aW4kMTUiLCJTJDIyIiwiUCQxOCIsImlkJDYiLCJmaWx0ZXJFcnJvcnMiLCJtaXhpbiQxNiIsIlMkMjMiLCJQJDE5IiwiaWdub3JlVmFsdWVzIiwibWl4aW4kMTciLCJTJDI0IiwiUCQyMCIsImlnbm9yZUVycm9ycyIsIm1peGluJDE4IiwiUyQyNSIsIlAkMjEiLCJpZ25vcmVFbmQiLCJtaXhpbiQxOSIsIlMkMjYiLCJQJDIyIiwiYmVmb3JlRW5kIiwibWl4aW4kMjAiLCJfbWF4IiwiX21pbiIsIlMkMjciLCJQJDIzIiwic2xpZGluZ1dpbmRvdyIsIm1peGluJDIxIiwiZmx1c2hPbkVuZCIsIl9mbHVzaE9uRW5kIiwiX2ZsdXNoIiwiUyQyOCIsIlAkMjQiLCJpZCQ3IiwiYnVmZmVyV2hpbGUiLCJfcmVmMiRmbHVzaE9uRW5kIiwibWl4aW4kMjIiLCJfY291bnQiLCJTJDI5IiwiUCQyNSIsImJ1ZmZlcldoaWxlJDEiLCJtaXhpbiQyMyIsIlMkMzAiLCJQJDI2IiwiYnVmZmVyV2l0aFRpbWVPckNvdW50IiwieGZvcm1Gb3JPYnMiLCJyZXMiLCJtaXhpbiQyNCIsInRyYW5zZHVjZXIiLCJfeGZvcm0iLCJTJDMxIiwiUCQyNyIsInRyYW5zZHVjZSIsIm1peGluJDI1IiwiX2hhbmRsZXIiLCJTJDMyIiwiUCQyOCIsIndpdGhIYW5kbGVyIiwiWmlwIiwic291cmNlcyIsIl9idWZmZXJzIiwiX2lzRnVsbCIsInZhbHVlcyIsInppcCIsIm9ic2VydmFibGVzIiwiaWQkOCIsIkFic3RyYWN0UG9vbCIsIl9yZWYkcXVldWVMaW0iLCJxdWV1ZUxpbSIsIl9yZWYkY29uY3VyTGltIiwiY29uY3VyTGltIiwiX3JlZiRkcm9wIiwiZHJvcCIsIl9xdWV1ZUxpbSIsIl9jb25jdXJMaW0iLCJfZHJvcCIsIl9xdWV1ZSIsIl9jdXJTb3VyY2VzIiwiXyRoYW5kbGVTdWJBbnkiLCJfaGFuZGxlU3ViQW55IiwiXyRlbmRIYW5kbGVycyIsIl9jdXJyZW50bHlBZGRpbmciLCJ0b09icyIsIl9hZGRUb0N1ciIsIl9hZGRUb1F1ZXVlIiwiX3JlbW92ZU9sZGVzdCIsIl9hZGQiLCJvYnNzIiwiX3RoaXMyIiwiX3JlbW92ZUN1ciIsIl9yZW1vdmVRdWV1ZSIsIl9zdWJUb0VuZCIsIl90aGlzMyIsIm9uRW5kSSIsIm9mZkVuZCIsIl9wdWxsUXVldWUiLCJfb25FbXB0eSIsIl9zdWJzY3JpYmUiLCJNZXJnZSIsIl9hZGRBbGwiLCJfaW5pdGlhbGlzZWQiLCJTJDMzIiwiZ2VuZXJhdG9yIiwiX2dlbmVyYXRvciIsIl9pdGVyYXRpb24iLCJfZ2V0U291cmNlIiwicmVwZWF0IiwiY29uY2F0JDEiLCJQb29sIiwiX3JlbW92ZSIsIkZsYXRNYXAiLCJfbWFpbkVuZGVkIiwiX2xhc3RDdXJyZW50IiwiXyRoYW5kbGVNYWluIiwiX2hhbmRsZU1haW4iLCJfaGFkTm9FdlNpbmNlRGVhY3QiLCJzYW1lQ3VyciIsIl9pc0VtcHR5IiwiRmxhdE1hcEVycm9ycyIsImNyZWF0ZUNvbnN0cnVjdG9yJDEiLCJwcmltYXJ5Iiwic2Vjb25kYXJ5IiwiX3ByaW1hcnkiLCJfc2Vjb25kYXJ5IiwiX2xhc3RTZWNvbmRhcnkiLCJfJGhhbmRsZVNlY29uZGFyeUFueSIsIl9oYW5kbGVTZWNvbmRhcnlBbnkiLCJfJGhhbmRsZVByaW1hcnlBbnkiLCJfaGFuZGxlUHJpbWFyeUFueSIsImNyZWF0ZUNsYXNzTWV0aG9kcyQxIiwiX2hhbmRsZVByaW1hcnlWYWx1ZSIsIl9oYW5kbGVQcmltYXJ5RXJyb3IiLCJfaGFuZGxlUHJpbWFyeUVuZCIsIl9oYW5kbGVTZWNvbmRhcnlWYWx1ZSIsIl9oYW5kbGVTZWNvbmRhcnlFcnJvciIsIl9oYW5kbGVTZWNvbmRhcnlFbmQiLCJfcmVtb3ZlU2Vjb25kYXJ5IiwiY3JlYXRlU3RyZWFtJDEiLCJjcmVhdGVQcm9wZXJ0eSQxIiwibWl4aW4kMjYiLCJTJDM0IiwiUCQyOSIsImZpbHRlckJ5IiwiaWQyIiwiXyIsInNhbXBsZWRCeSIsIm1peGluJDI3IiwiUyQzNSIsIlAkMzAiLCJza2lwVW50aWxCeSIsIm1peGluJDI4IiwiUyQzNiIsIlAkMzEiLCJ0YWtlVW50aWxCeSIsIm1peGluJDI5IiwiX3JlZiRmbHVzaE9uRW5kIiwiUyQzNyIsIlAkMzIiLCJidWZmZXJCeSIsIm1peGluJDMwIiwiX3JlZiRmbHVzaE9uQ2hhbmdlIiwiZmx1c2hPbkNoYW5nZSIsIl9mbHVzaE9uQ2hhbmdlIiwiUyQzOCIsIlAkMzMiLCJidWZmZXJXaGlsZUJ5IiwiZiIsInQiLCJhd2FpdGluZyIsIm1peGluJDMxIiwiY29udmVydCIsIlMkMzkiLCJQJDM0IiwiZGVmRm4iLCJ2YWx1ZXNUb0Vycm9ycyIsIm1peGluJDMyIiwiUyQ0MCIsIlAkMzUiLCJkZWZGbiQxIiwiZXJyb3JzVG9WYWx1ZXMiLCJtaXhpbiQzMyIsIlMkNDEiLCJQJDM2IiwiZW5kT25FcnJvciIsImJ1ZmZlcldpdGhDb3VudCIsIm90aGVyIiwicG9vbCIsImZsYXRNYXBMYXRlc3QiLCJmbGF0TWFwRmlyc3QiLCJmbGF0TWFwQ29uY2F0IiwiZmxhdE1hcENvbmN1ckxpbWl0IiwibGltaXQiLCJmbGF0TWFwRXJyb3JzIiwiREVQUkVDQVRJT05fV0FSTklOR1MiLCJkaXNzYWJsZURlcHJlY2F0aW9uV2FybmluZ3MiLCJ3YXJuIiwibXNnIiwiY29uc29sZSIsIm1zZzIiLCJidXMiLCJjb252ZXJ0VG9IeXBlclNjcmlwdCIsInJlbmRlciIsInZpZXckIiwiY29udGFpbmVyIiwicGF0Y2giLCJzbmFiYmRvbSIsInNuYWJDbGFzcyIsInNuYWJQcm9wcyIsInNuYWJTdHlsZSIsInNuYWJFdmVudCIsIm5ld1Zub2RlIiwiYWN0aW9ucyQiLCJnZXRGcm9tU3RvcmFnZSIsImpzb24iLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiSlNPTiIsInBhcnNlIiwiZ2V0RmlsdGVyRnJvbUhhc2giLCJsb2NhdGlvbiIsImluaXRNb2RlbCIsImFsbENvbXBsZXRlZCIsInVpZCIsIm1vZGVsIiwiYWN0aW9uIiwibmV3SXRlbXMiLCJuZXdJdGVtIiwiaXRlbSIsImNvbXBsZXRlZCIsImFsbEl0ZW1zQ29tcGxldGVkIiwiZWRpdGluZyIsImZpbmRJbmRleCIsInJlbW92ZUl0ZW0iLCJuZXdBbGxDb21wbGV0ZWQiLCJldmVyeSIsInZpZXciLCJudW1JdGVtcyIsInYiLCJwbGFjZWhvbGRlciIsImF1dG9mb2N1cyIsImhhbmRsZUlucHV0Iiwia2V5ZG93biIsIm9uRW50ZXIiLCJtYWluIiwiZm9vdGVyIiwiaW5mbyIsInRyaW0iLCJjb2RlIiwiaXNWaXNpYmxlIiwiY2hlY2tlZCIsImNsaWNrIiwidG9nZ2xlQWxsIiwiaHRtbEZvciIsInZpZXdJdGVtIiwiY2hlY2tib3hDbGljayIsImRibGNsaWNrIiwiaXRlbUNsaWNrIiwiZGVzdHJveUNsaWNrIiwib25FZGl0RG9uZSIsImJsdXIiLCJvbkJsdXIiLCJmb2N1c0VsZW1lbnQiLCJmb2N1cyIsIm51bVVuY29tcGxldGVkIiwibnVtQ29tcGxldGVkIiwibnVtTGVmdCIsIm51bURvbmUiLCJ2aWV3RmlsdGVyIiwiY2xlYXJDb21wbGV0ZWQiLCJocmVmIiwiY3VycmVudEZpbHRlciIsInNlbGVjdGVkIiwibW9kZWwkIiwiZGlzYWJsZUVkaXRpbmciLCJzZXRJdGVtIiwi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
