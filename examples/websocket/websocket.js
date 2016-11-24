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
  let [sel, data, children] = node;

  if (Array.isArray(children)) {
    return h(sel, data, children.map(convertToHyperScript));
  } else {
    return h.apply(null, node);
  }
}

function render(view$, container) {
  let patch = snabbdom.init([_class, props, style, eventlisteners]);
  let vnode = container;

  view$.map(convertToHyperScript).onValue(newVnode => {
    patch(vnode, newVnode);
    vnode = newVnode;
  });
}

var isWebSocket = function (constructor) {
    return constructor && constructor.CLOSING === 2;
};
var isGlobalWebSocket = function () {
    return typeof WebSocket !== 'undefined' && isWebSocket(WebSocket);
};
var getDefaultOptions = function () {
    return {
        constructor: isGlobalWebSocket() ? WebSocket : null,
        maxReconnectionDelay: 10000,
        minReconnectionDelay: 1500,
        reconnectionDelayGrowFactor: 1.3,
        connectionTimeout: 4000,
        maxRetries: Infinity,
        debug: false
    };
};
var bypassProperty = function (src, dst, name) {
    Object.defineProperty(dst, name, {
        get: function () {
            return src[name];
        },
        set: function (value) {
            src[name] = value;
        },
        enumerable: true,
        configurable: true
    });
};
var initReconnectionDelay = function (config) {
    return config.minReconnectionDelay + Math.random() * config.minReconnectionDelay;
};
var updateReconnectionDelay = function (config, previousDelay) {
    var newDelay = previousDelay * config.reconnectionDelayGrowFactor;
    return newDelay > config.maxReconnectionDelay ? config.maxReconnectionDelay : newDelay;
};
var LEVEL_0_EVENTS = ['onopen', 'onclose', 'onmessage', 'onerror'];
var reassignEventListeners = function (ws, oldWs, listeners) {
    Object.keys(listeners).forEach(function (type) {
        listeners[type].forEach(function (_a) {
            var listener = _a[0],
                options = _a[1];
            ws.addEventListener(type, listener, options);
        });
    });
    if (oldWs) {
        LEVEL_0_EVENTS.forEach(function (name) {
            ws[name] = oldWs[name];
        });
    }
};
var ReconnectingWebsocket = function (url, protocols, options) {
    var _this = this;
    if (options === void 0) {
        options = {};
    }
    var ws;
    var connectingTimeout;
    var reconnectDelay = 0;
    var retriesCount = 0;
    var shouldRetry = true;
    var savedOnClose = null;
    var listeners = {};
    // require new to construct
    if (!(this instanceof ReconnectingWebsocket)) {
        throw new TypeError("Failed to construct 'ReconnectingWebSocket': Please use the 'new' operator");
    }
    // Set config. Not using `Object.assign` because of IE11
    var config = getDefaultOptions();
    Object.keys(config).filter(function (key) {
        return options.hasOwnProperty(key);
    }).forEach(function (key) {
        return config[key] = options[key];
    });
    if (!isWebSocket(config.constructor)) {
        throw new TypeError('Invalid WebSocket constructor. Set `options.constructor`');
    }
    var log = config.debug ? function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i - 0] = arguments[_i];
        }
        return console.log.apply(console, ['RWS:'].concat(params));
    } : function () {};
    /**
     * Not using dispatchEvent, otherwise we must use a DOM Event object
     * Deferred because we want to handle the close event before this
     */
    var emitError = function (code, msg) {
        return setTimeout(function () {
            var err = new Error(msg);
            err.code = code;
            if (Array.isArray(listeners.error)) {
                listeners.error.forEach(function (_a) {
                    var fn = _a[0];
                    return fn(err);
                });
            }
            if (ws.onerror) {
                ws.onerror(err);
            }
        }, 0);
    };
    var handleClose = function () {
        log('close');
        retriesCount++;
        log('retries count:', retriesCount);
        if (retriesCount > config.maxRetries) {
            emitError('EHOSTDOWN', 'Too many failed connection attempts');
            return;
        }
        if (!reconnectDelay) {
            reconnectDelay = initReconnectionDelay(config);
        } else {
            reconnectDelay = updateReconnectionDelay(config, reconnectDelay);
        }
        log('reconnectDelay:', reconnectDelay);
        if (shouldRetry) {
            setTimeout(connect, reconnectDelay);
        }
    };
    var connect = function () {
        log('connect');
        var oldWs = ws;
        ws = new config.constructor(url, protocols);
        connectingTimeout = setTimeout(function () {
            log('timeout');
            ws.close();
            emitError('ETIMEDOUT', 'Connection timeout');
        }, config.connectionTimeout);
        log('bypass properties');
        for (var key in ws) {
            // @todo move to constant
            if (['addEventListener', 'removeEventListener', 'close', 'send'].indexOf(key) < 0) {
                bypassProperty(ws, _this, key);
            }
        }
        ws.addEventListener('open', function () {
            clearTimeout(connectingTimeout);
            log('open');
            reconnectDelay = initReconnectionDelay(config);
            log('reconnectDelay:', reconnectDelay);
            retriesCount = 0;
        });
        ws.addEventListener('close', handleClose);
        reassignEventListeners(ws, oldWs, listeners);
        // because when closing with fastClose=true, it is saved and set to null to avoid double calls
        ws.onclose = ws.onclose || savedOnClose;
        savedOnClose = null;
    };
    log('init');
    connect();
    this.close = function (code, reason, _a) {
        if (code === void 0) {
            code = 1000;
        }
        if (reason === void 0) {
            reason = '';
        }
        var _b = _a === void 0 ? {} : _a,
            _c = _b.keepClosed,
            keepClosed = _c === void 0 ? false : _c,
            _d = _b.fastClose,
            fastClose = _d === void 0 ? true : _d,
            _e = _b.delay,
            delay = _e === void 0 ? 0 : _e;
        if (delay) {
            reconnectDelay = delay;
        }
        shouldRetry = !keepClosed;
        ws.close(code, reason);
        if (fastClose) {
            var fakeCloseEvent_1 = {
                code: code,
                reason: reason,
                wasClean: true
            };
            // execute close listeners soon with a fake closeEvent
            // and remove them from the WS instance so they
            // don't get fired on the real close.
            handleClose();
            ws.removeEventListener('close', handleClose);
            // run and remove level2
            if (Array.isArray(listeners.close)) {
                listeners.close.forEach(function (_a) {
                    var listener = _a[0],
                        options = _a[1];
                    listener(fakeCloseEvent_1);
                    ws.removeEventListener('close', listener, options);
                });
            }
            // run and remove level0
            if (ws.onclose) {
                savedOnClose = ws.onclose;
                ws.onclose(fakeCloseEvent_1);
                ws.onclose = null;
            }
        }
    };
    this.send = function (data) {
        ws.send(data);
    };
    this.addEventListener = function (type, listener, options) {
        if (Array.isArray(listeners[type])) {
            if (!listeners[type].some(function (_a) {
                var l = _a[0];
                return l === listener;
            })) {
                listeners[type].push([listener, options]);
            }
        } else {
            listeners[type] = [[listener, options]];
        }
        ws.addEventListener(type, listener, options);
    };
    this.removeEventListener = function (type, listener, options) {
        if (Array.isArray(listeners[type])) {
            listeners[type] = listeners[type].filter(function (_a) {
                var l = _a[0];
                return l !== listener;
            });
        }
        ws.removeEventListener(type, listener, options);
    };
};
var index$1 = ReconnectingWebsocket;

// Streams
let actions$ = bus();
let socketOutgoing$ = bus();

// Model
let initModel = { text: '', messages: [], connected: false };

// Update
function update(model, [action, value]) {
  let { text, messages, connected } = model;

  switch (action) {
    case 'message':
      return Object.assign({}, model, { messages: [...messages, value] });
    case 'changeText':
      return Object.assign({}, model, { text: value });
    case 'clearText':
      return Object.assign({}, model, { text: '' });
    case 'connected':
      return Object.assign({}, model, { connected: value });
  }
}

// View
function view({ text, messages, connected }) {
  let v = ['div', {}, [['input', { props: { placeholder: 'Send message', value: text }, on: { input: handleInput } }], ['button', { props: { disabled: !connected }, on: { click: [handleClick, text] } }, 'Send'], ['span', {}, connected ? '' : ' Connecting...'], ['div', { style: { paddingTop: '7px' } }, messages.map(displayMessage)]]];

  return v;
}

function displayMessage(msg) {
  return ['div', {}, msg];
}

function handleInput(e) {
  let value = e.target.value.trim();
  actions$.emit(['changeText', value]);
}

function handleClick(text) {
  actions$.emit(['clearText']);
  socketOutgoing$.emit(text);
}

// Websocket
let ws = new index$1('wss://echo.websocket.org');

let online$ = Kefir.fromPoll(500, () => navigator.onLine).skipDuplicates();

let socketConnected$ = Kefir.stream(emitter => {
  ws.onopen = () => emitter.emit(true);
  ws.onclose = () => emitter.emit(false);
});

let connected$ = socketConnected$.combine(online$, (connected, online) => connected && online).toProperty(() => false);

socketOutgoing$.filterBy(connected$).onValue(ws.send);

let socketIncoming$ = Kefir.stream(emitter => {
  ws.onmessage = emitter.emit;
});

let effects$ = socketIncoming$.map(msgEvent => ['message', msgEvent.data]).merge(connected$.map(connected => ['connected', connected]));
effects$.log('Effects');

// Reduce
let model$ = actions$.merge(effects$).scan(update, initModel);
model$.log('Model');

// Render
let view$ = model$.map(view);
render(view$, document.getElementById('container'));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS92bm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9pcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9odG1sZG9tYXBpLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL3NuYWJiZG9tLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9jbGFzcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9rZWZpci9kaXN0L2tlZmlyLmpzIiwiLi4vLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3JlY29ubmVjdGluZy13ZWJzb2NrZXQvZGlzdC9pbmRleC5qcyIsImluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2VsLCBkYXRhLCBjaGlsZHJlbiwgdGV4dCwgZWxtKSB7XG4gIHZhciBrZXkgPSBkYXRhID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBkYXRhLmtleTtcbiAgcmV0dXJuIHtzZWw6IHNlbCwgZGF0YTogZGF0YSwgY2hpbGRyZW46IGNoaWxkcmVuLFxuICAgICAgICAgIHRleHQ6IHRleHQsIGVsbTogZWxtLCBrZXk6IGtleX07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFycmF5OiBBcnJheS5pc0FycmF5LFxuICBwcmltaXRpdmU6IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIHR5cGVvZiBzID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgcyA9PT0gJ251bWJlcic7IH0sXG59O1xuIiwiZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWdOYW1lKXtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIHF1YWxpZmllZE5hbWUpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgcXVhbGlmaWVkTmFtZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRleHROb2RlKHRleHQpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG59XG5cblxuZnVuY3Rpb24gaW5zZXJ0QmVmb3JlKHBhcmVudE5vZGUsIG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpe1xuICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCByZWZlcmVuY2VOb2RlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVDaGlsZChub2RlLCBjaGlsZCl7XG4gIG5vZGUucmVtb3ZlQ2hpbGQoY2hpbGQpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRDaGlsZChub2RlLCBjaGlsZCl7XG4gIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGQpO1xufVxuXG5mdW5jdGlvbiBwYXJlbnROb2RlKG5vZGUpe1xuICByZXR1cm4gbm9kZS5wYXJlbnRFbGVtZW50O1xufVxuXG5mdW5jdGlvbiBuZXh0U2libGluZyhub2RlKXtcbiAgcmV0dXJuIG5vZGUubmV4dFNpYmxpbmc7XG59XG5cbmZ1bmN0aW9uIHRhZ05hbWUobm9kZSl7XG4gIHJldHVybiBub2RlLnRhZ05hbWU7XG59XG5cbmZ1bmN0aW9uIHNldFRleHRDb250ZW50KG5vZGUsIHRleHQpe1xuICBub2RlLnRleHRDb250ZW50ID0gdGV4dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZUVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnQsXG4gIGNyZWF0ZUVsZW1lbnROUzogY3JlYXRlRWxlbWVudE5TLFxuICBjcmVhdGVUZXh0Tm9kZTogY3JlYXRlVGV4dE5vZGUsXG4gIGFwcGVuZENoaWxkOiBhcHBlbmRDaGlsZCxcbiAgcmVtb3ZlQ2hpbGQ6IHJlbW92ZUNoaWxkLFxuICBpbnNlcnRCZWZvcmU6IGluc2VydEJlZm9yZSxcbiAgcGFyZW50Tm9kZTogcGFyZW50Tm9kZSxcbiAgbmV4dFNpYmxpbmc6IG5leHRTaWJsaW5nLFxuICB0YWdOYW1lOiB0YWdOYW1lLFxuICBzZXRUZXh0Q29udGVudDogc2V0VGV4dENvbnRlbnRcbn07XG4iLCIvLyBqc2hpbnQgbmV3Y2FwOiBmYWxzZVxuLyogZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSwgZG9jdW1lbnQsIE5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFZOb2RlID0gcmVxdWlyZSgnLi92bm9kZScpO1xudmFyIGlzID0gcmVxdWlyZSgnLi9pcycpO1xudmFyIGRvbUFwaSA9IHJlcXVpcmUoJy4vaHRtbGRvbWFwaScpO1xuXG5mdW5jdGlvbiBpc1VuZGVmKHMpIHsgcmV0dXJuIHMgPT09IHVuZGVmaW5lZDsgfVxuZnVuY3Rpb24gaXNEZWYocykgeyByZXR1cm4gcyAhPT0gdW5kZWZpbmVkOyB9XG5cbnZhciBlbXB0eU5vZGUgPSBWTm9kZSgnJywge30sIFtdLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5cbmZ1bmN0aW9uIHNhbWVWbm9kZSh2bm9kZTEsIHZub2RlMikge1xuICByZXR1cm4gdm5vZGUxLmtleSA9PT0gdm5vZGUyLmtleSAmJiB2bm9kZTEuc2VsID09PSB2bm9kZTIuc2VsO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVLZXlUb09sZElkeChjaGlsZHJlbiwgYmVnaW5JZHgsIGVuZElkeCkge1xuICB2YXIgaSwgbWFwID0ge30sIGtleTtcbiAgZm9yIChpID0gYmVnaW5JZHg7IGkgPD0gZW5kSWR4OyArK2kpIHtcbiAgICBrZXkgPSBjaGlsZHJlbltpXS5rZXk7XG4gICAgaWYgKGlzRGVmKGtleSkpIG1hcFtrZXldID0gaTtcbiAgfVxuICByZXR1cm4gbWFwO1xufVxuXG52YXIgaG9va3MgPSBbJ2NyZWF0ZScsICd1cGRhdGUnLCAncmVtb3ZlJywgJ2Rlc3Ryb3knLCAncHJlJywgJ3Bvc3QnXTtcblxuZnVuY3Rpb24gaW5pdChtb2R1bGVzLCBhcGkpIHtcbiAgdmFyIGksIGosIGNicyA9IHt9O1xuXG4gIGlmIChpc1VuZGVmKGFwaSkpIGFwaSA9IGRvbUFwaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgaG9va3MubGVuZ3RoOyArK2kpIHtcbiAgICBjYnNbaG9va3NbaV1dID0gW107XG4gICAgZm9yIChqID0gMDsgaiA8IG1vZHVsZXMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmIChtb2R1bGVzW2pdW2hvb2tzW2ldXSAhPT0gdW5kZWZpbmVkKSBjYnNbaG9va3NbaV1dLnB1c2gobW9kdWxlc1tqXVtob29rc1tpXV0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVtcHR5Tm9kZUF0KGVsbSkge1xuICAgIHZhciBpZCA9IGVsbS5pZCA/ICcjJyArIGVsbS5pZCA6ICcnO1xuICAgIHZhciBjID0gZWxtLmNsYXNzTmFtZSA/ICcuJyArIGVsbS5jbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCcuJykgOiAnJztcbiAgICByZXR1cm4gVk5vZGUoYXBpLnRhZ05hbWUoZWxtKS50b0xvd2VyQ2FzZSgpICsgaWQgKyBjLCB7fSwgW10sIHVuZGVmaW5lZCwgZWxtKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVJtQ2IoY2hpbGRFbG0sIGxpc3RlbmVycykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLWxpc3RlbmVycyA9PT0gMCkge1xuICAgICAgICB2YXIgcGFyZW50ID0gYXBpLnBhcmVudE5vZGUoY2hpbGRFbG0pO1xuICAgICAgICBhcGkucmVtb3ZlQ2hpbGQocGFyZW50LCBjaGlsZEVsbSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIGksIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgIGlmIChpc0RlZihkYXRhKSkge1xuICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLmhvb2spICYmIGlzRGVmKGkgPSBpLmluaXQpKSB7XG4gICAgICAgIGkodm5vZGUpO1xuICAgICAgICBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGVsbSwgY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbiwgc2VsID0gdm5vZGUuc2VsO1xuICAgIGlmIChpc0RlZihzZWwpKSB7XG4gICAgICAvLyBQYXJzZSBzZWxlY3RvclxuICAgICAgdmFyIGhhc2hJZHggPSBzZWwuaW5kZXhPZignIycpO1xuICAgICAgdmFyIGRvdElkeCA9IHNlbC5pbmRleE9mKCcuJywgaGFzaElkeCk7XG4gICAgICB2YXIgaGFzaCA9IGhhc2hJZHggPiAwID8gaGFzaElkeCA6IHNlbC5sZW5ndGg7XG4gICAgICB2YXIgZG90ID0gZG90SWR4ID4gMCA/IGRvdElkeCA6IHNlbC5sZW5ndGg7XG4gICAgICB2YXIgdGFnID0gaGFzaElkeCAhPT0gLTEgfHwgZG90SWR4ICE9PSAtMSA/IHNlbC5zbGljZSgwLCBNYXRoLm1pbihoYXNoLCBkb3QpKSA6IHNlbDtcbiAgICAgIGVsbSA9IHZub2RlLmVsbSA9IGlzRGVmKGRhdGEpICYmIGlzRGVmKGkgPSBkYXRhLm5zKSA/IGFwaS5jcmVhdGVFbGVtZW50TlMoaSwgdGFnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogYXBpLmNyZWF0ZUVsZW1lbnQodGFnKTtcbiAgICAgIGlmIChoYXNoIDwgZG90KSBlbG0uaWQgPSBzZWwuc2xpY2UoaGFzaCArIDEsIGRvdCk7XG4gICAgICBpZiAoZG90SWR4ID4gMCkgZWxtLmNsYXNzTmFtZSA9IHNlbC5zbGljZShkb3QgKyAxKS5yZXBsYWNlKC9cXC4vZywgJyAnKTtcbiAgICAgIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgYXBpLmFwcGVuZENoaWxkKGVsbSwgY3JlYXRlRWxtKGNoaWxkcmVuW2ldLCBpbnNlcnRlZFZub2RlUXVldWUpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpcy5wcmltaXRpdmUodm5vZGUudGV4dCkpIHtcbiAgICAgICAgYXBpLmFwcGVuZENoaWxkKGVsbSwgYXBpLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpKTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMuY3JlYXRlLmxlbmd0aDsgKytpKSBjYnMuY3JlYXRlW2ldKGVtcHR5Tm9kZSwgdm5vZGUpO1xuICAgICAgaSA9IHZub2RlLmRhdGEuaG9vazsgLy8gUmV1c2UgdmFyaWFibGVcbiAgICAgIGlmIChpc0RlZihpKSkge1xuICAgICAgICBpZiAoaS5jcmVhdGUpIGkuY3JlYXRlKGVtcHR5Tm9kZSwgdm5vZGUpO1xuICAgICAgICBpZiAoaS5pbnNlcnQpIGluc2VydGVkVm5vZGVRdWV1ZS5wdXNoKHZub2RlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZWxtID0gdm5vZGUuZWxtID0gYXBpLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpO1xuICAgIH1cbiAgICByZXR1cm4gdm5vZGUuZWxtO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCB2bm9kZXMsIHN0YXJ0SWR4LCBlbmRJZHgsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIGZvciAoOyBzdGFydElkeCA8PSBlbmRJZHg7ICsrc3RhcnRJZHgpIHtcbiAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBjcmVhdGVFbG0odm5vZGVzW3N0YXJ0SWR4XSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSwgYmVmb3JlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbnZva2VEZXN0cm95SG9vayh2bm9kZSkge1xuICAgIHZhciBpLCBqLCBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICBpZiAoaXNEZWYoZGF0YSkpIHtcbiAgICAgIGlmIChpc0RlZihpID0gZGF0YS5ob29rKSAmJiBpc0RlZihpID0gaS5kZXN0cm95KSkgaSh2bm9kZSk7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLmRlc3Ryb3kubGVuZ3RoOyArK2kpIGNicy5kZXN0cm95W2ldKHZub2RlKTtcbiAgICAgIGlmIChpc0RlZihpID0gdm5vZGUuY2hpbGRyZW4pKSB7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCB2bm9kZS5jaGlsZHJlbi5sZW5ndGg7ICsraikge1xuICAgICAgICAgIGludm9rZURlc3Ryb3lIb29rKHZub2RlLmNoaWxkcmVuW2pdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIHZub2Rlcywgc3RhcnRJZHgsIGVuZElkeCkge1xuICAgIGZvciAoOyBzdGFydElkeCA8PSBlbmRJZHg7ICsrc3RhcnRJZHgpIHtcbiAgICAgIHZhciBpLCBsaXN0ZW5lcnMsIHJtLCBjaCA9IHZub2Rlc1tzdGFydElkeF07XG4gICAgICBpZiAoaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChpc0RlZihjaC5zZWwpKSB7XG4gICAgICAgICAgaW52b2tlRGVzdHJveUhvb2soY2gpO1xuICAgICAgICAgIGxpc3RlbmVycyA9IGNicy5yZW1vdmUubGVuZ3RoICsgMTtcbiAgICAgICAgICBybSA9IGNyZWF0ZVJtQ2IoY2guZWxtLCBsaXN0ZW5lcnMpO1xuICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucmVtb3ZlLmxlbmd0aDsgKytpKSBjYnMucmVtb3ZlW2ldKGNoLCBybSk7XG4gICAgICAgICAgaWYgKGlzRGVmKGkgPSBjaC5kYXRhKSAmJiBpc0RlZihpID0gaS5ob29rKSAmJiBpc0RlZihpID0gaS5yZW1vdmUpKSB7XG4gICAgICAgICAgICBpKGNoLCBybSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJtKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBUZXh0IG5vZGVcbiAgICAgICAgICBhcGkucmVtb3ZlQ2hpbGQocGFyZW50RWxtLCBjaC5lbG0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlQ2hpbGRyZW4ocGFyZW50RWxtLCBvbGRDaCwgbmV3Q2gsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIHZhciBvbGRTdGFydElkeCA9IDAsIG5ld1N0YXJ0SWR4ID0gMDtcbiAgICB2YXIgb2xkRW5kSWR4ID0gb2xkQ2gubGVuZ3RoIC0gMTtcbiAgICB2YXIgb2xkU3RhcnRWbm9kZSA9IG9sZENoWzBdO1xuICAgIHZhciBvbGRFbmRWbm9kZSA9IG9sZENoW29sZEVuZElkeF07XG4gICAgdmFyIG5ld0VuZElkeCA9IG5ld0NoLmxlbmd0aCAtIDE7XG4gICAgdmFyIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFswXTtcbiAgICB2YXIgbmV3RW5kVm5vZGUgPSBuZXdDaFtuZXdFbmRJZHhdO1xuICAgIHZhciBvbGRLZXlUb0lkeCwgaWR4SW5PbGQsIGVsbVRvTW92ZSwgYmVmb3JlO1xuXG4gICAgd2hpbGUgKG9sZFN0YXJ0SWR4IDw9IG9sZEVuZElkeCAmJiBuZXdTdGFydElkeCA8PSBuZXdFbmRJZHgpIHtcbiAgICAgIGlmIChpc1VuZGVmKG9sZFN0YXJ0Vm5vZGUpKSB7XG4gICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTsgLy8gVm5vZGUgaGFzIGJlZW4gbW92ZWQgbGVmdFxuICAgICAgfSBlbHNlIGlmIChpc1VuZGVmKG9sZEVuZFZub2RlKSkge1xuICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld1N0YXJ0Vm5vZGUpKSB7XG4gICAgICAgIHBhdGNoVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdO1xuICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRFbmRWbm9kZSwgbmV3RW5kVm5vZGUpKSB7XG4gICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgICAgbmV3RW5kVm5vZGUgPSBuZXdDaFstLW5ld0VuZElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRTdGFydFZub2RlLCBuZXdFbmRWbm9kZSkpIHsgLy8gVm5vZGUgbW92ZWQgcmlnaHRcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRTdGFydFZub2RlLCBuZXdFbmRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtLCBhcGkubmV4dFNpYmxpbmcob2xkRW5kVm5vZGUuZWxtKSk7XG4gICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTtcbiAgICAgICAgbmV3RW5kVm5vZGUgPSBuZXdDaFstLW5ld0VuZElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRFbmRWbm9kZSwgbmV3U3RhcnRWbm9kZSkpIHsgLy8gVm5vZGUgbW92ZWQgbGVmdFxuICAgICAgICBwYXRjaFZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgb2xkRW5kVm5vZGUuZWxtLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaXNVbmRlZihvbGRLZXlUb0lkeCkpIG9sZEtleVRvSWR4ID0gY3JlYXRlS2V5VG9PbGRJZHgob2xkQ2gsIG9sZFN0YXJ0SWR4LCBvbGRFbmRJZHgpO1xuICAgICAgICBpZHhJbk9sZCA9IG9sZEtleVRvSWR4W25ld1N0YXJ0Vm5vZGUua2V5XTtcbiAgICAgICAgaWYgKGlzVW5kZWYoaWR4SW5PbGQpKSB7IC8vIE5ldyBlbGVtZW50XG4gICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbShuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgICAgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWysrbmV3U3RhcnRJZHhdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVsbVRvTW92ZSA9IG9sZENoW2lkeEluT2xkXTtcbiAgICAgICAgICBwYXRjaFZub2RlKGVsbVRvTW92ZSwgbmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgICBvbGRDaFtpZHhJbk9sZF0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGVsbVRvTW92ZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9sZFN0YXJ0SWR4ID4gb2xkRW5kSWR4KSB7XG4gICAgICBiZWZvcmUgPSBpc1VuZGVmKG5ld0NoW25ld0VuZElkeCsxXSkgPyBudWxsIDogbmV3Q2hbbmV3RW5kSWR4KzFdLmVsbTtcbiAgICAgIGFkZFZub2RlcyhwYXJlbnRFbG0sIGJlZm9yZSwgbmV3Q2gsIG5ld1N0YXJ0SWR4LCBuZXdFbmRJZHgsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgfSBlbHNlIGlmIChuZXdTdGFydElkeCA+IG5ld0VuZElkeCkge1xuICAgICAgcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgb2xkQ2gsIG9sZFN0YXJ0SWR4LCBvbGRFbmRJZHgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhdGNoVm5vZGUob2xkVm5vZGUsIHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICB2YXIgaSwgaG9vaztcbiAgICBpZiAoaXNEZWYoaSA9IHZub2RlLmRhdGEpICYmIGlzRGVmKGhvb2sgPSBpLmhvb2spICYmIGlzRGVmKGkgPSBob29rLnByZXBhdGNoKSkge1xuICAgICAgaShvbGRWbm9kZSwgdm5vZGUpO1xuICAgIH1cbiAgICB2YXIgZWxtID0gdm5vZGUuZWxtID0gb2xkVm5vZGUuZWxtLCBvbGRDaCA9IG9sZFZub2RlLmNoaWxkcmVuLCBjaCA9IHZub2RlLmNoaWxkcmVuO1xuICAgIGlmIChvbGRWbm9kZSA9PT0gdm5vZGUpIHJldHVybjtcbiAgICBpZiAoIXNhbWVWbm9kZShvbGRWbm9kZSwgdm5vZGUpKSB7XG4gICAgICB2YXIgcGFyZW50RWxtID0gYXBpLnBhcmVudE5vZGUob2xkVm5vZGUuZWxtKTtcbiAgICAgIGVsbSA9IGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBlbG0sIG9sZFZub2RlLmVsbSk7XG4gICAgICByZW1vdmVWbm9kZXMocGFyZW50RWxtLCBbb2xkVm5vZGVdLCAwLCAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzRGVmKHZub2RlLmRhdGEpKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnVwZGF0ZS5sZW5ndGg7ICsraSkgY2JzLnVwZGF0ZVtpXShvbGRWbm9kZSwgdm5vZGUpO1xuICAgICAgaSA9IHZub2RlLmRhdGEuaG9vaztcbiAgICAgIGlmIChpc0RlZihpKSAmJiBpc0RlZihpID0gaS51cGRhdGUpKSBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICAgIGlmIChpc1VuZGVmKHZub2RlLnRleHQpKSB7XG4gICAgICBpZiAoaXNEZWYob2xkQ2gpICYmIGlzRGVmKGNoKSkge1xuICAgICAgICBpZiAob2xkQ2ggIT09IGNoKSB1cGRhdGVDaGlsZHJlbihlbG0sIG9sZENoLCBjaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChpc0RlZihvbGRWbm9kZS50ZXh0KSkgYXBpLnNldFRleHRDb250ZW50KGVsbSwgJycpO1xuICAgICAgICBhZGRWbm9kZXMoZWxtLCBudWxsLCBjaCwgMCwgY2gubGVuZ3RoIC0gMSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWYob2xkQ2gpKSB7XG4gICAgICAgIHJlbW92ZVZub2RlcyhlbG0sIG9sZENoLCAwLCBvbGRDaC5sZW5ndGggLSAxKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWYob2xkVm5vZGUudGV4dCkpIHtcbiAgICAgICAgYXBpLnNldFRleHRDb250ZW50KGVsbSwgJycpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob2xkVm5vZGUudGV4dCAhPT0gdm5vZGUudGV4dCkge1xuICAgICAgYXBpLnNldFRleHRDb250ZW50KGVsbSwgdm5vZGUudGV4dCk7XG4gICAgfVxuICAgIGlmIChpc0RlZihob29rKSAmJiBpc0RlZihpID0gaG9vay5wb3N0cGF0Y2gpKSB7XG4gICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG9sZFZub2RlLCB2bm9kZSkge1xuICAgIHZhciBpLCBlbG0sIHBhcmVudDtcbiAgICB2YXIgaW5zZXJ0ZWRWbm9kZVF1ZXVlID0gW107XG4gICAgZm9yIChpID0gMDsgaSA8IGNicy5wcmUubGVuZ3RoOyArK2kpIGNicy5wcmVbaV0oKTtcblxuICAgIGlmIChpc1VuZGVmKG9sZFZub2RlLnNlbCkpIHtcbiAgICAgIG9sZFZub2RlID0gZW1wdHlOb2RlQXQob2xkVm5vZGUpO1xuICAgIH1cblxuICAgIGlmIChzYW1lVm5vZGUob2xkVm5vZGUsIHZub2RlKSkge1xuICAgICAgcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsbSA9IG9sZFZub2RlLmVsbTtcbiAgICAgIHBhcmVudCA9IGFwaS5wYXJlbnROb2RlKGVsbSk7XG5cbiAgICAgIGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcblxuICAgICAgaWYgKHBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudCwgdm5vZGUuZWxtLCBhcGkubmV4dFNpYmxpbmcoZWxtKSk7XG4gICAgICAgIHJlbW92ZVZub2RlcyhwYXJlbnQsIFtvbGRWbm9kZV0sIDAsIDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBpbnNlcnRlZFZub2RlUXVldWUubGVuZ3RoOyArK2kpIHtcbiAgICAgIGluc2VydGVkVm5vZGVRdWV1ZVtpXS5kYXRhLmhvb2suaW5zZXJ0KGluc2VydGVkVm5vZGVRdWV1ZVtpXSk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucG9zdC5sZW5ndGg7ICsraSkgY2JzLnBvc3RbaV0oKTtcbiAgICByZXR1cm4gdm5vZGU7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2luaXQ6IGluaXR9O1xuIiwidmFyIFZOb2RlID0gcmVxdWlyZSgnLi92bm9kZScpO1xudmFyIGlzID0gcmVxdWlyZSgnLi9pcycpO1xuXG5mdW5jdGlvbiBhZGROUyhkYXRhLCBjaGlsZHJlbiwgc2VsKSB7XG4gIGRhdGEubnMgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnO1xuXG4gIGlmIChzZWwgIT09ICdmb3JlaWduT2JqZWN0JyAmJiBjaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgYWRkTlMoY2hpbGRyZW5baV0uZGF0YSwgY2hpbGRyZW5baV0uY2hpbGRyZW4sIGNoaWxkcmVuW2ldLnNlbCk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaChzZWwsIGIsIGMpIHtcbiAgdmFyIGRhdGEgPSB7fSwgY2hpbGRyZW4sIHRleHQsIGk7XG4gIGlmIChjICE9PSB1bmRlZmluZWQpIHtcbiAgICBkYXRhID0gYjtcbiAgICBpZiAoaXMuYXJyYXkoYykpIHsgY2hpbGRyZW4gPSBjOyB9XG4gICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGMpKSB7IHRleHQgPSBjOyB9XG4gIH0gZWxzZSBpZiAoYiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGlzLmFycmF5KGIpKSB7IGNoaWxkcmVuID0gYjsgfVxuICAgIGVsc2UgaWYgKGlzLnByaW1pdGl2ZShiKSkgeyB0ZXh0ID0gYjsgfVxuICAgIGVsc2UgeyBkYXRhID0gYjsgfVxuICB9XG4gIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmIChpcy5wcmltaXRpdmUoY2hpbGRyZW5baV0pKSBjaGlsZHJlbltpXSA9IFZOb2RlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGNoaWxkcmVuW2ldKTtcbiAgICB9XG4gIH1cbiAgaWYgKHNlbFswXSA9PT0gJ3MnICYmIHNlbFsxXSA9PT0gJ3YnICYmIHNlbFsyXSA9PT0gJ2cnKSB7XG4gICAgYWRkTlMoZGF0YSwgY2hpbGRyZW4sIHNlbCk7XG4gIH1cbiAgcmV0dXJuIFZOb2RlKHNlbCwgZGF0YSwgY2hpbGRyZW4sIHRleHQsIHVuZGVmaW5lZCk7XG59O1xuIiwiZnVuY3Rpb24gdXBkYXRlQ2xhc3Mob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBjdXIsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZENsYXNzID0gb2xkVm5vZGUuZGF0YS5jbGFzcyxcbiAgICAgIGtsYXNzID0gdm5vZGUuZGF0YS5jbGFzcztcblxuICBpZiAoIW9sZENsYXNzICYmICFrbGFzcykgcmV0dXJuO1xuICBvbGRDbGFzcyA9IG9sZENsYXNzIHx8IHt9O1xuICBrbGFzcyA9IGtsYXNzIHx8IHt9O1xuXG4gIGZvciAobmFtZSBpbiBvbGRDbGFzcykge1xuICAgIGlmICgha2xhc3NbbmFtZV0pIHtcbiAgICAgIGVsbS5jbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgIH1cbiAgfVxuICBmb3IgKG5hbWUgaW4ga2xhc3MpIHtcbiAgICBjdXIgPSBrbGFzc1tuYW1lXTtcbiAgICBpZiAoY3VyICE9PSBvbGRDbGFzc1tuYW1lXSkge1xuICAgICAgZWxtLmNsYXNzTGlzdFtjdXIgPyAnYWRkJyA6ICdyZW1vdmUnXShuYW1lKTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y3JlYXRlOiB1cGRhdGVDbGFzcywgdXBkYXRlOiB1cGRhdGVDbGFzc307XG4iLCJmdW5jdGlvbiB1cGRhdGVQcm9wcyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGtleSwgY3VyLCBvbGQsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZFByb3BzID0gb2xkVm5vZGUuZGF0YS5wcm9wcywgcHJvcHMgPSB2bm9kZS5kYXRhLnByb3BzO1xuXG4gIGlmICghb2xkUHJvcHMgJiYgIXByb3BzKSByZXR1cm47XG4gIG9sZFByb3BzID0gb2xkUHJvcHMgfHwge307XG4gIHByb3BzID0gcHJvcHMgfHwge307XG5cbiAgZm9yIChrZXkgaW4gb2xkUHJvcHMpIHtcbiAgICBpZiAoIXByb3BzW2tleV0pIHtcbiAgICAgIGRlbGV0ZSBlbG1ba2V5XTtcbiAgICB9XG4gIH1cbiAgZm9yIChrZXkgaW4gcHJvcHMpIHtcbiAgICBjdXIgPSBwcm9wc1trZXldO1xuICAgIG9sZCA9IG9sZFByb3BzW2tleV07XG4gICAgaWYgKG9sZCAhPT0gY3VyICYmIChrZXkgIT09ICd2YWx1ZScgfHwgZWxtW2tleV0gIT09IGN1cikpIHtcbiAgICAgIGVsbVtrZXldID0gY3VyO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZVByb3BzLCB1cGRhdGU6IHVwZGF0ZVByb3BzfTtcbiIsInZhciByYWYgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkgfHwgc2V0VGltZW91dDtcbnZhciBuZXh0RnJhbWUgPSBmdW5jdGlvbihmbikgeyByYWYoZnVuY3Rpb24oKSB7IHJhZihmbik7IH0pOyB9O1xuXG5mdW5jdGlvbiBzZXROZXh0RnJhbWUob2JqLCBwcm9wLCB2YWwpIHtcbiAgbmV4dEZyYW1lKGZ1bmN0aW9uKCkgeyBvYmpbcHJvcF0gPSB2YWw7IH0pO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTdHlsZShvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGN1ciwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkU3R5bGUgPSBvbGRWbm9kZS5kYXRhLnN0eWxlLFxuICAgICAgc3R5bGUgPSB2bm9kZS5kYXRhLnN0eWxlO1xuXG4gIGlmICghb2xkU3R5bGUgJiYgIXN0eWxlKSByZXR1cm47XG4gIG9sZFN0eWxlID0gb2xkU3R5bGUgfHwge307XG4gIHN0eWxlID0gc3R5bGUgfHwge307XG4gIHZhciBvbGRIYXNEZWwgPSAnZGVsYXllZCcgaW4gb2xkU3R5bGU7XG5cbiAgZm9yIChuYW1lIGluIG9sZFN0eWxlKSB7XG4gICAgaWYgKCFzdHlsZVtuYW1lXSkge1xuICAgICAgZWxtLnN0eWxlW25hbWVdID0gJyc7XG4gICAgfVxuICB9XG4gIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgIGN1ciA9IHN0eWxlW25hbWVdO1xuICAgIGlmIChuYW1lID09PSAnZGVsYXllZCcpIHtcbiAgICAgIGZvciAobmFtZSBpbiBzdHlsZS5kZWxheWVkKSB7XG4gICAgICAgIGN1ciA9IHN0eWxlLmRlbGF5ZWRbbmFtZV07XG4gICAgICAgIGlmICghb2xkSGFzRGVsIHx8IGN1ciAhPT0gb2xkU3R5bGUuZGVsYXllZFtuYW1lXSkge1xuICAgICAgICAgIHNldE5leHRGcmFtZShlbG0uc3R5bGUsIG5hbWUsIGN1cik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5hbWUgIT09ICdyZW1vdmUnICYmIGN1ciAhPT0gb2xkU3R5bGVbbmFtZV0pIHtcbiAgICAgIGVsbS5zdHlsZVtuYW1lXSA9IGN1cjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYXBwbHlEZXN0cm95U3R5bGUodm5vZGUpIHtcbiAgdmFyIHN0eWxlLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sIHMgPSB2bm9kZS5kYXRhLnN0eWxlO1xuICBpZiAoIXMgfHwgIShzdHlsZSA9IHMuZGVzdHJveSkpIHJldHVybjtcbiAgZm9yIChuYW1lIGluIHN0eWxlKSB7XG4gICAgZWxtLnN0eWxlW25hbWVdID0gc3R5bGVbbmFtZV07XG4gIH1cbn1cblxuZnVuY3Rpb24gYXBwbHlSZW1vdmVTdHlsZSh2bm9kZSwgcm0pIHtcbiAgdmFyIHMgPSB2bm9kZS5kYXRhLnN0eWxlO1xuICBpZiAoIXMgfHwgIXMucmVtb3ZlKSB7XG4gICAgcm0oKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG5hbWUsIGVsbSA9IHZub2RlLmVsbSwgaWR4LCBpID0gMCwgbWF4RHVyID0gMCxcbiAgICAgIGNvbXBTdHlsZSwgc3R5bGUgPSBzLnJlbW92ZSwgYW1vdW50ID0gMCwgYXBwbGllZCA9IFtdO1xuICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICBhcHBsaWVkLnB1c2gobmFtZSk7XG4gICAgZWxtLnN0eWxlW25hbWVdID0gc3R5bGVbbmFtZV07XG4gIH1cbiAgY29tcFN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShlbG0pO1xuICB2YXIgcHJvcHMgPSBjb21wU3R5bGVbJ3RyYW5zaXRpb24tcHJvcGVydHknXS5zcGxpdCgnLCAnKTtcbiAgZm9yICg7IGkgPCBwcm9wcy5sZW5ndGg7ICsraSkge1xuICAgIGlmKGFwcGxpZWQuaW5kZXhPZihwcm9wc1tpXSkgIT09IC0xKSBhbW91bnQrKztcbiAgfVxuICBlbG0uYWRkRXZlbnRMaXN0ZW5lcigndHJhbnNpdGlvbmVuZCcsIGZ1bmN0aW9uKGV2KSB7XG4gICAgaWYgKGV2LnRhcmdldCA9PT0gZWxtKSAtLWFtb3VudDtcbiAgICBpZiAoYW1vdW50ID09PSAwKSBybSgpO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y3JlYXRlOiB1cGRhdGVTdHlsZSwgdXBkYXRlOiB1cGRhdGVTdHlsZSwgZGVzdHJveTogYXBwbHlEZXN0cm95U3R5bGUsIHJlbW92ZTogYXBwbHlSZW1vdmVTdHlsZX07XG4iLCJmdW5jdGlvbiBpbnZva2VIYW5kbGVyKGhhbmRsZXIsIHZub2RlLCBldmVudCkge1xuICBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIC8vIGNhbGwgZnVuY3Rpb24gaGFuZGxlclxuICAgIGhhbmRsZXIuY2FsbCh2bm9kZSwgZXZlbnQsIHZub2RlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJvYmplY3RcIikge1xuICAgIC8vIGNhbGwgaGFuZGxlciB3aXRoIGFyZ3VtZW50c1xuICAgIGlmICh0eXBlb2YgaGFuZGxlclswXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAvLyBzcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSBhcmd1bWVudCBmb3IgcGVyZm9ybWFuY2VcbiAgICAgIGlmIChoYW5kbGVyLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBoYW5kbGVyWzBdLmNhbGwodm5vZGUsIGhhbmRsZXJbMV0sIGV2ZW50LCB2bm9kZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9IGhhbmRsZXIuc2xpY2UoMSk7XG4gICAgICAgIGFyZ3MucHVzaChldmVudCk7XG4gICAgICAgIGFyZ3MucHVzaCh2bm9kZSk7XG4gICAgICAgIGhhbmRsZXJbMF0uYXBwbHkodm5vZGUsIGFyZ3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjYWxsIG11bHRpcGxlIGhhbmRsZXJzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhbmRsZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW52b2tlSGFuZGxlcihoYW5kbGVyW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQsIHZub2RlKSB7XG4gIHZhciBuYW1lID0gZXZlbnQudHlwZSxcbiAgICAgIG9uID0gdm5vZGUuZGF0YS5vbjtcblxuICAvLyBjYWxsIGV2ZW50IGhhbmRsZXIocykgaWYgZXhpc3RzXG4gIGlmIChvbiAmJiBvbltuYW1lXSkge1xuICAgIGludm9rZUhhbmRsZXIob25bbmFtZV0sIHZub2RlLCBldmVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTGlzdGVuZXIoKSB7XG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50KSB7XG4gICAgaGFuZGxlRXZlbnQoZXZlbnQsIGhhbmRsZXIudm5vZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUV2ZW50TGlzdGVuZXJzKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgb2xkT24gPSBvbGRWbm9kZS5kYXRhLm9uLFxuICAgICAgb2xkTGlzdGVuZXIgPSBvbGRWbm9kZS5saXN0ZW5lcixcbiAgICAgIG9sZEVsbSA9IG9sZFZub2RlLmVsbSxcbiAgICAgIG9uID0gdm5vZGUgJiYgdm5vZGUuZGF0YS5vbixcbiAgICAgIGVsbSA9IHZub2RlICYmIHZub2RlLmVsbSxcbiAgICAgIG5hbWU7XG5cbiAgLy8gb3B0aW1pemF0aW9uIGZvciByZXVzZWQgaW1tdXRhYmxlIGhhbmRsZXJzXG4gIGlmIChvbGRPbiA9PT0gb24pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyByZW1vdmUgZXhpc3RpbmcgbGlzdGVuZXJzIHdoaWNoIG5vIGxvbmdlciB1c2VkXG4gIGlmIChvbGRPbiAmJiBvbGRMaXN0ZW5lcikge1xuICAgIC8vIGlmIGVsZW1lbnQgY2hhbmdlZCBvciBkZWxldGVkIHdlIHJlbW92ZSBhbGwgZXhpc3RpbmcgbGlzdGVuZXJzIHVuY29uZGl0aW9uYWxseVxuICAgIGlmICghb24pIHtcbiAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXIgaWYgZWxlbWVudCB3YXMgY2hhbmdlZCBvciBleGlzdGluZyBsaXN0ZW5lcnMgcmVtb3ZlZFxuICAgICAgICBvbGRFbG0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvbGRMaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb2xkT24pIHtcbiAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyIGlmIGV4aXN0aW5nIGxpc3RlbmVyIHJlbW92ZWRcbiAgICAgICAgaWYgKCFvbltuYW1lXSkge1xuICAgICAgICAgIG9sZEVsbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9sZExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhZGQgbmV3IGxpc3RlbmVycyB3aGljaCBoYXMgbm90IGFscmVhZHkgYXR0YWNoZWRcbiAgaWYgKG9uKSB7XG4gICAgLy8gcmV1c2UgZXhpc3RpbmcgbGlzdGVuZXIgb3IgY3JlYXRlIG5ld1xuICAgIHZhciBsaXN0ZW5lciA9IHZub2RlLmxpc3RlbmVyID0gb2xkVm5vZGUubGlzdGVuZXIgfHwgY3JlYXRlTGlzdGVuZXIoKTtcbiAgICAvLyB1cGRhdGUgdm5vZGUgZm9yIGxpc3RlbmVyXG4gICAgbGlzdGVuZXIudm5vZGUgPSB2bm9kZTtcblxuICAgIC8vIGlmIGVsZW1lbnQgY2hhbmdlZCBvciBhZGRlZCB3ZSBhZGQgYWxsIG5lZWRlZCBsaXN0ZW5lcnMgdW5jb25kaXRpb25hbGx5XG4gICAgaWYgKCFvbGRPbikge1xuICAgICAgZm9yIChuYW1lIGluIG9uKSB7XG4gICAgICAgIC8vIGFkZCBsaXN0ZW5lciBpZiBlbGVtZW50IHdhcyBjaGFuZ2VkIG9yIG5ldyBsaXN0ZW5lcnMgYWRkZWRcbiAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChuYW1lIGluIG9uKSB7XG4gICAgICAgIC8vIGFkZCBsaXN0ZW5lciBpZiBuZXcgbGlzdGVuZXIgYWRkZWRcbiAgICAgICAgaWYgKCFvbGRPbltuYW1lXSkge1xuICAgICAgICAgIGVsbS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZTogdXBkYXRlRXZlbnRMaXN0ZW5lcnMsXG4gIHVwZGF0ZTogdXBkYXRlRXZlbnRMaXN0ZW5lcnMsXG4gIGRlc3Ryb3k6IHVwZGF0ZUV2ZW50TGlzdGVuZXJzXG59O1xuIiwiLyohIEtlZmlyLmpzIHYzLjYuMFxuICogIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpclxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcblx0KGZhY3RvcnkoKGdsb2JhbC5LZWZpciA9IGdsb2JhbC5LZWZpciB8fCB7fSkpKTtcbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZU9iaihwcm90bykge1xuXHQgIHZhciBGID0gZnVuY3Rpb24gKCkge307XG5cdCAgRi5wcm90b3R5cGUgPSBwcm90bztcblx0ICByZXR1cm4gbmV3IEYoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQgLyosIG1peGluMSwgbWl4aW4yLi4uKi8pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMCxcblx0ICAgICAgcHJvcCA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAxOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGZvciAocHJvcCBpbiBhcmd1bWVudHNbaV0pIHtcblx0ICAgICAgdGFyZ2V0W3Byb3BdID0gYXJndW1lbnRzW2ldW3Byb3BdO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gdGFyZ2V0O1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5oZXJpdChDaGlsZCwgUGFyZW50IC8qLCBtaXhpbjEsIG1peGluMi4uLiovKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgQ2hpbGQucHJvdG90eXBlID0gY3JlYXRlT2JqKFBhcmVudC5wcm90b3R5cGUpO1xuXHQgIENoaWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENoaWxkO1xuXHQgIGZvciAoaSA9IDI7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZXh0ZW5kKENoaWxkLnByb3RvdHlwZSwgYXJndW1lbnRzW2ldKTtcblx0ICB9XG5cdCAgcmV0dXJuIENoaWxkO1xuXHR9XG5cblx0dmFyIE5PVEhJTkcgPSBbJzxub3RoaW5nPiddO1xuXHR2YXIgRU5EID0gJ2VuZCc7XG5cdHZhciBWQUxVRSA9ICd2YWx1ZSc7XG5cdHZhciBFUlJPUiA9ICdlcnJvcic7XG5cdHZhciBBTlkgPSAnYW55JztcblxuXHRmdW5jdGlvbiBjb25jYXQoYSwgYikge1xuXHQgIHZhciByZXN1bHQgPSB2b2lkIDAsXG5cdCAgICAgIGxlbmd0aCA9IHZvaWQgMCxcblx0ICAgICAgaSA9IHZvaWQgMCxcblx0ICAgICAgaiA9IHZvaWQgMDtcblx0ICBpZiAoYS5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiBiO1xuXHQgIH1cblx0ICBpZiAoYi5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiBhO1xuXHQgIH1cblx0ICBqID0gMDtcblx0ICByZXN1bHQgPSBuZXcgQXJyYXkoYS5sZW5ndGggKyBiLmxlbmd0aCk7XG5cdCAgbGVuZ3RoID0gYS5sZW5ndGg7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBqKyspIHtcblx0ICAgIHJlc3VsdFtqXSA9IGFbaV07XG5cdCAgfVxuXHQgIGxlbmd0aCA9IGIubGVuZ3RoO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKywgaisrKSB7XG5cdCAgICByZXN1bHRbal0gPSBiW2ldO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gZmluZChhcnIsIHZhbHVlKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAoYXJyW2ldID09PSB2YWx1ZSkge1xuXHQgICAgICByZXR1cm4gaTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gZmluZEJ5UHJlZChhcnIsIHByZWQpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChwcmVkKGFycltpXSkpIHtcblx0ICAgICAgcmV0dXJuIGk7XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNsb25lQXJyYXkoaW5wdXQpIHtcblx0ICB2YXIgbGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIHJlc3VsdFtpXSA9IGlucHV0W2ldO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVtb3ZlKGlucHV0LCBpbmRleCkge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IHZvaWQgMCxcblx0ICAgICAgaSA9IHZvaWQgMCxcblx0ICAgICAgaiA9IHZvaWQgMDtcblx0ICBpZiAoaW5kZXggPj0gMCAmJiBpbmRleCA8IGxlbmd0aCkge1xuXHQgICAgaWYgKGxlbmd0aCA9PT0gMSkge1xuXHQgICAgICByZXR1cm4gW107XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoIC0gMSk7XG5cdCAgICAgIGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgICAgICBpZiAoaSAhPT0gaW5kZXgpIHtcblx0ICAgICAgICAgIHJlc3VsdFtqXSA9IGlucHV0W2ldO1xuXHQgICAgICAgICAgaisrO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgICByZXR1cm4gcmVzdWx0O1xuXHQgICAgfVxuXHQgIH0gZWxzZSB7XG5cdCAgICByZXR1cm4gaW5wdXQ7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gbWFwKGlucHV0LCBmbikge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2ldID0gZm4oaW5wdXRbaV0pO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gZm9yRWFjaChhcnIsIGZuKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBmbihhcnJbaV0pO1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZpbGxBcnJheShhcnIsIHZhbHVlKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBhcnJbaV0gPSB2YWx1ZTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBjb250YWlucyhhcnIsIHZhbHVlKSB7XG5cdCAgcmV0dXJuIGZpbmQoYXJyLCB2YWx1ZSkgIT09IC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2xpZGUoY3VyLCBuZXh0LCBtYXgpIHtcblx0ICB2YXIgbGVuZ3RoID0gTWF0aC5taW4obWF4LCBjdXIubGVuZ3RoICsgMSksXG5cdCAgICAgIG9mZnNldCA9IGN1ci5sZW5ndGggLSBsZW5ndGggKyAxLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSBvZmZzZXQ7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2kgLSBvZmZzZXRdID0gY3VyW2ldO1xuXHQgIH1cblx0ICByZXN1bHRbbGVuZ3RoIC0gMV0gPSBuZXh0O1xuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgZXZlbnQpIHtcblx0ICBpZiAodHlwZSA9PT0gQU5ZKSB7XG5cdCAgICBmbihldmVudCk7XG5cdCAgfSBlbHNlIGlmICh0eXBlID09PSBldmVudC50eXBlKSB7XG5cdCAgICBpZiAodHlwZSA9PT0gVkFMVUUgfHwgdHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgZm4oZXZlbnQudmFsdWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgZm4oKTtcblx0ICAgIH1cblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBEaXNwYXRjaGVyKCkge1xuXHQgIHRoaXMuX2l0ZW1zID0gW107XG5cdCAgdGhpcy5fc3BpZXMgPSBbXTtcblx0ICB0aGlzLl9pbkxvb3AgPSAwO1xuXHQgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IG51bGw7XG5cdH1cblxuXHRleHRlbmQoRGlzcGF0Y2hlci5wcm90b3R5cGUsIHtcblx0ICBhZGQ6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgdGhpcy5faXRlbXMgPSBjb25jYXQodGhpcy5faXRlbXMsIFt7IHR5cGU6IHR5cGUsIGZuOiBmbiB9XSk7XG5cdCAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgcmVtb3ZlOiBmdW5jdGlvbiAodHlwZSwgZm4pIHtcblx0ICAgIHZhciBpbmRleCA9IGZpbmRCeVByZWQodGhpcy5faXRlbXMsIGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHJldHVybiB4LnR5cGUgPT09IHR5cGUgJiYgeC5mbiA9PT0gZm47XG5cdCAgICB9KTtcblxuXHQgICAgLy8gaWYgd2UncmUgY3VycmVudGx5IGluIGEgbm90aWZpY2F0aW9uIGxvb3AsXG5cdCAgICAvLyByZW1lbWJlciB0aGlzIHN1YnNjcmliZXIgd2FzIHJlbW92ZWRcblx0ICAgIGlmICh0aGlzLl9pbkxvb3AgIT09IDAgJiYgaW5kZXggIT09IC0xKSB7XG5cdCAgICAgIGlmICh0aGlzLl9yZW1vdmVkSXRlbXMgPT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMgPSBbXTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMucHVzaCh0aGlzLl9pdGVtc1tpbmRleF0pO1xuXHQgICAgfVxuXG5cdCAgICB0aGlzLl9pdGVtcyA9IHJlbW92ZSh0aGlzLl9pdGVtcywgaW5kZXgpO1xuXHQgICAgcmV0dXJuIHRoaXMuX2l0ZW1zLmxlbmd0aDtcblx0ICB9LFxuXHQgIGFkZFNweTogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICB0aGlzLl9zcGllcyA9IGNvbmNhdCh0aGlzLl9zcGllcywgW2ZuXSk7XG5cdCAgICByZXR1cm4gdGhpcy5fc3BpZXMubGVuZ3RoO1xuXHQgIH0sXG5cblxuXHQgIC8vIEJlY2F1c2Ugc3BpZXMgYXJlIG9ubHkgZXZlciBhIGZ1bmN0aW9uIHRoYXQgcGVyZm9ybSBsb2dnaW5nIGFzXG5cdCAgLy8gdGhlaXIgb25seSBzaWRlIGVmZmVjdCwgd2UgZG9uJ3QgbmVlZCB0aGUgc2FtZSBjb21wbGljYXRlZFxuXHQgIC8vIHJlbW92YWwgbG9naWMgbGlrZSBpbiByZW1vdmUoKVxuXHQgIHJlbW92ZVNweTogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICB0aGlzLl9zcGllcyA9IHJlbW92ZSh0aGlzLl9zcGllcywgdGhpcy5fc3BpZXMuaW5kZXhPZihmbikpO1xuXHQgICAgcmV0dXJuIHRoaXMuX3NwaWVzLmxlbmd0aDtcblx0ICB9LFxuXHQgIGRpc3BhdGNoOiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHRoaXMuX2luTG9vcCsrO1xuXHQgICAgZm9yICh2YXIgaSA9IDAsIHNwaWVzID0gdGhpcy5fc3BpZXM7IHRoaXMuX3NwaWVzICE9PSBudWxsICYmIGkgPCBzcGllcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICBzcGllc1tpXShldmVudCk7XG5cdCAgICB9XG5cblx0ICAgIGZvciAodmFyIF9pID0gMCwgaXRlbXMgPSB0aGlzLl9pdGVtczsgX2kgPCBpdGVtcy5sZW5ndGg7IF9pKyspIHtcblxuXHQgICAgICAvLyBjbGVhbnVwIHdhcyBjYWxsZWRcblx0ICAgICAgaWYgKHRoaXMuX2l0ZW1zID09PSBudWxsKSB7XG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgIH1cblxuXHQgICAgICAvLyB0aGlzIHN1YnNjcmliZXIgd2FzIHJlbW92ZWRcblx0ICAgICAgaWYgKHRoaXMuX3JlbW92ZWRJdGVtcyAhPT0gbnVsbCAmJiBjb250YWlucyh0aGlzLl9yZW1vdmVkSXRlbXMsIGl0ZW1zW19pXSkpIHtcblx0ICAgICAgICBjb250aW51ZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKGl0ZW1zW19pXS50eXBlLCBpdGVtc1tfaV0uZm4sIGV2ZW50KTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2luTG9vcC0tO1xuXHQgICAgaWYgKHRoaXMuX2luTG9vcCA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgY2xlYW51cDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5faXRlbXMgPSBudWxsO1xuXHQgICAgdGhpcy5fc3BpZXMgPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gT2JzZXJ2YWJsZSgpIHtcblx0ICB0aGlzLl9kaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIoKTtcblx0ICB0aGlzLl9hY3RpdmUgPSBmYWxzZTtcblx0ICB0aGlzLl9hbGl2ZSA9IHRydWU7XG5cdCAgdGhpcy5fYWN0aXZhdGluZyA9IGZhbHNlO1xuXHQgIHRoaXMuX2xvZ0hhbmRsZXJzID0gbnVsbDtcblx0ICB0aGlzLl9zcHlIYW5kbGVycyA9IG51bGw7XG5cdH1cblxuXHRleHRlbmQoT2JzZXJ2YWJsZS5wcm90b3R5cGUsIHtcblxuXHQgIF9uYW1lOiAnb2JzZXJ2YWJsZScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7fSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9zZXRBY3RpdmU6IGZ1bmN0aW9uIChhY3RpdmUpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUgIT09IGFjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG5cdCAgICAgIGlmIChhY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9hY3RpdmF0aW5nID0gdHJ1ZTtcblx0ICAgICAgICB0aGlzLl9vbkFjdGl2YXRpb24oKTtcblx0ICAgICAgICB0aGlzLl9hY3RpdmF0aW5nID0gZmFsc2U7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fb25EZWFjdGl2YXRpb24oKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9zZXRBY3RpdmUoZmFsc2UpO1xuXHQgICAgdGhpcy5fZGlzcGF0Y2hlci5jbGVhbnVwKCk7XG5cdCAgICB0aGlzLl9kaXNwYXRjaGVyID0gbnVsbDtcblx0ICAgIHRoaXMuX2xvZ0hhbmRsZXJzID0gbnVsbDtcblx0ICB9LFxuXHQgIF9lbWl0OiBmdW5jdGlvbiAodHlwZSwgeCkge1xuXHQgICAgc3dpdGNoICh0eXBlKSB7XG5cdCAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgcmV0dXJuIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgICBjYXNlIEVORDpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRWYWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdEVycm9yOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fYWxpdmUgPSBmYWxzZTtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IEVORCB9KTtcblx0ICAgICAgdGhpcy5fY2xlYXIoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5hZGQodHlwZSwgZm4pO1xuXHQgICAgICB0aGlzLl9zZXRBY3RpdmUodHJ1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgeyB0eXBlOiBFTkQgfSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIF9vZmY6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHZhciBjb3VudCA9IHRoaXMuX2Rpc3BhdGNoZXIucmVtb3ZlKHR5cGUsIGZuKTtcblx0ICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fc2V0QWN0aXZlKGZhbHNlKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBvblZhbHVlOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihWQUxVRSwgZm4pO1xuXHQgIH0sXG5cdCAgb25FcnJvcjogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb24oRVJST1IsIGZuKTtcblx0ICB9LFxuXHQgIG9uRW5kOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihFTkQsIGZuKTtcblx0ICB9LFxuXHQgIG9uQW55OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihBTlksIGZuKTtcblx0ICB9LFxuXHQgIG9mZlZhbHVlOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoVkFMVUUsIGZuKTtcblx0ICB9LFxuXHQgIG9mZkVycm9yOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoRVJST1IsIGZuKTtcblx0ICB9LFxuXHQgIG9mZkVuZDogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb2ZmKEVORCwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmQW55OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoQU5ZLCBmbik7XG5cdCAgfSxcblx0ICBvYnNlcnZlOiBmdW5jdGlvbiAob2JzZXJ2ZXJPck9uVmFsdWUsIG9uRXJyb3IsIG9uRW5kKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXHQgICAgdmFyIGNsb3NlZCA9IGZhbHNlO1xuXG5cdCAgICB2YXIgb2JzZXJ2ZXIgPSAhb2JzZXJ2ZXJPck9uVmFsdWUgfHwgdHlwZW9mIG9ic2VydmVyT3JPblZhbHVlID09PSAnZnVuY3Rpb24nID8geyB2YWx1ZTogb2JzZXJ2ZXJPck9uVmFsdWUsIGVycm9yOiBvbkVycm9yLCBlbmQ6IG9uRW5kIH0gOiBvYnNlcnZlck9yT25WYWx1ZTtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFICYmIG9ic2VydmVyLnZhbHVlKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIudmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SICYmIG9ic2VydmVyLmVycm9yKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVORCAmJiBvYnNlcnZlci5lbmQpIHtcblx0ICAgICAgICBvYnNlcnZlci5lbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICB0aGlzLm9uQW55KGhhbmRsZXIpO1xuXG5cdCAgICByZXR1cm4ge1xuXHQgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIGlmICghY2xvc2VkKSB7XG5cdCAgICAgICAgICBfdGhpcy5vZmZBbnkoaGFuZGxlcik7XG5cdCAgICAgICAgICBjbG9zZWQgPSB0cnVlO1xuXHQgICAgICAgIH1cblx0ICAgICAgfSxcblxuXHQgICAgICBnZXQgY2xvc2VkKCkge1xuXHQgICAgICAgIHJldHVybiBjbG9zZWQ7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgfSxcblxuXG5cdCAgLy8gQSBhbmQgQiBtdXN0IGJlIHN1YmNsYXNzZXMgb2YgU3RyZWFtIGFuZCBQcm9wZXJ0eSAob3JkZXIgZG9lc24ndCBtYXR0ZXIpXG5cdCAgX29mU2FtZVR5cGU6IGZ1bmN0aW9uIChBLCBCKSB7XG5cdCAgICByZXR1cm4gQS5wcm90b3R5cGUuZ2V0VHlwZSgpID09PSB0aGlzLmdldFR5cGUoKSA/IEEgOiBCO1xuXHQgIH0sXG5cdCAgc2V0TmFtZTogZnVuY3Rpb24gKHNvdXJjZU9icyAvKiBvcHRpb25hbCAqLywgc2VsZk5hbWUpIHtcblx0ICAgIHRoaXMuX25hbWUgPSBzZWxmTmFtZSA/IHNvdXJjZU9icy5fbmFtZSArICcuJyArIHNlbGZOYW1lIDogc291cmNlT2JzO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBsb2c6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cblx0ICAgIHZhciBpc0N1cnJlbnQgPSB2b2lkIDA7XG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICB2YXIgdHlwZSA9ICc8JyArIGV2ZW50LnR5cGUgKyAoaXNDdXJyZW50ID8gJzpjdXJyZW50JyA6ICcnKSArICc+Jztcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNvbnNvbGUubG9nKG5hbWUsIHR5cGUpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIGNvbnNvbGUubG9nKG5hbWUsIHR5cGUsIGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIGlmICghdGhpcy5fbG9nSGFuZGxlcnMpIHtcblx0ICAgICAgICB0aGlzLl9sb2dIYW5kbGVycyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzLnB1c2goeyBuYW1lOiBuYW1lLCBoYW5kbGVyOiBoYW5kbGVyIH0pO1xuXHQgICAgfVxuXG5cdCAgICBpc0N1cnJlbnQgPSB0cnVlO1xuXHQgICAgdGhpcy5vbkFueShoYW5kbGVyKTtcblx0ICAgIGlzQ3VycmVudCA9IGZhbHNlO1xuXG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIG9mZkxvZzogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIG5hbWUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRvU3RyaW5nKCkgOiBhcmd1bWVudHNbMF07XG5cblxuXHQgICAgaWYgKHRoaXMuX2xvZ0hhbmRsZXJzKSB7XG5cdCAgICAgIHZhciBoYW5kbGVySW5kZXggPSBmaW5kQnlQcmVkKHRoaXMuX2xvZ0hhbmRsZXJzLCBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICAgICAgcmV0dXJuIG9iai5uYW1lID09PSBuYW1lO1xuXHQgICAgICB9KTtcblx0ICAgICAgaWYgKGhhbmRsZXJJbmRleCAhPT0gLTEpIHtcblx0ICAgICAgICB0aGlzLm9mZkFueSh0aGlzLl9sb2dIYW5kbGVyc1toYW5kbGVySW5kZXhdLmhhbmRsZXIpO1xuXHQgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzLnNwbGljZShoYW5kbGVySW5kZXgsIDEpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgc3B5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgdmFyIHR5cGUgPSAnPCcgKyBldmVudC50eXBlICsgJz4nO1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIGlmICghdGhpcy5fc3B5SGFuZGxlcnMpIHtcblx0ICAgICAgICB0aGlzLl9zcHlIYW5kbGVycyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3NweUhhbmRsZXJzLnB1c2goeyBuYW1lOiBuYW1lLCBoYW5kbGVyOiBoYW5kbGVyIH0pO1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmFkZFNweShoYW5kbGVyKTtcblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgb2ZmU3B5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgaWYgKHRoaXMuX3NweUhhbmRsZXJzKSB7XG5cdCAgICAgIHZhciBoYW5kbGVySW5kZXggPSBmaW5kQnlQcmVkKHRoaXMuX3NweUhhbmRsZXJzLCBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICAgICAgcmV0dXJuIG9iai5uYW1lID09PSBuYW1lO1xuXHQgICAgICB9KTtcblx0ICAgICAgaWYgKGhhbmRsZXJJbmRleCAhPT0gLTEpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLnJlbW92ZVNweSh0aGlzLl9zcHlIYW5kbGVyc1toYW5kbGVySW5kZXhdLmhhbmRsZXIpO1xuXHQgICAgICAgIHRoaXMuX3NweUhhbmRsZXJzLnNwbGljZShoYW5kbGVySW5kZXgsIDEpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9XG5cdH0pO1xuXG5cdC8vIGV4dGVuZCgpIGNhbid0IGhhbmRsZSBgdG9TdHJpbmdgIGluIElFOFxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gJ1snICsgdGhpcy5fbmFtZSArICddJztcblx0fTtcblxuXHRmdW5jdGlvbiBTdHJlYW0oKSB7XG5cdCAgT2JzZXJ2YWJsZS5jYWxsKHRoaXMpO1xuXHR9XG5cblx0aW5oZXJpdChTdHJlYW0sIE9ic2VydmFibGUsIHtcblxuXHQgIF9uYW1lOiAnc3RyZWFtJyxcblxuXHQgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiAnc3RyZWFtJztcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIFByb3BlcnR5KCkge1xuXHQgIE9ic2VydmFibGUuY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSBudWxsO1xuXHR9XG5cblx0aW5oZXJpdChQcm9wZXJ0eSwgT2JzZXJ2YWJsZSwge1xuXG5cdCAgX25hbWU6ICdwcm9wZXJ0eScsXG5cblx0ICBfZW1pdFZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfTtcblx0ICAgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RXJyb3I6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9O1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9hbGl2ZSA9IGZhbHNlO1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRU5EIH0pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2NsZWFyKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb246IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuYWRkKHR5cGUsIGZuKTtcblx0ICAgICAgdGhpcy5fc2V0QWN0aXZlKHRydWUpO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRFdmVudCAhPT0gbnVsbCkge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgdGhpcy5fY3VycmVudEV2ZW50KTtcblx0ICAgIH1cblx0ICAgIGlmICghdGhpcy5fYWxpdmUpIHtcblx0ICAgICAgY2FsbFN1YnNjcmliZXIodHlwZSwgZm4sIHsgdHlwZTogRU5EIH0pO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBnZXRUeXBlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gJ3Byb3BlcnR5Jztcblx0ICB9XG5cdH0pO1xuXG5cdHZhciBuZXZlclMgPSBuZXcgU3RyZWFtKCk7XG5cdG5ldmVyUy5fZW1pdEVuZCgpO1xuXHRuZXZlclMuX25hbWUgPSAnbmV2ZXInO1xuXG5cdGZ1bmN0aW9uIG5ldmVyKCkge1xuXHQgIHJldHVybiBuZXZlclM7XG5cdH1cblxuXHRmdW5jdGlvbiB0aW1lQmFzZWQobWl4aW4pIHtcblxuXHQgIGZ1bmN0aW9uIEFub255bW91c1N0cmVhbSh3YWl0LCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3dhaXQgPSB3YWl0O1xuXHQgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB0aGlzLl8kb25UaWNrID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX29uVGljaygpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuX2luaXQob3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgaW5oZXJpdChBbm9ueW1vdXNTdHJlYW0sIFN0cmVhbSwge1xuXHQgICAgX2luaXQ6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgX2ZyZWU6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgX29uVGljazogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIH0sXG5cdCAgICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQgIT09IG51bGwpIHtcblx0ICAgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICAgIHRoaXMuXyRvblRpY2sgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cdCAgfSwgbWl4aW4pO1xuXG5cdCAgcmV0dXJuIEFub255bW91c1N0cmVhbTtcblx0fVxuXG5cdHZhciBTID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnbGF0ZXInLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgeCA9IF9yZWYueDtcblxuXHQgICAgdGhpcy5feCA9IHg7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5feCA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5feCk7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBsYXRlcih3YWl0LCB4KSB7XG5cdCAgcmV0dXJuIG5ldyBTKHdhaXQsIHsgeDogeCB9KTtcblx0fVxuXG5cdHZhciBTJDEgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdpbnRlcnZhbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB4ID0gX3JlZi54O1xuXG5cdCAgICB0aGlzLl94ID0geDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94ID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94KTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGludGVydmFsKHdhaXQsIHgpIHtcblx0ICByZXR1cm4gbmV3IFMkMSh3YWl0LCB7IHg6IHggfSk7XG5cdH1cblxuXHR2YXIgUyQyID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnc2VxdWVudGlhbGx5JyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIHhzID0gX3JlZi54cztcblxuXHQgICAgdGhpcy5feHMgPSBjbG9uZUFycmF5KHhzKTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94cyA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5feHMubGVuZ3RoID09PSAxKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94c1swXSk7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94cy5zaGlmdCgpKTtcblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHNlcXVlbnRpYWxseSh3YWl0LCB4cykge1xuXHQgIHJldHVybiB4cy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IFMkMih3YWl0LCB7IHhzOiB4cyB9KTtcblx0fVxuXG5cdHZhciBTJDMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdmcm9tUG9sbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoZm4oKSk7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBmcm9tUG9sbCh3YWl0LCBmbikge1xuXHQgIHJldHVybiBuZXcgUyQzKHdhaXQsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gZW1pdHRlcihvYnMpIHtcblxuXHQgIGZ1bmN0aW9uIHZhbHVlKHgpIHtcblx0ICAgIG9icy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGVycm9yKHgpIHtcblx0ICAgIG9icy5fZW1pdEVycm9yKHgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGVuZCgpIHtcblx0ICAgIG9icy5fZW1pdEVuZCgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGV2ZW50KGUpIHtcblx0ICAgIG9icy5fZW1pdChlLnR5cGUsIGUudmFsdWUpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIHJldHVybiB7XG5cdCAgICB2YWx1ZTogdmFsdWUsXG5cdCAgICBlcnJvcjogZXJyb3IsXG5cdCAgICBlbmQ6IGVuZCxcblx0ICAgIGV2ZW50OiBldmVudCxcblxuXHQgICAgLy8gbGVnYWN5XG5cdCAgICBlbWl0OiB2YWx1ZSxcblx0ICAgIGVtaXRFdmVudDogZXZlbnRcblx0ICB9O1xuXHR9XG5cblx0dmFyIFMkNCA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ3dpdGhJbnRlcnZhbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gZW1pdHRlcih0aGlzKTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgZm4odGhpcy5fZW1pdHRlcik7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiB3aXRoSW50ZXJ2YWwod2FpdCwgZm4pIHtcblx0ICByZXR1cm4gbmV3IFMkNCh3YWl0LCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIFMkNShmbikge1xuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2ZuID0gZm47XG5cdCAgdGhpcy5fdW5zdWJzY3JpYmUgPSBudWxsO1xuXHR9XG5cblx0aW5oZXJpdChTJDUsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdzdHJlYW0nLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgdW5zdWJzY3JpYmUgPSBmbihlbWl0dGVyKHRoaXMpKTtcblx0ICAgIHRoaXMuX3Vuc3Vic2NyaWJlID0gdHlwZW9mIHVuc3Vic2NyaWJlID09PSAnZnVuY3Rpb24nID8gdW5zdWJzY3JpYmUgOiBudWxsO1xuXG5cdCAgICAvLyBmaXggaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8zNVxuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fY2FsbFVuc3Vic2NyaWJlKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfY2FsbFVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fdW5zdWJzY3JpYmUgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUoKTtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9jYWxsVW5zdWJzY3JpYmUoKTtcblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHN0cmVhbShmbikge1xuXHQgIHJldHVybiBuZXcgUyQ1KGZuKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21DYWxsYmFjayhjYWxsYmFja0NvbnN1bWVyKSB7XG5cblx0ICB2YXIgY2FsbGVkID0gZmFsc2U7XG5cblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIGNhbGxiYWNrQ29uc3VtZXIoZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbUNhbGxiYWNrJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tTm9kZUNhbGxiYWNrKGNhbGxiYWNrQ29uc3VtZXIpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgY2FsbGJhY2tDb25zdW1lcihmdW5jdGlvbiAoZXJyb3IsIHgpIHtcblx0ICAgICAgICBpZiAoZXJyb3IpIHtcblx0ICAgICAgICAgIGVtaXR0ZXIuZXJyb3IoZXJyb3IpO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgfVxuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH0pO1xuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pLnNldE5hbWUoJ2Zyb21Ob2RlQ2FsbGJhY2snKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNwcmVhZChmbiwgbGVuZ3RoKSB7XG5cdCAgc3dpdGNoIChsZW5ndGgpIHtcblx0ICAgIGNhc2UgMDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICByZXR1cm4gZm4oKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMTpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAyOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDM6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgNDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0sIGFbM10pO1xuXHQgICAgICB9O1xuXHQgICAgZGVmYXVsdDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGEpO1xuXHQgICAgICB9O1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGFwcGx5KGZuLCBjLCBhKSB7XG5cdCAgdmFyIGFMZW5ndGggPSBhID8gYS5sZW5ndGggOiAwO1xuXHQgIGlmIChjID09IG51bGwpIHtcblx0ICAgIHN3aXRjaCAoYUxlbmd0aCkge1xuXHQgICAgICBjYXNlIDA6XG5cdCAgICAgICAgcmV0dXJuIGZuKCk7XG5cdCAgICAgIGNhc2UgMTpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSk7XG5cdCAgICAgIGNhc2UgMjpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSk7XG5cdCAgICAgIGNhc2UgMzpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSk7XG5cdCAgICAgIGNhc2UgNDpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG5cdCAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGEpO1xuXHQgICAgfVxuXHQgIH0gZWxzZSB7XG5cdCAgICBzd2l0Y2ggKGFMZW5ndGgpIHtcblx0ICAgICAgY2FzZSAwOlxuXHQgICAgICAgIHJldHVybiBmbi5jYWxsKGMpO1xuXHQgICAgICBkZWZhdWx0OlxuXHQgICAgICAgIHJldHVybiBmbi5hcHBseShjLCBhKTtcblx0ICAgIH1cblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tU3ViVW5zdWIoc3ViLCB1bnN1YiwgdHJhbnNmb3JtZXIgLyogRnVuY3Rpb24gfCBmYWxzZXkgKi8pIHtcblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cblx0ICAgIHZhciBoYW5kbGVyID0gdHJhbnNmb3JtZXIgPyBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGVtaXR0ZXIuZW1pdChhcHBseSh0cmFuc2Zvcm1lciwgdGhpcywgYXJndW1lbnRzKSk7XG5cdCAgICB9IDogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgfTtcblxuXHQgICAgc3ViKGhhbmRsZXIpO1xuXHQgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIHVuc3ViKGhhbmRsZXIpO1xuXHQgICAgfTtcblx0ICB9KS5zZXROYW1lKCdmcm9tU3ViVW5zdWInKTtcblx0fVxuXG5cdHZhciBwYWlycyA9IFtbJ2FkZEV2ZW50TGlzdGVuZXInLCAncmVtb3ZlRXZlbnRMaXN0ZW5lciddLCBbJ2FkZExpc3RlbmVyJywgJ3JlbW92ZUxpc3RlbmVyJ10sIFsnb24nLCAnb2ZmJ11dO1xuXG5cdGZ1bmN0aW9uIGZyb21FdmVudHModGFyZ2V0LCBldmVudE5hbWUsIHRyYW5zZm9ybWVyKSB7XG5cdCAgdmFyIHN1YiA9IHZvaWQgMCxcblx0ICAgICAgdW5zdWIgPSB2b2lkIDA7XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAodHlwZW9mIHRhcmdldFtwYWlyc1tpXVswXV0gPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHRhcmdldFtwYWlyc1tpXVsxXV0gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgICAgc3ViID0gcGFpcnNbaV1bMF07XG5cdCAgICAgIHVuc3ViID0gcGFpcnNbaV1bMV07XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfVxuXHQgIH1cblxuXHQgIGlmIChzdWIgPT09IHVuZGVmaW5lZCkge1xuXHQgICAgdGhyb3cgbmV3IEVycm9yKCd0YXJnZXQgZG9uXFwndCBzdXBwb3J0IGFueSBvZiAnICsgJ2FkZEV2ZW50TGlzdGVuZXIvcmVtb3ZlRXZlbnRMaXN0ZW5lciwgYWRkTGlzdGVuZXIvcmVtb3ZlTGlzdGVuZXIsIG9uL29mZiBtZXRob2QgcGFpcicpO1xuXHQgIH1cblxuXHQgIHJldHVybiBmcm9tU3ViVW5zdWIoZnVuY3Rpb24gKGhhbmRsZXIpIHtcblx0ICAgIHJldHVybiB0YXJnZXRbc3ViXShldmVudE5hbWUsIGhhbmRsZXIpO1xuXHQgIH0sIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG5cdCAgICByZXR1cm4gdGFyZ2V0W3Vuc3ViXShldmVudE5hbWUsIGhhbmRsZXIpO1xuXHQgIH0sIHRyYW5zZm9ybWVyKS5zZXROYW1lKCdmcm9tRXZlbnRzJyk7XG5cdH1cblxuXHQvLyBIQUNLOlxuXHQvLyAgIFdlIGRvbid0IGNhbGwgcGFyZW50IENsYXNzIGNvbnN0cnVjdG9yLCBidXQgaW5zdGVhZCBwdXR0aW5nIGFsbCBuZWNlc3Nhcnlcblx0Ly8gICBwcm9wZXJ0aWVzIGludG8gcHJvdG90eXBlIHRvIHNpbXVsYXRlIGVuZGVkIFByb3BlcnR5XG5cdC8vICAgKHNlZSBQcm9wcGVydHkgYW5kIE9ic2VydmFibGUgY2xhc3NlcykuXG5cblx0ZnVuY3Rpb24gUCh2YWx1ZSkge1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogJ3ZhbHVlJywgdmFsdWU6IHZhbHVlLCBjdXJyZW50OiB0cnVlIH07XG5cdH1cblxuXHRpbmhlcml0KFAsIFByb3BlcnR5LCB7XG5cdCAgX25hbWU6ICdjb25zdGFudCcsXG5cdCAgX2FjdGl2ZTogZmFsc2UsXG5cdCAgX2FjdGl2YXRpbmc6IGZhbHNlLFxuXHQgIF9hbGl2ZTogZmFsc2UsXG5cdCAgX2Rpc3BhdGNoZXI6IG51bGwsXG5cdCAgX2xvZ0hhbmRsZXJzOiBudWxsXG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbnN0YW50KHgpIHtcblx0ICByZXR1cm4gbmV3IFAoeCk7XG5cdH1cblxuXHQvLyBIQUNLOlxuXHQvLyAgIFdlIGRvbid0IGNhbGwgcGFyZW50IENsYXNzIGNvbnN0cnVjdG9yLCBidXQgaW5zdGVhZCBwdXR0aW5nIGFsbCBuZWNlc3Nhcnlcblx0Ly8gICBwcm9wZXJ0aWVzIGludG8gcHJvdG90eXBlIHRvIHNpbXVsYXRlIGVuZGVkIFByb3BlcnR5XG5cdC8vICAgKHNlZSBQcm9wcGVydHkgYW5kIE9ic2VydmFibGUgY2xhc3NlcykuXG5cblx0ZnVuY3Rpb24gUCQxKHZhbHVlKSB7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiAnZXJyb3InLCB2YWx1ZTogdmFsdWUsIGN1cnJlbnQ6IHRydWUgfTtcblx0fVxuXG5cdGluaGVyaXQoUCQxLCBQcm9wZXJ0eSwge1xuXHQgIF9uYW1lOiAnY29uc3RhbnRFcnJvcicsXG5cdCAgX2FjdGl2ZTogZmFsc2UsXG5cdCAgX2FjdGl2YXRpbmc6IGZhbHNlLFxuXHQgIF9hbGl2ZTogZmFsc2UsXG5cdCAgX2Rpc3BhdGNoZXI6IG51bGwsXG5cdCAgX2xvZ0hhbmRsZXJzOiBudWxsXG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbnN0YW50RXJyb3IoeCkge1xuXHQgIHJldHVybiBuZXcgUCQxKHgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29uc3RydWN0b3IoQmFzZUNsYXNzLCBuYW1lKSB7XG5cdCAgcmV0dXJuIGZ1bmN0aW9uIEFub255bW91c09ic2VydmFibGUoc291cmNlLCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBCYXNlQ2xhc3MuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZTtcblx0ICAgIHRoaXMuX25hbWUgPSBzb3VyY2UuX25hbWUgKyAnLicgKyBuYW1lO1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICAgIHRoaXMuXyRoYW5kbGVBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ2xhc3NNZXRob2RzKEJhc2VDbGFzcykge1xuXHQgIHJldHVybiB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlRW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH0sXG5cdCAgICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgQmFzZUNsYXNzLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZUFueSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlU3RyZWFtKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFMgPSBjcmVhdGVDb25zdHJ1Y3RvcihTdHJlYW0sIG5hbWUpO1xuXHQgIGluaGVyaXQoUywgU3RyZWFtLCBjcmVhdGVDbGFzc01ldGhvZHMoU3RyZWFtKSwgbWl4aW4pO1xuXHQgIHJldHVybiBTO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlUHJvcGVydHkobmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUCA9IGNyZWF0ZUNvbnN0cnVjdG9yKFByb3BlcnR5LCBuYW1lKTtcblx0ICBpbmhlcml0KFAsIFByb3BlcnR5LCBjcmVhdGVDbGFzc01ldGhvZHMoUHJvcGVydHkpLCBtaXhpbik7XG5cdCAgcmV0dXJuIFA7XG5cdH1cblxuXHR2YXIgUCQyID0gY3JlYXRlUHJvcGVydHkoJ3RvUHJvcGVydHknLCB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9nZXRJbml0aWFsQ3VycmVudCA9IGZuO1xuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2dldEluaXRpYWxDdXJyZW50ICE9PSBudWxsKSB7XG5cdCAgICAgIHZhciBnZXRJbml0aWFsID0gdGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQ7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShnZXRJbml0aWFsKCkpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpOyAvLyBjb3BpZWQgZnJvbSBwYXR0ZXJucy9vbmUtc291cmNlXG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiB0b1Byb3BlcnR5KG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IG51bGwgOiBhcmd1bWVudHNbMV07XG5cblx0ICBpZiAoZm4gIT09IG51bGwgJiYgdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBzaG91bGQgY2FsbCB0b1Byb3BlcnR5KCkgd2l0aCBhIGZ1bmN0aW9uIG9yIG5vIGFyZ3VtZW50cy4nKTtcblx0ICB9XG5cdCAgcmV0dXJuIG5ldyBQJDIob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBTJDYgPSBjcmVhdGVTdHJlYW0oJ2NoYW5nZXMnLCB7XG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBjaGFuZ2VzKG9icykge1xuXHQgIHJldHVybiBuZXcgUyQ2KG9icyk7XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tUHJvbWlzZShwcm9taXNlKSB7XG5cblx0ICB2YXIgY2FsbGVkID0gZmFsc2U7XG5cblx0ICB2YXIgcmVzdWx0ID0gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICB2YXIgb25WYWx1ZSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH07XG5cdCAgICAgIHZhciBvbkVycm9yID0gZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVycm9yKHgpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH07XG5cdCAgICAgIHZhciBfcHJvbWlzZSA9IHByb21pc2UudGhlbihvblZhbHVlLCBvbkVycm9yKTtcblxuXHQgICAgICAvLyBwcmV2ZW50IGxpYnJhcmllcyBsaWtlICdRJyBvciAnd2hlbicgZnJvbSBzd2FsbG93aW5nIGV4Y2VwdGlvbnNcblx0ICAgICAgaWYgKF9wcm9taXNlICYmIHR5cGVvZiBfcHJvbWlzZS5kb25lID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICAgICAgX3Byb21pc2UuZG9uZSgpO1xuXHQgICAgICB9XG5cblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KTtcblxuXHQgIHJldHVybiB0b1Byb3BlcnR5KHJlc3VsdCwgbnVsbCkuc2V0TmFtZSgnZnJvbVByb21pc2UnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldEdsb2RhbFByb21pc2UoKSB7XG5cdCAgaWYgKHR5cGVvZiBQcm9taXNlID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gUHJvbWlzZTtcblx0ICB9IGVsc2Uge1xuXHQgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpc25cXCd0IGRlZmF1bHQgUHJvbWlzZSwgdXNlIHNoaW0gb3IgcGFyYW1ldGVyJyk7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gdG9Qcm9taXNlIChvYnMpIHtcblx0ICB2YXIgUHJvbWlzZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGdldEdsb2RhbFByb21pc2UoKSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHZhciBsYXN0ID0gbnVsbDtcblx0ICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgb2JzLm9uQW55KGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIGxhc3QgIT09IG51bGwpIHtcblx0ICAgICAgICAobGFzdC50eXBlID09PSBWQUxVRSA/IHJlc29sdmUgOiByZWplY3QpKGxhc3QudmFsdWUpO1xuXHQgICAgICAgIGxhc3QgPSBudWxsO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIGxhc3QgPSBldmVudDtcblx0ICAgICAgfVxuXHQgICAgfSk7XG5cdCAgfSk7XG5cdH1cblxuXHR2YXIgY29tbW9uanNHbG9iYWwgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHt9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29tbW9uanNNb2R1bGUoZm4sIG1vZHVsZSkge1xuXHRcdHJldHVybiBtb2R1bGUgPSB7IGV4cG9ydHM6IHt9IH0sIGZuKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMpLCBtb2R1bGUuZXhwb3J0cztcblx0fVxuXG5cdHZhciBwb255ZmlsbCA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuXHRcdHZhbHVlOiB0cnVlXG5cdH0pO1xuXHRleHBvcnRzWydkZWZhdWx0J10gPSBzeW1ib2xPYnNlcnZhYmxlUG9ueWZpbGw7XG5cdGZ1bmN0aW9uIHN5bWJvbE9ic2VydmFibGVQb255ZmlsbChyb290KSB7XG5cdFx0dmFyIHJlc3VsdDtcblx0XHR2YXIgX1N5bWJvbCA9IHJvb3QuU3ltYm9sO1xuXG5cdFx0aWYgKHR5cGVvZiBfU3ltYm9sID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRpZiAoX1N5bWJvbC5vYnNlcnZhYmxlKSB7XG5cdFx0XHRcdHJlc3VsdCA9IF9TeW1ib2wub2JzZXJ2YWJsZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJlc3VsdCA9IF9TeW1ib2woJ29ic2VydmFibGUnKTtcblx0XHRcdFx0X1N5bWJvbC5vYnNlcnZhYmxlID0gcmVzdWx0O1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSAnQEBvYnNlcnZhYmxlJztcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9O1xuXHR9KTtcblxuXHR2YXIgcmVxdWlyZSQkMCQxID0gKHBvbnlmaWxsICYmIHR5cGVvZiBwb255ZmlsbCA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIHBvbnlmaWxsID8gcG9ueWZpbGxbJ2RlZmF1bHQnXSA6IHBvbnlmaWxsKTtcblxuXHR2YXIgaW5kZXgkMSA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuXHRcdHZhbHVlOiB0cnVlXG5cdH0pO1xuXG5cdHZhciBfcG9ueWZpbGwgPSByZXF1aXJlJCQwJDE7XG5cblx0dmFyIF9wb255ZmlsbDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9wb255ZmlsbCk7XG5cblx0ZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHtcblx0XHRyZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9O1xuXHR9XG5cblx0dmFyIHJvb3QgPSB1bmRlZmluZWQ7IC8qIGdsb2JhbCB3aW5kb3cgKi9cblxuXHRpZiAodHlwZW9mIGNvbW1vbmpzR2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHJvb3QgPSBjb21tb25qc0dsb2JhbDtcblx0fSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHJvb3QgPSB3aW5kb3c7XG5cdH1cblxuXHR2YXIgcmVzdWx0ID0gKDAsIF9wb255ZmlsbDJbJ2RlZmF1bHQnXSkocm9vdCk7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IHJlc3VsdDtcblx0fSk7XG5cblx0dmFyIHJlcXVpcmUkJDAgPSAoaW5kZXgkMSAmJiB0eXBlb2YgaW5kZXgkMSA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIGluZGV4JDEgPyBpbmRleCQxWydkZWZhdWx0J10gOiBpbmRleCQxKTtcblxuXHR2YXIgaW5kZXggPSBjcmVhdGVDb21tb25qc01vZHVsZShmdW5jdGlvbiAobW9kdWxlKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSQkMDtcblx0fSk7XG5cblx0dmFyICQkb2JzZXJ2YWJsZSA9IChpbmRleCAmJiB0eXBlb2YgaW5kZXggPT09ICdvYmplY3QnICYmICdkZWZhdWx0JyBpbiBpbmRleCA/IGluZGV4WydkZWZhdWx0J10gOiBpbmRleCk7XG5cblx0ZnVuY3Rpb24gZnJvbUVTT2JzZXJ2YWJsZShfb2JzZXJ2YWJsZSkge1xuXHQgIHZhciBvYnNlcnZhYmxlID0gX29ic2VydmFibGVbJCRvYnNlcnZhYmxlXSA/IF9vYnNlcnZhYmxlWyQkb2JzZXJ2YWJsZV0oKSA6IF9vYnNlcnZhYmxlO1xuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblx0ICAgIHZhciB1bnN1YiA9IG9ic2VydmFibGUuc3Vic2NyaWJlKHtcblx0ICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnJvcikge1xuXHQgICAgICAgIGVtaXR0ZXIuZXJyb3IoZXJyb3IpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH0sXG5cdCAgICAgIG5leHQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh2YWx1ZSk7XG5cdCAgICAgIH0sXG5cdCAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfSk7XG5cblx0ICAgIGlmICh1bnN1Yi51bnN1YnNjcmliZSkge1xuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIHVuc3ViLnVuc3Vic2NyaWJlKCk7XG5cdCAgICAgIH07XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICByZXR1cm4gdW5zdWI7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbUVTT2JzZXJ2YWJsZScpO1xuXHR9XG5cblx0ZnVuY3Rpb24gRVNPYnNlcnZhYmxlKG9ic2VydmFibGUpIHtcblx0ICB0aGlzLl9vYnNlcnZhYmxlID0gb2JzZXJ2YWJsZS50YWtlRXJyb3JzKDEpO1xuXHR9XG5cblx0ZXh0ZW5kKEVTT2JzZXJ2YWJsZS5wcm90b3R5cGUsIHtcblx0ICBzdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnNlcnZlck9yT25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgb2JzZXJ2ZXIgPSB0eXBlb2Ygb2JzZXJ2ZXJPck9uTmV4dCA9PT0gJ2Z1bmN0aW9uJyA/IHsgbmV4dDogb2JzZXJ2ZXJPck9uTmV4dCwgZXJyb3I6IG9uRXJyb3IsIGNvbXBsZXRlOiBvbkNvbXBsZXRlIH0gOiBvYnNlcnZlck9yT25OZXh0O1xuXG5cdCAgICB2YXIgZm4gPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUgJiYgb2JzZXJ2ZXIubmV4dCkge1xuXHQgICAgICAgIG9ic2VydmVyLm5leHQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SICYmIG9ic2VydmVyLmVycm9yKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVORCAmJiBvYnNlcnZlci5jb21wbGV0ZSkge1xuXHQgICAgICAgIG9ic2VydmVyLmNvbXBsZXRlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgdGhpcy5fb2JzZXJ2YWJsZS5vbkFueShmbik7XG5cdCAgICB2YXIgY2xvc2VkID0gZmFsc2U7XG5cblx0ICAgIHZhciBzdWJzY3JpcHRpb24gPSB7XG5cdCAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgICBfdGhpcy5fb2JzZXJ2YWJsZS5vZmZBbnkoZm4pO1xuXHQgICAgICB9LFxuXHQgICAgICBnZXQgY2xvc2VkKCkge1xuXHQgICAgICAgIHJldHVybiBjbG9zZWQ7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuXHQgIH1cblx0fSk7XG5cblx0Ly8gTmVlZCB0byBhc3NpZ24gZGlyZWN0bHkgYi9jIFN5bWJvbHMgYXJlbid0IGVudW1lcmFibGUuXG5cdEVTT2JzZXJ2YWJsZS5wcm90b3R5cGVbJCRvYnNlcnZhYmxlXSA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gdGhpcztcblx0fTtcblxuXHRmdW5jdGlvbiB0b0VTT2JzZXJ2YWJsZSgpIHtcblx0ICByZXR1cm4gbmV3IEVTT2JzZXJ2YWJsZSh0aGlzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGRlZmF1bHRFcnJvcnNDb21iaW5hdG9yKGVycm9ycykge1xuXHQgIHZhciBsYXRlc3RFcnJvciA9IHZvaWQgMDtcblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IGVycm9ycy5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKGVycm9yc1tpXSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAgIGlmIChsYXRlc3RFcnJvciA9PT0gdW5kZWZpbmVkIHx8IGxhdGVzdEVycm9yLmluZGV4IDwgZXJyb3JzW2ldLmluZGV4KSB7XG5cdCAgICAgICAgbGF0ZXN0RXJyb3IgPSBlcnJvcnNbaV07XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIGxhdGVzdEVycm9yLmVycm9yO1xuXHR9XG5cblx0ZnVuY3Rpb24gQ29tYmluZShhY3RpdmUsIHBhc3NpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fYWN0aXZlQ291bnQgPSBhY3RpdmUubGVuZ3RoO1xuXHQgIHRoaXMuX3NvdXJjZXMgPSBjb25jYXQoYWN0aXZlLCBwYXNzaXZlKTtcblx0ICB0aGlzLl9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IHNwcmVhZChjb21iaW5hdG9yLCB0aGlzLl9zb3VyY2VzLmxlbmd0aCkgOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdCAgfTtcblx0ICB0aGlzLl9hbGl2ZUNvdW50ID0gMDtcblx0ICB0aGlzLl9sYXRlc3RWYWx1ZXMgPSBuZXcgQXJyYXkodGhpcy5fc291cmNlcy5sZW5ndGgpO1xuXHQgIHRoaXMuX2xhdGVzdEVycm9ycyA9IG5ldyBBcnJheSh0aGlzLl9zb3VyY2VzLmxlbmd0aCk7XG5cdCAgZmlsbEFycmF5KHRoaXMuX2xhdGVzdFZhbHVlcywgTk9USElORyk7XG5cdCAgdGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbiA9IGZhbHNlO1xuXHQgIHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbiA9IGZhbHNlO1xuXHQgIHRoaXMuX2xhdGVzdEVycm9ySW5kZXggPSAwO1xuXG5cdCAgdGhpcy5fJGhhbmRsZXJzID0gW107XG5cblx0ICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoaSkge1xuXHQgICAgX3RoaXMuXyRoYW5kbGVycy5wdXNoKGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShpLCBldmVudCk7XG5cdCAgICB9KTtcblx0ICB9O1xuXG5cdCAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBfbG9vcChpKTtcblx0ICB9XG5cdH1cblxuXHRpbmhlcml0KENvbWJpbmUsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdjb21iaW5lJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2FsaXZlQ291bnQgPSB0aGlzLl9hY3RpdmVDb3VudDtcblxuXHQgICAgLy8gd2UgbmVlZCB0byBzdXNjcmliZSB0byBfcGFzc2l2ZV8gc291cmNlcyBiZWZvcmUgX2FjdGl2ZV9cblx0ICAgIC8vIChzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy85OClcblx0ICAgIGZvciAodmFyIGkgPSB0aGlzLl9hY3RpdmVDb3VudDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IHRoaXMuX2FjdGl2ZUNvdW50OyBfaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbX2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tfaV0pO1xuXHQgICAgfVxuXG5cdCAgICBpZiAodGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbikge1xuXHQgICAgICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgICAgIHRoaXMuX2VtaXRJZkZ1bGwoKTtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24pIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fc291cmNlcy5sZW5ndGgsXG5cdCAgICAgICAgaSA9IHZvaWQgMDtcblx0ICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9mZkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRJZkZ1bGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBoYXNBbGxWYWx1ZXMgPSB0cnVlO1xuXHQgICAgdmFyIGhhc0Vycm9ycyA9IGZhbHNlO1xuXHQgICAgdmFyIGxlbmd0aCA9IHRoaXMuX2xhdGVzdFZhbHVlcy5sZW5ndGg7XG5cdCAgICB2YXIgdmFsdWVzQ29weSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXHQgICAgdmFyIGVycm9yc0NvcHkgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblxuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICB2YWx1ZXNDb3B5W2ldID0gdGhpcy5fbGF0ZXN0VmFsdWVzW2ldO1xuXHQgICAgICBlcnJvcnNDb3B5W2ldID0gdGhpcy5fbGF0ZXN0RXJyb3JzW2ldO1xuXG5cdCAgICAgIGlmICh2YWx1ZXNDb3B5W2ldID09PSBOT1RISU5HKSB7XG5cdCAgICAgICAgaGFzQWxsVmFsdWVzID0gZmFsc2U7XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoZXJyb3JzQ29weVtpXSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAgICAgaGFzRXJyb3JzID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICBpZiAoaGFzQWxsVmFsdWVzKSB7XG5cdCAgICAgIHZhciBjb21iaW5hdG9yID0gdGhpcy5fY29tYmluYXRvcjtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGNvbWJpbmF0b3IodmFsdWVzQ29weSkpO1xuXHQgICAgfVxuXHQgICAgaWYgKGhhc0Vycm9ycykge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IoZXJyb3JzQ29weSkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGksIGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSB8fCBldmVudC50eXBlID09PSBFUlJPUikge1xuXG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdFZhbHVlc1tpXSA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdEVycm9yc1tpXSA9IHVuZGVmaW5lZDtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgICB0aGlzLl9sYXRlc3RWYWx1ZXNbaV0gPSBOT1RISU5HO1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdEVycm9yc1tpXSA9IHtcblx0ICAgICAgICAgIGluZGV4OiB0aGlzLl9sYXRlc3RFcnJvckluZGV4KyssXG5cdCAgICAgICAgICBlcnJvcjogZXZlbnQudmFsdWVcblx0ICAgICAgICB9O1xuXHQgICAgICB9XG5cblx0ICAgICAgaWYgKGkgPCB0aGlzLl9hY3RpdmVDb3VudCkge1xuXHQgICAgICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gdHJ1ZTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdElmRnVsbCgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgLy8gRU5EXG5cblx0ICAgICAgaWYgKGkgPCB0aGlzLl9hY3RpdmVDb3VudCkge1xuXHQgICAgICAgIHRoaXMuX2FsaXZlQ291bnQtLTtcblx0ICAgICAgICBpZiAodGhpcy5fYWxpdmVDb3VudCA9PT0gMCkge1xuXHQgICAgICAgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICAgICAgdGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uID0gdHJ1ZTtcblx0ICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgICAgIH1cblx0ICAgICAgICB9XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXN0VmFsdWVzID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhdGVzdEVycm9ycyA9IG51bGw7XG5cdCAgICB0aGlzLl9jb21iaW5hdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVycyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBjb21iaW5lKGFjdGl2ZSkge1xuXHQgIHZhciBwYXNzaXZlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gW10gOiBhcmd1bWVudHNbMV07XG5cdCAgdmFyIGNvbWJpbmF0b3IgPSBhcmd1bWVudHNbMl07XG5cblx0ICBpZiAodHlwZW9mIHBhc3NpdmUgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIGNvbWJpbmF0b3IgPSBwYXNzaXZlO1xuXHQgICAgcGFzc2l2ZSA9IFtdO1xuXHQgIH1cblx0ICByZXR1cm4gYWN0aXZlLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgQ29tYmluZShhY3RpdmUsIHBhc3NpdmUsIGNvbWJpbmF0b3IpO1xuXHR9XG5cblx0dmFyIE9ic2VydmFibGUkMSA9IHtcblx0ICBlbXB0eTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIG5ldmVyKCk7XG5cdCAgfSxcblxuXG5cdCAgLy8gTW9ub2lkIGJhc2VkIG9uIG1lcmdlKCkgc2VlbXMgbW9yZSB1c2VmdWwgdGhhbiBvbmUgYmFzZWQgb24gY29uY2F0KCkuXG5cdCAgY29uY2F0OiBmdW5jdGlvbiAoYSwgYikge1xuXHQgICAgcmV0dXJuIGEubWVyZ2UoYik7XG5cdCAgfSxcblx0ICBvZjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHJldHVybiBjb25zdGFudCh4KTtcblx0ICB9LFxuXHQgIG1hcDogZnVuY3Rpb24gKGZuLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMubWFwKGZuKTtcblx0ICB9LFxuXHQgIGJpbWFwOiBmdW5jdGlvbiAoZm5FcnIsIGZuVmFsLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMubWFwRXJyb3JzKGZuRXJyKS5tYXAoZm5WYWwpO1xuXHQgIH0sXG5cblxuXHQgIC8vIFRoaXMgYXAgc3RyaWN0bHkgc3BlYWtpbmcgaW5jb21wYXRpYmxlIHdpdGggY2hhaW4uIElmIHdlIGRlcml2ZSBhcCBmcm9tIGNoYWluIHdlIGdldFxuXHQgIC8vIGRpZmZlcmVudCAobm90IHZlcnkgdXNlZnVsKSBiZWhhdmlvci4gQnV0IHNwZWMgcmVxdWlyZXMgdGhhdCBpZiBtZXRob2QgY2FuIGJlIGRlcml2ZWRcblx0ICAvLyBpdCBtdXN0IGhhdmUgdGhlIHNhbWUgYmVoYXZpb3IgYXMgaGFuZC13cml0dGVuIG1ldGhvZC4gV2UgaW50ZW50aW9uYWxseSB2aW9sYXRlIHRoZSBzcGVjXG5cdCAgLy8gaW4gaG9wZSB0aGF0IGl0IHdvbid0IGNhdXNlIG1hbnkgdHJvdWJsZXMgaW4gcHJhY3RpY2UuIEFuZCBpbiByZXR1cm4gd2UgaGF2ZSBtb3JlIHVzZWZ1bCB0eXBlLlxuXHQgIGFwOiBmdW5jdGlvbiAob2JzRm4sIG9ic1ZhbCkge1xuXHQgICAgcmV0dXJuIGNvbWJpbmUoW29ic0ZuLCBvYnNWYWxdLCBmdW5jdGlvbiAoZm4sIHZhbCkge1xuXHQgICAgICByZXR1cm4gZm4odmFsKTtcblx0ICAgIH0pO1xuXHQgIH0sXG5cdCAgY2hhaW46IGZ1bmN0aW9uIChmbiwgb2JzKSB7XG5cdCAgICByZXR1cm4gb2JzLmZsYXRNYXAoZm4pO1xuXHQgIH1cblx0fTtcblxuXG5cblx0dmFyIHN0YXRpY0xhbmQgPSBPYmplY3QuZnJlZXplKHtcblx0ICBPYnNlcnZhYmxlOiBPYnNlcnZhYmxlJDFcblx0fSk7XG5cblx0dmFyIG1peGluID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbih4KSk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDcgPSBjcmVhdGVTdHJlYW0oJ21hcCcsIG1peGluKTtcblx0dmFyIFAkMyA9IGNyZWF0ZVByb3BlcnR5KCdtYXAnLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBtYXAkMShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDcsIFAkMykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ4ID0gY3JlYXRlU3RyZWFtKCdmaWx0ZXInLCBtaXhpbiQxKTtcblx0dmFyIFAkNCA9IGNyZWF0ZVByb3BlcnR5KCdmaWx0ZXInLCBtaXhpbiQxKTtcblxuXHR2YXIgaWQkMSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gZmlsdGVyKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDEgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ4LCBQJDQpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbiA9IF9yZWYubjtcblxuXHQgICAgdGhpcy5fbiA9IG47XG5cdCAgICBpZiAobiA8PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX24tLTtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkOSA9IGNyZWF0ZVN0cmVhbSgndGFrZScsIG1peGluJDIpO1xuXHR2YXIgUCQ1ID0gY3JlYXRlUHJvcGVydHkoJ3Rha2UnLCBtaXhpbiQyKTtcblxuXHRmdW5jdGlvbiB0YWtlKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDksIFAkNSkpKG9icywgeyBuOiBuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbiA9IF9yZWYubjtcblxuXHQgICAgdGhpcy5fbiA9IG47XG5cdCAgICBpZiAobiA8PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX24tLTtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTAgPSBjcmVhdGVTdHJlYW0oJ3Rha2VFcnJvcnMnLCBtaXhpbiQzKTtcblx0dmFyIFAkNiA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlRXJyb3JzJywgbWl4aW4kMyk7XG5cblx0ZnVuY3Rpb24gdGFrZUVycm9ycyhvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMCwgUCQ2KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxMSA9IGNyZWF0ZVN0cmVhbSgndGFrZVdoaWxlJywgbWl4aW4kNCk7XG5cdHZhciBQJDcgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZVdoaWxlJywgbWl4aW4kNCk7XG5cblx0dmFyIGlkJDIgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHRha2VXaGlsZShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQyIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTEsIFAkNykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fbGFzdFZhbHVlID0gTk9USElORztcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbGFzdFZhbHVlID0geDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0VmFsdWUgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2xhc3RWYWx1ZSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDEyID0gY3JlYXRlU3RyZWFtKCdsYXN0JywgbWl4aW4kNSk7XG5cdHZhciBQJDggPSBjcmVhdGVQcm9wZXJ0eSgnbGFzdCcsIG1peGluJDUpO1xuXG5cdGZ1bmN0aW9uIGxhc3Qob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTIsIFAkOCkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gTWF0aC5tYXgoMCwgbik7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbiA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9uLS07XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDEzID0gY3JlYXRlU3RyZWFtKCdza2lwJywgbWl4aW4kNik7XG5cdHZhciBQJDkgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcCcsIG1peGluJDYpO1xuXG5cdGZ1bmN0aW9uIHNraXAob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTMsIFAkOSkpKG9icywgeyBuOiBuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDcgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKHRoaXMuX2ZuICE9PSBudWxsICYmICFmbih4KSkge1xuXHQgICAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fZm4gPT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNCA9IGNyZWF0ZVN0cmVhbSgnc2tpcFdoaWxlJywgbWl4aW4kNyk7XG5cdHZhciBQJDEwID0gY3JlYXRlUHJvcGVydHkoJ3NraXBXaGlsZScsIG1peGluJDcpO1xuXG5cdHZhciBpZCQzID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBza2lwV2hpbGUob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkMyA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE0LCBQJDEwKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ4ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3ByZXYgPSBOT1RISU5HO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX3ByZXYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fcHJldiA9PT0gTk9USElORyB8fCAhZm4odGhpcy5fcHJldiwgeCkpIHtcblx0ICAgICAgdGhpcy5fcHJldiA9IHg7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTUgPSBjcmVhdGVTdHJlYW0oJ3NraXBEdXBsaWNhdGVzJywgbWl4aW4kOCk7XG5cdHZhciBQJDExID0gY3JlYXRlUHJvcGVydHkoJ3NraXBEdXBsaWNhdGVzJywgbWl4aW4kOCk7XG5cblx0dmFyIGVxID0gZnVuY3Rpb24gKGEsIGIpIHtcblx0ICByZXR1cm4gYSA9PT0gYjtcblx0fTtcblxuXHRmdW5jdGlvbiBza2lwRHVwbGljYXRlcyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBlcSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE1LCBQJDExKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ5ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblx0ICAgIHZhciBzZWVkID0gX3JlZi5zZWVkO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fcHJldiA9IHNlZWQ7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fcHJldiA9IG51bGw7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fcHJldiAhPT0gTk9USElORykge1xuXHQgICAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHRoaXMuX3ByZXYsIHgpKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3ByZXYgPSB4O1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNiA9IGNyZWF0ZVN0cmVhbSgnZGlmZicsIG1peGluJDkpO1xuXHR2YXIgUCQxMiA9IGNyZWF0ZVByb3BlcnR5KCdkaWZmJywgbWl4aW4kOSk7XG5cblx0ZnVuY3Rpb24gZGVmYXVsdEZuKGEsIGIpIHtcblx0ICByZXR1cm4gW2EsIGJdO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGlmZihvYnMsIGZuKSB7XG5cdCAgdmFyIHNlZWQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyBOT1RISU5HIDogYXJndW1lbnRzWzJdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTYsIFAkMTIpKShvYnMsIHsgZm46IGZuIHx8IGRlZmF1bHRGbiwgc2VlZDogc2VlZCB9KTtcblx0fVxuXG5cdHZhciBQJDEzID0gY3JlYXRlUHJvcGVydHkoJ3NjYW4nLCB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIHNlZWQgPSBfcmVmLnNlZWQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9zZWVkID0gc2VlZDtcblx0ICAgIGlmIChzZWVkICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShzZWVkKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB0aGlzLl9zZWVkID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRFdmVudCA9PT0gbnVsbCB8fCB0aGlzLl9jdXJyZW50RXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3NlZWQgPT09IE5PVEhJTkcgPyB4IDogZm4odGhpcy5fc2VlZCwgeCkpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHRoaXMuX2N1cnJlbnRFdmVudC52YWx1ZSwgeCkpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc2NhbihvYnMsIGZuKSB7XG5cdCAgdmFyIHNlZWQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyBOT1RISU5HIDogYXJndW1lbnRzWzJdO1xuXG5cdCAgcmV0dXJuIG5ldyBQJDEzKG9icywgeyBmbjogZm4sIHNlZWQ6IHNlZWQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHhzID0gZm4oeCk7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4c1tpXSk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE3ID0gY3JlYXRlU3RyZWFtKCdmbGF0dGVuJywgbWl4aW4kMTApO1xuXG5cdHZhciBpZCQ0ID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmbGF0dGVuKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IFMkMTcob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBFTkRfTUFSS0VSID0ge307XG5cblx0dmFyIG1peGluJDExID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSBNYXRoLm1heCgwLCB3YWl0KTtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuXyRzaGlmdEJ1ZmYgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHZhciB2YWx1ZSA9IF90aGlzLl9idWZmLnNoaWZ0KCk7XG5cdCAgICAgIGlmICh2YWx1ZSA9PT0gRU5EX01BUktFUikge1xuXHQgICAgICAgIF90aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgX3RoaXMuX2VtaXRWYWx1ZSh2YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgICB0aGlzLl8kc2hpZnRCdWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgICAgc2V0VGltZW91dCh0aGlzLl8kc2hpZnRCdWZmLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2J1ZmYucHVzaChFTkRfTUFSS0VSKTtcblx0ICAgICAgc2V0VGltZW91dCh0aGlzLl8kc2hpZnRCdWZmLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTggPSBjcmVhdGVTdHJlYW0oJ2RlbGF5JywgbWl4aW4kMTEpO1xuXHR2YXIgUCQxNCA9IGNyZWF0ZVByb3BlcnR5KCdkZWxheScsIG1peGluJDExKTtcblxuXHRmdW5jdGlvbiBkZWxheShvYnMsIHdhaXQpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxOCwgUCQxNCkpKG9icywgeyB3YWl0OiB3YWl0IH0pO1xuXHR9XG5cblx0dmFyIG5vdyA9IERhdGUubm93ID8gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBEYXRlLm5vdygpO1xuXHR9IDogZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0fTtcblxuXHR2YXIgbWl4aW4kMTIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBsZWFkaW5nID0gX3JlZi5sZWFkaW5nO1xuXHQgICAgdmFyIHRyYWlsaW5nID0gX3JlZi50cmFpbGluZztcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5fbGVhZGluZyA9IGxlYWRpbmc7XG5cdCAgICB0aGlzLl90cmFpbGluZyA9IHRyYWlsaW5nO1xuXHQgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fZW5kTGF0ZXIgPSBmYWxzZTtcblx0ICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9IDA7XG5cdCAgICB0aGlzLl8kdHJhaWxpbmdDYWxsID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX3RyYWlsaW5nQ2FsbCgpO1xuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuXyR0cmFpbGluZ0NhbGwgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdmFyIGN1clRpbWUgPSBub3coKTtcblx0ICAgICAgaWYgKHRoaXMuX2xhc3RDYWxsVGltZSA9PT0gMCAmJiAhdGhpcy5fbGVhZGluZykge1xuXHQgICAgICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9IGN1clRpbWU7XG5cdCAgICAgIH1cblx0ICAgICAgdmFyIHJlbWFpbmluZyA9IHRoaXMuX3dhaXQgLSAoY3VyVGltZSAtIHRoaXMuX2xhc3RDYWxsVGltZSk7XG5cdCAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuXHQgICAgICAgIHRoaXMuX2NhbmNlbFRyYWlsaW5nKCk7XG5cdCAgICAgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gY3VyVGltZTtcblx0ICAgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fdHJhaWxpbmcpIHtcblx0ICAgICAgICB0aGlzLl9jYW5jZWxUcmFpbGluZygpO1xuXHQgICAgICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSB4O1xuXHQgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJHRyYWlsaW5nQ2FsbCwgcmVtYWluaW5nKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX2VuZExhdGVyID0gdHJ1ZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jYW5jZWxUcmFpbGluZzogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCAhPT0gbnVsbCkge1xuXHQgICAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dElkKTtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF90cmFpbGluZ0NhbGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl90cmFpbGluZ1ZhbHVlKTtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9ICF0aGlzLl9sZWFkaW5nID8gMCA6IG5vdygpO1xuXHQgICAgaWYgKHRoaXMuX2VuZExhdGVyKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTkgPSBjcmVhdGVTdHJlYW0oJ3Rocm90dGxlJywgbWl4aW4kMTIpO1xuXHR2YXIgUCQxNSA9IGNyZWF0ZVByb3BlcnR5KCd0aHJvdHRsZScsIG1peGluJDEyKTtcblxuXHRmdW5jdGlvbiB0aHJvdHRsZShvYnMsIHdhaXQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRsZWFkaW5nID0gX3JlZjIubGVhZGluZztcblx0ICB2YXIgbGVhZGluZyA9IF9yZWYyJGxlYWRpbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRsZWFkaW5nO1xuXHQgIHZhciBfcmVmMiR0cmFpbGluZyA9IF9yZWYyLnRyYWlsaW5nO1xuXHQgIHZhciB0cmFpbGluZyA9IF9yZWYyJHRyYWlsaW5nID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkdHJhaWxpbmc7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxOSwgUCQxNSkpKG9icywgeyB3YWl0OiB3YWl0LCBsZWFkaW5nOiBsZWFkaW5nLCB0cmFpbGluZzogdHJhaWxpbmcgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBpbW1lZGlhdGUgPSBfcmVmLmltbWVkaWF0ZTtcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5faW1tZWRpYXRlID0gaW1tZWRpYXRlO1xuXHQgICAgdGhpcy5fbGFzdEF0dGVtcHQgPSAwO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fZW5kTGF0ZXIgPSBmYWxzZTtcblx0ICAgIHRoaXMuXyRsYXRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9sYXRlcigpO1xuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXRlclZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuXyRsYXRlciA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9sYXN0QXR0ZW1wdCA9IG5vdygpO1xuXHQgICAgICBpZiAodGhpcy5faW1tZWRpYXRlICYmICF0aGlzLl90aW1lb3V0SWQpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKCF0aGlzLl90aW1lb3V0SWQpIHtcblx0ICAgICAgICB0aGlzLl90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRoaXMuXyRsYXRlciwgdGhpcy5fd2FpdCk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKCF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9sYXRlclZhbHVlID0geDtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCAmJiAhdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fZW5kTGF0ZXIgPSB0cnVlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2xhdGVyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbGFzdCA9IG5vdygpIC0gdGhpcy5fbGFzdEF0dGVtcHQ7XG5cdCAgICBpZiAobGFzdCA8IHRoaXMuX3dhaXQgJiYgbGFzdCA+PSAwKSB7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJGxhdGVyLCB0aGlzLl93YWl0IC0gbGFzdCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgICBpZiAoIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9sYXRlclZhbHVlKTtcblx0ICAgICAgICB0aGlzLl9sYXRlclZhbHVlID0gbnVsbDtcblx0ICAgICAgfVxuXHQgICAgICBpZiAodGhpcy5fZW5kTGF0ZXIpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjAgPSBjcmVhdGVTdHJlYW0oJ2RlYm91bmNlJywgbWl4aW4kMTMpO1xuXHR2YXIgUCQxNiA9IGNyZWF0ZVByb3BlcnR5KCdkZWJvdW5jZScsIG1peGluJDEzKTtcblxuXHRmdW5jdGlvbiBkZWJvdW5jZShvYnMsIHdhaXQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRpbW1lZGlhdGUgPSBfcmVmMi5pbW1lZGlhdGU7XG5cdCAgdmFyIGltbWVkaWF0ZSA9IF9yZWYyJGltbWVkaWF0ZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBfcmVmMiRpbW1lZGlhdGU7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMCwgUCQxNikpKG9icywgeyB3YWl0OiB3YWl0LCBpbW1lZGlhdGU6IGltbWVkaWF0ZSB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0RXJyb3IoZm4oeCkpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyMSA9IGNyZWF0ZVN0cmVhbSgnbWFwRXJyb3JzJywgbWl4aW4kMTQpO1xuXHR2YXIgUCQxNyA9IGNyZWF0ZVByb3BlcnR5KCdtYXBFcnJvcnMnLCBtaXhpbiQxNCk7XG5cblx0dmFyIGlkJDUgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIG1hcEVycm9ycyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQ1IDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjEsIFAkMTcpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDE1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDIyID0gY3JlYXRlU3RyZWFtKCdmaWx0ZXJFcnJvcnMnLCBtaXhpbiQxNSk7XG5cdHZhciBQJDE4ID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlckVycm9ycycsIG1peGluJDE1KTtcblxuXHR2YXIgaWQkNiA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gZmlsdGVyRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDYgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMiwgUCQxOCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTYgPSB7XG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDIzID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVWYWx1ZXMnLCBtaXhpbiQxNik7XG5cdHZhciBQJDE5ID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZVZhbHVlcycsIG1peGluJDE2KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVWYWx1ZXMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjMsIFAkMTkpKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE3ID0ge1xuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKCkge31cblx0fTtcblxuXHR2YXIgUyQyNCA9IGNyZWF0ZVN0cmVhbSgnaWdub3JlRXJyb3JzJywgbWl4aW4kMTcpO1xuXHR2YXIgUCQyMCA9IGNyZWF0ZVByb3BlcnR5KCdpZ25vcmVFcnJvcnMnLCBtaXhpbiQxNyk7XG5cblx0ZnVuY3Rpb24gaWdub3JlRXJyb3JzKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDI0LCBQJDIwKSkob2JzKTtcblx0fVxuXG5cdHZhciBtaXhpbiQxOCA9IHtcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDI1ID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVFbmQnLCBtaXhpbiQxOCk7XG5cdHZhciBQJDIxID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZUVuZCcsIG1peGluJDE4KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVFbmQob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjUsIFAkMjEpKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE5ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbigpKTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjYgPSBjcmVhdGVTdHJlYW0oJ2JlZm9yZUVuZCcsIG1peGluJDE5KTtcblx0dmFyIFAkMjIgPSBjcmVhdGVQcm9wZXJ0eSgnYmVmb3JlRW5kJywgbWl4aW4kMTkpO1xuXG5cdGZ1bmN0aW9uIGJlZm9yZUVuZChvYnMsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjYsIFAkMjIpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDIwID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIG1pbiA9IF9yZWYubWluO1xuXHQgICAgdmFyIG1heCA9IF9yZWYubWF4O1xuXG5cdCAgICB0aGlzLl9tYXggPSBtYXg7XG5cdCAgICB0aGlzLl9taW4gPSBtaW47XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmID0gc2xpZGUodGhpcy5fYnVmZiwgeCwgdGhpcy5fbWF4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9taW4pIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyNyA9IGNyZWF0ZVN0cmVhbSgnc2xpZGluZ1dpbmRvdycsIG1peGluJDIwKTtcblx0dmFyIFAkMjMgPSBjcmVhdGVQcm9wZXJ0eSgnc2xpZGluZ1dpbmRvdycsIG1peGluJDIwKTtcblxuXHRmdW5jdGlvbiBzbGlkaW5nV2luZG93KG9icywgbWF4KSB7XG5cdCAgdmFyIG1pbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IDAgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNywgUCQyMykpKG9icywgeyBtaW46IG1pbiwgbWF4OiBtYXggfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjEgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICghZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI4ID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaGlsZScsIG1peGluJDIxKTtcblx0dmFyIFAkMjQgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2hpbGUnLCBtaXhpbiQyMSk7XG5cblx0dmFyIGlkJDcgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlKG9icywgZm4pIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRmbHVzaE9uRW5kID0gX3JlZjIuZmx1c2hPbkVuZDtcblx0ICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYyJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRmbHVzaE9uRW5kO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjgsIFAkMjQpKShvYnMsIHsgZm46IGZuIHx8IGlkJDcsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgY291bnQgPSBfcmVmLmNvdW50O1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2NvdW50ID0gY291bnQ7XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fY291bnQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI5ID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaXRoQ291bnQnLCBtaXhpbiQyMik7XG5cdHZhciBQJDI1ID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldpdGhDb3VudCcsIG1peGluJDIyKTtcblxuXHRmdW5jdGlvbiBidWZmZXJXaGlsZSQxKG9icywgY291bnQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRmbHVzaE9uRW5kID0gX3JlZjIuZmx1c2hPbkVuZDtcblx0ICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYyJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRmbHVzaE9uRW5kO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjksIFAkMjUpKShvYnMsIHsgY291bnQ6IGNvdW50LCBmbHVzaE9uRW5kOiBmbHVzaE9uRW5kIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDIzID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cdCAgICB2YXIgY291bnQgPSBfcmVmLmNvdW50O1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSB3YWl0O1xuXHQgICAgdGhpcy5fY291bnQgPSBjb3VudDtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB0aGlzLl8kb25UaWNrID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2ZsdXNoKCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBudWxsO1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX2NvdW50KSB7XG5cdCAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kICYmIHRoaXMuX2J1ZmYubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwodGhpcy5fJG9uVGljaywgdGhpcy5fd2FpdCk7XG5cdCAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ludGVydmFsSWQgIT09IG51bGwpIHtcblx0ICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpOyAvLyBjb3BpZWQgZnJvbSBwYXR0ZXJucy9vbmUtc291cmNlXG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMwID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaXRoVGltZU9yQ291bnQnLCBtaXhpbiQyMyk7XG5cdHZhciBQJDI2ID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldpdGhUaW1lT3JDb3VudCcsIG1peGluJDIzKTtcblxuXHRmdW5jdGlvbiBidWZmZXJXaXRoVGltZU9yQ291bnQob2JzLCB3YWl0LCBjb3VudCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMyB8fCBhcmd1bWVudHNbM10gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzNdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMCwgUCQyNikpKG9icywgeyB3YWl0OiB3YWl0LCBjb3VudDogY291bnQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHRmdW5jdGlvbiB4Zm9ybUZvck9icyhvYnMpIHtcblx0ICByZXR1cm4ge1xuXHQgICAgJ0BAdHJhbnNkdWNlci9zdGVwJzogZnVuY3Rpb24gKHJlcywgaW5wdXQpIHtcblx0ICAgICAgb2JzLl9lbWl0VmFsdWUoaW5wdXQpO1xuXHQgICAgICByZXR1cm4gbnVsbDtcblx0ICAgIH0sXG5cdCAgICAnQEB0cmFuc2R1Y2VyL3Jlc3VsdCc6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgb2JzLl9lbWl0RW5kKCk7XG5cdCAgICAgIHJldHVybiBudWxsO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHR2YXIgbWl4aW4kMjQgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgdHJhbnNkdWNlciA9IF9yZWYudHJhbnNkdWNlcjtcblxuXHQgICAgdGhpcy5feGZvcm0gPSB0cmFuc2R1Y2VyKHhmb3JtRm9yT2JzKHRoaXMpKTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94Zm9ybSA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9zdGVwJ10obnVsbCwgeCkgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9yZXN1bHQnXShudWxsKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hmb3JtWydAQHRyYW5zZHVjZXIvcmVzdWx0J10obnVsbCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMxID0gY3JlYXRlU3RyZWFtKCd0cmFuc2R1Y2UnLCBtaXhpbiQyNCk7XG5cdHZhciBQJDI3ID0gY3JlYXRlUHJvcGVydHkoJ3RyYW5zZHVjZScsIG1peGluJDI0KTtcblxuXHRmdW5jdGlvbiB0cmFuc2R1Y2Uob2JzLCB0cmFuc2R1Y2VyKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMzEsIFAkMjcpKShvYnMsIHsgdHJhbnNkdWNlcjogdHJhbnNkdWNlciB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2hhbmRsZXIgPSBmbjtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBlbWl0dGVyKHRoaXMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHRoaXMuX2hhbmRsZXIodGhpcy5fZW1pdHRlciwgZXZlbnQpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzMiA9IGNyZWF0ZVN0cmVhbSgnd2l0aEhhbmRsZXInLCBtaXhpbiQyNSk7XG5cdHZhciBQJDI4ID0gY3JlYXRlUHJvcGVydHkoJ3dpdGhIYW5kbGVyJywgbWl4aW4kMjUpO1xuXG5cdGZ1bmN0aW9uIHdpdGhIYW5kbGVyKG9icywgZm4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMiwgUCQyOCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG5cdCAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG5cdH07XG5cblx0ZnVuY3Rpb24gWmlwKHNvdXJjZXMsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cblx0ICB0aGlzLl9idWZmZXJzID0gbWFwKHNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0ICAgIHJldHVybiBpc0FycmF5KHNvdXJjZSkgPyBjbG9uZUFycmF5KHNvdXJjZSkgOiBbXTtcblx0ICB9KTtcblx0ICB0aGlzLl9zb3VyY2VzID0gbWFwKHNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0ICAgIHJldHVybiBpc0FycmF5KHNvdXJjZSkgPyBuZXZlcigpIDogc291cmNlO1xuXHQgIH0pO1xuXG5cdCAgdGhpcy5fY29tYmluYXRvciA9IGNvbWJpbmF0b3IgPyBzcHJlYWQoY29tYmluYXRvciwgdGhpcy5fc291cmNlcy5sZW5ndGgpIDogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHJldHVybiB4O1xuXHQgIH07XG5cdCAgdGhpcy5fYWxpdmVDb3VudCA9IDA7XG5cblx0ICB0aGlzLl8kaGFuZGxlcnMgPSBbXTtcblxuXHQgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIChpKSB7XG5cdCAgICBfdGhpcy5fJGhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGksIGV2ZW50KTtcblx0ICAgIH0pO1xuXHQgIH07XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIF9sb29wKGkpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoWmlwLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnemlwJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblxuXHQgICAgLy8gaWYgYWxsIHNvdXJjZXMgYXJlIGFycmF5c1xuXHQgICAgd2hpbGUgKHRoaXMuX2lzRnVsbCgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXQoKTtcblx0ICAgIH1cblxuXHQgICAgdmFyIGxlbmd0aCA9IHRoaXMuX3NvdXJjZXMubGVuZ3RoO1xuXHQgICAgdGhpcy5fYWxpdmVDb3VudCA9IGxlbmd0aDtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoICYmIHRoaXMuX2FjdGl2ZTsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub2ZmQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdDogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIHZhbHVlcyA9IG5ldyBBcnJheSh0aGlzLl9idWZmZXJzLmxlbmd0aCk7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2J1ZmZlcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdmFsdWVzW2ldID0gdGhpcy5fYnVmZmVyc1tpXS5zaGlmdCgpO1xuXHQgICAgfVxuXHQgICAgdmFyIGNvbWJpbmF0b3IgPSB0aGlzLl9jb21iaW5hdG9yO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGNvbWJpbmF0b3IodmFsdWVzKSk7XG5cdCAgfSxcblx0ICBfaXNGdWxsOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2J1ZmZlcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgaWYgKHRoaXMuX2J1ZmZlcnNbaV0ubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgcmV0dXJuIGZhbHNlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdHJ1ZTtcblx0ICB9LFxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChpLCBldmVudCkge1xuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgIHRoaXMuX2J1ZmZlcnNbaV0ucHVzaChldmVudC52YWx1ZSk7XG5cdCAgICAgIGlmICh0aGlzLl9pc0Z1bGwoKSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlQ291bnQtLTtcblx0ICAgICAgaWYgKHRoaXMuX2FsaXZlQ291bnQgPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fYnVmZmVycyA9IG51bGw7XG5cdCAgICB0aGlzLl9jb21iaW5hdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVycyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiB6aXAob2JzZXJ2YWJsZXMsIGNvbWJpbmF0b3IgLyogRnVuY3Rpb24gfCBmYWxzZXkgKi8pIHtcblx0ICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBaaXAob2JzZXJ2YWJsZXMsIGNvbWJpbmF0b3IpO1xuXHR9XG5cblx0dmFyIGlkJDggPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIEFic3RyYWN0UG9vbCgpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgdmFyIF9yZWYgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1swXTtcblxuXHQgIHZhciBfcmVmJHF1ZXVlTGltID0gX3JlZi5xdWV1ZUxpbTtcblx0ICB2YXIgcXVldWVMaW0gPSBfcmVmJHF1ZXVlTGltID09PSB1bmRlZmluZWQgPyAwIDogX3JlZiRxdWV1ZUxpbTtcblx0ICB2YXIgX3JlZiRjb25jdXJMaW0gPSBfcmVmLmNvbmN1ckxpbTtcblx0ICB2YXIgY29uY3VyTGltID0gX3JlZiRjb25jdXJMaW0gPT09IHVuZGVmaW5lZCA/IC0xIDogX3JlZiRjb25jdXJMaW07XG5cdCAgdmFyIF9yZWYkZHJvcCA9IF9yZWYuZHJvcDtcblx0ICB2YXIgZHJvcCA9IF9yZWYkZHJvcCA9PT0gdW5kZWZpbmVkID8gJ25ldycgOiBfcmVmJGRyb3A7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuXHQgIHRoaXMuX3F1ZXVlTGltID0gcXVldWVMaW0gPCAwID8gLTEgOiBxdWV1ZUxpbTtcblx0ICB0aGlzLl9jb25jdXJMaW0gPSBjb25jdXJMaW0gPCAwID8gLTEgOiBjb25jdXJMaW07XG5cdCAgdGhpcy5fZHJvcCA9IGRyb3A7XG5cdCAgdGhpcy5fcXVldWUgPSBbXTtcblx0ICB0aGlzLl9jdXJTb3VyY2VzID0gW107XG5cdCAgdGhpcy5fJGhhbmRsZVN1YkFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVTdWJBbnkoZXZlbnQpO1xuXHQgIH07XG5cdCAgdGhpcy5fJGVuZEhhbmRsZXJzID0gW107XG5cdCAgdGhpcy5fY3VycmVudGx5QWRkaW5nID0gbnVsbDtcblxuXHQgIGlmICh0aGlzLl9jb25jdXJMaW0gPT09IDApIHtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH1cblxuXHRpbmhlcml0KEFic3RyYWN0UG9vbCwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ2Fic3RyYWN0UG9vbCcsXG5cblx0ICBfYWRkOiBmdW5jdGlvbiAob2JqLCB0b09icyAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgICAgdG9PYnMgPSB0b09icyB8fCBpZCQ4O1xuXHQgICAgaWYgKHRoaXMuX2NvbmN1ckxpbSA9PT0gLTEgfHwgdGhpcy5fY3VyU291cmNlcy5sZW5ndGggPCB0aGlzLl9jb25jdXJMaW0pIHtcblx0ICAgICAgdGhpcy5fYWRkVG9DdXIodG9PYnMob2JqKSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fcXVldWVMaW0gPT09IC0xIHx8IHRoaXMuX3F1ZXVlLmxlbmd0aCA8IHRoaXMuX3F1ZXVlTGltKSB7XG5cdCAgICAgICAgdGhpcy5fYWRkVG9RdWV1ZSh0b09icyhvYmopKTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl9kcm9wID09PSAnb2xkJykge1xuXHQgICAgICAgIHRoaXMuX3JlbW92ZU9sZGVzdCgpO1xuXHQgICAgICAgIHRoaXMuX2FkZChvYmosIHRvT2JzKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2FkZEFsbDogZnVuY3Rpb24gKG9ic3MpIHtcblx0ICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG5cdCAgICBmb3JFYWNoKG9ic3MsIGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzMi5fYWRkKG9icyk7XG5cdCAgICB9KTtcblx0ICB9LFxuXHQgIF9yZW1vdmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9yZW1vdmVDdXIob2JzKSA9PT0gLTEpIHtcblx0ICAgICAgdGhpcy5fcmVtb3ZlUXVldWUob2JzKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9hZGRUb1F1ZXVlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB0aGlzLl9xdWV1ZSA9IGNvbmNhdCh0aGlzLl9xdWV1ZSwgW29ic10pO1xuXHQgIH0sXG5cdCAgX2FkZFRvQ3VyOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cblx0ICAgICAgLy8gSEFDSzpcblx0ICAgICAgLy9cblx0ICAgICAgLy8gV2UgaGF2ZSB0d28gb3B0aW1pemF0aW9ucyBmb3IgY2FzZXMgd2hlbiBgb2JzYCBpcyBlbmRlZC4gV2UgZG9uJ3Qgd2FudFxuXHQgICAgICAvLyB0byBhZGQgc3VjaCBvYnNlcnZhYmxlIHRvIHRoZSBsaXN0LCBidXQgb25seSB3YW50IHRvIGVtaXQgZXZlbnRzXG5cdCAgICAgIC8vIGZyb20gaXQgKGlmIGl0IGhhcyBzb21lKS5cblx0ICAgICAgLy9cblx0ICAgICAgLy8gSW5zdGVhZCBvZiB0aGlzIGhhY2tzLCB3ZSBjb3VsZCBqdXN0IGRpZCBmb2xsb3dpbmcsXG5cdCAgICAgIC8vIGJ1dCBpdCB3b3VsZCBiZSA1LTggdGltZXMgc2xvd2VyOlxuXHQgICAgICAvL1xuXHQgICAgICAvLyAgICAgdGhpcy5fY3VyU291cmNlcyA9IGNvbmNhdCh0aGlzLl9jdXJTb3VyY2VzLCBbb2JzXSk7XG5cdCAgICAgIC8vICAgICB0aGlzLl9zdWJzY3JpYmUob2JzKTtcblx0ICAgICAgLy9cblxuXHQgICAgICAvLyAjMVxuXHQgICAgICAvLyBUaGlzIG9uZSBmb3IgY2FzZXMgd2hlbiBgb2JzYCBhbHJlYWR5IGVuZGVkXG5cdCAgICAgIC8vIGUuZy4sIEtlZmlyLmNvbnN0YW50KCkgb3IgS2VmaXIubmV2ZXIoKVxuXHQgICAgICBpZiAoIW9icy5fYWxpdmUpIHtcblx0ICAgICAgICBpZiAob2JzLl9jdXJyZW50RXZlbnQpIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXQob2JzLl9jdXJyZW50RXZlbnQudHlwZSwgb2JzLl9jdXJyZW50RXZlbnQudmFsdWUpO1xuXHQgICAgICAgIH1cblx0ICAgICAgICByZXR1cm47XG5cdCAgICAgIH1cblxuXHQgICAgICAvLyAjMlxuXHQgICAgICAvLyBUaGlzIG9uZSBpcyBmb3IgY2FzZXMgd2hlbiBgb2JzYCBnb2luZyB0byBlbmQgc3luY2hyb25vdXNseSBvblxuXHQgICAgICAvLyBmaXJzdCBzdWJzY3JpYmVyIGUuZy4sIEtlZmlyLnN0cmVhbShlbSA9PiB7ZW0uZW1pdCgxKTsgZW0uZW5kKCl9KVxuXHQgICAgICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBvYnM7XG5cdCAgICAgIG9icy5vbkFueSh0aGlzLl8kaGFuZGxlU3ViQW55KTtcblx0ICAgICAgdGhpcy5fY3VycmVudGx5QWRkaW5nID0gbnVsbDtcblx0ICAgICAgaWYgKG9icy5fYWxpdmUpIHtcblx0ICAgICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgICAgICB0aGlzLl9zdWJUb0VuZChvYnMpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fY3VyU291cmNlcyA9IGNvbmNhdCh0aGlzLl9jdXJTb3VyY2VzLCBbb2JzXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfc3ViVG9FbmQ6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG5cdCAgICB2YXIgb25FbmQgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpczMuX3JlbW92ZUN1cihvYnMpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuXyRlbmRIYW5kbGVycy5wdXNoKHsgb2JzOiBvYnMsIGhhbmRsZXI6IG9uRW5kIH0pO1xuXHQgICAgb2JzLm9uRW5kKG9uRW5kKTtcblx0ICB9LFxuXHQgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIG9icy5vbkFueSh0aGlzLl8kaGFuZGxlU3ViQW55KTtcblxuXHQgICAgLy8gaXQgY2FuIGJlY29tZSBpbmFjdGl2ZSBpbiByZXNwb25jZSBvZiBzdWJzY3JpYmluZyB0byBgb2JzLm9uQW55YCBhYm92ZVxuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9zdWJUb0VuZChvYnMpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3Vuc3Vic2NyaWJlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICBvYnMub2ZmQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXG5cdCAgICB2YXIgb25FbmRJID0gZmluZEJ5UHJlZCh0aGlzLl8kZW5kSGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgcmV0dXJuIG9iai5vYnMgPT09IG9icztcblx0ICAgIH0pO1xuXHQgICAgaWYgKG9uRW5kSSAhPT0gLTEpIHtcblx0ICAgICAgb2JzLm9mZkVuZCh0aGlzLl8kZW5kSGFuZGxlcnNbb25FbmRJXS5oYW5kbGVyKTtcblx0ICAgICAgdGhpcy5fJGVuZEhhbmRsZXJzLnNwbGljZShvbkVuZEksIDEpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVN1YkFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9yZW1vdmVRdWV1ZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgdmFyIGluZGV4ID0gZmluZCh0aGlzLl9xdWV1ZSwgb2JzKTtcblx0ICAgIHRoaXMuX3F1ZXVlID0gcmVtb3ZlKHRoaXMuX3F1ZXVlLCBpbmRleCk7XG5cdCAgICByZXR1cm4gaW5kZXg7XG5cdCAgfSxcblx0ICBfcmVtb3ZlQ3VyOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKG9icyk7XG5cdCAgICB9XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kKHRoaXMuX2N1clNvdXJjZXMsIG9icyk7XG5cdCAgICB0aGlzLl9jdXJTb3VyY2VzID0gcmVtb3ZlKHRoaXMuX2N1clNvdXJjZXMsIGluZGV4KTtcblx0ICAgIGlmIChpbmRleCAhPT0gLTEpIHtcblx0ICAgICAgaWYgKHRoaXMuX3F1ZXVlLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICAgIHRoaXMuX3B1bGxRdWV1ZSgpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fb25FbXB0eSgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gaW5kZXg7XG5cdCAgfSxcblx0ICBfcmVtb3ZlT2xkZXN0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9yZW1vdmVDdXIodGhpcy5fY3VyU291cmNlc1swXSk7XG5cdCAgfSxcblx0ICBfcHVsbFF1ZXVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX3F1ZXVlID0gY2xvbmVBcnJheSh0aGlzLl9xdWV1ZSk7XG5cdCAgICAgIHRoaXMuX2FkZFRvQ3VyKHRoaXMuX3F1ZXVlLnNoaWZ0KCkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDAsIHNvdXJjZXMgPSB0aGlzLl9jdXJTb3VyY2VzOyBpIDwgc291cmNlcy5sZW5ndGggJiYgdGhpcy5fYWN0aXZlOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc3Vic2NyaWJlKHNvdXJjZXNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc291cmNlcyA9IHRoaXMuX2N1clNvdXJjZXM7IGkgPCBzb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKHNvdXJjZXNbaV0pO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRseUFkZGluZyAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSh0aGlzLl9jdXJyZW50bHlBZGRpbmcpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2lzRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiB0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA9PT0gMDtcblx0ICB9LFxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiAoKSB7fSxcblx0ICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9xdWV1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9jdXJTb3VyY2VzID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVTdWJBbnkgPSBudWxsO1xuXHQgICAgdGhpcy5fJGVuZEhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIE1lcmdlKHNvdXJjZXMpIHtcblx0ICBBYnN0cmFjdFBvb2wuY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9hZGRBbGwoc291cmNlcyk7XG5cdCAgdGhpcy5faW5pdGlhbGlzZWQgPSB0cnVlO1xuXHR9XG5cblx0aW5oZXJpdChNZXJnZSwgQWJzdHJhY3RQb29sLCB7XG5cblx0ICBfbmFtZTogJ21lcmdlJyxcblxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5faW5pdGlhbGlzZWQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gbWVyZ2Uob2JzZXJ2YWJsZXMpIHtcblx0ICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBNZXJnZShvYnNlcnZhYmxlcyk7XG5cdH1cblxuXHRmdW5jdGlvbiBTJDMzKGdlbmVyYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9nZW5lcmF0b3IgPSBnZW5lcmF0b3I7XG5cdCAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICB0aGlzLl9pbkxvb3AgPSBmYWxzZTtcblx0ICB0aGlzLl9pdGVyYXRpb24gPSAwO1xuXHQgIHRoaXMuXyRoYW5kbGVBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGV2ZW50KTtcblx0ICB9O1xuXHR9XG5cblx0aW5oZXJpdChTJDMzLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAncmVwZWF0JyxcblxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgICB0aGlzLl9nZXRTb3VyY2UoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXQoZXZlbnQudHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2dldFNvdXJjZTogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKCF0aGlzLl9pbkxvb3ApIHtcblx0ICAgICAgdGhpcy5faW5Mb29wID0gdHJ1ZTtcblx0ICAgICAgdmFyIGdlbmVyYXRvciA9IHRoaXMuX2dlbmVyYXRvcjtcblx0ICAgICAgd2hpbGUgKHRoaXMuX3NvdXJjZSA9PT0gbnVsbCAmJiB0aGlzLl9hbGl2ZSAmJiB0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9zb3VyY2UgPSBnZW5lcmF0b3IodGhpcy5faXRlcmF0aW9uKyspO1xuXHQgICAgICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9pbkxvb3AgPSBmYWxzZTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZ2V0U291cmNlKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX2dlbmVyYXRvciA9IG51bGw7XG5cdCAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZUFueSA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiByZXBlYXQgKGdlbmVyYXRvcikge1xuXHQgIHJldHVybiBuZXcgUyQzMyhnZW5lcmF0b3IpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29uY2F0JDEob2JzZXJ2YWJsZXMpIHtcblx0ICByZXR1cm4gcmVwZWF0KGZ1bmN0aW9uIChpbmRleCkge1xuXHQgICAgcmV0dXJuIG9ic2VydmFibGVzLmxlbmd0aCA+IGluZGV4ID8gb2JzZXJ2YWJsZXNbaW5kZXhdIDogZmFsc2U7XG5cdCAgfSkuc2V0TmFtZSgnY29uY2F0Jyk7XG5cdH1cblxuXHRmdW5jdGlvbiBQb29sKCkge1xuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMpO1xuXHR9XG5cblx0aW5oZXJpdChQb29sLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9uYW1lOiAncG9vbCcsXG5cblx0ICBwbHVnOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB0aGlzLl9hZGQob2JzKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgdW5wbHVnOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB0aGlzLl9yZW1vdmUob2JzKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gRmxhdE1hcChzb3VyY2UsIGZuLCBvcHRpb25zKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXHQgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZTtcblx0ICB0aGlzLl9mbiA9IGZuO1xuXHQgIHRoaXMuX21haW5FbmRlZCA9IGZhbHNlO1xuXHQgIHRoaXMuX2xhc3RDdXJyZW50ID0gbnVsbDtcblx0ICB0aGlzLl8kaGFuZGxlTWFpbiA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVNYWluKGV2ZW50KTtcblx0ICB9O1xuXHR9XG5cblx0aW5oZXJpdChGbGF0TWFwLCBBYnN0cmFjdFBvb2wsIHtcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9vbkFjdGl2YXRpb24uY2FsbCh0aGlzKTtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVNYWluKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgQWJzdHJhY3RQb29sLnByb3RvdHlwZS5fb25EZWFjdGl2YXRpb24uY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZU1haW4pO1xuXHQgICAgdGhpcy5faGFkTm9FdlNpbmNlRGVhY3QgPSB0cnVlO1xuXHQgIH0sXG5cdCAgX2hhbmRsZU1haW46IGZ1bmN0aW9uIChldmVudCkge1xuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgLy8gSXMgbGF0ZXN0IHZhbHVlIGJlZm9yZSBkZWFjdGl2YXRpb24gc3Vydml2ZWQsIGFuZCBub3cgaXMgJ2N1cnJlbnQnIG9uIHRoaXMgYWN0aXZhdGlvbj9cblx0ICAgICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBoYW5kbGUgc3VjaCB2YWx1ZXMsIHRvIHByZXZlbnQgdG8gY29uc3RhbnRseSBhZGRcblx0ICAgICAgLy8gc2FtZSBvYnNlcnZhbGUgb24gZWFjaCBhY3RpdmF0aW9uL2RlYWN0aXZhdGlvbiB3aGVuIG91ciBtYWluIHNvdXJjZVxuXHQgICAgICAvLyBpcyBhIGBLZWZpci5jb25hdGFudCgpYCBmb3IgZXhhbXBsZS5cblx0ICAgICAgdmFyIHNhbWVDdXJyID0gdGhpcy5fYWN0aXZhdGluZyAmJiB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCAmJiB0aGlzLl9sYXN0Q3VycmVudCA9PT0gZXZlbnQudmFsdWU7XG5cdCAgICAgIGlmICghc2FtZUN1cnIpIHtcblx0ICAgICAgICB0aGlzLl9hZGQoZXZlbnQudmFsdWUsIHRoaXMuX2ZuKTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9sYXN0Q3VycmVudCA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICBpZiAodGhpcy5faXNFbXB0eSgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX21haW5FbmRlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbWFpbkVuZGVkKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgQWJzdHJhY3RQb29sLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXN0Q3VycmVudCA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlTWFpbiA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBGbGF0TWFwRXJyb3JzKHNvdXJjZSwgZm4pIHtcblx0ICBGbGF0TWFwLmNhbGwodGhpcywgc291cmNlLCBmbik7XG5cdH1cblxuXHRpbmhlcml0KEZsYXRNYXBFcnJvcnMsIEZsYXRNYXAsIHtcblxuXHQgIC8vIFNhbWUgYXMgaW4gRmxhdE1hcCwgb25seSBWQUxVRS9FUlJPUiBmbGlwcGVkXG5cdCAgX2hhbmRsZU1haW46IGZ1bmN0aW9uIChldmVudCkge1xuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdmFyIHNhbWVDdXJyID0gdGhpcy5fYWN0aXZhdGluZyAmJiB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCAmJiB0aGlzLl9sYXN0Q3VycmVudCA9PT0gZXZlbnQudmFsdWU7XG5cdCAgICAgIGlmICghc2FtZUN1cnIpIHtcblx0ICAgICAgICB0aGlzLl9hZGQoZXZlbnQudmFsdWUsIHRoaXMuX2ZuKTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9sYXN0Q3VycmVudCA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICBpZiAodGhpcy5faXNFbXB0eSgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX21haW5FbmRlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbnN0cnVjdG9yJDEoQmFzZUNsYXNzLCBuYW1lKSB7XG5cdCAgcmV0dXJuIGZ1bmN0aW9uIEFub255bW91c09ic2VydmFibGUocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBCYXNlQ2xhc3MuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3ByaW1hcnkgPSBwcmltYXJ5O1xuXHQgICAgdGhpcy5fc2Vjb25kYXJ5ID0gc2Vjb25kYXJ5O1xuXHQgICAgdGhpcy5fbmFtZSA9IHByaW1hcnkuX25hbWUgKyAnLicgKyBuYW1lO1xuXHQgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IE5PVEhJTkc7XG5cdCAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlU2Vjb25kYXJ5QW55KGV2ZW50KTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVByaW1hcnlBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuX2luaXQob3B0aW9ucyk7XG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKEJhc2VDbGFzcykge1xuXHQgIHJldHVybiB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSB4O1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVQcmltYXJ5RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlFbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlU2Vjb25kYXJ5VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRVJST1I6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlU2Vjb25kYXJ5RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgICAgdGhpcy5faGFuZGxlU2Vjb25kYXJ5RW5kKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICAgIHRoaXMuX3JlbW92ZVNlY29uZGFyeSgpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX3JlbW92ZVNlY29uZGFyeTogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgICAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9wcmltYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgICAgfVxuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9wcmltYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSk7XG5cdCAgICB9LFxuXHQgICAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIEJhc2VDbGFzcy5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICAgIHRoaXMuX3ByaW1hcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9zZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSA9IG51bGw7XG5cdCAgICAgIHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTdHJlYW0kMShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBTID0gY3JlYXRlQ29uc3RydWN0b3IkMShTdHJlYW0sIG5hbWUpO1xuXHQgIGluaGVyaXQoUywgU3RyZWFtLCBjcmVhdGVDbGFzc01ldGhvZHMkMShTdHJlYW0pLCBtaXhpbik7XG5cdCAgcmV0dXJuIFM7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVQcm9wZXJ0eSQxKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFAgPSBjcmVhdGVDb25zdHJ1Y3RvciQxKFByb3BlcnR5LCBuYW1lKTtcblx0ICBpbmhlcml0KFAsIFByb3BlcnR5LCBjcmVhdGVDbGFzc01ldGhvZHMkMShQcm9wZXJ0eSksIG1peGluKTtcblx0ICByZXR1cm4gUDtcblx0fVxuXG5cdHZhciBtaXhpbiQyNiA9IHtcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcgJiYgdGhpcy5fbGFzdFNlY29uZGFyeSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORyB8fCAhdGhpcy5fbGFzdFNlY29uZGFyeSkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM0ID0gY3JlYXRlU3RyZWFtJDEoJ2ZpbHRlckJ5JywgbWl4aW4kMjYpO1xuXHR2YXIgUCQyOSA9IGNyZWF0ZVByb3BlcnR5JDEoJ2ZpbHRlckJ5JywgbWl4aW4kMjYpO1xuXG5cdGZ1bmN0aW9uIGZpbHRlckJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNCwgUCQyOSkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgaWQyID0gZnVuY3Rpb24gKF8sIHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBzYW1wbGVkQnkocGFzc2l2ZSwgYWN0aXZlLCBjb21iaW5hdG9yKSB7XG5cdCAgdmFyIF9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gY29tYmluYXRvcihiLCBhKTtcblx0ICB9IDogaWQyO1xuXHQgIHJldHVybiBjb21iaW5lKFthY3RpdmVdLCBbcGFzc2l2ZV0sIF9jb21iaW5hdG9yKS5zZXROYW1lKHBhc3NpdmUsICdzYW1wbGVkQnknKTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNyA9IHtcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgPT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzNSA9IGNyZWF0ZVN0cmVhbSQxKCdza2lwVW50aWxCeScsIG1peGluJDI3KTtcblx0dmFyIFAkMzAgPSBjcmVhdGVQcm9wZXJ0eSQxKCdza2lwVW50aWxCeScsIG1peGluJDI3KTtcblxuXHRmdW5jdGlvbiBza2lwVW50aWxCeShwcmltYXJ5LCBzZWNvbmRhcnkpIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMkMzUsIFAkMzApKShwcmltYXJ5LCBzZWNvbmRhcnkpO1xuXHR9XG5cblx0dmFyIG1peGluJDI4ID0ge1xuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzNiA9IGNyZWF0ZVN0cmVhbSQxKCd0YWtlVW50aWxCeScsIG1peGluJDI4KTtcblx0dmFyIFAkMzEgPSBjcmVhdGVQcm9wZXJ0eSQxKCd0YWtlVW50aWxCeScsIG1peGluJDI4KTtcblxuXHRmdW5jdGlvbiB0YWtlVW50aWxCeShwcmltYXJ5LCBzZWNvbmRhcnkpIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMkMzYsIFAkMzEpKShwcmltYXJ5LCBzZWNvbmRhcnkpO1xuXHR9XG5cblx0dmFyIG1peGluJDI5ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmJGZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fcHJpbWFyeS5vbkFueSh0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSk7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUgJiYgdGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3NlY29uZGFyeS5vbkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzNyA9IGNyZWF0ZVN0cmVhbSQxKCdidWZmZXJCeScsIG1peGluJDI5KTtcblx0dmFyIFAkMzIgPSBjcmVhdGVQcm9wZXJ0eSQxKCdidWZmZXJCeScsIG1peGluJDI5KTtcblxuXHRmdW5jdGlvbiBidWZmZXJCeShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMgLyogb3B0aW9uYWwgKi8pIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMkMzcsIFAkMzIpKShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDMwID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmJGZsdXNoT25FbmQ7XG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uQ2hhbmdlID0gX3JlZi5mbHVzaE9uQ2hhbmdlO1xuXHQgICAgdmFyIGZsdXNoT25DaGFuZ2UgPSBfcmVmJGZsdXNoT25DaGFuZ2UgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogX3JlZiRmbHVzaE9uQ2hhbmdlO1xuXG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2ZsdXNoT25DaGFuZ2UgPSBmbHVzaE9uQ2hhbmdlO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ICE9PSBOT1RISU5HICYmICF0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2ZsdXNoT25FbmQgJiYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgPT09IE5PVEhJTkcgfHwgdGhpcy5fbGFzdFNlY29uZGFyeSkpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25DaGFuZ2UgJiYgIXgpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblxuXHQgICAgLy8gZnJvbSBkZWZhdWx0IF9oYW5kbGVTZWNvbmRhcnlWYWx1ZVxuXHQgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IHg7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM4ID0gY3JlYXRlU3RyZWFtJDEoJ2J1ZmZlcldoaWxlQnknLCBtaXhpbiQzMCk7XG5cdHZhciBQJDMzID0gY3JlYXRlUHJvcGVydHkkMSgnYnVmZmVyV2hpbGVCeScsIG1peGluJDMwKTtcblxuXHRmdW5jdGlvbiBidWZmZXJXaGlsZUJ5KHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyAvKiBvcHRpb25hbCAqLykge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzOCwgUCQzMykpKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHR2YXIgZiA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gZmFsc2U7XG5cdH07XG5cdHZhciB0ID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGF3YWl0aW5nKGEsIGIpIHtcblx0ICB2YXIgcmVzdWx0ID0gbWVyZ2UoW21hcCQxKGEsIHQpLCBtYXAkMShiLCBmKV0pO1xuXHQgIHJlc3VsdCA9IHNraXBEdXBsaWNhdGVzKHJlc3VsdCk7XG5cdCAgcmVzdWx0ID0gdG9Qcm9wZXJ0eShyZXN1bHQsIGYpO1xuXHQgIHJldHVybiByZXN1bHQuc2V0TmFtZShhLCAnYXdhaXRpbmcnKTtcblx0fVxuXG5cdHZhciBtaXhpbiQzMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgcmVzdWx0ID0gZm4oeCk7XG5cdCAgICBpZiAocmVzdWx0LmNvbnZlcnQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHJlc3VsdC5lcnJvcik7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM5ID0gY3JlYXRlU3RyZWFtKCd2YWx1ZXNUb0Vycm9ycycsIG1peGluJDMxKTtcblx0dmFyIFAkMzQgPSBjcmVhdGVQcm9wZXJ0eSgndmFsdWVzVG9FcnJvcnMnLCBtaXhpbiQzMSk7XG5cblx0dmFyIGRlZkZuID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geyBjb252ZXJ0OiB0cnVlLCBlcnJvcjogeCB9O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHZhbHVlc1RvRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGRlZkZuIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMzksIFAkMzQpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDMyID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciByZXN1bHQgPSBmbih4KTtcblx0ICAgIGlmIChyZXN1bHQuY29udmVydCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUocmVzdWx0LnZhbHVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNDAgPSBjcmVhdGVTdHJlYW0oJ2Vycm9yc1RvVmFsdWVzJywgbWl4aW4kMzIpO1xuXHR2YXIgUCQzNSA9IGNyZWF0ZVByb3BlcnR5KCdlcnJvcnNUb1ZhbHVlcycsIG1peGluJDMyKTtcblxuXHR2YXIgZGVmRm4kMSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHsgY29udmVydDogdHJ1ZSwgdmFsdWU6IHggfTtcblx0fTtcblxuXHRmdW5jdGlvbiBlcnJvcnNUb1ZhbHVlcyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBkZWZGbiQxIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkNDAsIFAkMzUpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDMzID0ge1xuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNDEgPSBjcmVhdGVTdHJlYW0oJ2VuZE9uRXJyb3InLCBtaXhpbiQzMyk7XG5cdHZhciBQJDM2ID0gY3JlYXRlUHJvcGVydHkoJ2VuZE9uRXJyb3InLCBtaXhpbiQzMyk7XG5cblx0ZnVuY3Rpb24gZW5kT25FcnJvcihvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ0MSwgUCQzNikpKG9icyk7XG5cdH1cblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1Byb3BlcnR5ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHRvUHJvcGVydHkodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNoYW5nZXMgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGNoYW5nZXModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9Qcm9taXNlID0gZnVuY3Rpb24gKFByb21pc2UpIHtcblx0ICByZXR1cm4gdG9Qcm9taXNlKHRoaXMsIFByb21pc2UpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvRVNPYnNlcnZhYmxlID0gdG9FU09ic2VydmFibGU7XG5cdE9ic2VydmFibGUucHJvdG90eXBlWyQkb2JzZXJ2YWJsZV0gPSB0b0VTT2JzZXJ2YWJsZTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbWFwJDEodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBmaWx0ZXIodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2UgPSBmdW5jdGlvbiAobikge1xuXHQgIHJldHVybiB0YWtlKHRoaXMsIG4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VFcnJvcnMgPSBmdW5jdGlvbiAobikge1xuXHQgIHJldHVybiB0YWtlRXJyb3JzKHRoaXMsIG4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VXaGlsZSA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB0YWtlV2hpbGUodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmxhc3QgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGxhc3QodGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHNraXAodGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcFdoaWxlID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHNraXBXaGlsZSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcER1cGxpY2F0ZXMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gc2tpcER1cGxpY2F0ZXModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbiAoZm4sIHNlZWQpIHtcblx0ICByZXR1cm4gZGlmZih0aGlzLCBmbiwgc2VlZCk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2NhbiA9IGZ1bmN0aW9uIChmbiwgc2VlZCkge1xuXHQgIHJldHVybiBzY2FuKHRoaXMsIGZuLCBzZWVkKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0dGVuID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZsYXR0ZW4odGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKHdhaXQpIHtcblx0ICByZXR1cm4gZGVsYXkodGhpcywgd2FpdCk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGhyb3R0bGUgPSBmdW5jdGlvbiAod2FpdCwgb3B0aW9ucykge1xuXHQgIHJldHVybiB0aHJvdHRsZSh0aGlzLCB3YWl0LCBvcHRpb25zKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5kZWJvdW5jZSA9IGZ1bmN0aW9uICh3YWl0LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGRlYm91bmNlKHRoaXMsIHdhaXQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1hcEVycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBtYXBFcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZpbHRlckVycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBmaWx0ZXJFcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZVZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlVmFsdWVzKHRoaXMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZUVycm9ycyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlRXJyb3JzKHRoaXMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZUVuZCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlRW5kKHRoaXMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJlZm9yZUVuZCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBiZWZvcmVFbmQodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNsaWRpbmdXaW5kb3cgPSBmdW5jdGlvbiAobWF4LCBtaW4pIHtcblx0ICByZXR1cm4gc2xpZGluZ1dpbmRvdyh0aGlzLCBtYXgsIG1pbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2hpbGUgPSBmdW5jdGlvbiAoZm4sIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2hpbGUodGhpcywgZm4sIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldpdGhDb3VudCA9IGZ1bmN0aW9uIChjb3VudCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZSQxKHRoaXMsIGNvdW50LCBvcHRpb25zKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaXRoVGltZU9yQ291bnQgPSBmdW5jdGlvbiAod2FpdCwgY291bnQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2l0aFRpbWVPckNvdW50KHRoaXMsIHdhaXQsIGNvdW50LCBvcHRpb25zKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50cmFuc2R1Y2UgPSBmdW5jdGlvbiAodHJhbnNkdWNlcikge1xuXHQgIHJldHVybiB0cmFuc2R1Y2UodGhpcywgdHJhbnNkdWNlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUud2l0aEhhbmRsZXIgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gd2l0aEhhbmRsZXIodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNvbWJpbmUgPSBmdW5jdGlvbiAob3RoZXIsIGNvbWJpbmF0b3IpIHtcblx0ICByZXR1cm4gY29tYmluZShbdGhpcywgb3RoZXJdLCBjb21iaW5hdG9yKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS56aXAgPSBmdW5jdGlvbiAob3RoZXIsIGNvbWJpbmF0b3IpIHtcblx0ICByZXR1cm4gemlwKFt0aGlzLCBvdGhlcl0sIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIG1lcmdlKFt0aGlzLCBvdGhlcl0pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBjb25jYXQkMShbdGhpcywgb3RoZXJdKTtcblx0fTtcblxuXHR2YXIgcG9vbCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbmV3IFBvb2woKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuKS5zZXROYW1lKHRoaXMsICdmbGF0TWFwJyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBMYXRlc3QgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgY29uY3VyTGltOiAxLCBkcm9wOiAnb2xkJyB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwTGF0ZXN0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBGaXJzdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBjb25jdXJMaW06IDEgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcEZpcnN0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBDb25jYXQgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgcXVldWVMaW06IC0xLCBjb25jdXJMaW06IDEgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcENvbmNhdCcpO1xuXHR9O1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwQ29uY3VyTGltaXQgPSBmdW5jdGlvbiAoZm4sIGxpbWl0KSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IHF1ZXVlTGltOiAtMSwgY29uY3VyTGltOiBsaW1pdCB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwQ29uY3VyTGltaXQnKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwRXJyb3JzKHRoaXMsIGZuKS5zZXROYW1lKHRoaXMsICdmbGF0TWFwRXJyb3JzJyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gZmlsdGVyQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNhbXBsZWRCeSA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiBzYW1wbGVkQnkodGhpcywgb3RoZXIsIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNraXBVbnRpbEJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIHNraXBVbnRpbEJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50YWtlVW50aWxCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiB0YWtlVW50aWxCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyQnkgPSBmdW5jdGlvbiAob3RoZXIsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyQnkodGhpcywgb3RoZXIsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldoaWxlQnkgPSBmdW5jdGlvbiAob3RoZXIsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2hpbGVCeSh0aGlzLCBvdGhlciwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gRGVwcmVjYXRlZFxuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHZhciBERVBSRUNBVElPTl9XQVJOSU5HUyA9IHRydWU7XG5cdGZ1bmN0aW9uIGRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncygpIHtcblx0ICBERVBSRUNBVElPTl9XQVJOSU5HUyA9IGZhbHNlO1xuXHR9XG5cblx0ZnVuY3Rpb24gd2Fybihtc2cpIHtcblx0ICBpZiAoREVQUkVDQVRJT05fV0FSTklOR1MgJiYgY29uc29sZSAmJiB0eXBlb2YgY29uc29sZS53YXJuID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICB2YXIgbXNnMiA9ICdcXG5IZXJlIGlzIGFuIEVycm9yIG9iamVjdCBmb3IgeW91IGNvbnRhaW5pbmcgdGhlIGNhbGwgc3RhY2s6Jztcblx0ICAgIGNvbnNvbGUud2Fybihtc2csIG1zZzIsIG5ldyBFcnJvcigpKTtcblx0ICB9XG5cdH1cblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5hd2FpdGluZyA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAuYXdhaXRpbmcoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0NScpO1xuXHQgIHJldHVybiBhd2FpdGluZyh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudmFsdWVzVG9FcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLnZhbHVlc1RvRXJyb3JzKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDknKTtcblx0ICByZXR1cm4gdmFsdWVzVG9FcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmVycm9yc1RvVmFsdWVzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5lcnJvcnNUb1ZhbHVlcygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ5Jyk7XG5cdCAgcmV0dXJuIGVycm9yc1RvVmFsdWVzKHRoaXMsIGZuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5lbmRPbkVycm9yID0gZnVuY3Rpb24gKCkge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAuZW5kT25FcnJvcigpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTUwJyk7XG5cdCAgcmV0dXJuIGVuZE9uRXJyb3IodGhpcyk7XG5cdH07XG5cblx0Ly8gRXhwb3J0c1xuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHZhciBLZWZpciA9IHsgT2JzZXJ2YWJsZTogT2JzZXJ2YWJsZSwgU3RyZWFtOiBTdHJlYW0sIFByb3BlcnR5OiBQcm9wZXJ0eSwgbmV2ZXI6IG5ldmVyLCBsYXRlcjogbGF0ZXIsIGludGVydmFsOiBpbnRlcnZhbCwgc2VxdWVudGlhbGx5OiBzZXF1ZW50aWFsbHksXG5cdCAgZnJvbVBvbGw6IGZyb21Qb2xsLCB3aXRoSW50ZXJ2YWw6IHdpdGhJbnRlcnZhbCwgZnJvbUNhbGxiYWNrOiBmcm9tQ2FsbGJhY2ssIGZyb21Ob2RlQ2FsbGJhY2s6IGZyb21Ob2RlQ2FsbGJhY2ssIGZyb21FdmVudHM6IGZyb21FdmVudHMsIHN0cmVhbTogc3RyZWFtLFxuXHQgIGNvbnN0YW50OiBjb25zdGFudCwgY29uc3RhbnRFcnJvcjogY29uc3RhbnRFcnJvciwgZnJvbVByb21pc2U6IGZyb21Qcm9taXNlLCBmcm9tRVNPYnNlcnZhYmxlOiBmcm9tRVNPYnNlcnZhYmxlLCBjb21iaW5lOiBjb21iaW5lLCB6aXA6IHppcCwgbWVyZ2U6IG1lcmdlLFxuXHQgIGNvbmNhdDogY29uY2F0JDEsIFBvb2w6IFBvb2wsIHBvb2w6IHBvb2wsIHJlcGVhdDogcmVwZWF0LCBzdGF0aWNMYW5kOiBzdGF0aWNMYW5kIH07XG5cblx0S2VmaXIuS2VmaXIgPSBLZWZpcjtcblxuXHRleHBvcnRzLmRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncyA9IGRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncztcblx0ZXhwb3J0cy5LZWZpciA9IEtlZmlyO1xuXHRleHBvcnRzLk9ic2VydmFibGUgPSBPYnNlcnZhYmxlO1xuXHRleHBvcnRzLlN0cmVhbSA9IFN0cmVhbTtcblx0ZXhwb3J0cy5Qcm9wZXJ0eSA9IFByb3BlcnR5O1xuXHRleHBvcnRzLm5ldmVyID0gbmV2ZXI7XG5cdGV4cG9ydHMubGF0ZXIgPSBsYXRlcjtcblx0ZXhwb3J0cy5pbnRlcnZhbCA9IGludGVydmFsO1xuXHRleHBvcnRzLnNlcXVlbnRpYWxseSA9IHNlcXVlbnRpYWxseTtcblx0ZXhwb3J0cy5mcm9tUG9sbCA9IGZyb21Qb2xsO1xuXHRleHBvcnRzLndpdGhJbnRlcnZhbCA9IHdpdGhJbnRlcnZhbDtcblx0ZXhwb3J0cy5mcm9tQ2FsbGJhY2sgPSBmcm9tQ2FsbGJhY2s7XG5cdGV4cG9ydHMuZnJvbU5vZGVDYWxsYmFjayA9IGZyb21Ob2RlQ2FsbGJhY2s7XG5cdGV4cG9ydHMuZnJvbUV2ZW50cyA9IGZyb21FdmVudHM7XG5cdGV4cG9ydHMuc3RyZWFtID0gc3RyZWFtO1xuXHRleHBvcnRzLmNvbnN0YW50ID0gY29uc3RhbnQ7XG5cdGV4cG9ydHMuY29uc3RhbnRFcnJvciA9IGNvbnN0YW50RXJyb3I7XG5cdGV4cG9ydHMuZnJvbVByb21pc2UgPSBmcm9tUHJvbWlzZTtcblx0ZXhwb3J0cy5mcm9tRVNPYnNlcnZhYmxlID0gZnJvbUVTT2JzZXJ2YWJsZTtcblx0ZXhwb3J0cy5jb21iaW5lID0gY29tYmluZTtcblx0ZXhwb3J0cy56aXAgPSB6aXA7XG5cdGV4cG9ydHMubWVyZ2UgPSBtZXJnZTtcblx0ZXhwb3J0cy5jb25jYXQgPSBjb25jYXQkMTtcblx0ZXhwb3J0cy5Qb29sID0gUG9vbDtcblx0ZXhwb3J0cy5wb29sID0gcG9vbDtcblx0ZXhwb3J0cy5yZXBlYXQgPSByZXBlYXQ7XG5cdGV4cG9ydHMuc3RhdGljTGFuZCA9IHN0YXRpY0xhbmQ7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IEtlZmlyO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKTsiLCJpbXBvcnQgc25hYmJkb20gZnJvbSAnc25hYmJkb20vc25hYmJkb20uanMnXG5pbXBvcnQgaCBmcm9tICdzbmFiYmRvbS9oLmpzJ1xuaW1wb3J0IHNuYWJDbGFzcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzLmpzJ1xuaW1wb3J0IHNuYWJQcm9wcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzJ1xuaW1wb3J0IHNuYWJTdHlsZSBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3N0eWxlLmpzJ1xuaW1wb3J0IHNuYWJFdmVudCBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzLmpzJ1xuaW1wb3J0IEtlZmlyIGZyb20gJ2tlZmlyJ1xuXG5leHBvcnQgZnVuY3Rpb24gYnVzKCkge1xuICBsZXQgZW1pdHRlclxuICBsZXQgc3RyZWFtID0gS2VmaXIuc3RyZWFtKF9lbWl0dGVyID0+IHtcbiAgICBlbWl0dGVyID0gX2VtaXR0ZXJcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0dGVyID0gbnVsbFxuICAgIH1cbiAgfSlcbiAgc3RyZWFtLmVtaXQgPSBmdW5jdGlvbih4KSB7XG4gICAgZW1pdHRlciAmJiBlbWl0dGVyLmVtaXQoeClcbiAgfVxuICByZXR1cm4gc3RyZWFtXG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRUb0h5cGVyU2NyaXB0KG5vZGUpIHtcbiAgbGV0IFtzZWwsIGRhdGEsIGNoaWxkcmVuXSA9IG5vZGVcblxuICBpZiAoQXJyYXkuaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICByZXR1cm4gaChzZWwsIGRhdGEsIGNoaWxkcmVuLm1hcChjb252ZXJ0VG9IeXBlclNjcmlwdCkpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGguYXBwbHkobnVsbCwgbm9kZSlcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHZpZXckLCBjb250YWluZXIpIHtcbiAgbGV0IHBhdGNoID0gc25hYmJkb20uaW5pdChbc25hYkNsYXNzLCBzbmFiUHJvcHMsIHNuYWJTdHlsZSwgc25hYkV2ZW50XSlcbiAgbGV0IHZub2RlID0gY29udGFpbmVyXG5cbiAgdmlldyRcbiAgICAubWFwKGNvbnZlcnRUb0h5cGVyU2NyaXB0KVxuICAgIC5vblZhbHVlKG5ld1Zub2RlID0+IHtcbiAgICAgIHBhdGNoKHZub2RlLCBuZXdWbm9kZSlcbiAgICAgIHZub2RlID0gbmV3Vm5vZGVcbiAgICB9KVxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgaXNXZWJTb2NrZXQgPSBmdW5jdGlvbiAoY29uc3RydWN0b3IpIHtcbiAgICByZXR1cm4gY29uc3RydWN0b3IgJiYgY29uc3RydWN0b3IuQ0xPU0lORyA9PT0gMjtcbn07XG52YXIgaXNHbG9iYWxXZWJTb2NrZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBXZWJTb2NrZXQgIT09ICd1bmRlZmluZWQnICYmIGlzV2ViU29ja2V0KFdlYlNvY2tldCk7XG59O1xudmFyIGdldERlZmF1bHRPcHRpb25zID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gKHtcbiAgICBjb25zdHJ1Y3RvcjogaXNHbG9iYWxXZWJTb2NrZXQoKSA/IFdlYlNvY2tldCA6IG51bGwsXG4gICAgbWF4UmVjb25uZWN0aW9uRGVsYXk6IDEwMDAwLFxuICAgIG1pblJlY29ubmVjdGlvbkRlbGF5OiAxNTAwLFxuICAgIHJlY29ubmVjdGlvbkRlbGF5R3Jvd0ZhY3RvcjogMS4zLFxuICAgIGNvbm5lY3Rpb25UaW1lb3V0OiA0MDAwLFxuICAgIG1heFJldHJpZXM6IEluZmluaXR5LFxuICAgIGRlYnVnOiBmYWxzZSxcbn0pOyB9O1xudmFyIGJ5cGFzc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHNyYywgZHN0LCBuYW1lKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRzdCwgbmFtZSwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHNyY1tuYW1lXTsgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHsgc3JjW25hbWVdID0gdmFsdWU7IH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB9KTtcbn07XG52YXIgaW5pdFJlY29ubmVjdGlvbkRlbGF5ID0gZnVuY3Rpb24gKGNvbmZpZykge1xuICAgIHJldHVybiAoY29uZmlnLm1pblJlY29ubmVjdGlvbkRlbGF5ICsgTWF0aC5yYW5kb20oKSAqIGNvbmZpZy5taW5SZWNvbm5lY3Rpb25EZWxheSk7XG59O1xudmFyIHVwZGF0ZVJlY29ubmVjdGlvbkRlbGF5ID0gZnVuY3Rpb24gKGNvbmZpZywgcHJldmlvdXNEZWxheSkge1xuICAgIHZhciBuZXdEZWxheSA9IHByZXZpb3VzRGVsYXkgKiBjb25maWcucmVjb25uZWN0aW9uRGVsYXlHcm93RmFjdG9yO1xuICAgIHJldHVybiAobmV3RGVsYXkgPiBjb25maWcubWF4UmVjb25uZWN0aW9uRGVsYXkpXG4gICAgICAgID8gY29uZmlnLm1heFJlY29ubmVjdGlvbkRlbGF5XG4gICAgICAgIDogbmV3RGVsYXk7XG59O1xudmFyIExFVkVMXzBfRVZFTlRTID0gWydvbm9wZW4nLCAnb25jbG9zZScsICdvbm1lc3NhZ2UnLCAnb25lcnJvciddO1xudmFyIHJlYXNzaWduRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbiAod3MsIG9sZFdzLCBsaXN0ZW5lcnMpIHtcbiAgICBPYmplY3Qua2V5cyhsaXN0ZW5lcnMpLmZvckVhY2goZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgbGlzdGVuZXJzW3R5cGVdLmZvckVhY2goZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICB2YXIgbGlzdGVuZXIgPSBfYVswXSwgb3B0aW9ucyA9IF9hWzFdO1xuICAgICAgICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgb3B0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGlmIChvbGRXcykge1xuICAgICAgICBMRVZFTF8wX0VWRU5UUy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7IHdzW25hbWVdID0gb2xkV3NbbmFtZV07IH0pO1xuICAgIH1cbn07XG52YXIgUmVjb25uZWN0aW5nV2Vic29ja2V0ID0gZnVuY3Rpb24gKHVybCwgcHJvdG9jb2xzLCBvcHRpb25zKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgIHZhciB3cztcbiAgICB2YXIgY29ubmVjdGluZ1RpbWVvdXQ7XG4gICAgdmFyIHJlY29ubmVjdERlbGF5ID0gMDtcbiAgICB2YXIgcmV0cmllc0NvdW50ID0gMDtcbiAgICB2YXIgc2hvdWxkUmV0cnkgPSB0cnVlO1xuICAgIHZhciBzYXZlZE9uQ2xvc2UgPSBudWxsO1xuICAgIHZhciBsaXN0ZW5lcnMgPSB7fTtcbiAgICAvLyByZXF1aXJlIG5ldyB0byBjb25zdHJ1Y3RcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVjb25uZWN0aW5nV2Vic29ja2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUmVjb25uZWN0aW5nV2ViU29ja2V0JzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3JcIik7XG4gICAgfVxuICAgIC8vIFNldCBjb25maWcuIE5vdCB1c2luZyBgT2JqZWN0LmFzc2lnbmAgYmVjYXVzZSBvZiBJRTExXG4gICAgdmFyIGNvbmZpZyA9IGdldERlZmF1bHRPcHRpb25zKCk7XG4gICAgT2JqZWN0LmtleXMoY29uZmlnKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHsgcmV0dXJuIG9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KTsgfSlcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGtleSkgeyByZXR1cm4gY29uZmlnW2tleV0gPSBvcHRpb25zW2tleV07IH0pO1xuICAgIGlmICghaXNXZWJTb2NrZXQoY29uZmlnLmNvbnN0cnVjdG9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIFdlYlNvY2tldCBjb25zdHJ1Y3Rvci4gU2V0IGBvcHRpb25zLmNvbnN0cnVjdG9yYCcpO1xuICAgIH1cbiAgICB2YXIgbG9nID0gY29uZmlnLmRlYnVnID8gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFyYW1zID0gW107XG4gICAgICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICBwYXJhbXNbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIFsnUldTOiddLmNvbmNhdChwYXJhbXMpKTtcbiAgICB9IDogZnVuY3Rpb24gKCkgeyB9O1xuICAgIC8qKlxuICAgICAqIE5vdCB1c2luZyBkaXNwYXRjaEV2ZW50LCBvdGhlcndpc2Ugd2UgbXVzdCB1c2UgYSBET00gRXZlbnQgb2JqZWN0XG4gICAgICogRGVmZXJyZWQgYmVjYXVzZSB3ZSB3YW50IHRvIGhhbmRsZSB0aGUgY2xvc2UgZXZlbnQgYmVmb3JlIHRoaXNcbiAgICAgKi9cbiAgICB2YXIgZW1pdEVycm9yID0gZnVuY3Rpb24gKGNvZGUsIG1zZykgeyByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IobXNnKTtcbiAgICAgICAgZXJyLmNvZGUgPSBjb2RlO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShsaXN0ZW5lcnMuZXJyb3IpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMuZXJyb3IuZm9yRWFjaChmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSBfYVswXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4oZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh3cy5vbmVycm9yKSB7XG4gICAgICAgICAgICB3cy5vbmVycm9yKGVycik7XG4gICAgICAgIH1cbiAgICB9LCAwKTsgfTtcbiAgICB2YXIgaGFuZGxlQ2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxvZygnY2xvc2UnKTtcbiAgICAgICAgcmV0cmllc0NvdW50Kys7XG4gICAgICAgIGxvZygncmV0cmllcyBjb3VudDonLCByZXRyaWVzQ291bnQpO1xuICAgICAgICBpZiAocmV0cmllc0NvdW50ID4gY29uZmlnLm1heFJldHJpZXMpIHtcbiAgICAgICAgICAgIGVtaXRFcnJvcignRUhPU1RET1dOJywgJ1RvbyBtYW55IGZhaWxlZCBjb25uZWN0aW9uIGF0dGVtcHRzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyZWNvbm5lY3REZWxheSkge1xuICAgICAgICAgICAgcmVjb25uZWN0RGVsYXkgPSBpbml0UmVjb25uZWN0aW9uRGVsYXkoY29uZmlnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlY29ubmVjdERlbGF5ID0gdXBkYXRlUmVjb25uZWN0aW9uRGVsYXkoY29uZmlnLCByZWNvbm5lY3REZWxheSk7XG4gICAgICAgIH1cbiAgICAgICAgbG9nKCdyZWNvbm5lY3REZWxheTonLCByZWNvbm5lY3REZWxheSk7XG4gICAgICAgIGlmIChzaG91bGRSZXRyeSkge1xuICAgICAgICAgICAgc2V0VGltZW91dChjb25uZWN0LCByZWNvbm5lY3REZWxheSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBjb25uZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsb2coJ2Nvbm5lY3QnKTtcbiAgICAgICAgdmFyIG9sZFdzID0gd3M7XG4gICAgICAgIHdzID0gbmV3IGNvbmZpZy5jb25zdHJ1Y3Rvcih1cmwsIHByb3RvY29scyk7XG4gICAgICAgIGNvbm5lY3RpbmdUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsb2coJ3RpbWVvdXQnKTtcbiAgICAgICAgICAgIHdzLmNsb3NlKCk7XG4gICAgICAgICAgICBlbWl0RXJyb3IoJ0VUSU1FRE9VVCcsICdDb25uZWN0aW9uIHRpbWVvdXQnKTtcbiAgICAgICAgfSwgY29uZmlnLmNvbm5lY3Rpb25UaW1lb3V0KTtcbiAgICAgICAgbG9nKCdieXBhc3MgcHJvcGVydGllcycpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gd3MpIHtcbiAgICAgICAgICAgIC8vIEB0b2RvIG1vdmUgdG8gY29uc3RhbnRcbiAgICAgICAgICAgIGlmIChbJ2FkZEV2ZW50TGlzdGVuZXInLCAncmVtb3ZlRXZlbnRMaXN0ZW5lcicsICdjbG9zZScsICdzZW5kJ10uaW5kZXhPZihrZXkpIDwgMCkge1xuICAgICAgICAgICAgICAgIGJ5cGFzc1Byb3BlcnR5KHdzLCBfdGhpcywga2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdvcGVuJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGNvbm5lY3RpbmdUaW1lb3V0KTtcbiAgICAgICAgICAgIGxvZygnb3BlbicpO1xuICAgICAgICAgICAgcmVjb25uZWN0RGVsYXkgPSBpbml0UmVjb25uZWN0aW9uRGVsYXkoY29uZmlnKTtcbiAgICAgICAgICAgIGxvZygncmVjb25uZWN0RGVsYXk6JywgcmVjb25uZWN0RGVsYXkpO1xuICAgICAgICAgICAgcmV0cmllc0NvdW50ID0gMDtcbiAgICAgICAgfSk7XG4gICAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgaGFuZGxlQ2xvc2UpO1xuICAgICAgICByZWFzc2lnbkV2ZW50TGlzdGVuZXJzKHdzLCBvbGRXcywgbGlzdGVuZXJzKTtcbiAgICAgICAgLy8gYmVjYXVzZSB3aGVuIGNsb3Npbmcgd2l0aCBmYXN0Q2xvc2U9dHJ1ZSwgaXQgaXMgc2F2ZWQgYW5kIHNldCB0byBudWxsIHRvIGF2b2lkIGRvdWJsZSBjYWxsc1xuICAgICAgICB3cy5vbmNsb3NlID0gd3Mub25jbG9zZSB8fCBzYXZlZE9uQ2xvc2U7XG4gICAgICAgIHNhdmVkT25DbG9zZSA9IG51bGw7XG4gICAgfTtcbiAgICBsb2coJ2luaXQnKTtcbiAgICBjb25uZWN0KCk7XG4gICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uIChjb2RlLCByZWFzb24sIF9hKSB7XG4gICAgICAgIGlmIChjb2RlID09PSB2b2lkIDApIHsgY29kZSA9IDEwMDA7IH1cbiAgICAgICAgaWYgKHJlYXNvbiA9PT0gdm9pZCAwKSB7IHJlYXNvbiA9ICcnOyB9XG4gICAgICAgIHZhciBfYiA9IF9hID09PSB2b2lkIDAgPyB7fSA6IF9hLCBfYyA9IF9iLmtlZXBDbG9zZWQsIGtlZXBDbG9zZWQgPSBfYyA9PT0gdm9pZCAwID8gZmFsc2UgOiBfYywgX2QgPSBfYi5mYXN0Q2xvc2UsIGZhc3RDbG9zZSA9IF9kID09PSB2b2lkIDAgPyB0cnVlIDogX2QsIF9lID0gX2IuZGVsYXksIGRlbGF5ID0gX2UgPT09IHZvaWQgMCA/IDAgOiBfZTtcbiAgICAgICAgaWYgKGRlbGF5KSB7XG4gICAgICAgICAgICByZWNvbm5lY3REZWxheSA9IGRlbGF5O1xuICAgICAgICB9XG4gICAgICAgIHNob3VsZFJldHJ5ID0gIWtlZXBDbG9zZWQ7XG4gICAgICAgIHdzLmNsb3NlKGNvZGUsIHJlYXNvbik7XG4gICAgICAgIGlmIChmYXN0Q2xvc2UpIHtcbiAgICAgICAgICAgIHZhciBmYWtlQ2xvc2VFdmVudF8xID0ge1xuICAgICAgICAgICAgICAgIGNvZGU6IGNvZGUsXG4gICAgICAgICAgICAgICAgcmVhc29uOiByZWFzb24sXG4gICAgICAgICAgICAgICAgd2FzQ2xlYW46IHRydWUsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gZXhlY3V0ZSBjbG9zZSBsaXN0ZW5lcnMgc29vbiB3aXRoIGEgZmFrZSBjbG9zZUV2ZW50XG4gICAgICAgICAgICAvLyBhbmQgcmVtb3ZlIHRoZW0gZnJvbSB0aGUgV1MgaW5zdGFuY2Ugc28gdGhleVxuICAgICAgICAgICAgLy8gZG9uJ3QgZ2V0IGZpcmVkIG9uIHRoZSByZWFsIGNsb3NlLlxuICAgICAgICAgICAgaGFuZGxlQ2xvc2UoKTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgaGFuZGxlQ2xvc2UpO1xuICAgICAgICAgICAgLy8gcnVuIGFuZCByZW1vdmUgbGV2ZWwyXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShsaXN0ZW5lcnMuY2xvc2UpKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzLmNsb3NlLmZvckVhY2goZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IF9hWzBdLCBvcHRpb25zID0gX2FbMV07XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyKGZha2VDbG9zZUV2ZW50XzEpO1xuICAgICAgICAgICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIGxpc3RlbmVyLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJ1biBhbmQgcmVtb3ZlIGxldmVsMFxuICAgICAgICAgICAgaWYgKHdzLm9uY2xvc2UpIHtcbiAgICAgICAgICAgICAgICBzYXZlZE9uQ2xvc2UgPSB3cy5vbmNsb3NlO1xuICAgICAgICAgICAgICAgIHdzLm9uY2xvc2UoZmFrZUNsb3NlRXZlbnRfMSk7XG4gICAgICAgICAgICAgICAgd3Mub25jbG9zZSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuc2VuZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHdzLnNlbmQoZGF0YSk7XG4gICAgfTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobGlzdGVuZXJzW3R5cGVdKSkge1xuICAgICAgICAgICAgaWYgKCFsaXN0ZW5lcnNbdHlwZV0uc29tZShmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgICAgICB2YXIgbCA9IF9hWzBdO1xuICAgICAgICAgICAgICAgIHJldHVybiBsID09PSBsaXN0ZW5lcjtcbiAgICAgICAgICAgIH0pKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzW3R5cGVdLnB1c2goW2xpc3RlbmVyLCBvcHRpb25zXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnNbdHlwZV0gPSBbW2xpc3RlbmVyLCBvcHRpb25zXV07XG4gICAgICAgIH1cbiAgICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobGlzdGVuZXJzW3R5cGVdKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzW3R5cGVdID0gbGlzdGVuZXJzW3R5cGVdLmZpbHRlcihmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgICAgICB2YXIgbCA9IF9hWzBdO1xuICAgICAgICAgICAgICAgIHJldHVybiBsICE9PSBsaXN0ZW5lcjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIG9wdGlvbnMpO1xuICAgIH07XG59O1xubW9kdWxlLmV4cG9ydHMgPSBSZWNvbm5lY3RpbmdXZWJzb2NrZXQ7XG4iLCJpbXBvcnQgeyBidXMsIHJlbmRlciB9IGZyb20gJy4uLy4uL3NyYy9pbmRleC5qcydcbmltcG9ydCBLZWZpciBmcm9tICdrZWZpcidcbmltcG9ydCBXZWJTb2NrZXQgZnJvbSAncmVjb25uZWN0aW5nLXdlYnNvY2tldCdcblxuLy8gU3RyZWFtc1xubGV0IGFjdGlvbnMkID0gYnVzKClcbmxldCBzb2NrZXRPdXRnb2luZyQgPSBidXMoKVxuXG4vLyBNb2RlbFxubGV0IGluaXRNb2RlbCA9IHt0ZXh0OiAnJywgbWVzc2FnZXM6IFtdLCBjb25uZWN0ZWQ6IGZhbHNlfVxuXG4vLyBVcGRhdGVcbmZ1bmN0aW9uIHVwZGF0ZShtb2RlbCwgW2FjdGlvbiwgdmFsdWVdKSB7XG4gIGxldCB7dGV4dCwgbWVzc2FnZXMsIGNvbm5lY3RlZH0gPSBtb2RlbFxuXG4gIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgY2FzZSAnbWVzc2FnZSc6XG4gICAgICByZXR1cm4gey4uLm1vZGVsLCBtZXNzYWdlczogWy4uLm1lc3NhZ2VzLCB2YWx1ZV19XG4gICAgY2FzZSAnY2hhbmdlVGV4dCc6XG4gICAgICByZXR1cm4gey4uLm1vZGVsLCB0ZXh0OiB2YWx1ZX1cbiAgICBjYXNlICdjbGVhclRleHQnOlxuICAgICAgcmV0dXJuIHsuLi5tb2RlbCwgdGV4dDogJyd9XG4gICAgY2FzZSAnY29ubmVjdGVkJzpcbiAgICAgIHJldHVybiB7Li4ubW9kZWwsIGNvbm5lY3RlZDogdmFsdWV9XG4gIH1cbn1cblxuLy8gVmlld1xuZnVuY3Rpb24gdmlldyh7dGV4dCwgbWVzc2FnZXMsIGNvbm5lY3RlZH0pIHtcbiAgbGV0IHYgPVxuICAgIFsnZGl2Jywge30sXG4gICAgICBbIFsnaW5wdXQnLCB7cHJvcHM6IHtwbGFjZWhvbGRlcjogJ1NlbmQgbWVzc2FnZScsIHZhbHVlOiB0ZXh0fSwgb246IHtpbnB1dDogaGFuZGxlSW5wdXR9fV0sXG4gICAgICAgIFsnYnV0dG9uJywge3Byb3BzOiB7ZGlzYWJsZWQ6ICFjb25uZWN0ZWR9LCBvbjoge2NsaWNrOiBbaGFuZGxlQ2xpY2ssIHRleHRdfX0sICdTZW5kJ10sXG4gICAgICAgIFsnc3BhbicsIHt9LCBjb25uZWN0ZWQgPyAnJyA6ICcgQ29ubmVjdGluZy4uLiddLFxuICAgICAgICBbJ2RpdicsIHtzdHlsZToge3BhZGRpbmdUb3A6ICc3cHgnfX0sIG1lc3NhZ2VzLm1hcChkaXNwbGF5TWVzc2FnZSldXV1cblxuICByZXR1cm4gdlxufVxuXG5mdW5jdGlvbiBkaXNwbGF5TWVzc2FnZShtc2cpIHtcbiAgcmV0dXJuIFsnZGl2Jywge30sIG1zZ11cbn1cblxuZnVuY3Rpb24gaGFuZGxlSW5wdXQoZSkge1xuICBsZXQgdmFsdWUgPSBlLnRhcmdldC52YWx1ZS50cmltKClcbiAgYWN0aW9ucyQuZW1pdChbJ2NoYW5nZVRleHQnLCB2YWx1ZV0pXG59XG5cbmZ1bmN0aW9uIGhhbmRsZUNsaWNrKHRleHQpIHtcbiAgYWN0aW9ucyQuZW1pdChbJ2NsZWFyVGV4dCddKVxuICBzb2NrZXRPdXRnb2luZyQuZW1pdCh0ZXh0KVxufVxuXG4vLyBXZWJzb2NrZXRcbmxldCB3cyA9IG5ldyBXZWJTb2NrZXQoJ3dzczovL2VjaG8ud2Vic29ja2V0Lm9yZycpXG5cbmxldCBvbmxpbmUkID0gS2VmaXIuZnJvbVBvbGwoNTAwLCAoKSA9PiBuYXZpZ2F0b3Iub25MaW5lKS5za2lwRHVwbGljYXRlcygpXG5cbmxldCBzb2NrZXRDb25uZWN0ZWQkID0gS2VmaXIuc3RyZWFtKGVtaXR0ZXIgPT4ge1xuICB3cy5vbm9wZW4gPSAoKSA9PiBlbWl0dGVyLmVtaXQodHJ1ZSlcbiAgd3Mub25jbG9zZSA9ICgpID0+IGVtaXR0ZXIuZW1pdChmYWxzZSlcbn0pXG5cbmxldCBjb25uZWN0ZWQkID0gc29ja2V0Q29ubmVjdGVkJFxuICAuY29tYmluZShvbmxpbmUkLCAoY29ubmVjdGVkLCBvbmxpbmUpID0+IGNvbm5lY3RlZCAmJiBvbmxpbmUpXG4gIC50b1Byb3BlcnR5KCgpID0+IGZhbHNlKVxuXG5zb2NrZXRPdXRnb2luZyQuZmlsdGVyQnkoY29ubmVjdGVkJCkub25WYWx1ZSh3cy5zZW5kKVxuXG5sZXQgc29ja2V0SW5jb21pbmckID0gS2VmaXIuc3RyZWFtKGVtaXR0ZXIgPT4ge1xuICB3cy5vbm1lc3NhZ2UgPSBlbWl0dGVyLmVtaXRcbn0pXG5cbmxldCBlZmZlY3RzJCA9IHNvY2tldEluY29taW5nJFxuICAubWFwKG1zZ0V2ZW50ID0+IFsnbWVzc2FnZScsIG1zZ0V2ZW50LmRhdGFdKVxuICAubWVyZ2UoY29ubmVjdGVkJC5tYXAoY29ubmVjdGVkID0+IFsnY29ubmVjdGVkJywgY29ubmVjdGVkXSkpXG5lZmZlY3RzJC5sb2coJ0VmZmVjdHMnKVxuXG4vLyBSZWR1Y2VcbmxldCBtb2RlbCQgPSBhY3Rpb25zJC5tZXJnZShlZmZlY3RzJCkuc2Nhbih1cGRhdGUsIGluaXRNb2RlbClcbm1vZGVsJC5sb2coJ01vZGVsJylcblxuLy8gUmVuZGVyXG5sZXQgdmlldyQgPSBtb2RlbCQubWFwKHZpZXcpXG5yZW5kZXIodmlldyQsIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250YWluZXInKSlcbiJdLCJuYW1lcyI6WyJzZWwiLCJkYXRhIiwiY2hpbGRyZW4iLCJ0ZXh0IiwiZWxtIiwia2V5IiwidW5kZWZpbmVkIiwiQXJyYXkiLCJpc0FycmF5IiwicyIsImNyZWF0ZUVsZW1lbnQiLCJ0YWdOYW1lIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50TlMiLCJuYW1lc3BhY2VVUkkiLCJxdWFsaWZpZWROYW1lIiwiY3JlYXRlVGV4dE5vZGUiLCJpbnNlcnRCZWZvcmUiLCJwYXJlbnROb2RlIiwibmV3Tm9kZSIsInJlZmVyZW5jZU5vZGUiLCJyZW1vdmVDaGlsZCIsIm5vZGUiLCJjaGlsZCIsImFwcGVuZENoaWxkIiwicGFyZW50RWxlbWVudCIsIm5leHRTaWJsaW5nIiwic2V0VGV4dENvbnRlbnQiLCJ0ZXh0Q29udGVudCIsIlZOb2RlIiwicmVxdWlyZSQkMiIsImlzIiwicmVxdWlyZSQkMSIsImRvbUFwaSIsInJlcXVpcmUkJDAiLCJpc1VuZGVmIiwiaXNEZWYiLCJlbXB0eU5vZGUiLCJzYW1lVm5vZGUiLCJ2bm9kZTEiLCJ2bm9kZTIiLCJjcmVhdGVLZXlUb09sZElkeCIsImJlZ2luSWR4IiwiZW5kSWR4IiwiaSIsIm1hcCIsImhvb2tzIiwiaW5pdCIsIm1vZHVsZXMiLCJhcGkiLCJqIiwiY2JzIiwibGVuZ3RoIiwicHVzaCIsImVtcHR5Tm9kZUF0IiwiaWQiLCJjIiwiY2xhc3NOYW1lIiwic3BsaXQiLCJqb2luIiwidG9Mb3dlckNhc2UiLCJjcmVhdGVSbUNiIiwiY2hpbGRFbG0iLCJsaXN0ZW5lcnMiLCJwYXJlbnQiLCJjcmVhdGVFbG0iLCJ2bm9kZSIsImluc2VydGVkVm5vZGVRdWV1ZSIsImhvb2siLCJoYXNoSWR4IiwiaW5kZXhPZiIsImRvdElkeCIsImhhc2giLCJkb3QiLCJ0YWciLCJzbGljZSIsIk1hdGgiLCJtaW4iLCJucyIsInJlcGxhY2UiLCJhcnJheSIsInByaW1pdGl2ZSIsImNyZWF0ZSIsImluc2VydCIsImFkZFZub2RlcyIsInBhcmVudEVsbSIsImJlZm9yZSIsInZub2RlcyIsInN0YXJ0SWR4IiwiaW52b2tlRGVzdHJveUhvb2siLCJkZXN0cm95IiwicmVtb3ZlVm5vZGVzIiwicm0iLCJjaCIsInJlbW92ZSIsInVwZGF0ZUNoaWxkcmVuIiwib2xkQ2giLCJuZXdDaCIsIm9sZFN0YXJ0SWR4IiwibmV3U3RhcnRJZHgiLCJvbGRFbmRJZHgiLCJvbGRTdGFydFZub2RlIiwib2xkRW5kVm5vZGUiLCJuZXdFbmRJZHgiLCJuZXdTdGFydFZub2RlIiwibmV3RW5kVm5vZGUiLCJvbGRLZXlUb0lkeCIsImlkeEluT2xkIiwiZWxtVG9Nb3ZlIiwicGF0Y2hWbm9kZSIsIm9sZFZub2RlIiwicHJlcGF0Y2giLCJ1cGRhdGUiLCJwb3N0cGF0Y2giLCJwcmUiLCJwb3N0IiwiYWRkTlMiLCJoIiwiYiIsInVwZGF0ZUNsYXNzIiwiY3VyIiwibmFtZSIsIm9sZENsYXNzIiwiY2xhc3MiLCJrbGFzcyIsImNsYXNzTGlzdCIsInVwZGF0ZVByb3BzIiwib2xkIiwib2xkUHJvcHMiLCJwcm9wcyIsInJhZiIsIndpbmRvdyIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInNldFRpbWVvdXQiLCJuZXh0RnJhbWUiLCJmbiIsInNldE5leHRGcmFtZSIsIm9iaiIsInByb3AiLCJ2YWwiLCJ1cGRhdGVTdHlsZSIsIm9sZFN0eWxlIiwic3R5bGUiLCJvbGRIYXNEZWwiLCJkZWxheWVkIiwiYXBwbHlEZXN0cm95U3R5bGUiLCJhcHBseVJlbW92ZVN0eWxlIiwiaWR4IiwibWF4RHVyIiwiY29tcFN0eWxlIiwiYW1vdW50IiwiYXBwbGllZCIsImdldENvbXB1dGVkU3R5bGUiLCJhZGRFdmVudExpc3RlbmVyIiwiZXYiLCJ0YXJnZXQiLCJpbnZva2VIYW5kbGVyIiwiaGFuZGxlciIsImV2ZW50IiwiY2FsbCIsImFyZ3MiLCJhcHBseSIsImhhbmRsZUV2ZW50IiwidHlwZSIsIm9uIiwiY3JlYXRlTGlzdGVuZXIiLCJ1cGRhdGVFdmVudExpc3RlbmVycyIsIm9sZE9uIiwib2xkTGlzdGVuZXIiLCJsaXN0ZW5lciIsIm9sZEVsbSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJnbG9iYWwiLCJmYWN0b3J5IiwiZXhwb3J0cyIsIm1vZHVsZSIsImRlZmluZSIsImFtZCIsIktlZmlyIiwidGhpcyIsImNyZWF0ZU9iaiIsInByb3RvIiwiRiIsInByb3RvdHlwZSIsImV4dGVuZCIsImFyZ3VtZW50cyIsImluaGVyaXQiLCJDaGlsZCIsIlBhcmVudCIsImNvbnN0cnVjdG9yIiwiTk9USElORyIsIkVORCIsIlZBTFVFIiwiRVJST1IiLCJBTlkiLCJjb25jYXQiLCJhIiwicmVzdWx0IiwiZmluZCIsImFyciIsInZhbHVlIiwiZmluZEJ5UHJlZCIsInByZWQiLCJjbG9uZUFycmF5IiwiaW5wdXQiLCJpbmRleCIsImZvckVhY2giLCJmaWxsQXJyYXkiLCJjb250YWlucyIsInNsaWRlIiwibmV4dCIsIm1heCIsIm9mZnNldCIsImNhbGxTdWJzY3JpYmVyIiwiRGlzcGF0Y2hlciIsIl9pdGVtcyIsIl9zcGllcyIsIl9pbkxvb3AiLCJfcmVtb3ZlZEl0ZW1zIiwieCIsInNwaWVzIiwiX2kiLCJpdGVtcyIsIk9ic2VydmFibGUiLCJfZGlzcGF0Y2hlciIsIl9hY3RpdmUiLCJfYWxpdmUiLCJfYWN0aXZhdGluZyIsIl9sb2dIYW5kbGVycyIsIl9zcHlIYW5kbGVycyIsImFjdGl2ZSIsIl9vbkFjdGl2YXRpb24iLCJfb25EZWFjdGl2YXRpb24iLCJfc2V0QWN0aXZlIiwiY2xlYW51cCIsIl9lbWl0VmFsdWUiLCJfZW1pdEVycm9yIiwiX2VtaXRFbmQiLCJkaXNwYXRjaCIsIl9jbGVhciIsImFkZCIsImNvdW50IiwiX29uIiwiX29mZiIsIm9ic2VydmVyT3JPblZhbHVlIiwib25FcnJvciIsIm9uRW5kIiwiX3RoaXMiLCJjbG9zZWQiLCJvYnNlcnZlciIsImVycm9yIiwiZW5kIiwib25BbnkiLCJvZmZBbnkiLCJBIiwiQiIsImdldFR5cGUiLCJzb3VyY2VPYnMiLCJzZWxmTmFtZSIsIl9uYW1lIiwidG9TdHJpbmciLCJpc0N1cnJlbnQiLCJsb2ciLCJoYW5kbGVySW5kZXgiLCJzcGxpY2UiLCJhZGRTcHkiLCJyZW1vdmVTcHkiLCJTdHJlYW0iLCJQcm9wZXJ0eSIsIl9jdXJyZW50RXZlbnQiLCJuZXZlclMiLCJuZXZlciIsInRpbWVCYXNlZCIsIm1peGluIiwiQW5vbnltb3VzU3RyZWFtIiwid2FpdCIsIm9wdGlvbnMiLCJfd2FpdCIsIl9pbnRlcnZhbElkIiwiXyRvblRpY2siLCJfb25UaWNrIiwiX2luaXQiLCJzZXRJbnRlcnZhbCIsIl9mcmVlIiwiUyIsIl9yZWYiLCJfeCIsImxhdGVyIiwiUyQxIiwiaW50ZXJ2YWwiLCJTJDIiLCJ4cyIsIl94cyIsInNoaWZ0Iiwic2VxdWVudGlhbGx5IiwiUyQzIiwiX2ZuIiwiZnJvbVBvbGwiLCJlbWl0dGVyIiwib2JzIiwiZSIsIl9lbWl0IiwiUyQ0IiwiX2VtaXR0ZXIiLCJ3aXRoSW50ZXJ2YWwiLCJTJDUiLCJfdW5zdWJzY3JpYmUiLCJ1bnN1YnNjcmliZSIsIl9jYWxsVW5zdWJzY3JpYmUiLCJzdHJlYW0iLCJmcm9tQ2FsbGJhY2siLCJjYWxsYmFja0NvbnN1bWVyIiwiY2FsbGVkIiwiZW1pdCIsInNldE5hbWUiLCJmcm9tTm9kZUNhbGxiYWNrIiwic3ByZWFkIiwiYUxlbmd0aCIsImZyb21TdWJVbnN1YiIsInN1YiIsInVuc3ViIiwidHJhbnNmb3JtZXIiLCJwYWlycyIsImZyb21FdmVudHMiLCJldmVudE5hbWUiLCJFcnJvciIsIlAiLCJjdXJyZW50IiwiY29uc3RhbnQiLCJQJDEiLCJjb25zdGFudEVycm9yIiwiY3JlYXRlQ29uc3RydWN0b3IiLCJCYXNlQ2xhc3MiLCJBbm9ueW1vdXNPYnNlcnZhYmxlIiwic291cmNlIiwiX3NvdXJjZSIsIl8kaGFuZGxlQW55IiwiX2hhbmRsZUFueSIsImNyZWF0ZUNsYXNzTWV0aG9kcyIsIl9oYW5kbGVWYWx1ZSIsIl9oYW5kbGVFcnJvciIsIl9oYW5kbGVFbmQiLCJjcmVhdGVTdHJlYW0iLCJjcmVhdGVQcm9wZXJ0eSIsIlAkMiIsIl9nZXRJbml0aWFsQ3VycmVudCIsImdldEluaXRpYWwiLCJ0b1Byb3BlcnR5IiwiUyQ2IiwiY2hhbmdlcyIsImZyb21Qcm9taXNlIiwicHJvbWlzZSIsIm9uVmFsdWUiLCJfcHJvbWlzZSIsInRoZW4iLCJkb25lIiwiZ2V0R2xvZGFsUHJvbWlzZSIsIlByb21pc2UiLCJ0b1Byb21pc2UiLCJsYXN0IiwicmVzb2x2ZSIsInJlamVjdCIsImNvbW1vbmpzR2xvYmFsIiwic2VsZiIsImNyZWF0ZUNvbW1vbmpzTW9kdWxlIiwicG9ueWZpbGwiLCJkZWZpbmVQcm9wZXJ0eSIsInN5bWJvbE9ic2VydmFibGVQb255ZmlsbCIsInJvb3QiLCJfU3ltYm9sIiwiU3ltYm9sIiwib2JzZXJ2YWJsZSIsInJlcXVpcmUkJDAkMSIsImluZGV4JDEiLCJfcG9ueWZpbGwiLCJfcG9ueWZpbGwyIiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsIl9fZXNNb2R1bGUiLCIkJG9ic2VydmFibGUiLCJmcm9tRVNPYnNlcnZhYmxlIiwiX29ic2VydmFibGUiLCJzdWJzY3JpYmUiLCJFU09ic2VydmFibGUiLCJ0YWtlRXJyb3JzIiwib2JzZXJ2ZXJPck9uTmV4dCIsIm9uQ29tcGxldGUiLCJjb21wbGV0ZSIsInN1YnNjcmlwdGlvbiIsInRvRVNPYnNlcnZhYmxlIiwiZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IiLCJlcnJvcnMiLCJsYXRlc3RFcnJvciIsIkNvbWJpbmUiLCJwYXNzaXZlIiwiY29tYmluYXRvciIsIl9hY3RpdmVDb3VudCIsIl9zb3VyY2VzIiwiX2NvbWJpbmF0b3IiLCJfYWxpdmVDb3VudCIsIl9sYXRlc3RWYWx1ZXMiLCJfbGF0ZXN0RXJyb3JzIiwiX2VtaXRBZnRlckFjdGl2YXRpb24iLCJfZW5kQWZ0ZXJBY3RpdmF0aW9uIiwiX2xhdGVzdEVycm9ySW5kZXgiLCJfJGhhbmRsZXJzIiwiX2xvb3AiLCJfZW1pdElmRnVsbCIsImhhc0FsbFZhbHVlcyIsImhhc0Vycm9ycyIsInZhbHVlc0NvcHkiLCJlcnJvcnNDb3B5IiwiY29tYmluZSIsIk9ic2VydmFibGUkMSIsIm1lcmdlIiwiZm5FcnIiLCJmblZhbCIsIm1hcEVycm9ycyIsIm9ic0ZuIiwib2JzVmFsIiwiZmxhdE1hcCIsInN0YXRpY0xhbmQiLCJPYmplY3QiLCJmcmVlemUiLCJTJDciLCJQJDMiLCJtYXAkMSIsIl9vZlNhbWVUeXBlIiwibWl4aW4kMSIsIlMkOCIsIlAkNCIsImlkJDEiLCJmaWx0ZXIiLCJtaXhpbiQyIiwibiIsIl9uIiwiUyQ5IiwiUCQ1IiwidGFrZSIsIm1peGluJDMiLCJTJDEwIiwiUCQ2IiwibWl4aW4kNCIsIlMkMTEiLCJQJDciLCJpZCQyIiwidGFrZVdoaWxlIiwibWl4aW4kNSIsIl9sYXN0VmFsdWUiLCJTJDEyIiwiUCQ4IiwibWl4aW4kNiIsIlMkMTMiLCJQJDkiLCJza2lwIiwibWl4aW4kNyIsIlMkMTQiLCJQJDEwIiwiaWQkMyIsInNraXBXaGlsZSIsIm1peGluJDgiLCJfcHJldiIsIlMkMTUiLCJQJDExIiwiZXEiLCJza2lwRHVwbGljYXRlcyIsIm1peGluJDkiLCJzZWVkIiwiUyQxNiIsIlAkMTIiLCJkZWZhdWx0Rm4iLCJkaWZmIiwiUCQxMyIsIl9zZWVkIiwic2NhbiIsIm1peGluJDEwIiwiUyQxNyIsImlkJDQiLCJmbGF0dGVuIiwiRU5EX01BUktFUiIsIm1peGluJDExIiwiX2J1ZmYiLCJfJHNoaWZ0QnVmZiIsIlMkMTgiLCJQJDE0IiwiZGVsYXkiLCJub3ciLCJEYXRlIiwiZ2V0VGltZSIsIm1peGluJDEyIiwibGVhZGluZyIsInRyYWlsaW5nIiwiX2xlYWRpbmciLCJfdHJhaWxpbmciLCJfdHJhaWxpbmdWYWx1ZSIsIl90aW1lb3V0SWQiLCJfZW5kTGF0ZXIiLCJfbGFzdENhbGxUaW1lIiwiXyR0cmFpbGluZ0NhbGwiLCJfdHJhaWxpbmdDYWxsIiwiY3VyVGltZSIsInJlbWFpbmluZyIsIl9jYW5jZWxUcmFpbGluZyIsIlMkMTkiLCJQJDE1IiwidGhyb3R0bGUiLCJfcmVmMiIsIl9yZWYyJGxlYWRpbmciLCJfcmVmMiR0cmFpbGluZyIsIm1peGluJDEzIiwiaW1tZWRpYXRlIiwiX2ltbWVkaWF0ZSIsIl9sYXN0QXR0ZW1wdCIsIl9sYXRlclZhbHVlIiwiXyRsYXRlciIsIl9sYXRlciIsIlMkMjAiLCJQJDE2IiwiZGVib3VuY2UiLCJfcmVmMiRpbW1lZGlhdGUiLCJtaXhpbiQxNCIsIlMkMjEiLCJQJDE3IiwiaWQkNSIsIm1peGluJDE1IiwiUyQyMiIsIlAkMTgiLCJpZCQ2IiwiZmlsdGVyRXJyb3JzIiwibWl4aW4kMTYiLCJTJDIzIiwiUCQxOSIsImlnbm9yZVZhbHVlcyIsIm1peGluJDE3IiwiUyQyNCIsIlAkMjAiLCJpZ25vcmVFcnJvcnMiLCJtaXhpbiQxOCIsIlMkMjUiLCJQJDIxIiwiaWdub3JlRW5kIiwibWl4aW4kMTkiLCJTJDI2IiwiUCQyMiIsImJlZm9yZUVuZCIsIm1peGluJDIwIiwiX21heCIsIl9taW4iLCJTJDI3IiwiUCQyMyIsInNsaWRpbmdXaW5kb3ciLCJtaXhpbiQyMSIsImZsdXNoT25FbmQiLCJfZmx1c2hPbkVuZCIsIl9mbHVzaCIsIlMkMjgiLCJQJDI0IiwiaWQkNyIsImJ1ZmZlcldoaWxlIiwiX3JlZjIkZmx1c2hPbkVuZCIsIm1peGluJDIyIiwiX2NvdW50IiwiUyQyOSIsIlAkMjUiLCJidWZmZXJXaGlsZSQxIiwibWl4aW4kMjMiLCJTJDMwIiwiUCQyNiIsImJ1ZmZlcldpdGhUaW1lT3JDb3VudCIsInhmb3JtRm9yT2JzIiwicmVzIiwibWl4aW4kMjQiLCJ0cmFuc2R1Y2VyIiwiX3hmb3JtIiwiUyQzMSIsIlAkMjciLCJ0cmFuc2R1Y2UiLCJtaXhpbiQyNSIsIl9oYW5kbGVyIiwiUyQzMiIsIlAkMjgiLCJ3aXRoSGFuZGxlciIsIlppcCIsInNvdXJjZXMiLCJfYnVmZmVycyIsIl9pc0Z1bGwiLCJ2YWx1ZXMiLCJ6aXAiLCJvYnNlcnZhYmxlcyIsImlkJDgiLCJBYnN0cmFjdFBvb2wiLCJfcmVmJHF1ZXVlTGltIiwicXVldWVMaW0iLCJfcmVmJGNvbmN1ckxpbSIsImNvbmN1ckxpbSIsIl9yZWYkZHJvcCIsImRyb3AiLCJfcXVldWVMaW0iLCJfY29uY3VyTGltIiwiX2Ryb3AiLCJfcXVldWUiLCJfY3VyU291cmNlcyIsIl8kaGFuZGxlU3ViQW55IiwiX2hhbmRsZVN1YkFueSIsIl8kZW5kSGFuZGxlcnMiLCJfY3VycmVudGx5QWRkaW5nIiwidG9PYnMiLCJfYWRkVG9DdXIiLCJfYWRkVG9RdWV1ZSIsIl9yZW1vdmVPbGRlc3QiLCJfYWRkIiwib2JzcyIsIl90aGlzMiIsIl9yZW1vdmVDdXIiLCJfcmVtb3ZlUXVldWUiLCJfc3ViVG9FbmQiLCJfdGhpczMiLCJvbkVuZEkiLCJvZmZFbmQiLCJfcHVsbFF1ZXVlIiwiX29uRW1wdHkiLCJfc3Vic2NyaWJlIiwiTWVyZ2UiLCJfYWRkQWxsIiwiX2luaXRpYWxpc2VkIiwiUyQzMyIsImdlbmVyYXRvciIsIl9nZW5lcmF0b3IiLCJfaXRlcmF0aW9uIiwiX2dldFNvdXJjZSIsInJlcGVhdCIsImNvbmNhdCQxIiwiUG9vbCIsIl9yZW1vdmUiLCJGbGF0TWFwIiwiX21haW5FbmRlZCIsIl9sYXN0Q3VycmVudCIsIl8kaGFuZGxlTWFpbiIsIl9oYW5kbGVNYWluIiwiX2hhZE5vRXZTaW5jZURlYWN0Iiwic2FtZUN1cnIiLCJfaXNFbXB0eSIsIkZsYXRNYXBFcnJvcnMiLCJjcmVhdGVDb25zdHJ1Y3RvciQxIiwicHJpbWFyeSIsInNlY29uZGFyeSIsIl9wcmltYXJ5IiwiX3NlY29uZGFyeSIsIl9sYXN0U2Vjb25kYXJ5IiwiXyRoYW5kbGVTZWNvbmRhcnlBbnkiLCJfaGFuZGxlU2Vjb25kYXJ5QW55IiwiXyRoYW5kbGVQcmltYXJ5QW55IiwiX2hhbmRsZVByaW1hcnlBbnkiLCJjcmVhdGVDbGFzc01ldGhvZHMkMSIsIl9oYW5kbGVQcmltYXJ5VmFsdWUiLCJfaGFuZGxlUHJpbWFyeUVycm9yIiwiX2hhbmRsZVByaW1hcnlFbmQiLCJfaGFuZGxlU2Vjb25kYXJ5VmFsdWUiLCJfaGFuZGxlU2Vjb25kYXJ5RXJyb3IiLCJfaGFuZGxlU2Vjb25kYXJ5RW5kIiwiX3JlbW92ZVNlY29uZGFyeSIsImNyZWF0ZVN0cmVhbSQxIiwiY3JlYXRlUHJvcGVydHkkMSIsIm1peGluJDI2IiwiUyQzNCIsIlAkMjkiLCJmaWx0ZXJCeSIsImlkMiIsIl8iLCJzYW1wbGVkQnkiLCJtaXhpbiQyNyIsIlMkMzUiLCJQJDMwIiwic2tpcFVudGlsQnkiLCJtaXhpbiQyOCIsIlMkMzYiLCJQJDMxIiwidGFrZVVudGlsQnkiLCJtaXhpbiQyOSIsIl9yZWYkZmx1c2hPbkVuZCIsIlMkMzciLCJQJDMyIiwiYnVmZmVyQnkiLCJtaXhpbiQzMCIsIl9yZWYkZmx1c2hPbkNoYW5nZSIsImZsdXNoT25DaGFuZ2UiLCJfZmx1c2hPbkNoYW5nZSIsIlMkMzgiLCJQJDMzIiwiYnVmZmVyV2hpbGVCeSIsImYiLCJ0IiwiYXdhaXRpbmciLCJtaXhpbiQzMSIsImNvbnZlcnQiLCJTJDM5IiwiUCQzNCIsImRlZkZuIiwidmFsdWVzVG9FcnJvcnMiLCJtaXhpbiQzMiIsIlMkNDAiLCJQJDM1IiwiZGVmRm4kMSIsImVycm9yc1RvVmFsdWVzIiwibWl4aW4kMzMiLCJTJDQxIiwiUCQzNiIsImVuZE9uRXJyb3IiLCJidWZmZXJXaXRoQ291bnQiLCJvdGhlciIsInBvb2wiLCJmbGF0TWFwTGF0ZXN0IiwiZmxhdE1hcEZpcnN0IiwiZmxhdE1hcENvbmNhdCIsImZsYXRNYXBDb25jdXJMaW1pdCIsImxpbWl0IiwiZmxhdE1hcEVycm9ycyIsIkRFUFJFQ0FUSU9OX1dBUk5JTkdTIiwiZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzIiwid2FybiIsIm1zZyIsImNvbnNvbGUiLCJtc2cyIiwiYnVzIiwiY29udmVydFRvSHlwZXJTY3JpcHQiLCJyZW5kZXIiLCJ2aWV3JCIsImNvbnRhaW5lciIsInBhdGNoIiwic25hYmJkb20iLCJzbmFiQ2xhc3MiLCJzbmFiUHJvcHMiLCJzbmFiU3R5bGUiLCJzbmFiRXZlbnQiLCJuZXdWbm9kZSIsImlzV2ViU29ja2V0IiwiQ0xPU0lORyIsImlzR2xvYmFsV2ViU29ja2V0IiwiV2ViU29ja2V0IiwiZ2V0RGVmYXVsdE9wdGlvbnMiLCJJbmZpbml0eSIsImJ5cGFzc1Byb3BlcnR5Iiwic3JjIiwiZHN0IiwiaW5pdFJlY29ubmVjdGlvbkRlbGF5IiwiY29uZmlnIiwibWluUmVjb25uZWN0aW9uRGVsYXkiLCJyYW5kb20iLCJ1cGRhdGVSZWNvbm5lY3Rpb25EZWxheSIsInByZXZpb3VzRGVsYXkiLCJuZXdEZWxheSIsInJlY29ubmVjdGlvbkRlbGF5R3Jvd0ZhY3RvciIsIm1heFJlY29ubmVjdGlvbkRlbGF5IiwiTEVWRUxfMF9FVkVOVFMiLCJyZWFzc2lnbkV2ZW50TGlzdGVuZXJzIiwid3MiLCJvbGRXcyIsImtleXMiLCJfYSIsIlJlY29ubmVjdGluZ1dlYnNvY2tldCIsInVybCIsInByb3RvY29scyIsImNvbm5lY3RpbmdUaW1lb3V0IiwicmVjb25uZWN0RGVsYXkiLCJyZXRyaWVzQ291bnQiLCJzaG91bGRSZXRyeSIsInNhdmVkT25DbG9zZSIsIlR5cGVFcnJvciIsImhhc093blByb3BlcnR5IiwiZGVidWciLCJwYXJhbXMiLCJlbWl0RXJyb3IiLCJjb2RlIiwiZXJyIiwib25lcnJvciIsImhhbmRsZUNsb3NlIiwibWF4UmV0cmllcyIsImNvbm5lY3QiLCJjbG9zZSIsImNvbm5lY3Rpb25UaW1lb3V0Iiwib25jbG9zZSIsInJlYXNvbiIsIl9iIiwiX2MiLCJrZWVwQ2xvc2VkIiwiX2QiLCJmYXN0Q2xvc2UiLCJfZSIsImZha2VDbG9zZUV2ZW50XzEiLCJzZW5kIiwic29tZSIsImwiLCJhY3Rpb25zJCIsInNvY2tldE91dGdvaW5nJCIsImluaXRNb2RlbCIsIm1lc3NhZ2VzIiwiY29ubmVjdGVkIiwibW9kZWwiLCJhY3Rpb24iLCJ2aWV3IiwidiIsInBsYWNlaG9sZGVyIiwiaGFuZGxlSW5wdXQiLCJkaXNhYmxlZCIsImNsaWNrIiwiaGFuZGxlQ2xpY2siLCJwYWRkaW5nVG9wIiwiZGlzcGxheU1lc3NhZ2UiLCJ0cmltIiwib25saW5lJCIsIm5hdmlnYXRvciIsIm9uTGluZSIsInNvY2tldENvbm5lY3RlZCQiLCJvbm9wZW4iLCJjb25uZWN0ZWQkIiwib25saW5lIiwic29ja2V0SW5jb21pbmckIiwib25tZXNzYWdlIiwiZWZmZWN0cyQiLCJtc2dFdmVudCIsIm1vZGVsJCIsImdldEVsZW1lbnRCeUlkIl0sIm1hcHBpbmdzIjoiQUFBQSxZQUFpQixVQUFTQSxHQUFULEVBQWNDLElBQWQsRUFBb0JDLFFBQXBCLEVBQThCQyxJQUE5QixFQUFvQ0MsR0FBcEMsRUFBeUM7TUFDcERDLE1BQU1KLFNBQVNLLFNBQVQsR0FBcUJBLFNBQXJCLEdBQWlDTCxLQUFLSSxHQUFoRDtTQUNPLEVBQUNMLEtBQUtBLEdBQU4sRUFBV0MsTUFBTUEsSUFBakIsRUFBdUJDLFVBQVVBLFFBQWpDO1VBQ09DLElBRFAsRUFDYUMsS0FBS0EsR0FEbEIsRUFD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
