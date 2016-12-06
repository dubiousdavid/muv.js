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
actions$.log('Actions');

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
    case 'cancelEdit':
      newItems = items.map(item => {
        return item.editing ? Object.assign({}, item, { editing: false }) : item;
      });
      return Object.assign({}, model, { items: newItems });
    case 'updateItem':
      if (value == '') {
        let index = items.findIndex(item => item.editing);
        newItems = index == -1 ? items : removeItem(items, items[index].id);
      } else {
        newItems = items.map(item => {
          return item.editing ? Object.assign({}, item, { editing: false, text: value }) : item;
        });
      }
      return items != newItems ? Object.assign({}, model, { items: newItems }) : model;
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
    if (text !== '') actions$.emit(['addItem', text]);
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
    on: { click: [checkboxClick, id] } }], ['label', { on: { dblclick: [itemClick, id] } }, text], ['button.destroy', { on: { click: [destroyClick, id] } }]]], ['input.edit', { props: { value: editing ? text : '' },
    on: { keydown: onEditDone, blur: onBlur },
    hook: { postpatch: focusElement } }]]];
  return v;
}

function focusElement(oldVnode, vnode) {
  vnode.elm.focus();
}

function onEditDone(e) {
  switch (e.code) {
    case 'Enter':
      let text = e.target.value.trim();
      actions$.emit(['updateItem', text]);
      break;
    case 'Escape':
      actions$.emit(['cancelEdit']);
      break;
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
model$.log('Model');

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS92bm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9pcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9odG1sZG9tYXBpLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL3NuYWJiZG9tLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9jbGFzcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9rZWZpci9kaXN0L2tlZmlyLmpzIiwiLi4vLi4vc3JjL2luZGV4LmpzIiwiaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzZWwsIGRhdGEsIGNoaWxkcmVuLCB0ZXh0LCBlbG0pIHtcbiAgdmFyIGtleSA9IGRhdGEgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IGRhdGEua2V5O1xuICByZXR1cm4ge3NlbDogc2VsLCBkYXRhOiBkYXRhLCBjaGlsZHJlbjogY2hpbGRyZW4sXG4gICAgICAgICAgdGV4dDogdGV4dCwgZWxtOiBlbG0sIGtleToga2V5fTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYXJyYXk6IEFycmF5LmlzQXJyYXksXG4gIHByaW1pdGl2ZTogZnVuY3Rpb24ocykgeyByZXR1cm4gdHlwZW9mIHMgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzID09PSAnbnVtYmVyJzsgfSxcbn07XG4iLCJmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZ05hbWUpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgcXVhbGlmaWVkTmFtZSl7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBxdWFsaWZpZWROYW1lKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVGV4dE5vZGUodGV4dCl7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBpbnNlcnRCZWZvcmUocGFyZW50Tm9kZSwgbmV3Tm9kZSwgcmVmZXJlbmNlTm9kZSl7XG4gIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUNoaWxkKG5vZGUsIGNoaWxkKXtcbiAgbm9kZS5yZW1vdmVDaGlsZChjaGlsZCk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZENoaWxkKG5vZGUsIGNoaWxkKXtcbiAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG59XG5cbmZ1bmN0aW9uIHBhcmVudE5vZGUobm9kZSl7XG4gIHJldHVybiBub2RlLnBhcmVudEVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIG5leHRTaWJsaW5nKG5vZGUpe1xuICByZXR1cm4gbm9kZS5uZXh0U2libGluZztcbn1cblxuZnVuY3Rpb24gdGFnTmFtZShub2RlKXtcbiAgcmV0dXJuIG5vZGUudGFnTmFtZTtcbn1cblxuZnVuY3Rpb24gc2V0VGV4dENvbnRlbnQobm9kZSwgdGV4dCl7XG4gIG5vZGUudGV4dENvbnRlbnQgPSB0ZXh0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlRWxlbWVudDogY3JlYXRlRWxlbWVudCxcbiAgY3JlYXRlRWxlbWVudE5TOiBjcmVhdGVFbGVtZW50TlMsXG4gIGNyZWF0ZVRleHROb2RlOiBjcmVhdGVUZXh0Tm9kZSxcbiAgYXBwZW5kQ2hpbGQ6IGFwcGVuZENoaWxkLFxuICByZW1vdmVDaGlsZDogcmVtb3ZlQ2hpbGQsXG4gIGluc2VydEJlZm9yZTogaW5zZXJ0QmVmb3JlLFxuICBwYXJlbnROb2RlOiBwYXJlbnROb2RlLFxuICBuZXh0U2libGluZzogbmV4dFNpYmxpbmcsXG4gIHRhZ05hbWU6IHRhZ05hbWUsXG4gIHNldFRleHRDb250ZW50OiBzZXRUZXh0Q29udGVudFxufTtcbiIsIi8vIGpzaGludCBuZXdjYXA6IGZhbHNlXG4vKiBnbG9iYWwgcmVxdWlyZSwgbW9kdWxlLCBkb2N1bWVudCwgTm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVk5vZGUgPSByZXF1aXJlKCcuL3Zub2RlJyk7XG52YXIgaXMgPSByZXF1aXJlKCcuL2lzJyk7XG52YXIgZG9tQXBpID0gcmVxdWlyZSgnLi9odG1sZG9tYXBpJyk7XG5cbmZ1bmN0aW9uIGlzVW5kZWYocykgeyByZXR1cm4gcyA9PT0gdW5kZWZpbmVkOyB9XG5mdW5jdGlvbiBpc0RlZihzKSB7IHJldHVybiBzICE9PSB1bmRlZmluZWQ7IH1cblxudmFyIGVtcHR5Tm9kZSA9IFZOb2RlKCcnLCB7fSwgW10sIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcblxuZnVuY3Rpb24gc2FtZVZub2RlKHZub2RlMSwgdm5vZGUyKSB7XG4gIHJldHVybiB2bm9kZTEua2V5ID09PSB2bm9kZTIua2V5ICYmIHZub2RlMS5zZWwgPT09IHZub2RlMi5zZWw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUtleVRvT2xkSWR4KGNoaWxkcmVuLCBiZWdpbklkeCwgZW5kSWR4KSB7XG4gIHZhciBpLCBtYXAgPSB7fSwga2V5O1xuICBmb3IgKGkgPSBiZWdpbklkeDsgaSA8PSBlbmRJZHg7ICsraSkge1xuICAgIGtleSA9IGNoaWxkcmVuW2ldLmtleTtcbiAgICBpZiAoaXNEZWYoa2V5KSkgbWFwW2tleV0gPSBpO1xuICB9XG4gIHJldHVybiBtYXA7XG59XG5cbnZhciBob29rcyA9IFsnY3JlYXRlJywgJ3VwZGF0ZScsICdyZW1vdmUnLCAnZGVzdHJveScsICdwcmUnLCAncG9zdCddO1xuXG5mdW5jdGlvbiBpbml0KG1vZHVsZXMsIGFwaSkge1xuICB2YXIgaSwgaiwgY2JzID0ge307XG5cbiAgaWYgKGlzVW5kZWYoYXBpKSkgYXBpID0gZG9tQXBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBob29rcy5sZW5ndGg7ICsraSkge1xuICAgIGNic1tob29rc1tpXV0gPSBbXTtcbiAgICBmb3IgKGogPSAwOyBqIDwgbW9kdWxlcy5sZW5ndGg7ICsraikge1xuICAgICAgaWYgKG1vZHVsZXNbal1baG9va3NbaV1dICE9PSB1bmRlZmluZWQpIGNic1tob29rc1tpXV0ucHVzaChtb2R1bGVzW2pdW2hvb2tzW2ldXSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZW1wdHlOb2RlQXQoZWxtKSB7XG4gICAgdmFyIGlkID0gZWxtLmlkID8gJyMnICsgZWxtLmlkIDogJyc7XG4gICAgdmFyIGMgPSBlbG0uY2xhc3NOYW1lID8gJy4nICsgZWxtLmNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJy4nKSA6ICcnO1xuICAgIHJldHVybiBWTm9kZShhcGkudGFnTmFtZShlbG0pLnRvTG93ZXJDYXNlKCkgKyBpZCArIGMsIHt9LCBbXSwgdW5kZWZpbmVkLCBlbG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlUm1DYihjaGlsZEVsbSwgbGlzdGVuZXJzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tbGlzdGVuZXJzID09PSAwKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBhcGkucGFyZW50Tm9kZShjaGlsZEVsbSk7XG4gICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnQsIGNoaWxkRWxtKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICB2YXIgaSwgZGF0YSA9IHZub2RlLmRhdGE7XG4gICAgaWYgKGlzRGVmKGRhdGEpKSB7XG4gICAgICBpZiAoaXNEZWYoaSA9IGRhdGEuaG9vaykgJiYgaXNEZWYoaSA9IGkuaW5pdCkpIHtcbiAgICAgICAgaSh2bm9kZSk7XG4gICAgICAgIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZWxtLCBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuLCBzZWwgPSB2bm9kZS5zZWw7XG4gICAgaWYgKGlzRGVmKHNlbCkpIHtcbiAgICAgIC8vIFBhcnNlIHNlbGVjdG9yXG4gICAgICB2YXIgaGFzaElkeCA9IHNlbC5pbmRleE9mKCcjJyk7XG4gICAgICB2YXIgZG90SWR4ID0gc2VsLmluZGV4T2YoJy4nLCBoYXNoSWR4KTtcbiAgICAgIHZhciBoYXNoID0gaGFzaElkeCA+IDAgPyBoYXNoSWR4IDogc2VsLmxlbmd0aDtcbiAgICAgIHZhciBkb3QgPSBkb3RJZHggPiAwID8gZG90SWR4IDogc2VsLmxlbmd0aDtcbiAgICAgIHZhciB0YWcgPSBoYXNoSWR4ICE9PSAtMSB8fCBkb3RJZHggIT09IC0xID8gc2VsLnNsaWNlKDAsIE1hdGgubWluKGhhc2gsIGRvdCkpIDogc2VsO1xuICAgICAgZWxtID0gdm5vZGUuZWxtID0gaXNEZWYoZGF0YSkgJiYgaXNEZWYoaSA9IGRhdGEubnMpID8gYXBpLmNyZWF0ZUVsZW1lbnROUyhpLCB0YWcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBhcGkuY3JlYXRlRWxlbWVudCh0YWcpO1xuICAgICAgaWYgKGhhc2ggPCBkb3QpIGVsbS5pZCA9IHNlbC5zbGljZShoYXNoICsgMSwgZG90KTtcbiAgICAgIGlmIChkb3RJZHggPiAwKSBlbG0uY2xhc3NOYW1lID0gc2VsLnNsaWNlKGRvdCArIDEpLnJlcGxhY2UoL1xcLi9nLCAnICcpO1xuICAgICAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBjcmVhdGVFbG0oY2hpbGRyZW5baV0sIGluc2VydGVkVm5vZGVRdWV1ZSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzLnByaW1pdGl2ZSh2bm9kZS50ZXh0KSkge1xuICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCkpO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5jcmVhdGUubGVuZ3RoOyArK2kpIGNicy5jcmVhdGVbaV0oZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICBpID0gdm5vZGUuZGF0YS5ob29rOyAvLyBSZXVzZSB2YXJpYWJsZVxuICAgICAgaWYgKGlzRGVmKGkpKSB7XG4gICAgICAgIGlmIChpLmNyZWF0ZSkgaS5jcmVhdGUoZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICAgIGlmIChpLmluc2VydCkgaW5zZXJ0ZWRWbm9kZVF1ZXVlLnB1c2godm5vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlbG0gPSB2bm9kZS5lbG0gPSBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCk7XG4gICAgfVxuICAgIHJldHVybiB2bm9kZS5lbG07XG4gIH1cblxuICBmdW5jdGlvbiBhZGRWbm9kZXMocGFyZW50RWxtLCBiZWZvcmUsIHZub2Rlcywgc3RhcnRJZHgsIGVuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbSh2bm9kZXNbc3RhcnRJZHhdLCBpbnNlcnRlZFZub2RlUXVldWUpLCBiZWZvcmUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGludm9rZURlc3Ryb3lIb29rKHZub2RlKSB7XG4gICAgdmFyIGksIGosIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgIGlmIChpc0RlZihkYXRhKSkge1xuICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLmhvb2spICYmIGlzRGVmKGkgPSBpLmRlc3Ryb3kpKSBpKHZub2RlKTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMuZGVzdHJveS5sZW5ndGg7ICsraSkgY2JzLmRlc3Ryb3lbaV0odm5vZGUpO1xuICAgICAgaWYgKGlzRGVmKGkgPSB2bm9kZS5jaGlsZHJlbikpIHtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IHZub2RlLmNoaWxkcmVuLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgaW52b2tlRGVzdHJveUhvb2sodm5vZGUuY2hpbGRyZW5bal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgdm5vZGVzLCBzdGFydElkeCwgZW5kSWR4KSB7XG4gICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgdmFyIGksIGxpc3RlbmVycywgcm0sIGNoID0gdm5vZGVzW3N0YXJ0SWR4XTtcbiAgICAgIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKGlzRGVmKGNoLnNlbCkpIHtcbiAgICAgICAgICBpbnZva2VEZXN0cm95SG9vayhjaCk7XG4gICAgICAgICAgbGlzdGVuZXJzID0gY2JzLnJlbW92ZS5sZW5ndGggKyAxO1xuICAgICAgICAgIHJtID0gY3JlYXRlUm1DYihjaC5lbG0sIGxpc3RlbmVycyk7XG4gICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5yZW1vdmUubGVuZ3RoOyArK2kpIGNicy5yZW1vdmVbaV0oY2gsIHJtKTtcbiAgICAgICAgICBpZiAoaXNEZWYoaSA9IGNoLmRhdGEpICYmIGlzRGVmKGkgPSBpLmhvb2spICYmIGlzRGVmKGkgPSBpLnJlbW92ZSkpIHtcbiAgICAgICAgICAgIGkoY2gsIHJtKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm0oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIFRleHQgbm9kZVxuICAgICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnRFbG0sIGNoLmVsbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVDaGlsZHJlbihwYXJlbnRFbG0sIG9sZENoLCBuZXdDaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIG9sZFN0YXJ0SWR4ID0gMCwgbmV3U3RhcnRJZHggPSAwO1xuICAgIHZhciBvbGRFbmRJZHggPSBvbGRDaC5sZW5ndGggLSAxO1xuICAgIHZhciBvbGRTdGFydFZub2RlID0gb2xkQ2hbMF07XG4gICAgdmFyIG9sZEVuZFZub2RlID0gb2xkQ2hbb2xkRW5kSWR4XTtcbiAgICB2YXIgbmV3RW5kSWR4ID0gbmV3Q2gubGVuZ3RoIC0gMTtcbiAgICB2YXIgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWzBdO1xuICAgIHZhciBuZXdFbmRWbm9kZSA9IG5ld0NoW25ld0VuZElkeF07XG4gICAgdmFyIG9sZEtleVRvSWR4LCBpZHhJbk9sZCwgZWxtVG9Nb3ZlLCBiZWZvcmU7XG5cbiAgICB3aGlsZSAob2xkU3RhcnRJZHggPD0gb2xkRW5kSWR4ICYmIG5ld1N0YXJ0SWR4IDw9IG5ld0VuZElkeCkge1xuICAgICAgaWYgKGlzVW5kZWYob2xkU3RhcnRWbm9kZSkpIHtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdOyAvLyBWbm9kZSBoYXMgYmVlbiBtb3ZlZCBsZWZ0XG4gICAgICB9IGVsc2UgaWYgKGlzVW5kZWYob2xkRW5kVm5vZGUpKSB7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgfSBlbHNlIGlmIChzYW1lVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3U3RhcnRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRTdGFydFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBvbGRTdGFydFZub2RlID0gb2xkQ2hbKytvbGRTdGFydElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdFbmRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRFbmRWbm9kZSwgbmV3RW5kVm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCByaWdodFxuICAgICAgICBwYXRjaFZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgb2xkU3RhcnRWbm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhvbGRFbmRWbm9kZS5lbG0pKTtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCBsZWZ0XG4gICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBvbGRFbmRWbm9kZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgb2xkRW5kVm5vZGUgPSBvbGRDaFstLW9sZEVuZElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc1VuZGVmKG9sZEtleVRvSWR4KSkgb2xkS2V5VG9JZHggPSBjcmVhdGVLZXlUb09sZElkeChvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgICAgIGlkeEluT2xkID0gb2xkS2V5VG9JZHhbbmV3U3RhcnRWbm9kZS5rZXldO1xuICAgICAgICBpZiAoaXNVbmRlZihpZHhJbk9sZCkpIHsgLy8gTmV3IGVsZW1lbnRcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgY3JlYXRlRWxtKG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSksIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWxtVG9Nb3ZlID0gb2xkQ2hbaWR4SW5PbGRdO1xuICAgICAgICAgIHBhdGNoVm5vZGUoZWxtVG9Nb3ZlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgIG9sZENoW2lkeEluT2xkXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgZWxtVG9Nb3ZlLmVsbSwgb2xkU3RhcnRWbm9kZS5lbG0pO1xuICAgICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAob2xkU3RhcnRJZHggPiBvbGRFbmRJZHgpIHtcbiAgICAgIGJlZm9yZSA9IGlzVW5kZWYobmV3Q2hbbmV3RW5kSWR4KzFdKSA/IG51bGwgOiBuZXdDaFtuZXdFbmRJZHgrMV0uZWxtO1xuICAgICAgYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCBuZXdDaCwgbmV3U3RhcnRJZHgsIG5ld0VuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICB9IGVsc2UgaWYgKG5ld1N0YXJ0SWR4ID4gbmV3RW5kSWR4KSB7XG4gICAgICByZW1vdmVWbm9kZXMocGFyZW50RWxtLCBvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIHZhciBpLCBob29rO1xuICAgIGlmIChpc0RlZihpID0gdm5vZGUuZGF0YSkgJiYgaXNEZWYoaG9vayA9IGkuaG9vaykgJiYgaXNEZWYoaSA9IGhvb2sucHJlcGF0Y2gpKSB7XG4gICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICAgIHZhciBlbG0gPSB2bm9kZS5lbG0gPSBvbGRWbm9kZS5lbG0sIG9sZENoID0gb2xkVm5vZGUuY2hpbGRyZW4sIGNoID0gdm5vZGUuY2hpbGRyZW47XG4gICAgaWYgKG9sZFZub2RlID09PSB2bm9kZSkgcmV0dXJuO1xuICAgIGlmICghc2FtZVZub2RlKG9sZFZub2RlLCB2bm9kZSkpIHtcbiAgICAgIHZhciBwYXJlbnRFbG0gPSBhcGkucGFyZW50Tm9kZShvbGRWbm9kZS5lbG0pO1xuICAgICAgZWxtID0gY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGVsbSwgb2xkVm5vZGUuZWxtKTtcbiAgICAgIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIFtvbGRWbm9kZV0sIDAsIDApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaXNEZWYodm5vZGUuZGF0YSkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMudXBkYXRlLmxlbmd0aDsgKytpKSBjYnMudXBkYXRlW2ldKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgICBpID0gdm5vZGUuZGF0YS5ob29rO1xuICAgICAgaWYgKGlzRGVmKGkpICYmIGlzRGVmKGkgPSBpLnVwZGF0ZSkpIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICB9XG4gICAgaWYgKGlzVW5kZWYodm5vZGUudGV4dCkpIHtcbiAgICAgIGlmIChpc0RlZihvbGRDaCkgJiYgaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChvbGRDaCAhPT0gY2gpIHVwZGF0ZUNoaWxkcmVuKGVsbSwgb2xkQ2gsIGNoLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKGlzRGVmKG9sZFZub2RlLnRleHQpKSBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCAnJyk7XG4gICAgICAgIGFkZFZub2RlcyhlbG0sIG51bGwsIGNoLCAwLCBjaC5sZW5ndGggLSAxLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihvbGRDaCkpIHtcbiAgICAgICAgcmVtb3ZlVm5vZGVzKGVsbSwgb2xkQ2gsIDAsIG9sZENoLmxlbmd0aCAtIDEpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihvbGRWbm9kZS50ZXh0KSkge1xuICAgICAgICBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCAnJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvbGRWbm9kZS50ZXh0ICE9PSB2bm9kZS50ZXh0KSB7XG4gICAgICBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCB2bm9kZS50ZXh0KTtcbiAgICB9XG4gICAgaWYgKGlzRGVmKGhvb2spICYmIGlzRGVmKGkgPSBob29rLnBvc3RwYXRjaCkpIHtcbiAgICAgIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24ob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGksIGVsbSwgcGFyZW50O1xuICAgIHZhciBpbnNlcnRlZFZub2RlUXVldWUgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnByZS5sZW5ndGg7ICsraSkgY2JzLnByZVtpXSgpO1xuXG4gICAgaWYgKGlzVW5kZWYob2xkVm5vZGUuc2VsKSkge1xuICAgICAgb2xkVm5vZGUgPSBlbXB0eU5vZGVBdChvbGRWbm9kZSk7XG4gICAgfVxuXG4gICAgaWYgKHNhbWVWbm9kZShvbGRWbm9kZSwgdm5vZGUpKSB7XG4gICAgICBwYXRjaFZub2RlKG9sZFZub2RlLCB2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxtID0gb2xkVm5vZGUuZWxtO1xuICAgICAgcGFyZW50ID0gYXBpLnBhcmVudE5vZGUoZWxtKTtcblxuICAgICAgY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuXG4gICAgICBpZiAocGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50LCB2bm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhlbG0pKTtcbiAgICAgICAgcmVtb3ZlVm5vZGVzKHBhcmVudCwgW29sZFZub2RlXSwgMCwgMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGluc2VydGVkVm5vZGVRdWV1ZS5sZW5ndGg7ICsraSkge1xuICAgICAgaW5zZXJ0ZWRWbm9kZVF1ZXVlW2ldLmRhdGEuaG9vay5pbnNlcnQoaW5zZXJ0ZWRWbm9kZVF1ZXVlW2ldKTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGNicy5wb3N0Lmxlbmd0aDsgKytpKSBjYnMucG9zdFtpXSgpO1xuICAgIHJldHVybiB2bm9kZTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7aW5pdDogaW5pdH07XG4iLCJ2YXIgVk5vZGUgPSByZXF1aXJlKCcuL3Zub2RlJyk7XG52YXIgaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbmZ1bmN0aW9uIGFkZE5TKGRhdGEsIGNoaWxkcmVuLCBzZWwpIHtcbiAgZGF0YS5ucyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc7XG5cbiAgaWYgKHNlbCAhPT0gJ2ZvcmVpZ25PYmplY3QnICYmIGNoaWxkcmVuICE9PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICBhZGROUyhjaGlsZHJlbltpXS5kYXRhLCBjaGlsZHJlbltpXS5jaGlsZHJlbiwgY2hpbGRyZW5baV0uc2VsKTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBoKHNlbCwgYiwgYykge1xuICB2YXIgZGF0YSA9IHt9LCBjaGlsZHJlbiwgdGV4dCwgaTtcbiAgaWYgKGMgIT09IHVuZGVmaW5lZCkge1xuICAgIGRhdGEgPSBiO1xuICAgIGlmIChpcy5hcnJheShjKSkgeyBjaGlsZHJlbiA9IGM7IH1cbiAgICBlbHNlIGlmIChpcy5wcmltaXRpdmUoYykpIHsgdGV4dCA9IGM7IH1cbiAgfSBlbHNlIGlmIChiICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoaXMuYXJyYXkoYikpIHsgY2hpbGRyZW4gPSBiOyB9XG4gICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGIpKSB7IHRleHQgPSBiOyB9XG4gICAgZWxzZSB7IGRhdGEgPSBiOyB9XG4gIH1cbiAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgaWYgKGlzLnByaW1pdGl2ZShjaGlsZHJlbltpXSkpIGNoaWxkcmVuW2ldID0gVk5vZGUodW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgY2hpbGRyZW5baV0pO1xuICAgIH1cbiAgfVxuICBpZiAoc2VsWzBdID09PSAncycgJiYgc2VsWzFdID09PSAndicgJiYgc2VsWzJdID09PSAnZycpIHtcbiAgICBhZGROUyhkYXRhLCBjaGlsZHJlbiwgc2VsKTtcbiAgfVxuICByZXR1cm4gVk5vZGUoc2VsLCBkYXRhLCBjaGlsZHJlbiwgdGV4dCwgdW5kZWZpbmVkKTtcbn07XG4iLCJmdW5jdGlvbiB1cGRhdGVDbGFzcyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGN1ciwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkQ2xhc3MgPSBvbGRWbm9kZS5kYXRhLmNsYXNzLFxuICAgICAga2xhc3MgPSB2bm9kZS5kYXRhLmNsYXNzO1xuXG4gIGlmICghb2xkQ2xhc3MgJiYgIWtsYXNzKSByZXR1cm47XG4gIG9sZENsYXNzID0gb2xkQ2xhc3MgfHwge307XG4gIGtsYXNzID0ga2xhc3MgfHwge307XG5cbiAgZm9yIChuYW1lIGluIG9sZENsYXNzKSB7XG4gICAgaWYgKCFrbGFzc1tuYW1lXSkge1xuICAgICAgZWxtLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgfVxuICB9XG4gIGZvciAobmFtZSBpbiBrbGFzcykge1xuICAgIGN1ciA9IGtsYXNzW25hbWVdO1xuICAgIGlmIChjdXIgIT09IG9sZENsYXNzW25hbWVdKSB7XG4gICAgICBlbG0uY2xhc3NMaXN0W2N1ciA/ICdhZGQnIDogJ3JlbW92ZSddKG5hbWUpO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZUNsYXNzLCB1cGRhdGU6IHVwZGF0ZUNsYXNzfTtcbiIsImZ1bmN0aW9uIHVwZGF0ZVByb3BzKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIga2V5LCBjdXIsIG9sZCwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkUHJvcHMgPSBvbGRWbm9kZS5kYXRhLnByb3BzLCBwcm9wcyA9IHZub2RlLmRhdGEucHJvcHM7XG5cbiAgaWYgKCFvbGRQcm9wcyAmJiAhcHJvcHMpIHJldHVybjtcbiAgb2xkUHJvcHMgPSBvbGRQcm9wcyB8fCB7fTtcbiAgcHJvcHMgPSBwcm9wcyB8fCB7fTtcblxuICBmb3IgKGtleSBpbiBvbGRQcm9wcykge1xuICAgIGlmICghcHJvcHNba2V5XSkge1xuICAgICAgZGVsZXRlIGVsbVtrZXldO1xuICAgIH1cbiAgfVxuICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgIGN1ciA9IHByb3BzW2tleV07XG4gICAgb2xkID0gb2xkUHJvcHNba2V5XTtcbiAgICBpZiAob2xkICE9PSBjdXIgJiYgKGtleSAhPT0gJ3ZhbHVlJyB8fCBlbG1ba2V5XSAhPT0gY3VyKSkge1xuICAgICAgZWxtW2tleV0gPSBjdXI7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NyZWF0ZTogdXBkYXRlUHJvcHMsIHVwZGF0ZTogdXBkYXRlUHJvcHN9O1xuIiwidmFyIHJhZiA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB8fCBzZXRUaW1lb3V0O1xudmFyIG5leHRGcmFtZSA9IGZ1bmN0aW9uKGZuKSB7IHJhZihmdW5jdGlvbigpIHsgcmFmKGZuKTsgfSk7IH07XG5cbmZ1bmN0aW9uIHNldE5leHRGcmFtZShvYmosIHByb3AsIHZhbCkge1xuICBuZXh0RnJhbWUoZnVuY3Rpb24oKSB7IG9ialtwcm9wXSA9IHZhbDsgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVN0eWxlKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgY3VyLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sXG4gICAgICBvbGRTdHlsZSA9IG9sZFZub2RlLmRhdGEuc3R5bGUsXG4gICAgICBzdHlsZSA9IHZub2RlLmRhdGEuc3R5bGU7XG5cbiAgaWYgKCFvbGRTdHlsZSAmJiAhc3R5bGUpIHJldHVybjtcbiAgb2xkU3R5bGUgPSBvbGRTdHlsZSB8fCB7fTtcbiAgc3R5bGUgPSBzdHlsZSB8fCB7fTtcbiAgdmFyIG9sZEhhc0RlbCA9ICdkZWxheWVkJyBpbiBvbGRTdHlsZTtcblxuICBmb3IgKG5hbWUgaW4gb2xkU3R5bGUpIHtcbiAgICBpZiAoIXN0eWxlW25hbWVdKSB7XG4gICAgICBlbG0uc3R5bGVbbmFtZV0gPSAnJztcbiAgICB9XG4gIH1cbiAgZm9yIChuYW1lIGluIHN0eWxlKSB7XG4gICAgY3VyID0gc3R5bGVbbmFtZV07XG4gICAgaWYgKG5hbWUgPT09ICdkZWxheWVkJykge1xuICAgICAgZm9yIChuYW1lIGluIHN0eWxlLmRlbGF5ZWQpIHtcbiAgICAgICAgY3VyID0gc3R5bGUuZGVsYXllZFtuYW1lXTtcbiAgICAgICAgaWYgKCFvbGRIYXNEZWwgfHwgY3VyICE9PSBvbGRTdHlsZS5kZWxheWVkW25hbWVdKSB7XG4gICAgICAgICAgc2V0TmV4dEZyYW1lKGVsbS5zdHlsZSwgbmFtZSwgY3VyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobmFtZSAhPT0gJ3JlbW92ZScgJiYgY3VyICE9PSBvbGRTdHlsZVtuYW1lXSkge1xuICAgICAgZWxtLnN0eWxlW25hbWVdID0gY3VyO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBseURlc3Ryb3lTdHlsZSh2bm9kZSkge1xuICB2YXIgc3R5bGUsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSwgcyA9IHZub2RlLmRhdGEuc3R5bGU7XG4gIGlmICghcyB8fCAhKHN0eWxlID0gcy5kZXN0cm95KSkgcmV0dXJuO1xuICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICBlbG0uc3R5bGVbbmFtZV0gPSBzdHlsZVtuYW1lXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBseVJlbW92ZVN0eWxlKHZub2RlLCBybSkge1xuICB2YXIgcyA9IHZub2RlLmRhdGEuc3R5bGU7XG4gIGlmICghcyB8fCAhcy5yZW1vdmUpIHtcbiAgICBybSgpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbmFtZSwgZWxtID0gdm5vZGUuZWxtLCBpZHgsIGkgPSAwLCBtYXhEdXIgPSAwLFxuICAgICAgY29tcFN0eWxlLCBzdHlsZSA9IHMucmVtb3ZlLCBhbW91bnQgPSAwLCBhcHBsaWVkID0gW107XG4gIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgIGFwcGxpZWQucHVzaChuYW1lKTtcbiAgICBlbG0uc3R5bGVbbmFtZV0gPSBzdHlsZVtuYW1lXTtcbiAgfVxuICBjb21wU3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsbSk7XG4gIHZhciBwcm9wcyA9IGNvbXBTdHlsZVsndHJhbnNpdGlvbi1wcm9wZXJ0eSddLnNwbGl0KCcsICcpO1xuICBmb3IgKDsgaSA8IHByb3BzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYoYXBwbGllZC5pbmRleE9mKHByb3BzW2ldKSAhPT0gLTEpIGFtb3VudCsrO1xuICB9XG4gIGVsbS5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgZnVuY3Rpb24oZXYpIHtcbiAgICBpZiAoZXYudGFyZ2V0ID09PSBlbG0pIC0tYW1vdW50O1xuICAgIGlmIChhbW91bnQgPT09IDApIHJtKCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZVN0eWxlLCB1cGRhdGU6IHVwZGF0ZVN0eWxlLCBkZXN0cm95OiBhcHBseURlc3Ryb3lTdHlsZSwgcmVtb3ZlOiBhcHBseVJlbW92ZVN0eWxlfTtcbiIsImZ1bmN0aW9uIGludm9rZUhhbmRsZXIoaGFuZGxlciwgdm5vZGUsIGV2ZW50KSB7XG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgLy8gY2FsbCBmdW5jdGlvbiBoYW5kbGVyXG4gICAgaGFuZGxlci5jYWxsKHZub2RlLCBldmVudCwgdm5vZGUpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcIm9iamVjdFwiKSB7XG4gICAgLy8gY2FsbCBoYW5kbGVyIHdpdGggYXJndW1lbnRzXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyWzBdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIHNwZWNpYWwgY2FzZSBmb3Igc2luZ2xlIGFyZ3VtZW50IGZvciBwZXJmb3JtYW5jZVxuICAgICAgaWYgKGhhbmRsZXIubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGhhbmRsZXJbMF0uY2FsbCh2bm9kZSwgaGFuZGxlclsxXSwgZXZlbnQsIHZub2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gaGFuZGxlci5zbGljZSgxKTtcbiAgICAgICAgYXJncy5wdXNoKGV2ZW50KTtcbiAgICAgICAgYXJncy5wdXNoKHZub2RlKTtcbiAgICAgICAgaGFuZGxlclswXS5hcHBseSh2bm9kZSwgYXJncyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNhbGwgbXVsdGlwbGUgaGFuZGxlcnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGFuZGxlci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbnZva2VIYW5kbGVyKGhhbmRsZXJbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCwgdm5vZGUpIHtcbiAgdmFyIG5hbWUgPSBldmVudC50eXBlLFxuICAgICAgb24gPSB2bm9kZS5kYXRhLm9uO1xuXG4gIC8vIGNhbGwgZXZlbnQgaGFuZGxlcihzKSBpZiBleGlzdHNcbiAgaWYgKG9uICYmIG9uW25hbWVdKSB7XG4gICAgaW52b2tlSGFuZGxlcihvbltuYW1lXSwgdm5vZGUsIGV2ZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVMaXN0ZW5lcigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQpIHtcbiAgICBoYW5kbGVFdmVudChldmVudCwgaGFuZGxlci52bm9kZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlRXZlbnRMaXN0ZW5lcnMob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBvbGRPbiA9IG9sZFZub2RlLmRhdGEub24sXG4gICAgICBvbGRMaXN0ZW5lciA9IG9sZFZub2RlLmxpc3RlbmVyLFxuICAgICAgb2xkRWxtID0gb2xkVm5vZGUuZWxtLFxuICAgICAgb24gPSB2bm9kZSAmJiB2bm9kZS5kYXRhLm9uLFxuICAgICAgZWxtID0gdm5vZGUgJiYgdm5vZGUuZWxtLFxuICAgICAgbmFtZTtcblxuICAvLyBvcHRpbWl6YXRpb24gZm9yIHJldXNlZCBpbW11dGFibGUgaGFuZGxlcnNcbiAgaWYgKG9sZE9uID09PSBvbikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHJlbW92ZSBleGlzdGluZyBsaXN0ZW5lcnMgd2hpY2ggbm8gbG9uZ2VyIHVzZWRcbiAgaWYgKG9sZE9uICYmIG9sZExpc3RlbmVyKSB7XG4gICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGRlbGV0ZWQgd2UgcmVtb3ZlIGFsbCBleGlzdGluZyBsaXN0ZW5lcnMgdW5jb25kaXRpb25hbGx5XG4gICAgaWYgKCFvbikge1xuICAgICAgZm9yIChuYW1lIGluIG9sZE9uKSB7XG4gICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lciBpZiBlbGVtZW50IHdhcyBjaGFuZ2VkIG9yIGV4aXN0aW5nIGxpc3RlbmVycyByZW1vdmVkXG4gICAgICAgIG9sZEVsbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9sZExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXIgaWYgZXhpc3RpbmcgbGlzdGVuZXIgcmVtb3ZlZFxuICAgICAgICBpZiAoIW9uW25hbWVdKSB7XG4gICAgICAgICAgb2xkRWxtLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb2xkTGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGFkZCBuZXcgbGlzdGVuZXJzIHdoaWNoIGhhcyBub3QgYWxyZWFkeSBhdHRhY2hlZFxuICBpZiAob24pIHtcbiAgICAvLyByZXVzZSBleGlzdGluZyBsaXN0ZW5lciBvciBjcmVhdGUgbmV3XG4gICAgdmFyIGxpc3RlbmVyID0gdm5vZGUubGlzdGVuZXIgPSBvbGRWbm9kZS5saXN0ZW5lciB8fCBjcmVhdGVMaXN0ZW5lcigpO1xuICAgIC8vIHVwZGF0ZSB2bm9kZSBmb3IgbGlzdGVuZXJcbiAgICBsaXN0ZW5lci52bm9kZSA9IHZub2RlO1xuXG4gICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGFkZGVkIHdlIGFkZCBhbGwgbmVlZGVkIGxpc3RlbmVycyB1bmNvbmRpdGlvbmFsbHlcbiAgICBpZiAoIW9sZE9uKSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb24pIHtcbiAgICAgICAgLy8gYWRkIGxpc3RlbmVyIGlmIGVsZW1lbnQgd2FzIGNoYW5nZWQgb3IgbmV3IGxpc3RlbmVycyBhZGRlZFxuICAgICAgICBlbG0uYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb24pIHtcbiAgICAgICAgLy8gYWRkIGxpc3RlbmVyIGlmIG5ldyBsaXN0ZW5lciBhZGRlZFxuICAgICAgICBpZiAoIW9sZE9uW25hbWVdKSB7XG4gICAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlOiB1cGRhdGVFdmVudExpc3RlbmVycyxcbiAgdXBkYXRlOiB1cGRhdGVFdmVudExpc3RlbmVycyxcbiAgZGVzdHJveTogdXBkYXRlRXZlbnRMaXN0ZW5lcnNcbn07XG4iLCIvKiEgS2VmaXIuanMgdjMuNi4wXG4gKiAgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyXG4gKi9cblxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuXHQoZmFjdG9yeSgoZ2xvYmFsLktlZmlyID0gZ2xvYmFsLktlZmlyIHx8IHt9KSkpO1xufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cblx0ZnVuY3Rpb24gY3JlYXRlT2JqKHByb3RvKSB7XG5cdCAgdmFyIEYgPSBmdW5jdGlvbiAoKSB7fTtcblx0ICBGLnByb3RvdHlwZSA9IHByb3RvO1xuXHQgIHJldHVybiBuZXcgRigpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZXh0ZW5kKHRhcmdldCAvKiwgbWl4aW4xLCBtaXhpbjIuLi4qLykge1xuXHQgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBwcm9wID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZm9yIChwcm9wIGluIGFyZ3VtZW50c1tpXSkge1xuXHQgICAgICB0YXJnZXRbcHJvcF0gPSBhcmd1bWVudHNbaV1bcHJvcF07XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiB0YXJnZXQ7XG5cdH1cblxuXHRmdW5jdGlvbiBpbmhlcml0KENoaWxkLCBQYXJlbnQgLyosIG1peGluMSwgbWl4aW4yLi4uKi8pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBDaGlsZC5wcm90b3R5cGUgPSBjcmVhdGVPYmooUGFyZW50LnByb3RvdHlwZSk7XG5cdCAgQ2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2hpbGQ7XG5cdCAgZm9yIChpID0gMjsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBleHRlbmQoQ2hpbGQucHJvdG90eXBlLCBhcmd1bWVudHNbaV0pO1xuXHQgIH1cblx0ICByZXR1cm4gQ2hpbGQ7XG5cdH1cblxuXHR2YXIgTk9USElORyA9IFsnPG5vdGhpbmc+J107XG5cdHZhciBFTkQgPSAnZW5kJztcblx0dmFyIFZBTFVFID0gJ3ZhbHVlJztcblx0dmFyIEVSUk9SID0gJ2Vycm9yJztcblx0dmFyIEFOWSA9ICdhbnknO1xuXG5cdGZ1bmN0aW9uIGNvbmNhdChhLCBiKSB7XG5cdCAgdmFyIHJlc3VsdCA9IHZvaWQgMCxcblx0ICAgICAgbGVuZ3RoID0gdm9pZCAwLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBqID0gdm9pZCAwO1xuXHQgIGlmIChhLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGI7XG5cdCAgfVxuXHQgIGlmIChiLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGE7XG5cdCAgfVxuXHQgIGogPSAwO1xuXHQgIHJlc3VsdCA9IG5ldyBBcnJheShhLmxlbmd0aCArIGIubGVuZ3RoKTtcblx0ICBsZW5ndGggPSBhLmxlbmd0aDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGorKykge1xuXHQgICAgcmVzdWx0W2pdID0gYVtpXTtcblx0ICB9XG5cdCAgbGVuZ3RoID0gYi5sZW5ndGg7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBqKyspIHtcblx0ICAgIHJlc3VsdFtqXSA9IGJbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kKGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChhcnJbaV0gPT09IHZhbHVlKSB7XG5cdCAgICAgIHJldHVybiBpO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kQnlQcmVkKGFyciwgcHJlZCkge1xuXHQgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHByZWQoYXJyW2ldKSkge1xuXHQgICAgICByZXR1cm4gaTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2xvbmVBcnJheShpbnB1dCkge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2ldID0gaW5wdXRbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmUoaW5wdXQsIGluZGV4KSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gdm9pZCAwLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBqID0gdm9pZCAwO1xuXHQgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgbGVuZ3RoKSB7XG5cdCAgICBpZiAobGVuZ3RoID09PSAxKSB7XG5cdCAgICAgIHJldHVybiBbXTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGggLSAxKTtcblx0ICAgICAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICAgIGlmIChpICE9PSBpbmRleCkge1xuXHQgICAgICAgICAgcmVzdWx0W2pdID0gaW5wdXRbaV07XG5cdCAgICAgICAgICBqKys7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHJldHVybiByZXN1bHQ7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHJldHVybiBpbnB1dDtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBtYXAoaW5wdXQsIGZuKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCksXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaV0gPSBmbihpbnB1dFtpXSk7XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmb3JFYWNoKGFyciwgZm4pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGZuKGFycltpXSk7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gZmlsbEFycmF5KGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGFycltpXSA9IHZhbHVlO1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnRhaW5zKGFyciwgdmFsdWUpIHtcblx0ICByZXR1cm4gZmluZChhcnIsIHZhbHVlKSAhPT0gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBzbGlkZShjdXIsIG5leHQsIG1heCkge1xuXHQgIHZhciBsZW5ndGggPSBNYXRoLm1pbihtYXgsIGN1ci5sZW5ndGggKyAxKSxcblx0ICAgICAgb2Zmc2V0ID0gY3VyLmxlbmd0aCAtIGxlbmd0aCArIDEsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IG9mZnNldDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaSAtIG9mZnNldF0gPSBjdXJbaV07XG5cdCAgfVxuXHQgIHJlc3VsdFtsZW5ndGggLSAxXSA9IG5leHQ7XG5cdCAgcmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCBldmVudCkge1xuXHQgIGlmICh0eXBlID09PSBBTlkpIHtcblx0ICAgIGZuKGV2ZW50KTtcblx0ICB9IGVsc2UgaWYgKHR5cGUgPT09IGV2ZW50LnR5cGUpIHtcblx0ICAgIGlmICh0eXBlID09PSBWQUxVRSB8fCB0eXBlID09PSBFUlJPUikge1xuXHQgICAgICBmbihldmVudC52YWx1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBmbigpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XG5cdCAgdGhpcy5faXRlbXMgPSBbXTtcblx0ICB0aGlzLl9zcGllcyA9IFtdO1xuXHQgIHRoaXMuX2luTG9vcCA9IDA7XG5cdCAgdGhpcy5fcmVtb3ZlZEl0ZW1zID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChEaXNwYXRjaGVyLnByb3RvdHlwZSwge1xuXHQgIGFkZDogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IGNvbmNhdCh0aGlzLl9pdGVtcywgW3sgdHlwZTogdHlwZSwgZm46IGZuIH1dKTtcblx0ICAgIHJldHVybiB0aGlzLl9pdGVtcy5sZW5ndGg7XG5cdCAgfSxcblx0ICByZW1vdmU6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgdmFyIGluZGV4ID0gZmluZEJ5UHJlZCh0aGlzLl9pdGVtcywgZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgcmV0dXJuIHgudHlwZSA9PT0gdHlwZSAmJiB4LmZuID09PSBmbjtcblx0ICAgIH0pO1xuXG5cdCAgICAvLyBpZiB3ZSdyZSBjdXJyZW50bHkgaW4gYSBub3RpZmljYXRpb24gbG9vcCxcblx0ICAgIC8vIHJlbWVtYmVyIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgaWYgKHRoaXMuX2luTG9vcCAhPT0gMCAmJiBpbmRleCAhPT0gLTEpIHtcblx0ICAgICAgaWYgKHRoaXMuX3JlbW92ZWRJdGVtcyA9PT0gbnVsbCkge1xuXHQgICAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcy5wdXNoKHRoaXMuX2l0ZW1zW2luZGV4XSk7XG5cdCAgICB9XG5cblx0ICAgIHRoaXMuX2l0ZW1zID0gcmVtb3ZlKHRoaXMuX2l0ZW1zLCBpbmRleCk7XG5cdCAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgYWRkU3B5OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHRoaXMuX3NwaWVzID0gY29uY2F0KHRoaXMuX3NwaWVzLCBbZm5dKTtcblx0ICAgIHJldHVybiB0aGlzLl9zcGllcy5sZW5ndGg7XG5cdCAgfSxcblxuXG5cdCAgLy8gQmVjYXVzZSBzcGllcyBhcmUgb25seSBldmVyIGEgZnVuY3Rpb24gdGhhdCBwZXJmb3JtIGxvZ2dpbmcgYXNcblx0ICAvLyB0aGVpciBvbmx5IHNpZGUgZWZmZWN0LCB3ZSBkb24ndCBuZWVkIHRoZSBzYW1lIGNvbXBsaWNhdGVkXG5cdCAgLy8gcmVtb3ZhbCBsb2dpYyBsaWtlIGluIHJlbW92ZSgpXG5cdCAgcmVtb3ZlU3B5OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHRoaXMuX3NwaWVzID0gcmVtb3ZlKHRoaXMuX3NwaWVzLCB0aGlzLl9zcGllcy5pbmRleE9mKGZuKSk7XG5cdCAgICByZXR1cm4gdGhpcy5fc3BpZXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgZGlzcGF0Y2g6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgdGhpcy5faW5Mb29wKys7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc3BpZXMgPSB0aGlzLl9zcGllczsgdGhpcy5fc3BpZXMgIT09IG51bGwgJiYgaSA8IHNwaWVzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHNwaWVzW2ldKGV2ZW50KTtcblx0ICAgIH1cblxuXHQgICAgZm9yICh2YXIgX2kgPSAwLCBpdGVtcyA9IHRoaXMuX2l0ZW1zOyBfaSA8IGl0ZW1zLmxlbmd0aDsgX2krKykge1xuXG5cdCAgICAgIC8vIGNsZWFudXAgd2FzIGNhbGxlZFxuXHQgICAgICBpZiAodGhpcy5faXRlbXMgPT09IG51bGwpIHtcblx0ICAgICAgICBicmVhaztcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgICBpZiAodGhpcy5fcmVtb3ZlZEl0ZW1zICE9PSBudWxsICYmIGNvbnRhaW5zKHRoaXMuX3JlbW92ZWRJdGVtcywgaXRlbXNbX2ldKSkge1xuXHQgICAgICAgIGNvbnRpbnVlO1xuXHQgICAgICB9XG5cblx0ICAgICAgY2FsbFN1YnNjcmliZXIoaXRlbXNbX2ldLnR5cGUsIGl0ZW1zW19pXS5mbiwgZXZlbnQpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5faW5Mb29wLS07XG5cdCAgICBpZiAodGhpcy5faW5Mb29wID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBjbGVhbnVwOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IG51bGw7XG5cdCAgICB0aGlzLl9zcGllcyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBPYnNlcnZhYmxlKCkge1xuXHQgIHRoaXMuX2Rpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpO1xuXHQgIHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuXHQgIHRoaXMuX2FsaXZlID0gdHJ1ZTtcblx0ICB0aGlzLl9hY3RpdmF0aW5nID0gZmFsc2U7XG5cdCAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHQgIHRoaXMuX3NweUhhbmRsZXJzID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXG5cdCAgX25hbWU6ICdvYnNlcnZhYmxlJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge30sXG5cdCAgX3NldEFjdGl2ZTogZnVuY3Rpb24gKGFjdGl2ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSAhPT0gYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX2FjdGl2ZSA9IGFjdGl2ZTtcblx0ICAgICAgaWYgKGFjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSB0cnVlO1xuXHQgICAgICAgIHRoaXMuX29uQWN0aXZhdGlvbigpO1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSBmYWxzZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9vbkRlYWN0aXZhdGlvbigpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3NldEFjdGl2ZShmYWxzZSk7XG5cdCAgICB0aGlzLl9kaXNwYXRjaGVyLmNsZWFudXAoKTtcblx0ICAgIHRoaXMuX2Rpc3BhdGNoZXIgPSBudWxsO1xuXHQgICAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2VtaXQ6IGZ1bmN0aW9uICh0eXBlLCB4KSB7XG5cdCAgICBzd2l0Y2ggKHR5cGUpIHtcblx0ICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdFZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RXJyb3I6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9hbGl2ZSA9IGZhbHNlO1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRU5EIH0pO1xuXHQgICAgICB0aGlzLl9jbGVhcigpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uOiBmdW5jdGlvbiAodHlwZSwgZm4pIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmFkZCh0eXBlLCBmbik7XG5cdCAgICAgIHRoaXMuX3NldEFjdGl2ZSh0cnVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB7IHR5cGU6IEVORCB9KTtcblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgX29mZjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdmFyIGNvdW50ID0gdGhpcy5fZGlzcGF0Y2hlci5yZW1vdmUodHlwZSwgZm4pO1xuXHQgICAgICBpZiAoY291bnQgPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9zZXRBY3RpdmUoZmFsc2UpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIG9uVmFsdWU6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKFZBTFVFLCBmbik7XG5cdCAgfSxcblx0ICBvbkVycm9yOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb25FbmQ6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEVORCwgZm4pO1xuXHQgIH0sXG5cdCAgb25Bbnk6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEFOWSwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmVmFsdWU6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihWQUxVRSwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRXJyb3I6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRW5kOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoRU5ELCBmbik7XG5cdCAgfSxcblx0ICBvZmZBbnk6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihBTlksIGZuKTtcblx0ICB9LFxuXHQgIG9ic2VydmU6IGZ1bmN0aW9uIChvYnNlcnZlck9yT25WYWx1ZSwgb25FcnJvciwgb25FbmQpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cdCAgICB2YXIgY2xvc2VkID0gZmFsc2U7XG5cblx0ICAgIHZhciBvYnNlcnZlciA9ICFvYnNlcnZlck9yT25WYWx1ZSB8fCB0eXBlb2Ygb2JzZXJ2ZXJPck9uVmFsdWUgPT09ICdmdW5jdGlvbicgPyB7IHZhbHVlOiBvYnNlcnZlck9yT25WYWx1ZSwgZXJyb3I6IG9uRXJyb3IsIGVuZDogb25FbmQgfSA6IG9ic2VydmVyT3JPblZhbHVlO1xuXG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUgJiYgb2JzZXJ2ZXIudmFsdWUpIHtcblx0ICAgICAgICBvYnNlcnZlci52YWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IgJiYgb2JzZXJ2ZXIuZXJyb3IpIHtcblx0ICAgICAgICBvYnNlcnZlci5lcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIG9ic2VydmVyLmVuZCkge1xuXHQgICAgICAgIG9ic2VydmVyLmVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cblx0ICAgIHRoaXMub25BbnkoaGFuZGxlcik7XG5cblx0ICAgIHJldHVybiB7XG5cdCAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgaWYgKCFjbG9zZWQpIHtcblx0ICAgICAgICAgIF90aGlzLm9mZkFueShoYW5kbGVyKTtcblx0ICAgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgICAgfVxuXHQgICAgICB9LFxuXG5cdCAgICAgIGdldCBjbG9zZWQoKSB7XG5cdCAgICAgICAgcmV0dXJuIGNsb3NlZDtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICB9LFxuXG5cblx0ICAvLyBBIGFuZCBCIG11c3QgYmUgc3ViY2xhc3NlcyBvZiBTdHJlYW0gYW5kIFByb3BlcnR5IChvcmRlciBkb2Vzbid0IG1hdHRlcilcblx0ICBfb2ZTYW1lVHlwZTogZnVuY3Rpb24gKEEsIEIpIHtcblx0ICAgIHJldHVybiBBLnByb3RvdHlwZS5nZXRUeXBlKCkgPT09IHRoaXMuZ2V0VHlwZSgpID8gQSA6IEI7XG5cdCAgfSxcblx0ICBzZXROYW1lOiBmdW5jdGlvbiAoc291cmNlT2JzIC8qIG9wdGlvbmFsICovLCBzZWxmTmFtZSkge1xuXHQgICAgdGhpcy5fbmFtZSA9IHNlbGZOYW1lID8gc291cmNlT2JzLl9uYW1lICsgJy4nICsgc2VsZk5hbWUgOiBzb3VyY2VPYnM7XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIGxvZzogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIG5hbWUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRvU3RyaW5nKCkgOiBhcmd1bWVudHNbMF07XG5cblxuXHQgICAgdmFyIGlzQ3VycmVudCA9IHZvaWQgMDtcblx0ICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHZhciB0eXBlID0gJzwnICsgZXZlbnQudHlwZSArIChpc0N1cnJlbnQgPyAnOmN1cnJlbnQnIDogJycpICsgJz4nO1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgaWYgKCF0aGlzLl9sb2dIYW5kbGVycykge1xuXHQgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fbG9nSGFuZGxlcnMucHVzaCh7IG5hbWU6IG5hbWUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XG5cdCAgICB9XG5cblx0ICAgIGlzQ3VycmVudCA9IHRydWU7XG5cdCAgICB0aGlzLm9uQW55KGhhbmRsZXIpO1xuXHQgICAgaXNDdXJyZW50ID0gZmFsc2U7XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgb2ZmTG9nOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXG5cdCAgICBpZiAodGhpcy5fbG9nSGFuZGxlcnMpIHtcblx0ICAgICAgdmFyIGhhbmRsZXJJbmRleCA9IGZpbmRCeVByZWQodGhpcy5fbG9nSGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgICByZXR1cm4gb2JqLm5hbWUgPT09IG5hbWU7XG5cdCAgICAgIH0pO1xuXHQgICAgICBpZiAoaGFuZGxlckluZGV4ICE9PSAtMSkge1xuXHQgICAgICAgIHRoaXMub2ZmQW55KHRoaXMuX2xvZ0hhbmRsZXJzW2hhbmRsZXJJbmRleF0uaGFuZGxlcik7XG5cdCAgICAgICAgdGhpcy5fbG9nSGFuZGxlcnMuc3BsaWNlKGhhbmRsZXJJbmRleCwgMSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBzcHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICB2YXIgdHlwZSA9ICc8JyArIGV2ZW50LnR5cGUgKyAnPic7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgaWYgKCF0aGlzLl9zcHlIYW5kbGVycykge1xuXHQgICAgICAgIHRoaXMuX3NweUhhbmRsZXJzID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fc3B5SGFuZGxlcnMucHVzaCh7IG5hbWU6IG5hbWUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuYWRkU3B5KGhhbmRsZXIpO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBvZmZTcHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICBpZiAodGhpcy5fc3B5SGFuZGxlcnMpIHtcblx0ICAgICAgdmFyIGhhbmRsZXJJbmRleCA9IGZpbmRCeVByZWQodGhpcy5fc3B5SGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgICByZXR1cm4gb2JqLm5hbWUgPT09IG5hbWU7XG5cdCAgICAgIH0pO1xuXHQgICAgICBpZiAoaGFuZGxlckluZGV4ICE9PSAtMSkge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIucmVtb3ZlU3B5KHRoaXMuX3NweUhhbmRsZXJzW2hhbmRsZXJJbmRleF0uaGFuZGxlcik7XG5cdCAgICAgICAgdGhpcy5fc3B5SGFuZGxlcnMuc3BsaWNlKGhhbmRsZXJJbmRleCwgMSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH1cblx0fSk7XG5cblx0Ly8gZXh0ZW5kKCkgY2FuJ3QgaGFuZGxlIGB0b1N0cmluZ2AgaW4gSUU4XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiAnWycgKyB0aGlzLl9uYW1lICsgJ10nO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIFN0cmVhbSgpIHtcblx0ICBPYnNlcnZhYmxlLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFN0cmVhbSwgT2JzZXJ2YWJsZSwge1xuXG5cdCAgX25hbWU6ICdzdHJlYW0nLFxuXG5cdCAgZ2V0VHlwZTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuICdzdHJlYW0nO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gUHJvcGVydHkoKSB7XG5cdCAgT2JzZXJ2YWJsZS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFByb3BlcnR5LCBPYnNlcnZhYmxlLCB7XG5cblx0ICBfbmFtZTogJ3Byb3BlcnR5JyxcblxuXHQgIF9lbWl0VmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9O1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFcnJvcjogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH07XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdEVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlID0gZmFsc2U7XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFTkQgfSk7XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fY2xlYXIoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5hZGQodHlwZSwgZm4pO1xuXHQgICAgICB0aGlzLl9zZXRBY3RpdmUodHJ1ZSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ICE9PSBudWxsKSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB0aGlzLl9jdXJyZW50RXZlbnQpO1xuXHQgICAgfVxuXHQgICAgaWYgKCF0aGlzLl9hbGl2ZSkge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgeyB0eXBlOiBFTkQgfSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiAncHJvcGVydHknO1xuXHQgIH1cblx0fSk7XG5cblx0dmFyIG5ldmVyUyA9IG5ldyBTdHJlYW0oKTtcblx0bmV2ZXJTLl9lbWl0RW5kKCk7XG5cdG5ldmVyUy5fbmFtZSA9ICduZXZlcic7XG5cblx0ZnVuY3Rpb24gbmV2ZXIoKSB7XG5cdCAgcmV0dXJuIG5ldmVyUztcblx0fVxuXG5cdGZ1bmN0aW9uIHRpbWVCYXNlZChtaXhpbikge1xuXG5cdCAgZnVuY3Rpb24gQW5vbnltb3VzU3RyZWFtKHdhaXQsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fb25UaWNrKCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpbmhlcml0KEFub255bW91c1N0cmVhbSwgU3RyZWFtLCB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblx0ICB9LCBtaXhpbik7XG5cblx0ICByZXR1cm4gQW5vbnltb3VzU3RyZWFtO1xuXHR9XG5cblx0dmFyIFMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdsYXRlcicsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB4ID0gX3JlZi54O1xuXG5cdCAgICB0aGlzLl94ID0geDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94ID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94KTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGxhdGVyKHdhaXQsIHgpIHtcblx0ICByZXR1cm4gbmV3IFMod2FpdCwgeyB4OiB4IH0pO1xuXHR9XG5cblx0dmFyIFMkMSA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2ludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIHggPSBfcmVmLng7XG5cblx0ICAgIHRoaXMuX3ggPSB4O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3ggPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3gpO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gaW50ZXJ2YWwod2FpdCwgeCkge1xuXHQgIHJldHVybiBuZXcgUyQxKHdhaXQsIHsgeDogeCB9KTtcblx0fVxuXG5cdHZhciBTJDIgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdzZXF1ZW50aWFsbHknLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgeHMgPSBfcmVmLnhzO1xuXG5cdCAgICB0aGlzLl94cyA9IGNsb25lQXJyYXkoeHMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hzID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl94cy5sZW5ndGggPT09IDEpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzWzBdKTtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzLnNoaWZ0KCkpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc2VxdWVudGlhbGx5KHdhaXQsIHhzKSB7XG5cdCAgcmV0dXJuIHhzLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgUyQyKHdhaXQsIHsgeHM6IHhzIH0pO1xuXHR9XG5cblx0dmFyIFMkMyA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2Zyb21Qb2xsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbigpKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGZyb21Qb2xsKHdhaXQsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDMod2FpdCwgeyBmbjogZm4gfSk7XG5cdH1cblxuXHRmdW5jdGlvbiBlbWl0dGVyKG9icykge1xuXG5cdCAgZnVuY3Rpb24gdmFsdWUoeCkge1xuXHQgICAgb2JzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXJyb3IoeCkge1xuXHQgICAgb2JzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZW5kKCkge1xuXHQgICAgb2JzLl9lbWl0RW5kKCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXZlbnQoZSkge1xuXHQgICAgb2JzLl9lbWl0KGUudHlwZSwgZS52YWx1ZSk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIHtcblx0ICAgIHZhbHVlOiB2YWx1ZSxcblx0ICAgIGVycm9yOiBlcnJvcixcblx0ICAgIGVuZDogZW5kLFxuXHQgICAgZXZlbnQ6IGV2ZW50LFxuXG5cdCAgICAvLyBsZWdhY3lcblx0ICAgIGVtaXQ6IHZhbHVlLFxuXHQgICAgZW1pdEV2ZW50OiBldmVudFxuXHQgIH07XG5cdH1cblxuXHR2YXIgUyQ0ID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnd2l0aEludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBlbWl0dGVyKHRoaXMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBmbih0aGlzLl9lbWl0dGVyKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHdpdGhJbnRlcnZhbCh3YWl0LCBmbikge1xuXHQgIHJldHVybiBuZXcgUyQ0KHdhaXQsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gUyQ1KGZuKSB7XG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fZm4gPSBmbjtcblx0ICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFMkNSwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ3N0cmVhbScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciB1bnN1YnNjcmliZSA9IGZuKGVtaXR0ZXIodGhpcykpO1xuXHQgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSB0eXBlb2YgdW5zdWJzY3JpYmUgPT09ICdmdW5jdGlvbicgPyB1bnN1YnNjcmliZSA6IG51bGw7XG5cblx0ICAgIC8vIGZpeCBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzM1XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9jYWxsVW5zdWJzY3JpYmUoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jYWxsVW5zdWJzY3JpYmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl91bnN1YnNjcmliZSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSgpO1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2NhbGxVbnN1YnNjcmliZSgpO1xuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc3RyZWFtKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDUoZm4pO1xuXHR9XG5cblx0ZnVuY3Rpb24gZnJvbUNhbGxiYWNrKGNhbGxiYWNrQ29uc3VtZXIpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgY2FsbGJhY2tDb25zdW1lcihmdW5jdGlvbiAoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9KTtcblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tQ2FsbGJhY2snKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21Ob2RlQ2FsbGJhY2soY2FsbGJhY2tDb25zdW1lcikge1xuXG5cdCAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuXG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICBjYWxsYmFja0NvbnN1bWVyKGZ1bmN0aW9uIChlcnJvciwgeCkge1xuXHQgICAgICAgIGlmIChlcnJvcikge1xuXHQgICAgICAgICAgZW1pdHRlci5lcnJvcihlcnJvcik7XG5cdCAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICB9XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbU5vZGVDYWxsYmFjaycpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc3ByZWFkKGZuLCBsZW5ndGgpIHtcblx0ICBzd2l0Y2ggKGxlbmd0aCkge1xuXHQgICAgY2FzZSAwOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIHJldHVybiBmbigpO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAxOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDI6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMzpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSA0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG5cdCAgICAgIH07XG5cdCAgICBkZWZhdWx0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICAgIH07XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwbHkoZm4sIGMsIGEpIHtcblx0ICB2YXIgYUxlbmd0aCA9IGEgPyBhLmxlbmd0aCA6IDA7XG5cdCAgaWYgKGMgPT0gbnVsbCkge1xuXHQgICAgc3dpdGNoIChhTGVuZ3RoKSB7XG5cdCAgICAgIGNhc2UgMDpcblx0ICAgICAgICByZXR1cm4gZm4oKTtcblx0ICAgICAgY2FzZSAxOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdKTtcblx0ICAgICAgY2FzZSAyOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgY2FzZSAzOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdKTtcblx0ICAgICAgY2FzZSA0OlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdLCBhWzNdKTtcblx0ICAgICAgZGVmYXVsdDpcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHN3aXRjaCAoYUxlbmd0aCkge1xuXHQgICAgICBjYXNlIDA6XG5cdCAgICAgICAgcmV0dXJuIGZuLmNhbGwoYyk7XG5cdCAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KGMsIGEpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21TdWJVbnN1YihzdWIsIHVuc3ViLCB0cmFuc2Zvcm1lciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSB0cmFuc2Zvcm1lciA/IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgZW1pdHRlci5lbWl0KGFwcGx5KHRyYW5zZm9ybWVyLCB0aGlzLCBhcmd1bWVudHMpKTtcblx0ICAgIH0gOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICB9O1xuXG5cdCAgICBzdWIoaGFuZGxlcik7XG5cdCAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gdW5zdWIoaGFuZGxlcik7XG5cdCAgICB9O1xuXHQgIH0pLnNldE5hbWUoJ2Zyb21TdWJVbnN1YicpO1xuXHR9XG5cblx0dmFyIHBhaXJzID0gW1snYWRkRXZlbnRMaXN0ZW5lcicsICdyZW1vdmVFdmVudExpc3RlbmVyJ10sIFsnYWRkTGlzdGVuZXInLCAncmVtb3ZlTGlzdGVuZXInXSwgWydvbicsICdvZmYnXV07XG5cblx0ZnVuY3Rpb24gZnJvbUV2ZW50cyh0YXJnZXQsIGV2ZW50TmFtZSwgdHJhbnNmb3JtZXIpIHtcblx0ICB2YXIgc3ViID0gdm9pZCAwLFxuXHQgICAgICB1bnN1YiA9IHZvaWQgMDtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzBdXSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzFdXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgICBzdWIgPSBwYWlyc1tpXVswXTtcblx0ICAgICAgdW5zdWIgPSBwYWlyc1tpXVsxXTtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9XG5cdCAgfVxuXG5cdCAgaWYgKHN1YiA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ3RhcmdldCBkb25cXCd0IHN1cHBvcnQgYW55IG9mICcgKyAnYWRkRXZlbnRMaXN0ZW5lci9yZW1vdmVFdmVudExpc3RlbmVyLCBhZGRMaXN0ZW5lci9yZW1vdmVMaXN0ZW5lciwgb24vb2ZmIG1ldGhvZCBwYWlyJyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIGZyb21TdWJVbnN1YihmdW5jdGlvbiAoaGFuZGxlcikge1xuXHQgICAgcmV0dXJuIHRhcmdldFtzdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcblx0ICAgIHJldHVybiB0YXJnZXRbdW5zdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgdHJhbnNmb3JtZXIpLnNldE5hbWUoJ2Zyb21FdmVudHMnKTtcblx0fVxuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQKHZhbHVlKSB7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiAndmFsdWUnLCB2YWx1ZTogdmFsdWUsIGN1cnJlbnQ6IHRydWUgfTtcblx0fVxuXG5cdGluaGVyaXQoUCwgUHJvcGVydHksIHtcblx0ICBfbmFtZTogJ2NvbnN0YW50Jyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0ZnVuY3Rpb24gY29uc3RhbnQoeCkge1xuXHQgIHJldHVybiBuZXcgUCh4KTtcblx0fVxuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQJDEodmFsdWUpIHtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6ICdlcnJvcicsIHZhbHVlOiB2YWx1ZSwgY3VycmVudDogdHJ1ZSB9O1xuXHR9XG5cblx0aW5oZXJpdChQJDEsIFByb3BlcnR5LCB7XG5cdCAgX25hbWU6ICdjb25zdGFudEVycm9yJyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0ZnVuY3Rpb24gY29uc3RhbnRFcnJvcih4KSB7XG5cdCAgcmV0dXJuIG5ldyBQJDEoeCk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb25zdHJ1Y3RvcihCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShzb3VyY2UsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgICAgdGhpcy5fbmFtZSA9IHNvdXJjZS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9pbml0KG9wdGlvbnMpO1xuXHQgICAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDbGFzc01ldGhvZHMoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblx0ICAgIF9pbml0OiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZUVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVORDpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfSxcblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblx0ICAgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBCYXNlQ2xhc3MucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTdHJlYW0obmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUyA9IGNyZWF0ZUNvbnN0cnVjdG9yKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyhTdHJlYW0pLCBtaXhpbik7XG5cdCAgcmV0dXJuIFM7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVQcm9wZXJ0eShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBQID0gY3JlYXRlQ29uc3RydWN0b3IoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyhQcm9wZXJ0eSksIG1peGluKTtcblx0ICByZXR1cm4gUDtcblx0fVxuXG5cdHZhciBQJDIgPSBjcmVhdGVQcm9wZXJ0eSgndG9Qcm9wZXJ0eScsIHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2dldEluaXRpYWxDdXJyZW50ID0gZm47XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQgIT09IG51bGwpIHtcblx0ICAgICAgdmFyIGdldEluaXRpYWwgPSB0aGlzLl9nZXRJbml0aWFsQ3VycmVudDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGdldEluaXRpYWwoKSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHRvUHJvcGVydHkob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIGlmIChmbiAhPT0gbnVsbCAmJiB0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHRocm93IG5ldyBFcnJvcignWW91IHNob3VsZCBjYWxsIHRvUHJvcGVydHkoKSB3aXRoIGEgZnVuY3Rpb24gb3Igbm8gYXJndW1lbnRzLicpO1xuXHQgIH1cblx0ICByZXR1cm4gbmV3IFAkMihvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIFMkNiA9IGNyZWF0ZVN0cmVhbSgnY2hhbmdlcycsIHtcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNoYW5nZXMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDYob2JzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21Qcm9taXNlKHByb21pc2UpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHZhciByZXN1bHQgPSBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIHZhciBvblZhbHVlID0gZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIG9uRXJyb3IgPSBmdW5jdGlvbiAoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZXJyb3IoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIF9wcm9taXNlID0gcHJvbWlzZS50aGVuKG9uVmFsdWUsIG9uRXJyb3IpO1xuXG5cdCAgICAgIC8vIHByZXZlbnQgbGlicmFyaWVzIGxpa2UgJ1EnIG9yICd3aGVuJyBmcm9tIHN3YWxsb3dpbmcgZXhjZXB0aW9uc1xuXHQgICAgICBpZiAoX3Byb21pc2UgJiYgdHlwZW9mIF9wcm9taXNlLmRvbmUgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgICAgICBfcHJvbWlzZS5kb25lKCk7XG5cdCAgICAgIH1cblxuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pO1xuXG5cdCAgcmV0dXJuIHRvUHJvcGVydHkocmVzdWx0LCBudWxsKS5zZXROYW1lKCdmcm9tUHJvbWlzZScpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0R2xvZGFsUHJvbWlzZSgpIHtcblx0ICBpZiAodHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHJldHVybiBQcm9taXNlO1xuXHQgIH0gZWxzZSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzblxcJ3QgZGVmYXVsdCBQcm9taXNlLCB1c2Ugc2hpbSBvciBwYXJhbWV0ZXInKTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiB0b1Byb21pc2UgKG9icykge1xuXHQgIHZhciBQcm9taXNlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZ2V0R2xvZGFsUHJvbWlzZSgpIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgdmFyIGxhc3QgPSBudWxsO1xuXHQgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICBvYnMub25BbnkoZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQgJiYgbGFzdCAhPT0gbnVsbCkge1xuXHQgICAgICAgIChsYXN0LnR5cGUgPT09IFZBTFVFID8gcmVzb2x2ZSA6IHJlamVjdCkobGFzdC52YWx1ZSk7XG5cdCAgICAgICAgbGFzdCA9IG51bGw7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgbGFzdCA9IGV2ZW50O1xuXHQgICAgICB9XG5cdCAgICB9KTtcblx0ICB9KTtcblx0fVxuXG5cdHZhciBjb21tb25qc0dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDoge31cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21tb25qc01vZHVsZShmbiwgbW9kdWxlKSB7XG5cdFx0cmV0dXJuIG1vZHVsZSA9IHsgZXhwb3J0czoge30gfSwgZm4obW9kdWxlLCBtb2R1bGUuZXhwb3J0cyksIG1vZHVsZS5leHBvcnRzO1xuXHR9XG5cblx0dmFyIHBvbnlmaWxsID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdFx0dmFsdWU6IHRydWVcblx0fSk7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IHN5bWJvbE9ic2VydmFibGVQb255ZmlsbDtcblx0ZnVuY3Rpb24gc3ltYm9sT2JzZXJ2YWJsZVBvbnlmaWxsKHJvb3QpIHtcblx0XHR2YXIgcmVzdWx0O1xuXHRcdHZhciBfU3ltYm9sID0gcm9vdC5TeW1ib2w7XG5cblx0XHRpZiAodHlwZW9mIF9TeW1ib2wgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdGlmIChfU3ltYm9sLm9ic2VydmFibGUpIHtcblx0XHRcdFx0cmVzdWx0ID0gX1N5bWJvbC5vYnNlcnZhYmxlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVzdWx0ID0gX1N5bWJvbCgnb2JzZXJ2YWJsZScpO1xuXHRcdFx0XHRfU3ltYm9sLm9ic2VydmFibGUgPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCA9ICdAQG9ic2VydmFibGUnO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH07XG5cdH0pO1xuXG5cdHZhciByZXF1aXJlJCQwJDEgPSAocG9ueWZpbGwgJiYgdHlwZW9mIHBvbnlmaWxsID09PSAnb2JqZWN0JyAmJiAnZGVmYXVsdCcgaW4gcG9ueWZpbGwgPyBwb255ZmlsbFsnZGVmYXVsdCddIDogcG9ueWZpbGwpO1xuXG5cdHZhciBpbmRleCQxID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdFx0dmFsdWU6IHRydWVcblx0fSk7XG5cblx0dmFyIF9wb255ZmlsbCA9IHJlcXVpcmUkJDAkMTtcblxuXHR2YXIgX3BvbnlmaWxsMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3BvbnlmaWxsKTtcblxuXHRmdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikge1xuXHRcdHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07XG5cdH1cblxuXHR2YXIgcm9vdCA9IHVuZGVmaW5lZDsgLyogZ2xvYmFsIHdpbmRvdyAqL1xuXG5cdGlmICh0eXBlb2YgY29tbW9uanNHbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0cm9vdCA9IGNvbW1vbmpzR2xvYmFsO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0cm9vdCA9IHdpbmRvdztcblx0fVxuXG5cdHZhciByZXN1bHQgPSAoMCwgX3BvbnlmaWxsMlsnZGVmYXVsdCddKShyb290KTtcblx0ZXhwb3J0c1snZGVmYXVsdCddID0gcmVzdWx0O1xuXHR9KTtcblxuXHR2YXIgcmVxdWlyZSQkMCA9IChpbmRleCQxICYmIHR5cGVvZiBpbmRleCQxID09PSAnb2JqZWN0JyAmJiAnZGVmYXVsdCcgaW4gaW5kZXgkMSA/IGluZGV4JDFbJ2RlZmF1bHQnXSA6IGluZGV4JDEpO1xuXG5cdHZhciBpbmRleCA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUpIHtcblx0bW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlJCQwO1xuXHR9KTtcblxuXHR2YXIgJCRvYnNlcnZhYmxlID0gKGluZGV4ICYmIHR5cGVvZiBpbmRleCA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIGluZGV4ID8gaW5kZXhbJ2RlZmF1bHQnXSA6IGluZGV4KTtcblxuXHRmdW5jdGlvbiBmcm9tRVNPYnNlcnZhYmxlKF9vYnNlcnZhYmxlKSB7XG5cdCAgdmFyIG9ic2VydmFibGUgPSBfb2JzZXJ2YWJsZVskJG9ic2VydmFibGVdID8gX29ic2VydmFibGVbJCRvYnNlcnZhYmxlXSgpIDogX29ic2VydmFibGU7XG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXHQgICAgdmFyIHVuc3ViID0gb2JzZXJ2YWJsZS5zdWJzY3JpYmUoe1xuXHQgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG5cdCAgICAgICAgZW1pdHRlci5lcnJvcihlcnJvcik7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSxcblx0ICAgICAgbmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHZhbHVlKTtcblx0ICAgICAgfSxcblx0ICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9KTtcblxuXHQgICAgaWYgKHVuc3ViLnVuc3Vic2NyaWJlKSB7XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgdW5zdWIudW5zdWJzY3JpYmUoKTtcblx0ICAgICAgfTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJldHVybiB1bnN1Yjtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tRVNPYnNlcnZhYmxlJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBFU09ic2VydmFibGUob2JzZXJ2YWJsZSkge1xuXHQgIHRoaXMuX29ic2VydmFibGUgPSBvYnNlcnZhYmxlLnRha2VFcnJvcnMoMSk7XG5cdH1cblxuXHRleHRlbmQoRVNPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXHQgIHN1YnNjcmliZTogZnVuY3Rpb24gKG9ic2VydmVyT3JPbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGUpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciBvYnNlcnZlciA9IHR5cGVvZiBvYnNlcnZlck9yT25OZXh0ID09PSAnZnVuY3Rpb24nID8geyBuZXh0OiBvYnNlcnZlck9yT25OZXh0LCBlcnJvcjogb25FcnJvciwgY29tcGxldGU6IG9uQ29tcGxldGUgfSA6IG9ic2VydmVyT3JPbk5leHQ7XG5cblx0ICAgIHZhciBmbiA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSAmJiBvYnNlcnZlci5uZXh0KSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIubmV4dChldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IgJiYgb2JzZXJ2ZXIuZXJyb3IpIHtcblx0ICAgICAgICBvYnNlcnZlci5lcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIG9ic2VydmVyLmNvbXBsZXRlKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICB0aGlzLl9vYnNlcnZhYmxlLm9uQW55KGZuKTtcblx0ICAgIHZhciBjbG9zZWQgPSBmYWxzZTtcblxuXHQgICAgdmFyIHN1YnNjcmlwdGlvbiA9IHtcblx0ICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICBjbG9zZWQgPSB0cnVlO1xuXHQgICAgICAgIF90aGlzLl9vYnNlcnZhYmxlLm9mZkFueShmbik7XG5cdCAgICAgIH0sXG5cdCAgICAgIGdldCBjbG9zZWQoKSB7XG5cdCAgICAgICAgcmV0dXJuIGNsb3NlZDtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICAgIHJldHVybiBzdWJzY3JpcHRpb247XG5cdCAgfVxuXHR9KTtcblxuXHQvLyBOZWVkIHRvIGFzc2lnbiBkaXJlY3RseSBiL2MgU3ltYm9scyBhcmVuJ3QgZW51bWVyYWJsZS5cblx0RVNPYnNlcnZhYmxlLnByb3RvdHlwZVskJG9ic2VydmFibGVdID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHRvRVNPYnNlcnZhYmxlKCkge1xuXHQgIHJldHVybiBuZXcgRVNPYnNlcnZhYmxlKHRoaXMpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IoZXJyb3JzKSB7XG5cdCAgdmFyIGxhdGVzdEVycm9yID0gdm9pZCAwO1xuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgZXJyb3JzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAoZXJyb3JzW2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgaWYgKGxhdGVzdEVycm9yID09PSB1bmRlZmluZWQgfHwgbGF0ZXN0RXJyb3IuaW5kZXggPCBlcnJvcnNbaV0uaW5kZXgpIHtcblx0ICAgICAgICBsYXRlc3RFcnJvciA9IGVycm9yc1tpXTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gbGF0ZXN0RXJyb3IuZXJyb3I7XG5cdH1cblxuXHRmdW5jdGlvbiBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9hY3RpdmVDb3VudCA9IGFjdGl2ZS5sZW5ndGg7XG5cdCAgdGhpcy5fc291cmNlcyA9IGNvbmNhdChhY3RpdmUsIHBhc3NpdmUpO1xuXHQgIHRoaXMuX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gc3ByZWFkKGNvbWJpbmF0b3IsIHRoaXMuX3NvdXJjZXMubGVuZ3RoKSA6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICByZXR1cm4geDtcblx0ICB9O1xuXHQgIHRoaXMuX2FsaXZlQ291bnQgPSAwO1xuXHQgIHRoaXMuX2xhdGVzdFZhbHVlcyA9IG5ldyBBcnJheSh0aGlzLl9zb3VyY2VzLmxlbmd0aCk7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbmV3IEFycmF5KHRoaXMuX3NvdXJjZXMubGVuZ3RoKTtcblx0ICBmaWxsQXJyYXkodGhpcy5fbGF0ZXN0VmFsdWVzLCBOT1RISU5HKTtcblx0ICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JJbmRleCA9IDA7XG5cblx0ICB0aGlzLl8kaGFuZGxlcnMgPSBbXTtcblxuXHQgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIChpKSB7XG5cdCAgICBfdGhpcy5fJGhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGksIGV2ZW50KTtcblx0ICAgIH0pO1xuXHQgIH07XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIF9sb29wKGkpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQ29tYmluZSwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ2NvbWJpbmUnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYWxpdmVDb3VudCA9IHRoaXMuX2FjdGl2ZUNvdW50O1xuXG5cdCAgICAvLyB3ZSBuZWVkIHRvIHN1c2NyaWJlIHRvIF9wYXNzaXZlXyBzb3VyY2VzIGJlZm9yZSBfYWN0aXZlX1xuXHQgICAgLy8gKHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzk4KVxuXHQgICAgZm9yICh2YXIgaSA9IHRoaXMuX2FjdGl2ZUNvdW50OyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgdGhpcy5fYWN0aXZlQ291bnQ7IF9pKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tfaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW19pXSk7XG5cdCAgICB9XG5cblx0ICAgIGlmICh0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSBmYWxzZTtcblx0ICAgICAgdGhpcy5fZW1pdElmRnVsbCgpO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbikge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBsZW5ndGggPSB0aGlzLl9zb3VyY2VzLmxlbmd0aCxcblx0ICAgICAgICBpID0gdm9pZCAwO1xuXHQgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub2ZmQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdElmRnVsbDogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGhhc0FsbFZhbHVlcyA9IHRydWU7XG5cdCAgICB2YXIgaGFzRXJyb3JzID0gZmFsc2U7XG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fbGF0ZXN0VmFsdWVzLmxlbmd0aDtcblx0ICAgIHZhciB2YWx1ZXNDb3B5ID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cdCAgICB2YXIgZXJyb3JzQ29weSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHZhbHVlc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RWYWx1ZXNbaV07XG5cdCAgICAgIGVycm9yc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RFcnJvcnNbaV07XG5cblx0ICAgICAgaWYgKHZhbHVlc0NvcHlbaV0gPT09IE5PVEhJTkcpIHtcblx0ICAgICAgICBoYXNBbGxWYWx1ZXMgPSBmYWxzZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChlcnJvcnNDb3B5W2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgICBoYXNFcnJvcnMgPSB0cnVlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIGlmIChoYXNBbGxWYWx1ZXMpIHtcblx0ICAgICAgdmFyIGNvbWJpbmF0b3IgPSB0aGlzLl9jb21iaW5hdG9yO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXNDb3B5KSk7XG5cdCAgICB9XG5cdCAgICBpZiAoaGFzRXJyb3JzKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihkZWZhdWx0RXJyb3JzQ29tYmluYXRvcihlcnJvcnNDb3B5KSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoaSwgZXZlbnQpIHtcblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFIHx8IGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0VmFsdWVzW2ldID0gZXZlbnQudmFsdWU7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0gdW5kZWZpbmVkO1xuXHQgICAgICB9XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdFZhbHVlc1tpXSA9IE5PVEhJTkc7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0ge1xuXHQgICAgICAgICAgaW5kZXg6IHRoaXMuX2xhdGVzdEVycm9ySW5kZXgrKyxcblx0ICAgICAgICAgIGVycm9yOiBldmVudC52YWx1ZVxuXHQgICAgICAgIH07XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0SWZGdWxsKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICAvLyBFTkRcblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICAgIGlmICh0aGlzLl9hbGl2ZUNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgICAgICB0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICAgICAgfVxuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXRlc3RWYWx1ZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbWJpbmUoYWN0aXZlKSB7XG5cdCAgdmFyIHBhc3NpdmUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBbXSA6IGFyZ3VtZW50c1sxXTtcblx0ICB2YXIgY29tYmluYXRvciA9IGFyZ3VtZW50c1syXTtcblxuXHQgIGlmICh0eXBlb2YgcGFzc2l2ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgY29tYmluYXRvciA9IHBhc3NpdmU7XG5cdCAgICBwYXNzaXZlID0gW107XG5cdCAgfVxuXHQgIHJldHVybiBhY3RpdmUubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcik7XG5cdH1cblxuXHR2YXIgT2JzZXJ2YWJsZSQxID0ge1xuXHQgIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gbmV2ZXIoKTtcblx0ICB9LFxuXG5cblx0ICAvLyBNb25vaWQgYmFzZWQgb24gbWVyZ2UoKSBzZWVtcyBtb3JlIHVzZWZ1bCB0aGFuIG9uZSBiYXNlZCBvbiBjb25jYXQoKS5cblx0ICBjb25jYXQ6IGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gYS5tZXJnZShiKTtcblx0ICB9LFxuXHQgIG9mOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIGNvbnN0YW50KHgpO1xuXHQgIH0sXG5cdCAgbWFwOiBmdW5jdGlvbiAoZm4sIG9icykge1xuXHQgICAgcmV0dXJuIG9icy5tYXAoZm4pO1xuXHQgIH0sXG5cdCAgYmltYXA6IGZ1bmN0aW9uIChmbkVyciwgZm5WYWwsIG9icykge1xuXHQgICAgcmV0dXJuIG9icy5tYXBFcnJvcnMoZm5FcnIpLm1hcChmblZhbCk7XG5cdCAgfSxcblxuXG5cdCAgLy8gVGhpcyBhcCBzdHJpY3RseSBzcGVha2luZyBpbmNvbXBhdGlibGUgd2l0aCBjaGFpbi4gSWYgd2UgZGVyaXZlIGFwIGZyb20gY2hhaW4gd2UgZ2V0XG5cdCAgLy8gZGlmZmVyZW50IChub3QgdmVyeSB1c2VmdWwpIGJlaGF2aW9yLiBCdXQgc3BlYyByZXF1aXJlcyB0aGF0IGlmIG1ldGhvZCBjYW4gYmUgZGVyaXZlZFxuXHQgIC8vIGl0IG11c3QgaGF2ZSB0aGUgc2FtZSBiZWhhdmlvciBhcyBoYW5kLXdyaXR0ZW4gbWV0aG9kLiBXZSBpbnRlbnRpb25hbGx5IHZpb2xhdGUgdGhlIHNwZWNcblx0ICAvLyBpbiBob3BlIHRoYXQgaXQgd29uJ3QgY2F1c2UgbWFueSB0cm91YmxlcyBpbiBwcmFjdGljZS4gQW5kIGluIHJldHVybiB3ZSBoYXZlIG1vcmUgdXNlZnVsIHR5cGUuXG5cdCAgYXA6IGZ1bmN0aW9uIChvYnNGbiwgb2JzVmFsKSB7XG5cdCAgICByZXR1cm4gY29tYmluZShbb2JzRm4sIG9ic1ZhbF0sIGZ1bmN0aW9uIChmbiwgdmFsKSB7XG5cdCAgICAgIHJldHVybiBmbih2YWwpO1xuXHQgICAgfSk7XG5cdCAgfSxcblx0ICBjaGFpbjogZnVuY3Rpb24gKGZuLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMuZmxhdE1hcChmbik7XG5cdCAgfVxuXHR9O1xuXG5cblxuXHR2YXIgc3RhdGljTGFuZCA9IE9iamVjdC5mcmVlemUoe1xuXHQgIE9ic2VydmFibGU6IE9ic2VydmFibGUkMVxuXHR9KTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHgpKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNyA9IGNyZWF0ZVN0cmVhbSgnbWFwJywgbWl4aW4pO1xuXHR2YXIgUCQzID0gY3JlYXRlUHJvcGVydHkoJ21hcCcsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIG1hcCQxKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkNywgUCQzKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDggPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlcicsIG1peGluJDEpO1xuXHR2YXIgUCQ0ID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlcicsIG1peGluJDEpO1xuXG5cdHZhciBpZCQxID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmaWx0ZXIob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkMSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDgsIFAkNCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ5ID0gY3JlYXRlU3RyZWFtKCd0YWtlJywgbWl4aW4kMik7XG5cdHZhciBQJDUgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZScsIG1peGluJDIpO1xuXG5cdGZ1bmN0aW9uIHRha2Uob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkOSwgUCQ1KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxMCA9IGNyZWF0ZVN0cmVhbSgndGFrZUVycm9ycycsIG1peGluJDMpO1xuXHR2YXIgUCQ2ID0gY3JlYXRlUHJvcGVydHkoJ3Rha2VFcnJvcnMnLCBtaXhpbiQzKTtcblxuXHRmdW5jdGlvbiB0YWtlRXJyb3JzKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDEwLCBQJDYpKShvYnMsIHsgbjogbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ0ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDExID0gY3JlYXRlU3RyZWFtKCd0YWtlV2hpbGUnLCBtaXhpbiQ0KTtcblx0dmFyIFAkNyA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlV2hpbGUnLCBtaXhpbiQ0KTtcblxuXHR2YXIgaWQkMiA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gdGFrZVdoaWxlKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDIgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMSwgUCQ3KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSBOT1RISU5HO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2xhc3RWYWx1ZSA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSB4O1xuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RWYWx1ZSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fbGFzdFZhbHVlKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTIgPSBjcmVhdGVTdHJlYW0oJ2xhc3QnLCBtaXhpbiQ1KTtcblx0dmFyIFAkOCA9IGNyZWF0ZVByb3BlcnR5KCdsYXN0JywgbWl4aW4kNSk7XG5cblx0ZnVuY3Rpb24gbGFzdChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMiwgUCQ4KSkob2JzKTtcblx0fVxuXG5cdHZhciBtaXhpbiQ2ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIG4gPSBfcmVmLm47XG5cblx0ICAgIHRoaXMuX24gPSBNYXRoLm1heCgwLCBuKTtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX24tLTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTMgPSBjcmVhdGVTdHJlYW0oJ3NraXAnLCBtaXhpbiQ2KTtcblx0dmFyIFAkOSA9IGNyZWF0ZVByb3BlcnR5KCdza2lwJywgbWl4aW4kNik7XG5cblx0ZnVuY3Rpb24gc2tpcChvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMywgUCQ5KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fZm4gIT09IG51bGwgJiYgIWZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9mbiA9PT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE0ID0gY3JlYXRlU3RyZWFtKCdza2lwV2hpbGUnLCBtaXhpbiQ3KTtcblx0dmFyIFAkMTAgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcFdoaWxlJywgbWl4aW4kNyk7XG5cblx0dmFyIGlkJDMgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNraXBXaGlsZShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQzIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTQsIFAkMTApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDggPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fcHJldiA9IE5PVEhJTkc7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgICAgdGhpcy5fcHJldiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICh0aGlzLl9wcmV2ID09PSBOT1RISU5HIHx8ICFmbih0aGlzLl9wcmV2LCB4KSkge1xuXHQgICAgICB0aGlzLl9wcmV2ID0geDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNSA9IGNyZWF0ZVN0cmVhbSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbiQ4KTtcblx0dmFyIFAkMTEgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbiQ4KTtcblxuXHR2YXIgZXEgPSBmdW5jdGlvbiAoYSwgYikge1xuXHQgIHJldHVybiBhID09PSBiO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNraXBEdXBsaWNhdGVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGVxIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTUsIFAkMTEpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIHNlZWQgPSBfcmVmLnNlZWQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9wcmV2ID0gc2VlZDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9wcmV2ID0gbnVsbDtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9wcmV2ICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fcHJldiwgeCkpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fcHJldiA9IHg7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE2ID0gY3JlYXRlU3RyZWFtKCdkaWZmJywgbWl4aW4kOSk7XG5cdHZhciBQJDEyID0gY3JlYXRlUHJvcGVydHkoJ2RpZmYnLCBtaXhpbiQ5KTtcblxuXHRmdW5jdGlvbiBkZWZhdWx0Rm4oYSwgYikge1xuXHQgIHJldHVybiBbYSwgYl07XG5cdH1cblxuXHRmdW5jdGlvbiBkaWZmKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxNiwgUCQxMikpKG9icywgeyBmbjogZm4gfHwgZGVmYXVsdEZuLCBzZWVkOiBzZWVkIH0pO1xuXHR9XG5cblx0dmFyIFAkMTMgPSBjcmVhdGVQcm9wZXJ0eSgnc2NhbicsIHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgc2VlZCA9IF9yZWYuc2VlZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3NlZWQgPSBzZWVkO1xuXHQgICAgaWYgKHNlZWQgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHNlZWQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX3NlZWQgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ID09PSBudWxsIHx8IHRoaXMuX2N1cnJlbnRFdmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fc2VlZCA9PT0gTk9USElORyA/IHggOiBmbih0aGlzLl9zZWVkLCB4KSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fY3VycmVudEV2ZW50LnZhbHVlLCB4KSk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBzY2FuKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IFAkMTMob2JzLCB7IGZuOiBmbiwgc2VlZDogc2VlZCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxMCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgeHMgPSBmbih4KTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHhzW2ldKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTcgPSBjcmVhdGVTdHJlYW0oJ2ZsYXR0ZW4nLCBtaXhpbiQxMCk7XG5cblx0dmFyIGlkJDQgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGZsYXR0ZW4ob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkNCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgUyQxNyhvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIEVORF9NQVJLRVIgPSB7fTtcblxuXHR2YXIgbWl4aW4kMTEgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fJHNoaWZ0QnVmZiA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdmFyIHZhbHVlID0gX3RoaXMuX2J1ZmYuc2hpZnQoKTtcblx0ICAgICAgaWYgKHZhbHVlID09PSBFTkRfTUFSS0VSKSB7XG5cdCAgICAgICAgX3RoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBfdGhpcy5fZW1pdFZhbHVlKHZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICAgIHRoaXMuXyRzaGlmdEJ1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKEVORF9NQVJLRVIpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxOCA9IGNyZWF0ZVN0cmVhbSgnZGVsYXknLCBtaXhpbiQxMSk7XG5cdHZhciBQJDE0ID0gY3JlYXRlUHJvcGVydHkoJ2RlbGF5JywgbWl4aW4kMTEpO1xuXG5cdGZ1bmN0aW9uIGRlbGF5KG9icywgd2FpdCkge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE4LCBQJDE0KSkob2JzLCB7IHdhaXQ6IHdhaXQgfSk7XG5cdH1cblxuXHR2YXIgbm93ID0gRGF0ZS5ub3cgPyBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIERhdGUubm93KCk7XG5cdH0gOiBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHR9O1xuXG5cdHZhciBtaXhpbiQxMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGxlYWRpbmcgPSBfcmVmLmxlYWRpbmc7XG5cdCAgICB2YXIgdHJhaWxpbmcgPSBfcmVmLnRyYWlsaW5nO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9sZWFkaW5nID0gbGVhZGluZztcblx0ICAgIHRoaXMuX3RyYWlsaW5nID0gdHJhaWxpbmc7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gMDtcblx0ICAgIHRoaXMuXyR0cmFpbGluZ0NhbGwgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fdHJhaWxpbmdDYWxsKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJHRyYWlsaW5nQ2FsbCA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB2YXIgY3VyVGltZSA9IG5vdygpO1xuXHQgICAgICBpZiAodGhpcy5fbGFzdENhbGxUaW1lID09PSAwICYmICF0aGlzLl9sZWFkaW5nKSB7XG5cdCAgICAgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gY3VyVGltZTtcblx0ICAgICAgfVxuXHQgICAgICB2YXIgcmVtYWluaW5nID0gdGhpcy5fd2FpdCAtIChjdXJUaW1lIC0gdGhpcy5fbGFzdENhbGxUaW1lKTtcblx0ICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fY2FuY2VsVHJhaWxpbmcoKTtcblx0ICAgICAgICB0aGlzLl9sYXN0Q2FsbFRpbWUgPSBjdXJUaW1lO1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl90cmFpbGluZykge1xuXHQgICAgICAgIHRoaXMuX2NhbmNlbFRyYWlsaW5nKCk7XG5cdCAgICAgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IHg7XG5cdCAgICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kdHJhaWxpbmdDYWxsLCByZW1haW5pbmcpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkKSB7XG5cdCAgICAgICAgdGhpcy5fZW5kTGF0ZXIgPSB0cnVlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NhbmNlbFRyYWlsaW5nOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fdGltZW91dElkICE9PSBudWxsKSB7XG5cdCAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0SWQpO1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3RyYWlsaW5nQ2FsbDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3RyYWlsaW5nVmFsdWUpO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gIXRoaXMuX2xlYWRpbmcgPyAwIDogbm93KCk7XG5cdCAgICBpZiAodGhpcy5fZW5kTGF0ZXIpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxOSA9IGNyZWF0ZVN0cmVhbSgndGhyb3R0bGUnLCBtaXhpbiQxMik7XG5cdHZhciBQJDE1ID0gY3JlYXRlUHJvcGVydHkoJ3Rocm90dGxlJywgbWl4aW4kMTIpO1xuXG5cdGZ1bmN0aW9uIHRocm90dGxlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGxlYWRpbmcgPSBfcmVmMi5sZWFkaW5nO1xuXHQgIHZhciBsZWFkaW5nID0gX3JlZjIkbGVhZGluZyA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGxlYWRpbmc7XG5cdCAgdmFyIF9yZWYyJHRyYWlsaW5nID0gX3JlZjIudHJhaWxpbmc7XG5cdCAgdmFyIHRyYWlsaW5nID0gX3JlZjIkdHJhaWxpbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiR0cmFpbGluZztcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE5LCBQJDE1KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGxlYWRpbmc6IGxlYWRpbmcsIHRyYWlsaW5nOiB0cmFpbGluZyB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxMyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGltbWVkaWF0ZSA9IF9yZWYuaW1tZWRpYXRlO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9pbW1lZGlhdGUgPSBpbW1lZGlhdGU7XG5cdCAgICB0aGlzLl9sYXN0QXR0ZW1wdCA9IDA7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXJWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2xhdGVyKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2xhc3RBdHRlbXB0ID0gbm93KCk7XG5cdCAgICAgIGlmICh0aGlzLl9pbW1lZGlhdGUgJiYgIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJGxhdGVyLCB0aGlzLl93YWl0KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSB4O1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkICYmICF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9lbmRMYXRlciA9IHRydWU7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfbGF0ZXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBsYXN0ID0gbm93KCkgLSB0aGlzLl9sYXN0QXR0ZW1wdDtcblx0ICAgIGlmIChsYXN0IDwgdGhpcy5fd2FpdCAmJiBsYXN0ID49IDApIHtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kbGF0ZXIsIHRoaXMuX3dhaXQgLSBsYXN0KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICAgIGlmICghdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2xhdGVyVmFsdWUpO1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICh0aGlzLl9lbmRMYXRlcikge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyMCA9IGNyZWF0ZVN0cmVhbSgnZGVib3VuY2UnLCBtaXhpbiQxMyk7XG5cdHZhciBQJDE2ID0gY3JlYXRlUHJvcGVydHkoJ2RlYm91bmNlJywgbWl4aW4kMTMpO1xuXG5cdGZ1bmN0aW9uIGRlYm91bmNlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGltbWVkaWF0ZSA9IF9yZWYyLmltbWVkaWF0ZTtcblx0ICB2YXIgaW1tZWRpYXRlID0gX3JlZjIkaW1tZWRpYXRlID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IF9yZWYyJGltbWVkaWF0ZTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDIwLCBQJDE2KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGltbWVkaWF0ZTogaW1tZWRpYXRlIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDE0ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcihmbih4KSk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDIxID0gY3JlYXRlU3RyZWFtKCdtYXBFcnJvcnMnLCBtaXhpbiQxNCk7XG5cdHZhciBQJDE3ID0gY3JlYXRlUHJvcGVydHkoJ21hcEVycm9ycycsIG1peGluJDE0KTtcblxuXHR2YXIgaWQkNSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gbWFwRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDUgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMSwgUCQxNykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTUgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKGZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjIgPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlckVycm9ycycsIG1peGluJDE1KTtcblx0dmFyIFAkMTggPSBjcmVhdGVQcm9wZXJ0eSgnZmlsdGVyRXJyb3JzJywgbWl4aW4kMTUpO1xuXG5cdHZhciBpZCQ2ID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmaWx0ZXJFcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkNiA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDIyLCBQJDE4KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxNiA9IHtcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICgpIHt9XG5cdH07XG5cblx0dmFyIFMkMjMgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZVZhbHVlcycsIG1peGluJDE2KTtcblx0dmFyIFAkMTkgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlVmFsdWVzJywgbWl4aW4kMTYpO1xuXG5cdGZ1bmN0aW9uIGlnbm9yZVZhbHVlcyhvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMywgUCQxOSkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTcgPSB7XG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDI0ID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVFcnJvcnMnLCBtaXhpbiQxNyk7XG5cdHZhciBQJDIwID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZUVycm9ycycsIG1peGluJDE3KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVFcnJvcnMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjQsIFAkMjApKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE4ID0ge1xuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHt9XG5cdH07XG5cblx0dmFyIFMkMjUgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZUVuZCcsIG1peGluJDE4KTtcblx0dmFyIFAkMjEgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlRW5kJywgbWl4aW4kMTgpO1xuXG5cdGZ1bmN0aW9uIGlnbm9yZUVuZChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNSwgUCQyMSkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKCkpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyNiA9IGNyZWF0ZVN0cmVhbSgnYmVmb3JlRW5kJywgbWl4aW4kMTkpO1xuXHR2YXIgUCQyMiA9IGNyZWF0ZVByb3BlcnR5KCdiZWZvcmVFbmQnLCBtaXhpbiQxOSk7XG5cblx0ZnVuY3Rpb24gYmVmb3JlRW5kKG9icywgZm4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNiwgUCQyMikpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbWluID0gX3JlZi5taW47XG5cdCAgICB2YXIgbWF4ID0gX3JlZi5tYXg7XG5cblx0ICAgIHRoaXMuX21heCA9IG1heDtcblx0ICAgIHRoaXMuX21pbiA9IG1pbjtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBzbGlkZSh0aGlzLl9idWZmLCB4LCB0aGlzLl9tYXgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX21pbikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI3ID0gY3JlYXRlU3RyZWFtKCdzbGlkaW5nV2luZG93JywgbWl4aW4kMjApO1xuXHR2YXIgUCQyMyA9IGNyZWF0ZVByb3BlcnR5KCdzbGlkaW5nV2luZG93JywgbWl4aW4kMjApO1xuXG5cdGZ1bmN0aW9uIHNsaWRpbmdXaW5kb3cob2JzLCBtYXgpIHtcblx0ICB2YXIgbWluID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8gMCA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDI3LCBQJDIzKSkob2JzLCB7IG1pbjogbWluLCBtYXg6IG1heCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKCFmbih4KSkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjggPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldoaWxlJywgbWl4aW4kMjEpO1xuXHR2YXIgUCQyNCA9IGNyZWF0ZVByb3BlcnR5KCdidWZmZXJXaGlsZScsIG1peGluJDIxKTtcblxuXHR2YXIgaWQkNyA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gYnVmZmVyV2hpbGUob2JzLCBmbikge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyOCwgUCQyNCkpKG9icywgeyBmbjogZm4gfHwgaWQkNywgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fY291bnQgPSBjb3VudDtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9jb3VudCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjkgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhDb3VudCcsIG1peGluJDIyKTtcblx0dmFyIFAkMjUgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aENvdW50JywgbWl4aW4kMjIpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlJDEob2JzLCBjb3VudCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyOSwgUCQyNSkpKG9icywgeyBjb3VudDogY291bnQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9jb3VudCA9IGNvdW50O1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fZmx1c2goKTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fY291bnQpIHtcblx0ICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9LFxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTsgLy8gY29waWVkIGZyb20gcGF0dGVybnMvb25lLXNvdXJjZVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzAgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhUaW1lT3JDb3VudCcsIG1peGluJDIzKTtcblx0dmFyIFAkMjYgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aFRpbWVPckNvdW50JywgbWl4aW4kMjMpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldpdGhUaW1lT3JDb3VudChvYnMsIHdhaXQsIGNvdW50KSB7XG5cdCAgdmFyIF9yZWYyID0gYXJndW1lbnRzLmxlbmd0aCA8PSAzIHx8IGFyZ3VtZW50c1szXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbM107XG5cblx0ICB2YXIgX3JlZjIkZmx1c2hPbkVuZCA9IF9yZWYyLmZsdXNoT25FbmQ7XG5cdCAgdmFyIGZsdXNoT25FbmQgPSBfcmVmMiRmbHVzaE9uRW5kID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkZmx1c2hPbkVuZDtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDMwLCBQJDI2KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGNvdW50OiBjb3VudCwgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHhmb3JtRm9yT2JzKG9icykge1xuXHQgIHJldHVybiB7XG5cdCAgICAnQEB0cmFuc2R1Y2VyL3N0ZXAnOiBmdW5jdGlvbiAocmVzLCBpbnB1dCkge1xuXHQgICAgICBvYnMuX2VtaXRWYWx1ZShpbnB1dCk7XG5cdCAgICAgIHJldHVybiBudWxsO1xuXHQgICAgfSxcblx0ICAgICdAQHRyYW5zZHVjZXIvcmVzdWx0JzogZnVuY3Rpb24gKCkge1xuXHQgICAgICBvYnMuX2VtaXRFbmQoKTtcblx0ICAgICAgcmV0dXJuIG51bGw7XG5cdCAgICB9XG5cdCAgfTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB0cmFuc2R1Y2VyID0gX3JlZi50cmFuc2R1Y2VyO1xuXG5cdCAgICB0aGlzLl94Zm9ybSA9IHRyYW5zZHVjZXIoeGZvcm1Gb3JPYnModGhpcykpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hmb3JtID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3N0ZXAnXShudWxsLCB4KSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3Jlc3VsdCddKG51bGwpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9yZXN1bHQnXShudWxsKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzEgPSBjcmVhdGVTdHJlYW0oJ3RyYW5zZHVjZScsIG1peGluJDI0KTtcblx0dmFyIFAkMjcgPSBjcmVhdGVQcm9wZXJ0eSgndHJhbnNkdWNlJywgbWl4aW4kMjQpO1xuXG5cdGZ1bmN0aW9uIHRyYW5zZHVjZShvYnMsIHRyYW5zZHVjZXIpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMSwgUCQyNykpKG9icywgeyB0cmFuc2R1Y2VyOiB0cmFuc2R1Y2VyIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDI1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5faGFuZGxlciA9IGZuO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IGVtaXR0ZXIodGhpcyk7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5faGFuZGxlciA9IG51bGw7XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgdGhpcy5faGFuZGxlcih0aGlzLl9lbWl0dGVyLCBldmVudCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMyID0gY3JlYXRlU3RyZWFtKCd3aXRoSGFuZGxlcicsIG1peGluJDI1KTtcblx0dmFyIFAkMjggPSBjcmVhdGVQcm9wZXJ0eSgnd2l0aEhhbmRsZXInLCBtaXhpbiQyNSk7XG5cblx0ZnVuY3Rpb24gd2l0aEhhbmRsZXIob2JzLCBmbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDMyLCBQJDI4KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcblx0ICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcblx0fTtcblxuXHRmdW5jdGlvbiBaaXAoc291cmNlcywgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuXHQgIHRoaXMuX2J1ZmZlcnMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IGNsb25lQXJyYXkoc291cmNlKSA6IFtdO1xuXHQgIH0pO1xuXHQgIHRoaXMuX3NvdXJjZXMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IG5ldmVyKCkgOiBzb3VyY2U7XG5cdCAgfSk7XG5cblx0ICB0aGlzLl9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IHNwcmVhZChjb21iaW5hdG9yLCB0aGlzLl9zb3VyY2VzLmxlbmd0aCkgOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdCAgfTtcblx0ICB0aGlzLl9hbGl2ZUNvdW50ID0gMDtcblxuXHQgIHRoaXMuXyRoYW5kbGVycyA9IFtdO1xuXG5cdCAgdmFyIF9sb29wID0gZnVuY3Rpb24gKGkpIHtcblx0ICAgIF90aGlzLl8kaGFuZGxlcnMucHVzaChmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoaSwgZXZlbnQpO1xuXHQgICAgfSk7XG5cdCAgfTtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgX2xvb3AoaSk7XG5cdCAgfVxuXHR9XG5cblx0aW5oZXJpdChaaXAsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICd6aXAnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXG5cdCAgICAvLyBpZiBhbGwgc291cmNlcyBhcmUgYXJyYXlzXG5cdCAgICB3aGlsZSAodGhpcy5faXNGdWxsKCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgfVxuXG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fc291cmNlcy5sZW5ndGg7XG5cdCAgICB0aGlzLl9hbGl2ZUNvdW50ID0gbGVuZ3RoO1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGggJiYgdGhpcy5fYWN0aXZlOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vZmZBbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KHRoaXMuX2J1ZmZlcnMubGVuZ3RoKTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB2YWx1ZXNbaV0gPSB0aGlzLl9idWZmZXJzW2ldLnNoaWZ0KCk7XG5cdCAgICB9XG5cdCAgICB2YXIgY29tYmluYXRvciA9IHRoaXMuX2NvbWJpbmF0b3I7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXMpKTtcblx0ICB9LFxuXHQgIF9pc0Z1bGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICBpZiAodGhpcy5fYnVmZmVyc1tpXS5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICByZXR1cm4gZmFsc2U7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0cnVlO1xuXHQgIH0sXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGksIGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fYnVmZmVyc1tpXS5wdXNoKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgaWYgKHRoaXMuX2lzRnVsbCgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICBpZiAodGhpcy5fYWxpdmVDb3VudCA9PT0gMCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmZXJzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHppcChvYnNlcnZhYmxlcywgY29tYmluYXRvciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IFppcChvYnNlcnZhYmxlcywgY29tYmluYXRvcik7XG5cdH1cblxuXHR2YXIgaWQkOCA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gQWJzdHJhY3RQb29sKCkge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgdmFyIF9yZWYkcXVldWVMaW0gPSBfcmVmLnF1ZXVlTGltO1xuXHQgIHZhciBxdWV1ZUxpbSA9IF9yZWYkcXVldWVMaW0gPT09IHVuZGVmaW5lZCA/IDAgOiBfcmVmJHF1ZXVlTGltO1xuXHQgIHZhciBfcmVmJGNvbmN1ckxpbSA9IF9yZWYuY29uY3VyTGltO1xuXHQgIHZhciBjb25jdXJMaW0gPSBfcmVmJGNvbmN1ckxpbSA9PT0gdW5kZWZpbmVkID8gLTEgOiBfcmVmJGNvbmN1ckxpbTtcblx0ICB2YXIgX3JlZiRkcm9wID0gX3JlZi5kcm9wO1xuXHQgIHZhciBkcm9wID0gX3JlZiRkcm9wID09PSB1bmRlZmluZWQgPyAnbmV3JyA6IF9yZWYkZHJvcDtcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXG5cdCAgdGhpcy5fcXVldWVMaW0gPSBxdWV1ZUxpbSA8IDAgPyAtMSA6IHF1ZXVlTGltO1xuXHQgIHRoaXMuX2NvbmN1ckxpbSA9IGNvbmN1ckxpbSA8IDAgPyAtMSA6IGNvbmN1ckxpbTtcblx0ICB0aGlzLl9kcm9wID0gZHJvcDtcblx0ICB0aGlzLl9xdWV1ZSA9IFtdO1xuXHQgIHRoaXMuX2N1clNvdXJjZXMgPSBbXTtcblx0ICB0aGlzLl8kaGFuZGxlU3ViQW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVN1YkFueShldmVudCk7XG5cdCAgfTtcblx0ICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBbXTtcblx0ICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXG5cdCAgaWYgKHRoaXMuX2NvbmN1ckxpbSA9PT0gMCkge1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQWJzdHJhY3RQb29sLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnYWJzdHJhY3RQb29sJyxcblxuXHQgIF9hZGQ6IGZ1bmN0aW9uIChvYmosIHRvT2JzIC8qIEZ1bmN0aW9uIHwgZmFsc2V5ICovKSB7XG5cdCAgICB0b09icyA9IHRvT2JzIHx8IGlkJDg7XG5cdCAgICBpZiAodGhpcy5fY29uY3VyTGltID09PSAtMSB8fCB0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA8IHRoaXMuX2NvbmN1ckxpbSkge1xuXHQgICAgICB0aGlzLl9hZGRUb0N1cih0b09icyhvYmopKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGlmICh0aGlzLl9xdWV1ZUxpbSA9PT0gLTEgfHwgdGhpcy5fcXVldWUubGVuZ3RoIDwgdGhpcy5fcXVldWVMaW0pIHtcblx0ICAgICAgICB0aGlzLl9hZGRUb1F1ZXVlKHRvT2JzKG9iaikpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX2Ryb3AgPT09ICdvbGQnKSB7XG5cdCAgICAgICAgdGhpcy5fcmVtb3ZlT2xkZXN0KCk7XG5cdCAgICAgICAgdGhpcy5fYWRkKG9iaiwgdG9PYnMpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfYWRkQWxsOiBmdW5jdGlvbiAob2Jzcykge1xuXHQgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cblx0ICAgIGZvckVhY2gob2JzcywgZnVuY3Rpb24gKG9icykge1xuXHQgICAgICByZXR1cm4gX3RoaXMyLl9hZGQob2JzKTtcblx0ICAgIH0pO1xuXHQgIH0sXG5cdCAgX3JlbW92ZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgaWYgKHRoaXMuX3JlbW92ZUN1cihvYnMpID09PSAtMSkge1xuXHQgICAgICB0aGlzLl9yZW1vdmVRdWV1ZShvYnMpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2FkZFRvUXVldWU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX3F1ZXVlID0gY29uY2F0KHRoaXMuX3F1ZXVlLCBbb2JzXSk7XG5cdCAgfSxcblx0ICBfYWRkVG9DdXI6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblxuXHQgICAgICAvLyBIQUNLOlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBXZSBoYXZlIHR3byBvcHRpbWl6YXRpb25zIGZvciBjYXNlcyB3aGVuIGBvYnNgIGlzIGVuZGVkLiBXZSBkb24ndCB3YW50XG5cdCAgICAgIC8vIHRvIGFkZCBzdWNoIG9ic2VydmFibGUgdG8gdGhlIGxpc3QsIGJ1dCBvbmx5IHdhbnQgdG8gZW1pdCBldmVudHNcblx0ICAgICAgLy8gZnJvbSBpdCAoaWYgaXQgaGFzIHNvbWUpLlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBJbnN0ZWFkIG9mIHRoaXMgaGFja3MsIHdlIGNvdWxkIGp1c3QgZGlkIGZvbGxvd2luZyxcblx0ICAgICAgLy8gYnV0IGl0IHdvdWxkIGJlIDUtOCB0aW1lcyBzbG93ZXI6XG5cdCAgICAgIC8vXG5cdCAgICAgIC8vICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgICAgLy8gICAgIHRoaXMuX3N1YnNjcmliZShvYnMpO1xuXHQgICAgICAvL1xuXG5cdCAgICAgIC8vICMxXG5cdCAgICAgIC8vIFRoaXMgb25lIGZvciBjYXNlcyB3aGVuIGBvYnNgIGFscmVhZHkgZW5kZWRcblx0ICAgICAgLy8gZS5nLiwgS2VmaXIuY29uc3RhbnQoKSBvciBLZWZpci5uZXZlcigpXG5cdCAgICAgIGlmICghb2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIGlmIChvYnMuX2N1cnJlbnRFdmVudCkge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdChvYnMuX2N1cnJlbnRFdmVudC50eXBlLCBvYnMuX2N1cnJlbnRFdmVudC52YWx1ZSk7XG5cdCAgICAgICAgfVxuXHQgICAgICAgIHJldHVybjtcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vICMyXG5cdCAgICAgIC8vIFRoaXMgb25lIGlzIGZvciBjYXNlcyB3aGVuIGBvYnNgIGdvaW5nIHRvIGVuZCBzeW5jaHJvbm91c2x5IG9uXG5cdCAgICAgIC8vIGZpcnN0IHN1YnNjcmliZXIgZS5nLiwgS2VmaXIuc3RyZWFtKGVtID0+IHtlbS5lbWl0KDEpOyBlbS5lbmQoKX0pXG5cdCAgICAgIHRoaXMuX2N1cnJlbnRseUFkZGluZyA9IG9icztcblx0ICAgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXHQgICAgICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXHQgICAgICBpZiAob2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2N1clNvdXJjZXMgPSBjb25jYXQodGhpcy5fY3VyU291cmNlcywgW29ic10pO1xuXHQgICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9zdWJUb0VuZDogZnVuY3Rpb24gKG9icykge1xuXHQgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cblx0ICAgIHZhciBvbkVuZCA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzMy5fcmVtb3ZlQ3VyKG9icyk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fJGVuZEhhbmRsZXJzLnB1c2goeyBvYnM6IG9icywgaGFuZGxlcjogb25FbmQgfSk7XG5cdCAgICBvYnMub25FbmQob25FbmQpO1xuXHQgIH0sXG5cdCAgX3N1YnNjcmliZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXG5cdCAgICAvLyBpdCBjYW4gYmVjb21lIGluYWN0aXZlIGluIHJlc3BvbmNlIG9mIHN1YnNjcmliaW5nIHRvIGBvYnMub25BbnlgIGFib3ZlXG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIG9icy5vZmZBbnkodGhpcy5fJGhhbmRsZVN1YkFueSk7XG5cblx0ICAgIHZhciBvbkVuZEkgPSBmaW5kQnlQcmVkKHRoaXMuXyRlbmRIYW5kbGVycywgZnVuY3Rpb24gKG9iaikge1xuXHQgICAgICByZXR1cm4gb2JqLm9icyA9PT0gb2JzO1xuXHQgICAgfSk7XG5cdCAgICBpZiAob25FbmRJICE9PSAtMSkge1xuXHQgICAgICBvYnMub2ZmRW5kKHRoaXMuXyRlbmRIYW5kbGVyc1tvbkVuZEldLmhhbmRsZXIpO1xuXHQgICAgICB0aGlzLl8kZW5kSGFuZGxlcnMuc3BsaWNlKG9uRW5kSSwgMSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU3ViQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3JlbW92ZVF1ZXVlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kKHRoaXMuX3F1ZXVlLCBvYnMpO1xuXHQgICAgdGhpcy5fcXVldWUgPSByZW1vdmUodGhpcy5fcXVldWUsIGluZGV4KTtcblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXHQgIF9yZW1vdmVDdXI6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUob2JzKTtcblx0ICAgIH1cblx0ICAgIHZhciBpbmRleCA9IGZpbmQodGhpcy5fY3VyU291cmNlcywgb2JzKTtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSByZW1vdmUodGhpcy5fY3VyU291cmNlcywgaW5kZXgpO1xuXHQgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuXHQgICAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fcHVsbFF1ZXVlKCk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyU291cmNlcy5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9vbkVtcHR5KCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXHQgIF9yZW1vdmVPbGRlc3Q6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3JlbW92ZUN1cih0aGlzLl9jdXJTb3VyY2VzWzBdKTtcblx0ICB9LFxuXHQgIF9wdWxsUXVldWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9xdWV1ZS5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fcXVldWUgPSBjbG9uZUFycmF5KHRoaXMuX3F1ZXVlKTtcblx0ICAgICAgdGhpcy5fYWRkVG9DdXIodGhpcy5fcXVldWUuc2hpZnQoKSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc291cmNlcyA9IHRoaXMuX2N1clNvdXJjZXM7IGkgPCBzb3VyY2VzLmxlbmd0aCAmJiB0aGlzLl9hY3RpdmU7IGkrKykge1xuXHQgICAgICB0aGlzLl9zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwLCBzb3VyY2VzID0gdGhpcy5fY3VyU291cmNlczsgaSA8IHNvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudGx5QWRkaW5nICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKHRoaXMuX2N1cnJlbnRseUFkZGluZyk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaXNFbXB0eTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoID09PSAwO1xuXHQgIH0sXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3F1ZXVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZVN1YkFueSA9IG51bGw7XG5cdCAgICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gTWVyZ2Uoc291cmNlcykge1xuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2FkZEFsbChzb3VyY2VzKTtcblx0ICB0aGlzLl9pbml0aWFsaXNlZCA9IHRydWU7XG5cdH1cblxuXHRpbmhlcml0KE1lcmdlLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9uYW1lOiAnbWVyZ2UnLFxuXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9pbml0aWFsaXNlZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBtZXJnZShvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IE1lcmdlKG9ic2VydmFibGVzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIFMkMzMoZ2VuZXJhdG9yKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2dlbmVyYXRvciA9IGdlbmVyYXRvcjtcblx0ICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgIHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cdCAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KFMkMzMsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdyZXBlYXQnLFxuXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2dldFNvdXJjZSgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdChldmVudC50eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZ2V0U291cmNlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2luTG9vcCkge1xuXHQgICAgICB0aGlzLl9pbkxvb3AgPSB0cnVlO1xuXHQgICAgICB2YXIgZ2VuZXJhdG9yID0gdGhpcy5fZ2VuZXJhdG9yO1xuXHQgICAgICB3aGlsZSAodGhpcy5fc291cmNlID09PSBudWxsICYmIHRoaXMuX2FsaXZlICYmIHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3NvdXJjZSA9IGdlbmVyYXRvcih0aGlzLl9pdGVyYXRpb24rKyk7XG5cdCAgICAgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9nZXRTb3VyY2UoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZ2VuZXJhdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHJlcGVhdCAoZ2VuZXJhdG9yKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDMzKGdlbmVyYXRvcik7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25jYXQkMShvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiByZXBlYXQoZnVuY3Rpb24gKGluZGV4KSB7XG5cdCAgICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID4gaW5kZXggPyBvYnNlcnZhYmxlc1tpbmRleF0gOiBmYWxzZTtcblx0ICB9KS5zZXROYW1lKCdjb25jYXQnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIFBvb2woKSB7XG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFBvb2wsIEFic3RyYWN0UG9vbCwge1xuXG5cdCAgX25hbWU6ICdwb29sJyxcblxuXHQgIHBsdWc6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX2FkZChvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICB1bnBsdWc6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX3JlbW92ZShvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBGbGF0TWFwKHNvdXJjZSwgZm4sIG9wdGlvbnMpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdCAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgIHRoaXMuX2ZuID0gZm47XG5cdCAgdGhpcy5fbWFpbkVuZGVkID0gZmFsc2U7XG5cdCAgdGhpcy5fbGFzdEN1cnJlbnQgPSBudWxsO1xuXHQgIHRoaXMuXyRoYW5kbGVNYWluID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZU1haW4oZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KEZsYXRNYXAsIEFic3RyYWN0UG9vbCwge1xuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIEFic3RyYWN0UG9vbC5wcm90b3R5cGUuX29uQWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZU1haW4pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9vbkRlYWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlTWFpbik7XG5cdCAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IHRydWU7XG5cdCAgfSxcblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICAvLyBJcyBsYXRlc3QgdmFsdWUgYmVmb3JlIGRlYWN0aXZhdGlvbiBzdXJ2aXZlZCwgYW5kIG5vdyBpcyAnY3VycmVudCcgb24gdGhpcyBhY3RpdmF0aW9uP1xuXHQgICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGhhbmRsZSBzdWNoIHZhbHVlcywgdG8gcHJldmVudCB0byBjb25zdGFudGx5IGFkZFxuXHQgICAgICAvLyBzYW1lIG9ic2VydmFsZSBvbiBlYWNoIGFjdGl2YXRpb24vZGVhY3RpdmF0aW9uIHdoZW4gb3VyIG1haW4gc291cmNlXG5cdCAgICAgIC8vIGlzIGEgYEtlZmlyLmNvbmF0YW50KClgIGZvciBleGFtcGxlLlxuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9tYWluRW5kZWQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVNYWluID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIEZsYXRNYXBFcnJvcnMoc291cmNlLCBmbikge1xuXHQgIEZsYXRNYXAuY2FsbCh0aGlzLCBzb3VyY2UsIGZuKTtcblx0fVxuXG5cdGluaGVyaXQoRmxhdE1hcEVycm9ycywgRmxhdE1hcCwge1xuXG5cdCAgLy8gU2FtZSBhcyBpbiBGbGF0TWFwLCBvbmx5IFZBTFVFL0VSUk9SIGZsaXBwZWRcblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29uc3RydWN0b3IkMShCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fcHJpbWFyeSA9IHByaW1hcnk7XG5cdCAgICB0aGlzLl9zZWNvbmRhcnkgPSBzZWNvbmRhcnk7XG5cdCAgICB0aGlzLl9uYW1lID0gcHJpbWFyeS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0gTk9USElORztcblx0ICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVTZWNvbmRhcnlBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlUHJpbWFyeUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ2xhc3NNZXRob2RzJDEoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblx0ICAgIF9pbml0OiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IHg7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeUVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5QW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgICAgdGhpcy5fcmVtb3ZlU2Vjb25kYXJ5KCk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfcmVtb3ZlU2Vjb25kYXJ5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBudWxsO1xuXHQgICAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub25BbnkodGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3ByaW1hcnkub25BbnkodGhpcy5fJGhhbmRsZVByaW1hcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3ByaW1hcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgQmFzZUNsYXNzLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fcHJpbWFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZVByaW1hcnlBbnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVN0cmVhbSQxKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFMgPSBjcmVhdGVDb25zdHJ1Y3RvciQxKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKFN0cmVhbSksIG1peGluKTtcblx0ICByZXR1cm4gUztcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVByb3BlcnR5JDEobmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUCA9IGNyZWF0ZUNvbnN0cnVjdG9yJDEoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKFByb3BlcnR5KSwgbWl4aW4pO1xuXHQgIHJldHVybiBQO1xuXHR9XG5cblx0dmFyIG1peGluJDI2ID0ge1xuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORyAmJiB0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ID09PSBOT1RISU5HIHx8ICF0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzQgPSBjcmVhdGVTdHJlYW0kMSgnZmlsdGVyQnknLCBtaXhpbiQyNik7XG5cdHZhciBQJDI5ID0gY3JlYXRlUHJvcGVydHkkMSgnZmlsdGVyQnknLCBtaXhpbiQyNik7XG5cblx0ZnVuY3Rpb24gZmlsdGVyQnkocHJpbWFyeSwgc2Vjb25kYXJ5KSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTJDM0LCBQJDI5KSkocHJpbWFyeSwgc2Vjb25kYXJ5KTtcblx0fVxuXG5cdHZhciBpZDIgPSBmdW5jdGlvbiAoXywgeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNhbXBsZWRCeShwYXNzaXZlLCBhY3RpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gZnVuY3Rpb24gKGEsIGIpIHtcblx0ICAgIHJldHVybiBjb21iaW5hdG9yKGIsIGEpO1xuXHQgIH0gOiBpZDI7XG5cdCAgcmV0dXJuIGNvbWJpbmUoW2FjdGl2ZV0sIFtwYXNzaXZlXSwgX2NvbWJpbmF0b3IpLnNldE5hbWUocGFzc2l2ZSwgJ3NhbXBsZWRCeScpO1xuXHR9XG5cblx0dmFyIG1peGluJDI3ID0ge1xuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM1ID0gY3JlYXRlU3RyZWFtJDEoJ3NraXBVbnRpbEJ5JywgbWl4aW4kMjcpO1xuXHR2YXIgUCQzMCA9IGNyZWF0ZVByb3BlcnR5JDEoJ3NraXBVbnRpbEJ5JywgbWl4aW4kMjcpO1xuXG5cdGZ1bmN0aW9uIHNraXBVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNSwgUCQzMCkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjggPSB7XG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM2ID0gY3JlYXRlU3RyZWFtJDEoJ3Rha2VVbnRpbEJ5JywgbWl4aW4kMjgpO1xuXHR2YXIgUCQzMSA9IGNyZWF0ZVByb3BlcnR5JDEoJ3Rha2VVbnRpbEJ5JywgbWl4aW4kMjgpO1xuXG5cdGZ1bmN0aW9uIHRha2VVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNiwgUCQzMSkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9wcmltYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSAmJiB0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZmx1c2goKTtcblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM3ID0gY3JlYXRlU3RyZWFtJDEoJ2J1ZmZlckJ5JywgbWl4aW4kMjkpO1xuXHR2YXIgUCQzMiA9IGNyZWF0ZVByb3BlcnR5JDEoJ2J1ZmZlckJ5JywgbWl4aW4kMjkpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlckJ5KHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyAvKiBvcHRpb25hbCAqLykge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNywgUCQzMikpKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblx0ICAgIHZhciBfcmVmJGZsdXNoT25DaGFuZ2UgPSBfcmVmLmZsdXNoT25DaGFuZ2U7XG5cdCAgICB2YXIgZmx1c2hPbkNoYW5nZSA9IF9yZWYkZmx1c2hPbkNoYW5nZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBfcmVmJGZsdXNoT25DaGFuZ2U7XG5cblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fZmx1c2hPbkNoYW5nZSA9IGZsdXNoT25DaGFuZ2U7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcgJiYgIXRoaXMuX2xhc3RTZWNvbmRhcnkpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCAmJiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORyB8fCB0aGlzLl9sYXN0U2Vjb25kYXJ5KSkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkNoYW5nZSAmJiAheCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXG5cdCAgICAvLyBmcm9tIGRlZmF1bHQgX2hhbmRsZVNlY29uZGFyeVZhbHVlXG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0geDtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzggPSBjcmVhdGVTdHJlYW0kMSgnYnVmZmVyV2hpbGVCeScsIG1peGluJDMwKTtcblx0dmFyIFAkMzMgPSBjcmVhdGVQcm9wZXJ0eSQxKCdidWZmZXJXaGlsZUJ5JywgbWl4aW4kMzApO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlQnkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zIC8qIG9wdGlvbmFsICovKSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTJDM4LCBQJDMzKSkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdHZhciBmID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBmYWxzZTtcblx0fTtcblx0dmFyIHQgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIHRydWU7XG5cdH07XG5cblx0ZnVuY3Rpb24gYXdhaXRpbmcoYSwgYikge1xuXHQgIHZhciByZXN1bHQgPSBtZXJnZShbbWFwJDEoYSwgdCksIG1hcCQxKGIsIGYpXSk7XG5cdCAgcmVzdWx0ID0gc2tpcER1cGxpY2F0ZXMocmVzdWx0KTtcblx0ICByZXN1bHQgPSB0b1Byb3BlcnR5KHJlc3VsdCwgZik7XG5cdCAgcmV0dXJuIHJlc3VsdC5zZXROYW1lKGEsICdhd2FpdGluZycpO1xuXHR9XG5cblx0dmFyIG1peGluJDMxID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciByZXN1bHQgPSBmbih4KTtcblx0ICAgIGlmIChyZXN1bHQuY29udmVydCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IocmVzdWx0LmVycm9yKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzkgPSBjcmVhdGVTdHJlYW0oJ3ZhbHVlc1RvRXJyb3JzJywgbWl4aW4kMzEpO1xuXHR2YXIgUCQzNCA9IGNyZWF0ZVByb3BlcnR5KCd2YWx1ZXNUb0Vycm9ycycsIG1peGluJDMxKTtcblxuXHR2YXIgZGVmRm4gPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB7IGNvbnZlcnQ6IHRydWUsIGVycm9yOiB4IH07XG5cdH07XG5cblx0ZnVuY3Rpb24gdmFsdWVzVG9FcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZGVmRm4gOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzOSwgUCQzNCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHJlc3VsdCA9IGZuKHgpO1xuXHQgICAgaWYgKHJlc3VsdC5jb252ZXJ0KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShyZXN1bHQudmFsdWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ0MCA9IGNyZWF0ZVN0cmVhbSgnZXJyb3JzVG9WYWx1ZXMnLCBtaXhpbiQzMik7XG5cdHZhciBQJDM1ID0gY3JlYXRlUHJvcGVydHkoJ2Vycm9yc1RvVmFsdWVzJywgbWl4aW4kMzIpO1xuXG5cdHZhciBkZWZGbiQxID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geyBjb252ZXJ0OiB0cnVlLCB2YWx1ZTogeCB9O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGVycm9yc1RvVmFsdWVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGRlZkZuJDEgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ0MCwgUCQzNSkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzMgPSB7XG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ0MSA9IGNyZWF0ZVN0cmVhbSgnZW5kT25FcnJvcicsIG1peGluJDMzKTtcblx0dmFyIFAkMzYgPSBjcmVhdGVQcm9wZXJ0eSgnZW5kT25FcnJvcicsIG1peGluJDMzKTtcblxuXHRmdW5jdGlvbiBlbmRPbkVycm9yKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDQxLCBQJDM2KSkob2JzKTtcblx0fVxuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvUHJvcGVydHkgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gdG9Qcm9wZXJ0eSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY2hhbmdlcyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gY2hhbmdlcyh0aGlzKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1Byb21pc2UgPSBmdW5jdGlvbiAoUHJvbWlzZSkge1xuXHQgIHJldHVybiB0b1Byb21pc2UodGhpcywgUHJvbWlzZSk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9FU09ic2VydmFibGUgPSB0b0VTT2JzZXJ2YWJsZTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGVbJCRvYnNlcnZhYmxlXSA9IHRvRVNPYnNlcnZhYmxlO1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBtYXAkMSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlcih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZSA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2UodGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZUVycm9ycyA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2VFcnJvcnModGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZVdoaWxlID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHRha2VXaGlsZSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubGFzdCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbGFzdCh0aGlzKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwID0gZnVuY3Rpb24gKG4pIHtcblx0ICByZXR1cm4gc2tpcCh0aGlzLCBuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwV2hpbGUgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gc2tpcFdoaWxlKHRoaXMsIGZuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwRHVwbGljYXRlcyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBza2lwRHVwbGljYXRlcyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uIChmbiwgc2VlZCkge1xuXHQgIHJldHVybiBkaWZmKHRoaXMsIGZuLCBzZWVkKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5zY2FuID0gZnVuY3Rpb24gKGZuLCBzZWVkKSB7XG5cdCAgcmV0dXJuIHNjYW4odGhpcywgZm4sIHNlZWQpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXR0ZW4gPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gZmxhdHRlbih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbiAod2FpdCkge1xuXHQgIHJldHVybiBkZWxheSh0aGlzLCB3YWl0KTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50aHJvdHRsZSA9IGZ1bmN0aW9uICh3YWl0LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIHRocm90dGxlKHRoaXMsIHdhaXQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRlYm91bmNlID0gZnVuY3Rpb24gKHdhaXQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gZGVib3VuY2UodGhpcywgd2FpdCwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWFwRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG1hcEVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlckVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVWYWx1ZXModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRXJyb3JzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFcnJvcnModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRW5kID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFbmQodGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYmVmb3JlRW5kID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGJlZm9yZUVuZCh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2xpZGluZ1dpbmRvdyA9IGZ1bmN0aW9uIChtYXgsIG1pbikge1xuXHQgIHJldHVybiBzbGlkaW5nV2luZG93KHRoaXMsIG1heCwgbWluKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaGlsZSA9IGZ1bmN0aW9uIChmbiwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZSh0aGlzLCBmbiwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2l0aENvdW50ID0gZnVuY3Rpb24gKGNvdW50LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGJ1ZmZlcldoaWxlJDEodGhpcywgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldpdGhUaW1lT3JDb3VudCA9IGZ1bmN0aW9uICh3YWl0LCBjb3VudCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaXRoVGltZU9yQ291bnQodGhpcywgd2FpdCwgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRyYW5zZHVjZSA9IGZ1bmN0aW9uICh0cmFuc2R1Y2VyKSB7XG5cdCAgcmV0dXJuIHRyYW5zZHVjZSh0aGlzLCB0cmFuc2R1Y2VyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS53aXRoSGFuZGxlciA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB3aXRoSGFuZGxlcih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29tYmluZSA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiBjb21iaW5lKFt0aGlzLCBvdGhlcl0sIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnppcCA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiB6aXAoW3RoaXMsIG90aGVyXSwgY29tYmluYXRvcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWVyZ2UgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gbWVyZ2UoW3RoaXMsIG90aGVyXSk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIGNvbmNhdCQxKFt0aGlzLCBvdGhlcl0pO1xuXHR9O1xuXG5cdHZhciBwb29sID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBuZXcgUG9vbCgpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXAgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXAnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcExhdGVzdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBjb25jdXJMaW06IDEsIGRyb3A6ICdvbGQnIH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBMYXRlc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcEZpcnN0ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwRmlyc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcENvbmNhdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBxdWV1ZUxpbTogLTEsIGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwQ29uY2F0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBDb25jdXJMaW1pdCA9IGZ1bmN0aW9uIChmbiwgbGltaXQpIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgcXVldWVMaW06IC0xLCBjb25jdXJMaW06IGxpbWl0IH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBDb25jdXJMaW1pdCcpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBFcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXBFcnJvcnModGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBFcnJvcnMnKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5maWx0ZXJCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBmaWx0ZXJCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2FtcGxlZEJ5ID0gZnVuY3Rpb24gKG90aGVyLCBjb21iaW5hdG9yKSB7XG5cdCAgcmV0dXJuIHNhbXBsZWRCeSh0aGlzLCBvdGhlciwgY29tYmluYXRvcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcFVudGlsQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gc2tpcFVudGlsQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VVbnRpbEJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIHRha2VVbnRpbEJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJCeSh0aGlzLCBvdGhlciwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2hpbGVCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZUJ5KHRoaXMsIG90aGVyLCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyBEZXByZWNhdGVkXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIERFUFJFQ0FUSU9OX1dBUk5JTkdTID0gdHJ1ZTtcblx0ZnVuY3Rpb24gZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzKCkge1xuXHQgIERFUFJFQ0FUSU9OX1dBUk5JTkdTID0gZmFsc2U7XG5cdH1cblxuXHRmdW5jdGlvbiB3YXJuKG1zZykge1xuXHQgIGlmIChERVBSRUNBVElPTl9XQVJOSU5HUyAmJiBjb25zb2xlICYmIHR5cGVvZiBjb25zb2xlLndhcm4gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHZhciBtc2cyID0gJ1xcbkhlcmUgaXMgYW4gRXJyb3Igb2JqZWN0IGZvciB5b3UgY29udGFpbmluZyB0aGUgY2FsbCBzdGFjazonO1xuXHQgICAgY29uc29sZS53YXJuKG1zZywgbXNnMiwgbmV3IEVycm9yKCkpO1xuXHQgIH1cblx0fVxuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmF3YWl0aW5nID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5hd2FpdGluZygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ1Jyk7XG5cdCAgcmV0dXJuIGF3YWl0aW5nKHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS52YWx1ZXNUb0Vycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAudmFsdWVzVG9FcnJvcnMoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0OScpO1xuXHQgIHJldHVybiB2YWx1ZXNUb0Vycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZXJyb3JzVG9WYWx1ZXMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLmVycm9yc1RvVmFsdWVzKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDknKTtcblx0ICByZXR1cm4gZXJyb3JzVG9WYWx1ZXModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmVuZE9uRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5lbmRPbkVycm9yKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNTAnKTtcblx0ICByZXR1cm4gZW5kT25FcnJvcih0aGlzKTtcblx0fTtcblxuXHQvLyBFeHBvcnRzXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIEtlZmlyID0geyBPYnNlcnZhYmxlOiBPYnNlcnZhYmxlLCBTdHJlYW06IFN0cmVhbSwgUHJvcGVydHk6IFByb3BlcnR5LCBuZXZlcjogbmV2ZXIsIGxhdGVyOiBsYXRlciwgaW50ZXJ2YWw6IGludGVydmFsLCBzZXF1ZW50aWFsbHk6IHNlcXVlbnRpYWxseSxcblx0ICBmcm9tUG9sbDogZnJvbVBvbGwsIHdpdGhJbnRlcnZhbDogd2l0aEludGVydmFsLCBmcm9tQ2FsbGJhY2s6IGZyb21DYWxsYmFjaywgZnJvbU5vZGVDYWxsYmFjazogZnJvbU5vZGVDYWxsYmFjaywgZnJvbUV2ZW50czogZnJvbUV2ZW50cywgc3RyZWFtOiBzdHJlYW0sXG5cdCAgY29uc3RhbnQ6IGNvbnN0YW50LCBjb25zdGFudEVycm9yOiBjb25zdGFudEVycm9yLCBmcm9tUHJvbWlzZTogZnJvbVByb21pc2UsIGZyb21FU09ic2VydmFibGU6IGZyb21FU09ic2VydmFibGUsIGNvbWJpbmU6IGNvbWJpbmUsIHppcDogemlwLCBtZXJnZTogbWVyZ2UsXG5cdCAgY29uY2F0OiBjb25jYXQkMSwgUG9vbDogUG9vbCwgcG9vbDogcG9vbCwgcmVwZWF0OiByZXBlYXQsIHN0YXRpY0xhbmQ6IHN0YXRpY0xhbmQgfTtcblxuXHRLZWZpci5LZWZpciA9IEtlZmlyO1xuXG5cdGV4cG9ydHMuZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzID0gZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzO1xuXHRleHBvcnRzLktlZmlyID0gS2VmaXI7XG5cdGV4cG9ydHMuT2JzZXJ2YWJsZSA9IE9ic2VydmFibGU7XG5cdGV4cG9ydHMuU3RyZWFtID0gU3RyZWFtO1xuXHRleHBvcnRzLlByb3BlcnR5ID0gUHJvcGVydHk7XG5cdGV4cG9ydHMubmV2ZXIgPSBuZXZlcjtcblx0ZXhwb3J0cy5sYXRlciA9IGxhdGVyO1xuXHRleHBvcnRzLmludGVydmFsID0gaW50ZXJ2YWw7XG5cdGV4cG9ydHMuc2VxdWVudGlhbGx5ID0gc2VxdWVudGlhbGx5O1xuXHRleHBvcnRzLmZyb21Qb2xsID0gZnJvbVBvbGw7XG5cdGV4cG9ydHMud2l0aEludGVydmFsID0gd2l0aEludGVydmFsO1xuXHRleHBvcnRzLmZyb21DYWxsYmFjayA9IGZyb21DYWxsYmFjaztcblx0ZXhwb3J0cy5mcm9tTm9kZUNhbGxiYWNrID0gZnJvbU5vZGVDYWxsYmFjaztcblx0ZXhwb3J0cy5mcm9tRXZlbnRzID0gZnJvbUV2ZW50cztcblx0ZXhwb3J0cy5zdHJlYW0gPSBzdHJlYW07XG5cdGV4cG9ydHMuY29uc3RhbnQgPSBjb25zdGFudDtcblx0ZXhwb3J0cy5jb25zdGFudEVycm9yID0gY29uc3RhbnRFcnJvcjtcblx0ZXhwb3J0cy5mcm9tUHJvbWlzZSA9IGZyb21Qcm9taXNlO1xuXHRleHBvcnRzLmZyb21FU09ic2VydmFibGUgPSBmcm9tRVNPYnNlcnZhYmxlO1xuXHRleHBvcnRzLmNvbWJpbmUgPSBjb21iaW5lO1xuXHRleHBvcnRzLnppcCA9IHppcDtcblx0ZXhwb3J0cy5tZXJnZSA9IG1lcmdlO1xuXHRleHBvcnRzLmNvbmNhdCA9IGNvbmNhdCQxO1xuXHRleHBvcnRzLlBvb2wgPSBQb29sO1xuXHRleHBvcnRzLnBvb2wgPSBwb29sO1xuXHRleHBvcnRzLnJlcGVhdCA9IHJlcGVhdDtcblx0ZXhwb3J0cy5zdGF0aWNMYW5kID0gc3RhdGljTGFuZDtcblx0ZXhwb3J0c1snZGVmYXVsdCddID0gS2VmaXI7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpOyIsImltcG9ydCBzbmFiYmRvbSBmcm9tICdzbmFiYmRvbS9zbmFiYmRvbS5qcydcbmltcG9ydCBoIGZyb20gJ3NuYWJiZG9tL2guanMnXG5pbXBvcnQgc25hYkNsYXNzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvY2xhc3MuanMnXG5pbXBvcnQgc25hYlByb3BzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvcHJvcHMuanMnXG5pbXBvcnQgc25hYlN0eWxlIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMnXG5pbXBvcnQgc25hYkV2ZW50IGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvZXZlbnRsaXN0ZW5lcnMuanMnXG5pbXBvcnQgS2VmaXIgZnJvbSAna2VmaXInXG5cbmV4cG9ydCBmdW5jdGlvbiBidXMoKSB7XG4gIGxldCBlbWl0dGVyXG4gIGxldCBzdHJlYW0gPSBLZWZpci5zdHJlYW0oX2VtaXR0ZXIgPT4ge1xuICAgIGVtaXR0ZXIgPSBfZW1pdHRlclxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGVtaXR0ZXIgPSBudWxsXG4gICAgfVxuICB9KVxuICBzdHJlYW0uZW1pdCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBlbWl0dGVyICYmIGVtaXR0ZXIuZW1pdCh4KVxuICB9XG4gIHJldHVybiBzdHJlYW1cbn1cblxuZnVuY3Rpb24gY29udmVydFRvSHlwZXJTY3JpcHQobm9kZSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgIGxldCBbc2VsLCBkYXRhLCBjaGlsZHJlbl0gPSBub2RlXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgIHJldHVybiBoKHNlbCwgZGF0YSwgY2hpbGRyZW4ubWFwKGNvbnZlcnRUb0h5cGVyU2NyaXB0KSlcbiAgICB9XG4gICAgcmV0dXJuIGguYXBwbHkobnVsbCwgbm9kZSlcbiAgfVxuICByZXR1cm4gbm9kZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHZpZXckLCBjb250YWluZXIpIHtcbiAgbGV0IHBhdGNoID0gc25hYmJkb20uaW5pdChbc25hYkNsYXNzLCBzbmFiUHJvcHMsIHNuYWJTdHlsZSwgc25hYkV2ZW50XSlcbiAgbGV0IHZub2RlID0gY29udGFpbmVyXG5cbiAgdmlldyRcbiAgICAubWFwKGNvbnZlcnRUb0h5cGVyU2NyaXB0KVxuICAgIC5vblZhbHVlKG5ld1Zub2RlID0+IHtcbiAgICAgIHBhdGNoKHZub2RlLCBuZXdWbm9kZSlcbiAgICAgIHZub2RlID0gbmV3Vm5vZGVcbiAgICB9KVxufVxuIiwiaW1wb3J0IHsgYnVzLCByZW5kZXIgfSBmcm9tICcuLi8uLi9zcmMvaW5kZXguanMnXG5pbXBvcnQgS2VmaXIgZnJvbSAna2VmaXInXG5cbi8vIFN0cmVhbXNcbmxldCBhY3Rpb25zJCA9IGJ1cygpXG5hY3Rpb25zJC5sb2coJ0FjdGlvbnMnKVxuXG4vLyBNb2RlbFxuZnVuY3Rpb24gZ2V0RnJvbVN0b3JhZ2UoKSB7XG4gIGxldCBqc29uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3RvZG9zLW11dmpzJylcbiAgaWYgKGpzb24pIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShqc29uKVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZpbHRlckZyb21IYXNoKCkge1xuICBsZXQgaGFzaCA9IGxvY2F0aW9uLmhhc2hcbiAgbGV0IGZpbHRlclxuXG4gIGlmIChoYXNoKSB7XG4gICAgZmlsdGVyID0gaGFzaC5zbGljZSgyKVxuICB9XG4gIHJldHVybiAhZmlsdGVyID8gJ2FsbCcgOiBmaWx0ZXJcbn1cblxubGV0IGluaXRNb2RlbCA9IGdldEZyb21TdG9yYWdlKCkgfHxcbiAge2l0ZW1zOiBbXSwgYWxsQ29tcGxldGVkOiBmYWxzZSwgZmlsdGVyOiBnZXRGaWx0ZXJGcm9tSGFzaCgpLCB0ZXh0OiAnJywgdWlkOiAwfVxuXG4vLyBVcGRhdGVcbmZ1bmN0aW9uIHVwZGF0ZShtb2RlbCwgW2FjdGlvbiwgdmFsdWVdKSB7XG4gIGxldCB7aXRlbXMsIGFsbENvbXBsZXRlZCwgZmlsdGVyLCB0ZXh0LCB1aWR9ID0gbW9kZWxcbiAgbGV0IG5ld0l0ZW1zXG5cbiAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICBjYXNlICdjaGFuZ2VUZXh0JzpcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIHRleHQ6IHZhbHVlfVxuICAgIGNhc2UgJ2FkZEl0ZW0nOlxuICAgICAgcmV0dXJuIHsuLi5tb2RlbCwgdGV4dDogJycsIGFsbENvbXBsZXRlZDogZmFsc2UsIGl0ZW1zOiBbLi4uaXRlbXMsIG5ld0l0ZW0odmFsdWUsIHVpZCldLCB1aWQ6IHVpZCArIDF9XG4gICAgY2FzZSAndG9nZ2xlSXRlbSc6XG4gICAgICBuZXdJdGVtcyA9IGl0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgICAgcmV0dXJuIGl0ZW0uaWQgPT0gdmFsdWUgPyB7Li4uaXRlbSwgY29tcGxldGVkOiAhaXRlbS5jb21wbGV0ZWR9IDogaXRlbVxuICAgICAgfSlcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtcywgYWxsQ29tcGxldGVkOiBhbGxJdGVtc0NvbXBsZXRlZChuZXdJdGVtcyl9XG4gICAgY2FzZSAnZWRpdEl0ZW0nOlxuICAgICAgbmV3SXRlbXMgPSBpdGVtcy5tYXAoaXRlbSA9PiB7XG4gICAgICAgIHJldHVybiBpdGVtLmlkID09IHZhbHVlID8gey4uLml0ZW0sIGVkaXRpbmc6IHRydWV9IDogaXRlbVxuICAgICAgfSlcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtc31cbiAgICBjYXNlICdjYW5jZWxFZGl0JzpcbiAgICAgIG5ld0l0ZW1zID0gaXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgICAgICByZXR1cm4gaXRlbS5lZGl0aW5nID8gey4uLml0ZW0sIGVkaXRpbmc6IGZhbHNlfSA6IGl0ZW1cbiAgICAgIH0pXG4gICAgICByZXR1cm4gey4uLm1vZGVsLCBpdGVtczogbmV3SXRlbXN9XG4gICAgY2FzZSAndXBkYXRlSXRlbSc6XG4gICAgICBpZiAodmFsdWUgPT0gJycpIHtcbiAgICAgICAgbGV0IGluZGV4ID0gaXRlbXMuZmluZEluZGV4KGl0ZW0gPT4gaXRlbS5lZGl0aW5nKVxuICAgICAgICBuZXdJdGVtcyA9IGluZGV4ID09IC0xID8gaXRlbXMgOiByZW1vdmVJdGVtKGl0ZW1zLCBpdGVtc1tpbmRleF0uaWQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdJdGVtcyA9IGl0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgICAgICByZXR1cm4gaXRlbS5lZGl0aW5nID8gey4uLml0ZW0sIGVkaXRpbmc6IGZhbHNlLCB0ZXh0OiB2YWx1ZX0gOiBpdGVtXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlbXMgIT0gbmV3SXRlbXMgPyB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtc30gOiBtb2RlbFxuICAgIGNhc2UgJ3JlbW92ZUl0ZW0nOlxuICAgICAgbmV3SXRlbXMgPSByZW1vdmVJdGVtKGl0ZW1zLCB2YWx1ZSlcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtcywgYWxsQ29tcGxldGVkOiBhbGxJdGVtc0NvbXBsZXRlZChuZXdJdGVtcyl9XG4gICAgY2FzZSAndG9nZ2xlQWxsJzpcbiAgICAgIGxldCBuZXdBbGxDb21wbGV0ZWQgPSAhYWxsQ29tcGxldGVkXG5cbiAgICAgIG5ld0l0ZW1zID0gaXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgICAgICByZXR1cm4gey4uLml0ZW0sIGNvbXBsZXRlZDogbmV3QWxsQ29tcGxldGVkfVxuICAgICAgfSlcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtcywgYWxsQ29tcGxldGVkOiBuZXdBbGxDb21wbGV0ZWR9XG4gICAgY2FzZSAnY2hhbmdlRmlsdGVyJzpcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGZpbHRlcjogdmFsdWV9XG4gICAgY2FzZSAnY2xlYXJDb21wbGV0ZWQnOlxuICAgICAgbmV3SXRlbXMgPSBpdGVtcy5maWx0ZXIoaXRlbSA9PiAhaXRlbS5jb21wbGV0ZWQpXG4gICAgICByZXR1cm4gey4uLm1vZGVsLCBpdGVtczogbmV3SXRlbXN9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlSXRlbShpdGVtcywgaWQpIHtcbiAgcmV0dXJuIGl0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0uaWQgIT0gaWQpXG59XG5cbmZ1bmN0aW9uIGFsbEl0ZW1zQ29tcGxldGVkKGl0ZW1zKSB7XG4gIHJldHVybiBpdGVtcy5ldmVyeShpdGVtID0+IGl0ZW0uY29tcGxldGVkKVxufVxuXG5mdW5jdGlvbiBuZXdJdGVtKHRleHQsIGlkKSB7XG4gIHJldHVybiB7aWQsIHRleHQsIGNvbXBsZXRlZDogZmFsc2UsIGVkaXRpbmc6IGZhbHNlfVxufVxuXG4vLyBWaWV3XG5mdW5jdGlvbiB2aWV3KG1vZGVsKSB7XG4gIGxldCB7dGV4dH0gPSBtb2RlbFxuICBsZXQgbnVtSXRlbXMgPSBtb2RlbC5pdGVtcy5sZW5ndGhcblxuICBsZXQgdiA9XG4gICAgWydkaXYnLCB7fSxcbiAgICAgIFsgWydzZWN0aW9uLnRvZG9hcHAnLCB7fSxcbiAgICAgICAgWyBbJ2hlYWRlci5oZWFkZXInLCB7fSxcbiAgICAgICAgICBbIFsnaDEnLCB7fSwgJ3RvZG9zJ10sXG4gICAgICAgICAgICBbJ2lucHV0Lm5ldy10b2RvJyxcbiAgICAgICAgICAgICAgeyBwcm9wczoge3BsYWNlaG9sZGVyOiAnV2hhdCBuZWVkcyB0byBiZSBkb25lPycsIGF1dG9mb2N1czogdHJ1ZSwgdmFsdWU6IHRleHR9LFxuICAgICAgICAgICAgICAgIG9uOiB7aW5wdXQ6IGhhbmRsZUlucHV0LCBrZXlkb3duOiBvbkVudGVyfX1dXV0sXG4gICAgICAgICAgbnVtSXRlbXMgPiAwID8gbWFpbihtb2RlbCkgOiAnJyxcbiAgICAgICAgICBudW1JdGVtcyA+IDAgPyBmb290ZXIobW9kZWwpIDogJyddXSxcbiAgICAgIGluZm8oKV1dXG4gIHJldHVybiB2XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUlucHV0KGUpIHtcbiAgbGV0IHZhbHVlID0gZS50YXJnZXQudmFsdWUudHJpbSgpXG4gIGFjdGlvbnMkLmVtaXQoWydjaGFuZ2VUZXh0JywgdmFsdWVdKVxufVxuXG5mdW5jdGlvbiBvbkVudGVyKGUpIHtcbiAgaWYgKGUuY29kZSA9PSAnRW50ZXInKSB7XG4gICAgbGV0IHRleHQgPSBlLnRhcmdldC52YWx1ZS50cmltKClcbiAgICBpZiAodGV4dCAhPT0gJycpIGFjdGlvbnMkLmVtaXQoWydhZGRJdGVtJywgdGV4dF0pXG4gIH1cbn1cblxuZnVuY3Rpb24gbWFpbih7aXRlbXMsIGZpbHRlciwgYWxsQ29tcGxldGVkfSkge1xuICBmdW5jdGlvbiBpc1Zpc2libGUoaXRlbSkge1xuICAgIHN3aXRjaCAoZmlsdGVyKSB7XG4gICAgICBjYXNlICdhbGwnOlxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgY2FzZSAnY29tcGxldGVkJzpcbiAgICAgICAgcmV0dXJuIGl0ZW0uY29tcGxldGVkXG4gICAgICBjYXNlICdhY3RpdmUnOlxuICAgICAgICByZXR1cm4gIWl0ZW0uY29tcGxldGVkXG4gICAgfVxuICB9XG5cbiAgbGV0IHYgPVxuICAgIFsnc2VjdGlvbi5tYWluJywge30sXG4gICAgICBbIFsnaW5wdXQudG9nZ2xlLWFsbCcsIHtwcm9wczoge3R5cGU6ICdjaGVja2JveCcsIGNoZWNrZWQ6IGFsbENvbXBsZXRlZH0sIG9uOiB7Y2xpY2s6IHRvZ2dsZUFsbH19XSxcbiAgICAgICAgWydsYWJlbCcsIHtwcm9wczoge2h0bWxGb3I6ICd0b2dnbGUtYWxsJ319LCAnTWFyayBhbGwgYXMgY29tcGxldGUnXSxcbiAgICAgICAgWyd1bC50b2RvLWxpc3QnLCB7fSwgaXRlbXMuZmlsdGVyKGlzVmlzaWJsZSkubWFwKHZpZXdJdGVtKV1dXVxuICByZXR1cm4gdlxufVxuXG5mdW5jdGlvbiB0b2dnbGVBbGwoKSB7XG4gIGFjdGlvbnMkLmVtaXQoWyd0b2dnbGVBbGwnXSlcbn1cblxuZnVuY3Rpb24gdmlld0l0ZW0oaXRlbSkge1xuICBsZXQge2lkLCBjb21wbGV0ZWQsIGVkaXRpbmcsIHRleHR9ID0gaXRlbVxuICBsZXQgdiA9XG4gICAgWydsaScsIHtjbGFzczoge2NvbXBsZXRlZCwgZWRpdGluZ319LFxuICAgICAgWyBbJ2Rpdi52aWV3Jywge30sXG4gICAgICAgICAgWyBbJ2lucHV0LnRvZ2dsZScsIHtwcm9wczoge3R5cGU6ICdjaGVja2JveCcsIGNoZWNrZWQ6IGNvbXBsZXRlZH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbjoge2NsaWNrOiBbY2hlY2tib3hDbGljaywgaWRdfX1dLFxuICAgICAgICAgICAgWydsYWJlbCcsIHtvbjoge2RibGNsaWNrOiBbaXRlbUNsaWNrLCBpZF19fSwgdGV4dF0sXG4gICAgICAgICAgICBbJ2J1dHRvbi5kZXN0cm95Jywge29uOiB7Y2xpY2s6IFtkZXN0cm95Q2xpY2ssIGlkXX19XV1dLFxuICAgICAgICBbJ2lucHV0LmVkaXQnLCB7cHJvcHM6IHt2YWx1ZTogZWRpdGluZyA/IHRleHQgOiAnJ30sXG4gICAgICAgICAgICAgICAgICAgICAgICBvbjoge2tleWRvd246IG9uRWRpdERvbmUsIGJsdXI6IG9uQmx1cn0sXG4gICAgICAgICAgICAgICAgICAgICAgICBob29rOiB7cG9zdHBhdGNoOiBmb2N1c0VsZW1lbnR9fV1dXVxuICByZXR1cm4gdlxufVxuXG5mdW5jdGlvbiBmb2N1c0VsZW1lbnQob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZub2RlLmVsbS5mb2N1cygpXG59XG5cbmZ1bmN0aW9uIG9uRWRpdERvbmUoZSkge1xuICBzd2l0Y2ggKGUuY29kZSl7XG4gICAgY2FzZSAnRW50ZXInOlxuICAgICAgbGV0IHRleHQgPSBlLnRhcmdldC52YWx1ZS50cmltKClcbiAgICAgIGFjdGlvbnMkLmVtaXQoWyd1cGRhdGVJdGVtJywgdGV4dF0pXG4gICAgICBicmVha1xuICAgIGNhc2UgJ0VzY2FwZSc6XG4gICAgICBhY3Rpb25zJC5lbWl0KFsnY2FuY2VsRWRpdCddKVxuICAgICAgYnJlYWtcbiAgfVxufVxuXG5mdW5jdGlvbiBvbkJsdXIoZSkge1xuICBsZXQgdGV4dCA9IGUudGFyZ2V0LnZhbHVlLnRyaW0oKVxuICBhY3Rpb25zJC5lbWl0KFsndXBkYXRlSXRlbScsIHRleHRdKVxufVxuXG5mdW5jdGlvbiBpdGVtQ2xpY2soaWQpIHtcbiAgYWN0aW9ucyQuZW1pdChbJ2VkaXRJdGVtJywgaWRdKVxufVxuXG5mdW5jdGlvbiBjaGVja2JveENsaWNrKGlkKSB7XG4gIGFjdGlvbnMkLmVtaXQoWyd0b2dnbGVJdGVtJywgaWRdKVxufVxuXG5mdW5jdGlvbiBkZXN0cm95Q2xpY2soaWQpIHtcbiAgYWN0aW9ucyQuZW1pdChbJ3JlbW92ZUl0ZW0nLCBpZF0pXG59XG5cbmZ1bmN0aW9uIG51bVVuY29tcGxldGVkKGl0ZW1zKSB7XG4gIHJldHVybiBpdGVtcy5maWx0ZXIoaXRlbSA9PiAhaXRlbS5jb21wbGV0ZWQpLmxlbmd0aFxufVxuXG5mdW5jdGlvbiBudW1Db21wbGV0ZWQoaXRlbXMpIHtcbiAgcmV0dXJuIGl0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0uY29tcGxldGVkKS5sZW5ndGhcbn1cblxuZnVuY3Rpb24gZm9vdGVyKHtpdGVtcywgZmlsdGVyfSkge1xuICBsZXQgbnVtTGVmdCA9IG51bVVuY29tcGxldGVkKGl0ZW1zKVxuICBsZXQgbnVtRG9uZSA9IG51bUNvbXBsZXRlZChpdGVtcylcblxuICBsZXQgdiA9XG4gICAgWydmb290ZXIuZm9vdGVyJywge30sXG4gICAgICBbIFsnc3Bhbi50b2RvLWNvdW50Jywge30sXG4gICAgICAgICAgW1snc3Ryb25nJywge30sIGAke251bUxlZnR9IGl0ZW0ke251bUxlZnQgPT0gMSA/ICcnIDogJ3MnfSBsZWZ0YF1dXSxcbiAgICAgICAgWyd1bC5maWx0ZXJzJywge30sXG4gICAgICAgICAgWyB2aWV3RmlsdGVyKCcjLycsICdhbGwnLCBmaWx0ZXIpLFxuICAgICAgICAgICAgdmlld0ZpbHRlcignIy9hY3RpdmUnLCAnYWN0aXZlJywgZmlsdGVyKSxcbiAgICAgICAgICAgIHZpZXdGaWx0ZXIoJyMvY29tcGxldGVkJywgJ2NvbXBsZXRlZCcsIGZpbHRlcildXSxcbiAgICAgICAgbnVtRG9uZSA+PSAxID9cbiAgICAgICAgICBbJ2J1dHRvbi5jbGVhci1jb21wbGV0ZWQnLCB7b246IHtjbGljazogY2xlYXJDb21wbGV0ZWR9fSwgYENsZWFyIENvbXBsZXRlZCAoJHtudW1Eb25lfSlgXSA6XG4gICAgICAgICAgJyddXVxuICByZXR1cm4gdlxufVxuXG5mdW5jdGlvbiBjbGVhckNvbXBsZXRlZChlKSB7XG4gIGFjdGlvbnMkLmVtaXQoWydjbGVhckNvbXBsZXRlZCddKVxufVxuXG5mdW5jdGlvbiB2aWV3RmlsdGVyKGhyZWYsIGZpbHRlciwgY3VycmVudEZpbHRlcikge1xuICBsZXQgdiA9XG4gICAgWydsaScsIHt9LFxuICAgICAgWyBbJ2EnLCB7cHJvcHM6IHtocmVmOiBocmVmfSwgY2xhc3M6IHtzZWxlY3RlZDogZmlsdGVyID09IGN1cnJlbnRGaWx0ZXJ9fSwgZmlsdGVyXV1dXG4gIHJldHVybiB2XG59XG5cbmZ1bmN0aW9uIGluZm8oKSB7XG4gIGxldCB2ID1cbiAgICBbJ2Zvb3Rlci5pbmZvJywge30sXG4gICAgICBbIFsncCcsIHt9LCAnRG91YmxlLWNsaWNrIHRvIGVkaXQgYSB0b2RvJ10sXG4gICAgICAgIFsncCcsIHt9LFxuICAgICAgICAgIFsnQ3JlYXRlZCBieSAnLCBbJ2EnLCB7cHJvcHM6IHtocmVmOiAnaHR0cHM6Ly9naXRodWIuY29tL2R1YmlvdXNkYXZpZCd9fSwgJ0RhdmlkIFNhcmdlYW50J11dXSxcbiAgICAgICAgWydwJywge30sXG4gICAgICAgICAgWydQYXJ0IG9mICcsIFsnYScsIHtwcm9wczoge2hyZWY6ICdodHRwOi8vdG9kb212Yy5jb20nfX0sICdUb2RvTVZDJ11dXV1dXG4gIHJldHVybiB2XG59XG5cbi8vIFJlZHVjZVxubGV0IG1vZGVsJCA9IGFjdGlvbnMkLnNjYW4odXBkYXRlLCBpbml0TW9kZWwpXG5tb2RlbCQubG9nKCdNb2RlbCcpXG5cbi8vIFNhdmUgdG8gbG9jYWwgc3RvcmFnZVxuZnVuY3Rpb24gZGlzYWJsZUVkaXRpbmcobW9kZWwpIHtcbiAgbGV0IG5ld0l0ZW1zID0gbW9kZWwuaXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgIHJldHVybiB7Li4uaXRlbSwgZWRpdGluZzogZmFsc2V9XG4gIH0pXG4gIHJldHVybiB7Li4ubW9kZWwsIGl0ZW1zOiBuZXdJdGVtc31cbn1cblxubW9kZWwkXG4gIC5tYXAoZGlzYWJsZUVkaXRpbmcpXG4gIC5vblZhbHVlKG1vZGVsID0+IGxvY2FsU3RvcmFnZS5zZXRJdGVtKCd0b2Rvcy1tdXZqcycsIEpTT04uc3RyaW5naWZ5KG1vZGVsKSkpXG5cbi8vIEhhbmRsZSBoYXNoIGNoYW5nZVxuZnVuY3Rpb24gY2hhbmdlRmlsdGVyKCkge1xuICBhY3Rpb25zJC5lbWl0KFsnY2hhbmdlRmlsdGVyJywgZ2V0RmlsdGVyRnJvbUhhc2goKV0pXG59XG5cbndpbmRvdy5vbmhhc2hjaGFuZ2UgPSBjaGFuZ2VGaWx0ZXJcblxuLy8gUmVuZGVyXG5sZXQgdmlldyQgPSBtb2RlbCQubWFwKHZpZXcpXG5yZW5kZXIodmlldyQsIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250YWluZXInKSlcbiJdLCJuYW1lcyI6WyJzZWwiLCJkYXRhIiwiY2hpbGRyZW4iLCJ0ZXh0IiwiZWxtIiwia2V5IiwidW5kZWZpbmVkIiwiQXJyYXkiLCJpc0FycmF5IiwicyIsImNyZWF0ZUVsZW1lbnQiLCJ0YWdOYW1lIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50TlMiLCJuYW1lc3BhY2VVUkkiLCJxdWFsaWZpZWROYW1lIiwiY3JlYXRlVGV4dE5vZGUiLCJpbnNlcnRCZWZvcmUiLCJwYXJlbnROb2RlIiwibmV3Tm9kZSIsInJlZmVyZW5jZU5vZGUiLCJyZW1vdmVDaGlsZCIsIm5vZGUiLCJjaGlsZCIsImFwcGVuZENoaWxkIiwicGFyZW50RWxlbWVudCIsIm5leHRTaWJsaW5nIiwic2V0VGV4dENvbnRlbnQiLCJ0ZXh0Q29udGVudCIsIlZOb2RlIiwicmVxdWlyZSQkMiIsImlzIiwicmVxdWlyZSQkMSIsImRvbUFwaSIsInJlcXVpcmUkJDAiLCJpc1VuZGVmIiwiaXNEZWYiLCJlbXB0eU5vZGUiLCJzYW1lVm5vZGUiLCJ2bm9kZTEiLCJ2bm9kZTIiLCJjcmVhdGVLZXlUb09sZElkeCIsImJlZ2luSWR4IiwiZW5kSWR4IiwiaSIsIm1hcCIsImhvb2tzIiwiaW5pdCIsIm1vZHVsZXMiLCJhcGkiLCJqIiwiY2JzIiwibGVuZ3RoIiwicHVzaCIsImVtcHR5Tm9kZUF0IiwiaWQiLCJjIiwiY2xhc3NOYW1lIiwic3BsaXQiLCJqb2luIiwidG9Mb3dlckNhc2UiLCJjcmVhdGVSbUNiIiwiY2hpbGRFbG0iLCJsaXN0ZW5lcnMiLCJwYXJlbnQiLCJjcmVhdGVFbG0iLCJ2bm9kZSIsImluc2VydGVkVm5vZGVRdWV1ZSIsImhvb2siLCJoYXNoSWR4IiwiaW5kZXhPZiIsImRvdElkeCIsImhhc2giLCJkb3QiLCJ0YWciLCJzbGljZSIsIk1hdGgiLCJtaW4iLCJucyIsInJlcGxhY2UiLCJhcnJheSIsInByaW1pdGl2ZSIsImNyZWF0ZSIsImluc2VydCIsImFkZFZub2RlcyIsInBhcmVudEVsbSIsImJlZm9yZSIsInZub2RlcyIsInN0YXJ0SWR4IiwiaW52b2tlRGVzdHJveUhvb2siLCJkZXN0cm95IiwicmVtb3ZlVm5vZGVzIiwicm0iLCJjaCIsInJlbW92ZSIsInVwZGF0ZUNoaWxkcmVuIiwib2xkQ2giLCJuZXdDaCIsIm9sZFN0YXJ0SWR4IiwibmV3U3RhcnRJZHgiLCJvbGRFbmRJZHgiLCJvbGRTdGFydFZub2RlIiwib2xkRW5kVm5vZGUiLCJuZXdFbmRJZHgiLCJuZXdTdGFydFZub2RlIiwibmV3RW5kVm5vZGUiLCJvbGRLZXlUb0lkeCIsImlkeEluT2xkIiwiZWxtVG9Nb3ZlIiwicGF0Y2hWbm9kZSIsIm9sZFZub2RlIiwicHJlcGF0Y2giLCJ1cGRhdGUiLCJwb3N0cGF0Y2giLCJwcmUiLCJwb3N0IiwiYWRkTlMiLCJoIiwiYiIsInVwZGF0ZUNsYXNzIiwiY3VyIiwibmFtZSIsIm9sZENsYXNzIiwiY2xhc3MiLCJrbGFzcyIsImNsYXNzTGlzdCIsInVwZGF0ZVByb3BzIiwib2xkIiwib2xkUHJvcHMiLCJwcm9wcyIsInJhZiIsIndpbmRvdyIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInNldFRpbWVvdXQiLCJuZXh0RnJhbWUiLCJmbiIsInNldE5leHRGcmFtZSIsIm9iaiIsInByb3AiLCJ2YWwiLCJ1cGRhdGVTdHlsZSIsIm9sZFN0eWxlIiwic3R5bGUiLCJvbGRIYXNEZWwiLCJkZWxheWVkIiwiYXBwbHlEZXN0cm95U3R5bGUiLCJhcHBseVJlbW92ZVN0eWxlIiwiaWR4IiwibWF4RHVyIiwiY29tcFN0eWxlIiwiYW1vdW50IiwiYXBwbGllZCIsImdldENvbXB1dGVkU3R5bGUiLCJhZGRFdmVudExpc3RlbmVyIiwiZXYiLCJ0YXJnZXQiLCJpbnZva2VIYW5kbGVyIiwiaGFuZGxlciIsImV2ZW50IiwiY2FsbCIsImFyZ3MiLCJhcHBseSIsImhhbmRsZUV2ZW50IiwidHlwZSIsIm9uIiwiY3JlYXRlTGlzdGVuZXIiLCJ1cGRhdGVFdmVudExpc3RlbmVycyIsIm9sZE9uIiwib2xkTGlzdGVuZXIiLCJsaXN0ZW5lciIsIm9sZEVsbSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJnbG9iYWwiLCJmYWN0b3J5IiwiZXhwb3J0cyIsIm1vZHVsZSIsImRlZmluZSIsImFtZCIsIktlZmlyIiwidGhpcyIsImNyZWF0ZU9iaiIsInByb3RvIiwiRiIsInByb3RvdHlwZSIsImV4dGVuZCIsImFyZ3VtZW50cyIsImluaGVyaXQiLCJDaGlsZCIsIlBhcmVudCIsImNvbnN0cnVjdG9yIiwiTk9USElORyIsIkVORCIsIlZBTFVFIiwiRVJST1IiLCJBTlkiLCJjb25jYXQiLCJhIiwicmVzdWx0IiwiZmluZCIsImFyciIsInZhbHVlIiwiZmluZEJ5UHJlZCIsInByZWQiLCJjbG9uZUFycmF5IiwiaW5wdXQiLCJpbmRleCIsImZvckVhY2giLCJmaWxsQXJyYXkiLCJjb250YWlucyIsInNsaWRlIiwibmV4dCIsIm1heCIsIm9mZnNldCIsImNhbGxTdWJzY3JpYmVyIiwiRGlzcGF0Y2hlciIsIl9pdGVtcyIsIl9zcGllcyIsIl9pbkxvb3AiLCJfcmVtb3ZlZEl0ZW1zIiwieCIsInNwaWVzIiwiX2kiLCJpdGVtcyIsIk9ic2VydmFibGUiLCJfZGlzcGF0Y2hlciIsIl9hY3RpdmUiLCJfYWxpdmUiLCJfYWN0aXZhdGluZyIsIl9sb2dIYW5kbGVycyIsIl9zcHlIYW5kbGVycyIsImFjdGl2ZSIsIl9vbkFjdGl2YXRpb24iLCJfb25EZWFjdGl2YXRpb24iLCJfc2V0QWN0aXZlIiwiY2xlYW51cCIsIl9lbWl0VmFsdWUiLCJfZW1pdEVycm9yIiwiX2VtaXRFbmQiLCJkaXNwYXRjaCIsIl9jbGVhciIsImFkZCIsImNvdW50IiwiX29uIiwiX29mZiIsIm9ic2VydmVyT3JPblZhbHVlIiwib25FcnJvciIsIm9uRW5kIiwiX3RoaXMiLCJjbG9zZWQiLCJvYnNlcnZlciIsImVycm9yIiwiZW5kIiwib25BbnkiLCJvZmZBbnkiLCJBIiwiQiIsImdldFR5cGUiLCJzb3VyY2VPYnMiLCJzZWxmTmFtZSIsIl9uYW1lIiwidG9TdHJpbmciLCJpc0N1cnJlbnQiLCJsb2ciLCJoYW5kbGVySW5kZXgiLCJzcGxpY2UiLCJhZGRTcHkiLCJyZW1vdmVTcHkiLCJTdHJlYW0iLCJQcm9wZXJ0eSIsIl9jdXJyZW50RXZlbnQiLCJuZXZlclMiLCJuZXZlciIsInRpbWVCYXNlZCIsIm1peGluIiwiQW5vbnltb3VzU3RyZWFtIiwid2FpdCIsIm9wdGlvbnMiLCJfd2FpdCIsIl9pbnRlcnZhbElkIiwiXyRvblRpY2siLCJfb25UaWNrIiwiX2luaXQiLCJzZXRJbnRlcnZhbCIsIl9mcmVlIiwiUyIsIl9yZWYiLCJfeCIsImxhdGVyIiwiUyQxIiwiaW50ZXJ2YWwiLCJTJDIiLCJ4cyIsIl94cyIsInNoaWZ0Iiwic2VxdWVudGlhbGx5IiwiUyQzIiwiX2ZuIiwiZnJvbVBvbGwiLCJlbWl0dGVyIiwib2JzIiwiZSIsIl9lbWl0IiwiUyQ0IiwiX2VtaXR0ZXIiLCJ3aXRoSW50ZXJ2YWwiLCJTJDUiLCJfdW5zdWJzY3JpYmUiLCJ1bnN1YnNjcmliZSIsIl9jYWxsVW5zdWJzY3JpYmUiLCJzdHJlYW0iLCJmcm9tQ2FsbGJhY2siLCJjYWxsYmFja0NvbnN1bWVyIiwiY2FsbGVkIiwiZW1pdCIsInNldE5hbWUiLCJmcm9tTm9kZUNhbGxiYWNrIiwic3ByZWFkIiwiYUxlbmd0aCIsImZyb21TdWJVbnN1YiIsInN1YiIsInVuc3ViIiwidHJhbnNmb3JtZXIiLCJwYWlycyIsImZyb21FdmVudHMiLCJldmVudE5hbWUiLCJFcnJvciIsIlAiLCJjdXJyZW50IiwiY29uc3RhbnQiLCJQJDEiLCJjb25zdGFudEVycm9yIiwiY3JlYXRlQ29uc3RydWN0b3IiLCJCYXNlQ2xhc3MiLCJBbm9ueW1vdXNPYnNlcnZhYmxlIiwic291cmNlIiwiX3NvdXJjZSIsIl8kaGFuZGxlQW55IiwiX2hhbmRsZUFueSIsImNyZWF0ZUNsYXNzTWV0aG9kcyIsIl9oYW5kbGVWYWx1ZSIsIl9oYW5kbGVFcnJvciIsIl9oYW5kbGVFbmQiLCJjcmVhdGVTdHJlYW0iLCJjcmVhdGVQcm9wZXJ0eSIsIlAkMiIsIl9nZXRJbml0aWFsQ3VycmVudCIsImdldEluaXRpYWwiLCJ0b1Byb3BlcnR5IiwiUyQ2IiwiY2hhbmdlcyIsImZyb21Qcm9taXNlIiwicHJvbWlzZSIsIm9uVmFsdWUiLCJfcHJvbWlzZSIsInRoZW4iLCJkb25lIiwiZ2V0R2xvZGFsUHJvbWlzZSIsIlByb21pc2UiLCJ0b1Byb21pc2UiLCJsYXN0IiwicmVzb2x2ZSIsInJlamVjdCIsImNvbW1vbmpzR2xvYmFsIiwic2VsZiIsImNyZWF0ZUNvbW1vbmpzTW9kdWxlIiwicG9ueWZpbGwiLCJkZWZpbmVQcm9wZXJ0eSIsInN5bWJvbE9ic2VydmFibGVQb255ZmlsbCIsInJvb3QiLCJfU3ltYm9sIiwiU3ltYm9sIiwib2JzZXJ2YWJsZSIsInJlcXVpcmUkJDAkMSIsImluZGV4JDEiLCJfcG9ueWZpbGwiLCJfcG9ueWZpbGwyIiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsIl9fZXNNb2R1bGUiLCIkJG9ic2VydmFibGUiLCJmcm9tRVNPYnNlcnZhYmxlIiwiX29ic2VydmFibGUiLCJzdWJzY3JpYmUiLCJFU09ic2VydmFibGUiLCJ0YWtlRXJyb3JzIiwib2JzZXJ2ZXJPck9uTmV4dCIsIm9uQ29tcGxldGUiLCJjb21wbGV0ZSIsInN1YnNjcmlwdGlvbiIsInRvRVNPYnNlcnZhYmxlIiwiZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IiLCJlcnJvcnMiLCJsYXRlc3RFcnJvciIsIkNvbWJpbmUiLCJwYXNzaXZlIiwiY29tYmluYXRvciIsIl9hY3RpdmVDb3VudCIsIl9zb3VyY2VzIiwiX2NvbWJpbmF0b3IiLCJfYWxpdmVDb3VudCIsIl9sYXRlc3RWYWx1ZXMiLCJfbGF0ZXN0RXJyb3JzIiwiX2VtaXRBZnRlckFjdGl2YXRpb24iLCJfZW5kQWZ0ZXJBY3RpdmF0aW9uIiwiX2xhdGVzdEVycm9ySW5kZXgiLCJfJGhhbmRsZXJzIiwiX2xvb3AiLCJfZW1pdElmRnVsbCIsImhhc0FsbFZhbHVlcyIsImhhc0Vycm9ycyIsInZhbHVlc0NvcHkiLCJlcnJvcnNDb3B5IiwiY29tYmluZSIsIk9ic2VydmFibGUkMSIsIm1lcmdlIiwiZm5FcnIiLCJmblZhbCIsIm1hcEVycm9ycyIsIm9ic0ZuIiwib2JzVmFsIiwiZmxhdE1hcCIsInN0YXRpY0xhbmQiLCJPYmplY3QiLCJmcmVlemUiLCJTJDciLCJQJDMiLCJtYXAkMSIsIl9vZlNhbWVUeXBlIiwibWl4aW4kMSIsIlMkOCIsIlAkNCIsImlkJDEiLCJmaWx0ZXIiLCJtaXhpbiQyIiwibiIsIl9uIiwiUyQ5IiwiUCQ1IiwidGFrZSIsIm1peGluJDMiLCJTJDEwIiwiUCQ2IiwibWl4aW4kNCIsIlMkMTEiLCJQJDciLCJpZCQyIiwidGFrZVdoaWxlIiwibWl4aW4kNSIsIl9sYXN0VmFsdWUiLCJTJDEyIiwiUCQ4IiwibWl4aW4kNiIsIlMkMTMiLCJQJDkiLCJza2lwIiwibWl4aW4kNyIsIlMkMTQiLCJQJDEwIiwiaWQkMyIsInNraXBXaGlsZSIsIm1peGluJDgiLCJfcHJldiIsIlMkMTUiLCJQJDExIiwiZXEiLCJza2lwRHVwbGljYXRlcyIsIm1peGluJDkiLCJzZWVkIiwiUyQxNiIsIlAkMTIiLCJkZWZhdWx0Rm4iLCJkaWZmIiwiUCQxMyIsIl9zZWVkIiwic2NhbiIsIm1peGluJDEwIiwiUyQxNyIsImlkJDQiLCJmbGF0dGVuIiwiRU5EX01BUktFUiIsIm1peGluJDExIiwiX2J1ZmYiLCJfJHNoaWZ0QnVmZiIsIlMkMTgiLCJQJDE0IiwiZGVsYXkiLCJub3ciLCJEYXRlIiwiZ2V0VGltZSIsIm1peGluJDEyIiwibGVhZGluZyIsInRyYWlsaW5nIiwiX2xlYWRpbmciLCJfdHJhaWxpbmciLCJfdHJhaWxpbmdWYWx1ZSIsIl90aW1lb3V0SWQiLCJfZW5kTGF0ZXIiLCJfbGFzdENhbGxUaW1lIiwiXyR0cmFpbGluZ0NhbGwiLCJfdHJhaWxpbmdDYWxsIiwiY3VyVGltZSIsInJlbWFpbmluZyIsIl9jYW5jZWxUcmFpbGluZyIsIlMkMTkiLCJQJDE1IiwidGhyb3R0bGUiLCJfcmVmMiIsIl9yZWYyJGxlYWRpbmciLCJfcmVmMiR0cmFpbGluZyIsIm1peGluJDEzIiwiaW1tZWRpYXRlIiwiX2ltbWVkaWF0ZSIsIl9sYXN0QXR0ZW1wdCIsIl9sYXRlclZhbHVlIiwiXyRsYXRlciIsIl9sYXRlciIsIlMkMjAiLCJQJDE2IiwiZGVib3VuY2UiLCJfcmVmMiRpbW1lZGlhdGUiLCJtaXhpbiQxNCIsIlMkMjEiLCJQJDE3IiwiaWQkNSIsIm1peGluJDE1IiwiUyQyMiIsIlAkMTgiLCJpZCQ2IiwiZmlsdGVyRXJyb3JzIiwibWl4aW4kMTYiLCJTJDIzIiwiUCQxOSIsImlnbm9yZVZhbHVlcyIsIm1peGluJDE3IiwiUyQyNCIsIlAkMjAiLCJpZ25vcmVFcnJvcnMiLCJtaXhpbiQxOCIsIlMkMjUiLCJQJDIxIiwiaWdub3JlRW5kIiwibWl4aW4kMTkiLCJTJDI2IiwiUCQyMiIsImJlZm9yZUVuZCIsIm1peGluJDIwIiwiX21heCIsIl9taW4iLCJTJDI3IiwiUCQyMyIsInNsaWRpbmdXaW5kb3ciLCJtaXhpbiQyMSIsImZsdXNoT25FbmQiLCJfZmx1c2hPbkVuZCIsIl9mbHVzaCIsIlMkMjgiLCJQJDI0IiwiaWQkNyIsImJ1ZmZlcldoaWxlIiwiX3JlZjIkZmx1c2hPbkVuZCIsIm1peGluJDIyIiwiX2NvdW50IiwiUyQyOSIsIlAkMjUiLCJidWZmZXJXaGlsZSQxIiwibWl4aW4kMjMiLCJTJDMwIiwiUCQyNiIsImJ1ZmZlcldpdGhUaW1lT3JDb3VudCIsInhmb3JtRm9yT2JzIiwicmVzIiwibWl4aW4kMjQiLCJ0cmFuc2R1Y2VyIiwiX3hmb3JtIiwiUyQzMSIsIlAkMjciLCJ0cmFuc2R1Y2UiLCJtaXhpbiQyNSIsIl9oYW5kbGVyIiwiUyQzMiIsIlAkMjgiLCJ3aXRoSGFuZGxlciIsIlppcCIsInNvdXJjZXMiLCJfYnVmZmVycyIsIl9pc0Z1bGwiLCJ2YWx1ZXMiLCJ6aXAiLCJvYnNlcnZhYmxlcyIsImlkJDgiLCJBYnN0cmFjdFBvb2wiLCJfcmVmJHF1ZXVlTGltIiwicXVldWVMaW0iLCJfcmVmJGNvbmN1ckxpbSIsImNvbmN1ckxpbSIsIl9yZWYkZHJvcCIsImRyb3AiLCJfcXVldWVMaW0iLCJfY29uY3VyTGltIiwiX2Ryb3AiLCJfcXVldWUiLCJfY3VyU291cmNlcyIsIl8kaGFuZGxlU3ViQW55IiwiX2hhbmRsZVN1YkFueSIsIl8kZW5kSGFuZGxlcnMiLCJfY3VycmVudGx5QWRkaW5nIiwidG9PYnMiLCJfYWRkVG9DdXIiLCJfYWRkVG9RdWV1ZSIsIl9yZW1vdmVPbGRlc3QiLCJfYWRkIiwib2JzcyIsIl90aGlzMiIsIl9yZW1vdmVDdXIiLCJfcmVtb3ZlUXVldWUiLCJfc3ViVG9FbmQiLCJfdGhpczMiLCJvbkVuZEkiLCJvZmZFbmQiLCJfcHVsbFF1ZXVlIiwiX29uRW1wdHkiLCJfc3Vic2NyaWJlIiwiTWVyZ2UiLCJfYWRkQWxsIiwiX2luaXRpYWxpc2VkIiwiUyQzMyIsImdlbmVyYXRvciIsIl9nZW5lcmF0b3IiLCJfaXRlcmF0aW9uIiwiX2dldFNvdXJjZSIsInJlcGVhdCIsImNvbmNhdCQxIiwiUG9vbCIsIl9yZW1vdmUiLCJGbGF0TWFwIiwiX21haW5FbmRlZCIsIl9sYXN0Q3VycmVudCIsIl8kaGFuZGxlTWFpbiIsIl9oYW5kbGVNYWluIiwiX2hhZE5vRXZTaW5jZURlYWN0Iiwic2FtZUN1cnIiLCJfaXNFbXB0eSIsIkZsYXRNYXBFcnJvcnMiLCJjcmVhdGVDb25zdHJ1Y3RvciQxIiwicHJpbWFyeSIsInNlY29uZGFyeSIsIl9wcmltYXJ5IiwiX3NlY29uZGFyeSIsIl9sYXN0U2Vjb25kYXJ5IiwiXyRoYW5kbGVTZWNvbmRhcnlBbnkiLCJfaGFuZGxlU2Vjb25kYXJ5QW55IiwiXyRoYW5kbGVQcmltYXJ5QW55IiwiX2hhbmRsZVByaW1hcnlBbnkiLCJjcmVhdGVDbGFzc01ldGhvZHMkMSIsIl9oYW5kbGVQcmltYXJ5VmFsdWUiLCJfaGFuZGxlUHJpbWFyeUVycm9yIiwiX2hhbmRsZVByaW1hcnlFbmQiLCJfaGFuZGxlU2Vjb25kYXJ5VmFsdWUiLCJfaGFuZGxlU2Vjb25kYXJ5RXJyb3IiLCJfaGFuZGxlU2Vjb25kYXJ5RW5kIiwiX3JlbW92ZVNlY29uZGFyeSIsImNyZWF0ZVN0cmVhbSQxIiwiY3JlYXRlUHJvcGVydHkkMSIsIm1peGluJDI2IiwiUyQzNCIsIlAkMjkiLCJmaWx0ZXJCeSIsImlkMiIsIl8iLCJzYW1wbGVkQnkiLCJtaXhpbiQyNyIsIlMkMzUiLCJQJDMwIiwic2tpcFVudGlsQnkiLCJtaXhpbiQyOCIsIlMkMzYiLCJQJDMxIiwidGFrZVVudGlsQnkiLCJtaXhpbiQyOSIsIl9yZWYkZmx1c2hPbkVuZCIsIlMkMzciLCJQJDMyIiwiYnVmZmVyQnkiLCJtaXhpbiQzMCIsIl9yZWYkZmx1c2hPbkNoYW5nZSIsImZsdXNoT25DaGFuZ2UiLCJfZmx1c2hPbkNoYW5nZSIsIlMkMzgiLCJQJDMzIiwiYnVmZmVyV2hpbGVCeSIsImYiLCJ0IiwiYXdhaXRpbmciLCJtaXhpbiQzMSIsImNvbnZlcnQiLCJTJDM5IiwiUCQzNCIsImRlZkZuIiwidmFsdWVzVG9FcnJvcnMiLCJtaXhpbiQzMiIsIlMkNDAiLCJQJDM1IiwiZGVmRm4kMSIsImVycm9yc1RvVmFsdWVzIiwibWl4aW4kMzMiLCJTJDQxIiwiUCQzNiIsImVuZE9uRXJyb3IiLCJidWZmZXJXaXRoQ291bnQiLCJvdGhlciIsInBvb2wiLCJmbGF0TWFwTGF0ZXN0IiwiZmxhdE1hcEZpcnN0IiwiZmxhdE1hcENvbmNhdCIsImZsYXRNYXBDb25jdXJMaW1pdCIsImxpbWl0IiwiZmxhdE1hcEVycm9ycyIsIkRFUFJFQ0FUSU9OX1dBUk5JTkdTIiwiZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzIiwid2FybiIsIm1zZyIsImNvbnNvbGUiLCJtc2cyIiwiYnVzIiwiY29udmVydFRvSHlwZXJTY3JpcHQiLCJyZW5kZXIiLCJ2aWV3JCIsImNvbnRhaW5lciIsInBhdGNoIiwic25hYmJkb20iLCJzbmFiQ2xhc3MiLCJzbmFiUHJvcHMiLCJzbmFiU3R5bGUiLCJzbmFiRXZlbnQiLCJuZXdWbm9kZSIsImFjdGlvbnMkIiwiZ2V0RnJvbVN0b3JhZ2UiLCJqc29uIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsIkpTT04iLCJwYXJzZSIsImdldEZpbHRlckZyb21IYXNoIiwibG9jYXRpb24iLCJpbml0TW9kZWwiLCJhbGxDb21wbGV0ZWQiLCJ1aWQiLCJtb2RlbCIsImFjdGlvbiIsIm5ld0l0ZW1zIiwibmV3SXRlbSIsIml0ZW0iLCJjb21wbGV0ZWQiLCJhbGxJdGVtc0NvbXBsZXRlZCIsImVkaXRpbmciLCJmaW5kSW5kZXgiLCJyZW1vdmVJdGVtIiwibmV3QWxsQ29tcGxldGVkIiwiZXZlcnkiLCJ2aWV3IiwibnVtSXRlbXMiLCJ2IiwicGxhY2Vob2xkZXIiLCJhdXRvZm9jdXMiLCJoYW5kbGVJbnB1dCIsImtleWRvd24iLCJvbkVudGVyIiwibWFpbiIsImZvb3RlciIsImluZm8iLCJ0cmltIiwiY29kZSIsImlzVmlzaWJsZSIsImNoZWNrZWQiLCJjbGljayIsInRvZ2dsZUFsbCIsImh0bWxGb3IiLCJ2aWV3SXRlbSIsImNoZWNrYm94Q2xpY2siLCJkYmxjbGljayIsIml0ZW1DbGljayIsImRlc3Ryb3lDbGljayIsIm9uRWRpdERvbmUiLCJibHVyIiwib25CbHVyIiwiZm9jdXNFbGVtZW50IiwiZm9jdXMiLCJudW1VbmNvbXBsZXRlZCIsIm51bUNvbXBsZXRlZCIsIm51bUxlZnQiLCJudW1Eb25lIiwidmlld0ZpbHRlciIsImNsZWFyQ29tcGxldGVkIiwiaHJlZiIsImN1cnJlbnRGaWx0ZXIiLCJzZWxlY3RlZCIsIm1vZGVsJCIsImRpc2FibGVFZGl0aW5nIiwic2V0SXRlbSIsInN0cmluZ2lmeSIsImNoYW5nZUZpbHRlciIsIm9uaGFzaGNoYW5nZSIsImdldEVsZW1lbnRCeUlkIl0sIm1hcHBpbmdzIjoiQUFBQSxZQUFpQixVQUFTQSxHQUFULEVBQWNDLElBQWQsRUFBb0JDLFFBQXBCLEVBQThCQyxJQUE5QixFQUFvQ0MsR0FBcEMsRUFBeUM7TUFDcERDLE1BQU1KLFNBQVNLLFNBQVQsR0FBcUJBLFNBQXJCLEdBQWlDTCxLQUFLSSxHQUFoRDtTQUNPLEVBQUNMLEtBQUtBLEdBQU4sRUFBV0MsTUFBTUEsSUFBakIsRUFBdUJDLFVBQVVBLFFBQWpDO1VBQ09DLElBRFAsRUFDYUMsS0FBS0EsR0FEbEIsRUFDdUJDLEtBQUtBLEdBRDVCLEVBQVA7Q0FGRjs7QUNBQSxXQUFpQjtTQUNSRSxNQUFNQyxPQURFO2FBRUosVUFBU0MsQ0FBVCxFQUFZO1dBQVMsT0FBT0EsQ0FBUCxLQUFhLFFBQWIsSUFBeUIsT0FBT0EsQ0FBUCxLQUFhLFFBQTdDOztDQUYzQjs7QUNBQSxTQUFTQyxhQUFULENBQXVCQyxPQUF2QixFQUErQjtTQUN0QkMsU0FBU0YsYUFBVCxDQUF1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
