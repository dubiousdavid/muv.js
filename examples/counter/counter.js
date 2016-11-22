var vnode = function(sel, data, children, text, elm) {
  var key = data === undefined ? undefined : data.key;
  return {sel: sel, data: data, children: children,
          text: text, elm: elm, key: key};
};

var is$1 = {
  array: Array.isArray,
  primitive: function(s) { return typeof s === 'string' || typeof s === 'number'; },
};

function createElement(tagName){
  return document.createElement(tagName);
}

function createElementNS(namespaceURI, qualifiedName){
  return document.createElementNS(namespaceURI, qualifiedName);
}

function createTextNode(text){
  return document.createTextNode(text);
}


function insertBefore(parentNode, newNode, referenceNode){
  parentNode.insertBefore(newNode, referenceNode);
}


function removeChild(node, child){
  node.removeChild(child);
}

function appendChild(node, child){
  node.appendChild(child);
}

function parentNode(node){
  return node.parentElement;
}

function nextSibling(node){
  return node.nextSibling;
}

function tagName(node){
  return node.tagName;
}

function setTextContent(node, text){
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

function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }

var emptyNode = VNode('', {}, [], undefined, undefined);

function sameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  var i, map = {}, key;
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) map[key] = i;
  }
  return map;
}

var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

function init(modules, api) {
  var i, j, cbs = {};

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
    return function() {
      if (--listeners === 0) {
        var parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }

  function createElm(vnode$$1, insertedVnodeQueue) {
    var i, data = vnode$$1.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) {
        i(vnode$$1);
        data = vnode$$1.data;
      }
    }
    var elm, children = vnode$$1.children, sel = vnode$$1.sel;
    if (isDef(sel)) {
      // Parse selector
      var hashIdx = sel.indexOf('#');
      var dotIdx = sel.indexOf('.', hashIdx);
      var hash = hashIdx > 0 ? hashIdx : sel.length;
      var dot = dotIdx > 0 ? dotIdx : sel.length;
      var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      elm = vnode$$1.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                                                          : api.createElement(tag);
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
    var i, j, data = vnode$$1.data;
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
      var i, listeners, rm, ch = vnodes[startIdx];
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
        } else { // Text node
          api.removeChild(parentElm, ch.elm);
        }
      }
    }
  }

  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    var oldStartIdx = 0, newStartIdx = 0;
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
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) { // New element
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
      before = isUndef(newCh[newEndIdx+1]) ? null : newCh[newEndIdx+1].elm;
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
    var elm = vnode$$1.elm = oldVnode.elm, oldCh = oldVnode.children, ch = vnode$$1.children;
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

  return function(oldVnode, vnode$$1) {
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

var snabbdom = {init: init};

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
  var data = {}, children, text, i;
  if (c !== undefined) {
    data = b;
    if (is$3.array(c)) { children = c; }
    else if (is$3.primitive(c)) { text = c; }
  } else if (b !== undefined) {
    if (is$3.array(b)) { children = b; }
    else if (is$3.primitive(b)) { text = b; }
    else { data = b; }
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
  var cur, name, elm = vnode.elm,
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

var _class = {create: updateClass, update: updateClass};

function updateProps(oldVnode, vnode) {
  var key, cur, old, elm = vnode.elm,
      oldProps = oldVnode.data.props, props = vnode.data.props;

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

var props = {create: updateProps, update: updateProps};

var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
var nextFrame = function(fn) { raf(function() { raf(fn); }); };

function setNextFrame(obj, prop, val) {
  nextFrame(function() { obj[prop] = val; });
}

function updateStyle(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
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
  var style, name, elm = vnode.elm, s = vnode.data.style;
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
  var name, elm = vnode.elm, idx, i = 0, maxDur = 0,
      compStyle, style = s.remove, amount = 0, applied = [];
  for (name in style) {
    applied.push(name);
    elm.style[name] = style[name];
  }
  compStyle = getComputedStyle(elm);
  var props = compStyle['transition-property'].split(', ');
  for (; i < props.length; ++i) {
    if(applied.indexOf(props[i]) !== -1) amount++;
  }
  elm.addEventListener('transitionend', function(ev) {
    if (ev.target === elm) --amount;
    if (amount === 0) rm();
  });
}

var style = {create: updateStyle, update: updateStyle, destroy: applyDestroyStyle, remove: applyRemoveStyle};

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
  }
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
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.Kefir = global.Kefir || {})));
}(commonjsGlobal, function (exports) { 'use strict';

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

	function toPromise (obs) {
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

	var require$$0$1 = (ponyfill && typeof ponyfill === 'object' && 'default' in ponyfill ? ponyfill['default'] : ponyfill);

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

	var require$$0 = (index$1 && typeof index$1 === 'object' && 'default' in index$1 ? index$1['default'] : index$1);

	var index = createCommonjsModule$$1(function (module) {
	module.exports = require$$0;
	});

	var $$observable = (index && typeof index === 'object' && 'default' in index ? index['default'] : index);

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

	function repeat (generator) {
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

}));
});

var Kefir = unwrapExports(kefir);

function mkEmit(stream$) {
  return function emit(action, value) {
    return [stream$.emit, [action, value]]
  }
}

function bus() {
  let emitter;
  let stream = Kefir.stream(_emitter => {
    emitter = _emitter;
    return function() {
      emitter = null;
    }
  });
  stream.emit = function(x) {
    emitter && emitter.emit(x);
  };
  return stream
}

/*
   ['div', {},
    [['button', { on: { click: emit('add') } }, 'Click Me!'],
     ['span', {}, model]]]
*/

function convertToHyperScript(node) {
  let [sel, data, children] = node;

  if (Array.isArray(children)) {
    return h(sel, data, children.map(convertToHyperScript))
  } else {
    return h.apply(null, node)
  }
}

function render(view$, container) {
  let patch = snabbdom.init([_class, props, style, eventlisteners]);
  let vnode = container;

  view$
    .map(convertToHyperScript)
    .onValue(newVnode => {
      patch(vnode, newVnode);
      vnode = newVnode;
    });
}

// Stream
let actions$ = bus();
let emit$1 = mkEmit(actions$);

// Model
let initModel = 0;

// Update
function update(model, [action]) {
  switch (action) {
    case 'add':
      return model + 1
    case 'subtract':
      return model - 1
  }
}

// View
function button(action, text) {
  return ['button', { on: { click: emit$1(action) } }, text]
}

function view(model) {
  let v =
    ['div', {},
      [ button('subtract', '-'),
        ['span', {}, ` ${model} `],
        button('add', '+')]];

  return v
}

// Reduce
let model$ = actions$.scan(update, initModel);
model$.log('Model');

// Render
let view$ = model$.map(view);
render(view$, document.getElementById('container'));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS92bm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9pcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9odG1sZG9tYXBpLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL3NuYWJiZG9tLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9jbGFzcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9rZWZpci9kaXN0L2tlZmlyLmpzIiwiLi4vLi4vc3JjL2luZGV4LmpzIiwiaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzZWwsIGRhdGEsIGNoaWxkcmVuLCB0ZXh0LCBlbG0pIHtcbiAgdmFyIGtleSA9IGRhdGEgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IGRhdGEua2V5O1xuICByZXR1cm4ge3NlbDogc2VsLCBkYXRhOiBkYXRhLCBjaGlsZHJlbjogY2hpbGRyZW4sXG4gICAgICAgICAgdGV4dDogdGV4dCwgZWxtOiBlbG0sIGtleToga2V5fTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYXJyYXk6IEFycmF5LmlzQXJyYXksXG4gIHByaW1pdGl2ZTogZnVuY3Rpb24ocykgeyByZXR1cm4gdHlwZW9mIHMgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzID09PSAnbnVtYmVyJzsgfSxcbn07XG4iLCJmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZ05hbWUpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgcXVhbGlmaWVkTmFtZSl7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBxdWFsaWZpZWROYW1lKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVGV4dE5vZGUodGV4dCl7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBpbnNlcnRCZWZvcmUocGFyZW50Tm9kZSwgbmV3Tm9kZSwgcmVmZXJlbmNlTm9kZSl7XG4gIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpO1xufVxuXG5cbmZ1bmN0aW9uIHJlbW92ZUNoaWxkKG5vZGUsIGNoaWxkKXtcbiAgbm9kZS5yZW1vdmVDaGlsZChjaGlsZCk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZENoaWxkKG5vZGUsIGNoaWxkKXtcbiAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG59XG5cbmZ1bmN0aW9uIHBhcmVudE5vZGUobm9kZSl7XG4gIHJldHVybiBub2RlLnBhcmVudEVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIG5leHRTaWJsaW5nKG5vZGUpe1xuICByZXR1cm4gbm9kZS5uZXh0U2libGluZztcbn1cblxuZnVuY3Rpb24gdGFnTmFtZShub2RlKXtcbiAgcmV0dXJuIG5vZGUudGFnTmFtZTtcbn1cblxuZnVuY3Rpb24gc2V0VGV4dENvbnRlbnQobm9kZSwgdGV4dCl7XG4gIG5vZGUudGV4dENvbnRlbnQgPSB0ZXh0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlRWxlbWVudDogY3JlYXRlRWxlbWVudCxcbiAgY3JlYXRlRWxlbWVudE5TOiBjcmVhdGVFbGVtZW50TlMsXG4gIGNyZWF0ZVRleHROb2RlOiBjcmVhdGVUZXh0Tm9kZSxcbiAgYXBwZW5kQ2hpbGQ6IGFwcGVuZENoaWxkLFxuICByZW1vdmVDaGlsZDogcmVtb3ZlQ2hpbGQsXG4gIGluc2VydEJlZm9yZTogaW5zZXJ0QmVmb3JlLFxuICBwYXJlbnROb2RlOiBwYXJlbnROb2RlLFxuICBuZXh0U2libGluZzogbmV4dFNpYmxpbmcsXG4gIHRhZ05hbWU6IHRhZ05hbWUsXG4gIHNldFRleHRDb250ZW50OiBzZXRUZXh0Q29udGVudFxufTtcbiIsIi8vIGpzaGludCBuZXdjYXA6IGZhbHNlXG4vKiBnbG9iYWwgcmVxdWlyZSwgbW9kdWxlLCBkb2N1bWVudCwgTm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVk5vZGUgPSByZXF1aXJlKCcuL3Zub2RlJyk7XG52YXIgaXMgPSByZXF1aXJlKCcuL2lzJyk7XG52YXIgZG9tQXBpID0gcmVxdWlyZSgnLi9odG1sZG9tYXBpJyk7XG5cbmZ1bmN0aW9uIGlzVW5kZWYocykgeyByZXR1cm4gcyA9PT0gdW5kZWZpbmVkOyB9XG5mdW5jdGlvbiBpc0RlZihzKSB7IHJldHVybiBzICE9PSB1bmRlZmluZWQ7IH1cblxudmFyIGVtcHR5Tm9kZSA9IFZOb2RlKCcnLCB7fSwgW10sIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcblxuZnVuY3Rpb24gc2FtZVZub2RlKHZub2RlMSwgdm5vZGUyKSB7XG4gIHJldHVybiB2bm9kZTEua2V5ID09PSB2bm9kZTIua2V5ICYmIHZub2RlMS5zZWwgPT09IHZub2RlMi5zZWw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUtleVRvT2xkSWR4KGNoaWxkcmVuLCBiZWdpbklkeCwgZW5kSWR4KSB7XG4gIHZhciBpLCBtYXAgPSB7fSwga2V5O1xuICBmb3IgKGkgPSBiZWdpbklkeDsgaSA8PSBlbmRJZHg7ICsraSkge1xuICAgIGtleSA9IGNoaWxkcmVuW2ldLmtleTtcbiAgICBpZiAoaXNEZWYoa2V5KSkgbWFwW2tleV0gPSBpO1xuICB9XG4gIHJldHVybiBtYXA7XG59XG5cbnZhciBob29rcyA9IFsnY3JlYXRlJywgJ3VwZGF0ZScsICdyZW1vdmUnLCAnZGVzdHJveScsICdwcmUnLCAncG9zdCddO1xuXG5mdW5jdGlvbiBpbml0KG1vZHVsZXMsIGFwaSkge1xuICB2YXIgaSwgaiwgY2JzID0ge307XG5cbiAgaWYgKGlzVW5kZWYoYXBpKSkgYXBpID0gZG9tQXBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBob29rcy5sZW5ndGg7ICsraSkge1xuICAgIGNic1tob29rc1tpXV0gPSBbXTtcbiAgICBmb3IgKGogPSAwOyBqIDwgbW9kdWxlcy5sZW5ndGg7ICsraikge1xuICAgICAgaWYgKG1vZHVsZXNbal1baG9va3NbaV1dICE9PSB1bmRlZmluZWQpIGNic1tob29rc1tpXV0ucHVzaChtb2R1bGVzW2pdW2hvb2tzW2ldXSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZW1wdHlOb2RlQXQoZWxtKSB7XG4gICAgdmFyIGlkID0gZWxtLmlkID8gJyMnICsgZWxtLmlkIDogJyc7XG4gICAgdmFyIGMgPSBlbG0uY2xhc3NOYW1lID8gJy4nICsgZWxtLmNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJy4nKSA6ICcnO1xuICAgIHJldHVybiBWTm9kZShhcGkudGFnTmFtZShlbG0pLnRvTG93ZXJDYXNlKCkgKyBpZCArIGMsIHt9LCBbXSwgdW5kZWZpbmVkLCBlbG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlUm1DYihjaGlsZEVsbSwgbGlzdGVuZXJzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tbGlzdGVuZXJzID09PSAwKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBhcGkucGFyZW50Tm9kZShjaGlsZEVsbSk7XG4gICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnQsIGNoaWxkRWxtKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICB2YXIgaSwgZGF0YSA9IHZub2RlLmRhdGE7XG4gICAgaWYgKGlzRGVmKGRhdGEpKSB7XG4gICAgICBpZiAoaXNEZWYoaSA9IGRhdGEuaG9vaykgJiYgaXNEZWYoaSA9IGkuaW5pdCkpIHtcbiAgICAgICAgaSh2bm9kZSk7XG4gICAgICAgIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZWxtLCBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuLCBzZWwgPSB2bm9kZS5zZWw7XG4gICAgaWYgKGlzRGVmKHNlbCkpIHtcbiAgICAgIC8vIFBhcnNlIHNlbGVjdG9yXG4gICAgICB2YXIgaGFzaElkeCA9IHNlbC5pbmRleE9mKCcjJyk7XG4gICAgICB2YXIgZG90SWR4ID0gc2VsLmluZGV4T2YoJy4nLCBoYXNoSWR4KTtcbiAgICAgIHZhciBoYXNoID0gaGFzaElkeCA+IDAgPyBoYXNoSWR4IDogc2VsLmxlbmd0aDtcbiAgICAgIHZhciBkb3QgPSBkb3RJZHggPiAwID8gZG90SWR4IDogc2VsLmxlbmd0aDtcbiAgICAgIHZhciB0YWcgPSBoYXNoSWR4ICE9PSAtMSB8fCBkb3RJZHggIT09IC0xID8gc2VsLnNsaWNlKDAsIE1hdGgubWluKGhhc2gsIGRvdCkpIDogc2VsO1xuICAgICAgZWxtID0gdm5vZGUuZWxtID0gaXNEZWYoZGF0YSkgJiYgaXNEZWYoaSA9IGRhdGEubnMpID8gYXBpLmNyZWF0ZUVsZW1lbnROUyhpLCB0YWcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBhcGkuY3JlYXRlRWxlbWVudCh0YWcpO1xuICAgICAgaWYgKGhhc2ggPCBkb3QpIGVsbS5pZCA9IHNlbC5zbGljZShoYXNoICsgMSwgZG90KTtcbiAgICAgIGlmIChkb3RJZHggPiAwKSBlbG0uY2xhc3NOYW1lID0gc2VsLnNsaWNlKGRvdCArIDEpLnJlcGxhY2UoL1xcLi9nLCAnICcpO1xuICAgICAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBjcmVhdGVFbG0oY2hpbGRyZW5baV0sIGluc2VydGVkVm5vZGVRdWV1ZSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzLnByaW1pdGl2ZSh2bm9kZS50ZXh0KSkge1xuICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCkpO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5jcmVhdGUubGVuZ3RoOyArK2kpIGNicy5jcmVhdGVbaV0oZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICBpID0gdm5vZGUuZGF0YS5ob29rOyAvLyBSZXVzZSB2YXJpYWJsZVxuICAgICAgaWYgKGlzRGVmKGkpKSB7XG4gICAgICAgIGlmIChpLmNyZWF0ZSkgaS5jcmVhdGUoZW1wdHlOb2RlLCB2bm9kZSk7XG4gICAgICAgIGlmIChpLmluc2VydCkgaW5zZXJ0ZWRWbm9kZVF1ZXVlLnB1c2godm5vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlbG0gPSB2bm9kZS5lbG0gPSBhcGkuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCk7XG4gICAgfVxuICAgIHJldHVybiB2bm9kZS5lbG07XG4gIH1cblxuICBmdW5jdGlvbiBhZGRWbm9kZXMocGFyZW50RWxtLCBiZWZvcmUsIHZub2Rlcywgc3RhcnRJZHgsIGVuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbSh2bm9kZXNbc3RhcnRJZHhdLCBpbnNlcnRlZFZub2RlUXVldWUpLCBiZWZvcmUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGludm9rZURlc3Ryb3lIb29rKHZub2RlKSB7XG4gICAgdmFyIGksIGosIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgIGlmIChpc0RlZihkYXRhKSkge1xuICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLmhvb2spICYmIGlzRGVmKGkgPSBpLmRlc3Ryb3kpKSBpKHZub2RlKTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMuZGVzdHJveS5sZW5ndGg7ICsraSkgY2JzLmRlc3Ryb3lbaV0odm5vZGUpO1xuICAgICAgaWYgKGlzRGVmKGkgPSB2bm9kZS5jaGlsZHJlbikpIHtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IHZub2RlLmNoaWxkcmVuLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgaW52b2tlRGVzdHJveUhvb2sodm5vZGUuY2hpbGRyZW5bal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgdm5vZGVzLCBzdGFydElkeCwgZW5kSWR4KSB7XG4gICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgdmFyIGksIGxpc3RlbmVycywgcm0sIGNoID0gdm5vZGVzW3N0YXJ0SWR4XTtcbiAgICAgIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKGlzRGVmKGNoLnNlbCkpIHtcbiAgICAgICAgICBpbnZva2VEZXN0cm95SG9vayhjaCk7XG4gICAgICAgICAgbGlzdGVuZXJzID0gY2JzLnJlbW92ZS5sZW5ndGggKyAxO1xuICAgICAgICAgIHJtID0gY3JlYXRlUm1DYihjaC5lbG0sIGxpc3RlbmVycyk7XG4gICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5yZW1vdmUubGVuZ3RoOyArK2kpIGNicy5yZW1vdmVbaV0oY2gsIHJtKTtcbiAgICAgICAgICBpZiAoaXNEZWYoaSA9IGNoLmRhdGEpICYmIGlzRGVmKGkgPSBpLmhvb2spICYmIGlzRGVmKGkgPSBpLnJlbW92ZSkpIHtcbiAgICAgICAgICAgIGkoY2gsIHJtKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm0oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIFRleHQgbm9kZVxuICAgICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnRFbG0sIGNoLmVsbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVDaGlsZHJlbihwYXJlbnRFbG0sIG9sZENoLCBuZXdDaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIG9sZFN0YXJ0SWR4ID0gMCwgbmV3U3RhcnRJZHggPSAwO1xuICAgIHZhciBvbGRFbmRJZHggPSBvbGRDaC5sZW5ndGggLSAxO1xuICAgIHZhciBvbGRTdGFydFZub2RlID0gb2xkQ2hbMF07XG4gICAgdmFyIG9sZEVuZFZub2RlID0gb2xkQ2hbb2xkRW5kSWR4XTtcbiAgICB2YXIgbmV3RW5kSWR4ID0gbmV3Q2gubGVuZ3RoIC0gMTtcbiAgICB2YXIgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWzBdO1xuICAgIHZhciBuZXdFbmRWbm9kZSA9IG5ld0NoW25ld0VuZElkeF07XG4gICAgdmFyIG9sZEtleVRvSWR4LCBpZHhJbk9sZCwgZWxtVG9Nb3ZlLCBiZWZvcmU7XG5cbiAgICB3aGlsZSAob2xkU3RhcnRJZHggPD0gb2xkRW5kSWR4ICYmIG5ld1N0YXJ0SWR4IDw9IG5ld0VuZElkeCkge1xuICAgICAgaWYgKGlzVW5kZWYob2xkU3RhcnRWbm9kZSkpIHtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdOyAvLyBWbm9kZSBoYXMgYmVlbiBtb3ZlZCBsZWZ0XG4gICAgICB9IGVsc2UgaWYgKGlzVW5kZWYob2xkRW5kVm5vZGUpKSB7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgfSBlbHNlIGlmIChzYW1lVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3U3RhcnRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRTdGFydFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBvbGRTdGFydFZub2RlID0gb2xkQ2hbKytvbGRTdGFydElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdFbmRWbm9kZSkpIHtcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRFbmRWbm9kZSwgbmV3RW5kVm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCByaWdodFxuICAgICAgICBwYXRjaFZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgb2xkU3RhcnRWbm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhvbGRFbmRWbm9kZS5lbG0pKTtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdO1xuICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlKSkgeyAvLyBWbm9kZSBtb3ZlZCBsZWZ0XG4gICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBvbGRFbmRWbm9kZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgb2xkRW5kVm5vZGUgPSBvbGRDaFstLW9sZEVuZElkeF07XG4gICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc1VuZGVmKG9sZEtleVRvSWR4KSkgb2xkS2V5VG9JZHggPSBjcmVhdGVLZXlUb09sZElkeChvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgICAgIGlkeEluT2xkID0gb2xkS2V5VG9JZHhbbmV3U3RhcnRWbm9kZS5rZXldO1xuICAgICAgICBpZiAoaXNVbmRlZihpZHhJbk9sZCkpIHsgLy8gTmV3IGVsZW1lbnRcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgY3JlYXRlRWxtKG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSksIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWxtVG9Nb3ZlID0gb2xkQ2hbaWR4SW5PbGRdO1xuICAgICAgICAgIHBhdGNoVm5vZGUoZWxtVG9Nb3ZlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgIG9sZENoW2lkeEluT2xkXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgZWxtVG9Nb3ZlLmVsbSwgb2xkU3RhcnRWbm9kZS5lbG0pO1xuICAgICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAob2xkU3RhcnRJZHggPiBvbGRFbmRJZHgpIHtcbiAgICAgIGJlZm9yZSA9IGlzVW5kZWYobmV3Q2hbbmV3RW5kSWR4KzFdKSA/IG51bGwgOiBuZXdDaFtuZXdFbmRJZHgrMV0uZWxtO1xuICAgICAgYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCBuZXdDaCwgbmV3U3RhcnRJZHgsIG5ld0VuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICB9IGVsc2UgaWYgKG5ld1N0YXJ0SWR4ID4gbmV3RW5kSWR4KSB7XG4gICAgICByZW1vdmVWbm9kZXMocGFyZW50RWxtLCBvbGRDaCwgb2xkU3RhcnRJZHgsIG9sZEVuZElkeCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIHZhciBpLCBob29rO1xuICAgIGlmIChpc0RlZihpID0gdm5vZGUuZGF0YSkgJiYgaXNEZWYoaG9vayA9IGkuaG9vaykgJiYgaXNEZWYoaSA9IGhvb2sucHJlcGF0Y2gpKSB7XG4gICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICAgIHZhciBlbG0gPSB2bm9kZS5lbG0gPSBvbGRWbm9kZS5lbG0sIG9sZENoID0gb2xkVm5vZGUuY2hpbGRyZW4sIGNoID0gdm5vZGUuY2hpbGRyZW47XG4gICAgaWYgKG9sZFZub2RlID09PSB2bm9kZSkgcmV0dXJuO1xuICAgIGlmICghc2FtZVZub2RlKG9sZFZub2RlLCB2bm9kZSkpIHtcbiAgICAgIHZhciBwYXJlbnRFbG0gPSBhcGkucGFyZW50Tm9kZShvbGRWbm9kZS5lbG0pO1xuICAgICAgZWxtID0gY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGVsbSwgb2xkVm5vZGUuZWxtKTtcbiAgICAgIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIFtvbGRWbm9kZV0sIDAsIDApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaXNEZWYodm5vZGUuZGF0YSkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMudXBkYXRlLmxlbmd0aDsgKytpKSBjYnMudXBkYXRlW2ldKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgICBpID0gdm5vZGUuZGF0YS5ob29rO1xuICAgICAgaWYgKGlzRGVmKGkpICYmIGlzRGVmKGkgPSBpLnVwZGF0ZSkpIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICB9XG4gICAgaWYgKGlzVW5kZWYodm5vZGUudGV4dCkpIHtcbiAgICAgIGlmIChpc0RlZihvbGRDaCkgJiYgaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChvbGRDaCAhPT0gY2gpIHVwZGF0ZUNoaWxkcmVuKGVsbSwgb2xkQ2gsIGNoLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKGlzRGVmKG9sZFZub2RlLnRleHQpKSBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCAnJyk7XG4gICAgICAgIGFkZFZub2RlcyhlbG0sIG51bGwsIGNoLCAwLCBjaC5sZW5ndGggLSAxLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihvbGRDaCkpIHtcbiAgICAgICAgcmVtb3ZlVm5vZGVzKGVsbSwgb2xkQ2gsIDAsIG9sZENoLmxlbmd0aCAtIDEpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlZihvbGRWbm9kZS50ZXh0KSkge1xuICAgICAgICBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCAnJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvbGRWbm9kZS50ZXh0ICE9PSB2bm9kZS50ZXh0KSB7XG4gICAgICBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCB2bm9kZS50ZXh0KTtcbiAgICB9XG4gICAgaWYgKGlzRGVmKGhvb2spICYmIGlzRGVmKGkgPSBob29rLnBvc3RwYXRjaCkpIHtcbiAgICAgIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24ob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGksIGVsbSwgcGFyZW50O1xuICAgIHZhciBpbnNlcnRlZFZub2RlUXVldWUgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnByZS5sZW5ndGg7ICsraSkgY2JzLnByZVtpXSgpO1xuXG4gICAgaWYgKGlzVW5kZWYob2xkVm5vZGUuc2VsKSkge1xuICAgICAgb2xkVm5vZGUgPSBlbXB0eU5vZGVBdChvbGRWbm9kZSk7XG4gICAgfVxuXG4gICAgaWYgKHNhbWVWbm9kZShvbGRWbm9kZSwgdm5vZGUpKSB7XG4gICAgICBwYXRjaFZub2RlKG9sZFZub2RlLCB2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxtID0gb2xkVm5vZGUuZWxtO1xuICAgICAgcGFyZW50ID0gYXBpLnBhcmVudE5vZGUoZWxtKTtcblxuICAgICAgY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuXG4gICAgICBpZiAocGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50LCB2bm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhlbG0pKTtcbiAgICAgICAgcmVtb3ZlVm5vZGVzKHBhcmVudCwgW29sZFZub2RlXSwgMCwgMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGluc2VydGVkVm5vZGVRdWV1ZS5sZW5ndGg7ICsraSkge1xuICAgICAgaW5zZXJ0ZWRWbm9kZVF1ZXVlW2ldLmRhdGEuaG9vay5pbnNlcnQoaW5zZXJ0ZWRWbm9kZVF1ZXVlW2ldKTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGNicy5wb3N0Lmxlbmd0aDsgKytpKSBjYnMucG9zdFtpXSgpO1xuICAgIHJldHVybiB2bm9kZTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7aW5pdDogaW5pdH07XG4iLCJ2YXIgVk5vZGUgPSByZXF1aXJlKCcuL3Zub2RlJyk7XG52YXIgaXMgPSByZXF1aXJlKCcuL2lzJyk7XG5cbmZ1bmN0aW9uIGFkZE5TKGRhdGEsIGNoaWxkcmVuLCBzZWwpIHtcbiAgZGF0YS5ucyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc7XG5cbiAgaWYgKHNlbCAhPT0gJ2ZvcmVpZ25PYmplY3QnICYmIGNoaWxkcmVuICE9PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICBhZGROUyhjaGlsZHJlbltpXS5kYXRhLCBjaGlsZHJlbltpXS5jaGlsZHJlbiwgY2hpbGRyZW5baV0uc2VsKTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBoKHNlbCwgYiwgYykge1xuICB2YXIgZGF0YSA9IHt9LCBjaGlsZHJlbiwgdGV4dCwgaTtcbiAgaWYgKGMgIT09IHVuZGVmaW5lZCkge1xuICAgIGRhdGEgPSBiO1xuICAgIGlmIChpcy5hcnJheShjKSkgeyBjaGlsZHJlbiA9IGM7IH1cbiAgICBlbHNlIGlmIChpcy5wcmltaXRpdmUoYykpIHsgdGV4dCA9IGM7IH1cbiAgfSBlbHNlIGlmIChiICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoaXMuYXJyYXkoYikpIHsgY2hpbGRyZW4gPSBiOyB9XG4gICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGIpKSB7IHRleHQgPSBiOyB9XG4gICAgZWxzZSB7IGRhdGEgPSBiOyB9XG4gIH1cbiAgaWYgKGlzLmFycmF5KGNoaWxkcmVuKSkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgaWYgKGlzLnByaW1pdGl2ZShjaGlsZHJlbltpXSkpIGNoaWxkcmVuW2ldID0gVk5vZGUodW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgY2hpbGRyZW5baV0pO1xuICAgIH1cbiAgfVxuICBpZiAoc2VsWzBdID09PSAncycgJiYgc2VsWzFdID09PSAndicgJiYgc2VsWzJdID09PSAnZycpIHtcbiAgICBhZGROUyhkYXRhLCBjaGlsZHJlbiwgc2VsKTtcbiAgfVxuICByZXR1cm4gVk5vZGUoc2VsLCBkYXRhLCBjaGlsZHJlbiwgdGV4dCwgdW5kZWZpbmVkKTtcbn07XG4iLCJmdW5jdGlvbiB1cGRhdGVDbGFzcyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGN1ciwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkQ2xhc3MgPSBvbGRWbm9kZS5kYXRhLmNsYXNzLFxuICAgICAga2xhc3MgPSB2bm9kZS5kYXRhLmNsYXNzO1xuXG4gIGlmICghb2xkQ2xhc3MgJiYgIWtsYXNzKSByZXR1cm47XG4gIG9sZENsYXNzID0gb2xkQ2xhc3MgfHwge307XG4gIGtsYXNzID0ga2xhc3MgfHwge307XG5cbiAgZm9yIChuYW1lIGluIG9sZENsYXNzKSB7XG4gICAgaWYgKCFrbGFzc1tuYW1lXSkge1xuICAgICAgZWxtLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgfVxuICB9XG4gIGZvciAobmFtZSBpbiBrbGFzcykge1xuICAgIGN1ciA9IGtsYXNzW25hbWVdO1xuICAgIGlmIChjdXIgIT09IG9sZENsYXNzW25hbWVdKSB7XG4gICAgICBlbG0uY2xhc3NMaXN0W2N1ciA/ICdhZGQnIDogJ3JlbW92ZSddKG5hbWUpO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZUNsYXNzLCB1cGRhdGU6IHVwZGF0ZUNsYXNzfTtcbiIsImZ1bmN0aW9uIHVwZGF0ZVByb3BzKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIga2V5LCBjdXIsIG9sZCwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkUHJvcHMgPSBvbGRWbm9kZS5kYXRhLnByb3BzLCBwcm9wcyA9IHZub2RlLmRhdGEucHJvcHM7XG5cbiAgaWYgKCFvbGRQcm9wcyAmJiAhcHJvcHMpIHJldHVybjtcbiAgb2xkUHJvcHMgPSBvbGRQcm9wcyB8fCB7fTtcbiAgcHJvcHMgPSBwcm9wcyB8fCB7fTtcblxuICBmb3IgKGtleSBpbiBvbGRQcm9wcykge1xuICAgIGlmICghcHJvcHNba2V5XSkge1xuICAgICAgZGVsZXRlIGVsbVtrZXldO1xuICAgIH1cbiAgfVxuICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgIGN1ciA9IHByb3BzW2tleV07XG4gICAgb2xkID0gb2xkUHJvcHNba2V5XTtcbiAgICBpZiAob2xkICE9PSBjdXIgJiYgKGtleSAhPT0gJ3ZhbHVlJyB8fCBlbG1ba2V5XSAhPT0gY3VyKSkge1xuICAgICAgZWxtW2tleV0gPSBjdXI7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NyZWF0ZTogdXBkYXRlUHJvcHMsIHVwZGF0ZTogdXBkYXRlUHJvcHN9O1xuIiwidmFyIHJhZiA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB8fCBzZXRUaW1lb3V0O1xudmFyIG5leHRGcmFtZSA9IGZ1bmN0aW9uKGZuKSB7IHJhZihmdW5jdGlvbigpIHsgcmFmKGZuKTsgfSk7IH07XG5cbmZ1bmN0aW9uIHNldE5leHRGcmFtZShvYmosIHByb3AsIHZhbCkge1xuICBuZXh0RnJhbWUoZnVuY3Rpb24oKSB7IG9ialtwcm9wXSA9IHZhbDsgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVN0eWxlKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgY3VyLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sXG4gICAgICBvbGRTdHlsZSA9IG9sZFZub2RlLmRhdGEuc3R5bGUsXG4gICAgICBzdHlsZSA9IHZub2RlLmRhdGEuc3R5bGU7XG5cbiAgaWYgKCFvbGRTdHlsZSAmJiAhc3R5bGUpIHJldHVybjtcbiAgb2xkU3R5bGUgPSBvbGRTdHlsZSB8fCB7fTtcbiAgc3R5bGUgPSBzdHlsZSB8fCB7fTtcbiAgdmFyIG9sZEhhc0RlbCA9ICdkZWxheWVkJyBpbiBvbGRTdHlsZTtcblxuICBmb3IgKG5hbWUgaW4gb2xkU3R5bGUpIHtcbiAgICBpZiAoIXN0eWxlW25hbWVdKSB7XG4gICAgICBlbG0uc3R5bGVbbmFtZV0gPSAnJztcbiAgICB9XG4gIH1cbiAgZm9yIChuYW1lIGluIHN0eWxlKSB7XG4gICAgY3VyID0gc3R5bGVbbmFtZV07XG4gICAgaWYgKG5hbWUgPT09ICdkZWxheWVkJykge1xuICAgICAgZm9yIChuYW1lIGluIHN0eWxlLmRlbGF5ZWQpIHtcbiAgICAgICAgY3VyID0gc3R5bGUuZGVsYXllZFtuYW1lXTtcbiAgICAgICAgaWYgKCFvbGRIYXNEZWwgfHwgY3VyICE9PSBvbGRTdHlsZS5kZWxheWVkW25hbWVdKSB7XG4gICAgICAgICAgc2V0TmV4dEZyYW1lKGVsbS5zdHlsZSwgbmFtZSwgY3VyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobmFtZSAhPT0gJ3JlbW92ZScgJiYgY3VyICE9PSBvbGRTdHlsZVtuYW1lXSkge1xuICAgICAgZWxtLnN0eWxlW25hbWVdID0gY3VyO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBseURlc3Ryb3lTdHlsZSh2bm9kZSkge1xuICB2YXIgc3R5bGUsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSwgcyA9IHZub2RlLmRhdGEuc3R5bGU7XG4gIGlmICghcyB8fCAhKHN0eWxlID0gcy5kZXN0cm95KSkgcmV0dXJuO1xuICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICBlbG0uc3R5bGVbbmFtZV0gPSBzdHlsZVtuYW1lXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBseVJlbW92ZVN0eWxlKHZub2RlLCBybSkge1xuICB2YXIgcyA9IHZub2RlLmRhdGEuc3R5bGU7XG4gIGlmICghcyB8fCAhcy5yZW1vdmUpIHtcbiAgICBybSgpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbmFtZSwgZWxtID0gdm5vZGUuZWxtLCBpZHgsIGkgPSAwLCBtYXhEdXIgPSAwLFxuICAgICAgY29tcFN0eWxlLCBzdHlsZSA9IHMucmVtb3ZlLCBhbW91bnQgPSAwLCBhcHBsaWVkID0gW107XG4gIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgIGFwcGxpZWQucHVzaChuYW1lKTtcbiAgICBlbG0uc3R5bGVbbmFtZV0gPSBzdHlsZVtuYW1lXTtcbiAgfVxuICBjb21wU3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsbSk7XG4gIHZhciBwcm9wcyA9IGNvbXBTdHlsZVsndHJhbnNpdGlvbi1wcm9wZXJ0eSddLnNwbGl0KCcsICcpO1xuICBmb3IgKDsgaSA8IHByb3BzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYoYXBwbGllZC5pbmRleE9mKHByb3BzW2ldKSAhPT0gLTEpIGFtb3VudCsrO1xuICB9XG4gIGVsbS5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgZnVuY3Rpb24oZXYpIHtcbiAgICBpZiAoZXYudGFyZ2V0ID09PSBlbG0pIC0tYW1vdW50O1xuICAgIGlmIChhbW91bnQgPT09IDApIHJtKCk7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZVN0eWxlLCB1cGRhdGU6IHVwZGF0ZVN0eWxlLCBkZXN0cm95OiBhcHBseURlc3Ryb3lTdHlsZSwgcmVtb3ZlOiBhcHBseVJlbW92ZVN0eWxlfTtcbiIsImZ1bmN0aW9uIGludm9rZUhhbmRsZXIoaGFuZGxlciwgdm5vZGUsIGV2ZW50KSB7XG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgLy8gY2FsbCBmdW5jdGlvbiBoYW5kbGVyXG4gICAgaGFuZGxlci5jYWxsKHZub2RlLCBldmVudCwgdm5vZGUpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcIm9iamVjdFwiKSB7XG4gICAgLy8gY2FsbCBoYW5kbGVyIHdpdGggYXJndW1lbnRzXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyWzBdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIHNwZWNpYWwgY2FzZSBmb3Igc2luZ2xlIGFyZ3VtZW50IGZvciBwZXJmb3JtYW5jZVxuICAgICAgaWYgKGhhbmRsZXIubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGhhbmRsZXJbMF0uY2FsbCh2bm9kZSwgaGFuZGxlclsxXSwgZXZlbnQsIHZub2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gaGFuZGxlci5zbGljZSgxKTtcbiAgICAgICAgYXJncy5wdXNoKGV2ZW50KTtcbiAgICAgICAgYXJncy5wdXNoKHZub2RlKTtcbiAgICAgICAgaGFuZGxlclswXS5hcHBseSh2bm9kZSwgYXJncyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNhbGwgbXVsdGlwbGUgaGFuZGxlcnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGFuZGxlci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbnZva2VIYW5kbGVyKGhhbmRsZXJbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCwgdm5vZGUpIHtcbiAgdmFyIG5hbWUgPSBldmVudC50eXBlLFxuICAgICAgb24gPSB2bm9kZS5kYXRhLm9uO1xuXG4gIC8vIGNhbGwgZXZlbnQgaGFuZGxlcihzKSBpZiBleGlzdHNcbiAgaWYgKG9uICYmIG9uW25hbWVdKSB7XG4gICAgaW52b2tlSGFuZGxlcihvbltuYW1lXSwgdm5vZGUsIGV2ZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVMaXN0ZW5lcigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQpIHtcbiAgICBoYW5kbGVFdmVudChldmVudCwgaGFuZGxlci52bm9kZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlRXZlbnRMaXN0ZW5lcnMob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBvbGRPbiA9IG9sZFZub2RlLmRhdGEub24sXG4gICAgICBvbGRMaXN0ZW5lciA9IG9sZFZub2RlLmxpc3RlbmVyLFxuICAgICAgb2xkRWxtID0gb2xkVm5vZGUuZWxtLFxuICAgICAgb24gPSB2bm9kZSAmJiB2bm9kZS5kYXRhLm9uLFxuICAgICAgZWxtID0gdm5vZGUgJiYgdm5vZGUuZWxtLFxuICAgICAgbmFtZTtcblxuICAvLyBvcHRpbWl6YXRpb24gZm9yIHJldXNlZCBpbW11dGFibGUgaGFuZGxlcnNcbiAgaWYgKG9sZE9uID09PSBvbikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHJlbW92ZSBleGlzdGluZyBsaXN0ZW5lcnMgd2hpY2ggbm8gbG9uZ2VyIHVzZWRcbiAgaWYgKG9sZE9uICYmIG9sZExpc3RlbmVyKSB7XG4gICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGRlbGV0ZWQgd2UgcmVtb3ZlIGFsbCBleGlzdGluZyBsaXN0ZW5lcnMgdW5jb25kaXRpb25hbGx5XG4gICAgaWYgKCFvbikge1xuICAgICAgZm9yIChuYW1lIGluIG9sZE9uKSB7XG4gICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lciBpZiBlbGVtZW50IHdhcyBjaGFuZ2VkIG9yIGV4aXN0aW5nIGxpc3RlbmVycyByZW1vdmVkXG4gICAgICAgIG9sZEVsbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9sZExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXIgaWYgZXhpc3RpbmcgbGlzdGVuZXIgcmVtb3ZlZFxuICAgICAgICBpZiAoIW9uW25hbWVdKSB7XG4gICAgICAgICAgb2xkRWxtLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb2xkTGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGFkZCBuZXcgbGlzdGVuZXJzIHdoaWNoIGhhcyBub3QgYWxyZWFkeSBhdHRhY2hlZFxuICBpZiAob24pIHtcbiAgICAvLyByZXVzZSBleGlzdGluZyBsaXN0ZW5lciBvciBjcmVhdGUgbmV3XG4gICAgdmFyIGxpc3RlbmVyID0gdm5vZGUubGlzdGVuZXIgPSBvbGRWbm9kZS5saXN0ZW5lciB8fCBjcmVhdGVMaXN0ZW5lcigpO1xuICAgIC8vIHVwZGF0ZSB2bm9kZSBmb3IgbGlzdGVuZXJcbiAgICBsaXN0ZW5lci52bm9kZSA9IHZub2RlO1xuXG4gICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGFkZGVkIHdlIGFkZCBhbGwgbmVlZGVkIGxpc3RlbmVycyB1bmNvbmRpdGlvbmFsbHlcbiAgICBpZiAoIW9sZE9uKSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb24pIHtcbiAgICAgICAgLy8gYWRkIGxpc3RlbmVyIGlmIGVsZW1lbnQgd2FzIGNoYW5nZWQgb3IgbmV3IGxpc3RlbmVycyBhZGRlZFxuICAgICAgICBlbG0uYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb24pIHtcbiAgICAgICAgLy8gYWRkIGxpc3RlbmVyIGlmIG5ldyBsaXN0ZW5lciBhZGRlZFxuICAgICAgICBpZiAoIW9sZE9uW25hbWVdKSB7XG4gICAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlOiB1cGRhdGVFdmVudExpc3RlbmVycyxcbiAgdXBkYXRlOiB1cGRhdGVFdmVudExpc3RlbmVycyxcbiAgZGVzdHJveTogdXBkYXRlRXZlbnRMaXN0ZW5lcnNcbn07XG4iLCIvKiEgS2VmaXIuanMgdjMuNi4wXG4gKiAgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyXG4gKi9cblxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuXHQoZmFjdG9yeSgoZ2xvYmFsLktlZmlyID0gZ2xvYmFsLktlZmlyIHx8IHt9KSkpO1xufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cblx0ZnVuY3Rpb24gY3JlYXRlT2JqKHByb3RvKSB7XG5cdCAgdmFyIEYgPSBmdW5jdGlvbiAoKSB7fTtcblx0ICBGLnByb3RvdHlwZSA9IHByb3RvO1xuXHQgIHJldHVybiBuZXcgRigpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZXh0ZW5kKHRhcmdldCAvKiwgbWl4aW4xLCBtaXhpbjIuLi4qLykge1xuXHQgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBwcm9wID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZm9yIChwcm9wIGluIGFyZ3VtZW50c1tpXSkge1xuXHQgICAgICB0YXJnZXRbcHJvcF0gPSBhcmd1bWVudHNbaV1bcHJvcF07XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiB0YXJnZXQ7XG5cdH1cblxuXHRmdW5jdGlvbiBpbmhlcml0KENoaWxkLCBQYXJlbnQgLyosIG1peGluMSwgbWl4aW4yLi4uKi8pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBDaGlsZC5wcm90b3R5cGUgPSBjcmVhdGVPYmooUGFyZW50LnByb3RvdHlwZSk7XG5cdCAgQ2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2hpbGQ7XG5cdCAgZm9yIChpID0gMjsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBleHRlbmQoQ2hpbGQucHJvdG90eXBlLCBhcmd1bWVudHNbaV0pO1xuXHQgIH1cblx0ICByZXR1cm4gQ2hpbGQ7XG5cdH1cblxuXHR2YXIgTk9USElORyA9IFsnPG5vdGhpbmc+J107XG5cdHZhciBFTkQgPSAnZW5kJztcblx0dmFyIFZBTFVFID0gJ3ZhbHVlJztcblx0dmFyIEVSUk9SID0gJ2Vycm9yJztcblx0dmFyIEFOWSA9ICdhbnknO1xuXG5cdGZ1bmN0aW9uIGNvbmNhdChhLCBiKSB7XG5cdCAgdmFyIHJlc3VsdCA9IHZvaWQgMCxcblx0ICAgICAgbGVuZ3RoID0gdm9pZCAwLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBqID0gdm9pZCAwO1xuXHQgIGlmIChhLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGI7XG5cdCAgfVxuXHQgIGlmIChiLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGE7XG5cdCAgfVxuXHQgIGogPSAwO1xuXHQgIHJlc3VsdCA9IG5ldyBBcnJheShhLmxlbmd0aCArIGIubGVuZ3RoKTtcblx0ICBsZW5ndGggPSBhLmxlbmd0aDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGorKykge1xuXHQgICAgcmVzdWx0W2pdID0gYVtpXTtcblx0ICB9XG5cdCAgbGVuZ3RoID0gYi5sZW5ndGg7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBqKyspIHtcblx0ICAgIHJlc3VsdFtqXSA9IGJbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kKGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChhcnJbaV0gPT09IHZhbHVlKSB7XG5cdCAgICAgIHJldHVybiBpO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kQnlQcmVkKGFyciwgcHJlZCkge1xuXHQgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHByZWQoYXJyW2ldKSkge1xuXHQgICAgICByZXR1cm4gaTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2xvbmVBcnJheShpbnB1dCkge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2ldID0gaW5wdXRbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmUoaW5wdXQsIGluZGV4KSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gdm9pZCAwLFxuXHQgICAgICBpID0gdm9pZCAwLFxuXHQgICAgICBqID0gdm9pZCAwO1xuXHQgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgbGVuZ3RoKSB7XG5cdCAgICBpZiAobGVuZ3RoID09PSAxKSB7XG5cdCAgICAgIHJldHVybiBbXTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGggLSAxKTtcblx0ICAgICAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICAgIGlmIChpICE9PSBpbmRleCkge1xuXHQgICAgICAgICAgcmVzdWx0W2pdID0gaW5wdXRbaV07XG5cdCAgICAgICAgICBqKys7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHJldHVybiByZXN1bHQ7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHJldHVybiBpbnB1dDtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBtYXAoaW5wdXQsIGZuKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCksXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaV0gPSBmbihpbnB1dFtpXSk7XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmb3JFYWNoKGFyciwgZm4pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGZuKGFycltpXSk7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gZmlsbEFycmF5KGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGFycltpXSA9IHZhbHVlO1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnRhaW5zKGFyciwgdmFsdWUpIHtcblx0ICByZXR1cm4gZmluZChhcnIsIHZhbHVlKSAhPT0gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBzbGlkZShjdXIsIG5leHQsIG1heCkge1xuXHQgIHZhciBsZW5ndGggPSBNYXRoLm1pbihtYXgsIGN1ci5sZW5ndGggKyAxKSxcblx0ICAgICAgb2Zmc2V0ID0gY3VyLmxlbmd0aCAtIGxlbmd0aCArIDEsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IG9mZnNldDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaSAtIG9mZnNldF0gPSBjdXJbaV07XG5cdCAgfVxuXHQgIHJlc3VsdFtsZW5ndGggLSAxXSA9IG5leHQ7XG5cdCAgcmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCBldmVudCkge1xuXHQgIGlmICh0eXBlID09PSBBTlkpIHtcblx0ICAgIGZuKGV2ZW50KTtcblx0ICB9IGVsc2UgaWYgKHR5cGUgPT09IGV2ZW50LnR5cGUpIHtcblx0ICAgIGlmICh0eXBlID09PSBWQUxVRSB8fCB0eXBlID09PSBFUlJPUikge1xuXHQgICAgICBmbihldmVudC52YWx1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBmbigpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XG5cdCAgdGhpcy5faXRlbXMgPSBbXTtcblx0ICB0aGlzLl9zcGllcyA9IFtdO1xuXHQgIHRoaXMuX2luTG9vcCA9IDA7XG5cdCAgdGhpcy5fcmVtb3ZlZEl0ZW1zID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChEaXNwYXRjaGVyLnByb3RvdHlwZSwge1xuXHQgIGFkZDogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IGNvbmNhdCh0aGlzLl9pdGVtcywgW3sgdHlwZTogdHlwZSwgZm46IGZuIH1dKTtcblx0ICAgIHJldHVybiB0aGlzLl9pdGVtcy5sZW5ndGg7XG5cdCAgfSxcblx0ICByZW1vdmU6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgdmFyIGluZGV4ID0gZmluZEJ5UHJlZCh0aGlzLl9pdGVtcywgZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgcmV0dXJuIHgudHlwZSA9PT0gdHlwZSAmJiB4LmZuID09PSBmbjtcblx0ICAgIH0pO1xuXG5cdCAgICAvLyBpZiB3ZSdyZSBjdXJyZW50bHkgaW4gYSBub3RpZmljYXRpb24gbG9vcCxcblx0ICAgIC8vIHJlbWVtYmVyIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgaWYgKHRoaXMuX2luTG9vcCAhPT0gMCAmJiBpbmRleCAhPT0gLTEpIHtcblx0ICAgICAgaWYgKHRoaXMuX3JlbW92ZWRJdGVtcyA9PT0gbnVsbCkge1xuXHQgICAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcy5wdXNoKHRoaXMuX2l0ZW1zW2luZGV4XSk7XG5cdCAgICB9XG5cblx0ICAgIHRoaXMuX2l0ZW1zID0gcmVtb3ZlKHRoaXMuX2l0ZW1zLCBpbmRleCk7XG5cdCAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgYWRkU3B5OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHRoaXMuX3NwaWVzID0gY29uY2F0KHRoaXMuX3NwaWVzLCBbZm5dKTtcblx0ICAgIHJldHVybiB0aGlzLl9zcGllcy5sZW5ndGg7XG5cdCAgfSxcblxuXG5cdCAgLy8gQmVjYXVzZSBzcGllcyBhcmUgb25seSBldmVyIGEgZnVuY3Rpb24gdGhhdCBwZXJmb3JtIGxvZ2dpbmcgYXNcblx0ICAvLyB0aGVpciBvbmx5IHNpZGUgZWZmZWN0LCB3ZSBkb24ndCBuZWVkIHRoZSBzYW1lIGNvbXBsaWNhdGVkXG5cdCAgLy8gcmVtb3ZhbCBsb2dpYyBsaWtlIGluIHJlbW92ZSgpXG5cdCAgcmVtb3ZlU3B5OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHRoaXMuX3NwaWVzID0gcmVtb3ZlKHRoaXMuX3NwaWVzLCB0aGlzLl9zcGllcy5pbmRleE9mKGZuKSk7XG5cdCAgICByZXR1cm4gdGhpcy5fc3BpZXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgZGlzcGF0Y2g6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgdGhpcy5faW5Mb29wKys7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc3BpZXMgPSB0aGlzLl9zcGllczsgdGhpcy5fc3BpZXMgIT09IG51bGwgJiYgaSA8IHNwaWVzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHNwaWVzW2ldKGV2ZW50KTtcblx0ICAgIH1cblxuXHQgICAgZm9yICh2YXIgX2kgPSAwLCBpdGVtcyA9IHRoaXMuX2l0ZW1zOyBfaSA8IGl0ZW1zLmxlbmd0aDsgX2krKykge1xuXG5cdCAgICAgIC8vIGNsZWFudXAgd2FzIGNhbGxlZFxuXHQgICAgICBpZiAodGhpcy5faXRlbXMgPT09IG51bGwpIHtcblx0ICAgICAgICBicmVhaztcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgICBpZiAodGhpcy5fcmVtb3ZlZEl0ZW1zICE9PSBudWxsICYmIGNvbnRhaW5zKHRoaXMuX3JlbW92ZWRJdGVtcywgaXRlbXNbX2ldKSkge1xuXHQgICAgICAgIGNvbnRpbnVlO1xuXHQgICAgICB9XG5cblx0ICAgICAgY2FsbFN1YnNjcmliZXIoaXRlbXNbX2ldLnR5cGUsIGl0ZW1zW19pXS5mbiwgZXZlbnQpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5faW5Mb29wLS07XG5cdCAgICBpZiAodGhpcy5faW5Mb29wID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBjbGVhbnVwOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IG51bGw7XG5cdCAgICB0aGlzLl9zcGllcyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBPYnNlcnZhYmxlKCkge1xuXHQgIHRoaXMuX2Rpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpO1xuXHQgIHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuXHQgIHRoaXMuX2FsaXZlID0gdHJ1ZTtcblx0ICB0aGlzLl9hY3RpdmF0aW5nID0gZmFsc2U7XG5cdCAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHQgIHRoaXMuX3NweUhhbmRsZXJzID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXG5cdCAgX25hbWU6ICdvYnNlcnZhYmxlJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge30sXG5cdCAgX3NldEFjdGl2ZTogZnVuY3Rpb24gKGFjdGl2ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSAhPT0gYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX2FjdGl2ZSA9IGFjdGl2ZTtcblx0ICAgICAgaWYgKGFjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSB0cnVlO1xuXHQgICAgICAgIHRoaXMuX29uQWN0aXZhdGlvbigpO1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSBmYWxzZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9vbkRlYWN0aXZhdGlvbigpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3NldEFjdGl2ZShmYWxzZSk7XG5cdCAgICB0aGlzLl9kaXNwYXRjaGVyLmNsZWFudXAoKTtcblx0ICAgIHRoaXMuX2Rpc3BhdGNoZXIgPSBudWxsO1xuXHQgICAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2VtaXQ6IGZ1bmN0aW9uICh0eXBlLCB4KSB7XG5cdCAgICBzd2l0Y2ggKHR5cGUpIHtcblx0ICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdFZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RXJyb3I6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9hbGl2ZSA9IGZhbHNlO1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRU5EIH0pO1xuXHQgICAgICB0aGlzLl9jbGVhcigpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uOiBmdW5jdGlvbiAodHlwZSwgZm4pIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmFkZCh0eXBlLCBmbik7XG5cdCAgICAgIHRoaXMuX3NldEFjdGl2ZSh0cnVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB7IHR5cGU6IEVORCB9KTtcblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgX29mZjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdmFyIGNvdW50ID0gdGhpcy5fZGlzcGF0Y2hlci5yZW1vdmUodHlwZSwgZm4pO1xuXHQgICAgICBpZiAoY291bnQgPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9zZXRBY3RpdmUoZmFsc2UpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIG9uVmFsdWU6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKFZBTFVFLCBmbik7XG5cdCAgfSxcblx0ICBvbkVycm9yOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb25FbmQ6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEVORCwgZm4pO1xuXHQgIH0sXG5cdCAgb25Bbnk6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEFOWSwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmVmFsdWU6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihWQUxVRSwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRXJyb3I6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRW5kOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoRU5ELCBmbik7XG5cdCAgfSxcblx0ICBvZmZBbnk6IGZ1bmN0aW9uIChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihBTlksIGZuKTtcblx0ICB9LFxuXHQgIG9ic2VydmU6IGZ1bmN0aW9uIChvYnNlcnZlck9yT25WYWx1ZSwgb25FcnJvciwgb25FbmQpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cdCAgICB2YXIgY2xvc2VkID0gZmFsc2U7XG5cblx0ICAgIHZhciBvYnNlcnZlciA9ICFvYnNlcnZlck9yT25WYWx1ZSB8fCB0eXBlb2Ygb2JzZXJ2ZXJPck9uVmFsdWUgPT09ICdmdW5jdGlvbicgPyB7IHZhbHVlOiBvYnNlcnZlck9yT25WYWx1ZSwgZXJyb3I6IG9uRXJyb3IsIGVuZDogb25FbmQgfSA6IG9ic2VydmVyT3JPblZhbHVlO1xuXG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUgJiYgb2JzZXJ2ZXIudmFsdWUpIHtcblx0ICAgICAgICBvYnNlcnZlci52YWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IgJiYgb2JzZXJ2ZXIuZXJyb3IpIHtcblx0ICAgICAgICBvYnNlcnZlci5lcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIG9ic2VydmVyLmVuZCkge1xuXHQgICAgICAgIG9ic2VydmVyLmVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cblx0ICAgIHRoaXMub25BbnkoaGFuZGxlcik7XG5cblx0ICAgIHJldHVybiB7XG5cdCAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgaWYgKCFjbG9zZWQpIHtcblx0ICAgICAgICAgIF90aGlzLm9mZkFueShoYW5kbGVyKTtcblx0ICAgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgICAgfVxuXHQgICAgICB9LFxuXG5cdCAgICAgIGdldCBjbG9zZWQoKSB7XG5cdCAgICAgICAgcmV0dXJuIGNsb3NlZDtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICB9LFxuXG5cblx0ICAvLyBBIGFuZCBCIG11c3QgYmUgc3ViY2xhc3NlcyBvZiBTdHJlYW0gYW5kIFByb3BlcnR5IChvcmRlciBkb2Vzbid0IG1hdHRlcilcblx0ICBfb2ZTYW1lVHlwZTogZnVuY3Rpb24gKEEsIEIpIHtcblx0ICAgIHJldHVybiBBLnByb3RvdHlwZS5nZXRUeXBlKCkgPT09IHRoaXMuZ2V0VHlwZSgpID8gQSA6IEI7XG5cdCAgfSxcblx0ICBzZXROYW1lOiBmdW5jdGlvbiAoc291cmNlT2JzIC8qIG9wdGlvbmFsICovLCBzZWxmTmFtZSkge1xuXHQgICAgdGhpcy5fbmFtZSA9IHNlbGZOYW1lID8gc291cmNlT2JzLl9uYW1lICsgJy4nICsgc2VsZk5hbWUgOiBzb3VyY2VPYnM7XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIGxvZzogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIG5hbWUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRvU3RyaW5nKCkgOiBhcmd1bWVudHNbMF07XG5cblxuXHQgICAgdmFyIGlzQ3VycmVudCA9IHZvaWQgMDtcblx0ICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHZhciB0eXBlID0gJzwnICsgZXZlbnQudHlwZSArIChpc0N1cnJlbnQgPyAnOmN1cnJlbnQnIDogJycpICsgJz4nO1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgaWYgKCF0aGlzLl9sb2dIYW5kbGVycykge1xuXHQgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fbG9nSGFuZGxlcnMucHVzaCh7IG5hbWU6IG5hbWUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XG5cdCAgICB9XG5cblx0ICAgIGlzQ3VycmVudCA9IHRydWU7XG5cdCAgICB0aGlzLm9uQW55KGhhbmRsZXIpO1xuXHQgICAgaXNDdXJyZW50ID0gZmFsc2U7XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgb2ZmTG9nOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXG5cdCAgICBpZiAodGhpcy5fbG9nSGFuZGxlcnMpIHtcblx0ICAgICAgdmFyIGhhbmRsZXJJbmRleCA9IGZpbmRCeVByZWQodGhpcy5fbG9nSGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgICByZXR1cm4gb2JqLm5hbWUgPT09IG5hbWU7XG5cdCAgICAgIH0pO1xuXHQgICAgICBpZiAoaGFuZGxlckluZGV4ICE9PSAtMSkge1xuXHQgICAgICAgIHRoaXMub2ZmQW55KHRoaXMuX2xvZ0hhbmRsZXJzW2hhbmRsZXJJbmRleF0uaGFuZGxlcik7XG5cdCAgICAgICAgdGhpcy5fbG9nSGFuZGxlcnMuc3BsaWNlKGhhbmRsZXJJbmRleCwgMSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBzcHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICB2YXIgdHlwZSA9ICc8JyArIGV2ZW50LnR5cGUgKyAnPic7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgaWYgKCF0aGlzLl9zcHlIYW5kbGVycykge1xuXHQgICAgICAgIHRoaXMuX3NweUhhbmRsZXJzID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fc3B5SGFuZGxlcnMucHVzaCh7IG5hbWU6IG5hbWUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuYWRkU3B5KGhhbmRsZXIpO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBvZmZTcHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICBpZiAodGhpcy5fc3B5SGFuZGxlcnMpIHtcblx0ICAgICAgdmFyIGhhbmRsZXJJbmRleCA9IGZpbmRCeVByZWQodGhpcy5fc3B5SGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgICByZXR1cm4gb2JqLm5hbWUgPT09IG5hbWU7XG5cdCAgICAgIH0pO1xuXHQgICAgICBpZiAoaGFuZGxlckluZGV4ICE9PSAtMSkge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIucmVtb3ZlU3B5KHRoaXMuX3NweUhhbmRsZXJzW2hhbmRsZXJJbmRleF0uaGFuZGxlcik7XG5cdCAgICAgICAgdGhpcy5fc3B5SGFuZGxlcnMuc3BsaWNlKGhhbmRsZXJJbmRleCwgMSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH1cblx0fSk7XG5cblx0Ly8gZXh0ZW5kKCkgY2FuJ3QgaGFuZGxlIGB0b1N0cmluZ2AgaW4gSUU4XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiAnWycgKyB0aGlzLl9uYW1lICsgJ10nO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIFN0cmVhbSgpIHtcblx0ICBPYnNlcnZhYmxlLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFN0cmVhbSwgT2JzZXJ2YWJsZSwge1xuXG5cdCAgX25hbWU6ICdzdHJlYW0nLFxuXG5cdCAgZ2V0VHlwZTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuICdzdHJlYW0nO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gUHJvcGVydHkoKSB7XG5cdCAgT2JzZXJ2YWJsZS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFByb3BlcnR5LCBPYnNlcnZhYmxlLCB7XG5cblx0ICBfbmFtZTogJ3Byb3BlcnR5JyxcblxuXHQgIF9lbWl0VmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9O1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFcnJvcjogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH07XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdEVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlID0gZmFsc2U7XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFTkQgfSk7XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fY2xlYXIoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5hZGQodHlwZSwgZm4pO1xuXHQgICAgICB0aGlzLl9zZXRBY3RpdmUodHJ1ZSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ICE9PSBudWxsKSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB0aGlzLl9jdXJyZW50RXZlbnQpO1xuXHQgICAgfVxuXHQgICAgaWYgKCF0aGlzLl9hbGl2ZSkge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgeyB0eXBlOiBFTkQgfSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiAncHJvcGVydHknO1xuXHQgIH1cblx0fSk7XG5cblx0dmFyIG5ldmVyUyA9IG5ldyBTdHJlYW0oKTtcblx0bmV2ZXJTLl9lbWl0RW5kKCk7XG5cdG5ldmVyUy5fbmFtZSA9ICduZXZlcic7XG5cblx0ZnVuY3Rpb24gbmV2ZXIoKSB7XG5cdCAgcmV0dXJuIG5ldmVyUztcblx0fVxuXG5cdGZ1bmN0aW9uIHRpbWVCYXNlZChtaXhpbikge1xuXG5cdCAgZnVuY3Rpb24gQW5vbnltb3VzU3RyZWFtKHdhaXQsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fb25UaWNrKCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpbmhlcml0KEFub255bW91c1N0cmVhbSwgU3RyZWFtLCB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblx0ICB9LCBtaXhpbik7XG5cblx0ICByZXR1cm4gQW5vbnltb3VzU3RyZWFtO1xuXHR9XG5cblx0dmFyIFMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdsYXRlcicsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB4ID0gX3JlZi54O1xuXG5cdCAgICB0aGlzLl94ID0geDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94ID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94KTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGxhdGVyKHdhaXQsIHgpIHtcblx0ICByZXR1cm4gbmV3IFMod2FpdCwgeyB4OiB4IH0pO1xuXHR9XG5cblx0dmFyIFMkMSA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2ludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIHggPSBfcmVmLng7XG5cblx0ICAgIHRoaXMuX3ggPSB4O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3ggPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3gpO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gaW50ZXJ2YWwod2FpdCwgeCkge1xuXHQgIHJldHVybiBuZXcgUyQxKHdhaXQsIHsgeDogeCB9KTtcblx0fVxuXG5cdHZhciBTJDIgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdzZXF1ZW50aWFsbHknLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgeHMgPSBfcmVmLnhzO1xuXG5cdCAgICB0aGlzLl94cyA9IGNsb25lQXJyYXkoeHMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hzID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl94cy5sZW5ndGggPT09IDEpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzWzBdKTtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzLnNoaWZ0KCkpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc2VxdWVudGlhbGx5KHdhaXQsIHhzKSB7XG5cdCAgcmV0dXJuIHhzLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgUyQyKHdhaXQsIHsgeHM6IHhzIH0pO1xuXHR9XG5cblx0dmFyIFMkMyA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2Zyb21Qb2xsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbigpKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGZyb21Qb2xsKHdhaXQsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDMod2FpdCwgeyBmbjogZm4gfSk7XG5cdH1cblxuXHRmdW5jdGlvbiBlbWl0dGVyKG9icykge1xuXG5cdCAgZnVuY3Rpb24gdmFsdWUoeCkge1xuXHQgICAgb2JzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXJyb3IoeCkge1xuXHQgICAgb2JzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZW5kKCkge1xuXHQgICAgb2JzLl9lbWl0RW5kKCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXZlbnQoZSkge1xuXHQgICAgb2JzLl9lbWl0KGUudHlwZSwgZS52YWx1ZSk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIHtcblx0ICAgIHZhbHVlOiB2YWx1ZSxcblx0ICAgIGVycm9yOiBlcnJvcixcblx0ICAgIGVuZDogZW5kLFxuXHQgICAgZXZlbnQ6IGV2ZW50LFxuXG5cdCAgICAvLyBsZWdhY3lcblx0ICAgIGVtaXQ6IHZhbHVlLFxuXHQgICAgZW1pdEV2ZW50OiBldmVudFxuXHQgIH07XG5cdH1cblxuXHR2YXIgUyQ0ID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnd2l0aEludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBlbWl0dGVyKHRoaXMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBmbih0aGlzLl9lbWl0dGVyKTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHdpdGhJbnRlcnZhbCh3YWl0LCBmbikge1xuXHQgIHJldHVybiBuZXcgUyQ0KHdhaXQsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gUyQ1KGZuKSB7XG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fZm4gPSBmbjtcblx0ICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFMkNSwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ3N0cmVhbScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciB1bnN1YnNjcmliZSA9IGZuKGVtaXR0ZXIodGhpcykpO1xuXHQgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSB0eXBlb2YgdW5zdWJzY3JpYmUgPT09ICdmdW5jdGlvbicgPyB1bnN1YnNjcmliZSA6IG51bGw7XG5cblx0ICAgIC8vIGZpeCBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzM1XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9jYWxsVW5zdWJzY3JpYmUoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jYWxsVW5zdWJzY3JpYmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl91bnN1YnNjcmliZSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSgpO1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2NhbGxVbnN1YnNjcmliZSgpO1xuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc3RyZWFtKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDUoZm4pO1xuXHR9XG5cblx0ZnVuY3Rpb24gZnJvbUNhbGxiYWNrKGNhbGxiYWNrQ29uc3VtZXIpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgY2FsbGJhY2tDb25zdW1lcihmdW5jdGlvbiAoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9KTtcblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tQ2FsbGJhY2snKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21Ob2RlQ2FsbGJhY2soY2FsbGJhY2tDb25zdW1lcikge1xuXG5cdCAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuXG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICBjYWxsYmFja0NvbnN1bWVyKGZ1bmN0aW9uIChlcnJvciwgeCkge1xuXHQgICAgICAgIGlmIChlcnJvcikge1xuXHQgICAgICAgICAgZW1pdHRlci5lcnJvcihlcnJvcik7XG5cdCAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICB9XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbU5vZGVDYWxsYmFjaycpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc3ByZWFkKGZuLCBsZW5ndGgpIHtcblx0ICBzd2l0Y2ggKGxlbmd0aCkge1xuXHQgICAgY2FzZSAwOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIHJldHVybiBmbigpO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAxOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDI6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMzpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSA0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG5cdCAgICAgIH07XG5cdCAgICBkZWZhdWx0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICAgIH07XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwbHkoZm4sIGMsIGEpIHtcblx0ICB2YXIgYUxlbmd0aCA9IGEgPyBhLmxlbmd0aCA6IDA7XG5cdCAgaWYgKGMgPT0gbnVsbCkge1xuXHQgICAgc3dpdGNoIChhTGVuZ3RoKSB7XG5cdCAgICAgIGNhc2UgMDpcblx0ICAgICAgICByZXR1cm4gZm4oKTtcblx0ICAgICAgY2FzZSAxOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdKTtcblx0ICAgICAgY2FzZSAyOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgY2FzZSAzOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdKTtcblx0ICAgICAgY2FzZSA0OlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdLCBhWzNdKTtcblx0ICAgICAgZGVmYXVsdDpcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHN3aXRjaCAoYUxlbmd0aCkge1xuXHQgICAgICBjYXNlIDA6XG5cdCAgICAgICAgcmV0dXJuIGZuLmNhbGwoYyk7XG5cdCAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KGMsIGEpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21TdWJVbnN1YihzdWIsIHVuc3ViLCB0cmFuc2Zvcm1lciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSB0cmFuc2Zvcm1lciA/IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgZW1pdHRlci5lbWl0KGFwcGx5KHRyYW5zZm9ybWVyLCB0aGlzLCBhcmd1bWVudHMpKTtcblx0ICAgIH0gOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICB9O1xuXG5cdCAgICBzdWIoaGFuZGxlcik7XG5cdCAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gdW5zdWIoaGFuZGxlcik7XG5cdCAgICB9O1xuXHQgIH0pLnNldE5hbWUoJ2Zyb21TdWJVbnN1YicpO1xuXHR9XG5cblx0dmFyIHBhaXJzID0gW1snYWRkRXZlbnRMaXN0ZW5lcicsICdyZW1vdmVFdmVudExpc3RlbmVyJ10sIFsnYWRkTGlzdGVuZXInLCAncmVtb3ZlTGlzdGVuZXInXSwgWydvbicsICdvZmYnXV07XG5cblx0ZnVuY3Rpb24gZnJvbUV2ZW50cyh0YXJnZXQsIGV2ZW50TmFtZSwgdHJhbnNmb3JtZXIpIHtcblx0ICB2YXIgc3ViID0gdm9pZCAwLFxuXHQgICAgICB1bnN1YiA9IHZvaWQgMDtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzBdXSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzFdXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgICBzdWIgPSBwYWlyc1tpXVswXTtcblx0ICAgICAgdW5zdWIgPSBwYWlyc1tpXVsxXTtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9XG5cdCAgfVxuXG5cdCAgaWYgKHN1YiA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ3RhcmdldCBkb25cXCd0IHN1cHBvcnQgYW55IG9mICcgKyAnYWRkRXZlbnRMaXN0ZW5lci9yZW1vdmVFdmVudExpc3RlbmVyLCBhZGRMaXN0ZW5lci9yZW1vdmVMaXN0ZW5lciwgb24vb2ZmIG1ldGhvZCBwYWlyJyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIGZyb21TdWJVbnN1YihmdW5jdGlvbiAoaGFuZGxlcikge1xuXHQgICAgcmV0dXJuIHRhcmdldFtzdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcblx0ICAgIHJldHVybiB0YXJnZXRbdW5zdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgdHJhbnNmb3JtZXIpLnNldE5hbWUoJ2Zyb21FdmVudHMnKTtcblx0fVxuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQKHZhbHVlKSB7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiAndmFsdWUnLCB2YWx1ZTogdmFsdWUsIGN1cnJlbnQ6IHRydWUgfTtcblx0fVxuXG5cdGluaGVyaXQoUCwgUHJvcGVydHksIHtcblx0ICBfbmFtZTogJ2NvbnN0YW50Jyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0ZnVuY3Rpb24gY29uc3RhbnQoeCkge1xuXHQgIHJldHVybiBuZXcgUCh4KTtcblx0fVxuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQJDEodmFsdWUpIHtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6ICdlcnJvcicsIHZhbHVlOiB2YWx1ZSwgY3VycmVudDogdHJ1ZSB9O1xuXHR9XG5cblx0aW5oZXJpdChQJDEsIFByb3BlcnR5LCB7XG5cdCAgX25hbWU6ICdjb25zdGFudEVycm9yJyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0ZnVuY3Rpb24gY29uc3RhbnRFcnJvcih4KSB7XG5cdCAgcmV0dXJuIG5ldyBQJDEoeCk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDb25zdHJ1Y3RvcihCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShzb3VyY2UsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgICAgdGhpcy5fbmFtZSA9IHNvdXJjZS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9pbml0KG9wdGlvbnMpO1xuXHQgICAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDbGFzc01ldGhvZHMoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblx0ICAgIF9pbml0OiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZUVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVORDpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfSxcblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblx0ICAgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBCYXNlQ2xhc3MucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTdHJlYW0obmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUyA9IGNyZWF0ZUNvbnN0cnVjdG9yKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyhTdHJlYW0pLCBtaXhpbik7XG5cdCAgcmV0dXJuIFM7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVQcm9wZXJ0eShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBQID0gY3JlYXRlQ29uc3RydWN0b3IoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyhQcm9wZXJ0eSksIG1peGluKTtcblx0ICByZXR1cm4gUDtcblx0fVxuXG5cdHZhciBQJDIgPSBjcmVhdGVQcm9wZXJ0eSgndG9Qcm9wZXJ0eScsIHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2dldEluaXRpYWxDdXJyZW50ID0gZm47XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQgIT09IG51bGwpIHtcblx0ICAgICAgdmFyIGdldEluaXRpYWwgPSB0aGlzLl9nZXRJbml0aWFsQ3VycmVudDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGdldEluaXRpYWwoKSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHRvUHJvcGVydHkob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIGlmIChmbiAhPT0gbnVsbCAmJiB0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHRocm93IG5ldyBFcnJvcignWW91IHNob3VsZCBjYWxsIHRvUHJvcGVydHkoKSB3aXRoIGEgZnVuY3Rpb24gb3Igbm8gYXJndW1lbnRzLicpO1xuXHQgIH1cblx0ICByZXR1cm4gbmV3IFAkMihvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIFMkNiA9IGNyZWF0ZVN0cmVhbSgnY2hhbmdlcycsIHtcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNoYW5nZXMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDYob2JzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21Qcm9taXNlKHByb21pc2UpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHZhciByZXN1bHQgPSBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIHZhciBvblZhbHVlID0gZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIG9uRXJyb3IgPSBmdW5jdGlvbiAoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZXJyb3IoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIF9wcm9taXNlID0gcHJvbWlzZS50aGVuKG9uVmFsdWUsIG9uRXJyb3IpO1xuXG5cdCAgICAgIC8vIHByZXZlbnQgbGlicmFyaWVzIGxpa2UgJ1EnIG9yICd3aGVuJyBmcm9tIHN3YWxsb3dpbmcgZXhjZXB0aW9uc1xuXHQgICAgICBpZiAoX3Byb21pc2UgJiYgdHlwZW9mIF9wcm9taXNlLmRvbmUgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgICAgICBfcHJvbWlzZS5kb25lKCk7XG5cdCAgICAgIH1cblxuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pO1xuXG5cdCAgcmV0dXJuIHRvUHJvcGVydHkocmVzdWx0LCBudWxsKS5zZXROYW1lKCdmcm9tUHJvbWlzZScpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0R2xvZGFsUHJvbWlzZSgpIHtcblx0ICBpZiAodHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHJldHVybiBQcm9taXNlO1xuXHQgIH0gZWxzZSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzblxcJ3QgZGVmYXVsdCBQcm9taXNlLCB1c2Ugc2hpbSBvciBwYXJhbWV0ZXInKTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiB0b1Byb21pc2UgKG9icykge1xuXHQgIHZhciBQcm9taXNlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZ2V0R2xvZGFsUHJvbWlzZSgpIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgdmFyIGxhc3QgPSBudWxsO1xuXHQgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICBvYnMub25BbnkoZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQgJiYgbGFzdCAhPT0gbnVsbCkge1xuXHQgICAgICAgIChsYXN0LnR5cGUgPT09IFZBTFVFID8gcmVzb2x2ZSA6IHJlamVjdCkobGFzdC52YWx1ZSk7XG5cdCAgICAgICAgbGFzdCA9IG51bGw7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgbGFzdCA9IGV2ZW50O1xuXHQgICAgICB9XG5cdCAgICB9KTtcblx0ICB9KTtcblx0fVxuXG5cdHZhciBjb21tb25qc0dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDoge31cblxuXHRmdW5jdGlvbiBjcmVhdGVDb21tb25qc01vZHVsZShmbiwgbW9kdWxlKSB7XG5cdFx0cmV0dXJuIG1vZHVsZSA9IHsgZXhwb3J0czoge30gfSwgZm4obW9kdWxlLCBtb2R1bGUuZXhwb3J0cyksIG1vZHVsZS5leHBvcnRzO1xuXHR9XG5cblx0dmFyIHBvbnlmaWxsID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdFx0dmFsdWU6IHRydWVcblx0fSk7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IHN5bWJvbE9ic2VydmFibGVQb255ZmlsbDtcblx0ZnVuY3Rpb24gc3ltYm9sT2JzZXJ2YWJsZVBvbnlmaWxsKHJvb3QpIHtcblx0XHR2YXIgcmVzdWx0O1xuXHRcdHZhciBfU3ltYm9sID0gcm9vdC5TeW1ib2w7XG5cblx0XHRpZiAodHlwZW9mIF9TeW1ib2wgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdGlmIChfU3ltYm9sLm9ic2VydmFibGUpIHtcblx0XHRcdFx0cmVzdWx0ID0gX1N5bWJvbC5vYnNlcnZhYmxlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVzdWx0ID0gX1N5bWJvbCgnb2JzZXJ2YWJsZScpO1xuXHRcdFx0XHRfU3ltYm9sLm9ic2VydmFibGUgPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCA9ICdAQG9ic2VydmFibGUnO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH07XG5cdH0pO1xuXG5cdHZhciByZXF1aXJlJCQwJDEgPSAocG9ueWZpbGwgJiYgdHlwZW9mIHBvbnlmaWxsID09PSAnb2JqZWN0JyAmJiAnZGVmYXVsdCcgaW4gcG9ueWZpbGwgPyBwb255ZmlsbFsnZGVmYXVsdCddIDogcG9ueWZpbGwpO1xuXG5cdHZhciBpbmRleCQxID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdFx0dmFsdWU6IHRydWVcblx0fSk7XG5cblx0dmFyIF9wb255ZmlsbCA9IHJlcXVpcmUkJDAkMTtcblxuXHR2YXIgX3BvbnlmaWxsMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3BvbnlmaWxsKTtcblxuXHRmdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikge1xuXHRcdHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07XG5cdH1cblxuXHR2YXIgcm9vdCA9IHVuZGVmaW5lZDsgLyogZ2xvYmFsIHdpbmRvdyAqL1xuXG5cdGlmICh0eXBlb2YgY29tbW9uanNHbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0cm9vdCA9IGNvbW1vbmpzR2xvYmFsO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0cm9vdCA9IHdpbmRvdztcblx0fVxuXG5cdHZhciByZXN1bHQgPSAoMCwgX3BvbnlmaWxsMlsnZGVmYXVsdCddKShyb290KTtcblx0ZXhwb3J0c1snZGVmYXVsdCddID0gcmVzdWx0O1xuXHR9KTtcblxuXHR2YXIgcmVxdWlyZSQkMCA9IChpbmRleCQxICYmIHR5cGVvZiBpbmRleCQxID09PSAnb2JqZWN0JyAmJiAnZGVmYXVsdCcgaW4gaW5kZXgkMSA/IGluZGV4JDFbJ2RlZmF1bHQnXSA6IGluZGV4JDEpO1xuXG5cdHZhciBpbmRleCA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUpIHtcblx0bW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlJCQwO1xuXHR9KTtcblxuXHR2YXIgJCRvYnNlcnZhYmxlID0gKGluZGV4ICYmIHR5cGVvZiBpbmRleCA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIGluZGV4ID8gaW5kZXhbJ2RlZmF1bHQnXSA6IGluZGV4KTtcblxuXHRmdW5jdGlvbiBmcm9tRVNPYnNlcnZhYmxlKF9vYnNlcnZhYmxlKSB7XG5cdCAgdmFyIG9ic2VydmFibGUgPSBfb2JzZXJ2YWJsZVskJG9ic2VydmFibGVdID8gX29ic2VydmFibGVbJCRvYnNlcnZhYmxlXSgpIDogX29ic2VydmFibGU7XG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXHQgICAgdmFyIHVuc3ViID0gb2JzZXJ2YWJsZS5zdWJzY3JpYmUoe1xuXHQgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG5cdCAgICAgICAgZW1pdHRlci5lcnJvcihlcnJvcik7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSxcblx0ICAgICAgbmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHZhbHVlKTtcblx0ICAgICAgfSxcblx0ICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9KTtcblxuXHQgICAgaWYgKHVuc3ViLnVuc3Vic2NyaWJlKSB7XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgdW5zdWIudW5zdWJzY3JpYmUoKTtcblx0ICAgICAgfTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJldHVybiB1bnN1Yjtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tRVNPYnNlcnZhYmxlJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBFU09ic2VydmFibGUob2JzZXJ2YWJsZSkge1xuXHQgIHRoaXMuX29ic2VydmFibGUgPSBvYnNlcnZhYmxlLnRha2VFcnJvcnMoMSk7XG5cdH1cblxuXHRleHRlbmQoRVNPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXHQgIHN1YnNjcmliZTogZnVuY3Rpb24gKG9ic2VydmVyT3JPbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGUpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciBvYnNlcnZlciA9IHR5cGVvZiBvYnNlcnZlck9yT25OZXh0ID09PSAnZnVuY3Rpb24nID8geyBuZXh0OiBvYnNlcnZlck9yT25OZXh0LCBlcnJvcjogb25FcnJvciwgY29tcGxldGU6IG9uQ29tcGxldGUgfSA6IG9ic2VydmVyT3JPbk5leHQ7XG5cblx0ICAgIHZhciBmbiA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSAmJiBvYnNlcnZlci5uZXh0KSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIubmV4dChldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IgJiYgb2JzZXJ2ZXIuZXJyb3IpIHtcblx0ICAgICAgICBvYnNlcnZlci5lcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIG9ic2VydmVyLmNvbXBsZXRlKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICB0aGlzLl9vYnNlcnZhYmxlLm9uQW55KGZuKTtcblx0ICAgIHZhciBjbG9zZWQgPSBmYWxzZTtcblxuXHQgICAgdmFyIHN1YnNjcmlwdGlvbiA9IHtcblx0ICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICBjbG9zZWQgPSB0cnVlO1xuXHQgICAgICAgIF90aGlzLl9vYnNlcnZhYmxlLm9mZkFueShmbik7XG5cdCAgICAgIH0sXG5cdCAgICAgIGdldCBjbG9zZWQoKSB7XG5cdCAgICAgICAgcmV0dXJuIGNsb3NlZDtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICAgIHJldHVybiBzdWJzY3JpcHRpb247XG5cdCAgfVxuXHR9KTtcblxuXHQvLyBOZWVkIHRvIGFzc2lnbiBkaXJlY3RseSBiL2MgU3ltYm9scyBhcmVuJ3QgZW51bWVyYWJsZS5cblx0RVNPYnNlcnZhYmxlLnByb3RvdHlwZVskJG9ic2VydmFibGVdID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHRvRVNPYnNlcnZhYmxlKCkge1xuXHQgIHJldHVybiBuZXcgRVNPYnNlcnZhYmxlKHRoaXMpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IoZXJyb3JzKSB7XG5cdCAgdmFyIGxhdGVzdEVycm9yID0gdm9pZCAwO1xuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgZXJyb3JzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAoZXJyb3JzW2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgaWYgKGxhdGVzdEVycm9yID09PSB1bmRlZmluZWQgfHwgbGF0ZXN0RXJyb3IuaW5kZXggPCBlcnJvcnNbaV0uaW5kZXgpIHtcblx0ICAgICAgICBsYXRlc3RFcnJvciA9IGVycm9yc1tpXTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gbGF0ZXN0RXJyb3IuZXJyb3I7XG5cdH1cblxuXHRmdW5jdGlvbiBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9hY3RpdmVDb3VudCA9IGFjdGl2ZS5sZW5ndGg7XG5cdCAgdGhpcy5fc291cmNlcyA9IGNvbmNhdChhY3RpdmUsIHBhc3NpdmUpO1xuXHQgIHRoaXMuX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gc3ByZWFkKGNvbWJpbmF0b3IsIHRoaXMuX3NvdXJjZXMubGVuZ3RoKSA6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICByZXR1cm4geDtcblx0ICB9O1xuXHQgIHRoaXMuX2FsaXZlQ291bnQgPSAwO1xuXHQgIHRoaXMuX2xhdGVzdFZhbHVlcyA9IG5ldyBBcnJheSh0aGlzLl9zb3VyY2VzLmxlbmd0aCk7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbmV3IEFycmF5KHRoaXMuX3NvdXJjZXMubGVuZ3RoKTtcblx0ICBmaWxsQXJyYXkodGhpcy5fbGF0ZXN0VmFsdWVzLCBOT1RISU5HKTtcblx0ICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JJbmRleCA9IDA7XG5cblx0ICB0aGlzLl8kaGFuZGxlcnMgPSBbXTtcblxuXHQgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIChpKSB7XG5cdCAgICBfdGhpcy5fJGhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGksIGV2ZW50KTtcblx0ICAgIH0pO1xuXHQgIH07XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIF9sb29wKGkpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQ29tYmluZSwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ2NvbWJpbmUnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYWxpdmVDb3VudCA9IHRoaXMuX2FjdGl2ZUNvdW50O1xuXG5cdCAgICAvLyB3ZSBuZWVkIHRvIHN1c2NyaWJlIHRvIF9wYXNzaXZlXyBzb3VyY2VzIGJlZm9yZSBfYWN0aXZlX1xuXHQgICAgLy8gKHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzk4KVxuXHQgICAgZm9yICh2YXIgaSA9IHRoaXMuX2FjdGl2ZUNvdW50OyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgdGhpcy5fYWN0aXZlQ291bnQ7IF9pKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tfaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW19pXSk7XG5cdCAgICB9XG5cblx0ICAgIGlmICh0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSBmYWxzZTtcblx0ICAgICAgdGhpcy5fZW1pdElmRnVsbCgpO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbikge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBsZW5ndGggPSB0aGlzLl9zb3VyY2VzLmxlbmd0aCxcblx0ICAgICAgICBpID0gdm9pZCAwO1xuXHQgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub2ZmQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdElmRnVsbDogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGhhc0FsbFZhbHVlcyA9IHRydWU7XG5cdCAgICB2YXIgaGFzRXJyb3JzID0gZmFsc2U7XG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fbGF0ZXN0VmFsdWVzLmxlbmd0aDtcblx0ICAgIHZhciB2YWx1ZXNDb3B5ID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cdCAgICB2YXIgZXJyb3JzQ29weSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHZhbHVlc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RWYWx1ZXNbaV07XG5cdCAgICAgIGVycm9yc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RFcnJvcnNbaV07XG5cblx0ICAgICAgaWYgKHZhbHVlc0NvcHlbaV0gPT09IE5PVEhJTkcpIHtcblx0ICAgICAgICBoYXNBbGxWYWx1ZXMgPSBmYWxzZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChlcnJvcnNDb3B5W2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgICBoYXNFcnJvcnMgPSB0cnVlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIGlmIChoYXNBbGxWYWx1ZXMpIHtcblx0ICAgICAgdmFyIGNvbWJpbmF0b3IgPSB0aGlzLl9jb21iaW5hdG9yO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXNDb3B5KSk7XG5cdCAgICB9XG5cdCAgICBpZiAoaGFzRXJyb3JzKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihkZWZhdWx0RXJyb3JzQ29tYmluYXRvcihlcnJvcnNDb3B5KSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoaSwgZXZlbnQpIHtcblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFIHx8IGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0VmFsdWVzW2ldID0gZXZlbnQudmFsdWU7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0gdW5kZWZpbmVkO1xuXHQgICAgICB9XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdFZhbHVlc1tpXSA9IE5PVEhJTkc7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0ge1xuXHQgICAgICAgICAgaW5kZXg6IHRoaXMuX2xhdGVzdEVycm9ySW5kZXgrKyxcblx0ICAgICAgICAgIGVycm9yOiBldmVudC52YWx1ZVxuXHQgICAgICAgIH07XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0SWZGdWxsKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICAvLyBFTkRcblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICAgIGlmICh0aGlzLl9hbGl2ZUNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgICAgICB0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICAgICAgfVxuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXRlc3RWYWx1ZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbWJpbmUoYWN0aXZlKSB7XG5cdCAgdmFyIHBhc3NpdmUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBbXSA6IGFyZ3VtZW50c1sxXTtcblx0ICB2YXIgY29tYmluYXRvciA9IGFyZ3VtZW50c1syXTtcblxuXHQgIGlmICh0eXBlb2YgcGFzc2l2ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgY29tYmluYXRvciA9IHBhc3NpdmU7XG5cdCAgICBwYXNzaXZlID0gW107XG5cdCAgfVxuXHQgIHJldHVybiBhY3RpdmUubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcik7XG5cdH1cblxuXHR2YXIgT2JzZXJ2YWJsZSQxID0ge1xuXHQgIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gbmV2ZXIoKTtcblx0ICB9LFxuXG5cblx0ICAvLyBNb25vaWQgYmFzZWQgb24gbWVyZ2UoKSBzZWVtcyBtb3JlIHVzZWZ1bCB0aGFuIG9uZSBiYXNlZCBvbiBjb25jYXQoKS5cblx0ICBjb25jYXQ6IGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gYS5tZXJnZShiKTtcblx0ICB9LFxuXHQgIG9mOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIGNvbnN0YW50KHgpO1xuXHQgIH0sXG5cdCAgbWFwOiBmdW5jdGlvbiAoZm4sIG9icykge1xuXHQgICAgcmV0dXJuIG9icy5tYXAoZm4pO1xuXHQgIH0sXG5cdCAgYmltYXA6IGZ1bmN0aW9uIChmbkVyciwgZm5WYWwsIG9icykge1xuXHQgICAgcmV0dXJuIG9icy5tYXBFcnJvcnMoZm5FcnIpLm1hcChmblZhbCk7XG5cdCAgfSxcblxuXG5cdCAgLy8gVGhpcyBhcCBzdHJpY3RseSBzcGVha2luZyBpbmNvbXBhdGlibGUgd2l0aCBjaGFpbi4gSWYgd2UgZGVyaXZlIGFwIGZyb20gY2hhaW4gd2UgZ2V0XG5cdCAgLy8gZGlmZmVyZW50IChub3QgdmVyeSB1c2VmdWwpIGJlaGF2aW9yLiBCdXQgc3BlYyByZXF1aXJlcyB0aGF0IGlmIG1ldGhvZCBjYW4gYmUgZGVyaXZlZFxuXHQgIC8vIGl0IG11c3QgaGF2ZSB0aGUgc2FtZSBiZWhhdmlvciBhcyBoYW5kLXdyaXR0ZW4gbWV0aG9kLiBXZSBpbnRlbnRpb25hbGx5IHZpb2xhdGUgdGhlIHNwZWNcblx0ICAvLyBpbiBob3BlIHRoYXQgaXQgd29uJ3QgY2F1c2UgbWFueSB0cm91YmxlcyBpbiBwcmFjdGljZS4gQW5kIGluIHJldHVybiB3ZSBoYXZlIG1vcmUgdXNlZnVsIHR5cGUuXG5cdCAgYXA6IGZ1bmN0aW9uIChvYnNGbiwgb2JzVmFsKSB7XG5cdCAgICByZXR1cm4gY29tYmluZShbb2JzRm4sIG9ic1ZhbF0sIGZ1bmN0aW9uIChmbiwgdmFsKSB7XG5cdCAgICAgIHJldHVybiBmbih2YWwpO1xuXHQgICAgfSk7XG5cdCAgfSxcblx0ICBjaGFpbjogZnVuY3Rpb24gKGZuLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMuZmxhdE1hcChmbik7XG5cdCAgfVxuXHR9O1xuXG5cblxuXHR2YXIgc3RhdGljTGFuZCA9IE9iamVjdC5mcmVlemUoe1xuXHQgIE9ic2VydmFibGU6IE9ic2VydmFibGUkMVxuXHR9KTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHgpKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNyA9IGNyZWF0ZVN0cmVhbSgnbWFwJywgbWl4aW4pO1xuXHR2YXIgUCQzID0gY3JlYXRlUHJvcGVydHkoJ21hcCcsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIG1hcCQxKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkNywgUCQzKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDggPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlcicsIG1peGluJDEpO1xuXHR2YXIgUCQ0ID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlcicsIG1peGluJDEpO1xuXG5cdHZhciBpZCQxID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmaWx0ZXIob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkMSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDgsIFAkNCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ5ID0gY3JlYXRlU3RyZWFtKCd0YWtlJywgbWl4aW4kMik7XG5cdHZhciBQJDUgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZScsIG1peGluJDIpO1xuXG5cdGZ1bmN0aW9uIHRha2Uob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkOSwgUCQ1KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxMCA9IGNyZWF0ZVN0cmVhbSgndGFrZUVycm9ycycsIG1peGluJDMpO1xuXHR2YXIgUCQ2ID0gY3JlYXRlUHJvcGVydHkoJ3Rha2VFcnJvcnMnLCBtaXhpbiQzKTtcblxuXHRmdW5jdGlvbiB0YWtlRXJyb3JzKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDEwLCBQJDYpKShvYnMsIHsgbjogbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ0ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDExID0gY3JlYXRlU3RyZWFtKCd0YWtlV2hpbGUnLCBtaXhpbiQ0KTtcblx0dmFyIFAkNyA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlV2hpbGUnLCBtaXhpbiQ0KTtcblxuXHR2YXIgaWQkMiA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gdGFrZVdoaWxlKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDIgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMSwgUCQ3KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSBOT1RISU5HO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2xhc3RWYWx1ZSA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSB4O1xuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RWYWx1ZSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fbGFzdFZhbHVlKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTIgPSBjcmVhdGVTdHJlYW0oJ2xhc3QnLCBtaXhpbiQ1KTtcblx0dmFyIFAkOCA9IGNyZWF0ZVByb3BlcnR5KCdsYXN0JywgbWl4aW4kNSk7XG5cblx0ZnVuY3Rpb24gbGFzdChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMiwgUCQ4KSkob2JzKTtcblx0fVxuXG5cdHZhciBtaXhpbiQ2ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIG4gPSBfcmVmLm47XG5cblx0ICAgIHRoaXMuX24gPSBNYXRoLm1heCgwLCBuKTtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX24tLTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTMgPSBjcmVhdGVTdHJlYW0oJ3NraXAnLCBtaXhpbiQ2KTtcblx0dmFyIFAkOSA9IGNyZWF0ZVByb3BlcnR5KCdza2lwJywgbWl4aW4kNik7XG5cblx0ZnVuY3Rpb24gc2tpcChvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMywgUCQ5KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fZm4gIT09IG51bGwgJiYgIWZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9mbiA9PT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE0ID0gY3JlYXRlU3RyZWFtKCdza2lwV2hpbGUnLCBtaXhpbiQ3KTtcblx0dmFyIFAkMTAgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcFdoaWxlJywgbWl4aW4kNyk7XG5cblx0dmFyIGlkJDMgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNraXBXaGlsZShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQzIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTQsIFAkMTApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDggPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fcHJldiA9IE5PVEhJTkc7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgICAgdGhpcy5fcHJldiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICh0aGlzLl9wcmV2ID09PSBOT1RISU5HIHx8ICFmbih0aGlzLl9wcmV2LCB4KSkge1xuXHQgICAgICB0aGlzLl9wcmV2ID0geDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNSA9IGNyZWF0ZVN0cmVhbSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbiQ4KTtcblx0dmFyIFAkMTEgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbiQ4KTtcblxuXHR2YXIgZXEgPSBmdW5jdGlvbiAoYSwgYikge1xuXHQgIHJldHVybiBhID09PSBiO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNraXBEdXBsaWNhdGVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGVxIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTUsIFAkMTEpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIHNlZWQgPSBfcmVmLnNlZWQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9wcmV2ID0gc2VlZDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9wcmV2ID0gbnVsbDtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9wcmV2ICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fcHJldiwgeCkpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fcHJldiA9IHg7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE2ID0gY3JlYXRlU3RyZWFtKCdkaWZmJywgbWl4aW4kOSk7XG5cdHZhciBQJDEyID0gY3JlYXRlUHJvcGVydHkoJ2RpZmYnLCBtaXhpbiQ5KTtcblxuXHRmdW5jdGlvbiBkZWZhdWx0Rm4oYSwgYikge1xuXHQgIHJldHVybiBbYSwgYl07XG5cdH1cblxuXHRmdW5jdGlvbiBkaWZmKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxNiwgUCQxMikpKG9icywgeyBmbjogZm4gfHwgZGVmYXVsdEZuLCBzZWVkOiBzZWVkIH0pO1xuXHR9XG5cblx0dmFyIFAkMTMgPSBjcmVhdGVQcm9wZXJ0eSgnc2NhbicsIHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgc2VlZCA9IF9yZWYuc2VlZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3NlZWQgPSBzZWVkO1xuXHQgICAgaWYgKHNlZWQgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHNlZWQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX3NlZWQgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ID09PSBudWxsIHx8IHRoaXMuX2N1cnJlbnRFdmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fc2VlZCA9PT0gTk9USElORyA/IHggOiBmbih0aGlzLl9zZWVkLCB4KSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fY3VycmVudEV2ZW50LnZhbHVlLCB4KSk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBzY2FuKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IFAkMTMob2JzLCB7IGZuOiBmbiwgc2VlZDogc2VlZCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxMCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgeHMgPSBmbih4KTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHhzW2ldKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTcgPSBjcmVhdGVTdHJlYW0oJ2ZsYXR0ZW4nLCBtaXhpbiQxMCk7XG5cblx0dmFyIGlkJDQgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGZsYXR0ZW4ob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkNCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgUyQxNyhvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIEVORF9NQVJLRVIgPSB7fTtcblxuXHR2YXIgbWl4aW4kMTEgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fJHNoaWZ0QnVmZiA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdmFyIHZhbHVlID0gX3RoaXMuX2J1ZmYuc2hpZnQoKTtcblx0ICAgICAgaWYgKHZhbHVlID09PSBFTkRfTUFSS0VSKSB7XG5cdCAgICAgICAgX3RoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBfdGhpcy5fZW1pdFZhbHVlKHZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICAgIHRoaXMuXyRzaGlmdEJ1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKEVORF9NQVJLRVIpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxOCA9IGNyZWF0ZVN0cmVhbSgnZGVsYXknLCBtaXhpbiQxMSk7XG5cdHZhciBQJDE0ID0gY3JlYXRlUHJvcGVydHkoJ2RlbGF5JywgbWl4aW4kMTEpO1xuXG5cdGZ1bmN0aW9uIGRlbGF5KG9icywgd2FpdCkge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE4LCBQJDE0KSkob2JzLCB7IHdhaXQ6IHdhaXQgfSk7XG5cdH1cblxuXHR2YXIgbm93ID0gRGF0ZS5ub3cgPyBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIERhdGUubm93KCk7XG5cdH0gOiBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHR9O1xuXG5cdHZhciBtaXhpbiQxMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGxlYWRpbmcgPSBfcmVmLmxlYWRpbmc7XG5cdCAgICB2YXIgdHJhaWxpbmcgPSBfcmVmLnRyYWlsaW5nO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9sZWFkaW5nID0gbGVhZGluZztcblx0ICAgIHRoaXMuX3RyYWlsaW5nID0gdHJhaWxpbmc7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gMDtcblx0ICAgIHRoaXMuXyR0cmFpbGluZ0NhbGwgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fdHJhaWxpbmdDYWxsKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJHRyYWlsaW5nQ2FsbCA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB2YXIgY3VyVGltZSA9IG5vdygpO1xuXHQgICAgICBpZiAodGhpcy5fbGFzdENhbGxUaW1lID09PSAwICYmICF0aGlzLl9sZWFkaW5nKSB7XG5cdCAgICAgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gY3VyVGltZTtcblx0ICAgICAgfVxuXHQgICAgICB2YXIgcmVtYWluaW5nID0gdGhpcy5fd2FpdCAtIChjdXJUaW1lIC0gdGhpcy5fbGFzdENhbGxUaW1lKTtcblx0ICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fY2FuY2VsVHJhaWxpbmcoKTtcblx0ICAgICAgICB0aGlzLl9sYXN0Q2FsbFRpbWUgPSBjdXJUaW1lO1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl90cmFpbGluZykge1xuXHQgICAgICAgIHRoaXMuX2NhbmNlbFRyYWlsaW5nKCk7XG5cdCAgICAgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IHg7XG5cdCAgICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kdHJhaWxpbmdDYWxsLCByZW1haW5pbmcpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkKSB7XG5cdCAgICAgICAgdGhpcy5fZW5kTGF0ZXIgPSB0cnVlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NhbmNlbFRyYWlsaW5nOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fdGltZW91dElkICE9PSBudWxsKSB7XG5cdCAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0SWQpO1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3RyYWlsaW5nQ2FsbDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3RyYWlsaW5nVmFsdWUpO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gIXRoaXMuX2xlYWRpbmcgPyAwIDogbm93KCk7XG5cdCAgICBpZiAodGhpcy5fZW5kTGF0ZXIpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxOSA9IGNyZWF0ZVN0cmVhbSgndGhyb3R0bGUnLCBtaXhpbiQxMik7XG5cdHZhciBQJDE1ID0gY3JlYXRlUHJvcGVydHkoJ3Rocm90dGxlJywgbWl4aW4kMTIpO1xuXG5cdGZ1bmN0aW9uIHRocm90dGxlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGxlYWRpbmcgPSBfcmVmMi5sZWFkaW5nO1xuXHQgIHZhciBsZWFkaW5nID0gX3JlZjIkbGVhZGluZyA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGxlYWRpbmc7XG5cdCAgdmFyIF9yZWYyJHRyYWlsaW5nID0gX3JlZjIudHJhaWxpbmc7XG5cdCAgdmFyIHRyYWlsaW5nID0gX3JlZjIkdHJhaWxpbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiR0cmFpbGluZztcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE5LCBQJDE1KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGxlYWRpbmc6IGxlYWRpbmcsIHRyYWlsaW5nOiB0cmFpbGluZyB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxMyA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGltbWVkaWF0ZSA9IF9yZWYuaW1tZWRpYXRlO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9pbW1lZGlhdGUgPSBpbW1lZGlhdGU7XG5cdCAgICB0aGlzLl9sYXN0QXR0ZW1wdCA9IDA7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXJWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2xhdGVyKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2xhc3RBdHRlbXB0ID0gbm93KCk7XG5cdCAgICAgIGlmICh0aGlzLl9pbW1lZGlhdGUgJiYgIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJGxhdGVyLCB0aGlzLl93YWl0KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSB4O1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkICYmICF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9lbmRMYXRlciA9IHRydWU7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfbGF0ZXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBsYXN0ID0gbm93KCkgLSB0aGlzLl9sYXN0QXR0ZW1wdDtcblx0ICAgIGlmIChsYXN0IDwgdGhpcy5fd2FpdCAmJiBsYXN0ID49IDApIHtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kbGF0ZXIsIHRoaXMuX3dhaXQgLSBsYXN0KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICAgIGlmICghdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2xhdGVyVmFsdWUpO1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICh0aGlzLl9lbmRMYXRlcikge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyMCA9IGNyZWF0ZVN0cmVhbSgnZGVib3VuY2UnLCBtaXhpbiQxMyk7XG5cdHZhciBQJDE2ID0gY3JlYXRlUHJvcGVydHkoJ2RlYm91bmNlJywgbWl4aW4kMTMpO1xuXG5cdGZ1bmN0aW9uIGRlYm91bmNlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGltbWVkaWF0ZSA9IF9yZWYyLmltbWVkaWF0ZTtcblx0ICB2YXIgaW1tZWRpYXRlID0gX3JlZjIkaW1tZWRpYXRlID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IF9yZWYyJGltbWVkaWF0ZTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDIwLCBQJDE2KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGltbWVkaWF0ZTogaW1tZWRpYXRlIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDE0ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcihmbih4KSk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDIxID0gY3JlYXRlU3RyZWFtKCdtYXBFcnJvcnMnLCBtaXhpbiQxNCk7XG5cdHZhciBQJDE3ID0gY3JlYXRlUHJvcGVydHkoJ21hcEVycm9ycycsIG1peGluJDE0KTtcblxuXHR2YXIgaWQkNSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gbWFwRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDUgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMSwgUCQxNykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTUgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKGZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjIgPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlckVycm9ycycsIG1peGluJDE1KTtcblx0dmFyIFAkMTggPSBjcmVhdGVQcm9wZXJ0eSgnZmlsdGVyRXJyb3JzJywgbWl4aW4kMTUpO1xuXG5cdHZhciBpZCQ2ID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmaWx0ZXJFcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkNiA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDIyLCBQJDE4KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxNiA9IHtcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICgpIHt9XG5cdH07XG5cblx0dmFyIFMkMjMgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZVZhbHVlcycsIG1peGluJDE2KTtcblx0dmFyIFAkMTkgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlVmFsdWVzJywgbWl4aW4kMTYpO1xuXG5cdGZ1bmN0aW9uIGlnbm9yZVZhbHVlcyhvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMywgUCQxOSkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTcgPSB7XG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDI0ID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVFcnJvcnMnLCBtaXhpbiQxNyk7XG5cdHZhciBQJDIwID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZUVycm9ycycsIG1peGluJDE3KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVFcnJvcnMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjQsIFAkMjApKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE4ID0ge1xuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHt9XG5cdH07XG5cblx0dmFyIFMkMjUgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZUVuZCcsIG1peGluJDE4KTtcblx0dmFyIFAkMjEgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlRW5kJywgbWl4aW4kMTgpO1xuXG5cdGZ1bmN0aW9uIGlnbm9yZUVuZChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNSwgUCQyMSkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKCkpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyNiA9IGNyZWF0ZVN0cmVhbSgnYmVmb3JlRW5kJywgbWl4aW4kMTkpO1xuXHR2YXIgUCQyMiA9IGNyZWF0ZVByb3BlcnR5KCdiZWZvcmVFbmQnLCBtaXhpbiQxOSk7XG5cblx0ZnVuY3Rpb24gYmVmb3JlRW5kKG9icywgZm4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNiwgUCQyMikpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbWluID0gX3JlZi5taW47XG5cdCAgICB2YXIgbWF4ID0gX3JlZi5tYXg7XG5cblx0ICAgIHRoaXMuX21heCA9IG1heDtcblx0ICAgIHRoaXMuX21pbiA9IG1pbjtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBzbGlkZSh0aGlzLl9idWZmLCB4LCB0aGlzLl9tYXgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX21pbikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI3ID0gY3JlYXRlU3RyZWFtKCdzbGlkaW5nV2luZG93JywgbWl4aW4kMjApO1xuXHR2YXIgUCQyMyA9IGNyZWF0ZVByb3BlcnR5KCdzbGlkaW5nV2luZG93JywgbWl4aW4kMjApO1xuXG5cdGZ1bmN0aW9uIHNsaWRpbmdXaW5kb3cob2JzLCBtYXgpIHtcblx0ICB2YXIgbWluID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8gMCA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDI3LCBQJDIzKSkob2JzLCB7IG1pbjogbWluLCBtYXg6IG1heCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKCFmbih4KSkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjggPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldoaWxlJywgbWl4aW4kMjEpO1xuXHR2YXIgUCQyNCA9IGNyZWF0ZVByb3BlcnR5KCdidWZmZXJXaGlsZScsIG1peGluJDIxKTtcblxuXHR2YXIgaWQkNyA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gYnVmZmVyV2hpbGUob2JzLCBmbikge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyOCwgUCQyNCkpKG9icywgeyBmbjogZm4gfHwgaWQkNywgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyMiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fY291bnQgPSBjb3VudDtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9jb3VudCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjkgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhDb3VudCcsIG1peGluJDIyKTtcblx0dmFyIFAkMjUgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aENvdW50JywgbWl4aW4kMjIpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlJDEob2JzLCBjb3VudCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyOSwgUCQyNSkpKG9icywgeyBjb3VudDogY291bnQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9jb3VudCA9IGNvdW50O1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fZmx1c2goKTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fY291bnQpIHtcblx0ICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9LFxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTsgLy8gY29waWVkIGZyb20gcGF0dGVybnMvb25lLXNvdXJjZVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzAgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhUaW1lT3JDb3VudCcsIG1peGluJDIzKTtcblx0dmFyIFAkMjYgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aFRpbWVPckNvdW50JywgbWl4aW4kMjMpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldpdGhUaW1lT3JDb3VudChvYnMsIHdhaXQsIGNvdW50KSB7XG5cdCAgdmFyIF9yZWYyID0gYXJndW1lbnRzLmxlbmd0aCA8PSAzIHx8IGFyZ3VtZW50c1szXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbM107XG5cblx0ICB2YXIgX3JlZjIkZmx1c2hPbkVuZCA9IF9yZWYyLmZsdXNoT25FbmQ7XG5cdCAgdmFyIGZsdXNoT25FbmQgPSBfcmVmMiRmbHVzaE9uRW5kID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkZmx1c2hPbkVuZDtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDMwLCBQJDI2KSkob2JzLCB7IHdhaXQ6IHdhaXQsIGNvdW50OiBjb3VudCwgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHhmb3JtRm9yT2JzKG9icykge1xuXHQgIHJldHVybiB7XG5cdCAgICAnQEB0cmFuc2R1Y2VyL3N0ZXAnOiBmdW5jdGlvbiAocmVzLCBpbnB1dCkge1xuXHQgICAgICBvYnMuX2VtaXRWYWx1ZShpbnB1dCk7XG5cdCAgICAgIHJldHVybiBudWxsO1xuXHQgICAgfSxcblx0ICAgICdAQHRyYW5zZHVjZXIvcmVzdWx0JzogZnVuY3Rpb24gKCkge1xuXHQgICAgICBvYnMuX2VtaXRFbmQoKTtcblx0ICAgICAgcmV0dXJuIG51bGw7XG5cdCAgICB9XG5cdCAgfTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB0cmFuc2R1Y2VyID0gX3JlZi50cmFuc2R1Y2VyO1xuXG5cdCAgICB0aGlzLl94Zm9ybSA9IHRyYW5zZHVjZXIoeGZvcm1Gb3JPYnModGhpcykpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hmb3JtID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3N0ZXAnXShudWxsLCB4KSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3Jlc3VsdCddKG51bGwpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9yZXN1bHQnXShudWxsKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzEgPSBjcmVhdGVTdHJlYW0oJ3RyYW5zZHVjZScsIG1peGluJDI0KTtcblx0dmFyIFAkMjcgPSBjcmVhdGVQcm9wZXJ0eSgndHJhbnNkdWNlJywgbWl4aW4kMjQpO1xuXG5cdGZ1bmN0aW9uIHRyYW5zZHVjZShvYnMsIHRyYW5zZHVjZXIpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMSwgUCQyNykpKG9icywgeyB0cmFuc2R1Y2VyOiB0cmFuc2R1Y2VyIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDI1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5faGFuZGxlciA9IGZuO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IGVtaXR0ZXIodGhpcyk7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5faGFuZGxlciA9IG51bGw7XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgdGhpcy5faGFuZGxlcih0aGlzLl9lbWl0dGVyLCBldmVudCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMyID0gY3JlYXRlU3RyZWFtKCd3aXRoSGFuZGxlcicsIG1peGluJDI1KTtcblx0dmFyIFAkMjggPSBjcmVhdGVQcm9wZXJ0eSgnd2l0aEhhbmRsZXInLCBtaXhpbiQyNSk7XG5cblx0ZnVuY3Rpb24gd2l0aEhhbmRsZXIob2JzLCBmbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDMyLCBQJDI4KSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcblx0ICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcblx0fTtcblxuXHRmdW5jdGlvbiBaaXAoc291cmNlcywgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuXHQgIHRoaXMuX2J1ZmZlcnMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IGNsb25lQXJyYXkoc291cmNlKSA6IFtdO1xuXHQgIH0pO1xuXHQgIHRoaXMuX3NvdXJjZXMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IG5ldmVyKCkgOiBzb3VyY2U7XG5cdCAgfSk7XG5cblx0ICB0aGlzLl9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IHNwcmVhZChjb21iaW5hdG9yLCB0aGlzLl9zb3VyY2VzLmxlbmd0aCkgOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdCAgfTtcblx0ICB0aGlzLl9hbGl2ZUNvdW50ID0gMDtcblxuXHQgIHRoaXMuXyRoYW5kbGVycyA9IFtdO1xuXG5cdCAgdmFyIF9sb29wID0gZnVuY3Rpb24gKGkpIHtcblx0ICAgIF90aGlzLl8kaGFuZGxlcnMucHVzaChmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoaSwgZXZlbnQpO1xuXHQgICAgfSk7XG5cdCAgfTtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgX2xvb3AoaSk7XG5cdCAgfVxuXHR9XG5cblx0aW5oZXJpdChaaXAsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICd6aXAnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXG5cdCAgICAvLyBpZiBhbGwgc291cmNlcyBhcmUgYXJyYXlzXG5cdCAgICB3aGlsZSAodGhpcy5faXNGdWxsKCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgfVxuXG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fc291cmNlcy5sZW5ndGg7XG5cdCAgICB0aGlzLl9hbGl2ZUNvdW50ID0gbGVuZ3RoO1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGggJiYgdGhpcy5fYWN0aXZlOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vZmZBbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KHRoaXMuX2J1ZmZlcnMubGVuZ3RoKTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB2YWx1ZXNbaV0gPSB0aGlzLl9idWZmZXJzW2ldLnNoaWZ0KCk7XG5cdCAgICB9XG5cdCAgICB2YXIgY29tYmluYXRvciA9IHRoaXMuX2NvbWJpbmF0b3I7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXMpKTtcblx0ICB9LFxuXHQgIF9pc0Z1bGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICBpZiAodGhpcy5fYnVmZmVyc1tpXS5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICByZXR1cm4gZmFsc2U7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0cnVlO1xuXHQgIH0sXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGksIGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fYnVmZmVyc1tpXS5wdXNoKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgaWYgKHRoaXMuX2lzRnVsbCgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICBpZiAodGhpcy5fYWxpdmVDb3VudCA9PT0gMCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmZXJzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHppcChvYnNlcnZhYmxlcywgY29tYmluYXRvciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IFppcChvYnNlcnZhYmxlcywgY29tYmluYXRvcik7XG5cdH1cblxuXHR2YXIgaWQkOCA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gQWJzdHJhY3RQb29sKCkge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgdmFyIF9yZWYkcXVldWVMaW0gPSBfcmVmLnF1ZXVlTGltO1xuXHQgIHZhciBxdWV1ZUxpbSA9IF9yZWYkcXVldWVMaW0gPT09IHVuZGVmaW5lZCA/IDAgOiBfcmVmJHF1ZXVlTGltO1xuXHQgIHZhciBfcmVmJGNvbmN1ckxpbSA9IF9yZWYuY29uY3VyTGltO1xuXHQgIHZhciBjb25jdXJMaW0gPSBfcmVmJGNvbmN1ckxpbSA9PT0gdW5kZWZpbmVkID8gLTEgOiBfcmVmJGNvbmN1ckxpbTtcblx0ICB2YXIgX3JlZiRkcm9wID0gX3JlZi5kcm9wO1xuXHQgIHZhciBkcm9wID0gX3JlZiRkcm9wID09PSB1bmRlZmluZWQgPyAnbmV3JyA6IF9yZWYkZHJvcDtcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXG5cdCAgdGhpcy5fcXVldWVMaW0gPSBxdWV1ZUxpbSA8IDAgPyAtMSA6IHF1ZXVlTGltO1xuXHQgIHRoaXMuX2NvbmN1ckxpbSA9IGNvbmN1ckxpbSA8IDAgPyAtMSA6IGNvbmN1ckxpbTtcblx0ICB0aGlzLl9kcm9wID0gZHJvcDtcblx0ICB0aGlzLl9xdWV1ZSA9IFtdO1xuXHQgIHRoaXMuX2N1clNvdXJjZXMgPSBbXTtcblx0ICB0aGlzLl8kaGFuZGxlU3ViQW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVN1YkFueShldmVudCk7XG5cdCAgfTtcblx0ICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBbXTtcblx0ICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXG5cdCAgaWYgKHRoaXMuX2NvbmN1ckxpbSA9PT0gMCkge1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQWJzdHJhY3RQb29sLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnYWJzdHJhY3RQb29sJyxcblxuXHQgIF9hZGQ6IGZ1bmN0aW9uIChvYmosIHRvT2JzIC8qIEZ1bmN0aW9uIHwgZmFsc2V5ICovKSB7XG5cdCAgICB0b09icyA9IHRvT2JzIHx8IGlkJDg7XG5cdCAgICBpZiAodGhpcy5fY29uY3VyTGltID09PSAtMSB8fCB0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA8IHRoaXMuX2NvbmN1ckxpbSkge1xuXHQgICAgICB0aGlzLl9hZGRUb0N1cih0b09icyhvYmopKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGlmICh0aGlzLl9xdWV1ZUxpbSA9PT0gLTEgfHwgdGhpcy5fcXVldWUubGVuZ3RoIDwgdGhpcy5fcXVldWVMaW0pIHtcblx0ICAgICAgICB0aGlzLl9hZGRUb1F1ZXVlKHRvT2JzKG9iaikpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX2Ryb3AgPT09ICdvbGQnKSB7XG5cdCAgICAgICAgdGhpcy5fcmVtb3ZlT2xkZXN0KCk7XG5cdCAgICAgICAgdGhpcy5fYWRkKG9iaiwgdG9PYnMpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfYWRkQWxsOiBmdW5jdGlvbiAob2Jzcykge1xuXHQgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cblx0ICAgIGZvckVhY2gob2JzcywgZnVuY3Rpb24gKG9icykge1xuXHQgICAgICByZXR1cm4gX3RoaXMyLl9hZGQob2JzKTtcblx0ICAgIH0pO1xuXHQgIH0sXG5cdCAgX3JlbW92ZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgaWYgKHRoaXMuX3JlbW92ZUN1cihvYnMpID09PSAtMSkge1xuXHQgICAgICB0aGlzLl9yZW1vdmVRdWV1ZShvYnMpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2FkZFRvUXVldWU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX3F1ZXVlID0gY29uY2F0KHRoaXMuX3F1ZXVlLCBbb2JzXSk7XG5cdCAgfSxcblx0ICBfYWRkVG9DdXI6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblxuXHQgICAgICAvLyBIQUNLOlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBXZSBoYXZlIHR3byBvcHRpbWl6YXRpb25zIGZvciBjYXNlcyB3aGVuIGBvYnNgIGlzIGVuZGVkLiBXZSBkb24ndCB3YW50XG5cdCAgICAgIC8vIHRvIGFkZCBzdWNoIG9ic2VydmFibGUgdG8gdGhlIGxpc3QsIGJ1dCBvbmx5IHdhbnQgdG8gZW1pdCBldmVudHNcblx0ICAgICAgLy8gZnJvbSBpdCAoaWYgaXQgaGFzIHNvbWUpLlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBJbnN0ZWFkIG9mIHRoaXMgaGFja3MsIHdlIGNvdWxkIGp1c3QgZGlkIGZvbGxvd2luZyxcblx0ICAgICAgLy8gYnV0IGl0IHdvdWxkIGJlIDUtOCB0aW1lcyBzbG93ZXI6XG5cdCAgICAgIC8vXG5cdCAgICAgIC8vICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgICAgLy8gICAgIHRoaXMuX3N1YnNjcmliZShvYnMpO1xuXHQgICAgICAvL1xuXG5cdCAgICAgIC8vICMxXG5cdCAgICAgIC8vIFRoaXMgb25lIGZvciBjYXNlcyB3aGVuIGBvYnNgIGFscmVhZHkgZW5kZWRcblx0ICAgICAgLy8gZS5nLiwgS2VmaXIuY29uc3RhbnQoKSBvciBLZWZpci5uZXZlcigpXG5cdCAgICAgIGlmICghb2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIGlmIChvYnMuX2N1cnJlbnRFdmVudCkge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdChvYnMuX2N1cnJlbnRFdmVudC50eXBlLCBvYnMuX2N1cnJlbnRFdmVudC52YWx1ZSk7XG5cdCAgICAgICAgfVxuXHQgICAgICAgIHJldHVybjtcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vICMyXG5cdCAgICAgIC8vIFRoaXMgb25lIGlzIGZvciBjYXNlcyB3aGVuIGBvYnNgIGdvaW5nIHRvIGVuZCBzeW5jaHJvbm91c2x5IG9uXG5cdCAgICAgIC8vIGZpcnN0IHN1YnNjcmliZXIgZS5nLiwgS2VmaXIuc3RyZWFtKGVtID0+IHtlbS5lbWl0KDEpOyBlbS5lbmQoKX0pXG5cdCAgICAgIHRoaXMuX2N1cnJlbnRseUFkZGluZyA9IG9icztcblx0ICAgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXHQgICAgICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXHQgICAgICBpZiAob2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2N1clNvdXJjZXMgPSBjb25jYXQodGhpcy5fY3VyU291cmNlcywgW29ic10pO1xuXHQgICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9zdWJUb0VuZDogZnVuY3Rpb24gKG9icykge1xuXHQgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cblx0ICAgIHZhciBvbkVuZCA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzMy5fcmVtb3ZlQ3VyKG9icyk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fJGVuZEhhbmRsZXJzLnB1c2goeyBvYnM6IG9icywgaGFuZGxlcjogb25FbmQgfSk7XG5cdCAgICBvYnMub25FbmQob25FbmQpO1xuXHQgIH0sXG5cdCAgX3N1YnNjcmliZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXG5cdCAgICAvLyBpdCBjYW4gYmVjb21lIGluYWN0aXZlIGluIHJlc3BvbmNlIG9mIHN1YnNjcmliaW5nIHRvIGBvYnMub25BbnlgIGFib3ZlXG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIG9icy5vZmZBbnkodGhpcy5fJGhhbmRsZVN1YkFueSk7XG5cblx0ICAgIHZhciBvbkVuZEkgPSBmaW5kQnlQcmVkKHRoaXMuXyRlbmRIYW5kbGVycywgZnVuY3Rpb24gKG9iaikge1xuXHQgICAgICByZXR1cm4gb2JqLm9icyA9PT0gb2JzO1xuXHQgICAgfSk7XG5cdCAgICBpZiAob25FbmRJICE9PSAtMSkge1xuXHQgICAgICBvYnMub2ZmRW5kKHRoaXMuXyRlbmRIYW5kbGVyc1tvbkVuZEldLmhhbmRsZXIpO1xuXHQgICAgICB0aGlzLl8kZW5kSGFuZGxlcnMuc3BsaWNlKG9uRW5kSSwgMSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU3ViQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3JlbW92ZVF1ZXVlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kKHRoaXMuX3F1ZXVlLCBvYnMpO1xuXHQgICAgdGhpcy5fcXVldWUgPSByZW1vdmUodGhpcy5fcXVldWUsIGluZGV4KTtcblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXHQgIF9yZW1vdmVDdXI6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUob2JzKTtcblx0ICAgIH1cblx0ICAgIHZhciBpbmRleCA9IGZpbmQodGhpcy5fY3VyU291cmNlcywgb2JzKTtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSByZW1vdmUodGhpcy5fY3VyU291cmNlcywgaW5kZXgpO1xuXHQgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuXHQgICAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fcHVsbFF1ZXVlKCk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyU291cmNlcy5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9vbkVtcHR5KCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXHQgIF9yZW1vdmVPbGRlc3Q6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3JlbW92ZUN1cih0aGlzLl9jdXJTb3VyY2VzWzBdKTtcblx0ICB9LFxuXHQgIF9wdWxsUXVldWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9xdWV1ZS5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fcXVldWUgPSBjbG9uZUFycmF5KHRoaXMuX3F1ZXVlKTtcblx0ICAgICAgdGhpcy5fYWRkVG9DdXIodGhpcy5fcXVldWUuc2hpZnQoKSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc291cmNlcyA9IHRoaXMuX2N1clNvdXJjZXM7IGkgPCBzb3VyY2VzLmxlbmd0aCAmJiB0aGlzLl9hY3RpdmU7IGkrKykge1xuXHQgICAgICB0aGlzLl9zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwLCBzb3VyY2VzID0gdGhpcy5fY3VyU291cmNlczsgaSA8IHNvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudGx5QWRkaW5nICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKHRoaXMuX2N1cnJlbnRseUFkZGluZyk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaXNFbXB0eTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoID09PSAwO1xuXHQgIH0sXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3F1ZXVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZVN1YkFueSA9IG51bGw7XG5cdCAgICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gTWVyZ2Uoc291cmNlcykge1xuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2FkZEFsbChzb3VyY2VzKTtcblx0ICB0aGlzLl9pbml0aWFsaXNlZCA9IHRydWU7XG5cdH1cblxuXHRpbmhlcml0KE1lcmdlLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9uYW1lOiAnbWVyZ2UnLFxuXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9pbml0aWFsaXNlZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBtZXJnZShvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IE1lcmdlKG9ic2VydmFibGVzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIFMkMzMoZ2VuZXJhdG9yKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2dlbmVyYXRvciA9IGdlbmVyYXRvcjtcblx0ICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgIHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cdCAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KFMkMzMsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdyZXBlYXQnLFxuXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2dldFNvdXJjZSgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdChldmVudC50eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZ2V0U291cmNlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2luTG9vcCkge1xuXHQgICAgICB0aGlzLl9pbkxvb3AgPSB0cnVlO1xuXHQgICAgICB2YXIgZ2VuZXJhdG9yID0gdGhpcy5fZ2VuZXJhdG9yO1xuXHQgICAgICB3aGlsZSAodGhpcy5fc291cmNlID09PSBudWxsICYmIHRoaXMuX2FsaXZlICYmIHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3NvdXJjZSA9IGdlbmVyYXRvcih0aGlzLl9pdGVyYXRpb24rKyk7XG5cdCAgICAgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9nZXRTb3VyY2UoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZ2VuZXJhdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHJlcGVhdCAoZ2VuZXJhdG9yKSB7XG5cdCAgcmV0dXJuIG5ldyBTJDMzKGdlbmVyYXRvcik7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25jYXQkMShvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiByZXBlYXQoZnVuY3Rpb24gKGluZGV4KSB7XG5cdCAgICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID4gaW5kZXggPyBvYnNlcnZhYmxlc1tpbmRleF0gOiBmYWxzZTtcblx0ICB9KS5zZXROYW1lKCdjb25jYXQnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIFBvb2woKSB7XG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFBvb2wsIEFic3RyYWN0UG9vbCwge1xuXG5cdCAgX25hbWU6ICdwb29sJyxcblxuXHQgIHBsdWc6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX2FkZChvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICB1bnBsdWc6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHRoaXMuX3JlbW92ZShvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBGbGF0TWFwKHNvdXJjZSwgZm4sIG9wdGlvbnMpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdCAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgIHRoaXMuX2ZuID0gZm47XG5cdCAgdGhpcy5fbWFpbkVuZGVkID0gZmFsc2U7XG5cdCAgdGhpcy5fbGFzdEN1cnJlbnQgPSBudWxsO1xuXHQgIHRoaXMuXyRoYW5kbGVNYWluID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZU1haW4oZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KEZsYXRNYXAsIEFic3RyYWN0UG9vbCwge1xuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIEFic3RyYWN0UG9vbC5wcm90b3R5cGUuX29uQWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZU1haW4pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9vbkRlYWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlTWFpbik7XG5cdCAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IHRydWU7XG5cdCAgfSxcblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICAvLyBJcyBsYXRlc3QgdmFsdWUgYmVmb3JlIGRlYWN0aXZhdGlvbiBzdXJ2aXZlZCwgYW5kIG5vdyBpcyAnY3VycmVudCcgb24gdGhpcyBhY3RpdmF0aW9uP1xuXHQgICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGhhbmRsZSBzdWNoIHZhbHVlcywgdG8gcHJldmVudCB0byBjb25zdGFudGx5IGFkZFxuXHQgICAgICAvLyBzYW1lIG9ic2VydmFsZSBvbiBlYWNoIGFjdGl2YXRpb24vZGVhY3RpdmF0aW9uIHdoZW4gb3VyIG1haW4gc291cmNlXG5cdCAgICAgIC8vIGlzIGEgYEtlZmlyLmNvbmF0YW50KClgIGZvciBleGFtcGxlLlxuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9tYWluRW5kZWQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVNYWluID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIEZsYXRNYXBFcnJvcnMoc291cmNlLCBmbikge1xuXHQgIEZsYXRNYXAuY2FsbCh0aGlzLCBzb3VyY2UsIGZuKTtcblx0fVxuXG5cdGluaGVyaXQoRmxhdE1hcEVycm9ycywgRmxhdE1hcCwge1xuXG5cdCAgLy8gU2FtZSBhcyBpbiBGbGF0TWFwLCBvbmx5IFZBTFVFL0VSUk9SIGZsaXBwZWRcblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29uc3RydWN0b3IkMShCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fcHJpbWFyeSA9IHByaW1hcnk7XG5cdCAgICB0aGlzLl9zZWNvbmRhcnkgPSBzZWNvbmRhcnk7XG5cdCAgICB0aGlzLl9uYW1lID0gcHJpbWFyeS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0gTk9USElORztcblx0ICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVTZWNvbmRhcnlBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlUHJpbWFyeUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ2xhc3NNZXRob2RzJDEoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblx0ICAgIF9pbml0OiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiAoKSB7fSxcblx0ICAgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IHg7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeUVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5QW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgICAgdGhpcy5fcmVtb3ZlU2Vjb25kYXJ5KCk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfcmVtb3ZlU2Vjb25kYXJ5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBudWxsO1xuXHQgICAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub25BbnkodGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3ByaW1hcnkub25BbnkodGhpcy5fJGhhbmRsZVByaW1hcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3ByaW1hcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgQmFzZUNsYXNzLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fcHJpbWFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZVByaW1hcnlBbnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVN0cmVhbSQxKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFMgPSBjcmVhdGVDb25zdHJ1Y3RvciQxKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKFN0cmVhbSksIG1peGluKTtcblx0ICByZXR1cm4gUztcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVByb3BlcnR5JDEobmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUCA9IGNyZWF0ZUNvbnN0cnVjdG9yJDEoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKFByb3BlcnR5KSwgbWl4aW4pO1xuXHQgIHJldHVybiBQO1xuXHR9XG5cblx0dmFyIG1peGluJDI2ID0ge1xuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORyAmJiB0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ID09PSBOT1RISU5HIHx8ICF0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzQgPSBjcmVhdGVTdHJlYW0kMSgnZmlsdGVyQnknLCBtaXhpbiQyNik7XG5cdHZhciBQJDI5ID0gY3JlYXRlUHJvcGVydHkkMSgnZmlsdGVyQnknLCBtaXhpbiQyNik7XG5cblx0ZnVuY3Rpb24gZmlsdGVyQnkocHJpbWFyeSwgc2Vjb25kYXJ5KSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTJDM0LCBQJDI5KSkocHJpbWFyeSwgc2Vjb25kYXJ5KTtcblx0fVxuXG5cdHZhciBpZDIgPSBmdW5jdGlvbiAoXywgeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHNhbXBsZWRCeShwYXNzaXZlLCBhY3RpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gZnVuY3Rpb24gKGEsIGIpIHtcblx0ICAgIHJldHVybiBjb21iaW5hdG9yKGIsIGEpO1xuXHQgIH0gOiBpZDI7XG5cdCAgcmV0dXJuIGNvbWJpbmUoW2FjdGl2ZV0sIFtwYXNzaXZlXSwgX2NvbWJpbmF0b3IpLnNldE5hbWUocGFzc2l2ZSwgJ3NhbXBsZWRCeScpO1xuXHR9XG5cblx0dmFyIG1peGluJDI3ID0ge1xuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM1ID0gY3JlYXRlU3RyZWFtJDEoJ3NraXBVbnRpbEJ5JywgbWl4aW4kMjcpO1xuXHR2YXIgUCQzMCA9IGNyZWF0ZVByb3BlcnR5JDEoJ3NraXBVbnRpbEJ5JywgbWl4aW4kMjcpO1xuXG5cdGZ1bmN0aW9uIHNraXBVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNSwgUCQzMCkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjggPSB7XG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM2ID0gY3JlYXRlU3RyZWFtJDEoJ3Rha2VVbnRpbEJ5JywgbWl4aW4kMjgpO1xuXHR2YXIgUCQzMSA9IGNyZWF0ZVByb3BlcnR5JDEoJ3Rha2VVbnRpbEJ5JywgbWl4aW4kMjgpO1xuXG5cdGZ1bmN0aW9uIHRha2VVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNiwgUCQzMSkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjkgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9wcmltYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSAmJiB0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZmx1c2goKTtcblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM3ID0gY3JlYXRlU3RyZWFtJDEoJ2J1ZmZlckJ5JywgbWl4aW4kMjkpO1xuXHR2YXIgUCQzMiA9IGNyZWF0ZVByb3BlcnR5JDEoJ2J1ZmZlckJ5JywgbWl4aW4kMjkpO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlckJ5KHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyAvKiBvcHRpb25hbCAqLykge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNywgUCQzMikpKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblx0ICAgIHZhciBfcmVmJGZsdXNoT25DaGFuZ2UgPSBfcmVmLmZsdXNoT25DaGFuZ2U7XG5cdCAgICB2YXIgZmx1c2hPbkNoYW5nZSA9IF9yZWYkZmx1c2hPbkNoYW5nZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBfcmVmJGZsdXNoT25DaGFuZ2U7XG5cblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fZmx1c2hPbkNoYW5nZSA9IGZsdXNoT25DaGFuZ2U7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcgJiYgIXRoaXMuX2xhc3RTZWNvbmRhcnkpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCAmJiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORyB8fCB0aGlzLl9sYXN0U2Vjb25kYXJ5KSkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkNoYW5nZSAmJiAheCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXG5cdCAgICAvLyBmcm9tIGRlZmF1bHQgX2hhbmRsZVNlY29uZGFyeVZhbHVlXG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0geDtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzggPSBjcmVhdGVTdHJlYW0kMSgnYnVmZmVyV2hpbGVCeScsIG1peGluJDMwKTtcblx0dmFyIFAkMzMgPSBjcmVhdGVQcm9wZXJ0eSQxKCdidWZmZXJXaGlsZUJ5JywgbWl4aW4kMzApO1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlQnkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zIC8qIG9wdGlvbmFsICovKSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTJDM4LCBQJDMzKSkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdHZhciBmID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBmYWxzZTtcblx0fTtcblx0dmFyIHQgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIHRydWU7XG5cdH07XG5cblx0ZnVuY3Rpb24gYXdhaXRpbmcoYSwgYikge1xuXHQgIHZhciByZXN1bHQgPSBtZXJnZShbbWFwJDEoYSwgdCksIG1hcCQxKGIsIGYpXSk7XG5cdCAgcmVzdWx0ID0gc2tpcER1cGxpY2F0ZXMocmVzdWx0KTtcblx0ICByZXN1bHQgPSB0b1Byb3BlcnR5KHJlc3VsdCwgZik7XG5cdCAgcmV0dXJuIHJlc3VsdC5zZXROYW1lKGEsICdhd2FpdGluZycpO1xuXHR9XG5cblx0dmFyIG1peGluJDMxID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciByZXN1bHQgPSBmbih4KTtcblx0ICAgIGlmIChyZXN1bHQuY29udmVydCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IocmVzdWx0LmVycm9yKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMzkgPSBjcmVhdGVTdHJlYW0oJ3ZhbHVlc1RvRXJyb3JzJywgbWl4aW4kMzEpO1xuXHR2YXIgUCQzNCA9IGNyZWF0ZVByb3BlcnR5KCd2YWx1ZXNUb0Vycm9ycycsIG1peGluJDMxKTtcblxuXHR2YXIgZGVmRm4gPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB7IGNvbnZlcnQ6IHRydWUsIGVycm9yOiB4IH07XG5cdH07XG5cblx0ZnVuY3Rpb24gdmFsdWVzVG9FcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZGVmRm4gOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzOSwgUCQzNCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHJlc3VsdCA9IGZuKHgpO1xuXHQgICAgaWYgKHJlc3VsdC5jb252ZXJ0KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShyZXN1bHQudmFsdWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ0MCA9IGNyZWF0ZVN0cmVhbSgnZXJyb3JzVG9WYWx1ZXMnLCBtaXhpbiQzMik7XG5cdHZhciBQJDM1ID0gY3JlYXRlUHJvcGVydHkoJ2Vycm9yc1RvVmFsdWVzJywgbWl4aW4kMzIpO1xuXG5cdHZhciBkZWZGbiQxID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geyBjb252ZXJ0OiB0cnVlLCB2YWx1ZTogeCB9O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGVycm9yc1RvVmFsdWVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGRlZkZuJDEgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ0MCwgUCQzNSkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMzMgPSB7XG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ0MSA9IGNyZWF0ZVN0cmVhbSgnZW5kT25FcnJvcicsIG1peGluJDMzKTtcblx0dmFyIFAkMzYgPSBjcmVhdGVQcm9wZXJ0eSgnZW5kT25FcnJvcicsIG1peGluJDMzKTtcblxuXHRmdW5jdGlvbiBlbmRPbkVycm9yKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDQxLCBQJDM2KSkob2JzKTtcblx0fVxuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvUHJvcGVydHkgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gdG9Qcm9wZXJ0eSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY2hhbmdlcyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gY2hhbmdlcyh0aGlzKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1Byb21pc2UgPSBmdW5jdGlvbiAoUHJvbWlzZSkge1xuXHQgIHJldHVybiB0b1Byb21pc2UodGhpcywgUHJvbWlzZSk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9FU09ic2VydmFibGUgPSB0b0VTT2JzZXJ2YWJsZTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGVbJCRvYnNlcnZhYmxlXSA9IHRvRVNPYnNlcnZhYmxlO1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBtYXAkMSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlcih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZSA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2UodGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZUVycm9ycyA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2VFcnJvcnModGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZVdoaWxlID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHRha2VXaGlsZSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubGFzdCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbGFzdCh0aGlzKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwID0gZnVuY3Rpb24gKG4pIHtcblx0ICByZXR1cm4gc2tpcCh0aGlzLCBuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwV2hpbGUgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gc2tpcFdoaWxlKHRoaXMsIGZuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwRHVwbGljYXRlcyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBza2lwRHVwbGljYXRlcyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uIChmbiwgc2VlZCkge1xuXHQgIHJldHVybiBkaWZmKHRoaXMsIGZuLCBzZWVkKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5zY2FuID0gZnVuY3Rpb24gKGZuLCBzZWVkKSB7XG5cdCAgcmV0dXJuIHNjYW4odGhpcywgZm4sIHNlZWQpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXR0ZW4gPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gZmxhdHRlbih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbiAod2FpdCkge1xuXHQgIHJldHVybiBkZWxheSh0aGlzLCB3YWl0KTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50aHJvdHRsZSA9IGZ1bmN0aW9uICh3YWl0LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIHRocm90dGxlKHRoaXMsIHdhaXQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRlYm91bmNlID0gZnVuY3Rpb24gKHdhaXQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gZGVib3VuY2UodGhpcywgd2FpdCwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWFwRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG1hcEVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlckVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVWYWx1ZXModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRXJyb3JzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFcnJvcnModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRW5kID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFbmQodGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYmVmb3JlRW5kID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGJlZm9yZUVuZCh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2xpZGluZ1dpbmRvdyA9IGZ1bmN0aW9uIChtYXgsIG1pbikge1xuXHQgIHJldHVybiBzbGlkaW5nV2luZG93KHRoaXMsIG1heCwgbWluKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaGlsZSA9IGZ1bmN0aW9uIChmbiwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZSh0aGlzLCBmbiwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2l0aENvdW50ID0gZnVuY3Rpb24gKGNvdW50LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGJ1ZmZlcldoaWxlJDEodGhpcywgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldpdGhUaW1lT3JDb3VudCA9IGZ1bmN0aW9uICh3YWl0LCBjb3VudCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaXRoVGltZU9yQ291bnQodGhpcywgd2FpdCwgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRyYW5zZHVjZSA9IGZ1bmN0aW9uICh0cmFuc2R1Y2VyKSB7XG5cdCAgcmV0dXJuIHRyYW5zZHVjZSh0aGlzLCB0cmFuc2R1Y2VyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS53aXRoSGFuZGxlciA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB3aXRoSGFuZGxlcih0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29tYmluZSA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiBjb21iaW5lKFt0aGlzLCBvdGhlcl0sIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnppcCA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiB6aXAoW3RoaXMsIG90aGVyXSwgY29tYmluYXRvcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWVyZ2UgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gbWVyZ2UoW3RoaXMsIG90aGVyXSk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIGNvbmNhdCQxKFt0aGlzLCBvdGhlcl0pO1xuXHR9O1xuXG5cdHZhciBwb29sID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBuZXcgUG9vbCgpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXAgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXAnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcExhdGVzdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBjb25jdXJMaW06IDEsIGRyb3A6ICdvbGQnIH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBMYXRlc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcEZpcnN0ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwRmlyc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcENvbmNhdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBxdWV1ZUxpbTogLTEsIGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwQ29uY2F0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBDb25jdXJMaW1pdCA9IGZ1bmN0aW9uIChmbiwgbGltaXQpIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgcXVldWVMaW06IC0xLCBjb25jdXJMaW06IGxpbWl0IH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBDb25jdXJMaW1pdCcpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBFcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXBFcnJvcnModGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBFcnJvcnMnKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5maWx0ZXJCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBmaWx0ZXJCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2FtcGxlZEJ5ID0gZnVuY3Rpb24gKG90aGVyLCBjb21iaW5hdG9yKSB7XG5cdCAgcmV0dXJuIHNhbXBsZWRCeSh0aGlzLCBvdGhlciwgY29tYmluYXRvcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcFVudGlsQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gc2tpcFVudGlsQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VVbnRpbEJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIHRha2VVbnRpbEJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJCeSh0aGlzLCBvdGhlciwgb3B0aW9ucyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2hpbGVCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZUJ5KHRoaXMsIG90aGVyLCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyBEZXByZWNhdGVkXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIERFUFJFQ0FUSU9OX1dBUk5JTkdTID0gdHJ1ZTtcblx0ZnVuY3Rpb24gZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzKCkge1xuXHQgIERFUFJFQ0FUSU9OX1dBUk5JTkdTID0gZmFsc2U7XG5cdH1cblxuXHRmdW5jdGlvbiB3YXJuKG1zZykge1xuXHQgIGlmIChERVBSRUNBVElPTl9XQVJOSU5HUyAmJiBjb25zb2xlICYmIHR5cGVvZiBjb25zb2xlLndhcm4gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHZhciBtc2cyID0gJ1xcbkhlcmUgaXMgYW4gRXJyb3Igb2JqZWN0IGZvciB5b3UgY29udGFpbmluZyB0aGUgY2FsbCBzdGFjazonO1xuXHQgICAgY29uc29sZS53YXJuKG1zZywgbXNnMiwgbmV3IEVycm9yKCkpO1xuXHQgIH1cblx0fVxuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmF3YWl0aW5nID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5hd2FpdGluZygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ1Jyk7XG5cdCAgcmV0dXJuIGF3YWl0aW5nKHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS52YWx1ZXNUb0Vycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAudmFsdWVzVG9FcnJvcnMoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0OScpO1xuXHQgIHJldHVybiB2YWx1ZXNUb0Vycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZXJyb3JzVG9WYWx1ZXMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLmVycm9yc1RvVmFsdWVzKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDknKTtcblx0ICByZXR1cm4gZXJyb3JzVG9WYWx1ZXModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmVuZE9uRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5lbmRPbkVycm9yKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNTAnKTtcblx0ICByZXR1cm4gZW5kT25FcnJvcih0aGlzKTtcblx0fTtcblxuXHQvLyBFeHBvcnRzXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIEtlZmlyID0geyBPYnNlcnZhYmxlOiBPYnNlcnZhYmxlLCBTdHJlYW06IFN0cmVhbSwgUHJvcGVydHk6IFByb3BlcnR5LCBuZXZlcjogbmV2ZXIsIGxhdGVyOiBsYXRlciwgaW50ZXJ2YWw6IGludGVydmFsLCBzZXF1ZW50aWFsbHk6IHNlcXVlbnRpYWxseSxcblx0ICBmcm9tUG9sbDogZnJvbVBvbGwsIHdpdGhJbnRlcnZhbDogd2l0aEludGVydmFsLCBmcm9tQ2FsbGJhY2s6IGZyb21DYWxsYmFjaywgZnJvbU5vZGVDYWxsYmFjazogZnJvbU5vZGVDYWxsYmFjaywgZnJvbUV2ZW50czogZnJvbUV2ZW50cywgc3RyZWFtOiBzdHJlYW0sXG5cdCAgY29uc3RhbnQ6IGNvbnN0YW50LCBjb25zdGFudEVycm9yOiBjb25zdGFudEVycm9yLCBmcm9tUHJvbWlzZTogZnJvbVByb21pc2UsIGZyb21FU09ic2VydmFibGU6IGZyb21FU09ic2VydmFibGUsIGNvbWJpbmU6IGNvbWJpbmUsIHppcDogemlwLCBtZXJnZTogbWVyZ2UsXG5cdCAgY29uY2F0OiBjb25jYXQkMSwgUG9vbDogUG9vbCwgcG9vbDogcG9vbCwgcmVwZWF0OiByZXBlYXQsIHN0YXRpY0xhbmQ6IHN0YXRpY0xhbmQgfTtcblxuXHRLZWZpci5LZWZpciA9IEtlZmlyO1xuXG5cdGV4cG9ydHMuZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzID0gZGlzc2FibGVEZXByZWNhdGlvbldhcm5pbmdzO1xuXHRleHBvcnRzLktlZmlyID0gS2VmaXI7XG5cdGV4cG9ydHMuT2JzZXJ2YWJsZSA9IE9ic2VydmFibGU7XG5cdGV4cG9ydHMuU3RyZWFtID0gU3RyZWFtO1xuXHRleHBvcnRzLlByb3BlcnR5ID0gUHJvcGVydHk7XG5cdGV4cG9ydHMubmV2ZXIgPSBuZXZlcjtcblx0ZXhwb3J0cy5sYXRlciA9IGxhdGVyO1xuXHRleHBvcnRzLmludGVydmFsID0gaW50ZXJ2YWw7XG5cdGV4cG9ydHMuc2VxdWVudGlhbGx5ID0gc2VxdWVudGlhbGx5O1xuXHRleHBvcnRzLmZyb21Qb2xsID0gZnJvbVBvbGw7XG5cdGV4cG9ydHMud2l0aEludGVydmFsID0gd2l0aEludGVydmFsO1xuXHRleHBvcnRzLmZyb21DYWxsYmFjayA9IGZyb21DYWxsYmFjaztcblx0ZXhwb3J0cy5mcm9tTm9kZUNhbGxiYWNrID0gZnJvbU5vZGVDYWxsYmFjaztcblx0ZXhwb3J0cy5mcm9tRXZlbnRzID0gZnJvbUV2ZW50cztcblx0ZXhwb3J0cy5zdHJlYW0gPSBzdHJlYW07XG5cdGV4cG9ydHMuY29uc3RhbnQgPSBjb25zdGFudDtcblx0ZXhwb3J0cy5jb25zdGFudEVycm9yID0gY29uc3RhbnRFcnJvcjtcblx0ZXhwb3J0cy5mcm9tUHJvbWlzZSA9IGZyb21Qcm9taXNlO1xuXHRleHBvcnRzLmZyb21FU09ic2VydmFibGUgPSBmcm9tRVNPYnNlcnZhYmxlO1xuXHRleHBvcnRzLmNvbWJpbmUgPSBjb21iaW5lO1xuXHRleHBvcnRzLnppcCA9IHppcDtcblx0ZXhwb3J0cy5tZXJnZSA9IG1lcmdlO1xuXHRleHBvcnRzLmNvbmNhdCA9IGNvbmNhdCQxO1xuXHRleHBvcnRzLlBvb2wgPSBQb29sO1xuXHRleHBvcnRzLnBvb2wgPSBwb29sO1xuXHRleHBvcnRzLnJlcGVhdCA9IHJlcGVhdDtcblx0ZXhwb3J0cy5zdGF0aWNMYW5kID0gc3RhdGljTGFuZDtcblx0ZXhwb3J0c1snZGVmYXVsdCddID0gS2VmaXI7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpOyIsImltcG9ydCBzbmFiYmRvbSBmcm9tICdzbmFiYmRvbS9zbmFiYmRvbS5qcydcbmltcG9ydCBoIGZyb20gJ3NuYWJiZG9tL2guanMnXG5pbXBvcnQgc25hYkNsYXNzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvY2xhc3MuanMnXG5pbXBvcnQgc25hYlByb3BzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvcHJvcHMuanMnXG5pbXBvcnQgc25hYlN0eWxlIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMnXG5pbXBvcnQgc25hYkV2ZW50IGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvZXZlbnRsaXN0ZW5lcnMuanMnXG5pbXBvcnQgS2VmaXIgZnJvbSAna2VmaXInXG5cbmV4cG9ydCBmdW5jdGlvbiBta0VtaXQoc3RyZWFtJCkge1xuICByZXR1cm4gZnVuY3Rpb24gZW1pdChhY3Rpb24sIHZhbHVlKSB7XG4gICAgcmV0dXJuIFtzdHJlYW0kLmVtaXQsIFthY3Rpb24sIHZhbHVlXV1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVzKCkge1xuICBsZXQgZW1pdHRlclxuICBsZXQgc3RyZWFtID0gS2VmaXIuc3RyZWFtKF9lbWl0dGVyID0+IHtcbiAgICBlbWl0dGVyID0gX2VtaXR0ZXJcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0dGVyID0gbnVsbFxuICAgIH1cbiAgfSlcbiAgc3RyZWFtLmVtaXQgPSBmdW5jdGlvbih4KSB7XG4gICAgZW1pdHRlciAmJiBlbWl0dGVyLmVtaXQoeClcbiAgfVxuICByZXR1cm4gc3RyZWFtXG59XG5cbi8qXG4gICBbJ2RpdicsIHt9LFxuICAgIFtbJ2J1dHRvbicsIHsgb246IHsgY2xpY2s6IGVtaXQoJ2FkZCcpIH0gfSwgJ0NsaWNrIE1lISddLFxuICAgICBbJ3NwYW4nLCB7fSwgbW9kZWxdXV1cbiovXG5cbmZ1bmN0aW9uIGNvbnZlcnRUb0h5cGVyU2NyaXB0KG5vZGUpIHtcbiAgbGV0IFtzZWwsIGRhdGEsIGNoaWxkcmVuXSA9IG5vZGVcblxuICBpZiAoQXJyYXkuaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICByZXR1cm4gaChzZWwsIGRhdGEsIGNoaWxkcmVuLm1hcChjb252ZXJ0VG9IeXBlclNjcmlwdCkpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGguYXBwbHkobnVsbCwgbm9kZSlcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHZpZXckLCBjb250YWluZXIpIHtcbiAgbGV0IHBhdGNoID0gc25hYmJkb20uaW5pdChbc25hYkNsYXNzLCBzbmFiUHJvcHMsIHNuYWJTdHlsZSwgc25hYkV2ZW50XSlcbiAgbGV0IHZub2RlID0gY29udGFpbmVyXG5cbiAgdmlldyRcbiAgICAubWFwKGNvbnZlcnRUb0h5cGVyU2NyaXB0KVxuICAgIC5vblZhbHVlKG5ld1Zub2RlID0+IHtcbiAgICAgIHBhdGNoKHZub2RlLCBuZXdWbm9kZSlcbiAgICAgIHZub2RlID0gbmV3Vm5vZGVcbiAgICB9KVxufVxuIiwiaW1wb3J0IHsgYnVzLCByZW5kZXIsIG1rRW1pdCB9IGZyb20gJy4uLy4uL3NyYy9pbmRleC5qcydcblxuLy8gU3RyZWFtXG5sZXQgYWN0aW9ucyQgPSBidXMoKVxubGV0IGVtaXQgPSBta0VtaXQoYWN0aW9ucyQpXG5cbi8vIE1vZGVsXG5sZXQgaW5pdE1vZGVsID0gMFxuXG4vLyBVcGRhdGVcbmZ1bmN0aW9uIHVwZGF0ZShtb2RlbCwgW2FjdGlvbl0pIHtcbiAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICBjYXNlICdhZGQnOlxuICAgICAgcmV0dXJuIG1vZGVsICsgMVxuICAgIGNhc2UgJ3N1YnRyYWN0JzpcbiAgICAgIHJldHVybiBtb2RlbCAtIDFcbiAgfVxufVxuXG4vLyBWaWV3XG5mdW5jdGlvbiBidXR0b24oYWN0aW9uLCB0ZXh0KSB7XG4gIHJldHVybiBbJ2J1dHRvbicsIHsgb246IHsgY2xpY2s6IGVtaXQoYWN0aW9uKSB9IH0sIHRleHRdXG59XG5cbmZ1bmN0aW9uIHZpZXcobW9kZWwpIHtcbiAgbGV0IHYgPVxuICAgIFsnZGl2Jywge30sXG4gICAgICBbIGJ1dHRvbignc3VidHJhY3QnLCAnLScpLFxuICAgICAgICBbJ3NwYW4nLCB7fSwgYCAke21vZGVsfSBgXSxcbiAgICAgICAgYnV0dG9uKCdhZGQnLCAnKycpXV1cblxuICByZXR1cm4gdlxufVxuXG4vLyBSZWR1Y2VcbmxldCBtb2RlbCQgPSBhY3Rpb25zJC5zY2FuKHVwZGF0ZSwgaW5pdE1vZGVsKVxubW9kZWwkLmxvZygnTW9kZWwnKVxuXG4vLyBSZW5kZXJcbmxldCB2aWV3JCA9IG1vZGVsJC5tYXAodmlldylcbnJlbmRlcih2aWV3JCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRhaW5lcicpKVxuIl0sIm5hbWVzIjpbInJlcXVpcmUkJDIiLCJyZXF1aXJlJCQxIiwicmVxdWlyZSQkMCIsInZub2RlIiwiVk5vZGUiLCJpcyIsInRoaXMiLCJjb21tb25qc0dsb2JhbCIsImdsb2JhbCIsImNyZWF0ZUNvbW1vbmpzTW9kdWxlIiwic25hYkNsYXNzIiwic25hYlByb3BzIiwic25hYlN0eWxlIiwic25hYkV2ZW50IiwiZW1pdCJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBYyxHQUFHLFNBQVMsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtFQUN4RCxJQUFJLEdBQUcsR0FBRyxJQUFJLEtBQUssU0FBUyxHQUFHLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0VBQ3BELE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVE7VUFDeEMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztDQUN6QyxD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UUFBUSxHQUFHQSxRQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsR0FBR0EsUUFBSyxDQUFDLEdBQUcsQ0FBQztJQUNwRCxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTs7TUFFZCxJQUFJLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO01BQy9CLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO01BQ3ZDLElBQUksSUFBSSxHQUFHLE9BQU8sR0FBRyxDQUFDLEdBQUcsT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7TUFDOUMsSUFBSSxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztNQUMzQyxJQUFJLEdBQUcsR0FBRyxPQUFPLEtBQUssQ0FBQyxDQUFDLElBQUksTUFBTSxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO01BQ3BGLEdBQUcsR0FBR0EsUUFBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDOzREQUMzQixHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO01BQzdFLElBQUksSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztNQUNsRCxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxD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SyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO01BQzdFLENBQUMsQ0FBQyxRQUFRLEVBQUVBLFFBQUssQ0FBQyxDQUFDO0tBQ3BCO0lBQ0QsSUFBSSxHQUFHLEdBQUdBLFFBQUssQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUdBLFFBQUssQ0FBQyxRQUFRLENBQUM7SUFDbkYsSUFBSSxRQUFRLEtBQUtBLFFBQUssRUFBRSxPQUFPO0lBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFQSxRQUFLLENBQUMsRUFBRTtNQUMvQixJQUFJLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztNQUM3QyxHQUFHLEdBQUcsU0FBUyxDQUFDQSxRQUFLLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztNQUMzQyxHQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO01BQy9DLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7TUFDMUMsT0FBTztLQUNSO0lBQ0QsSUFBSSxLQUFLLENBQUNBLFFBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtNQUNyQixLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFQSxRQUFLLENBQUMsQ0FBQztNQUN2RSxDQUFDLEdBQUdBLFFBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO01BQ3BCLElBQUks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QyxJQUFJLElBQUksR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7RUFDakMsSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFO0lBQ25CLElBQUksR0FBRyxDQUFDLENBQUM7SUFDVCxJQUFJRyxJQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFO1NBQzdCLElBQUlBLElBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUU7R0FDeEMsTUFBTSxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUU7SUFDMUIsSUFBSUEsSUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRTtTQUM3QixJQUFJQSxJQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFO1NBQ2xDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFO0dBQ25CO0VBQ0QsSUFBSUEsSUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRTtJQUN0QixLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7TUFDcEMsSUFBSUEsSUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUdELE9BQUssQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNsRztHQUNGO0VBQ0QsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcs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
