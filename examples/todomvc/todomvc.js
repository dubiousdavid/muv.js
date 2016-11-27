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
let initModel = { items: [], allCompleted: false, filter: 'All', text: '', uid: 0 };

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
      newItems = items.slice().map(item => {
        return item.id == value ? Object.assign({}, item, { completed: !item.completed }) : item;
      });
      return Object.assign({}, model, { items: newItems, allCompleted: allItemsCompleted(newItems) });
    case 'editItem':
      newItems = items.slice().map(item => {
        return item.id == value ? Object.assign({}, item, { editing: true }) : item;
      });
      return Object.assign({}, model, { items: newItems });
    case 'updateItem':
      if (value == '') {
        let index = items.findIndex(item => item.editing);
        newItems = removeItem(items, items[index].id);
      } else {
        newItems = items.slice().map(item => {
          return item.editing ? Object.assign({}, item, { editing: false, text: value }) : item;
        });
      }
      return Object.assign({}, model, { items: newItems });
    case 'removeItem':
      newItems = removeItem(items, value);
      return Object.assign({}, model, { items: newItems, allCompleted: allItemsCompleted(newItems) });
    case 'toggleAll':
      let newAllCompleted = !allCompleted;

      newItems = items.slice().map(item => {
        return Object.assign({}, item, { completed: newAllCompleted });
      });
      return Object.assign({}, model, { items: newItems, allCompleted: newAllCompleted });
  }
}

function removeItem(items, id) {
  return items.slice().filter(item => item.id != id);
}

function allItemsCompleted(items) {
  return items.findIndex(item => !item.completed) == -1;
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

function main({ items, allCompleted }) {
  let v = ['section.main', {}, [['input.toggle-all', { props: { type: 'checkbox', checked: allCompleted }, on: { click: toggleAll } }], ['label', { props: { htmlFor: 'toggle-all' } }, 'Mark all as complete'], ['ul.todo-list', {}, items.map(viewItem)]]];
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

function footer({ items, filter }) {
  let numLeft = numUncompleted(items);
  let v = ['footer.footer', {}, [['span.todo-count', {}, [['strong', {}, `${ numLeft } item${ numLeft == 1 ? '' : 's' } left`]]], ['ul.filters', {}, [['li', {}, [['a', { props: { href: '#/' }, class: { selected: filter == 'All' } }, 'All']]], ['li', {}, [['a', { props: { href: '#/active' }, class: { selected: filter == 'Active' } }, 'Active']]], ['li', {}, [['a', { props: { href: '#/completed' }, class: { selected: filter == 'Completed' } }, 'Completed']]]]]]];
  return v;
}

function info() {
  let v = ['footer.info', {}, [['p', {}, 'Double-click to edit a todo'], ['p', {}, ['Created by ', ['a', { props: { href: 'http://todomvc.com' } }, 'David Sargeant']]], ['p', {}, ['Part of ', ['a', { props: { href: 'http://todomvc.com' } }, 'TodoMVC']]]]];
  return v;
}

// Reduce
let model$ = actions$.scan(update, initModel);
model$.log();

// Render
let view$ = model$.map(view);
render(view$, document.getElementById('container'));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS92bm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9pcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9odG1sZG9tYXBpLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL3NuYWJiZG9tLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9jbGFzcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9rZWZpci9kaXN0L2tlZmlyLmpzIiwiLi4vLi4vc3JjL2luZGV4LmpzIiwiaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzZWwsIGRhdGEsIGNoaWxkcmVuLCB0ZXh0LCBlbG0pIHtcbiAgdmFyIGtleSA9IGRhdGEgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IGRhdGEua2V5O1xuICByZXR1cm4ge3NlbDogc2VsLCBkYXRhOiBkYXRhLCBjaGlsZHJlbjogY2hpbGRyZW4sXG4gICAgICAgICAgdGV4dDogdGV4dCwgZWxtOiBlbG0sIGtleToga2V5fTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYXJyYXk6IEFycmF5LmlzQXJyYXksXG4gIHByaW1pdGl2ZTogZnVuY3Rpb24ocykgeyByZXR1cm4gdHlwZW9mIHMgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzID09PSAnbnVtYmVyJzsgfSxcbn07XG4iLCJmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZ05hbWUpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgcXVhbGlmaWVkTmFtZSl7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBxdWFsaWZpZWROYW1lKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVGV4dE5vZGUodGV4dCl7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBpbnNlcnRCZWZvcmUocGFyZW50Tm9kZSwgbmV3Tm9kZSwgcmVmZXJlbmNlTm9kZSl7XG4gIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUNoaWxkKG5vZGUsIGNoaWxkKXtcbiAgbm9kZS5yZW1vdmVDaGlsZChjaGlsZCk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZENoaWxkKG5vZGUsIGNoaWxkKXtcbiAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG59XG5cbmZ1bmN0aW9uIHBhcmVudE5vZGUobm9kZSl7XG4gIHJldHVybiBub2RlLnBhcmVudEVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIG5leHRTaWJsaW5nKG5vZGUpe1xuICByZXR1cm4gbm9kZS5uZXh0U2libGluZztcbn1cblxuZnVuY3Rpb24gdGFnTmFtZShub2RlKXtcbiAgcmV0dXJuIG5vZGUudGFnTmFtZTtcbn1cblxuZnVuY3Rpb24gc2V0VGV4dENvbnRlbnQobm9kZSwgdGV4dCl7XG4gIG5vZGUudGV4dENvbnRlbnQgPSB0ZXh0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlRWxlbWVudDogY3JlYXRlRWxlbWVudCxcbiAgY3JlYXRlRWxlbWVudE5TOiBjcmVhdGVFbGVtZW50TlMsXG4gIGNyZWF0ZVRleHROb2RlOiBjcmVhdGVUZXh0Tm9kZSxcbiAgYXBwZW5kQ2hpbGQ6IGFwcGVuZENoaWxkLFxuICByZW1vdmVDaGlsZDogcmVtb3ZlQ2hpbGQsXG4gIGluc2VydEJlZm9yZTogaW5zZXJ0QmVmb3JlLFxuICBwYXJlbnROb2RlOiBwYXJlbnROb2RlLFxuICBuZXh0U2libGluZzogbmV4dFNpYmxpbmcsXG4gIHRhZ05hbWU6IHRhZ05hbWUsXG4gIHNldFRleHRDb250ZW50OiBzZXRUZXh0Q29udGVudFxufTtcbiIsIi8vIGpzaGludCBuZXdjYXA6IGZhbHNlXG4vKiBnbG9iYWwgcmVxdWlyZSwgbW9kdWxlLCBkb2N1bWVudCwgTm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVk5vZGUgPSByZXF1aXJlKCcuL3Zub2RlJyk7XG52YXIgaXMgPSByZXF1aXJlKCcuL2lzJyk7XG52YXIgZG9tQXBpID0gcmVxdWlyZSgnLi9odG1sZG9tYXBpJyk7XG5cbmZ1bmN0aW9uIGlzVW5kZWYocykgeyByZXR1cm4gcyA9PT0gdW5kZWZpbmVkOyB9XG5mdW5jdGlvbiBpc0RlZihzKSB7IHJldHVybiBzICE9PSB1bmRlZmluZWQ7IH1cblxudmFyIGVtcHR5Tm9kZSA9IFZOb2RlKCcnLCB7fSwgW10sIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcblxuZnVuY3Rpb24gc2FtZVZub2RlKHZub2RlMSwgdm5vZGUyKSB7XG4gIHJldHVybiB2bm9kZTEua2V5ID09PSB2bm9kZTIua2V5ICYmIHZub2RlMS5zZWwgPT09IHZub2RlMi5zZWw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUtleVRvT2xkSWR4KGNoaWxkcmVuLCBiZWdpbklkeCwgZW5kSWR4KSB7XG4gIHZhciBpLCBtYXAgPSB7fSwga2V5O1xuICBmb3IgKGkgPSBiZWdpbklkeDsgaSA8PSBlbmRJZHg7ICsraSkge1xuICAgIGtleSA9IGNoaWxkcmVuW2ldLmtleTtcbiAgICBpZiAoaXNEZWYoa2V5KSkgbWFwW2tleV0gPSBpO1xuICB9XG4gIHJldHVybiBtYXA7XG59XG5cbnZhciBob29rcyA9IFsnY3JlYXRlJywgJ3VwZGF0ZScsICdyZW1vdmUnLCAnZGVzdHJveScsICdwcmUnLCAncG9zdCddO1xuXG5mdW5jdGlvbiBpbml0KG1vZHVsZXMsIGFwaSkge1xuICB2YXIgaSwgaiwgY2JzID0ge307XG5cbiAgaWYgKGlzVW5kZWYoYXBpKSkgYXBpID0gZG9tQXBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBob29rcy5sZW5ndGg7ICsraSkge1xuICAgIGNic1tob29rc1tpXV0gPSBbXTtcbiAgICBmb3IgKGogPSAwOyBqIDwgbW9kdWxlcy5sZW5ndGg7ICsraikge1xuICAgICAgaWYgKG1vZHVsZXNbal1baG9va3NbaV1dICE9PSB1bmRlZmluZWQpIGNic1tob29rc1tpXV0ucHVzaChtb2R1bGVzW2pdW2hvb2tzW2ldXSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZW1wdHlOb2RlQXQoZWxtKSB7XG4gICAgdmFyIGlkID0gZWxtLmlkID8gJyMnICsgZWxtLmlkIDogJyc7XG4gICAgdmFyIGMgPSBlbG0uY2xhc3NOYW1lID8gJy4nICsgZWxtLmNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJy4nKSA6ICcnO1xuICAgIHJldHVybiBWTm9kZShhcGkudGFnTmFtZShlbG0pLnRvTG93ZXJDYXNlKCkgKyBpZCArIGMsIHt9LCBbXSwgdW5kZWZpbmVkLCBlbG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlUm1DYihjaGlsZEVsbSwgbGlzdGVuZXJzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tbGlzdGVuZXJzID09PSAwKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBhcGkucGFyZW50Tm9kZShjaGlsZEVsbSk7XG4gICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnQsIGNoaWxkRWxtKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICB2YXIgaSwgZGF0YSA9IHZub2RlLmRhdGE7XG4gICAgaWYgKGlzRGVmKGRhdGEpKSB7XG4gICAgICBpZiAoaXNEZWYoaSA9IGRhdGEuaG9vaykgJiYgaXNEZWYoaSA9IGkuaW5pdCkpIHtcbiAgICAgICAgaSh2bm9kZSk7XG4gICAgICAgIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZWxtLCBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuLCBzZWwgPSB2bm9kZS5zZWw7XG4gICAgaWYgKGlzRGVmKHNlbCkpIHtcbiAgICAgIC8vIFBhcnNlIHNlbGVjdG9yXG4gICAgICB2YXIgaGFzaElkeCA9IHNlbC5pbmRleE9mKCcjJyk7XG4gICAgICB2YXIgZG90SWR4ID0gc2VsLmluZGV4T2YoJy4nLCBoYXNoSWR4KTtcbiAgICAgIHZhciBoYXNoID0gaGFzaElkeCA+IDAgPyBoYXNoSWR4IDogc2VsLmxlbmd0aDtcbiAgICAgIHZhciBkb3QgPSBkb3RJZHggPiAwID8gZG90SWR4IDogc2VsLmxlbmd0aDtcbiAgICAgIHZhciB0YWcgPSBoYXNoSWR4ICE9PSAtMSB8fCBkb3RJZHggIT09IC0xID8gc2VsLnNsaWNlKDAsIE1hdGgubWluKGhhc2gsIGRvdCkpIDogc2VsO1xuICAgICAgZWxtID0gdm5vZGUuZWxtID0gaXNEZWYoZGF0YSkgJiYgaXNEZWYoaSA9IGRhdGEubnMpID8gYXBpLmNyZWF0ZUVsZW1lbnROUyhpLCB0YWcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBhcGkuY3JlYXRlRWxlbWVudCh0YWcpO1xuICAgICAgaWYgKGhhc2ggPCBkb3QpIGVsbS5pZCA9IHNlbC5zbGljZShoYXNoICsgMSwgZG90KTtcbiAgICAgIGlmIChkb3RJZHggPiAwKSBlbG0uY2xhc3NOYW1lID0gc2VsLnNsaWNlKGRvdCArIDEpLnJlcGxhY2UoL1xcLi9nLCAnICcpO1xuICAgICAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBjcmVhdGVFbG0oY2hpbGRyZW5baV0sIGluc2VydGVkVm5vZGVRdWV1ZSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzLnByaW1pdGl2ZSh2bm9kZS50ZXh0KSkge1xuICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCkpO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5jcmVhdGUubGVuZ3RoOyArK2kpIGNicy5jcmVhdGVbaV0oZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICBpID0gdm5vZGUuZGF0YS5ob29rOyAvLyBSZXVzZSB2YXJpYWJsZVxuICAgICAgaWYgKGlzRGVmKGkpKSB7XG4gICAgICAgIGlmIChpLmNyZWF0ZSkgaS5jcmVhdGUoZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICAgIGlmIChpLmluc2VydCkgaW5zZXJ0ZWRWbm9kZVF1ZXVlLnB1c2godm5vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlbG0gPSB2bm9kZS5lbG0gPSBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCk7XG4gICAgfVxuICAgIHJldHVybiB2bm9kZS5lbG07XG4gIH1cblxuICBmdW5jdGlvbiBhZGRWbm9kZXMocGFyZW50RWxtLCBiZWZvcmUsIHZub2Rlcywgc3RhcnRJZHgsIGVuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbSh2bm9kZXNbc3RhcnRJZHhdLCBpbnNlcnRlZFZub2RlUXVldWUpLCBiZWZvcmUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGludm9rZURlc3Ryb3lIb29rKHZub2RlKSB7XG4gICAgdmFyIGksIGosIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgIGlmIChpc0RlZihkYXRhKSkge1xuICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLmhvb2spICYmIGlzRGVmKGkgPSBpLmRlc3Ryb3kpKSBpKHZub2RlKTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMuZGVzdHJveS5sZW5ndGg7ICsraSkgY2JzLmRlc3Ryb3lbaV0odm5vZGUpO1xuICAgICAgaWYgKGlzRGVmKGkgPSB2bm9kZS5jaGlsZHJlbikpIHtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IHZub2RlLmNoaWxkcmVuLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgaW52b2tlRGVzdHJveUhvb2sodm5vZGUuY2hpbGRyZW5bal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgdm5vZGVzLCBzdGFydElkeCwgZW5kSWR4KSB7XG4gICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgdmFyIGksIGxpc3RlbmVycywgcm0sIGNoID0gdm5vZGVzW3N0YXJ0SWR4XTtcbiAgICAgIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKGlzRGVmKGNoLnNlbCkpIHtcbiAgICAgICAgICBpbnZva2VEZXN0cm95SG9vayhjaCk7XG4gICAgICAgICAgbGlzdGVuZXJzID0gY2JzLnJlbW92ZS5sZW5ndGggKyAxO1xuICAgICAgICAgIHJtID0gY3JlYXRlUm1DYihjaC5lbG0sIGxpc3RlbmVycyk7XG4gICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5yZW1vdmUubGVuZ3RoOyArK2kpIGNicy5yZW1vdmVbaV0oY2gsIHJtKTtcbiAgICAgICAgICBpZiAoaXNEZWYoaSA9IGNoLmRhdGEpICYmIGlzRGVmKGkgPSBpLmhvb2spICYmIGlzRGVmKGkgPSBpLnJlbW92ZSkpIHtcbiAgICAgICAgICAgIGkoY2gsIHJtKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm0oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIFRleHQgbm9kZVxuICAgICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnRFbG0sIGNoLmVsbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVDaGlsZHJlbihwYXJlbnRFbG0sIG9sZENoLCBuZXdDaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIG9sZFN0YXJ0SWR4ID0gMCwgbmV3U3RhcnRJZHggPSAwO1xuICAgIHZhciBvbGRFbmRJZHggPSBvbGRDaC5sZW5ndGggLSAxO1xuICAgIHZhciBvbGRTdGFydFZub2RlID0gb2xkQ2hbMF07XG4gICAgdmFyIG9sZEVuZFZub2RlID0gb2xkQ2hbb2xkRW5kSWR4XTtcbiAgICB2YXIgbmV3RW5kSWR4ID0gbmV3Q2gubGVuZ3RoIC0gMTtcbiAgICB2YXIgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWzBdO1xuICAgIHZhciBuZXdFbmRWbm9kZSA9IG5ld0NoW25ld0VuZElkeF07XG4gICAgdmFyIG9sZEtleVRvSWR4LCBpZHhJbk9sZCwgZWxtVG9Nb3ZlLCBiZWZvcmU7XG5cbiAgICB3aGlsZSAob2xkU3RhcnRJZHggPD0gb2xkRW5kSWR4ICYmIG5ld1N0YXJ0SWR4IDw9IG5ld0VuZElkeCkge1xuICAgICAgaWYgKGlzVW5kZWYob2xkU3RhcnRWbm9kZSkpIHtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdOyAvLyBWbm9kZSBoYXMgYmVlbiBtb3ZlZCBsZWZ0XG4gICAgICB9IGVsc2UgaWYgKGlzVW5kZWYob2xkRW5kVm5vZGUpKSB7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgfSBlbHNlIGlmIChzYW1lVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3U3RhcnRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRTdGFydFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBvbGRTdGFydFZub2RlID0gb2xkQ2hbKytvbGRTdGFydElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdFbmRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRFbmRWbm9kZSwgbmV3RW5kVm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCByaWdodFxuICAgICAgICBwYXRjaFZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgb2xkU3RhcnRWbm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhvbGRFbmRWbm9kZS5lbG0pKTtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCBsZWZ0XG4gICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBvbGRFbmRWbm9kZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgb2xkRW5kVm5vZGUgPSBvbGRDaFstLW9sZEVuZElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc1VuZGVmKG9sZEtleVRvSWR4KSkgb2xkS2V5VG9JZHggPSBjcmVhdGVLZXlUb09sZElkeChvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgICAgIGlkeEluT2xkID0gb2xkS2V5VG9JZHhbbmV3U3RhcnRWbm9kZS5rZXldO1xuICAgICAgICBpZiAoaXNVbmRlZihpZHhJbk9sZCkpIHsgLy8gTmV3IGVsZW1lbnRcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgY3JlYXRlRWxtKG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSksIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWxtVG9Nb3ZlID0gb2xkQ2hbaWR4SW5PbGRdO1xuICAgICAgICAgIHBhdGNoVm5vZGUoZWxtVG9Nb3ZlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgIG9sZENoW2lkeEluT2xkXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgZWxtVG9Nb3ZlLmVsbSwgb2xkU3RhcnRWbm9kZS5lbG0pO1xuICAgICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAob2xkU3RhcnRJZHggPiBvbGRFbmRJZHgpIHtcbiAgICAgIGJlZm9yZSA9IGlzVW5kZWYobmV3Q2hbbmV3RW5kSWR4KzFdKSA/IG51bGwgOiBuZXdDaFtuZXdFbmRJZHgrMV0uZWxtO1xuICAgICAgYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCBuZXdDaCwgbmV3U3RhcnRJZHgsIG5ld0VuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICB9IGVsc2UgaWYgKG5ld1N0YXJ0SWR4ID4gbmV3RW5kSWR4KSB7XG4gICAgICByZW1vdmVWbm9kZXMocGFyZW50RWxtLCBvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIHZhciBpLCBob29rO1xuICAgIGlmIChpc0RlZihpID0gdm5vZGUuZGF0YSkgJiYgaXNEZWYoaG9vayA9IGkuaG9vaykgJiYgaXNEZWYoaSA9IGhvb2sucHJlcGF0Y2gpKSB7XG4gICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICAgIHZhciBlbG0gPSB2bm9kZS5lbG0gPSBvbGRWbm9kZS5lbG0sIG9sZENoID0gb2xkVm5vZGUuY2hpbGRyZW4sIGNoID0gdm5vZGUuY2hpbGRyZW47XG4gICAgaWYgKG9sZFZub2RlID09PSB2bm9kZSkgcmV0dXJuO1xuICAgIGlmICghc2FtZVZub2RlKG9sZFZub2RlLCB2bm9kZSkpIHtcbiAgICAgIHZhciBwYXJlbnRFbG0gPSBhcGkucGFyZW50Tm9kZShvbGRWbm9kZS5lbG0pO1xuICAgICAgZWxtID0gY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGVsbSwgb2xkVm5vZGUuZWxtKTtcbiAgICAgIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIFtvbGRWbm9kZV0sIDAsIDApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaXNEZWYodm5vZGUuZGF0YSkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMudXBkYXRlLmxlbmd0aDsgKytpKSBjYnMudXBkYXRlW2ldKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgICBpID0gdm5vZGUuZGF0YS5ob29rO1xuICAgICAgaWYgKGlzRGVmKGkpICYmIGlzRGVmKGkgPSBpLnVwZGF0ZSkpIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICB9XG4gICAgaWYgKGlzVW5kZWYodm5vZGUudGV4dCkpIHtcbiAgICAgIGlmIChpc0RlZihvbGRDaCkgJiYgaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChvbGRDaCAhPT0gY2gpIHVwZGF0ZUNoaWxkcmVuKGVsbSwgb2xkQ2gsIGNoLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKGlzRGVmKG9sZFZub2RlLnRleHQpKSBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCAnJyk7XG4gICAgICAgIGFkZFZub2RlcyhlbG0sIG51bGwsIGNoLCAwLCBjaC5sZW5ndGggLSAxLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihvbGRDaCkpIHtcbiAgICAgICAgcmVtb3ZlVm5vZGVzKGVsbSwgb2xkQ2gsIDAsIG9sZENoLmxlbmd0aCAtIDEpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihvbGRWbm9kZS50ZXh0KSkge1xuICAgICAgICBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCAnJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvbGRWbm9kZS50ZXh0ICE9PSB2bm9kZS50ZXh0KSB7XG4gICAgICBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCB2bm9kZS50ZXh0KTtcbiAgICB9XG4gICAgaWYgKGlzRGVmKGhvb2spICYmIGlzRGVmKGkgPSBob29rLnBvc3RwYXRjaCkpIHtcbiAgICAgIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24ob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGksIGVsbSwgcGFyZW50O1xuICAgIHZhciBpbnNlcnRlZFZub2RlUXVldWUgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnByZS5sZW5ndGg7ICsraSkgY2JzLnByZVtpXSgpO1xuXG4gICAgaWYgKGlzVW5kZWYob2xkVm5vZGUuc2VsKSkge1xuICAgICAgb2xkVm5vZGUgPSBlbXB0eU5vZGVBdChvbGRWbm9kZSk7XG4gICAgfVxuXG4gICAgaWYgKHNhbWVWbm9kZShvbGRWbm9kZSwgdm5vZGUpKSB7XG4gICAgICBwYXRjaFZub2RlKG9sZFZub2RlLCB2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxtID0gb2xkVm5vZGUuZWxtO1xuICAgICAgcGFyZW50ID0gYXBpLnBhcmVudE5vZGUoZWxtKTtcblxuICAgICAgY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuXG4gICAgICBpZiAocGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50LCB2bm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhlbG0pKTtcbiAgICAgICAgcmVtb3ZlVm5vZGVzKHBhcmVudCwgW29sZFZub2RlXSwgMCwgMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGluc2VydGVkVm5vZGVRdWV1ZS5sZW5ndGg7ICsraSkge1xuICAgICAgaW5zZXJ0ZWRWbm9kZVF1ZXVlW2ldLmRhdGEuaG9vay5pbnNlcnQoaW5zZXJ0ZWRWbm9kZVF1ZXVlW2ldKTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGNicy5wb3N0Lmxlbmd0aDsgKytpKSBjYnMucG9zdFtpXSgpO1xuICAgIHJldHVybiB2bm9kZTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7aW5pdDogaW5pdH07XG4iLCJ2YXIgVk5vZGUgPSByZXF1aXJlKCcuL3Zub2RlJyk7XG52YXIgaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbmZ1bmN0aW9uIGFkZE5TKGRhdGEsIGNoaWxkcmVuLCBzZWwpIHtcbiAgZGF0YS5ucyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc7XG5cbiAgaWYgKHNlbCAhPT0gJ2ZvcmVpZ25PYmplY3QnICYmIGNoaWxkcmVuICE9PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICBhZGROUyhjaGlsZHJlbltpXS5kYXRhLCBjaGlsZHJlbltpXS5jaGlsZHJlbiwgY2hpbGRyZW5baV0uc2VsKTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBoKHNlbCwgYiwgYykge1xuICB2YXIgZGF0YSA9IHt9LCBjaGlsZHJlbiwgdGV4dCwgaTtcbiAgaWYgKGMgIT09IHVuZGVmaW5lZCkge1xuICAgIGRhdGEgPSBiO1xuICAgIGlmIChpcy5hcnJheShjKSkgeyBjaGlsZHJlbiA9IGM7IH1cbiAgICBlbHNlIGlmIChpcy5wcmltaXRpdmUoYykpIHsgdGV4dCA9IGM7IH1cbiAgfSBlbHNlIGlmIChiICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoaXMuYXJyYXkoYikpIHsgY2hpbGRyZW4gPSBiOyB9XG4gICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGIpKSB7IHRleHQgPSBiOyB9XG4gICAgZWxzZSB7IGRhdGEgPSBiOyB9XG4gIH1cbiAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgaWYgKGlzLnByaW1pdGl2ZShjaGlsZHJlbltpXSkpIGNoaWxkcmVuW2ldID0gVk5vZGUodW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgY2hpbGRyZW5baV0pO1xuICAgIH1cbiAgfVxuICBpZiAoc2VsWzBdID09PSAncycgJiYgc2VsWzFdID09PSAndicgJiYgc2VsWzJdID09PSAnZycpIHtcbiAgICBhZGROUyhkYXRhLCBjaGlsZHJlbiwgc2VsKTtcbiAgfVxuICByZXR1cm4gVk5vZGUoc2VsLCBkYXRhLCBjaGlsZHJlbiwgdGV4dCwgdW5kZWZpbmVkKTtcbn07XG4iLCJmdW5jdGlvbiB1cGRhdGVDbGFzcyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGN1ciwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkQ2xhc3MgPSBvbGRWbm9kZS5kYXRhLmNsYXNzLFxuICAgICAga2xhc3MgPSB2bm9kZS5kYXRhLmNsYXNzO1xuXG4gIGlmICghb2xkQ2xhc3MgJiYgIWtsYXNzKSByZXR1cm47XG4gIG9sZENsYXNzID0gb2xkQ2xhc3MgfHwge307XG4gIGtsYXNzID0ga2xhc3MgfHwge307XG5cbiAgZm9yIChuYW1lIGluIG9sZENsYXNzKSB7XG4gICAgaWYgKCFrbGFzc1tuYW1lXSkge1xuICAgICAgZWxtLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgfVxuICB9XG4gIGZvciAobmFtZSBpbiBrbGFzcykge1xuICAgIGN1ciA9IGtsYXNzW25hbWVdO1xuICAgIGlmIChjdXIgIT09IG9sZENsYXNzW25hbWVdKSB7XG4gICAgICBlbG0uY2xhc3NMaXN0W2N1ciA/ICdhZGQnIDogJ3JlbW92ZSddKG5hbWUpO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZUNsYXNzLCB1cGRhdGU6IHVwZGF0ZUNsYXNzfTtcbiIsImZ1bmN0aW9uIHVwZGF0ZVByb3BzKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIga2V5LCBjdXIsIG9sZCwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkUHJvcHMgPSBvbGRWbm9kZS5kYXRhLnByb3BzLCBwcm9wcyA9IHZub2RlLmRhdGEucHJvcHM7XG5cbiAgaWYgKCFvbGRQcm9wcyAmJiAhcHJvcHMpIHJldHVybjtcbiAgb2xkUHJvcHMgPSBvbGRQcm9wcyB8fCB7fTtcbiAgcHJvcHMgPSBwcm9wcyB8fCB7fTtcblxuICBmb3IgKGtleSBpbiBvbGRQcm9wcykge1xuICAgIGlmICghcHJvcHNba2V5XSkge1xuICAgICAgZGVsZXRlIGVsbVtrZXldO1xuICAgIH1cbiAgfVxuICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgIGN1ciA9IHByb3BzW2tleV07XG4gICAgb2xkID0gb2xkUHJvcHNba2V5XTtcbiAgICBpZiAob2xkICE9PSBjdXIgJiYgKGtleSAhPT0gJ3ZhbHVlJyB8fCBlbG1ba2V5XSAhPT0gY3VyKSkge1xuICAgICAgZWxtW2tleV0gPSBjdXI7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NyZWF0ZTogdXBkYXRlUHJvcHMsIHVwZGF0ZTogdXBkYXRlUHJvcHN9O1xuIiwidmFyIHJhZiA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB8fCBzZXRUaW1lb3V0O1xudmFyIG5leHRGcmFtZSA9IGZ1bmN0aW9uKGZuKSB7IHJhZihmdW5jdGlvbigpIHsgcmFmKGZuKTsgfSk7IH07XG5cbmZ1bmN0aW9uIHNldE5leHRGcmFtZShvYmosIHByb3AsIHZhbCkge1xuICBuZXh0RnJhbWUoZnVuY3Rpb24oKSB7IG9ialtwcm9wXSA9IHZhbDsgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVN0eWxlKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgY3VyLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sXG4gICAgICBvbGRTdHlsZSA9IG9sZFZub2RlLmRhdGEuc3R5bGUsXG4gICAgICBzdHlsZSA9IHZub2RlLmRhdGEuc3R5bGU7XG5cbiAgaWYgKCFvbGRTdHlsZSAmJiAhc3R5bGUpIHJldHVybjtcbiAgb2xkU3R5bGUgPSBvbGRTdHlsZSB8fCB7fTtcbiAgc3R5bGUgPSBzdHlsZSB8fCB7fTtcbiAgdmFyIG9sZEhhc0RlbCA9ICdkZWxheWVkJyBpbiBvbGRTdHlsZTtcblxuICBmb3IgKG5hbWUgaW4gb2xkU3R5bGUpIHtcbiAgICBpZiAoIXN0eWxlW25hbWVdKSB7XG4gICAgICBlbG0uc3R5bGVbbmFtZV0gPSAnJztcbiAgICB9XG4gIH1cbiAgZm9yIChuYW1lIGluIHN0eWxlKSB7XG4gICAgY3VyID0gc3R5bGVbbmFtZV07XG4gICAgaWYgKG5hbWUgPT09ICdkZWxheWVkJykge1xuICAgICAgZm9yIChuYW1lIGluIHN0eWxlLmRlbGF5ZWQpIHtcbiAgICAgICAgY3VyID0gc3R5bGUuZGVsYXllZFtuYW1lXTtcbiAgICAgICAgaWYgKCFvbGRIYXNEZWwgfHwgY3VyICE9PSBvbGRTdHlsZS5kZWxheWVkW25hbWVdKSB7XG4gICAgICAgICAgc2V0TmV4dEZyYW1lKGVsbS5zdHlsZSwgbmFtZSwgY3VyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobmFtZSAhPT0gJ3JlbW92ZScgJiYgY3VyICE9PSBvbGRTdHlsZVtuYW1lXSkge1xuICAgICAgZWxtLnN0eWxlW25hbWVdID0gY3VyO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBseURlc3Ryb3lTdHlsZSh2bm9kZSkge1xuICB2YXIgc3R5bGUsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSwgcyA9IHZub2RlLmRhdGEuc3R5bGU7XG4gIGlmICghcyB8fCAhKHN0eWxlID0gcy5kZXN0cm95KSkgcmV0dXJuO1xuICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICBlbG0uc3R5bGVbbmFtZV0gPSBzdHlsZVtuYW1lXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBseVJlbW92ZVN0eWxlKHZub2RlLCBybSkge1xuICB2YXIgcyA9IHZub2RlLmRhdGEuc3R5bGU7XG4gIGlmICghcyB8fCAhcy5yZW1vdmUpIHtcbiAgICBybSgpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbmFtZSwgZWxtID0gdm5vZGUuZWxtLCBpZHgsIGkgPSAwLCBtYXhEdXIgPSAwLFxuICAgICAgY29tcFN0eWxlLCBzdHlsZSA9IHMucmVtb3ZlLCBhbW91bnQgPSAwLCBhcHBsaWVkID0gW107XG4gIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgIGFwcGxpZWQucHVzaChuYW1lKTtcbiAgICBlbG0uc3R5bGVbbmFtZV0gPSBzdHlsZVtuYW1lXTtcbiAgfVxuICBjb21wU3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsbSk7XG4gIHZhciBwcm9wcyA9IGNvbXBTdHlsZVsndHJhbnNpdGlvbi1wcm9wZXJ0eSddLnNwbGl0KCcsICcpO1xuICBmb3IgKDsgaSA8IHByb3BzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYoYXBwbGllZC5pbmRleE9mKHByb3BzW2ldKSAhPT0gLTEpIGFtb3VudCsrO1xuICB9XG4gIGVsbS5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgZnVuY3Rpb24oZXYpIHtcbiAgICBpZiAoZXYudGFyZ2V0ID09PSBlbG0pIC0tYW1vdW50O1xuICAgIGlmIChhbW91bnQgPT09IDApIHJtKCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZVN0eWxlLCB1cGRhdGU6IHVwZGF0ZVN0eWxlLCBkZXN0cm95OiBhcHBseURlc3Ryb3lTdHlsZSwgcmVtb3ZlOiBhcHBseVJlbW92ZVN0eWxlfTtcbiIsImZ1bmN0aW9uIGludm9rZUhhbmRsZXIoaGFuZGxlciwgdm5vZGUsIGV2ZW50KSB7XG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgLy8gY2FsbCBmdW5jdGlvbiBoYW5kbGVyXG4gICAgaGFuZGxlci5jYWxsKHZub2RlLCBldmVudCwgdm5vZGUpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcIm9iamVjdFwiKSB7XG4gICAgLy8gY2FsbCBoYW5kbGVyIHdpdGggYXJndW1lbnRzXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyWzBdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIHNwZWNpYWwgY2FzZSBmb3Igc2luZ2xlIGFyZ3VtZW50IGZvciBwZXJmb3JtYW5jZVxuICAgICAgaWYgKGhhbmRsZXIubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGhhbmRsZXJbMF0uY2FsbCh2bm9kZSwgaGFuZGxlclsxXSwgZXZlbnQsIHZub2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gaGFuZGxlci5zbGljZSgxKTtcbiAgICAgICAgYXJncy5wdXNoKGV2ZW50KTtcbiAgICAgICAgYXJncy5wdXNoKHZub2RlKTtcbiAgICAgICAgaGFuZGxlclswXS5hcHBseSh2bm9kZSwgYXJncyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNhbGwgbXVsdGlwbGUgaGFuZGxlcnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGFuZGxlci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbnZva2VIYW5kbGVyKGhhbmRsZXJbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCwgdm5vZGUpIHtcbiAgdmFyIG5hbWUgPSBldmVudC50eXBlLFxuICAgICAgb24gPSB2bm9kZS5kYXRhLm9uO1xuXG4gIC8vIGNhbGwgZXZlbnQgaGFuZGxlcihzKSBpZiBleGlzdHNcbiAgaWYgKG9uICYmIG9uW25hbWVdKSB7XG4gICAgaW52b2tlSGFuZGxlcihvbltuYW1lXSwgdm5vZGUsIGV2ZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVMaXN0ZW5lcigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQpIHtcbiAgICBoYW5kbGVFdmVudChldmVudCwgaGFuZGxlci52bm9kZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlRXZlbnRMaXN0ZW5lcnMob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBvbGRPbiA9IG9sZFZub2RlLmRhdGEub24sXG4gICAgICBvbGRMaXN0ZW5lciA9IG9sZFZub2RlLmxpc3RlbmVyLFxuICAgICAgb2xkRWxtID0gb2xkVm5vZGUuZWxtLFxuICAgICAgb24gPSB2bm9kZSAmJiB2bm9kZS5kYXRhLm9uLFxuICAgICAgZWxtID0gdm5vZGUgJiYgdm5vZGUuZWxtLFxuICAgICAgbmFtZTtcblxuICAvLyBvcHRpbWl6YXRpb24gZm9yIHJldXNlZCBpbW11dGFibGUgaGFuZGxlcnNcbiAgaWYgKG9sZE9uID09PSBvbikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHJlbW92ZSBleGlzdGluZyBsaXN0ZW5lcnMgd2hpY2ggbm8gbG9uZ2VyIHVzZWRcbiAgaWYgKG9sZE9uICYmIG9sZExpc3RlbmVyKSB7XG4gICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGRlbGV0ZWQgd2UgcmVtb3ZlIGFsbCBleGlzdGluZyBsaXN0ZW5lcnMgdW5jb25kaXRpb25hbGx5XG4gICAgaWYgKCFvbikge1xuICAgICAgZm9yIChuYW1lIGluIG9sZE9uKSB7XG4gICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lciBpZiBlbGVtZW50IHdhcyBjaGFuZ2VkIG9yIGV4aXN0aW5nIGxpc3RlbmVycyByZW1vdmVkXG4gICAgICAgIG9sZEVsbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9sZExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXIgaWYgZXhpc3RpbmcgbGlzdGVuZXIgcmVtb3ZlZFxuICAgICAgICBpZiAoIW9uW25hbWVdKSB7XG4gICAgICAgICAgb2xkRWxtLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb2xkTGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGFkZCBuZXcgbGlzdGVuZXJzIHdoaWNoIGhhcyBub3QgYWxyZWFkeSBhdHRhY2hlZFxuICBpZiAob24pIHtcbiAgICAvLyByZXVzZSBleGlzdGluZyBsaXN0ZW5lciBvciBjcmVhdGUgbmV3XG4gICAgdmFyIGxpc3RlbmVyID0gdm5vZGUubGlzdGVuZXIgPSBvbGRWbm9kZS5saXN0ZW5lciB8fCBjcmVhdGVMaXN0ZW5lcigpO1xuICAgIC8vIHVwZGF0ZSB2bm9kZSBmb3IgbGlzdGVuZXJcbiAgICBsaXN0ZW5lci52bm9kZSA9IHZub2RlO1xuXG4gICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGFkZGVkIHdlIGFkZCBhbGwgbmVlZGVkIGxpc3RlbmVycyB1bmNvbmRpdGlvbmFsbHlcbiAgICBpZiAoIW9sZE9uKSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb24pIHtcbiAgICAgICAgLy8gYWRkIGxpc3RlbmVyIGlmIGVsZW1lbnQgd2FzIGNoYW5nZWQgb3IgbmV3IGxpc3RlbmVycyBhZGRlZFxuICAgICAgICBlbG0uYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb24pIHtcbiAgICAgICAgLy8gYWRkIGxpc3RlbmVyIGlmIG5ldyBsaXN0ZW5lciBhZGRlZFxuICAgICAgICBpZiAoIW9sZE9uW25hbWVdKSB7XG4gICAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlOiB1cGRhdGVFdmVudExpc3RlbmVycyxcbiAgdXBkYXRlOiB1cGRhdGVFdmVudExpc3RlbmVycyxcbiAgZGVzdHJveTogdXBkYXRlRXZlbnRMaXN0ZW5lcnNcbn07XG4iLCIvKiEgS2VmaXIuanMgdjMuNi4wXG4gKiAgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyXG4gKi9cblxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuXHQoZmFjdG9yeSgoZ2xvYmFsLktlZmlyID0gZ2xvYmFsLktlZmlyIHx8IHt9KSkpO1xufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cblx0ZnVuY3Rpb24gY3JlYXRlT2JqKHByb3RvKSB7XG5cdCAgdmFyIEYgPSBmdW5jdGlvbiAoKSB7fTtcblx0ICBGLnByb3RvdHlwZSA9IHByb3RvO1xuXHQgIHJldHVybiBuZXcgRigpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZXh0ZW5kKHRhcmdldCAvKiwgbWl4aW4xLCBtaXhpbjIuLi4qLykge1xuXHQgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBwcm9wID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZm9yIChwcm9wIGluIGFyZ3VtZW50c1tpXSkge1xuXHQgICAgICB0YXJnZXRbcHJvcF0gPSBhcmd1bWVudHNbaV1bcHJvcF07XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiB0YXJnZXQ7XG5cdH1cblxuXHRmdW5jdGlvbiBpbmhlcml0KENoaWxkLCBQYXJlbnQgLyosIG1peGluMSwgbWl4aW4yLi4uKi8pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBDaGlsZC5wcm90b3R5cGUgPSBjcmVhdGVPYmooUGFyZW50LnByb3RvdHlwZSk7XG5cdCAgQ2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2hpbGQ7XG5cdCAgZm9yIChpID0gMjsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBleHRlbmQoQ2hpbGQucHJvdG90eXBlLCBhcmd1bWVudHNbaV0pO1xuXHQgIH1cblx0ICByZXR1cm4gQ2hpbGQ7XG5cdH1cblxuXHR2YXIgTk9USElORyA9IFsnPG5vdGhpbmc+J107XG5cdHZhciBFTkQgPSAnZW5kJztcblx0dmFyIFZBTFVFID0gJ3ZhbHVlJztcblx0dmFyIEVSUk9SID0gJ2Vycm9yJztcblx0dmFyIEFOWSA9ICdhbnknO1xuXG5cdGZ1bmN0aW9uIGNvbmNhdChhLCBiKSB7XG5cdCAgdmFyIHJlc3VsdCA9IHZvaWQgMCxcblx0ICAgICAgbGVuZ3RoID0gdm9pZCAwLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBqID0gdm9pZCAwO1xuXHQgIGlmIChhLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGI7XG5cdCAgfVxuXHQgIGlmIChiLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGE7XG5cdCAgfVxuXHQgIGogPSAwO1xuXHQgIHJlc3VsdCA9IG5ldyBBcnJheShhLmxlbmd0aCArIGIubGVuZ3RoKTtcblx0ICBsZW5ndGggPSBhLmxlbmd0aDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGorKykge1xuXHQgICAgcmVzdWx0W2pdID0gYVtpXTtcblx0ICB9XG5cdCAgbGVuZ3RoID0gYi5sZW5ndGg7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBqKyspIHtcblx0ICAgIHJlc3VsdFtqXSA9IGJbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kKGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChhcnJbaV0gPT09IHZhbHVlKSB7XG5cdCAgICAgIHJldHVybiBpO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kQnlQcmVkKGFyciwgcHJlZCkge1xuXHQgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHByZWQoYXJyW2ldKSkge1xuXHQgICAgICByZXR1cm4gaTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2xvbmVBcnJheShpbnB1dCkge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2ldID0gaW5wdXRbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmUoaW5wdXQsIGluZGV4KSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gdm9pZCAwLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBqID0gdm9pZCAwO1xuXHQgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgbGVuZ3RoKSB7XG5cdCAgICBpZiAobGVuZ3RoID09PSAxKSB7XG5cdCAgICAgIHJldHVybiBbXTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGggLSAxKTtcblx0ICAgICAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICAgIGlmIChpICE9PSBpbmRleCkge1xuXHQgICAgICAgICAgcmVzdWx0W2pdID0gaW5wdXRbaV07XG5cdCAgICAgICAgICBqKys7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHJldHVybiByZXN1bHQ7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHJldHVybiBpbnB1dDtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBtYXAoaW5wdXQsIGZuKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCksXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaV0gPSBmbihpbnB1dFtpXSk7XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmb3JFYWNoKGFyciwgZm4pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGZuKGFycltpXSk7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gZmlsbEFycmF5KGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGFycltpXSA9IHZhbHVlO1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnRhaW5zKGFyciwgdmFsdWUpIHtcblx0ICByZXR1cm4gZmluZChhcnIsIHZhbHVlKSAhPT0gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBzbGlkZShjdXIsIG5leHQsIG1heCkge1xuXHQgIHZhciBsZW5ndGggPSBNYXRoLm1pbihtYXgsIGN1ci5sZW5ndGggKyAxKSxcblx0ICAgICAgb2Zmc2V0ID0gY3VyLmxlbmd0aCAtIGxlbmd0aCArIDEsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IG9mZnNldDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaSAtIG9mZnNldF0gPSBjdXJbaV07XG5cdCAgfVxuXHQgIHJlc3VsdFtsZW5ndGggLSAxXSA9IG5leHQ7XG5cdCAgcmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCBldmVudCkge1xuXHQgIGlmICh0eXBlID09PSBBTlkpIHtcblx0ICAgIGZuKGV2ZW50KTtcblx0ICB9IGVsc2UgaWYgKHR5cGUgPT09IGV2ZW50LnR5cGUpIHtcblx0ICAgIGlmICh0eXBlID09PSBWQUxVRSB8fCB0eXBlID09PSBFUlJPUikge1xuXHQgICAgICBmbihldmVudC52YWx1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBmbigpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XG5cdCAgdGhpcy5faXRlbXMgPSBbXTtcblx0ICB0aGlzLl9zcGllcyA9IFtdO1xuXHQgIHRoaXMuX2luTG9vcCA9IDA7XG5cdCAgdGhpcy5fcmVtb3ZlZEl0ZW1zID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChEaXNwYXRjaGVyLnByb3RvdHlwZSwge1xuXHQgIGFkZDogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IGNvbmNhdCh0aGlzLl9pdGVtcywgW3sgdHlwZTogdHlwZSwgZm46IGZuIH1dKTtcblx0ICAgIHJldHVybiB0aGlzLl9pdGVtcy5sZW5ndGg7XG5cdCAgfSxcblx0ICByZW1vdmU6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgdmFyIGluZGV4ID0gZmluZEJ5UHJlZCh0aGlzLl9pdGVtcywgZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgcmV0dXJuIHgudHlwZSA9PT0gdHlwZSAmJiB4LmZuID09PSBmbjtcblx0ICAgIH0pO1xuXG5cdCAgICAvLyBpZiB3ZSdyZSBjdXJyZW50bHkgaW4gYSBub3RpZmljYXRpb24gbG9vcCxcblx0ICAgIC8vIHJlbWVtYmVyIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgaWYgKHRoaXMuX2luTG9vcCAhPT0gMCAmJiBpbmRleCAhPT0gLTEpIHtcblx0ICAgICAgaWYgKHRoaXMuX3JlbW92ZWRJdGVtcyA9PT0gbnVsbCkge1xuXHQgICAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcy5wdXNoKHRoaXMuX2l0ZW1zW2luZGV4XSk7XG5cdCAgICB9XG5cblx0ICAgIHRoaXMuX2l0ZW1zID0gcmVtb3ZlKHRoaXMuX2l0ZW1zLCBpbmRleCk7XG5cdCAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgYWRkU3B5OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHRoaXMuX3NwaWVzID0gY29uY2F0KHRoaXMuX3NwaWVzLCBbZm5dKTtcblx0ICAgIHJldHVybiB0aGlzLl9zcGllcy5sZW5ndGg7XG5cdCAgfSxcblxuXG5cdCAgLy8gQmVjYXVzZSBzcGllcyBhcmUgb25seSBldmVyIGEgZnVuY3Rpb24gdGhhdCBwZXJmb3JtIGxvZ2dpbmcgYXNcblx0ICAvLyB0aGVpciBvbmx5IHNpZGUgZWZmZWN0LCB3ZSBkb24ndCBuZWVkIHRoZSBzYW1lIGNvbXBsaWNhdGVkXG5cdCAgLy8gcmVtb3ZhbCBsb2dpYyBsaWtlIGluIHJlbW92ZSgpXG5cdCAgcmVtb3ZlU3B5OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHRoaXMuX3NwaWVzID0gcmVtb3ZlKHRoaXMuX3NwaWVzLCB0aGlzLl9zcGllcy5pbmRleE9mKGZuKSk7XG5cdCAgICByZXR1cm4gdGhpcy5fc3BpZXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgZGlzcGF0Y2g6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgdGhpcy5faW5Mb29wKys7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc3BpZXMgPSB0aGlzLl9zcGllczsgdGhpcy5fc3BpZXMgIT09IG51bGwgJiYgaSA8IHNwaWVzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHNwaWVzW2ldKGV2ZW50KTtcblx0ICAgIH1cblxuXHQgICAgZm9yICh2YXIgX2kgPSAwLCBpdGVtcyA9IHRoaXMuX2l0ZW1zOyBfaSA8IGl0ZW1zLmxlbmd0aDsgX2krKykge1xuXG5cdCAgICAgIC8vIGNsZWFudXAgd2FzIGNhbGxlZFxuXHQgICAgICBpZiAodGhpcy5faXRlbXMgPT09IG51bGwpIHtcblx0ICAgICAgICBicmVhaztcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgICBpZiAodGhpcy5fcmVtb3ZlZEl0ZW1zICE9PSBudWxsICYmIGNvbnRhaW5zKHRoaXMuX3JlbW92ZWRJdGVtcywgaXRlbXNbX2ldKSkge1xuXHQgICAgICAgIGNvbnRpbnVlO1xuXHQgICAgICB9XG5cblx0ICAgICAgY2FsbFN1YnNjcmliZXIoaXRlbXNbX2ldLnR5cGUsIGl0ZW1zW19pXS5mbiwgZXZlbnQpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5faW5Mb29wLS07XG5cdCAgICBpZiAodGhpcy5faW5Mb29wID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBjbGVhbnVwOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IG51bGw7XG5cdCAgICB0aGlzLl9zcGllcyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBPYnNlcnZhYmxlKCkge1xuXHQgIHRoaXMuX2Rpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpO1xuXHQgIHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuXHQgIHRoaXMuX2FsaXZlID0gdHJ1ZTtcblx0ICB0aGlzLl9hY3RpdmF0aW5nID0gZmFsc2U7XG5cdCAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHQgIHRoaXMuX3NweUhhbmRsZXJzID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXG5cdCAgX25hbWU6ICdvYnNlcnZhYmxlJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge30sXG5cdCAgX3NldEFjdGl2ZTogZnVuY3Rpb24gKGFjdGl2ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSAhPT0gYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX2FjdGl2ZSA9IGFjdGl2ZTtcblx0ICAgICAgaWYgKGFjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSB0cnVlO1xuXHQgICAgICAgIHRoaXMuX29uQWN0aXZhdGlvbigpO1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSBmYWxzZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9vbkRlYWN0aXZhdGlvbigpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3NldEFjdGl2ZShmYWxzZSk7XG5cdCAgICB0aGlzLl9kaXNwYXRjaGVyLmNsZWFudXAoKTtcblx0ICAgIHRoaXMuX2Rpc3BhdGNoZXIgPSBudWxsO1xuXHQgICAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2VtaXQ6IGZ1bmN0aW9uICh0eXBlLCB4KSB7XG5cdCAgICBzd2l0Y2ggKHR5cGUpIHtcblx0ICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdFZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RXJyb3I6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9hbGl2ZSA9IGZhbHNlO1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRU5EIH0pO1xuXHQgICAgICB0aGlzLl9jbGVhcigpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uOiBmdW5jdGlvbiAodHlwZSwgZm4pIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmFkZCh0eXBlLCBmbik7XG5cdCAgICAgIHRoaXMuX3NldEFjdGl2ZSh0cnVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB7IHR5cGU6IEVORCB9KTtcblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgX29mZjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdmFyIGNvdW50ID0gdGhpcy5fZGlzcGF0Y2hlci5yZW1vdmUodHlwZSwgZm4pO1xuXHQgICAgICBpZiAoY291bnQgPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9zZXRBY3RpdmUoZmFsc2UpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIG9uVmFsdWU6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKFZBTFVFLCBmbik7XG5cdCAgfSxcblx0ICBvbkVycm9yOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb25FbmQ6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEVORCwgZm4pO1xuXHQgIH0sXG5cdCAgb25Bbnk6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEFOWSwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmVmFsdWU6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihWQUxVRSwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRXJyb3I6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRW5kOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoRU5ELCBmbik7XG5cdCAgfSxcblx0ICBvZmZBbnk6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihBTlksIGZuKTtcblx0ICB9LFxuXHQgIG9ic2VydmU6IGZ1bmN0aW9uIChvYnNlcnZlck9yT25WYWx1ZSwgb25FcnJvciwgb25FbmQpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cdCAgICB2YXIgY2xvc2VkID0gZmFsc2U7XG5cblx0ICAgIHZhciBvYnNlcnZlciA9ICFvYnNlcnZlck9yT25WYWx1ZSB8fCB0eXBlb2Ygb2JzZXJ2ZXJPck9uVmFsdWUgPT09ICdmdW5jdGlvbicgPyB7IHZhbHVlOiBvYnNlcnZlck9yT25WYWx1ZSwgZXJyb3I6IG9uRXJyb3IsIGVuZDogb25FbmQgfSA6IG9ic2VydmVyT3JPblZhbHVlO1xuXG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUgJiYgb2JzZXJ2ZXIudmFsdWUpIHtcblx0ICAgICAgICBvYnNlcnZlci52YWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IgJiYgb2JzZXJ2ZXIuZXJyb3IpIHtcblx0ICAgICAgICBvYnNlcnZlci5lcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIG9ic2VydmVyLmVuZCkge1xuXHQgICAgICAgIG9ic2VydmVyLmVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cblx0ICAgIHRoaXMub25BbnkoaGFuZGxlcik7XG5cblx0ICAgIHJldHVybiB7XG5cdCAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgaWYgKCFjbG9zZWQpIHtcblx0ICAgICAgICAgIF90aGlzLm9mZkFueShoYW5kbGVyKTtcblx0ICAgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgICAgfVxuXHQgICAgICB9LFxuXG5cdCAgICAgIGdldCBjbG9zZWQoKSB7XG5cdCAgICAgICAgcmV0dXJuIGNsb3NlZDtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICB9LFxuXG5cblx0ICAvLyBBIGFuZCBCIG11c3QgYmUgc3ViY2xhc3NlcyBvZiBTdHJlYW0gYW5kIFByb3BlcnR5IChvcmRlciBkb2Vzbid0IG1hdHRlcilcblx0ICBfb2ZTYW1lVHlwZTogZnVuY3Rpb24gKEEsIEIpIHtcblx0ICAgIHJldHVybiBBLnByb3RvdHlwZS5nZXRUeXBlKCkgPT09IHRoaXMuZ2V0VHlwZSgpID8gQSA6IEI7XG5cdCAgfSxcblx0ICBzZXROYW1lOiBmdW5jdGlvbiAoc291cmNlT2JzIC8qIG9wdGlvbmFsICovLCBzZWxmTmFtZSkge1xuXHQgICAgdGhpcy5fbmFtZSA9IHNlbGZOYW1lID8gc291cmNlT2JzLl9uYW1lICsgJy4nICsgc2VsZk5hbWUgOiBzb3VyY2VPYnM7XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIGxvZzogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIG5hbWUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRvU3RyaW5nKCkgOiBhcmd1bWVudHNbMF07XG5cblxuXHQgICAgdmFyIGlzQ3VycmVudCA9IHZvaWQgMDtcblx0ICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHZhciB0eXBlID0gJzwnICsgZXZlbnQudHlwZSArIChpc0N1cnJlbnQgPyAnOmN1cnJlbnQnIDogJycpICsgJz4nO1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgaWYgKCF0aGlzLl9sb2dIYW5kbGVycykge1xuXHQgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fbG9nSGFuZGxlcnMucHVzaCh7IG5hbWU6IG5hbWUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XG5cdCAgICB9XG5cblx0ICAgIGlzQ3VycmVudCA9IHRydWU7XG5cdCAgICB0aGlzLm9uQW55KGhhbmRsZXIpO1xuXHQgICAgaXNDdXJyZW50ID0gZmFsc2U7XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgb2ZmTG9nOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXG5cdCAgICBpZiAodGhpcy5fbG9nSGFuZGxlcnMpIHtcblx0ICAgICAgdmFyIGhhbmRsZXJJbmRleCA9IGZpbmRCeVByZWQodGhpcy5fbG9nSGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgICByZXR1cm4gb2JqLm5hbWUgPT09IG5hbWU7XG5cdCAgICAgIH0pO1xuXHQgICAgICBpZiAoaGFuZGxlckluZGV4ICE9PSAtMSkge1xuXHQgICAgICAgIHRoaXMub2ZmQW55KHRoaXMuX2xvZ0hhbmRsZXJzW2hhbmRsZXJJbmRleF0uaGFuZGxlcik7XG5cdCAgICAgICAgdGhpcy5fbG9nSGFuZGxlcnMuc3BsaWNlKGhhbmRsZXJJbmRleCwgMSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBzcHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICB2YXIgdHlwZSA9ICc8JyArIGV2ZW50LnR5cGUgKyAnPic7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgaWYgKCF0aGlzLl9zcHlIYW5kbGVycykge1xuXHQgICAgICAgIHRoaXMuX3NweUhhbmRsZXJzID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fc3B5SGFuZGxlcnMucHVzaCh7IG5hbWU6IG5hbWUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuYWRkU3B5KGhhbmRsZXIpO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBvZmZTcHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICBpZiAodGhpcy5fc3B5SGFuZGxlcnMpIHtcblx0ICAgICAgdmFyIGhhbmRsZXJJbmRleCA9IGZpbmRCeVByZWQodGhpcy5fc3B5SGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgICByZXR1cm4gb2JqLm5hbWUgPT09IG5hbWU7XG5cdCAgICAgIH0pO1xuXHQgICAgICBpZiAoaGFuZGxlckluZGV4ICE9PSAtMSkge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIucmVtb3ZlU3B5KHRoaXMuX3NweUhhbmRsZXJzW2hhbmRsZXJJbmRleF0uaGFuZGxlcik7XG5cdCAgICAgICAgdGhpcy5fc3B5SGFuZGxlcnMuc3BsaWNlKGhhbmRsZXJJbmRleCwgMSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH1cblx0fSk7XG5cblx0Ly8gZXh0ZW5kKCkgY2FuJ3QgaGFuZGxlIGB0b1N0cmluZ2AgaW4gSUU4XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiAnWycgKyB0aGlzLl9uYW1lICsgJ10nO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIFN0cmVhbSgpIHtcblx0ICBPYnNlcnZhYmxlLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFN0cmVhbSwgT2JzZXJ2YWJsZSwge1xuXG5cdCAgX25hbWU6ICdzdHJlYW0nLFxuXG5cdCAgZ2V0VHlwZTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuICdzdHJlYW0nO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gUHJvcGVydHkoKSB7XG5cdCAgT2JzZXJ2YWJsZS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFByb3BlcnR5LCBPYnNlcnZhYmxlLCB7XG5cblx0ICBfbmFtZTogJ3Byb3BlcnR5JyxcblxuXHQgIF9lbWl0VmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9O1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFcnJvcjogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH07XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdEVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlID0gZmFsc2U7XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFTkQgfSk7XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fY2xlYXIoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5hZGQodHlwZSwgZm4pO1xuXHQgICAgICB0aGlzLl9zZXRBY3RpdmUodHJ1ZSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ICE9PSBudWxsKSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB0aGlzLl9jdXJyZW50RXZlbnQpO1xuXHQgICAgfVxuXHQgICAgaWYgKCF0aGlzLl9hbGl2ZSkge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgeyB0eXBlOiBFTkQgfSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiAncHJvcGVydHknO1xuXHQgIH1cblx0fSk7XG5cblx0dmFyIG5ldmVyUyA9IG5ldyBTdHJlYW0oKTtcblx0bmV2ZXJTLl9lbWl0RW5kKCk7XG5cdG5ldmVyUy5fbmFtZSA9ICduZXZlcic7XG5cblx0ZnVuY3Rpb24gbmV2ZXIoKSB7XG5cdCAgcmV0dXJuIG5ldmVyUztcblx0fVxuXG5cdGZ1bmN0aW9uIHRpbWVCYXNlZChtaXhpbikge1xuXG5cdCAgZnVuY3Rpb24gQW5vbnltb3VzU3RyZWFtKHdhaXQsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fb25UaWNrKCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpbmhlcml0KEFub255bW91c1N0cmVhbSwgU3RyZWFtLCB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblx0ICB9LCBtaXhpbik7XG5cblx0ICByZXR1cm4gQW5vbnltb3VzU3RyZWFtO1xuXHR9XG5cblx0dmFyIFMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdsYXRlcicsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB4ID0gX3JlZi54O1xuXG5cdCAgICB0aGlzLl94ID0geDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94ID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94KTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGxhdGVyKHdhaXQsIHgpIHtcblx0ICByZXR1cm4gbmV3IFMod2FpdCwgeyB4OiB4IH0pO1xuXHR9XG5cblx0dmFyIFMkMSA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2ludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIHggPSBfcmVmLng7XG5cblx0ICAgIHRoaXMuX3ggPSB4O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3ggPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3gpO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gaW50ZXJ2YWwod2FpdCwgeCkge1xuXHQgIHJldHVybiBuZXcgUyQxKHdhaXQsIHsgeDogeCB9KTtcblx0fVxuXG5cdHZhciBTJDIgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdzZXF1ZW50aWFsbHknLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgeHMgPSBfcmVmLnhzO1xuXG5cdCAgICB0aGlzLl94cyA9IGNsb25lQXJyYXkoeHMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hzID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl94cy5sZW5ndGggPT09IDEpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzWzBdKTtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzLnNoaWZ0KCkpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc2VxdWVudGlhbGx5KHdhaXQsIHhzKSB7XG5cdCAgcmV0dXJuIHhzLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgUyQyKHdhaXQsIHsgeHM6IHhzIH0pO1xuXHR9XG5cblx0dmFyIFMkMyA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2Zyb21Qb2xsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbigpKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGZyb21Qb2xsKHdhaXQsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDMod2FpdCwgeyBmbjogZm4gfSk7XG5cdH1cblxuXHRmdW5jdGlvbiBlbWl0dGVyKG9icykge1xuXG5cdCAgZnVuY3Rpb24gdmFsdWUoeCkge1xuXHQgICAgb2JzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXJyb3IoeCkge1xuXHQgICAgb2JzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZW5kKCkge1xuXHQgICAgb2JzLl9lbWl0RW5kKCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXZlbnQoZSkge1xuXHQgICAgb2JzLl9lbWl0KGUudHlwZSwgZS52YWx1ZSk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIHtcblx0ICAgIHZhbHVlOiB2YWx1ZSxcblx0ICAgIGVycm9yOiBlcnJvcixcblx0ICAgIGVuZDogZW5kLFxuXHQgICAgZXZlbnQ6IGV2ZW50LFxuXG5cdCAgICAvLyBsZWdhY3lcblx0ICAgIGVtaXQ6IHZhbHVlLFxuXHQgICAgZW1pdEV2ZW50OiBldmVudFxuXHQgIH07XG5cdH1cblxuXHR2YXIgUyQ0ID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnd2l0aEludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBlbWl0dGVyKHRoaXMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBmbih0aGlzLl9lbWl0dGVyKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHdpdGhJbnRlcnZhbCh3YWl0LCBmbikge1xuXHQgIHJldHVybiBuZXcgUyQ0KHdhaXQsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gUyQ1KGZuKSB7XG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fZm4gPSBmbjtcblx0ICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFMkNSwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ3N0cmVhbScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciB1bnN1YnNjcmliZSA9IGZuKGVtaXR0ZXIodGhpcykpO1xuXHQgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSB0eXBlb2YgdW5zdWJzY3JpYmUgPT09ICdmdW5jdGlvbicgPyB1bnN1YnNjcmliZSA6IG51bGw7XG5cblx0ICAgIC8vIGZpeCBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzM1XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9jYWxsVW5zdWJzY3JpYmUoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jYWxsVW5zdWJzY3JpYmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl91bnN1YnNjcmliZSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSgpO1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2NhbGxVbnN1YnNjcmliZSgpO1xuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc3RyZWFtKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDUoZm4pO1xuXHR9XG5cblx0ZnVuY3Rpb24gZnJvbUNhbGxiYWNrKGNhbGxiYWNrQ29uc3VtZXIpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgY2FsbGJhY2tDb25zdW1lcihmdW5jdGlvbiAoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9KTtcblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tQ2FsbGJhY2snKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21Ob2RlQ2FsbGJhY2soY2FsbGJhY2tDb25zdW1lcikge1xuXG5cdCAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuXG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICBjYWxsYmFja0NvbnN1bWVyKGZ1bmN0aW9uIChlcnJvciwgeCkge1xuXHQgICAgICAgIGlmIChlcnJvcikge1xuXHQgICAgICAgICAgZW1pdHRlci5lcnJvcihlcnJvcik7XG5cdCAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICB9XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbU5vZGVDYWxsYmFjaycpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc3ByZWFkKGZuLCBsZW5ndGgpIHtcblx0ICBzd2l0Y2ggKGxlbmd0aCkge1xuXHQgICAgY2FzZSAwOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIHJldHVybiBmbigpO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAxOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDI6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMzpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSA0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG5cdCAgICAgIH07XG5cdCAgICBkZWZhdWx0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICAgIH07XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwbHkoZm4sIGMsIGEpIHtcblx0ICB2YXIgYUxlbmd0aCA9IGEgPyBhLmxlbmd0aCA6IDA7XG5cdCAgaWYgKGMgPT0gbnVsbCkge1xuXHQgICAgc3dpdGNoIChhTGVuZ3RoKSB7XG5cdCAgICAgIGNhc2UgMDpcblx0ICAgICAgICByZXR1cm4gZm4oKTtcblx0ICAgICAgY2FzZSAxOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdKTtcblx0ICAgICAgY2FzZSAyOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgY2FzZSAzOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdKTtcblx0ICAgICAgY2FzZSA0OlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdLCBhWzNdKTtcblx0ICAgICAgZGVmYXVsdDpcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHN3aXRjaCAoYUxlbmd0aCkge1xuXHQgICAgICBjYXNlIDA6XG5cdCAgICAgICAgcmV0dXJuIGZuLmNhbGwoYyk7XG5cdCAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KGMsIGEpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21TdWJVbnN1YihzdWIsIHVuc3ViLCB0cmFuc2Zvcm1lciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSB0cmFuc2Zvcm1lciA/IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgZW1pdHRlci5lbWl0KGFwcGx5KHRyYW5zZm9ybWVyLCB0aGlzLCBhcmd1bWVudHMpKTtcblx0ICAgIH0gOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICB9O1xuXG5cdCAgICBzdWIoaGFuZGxlcik7XG5cdCAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gdW5zdWIoaGFuZGxlcik7XG5cdCAgICB9O1xuXHQgIH0pLnNldE5hbWUoJ2Zyb21TdWJVbnN1YicpO1xuXHR9XG5cblx0dmFyIHBhaXJzID0gW1snYWRkRXZlbnRMaXN0ZW5lcicsICdyZW1vdmVFdmVudExpc3RlbmVyJ10sIFsnYWRkTGlzdGVuZXInLCAncmVtb3ZlTGlzdGVuZXInXSwgWydvbicsICdvZmYnXV07XG5cblx0ZnVuY3Rpb24gZnJvbUV2ZW50cyh0YXJnZXQsIGV2ZW50TmFtZSwgdHJhbnNmb3JtZXIpIHtcblx0ICB2YXIgc3ViID0gdm9pZCAwLFxuXHQgICAgICB1bnN1YiA9IHZvaWQgMDtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzBdXSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzFdXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgICBzdWIgPSBwYWlyc1tpXVswXTtcblx0ICAgICAgdW5zdWIgPSBwYWlyc1tpXVsxXTtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9XG5cdCAgfVxuXG5cdCAgaWYgKHN1YiA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ3RhcmdldCBkb25cXCd0IHN1cHBvcnQgYW55IG9mICcgKyAnYWRkRXZlbnRMaXN0ZW5lci9yZW1vdmVFdmVudExpc3RlbmVyLCBhZGRMaXN0ZW5lci9yZW1vdmVMaXN0ZW5lciwgb24vb2ZmIG1ldGhvZCBwYWlyJyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIGZyb21TdWJVbnN1YihmdW5jdGlvbiAoaGFuZGxlcikge1xuXHQgICAgcmV0dXJuIHRhcmdldFtzdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcblx0ICAgIHJldHVybiB0YXJnZXRbdW5zdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgdHJhbnNmb3JtZXIpLnNldE5hbWUoJ2Zyb21FdmVudHMnKTtcblx0fVxuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQKHZhbHVlKSB7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiAndmFsdWUnLCB2YWx1ZTogdmFsdWUsIGN1cnJlbnQ6IHRydWUgfTtcblx0fVxuXG5cdGluaGVyaXQoUCwgUHJvcGVydHksIHtcblx0ICBfbmFtZTogJ2NvbnN0YW50Jyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0ZnVuY3Rpb24gY29uc3RhbnQoeCkge1xuXHQgIHJldHVybiBuZXcgUCh4KTtcblx0fVxuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQJDEodmFsdWUpIHtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6ICdlcnJvcicsIHZhbHVlOiB2YWx1ZSwgY3VycmVudDogdHJ1ZSB9O1xuXHR9XG5cblx0aW5oZXJpdChQJDEsIFByb3BlcnR5LCB7XG5cdCAgX25hbWU6ICdjb25zdGFudEVycm9yJyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0ZnVuY3Rpb24gY29uc3RhbnRFcnJvcih4KSB7XG5cdCAgcmV0dXJuIG5ldyBQJDEoeCk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb25zdHJ1Y3RvcihCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShzb3VyY2UsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgICAgdGhpcy5fbmFtZSA9IHNvdXJjZS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9pbml0KG9wdGlvbnMpO1xuXHQgICAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDbGFzc01ldGhvZHMoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblx0ICAgIF9pbml0OiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZUVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVORDpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfSxcblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblx0ICAgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBCYXNlQ2xhc3MucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTdHJlYW0obmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUyA9IGNyZWF0ZUNvbnN0cnVjdG9yKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyhTdHJlYW0pLCBtaXhpbik7XG5cdCAgcmV0dXJuIFM7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVQcm9wZXJ0eShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBQID0gY3JlYXRlQ29uc3RydWN0b3IoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyhQcm9wZXJ0eSksIG1peGluKTtcblx0ICByZXR1cm4gUDtcblx0fVxuXG5cdHZhciBQJDIgPSBjcmVhdGVQcm9wZXJ0eSgndG9Qcm9wZXJ0eScsIHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2dldEluaXRpYWxDdXJyZW50ID0gZm47XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQgIT09IG51bGwpIHtcblx0ICAgICAgdmFyIGdldEluaXRpYWwgPSB0aGlzLl9nZXRJbml0aWFsQ3VycmVudDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGdldEluaXRpYWwoKSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHRvUHJvcGVydHkob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIGlmIChmbiAhPT0gbnVsbCAmJiB0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHRocm93IG5ldyBFcnJvcignWW91IHNob3VsZCBjYWxsIHRvUHJvcGVydHkoKSB3aXRoIGEgZnVuY3Rpb24gb3Igbm8gYXJndW1lbnRzLicpO1xuXHQgIH1cblx0ICByZXR1cm4gbmV3IFAkMihvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIFMkNiA9IGNyZWF0ZVN0cmVhbSgnY2hhbmdlcycsIHtcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNoYW5nZXMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDYob2JzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21Qcm9taXNlKHByb21pc2UpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHZhciByZXN1bHQgPSBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIHZhciBvblZhbHVlID0gZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIG9uRXJyb3IgPSBmdW5jdGlvbiAoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZXJyb3IoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIF9wcm9taXNlID0gcHJvbWlzZS50aGVuKG9uVmFsdWUsIG9uRXJyb3IpO1xuXG5cdCAgICAgIC8vIHByZXZlbnQgbGlicmFyaWVzIGxpa2UgJ1EnIG9yICd3aGVuJyBmcm9tIHN3YWxsb3dpbmcgZXhjZXB0aW9uc1xuXHQgICAgICBpZiAoX3Byb21pc2UgJiYgdHlwZW9mIF9wcm9taXNlLmRvbmUgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgICAgICBfcHJvbWlzZS5kb25lKCk7XG5cdCAgICAgIH1cblxuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pO1xuXG5cdCAgcmV0dXJuIHRvUHJvcGVydHkocmVzdWx0LCBudWxsKS5zZXROYW1lKCdmcm9tUHJvbWlzZScpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0R2xvZGFsUHJvbWlzZSgpIHtcblx0ICBpZiAodHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHJldHVybiBQcm9taXNlO1xuXHQgIH0gZWxzZSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzblxcJ3QgZGVmYXVsdCBQcm9taXNlLCB1c2Ugc2hpbSBvciBwYXJhbWV0ZXInKTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiB0b1Byb21pc2UgKG9icykge1xuXHQgIHZhciBQcm9taXNlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZ2V0R2xvZGFsUHJvbWlzZSgpIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgdmFyIGxhc3QgPSBudWxsO1xuXHQgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICBvYnMub25BbnkoZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQgJiYgbGFzdCAhPT0gbnVsbCkge1xuXHQgICAgICAgIChsYXN0LnR5cGUgPT09IFZBTFVFID8gcmVzb2x2ZSA6IHJlamVjdCkobGFzdC52YWx1ZSk7XG5cdCAgICAgICAgbGFzdCA9IG51bGw7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgbGFzdCA9IGV2ZW50O1xuXHQgICAgICB9XG5cdCAgICB9KTtcblx0ICB9KTtcblx0fVxuXG5cdHZhciBjb21tb25qc0dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDoge31cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21tb25qc01vZHVsZShmbiwgbW9kdWxlKSB7XG5cdFx0cmV0dXJuIG1vZHVsZSA9IHsgZXhwb3J0czoge30gfSwgZm4obW9kdWxlLCBtb2R1bGUuZXhwb3J0cyksIG1vZHVsZS5leHBvcnRzO1xuXHR9XG5cblx0dmFyIHBvbnlmaWxsID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdFx0dmFsdWU6IHRydWVcblx0fSk7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IHN5bWJvbE9ic2VydmFibGVQb255ZmlsbDtcblx0ZnVuY3Rpb24gc3ltYm9sT2JzZXJ2YWJsZVBvbnlmaWxsKHJvb3QpIHtcblx0XHR2YXIgcmVzdWx0O1xuXHRcdHZhciBfU3ltYm9sID0gcm9vdC5TeW1ib2w7XG5cblx0XHRpZiAodHlwZW9mIF9TeW1ib2wgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdGlmIChfU3ltYm9sLm9ic2VydmFibGUpIHtcblx0XHRcdFx0cmVzdWx0ID0gX1N5bWJvbC5vYnNlcnZhYmxlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVzdWx0ID0gX1N5bWJvbCgnb2JzZXJ2YWJsZScpO1xuXHRcdFx0XHRfU3ltYm9sLm9ic2VydmFibGUgPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCA9ICdAQG9ic2VydmFibGUnO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH07XG5cdH0pO1xuXG5cdHZhciByZXF1aXJlJCQwJDEgPSAocG9ueWZpbGwgJiYgdHlwZW9mIHBvbnlmaWxsID09PSAnb2JqZWN0JyAmJiAnZGVmYXVsdCcgaW4gcG9ueWZpbGwgPyBwb255ZmlsbFsnZGVmYXVsdCddIDogcG9ueWZpbGwpO1xuXG5cdHZhciBpbmRleCQxID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdFx0dmFsdWU6IHRydWVcblx0fSk7XG5cblx0dmFyIF9wb255ZmlsbCA9IHJlcXVpcmUkJDAkMTtcblxuXHR2YXIgX3BvbnlmaWxsMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3BvbnlmaWxsKTtcblxuXHRmdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikge1xuXHRcdHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07XG5cdH1cblxuXHR2YXIgcm9vdCA9IHVuZGVmaW5lZDsgLyogZ2xvYmFsIHdpbmRvdyAqL1xuXG5cdGlmICh0eXBlb2YgY29tbW9uanNHbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0cm9vdCA9IGNvbW1vbmpzR2xvYmFsO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0cm9vdCA9IHdpbmRvdztcblx0fVxuXG5cdHZhciByZXN1bHQgPSAoMCwgX3BvbnlmaWxsMlsnZGVmYXVsdCddKShyb290KTtcblx0ZXhwb3J0c1snZGVmYXVsdCddID0gcmVzdWx0O1xuXHR9KTtcblxuXHR2YXIgcmVxdWlyZSQkMCA9IChpbmRleCQxICYmIHR5cGVvZiBpbmRleCQxID09PSAnb2JqZWN0JyAmJiAnZGVmYXVsdCcgaW4gaW5kZXgkMSA/IGluZGV4JDFbJ2RlZmF1bHQnXSA6IGluZGV4JDEpO1xuXG5cdHZhciBpbmRleCA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUpIHtcblx0bW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlJCQwO1xuXHR9KTtcblxuXHR2YXIgJCRvYnNlcnZhYmxlID0gKGluZGV4ICYmIHR5cGVvZiBpbmRleCA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIGluZGV4ID8gaW5kZXhbJ2RlZmF1bHQnXSA6IGluZGV4KTtcblxuXHRmdW5jdGlvbiBmcm9tRVNPYnNlcnZhYmxlKF9vYnNlcnZhYmxlKSB7XG5cdCAgdmFyIG9ic2VydmFibGUgPSBfb2JzZXJ2YWJsZVskJG9ic2VydmFibGVdID8gX29ic2VydmFibGVbJCRvYnNlcnZhYmxlXSgpIDogX29ic2VydmFibGU7XG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXHQgICAgdmFyIHVuc3ViID0gb2JzZXJ2YWJsZS5zdWJzY3JpYmUoe1xuXHQgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG5cdCAgICAgICAgZW1pdHRlci5lcnJvcihlcnJvcik7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSxcblx0ICAgICAgbmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHZhbHVlKTtcblx0ICAgICAgfSxcblx0ICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9KTtcblxuXHQgICAgaWYgKHVuc3ViLnVuc3Vic2NyaWJlKSB7XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgdW5zdWIudW5zdWJzY3JpYmUoKTtcblx0ICAgICAgfTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJldHVybiB1bnN1Yjtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tRVNPYnNlcnZhYmxlJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBFU09ic2VydmFibGUob2JzZXJ2YWJsZSkge1xuXHQgIHRoaXMuX29ic2VydmFibGUgPSBvYnNlcnZhYmxlLnRha2VFcnJvcnMoMSk7XG5cdH1cblxuXHRleHRlbmQoRVNPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXHQgIHN1YnNjcmliZTogZnVuY3Rpb24gKG9ic2VydmVyT3JPbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGUpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciBvYnNlcnZlciA9IHR5cGVvZiBvYnNlcnZlck9yT25OZXh0ID09PSAnZnVuY3Rpb24nID8geyBuZXh0OiBvYnNlcnZlck9yT25OZXh0LCBlcnJvcjogb25FcnJvciwgY29tcGxldGU6IG9uQ29tcGxldGUgfSA6IG9ic2VydmVyT3JPbk5leHQ7XG5cblx0ICAgIHZhciBmbiA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSAmJiBvYnNlcnZlci5uZXh0KSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIubmV4dChldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IgJiYgb2JzZXJ2ZXIuZXJyb3IpIHtcblx0ICAgICAgICBvYnNlcnZlci5lcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIG9ic2VydmVyLmNvbXBsZXRlKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICB0aGlzLl9vYnNlcnZhYmxlLm9uQW55KGZuKTtcblx0ICAgIHZhciBjbG9zZWQgPSBmYWxzZTtcblxuXHQgICAgdmFyIHN1YnNjcmlwdGlvbiA9IHtcblx0ICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICBjbG9zZWQgPSB0cnVlO1xuXHQgICAgICAgIF90aGlzLl9vYnNlcnZhYmxlLm9mZkFueShmbik7XG5cdCAgICAgIH0sXG5cdCAgICAgIGdldCBjbG9zZWQoKSB7XG5cdCAgICAgICAgcmV0dXJuIGNsb3NlZDtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICAgIHJldHVybiBzdWJzY3JpcHRpb247XG5cdCAgfVxuXHR9KTtcblxuXHQvLyBOZWVkIHRvIGFzc2lnbiBkaXJlY3RseSBiL2MgU3ltYm9scyBhcmVuJ3QgZW51bWVyYWJsZS5cblx0RVNPYnNlcnZhYmxlLnByb3RvdHlwZVskJG9ic2VydmFibGVdID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHRvRVNPYnNlcnZhYmxlKCkge1xuXHQgIHJldHVybiBuZXcgRVNPYnNlcnZhYmxlKHRoaXMpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IoZXJyb3JzKSB7XG5cdCAgdmFyIGxhdGVzdEVycm9yID0gdm9pZCAwO1xuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgZXJyb3JzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAoZXJyb3JzW2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgaWYgKGxhdGVzdEVycm9yID09PSB1bmRlZmluZWQgfHwgbGF0ZXN0RXJyb3IuaW5kZXggPCBlcnJvcnNbaV0uaW5kZXgpIHtcblx0ICAgICAgICBsYXRlc3RFcnJvciA9IGVycm9yc1tpXTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gbGF0ZXN0RXJyb3IuZXJyb3I7XG5cdH1cblxuXHRmdW5jdGlvbiBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9hY3RpdmVDb3VudCA9IGFjdGl2ZS5sZW5ndGg7XG5cdCAgdGhpcy5fc291cmNlcyA9IGNvbmNhdChhY3RpdmUsIHBhc3NpdmUpO1xuXHQgIHRoaXMuX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gc3ByZWFkKGNvbWJpbmF0b3IsIHRoaXMuX3NvdXJjZXMubGVuZ3RoKSA6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICByZXR1cm4geDtcblx0ICB9O1xuXHQgIHRoaXMuX2FsaXZlQ291bnQgPSAwO1xuXHQgIHRoaXMuX2xhdGVzdFZhbHVlcyA9IG5ldyBBcnJheSh0aGlzLl9zb3VyY2VzLmxlbmd0aCk7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbmV3IEFycmF5KHRoaXMuX3NvdXJjZXMubGVuZ3RoKTtcblx0ICBmaWxsQXJyYXkodGhpcy5fbGF0ZXN0VmFsdWVzLCBOT1RISU5HKTtcblx0ICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JJbmRleCA9IDA7XG5cblx0ICB0aGlzLl8kaGFuZGxlcnMgPSBbXTtcblxuXHQgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIChpKSB7XG5cdCAgICBfdGhpcy5fJGhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGksIGV2ZW50KTtcblx0ICAgIH0pO1xuXHQgIH07XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIF9sb29wKGkpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQ29tYmluZSwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ2NvbWJpbmUnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYWxpdmVDb3VudCA9IHRoaXMuX2FjdGl2ZUNvdW50O1xuXG5cdCAgICAvLyB3ZSBuZWVkIHRvIHN1c2NyaWJlIHRvIF9wYXNzaXZlXyBzb3VyY2VzIGJlZm9yZSBfYWN0aXZlX1xuXHQgICAgLy8gKHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzk4KVxuXHQgICAgZm9yICh2YXIgaSA9IHRoaXMuX2FjdGl2ZUNvdW50OyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgdGhpcy5fYWN0aXZlQ291bnQ7IF9pKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tfaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW19pXSk7XG5cdCAgICB9XG5cblx0ICAgIGlmICh0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSBmYWxzZTtcblx0ICAgICAgdGhpcy5fZW1pdElmRnVsbCgpO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbikge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBsZW5ndGggPSB0aGlzLl9zb3VyY2VzLmxlbmd0aCxcblx0ICAgICAgICBpID0gdm9pZCAwO1xuXHQgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub2ZmQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdElmRnVsbDogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGhhc0FsbFZhbHVlcyA9IHRydWU7XG5cdCAgICB2YXIgaGFzRXJyb3JzID0gZmFsc2U7XG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fbGF0ZXN0VmFsdWVzLmxlbmd0aDtcblx0ICAgIHZhciB2YWx1ZXNDb3B5ID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cdCAgICB2YXIgZXJyb3JzQ29weSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHZhbHVlc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RWYWx1ZXNbaV07XG5cdCAgICAgIGVycm9yc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RFcnJvcnNbaV07XG5cblx0ICAgICAgaWYgKHZhbHVlc0NvcHlbaV0gPT09IE5PVEhJTkcpIHtcblx0ICAgICAgICBoYXNBbGxWYWx1ZXMgPSBmYWxzZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChlcnJvcnNDb3B5W2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgICBoYXNFcnJvcnMgPSB0cnVlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIGlmIChoYXNBbGxWYWx1ZXMpIHtcblx0ICAgICAgdmFyIGNvbWJpbmF0b3IgPSB0aGlzLl9jb21iaW5hdG9yO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXNDb3B5KSk7XG5cdCAgICB9XG5cdCAgICBpZiAoaGFzRXJyb3JzKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihkZWZhdWx0RXJyb3JzQ29tYmluYXRvcihlcnJvcnNDb3B5KSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoaSwgZXZlbnQpIHtcblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFIHx8IGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0VmFsdWVzW2ldID0gZXZlbnQudmFsdWU7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0gdW5kZWZpbmVkO1xuXHQgICAgICB9XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdFZhbHVlc1tpXSA9IE5PVEhJTkc7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0ge1xuXHQgICAgICAgICAgaW5kZXg6IHRoaXMuX2xhdGVzdEVycm9ySW5kZXgrKyxcblx0ICAgICAgICAgIGVycm9yOiBldmVudC52YWx1ZVxuXHQgICAgICAgIH07XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0SWZGdWxsKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICAvLyBFTkRcblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICAgIGlmICh0aGlzLl9hbGl2ZUNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgICAgICB0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICAgICAgfVxuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXRlc3RWYWx1ZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbWJpbmUoYWN0aXZlKSB7XG5cdCAgdmFyIHBhc3NpdmUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBbXSA6IGFyZ3VtZW50c1sxXTtcblx0ICB2YXIgY29tYmluYXRvciA9IGFyZ3VtZW50c1syXTtcblxuXHQgIGlmICh0eXBlb2YgcGFzc2l2ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgY29tYmluYXRvciA9IHBhc3NpdmU7XG5cdCAgICBwYXNzaXZlID0gW107XG5cdCAgfVxuXHQgIHJldHVybiBhY3RpdmUubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcik7XG5cdH1cblxuXHR2YXIgT2JzZXJ2YWJsZSQxID0ge1xuXHQgIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gbmV2ZXIoKTtcblx0ICB9LFxuXG5cblx0ICAvLyBNb25vaWQgYmFzZWQgb24gbWVyZ2UoKSBzZWVtcyBtb3JlIHVzZWZ1bCB0aGFuIG9uZSBiYXNlZCBvbiBjb25jYXQoKS5cblx0ICBjb25jYXQ6IGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gYS5tZXJnZShiKTtcblx0ICB9LFxuXHQgIG9mOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIGNvbnN0YW50KHgpO1xuXHQgIH0sXG5cdCAgbWFwOiBmdW5jdGlvbiAoZm4sIG9icykge1xuXHQgICAgcmV0dXJuIG9icy5tYXAoZm4pO1xuXHQgIH0sXG5cdCAgYmltYXA6IGZ1bmN0aW9uIChmbkVyciwgZm5WYWwsIG9icykge1xuXHQgICAgcmV0dXJuIG9icy5tYXBFcnJvcnMoZm5FcnIpLm1hcChmblZhbCk7XG5cdCAgfSxcblxuXG5cdCAgLy8gVGhpcyBhcCBzdHJpY3RseSBzcGVha2luZyBpbmNvbXBhdGlibGUgd2l0aCBjaGFpbi4gSWYgd2UgZGVyaXZlIGFwIGZyb20gY2hhaW4gd2UgZ2V0XG5cdCAgLy8gZGlmZmVyZW50IChub3QgdmVyeSB1c2VmdWwpIGJlaGF2aW9yLiBCdXQgc3BlYyByZXF1aXJlcyB0aGF0IGlmIG1ldGhvZCBjYW4gYmUgZGVyaXZlZFxuXHQgIC8vIGl0IG11c3QgaGF2ZSB0aGUgc2FtZSBiZWhhdmlvciBhcyBoYW5kLXdyaXR0ZW4gbWV0aG9kLiBXZSBpbnRlbnRpb25hbGx5IHZpb2xhdGUgdGhlIHNwZWNcblx0ICAvLyBpbiBob3BlIHRoYXQgaXQgd29uJ3QgY2F1c2UgbWFueSB0cm91YmxlcyBpbiBwcmFjdGljZS4gQW5kIGluIHJldHVybiB3ZSBoYXZlIG1vcmUgdXNlZnVsIHR5cGUuXG5cdCAgYXA6IGZ1bmN0aW9uIChvYnNGbiwgb2JzVmFsKSB7XG5cdCAgICByZXR1cm4gY29tYmluZShbb2JzRm4sIG9ic1ZhbF0sIGZ1bmN0aW9uIChmbiwgdmFsKSB7XG5cdCAgICAgIHJldHVybiBmbih2YWwpO1xuXHQgICAgfSk7XG5cdCAgfSxcblx0ICBjaGFpbjogZnVuY3Rpb24gKGZuLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMuZmxhdE1hcChmbik7XG5cdCAgfVxuXHR9O1xuXG5cblxuXHR2YXIgc3RhdGljTGFuZCA9IE9iamVjdC5mcmVlemUoe1xuXHQgIE9ic2VydmFibGU6IE9ic2VydmFibGUkMVxuXHR9KTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHgpKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNyA9IGNyZWF0ZVN0cmVhbSgnbWFwJywgbWl4aW4pO1xuXHR2YXIgUCQzID0gY3JlYXRlUHJvcGVydHkoJ21hcCcsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIG1hcCQxKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkNywgUCQzKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDggPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlcicsIG1peGluJDEpO1xuXHR2YXIgUCQ0ID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlcicsIG1peGluJDEpO1xuXG5cdHZhciBpZCQxID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmaWx0ZXIob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkMSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDgsIFAkNCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ5ID0gY3JlYXRlU3RyZWFtKCd0YWtlJywgbWl4aW4kMik7XG5cdHZhciBQJDUgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZScsIG1peGluJDIpO1xuXG5cdGZ1bmN0aW9uIHRha2Uob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkOSwgUCQ1KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxMCA9IGNyZWF0ZVN0cmVhbSgndGFrZUVycm9ycycsIG1peGluJDMpO1xuXHR2YXIgUCQ2ID0gY3JlYXRlUHJvcGVydHkoJ3Rha2VFcnJvcnMnLCBtaXhpbiQzKTtcblxuXHRmdW5jdGlvbiB0YWtlRXJyb3JzKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDEwLCBQJDYpKShvYnMsIHsgbjogbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ0ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDExID0gY3JlYXRlU3RyZWFtKCd0YWtlV2hpbGUnLCBtaXhpbiQ0KTtcblx0dmFyIFAkNyA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlV2hpbGUnLCBtaXhpbiQ0KTtcblxuXHR2YXIgaWQkMiA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gdGFrZVdoaWxlKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDIgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMSwgUCQ3KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSBOT1RISU5HO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2xhc3RWYWx1ZSA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSB4O1xuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RWYWx1ZSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fbGFzdFZhbHVlKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTIgPSBjcmVhdGVTdHJlYW0oJ2xhc3QnLCBtaXhpbiQ1KTtcblx0dmFyIFAkOCA9IGNyZWF0ZVByb3BlcnR5KCdsYXN0JywgbWl4aW4kNSk7XG5cblx0ZnVuY3Rpb24gbGFzdChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMiwgUCQ4KSkob2JzKTtcblx0fVxuXG5cdHZhciBtaXhpbiQ2ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIG4gPSBfcmVmLm47XG5cblx0ICAgIHRoaXMuX24gPSBNYXRoLm1heCgwLCBuKTtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX24tLTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTMgPSBjcmVhdGVTdHJlYW0oJ3NraXAnLCBtaXhpbiQ2KTtcblx0dmFyIFAkOSA9IGNyZWF0ZVByb3BlcnR5KCdza2lwJywgbWl4aW4kNik7XG5cblx0ZnVuY3Rpb24gc2tpcChvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMywgUCQ5KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fZm4gIT09IG51bGwgJiYgIWZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9mbiA9PT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE0ID0gY3JlYXRlU3RyZWFtKCdza2lwV2hpbGUnLCBtaXhpbiQ3KTtcblx0dmFyIFAkMTAgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcFdoaWxlJywgbWl4aW4kNyk7XG5cblx0dmFyIGlkJDMgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNraXBXaGlsZShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQzIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTQsIFAkMTApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDggPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fcHJldiA9IE5PVEhJTkc7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgICAgdGhpcy5fcHJldiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICh0aGlzLl9wcmV2ID09PSBOT1RISU5HIHx8ICFmbih0aGlzLl9wcmV2LCB4KSkge1xuXHQgICAgICB0aGlzLl9wcmV2ID0geDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNSA9IGNyZWF0ZVN0cmVhbSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbiQ4KTtcblx0dmFyIFAkMTEgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbiQ4KTtcblxuXHR2YXIgZXEgPSBmdW5jdGlvbiAoYSwgYikge1xuXHQgIHJldHVybiBhID09PSBiO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNraXBEdXBsaWNhdGVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGVxIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTUsIFAkMTEpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIHNlZWQgPSBfcmVmLnNlZWQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9wcmV2ID0gc2VlZDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9wcmV2ID0gbnVsbDtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9wcmV2ICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fcHJldiwgeCkpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fcHJldiA9IHg7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE2ID0gY3JlYXRlU3RyZWFtKCdkaWZmJywgbWl4aW4kOSk7XG5cdHZhciBQJDEyID0gY3JlYXRlUHJvcGVydHkoJ2RpZmYnLCBtaXhpbiQ5KTtcblxuXHRmdW5jdGlvbiBkZWZhdWx0Rm4oYSwgYikge1xuXHQgIHJldHVybiBbYSwgYl07XG5cdH1cblxuXHRmdW5jdGlvbiBkaWZmKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxNiwgUCQxMikpKG9icywgeyBmbjogZm4gfHwgZGVmYXVsdEZuLCBzZWVkOiBzZWVkIH0pO1xuXHR9XG5cblx0dmFyIFAkMTMgPSBjcmVhdGVQcm9wZXJ0eSgnc2NhbicsIHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgc2VlZCA9IF9yZWYuc2VlZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3NlZWQgPSBzZWVkO1xuXHQgICAgaWYgKHNlZWQgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHNlZWQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX3NlZWQgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ID09PSBudWxsIHx8IHRoaXMuX2N1cnJlbnRFdmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fc2VlZCA9PT0gTk9USElORyA/IHggOiBmbih0aGlzLl9zZWVkLCB4KSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fY3VycmVudEV2ZW50LnZhbHVlLCB4KSk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBzY2FuKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IFAkMTMob2JzLCB7IGZuOiBmbiwgc2VlZDogc2VlZCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxMCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgeHMgPSBmbih4KTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHhzW2ldKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTcgPSBjcmVhdGVTdHJlYW0oJ2ZsYXR0ZW4nLCBtaXhpbiQxMCk7XG5cblx0dmFyIGlkJDQgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGZsYXR0ZW4ob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkNCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgUyQxNyhvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIEVORF9NQVJLRVIgPSB7fTtcblxuXHR2YXIgbWl4aW4kMTEgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fJHNoaWZ0QnVmZiA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdmFyIHZhbHVlID0gX3RoaXMuX2J1ZmYuc2hpZnQoKTtcblx0ICAgICAgaWYgKHZhbHVlID09PSBFTkRfTUFSS0VSKSB7XG5cdCAgICAgICAgX3RoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBfdGhpcy5fZW1pdFZhbHVlKHZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICAgIHRoaXMuXyRzaGlmdEJ1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKEVORF9NQVJLRVIpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxOCA9IGNyZWF0ZVN0cmVhbSgnZGVsYXknLCBtaXhpbiQxMSk7XG5cdHZhciBQJDE0ID0gY3JlYXRlUHJvcGVydHkoJ2RlbGF5JywgbWl4aW4kMTEpO1xuXG5cdGZ1bmN0aW9uIGRlbGF5KG9icywgd2FpdCkge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE4LCBQJDE0KSkob2JzLCB7IHdhaXQ6IHdhaXQgfSk7XG5cdH1cblxuXHR2YXIgbm93ID0gRGF0ZS5ub3cgPyBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIERhdGUubm93KCk7XG5cdH0gOiBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHR9O1xuXG5cdHZhciBtaXhpbiQxMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGxlYWRpbmcgPSBfcmVmLmxlYWRpbmc7XG5cdCAgICB2YXIgdHJhaWxpbmcgPSBfcmVmLnRyYWlsaW5nO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9sZWFkaW5nID0gbGVhZGluZztcblx0ICAgIHRoaXMuX3RyYWlsaW5nID0gdHJhaWxpbmc7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gMDtcblx0ICAgIHRoaXMuXyR0cmFpbGluZ0NhbGwgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fdHJhaWxpbmdDYWxsKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJHRyYWlsaW5nQ2FsbCA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB2YXIgY3VyVGltZSA9IG5vdygpO1xuXHQgICAgICBpZiAodGhpcy5fbGFzdENhbGxUaW1lID09PSAwICYmICF0aGlzLl9sZWFkaW5nKSB7XG5cdCAgICAgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gY3VyVGltZTtcblx0ICAgICAgfVxuXHQgICAgICB2YXIgcmVtYWluaW5nID0gdGhpcy5fd2FpdCAtIChjdXJUaW1lIC0gdGhpcy5fbGFzdENhbGxUaW1lKTtcblx0ICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fY2FuY2VsVHJhaWxpbmcoKTtcblx0ICAgICAgICB0aGlzLl9sYXN0Q2FsbFRpbWUgPSBjdXJUaW1lO1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl90cmFpbGluZykge1xuXHQgICAgICAgIHRoaXMuX2NhbmNlbFRyYWlsaW5nKCk7XG5cdCAgICAgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IHg7XG5cdCAgICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kdHJhaWxpbmdDYWxsLCByZW1haW5pbmcpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkKSB7XG5cdCAgICAgICAgdGhpcy5fZW5kTGF0ZXIgPSB0cnVlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NhbmNlbFRyYWlsaW5nOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fdGltZW91dElkICE9PSBudWxsKSB7XG5cdCAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0SWQpO1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3RyYWlsaW5nQ2FsbDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3RyYWlsaW5nVmFsdWUpO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gIXRoaXMuX2xlYWRpbmcgPyAwIDogbm93KCk7XG5cdCAgICBpZiAodGhpcy5fZW5kTGF0ZXIpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxOSA9IGNyZWF0ZVN0cmVhbSgndGhyb3R0bGUnLCBtaXhpbiQxMik7XG5cdHZhciBQJDE1ID0gY3JlYXRlUHJvcGVydHkoJ3Rocm90dGxlJywgbWl4aW4kMTIpO1xuXG5cdGZ1bmN0aW9uIHRocm90dGxlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGxlYWRpbmcgPSBfcmVmMi5sZWFkaW5nO1xuXHQgIHZhciBsZWFkaW5nID0gX3JlZjIkbGVhZGluZyA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGxlYWRpbmc7XG5cdCAgdmFyIF9yZWYyJHRyYWlsaW5nID0gX3JlZjIudHJhaWxpbmc7XG5cdCAgdmFyIHRyYWlsaW5nID0gX3JlZjIkdHJhaWxpbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiR0cmFpbGluZztcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE5LCBQJDE1KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGxlYWRpbmc6IGxlYWRpbmcsIHRyYWlsaW5nOiB0cmFpbGluZyB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxMyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGltbWVkaWF0ZSA9IF9yZWYuaW1tZWRpYXRlO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9pbW1lZGlhdGUgPSBpbW1lZGlhdGU7XG5cdCAgICB0aGlzLl9sYXN0QXR0ZW1wdCA9IDA7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXJWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2xhdGVyKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2xhc3RBdHRlbXB0ID0gbm93KCk7XG5cdCAgICAgIGlmICh0aGlzLl9pbW1lZGlhdGUgJiYgIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJGxhdGVyLCB0aGlzLl93YWl0KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSB4O1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkICYmICF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9lbmRMYXRlciA9IHRydWU7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfbGF0ZXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBsYXN0ID0gbm93KCkgLSB0aGlzLl9sYXN0QXR0ZW1wdDtcblx0ICAgIGlmIChsYXN0IDwgdGhpcy5fd2FpdCAmJiBsYXN0ID49IDApIHtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kbGF0ZXIsIHRoaXMuX3dhaXQgLSBsYXN0KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICAgIGlmICghdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2xhdGVyVmFsdWUpO1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICh0aGlzLl9lbmRMYXRlcikge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyMCA9IGNyZWF0ZVN0cmVhbSgnZGVib3VuY2UnLCBtaXhpbiQxMyk7XG5cdHZhciBQJDE2ID0gY3JlYXRlUHJvcGVydHkoJ2RlYm91bmNlJywgbWl4aW4kMTMpO1xuXG5cdGZ1bmN0aW9uIGRlYm91bmNlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGltbWVkaWF0ZSA9IF9yZWYyLmltbWVkaWF0ZTtcblx0ICB2YXIgaW1tZWRpYXRlID0gX3JlZjIkaW1tZWRpYXRlID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IF9yZWYyJGltbWVkaWF0ZTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDIwLCBQJDE2KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGltbWVkaWF0ZTogaW1tZWRpYXRlIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDE0ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcihmbih4KSk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDIxID0gY3JlYXRlU3RyZWFtKCdtYXBFcnJvcnMnLCBtaXhpbiQxNCk7XG5cdHZhciBQJDE3ID0gY3JlYXRlUHJvcGVydHkoJ21hcEVycm9ycycsIG1peGluJDE0KTtcblxuXHR2YXIgaWQkNSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gbWFwRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDUgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMSwgUCQxNykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTUgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKGZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjIgPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlckVycm9ycycsIG1peGluJDE1KTtcblx0dmFyIFAkMTggPSBjcmVhdGVQcm9wZXJ0eSgnZmlsdGVyRXJyb3JzJywgbWl4aW4kMTUpO1xuXG5cdHZhciBpZCQ2ID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmaWx0ZXJFcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkNiA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDIyLCBQJDE4KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxNiA9IHtcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICgpIHt9XG5cdH07XG5cblx0dmFyIFMkMjMgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZVZhbHVlcycsIG1peGluJDE2KTtcblx0dmFyIFAkMTkgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlVmFsdWVzJywgbWl4aW4kMTYpO1xuXG5cdGZ1bmN0aW9uIGlnbm9yZVZhbHVlcyhvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMywgUCQxOSkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTcgPSB7XG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDI0ID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVFcnJvcnMnLCBtaXhpbiQxNyk7XG5cdHZhciBQJDIwID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZUVycm9ycycsIG1peGluJDE3KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVFcnJvcnMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjQsIFAkMjApKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE4ID0ge1xuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHt9XG5cdH07XG5cblx0dmFyIFMkMjUgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZUVuZCcsIG1peGluJDE4KTtcblx0dmFyIFAkMjEgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlRW5kJywgbWl4aW4kMTgpO1xuXG5cdGZ1bmN0aW9uIGlnbm9yZUVuZChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNSwgUCQyMSkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKCkpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyNiA9IGNyZWF0ZVN0cmVhbSgnYmVmb3JlRW5kJywgbWl4aW4kMTkpO1xuXHR2YXIgUCQyMiA9IGNyZWF0ZVByb3BlcnR5KCdiZWZvcmVFbmQnLCBtaXhpbiQxOSk7XG5cblx0ZnVuY3Rpb24gYmVmb3JlRW5kKG9icywgZm4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNiwgUCQyMikpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbWluID0gX3JlZi5taW47XG5cdCAgICB2YXIgbWF4ID0gX3JlZi5tYXg7XG5cblx0ICAgIHRoaXMuX21heCA9IG1heDtcblx0ICAgIHRoaXMuX21pbiA9IG1pbjtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBzbGlkZSh0aGlzLl9idWZmLCB4LCB0aGlzLl9tYXgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX21pbikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI3ID0gY3JlYXRlU3RyZWFtKCdzbGlkaW5nV2luZG93JywgbWl4aW4kMjApO1xuXHR2YXIgUCQyMyA9IGNyZWF0ZVByb3BlcnR5KCdzbGlkaW5nV2luZG93JywgbWl4aW4kMjApO1xuXG5cdGZ1bmN0aW9uIHNsaWRpbmdXaW5kb3cob2JzLCBtYXgpIHtcblx0ICB2YXIgbWluID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8gMCA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDI3LCBQJDIzKSkob2JzLCB7IG1pbjogbWluLCBtYXg6IG1heCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKCFmbih4KSkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjggPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldoaWxlJywgbWl4aW4kMjEpO1xuXHR2YXIgUCQyNCA9IGNyZWF0ZVByb3BlcnR5KCdidWZmZXJXaGlsZScsIG1peGluJDIxKTtcblxuXHR2YXIgaWQkNyA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gYnVmZmVyV2hpbGUob2JzLCBmbikge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyOCwgUCQyNCkpKG9icywgeyBmbjogZm4gfHwgaWQkNywgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fY291bnQgPSBjb3VudDtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9jb3VudCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjkgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhDb3VudCcsIG1peGluJDIyKTtcblx0dmFyIFAkMjUgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aENvdW50JywgbWl4aW4kMjIpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlJDEob2JzLCBjb3VudCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyOSwgUCQyNSkpKG9icywgeyBjb3VudDogY291bnQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9jb3VudCA9IGNvdW50O1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fZmx1c2goKTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fY291bnQpIHtcblx0ICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9LFxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTsgLy8gY29waWVkIGZyb20gcGF0dGVybnMvb25lLXNvdXJjZVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzAgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhUaW1lT3JDb3VudCcsIG1peGluJDIzKTtcblx0dmFyIFAkMjYgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aFRpbWVPckNvdW50JywgbWl4aW4kMjMpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldpdGhUaW1lT3JDb3VudChvYnMsIHdhaXQsIGNvdW50KSB7XG5cdCAgdmFyIF9yZWYyID0gYXJndW1lbnRzLmxlbmd0aCA8PSAzIHx8IGFyZ3VtZW50c1szXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbM107XG5cblx0ICB2YXIgX3JlZjIkZmx1c2hPbkVuZCA9IF9yZWYyLmZsdXNoT25FbmQ7XG5cdCAgdmFyIGZsdXNoT25FbmQgPSBfcmVmMiRmbHVzaE9uRW5kID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkZmx1c2hPbkVuZDtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDMwLCBQJDI2KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGNvdW50OiBjb3VudCwgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHhmb3JtRm9yT2JzKG9icykge1xuXHQgIHJldHVybiB7XG5cdCAgICAnQEB0cmFuc2R1Y2VyL3N0ZXAnOiBmdW5jdGlvbiAocmVzLCBpbnB1dCkge1xuXHQgICAgICBvYnMuX2VtaXRWYWx1ZShpbnB1dCk7XG5cdCAgICAgIHJldHVybiBudWxsO1xuXHQgICAgfSxcblx0ICAgICdAQHRyYW5zZHVjZXIvcmVzdWx0JzogZnVuY3Rpb24gKCkge1xuXHQgICAgICBvYnMuX2VtaXRFbmQoKTtcblx0ICAgICAgcmV0dXJuIG51bGw7XG5cdCAgICB9XG5cdCAgfTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB0cmFuc2R1Y2VyID0gX3JlZi50cmFuc2R1Y2VyO1xuXG5cdCAgICB0aGlzLl94Zm9ybSA9IHRyYW5zZHVjZXIoeGZvcm1Gb3JPYnModGhpcykpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hmb3JtID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3N0ZXAnXShudWxsLCB4KSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3Jlc3VsdCddKG51bGwpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9yZXN1bHQnXShudWxsKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzEgPSBjcmVhdGVTdHJlYW0oJ3RyYW5zZHVjZScsIG1peGluJDI0KTtcblx0dmFyIFAkMjcgPSBjcmVhdGVQcm9wZXJ0eSgndHJhbnNkdWNlJywgbWl4aW4kMjQpO1xuXG5cdGZ1bmN0aW9uIHRyYW5zZHVjZShvYnMsIHRyYW5zZHVjZXIpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMSwgUCQyNykpKG9icywgeyB0cmFuc2R1Y2VyOiB0cmFuc2R1Y2VyIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDI1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5faGFuZGxlciA9IGZuO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IGVtaXR0ZXIodGhpcyk7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5faGFuZGxlciA9IG51bGw7XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgdGhpcy5faGFuZGxlcih0aGlzLl9lbWl0dGVyLCBldmVudCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMyID0gY3JlYXRlU3RyZWFtKCd3aXRoSGFuZGxlcicsIG1peGluJDI1KTtcblx0dmFyIFAkMjggPSBjcmVhdGVQcm9wZXJ0eSgnd2l0aEhhbmRsZXInLCBtaXhpbiQyNSk7XG5cblx0ZnVuY3Rpb24gd2l0aEhhbmRsZXIob2JzLCBmbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDMyLCBQJDI4KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcblx0ICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcblx0fTtcblxuXHRmdW5jdGlvbiBaaXAoc291cmNlcywgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuXHQgIHRoaXMuX2J1ZmZlcnMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IGNsb25lQXJyYXkoc291cmNlKSA6IFtdO1xuXHQgIH0pO1xuXHQgIHRoaXMuX3NvdXJjZXMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IG5ldmVyKCkgOiBzb3VyY2U7XG5cdCAgfSk7XG5cblx0ICB0aGlzLl9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IHNwcmVhZChjb21iaW5hdG9yLCB0aGlzLl9zb3VyY2VzLmxlbmd0aCkgOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdCAgfTtcblx0ICB0aGlzLl9hbGl2ZUNvdW50ID0gMDtcblxuXHQgIHRoaXMuXyRoYW5kbGVycyA9IFtdO1xuXG5cdCAgdmFyIF9sb29wID0gZnVuY3Rpb24gKGkpIHtcblx0ICAgIF90aGlzLl8kaGFuZGxlcnMucHVzaChmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoaSwgZXZlbnQpO1xuXHQgICAgfSk7XG5cdCAgfTtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgX2xvb3AoaSk7XG5cdCAgfVxuXHR9XG5cblx0aW5oZXJpdChaaXAsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICd6aXAnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXG5cdCAgICAvLyBpZiBhbGwgc291cmNlcyBhcmUgYXJyYXlzXG5cdCAgICB3aGlsZSAodGhpcy5faXNGdWxsKCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgfVxuXG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fc291cmNlcy5sZW5ndGg7XG5cdCAgICB0aGlzLl9hbGl2ZUNvdW50ID0gbGVuZ3RoO1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGggJiYgdGhpcy5fYWN0aXZlOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vZmZBbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KHRoaXMuX2J1ZmZlcnMubGVuZ3RoKTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB2YWx1ZXNbaV0gPSB0aGlzLl9idWZmZXJzW2ldLnNoaWZ0KCk7XG5cdCAgICB9XG5cdCAgICB2YXIgY29tYmluYXRvciA9IHRoaXMuX2NvbWJpbmF0b3I7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXMpKTtcblx0ICB9LFxuXHQgIF9pc0Z1bGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICBpZiAodGhpcy5fYnVmZmVyc1tpXS5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICByZXR1cm4gZmFsc2U7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0cnVlO1xuXHQgIH0sXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGksIGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fYnVmZmVyc1tpXS5wdXNoKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgaWYgKHRoaXMuX2lzRnVsbCgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICBpZiAodGhpcy5fYWxpdmVDb3VudCA9PT0gMCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmZXJzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHppcChvYnNlcnZhYmxlcywgY29tYmluYXRvciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IFppcChvYnNlcnZhYmxlcywgY29tYmluYXRvcik7XG5cdH1cblxuXHR2YXIgaWQkOCA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gQWJzdHJhY3RQb29sKCkge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgdmFyIF9yZWYkcXVldWVMaW0gPSBfcmVmLnF1ZXVlTGltO1xuXHQgIHZhciBxdWV1ZUxpbSA9IF9yZWYkcXVldWVMaW0gPT09IHVuZGVmaW5lZCA/IDAgOiBfcmVmJHF1ZXVlTGltO1xuXHQgIHZhciBfcmVmJGNvbmN1ckxpbSA9IF9yZWYuY29uY3VyTGltO1xuXHQgIHZhciBjb25jdXJMaW0gPSBfcmVmJGNvbmN1ckxpbSA9PT0gdW5kZWZpbmVkID8gLTEgOiBfcmVmJGNvbmN1ckxpbTtcblx0ICB2YXIgX3JlZiRkcm9wID0gX3JlZi5kcm9wO1xuXHQgIHZhciBkcm9wID0gX3JlZiRkcm9wID09PSB1bmRlZmluZWQgPyAnbmV3JyA6IF9yZWYkZHJvcDtcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXG5cdCAgdGhpcy5fcXVldWVMaW0gPSBxdWV1ZUxpbSA8IDAgPyAtMSA6IHF1ZXVlTGltO1xuXHQgIHRoaXMuX2NvbmN1ckxpbSA9IGNvbmN1ckxpbSA8IDAgPyAtMSA6IGNvbmN1ckxpbTtcblx0ICB0aGlzLl9kcm9wID0gZHJvcDtcblx0ICB0aGlzLl9xdWV1ZSA9IFtdO1xuXHQgIHRoaXMuX2N1clNvdXJjZXMgPSBbXTtcblx0ICB0aGlzLl8kaGFuZGxlU3ViQW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVN1YkFueShldmVudCk7XG5cdCAgfTtcblx0ICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBbXTtcblx0ICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXG5cdCAgaWYgKHRoaXMuX2NvbmN1ckxpbSA9PT0gMCkge1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQWJzdHJhY3RQb29sLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnYWJzdHJhY3RQb29sJyxcblxuXHQgIF9hZGQ6IGZ1bmN0aW9uIChvYmosIHRvT2JzIC8qIEZ1bmN0aW9uIHwgZmFsc2V5ICovKSB7XG5cdCAgICB0b09icyA9IHRvT2JzIHx8IGlkJDg7XG5cdCAgICBpZiAodGhpcy5fY29uY3VyTGltID09PSAtMSB8fCB0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA8IHRoaXMuX2NvbmN1ckxpbSkge1xuXHQgICAgICB0aGlzLl9hZGRUb0N1cih0b09icyhvYmopKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGlmICh0aGlzLl9xdWV1ZUxpbSA9PT0gLTEgfHwgdGhpcy5fcXVldWUubGVuZ3RoIDwgdGhpcy5fcXVldWVMaW0pIHtcblx0ICAgICAgICB0aGlzLl9hZGRUb1F1ZXVlKHRvT2JzKG9iaikpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX2Ryb3AgPT09ICdvbGQnKSB7XG5cdCAgICAgICAgdGhpcy5fcmVtb3ZlT2xkZXN0KCk7XG5cdCAgICAgICAgdGhpcy5fYWRkKG9iaiwgdG9PYnMpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfYWRkQWxsOiBmdW5jdGlvbiAob2Jzcykge1xuXHQgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cblx0ICAgIGZvckVhY2gob2JzcywgZnVuY3Rpb24gKG9icykge1xuXHQgICAgICByZXR1cm4gX3RoaXMyLl9hZGQob2JzKTtcblx0ICAgIH0pO1xuXHQgIH0sXG5cdCAgX3JlbW92ZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgaWYgKHRoaXMuX3JlbW92ZUN1cihvYnMpID09PSAtMSkge1xuXHQgICAgICB0aGlzLl9yZW1vdmVRdWV1ZShvYnMpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2FkZFRvUXVldWU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX3F1ZXVlID0gY29uY2F0KHRoaXMuX3F1ZXVlLCBbb2JzXSk7XG5cdCAgfSxcblx0ICBfYWRkVG9DdXI6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblxuXHQgICAgICAvLyBIQUNLOlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBXZSBoYXZlIHR3byBvcHRpbWl6YXRpb25zIGZvciBjYXNlcyB3aGVuIGBvYnNgIGlzIGVuZGVkLiBXZSBkb24ndCB3YW50XG5cdCAgICAgIC8vIHRvIGFkZCBzdWNoIG9ic2VydmFibGUgdG8gdGhlIGxpc3QsIGJ1dCBvbmx5IHdhbnQgdG8gZW1pdCBldmVudHNcblx0ICAgICAgLy8gZnJvbSBpdCAoaWYgaXQgaGFzIHNvbWUpLlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBJbnN0ZWFkIG9mIHRoaXMgaGFja3MsIHdlIGNvdWxkIGp1c3QgZGlkIGZvbGxvd2luZyxcblx0ICAgICAgLy8gYnV0IGl0IHdvdWxkIGJlIDUtOCB0aW1lcyBzbG93ZXI6XG5cdCAgICAgIC8vXG5cdCAgICAgIC8vICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgICAgLy8gICAgIHRoaXMuX3N1YnNjcmliZShvYnMpO1xuXHQgICAgICAvL1xuXG5cdCAgICAgIC8vICMxXG5cdCAgICAgIC8vIFRoaXMgb25lIGZvciBjYXNlcyB3aGVuIGBvYnNgIGFscmVhZHkgZW5kZWRcblx0ICAgICAgLy8gZS5nLiwgS2VmaXIuY29uc3RhbnQoKSBvciBLZWZpci5uZXZlcigpXG5cdCAgICAgIGlmICghb2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIGlmIChvYnMuX2N1cnJlbnRFdmVudCkge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdChvYnMuX2N1cnJlbnRFdmVudC50eXBlLCBvYnMuX2N1cnJlbnRFdmVudC52YWx1ZSk7XG5cdCAgICAgICAgfVxuXHQgICAgICAgIHJldHVybjtcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vICMyXG5cdCAgICAgIC8vIFRoaXMgb25lIGlzIGZvciBjYXNlcyB3aGVuIGBvYnNgIGdvaW5nIHRvIGVuZCBzeW5jaHJvbm91c2x5IG9uXG5cdCAgICAgIC8vIGZpcnN0IHN1YnNjcmliZXIgZS5nLiwgS2VmaXIuc3RyZWFtKGVtID0+IHtlbS5lbWl0KDEpOyBlbS5lbmQoKX0pXG5cdCAgICAgIHRoaXMuX2N1cnJlbnRseUFkZGluZyA9IG9icztcblx0ICAgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXHQgICAgICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXHQgICAgICBpZiAob2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2N1clNvdXJjZXMgPSBjb25jYXQodGhpcy5fY3VyU291cmNlcywgW29ic10pO1xuXHQgICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9zdWJUb0VuZDogZnVuY3Rpb24gKG9icykge1xuXHQgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cblx0ICAgIHZhciBvbkVuZCA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzMy5fcmVtb3ZlQ3VyKG9icyk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fJGVuZEhhbmRsZXJzLnB1c2goeyBvYnM6IG9icywgaGFuZGxlcjogb25FbmQgfSk7XG5cdCAgICBvYnMub25FbmQob25FbmQpO1xuXHQgIH0sXG5cdCAgX3N1YnNjcmliZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXG5cdCAgICAvLyBpdCBjYW4gYmVjb21lIGluYWN0aXZlIGluIHJlc3BvbmNlIG9mIHN1YnNjcmliaW5nIHRvIGBvYnMub25BbnlgIGFib3ZlXG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIG9icy5vZmZBbnkodGhpcy5fJGhhbmRsZVN1YkFueSk7XG5cblx0ICAgIHZhciBvbkVuZEkgPSBmaW5kQnlQcmVkKHRoaXMuXyRlbmRIYW5kbGVycywgZnVuY3Rpb24gKG9iaikge1xuXHQgICAgICByZXR1cm4gb2JqLm9icyA9PT0gb2JzO1xuXHQgICAgfSk7XG5cdCAgICBpZiAob25FbmRJICE9PSAtMSkge1xuXHQgICAgICBvYnMub2ZmRW5kKHRoaXMuXyRlbmRIYW5kbGVyc1tvbkVuZEldLmhhbmRsZXIpO1xuXHQgICAgICB0aGlzLl8kZW5kSGFuZGxlcnMuc3BsaWNlKG9uRW5kSSwgMSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU3ViQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3JlbW92ZVF1ZXVlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kKHRoaXMuX3F1ZXVlLCBvYnMpO1xuXHQgICAgdGhpcy5fcXVldWUgPSByZW1vdmUodGhpcy5fcXVldWUsIGluZGV4KTtcblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXHQgIF9yZW1vdmVDdXI6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUob2JzKTtcblx0ICAgIH1cblx0ICAgIHZhciBpbmRleCA9IGZpbmQodGhpcy5fY3VyU291cmNlcywgb2JzKTtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSByZW1vdmUodGhpcy5fY3VyU291cmNlcywgaW5kZXgpO1xuXHQgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuXHQgICAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fcHVsbFF1ZXVlKCk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyU291cmNlcy5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9vbkVtcHR5KCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXHQgIF9yZW1vdmVPbGRlc3Q6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3JlbW92ZUN1cih0aGlzLl9jdXJTb3VyY2VzWzBdKTtcblx0ICB9LFxuXHQgIF9wdWxsUXVldWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9xdWV1ZS5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fcXVldWUgPSBjbG9uZUFycmF5KHRoaXMuX3F1ZXVlKTtcblx0ICAgICAgdGhpcy5fYWRkVG9DdXIodGhpcy5fcXVldWUuc2hpZnQoKSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc291cmNlcyA9IHRoaXMuX2N1clNvdXJjZXM7IGkgPCBzb3VyY2VzLmxlbmd0aCAmJiB0aGlzLl9hY3RpdmU7IGkrKykge1xuXHQgICAgICB0aGlzLl9zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwLCBzb3VyY2VzID0gdGhpcy5fY3VyU291cmNlczsgaSA8IHNvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudGx5QWRkaW5nICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKHRoaXMuX2N1cnJlbnRseUFkZGluZyk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaXNFbXB0eTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoID09PSAwO1xuXHQgIH0sXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3F1ZXVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZVN1YkFueSA9IG51bGw7XG5cdCAgICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gTWVyZ2Uoc291cmNlcykge1xuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2FkZEFsbChzb3VyY2VzKTtcblx0ICB0aGlzLl9pbml0aWFsaXNlZCA9IHRydWU7XG5cdH1cblxuXHRpbmhlcml0KE1lcmdlLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9uYW1lOiAnbWVyZ2UnLFxuXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9pbml0aWFsaXNlZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBtZXJnZShvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IE1lcmdlKG9ic2VydmFibGVzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIFMkMzMoZ2VuZXJhdG9yKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2dlbmVyYXRvciA9IGdlbmVyYXRvcjtcblx0ICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgIHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cdCAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KFMkMzMsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdyZXBlYXQnLFxuXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2dldFNvdXJjZSgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdChldmVudC50eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZ2V0U291cmNlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2luTG9vcCkge1xuXHQgICAgICB0aGlzLl9pbkxvb3AgPSB0cnVlO1xuXHQgICAgICB2YXIgZ2VuZXJhdG9yID0gdGhpcy5fZ2VuZXJhdG9yO1xuXHQgICAgICB3aGlsZSAodGhpcy5fc291cmNlID09PSBudWxsICYmIHRoaXMuX2FsaXZlICYmIHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3NvdXJjZSA9IGdlbmVyYXRvcih0aGlzLl9pdGVyYXRpb24rKyk7XG5cdCAgICAgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9nZXRTb3VyY2UoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZ2VuZXJhdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHJlcGVhdCAoZ2VuZXJhdG9yKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDMzKGdlbmVyYXRvcik7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25jYXQkMShvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiByZXBlYXQoZnVuY3Rpb24gKGluZGV4KSB7XG5cdCAgICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID4gaW5kZXggPyBvYnNlcnZhYmxlc1tpbmRleF0gOiBmYWxzZTtcblx0ICB9KS5zZXROYW1lKCdjb25jYXQnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIFBvb2woKSB7XG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFBvb2wsIEFic3RyYWN0UG9vbCwge1xuXG5cdCAgX25hbWU6ICdwb29sJyxcblxuXHQgIHBsdWc6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX2FkZChvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICB1bnBsdWc6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX3JlbW92ZShvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBGbGF0TWFwKHNvdXJjZSwgZm4sIG9wdGlvbnMpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdCAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgIHRoaXMuX2ZuID0gZm47XG5cdCAgdGhpcy5fbWFpbkVuZGVkID0gZmFsc2U7XG5cdCAgdGhpcy5fbGFzdEN1cnJlbnQgPSBudWxsO1xuXHQgIHRoaXMuXyRoYW5kbGVNYWluID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZU1haW4oZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KEZsYXRNYXAsIEFic3RyYWN0UG9vbCwge1xuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIEFic3RyYWN0UG9vbC5wcm90b3R5cGUuX29uQWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZU1haW4pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9vbkRlYWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlTWFpbik7XG5cdCAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IHRydWU7XG5cdCAgfSxcblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICAvLyBJcyBsYXRlc3QgdmFsdWUgYmVmb3JlIGRlYWN0aXZhdGlvbiBzdXJ2aXZlZCwgYW5kIG5vdyBpcyAnY3VycmVudCcgb24gdGhpcyBhY3RpdmF0aW9uP1xuXHQgICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGhhbmRsZSBzdWNoIHZhbHVlcywgdG8gcHJldmVudCB0byBjb25zdGFudGx5IGFkZFxuXHQgICAgICAvLyBzYW1lIG9ic2VydmFsZSBvbiBlYWNoIGFjdGl2YXRpb24vZGVhY3RpdmF0aW9uIHdoZW4gb3VyIG1haW4gc291cmNlXG5cdCAgICAgIC8vIGlzIGEgYEtlZmlyLmNvbmF0YW50KClgIGZvciBleGFtcGxlLlxuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9tYWluRW5kZWQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVNYWluID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIEZsYXRNYXBFcnJvcnMoc291cmNlLCBmbikge1xuXHQgIEZsYXRNYXAuY2FsbCh0aGlzLCBzb3VyY2UsIGZuKTtcblx0fVxuXG5cdGluaGVyaXQoRmxhdE1hcEVycm9ycywgRmxhdE1hcCwge1xuXG5cdCAgLy8gU2FtZSBhcyBpbiBGbGF0TWFwLCBvbmx5IFZBTFVFL0VSUk9SIGZsaXBwZWRcblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29uc3RydWN0b3IkMShCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fcHJpbWFyeSA9IHByaW1hcnk7XG5cdCAgICB0aGlzLl9zZWNvbmRhcnkgPSBzZWNvbmRhcnk7XG5cdCAgICB0aGlzLl9uYW1lID0gcHJpbWFyeS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0gTk9USElORztcblx0ICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVTZWNvbmRhcnlBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlUHJpbWFyeUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ2xhc3NNZXRob2RzJDEoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblx0ICAgIF9pbml0OiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IHg7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeUVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5QW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgICAgdGhpcy5fcmVtb3ZlU2Vjb25kYXJ5KCk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfcmVtb3ZlU2Vjb25kYXJ5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBudWxsO1xuXHQgICAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub25BbnkodGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3ByaW1hcnkub25BbnkodGhpcy5fJGhhbmRsZVByaW1hcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3ByaW1hcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgQmFzZUNsYXNzLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fcHJpbWFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZVByaW1hcnlBbnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVN0cmVhbSQxKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFMgPSBjcmVhdGVDb25zdHJ1Y3RvciQxKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKFN0cmVhbSksIG1peGluKTtcblx0ICByZXR1cm4gUztcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVByb3BlcnR5JDEobmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUCA9IGNyZWF0ZUNvbnN0cnVjdG9yJDEoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKFByb3BlcnR5KSwgbWl4aW4pO1xuXHQgIHJldHVybiBQO1xuXHR9XG5cblx0dmFyIG1peGluJDI2ID0ge1xuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORyAmJiB0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ID09PSBOT1RISU5HIHx8ICF0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzQgPSBjcmVhdGVTdHJlYW0kMSgnZmlsdGVyQnknLCBtaXhpbiQyNik7XG5cdHZhciBQJDI5ID0gY3JlYXRlUHJvcGVydHkkMSgnZmlsdGVyQnknLCBtaXhpbiQyNik7XG5cblx0ZnVuY3Rpb24gZmlsdGVyQnkocHJpbWFyeSwgc2Vjb25kYXJ5KSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTJDM0LCBQJDI5KSkocHJpbWFyeSwgc2Vjb25kYXJ5KTtcblx0fVxuXG5cdHZhciBpZDIgPSBmdW5jdGlvbiAoXywgeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNhbXBsZWRCeShwYXNzaXZlLCBhY3RpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gZnVuY3Rpb24gKGEsIGIpIHtcblx0ICAgIHJldHVybiBjb21iaW5hdG9yKGIsIGEpO1xuXHQgIH0gOiBpZDI7XG5cdCAgcmV0dXJuIGNvbWJpbmUoW2FjdGl2ZV0sIFtwYXNzaXZlXSwgX2NvbWJpbmF0b3IpLnNldE5hbWUocGFzc2l2ZSwgJ3NhbXBsZWRCeScpO1xuXHR9XG5cblx0dmFyIG1peGluJDI3ID0ge1xuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM1ID0gY3JlYXRlU3RyZWFtJDEoJ3NraXBVbnRpbEJ5JywgbWl4aW4kMjcpO1xuXHR2YXIgUCQzMCA9IGNyZWF0ZVByb3BlcnR5JDEoJ3NraXBVbnRpbEJ5JywgbWl4aW4kMjcpO1xuXG5cdGZ1bmN0aW9uIHNraXBVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNSwgUCQzMCkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjggPSB7XG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM2ID0gY3JlYXRlU3RyZWFtJDEoJ3Rha2VVbnRpbEJ5JywgbWl4aW4kMjgpO1xuXHR2YXIgUCQzMSA9IGNyZWF0ZVByb3BlcnR5JDEoJ3Rha2VVbnRpbEJ5JywgbWl4aW4kMjgpO1xuXG5cdGZ1bmN0aW9uIHRha2VVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNiwgUCQzMSkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9wcmltYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSAmJiB0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZmx1c2goKTtcblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM3ID0gY3JlYXRlU3RyZWFtJDEoJ2J1ZmZlckJ5JywgbWl4aW4kMjkpO1xuXHR2YXIgUCQzMiA9IGNyZWF0ZVByb3BlcnR5JDEoJ2J1ZmZlckJ5JywgbWl4aW4kMjkpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlckJ5KHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyAvKiBvcHRpb25hbCAqLykge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNywgUCQzMikpKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblx0ICAgIHZhciBfcmVmJGZsdXNoT25DaGFuZ2UgPSBfcmVmLmZsdXNoT25DaGFuZ2U7XG5cdCAgICB2YXIgZmx1c2hPbkNoYW5nZSA9IF9yZWYkZmx1c2hPbkNoYW5nZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBfcmVmJGZsdXNoT25DaGFuZ2U7XG5cblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fZmx1c2hPbkNoYW5nZSA9IGZsdXNoT25DaGFuZ2U7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcgJiYgIXRoaXMuX2xhc3RTZWNvbmRhcnkpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCAmJiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORyB8fCB0aGlzLl9sYXN0U2Vjb25kYXJ5KSkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkNoYW5nZSAmJiAheCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXG5cdCAgICAvLyBmcm9tIGRlZmF1bHQgX2hhbmRsZVNlY29uZGFyeVZhbHVlXG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0geDtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzggPSBjcmVhdGVTdHJlYW0kMSgnYnVmZmVyV2hpbGVCeScsIG1peGluJDMwKTtcblx0dmFyIFAkMzMgPSBjcmVhdGVQcm9wZXJ0eSQxKCdidWZmZXJXaGlsZUJ5JywgbWl4aW4kMzApO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlQnkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zIC8qIG9wdGlvbmFsICovKSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTJDM4LCBQJDMzKSkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdHZhciBmID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBmYWxzZTtcblx0fTtcblx0dmFyIHQgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIHRydWU7XG5cdH07XG5cblx0ZnVuY3Rpb24gYXdhaXRpbmcoYSwgYikge1xuXHQgIHZhciByZXN1bHQgPSBtZXJnZShbbWFwJDEoYSwgdCksIG1hcCQxKGIsIGYpXSk7XG5cdCAgcmVzdWx0ID0gc2tpcER1cGxpY2F0ZXMocmVzdWx0KTtcblx0ICByZXN1bHQgPSB0b1Byb3BlcnR5KHJlc3VsdCwgZik7XG5cdCAgcmV0dXJuIHJlc3VsdC5zZXROYW1lKGEsICdhd2FpdGluZycpO1xuXHR9XG5cblx0dmFyIG1peGluJDMxID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciByZXN1bHQgPSBmbih4KTtcblx0ICAgIGlmIChyZXN1bHQuY29udmVydCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IocmVzdWx0LmVycm9yKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzkgPSBjcmVhdGVTdHJlYW0oJ3ZhbHVlc1RvRXJyb3JzJywgbWl4aW4kMzEpO1xuXHR2YXIgUCQzNCA9IGNyZWF0ZVByb3BlcnR5KCd2YWx1ZXNUb0Vycm9ycycsIG1peGluJDMxKTtcblxuXHR2YXIgZGVmRm4gPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB7IGNvbnZlcnQ6IHRydWUsIGVycm9yOiB4IH07XG5cdH07XG5cblx0ZnVuY3Rpb24gdmFsdWVzVG9FcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZGVmRm4gOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzOSwgUCQzNCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHJlc3VsdCA9IGZuKHgpO1xuXHQgICAgaWYgKHJlc3VsdC5jb252ZXJ0KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShyZXN1bHQudmFsdWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ0MCA9IGNyZWF0ZVN0cmVhbSgnZXJyb3JzVG9WYWx1ZXMnLCBtaXhpbiQzMik7XG5cdHZhciBQJDM1ID0gY3JlYXRlUHJvcGVydHkoJ2Vycm9yc1RvVmFsdWVzJywgbWl4aW4kMzIpO1xuXG5cdHZhciBkZWZGbiQxID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geyBjb252ZXJ0OiB0cnVlLCB2YWx1ZTogeCB9O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGVycm9yc1RvVmFsdWVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGRlZkZuJDEgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ0MCwgUCQzNSkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzMgPSB7XG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ0MSA9IGNyZWF0ZVN0cmVhbSgnZW5kT25FcnJvcicsIG1peGluJDMzKTtcblx0dmFyIFAkMzYgPSBjcmVhdGVQcm9wZXJ0eSgnZW5kT25FcnJvcicsIG1peGluJDMzKTtcblxuXHRmdW5jdGlvbiBlbmRPbkVycm9yKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDQxLCBQJDM2KSkob2JzKTtcblx0fVxuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvUHJvcGVydHkgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gdG9Qcm9wZXJ0eSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY2hhbmdlcyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gY2hhbmdlcyh0aGlzKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1Byb21pc2UgPSBmdW5jdGlvbiAoUHJvbWlzZSkge1xuXHQgIHJldHVybiB0b1Byb21pc2UodGhpcywgUHJvbWlzZSk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9FU09ic2VydmFibGUgPSB0b0VTT2JzZXJ2YWJsZTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGVbJCRvYnNlcnZhYmxlXSA9IHRvRVNPYnNlcnZhYmxlO1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBtYXAkMSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlcih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZSA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2UodGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZUVycm9ycyA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2VFcnJvcnModGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZVdoaWxlID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHRha2VXaGlsZSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubGFzdCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbGFzdCh0aGlzKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwID0gZnVuY3Rpb24gKG4pIHtcblx0ICByZXR1cm4gc2tpcCh0aGlzLCBuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwV2hpbGUgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gc2tpcFdoaWxlKHRoaXMsIGZuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwRHVwbGljYXRlcyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBza2lwRHVwbGljYXRlcyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uIChmbiwgc2VlZCkge1xuXHQgIHJldHVybiBkaWZmKHRoaXMsIGZuLCBzZWVkKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5zY2FuID0gZnVuY3Rpb24gKGZuLCBzZWVkKSB7XG5cdCAgcmV0dXJuIHNjYW4odGhpcywgZm4sIHNlZWQpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXR0ZW4gPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gZmxhdHRlbih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbiAod2FpdCkge1xuXHQgIHJldHVybiBkZWxheSh0aGlzLCB3YWl0KTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50aHJvdHRsZSA9IGZ1bmN0aW9uICh3YWl0LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIHRocm90dGxlKHRoaXMsIHdhaXQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRlYm91bmNlID0gZnVuY3Rpb24gKHdhaXQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gZGVib3VuY2UodGhpcywgd2FpdCwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWFwRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG1hcEVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlckVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVWYWx1ZXModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRXJyb3JzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFcnJvcnModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRW5kID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFbmQodGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYmVmb3JlRW5kID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGJlZm9yZUVuZCh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2xpZGluZ1dpbmRvdyA9IGZ1bmN0aW9uIChtYXgsIG1pbikge1xuXHQgIHJldHVybiBzbGlkaW5nV2luZG93KHRoaXMsIG1heCwgbWluKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaGlsZSA9IGZ1bmN0aW9uIChmbiwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZSh0aGlzLCBmbiwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2l0aENvdW50ID0gZnVuY3Rpb24gKGNvdW50LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGJ1ZmZlcldoaWxlJDEodGhpcywgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldpdGhUaW1lT3JDb3VudCA9IGZ1bmN0aW9uICh3YWl0LCBjb3VudCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaXRoVGltZU9yQ291bnQodGhpcywgd2FpdCwgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRyYW5zZHVjZSA9IGZ1bmN0aW9uICh0cmFuc2R1Y2VyKSB7XG5cdCAgcmV0dXJuIHRyYW5zZHVjZSh0aGlzLCB0cmFuc2R1Y2VyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS53aXRoSGFuZGxlciA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB3aXRoSGFuZGxlcih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29tYmluZSA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiBjb21iaW5lKFt0aGlzLCBvdGhlcl0sIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnppcCA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiB6aXAoW3RoaXMsIG90aGVyXSwgY29tYmluYXRvcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWVyZ2UgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gbWVyZ2UoW3RoaXMsIG90aGVyXSk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIGNvbmNhdCQxKFt0aGlzLCBvdGhlcl0pO1xuXHR9O1xuXG5cdHZhciBwb29sID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBuZXcgUG9vbCgpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXAgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXAnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcExhdGVzdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBjb25jdXJMaW06IDEsIGRyb3A6ICdvbGQnIH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBMYXRlc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcEZpcnN0ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwRmlyc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcENvbmNhdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBxdWV1ZUxpbTogLTEsIGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwQ29uY2F0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBDb25jdXJMaW1pdCA9IGZ1bmN0aW9uIChmbiwgbGltaXQpIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgcXVldWVMaW06IC0xLCBjb25jdXJMaW06IGxpbWl0IH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBDb25jdXJMaW1pdCcpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBFcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXBFcnJvcnModGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBFcnJvcnMnKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5maWx0ZXJCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBmaWx0ZXJCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2FtcGxlZEJ5ID0gZnVuY3Rpb24gKG90aGVyLCBjb21iaW5hdG9yKSB7XG5cdCAgcmV0dXJuIHNhbXBsZWRCeSh0aGlzLCBvdGhlciwgY29tYmluYXRvcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcFVudGlsQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gc2tpcFVudGlsQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VVbnRpbEJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIHRha2VVbnRpbEJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJCeSh0aGlzLCBvdGhlciwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2hpbGVCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZUJ5KHRoaXMsIG90aGVyLCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyBEZXByZWNhdGVkXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIERFUFJFQ0FUSU9OX1dBUk5JTkdTID0gdHJ1ZTtcblx0ZnVuY3Rpb24gZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzKCkge1xuXHQgIERFUFJFQ0FUSU9OX1dBUk5JTkdTID0gZmFsc2U7XG5cdH1cblxuXHRmdW5jdGlvbiB3YXJuKG1zZykge1xuXHQgIGlmIChERVBSRUNBVElPTl9XQVJOSU5HUyAmJiBjb25zb2xlICYmIHR5cGVvZiBjb25zb2xlLndhcm4gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHZhciBtc2cyID0gJ1xcbkhlcmUgaXMgYW4gRXJyb3Igb2JqZWN0IGZvciB5b3UgY29udGFpbmluZyB0aGUgY2FsbCBzdGFjazonO1xuXHQgICAgY29uc29sZS53YXJuKG1zZywgbXNnMiwgbmV3IEVycm9yKCkpO1xuXHQgIH1cblx0fVxuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmF3YWl0aW5nID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5hd2FpdGluZygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ1Jyk7XG5cdCAgcmV0dXJuIGF3YWl0aW5nKHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS52YWx1ZXNUb0Vycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAudmFsdWVzVG9FcnJvcnMoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0OScpO1xuXHQgIHJldHVybiB2YWx1ZXNUb0Vycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZXJyb3JzVG9WYWx1ZXMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLmVycm9yc1RvVmFsdWVzKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDknKTtcblx0ICByZXR1cm4gZXJyb3JzVG9WYWx1ZXModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmVuZE9uRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5lbmRPbkVycm9yKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNTAnKTtcblx0ICByZXR1cm4gZW5kT25FcnJvcih0aGlzKTtcblx0fTtcblxuXHQvLyBFeHBvcnRzXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIEtlZmlyID0geyBPYnNlcnZhYmxlOiBPYnNlcnZhYmxlLCBTdHJlYW06IFN0cmVhbSwgUHJvcGVydHk6IFByb3BlcnR5LCBuZXZlcjogbmV2ZXIsIGxhdGVyOiBsYXRlciwgaW50ZXJ2YWw6IGludGVydmFsLCBzZXF1ZW50aWFsbHk6IHNlcXVlbnRpYWxseSxcblx0ICBmcm9tUG9sbDogZnJvbVBvbGwsIHdpdGhJbnRlcnZhbDogd2l0aEludGVydmFsLCBmcm9tQ2FsbGJhY2s6IGZyb21DYWxsYmFjaywgZnJvbU5vZGVDYWxsYmFjazogZnJvbU5vZGVDYWxsYmFjaywgZnJvbUV2ZW50czogZnJvbUV2ZW50cywgc3RyZWFtOiBzdHJlYW0sXG5cdCAgY29uc3RhbnQ6IGNvbnN0YW50LCBjb25zdGFudEVycm9yOiBjb25zdGFudEVycm9yLCBmcm9tUHJvbWlzZTogZnJvbVByb21pc2UsIGZyb21FU09ic2VydmFibGU6IGZyb21FU09ic2VydmFibGUsIGNvbWJpbmU6IGNvbWJpbmUsIHppcDogemlwLCBtZXJnZTogbWVyZ2UsXG5cdCAgY29uY2F0OiBjb25jYXQkMSwgUG9vbDogUG9vbCwgcG9vbDogcG9vbCwgcmVwZWF0OiByZXBlYXQsIHN0YXRpY0xhbmQ6IHN0YXRpY0xhbmQgfTtcblxuXHRLZWZpci5LZWZpciA9IEtlZmlyO1xuXG5cdGV4cG9ydHMuZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzID0gZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzO1xuXHRleHBvcnRzLktlZmlyID0gS2VmaXI7XG5cdGV4cG9ydHMuT2JzZXJ2YWJsZSA9IE9ic2VydmFibGU7XG5cdGV4cG9ydHMuU3RyZWFtID0gU3RyZWFtO1xuXHRleHBvcnRzLlByb3BlcnR5ID0gUHJvcGVydHk7XG5cdGV4cG9ydHMubmV2ZXIgPSBuZXZlcjtcblx0ZXhwb3J0cy5sYXRlciA9IGxhdGVyO1xuXHRleHBvcnRzLmludGVydmFsID0gaW50ZXJ2YWw7XG5cdGV4cG9ydHMuc2VxdWVudGlhbGx5ID0gc2VxdWVudGlhbGx5O1xuXHRleHBvcnRzLmZyb21Qb2xsID0gZnJvbVBvbGw7XG5cdGV4cG9ydHMud2l0aEludGVydmFsID0gd2l0aEludGVydmFsO1xuXHRleHBvcnRzLmZyb21DYWxsYmFjayA9IGZyb21DYWxsYmFjaztcblx0ZXhwb3J0cy5mcm9tTm9kZUNhbGxiYWNrID0gZnJvbU5vZGVDYWxsYmFjaztcblx0ZXhwb3J0cy5mcm9tRXZlbnRzID0gZnJvbUV2ZW50cztcblx0ZXhwb3J0cy5zdHJlYW0gPSBzdHJlYW07XG5cdGV4cG9ydHMuY29uc3RhbnQgPSBjb25zdGFudDtcblx0ZXhwb3J0cy5jb25zdGFudEVycm9yID0gY29uc3RhbnRFcnJvcjtcblx0ZXhwb3J0cy5mcm9tUHJvbWlzZSA9IGZyb21Qcm9taXNlO1xuXHRleHBvcnRzLmZyb21FU09ic2VydmFibGUgPSBmcm9tRVNPYnNlcnZhYmxlO1xuXHRleHBvcnRzLmNvbWJpbmUgPSBjb21iaW5lO1xuXHRleHBvcnRzLnppcCA9IHppcDtcblx0ZXhwb3J0cy5tZXJnZSA9IG1lcmdlO1xuXHRleHBvcnRzLmNvbmNhdCA9IGNvbmNhdCQxO1xuXHRleHBvcnRzLlBvb2wgPSBQb29sO1xuXHRleHBvcnRzLnBvb2wgPSBwb29sO1xuXHRleHBvcnRzLnJlcGVhdCA9IHJlcGVhdDtcblx0ZXhwb3J0cy5zdGF0aWNMYW5kID0gc3RhdGljTGFuZDtcblx0ZXhwb3J0c1snZGVmYXVsdCddID0gS2VmaXI7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpOyIsImltcG9ydCBzbmFiYmRvbSBmcm9tICdzbmFiYmRvbS9zbmFiYmRvbS5qcydcbmltcG9ydCBoIGZyb20gJ3NuYWJiZG9tL2guanMnXG5pbXBvcnQgc25hYkNsYXNzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvY2xhc3MuanMnXG5pbXBvcnQgc25hYlByb3BzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvcHJvcHMuanMnXG5pbXBvcnQgc25hYlN0eWxlIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMnXG5pbXBvcnQgc25hYkV2ZW50IGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvZXZlbnRsaXN0ZW5lcnMuanMnXG5pbXBvcnQgS2VmaXIgZnJvbSAna2VmaXInXG5cbmV4cG9ydCBmdW5jdGlvbiBidXMoKSB7XG4gIGxldCBlbWl0dGVyXG4gIGxldCBzdHJlYW0gPSBLZWZpci5zdHJlYW0oX2VtaXR0ZXIgPT4ge1xuICAgIGVtaXR0ZXIgPSBfZW1pdHRlclxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGVtaXR0ZXIgPSBudWxsXG4gICAgfVxuICB9KVxuICBzdHJlYW0uZW1pdCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBlbWl0dGVyICYmIGVtaXR0ZXIuZW1pdCh4KVxuICB9XG4gIHJldHVybiBzdHJlYW1cbn1cblxuZnVuY3Rpb24gY29udmVydFRvSHlwZXJTY3JpcHQobm9kZSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgIGxldCBbc2VsLCBkYXRhLCBjaGlsZHJlbl0gPSBub2RlXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgIHJldHVybiBoKHNlbCwgZGF0YSwgY2hpbGRyZW4ubWFwKGNvbnZlcnRUb0h5cGVyU2NyaXB0KSlcbiAgICB9XG4gICAgcmV0dXJuIGguYXBwbHkobnVsbCwgbm9kZSlcbiAgfVxuICByZXR1cm4gbm9kZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHZpZXckLCBjb250YWluZXIpIHtcbiAgbGV0IHBhdGNoID0gc25hYmJkb20uaW5pdChbc25hYkNsYXNzLCBzbmFiUHJvcHMsIHNuYWJTdHlsZSwgc25hYkV2ZW50XSlcbiAgbGV0IHZub2RlID0gY29udGFpbmVyXG5cbiAgdmlldyRcbiAgICAubWFwKGNvbnZlcnRUb0h5cGVyU2NyaXB0KVxuICAgIC5vblZhbHVlKG5ld1Zub2RlID0+IHtcbiAgICAgIHBhdGNoKHZub2RlLCBuZXdWbm9kZSlcbiAgICAgIHZub2RlID0gbmV3Vm5vZGVcbiAgICB9KVxufVxuIiwiaW1wb3J0IHsgYnVzLCByZW5kZXIgfSBmcm9tICcuLi8uLi9zcmMvaW5kZXguanMnXG5pbXBvcnQgS2VmaXIgZnJvbSAna2VmaXInXG5cbi8vIFN0cmVhbXNcbmxldCBhY3Rpb25zJCA9IGJ1cygpXG5cbi8vIE1vZGVsXG5sZXQgaW5pdE1vZGVsID0ge2l0ZW1zOiBbXSwgYWxsQ29tcGxldGVkOiBmYWxzZSwgZmlsdGVyOiAnQWxsJywgdGV4dDogJycsIHVpZDogMH1cblxuLy8gVXBkYXRlXG5mdW5jdGlvbiB1cGRhdGUobW9kZWwsIFthY3Rpb24sIHZhbHVlXSkge1xuICBsZXQge2l0ZW1zLCBhbGxDb21wbGV0ZWQsIGZpbHRlciwgdGV4dCwgdWlkfSA9IG1vZGVsXG4gIGxldCBuZXdJdGVtc1xuXG4gIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgY2FzZSAnY2hhbmdlVGV4dCc6XG4gICAgICByZXR1cm4gey4uLm1vZGVsLCB0ZXh0OiB2YWx1ZX1cbiAgICBjYXNlICdhZGRJdGVtJzpcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIHRleHQ6ICcnLCBhbGxDb21wbGV0ZWQ6IGZhbHNlLCBpdGVtczogWy4uLml0ZW1zLCBuZXdJdGVtKHZhbHVlLCB1aWQpXSwgdWlkOiB1aWQgKyAxfVxuICAgIGNhc2UgJ3RvZ2dsZUl0ZW0nOlxuICAgICAgbmV3SXRlbXMgPSBpdGVtcy5zbGljZSgpLm1hcChpdGVtID0+IHtcbiAgICAgICAgcmV0dXJuIGl0ZW0uaWQgPT0gdmFsdWUgPyB7Li4uaXRlbSwgY29tcGxldGVkOiAhaXRlbS5jb21wbGV0ZWR9IDogaXRlbVxuICAgICAgfSlcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtcywgYWxsQ29tcGxldGVkOiBhbGxJdGVtc0NvbXBsZXRlZChuZXdJdGVtcyl9XG4gICAgY2FzZSAnZWRpdEl0ZW0nOlxuICAgICAgbmV3SXRlbXMgPSBpdGVtcy5zbGljZSgpLm1hcChpdGVtID0+IHtcbiAgICAgICAgcmV0dXJuIGl0ZW0uaWQgPT0gdmFsdWUgPyB7Li4uaXRlbSwgZWRpdGluZzogdHJ1ZX0gOiBpdGVtXG4gICAgICB9KVxuICAgICAgcmV0dXJuIHsuLi5tb2RlbCwgaXRlbXM6IG5ld0l0ZW1zfVxuICAgIGNhc2UgJ3VwZGF0ZUl0ZW0nOlxuICAgICAgaWYgKHZhbHVlID09ICcnKSB7XG4gICAgICAgIGxldCBpbmRleCA9IGl0ZW1zLmZpbmRJbmRleChpdGVtID0+IGl0ZW0uZWRpdGluZylcbiAgICAgICAgbmV3SXRlbXMgPSByZW1vdmVJdGVtKGl0ZW1zLCBpdGVtc1tpbmRleF0uaWQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdJdGVtcyA9IGl0ZW1zLnNsaWNlKCkubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgIHJldHVybiBpdGVtLmVkaXRpbmcgPyB7Li4uaXRlbSwgZWRpdGluZzogZmFsc2UsIHRleHQ6IHZhbHVlfSA6IGl0ZW1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtc31cbiAgICBjYXNlICdyZW1vdmVJdGVtJzpcbiAgICAgIG5ld0l0ZW1zID0gcmVtb3ZlSXRlbShpdGVtcywgdmFsdWUpXG4gICAgICByZXR1cm4gey4uLm1vZGVsLCBpdGVtczogbmV3SXRlbXMsIGFsbENvbXBsZXRlZDogYWxsSXRlbXNDb21wbGV0ZWQobmV3SXRlbXMpfVxuICAgIGNhc2UgJ3RvZ2dsZUFsbCc6XG4gICAgICBsZXQgbmV3QWxsQ29tcGxldGVkID0gIWFsbENvbXBsZXRlZFxuXG4gICAgICBuZXdJdGVtcyA9IGl0ZW1zLnNsaWNlKCkubWFwKGl0ZW0gPT4ge1xuICAgICAgICByZXR1cm4gey4uLml0ZW0sIGNvbXBsZXRlZDogbmV3QWxsQ29tcGxldGVkfVxuICAgICAgfSlcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtcywgYWxsQ29tcGxldGVkOiBuZXdBbGxDb21wbGV0ZWR9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlSXRlbShpdGVtcywgaWQpIHtcbiAgcmV0dXJuIGl0ZW1zLnNsaWNlKCkuZmlsdGVyKGl0ZW0gPT4gaXRlbS5pZCAhPSBpZClcbn1cblxuZnVuY3Rpb24gYWxsSXRlbXNDb21wbGV0ZWQoaXRlbXMpIHtcbiAgcmV0dXJuIGl0ZW1zLmZpbmRJbmRleChpdGVtID0+ICFpdGVtLmNvbXBsZXRlZCkgPT0gLTFcbn1cblxuZnVuY3Rpb24gbmV3SXRlbSh0ZXh0LCBpZCkge1xuICByZXR1cm4ge2lkLCB0ZXh0LCBjb21wbGV0ZWQ6IGZhbHNlLCBlZGl0aW5nOiBmYWxzZX1cbn1cblxuLy8gVmlld1xuZnVuY3Rpb24gdmlldyhtb2RlbCkge1xuICBsZXQge3RleHR9ID0gbW9kZWxcbiAgbGV0IG51bUl0ZW1zID0gbW9kZWwuaXRlbXMubGVuZ3RoXG5cbiAgbGV0IHYgPVxuICAgIFsnZGl2Jywge30sXG4gICAgICBbIFsnc2VjdGlvbi50b2RvYXBwJywge30sXG4gICAgICAgIFsgWydoZWFkZXIuaGVhZGVyJywge30sXG4gICAgICAgICAgWyBbJ2gxJywge30sICd0b2RvcyddLFxuICAgICAgICAgICAgWydpbnB1dC5uZXctdG9kbycsXG4gICAgICAgICAgICAgIHsgcHJvcHM6IHtwbGFjZWhvbGRlcjogJ1doYXQgbmVlZHMgdG8gYmUgZG9uZT8nLCBhdXRvZm9jdXM6IHRydWUsIHZhbHVlOiB0ZXh0fSxcbiAgICAgICAgICAgICAgICBvbjoge2lucHV0OiBoYW5kbGVJbnB1dCwga2V5ZG93bjogb25FbnRlcn19XV1dLFxuICAgICAgICAgIG51bUl0ZW1zID4gMCA/IG1haW4obW9kZWwpIDogJycsXG4gICAgICAgICAgbnVtSXRlbXMgPiAwID8gZm9vdGVyKG1vZGVsKSA6ICcnXV0sXG4gICAgICBpbmZvKCldXVxuICByZXR1cm4gdlxufVxuXG5mdW5jdGlvbiBoYW5kbGVJbnB1dChlKSB7XG4gIGxldCB2YWx1ZSA9IGUudGFyZ2V0LnZhbHVlLnRyaW0oKVxuICBhY3Rpb25zJC5lbWl0KFsnY2hhbmdlVGV4dCcsIHZhbHVlXSlcbn1cblxuZnVuY3Rpb24gb25FbnRlcihlKSB7XG4gIGlmIChlLmNvZGUgPT0gJ0VudGVyJykge1xuICAgIGxldCB0ZXh0ID0gZS50YXJnZXQudmFsdWUudHJpbSgpXG4gICAgYWN0aW9ucyQuZW1pdChbJ2FkZEl0ZW0nLCB0ZXh0XSlcbiAgfVxufVxuXG5mdW5jdGlvbiBtYWluKHtpdGVtcywgYWxsQ29tcGxldGVkfSkge1xuICBsZXQgdiA9XG4gICAgWydzZWN0aW9uLm1haW4nLCB7fSxcbiAgICAgIFsgWydpbnB1dC50b2dnbGUtYWxsJywge3Byb3BzOiB7dHlwZTogJ2NoZWNrYm94JywgY2hlY2tlZDogYWxsQ29tcGxldGVkfSwgb246IHtjbGljazogdG9nZ2xlQWxsfX1dLFxuICAgICAgICBbJ2xhYmVsJywge3Byb3BzOiB7aHRtbEZvcjogJ3RvZ2dsZS1hbGwnfX0sICdNYXJrIGFsbCBhcyBjb21wbGV0ZSddLFxuICAgICAgICBbJ3VsLnRvZG8tbGlzdCcsIHt9LCBpdGVtcy5tYXAodmlld0l0ZW0pXV1dXG4gIHJldHVybiB2XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZUFsbCgpIHtcbiAgYWN0aW9ucyQuZW1pdChbJ3RvZ2dsZUFsbCddKVxufVxuXG5mdW5jdGlvbiB2aWV3SXRlbShpdGVtKSB7XG4gIGxldCB7aWQsIGNvbXBsZXRlZCwgZWRpdGluZywgdGV4dH0gPSBpdGVtXG4gIGxldCB2ID1cbiAgICBbJ2xpJywge2NsYXNzOiB7Y29tcGxldGVkLCBlZGl0aW5nfX0sXG4gICAgICBbIFsnZGl2LnZpZXcnLCB7fSxcbiAgICAgICAgICBbIFsnaW5wdXQudG9nZ2xlJywge3Byb3BzOiB7dHlwZTogJ2NoZWNrYm94JywgY2hlY2tlZDogY29tcGxldGVkfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uOiB7Y2xpY2s6IFtjaGVja2JveENsaWNrLCBpZF19fV0sXG4gICAgICAgICAgICBbJ2xhYmVsJywge29uOiB7ZGJsY2xpY2s6IFtpdGVtQ2xpY2ssIGlkXX19LCB0ZXh0XSxcbiAgICAgICAgICAgIFsnYnV0dG9uLmRlc3Ryb3knLCB7b246IHtjbGljazogW2Rlc3Ryb3lDbGljaywgaWRdfX1dXV0sXG4gICAgICAgIFsnaW5wdXQuZWRpdCcsIHtwcm9wczoge3ZhbHVlOiB0ZXh0fSwgb246IHtrZXlkb3duOiBvbkVkaXREb25lLCBibHVyOiBvbkJsdXJ9LCBob29rOiB7cG9zdHBhdGNoOiBmb2N1c0VsZW1lbnR9fV1dXVxuICByZXR1cm4gdlxufVxuXG5mdW5jdGlvbiBmb2N1c0VsZW1lbnQob2xkVm5vZGUsIHZub2RlKSB7XG4gIHJldHVybiB2bm9kZS5lbG0uZm9jdXMoKVxufVxuXG5mdW5jdGlvbiBvbkVkaXREb25lKGUpIHtcbiAgaWYgKGUuY29kZSA9PSAnRW50ZXInIHx8IGUuY29kZSA9PSAnRXNjYXBlJykge1xuICAgIGxldCB0ZXh0ID0gZS50YXJnZXQudmFsdWUudHJpbSgpXG4gICAgYWN0aW9ucyQuZW1pdChbJ3VwZGF0ZUl0ZW0nLCB0ZXh0XSlcbiAgfVxufVxuXG5mdW5jdGlvbiBvbkJsdXIoZSkge1xuICBsZXQgdGV4dCA9IGUudGFyZ2V0LnZhbHVlLnRyaW0oKVxuICBhY3Rpb25zJC5lbWl0KFsndXBkYXRlSXRlbScsIHRleHRdKVxufVxuXG5mdW5jdGlvbiBpdGVtQ2xpY2soaWQpIHtcbiAgYWN0aW9ucyQuZW1pdChbJ2VkaXRJdGVtJywgaWRdKVxufVxuXG5mdW5jdGlvbiBjaGVja2JveENsaWNrKGlkKSB7XG4gIGFjdGlvbnMkLmVtaXQoWyd0b2dnbGVJdGVtJywgaWRdKVxufVxuXG5mdW5jdGlvbiBkZXN0cm95Q2xpY2soaWQpIHtcbiAgYWN0aW9ucyQuZW1pdChbJ3JlbW92ZUl0ZW0nLCBpZF0pXG59XG5cbmZ1bmN0aW9uIG51bVVuY29tcGxldGVkKGl0ZW1zKSB7XG4gIHJldHVybiBpdGVtcy5maWx0ZXIoaXRlbSA9PiAhaXRlbS5jb21wbGV0ZWQpLmxlbmd0aFxufVxuXG5mdW5jdGlvbiBmb290ZXIoe2l0ZW1zLCBmaWx0ZXJ9KSB7XG4gIGxldCBudW1MZWZ0ID0gbnVtVW5jb21wbGV0ZWQoaXRlbXMpXG4gIGxldCB2ID1cbiAgICBbJ2Zvb3Rlci5mb290ZXInLCB7fSxcbiAgICAgIFsgWydzcGFuLnRvZG8tY291bnQnLCB7fSxcbiAgICAgICAgICBbWydzdHJvbmcnLCB7fSwgYCR7bnVtTGVmdH0gaXRlbSR7bnVtTGVmdCA9PSAxID8gJycgOiAncyd9IGxlZnRgXV1dLFxuICAgICAgICBbJ3VsLmZpbHRlcnMnLCB7fSxcbiAgICAgICAgICBbIFsnbGknLCB7fSxcbiAgICAgICAgICAgICAgWyBbJ2EnLCB7cHJvcHM6IHtocmVmOiAnIy8nfSwgY2xhc3M6IHtzZWxlY3RlZDogZmlsdGVyID09ICdBbGwnfX0sICdBbGwnXV1dLFxuICAgICAgICAgICAgWydsaScsIHt9LFxuICAgICAgICAgICAgICBbIFsnYScsIHtwcm9wczoge2hyZWY6ICcjL2FjdGl2ZSd9LCBjbGFzczoge3NlbGVjdGVkOiBmaWx0ZXIgPT0gJ0FjdGl2ZSd9fSwgJ0FjdGl2ZSddXV0sXG4gICAgICAgICAgICBbJ2xpJywge30sXG4gICAgICAgICAgICAgIFsgWydhJywge3Byb3BzOiB7aHJlZjogJyMvY29tcGxldGVkJ30sIGNsYXNzOiB7c2VsZWN0ZWQ6IGZpbHRlciA9PSAnQ29tcGxldGVkJ319LCAnQ29tcGxldGVkJ11dXV1dXV1cbiAgcmV0dXJuIHZcbn1cblxuZnVuY3Rpb24gaW5mbygpIHtcbiAgbGV0IHYgPVxuICAgIFsnZm9vdGVyLmluZm8nLCB7fSxcbiAgICAgIFsgWydwJywge30sICdEb3VibGUtY2xpY2sgdG8gZWRpdCBhIHRvZG8nXSxcbiAgICAgICAgWydwJywge30sXG4gICAgICAgICAgWydDcmVhdGVkIGJ5ICcsIFsnYScsIHtwcm9wczoge2hyZWY6ICdodHRwOi8vdG9kb212Yy5jb20nfX0sICdEYXZpZCBTYXJnZWFudCddXV0sXG4gICAgICAgIFsncCcsIHt9LFxuICAgICAgICAgIFsnUGFydCBvZiAnLCBbJ2EnLCB7cHJvcHM6IHtocmVmOiAnaHR0cDovL3RvZG9tdmMuY29tJ319LCAnVG9kb01WQyddXV1dXVxuICByZXR1cm4gdlxufVxuXG4vLyBSZWR1Y2VcbmxldCBtb2RlbCQgPSBhY3Rpb25zJC5zY2FuKHVwZGF0ZSwgaW5pdE1vZGVsKVxubW9kZWwkLmxvZygpXG5cbi8vIFJlbmRlclxubGV0IHZpZXckID0gbW9kZWwkLm1hcCh2aWV3KVxucmVuZGVyKHZpZXckLCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGFpbmVyJykpXG4iXSwibmFtZXMiOlsic2VsIiwiZGF0YSIsImNoaWxkcmVuIiwidGV4dCIsImVsbSIsImtleSIsInVuZGVmaW5lZCIsIkFycmF5IiwiaXNBcnJheSIsInMiLCJjcmVhdGVFbGVtZW50IiwidGFnTmFtZSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudE5TIiwibmFtZXNwYWNlVVJJIiwicXVhbGlmaWVkTmFtZSIsImNyZWF0ZVRleHROb2RlIiwiaW5zZXJ0QmVmb3JlIiwicGFyZW50Tm9kZSIsIm5ld05vZGUiLCJyZWZlcmVuY2VOb2RlIiwicmVtb3ZlQ2hpbGQiLCJub2RlIiwiY2hpbGQiLCJhcHBlbmRDaGlsZCIsInBhcmVudEVsZW1lbnQiLCJuZXh0U2libGluZyIsInNldFRleHRDb250ZW50IiwidGV4dENvbnRlbnQiLCJWTm9kZSIsInJlcXVpcmUkJDIiLCJpcyIsInJlcXVpcmUkJDEiLCJkb21BcGkiLCJyZXF1aXJlJCQwIiwiaXNVbmRlZiIsImlzRGVmIiwiZW1wdHlOb2RlIiwic2FtZVZub2RlIiwidm5vZGUxIiwidm5vZGUyIiwiY3JlYXRlS2V5VG9PbGRJZHgiLCJiZWdpbklkeCIsImVuZElkeCIsImkiLCJtYXAiLCJob29rcyIsImluaXQiLCJtb2R1bGVzIiwiYXBpIiwiaiIsImNicyIsImxlbmd0aCIsInB1c2giLCJlbXB0eU5vZGVBdCIsImlkIiwiYyIsImNsYXNzTmFtZSIsInNwbGl0Iiwiam9pbiIsInRvTG93ZXJDYXNlIiwiY3JlYXRlUm1DYiIsImNoaWxkRWxtIiwibGlzdGVuZXJzIiwicGFyZW50IiwiY3JlYXRlRWxtIiwidm5vZGUiLCJpbnNlcnRlZFZub2RlUXVldWUiLCJob29rIiwiaGFzaElkeCIsImluZGV4T2YiLCJkb3RJZHgiLCJoYXNoIiwiZG90IiwidGFnIiwic2xpY2UiLCJNYXRoIiwibWluIiwibnMiLCJyZXBsYWNlIiwiYXJyYXkiLCJwcmltaXRpdmUiLCJjcmVhdGUiLCJpbnNlcnQiLCJhZGRWbm9kZXMiLCJwYXJlbnRFbG0iLCJiZWZvcmUiLCJ2bm9kZXMiLCJzdGFydElkeCIsImludm9rZURlc3Ryb3lIb29rIiwiZGVzdHJveSIsInJlbW92ZVZub2RlcyIsInJtIiwiY2giLCJyZW1vdmUiLCJ1cGRhdGVDaGlsZHJlbiIsIm9sZENoIiwibmV3Q2giLCJvbGRTdGFydElkeCIsIm5ld1N0YXJ0SWR4Iiwib2xkRW5kSWR4Iiwib2xkU3RhcnRWbm9kZSIsIm9sZEVuZFZub2RlIiwibmV3RW5kSWR4IiwibmV3U3RhcnRWbm9kZSIsIm5ld0VuZFZub2RlIiwib2xkS2V5VG9JZHgiLCJpZHhJbk9sZCIsImVsbVRvTW92ZSIsInBhdGNoVm5vZGUiLCJvbGRWbm9kZSIsInByZXBhdGNoIiwidXBkYXRlIiwicG9zdHBhdGNoIiwicHJlIiwicG9zdCIsImFkZE5TIiwiaCIsImIiLCJ1cGRhdGVDbGFzcyIsImN1ciIsIm5hbWUiLCJvbGRDbGFzcyIsImNsYXNzIiwia2xhc3MiLCJjbGFzc0xpc3QiLCJ1cGRhdGVQcm9wcyIsIm9sZCIsIm9sZFByb3BzIiwicHJvcHMiLCJyYWYiLCJ3aW5kb3ciLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJzZXRUaW1lb3V0IiwibmV4dEZyYW1lIiwiZm4iLCJzZXROZXh0RnJhbWUiLCJvYmoiLCJwcm9wIiwidmFsIiwidXBkYXRlU3R5bGUiLCJvbGRTdHlsZSIsInN0eWxlIiwib2xkSGFzRGVsIiwiZGVsYXllZCIsImFwcGx5RGVzdHJveVN0eWxlIiwiYXBwbHlSZW1vdmVTdHlsZSIsImlkeCIsIm1heER1ciIsImNvbXBTdHlsZSIsImFtb3VudCIsImFwcGxpZWQiLCJnZXRDb21wdXRlZFN0eWxlIiwiYWRkRXZlbnRMaXN0ZW5lciIsImV2IiwidGFyZ2V0IiwiaW52b2tlSGFuZGxlciIsImhhbmRsZXIiLCJldmVudCIsImNhbGwiLCJhcmdzIiwiYXBwbHkiLCJoYW5kbGVFdmVudCIsInR5cGUiLCJvbiIsImNyZWF0ZUxpc3RlbmVyIiwidXBkYXRlRXZlbnRMaXN0ZW5lcnMiLCJvbGRPbiIsIm9sZExpc3RlbmVyIiwibGlzdGVuZXIiLCJvbGRFbG0iLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiZ2xvYmFsIiwiZmFjdG9yeSIsImV4cG9ydHMiLCJtb2R1bGUiLCJkZWZpbmUiLCJhbWQiLCJLZWZpciIsInRoaXMiLCJjcmVhdGVPYmoiLCJwcm90byIsIkYiLCJwcm90b3R5cGUiLCJleHRlbmQiLCJhcmd1bWVudHMiLCJpbmhlcml0IiwiQ2hpbGQiLCJQYXJlbnQiLCJjb25zdHJ1Y3RvciIsIk5PVEhJTkciLCJFTkQiLCJWQUxVRSIsIkVSUk9SIiwiQU5ZIiwiY29uY2F0IiwiYSIsInJlc3VsdCIsImZpbmQiLCJhcnIiLCJ2YWx1ZSIsImZpbmRCeVByZWQiLCJwcmVkIiwiY2xvbmVBcnJheSIsImlucHV0IiwiaW5kZXgiLCJmb3JFYWNoIiwiZmlsbEFycmF5IiwiY29udGFpbnMiLCJzbGlkZSIsIm5leHQiLCJtYXgiLCJvZmZzZXQiLCJjYWxsU3Vic2NyaWJlciIsIkRpc3BhdGNoZXIiLCJfaXRlbXMiLCJfc3BpZXMiLCJfaW5Mb29wIiwiX3JlbW92ZWRJdGVtcyIsIngiLCJzcGllcyIsIl9pIiwiaXRlbXMiLCJPYnNlcnZhYmxlIiwiX2Rpc3BhdGNoZXIiLCJfYWN0aXZlIiwiX2FsaXZlIiwiX2FjdGl2YXRpbmciLCJfbG9nSGFuZGxlcnMiLCJfc3B5SGFuZGxlcnMiLCJhY3RpdmUiLCJfb25BY3RpdmF0aW9uIiwiX29uRGVhY3RpdmF0aW9uIiwiX3NldEFjdGl2ZSIsImNsZWFudXAiLCJfZW1pdFZhbHVlIiwiX2VtaXRFcnJvciIsIl9lbWl0RW5kIiwiZGlzcGF0Y2giLCJfY2xlYXIiLCJhZGQiLCJjb3VudCIsIl9vbiIsIl9vZmYiLCJvYnNlcnZlck9yT25WYWx1ZSIsIm9uRXJyb3IiLCJvbkVuZCIsIl90aGlzIiwiY2xvc2VkIiwib2JzZXJ2ZXIiLCJlcnJvciIsImVuZCIsIm9uQW55Iiwib2ZmQW55IiwiQSIsIkIiLCJnZXRUeXBlIiwic291cmNlT2JzIiwic2VsZk5hbWUiLCJfbmFtZSIsInRvU3RyaW5nIiwiaXNDdXJyZW50IiwibG9nIiwiaGFuZGxlckluZGV4Iiwic3BsaWNlIiwiYWRkU3B5IiwicmVtb3ZlU3B5IiwiU3RyZWFtIiwiUHJvcGVydHkiLCJfY3VycmVudEV2ZW50IiwibmV2ZXJTIiwibmV2ZXIiLCJ0aW1lQmFzZWQiLCJtaXhpbiIsIkFub255bW91c1N0cmVhbSIsIndhaXQiLCJvcHRpb25zIiwiX3dhaXQiLCJfaW50ZXJ2YWxJZCIsIl8kb25UaWNrIiwiX29uVGljayIsIl9pbml0Iiwic2V0SW50ZXJ2YWwiLCJfZnJlZSIsIlMiLCJfcmVmIiwiX3giLCJsYXRlciIsIlMkMSIsImludGVydmFsIiwiUyQyIiwieHMiLCJfeHMiLCJzaGlmdCIsInNlcXVlbnRpYWxseSIsIlMkMyIsIl9mbiIsImZyb21Qb2xsIiwiZW1pdHRlciIsIm9icyIsImUiLCJfZW1pdCIsIlMkNCIsIl9lbWl0dGVyIiwid2l0aEludGVydmFsIiwiUyQ1IiwiX3Vuc3Vic2NyaWJlIiwidW5zdWJzY3JpYmUiLCJfY2FsbFVuc3Vic2NyaWJlIiwic3RyZWFtIiwiZnJvbUNhbGxiYWNrIiwiY2FsbGJhY2tDb25zdW1lciIsImNhbGxlZCIsImVtaXQiLCJzZXROYW1lIiwiZnJvbU5vZGVDYWxsYmFjayIsInNwcmVhZCIsImFMZW5ndGgiLCJmcm9tU3ViVW5zdWIiLCJzdWIiLCJ1bnN1YiIsInRyYW5zZm9ybWVyIiwicGFpcnMiLCJmcm9tRXZlbnRzIiwiZXZlbnROYW1lIiwiRXJyb3IiLCJQIiwiY3VycmVudCIsImNvbnN0YW50IiwiUCQxIiwiY29uc3RhbnRFcnJvciIsImNyZWF0ZUNvbnN0cnVjdG9yIiwiQmFzZUNsYXNzIiwiQW5vbnltb3VzT2JzZXJ2YWJsZSIsInNvdXJjZSIsIl9zb3VyY2UiLCJfJGhhbmRsZUFueSIsIl9oYW5kbGVBbnkiLCJjcmVhdGVDbGFzc01ldGhvZHMiLCJfaGFuZGxlVmFsdWUiLCJfaGFuZGxlRXJyb3IiLCJfaGFuZGxlRW5kIiwiY3JlYXRlU3RyZWFtIiwiY3JlYXRlUHJvcGVydHkiLCJQJDIiLCJfZ2V0SW5pdGlhbEN1cnJlbnQiLCJnZXRJbml0aWFsIiwidG9Qcm9wZXJ0eSIsIlMkNiIsImNoYW5nZXMiLCJmcm9tUHJvbWlzZSIsInByb21pc2UiLCJvblZhbHVlIiwiX3Byb21pc2UiLCJ0aGVuIiwiZG9uZSIsImdldEdsb2RhbFByb21pc2UiLCJQcm9taXNlIiwidG9Qcm9taXNlIiwibGFzdCIsInJlc29sdmUiLCJyZWplY3QiLCJjb21tb25qc0dsb2JhbCIsInNlbGYiLCJjcmVhdGVDb21tb25qc01vZHVsZSIsInBvbnlmaWxsIiwiZGVmaW5lUHJvcGVydHkiLCJzeW1ib2xPYnNlcnZhYmxlUG9ueWZpbGwiLCJyb290IiwiX1N5bWJvbCIsIlN5bWJvbCIsIm9ic2VydmFibGUiLCJyZXF1aXJlJCQwJDEiLCJpbmRleCQxIiwiX3BvbnlmaWxsIiwiX3BvbnlmaWxsMiIsIl9pbnRlcm9wUmVxdWlyZURlZmF1bHQiLCJfX2VzTW9kdWxlIiwiJCRvYnNlcnZhYmxlIiwiZnJvbUVTT2JzZXJ2YWJsZSIsIl9vYnNlcnZhYmxlIiwic3Vic2NyaWJlIiwiRVNPYnNlcnZhYmxlIiwidGFrZUVycm9ycyIsIm9ic2VydmVyT3JPbk5leHQiLCJvbkNvbXBsZXRlIiwiY29tcGxldGUiLCJzdWJzY3JpcHRpb24iLCJ0b0VTT2JzZXJ2YWJsZSIsImRlZmF1bHRFcnJvcnNDb21iaW5hdG9yIiwiZXJyb3JzIiwibGF0ZXN0RXJyb3IiLCJDb21iaW5lIiwicGFzc2l2ZSIsImNvbWJpbmF0b3IiLCJfYWN0aXZlQ291bnQiLCJfc291cmNlcyIsIl9jb21iaW5hdG9yIiwiX2FsaXZlQ291bnQiLCJfbGF0ZXN0VmFsdWVzIiwiX2xhdGVzdEVycm9ycyIsIl9lbWl0QWZ0ZXJBY3RpdmF0aW9uIiwiX2VuZEFmdGVyQWN0aXZhdGlvbiIsIl9sYXRlc3RFcnJvckluZGV4IiwiXyRoYW5kbGVycyIsIl9sb29wIiwiX2VtaXRJZkZ1bGwiLCJoYXNBbGxWYWx1ZXMiLCJoYXNFcnJvcnMiLCJ2YWx1ZXNDb3B5IiwiZXJyb3JzQ29weSIsImNvbWJpbmUiLCJPYnNlcnZhYmxlJDEiLCJtZXJnZSIsImZuRXJyIiwiZm5WYWwiLCJtYXBFcnJvcnMiLCJvYnNGbiIsIm9ic1ZhbCIsImZsYXRNYXAiLCJzdGF0aWNMYW5kIiwiT2JqZWN0IiwiZnJlZXplIiwiUyQ3IiwiUCQzIiwibWFwJDEiLCJfb2ZTYW1lVHlwZSIsIm1peGluJDEiLCJTJDgiLCJQJDQiLCJpZCQxIiwiZmlsdGVyIiwibWl4aW4kMiIsIm4iLCJfbiIsIlMkOSIsIlAkNSIsInRha2UiLCJtaXhpbiQzIiwiUyQxMCIsIlAkNiIsIm1peGluJDQiLCJTJDExIiwiUCQ3IiwiaWQkMiIsInRha2VXaGlsZSIsIm1peGluJDUiLCJfbGFzdFZhbHVlIiwiUyQxMiIsIlAkOCIsIm1peGluJDYiLCJTJDEzIiwiUCQ5Iiwic2tpcCIsIm1peGluJDciLCJTJDE0IiwiUCQxMCIsImlkJDMiLCJza2lwV2hpbGUiLCJtaXhpbiQ4IiwiX3ByZXYiLCJTJDE1IiwiUCQxMSIsImVxIiwic2tpcER1cGxpY2F0ZXMiLCJtaXhpbiQ5Iiwic2VlZCIsIlMkMTYiLCJQJDEyIiwiZGVmYXVsdEZuIiwiZGlmZiIsIlAkMTMiLCJfc2VlZCIsInNjYW4iLCJtaXhpbiQxMCIsIlMkMTciLCJpZCQ0IiwiZmxhdHRlbiIsIkVORF9NQVJLRVIiLCJtaXhpbiQxMSIsIl9idWZmIiwiXyRzaGlmdEJ1ZmYiLCJTJDE4IiwiUCQxNCIsImRlbGF5Iiwibm93IiwiRGF0ZSIsImdldFRpbWUiLCJtaXhpbiQxMiIsImxlYWRpbmciLCJ0cmFpbGluZyIsIl9sZWFkaW5nIiwiX3RyYWlsaW5nIiwiX3RyYWlsaW5nVmFsdWUiLCJfdGltZW91dElkIiwiX2VuZExhdGVyIiwiX2xhc3RDYWxsVGltZSIsIl8kdHJhaWxpbmdDYWxsIiwiX3RyYWlsaW5nQ2FsbCIsImN1clRpbWUiLCJyZW1haW5pbmciLCJfY2FuY2VsVHJhaWxpbmciLCJTJDE5IiwiUCQxNSIsInRocm90dGxlIiwiX3JlZjIiLCJfcmVmMiRsZWFkaW5nIiwiX3JlZjIkdHJhaWxpbmciLCJtaXhpbiQxMyIsImltbWVkaWF0ZSIsIl9pbW1lZGlhdGUiLCJfbGFzdEF0dGVtcHQiLCJfbGF0ZXJWYWx1ZSIsIl8kbGF0ZXIiLCJfbGF0ZXIiLCJTJDIwIiwiUCQxNiIsImRlYm91bmNlIiwiX3JlZjIkaW1tZWRpYXRlIiwibWl4aW4kMTQiLCJTJDIxIiwiUCQxNyIsImlkJDUiLCJtaXhpbiQxNSIsIlMkMjIiLCJQJDE4IiwiaWQkNiIsImZpbHRlckVycm9ycyIsIm1peGluJDE2IiwiUyQyMyIsIlAkMTkiLCJpZ25vcmVWYWx1ZXMiLCJtaXhpbiQxNyIsIlMkMjQiLCJQJDIwIiwiaWdub3JlRXJyb3JzIiwibWl4aW4kMTgiLCJTJDI1IiwiUCQyMSIsImlnbm9yZUVuZCIsIm1peGluJDE5IiwiUyQyNiIsIlAkMjIiLCJiZWZvcmVFbmQiLCJtaXhpbiQyMCIsIl9tYXgiLCJfbWluIiwiUyQyNyIsIlAkMjMiLCJzbGlkaW5nV2luZG93IiwibWl4aW4kMjEiLCJmbHVzaE9uRW5kIiwiX2ZsdXNoT25FbmQiLCJfZmx1c2giLCJTJDI4IiwiUCQyNCIsImlkJDciLCJidWZmZXJXaGlsZSIsIl9yZWYyJGZsdXNoT25FbmQiLCJtaXhpbiQyMiIsIl9jb3VudCIsIlMkMjkiLCJQJDI1IiwiYnVmZmVyV2hpbGUkMSIsIm1peGluJDIzIiwiUyQzMCIsIlAkMjYiLCJidWZmZXJXaXRoVGltZU9yQ291bnQiLCJ4Zm9ybUZvck9icyIsInJlcyIsIm1peGluJDI0IiwidHJhbnNkdWNlciIsIl94Zm9ybSIsIlMkMzEiLCJQJDI3IiwidHJhbnNkdWNlIiwibWl4aW4kMjUiLCJfaGFuZGxlciIsIlMkMzIiLCJQJDI4Iiwid2l0aEhhbmRsZXIiLCJaaXAiLCJzb3VyY2VzIiwiX2J1ZmZlcnMiLCJfaXNGdWxsIiwidmFsdWVzIiwiemlwIiwib2JzZXJ2YWJsZXMiLCJpZCQ4IiwiQWJzdHJhY3RQb29sIiwiX3JlZiRxdWV1ZUxpbSIsInF1ZXVlTGltIiwiX3JlZiRjb25jdXJMaW0iLCJjb25jdXJMaW0iLCJfcmVmJGRyb3AiLCJkcm9wIiwiX3F1ZXVlTGltIiwiX2NvbmN1ckxpbSIsIl9kcm9wIiwiX3F1ZXVlIiwiX2N1clNvdXJjZXMiLCJfJGhhbmRsZVN1YkFueSIsIl9oYW5kbGVTdWJBbnkiLCJfJGVuZEhhbmRsZXJzIiwiX2N1cnJlbnRseUFkZGluZyIsInRvT2JzIiwiX2FkZFRvQ3VyIiwiX2FkZFRvUXVldWUiLCJfcmVtb3ZlT2xkZXN0IiwiX2FkZCIsIm9ic3MiLCJfdGhpczIiLCJfcmVtb3ZlQ3VyIiwiX3JlbW92ZVF1ZXVlIiwiX3N1YlRvRW5kIiwiX3RoaXMzIiwib25FbmRJIiwib2ZmRW5kIiwiX3B1bGxRdWV1ZSIsIl9vbkVtcHR5IiwiX3N1YnNjcmliZSIsIk1lcmdlIiwiX2FkZEFsbCIsIl9pbml0aWFsaXNlZCIsIlMkMzMiLCJnZW5lcmF0b3IiLCJfZ2VuZXJhdG9yIiwiX2l0ZXJhdGlvbiIsIl9nZXRTb3VyY2UiLCJyZXBlYXQiLCJjb25jYXQkMSIsIlBvb2wiLCJfcmVtb3ZlIiwiRmxhdE1hcCIsIl9tYWluRW5kZWQiLCJfbGFzdEN1cnJlbnQiLCJfJGhhbmRsZU1haW4iLCJfaGFuZGxlTWFpbiIsIl9oYWROb0V2U2luY2VEZWFjdCIsInNhbWVDdXJyIiwiX2lzRW1wdHkiLCJGbGF0TWFwRXJyb3JzIiwiY3JlYXRlQ29uc3RydWN0b3IkMSIsInByaW1hcnkiLCJzZWNvbmRhcnkiLCJfcHJpbWFyeSIsIl9zZWNvbmRhcnkiLCJfbGFzdFNlY29uZGFyeSIsIl8kaGFuZGxlU2Vjb25kYXJ5QW55IiwiX2hhbmRsZVNlY29uZGFyeUFueSIsIl8kaGFuZGxlUHJpbWFyeUFueSIsIl9oYW5kbGVQcmltYXJ5QW55IiwiY3JlYXRlQ2xhc3NNZXRob2RzJDEiLCJfaGFuZGxlUHJpbWFyeVZhbHVlIiwiX2hhbmRsZVByaW1hcnlFcnJvciIsIl9oYW5kbGVQcmltYXJ5RW5kIiwiX2hhbmRsZVNlY29uZGFyeVZhbHVlIiwiX2hhbmRsZVNlY29uZGFyeUVycm9yIiwiX2hhbmRsZVNlY29uZGFyeUVuZCIsIl9yZW1vdmVTZWNvbmRhcnkiLCJjcmVhdGVTdHJlYW0kMSIsImNyZWF0ZVByb3BlcnR5JDEiLCJtaXhpbiQyNiIsIlMkMzQiLCJQJDI5IiwiZmlsdGVyQnkiLCJpZDIiLCJfIiwic2FtcGxlZEJ5IiwibWl4aW4kMjciLCJTJDM1IiwiUCQzMCIsInNraXBVbnRpbEJ5IiwibWl4aW4kMjgiLCJTJDM2IiwiUCQzMSIsInRha2VVbnRpbEJ5IiwibWl4aW4kMjkiLCJfcmVmJGZsdXNoT25FbmQiLCJTJDM3IiwiUCQzMiIsImJ1ZmZlckJ5IiwibWl4aW4kMzAiLCJfcmVmJGZsdXNoT25DaGFuZ2UiLCJmbHVzaE9uQ2hhbmdlIiwiX2ZsdXNoT25DaGFuZ2UiLCJTJDM4IiwiUCQzMyIsImJ1ZmZlcldoaWxlQnkiLCJmIiwidCIsImF3YWl0aW5nIiwibWl4aW4kMzEiLCJjb252ZXJ0IiwiUyQzOSIsIlAkMzQiLCJkZWZGbiIsInZhbHVlc1RvRXJyb3JzIiwibWl4aW4kMzIiLCJTJDQwIiwiUCQzNSIsImRlZkZuJDEiLCJlcnJvcnNUb1ZhbHVlcyIsIm1peGluJDMzIiwiUyQ0MSIsIlAkMzYiLCJlbmRPbkVycm9yIiwiYnVmZmVyV2l0aENvdW50Iiwib3RoZXIiLCJwb29sIiwiZmxhdE1hcExhdGVzdCIsImZsYXRNYXBGaXJzdCIsImZsYXRNYXBDb25jYXQiLCJmbGF0TWFwQ29uY3VyTGltaXQiLCJsaW1pdCIsImZsYXRNYXBFcnJvcnMiLCJERVBSRUNBVElPTl9XQVJOSU5HUyIsImRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncyIsIndhcm4iLCJtc2ciLCJjb25zb2xlIiwibXNnMiIsImJ1cyIsImNvbnZlcnRUb0h5cGVyU2NyaXB0IiwicmVuZGVyIiwidmlldyQiLCJjb250YWluZXIiLCJwYXRjaCIsInNuYWJiZG9tIiwic25hYkNsYXNzIiwic25hYlByb3BzIiwic25hYlN0eWxlIiwic25hYkV2ZW50IiwibmV3Vm5vZGUiLCJhY3Rpb25zJCIsImluaXRNb2RlbCIsImFsbENvbXBsZXRlZCIsInVpZCIsIm1vZGVsIiwiYWN0aW9uIiwibmV3SXRlbXMiLCJuZXdJdGVtIiwiaXRlbSIsImNvbXBsZXRlZCIsImFsbEl0ZW1zQ29tcGxldGVkIiwiZWRpdGluZyIsImZpbmRJbmRleCIsInJlbW92ZUl0ZW0iLCJuZXdBbGxDb21wbGV0ZWQiLCJ2aWV3IiwibnVtSXRlbXMiLCJ2IiwicGxhY2Vob2xkZXIiLCJhdXRvZm9jdXMiLCJoYW5kbGVJbnB1dCIsImtleWRvd24iLCJvbkVudGVyIiwibWFpbiIsImZvb3RlciIsImluZm8iLCJ0cmltIiwiY29kZSIsImNoZWNrZWQiLCJjbGljayIsInRvZ2dsZUFsbCIsImh0bWxGb3IiLCJ2aWV3SXRlbSIsImNoZWNrYm94Q2xpY2siLCJkYmxjbGljayIsIml0ZW1DbGljayIsImRlc3Ryb3lDbGljayIsIm9uRWRpdERvbmUiLCJibHVyIiwib25CbHVyIiwiZm9jdXNFbGVtZW50IiwiZm9jdXMiLCJudW1VbmNvbXBsZXRlZCIsIm51bUxlZnQiLCJocmVmIiwic2VsZWN0ZWQiLCJtb2RlbCQiLCJnZXRFbGVtZW50QnlJZCJdLCJtYXBwaW5ncyI6IkFBQUEsWUFBaUIsVUFBU0EsR0FBVCxFQUFjQyxJQUFkLEVBQW9CQyxRQUFwQixFQUE4QkMsSUFBOUIsRUFBb0NDLEdBQXBDLEVBQXlDO01BQ3BEQyxNQUFNSixTQUFTSyxTQUFULEdBQXFCQSxTQUFyQixHQUFpQ0wsS0FBS0ksR0FBaEQ7U0FDTyxFQUFDTCxLQUFLQSxHQUFOLEVBQVdDLE1BQU1BLElBQWpCLEVBQXVCQyxVQUFVQSxRQUFqQztVQUNPQyxJQURQLEVBQ2FDLEtBQUtBLEdBRGxCLEVBQ3VCQyxLQUFLQSxHQUQ1QixFQUFQO0NBRkY7O0FDQUEsV0FBaUI7U0FDUkUsTUFBTUMsT0FERTthQUVKLFVBQVNDLENBQVQsRUFBWTtXQUFTLE9BQU9BLENBQVAsS0FBYSxRQUFiLElBQXlCLE9BQU9BLENBQVAsS0FBYSxRQUE3Qzs7Q0FGM0I7O0FDQUEsU0FBU0MsYUFBVCxDQUF1QkMsT0FBdkIsRUFBK0I7U0FDdEJDLFNBQVNGLGFBQVQsQ0FBdUJDLE9BQXZCLENBQVA7OztBQUdGLFNBQVNFLGVBQVQsQ0FBeUJDLFlBQXpCLEVBQXVDQyxhQUF2QyxFQUFxRDtTQUM1Q0gsU0FBU0MsZUFBVCxDQUF5QkMsWUFBekIsRUFBdUNDLGFBQXZDLENBQVA7OztBQUdGLFNBQVNDLGNBQVQsQ0FBd0JiLElBQXhCLEVBQTZCO1NBQ3BCUyxTQUFTSSxjQUFULENBQXdCYixJQUF4QixDQUFQOzs7QUFJRixTQUFTYyxZQUFULENBQXNCQyxVQUF0QixFQUFrQ0MsT0FBbEMsRUFBMkNDLGFBQTNDLEVBQXlEO2FBQzVDSCxZQUFYLENBQXdCRSxPQUF4QixFQUFpQ0MsYUFBakM7OztBQUlGLFNBQVNDLFdBQVQsQ0FBcUJDLElBQXJCLEVBQTJCQyxLQUEzQixFQUFpQztPQUMxQkYsV0FBTCxDQUFpQkUsS0FBakI7OztB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
