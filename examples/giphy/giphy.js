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

var bJsonp_min = createCommonjsModule(function (module) {
!function(n,e){"function"==typeof define&&define.amd?define([],e):"object"==typeof module&&module.exports?module.exports=e():n.jsonp=e();}(commonjsGlobal,function(){function n(n){n=n||5;for(var e="",o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=o.length,r=0;n>r;r++)e+=o.charAt(Math.floor(Math.random()*t));return e}function e(n){var e="[object Function]",o=Object.prototype.toString;return o.call(n)==e}function o(n,e){var o=a.getElementsByTagName("head")[0],t=a.createElement("script");return t.src=n,t.async=!0,t.defer=!0,o.appendChild(t),t}function t(e){return e+"__"+n()}function r(n,e,o,t){var r=-1===n.indexOf("?")?"?":"&";for(var u in e)e.hasOwnProperty(u)&&(r+=encodeURIComponent(u)+"="+encodeURIComponent(e[u])+"&");return n+r+o+"="+t}function u(n){clearTimeout(n),n=null;}function i(n,i,a,f){e(i)&&(f=i,i={},a={}),e(a)&&(f=a,a={});var l=a.timeout||15e3,d=a.prefix||"__jsonp",p=a.param||"callback",m=a.name||t(d),s=r(n,i,p,m),h=setTimeout(function(){f(new Error("jsonp request for "+m+" timed out."),null),u(h);},l);c[m]=function(n){f(null,n),u(h),c[m]=null;};var j=o(s);j.onerror=function(){f(new Error("jsonp encountered an error while loading injected script."),null),u(h);};}var c=window,a=document;return i});
});

// Streams
let actions$ = bus();
let query$ = bus();

// Model
let initModel = {topic: 'cats', url: 'loading.gif', error: null};

// Update
function update({topic, url}, [action, value]) {
  switch (action) {
    case 'changeTopic':
      return {topic: value, url}
    case 'result':
      return {topic, url: value}
    case 'error':
      return {topic, error: value}
  }
}

// View
function view(model) {
  let {topic, url, error} = model;
  let v =
    ['div', {},
      [ ['input', {props: {placeholder: 'Giphy Topic', value: topic}, on: {input: handleInput}}],
        ['button', {on: {click: [query$.emit, topic]}}, 'More Please!'],
        ['br'],
        error ? ['div', {}, error] : ['img', {props: {src: url}}]]];

  return v
}

function handleInput(e){
  let value = e.target.value.trim();
  actions$.emit(['changeTopic', value]);
}

// Http
function http(url) {
  return Kefir.fromNodeCallback(callback => bJsonp_min(url, callback))
}

function topicToUrl(topic){
  return `https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=${topic}`
}

function parseResponse({data: {image_url}}) {
  return image_url ? ['result', image_url] : ['error', 'No images found']
}

let effects$ = query$
  .map(topicToUrl)
  .flatMapFirst(http)
  .map(parseResponse)
  .flatMapErrors(e => Kefir.constant(['error', e.message]));

effects$.spy('Effects');

// Reduce
let model$ = actions$.merge(effects$).scan(update, initModel);
model$.spy('Model');

// Render
let view$ = model$.map(view);
render(view$, document.getElementById('container'));

// Init
query$.emit(initModel);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS92bm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9pcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9odG1sZG9tYXBpLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL3NuYWJiZG9tLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9jbGFzcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9rZWZpci9kaXN0L2tlZmlyLmpzIiwiLi4vLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2ItanNvbnAvZGlzdC9iLWpzb25wLm1pbi5qcyIsImluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2VsLCBkYXRhLCBjaGlsZHJlbiwgdGV4dCwgZWxtKSB7XG4gIHZhciBrZXkgPSBkYXRhID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBkYXRhLmtleTtcbiAgcmV0dXJuIHtzZWw6IHNlbCwgZGF0YTogZGF0YSwgY2hpbGRyZW46IGNoaWxkcmVuLFxuICAgICAgICAgIHRleHQ6IHRleHQsIGVsbTogZWxtLCBrZXk6IGtleX07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFycmF5OiBBcnJheS5pc0FycmF5LFxuICBwcmltaXRpdmU6IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIHR5cGVvZiBzID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgcyA9PT0gJ251bWJlcic7IH0sXG59O1xuIiwiZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWdOYW1lKXtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIHF1YWxpZmllZE5hbWUpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgcXVhbGlmaWVkTmFtZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRleHROb2RlKHRleHQpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG59XG5cblxuZnVuY3Rpb24gaW5zZXJ0QmVmb3JlKHBhcmVudE5vZGUsIG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpe1xuICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCByZWZlcmVuY2VOb2RlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVDaGlsZChub2RlLCBjaGlsZCl7XG4gIG5vZGUucmVtb3ZlQ2hpbGQoY2hpbGQpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRDaGlsZChub2RlLCBjaGlsZCl7XG4gIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGQpO1xufVxuXG5mdW5jdGlvbiBwYXJlbnROb2RlKG5vZGUpe1xuICByZXR1cm4gbm9kZS5wYXJlbnRFbGVtZW50O1xufVxuXG5mdW5jdGlvbiBuZXh0U2libGluZyhub2RlKXtcbiAgcmV0dXJuIG5vZGUubmV4dFNpYmxpbmc7XG59XG5cbmZ1bmN0aW9uIHRhZ05hbWUobm9kZSl7XG4gIHJldHVybiBub2RlLnRhZ05hbWU7XG59XG5cbmZ1bmN0aW9uIHNldFRleHRDb250ZW50KG5vZGUsIHRleHQpe1xuICBub2RlLnRleHRDb250ZW50ID0gdGV4dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZUVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnQsXG4gIGNyZWF0ZUVsZW1lbnROUzogY3JlYXRlRWxlbWVudE5TLFxuICBjcmVhdGVUZXh0Tm9kZTogY3JlYXRlVGV4dE5vZGUsXG4gIGFwcGVuZENoaWxkOiBhcHBlbmRDaGlsZCxcbiAgcmVtb3ZlQ2hpbGQ6IHJlbW92ZUNoaWxkLFxuICBpbnNlcnRCZWZvcmU6IGluc2VydEJlZm9yZSxcbiAgcGFyZW50Tm9kZTogcGFyZW50Tm9kZSxcbiAgbmV4dFNpYmxpbmc6IG5leHRTaWJsaW5nLFxuICB0YWdOYW1lOiB0YWdOYW1lLFxuICBzZXRUZXh0Q29udGVudDogc2V0VGV4dENvbnRlbnRcbn07XG4iLCIvLyBqc2hpbnQgbmV3Y2FwOiBmYWxzZVxuLyogZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSwgZG9jdW1lbnQsIE5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFZOb2RlID0gcmVxdWlyZSgnLi92bm9kZScpO1xudmFyIGlzID0gcmVxdWlyZSgnLi9pcycpO1xudmFyIGRvbUFwaSA9IHJlcXVpcmUoJy4vaHRtbGRvbWFwaScpO1xuXG5mdW5jdGlvbiBpc1VuZGVmKHMpIHsgcmV0dXJuIHMgPT09IHVuZGVmaW5lZDsgfVxuZnVuY3Rpb24gaXNEZWYocykgeyByZXR1cm4gcyAhPT0gdW5kZWZpbmVkOyB9XG5cbnZhciBlbXB0eU5vZGUgPSBWTm9kZSgnJywge30sIFtdLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5cbmZ1bmN0aW9uIHNhbWVWbm9kZSh2bm9kZTEsIHZub2RlMikge1xuICByZXR1cm4gdm5vZGUxLmtleSA9PT0gdm5vZGUyLmtleSAmJiB2bm9kZTEuc2VsID09PSB2bm9kZTIuc2VsO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVLZXlUb09sZElkeChjaGlsZHJlbiwgYmVnaW5JZHgsIGVuZElkeCkge1xuICB2YXIgaSwgbWFwID0ge30sIGtleTtcbiAgZm9yIChpID0gYmVnaW5JZHg7IGkgPD0gZW5kSWR4OyArK2kpIHtcbiAgICBrZXkgPSBjaGlsZHJlbltpXS5rZXk7XG4gICAgaWYgKGlzRGVmKGtleSkpIG1hcFtrZXldID0gaTtcbiAgfVxuICByZXR1cm4gbWFwO1xufVxuXG52YXIgaG9va3MgPSBbJ2NyZWF0ZScsICd1cGRhdGUnLCAncmVtb3ZlJywgJ2Rlc3Ryb3knLCAncHJlJywgJ3Bvc3QnXTtcblxuZnVuY3Rpb24gaW5pdChtb2R1bGVzLCBhcGkpIHtcbiAgdmFyIGksIGosIGNicyA9IHt9O1xuXG4gIGlmIChpc1VuZGVmKGFwaSkpIGFwaSA9IGRvbUFwaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgaG9va3MubGVuZ3RoOyArK2kpIHtcbiAgICBjYnNbaG9va3NbaV1dID0gW107XG4gICAgZm9yIChqID0gMDsgaiA8IG1vZHVsZXMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmIChtb2R1bGVzW2pdW2hvb2tzW2ldXSAhPT0gdW5kZWZpbmVkKSBjYnNbaG9va3NbaV1dLnB1c2gobW9kdWxlc1tqXVtob29rc1tpXV0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVtcHR5Tm9kZUF0KGVsbSkge1xuICAgIHZhciBpZCA9IGVsbS5pZCA/ICcjJyArIGVsbS5pZCA6ICcnO1xuICAgIHZhciBjID0gZWxtLmNsYXNzTmFtZSA/ICcuJyArIGVsbS5jbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCcuJykgOiAnJztcbiAgICByZXR1cm4gVk5vZGUoYXBpLnRhZ05hbWUoZWxtKS50b0xvd2VyQ2FzZSgpICsgaWQgKyBjLCB7fSwgW10sIHVuZGVmaW5lZCwgZWxtKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVJtQ2IoY2hpbGRFbG0sIGxpc3RlbmVycykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLWxpc3RlbmVycyA9PT0gMCkge1xuICAgICAgICB2YXIgcGFyZW50ID0gYXBpLnBhcmVudE5vZGUoY2hpbGRFbG0pO1xuICAgICAgICBhcGkucmVtb3ZlQ2hpbGQocGFyZW50LCBjaGlsZEVsbSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIGksIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgIGlmIChpc0RlZihkYXRhKSkge1xuICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLmhvb2spICYmIGlzRGVmKGkgPSBpLmluaXQpKSB7XG4gICAgICAgIGkodm5vZGUpO1xuICAgICAgICBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGVsbSwgY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbiwgc2VsID0gdm5vZGUuc2VsO1xuICAgIGlmIChpc0RlZihzZWwpKSB7XG4gICAgICAvLyBQYXJzZSBzZWxlY3RvclxuICAgICAgdmFyIGhhc2hJZHggPSBzZWwuaW5kZXhPZignIycpO1xuICAgICAgdmFyIGRvdElkeCA9IHNlbC5pbmRleE9mKCcuJywgaGFzaElkeCk7XG4gICAgICB2YXIgaGFzaCA9IGhhc2hJZHggPiAwID8gaGFzaElkeCA6IHNlbC5sZW5ndGg7XG4gICAgICB2YXIgZG90ID0gZG90SWR4ID4gMCA/IGRvdElkeCA6IHNlbC5sZW5ndGg7XG4gICAgICB2YXIgdGFnID0gaGFzaElkeCAhPT0gLTEgfHwgZG90SWR4ICE9PSAtMSA/IHNlbC5zbGljZSgwLCBNYXRoLm1pbihoYXNoLCBkb3QpKSA6IHNlbDtcbiAgICAgIGVsbSA9IHZub2RlLmVsbSA9IGlzRGVmKGRhdGEpICYmIGlzRGVmKGkgPSBkYXRhLm5zKSA/IGFwaS5jcmVhdGVFbGVtZW50TlMoaSwgdGFnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogYXBpLmNyZWF0ZUVsZW1lbnQodGFnKTtcbiAgICAgIGlmIChoYXNoIDwgZG90KSBlbG0uaWQgPSBzZWwuc2xpY2UoaGFzaCArIDEsIGRvdCk7XG4gICAgICBpZiAoZG90SWR4ID4gMCkgZWxtLmNsYXNzTmFtZSA9IHNlbC5zbGljZShkb3QgKyAxKS5yZXBsYWNlKC9cXC4vZywgJyAnKTtcbiAgICAgIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgYXBpLmFwcGVuZENoaWxkKGVsbSwgY3JlYXRlRWxtKGNoaWxkcmVuW2ldLCBpbnNlcnRlZFZub2RlUXVldWUpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpcy5wcmltaXRpdmUodm5vZGUudGV4dCkpIHtcbiAgICAgICAgYXBpLmFwcGVuZENoaWxkKGVsbSwgYXBpLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpKTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMuY3JlYXRlLmxlbmd0aDsgKytpKSBjYnMuY3JlYXRlW2ldKGVtcHR5Tm9kZSwgdm5vZGUpO1xuICAgICAgaSA9IHZub2RlLmRhdGEuaG9vazsgLy8gUmV1c2UgdmFyaWFibGVcbiAgICAgIGlmIChpc0RlZihpKSkge1xuICAgICAgICBpZiAoaS5jcmVhdGUpIGkuY3JlYXRlKGVtcHR5Tm9kZSwgdm5vZGUpO1xuICAgICAgICBpZiAoaS5pbnNlcnQpIGluc2VydGVkVm5vZGVRdWV1ZS5wdXNoKHZub2RlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZWxtID0gdm5vZGUuZWxtID0gYXBpLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpO1xuICAgIH1cbiAgICByZXR1cm4gdm5vZGUuZWxtO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCB2bm9kZXMsIHN0YXJ0SWR4LCBlbmRJZHgsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIGZvciAoOyBzdGFydElkeCA8PSBlbmRJZHg7ICsrc3RhcnRJZHgpIHtcbiAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBjcmVhdGVFbG0odm5vZGVzW3N0YXJ0SWR4XSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSwgYmVmb3JlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbnZva2VEZXN0cm95SG9vayh2bm9kZSkge1xuICAgIHZhciBpLCBqLCBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICBpZiAoaXNEZWYoZGF0YSkpIHtcbiAgICAgIGlmIChpc0RlZihpID0gZGF0YS5ob29rKSAmJiBpc0RlZihpID0gaS5kZXN0cm95KSkgaSh2bm9kZSk7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLmRlc3Ryb3kubGVuZ3RoOyArK2kpIGNicy5kZXN0cm95W2ldKHZub2RlKTtcbiAgICAgIGlmIChpc0RlZihpID0gdm5vZGUuY2hpbGRyZW4pKSB7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCB2bm9kZS5jaGlsZHJlbi5sZW5ndGg7ICsraikge1xuICAgICAgICAgIGludm9rZURlc3Ryb3lIb29rKHZub2RlLmNoaWxkcmVuW2pdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIHZub2Rlcywgc3RhcnRJZHgsIGVuZElkeCkge1xuICAgIGZvciAoOyBzdGFydElkeCA8PSBlbmRJZHg7ICsrc3RhcnRJZHgpIHtcbiAgICAgIHZhciBpLCBsaXN0ZW5lcnMsIHJtLCBjaCA9IHZub2Rlc1tzdGFydElkeF07XG4gICAgICBpZiAoaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChpc0RlZihjaC5zZWwpKSB7XG4gICAgICAgICAgaW52b2tlRGVzdHJveUhvb2soY2gpO1xuICAgICAgICAgIGxpc3RlbmVycyA9IGNicy5yZW1vdmUubGVuZ3RoICsgMTtcbiAgICAgICAgICBybSA9IGNyZWF0ZVJtQ2IoY2guZWxtLCBsaXN0ZW5lcnMpO1xuICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucmVtb3ZlLmxlbmd0aDsgKytpKSBjYnMucmVtb3ZlW2ldKGNoLCBybSk7XG4gICAgICAgICAgaWYgKGlzRGVmKGkgPSBjaC5kYXRhKSAmJiBpc0RlZihpID0gaS5ob29rKSAmJiBpc0RlZihpID0gaS5yZW1vdmUpKSB7XG4gICAgICAgICAgICBpKGNoLCBybSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJtKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBUZXh0IG5vZGVcbiAgICAgICAgICBhcGkucmVtb3ZlQ2hpbGQocGFyZW50RWxtLCBjaC5lbG0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlQ2hpbGRyZW4ocGFyZW50RWxtLCBvbGRDaCwgbmV3Q2gsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIHZhciBvbGRTdGFydElkeCA9IDAsIG5ld1N0YXJ0SWR4ID0gMDtcbiAgICB2YXIgb2xkRW5kSWR4ID0gb2xkQ2gubGVuZ3RoIC0gMTtcbiAgICB2YXIgb2xkU3RhcnRWbm9kZSA9IG9sZENoWzBdO1xuICAgIHZhciBvbGRFbmRWbm9kZSA9IG9sZENoW29sZEVuZElkeF07XG4gICAgdmFyIG5ld0VuZElkeCA9IG5ld0NoLmxlbmd0aCAtIDE7XG4gICAgdmFyIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFswXTtcbiAgICB2YXIgbmV3RW5kVm5vZGUgPSBuZXdDaFtuZXdFbmRJZHhdO1xuICAgIHZhciBvbGRLZXlUb0lkeCwgaWR4SW5PbGQsIGVsbVRvTW92ZSwgYmVmb3JlO1xuXG4gICAgd2hpbGUgKG9sZFN0YXJ0SWR4IDw9IG9sZEVuZElkeCAmJiBuZXdTdGFydElkeCA8PSBuZXdFbmRJZHgpIHtcbiAgICAgIGlmIChpc1VuZGVmKG9sZFN0YXJ0Vm5vZGUpKSB7XG4gICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTsgLy8gVm5vZGUgaGFzIGJlZW4gbW92ZWQgbGVmdFxuICAgICAgfSBlbHNlIGlmIChpc1VuZGVmKG9sZEVuZFZub2RlKSkge1xuICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld1N0YXJ0Vm5vZGUpKSB7XG4gICAgICAgIHBhdGNoVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdO1xuICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRFbmRWbm9kZSwgbmV3RW5kVm5vZGUpKSB7XG4gICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgICAgbmV3RW5kVm5vZGUgPSBuZXdDaFstLW5ld0VuZElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRTdGFydFZub2RlLCBuZXdFbmRWbm9kZSkpIHsgLy8gVm5vZGUgbW92ZWQgcmlnaHRcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRTdGFydFZub2RlLCBuZXdFbmRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtLCBhcGkubmV4dFNpYmxpbmcob2xkRW5kVm5vZGUuZWxtKSk7XG4gICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTtcbiAgICAgICAgbmV3RW5kVm5vZGUgPSBuZXdDaFstLW5ld0VuZElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRFbmRWbm9kZSwgbmV3U3RhcnRWbm9kZSkpIHsgLy8gVm5vZGUgbW92ZWQgbGVmdFxuICAgICAgICBwYXRjaFZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgb2xkRW5kVm5vZGUuZWxtLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaXNVbmRlZihvbGRLZXlUb0lkeCkpIG9sZEtleVRvSWR4ID0gY3JlYXRlS2V5VG9PbGRJZHgob2xkQ2gsIG9sZFN0YXJ0SWR4LCBvbGRFbmRJZHgpO1xuICAgICAgICBpZHhJbk9sZCA9IG9sZEtleVRvSWR4W25ld1N0YXJ0Vm5vZGUua2V5XTtcbiAgICAgICAgaWYgKGlzVW5kZWYoaWR4SW5PbGQpKSB7IC8vIE5ldyBlbGVtZW50XG4gICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbShuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgICAgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWysrbmV3U3RhcnRJZHhdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVsbVRvTW92ZSA9IG9sZENoW2lkeEluT2xkXTtcbiAgICAgICAgICBwYXRjaFZub2RlKGVsbVRvTW92ZSwgbmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgICBvbGRDaFtpZHhJbk9sZF0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGVsbVRvTW92ZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9sZFN0YXJ0SWR4ID4gb2xkRW5kSWR4KSB7XG4gICAgICBiZWZvcmUgPSBpc1VuZGVmKG5ld0NoW25ld0VuZElkeCsxXSkgPyBudWxsIDogbmV3Q2hbbmV3RW5kSWR4KzFdLmVsbTtcbiAgICAgIGFkZFZub2RlcyhwYXJlbnRFbG0sIGJlZm9yZSwgbmV3Q2gsIG5ld1N0YXJ0SWR4LCBuZXdFbmRJZHgsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgfSBlbHNlIGlmIChuZXdTdGFydElkeCA+IG5ld0VuZElkeCkge1xuICAgICAgcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgb2xkQ2gsIG9sZFN0YXJ0SWR4LCBvbGRFbmRJZHgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhdGNoVm5vZGUob2xkVm5vZGUsIHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICB2YXIgaSwgaG9vaztcbiAgICBpZiAoaXNEZWYoaSA9IHZub2RlLmRhdGEpICYmIGlzRGVmKGhvb2sgPSBpLmhvb2spICYmIGlzRGVmKGkgPSBob29rLnByZXBhdGNoKSkge1xuICAgICAgaShvbGRWbm9kZSwgdm5vZGUpO1xuICAgIH1cbiAgICB2YXIgZWxtID0gdm5vZGUuZWxtID0gb2xkVm5vZGUuZWxtLCBvbGRDaCA9IG9sZFZub2RlLmNoaWxkcmVuLCBjaCA9IHZub2RlLmNoaWxkcmVuO1xuICAgIGlmIChvbGRWbm9kZSA9PT0gdm5vZGUpIHJldHVybjtcbiAgICBpZiAoIXNhbWVWbm9kZShvbGRWbm9kZSwgdm5vZGUpKSB7XG4gICAgICB2YXIgcGFyZW50RWxtID0gYXBpLnBhcmVudE5vZGUob2xkVm5vZGUuZWxtKTtcbiAgICAgIGVsbSA9IGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBlbG0sIG9sZFZub2RlLmVsbSk7XG4gICAgICByZW1vdmVWbm9kZXMocGFyZW50RWxtLCBbb2xkVm5vZGVdLCAwLCAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzRGVmKHZub2RlLmRhdGEpKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnVwZGF0ZS5sZW5ndGg7ICsraSkgY2JzLnVwZGF0ZVtpXShvbGRWbm9kZSwgdm5vZGUpO1xuICAgICAgaSA9IHZub2RlLmRhdGEuaG9vaztcbiAgICAgIGlmIChpc0RlZihpKSAmJiBpc0RlZihpID0gaS51cGRhdGUpKSBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICAgIGlmIChpc1VuZGVmKHZub2RlLnRleHQpKSB7XG4gICAgICBpZiAoaXNEZWYob2xkQ2gpICYmIGlzRGVmKGNoKSkge1xuICAgICAgICBpZiAob2xkQ2ggIT09IGNoKSB1cGRhdGVDaGlsZHJlbihlbG0sIG9sZENoLCBjaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChpc0RlZihvbGRWbm9kZS50ZXh0KSkgYXBpLnNldFRleHRDb250ZW50KGVsbSwgJycpO1xuICAgICAgICBhZGRWbm9kZXMoZWxtLCBudWxsLCBjaCwgMCwgY2gubGVuZ3RoIC0gMSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWYob2xkQ2gpKSB7XG4gICAgICAgIHJlbW92ZVZub2RlcyhlbG0sIG9sZENoLCAwLCBvbGRDaC5sZW5ndGggLSAxKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWYob2xkVm5vZGUudGV4dCkpIHtcbiAgICAgICAgYXBpLnNldFRleHRDb250ZW50KGVsbSwgJycpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob2xkVm5vZGUudGV4dCAhPT0gdm5vZGUudGV4dCkge1xuICAgICAgYXBpLnNldFRleHRDb250ZW50KGVsbSwgdm5vZGUudGV4dCk7XG4gICAgfVxuICAgIGlmIChpc0RlZihob29rKSAmJiBpc0RlZihpID0gaG9vay5wb3N0cGF0Y2gpKSB7XG4gICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG9sZFZub2RlLCB2bm9kZSkge1xuICAgIHZhciBpLCBlbG0sIHBhcmVudDtcbiAgICB2YXIgaW5zZXJ0ZWRWbm9kZVF1ZXVlID0gW107XG4gICAgZm9yIChpID0gMDsgaSA8IGNicy5wcmUubGVuZ3RoOyArK2kpIGNicy5wcmVbaV0oKTtcblxuICAgIGlmIChpc1VuZGVmKG9sZFZub2RlLnNlbCkpIHtcbiAgICAgIG9sZFZub2RlID0gZW1wdHlOb2RlQXQob2xkVm5vZGUpO1xuICAgIH1cblxuICAgIGlmIChzYW1lVm5vZGUob2xkVm5vZGUsIHZub2RlKSkge1xuICAgICAgcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsbSA9IG9sZFZub2RlLmVsbTtcbiAgICAgIHBhcmVudCA9IGFwaS5wYXJlbnROb2RlKGVsbSk7XG5cbiAgICAgIGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcblxuICAgICAgaWYgKHBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudCwgdm5vZGUuZWxtLCBhcGkubmV4dFNpYmxpbmcoZWxtKSk7XG4gICAgICAgIHJlbW92ZVZub2RlcyhwYXJlbnQsIFtvbGRWbm9kZV0sIDAsIDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBpbnNlcnRlZFZub2RlUXVldWUubGVuZ3RoOyArK2kpIHtcbiAgICAgIGluc2VydGVkVm5vZGVRdWV1ZVtpXS5kYXRhLmhvb2suaW5zZXJ0KGluc2VydGVkVm5vZGVRdWV1ZVtpXSk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucG9zdC5sZW5ndGg7ICsraSkgY2JzLnBvc3RbaV0oKTtcbiAgICByZXR1cm4gdm5vZGU7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2luaXQ6IGluaXR9O1xuIiwidmFyIFZOb2RlID0gcmVxdWlyZSgnLi92bm9kZScpO1xudmFyIGlzID0gcmVxdWlyZSgnLi9pcycpO1xuXG5mdW5jdGlvbiBhZGROUyhkYXRhLCBjaGlsZHJlbiwgc2VsKSB7XG4gIGRhdGEubnMgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnO1xuXG4gIGlmIChzZWwgIT09ICdmb3JlaWduT2JqZWN0JyAmJiBjaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgYWRkTlMoY2hpbGRyZW5baV0uZGF0YSwgY2hpbGRyZW5baV0uY2hpbGRyZW4sIGNoaWxkcmVuW2ldLnNlbCk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaChzZWwsIGIsIGMpIHtcbiAgdmFyIGRhdGEgPSB7fSwgY2hpbGRyZW4sIHRleHQsIGk7XG4gIGlmIChjICE9PSB1bmRlZmluZWQpIHtcbiAgICBkYXRhID0gYjtcbiAgICBpZiAoaXMuYXJyYXkoYykpIHsgY2hpbGRyZW4gPSBjOyB9XG4gICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGMpKSB7IHRleHQgPSBjOyB9XG4gIH0gZWxzZSBpZiAoYiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGlzLmFycmF5KGIpKSB7IGNoaWxkcmVuID0gYjsgfVxuICAgIGVsc2UgaWYgKGlzLnByaW1pdGl2ZShiKSkgeyB0ZXh0ID0gYjsgfVxuICAgIGVsc2UgeyBkYXRhID0gYjsgfVxuICB9XG4gIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmIChpcy5wcmltaXRpdmUoY2hpbGRyZW5baV0pKSBjaGlsZHJlbltpXSA9IFZOb2RlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGNoaWxkcmVuW2ldKTtcbiAgICB9XG4gIH1cbiAgaWYgKHNlbFswXSA9PT0gJ3MnICYmIHNlbFsxXSA9PT0gJ3YnICYmIHNlbFsyXSA9PT0gJ2cnKSB7XG4gICAgYWRkTlMoZGF0YSwgY2hpbGRyZW4sIHNlbCk7XG4gIH1cbiAgcmV0dXJuIFZOb2RlKHNlbCwgZGF0YSwgY2hpbGRyZW4sIHRleHQsIHVuZGVmaW5lZCk7XG59O1xuIiwiZnVuY3Rpb24gdXBkYXRlQ2xhc3Mob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBjdXIsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZENsYXNzID0gb2xkVm5vZGUuZGF0YS5jbGFzcyxcbiAgICAgIGtsYXNzID0gdm5vZGUuZGF0YS5jbGFzcztcblxuICBpZiAoIW9sZENsYXNzICYmICFrbGFzcykgcmV0dXJuO1xuICBvbGRDbGFzcyA9IG9sZENsYXNzIHx8IHt9O1xuICBrbGFzcyA9IGtsYXNzIHx8IHt9O1xuXG4gIGZvciAobmFtZSBpbiBvbGRDbGFzcykge1xuICAgIGlmICgha2xhc3NbbmFtZV0pIHtcbiAgICAgIGVsbS5jbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgIH1cbiAgfVxuICBmb3IgKG5hbWUgaW4ga2xhc3MpIHtcbiAgICBjdXIgPSBrbGFzc1tuYW1lXTtcbiAgICBpZiAoY3VyICE9PSBvbGRDbGFzc1tuYW1lXSkge1xuICAgICAgZWxtLmNsYXNzTGlzdFtjdXIgPyAnYWRkJyA6ICdyZW1vdmUnXShuYW1lKTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y3JlYXRlOiB1cGRhdGVDbGFzcywgdXBkYXRlOiB1cGRhdGVDbGFzc307XG4iLCJmdW5jdGlvbiB1cGRhdGVQcm9wcyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGtleSwgY3VyLCBvbGQsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZFByb3BzID0gb2xkVm5vZGUuZGF0YS5wcm9wcywgcHJvcHMgPSB2bm9kZS5kYXRhLnByb3BzO1xuXG4gIGlmICghb2xkUHJvcHMgJiYgIXByb3BzKSByZXR1cm47XG4gIG9sZFByb3BzID0gb2xkUHJvcHMgfHwge307XG4gIHByb3BzID0gcHJvcHMgfHwge307XG5cbiAgZm9yIChrZXkgaW4gb2xkUHJvcHMpIHtcbiAgICBpZiAoIXByb3BzW2tleV0pIHtcbiAgICAgIGRlbGV0ZSBlbG1ba2V5XTtcbiAgICB9XG4gIH1cbiAgZm9yIChrZXkgaW4gcHJvcHMpIHtcbiAgICBjdXIgPSBwcm9wc1trZXldO1xuICAgIG9sZCA9IG9sZFByb3BzW2tleV07XG4gICAgaWYgKG9sZCAhPT0gY3VyICYmIChrZXkgIT09ICd2YWx1ZScgfHwgZWxtW2tleV0gIT09IGN1cikpIHtcbiAgICAgIGVsbVtrZXldID0gY3VyO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZVByb3BzLCB1cGRhdGU6IHVwZGF0ZVByb3BzfTtcbiIsInZhciByYWYgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkgfHwgc2V0VGltZW91dDtcbnZhciBuZXh0RnJhbWUgPSBmdW5jdGlvbihmbikgeyByYWYoZnVuY3Rpb24oKSB7IHJhZihmbik7IH0pOyB9O1xuXG5mdW5jdGlvbiBzZXROZXh0RnJhbWUob2JqLCBwcm9wLCB2YWwpIHtcbiAgbmV4dEZyYW1lKGZ1bmN0aW9uKCkgeyBvYmpbcHJvcF0gPSB2YWw7IH0pO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTdHlsZShvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGN1ciwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkU3R5bGUgPSBvbGRWbm9kZS5kYXRhLnN0eWxlLFxuICAgICAgc3R5bGUgPSB2bm9kZS5kYXRhLnN0eWxlO1xuXG4gIGlmICghb2xkU3R5bGUgJiYgIXN0eWxlKSByZXR1cm47XG4gIG9sZFN0eWxlID0gb2xkU3R5bGUgfHwge307XG4gIHN0eWxlID0gc3R5bGUgfHwge307XG4gIHZhciBvbGRIYXNEZWwgPSAnZGVsYXllZCcgaW4gb2xkU3R5bGU7XG5cbiAgZm9yIChuYW1lIGluIG9sZFN0eWxlKSB7XG4gICAgaWYgKCFzdHlsZVtuYW1lXSkge1xuICAgICAgZWxtLnN0eWxlW25hbWVdID0gJyc7XG4gICAgfVxuICB9XG4gIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgIGN1ciA9IHN0eWxlW25hbWVdO1xuICAgIGlmIChuYW1lID09PSAnZGVsYXllZCcpIHtcbiAgICAgIGZvciAobmFtZSBpbiBzdHlsZS5kZWxheWVkKSB7XG4gICAgICAgIGN1ciA9IHN0eWxlLmRlbGF5ZWRbbmFtZV07XG4gICAgICAgIGlmICghb2xkSGFzRGVsIHx8IGN1ciAhPT0gb2xkU3R5bGUuZGVsYXllZFtuYW1lXSkge1xuICAgICAgICAgIHNldE5leHRGcmFtZShlbG0uc3R5bGUsIG5hbWUsIGN1cik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5hbWUgIT09ICdyZW1vdmUnICYmIGN1ciAhPT0gb2xkU3R5bGVbbmFtZV0pIHtcbiAgICAgIGVsbS5zdHlsZVtuYW1lXSA9IGN1cjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYXBwbHlEZXN0cm95U3R5bGUodm5vZGUpIHtcbiAgdmFyIHN0eWxlLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sIHMgPSB2bm9kZS5kYXRhLnN0eWxlO1xuICBpZiAoIXMgfHwgIShzdHlsZSA9IHMuZGVzdHJveSkpIHJldHVybjtcbiAgZm9yIChuYW1lIGluIHN0eWxlKSB7XG4gICAgZWxtLnN0eWxlW25hbWVdID0gc3R5bGVbbmFtZV07XG4gIH1cbn1cblxuZnVuY3Rpb24gYXBwbHlSZW1vdmVTdHlsZSh2bm9kZSwgcm0pIHtcbiAgdmFyIHMgPSB2bm9kZS5kYXRhLnN0eWxlO1xuICBpZiAoIXMgfHwgIXMucmVtb3ZlKSB7XG4gICAgcm0oKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG5hbWUsIGVsbSA9IHZub2RlLmVsbSwgaWR4LCBpID0gMCwgbWF4RHVyID0gMCxcbiAgICAgIGNvbXBTdHlsZSwgc3R5bGUgPSBzLnJlbW92ZSwgYW1vdW50ID0gMCwgYXBwbGllZCA9IFtdO1xuICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICBhcHBsaWVkLnB1c2gobmFtZSk7XG4gICAgZWxtLnN0eWxlW25hbWVdID0gc3R5bGVbbmFtZV07XG4gIH1cbiAgY29tcFN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShlbG0pO1xuICB2YXIgcHJvcHMgPSBjb21wU3R5bGVbJ3RyYW5zaXRpb24tcHJvcGVydHknXS5zcGxpdCgnLCAnKTtcbiAgZm9yICg7IGkgPCBwcm9wcy5sZW5ndGg7ICsraSkge1xuICAgIGlmKGFwcGxpZWQuaW5kZXhPZihwcm9wc1tpXSkgIT09IC0xKSBhbW91bnQrKztcbiAgfVxuICBlbG0uYWRkRXZlbnRMaXN0ZW5lcigndHJhbnNpdGlvbmVuZCcsIGZ1bmN0aW9uKGV2KSB7XG4gICAgaWYgKGV2LnRhcmdldCA9PT0gZWxtKSAtLWFtb3VudDtcbiAgICBpZiAoYW1vdW50ID09PSAwKSBybSgpO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y3JlYXRlOiB1cGRhdGVTdHlsZSwgdXBkYXRlOiB1cGRhdGVTdHlsZSwgZGVzdHJveTogYXBwbHlEZXN0cm95U3R5bGUsIHJlbW92ZTogYXBwbHlSZW1vdmVTdHlsZX07XG4iLCJmdW5jdGlvbiBpbnZva2VIYW5kbGVyKGhhbmRsZXIsIHZub2RlLCBldmVudCkge1xuICBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIC8vIGNhbGwgZnVuY3Rpb24gaGFuZGxlclxuICAgIGhhbmRsZXIuY2FsbCh2bm9kZSwgZXZlbnQsIHZub2RlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJvYmplY3RcIikge1xuICAgIC8vIGNhbGwgaGFuZGxlciB3aXRoIGFyZ3VtZW50c1xuICAgIGlmICh0eXBlb2YgaGFuZGxlclswXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAvLyBzcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSBhcmd1bWVudCBmb3IgcGVyZm9ybWFuY2VcbiAgICAgIGlmIChoYW5kbGVyLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBoYW5kbGVyWzBdLmNhbGwodm5vZGUsIGhhbmRsZXJbMV0sIGV2ZW50LCB2bm9kZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9IGhhbmRsZXIuc2xpY2UoMSk7XG4gICAgICAgIGFyZ3MucHVzaChldmVudCk7XG4gICAgICAgIGFyZ3MucHVzaCh2bm9kZSk7XG4gICAgICAgIGhhbmRsZXJbMF0uYXBwbHkodm5vZGUsIGFyZ3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjYWxsIG11bHRpcGxlIGhhbmRsZXJzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhbmRsZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW52b2tlSGFuZGxlcihoYW5kbGVyW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQsIHZub2RlKSB7XG4gIHZhciBuYW1lID0gZXZlbnQudHlwZSxcbiAgICAgIG9uID0gdm5vZGUuZGF0YS5vbjtcblxuICAvLyBjYWxsIGV2ZW50IGhhbmRsZXIocykgaWYgZXhpc3RzXG4gIGlmIChvbiAmJiBvbltuYW1lXSkge1xuICAgIGludm9rZUhhbmRsZXIob25bbmFtZV0sIHZub2RlLCBldmVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTGlzdGVuZXIoKSB7XG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50KSB7XG4gICAgaGFuZGxlRXZlbnQoZXZlbnQsIGhhbmRsZXIudm5vZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUV2ZW50TGlzdGVuZXJzKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgb2xkT24gPSBvbGRWbm9kZS5kYXRhLm9uLFxuICAgICAgb2xkTGlzdGVuZXIgPSBvbGRWbm9kZS5saXN0ZW5lcixcbiAgICAgIG9sZEVsbSA9IG9sZFZub2RlLmVsbSxcbiAgICAgIG9uID0gdm5vZGUgJiYgdm5vZGUuZGF0YS5vbixcbiAgICAgIGVsbSA9IHZub2RlICYmIHZub2RlLmVsbSxcbiAgICAgIG5hbWU7XG5cbiAgLy8gb3B0aW1pemF0aW9uIGZvciByZXVzZWQgaW1tdXRhYmxlIGhhbmRsZXJzXG4gIGlmIChvbGRPbiA9PT0gb24pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyByZW1vdmUgZXhpc3RpbmcgbGlzdGVuZXJzIHdoaWNoIG5vIGxvbmdlciB1c2VkXG4gIGlmIChvbGRPbiAmJiBvbGRMaXN0ZW5lcikge1xuICAgIC8vIGlmIGVsZW1lbnQgY2hhbmdlZCBvciBkZWxldGVkIHdlIHJlbW92ZSBhbGwgZXhpc3RpbmcgbGlzdGVuZXJzIHVuY29uZGl0aW9uYWxseVxuICAgIGlmICghb24pIHtcbiAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXIgaWYgZWxlbWVudCB3YXMgY2hhbmdlZCBvciBleGlzdGluZyBsaXN0ZW5lcnMgcmVtb3ZlZFxuICAgICAgICBvbGRFbG0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvbGRMaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb2xkT24pIHtcbiAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyIGlmIGV4aXN0aW5nIGxpc3RlbmVyIHJlbW92ZWRcbiAgICAgICAgaWYgKCFvbltuYW1lXSkge1xuICAgICAgICAgIG9sZEVsbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9sZExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhZGQgbmV3IGxpc3RlbmVycyB3aGljaCBoYXMgbm90IGFscmVhZHkgYXR0YWNoZWRcbiAgaWYgKG9uKSB7XG4gICAgLy8gcmV1c2UgZXhpc3RpbmcgbGlzdGVuZXIgb3IgY3JlYXRlIG5ld1xuICAgIHZhciBsaXN0ZW5lciA9IHZub2RlLmxpc3RlbmVyID0gb2xkVm5vZGUubGlzdGVuZXIgfHwgY3JlYXRlTGlzdGVuZXIoKTtcbiAgICAvLyB1cGRhdGUgdm5vZGUgZm9yIGxpc3RlbmVyXG4gICAgbGlzdGVuZXIudm5vZGUgPSB2bm9kZTtcblxuICAgIC8vIGlmIGVsZW1lbnQgY2hhbmdlZCBvciBhZGRlZCB3ZSBhZGQgYWxsIG5lZWRlZCBsaXN0ZW5lcnMgdW5jb25kaXRpb25hbGx5XG4gICAgaWYgKCFvbGRPbikge1xuICAgICAgZm9yIChuYW1lIGluIG9uKSB7XG4gICAgICAgIC8vIGFkZCBsaXN0ZW5lciBpZiBlbGVtZW50IHdhcyBjaGFuZ2VkIG9yIG5ldyBsaXN0ZW5lcnMgYWRkZWRcbiAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChuYW1lIGluIG9uKSB7XG4gICAgICAgIC8vIGFkZCBsaXN0ZW5lciBpZiBuZXcgbGlzdGVuZXIgYWRkZWRcbiAgICAgICAgaWYgKCFvbGRPbltuYW1lXSkge1xuICAgICAgICAgIGVsbS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZTogdXBkYXRlRXZlbnRMaXN0ZW5lcnMsXG4gIHVwZGF0ZTogdXBkYXRlRXZlbnRMaXN0ZW5lcnMsXG4gIGRlc3Ryb3k6IHVwZGF0ZUV2ZW50TGlzdGVuZXJzXG59O1xuIiwiLyohIEtlZmlyLmpzIHYzLjYuMFxuICogIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpclxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcblx0KGZhY3RvcnkoKGdsb2JhbC5LZWZpciA9IGdsb2JhbC5LZWZpciB8fCB7fSkpKTtcbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZU9iaihwcm90bykge1xuXHQgIHZhciBGID0gZnVuY3Rpb24gKCkge307XG5cdCAgRi5wcm90b3R5cGUgPSBwcm90bztcblx0ICByZXR1cm4gbmV3IEYoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQgLyosIG1peGluMSwgbWl4aW4yLi4uKi8pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMCxcblx0ICAgICAgcHJvcCA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAxOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGZvciAocHJvcCBpbiBhcmd1bWVudHNbaV0pIHtcblx0ICAgICAgdGFyZ2V0W3Byb3BdID0gYXJndW1lbnRzW2ldW3Byb3BdO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gdGFyZ2V0O1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5oZXJpdChDaGlsZCwgUGFyZW50IC8qLCBtaXhpbjEsIG1peGluMi4uLiovKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgQ2hpbGQucHJvdG90eXBlID0gY3JlYXRlT2JqKFBhcmVudC5wcm90b3R5cGUpO1xuXHQgIENoaWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENoaWxkO1xuXHQgIGZvciAoaSA9IDI7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZXh0ZW5kKENoaWxkLnByb3RvdHlwZSwgYXJndW1lbnRzW2ldKTtcblx0ICB9XG5cdCAgcmV0dXJuIENoaWxkO1xuXHR9XG5cblx0dmFyIE5PVEhJTkcgPSBbJzxub3RoaW5nPiddO1xuXHR2YXIgRU5EID0gJ2VuZCc7XG5cdHZhciBWQUxVRSA9ICd2YWx1ZSc7XG5cdHZhciBFUlJPUiA9ICdlcnJvcic7XG5cdHZhciBBTlkgPSAnYW55JztcblxuXHRmdW5jdGlvbiBjb25jYXQoYSwgYikge1xuXHQgIHZhciByZXN1bHQgPSB2b2lkIDAsXG5cdCAgICAgIGxlbmd0aCA9IHZvaWQgMCxcblx0ICAgICAgaSA9IHZvaWQgMCxcblx0ICAgICAgaiA9IHZvaWQgMDtcblx0ICBpZiAoYS5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiBiO1xuXHQgIH1cblx0ICBpZiAoYi5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiBhO1xuXHQgIH1cblx0ICBqID0gMDtcblx0ICByZXN1bHQgPSBuZXcgQXJyYXkoYS5sZW5ndGggKyBiLmxlbmd0aCk7XG5cdCAgbGVuZ3RoID0gYS5sZW5ndGg7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBqKyspIHtcblx0ICAgIHJlc3VsdFtqXSA9IGFbaV07XG5cdCAgfVxuXHQgIGxlbmd0aCA9IGIubGVuZ3RoO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKywgaisrKSB7XG5cdCAgICByZXN1bHRbal0gPSBiW2ldO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gZmluZChhcnIsIHZhbHVlKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAoYXJyW2ldID09PSB2YWx1ZSkge1xuXHQgICAgICByZXR1cm4gaTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gZmluZEJ5UHJlZChhcnIsIHByZWQpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChwcmVkKGFycltpXSkpIHtcblx0ICAgICAgcmV0dXJuIGk7XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNsb25lQXJyYXkoaW5wdXQpIHtcblx0ICB2YXIgbGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIHJlc3VsdFtpXSA9IGlucHV0W2ldO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVtb3ZlKGlucHV0LCBpbmRleCkge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IHZvaWQgMCxcblx0ICAgICAgaSA9IHZvaWQgMCxcblx0ICAgICAgaiA9IHZvaWQgMDtcblx0ICBpZiAoaW5kZXggPj0gMCAmJiBpbmRleCA8IGxlbmd0aCkge1xuXHQgICAgaWYgKGxlbmd0aCA9PT0gMSkge1xuXHQgICAgICByZXR1cm4gW107XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoIC0gMSk7XG5cdCAgICAgIGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgICAgICBpZiAoaSAhPT0gaW5kZXgpIHtcblx0ICAgICAgICAgIHJlc3VsdFtqXSA9IGlucHV0W2ldO1xuXHQgICAgICAgICAgaisrO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgICByZXR1cm4gcmVzdWx0O1xuXHQgICAgfVxuXHQgIH0gZWxzZSB7XG5cdCAgICByZXR1cm4gaW5wdXQ7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gbWFwKGlucHV0LCBmbikge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2ldID0gZm4oaW5wdXRbaV0pO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gZm9yRWFjaChhcnIsIGZuKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBmbihhcnJbaV0pO1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZpbGxBcnJheShhcnIsIHZhbHVlKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBhcnJbaV0gPSB2YWx1ZTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBjb250YWlucyhhcnIsIHZhbHVlKSB7XG5cdCAgcmV0dXJuIGZpbmQoYXJyLCB2YWx1ZSkgIT09IC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2xpZGUoY3VyLCBuZXh0LCBtYXgpIHtcblx0ICB2YXIgbGVuZ3RoID0gTWF0aC5taW4obWF4LCBjdXIubGVuZ3RoICsgMSksXG5cdCAgICAgIG9mZnNldCA9IGN1ci5sZW5ndGggLSBsZW5ndGggKyAxLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSBvZmZzZXQ7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2kgLSBvZmZzZXRdID0gY3VyW2ldO1xuXHQgIH1cblx0ICByZXN1bHRbbGVuZ3RoIC0gMV0gPSBuZXh0O1xuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgZXZlbnQpIHtcblx0ICBpZiAodHlwZSA9PT0gQU5ZKSB7XG5cdCAgICBmbihldmVudCk7XG5cdCAgfSBlbHNlIGlmICh0eXBlID09PSBldmVudC50eXBlKSB7XG5cdCAgICBpZiAodHlwZSA9PT0gVkFMVUUgfHwgdHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgZm4oZXZlbnQudmFsdWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgZm4oKTtcblx0ICAgIH1cblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBEaXNwYXRjaGVyKCkge1xuXHQgIHRoaXMuX2l0ZW1zID0gW107XG5cdCAgdGhpcy5fc3BpZXMgPSBbXTtcblx0ICB0aGlzLl9pbkxvb3AgPSAwO1xuXHQgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IG51bGw7XG5cdH1cblxuXHRleHRlbmQoRGlzcGF0Y2hlci5wcm90b3R5cGUsIHtcblx0ICBhZGQ6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgdGhpcy5faXRlbXMgPSBjb25jYXQodGhpcy5faXRlbXMsIFt7IHR5cGU6IHR5cGUsIGZuOiBmbiB9XSk7XG5cdCAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgcmVtb3ZlOiBmdW5jdGlvbiAodHlwZSwgZm4pIHtcblx0ICAgIHZhciBpbmRleCA9IGZpbmRCeVByZWQodGhpcy5faXRlbXMsIGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHJldHVybiB4LnR5cGUgPT09IHR5cGUgJiYgeC5mbiA9PT0gZm47XG5cdCAgICB9KTtcblxuXHQgICAgLy8gaWYgd2UncmUgY3VycmVudGx5IGluIGEgbm90aWZpY2F0aW9uIGxvb3AsXG5cdCAgICAvLyByZW1lbWJlciB0aGlzIHN1YnNjcmliZXIgd2FzIHJlbW92ZWRcblx0ICAgIGlmICh0aGlzLl9pbkxvb3AgIT09IDAgJiYgaW5kZXggIT09IC0xKSB7XG5cdCAgICAgIGlmICh0aGlzLl9yZW1vdmVkSXRlbXMgPT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMgPSBbXTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMucHVzaCh0aGlzLl9pdGVtc1tpbmRleF0pO1xuXHQgICAgfVxuXG5cdCAgICB0aGlzLl9pdGVtcyA9IHJlbW92ZSh0aGlzLl9pdGVtcywgaW5kZXgpO1xuXHQgICAgcmV0dXJuIHRoaXMuX2l0ZW1zLmxlbmd0aDtcblx0ICB9LFxuXHQgIGFkZFNweTogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICB0aGlzLl9zcGllcyA9IGNvbmNhdCh0aGlzLl9zcGllcywgW2ZuXSk7XG5cdCAgICByZXR1cm4gdGhpcy5fc3BpZXMubGVuZ3RoO1xuXHQgIH0sXG5cblxuXHQgIC8vIEJlY2F1c2Ugc3BpZXMgYXJlIG9ubHkgZXZlciBhIGZ1bmN0aW9uIHRoYXQgcGVyZm9ybSBsb2dnaW5nIGFzXG5cdCAgLy8gdGhlaXIgb25seSBzaWRlIGVmZmVjdCwgd2UgZG9uJ3QgbmVlZCB0aGUgc2FtZSBjb21wbGljYXRlZFxuXHQgIC8vIHJlbW92YWwgbG9naWMgbGlrZSBpbiByZW1vdmUoKVxuXHQgIHJlbW92ZVNweTogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICB0aGlzLl9zcGllcyA9IHJlbW92ZSh0aGlzLl9zcGllcywgdGhpcy5fc3BpZXMuaW5kZXhPZihmbikpO1xuXHQgICAgcmV0dXJuIHRoaXMuX3NwaWVzLmxlbmd0aDtcblx0ICB9LFxuXHQgIGRpc3BhdGNoOiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHRoaXMuX2luTG9vcCsrO1xuXHQgICAgZm9yICh2YXIgaSA9IDAsIHNwaWVzID0gdGhpcy5fc3BpZXM7IHRoaXMuX3NwaWVzICE9PSBudWxsICYmIGkgPCBzcGllcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICBzcGllc1tpXShldmVudCk7XG5cdCAgICB9XG5cblx0ICAgIGZvciAodmFyIF9pID0gMCwgaXRlbXMgPSB0aGlzLl9pdGVtczsgX2kgPCBpdGVtcy5sZW5ndGg7IF9pKyspIHtcblxuXHQgICAgICAvLyBjbGVhbnVwIHdhcyBjYWxsZWRcblx0ICAgICAgaWYgKHRoaXMuX2l0ZW1zID09PSBudWxsKSB7XG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgIH1cblxuXHQgICAgICAvLyB0aGlzIHN1YnNjcmliZXIgd2FzIHJlbW92ZWRcblx0ICAgICAgaWYgKHRoaXMuX3JlbW92ZWRJdGVtcyAhPT0gbnVsbCAmJiBjb250YWlucyh0aGlzLl9yZW1vdmVkSXRlbXMsIGl0ZW1zW19pXSkpIHtcblx0ICAgICAgICBjb250aW51ZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKGl0ZW1zW19pXS50eXBlLCBpdGVtc1tfaV0uZm4sIGV2ZW50KTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2luTG9vcC0tO1xuXHQgICAgaWYgKHRoaXMuX2luTG9vcCA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgY2xlYW51cDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5faXRlbXMgPSBudWxsO1xuXHQgICAgdGhpcy5fc3BpZXMgPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gT2JzZXJ2YWJsZSgpIHtcblx0ICB0aGlzLl9kaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIoKTtcblx0ICB0aGlzLl9hY3RpdmUgPSBmYWxzZTtcblx0ICB0aGlzLl9hbGl2ZSA9IHRydWU7XG5cdCAgdGhpcy5fYWN0aXZhdGluZyA9IGZhbHNlO1xuXHQgIHRoaXMuX2xvZ0hhbmRsZXJzID0gbnVsbDtcblx0ICB0aGlzLl9zcHlIYW5kbGVycyA9IG51bGw7XG5cdH1cblxuXHRleHRlbmQoT2JzZXJ2YWJsZS5wcm90b3R5cGUsIHtcblxuXHQgIF9uYW1lOiAnb2JzZXJ2YWJsZScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7fSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9zZXRBY3RpdmU6IGZ1bmN0aW9uIChhY3RpdmUpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUgIT09IGFjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG5cdCAgICAgIGlmIChhY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9hY3RpdmF0aW5nID0gdHJ1ZTtcblx0ICAgICAgICB0aGlzLl9vbkFjdGl2YXRpb24oKTtcblx0ICAgICAgICB0aGlzLl9hY3RpdmF0aW5nID0gZmFsc2U7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fb25EZWFjdGl2YXRpb24oKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9zZXRBY3RpdmUoZmFsc2UpO1xuXHQgICAgdGhpcy5fZGlzcGF0Y2hlci5jbGVhbnVwKCk7XG5cdCAgICB0aGlzLl9kaXNwYXRjaGVyID0gbnVsbDtcblx0ICAgIHRoaXMuX2xvZ0hhbmRsZXJzID0gbnVsbDtcblx0ICB9LFxuXHQgIF9lbWl0OiBmdW5jdGlvbiAodHlwZSwgeCkge1xuXHQgICAgc3dpdGNoICh0eXBlKSB7XG5cdCAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgcmV0dXJuIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgICBjYXNlIEVORDpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRWYWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdEVycm9yOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fYWxpdmUgPSBmYWxzZTtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IEVORCB9KTtcblx0ICAgICAgdGhpcy5fY2xlYXIoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5hZGQodHlwZSwgZm4pO1xuXHQgICAgICB0aGlzLl9zZXRBY3RpdmUodHJ1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgeyB0eXBlOiBFTkQgfSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIF9vZmY6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHZhciBjb3VudCA9IHRoaXMuX2Rpc3BhdGNoZXIucmVtb3ZlKHR5cGUsIGZuKTtcblx0ICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fc2V0QWN0aXZlKGZhbHNlKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBvblZhbHVlOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihWQUxVRSwgZm4pO1xuXHQgIH0sXG5cdCAgb25FcnJvcjogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb24oRVJST1IsIGZuKTtcblx0ICB9LFxuXHQgIG9uRW5kOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihFTkQsIGZuKTtcblx0ICB9LFxuXHQgIG9uQW55OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihBTlksIGZuKTtcblx0ICB9LFxuXHQgIG9mZlZhbHVlOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoVkFMVUUsIGZuKTtcblx0ICB9LFxuXHQgIG9mZkVycm9yOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoRVJST1IsIGZuKTtcblx0ICB9LFxuXHQgIG9mZkVuZDogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb2ZmKEVORCwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmQW55OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoQU5ZLCBmbik7XG5cdCAgfSxcblx0ICBvYnNlcnZlOiBmdW5jdGlvbiAob2JzZXJ2ZXJPck9uVmFsdWUsIG9uRXJyb3IsIG9uRW5kKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXHQgICAgdmFyIGNsb3NlZCA9IGZhbHNlO1xuXG5cdCAgICB2YXIgb2JzZXJ2ZXIgPSAhb2JzZXJ2ZXJPck9uVmFsdWUgfHwgdHlwZW9mIG9ic2VydmVyT3JPblZhbHVlID09PSAnZnVuY3Rpb24nID8geyB2YWx1ZTogb2JzZXJ2ZXJPck9uVmFsdWUsIGVycm9yOiBvbkVycm9yLCBlbmQ6IG9uRW5kIH0gOiBvYnNlcnZlck9yT25WYWx1ZTtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFICYmIG9ic2VydmVyLnZhbHVlKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIudmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SICYmIG9ic2VydmVyLmVycm9yKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVORCAmJiBvYnNlcnZlci5lbmQpIHtcblx0ICAgICAgICBvYnNlcnZlci5lbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICB0aGlzLm9uQW55KGhhbmRsZXIpO1xuXG5cdCAgICByZXR1cm4ge1xuXHQgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIGlmICghY2xvc2VkKSB7XG5cdCAgICAgICAgICBfdGhpcy5vZmZBbnkoaGFuZGxlcik7XG5cdCAgICAgICAgICBjbG9zZWQgPSB0cnVlO1xuXHQgICAgICAgIH1cblx0ICAgICAgfSxcblxuXHQgICAgICBnZXQgY2xvc2VkKCkge1xuXHQgICAgICAgIHJldHVybiBjbG9zZWQ7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgfSxcblxuXG5cdCAgLy8gQSBhbmQgQiBtdXN0IGJlIHN1YmNsYXNzZXMgb2YgU3RyZWFtIGFuZCBQcm9wZXJ0eSAob3JkZXIgZG9lc24ndCBtYXR0ZXIpXG5cdCAgX29mU2FtZVR5cGU6IGZ1bmN0aW9uIChBLCBCKSB7XG5cdCAgICByZXR1cm4gQS5wcm90b3R5cGUuZ2V0VHlwZSgpID09PSB0aGlzLmdldFR5cGUoKSA/IEEgOiBCO1xuXHQgIH0sXG5cdCAgc2V0TmFtZTogZnVuY3Rpb24gKHNvdXJjZU9icyAvKiBvcHRpb25hbCAqLywgc2VsZk5hbWUpIHtcblx0ICAgIHRoaXMuX25hbWUgPSBzZWxmTmFtZSA/IHNvdXJjZU9icy5fbmFtZSArICcuJyArIHNlbGZOYW1lIDogc291cmNlT2JzO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBsb2c6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cblx0ICAgIHZhciBpc0N1cnJlbnQgPSB2b2lkIDA7XG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICB2YXIgdHlwZSA9ICc8JyArIGV2ZW50LnR5cGUgKyAoaXNDdXJyZW50ID8gJzpjdXJyZW50JyA6ICcnKSArICc+Jztcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNvbnNvbGUubG9nKG5hbWUsIHR5cGUpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIGNvbnNvbGUubG9nKG5hbWUsIHR5cGUsIGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIGlmICghdGhpcy5fbG9nSGFuZGxlcnMpIHtcblx0ICAgICAgICB0aGlzLl9sb2dIYW5kbGVycyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzLnB1c2goeyBuYW1lOiBuYW1lLCBoYW5kbGVyOiBoYW5kbGVyIH0pO1xuXHQgICAgfVxuXG5cdCAgICBpc0N1cnJlbnQgPSB0cnVlO1xuXHQgICAgdGhpcy5vbkFueShoYW5kbGVyKTtcblx0ICAgIGlzQ3VycmVudCA9IGZhbHNlO1xuXG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIG9mZkxvZzogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIG5hbWUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRvU3RyaW5nKCkgOiBhcmd1bWVudHNbMF07XG5cblxuXHQgICAgaWYgKHRoaXMuX2xvZ0hhbmRsZXJzKSB7XG5cdCAgICAgIHZhciBoYW5kbGVySW5kZXggPSBmaW5kQnlQcmVkKHRoaXMuX2xvZ0hhbmRsZXJzLCBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICAgICAgcmV0dXJuIG9iai5uYW1lID09PSBuYW1lO1xuXHQgICAgICB9KTtcblx0ICAgICAgaWYgKGhhbmRsZXJJbmRleCAhPT0gLTEpIHtcblx0ICAgICAgICB0aGlzLm9mZkFueSh0aGlzLl9sb2dIYW5kbGVyc1toYW5kbGVySW5kZXhdLmhhbmRsZXIpO1xuXHQgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzLnNwbGljZShoYW5kbGVySW5kZXgsIDEpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgc3B5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgdmFyIHR5cGUgPSAnPCcgKyBldmVudC50eXBlICsgJz4nO1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIGlmICghdGhpcy5fc3B5SGFuZGxlcnMpIHtcblx0ICAgICAgICB0aGlzLl9zcHlIYW5kbGVycyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3NweUhhbmRsZXJzLnB1c2goeyBuYW1lOiBuYW1lLCBoYW5kbGVyOiBoYW5kbGVyIH0pO1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmFkZFNweShoYW5kbGVyKTtcblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgb2ZmU3B5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgaWYgKHRoaXMuX3NweUhhbmRsZXJzKSB7XG5cdCAgICAgIHZhciBoYW5kbGVySW5kZXggPSBmaW5kQnlQcmVkKHRoaXMuX3NweUhhbmRsZXJzLCBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICAgICAgcmV0dXJuIG9iai5uYW1lID09PSBuYW1lO1xuXHQgICAgICB9KTtcblx0ICAgICAgaWYgKGhhbmRsZXJJbmRleCAhPT0gLTEpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLnJlbW92ZVNweSh0aGlzLl9zcHlIYW5kbGVyc1toYW5kbGVySW5kZXhdLmhhbmRsZXIpO1xuXHQgICAgICAgIHRoaXMuX3NweUhhbmRsZXJzLnNwbGljZShoYW5kbGVySW5kZXgsIDEpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9XG5cdH0pO1xuXG5cdC8vIGV4dGVuZCgpIGNhbid0IGhhbmRsZSBgdG9TdHJpbmdgIGluIElFOFxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gJ1snICsgdGhpcy5fbmFtZSArICddJztcblx0fTtcblxuXHRmdW5jdGlvbiBTdHJlYW0oKSB7XG5cdCAgT2JzZXJ2YWJsZS5jYWxsKHRoaXMpO1xuXHR9XG5cblx0aW5oZXJpdChTdHJlYW0sIE9ic2VydmFibGUsIHtcblxuXHQgIF9uYW1lOiAnc3RyZWFtJyxcblxuXHQgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiAnc3RyZWFtJztcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIFByb3BlcnR5KCkge1xuXHQgIE9ic2VydmFibGUuY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSBudWxsO1xuXHR9XG5cblx0aW5oZXJpdChQcm9wZXJ0eSwgT2JzZXJ2YWJsZSwge1xuXG5cdCAgX25hbWU6ICdwcm9wZXJ0eScsXG5cblx0ICBfZW1pdFZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfTtcblx0ICAgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RXJyb3I6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9O1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9hbGl2ZSA9IGZhbHNlO1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRU5EIH0pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2NsZWFyKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb246IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuYWRkKHR5cGUsIGZuKTtcblx0ICAgICAgdGhpcy5fc2V0QWN0aXZlKHRydWUpO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRFdmVudCAhPT0gbnVsbCkge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgdGhpcy5fY3VycmVudEV2ZW50KTtcblx0ICAgIH1cblx0ICAgIGlmICghdGhpcy5fYWxpdmUpIHtcblx0ICAgICAgY2FsbFN1YnNjcmliZXIodHlwZSwgZm4sIHsgdHlwZTogRU5EIH0pO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBnZXRUeXBlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gJ3Byb3BlcnR5Jztcblx0ICB9XG5cdH0pO1xuXG5cdHZhciBuZXZlclMgPSBuZXcgU3RyZWFtKCk7XG5cdG5ldmVyUy5fZW1pdEVuZCgpO1xuXHRuZXZlclMuX25hbWUgPSAnbmV2ZXInO1xuXG5cdGZ1bmN0aW9uIG5ldmVyKCkge1xuXHQgIHJldHVybiBuZXZlclM7XG5cdH1cblxuXHRmdW5jdGlvbiB0aW1lQmFzZWQobWl4aW4pIHtcblxuXHQgIGZ1bmN0aW9uIEFub255bW91c1N0cmVhbSh3YWl0LCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3dhaXQgPSB3YWl0O1xuXHQgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB0aGlzLl8kb25UaWNrID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX29uVGljaygpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuX2luaXQob3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgaW5oZXJpdChBbm9ueW1vdXNTdHJlYW0sIFN0cmVhbSwge1xuXHQgICAgX2luaXQ6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgX2ZyZWU6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgX29uVGljazogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIH0sXG5cdCAgICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQgIT09IG51bGwpIHtcblx0ICAgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICAgIHRoaXMuXyRvblRpY2sgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cdCAgfSwgbWl4aW4pO1xuXG5cdCAgcmV0dXJuIEFub255bW91c1N0cmVhbTtcblx0fVxuXG5cdHZhciBTID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnbGF0ZXInLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgeCA9IF9yZWYueDtcblxuXHQgICAgdGhpcy5feCA9IHg7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5feCA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5feCk7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBsYXRlcih3YWl0LCB4KSB7XG5cdCAgcmV0dXJuIG5ldyBTKHdhaXQsIHsgeDogeCB9KTtcblx0fVxuXG5cdHZhciBTJDEgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdpbnRlcnZhbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB4ID0gX3JlZi54O1xuXG5cdCAgICB0aGlzLl94ID0geDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94ID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94KTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGludGVydmFsKHdhaXQsIHgpIHtcblx0ICByZXR1cm4gbmV3IFMkMSh3YWl0LCB7IHg6IHggfSk7XG5cdH1cblxuXHR2YXIgUyQyID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnc2VxdWVudGlhbGx5JyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIHhzID0gX3JlZi54cztcblxuXHQgICAgdGhpcy5feHMgPSBjbG9uZUFycmF5KHhzKTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94cyA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5feHMubGVuZ3RoID09PSAxKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94c1swXSk7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94cy5zaGlmdCgpKTtcblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHNlcXVlbnRpYWxseSh3YWl0LCB4cykge1xuXHQgIHJldHVybiB4cy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IFMkMih3YWl0LCB7IHhzOiB4cyB9KTtcblx0fVxuXG5cdHZhciBTJDMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdmcm9tUG9sbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoZm4oKSk7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBmcm9tUG9sbCh3YWl0LCBmbikge1xuXHQgIHJldHVybiBuZXcgUyQzKHdhaXQsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gZW1pdHRlcihvYnMpIHtcblxuXHQgIGZ1bmN0aW9uIHZhbHVlKHgpIHtcblx0ICAgIG9icy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGVycm9yKHgpIHtcblx0ICAgIG9icy5fZW1pdEVycm9yKHgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGVuZCgpIHtcblx0ICAgIG9icy5fZW1pdEVuZCgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGV2ZW50KGUpIHtcblx0ICAgIG9icy5fZW1pdChlLnR5cGUsIGUudmFsdWUpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIHJldHVybiB7XG5cdCAgICB2YWx1ZTogdmFsdWUsXG5cdCAgICBlcnJvcjogZXJyb3IsXG5cdCAgICBlbmQ6IGVuZCxcblx0ICAgIGV2ZW50OiBldmVudCxcblxuXHQgICAgLy8gbGVnYWN5XG5cdCAgICBlbWl0OiB2YWx1ZSxcblx0ICAgIGVtaXRFdmVudDogZXZlbnRcblx0ICB9O1xuXHR9XG5cblx0dmFyIFMkNCA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ3dpdGhJbnRlcnZhbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gZW1pdHRlcih0aGlzKTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgZm4odGhpcy5fZW1pdHRlcik7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiB3aXRoSW50ZXJ2YWwod2FpdCwgZm4pIHtcblx0ICByZXR1cm4gbmV3IFMkNCh3YWl0LCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIFMkNShmbikge1xuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2ZuID0gZm47XG5cdCAgdGhpcy5fdW5zdWJzY3JpYmUgPSBudWxsO1xuXHR9XG5cblx0aW5oZXJpdChTJDUsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdzdHJlYW0nLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgdW5zdWJzY3JpYmUgPSBmbihlbWl0dGVyKHRoaXMpKTtcblx0ICAgIHRoaXMuX3Vuc3Vic2NyaWJlID0gdHlwZW9mIHVuc3Vic2NyaWJlID09PSAnZnVuY3Rpb24nID8gdW5zdWJzY3JpYmUgOiBudWxsO1xuXG5cdCAgICAvLyBmaXggaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8zNVxuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fY2FsbFVuc3Vic2NyaWJlKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfY2FsbFVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fdW5zdWJzY3JpYmUgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUoKTtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9jYWxsVW5zdWJzY3JpYmUoKTtcblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHN0cmVhbShmbikge1xuXHQgIHJldHVybiBuZXcgUyQ1KGZuKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21DYWxsYmFjayhjYWxsYmFja0NvbnN1bWVyKSB7XG5cblx0ICB2YXIgY2FsbGVkID0gZmFsc2U7XG5cblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIGNhbGxiYWNrQ29uc3VtZXIoZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbUNhbGxiYWNrJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tTm9kZUNhbGxiYWNrKGNhbGxiYWNrQ29uc3VtZXIpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgY2FsbGJhY2tDb25zdW1lcihmdW5jdGlvbiAoZXJyb3IsIHgpIHtcblx0ICAgICAgICBpZiAoZXJyb3IpIHtcblx0ICAgICAgICAgIGVtaXR0ZXIuZXJyb3IoZXJyb3IpO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgfVxuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH0pO1xuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pLnNldE5hbWUoJ2Zyb21Ob2RlQ2FsbGJhY2snKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNwcmVhZChmbiwgbGVuZ3RoKSB7XG5cdCAgc3dpdGNoIChsZW5ndGgpIHtcblx0ICAgIGNhc2UgMDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICByZXR1cm4gZm4oKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMTpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAyOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDM6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgNDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0sIGFbM10pO1xuXHQgICAgICB9O1xuXHQgICAgZGVmYXVsdDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGEpO1xuXHQgICAgICB9O1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGFwcGx5KGZuLCBjLCBhKSB7XG5cdCAgdmFyIGFMZW5ndGggPSBhID8gYS5sZW5ndGggOiAwO1xuXHQgIGlmIChjID09IG51bGwpIHtcblx0ICAgIHN3aXRjaCAoYUxlbmd0aCkge1xuXHQgICAgICBjYXNlIDA6XG5cdCAgICAgICAgcmV0dXJuIGZuKCk7XG5cdCAgICAgIGNhc2UgMTpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSk7XG5cdCAgICAgIGNhc2UgMjpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSk7XG5cdCAgICAgIGNhc2UgMzpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSk7XG5cdCAgICAgIGNhc2UgNDpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG5cdCAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGEpO1xuXHQgICAgfVxuXHQgIH0gZWxzZSB7XG5cdCAgICBzd2l0Y2ggKGFMZW5ndGgpIHtcblx0ICAgICAgY2FzZSAwOlxuXHQgICAgICAgIHJldHVybiBmbi5jYWxsKGMpO1xuXHQgICAgICBkZWZhdWx0OlxuXHQgICAgICAgIHJldHVybiBmbi5hcHBseShjLCBhKTtcblx0ICAgIH1cblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tU3ViVW5zdWIoc3ViLCB1bnN1YiwgdHJhbnNmb3JtZXIgLyogRnVuY3Rpb24gfCBmYWxzZXkgKi8pIHtcblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cblx0ICAgIHZhciBoYW5kbGVyID0gdHJhbnNmb3JtZXIgPyBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGVtaXR0ZXIuZW1pdChhcHBseSh0cmFuc2Zvcm1lciwgdGhpcywgYXJndW1lbnRzKSk7XG5cdCAgICB9IDogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgfTtcblxuXHQgICAgc3ViKGhhbmRsZXIpO1xuXHQgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIHVuc3ViKGhhbmRsZXIpO1xuXHQgICAgfTtcblx0ICB9KS5zZXROYW1lKCdmcm9tU3ViVW5zdWInKTtcblx0fVxuXG5cdHZhciBwYWlycyA9IFtbJ2FkZEV2ZW50TGlzdGVuZXInLCAncmVtb3ZlRXZlbnRMaXN0ZW5lciddLCBbJ2FkZExpc3RlbmVyJywgJ3JlbW92ZUxpc3RlbmVyJ10sIFsnb24nLCAnb2ZmJ11dO1xuXG5cdGZ1bmN0aW9uIGZyb21FdmVudHModGFyZ2V0LCBldmVudE5hbWUsIHRyYW5zZm9ybWVyKSB7XG5cdCAgdmFyIHN1YiA9IHZvaWQgMCxcblx0ICAgICAgdW5zdWIgPSB2b2lkIDA7XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAodHlwZW9mIHRhcmdldFtwYWlyc1tpXVswXV0gPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHRhcmdldFtwYWlyc1tpXVsxXV0gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgICAgc3ViID0gcGFpcnNbaV1bMF07XG5cdCAgICAgIHVuc3ViID0gcGFpcnNbaV1bMV07XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfVxuXHQgIH1cblxuXHQgIGlmIChzdWIgPT09IHVuZGVmaW5lZCkge1xuXHQgICAgdGhyb3cgbmV3IEVycm9yKCd0YXJnZXQgZG9uXFwndCBzdXBwb3J0IGFueSBvZiAnICsgJ2FkZEV2ZW50TGlzdGVuZXIvcmVtb3ZlRXZlbnRMaXN0ZW5lciwgYWRkTGlzdGVuZXIvcmVtb3ZlTGlzdGVuZXIsIG9uL29mZiBtZXRob2QgcGFpcicpO1xuXHQgIH1cblxuXHQgIHJldHVybiBmcm9tU3ViVW5zdWIoZnVuY3Rpb24gKGhhbmRsZXIpIHtcblx0ICAgIHJldHVybiB0YXJnZXRbc3ViXShldmVudE5hbWUsIGhhbmRsZXIpO1xuXHQgIH0sIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG5cdCAgICByZXR1cm4gdGFyZ2V0W3Vuc3ViXShldmVudE5hbWUsIGhhbmRsZXIpO1xuXHQgIH0sIHRyYW5zZm9ybWVyKS5zZXROYW1lKCdmcm9tRXZlbnRzJyk7XG5cdH1cblxuXHQvLyBIQUNLOlxuXHQvLyAgIFdlIGRvbid0IGNhbGwgcGFyZW50IENsYXNzIGNvbnN0cnVjdG9yLCBidXQgaW5zdGVhZCBwdXR0aW5nIGFsbCBuZWNlc3Nhcnlcblx0Ly8gICBwcm9wZXJ0aWVzIGludG8gcHJvdG90eXBlIHRvIHNpbXVsYXRlIGVuZGVkIFByb3BlcnR5XG5cdC8vICAgKHNlZSBQcm9wcGVydHkgYW5kIE9ic2VydmFibGUgY2xhc3NlcykuXG5cblx0ZnVuY3Rpb24gUCh2YWx1ZSkge1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogJ3ZhbHVlJywgdmFsdWU6IHZhbHVlLCBjdXJyZW50OiB0cnVlIH07XG5cdH1cblxuXHRpbmhlcml0KFAsIFByb3BlcnR5LCB7XG5cdCAgX25hbWU6ICdjb25zdGFudCcsXG5cdCAgX2FjdGl2ZTogZmFsc2UsXG5cdCAgX2FjdGl2YXRpbmc6IGZhbHNlLFxuXHQgIF9hbGl2ZTogZmFsc2UsXG5cdCAgX2Rpc3BhdGNoZXI6IG51bGwsXG5cdCAgX2xvZ0hhbmRsZXJzOiBudWxsXG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbnN0YW50KHgpIHtcblx0ICByZXR1cm4gbmV3IFAoeCk7XG5cdH1cblxuXHQvLyBIQUNLOlxuXHQvLyAgIFdlIGRvbid0IGNhbGwgcGFyZW50IENsYXNzIGNvbnN0cnVjdG9yLCBidXQgaW5zdGVhZCBwdXR0aW5nIGFsbCBuZWNlc3Nhcnlcblx0Ly8gICBwcm9wZXJ0aWVzIGludG8gcHJvdG90eXBlIHRvIHNpbXVsYXRlIGVuZGVkIFByb3BlcnR5XG5cdC8vICAgKHNlZSBQcm9wcGVydHkgYW5kIE9ic2VydmFibGUgY2xhc3NlcykuXG5cblx0ZnVuY3Rpb24gUCQxKHZhbHVlKSB7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiAnZXJyb3InLCB2YWx1ZTogdmFsdWUsIGN1cnJlbnQ6IHRydWUgfTtcblx0fVxuXG5cdGluaGVyaXQoUCQxLCBQcm9wZXJ0eSwge1xuXHQgIF9uYW1lOiAnY29uc3RhbnRFcnJvcicsXG5cdCAgX2FjdGl2ZTogZmFsc2UsXG5cdCAgX2FjdGl2YXRpbmc6IGZhbHNlLFxuXHQgIF9hbGl2ZTogZmFsc2UsXG5cdCAgX2Rpc3BhdGNoZXI6IG51bGwsXG5cdCAgX2xvZ0hhbmRsZXJzOiBudWxsXG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbnN0YW50RXJyb3IoeCkge1xuXHQgIHJldHVybiBuZXcgUCQxKHgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29uc3RydWN0b3IoQmFzZUNsYXNzLCBuYW1lKSB7XG5cdCAgcmV0dXJuIGZ1bmN0aW9uIEFub255bW91c09ic2VydmFibGUoc291cmNlLCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBCYXNlQ2xhc3MuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZTtcblx0ICAgIHRoaXMuX25hbWUgPSBzb3VyY2UuX25hbWUgKyAnLicgKyBuYW1lO1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICAgIHRoaXMuXyRoYW5kbGVBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ2xhc3NNZXRob2RzKEJhc2VDbGFzcykge1xuXHQgIHJldHVybiB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlRW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH0sXG5cdCAgICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgQmFzZUNsYXNzLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZUFueSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlU3RyZWFtKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFMgPSBjcmVhdGVDb25zdHJ1Y3RvcihTdHJlYW0sIG5hbWUpO1xuXHQgIGluaGVyaXQoUywgU3RyZWFtLCBjcmVhdGVDbGFzc01ldGhvZHMoU3RyZWFtKSwgbWl4aW4pO1xuXHQgIHJldHVybiBTO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlUHJvcGVydHkobmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUCA9IGNyZWF0ZUNvbnN0cnVjdG9yKFByb3BlcnR5LCBuYW1lKTtcblx0ICBpbmhlcml0KFAsIFByb3BlcnR5LCBjcmVhdGVDbGFzc01ldGhvZHMoUHJvcGVydHkpLCBtaXhpbik7XG5cdCAgcmV0dXJuIFA7XG5cdH1cblxuXHR2YXIgUCQyID0gY3JlYXRlUHJvcGVydHkoJ3RvUHJvcGVydHknLCB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9nZXRJbml0aWFsQ3VycmVudCA9IGZuO1xuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2dldEluaXRpYWxDdXJyZW50ICE9PSBudWxsKSB7XG5cdCAgICAgIHZhciBnZXRJbml0aWFsID0gdGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQ7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShnZXRJbml0aWFsKCkpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpOyAvLyBjb3BpZWQgZnJvbSBwYXR0ZXJucy9vbmUtc291cmNlXG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiB0b1Byb3BlcnR5KG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IG51bGwgOiBhcmd1bWVudHNbMV07XG5cblx0ICBpZiAoZm4gIT09IG51bGwgJiYgdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBzaG91bGQgY2FsbCB0b1Byb3BlcnR5KCkgd2l0aCBhIGZ1bmN0aW9uIG9yIG5vIGFyZ3VtZW50cy4nKTtcblx0ICB9XG5cdCAgcmV0dXJuIG5ldyBQJDIob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBTJDYgPSBjcmVhdGVTdHJlYW0oJ2NoYW5nZXMnLCB7XG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBjaGFuZ2VzKG9icykge1xuXHQgIHJldHVybiBuZXcgUyQ2KG9icyk7XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tUHJvbWlzZShwcm9taXNlKSB7XG5cblx0ICB2YXIgY2FsbGVkID0gZmFsc2U7XG5cblx0ICB2YXIgcmVzdWx0ID0gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICB2YXIgb25WYWx1ZSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH07XG5cdCAgICAgIHZhciBvbkVycm9yID0gZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVycm9yKHgpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH07XG5cdCAgICAgIHZhciBfcHJvbWlzZSA9IHByb21pc2UudGhlbihvblZhbHVlLCBvbkVycm9yKTtcblxuXHQgICAgICAvLyBwcmV2ZW50IGxpYnJhcmllcyBsaWtlICdRJyBvciAnd2hlbicgZnJvbSBzd2FsbG93aW5nIGV4Y2VwdGlvbnNcblx0ICAgICAgaWYgKF9wcm9taXNlICYmIHR5cGVvZiBfcHJvbWlzZS5kb25lID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICAgICAgX3Byb21pc2UuZG9uZSgpO1xuXHQgICAgICB9XG5cblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KTtcblxuXHQgIHJldHVybiB0b1Byb3BlcnR5KHJlc3VsdCwgbnVsbCkuc2V0TmFtZSgnZnJvbVByb21pc2UnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldEdsb2RhbFByb21pc2UoKSB7XG5cdCAgaWYgKHR5cGVvZiBQcm9taXNlID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gUHJvbWlzZTtcblx0ICB9IGVsc2Uge1xuXHQgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpc25cXCd0IGRlZmF1bHQgUHJvbWlzZSwgdXNlIHNoaW0gb3IgcGFyYW1ldGVyJyk7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gdG9Qcm9taXNlIChvYnMpIHtcblx0ICB2YXIgUHJvbWlzZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGdldEdsb2RhbFByb21pc2UoKSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHZhciBsYXN0ID0gbnVsbDtcblx0ICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgb2JzLm9uQW55KGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIGxhc3QgIT09IG51bGwpIHtcblx0ICAgICAgICAobGFzdC50eXBlID09PSBWQUxVRSA/IHJlc29sdmUgOiByZWplY3QpKGxhc3QudmFsdWUpO1xuXHQgICAgICAgIGxhc3QgPSBudWxsO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIGxhc3QgPSBldmVudDtcblx0ICAgICAgfVxuXHQgICAgfSk7XG5cdCAgfSk7XG5cdH1cblxuXHR2YXIgY29tbW9uanNHbG9iYWwgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHt9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29tbW9uanNNb2R1bGUoZm4sIG1vZHVsZSkge1xuXHRcdHJldHVybiBtb2R1bGUgPSB7IGV4cG9ydHM6IHt9IH0sIGZuKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMpLCBtb2R1bGUuZXhwb3J0cztcblx0fVxuXG5cdHZhciBwb255ZmlsbCA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuXHRcdHZhbHVlOiB0cnVlXG5cdH0pO1xuXHRleHBvcnRzWydkZWZhdWx0J10gPSBzeW1ib2xPYnNlcnZhYmxlUG9ueWZpbGw7XG5cdGZ1bmN0aW9uIHN5bWJvbE9ic2VydmFibGVQb255ZmlsbChyb290KSB7XG5cdFx0dmFyIHJlc3VsdDtcblx0XHR2YXIgX1N5bWJvbCA9IHJvb3QuU3ltYm9sO1xuXG5cdFx0aWYgKHR5cGVvZiBfU3ltYm9sID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRpZiAoX1N5bWJvbC5vYnNlcnZhYmxlKSB7XG5cdFx0XHRcdHJlc3VsdCA9IF9TeW1ib2wub2JzZXJ2YWJsZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJlc3VsdCA9IF9TeW1ib2woJ29ic2VydmFibGUnKTtcblx0XHRcdFx0X1N5bWJvbC5vYnNlcnZhYmxlID0gcmVzdWx0O1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSAnQEBvYnNlcnZhYmxlJztcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9O1xuXHR9KTtcblxuXHR2YXIgcmVxdWlyZSQkMCQxID0gKHBvbnlmaWxsICYmIHR5cGVvZiBwb255ZmlsbCA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIHBvbnlmaWxsID8gcG9ueWZpbGxbJ2RlZmF1bHQnXSA6IHBvbnlmaWxsKTtcblxuXHR2YXIgaW5kZXgkMSA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuXHRcdHZhbHVlOiB0cnVlXG5cdH0pO1xuXG5cdHZhciBfcG9ueWZpbGwgPSByZXF1aXJlJCQwJDE7XG5cblx0dmFyIF9wb255ZmlsbDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9wb255ZmlsbCk7XG5cblx0ZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHtcblx0XHRyZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9O1xuXHR9XG5cblx0dmFyIHJvb3QgPSB1bmRlZmluZWQ7IC8qIGdsb2JhbCB3aW5kb3cgKi9cblxuXHRpZiAodHlwZW9mIGNvbW1vbmpzR2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHJvb3QgPSBjb21tb25qc0dsb2JhbDtcblx0fSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHJvb3QgPSB3aW5kb3c7XG5cdH1cblxuXHR2YXIgcmVzdWx0ID0gKDAsIF9wb255ZmlsbDJbJ2RlZmF1bHQnXSkocm9vdCk7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IHJlc3VsdDtcblx0fSk7XG5cblx0dmFyIHJlcXVpcmUkJDAgPSAoaW5kZXgkMSAmJiB0eXBlb2YgaW5kZXgkMSA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIGluZGV4JDEgPyBpbmRleCQxWydkZWZhdWx0J10gOiBpbmRleCQxKTtcblxuXHR2YXIgaW5kZXggPSBjcmVhdGVDb21tb25qc01vZHVsZShmdW5jdGlvbiAobW9kdWxlKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSQkMDtcblx0fSk7XG5cblx0dmFyICQkb2JzZXJ2YWJsZSA9IChpbmRleCAmJiB0eXBlb2YgaW5kZXggPT09ICdvYmplY3QnICYmICdkZWZhdWx0JyBpbiBpbmRleCA/IGluZGV4WydkZWZhdWx0J10gOiBpbmRleCk7XG5cblx0ZnVuY3Rpb24gZnJvbUVTT2JzZXJ2YWJsZShfb2JzZXJ2YWJsZSkge1xuXHQgIHZhciBvYnNlcnZhYmxlID0gX29ic2VydmFibGVbJCRvYnNlcnZhYmxlXSA/IF9vYnNlcnZhYmxlWyQkb2JzZXJ2YWJsZV0oKSA6IF9vYnNlcnZhYmxlO1xuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblx0ICAgIHZhciB1bnN1YiA9IG9ic2VydmFibGUuc3Vic2NyaWJlKHtcblx0ICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnJvcikge1xuXHQgICAgICAgIGVtaXR0ZXIuZXJyb3IoZXJyb3IpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH0sXG5cdCAgICAgIG5leHQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh2YWx1ZSk7XG5cdCAgICAgIH0sXG5cdCAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfSk7XG5cblx0ICAgIGlmICh1bnN1Yi51bnN1YnNjcmliZSkge1xuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIHVuc3ViLnVuc3Vic2NyaWJlKCk7XG5cdCAgICAgIH07XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICByZXR1cm4gdW5zdWI7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbUVTT2JzZXJ2YWJsZScpO1xuXHR9XG5cblx0ZnVuY3Rpb24gRVNPYnNlcnZhYmxlKG9ic2VydmFibGUpIHtcblx0ICB0aGlzLl9vYnNlcnZhYmxlID0gb2JzZXJ2YWJsZS50YWtlRXJyb3JzKDEpO1xuXHR9XG5cblx0ZXh0ZW5kKEVTT2JzZXJ2YWJsZS5wcm90b3R5cGUsIHtcblx0ICBzdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnNlcnZlck9yT25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgb2JzZXJ2ZXIgPSB0eXBlb2Ygb2JzZXJ2ZXJPck9uTmV4dCA9PT0gJ2Z1bmN0aW9uJyA/IHsgbmV4dDogb2JzZXJ2ZXJPck9uTmV4dCwgZXJyb3I6IG9uRXJyb3IsIGNvbXBsZXRlOiBvbkNvbXBsZXRlIH0gOiBvYnNlcnZlck9yT25OZXh0O1xuXG5cdCAgICB2YXIgZm4gPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUgJiYgb2JzZXJ2ZXIubmV4dCkge1xuXHQgICAgICAgIG9ic2VydmVyLm5leHQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SICYmIG9ic2VydmVyLmVycm9yKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVORCAmJiBvYnNlcnZlci5jb21wbGV0ZSkge1xuXHQgICAgICAgIG9ic2VydmVyLmNvbXBsZXRlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgdGhpcy5fb2JzZXJ2YWJsZS5vbkFueShmbik7XG5cdCAgICB2YXIgY2xvc2VkID0gZmFsc2U7XG5cblx0ICAgIHZhciBzdWJzY3JpcHRpb24gPSB7XG5cdCAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgICBfdGhpcy5fb2JzZXJ2YWJsZS5vZmZBbnkoZm4pO1xuXHQgICAgICB9LFxuXHQgICAgICBnZXQgY2xvc2VkKCkge1xuXHQgICAgICAgIHJldHVybiBjbG9zZWQ7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuXHQgIH1cblx0fSk7XG5cblx0Ly8gTmVlZCB0byBhc3NpZ24gZGlyZWN0bHkgYi9jIFN5bWJvbHMgYXJlbid0IGVudW1lcmFibGUuXG5cdEVTT2JzZXJ2YWJsZS5wcm90b3R5cGVbJCRvYnNlcnZhYmxlXSA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gdGhpcztcblx0fTtcblxuXHRmdW5jdGlvbiB0b0VTT2JzZXJ2YWJsZSgpIHtcblx0ICByZXR1cm4gbmV3IEVTT2JzZXJ2YWJsZSh0aGlzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGRlZmF1bHRFcnJvcnNDb21iaW5hdG9yKGVycm9ycykge1xuXHQgIHZhciBsYXRlc3RFcnJvciA9IHZvaWQgMDtcblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IGVycm9ycy5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKGVycm9yc1tpXSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAgIGlmIChsYXRlc3RFcnJvciA9PT0gdW5kZWZpbmVkIHx8IGxhdGVzdEVycm9yLmluZGV4IDwgZXJyb3JzW2ldLmluZGV4KSB7XG5cdCAgICAgICAgbGF0ZXN0RXJyb3IgPSBlcnJvcnNbaV07XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIGxhdGVzdEVycm9yLmVycm9yO1xuXHR9XG5cblx0ZnVuY3Rpb24gQ29tYmluZShhY3RpdmUsIHBhc3NpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fYWN0aXZlQ291bnQgPSBhY3RpdmUubGVuZ3RoO1xuXHQgIHRoaXMuX3NvdXJjZXMgPSBjb25jYXQoYWN0aXZlLCBwYXNzaXZlKTtcblx0ICB0aGlzLl9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IHNwcmVhZChjb21iaW5hdG9yLCB0aGlzLl9zb3VyY2VzLmxlbmd0aCkgOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdCAgfTtcblx0ICB0aGlzLl9hbGl2ZUNvdW50ID0gMDtcblx0ICB0aGlzLl9sYXRlc3RWYWx1ZXMgPSBuZXcgQXJyYXkodGhpcy5fc291cmNlcy5sZW5ndGgpO1xuXHQgIHRoaXMuX2xhdGVzdEVycm9ycyA9IG5ldyBBcnJheSh0aGlzLl9zb3VyY2VzLmxlbmd0aCk7XG5cdCAgZmlsbEFycmF5KHRoaXMuX2xhdGVzdFZhbHVlcywgTk9USElORyk7XG5cdCAgdGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbiA9IGZhbHNlO1xuXHQgIHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbiA9IGZhbHNlO1xuXHQgIHRoaXMuX2xhdGVzdEVycm9ySW5kZXggPSAwO1xuXG5cdCAgdGhpcy5fJGhhbmRsZXJzID0gW107XG5cblx0ICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoaSkge1xuXHQgICAgX3RoaXMuXyRoYW5kbGVycy5wdXNoKGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShpLCBldmVudCk7XG5cdCAgICB9KTtcblx0ICB9O1xuXG5cdCAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBfbG9vcChpKTtcblx0ICB9XG5cdH1cblxuXHRpbmhlcml0KENvbWJpbmUsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdjb21iaW5lJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2FsaXZlQ291bnQgPSB0aGlzLl9hY3RpdmVDb3VudDtcblxuXHQgICAgLy8gd2UgbmVlZCB0byBzdXNjcmliZSB0byBfcGFzc2l2ZV8gc291cmNlcyBiZWZvcmUgX2FjdGl2ZV9cblx0ICAgIC8vIChzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy85OClcblx0ICAgIGZvciAodmFyIGkgPSB0aGlzLl9hY3RpdmVDb3VudDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IHRoaXMuX2FjdGl2ZUNvdW50OyBfaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbX2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tfaV0pO1xuXHQgICAgfVxuXG5cdCAgICBpZiAodGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbikge1xuXHQgICAgICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgICAgIHRoaXMuX2VtaXRJZkZ1bGwoKTtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24pIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fc291cmNlcy5sZW5ndGgsXG5cdCAgICAgICAgaSA9IHZvaWQgMDtcblx0ICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9mZkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRJZkZ1bGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBoYXNBbGxWYWx1ZXMgPSB0cnVlO1xuXHQgICAgdmFyIGhhc0Vycm9ycyA9IGZhbHNlO1xuXHQgICAgdmFyIGxlbmd0aCA9IHRoaXMuX2xhdGVzdFZhbHVlcy5sZW5ndGg7XG5cdCAgICB2YXIgdmFsdWVzQ29weSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXHQgICAgdmFyIGVycm9yc0NvcHkgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblxuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICB2YWx1ZXNDb3B5W2ldID0gdGhpcy5fbGF0ZXN0VmFsdWVzW2ldO1xuXHQgICAgICBlcnJvcnNDb3B5W2ldID0gdGhpcy5fbGF0ZXN0RXJyb3JzW2ldO1xuXG5cdCAgICAgIGlmICh2YWx1ZXNDb3B5W2ldID09PSBOT1RISU5HKSB7XG5cdCAgICAgICAgaGFzQWxsVmFsdWVzID0gZmFsc2U7XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoZXJyb3JzQ29weVtpXSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAgICAgaGFzRXJyb3JzID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICBpZiAoaGFzQWxsVmFsdWVzKSB7XG5cdCAgICAgIHZhciBjb21iaW5hdG9yID0gdGhpcy5fY29tYmluYXRvcjtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGNvbWJpbmF0b3IodmFsdWVzQ29weSkpO1xuXHQgICAgfVxuXHQgICAgaWYgKGhhc0Vycm9ycykge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IoZXJyb3JzQ29weSkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGksIGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSB8fCBldmVudC50eXBlID09PSBFUlJPUikge1xuXG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdFZhbHVlc1tpXSA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdEVycm9yc1tpXSA9IHVuZGVmaW5lZDtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgICB0aGlzLl9sYXRlc3RWYWx1ZXNbaV0gPSBOT1RISU5HO1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdEVycm9yc1tpXSA9IHtcblx0ICAgICAgICAgIGluZGV4OiB0aGlzLl9sYXRlc3RFcnJvckluZGV4KyssXG5cdCAgICAgICAgICBlcnJvcjogZXZlbnQudmFsdWVcblx0ICAgICAgICB9O1xuXHQgICAgICB9XG5cblx0ICAgICAgaWYgKGkgPCB0aGlzLl9hY3RpdmVDb3VudCkge1xuXHQgICAgICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gdHJ1ZTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdElmRnVsbCgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgLy8gRU5EXG5cblx0ICAgICAgaWYgKGkgPCB0aGlzLl9hY3RpdmVDb3VudCkge1xuXHQgICAgICAgIHRoaXMuX2FsaXZlQ291bnQtLTtcblx0ICAgICAgICBpZiAodGhpcy5fYWxpdmVDb3VudCA9PT0gMCkge1xuXHQgICAgICAgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICAgICAgdGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uID0gdHJ1ZTtcblx0ICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgICAgIH1cblx0ICAgICAgICB9XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXN0VmFsdWVzID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhdGVzdEVycm9ycyA9IG51bGw7XG5cdCAgICB0aGlzLl9jb21iaW5hdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVycyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBjb21iaW5lKGFjdGl2ZSkge1xuXHQgIHZhciBwYXNzaXZlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gW10gOiBhcmd1bWVudHNbMV07XG5cdCAgdmFyIGNvbWJpbmF0b3IgPSBhcmd1bWVudHNbMl07XG5cblx0ICBpZiAodHlwZW9mIHBhc3NpdmUgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIGNvbWJpbmF0b3IgPSBwYXNzaXZlO1xuXHQgICAgcGFzc2l2ZSA9IFtdO1xuXHQgIH1cblx0ICByZXR1cm4gYWN0aXZlLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgQ29tYmluZShhY3RpdmUsIHBhc3NpdmUsIGNvbWJpbmF0b3IpO1xuXHR9XG5cblx0dmFyIE9ic2VydmFibGUkMSA9IHtcblx0ICBlbXB0eTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIG5ldmVyKCk7XG5cdCAgfSxcblxuXG5cdCAgLy8gTW9ub2lkIGJhc2VkIG9uIG1lcmdlKCkgc2VlbXMgbW9yZSB1c2VmdWwgdGhhbiBvbmUgYmFzZWQgb24gY29uY2F0KCkuXG5cdCAgY29uY2F0OiBmdW5jdGlvbiAoYSwgYikge1xuXHQgICAgcmV0dXJuIGEubWVyZ2UoYik7XG5cdCAgfSxcblx0ICBvZjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHJldHVybiBjb25zdGFudCh4KTtcblx0ICB9LFxuXHQgIG1hcDogZnVuY3Rpb24gKGZuLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMubWFwKGZuKTtcblx0ICB9LFxuXHQgIGJpbWFwOiBmdW5jdGlvbiAoZm5FcnIsIGZuVmFsLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMubWFwRXJyb3JzKGZuRXJyKS5tYXAoZm5WYWwpO1xuXHQgIH0sXG5cblxuXHQgIC8vIFRoaXMgYXAgc3RyaWN0bHkgc3BlYWtpbmcgaW5jb21wYXRpYmxlIHdpdGggY2hhaW4uIElmIHdlIGRlcml2ZSBhcCBmcm9tIGNoYWluIHdlIGdldFxuXHQgIC8vIGRpZmZlcmVudCAobm90IHZlcnkgdXNlZnVsKSBiZWhhdmlvci4gQnV0IHNwZWMgcmVxdWlyZXMgdGhhdCBpZiBtZXRob2QgY2FuIGJlIGRlcml2ZWRcblx0ICAvLyBpdCBtdXN0IGhhdmUgdGhlIHNhbWUgYmVoYXZpb3IgYXMgaGFuZC13cml0dGVuIG1ldGhvZC4gV2UgaW50ZW50aW9uYWxseSB2aW9sYXRlIHRoZSBzcGVjXG5cdCAgLy8gaW4gaG9wZSB0aGF0IGl0IHdvbid0IGNhdXNlIG1hbnkgdHJvdWJsZXMgaW4gcHJhY3RpY2UuIEFuZCBpbiByZXR1cm4gd2UgaGF2ZSBtb3JlIHVzZWZ1bCB0eXBlLlxuXHQgIGFwOiBmdW5jdGlvbiAob2JzRm4sIG9ic1ZhbCkge1xuXHQgICAgcmV0dXJuIGNvbWJpbmUoW29ic0ZuLCBvYnNWYWxdLCBmdW5jdGlvbiAoZm4sIHZhbCkge1xuXHQgICAgICByZXR1cm4gZm4odmFsKTtcblx0ICAgIH0pO1xuXHQgIH0sXG5cdCAgY2hhaW46IGZ1bmN0aW9uIChmbiwgb2JzKSB7XG5cdCAgICByZXR1cm4gb2JzLmZsYXRNYXAoZm4pO1xuXHQgIH1cblx0fTtcblxuXG5cblx0dmFyIHN0YXRpY0xhbmQgPSBPYmplY3QuZnJlZXplKHtcblx0ICBPYnNlcnZhYmxlOiBPYnNlcnZhYmxlJDFcblx0fSk7XG5cblx0dmFyIG1peGluID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbih4KSk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDcgPSBjcmVhdGVTdHJlYW0oJ21hcCcsIG1peGluKTtcblx0dmFyIFAkMyA9IGNyZWF0ZVByb3BlcnR5KCdtYXAnLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBtYXAkMShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDcsIFAkMykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ4ID0gY3JlYXRlU3RyZWFtKCdmaWx0ZXInLCBtaXhpbiQxKTtcblx0dmFyIFAkNCA9IGNyZWF0ZVByb3BlcnR5KCdmaWx0ZXInLCBtaXhpbiQxKTtcblxuXHR2YXIgaWQkMSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gZmlsdGVyKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDEgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ4LCBQJDQpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbiA9IF9yZWYubjtcblxuXHQgICAgdGhpcy5fbiA9IG47XG5cdCAgICBpZiAobiA8PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX24tLTtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkOSA9IGNyZWF0ZVN0cmVhbSgndGFrZScsIG1peGluJDIpO1xuXHR2YXIgUCQ1ID0gY3JlYXRlUHJvcGVydHkoJ3Rha2UnLCBtaXhpbiQyKTtcblxuXHRmdW5jdGlvbiB0YWtlKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDksIFAkNSkpKG9icywgeyBuOiBuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbiA9IF9yZWYubjtcblxuXHQgICAgdGhpcy5fbiA9IG47XG5cdCAgICBpZiAobiA8PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX24tLTtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTAgPSBjcmVhdGVTdHJlYW0oJ3Rha2VFcnJvcnMnLCBtaXhpbiQzKTtcblx0dmFyIFAkNiA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlRXJyb3JzJywgbWl4aW4kMyk7XG5cblx0ZnVuY3Rpb24gdGFrZUVycm9ycyhvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMCwgUCQ2KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxMSA9IGNyZWF0ZVN0cmVhbSgndGFrZVdoaWxlJywgbWl4aW4kNCk7XG5cdHZhciBQJDcgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZVdoaWxlJywgbWl4aW4kNCk7XG5cblx0dmFyIGlkJDIgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHRha2VXaGlsZShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQyIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTEsIFAkNykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fbGFzdFZhbHVlID0gTk9USElORztcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbGFzdFZhbHVlID0geDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0VmFsdWUgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2xhc3RWYWx1ZSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDEyID0gY3JlYXRlU3RyZWFtKCdsYXN0JywgbWl4aW4kNSk7XG5cdHZhciBQJDggPSBjcmVhdGVQcm9wZXJ0eSgnbGFzdCcsIG1peGluJDUpO1xuXG5cdGZ1bmN0aW9uIGxhc3Qob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTIsIFAkOCkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gTWF0aC5tYXgoMCwgbik7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbiA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9uLS07XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDEzID0gY3JlYXRlU3RyZWFtKCdza2lwJywgbWl4aW4kNik7XG5cdHZhciBQJDkgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcCcsIG1peGluJDYpO1xuXG5cdGZ1bmN0aW9uIHNraXAob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTMsIFAkOSkpKG9icywgeyBuOiBuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDcgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKHRoaXMuX2ZuICE9PSBudWxsICYmICFmbih4KSkge1xuXHQgICAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fZm4gPT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNCA9IGNyZWF0ZVN0cmVhbSgnc2tpcFdoaWxlJywgbWl4aW4kNyk7XG5cdHZhciBQJDEwID0gY3JlYXRlUHJvcGVydHkoJ3NraXBXaGlsZScsIG1peGluJDcpO1xuXG5cdHZhciBpZCQzID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBza2lwV2hpbGUob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkMyA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE0LCBQJDEwKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ4ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3ByZXYgPSBOT1RISU5HO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX3ByZXYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fcHJldiA9PT0gTk9USElORyB8fCAhZm4odGhpcy5fcHJldiwgeCkpIHtcblx0ICAgICAgdGhpcy5fcHJldiA9IHg7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTUgPSBjcmVhdGVTdHJlYW0oJ3NraXBEdXBsaWNhdGVzJywgbWl4aW4kOCk7XG5cdHZhciBQJDExID0gY3JlYXRlUHJvcGVydHkoJ3NraXBEdXBsaWNhdGVzJywgbWl4aW4kOCk7XG5cblx0dmFyIGVxID0gZnVuY3Rpb24gKGEsIGIpIHtcblx0ICByZXR1cm4gYSA9PT0gYjtcblx0fTtcblxuXHRmdW5jdGlvbiBza2lwRHVwbGljYXRlcyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBlcSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE1LCBQJDExKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ5ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblx0ICAgIHZhciBzZWVkID0gX3JlZi5zZWVkO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fcHJldiA9IHNlZWQ7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fcHJldiA9IG51bGw7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fcHJldiAhPT0gTk9USElORykge1xuXHQgICAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHRoaXMuX3ByZXYsIHgpKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3ByZXYgPSB4O1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNiA9IGNyZWF0ZVN0cmVhbSgnZGlmZicsIG1peGluJDkpO1xuXHR2YXIgUCQxMiA9IGNyZWF0ZVByb3BlcnR5KCdkaWZmJywgbWl4aW4kOSk7XG5cblx0ZnVuY3Rpb24gZGVmYXVsdEZuKGEsIGIpIHtcblx0ICByZXR1cm4gW2EsIGJdO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGlmZihvYnMsIGZuKSB7XG5cdCAgdmFyIHNlZWQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyBOT1RISU5HIDogYXJndW1lbnRzWzJdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTYsIFAkMTIpKShvYnMsIHsgZm46IGZuIHx8IGRlZmF1bHRGbiwgc2VlZDogc2VlZCB9KTtcblx0fVxuXG5cdHZhciBQJDEzID0gY3JlYXRlUHJvcGVydHkoJ3NjYW4nLCB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIHNlZWQgPSBfcmVmLnNlZWQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9zZWVkID0gc2VlZDtcblx0ICAgIGlmIChzZWVkICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShzZWVkKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB0aGlzLl9zZWVkID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRFdmVudCA9PT0gbnVsbCB8fCB0aGlzLl9jdXJyZW50RXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3NlZWQgPT09IE5PVEhJTkcgPyB4IDogZm4odGhpcy5fc2VlZCwgeCkpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHRoaXMuX2N1cnJlbnRFdmVudC52YWx1ZSwgeCkpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc2NhbihvYnMsIGZuKSB7XG5cdCAgdmFyIHNlZWQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyBOT1RISU5HIDogYXJndW1lbnRzWzJdO1xuXG5cdCAgcmV0dXJuIG5ldyBQJDEzKG9icywgeyBmbjogZm4sIHNlZWQ6IHNlZWQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHhzID0gZm4oeCk7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4c1tpXSk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE3ID0gY3JlYXRlU3RyZWFtKCdmbGF0dGVuJywgbWl4aW4kMTApO1xuXG5cdHZhciBpZCQ0ID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmbGF0dGVuKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IFMkMTcob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBFTkRfTUFSS0VSID0ge307XG5cblx0dmFyIG1peGluJDExID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSBNYXRoLm1heCgwLCB3YWl0KTtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuXyRzaGlmdEJ1ZmYgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHZhciB2YWx1ZSA9IF90aGlzLl9idWZmLnNoaWZ0KCk7XG5cdCAgICAgIGlmICh2YWx1ZSA9PT0gRU5EX01BUktFUikge1xuXHQgICAgICAgIF90aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgX3RoaXMuX2VtaXRWYWx1ZSh2YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgICB0aGlzLl8kc2hpZnRCdWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgICAgc2V0VGltZW91dCh0aGlzLl8kc2hpZnRCdWZmLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2J1ZmYucHVzaChFTkRfTUFSS0VSKTtcblx0ICAgICAgc2V0VGltZW91dCh0aGlzLl8kc2hpZnRCdWZmLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTggPSBjcmVhdGVTdHJlYW0oJ2RlbGF5JywgbWl4aW4kMTEpO1xuXHR2YXIgUCQxNCA9IGNyZWF0ZVByb3BlcnR5KCdkZWxheScsIG1peGluJDExKTtcblxuXHRmdW5jdGlvbiBkZWxheShvYnMsIHdhaXQpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxOCwgUCQxNCkpKG9icywgeyB3YWl0OiB3YWl0IH0pO1xuXHR9XG5cblx0dmFyIG5vdyA9IERhdGUubm93ID8gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBEYXRlLm5vdygpO1xuXHR9IDogZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0fTtcblxuXHR2YXIgbWl4aW4kMTIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBsZWFkaW5nID0gX3JlZi5sZWFkaW5nO1xuXHQgICAgdmFyIHRyYWlsaW5nID0gX3JlZi50cmFpbGluZztcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5fbGVhZGluZyA9IGxlYWRpbmc7XG5cdCAgICB0aGlzLl90cmFpbGluZyA9IHRyYWlsaW5nO1xuXHQgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fZW5kTGF0ZXIgPSBmYWxzZTtcblx0ICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9IDA7XG5cdCAgICB0aGlzLl8kdHJhaWxpbmdDYWxsID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX3RyYWlsaW5nQ2FsbCgpO1xuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuXyR0cmFpbGluZ0NhbGwgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdmFyIGN1clRpbWUgPSBub3coKTtcblx0ICAgICAgaWYgKHRoaXMuX2xhc3RDYWxsVGltZSA9PT0gMCAmJiAhdGhpcy5fbGVhZGluZykge1xuXHQgICAgICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9IGN1clRpbWU7XG5cdCAgICAgIH1cblx0ICAgICAgdmFyIHJlbWFpbmluZyA9IHRoaXMuX3dhaXQgLSAoY3VyVGltZSAtIHRoaXMuX2xhc3RDYWxsVGltZSk7XG5cdCAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuXHQgICAgICAgIHRoaXMuX2NhbmNlbFRyYWlsaW5nKCk7XG5cdCAgICAgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gY3VyVGltZTtcblx0ICAgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fdHJhaWxpbmcpIHtcblx0ICAgICAgICB0aGlzLl9jYW5jZWxUcmFpbGluZygpO1xuXHQgICAgICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSB4O1xuXHQgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJHRyYWlsaW5nQ2FsbCwgcmVtYWluaW5nKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX2VuZExhdGVyID0gdHJ1ZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jYW5jZWxUcmFpbGluZzogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCAhPT0gbnVsbCkge1xuXHQgICAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dElkKTtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF90cmFpbGluZ0NhbGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl90cmFpbGluZ1ZhbHVlKTtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9ICF0aGlzLl9sZWFkaW5nID8gMCA6IG5vdygpO1xuXHQgICAgaWYgKHRoaXMuX2VuZExhdGVyKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTkgPSBjcmVhdGVTdHJlYW0oJ3Rocm90dGxlJywgbWl4aW4kMTIpO1xuXHR2YXIgUCQxNSA9IGNyZWF0ZVByb3BlcnR5KCd0aHJvdHRsZScsIG1peGluJDEyKTtcblxuXHRmdW5jdGlvbiB0aHJvdHRsZShvYnMsIHdhaXQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRsZWFkaW5nID0gX3JlZjIubGVhZGluZztcblx0ICB2YXIgbGVhZGluZyA9IF9yZWYyJGxlYWRpbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRsZWFkaW5nO1xuXHQgIHZhciBfcmVmMiR0cmFpbGluZyA9IF9yZWYyLnRyYWlsaW5nO1xuXHQgIHZhciB0cmFpbGluZyA9IF9yZWYyJHRyYWlsaW5nID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkdHJhaWxpbmc7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxOSwgUCQxNSkpKG9icywgeyB3YWl0OiB3YWl0LCBsZWFkaW5nOiBsZWFkaW5nLCB0cmFpbGluZzogdHJhaWxpbmcgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBpbW1lZGlhdGUgPSBfcmVmLmltbWVkaWF0ZTtcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5faW1tZWRpYXRlID0gaW1tZWRpYXRlO1xuXHQgICAgdGhpcy5fbGFzdEF0dGVtcHQgPSAwO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fZW5kTGF0ZXIgPSBmYWxzZTtcblx0ICAgIHRoaXMuXyRsYXRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9sYXRlcigpO1xuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXRlclZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuXyRsYXRlciA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9sYXN0QXR0ZW1wdCA9IG5vdygpO1xuXHQgICAgICBpZiAodGhpcy5faW1tZWRpYXRlICYmICF0aGlzLl90aW1lb3V0SWQpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKCF0aGlzLl90aW1lb3V0SWQpIHtcblx0ICAgICAgICB0aGlzLl90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRoaXMuXyRsYXRlciwgdGhpcy5fd2FpdCk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKCF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9sYXRlclZhbHVlID0geDtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCAmJiAhdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fZW5kTGF0ZXIgPSB0cnVlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2xhdGVyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbGFzdCA9IG5vdygpIC0gdGhpcy5fbGFzdEF0dGVtcHQ7XG5cdCAgICBpZiAobGFzdCA8IHRoaXMuX3dhaXQgJiYgbGFzdCA+PSAwKSB7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJGxhdGVyLCB0aGlzLl93YWl0IC0gbGFzdCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgICBpZiAoIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9sYXRlclZhbHVlKTtcblx0ICAgICAgICB0aGlzLl9sYXRlclZhbHVlID0gbnVsbDtcblx0ICAgICAgfVxuXHQgICAgICBpZiAodGhpcy5fZW5kTGF0ZXIpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjAgPSBjcmVhdGVTdHJlYW0oJ2RlYm91bmNlJywgbWl4aW4kMTMpO1xuXHR2YXIgUCQxNiA9IGNyZWF0ZVByb3BlcnR5KCdkZWJvdW5jZScsIG1peGluJDEzKTtcblxuXHRmdW5jdGlvbiBkZWJvdW5jZShvYnMsIHdhaXQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRpbW1lZGlhdGUgPSBfcmVmMi5pbW1lZGlhdGU7XG5cdCAgdmFyIGltbWVkaWF0ZSA9IF9yZWYyJGltbWVkaWF0ZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBfcmVmMiRpbW1lZGlhdGU7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMCwgUCQxNikpKG9icywgeyB3YWl0OiB3YWl0LCBpbW1lZGlhdGU6IGltbWVkaWF0ZSB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0RXJyb3IoZm4oeCkpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyMSA9IGNyZWF0ZVN0cmVhbSgnbWFwRXJyb3JzJywgbWl4aW4kMTQpO1xuXHR2YXIgUCQxNyA9IGNyZWF0ZVByb3BlcnR5KCdtYXBFcnJvcnMnLCBtaXhpbiQxNCk7XG5cblx0dmFyIGlkJDUgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIG1hcEVycm9ycyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQ1IDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjEsIFAkMTcpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDE1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDIyID0gY3JlYXRlU3RyZWFtKCdmaWx0ZXJFcnJvcnMnLCBtaXhpbiQxNSk7XG5cdHZhciBQJDE4ID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlckVycm9ycycsIG1peGluJDE1KTtcblxuXHR2YXIgaWQkNiA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gZmlsdGVyRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDYgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMiwgUCQxOCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTYgPSB7XG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDIzID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVWYWx1ZXMnLCBtaXhpbiQxNik7XG5cdHZhciBQJDE5ID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZVZhbHVlcycsIG1peGluJDE2KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVWYWx1ZXMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjMsIFAkMTkpKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE3ID0ge1xuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKCkge31cblx0fTtcblxuXHR2YXIgUyQyNCA9IGNyZWF0ZVN0cmVhbSgnaWdub3JlRXJyb3JzJywgbWl4aW4kMTcpO1xuXHR2YXIgUCQyMCA9IGNyZWF0ZVByb3BlcnR5KCdpZ25vcmVFcnJvcnMnLCBtaXhpbiQxNyk7XG5cblx0ZnVuY3Rpb24gaWdub3JlRXJyb3JzKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDI0LCBQJDIwKSkob2JzKTtcblx0fVxuXG5cdHZhciBtaXhpbiQxOCA9IHtcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDI1ID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVFbmQnLCBtaXhpbiQxOCk7XG5cdHZhciBQJDIxID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZUVuZCcsIG1peGluJDE4KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVFbmQob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjUsIFAkMjEpKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE5ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbigpKTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjYgPSBjcmVhdGVTdHJlYW0oJ2JlZm9yZUVuZCcsIG1peGluJDE5KTtcblx0dmFyIFAkMjIgPSBjcmVhdGVQcm9wZXJ0eSgnYmVmb3JlRW5kJywgbWl4aW4kMTkpO1xuXG5cdGZ1bmN0aW9uIGJlZm9yZUVuZChvYnMsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjYsIFAkMjIpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDIwID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIG1pbiA9IF9yZWYubWluO1xuXHQgICAgdmFyIG1heCA9IF9yZWYubWF4O1xuXG5cdCAgICB0aGlzLl9tYXggPSBtYXg7XG5cdCAgICB0aGlzLl9taW4gPSBtaW47XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmID0gc2xpZGUodGhpcy5fYnVmZiwgeCwgdGhpcy5fbWF4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9taW4pIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyNyA9IGNyZWF0ZVN0cmVhbSgnc2xpZGluZ1dpbmRvdycsIG1peGluJDIwKTtcblx0dmFyIFAkMjMgPSBjcmVhdGVQcm9wZXJ0eSgnc2xpZGluZ1dpbmRvdycsIG1peGluJDIwKTtcblxuXHRmdW5jdGlvbiBzbGlkaW5nV2luZG93KG9icywgbWF4KSB7XG5cdCAgdmFyIG1pbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IDAgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNywgUCQyMykpKG9icywgeyBtaW46IG1pbiwgbWF4OiBtYXggfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjEgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICghZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI4ID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaGlsZScsIG1peGluJDIxKTtcblx0dmFyIFAkMjQgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2hpbGUnLCBtaXhpbiQyMSk7XG5cblx0dmFyIGlkJDcgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlKG9icywgZm4pIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRmbHVzaE9uRW5kID0gX3JlZjIuZmx1c2hPbkVuZDtcblx0ICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYyJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRmbHVzaE9uRW5kO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjgsIFAkMjQpKShvYnMsIHsgZm46IGZuIHx8IGlkJDcsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgY291bnQgPSBfcmVmLmNvdW50O1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2NvdW50ID0gY291bnQ7XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fY291bnQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI5ID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaXRoQ291bnQnLCBtaXhpbiQyMik7XG5cdHZhciBQJDI1ID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldpdGhDb3VudCcsIG1peGluJDIyKTtcblxuXHRmdW5jdGlvbiBidWZmZXJXaGlsZSQxKG9icywgY291bnQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRmbHVzaE9uRW5kID0gX3JlZjIuZmx1c2hPbkVuZDtcblx0ICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYyJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRmbHVzaE9uRW5kO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjksIFAkMjUpKShvYnMsIHsgY291bnQ6IGNvdW50LCBmbHVzaE9uRW5kOiBmbHVzaE9uRW5kIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDIzID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cdCAgICB2YXIgY291bnQgPSBfcmVmLmNvdW50O1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSB3YWl0O1xuXHQgICAgdGhpcy5fY291bnQgPSBjb3VudDtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB0aGlzLl8kb25UaWNrID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2ZsdXNoKCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBudWxsO1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX2NvdW50KSB7XG5cdCAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kICYmIHRoaXMuX2J1ZmYubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwodGhpcy5fJG9uVGljaywgdGhpcy5fd2FpdCk7XG5cdCAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ludGVydmFsSWQgIT09IG51bGwpIHtcblx0ICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpOyAvLyBjb3BpZWQgZnJvbSBwYXR0ZXJucy9vbmUtc291cmNlXG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMwID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaXRoVGltZU9yQ291bnQnLCBtaXhpbiQyMyk7XG5cdHZhciBQJDI2ID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldpdGhUaW1lT3JDb3VudCcsIG1peGluJDIzKTtcblxuXHRmdW5jdGlvbiBidWZmZXJXaXRoVGltZU9yQ291bnQob2JzLCB3YWl0LCBjb3VudCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMyB8fCBhcmd1bWVudHNbM10gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzNdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMCwgUCQyNikpKG9icywgeyB3YWl0OiB3YWl0LCBjb3VudDogY291bnQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHRmdW5jdGlvbiB4Zm9ybUZvck9icyhvYnMpIHtcblx0ICByZXR1cm4ge1xuXHQgICAgJ0BAdHJhbnNkdWNlci9zdGVwJzogZnVuY3Rpb24gKHJlcywgaW5wdXQpIHtcblx0ICAgICAgb2JzLl9lbWl0VmFsdWUoaW5wdXQpO1xuXHQgICAgICByZXR1cm4gbnVsbDtcblx0ICAgIH0sXG5cdCAgICAnQEB0cmFuc2R1Y2VyL3Jlc3VsdCc6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgb2JzLl9lbWl0RW5kKCk7XG5cdCAgICAgIHJldHVybiBudWxsO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHR2YXIgbWl4aW4kMjQgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgdHJhbnNkdWNlciA9IF9yZWYudHJhbnNkdWNlcjtcblxuXHQgICAgdGhpcy5feGZvcm0gPSB0cmFuc2R1Y2VyKHhmb3JtRm9yT2JzKHRoaXMpKTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94Zm9ybSA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9zdGVwJ10obnVsbCwgeCkgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9yZXN1bHQnXShudWxsKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hmb3JtWydAQHRyYW5zZHVjZXIvcmVzdWx0J10obnVsbCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMxID0gY3JlYXRlU3RyZWFtKCd0cmFuc2R1Y2UnLCBtaXhpbiQyNCk7XG5cdHZhciBQJDI3ID0gY3JlYXRlUHJvcGVydHkoJ3RyYW5zZHVjZScsIG1peGluJDI0KTtcblxuXHRmdW5jdGlvbiB0cmFuc2R1Y2Uob2JzLCB0cmFuc2R1Y2VyKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMzEsIFAkMjcpKShvYnMsIHsgdHJhbnNkdWNlcjogdHJhbnNkdWNlciB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2hhbmRsZXIgPSBmbjtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBlbWl0dGVyKHRoaXMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHRoaXMuX2hhbmRsZXIodGhpcy5fZW1pdHRlciwgZXZlbnQpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzMiA9IGNyZWF0ZVN0cmVhbSgnd2l0aEhhbmRsZXInLCBtaXhpbiQyNSk7XG5cdHZhciBQJDI4ID0gY3JlYXRlUHJvcGVydHkoJ3dpdGhIYW5kbGVyJywgbWl4aW4kMjUpO1xuXG5cdGZ1bmN0aW9uIHdpdGhIYW5kbGVyKG9icywgZm4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMiwgUCQyOCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG5cdCAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG5cdH07XG5cblx0ZnVuY3Rpb24gWmlwKHNvdXJjZXMsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cblx0ICB0aGlzLl9idWZmZXJzID0gbWFwKHNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0ICAgIHJldHVybiBpc0FycmF5KHNvdXJjZSkgPyBjbG9uZUFycmF5KHNvdXJjZSkgOiBbXTtcblx0ICB9KTtcblx0ICB0aGlzLl9zb3VyY2VzID0gbWFwKHNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0ICAgIHJldHVybiBpc0FycmF5KHNvdXJjZSkgPyBuZXZlcigpIDogc291cmNlO1xuXHQgIH0pO1xuXG5cdCAgdGhpcy5fY29tYmluYXRvciA9IGNvbWJpbmF0b3IgPyBzcHJlYWQoY29tYmluYXRvciwgdGhpcy5fc291cmNlcy5sZW5ndGgpIDogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHJldHVybiB4O1xuXHQgIH07XG5cdCAgdGhpcy5fYWxpdmVDb3VudCA9IDA7XG5cblx0ICB0aGlzLl8kaGFuZGxlcnMgPSBbXTtcblxuXHQgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIChpKSB7XG5cdCAgICBfdGhpcy5fJGhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGksIGV2ZW50KTtcblx0ICAgIH0pO1xuXHQgIH07XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIF9sb29wKGkpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoWmlwLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnemlwJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblxuXHQgICAgLy8gaWYgYWxsIHNvdXJjZXMgYXJlIGFycmF5c1xuXHQgICAgd2hpbGUgKHRoaXMuX2lzRnVsbCgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXQoKTtcblx0ICAgIH1cblxuXHQgICAgdmFyIGxlbmd0aCA9IHRoaXMuX3NvdXJjZXMubGVuZ3RoO1xuXHQgICAgdGhpcy5fYWxpdmVDb3VudCA9IGxlbmd0aDtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoICYmIHRoaXMuX2FjdGl2ZTsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub2ZmQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdDogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIHZhbHVlcyA9IG5ldyBBcnJheSh0aGlzLl9idWZmZXJzLmxlbmd0aCk7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2J1ZmZlcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdmFsdWVzW2ldID0gdGhpcy5fYnVmZmVyc1tpXS5zaGlmdCgpO1xuXHQgICAgfVxuXHQgICAgdmFyIGNvbWJpbmF0b3IgPSB0aGlzLl9jb21iaW5hdG9yO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGNvbWJpbmF0b3IodmFsdWVzKSk7XG5cdCAgfSxcblx0ICBfaXNGdWxsOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2J1ZmZlcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgaWYgKHRoaXMuX2J1ZmZlcnNbaV0ubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgcmV0dXJuIGZhbHNlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdHJ1ZTtcblx0ICB9LFxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChpLCBldmVudCkge1xuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgIHRoaXMuX2J1ZmZlcnNbaV0ucHVzaChldmVudC52YWx1ZSk7XG5cdCAgICAgIGlmICh0aGlzLl9pc0Z1bGwoKSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlQ291bnQtLTtcblx0ICAgICAgaWYgKHRoaXMuX2FsaXZlQ291bnQgPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fYnVmZmVycyA9IG51bGw7XG5cdCAgICB0aGlzLl9jb21iaW5hdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVycyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiB6aXAob2JzZXJ2YWJsZXMsIGNvbWJpbmF0b3IgLyogRnVuY3Rpb24gfCBmYWxzZXkgKi8pIHtcblx0ICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBaaXAob2JzZXJ2YWJsZXMsIGNvbWJpbmF0b3IpO1xuXHR9XG5cblx0dmFyIGlkJDggPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIEFic3RyYWN0UG9vbCgpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgdmFyIF9yZWYgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1swXTtcblxuXHQgIHZhciBfcmVmJHF1ZXVlTGltID0gX3JlZi5xdWV1ZUxpbTtcblx0ICB2YXIgcXVldWVMaW0gPSBfcmVmJHF1ZXVlTGltID09PSB1bmRlZmluZWQgPyAwIDogX3JlZiRxdWV1ZUxpbTtcblx0ICB2YXIgX3JlZiRjb25jdXJMaW0gPSBfcmVmLmNvbmN1ckxpbTtcblx0ICB2YXIgY29uY3VyTGltID0gX3JlZiRjb25jdXJMaW0gPT09IHVuZGVmaW5lZCA/IC0xIDogX3JlZiRjb25jdXJMaW07XG5cdCAgdmFyIF9yZWYkZHJvcCA9IF9yZWYuZHJvcDtcblx0ICB2YXIgZHJvcCA9IF9yZWYkZHJvcCA9PT0gdW5kZWZpbmVkID8gJ25ldycgOiBfcmVmJGRyb3A7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuXHQgIHRoaXMuX3F1ZXVlTGltID0gcXVldWVMaW0gPCAwID8gLTEgOiBxdWV1ZUxpbTtcblx0ICB0aGlzLl9jb25jdXJMaW0gPSBjb25jdXJMaW0gPCAwID8gLTEgOiBjb25jdXJMaW07XG5cdCAgdGhpcy5fZHJvcCA9IGRyb3A7XG5cdCAgdGhpcy5fcXVldWUgPSBbXTtcblx0ICB0aGlzLl9jdXJTb3VyY2VzID0gW107XG5cdCAgdGhpcy5fJGhhbmRsZVN1YkFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVTdWJBbnkoZXZlbnQpO1xuXHQgIH07XG5cdCAgdGhpcy5fJGVuZEhhbmRsZXJzID0gW107XG5cdCAgdGhpcy5fY3VycmVudGx5QWRkaW5nID0gbnVsbDtcblxuXHQgIGlmICh0aGlzLl9jb25jdXJMaW0gPT09IDApIHtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH1cblxuXHRpbmhlcml0KEFic3RyYWN0UG9vbCwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ2Fic3RyYWN0UG9vbCcsXG5cblx0ICBfYWRkOiBmdW5jdGlvbiAob2JqLCB0b09icyAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgICAgdG9PYnMgPSB0b09icyB8fCBpZCQ4O1xuXHQgICAgaWYgKHRoaXMuX2NvbmN1ckxpbSA9PT0gLTEgfHwgdGhpcy5fY3VyU291cmNlcy5sZW5ndGggPCB0aGlzLl9jb25jdXJMaW0pIHtcblx0ICAgICAgdGhpcy5fYWRkVG9DdXIodG9PYnMob2JqKSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fcXVldWVMaW0gPT09IC0xIHx8IHRoaXMuX3F1ZXVlLmxlbmd0aCA8IHRoaXMuX3F1ZXVlTGltKSB7XG5cdCAgICAgICAgdGhpcy5fYWRkVG9RdWV1ZSh0b09icyhvYmopKTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl9kcm9wID09PSAnb2xkJykge1xuXHQgICAgICAgIHRoaXMuX3JlbW92ZU9sZGVzdCgpO1xuXHQgICAgICAgIHRoaXMuX2FkZChvYmosIHRvT2JzKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2FkZEFsbDogZnVuY3Rpb24gKG9ic3MpIHtcblx0ICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG5cdCAgICBmb3JFYWNoKG9ic3MsIGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzMi5fYWRkKG9icyk7XG5cdCAgICB9KTtcblx0ICB9LFxuXHQgIF9yZW1vdmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9yZW1vdmVDdXIob2JzKSA9PT0gLTEpIHtcblx0ICAgICAgdGhpcy5fcmVtb3ZlUXVldWUob2JzKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9hZGRUb1F1ZXVlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB0aGlzLl9xdWV1ZSA9IGNvbmNhdCh0aGlzLl9xdWV1ZSwgW29ic10pO1xuXHQgIH0sXG5cdCAgX2FkZFRvQ3VyOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cblx0ICAgICAgLy8gSEFDSzpcblx0ICAgICAgLy9cblx0ICAgICAgLy8gV2UgaGF2ZSB0d28gb3B0aW1pemF0aW9ucyBmb3IgY2FzZXMgd2hlbiBgb2JzYCBpcyBlbmRlZC4gV2UgZG9uJ3Qgd2FudFxuXHQgICAgICAvLyB0byBhZGQgc3VjaCBvYnNlcnZhYmxlIHRvIHRoZSBsaXN0LCBidXQgb25seSB3YW50IHRvIGVtaXQgZXZlbnRzXG5cdCAgICAgIC8vIGZyb20gaXQgKGlmIGl0IGhhcyBzb21lKS5cblx0ICAgICAgLy9cblx0ICAgICAgLy8gSW5zdGVhZCBvZiB0aGlzIGhhY2tzLCB3ZSBjb3VsZCBqdXN0IGRpZCBmb2xsb3dpbmcsXG5cdCAgICAgIC8vIGJ1dCBpdCB3b3VsZCBiZSA1LTggdGltZXMgc2xvd2VyOlxuXHQgICAgICAvL1xuXHQgICAgICAvLyAgICAgdGhpcy5fY3VyU291cmNlcyA9IGNvbmNhdCh0aGlzLl9jdXJTb3VyY2VzLCBbb2JzXSk7XG5cdCAgICAgIC8vICAgICB0aGlzLl9zdWJzY3JpYmUob2JzKTtcblx0ICAgICAgLy9cblxuXHQgICAgICAvLyAjMVxuXHQgICAgICAvLyBUaGlzIG9uZSBmb3IgY2FzZXMgd2hlbiBgb2JzYCBhbHJlYWR5IGVuZGVkXG5cdCAgICAgIC8vIGUuZy4sIEtlZmlyLmNvbnN0YW50KCkgb3IgS2VmaXIubmV2ZXIoKVxuXHQgICAgICBpZiAoIW9icy5fYWxpdmUpIHtcblx0ICAgICAgICBpZiAob2JzLl9jdXJyZW50RXZlbnQpIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXQob2JzLl9jdXJyZW50RXZlbnQudHlwZSwgb2JzLl9jdXJyZW50RXZlbnQudmFsdWUpO1xuXHQgICAgICAgIH1cblx0ICAgICAgICByZXR1cm47XG5cdCAgICAgIH1cblxuXHQgICAgICAvLyAjMlxuXHQgICAgICAvLyBUaGlzIG9uZSBpcyBmb3IgY2FzZXMgd2hlbiBgb2JzYCBnb2luZyB0byBlbmQgc3luY2hyb25vdXNseSBvblxuXHQgICAgICAvLyBmaXJzdCBzdWJzY3JpYmVyIGUuZy4sIEtlZmlyLnN0cmVhbShlbSA9PiB7ZW0uZW1pdCgxKTsgZW0uZW5kKCl9KVxuXHQgICAgICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBvYnM7XG5cdCAgICAgIG9icy5vbkFueSh0aGlzLl8kaGFuZGxlU3ViQW55KTtcblx0ICAgICAgdGhpcy5fY3VycmVudGx5QWRkaW5nID0gbnVsbDtcblx0ICAgICAgaWYgKG9icy5fYWxpdmUpIHtcblx0ICAgICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgICAgICB0aGlzLl9zdWJUb0VuZChvYnMpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fY3VyU291cmNlcyA9IGNvbmNhdCh0aGlzLl9jdXJTb3VyY2VzLCBbb2JzXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfc3ViVG9FbmQ6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG5cdCAgICB2YXIgb25FbmQgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpczMuX3JlbW92ZUN1cihvYnMpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuXyRlbmRIYW5kbGVycy5wdXNoKHsgb2JzOiBvYnMsIGhhbmRsZXI6IG9uRW5kIH0pO1xuXHQgICAgb2JzLm9uRW5kKG9uRW5kKTtcblx0ICB9LFxuXHQgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIG9icy5vbkFueSh0aGlzLl8kaGFuZGxlU3ViQW55KTtcblxuXHQgICAgLy8gaXQgY2FuIGJlY29tZSBpbmFjdGl2ZSBpbiByZXNwb25jZSBvZiBzdWJzY3JpYmluZyB0byBgb2JzLm9uQW55YCBhYm92ZVxuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9zdWJUb0VuZChvYnMpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3Vuc3Vic2NyaWJlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICBvYnMub2ZmQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXG5cdCAgICB2YXIgb25FbmRJID0gZmluZEJ5UHJlZCh0aGlzLl8kZW5kSGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgcmV0dXJuIG9iai5vYnMgPT09IG9icztcblx0ICAgIH0pO1xuXHQgICAgaWYgKG9uRW5kSSAhPT0gLTEpIHtcblx0ICAgICAgb2JzLm9mZkVuZCh0aGlzLl8kZW5kSGFuZGxlcnNbb25FbmRJXS5oYW5kbGVyKTtcblx0ICAgICAgdGhpcy5fJGVuZEhhbmRsZXJzLnNwbGljZShvbkVuZEksIDEpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVN1YkFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9yZW1vdmVRdWV1ZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgdmFyIGluZGV4ID0gZmluZCh0aGlzLl9xdWV1ZSwgb2JzKTtcblx0ICAgIHRoaXMuX3F1ZXVlID0gcmVtb3ZlKHRoaXMuX3F1ZXVlLCBpbmRleCk7XG5cdCAgICByZXR1cm4gaW5kZXg7XG5cdCAgfSxcblx0ICBfcmVtb3ZlQ3VyOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKG9icyk7XG5cdCAgICB9XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kKHRoaXMuX2N1clNvdXJjZXMsIG9icyk7XG5cdCAgICB0aGlzLl9jdXJTb3VyY2VzID0gcmVtb3ZlKHRoaXMuX2N1clNvdXJjZXMsIGluZGV4KTtcblx0ICAgIGlmIChpbmRleCAhPT0gLTEpIHtcblx0ICAgICAgaWYgKHRoaXMuX3F1ZXVlLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICAgIHRoaXMuX3B1bGxRdWV1ZSgpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fb25FbXB0eSgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gaW5kZXg7XG5cdCAgfSxcblx0ICBfcmVtb3ZlT2xkZXN0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9yZW1vdmVDdXIodGhpcy5fY3VyU291cmNlc1swXSk7XG5cdCAgfSxcblx0ICBfcHVsbFF1ZXVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX3F1ZXVlID0gY2xvbmVBcnJheSh0aGlzLl9xdWV1ZSk7XG5cdCAgICAgIHRoaXMuX2FkZFRvQ3VyKHRoaXMuX3F1ZXVlLnNoaWZ0KCkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDAsIHNvdXJjZXMgPSB0aGlzLl9jdXJTb3VyY2VzOyBpIDwgc291cmNlcy5sZW5ndGggJiYgdGhpcy5fYWN0aXZlOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc3Vic2NyaWJlKHNvdXJjZXNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc291cmNlcyA9IHRoaXMuX2N1clNvdXJjZXM7IGkgPCBzb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKHNvdXJjZXNbaV0pO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRseUFkZGluZyAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSh0aGlzLl9jdXJyZW50bHlBZGRpbmcpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2lzRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiB0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA9PT0gMDtcblx0ICB9LFxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiAoKSB7fSxcblx0ICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9xdWV1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9jdXJTb3VyY2VzID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVTdWJBbnkgPSBudWxsO1xuXHQgICAgdGhpcy5fJGVuZEhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIE1lcmdlKHNvdXJjZXMpIHtcblx0ICBBYnN0cmFjdFBvb2wuY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9hZGRBbGwoc291cmNlcyk7XG5cdCAgdGhpcy5faW5pdGlhbGlzZWQgPSB0cnVlO1xuXHR9XG5cblx0aW5oZXJpdChNZXJnZSwgQWJzdHJhY3RQb29sLCB7XG5cblx0ICBfbmFtZTogJ21lcmdlJyxcblxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5faW5pdGlhbGlzZWQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gbWVyZ2Uob2JzZXJ2YWJsZXMpIHtcblx0ICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBNZXJnZShvYnNlcnZhYmxlcyk7XG5cdH1cblxuXHRmdW5jdGlvbiBTJDMzKGdlbmVyYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9nZW5lcmF0b3IgPSBnZW5lcmF0b3I7XG5cdCAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICB0aGlzLl9pbkxvb3AgPSBmYWxzZTtcblx0ICB0aGlzLl9pdGVyYXRpb24gPSAwO1xuXHQgIHRoaXMuXyRoYW5kbGVBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGV2ZW50KTtcblx0ICB9O1xuXHR9XG5cblx0aW5oZXJpdChTJDMzLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAncmVwZWF0JyxcblxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgICB0aGlzLl9nZXRTb3VyY2UoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXQoZXZlbnQudHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2dldFNvdXJjZTogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKCF0aGlzLl9pbkxvb3ApIHtcblx0ICAgICAgdGhpcy5faW5Mb29wID0gdHJ1ZTtcblx0ICAgICAgdmFyIGdlbmVyYXRvciA9IHRoaXMuX2dlbmVyYXRvcjtcblx0ICAgICAgd2hpbGUgKHRoaXMuX3NvdXJjZSA9PT0gbnVsbCAmJiB0aGlzLl9hbGl2ZSAmJiB0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9zb3VyY2UgPSBnZW5lcmF0b3IodGhpcy5faXRlcmF0aW9uKyspO1xuXHQgICAgICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9pbkxvb3AgPSBmYWxzZTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZ2V0U291cmNlKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX2dlbmVyYXRvciA9IG51bGw7XG5cdCAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZUFueSA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiByZXBlYXQgKGdlbmVyYXRvcikge1xuXHQgIHJldHVybiBuZXcgUyQzMyhnZW5lcmF0b3IpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29uY2F0JDEob2JzZXJ2YWJsZXMpIHtcblx0ICByZXR1cm4gcmVwZWF0KGZ1bmN0aW9uIChpbmRleCkge1xuXHQgICAgcmV0dXJuIG9ic2VydmFibGVzLmxlbmd0aCA+IGluZGV4ID8gb2JzZXJ2YWJsZXNbaW5kZXhdIDogZmFsc2U7XG5cdCAgfSkuc2V0TmFtZSgnY29uY2F0Jyk7XG5cdH1cblxuXHRmdW5jdGlvbiBQb29sKCkge1xuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMpO1xuXHR9XG5cblx0aW5oZXJpdChQb29sLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9uYW1lOiAncG9vbCcsXG5cblx0ICBwbHVnOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB0aGlzLl9hZGQob2JzKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgdW5wbHVnOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB0aGlzLl9yZW1vdmUob2JzKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gRmxhdE1hcChzb3VyY2UsIGZuLCBvcHRpb25zKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXHQgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZTtcblx0ICB0aGlzLl9mbiA9IGZuO1xuXHQgIHRoaXMuX21haW5FbmRlZCA9IGZhbHNlO1xuXHQgIHRoaXMuX2xhc3RDdXJyZW50ID0gbnVsbDtcblx0ICB0aGlzLl8kaGFuZGxlTWFpbiA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVNYWluKGV2ZW50KTtcblx0ICB9O1xuXHR9XG5cblx0aW5oZXJpdChGbGF0TWFwLCBBYnN0cmFjdFBvb2wsIHtcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9vbkFjdGl2YXRpb24uY2FsbCh0aGlzKTtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVNYWluKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgQWJzdHJhY3RQb29sLnByb3RvdHlwZS5fb25EZWFjdGl2YXRpb24uY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZU1haW4pO1xuXHQgICAgdGhpcy5faGFkTm9FdlNpbmNlRGVhY3QgPSB0cnVlO1xuXHQgIH0sXG5cdCAgX2hhbmRsZU1haW46IGZ1bmN0aW9uIChldmVudCkge1xuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgLy8gSXMgbGF0ZXN0IHZhbHVlIGJlZm9yZSBkZWFjdGl2YXRpb24gc3Vydml2ZWQsIGFuZCBub3cgaXMgJ2N1cnJlbnQnIG9uIHRoaXMgYWN0aXZhdGlvbj9cblx0ICAgICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBoYW5kbGUgc3VjaCB2YWx1ZXMsIHRvIHByZXZlbnQgdG8gY29uc3RhbnRseSBhZGRcblx0ICAgICAgLy8gc2FtZSBvYnNlcnZhbGUgb24gZWFjaCBhY3RpdmF0aW9uL2RlYWN0aXZhdGlvbiB3aGVuIG91ciBtYWluIHNvdXJjZVxuXHQgICAgICAvLyBpcyBhIGBLZWZpci5jb25hdGFudCgpYCBmb3IgZXhhbXBsZS5cblx0ICAgICAgdmFyIHNhbWVDdXJyID0gdGhpcy5fYWN0aXZhdGluZyAmJiB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCAmJiB0aGlzLl9sYXN0Q3VycmVudCA9PT0gZXZlbnQudmFsdWU7XG5cdCAgICAgIGlmICghc2FtZUN1cnIpIHtcblx0ICAgICAgICB0aGlzLl9hZGQoZXZlbnQudmFsdWUsIHRoaXMuX2ZuKTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9sYXN0Q3VycmVudCA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICBpZiAodGhpcy5faXNFbXB0eSgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX21haW5FbmRlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbWFpbkVuZGVkKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgQWJzdHJhY3RQb29sLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXN0Q3VycmVudCA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlTWFpbiA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBGbGF0TWFwRXJyb3JzKHNvdXJjZSwgZm4pIHtcblx0ICBGbGF0TWFwLmNhbGwodGhpcywgc291cmNlLCBmbik7XG5cdH1cblxuXHRpbmhlcml0KEZsYXRNYXBFcnJvcnMsIEZsYXRNYXAsIHtcblxuXHQgIC8vIFNhbWUgYXMgaW4gRmxhdE1hcCwgb25seSBWQUxVRS9FUlJPUiBmbGlwcGVkXG5cdCAgX2hhbmRsZU1haW46IGZ1bmN0aW9uIChldmVudCkge1xuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdmFyIHNhbWVDdXJyID0gdGhpcy5fYWN0aXZhdGluZyAmJiB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCAmJiB0aGlzLl9sYXN0Q3VycmVudCA9PT0gZXZlbnQudmFsdWU7XG5cdCAgICAgIGlmICghc2FtZUN1cnIpIHtcblx0ICAgICAgICB0aGlzLl9hZGQoZXZlbnQudmFsdWUsIHRoaXMuX2ZuKTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9sYXN0Q3VycmVudCA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICBpZiAodGhpcy5faXNFbXB0eSgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX21haW5FbmRlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbnN0cnVjdG9yJDEoQmFzZUNsYXNzLCBuYW1lKSB7XG5cdCAgcmV0dXJuIGZ1bmN0aW9uIEFub255bW91c09ic2VydmFibGUocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBCYXNlQ2xhc3MuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3ByaW1hcnkgPSBwcmltYXJ5O1xuXHQgICAgdGhpcy5fc2Vjb25kYXJ5ID0gc2Vjb25kYXJ5O1xuXHQgICAgdGhpcy5fbmFtZSA9IHByaW1hcnkuX25hbWUgKyAnLicgKyBuYW1lO1xuXHQgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IE5PVEhJTkc7XG5cdCAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlU2Vjb25kYXJ5QW55KGV2ZW50KTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVByaW1hcnlBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuX2luaXQob3B0aW9ucyk7XG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKEJhc2VDbGFzcykge1xuXHQgIHJldHVybiB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSB4O1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVQcmltYXJ5RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlFbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlU2Vjb25kYXJ5VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRVJST1I6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlU2Vjb25kYXJ5RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgICAgdGhpcy5faGFuZGxlU2Vjb25kYXJ5RW5kKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICAgIHRoaXMuX3JlbW92ZVNlY29uZGFyeSgpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX3JlbW92ZVNlY29uZGFyeTogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgICAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9wcmltYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgICAgfVxuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9wcmltYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSk7XG5cdCAgICB9LFxuXHQgICAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIEJhc2VDbGFzcy5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICAgIHRoaXMuX3ByaW1hcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9zZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSA9IG51bGw7XG5cdCAgICAgIHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTdHJlYW0kMShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBTID0gY3JlYXRlQ29uc3RydWN0b3IkMShTdHJlYW0sIG5hbWUpO1xuXHQgIGluaGVyaXQoUywgU3RyZWFtLCBjcmVhdGVDbGFzc01ldGhvZHMkMShTdHJlYW0pLCBtaXhpbik7XG5cdCAgcmV0dXJuIFM7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVQcm9wZXJ0eSQxKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFAgPSBjcmVhdGVDb25zdHJ1Y3RvciQxKFByb3BlcnR5LCBuYW1lKTtcblx0ICBpbmhlcml0KFAsIFByb3BlcnR5LCBjcmVhdGVDbGFzc01ldGhvZHMkMShQcm9wZXJ0eSksIG1peGluKTtcblx0ICByZXR1cm4gUDtcblx0fVxuXG5cdHZhciBtaXhpbiQyNiA9IHtcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcgJiYgdGhpcy5fbGFzdFNlY29uZGFyeSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORyB8fCAhdGhpcy5fbGFzdFNlY29uZGFyeSkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM0ID0gY3JlYXRlU3RyZWFtJDEoJ2ZpbHRlckJ5JywgbWl4aW4kMjYpO1xuXHR2YXIgUCQyOSA9IGNyZWF0ZVByb3BlcnR5JDEoJ2ZpbHRlckJ5JywgbWl4aW4kMjYpO1xuXG5cdGZ1bmN0aW9uIGZpbHRlckJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNCwgUCQyOSkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgaWQyID0gZnVuY3Rpb24gKF8sIHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBzYW1wbGVkQnkocGFzc2l2ZSwgYWN0aXZlLCBjb21iaW5hdG9yKSB7XG5cdCAgdmFyIF9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gY29tYmluYXRvcihiLCBhKTtcblx0ICB9IDogaWQyO1xuXHQgIHJldHVybiBjb21iaW5lKFthY3RpdmVdLCBbcGFzc2l2ZV0sIF9jb21iaW5hdG9yKS5zZXROYW1lKHBhc3NpdmUsICdzYW1wbGVkQnknKTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNyA9IHtcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgPT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzNSA9IGNyZWF0ZVN0cmVhbSQxKCdza2lwVW50aWxCeScsIG1peGluJDI3KTtcblx0dmFyIFAkMzAgPSBjcmVhdGVQcm9wZXJ0eSQxKCdza2lwVW50aWxCeScsIG1peGluJDI3KTtcblxuXHRmdW5jdGlvbiBza2lwVW50aWxCeShwcmltYXJ5LCBzZWNvbmRhcnkpIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMkMzUsIFAkMzApKShwcmltYXJ5LCBzZWNvbmRhcnkpO1xuXHR9XG5cblx0dmFyIG1peGluJDI4ID0ge1xuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzNiA9IGNyZWF0ZVN0cmVhbSQxKCd0YWtlVW50aWxCeScsIG1peGluJDI4KTtcblx0dmFyIFAkMzEgPSBjcmVhdGVQcm9wZXJ0eSQxKCd0YWtlVW50aWxCeScsIG1peGluJDI4KTtcblxuXHRmdW5jdGlvbiB0YWtlVW50aWxCeShwcmltYXJ5LCBzZWNvbmRhcnkpIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMkMzYsIFAkMzEpKShwcmltYXJ5LCBzZWNvbmRhcnkpO1xuXHR9XG5cblx0dmFyIG1peGluJDI5ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmJGZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fcHJpbWFyeS5vbkFueSh0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSk7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUgJiYgdGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3NlY29uZGFyeS5vbkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzNyA9IGNyZWF0ZVN0cmVhbSQxKCdidWZmZXJCeScsIG1peGluJDI5KTtcblx0dmFyIFAkMzIgPSBjcmVhdGVQcm9wZXJ0eSQxKCdidWZmZXJCeScsIG1peGluJDI5KTtcblxuXHRmdW5jdGlvbiBidWZmZXJCeShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMgLyogb3B0aW9uYWwgKi8pIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMkMzcsIFAkMzIpKShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDMwID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmJGZsdXNoT25FbmQ7XG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uQ2hhbmdlID0gX3JlZi5mbHVzaE9uQ2hhbmdlO1xuXHQgICAgdmFyIGZsdXNoT25DaGFuZ2UgPSBfcmVmJGZsdXNoT25DaGFuZ2UgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogX3JlZiRmbHVzaE9uQ2hhbmdlO1xuXG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2ZsdXNoT25DaGFuZ2UgPSBmbHVzaE9uQ2hhbmdlO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ICE9PSBOT1RISU5HICYmICF0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2ZsdXNoT25FbmQgJiYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgPT09IE5PVEhJTkcgfHwgdGhpcy5fbGFzdFNlY29uZGFyeSkpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25DaGFuZ2UgJiYgIXgpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblxuXHQgICAgLy8gZnJvbSBkZWZhdWx0IF9oYW5kbGVTZWNvbmRhcnlWYWx1ZVxuXHQgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IHg7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM4ID0gY3JlYXRlU3RyZWFtJDEoJ2J1ZmZlcldoaWxlQnknLCBtaXhpbiQzMCk7XG5cdHZhciBQJDMzID0gY3JlYXRlUHJvcGVydHkkMSgnYnVmZmVyV2hpbGVCeScsIG1peGluJDMwKTtcblxuXHRmdW5jdGlvbiBidWZmZXJXaGlsZUJ5KHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyAvKiBvcHRpb25hbCAqLykge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzOCwgUCQzMykpKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHR2YXIgZiA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gZmFsc2U7XG5cdH07XG5cdHZhciB0ID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGF3YWl0aW5nKGEsIGIpIHtcblx0ICB2YXIgcmVzdWx0ID0gbWVyZ2UoW21hcCQxKGEsIHQpLCBtYXAkMShiLCBmKV0pO1xuXHQgIHJlc3VsdCA9IHNraXBEdXBsaWNhdGVzKHJlc3VsdCk7XG5cdCAgcmVzdWx0ID0gdG9Qcm9wZXJ0eShyZXN1bHQsIGYpO1xuXHQgIHJldHVybiByZXN1bHQuc2V0TmFtZShhLCAnYXdhaXRpbmcnKTtcblx0fVxuXG5cdHZhciBtaXhpbiQzMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgcmVzdWx0ID0gZm4oeCk7XG5cdCAgICBpZiAocmVzdWx0LmNvbnZlcnQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHJlc3VsdC5lcnJvcik7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM5ID0gY3JlYXRlU3RyZWFtKCd2YWx1ZXNUb0Vycm9ycycsIG1peGluJDMxKTtcblx0dmFyIFAkMzQgPSBjcmVhdGVQcm9wZXJ0eSgndmFsdWVzVG9FcnJvcnMnLCBtaXhpbiQzMSk7XG5cblx0dmFyIGRlZkZuID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geyBjb252ZXJ0OiB0cnVlLCBlcnJvcjogeCB9O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHZhbHVlc1RvRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGRlZkZuIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMzksIFAkMzQpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDMyID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciByZXN1bHQgPSBmbih4KTtcblx0ICAgIGlmIChyZXN1bHQuY29udmVydCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUocmVzdWx0LnZhbHVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNDAgPSBjcmVhdGVTdHJlYW0oJ2Vycm9yc1RvVmFsdWVzJywgbWl4aW4kMzIpO1xuXHR2YXIgUCQzNSA9IGNyZWF0ZVByb3BlcnR5KCdlcnJvcnNUb1ZhbHVlcycsIG1peGluJDMyKTtcblxuXHR2YXIgZGVmRm4kMSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHsgY29udmVydDogdHJ1ZSwgdmFsdWU6IHggfTtcblx0fTtcblxuXHRmdW5jdGlvbiBlcnJvcnNUb1ZhbHVlcyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBkZWZGbiQxIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkNDAsIFAkMzUpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDMzID0ge1xuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNDEgPSBjcmVhdGVTdHJlYW0oJ2VuZE9uRXJyb3InLCBtaXhpbiQzMyk7XG5cdHZhciBQJDM2ID0gY3JlYXRlUHJvcGVydHkoJ2VuZE9uRXJyb3InLCBtaXhpbiQzMyk7XG5cblx0ZnVuY3Rpb24gZW5kT25FcnJvcihvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ0MSwgUCQzNikpKG9icyk7XG5cdH1cblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1Byb3BlcnR5ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHRvUHJvcGVydHkodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNoYW5nZXMgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGNoYW5nZXModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9Qcm9taXNlID0gZnVuY3Rpb24gKFByb21pc2UpIHtcblx0ICByZXR1cm4gdG9Qcm9taXNlKHRoaXMsIFByb21pc2UpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvRVNPYnNlcnZhYmxlID0gdG9FU09ic2VydmFibGU7XG5cdE9ic2VydmFibGUucHJvdG90eXBlWyQkb2JzZXJ2YWJsZV0gPSB0b0VTT2JzZXJ2YWJsZTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbWFwJDEodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBmaWx0ZXIodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2UgPSBmdW5jdGlvbiAobikge1xuXHQgIHJldHVybiB0YWtlKHRoaXMsIG4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VFcnJvcnMgPSBmdW5jdGlvbiAobikge1xuXHQgIHJldHVybiB0YWtlRXJyb3JzKHRoaXMsIG4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VXaGlsZSA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB0YWtlV2hpbGUodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmxhc3QgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGxhc3QodGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHNraXAodGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcFdoaWxlID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHNraXBXaGlsZSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcER1cGxpY2F0ZXMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gc2tpcER1cGxpY2F0ZXModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbiAoZm4sIHNlZWQpIHtcblx0ICByZXR1cm4gZGlmZih0aGlzLCBmbiwgc2VlZCk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2NhbiA9IGZ1bmN0aW9uIChmbiwgc2VlZCkge1xuXHQgIHJldHVybiBzY2FuKHRoaXMsIGZuLCBzZWVkKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0dGVuID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZsYXR0ZW4odGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKHdhaXQpIHtcblx0ICByZXR1cm4gZGVsYXkodGhpcywgd2FpdCk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGhyb3R0bGUgPSBmdW5jdGlvbiAod2FpdCwgb3B0aW9ucykge1xuXHQgIHJldHVybiB0aHJvdHRsZSh0aGlzLCB3YWl0LCBvcHRpb25zKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5kZWJvdW5jZSA9IGZ1bmN0aW9uICh3YWl0LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGRlYm91bmNlKHRoaXMsIHdhaXQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1hcEVycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBtYXBFcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZpbHRlckVycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBmaWx0ZXJFcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZVZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlVmFsdWVzKHRoaXMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZUVycm9ycyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlRXJyb3JzKHRoaXMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZUVuZCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlRW5kKHRoaXMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJlZm9yZUVuZCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBiZWZvcmVFbmQodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNsaWRpbmdXaW5kb3cgPSBmdW5jdGlvbiAobWF4LCBtaW4pIHtcblx0ICByZXR1cm4gc2xpZGluZ1dpbmRvdyh0aGlzLCBtYXgsIG1pbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2hpbGUgPSBmdW5jdGlvbiAoZm4sIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2hpbGUodGhpcywgZm4sIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldpdGhDb3VudCA9IGZ1bmN0aW9uIChjb3VudCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZSQxKHRoaXMsIGNvdW50LCBvcHRpb25zKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaXRoVGltZU9yQ291bnQgPSBmdW5jdGlvbiAod2FpdCwgY291bnQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2l0aFRpbWVPckNvdW50KHRoaXMsIHdhaXQsIGNvdW50LCBvcHRpb25zKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50cmFuc2R1Y2UgPSBmdW5jdGlvbiAodHJhbnNkdWNlcikge1xuXHQgIHJldHVybiB0cmFuc2R1Y2UodGhpcywgdHJhbnNkdWNlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUud2l0aEhhbmRsZXIgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gd2l0aEhhbmRsZXIodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNvbWJpbmUgPSBmdW5jdGlvbiAob3RoZXIsIGNvbWJpbmF0b3IpIHtcblx0ICByZXR1cm4gY29tYmluZShbdGhpcywgb3RoZXJdLCBjb21iaW5hdG9yKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS56aXAgPSBmdW5jdGlvbiAob3RoZXIsIGNvbWJpbmF0b3IpIHtcblx0ICByZXR1cm4gemlwKFt0aGlzLCBvdGhlcl0sIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIG1lcmdlKFt0aGlzLCBvdGhlcl0pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBjb25jYXQkMShbdGhpcywgb3RoZXJdKTtcblx0fTtcblxuXHR2YXIgcG9vbCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbmV3IFBvb2woKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuKS5zZXROYW1lKHRoaXMsICdmbGF0TWFwJyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBMYXRlc3QgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgY29uY3VyTGltOiAxLCBkcm9wOiAnb2xkJyB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwTGF0ZXN0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBGaXJzdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBjb25jdXJMaW06IDEgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcEZpcnN0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBDb25jYXQgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgcXVldWVMaW06IC0xLCBjb25jdXJMaW06IDEgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcENvbmNhdCcpO1xuXHR9O1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwQ29uY3VyTGltaXQgPSBmdW5jdGlvbiAoZm4sIGxpbWl0KSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IHF1ZXVlTGltOiAtMSwgY29uY3VyTGltOiBsaW1pdCB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwQ29uY3VyTGltaXQnKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwRXJyb3JzKHRoaXMsIGZuKS5zZXROYW1lKHRoaXMsICdmbGF0TWFwRXJyb3JzJyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gZmlsdGVyQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNhbXBsZWRCeSA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiBzYW1wbGVkQnkodGhpcywgb3RoZXIsIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNraXBVbnRpbEJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIHNraXBVbnRpbEJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50YWtlVW50aWxCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiB0YWtlVW50aWxCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyQnkgPSBmdW5jdGlvbiAob3RoZXIsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyQnkodGhpcywgb3RoZXIsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldoaWxlQnkgPSBmdW5jdGlvbiAob3RoZXIsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2hpbGVCeSh0aGlzLCBvdGhlciwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gRGVwcmVjYXRlZFxuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHZhciBERVBSRUNBVElPTl9XQVJOSU5HUyA9IHRydWU7XG5cdGZ1bmN0aW9uIGRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncygpIHtcblx0ICBERVBSRUNBVElPTl9XQVJOSU5HUyA9IGZhbHNlO1xuXHR9XG5cblx0ZnVuY3Rpb24gd2Fybihtc2cpIHtcblx0ICBpZiAoREVQUkVDQVRJT05fV0FSTklOR1MgJiYgY29uc29sZSAmJiB0eXBlb2YgY29uc29sZS53YXJuID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICB2YXIgbXNnMiA9ICdcXG5IZXJlIGlzIGFuIEVycm9yIG9iamVjdCBmb3IgeW91IGNvbnRhaW5pbmcgdGhlIGNhbGwgc3RhY2s6Jztcblx0ICAgIGNvbnNvbGUud2Fybihtc2csIG1zZzIsIG5ldyBFcnJvcigpKTtcblx0ICB9XG5cdH1cblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5hd2FpdGluZyA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAuYXdhaXRpbmcoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0NScpO1xuXHQgIHJldHVybiBhd2FpdGluZyh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudmFsdWVzVG9FcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLnZhbHVlc1RvRXJyb3JzKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDknKTtcblx0ICByZXR1cm4gdmFsdWVzVG9FcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmVycm9yc1RvVmFsdWVzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5lcnJvcnNUb1ZhbHVlcygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ5Jyk7XG5cdCAgcmV0dXJuIGVycm9yc1RvVmFsdWVzKHRoaXMsIGZuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5lbmRPbkVycm9yID0gZnVuY3Rpb24gKCkge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAuZW5kT25FcnJvcigpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTUwJyk7XG5cdCAgcmV0dXJuIGVuZE9uRXJyb3IodGhpcyk7XG5cdH07XG5cblx0Ly8gRXhwb3J0c1xuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHZhciBLZWZpciA9IHsgT2JzZXJ2YWJsZTogT2JzZXJ2YWJsZSwgU3RyZWFtOiBTdHJlYW0sIFByb3BlcnR5OiBQcm9wZXJ0eSwgbmV2ZXI6IG5ldmVyLCBsYXRlcjogbGF0ZXIsIGludGVydmFsOiBpbnRlcnZhbCwgc2VxdWVudGlhbGx5OiBzZXF1ZW50aWFsbHksXG5cdCAgZnJvbVBvbGw6IGZyb21Qb2xsLCB3aXRoSW50ZXJ2YWw6IHdpdGhJbnRlcnZhbCwgZnJvbUNhbGxiYWNrOiBmcm9tQ2FsbGJhY2ssIGZyb21Ob2RlQ2FsbGJhY2s6IGZyb21Ob2RlQ2FsbGJhY2ssIGZyb21FdmVudHM6IGZyb21FdmVudHMsIHN0cmVhbTogc3RyZWFtLFxuXHQgIGNvbnN0YW50OiBjb25zdGFudCwgY29uc3RhbnRFcnJvcjogY29uc3RhbnRFcnJvciwgZnJvbVByb21pc2U6IGZyb21Qcm9taXNlLCBmcm9tRVNPYnNlcnZhYmxlOiBmcm9tRVNPYnNlcnZhYmxlLCBjb21iaW5lOiBjb21iaW5lLCB6aXA6IHppcCwgbWVyZ2U6IG1lcmdlLFxuXHQgIGNvbmNhdDogY29uY2F0JDEsIFBvb2w6IFBvb2wsIHBvb2w6IHBvb2wsIHJlcGVhdDogcmVwZWF0LCBzdGF0aWNMYW5kOiBzdGF0aWNMYW5kIH07XG5cblx0S2VmaXIuS2VmaXIgPSBLZWZpcjtcblxuXHRleHBvcnRzLmRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncyA9IGRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncztcblx0ZXhwb3J0cy5LZWZpciA9IEtlZmlyO1xuXHRleHBvcnRzLk9ic2VydmFibGUgPSBPYnNlcnZhYmxlO1xuXHRleHBvcnRzLlN0cmVhbSA9IFN0cmVhbTtcblx0ZXhwb3J0cy5Qcm9wZXJ0eSA9IFByb3BlcnR5O1xuXHRleHBvcnRzLm5ldmVyID0gbmV2ZXI7XG5cdGV4cG9ydHMubGF0ZXIgPSBsYXRlcjtcblx0ZXhwb3J0cy5pbnRlcnZhbCA9IGludGVydmFsO1xuXHRleHBvcnRzLnNlcXVlbnRpYWxseSA9IHNlcXVlbnRpYWxseTtcblx0ZXhwb3J0cy5mcm9tUG9sbCA9IGZyb21Qb2xsO1xuXHRleHBvcnRzLndpdGhJbnRlcnZhbCA9IHdpdGhJbnRlcnZhbDtcblx0ZXhwb3J0cy5mcm9tQ2FsbGJhY2sgPSBmcm9tQ2FsbGJhY2s7XG5cdGV4cG9ydHMuZnJvbU5vZGVDYWxsYmFjayA9IGZyb21Ob2RlQ2FsbGJhY2s7XG5cdGV4cG9ydHMuZnJvbUV2ZW50cyA9IGZyb21FdmVudHM7XG5cdGV4cG9ydHMuc3RyZWFtID0gc3RyZWFtO1xuXHRleHBvcnRzLmNvbnN0YW50ID0gY29uc3RhbnQ7XG5cdGV4cG9ydHMuY29uc3RhbnRFcnJvciA9IGNvbnN0YW50RXJyb3I7XG5cdGV4cG9ydHMuZnJvbVByb21pc2UgPSBmcm9tUHJvbWlzZTtcblx0ZXhwb3J0cy5mcm9tRVNPYnNlcnZhYmxlID0gZnJvbUVTT2JzZXJ2YWJsZTtcblx0ZXhwb3J0cy5jb21iaW5lID0gY29tYmluZTtcblx0ZXhwb3J0cy56aXAgPSB6aXA7XG5cdGV4cG9ydHMubWVyZ2UgPSBtZXJnZTtcblx0ZXhwb3J0cy5jb25jYXQgPSBjb25jYXQkMTtcblx0ZXhwb3J0cy5Qb29sID0gUG9vbDtcblx0ZXhwb3J0cy5wb29sID0gcG9vbDtcblx0ZXhwb3J0cy5yZXBlYXQgPSByZXBlYXQ7XG5cdGV4cG9ydHMuc3RhdGljTGFuZCA9IHN0YXRpY0xhbmQ7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IEtlZmlyO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKTsiLCJpbXBvcnQgc25hYmJkb20gZnJvbSAnc25hYmJkb20vc25hYmJkb20uanMnXG5pbXBvcnQgaCBmcm9tICdzbmFiYmRvbS9oLmpzJ1xuaW1wb3J0IHNuYWJDbGFzcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzLmpzJ1xuaW1wb3J0IHNuYWJQcm9wcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzJ1xuaW1wb3J0IHNuYWJTdHlsZSBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3N0eWxlLmpzJ1xuaW1wb3J0IHNuYWJFdmVudCBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzLmpzJ1xuaW1wb3J0IEtlZmlyIGZyb20gJ2tlZmlyJ1xuXG5leHBvcnQgZnVuY3Rpb24gYnVzKCkge1xuICBsZXQgZW1pdHRlclxuICBsZXQgc3RyZWFtID0gS2VmaXIuc3RyZWFtKF9lbWl0dGVyID0+IHtcbiAgICBlbWl0dGVyID0gX2VtaXR0ZXJcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0dGVyID0gbnVsbFxuICAgIH1cbiAgfSlcbiAgc3RyZWFtLmVtaXQgPSBmdW5jdGlvbih4KSB7XG4gICAgZW1pdHRlciAmJiBlbWl0dGVyLmVtaXQoeClcbiAgfVxuICByZXR1cm4gc3RyZWFtXG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRUb0h5cGVyU2NyaXB0KG5vZGUpIHtcbiAgbGV0IFtzZWwsIGRhdGEsIGNoaWxkcmVuXSA9IG5vZGVcblxuICBpZiAoQXJyYXkuaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICByZXR1cm4gaChzZWwsIGRhdGEsIGNoaWxkcmVuLm1hcChjb252ZXJ0VG9IeXBlclNjcmlwdCkpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGguYXBwbHkobnVsbCwgbm9kZSlcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHZpZXckLCBjb250YWluZXIpIHtcbiAgbGV0IHBhdGNoID0gc25hYmJkb20uaW5pdChbc25hYkNsYXNzLCBzbmFiUHJvcHMsIHNuYWJTdHlsZSwgc25hYkV2ZW50XSlcbiAgbGV0IHZub2RlID0gY29udGFpbmVyXG5cbiAgdmlldyRcbiAgICAubWFwKGNvbnZlcnRUb0h5cGVyU2NyaXB0KVxuICAgIC5vblZhbHVlKG5ld1Zub2RlID0+IHtcbiAgICAgIHBhdGNoKHZub2RlLCBuZXdWbm9kZSlcbiAgICAgIHZub2RlID0gbmV3Vm5vZGVcbiAgICB9KVxufVxuIiwiIWZ1bmN0aW9uKG4sZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShbXSxlKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKCk6bi5qc29ucD1lKCl9KHRoaXMsZnVuY3Rpb24oKXtmdW5jdGlvbiBuKG4pe249bnx8NTtmb3IodmFyIGU9XCJcIixvPVwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODlcIix0PW8ubGVuZ3RoLHI9MDtuPnI7cisrKWUrPW8uY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSp0KSk7cmV0dXJuIGV9ZnVuY3Rpb24gZShuKXt2YXIgZT1cIltvYmplY3QgRnVuY3Rpb25dXCIsbz1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO3JldHVybiBvLmNhbGwobik9PWV9ZnVuY3Rpb24gbyhuLGUpe3ZhciBvPWEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdLHQ9YS5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO3JldHVybiB0LnNyYz1uLHQuYXN5bmM9ITAsdC5kZWZlcj0hMCxvLmFwcGVuZENoaWxkKHQpLHR9ZnVuY3Rpb24gdChlKXtyZXR1cm4gZStcIl9fXCIrbigpfWZ1bmN0aW9uIHIobixlLG8sdCl7dmFyIHI9LTE9PT1uLmluZGV4T2YoXCI/XCIpP1wiP1wiOlwiJlwiO2Zvcih2YXIgdSBpbiBlKWUuaGFzT3duUHJvcGVydHkodSkmJihyKz1lbmNvZGVVUklDb21wb25lbnQodSkrXCI9XCIrZW5jb2RlVVJJQ29tcG9uZW50KGVbdV0pK1wiJlwiKTtyZXR1cm4gbityK28rXCI9XCIrdH1mdW5jdGlvbiB1KG4pe2NsZWFyVGltZW91dChuKSxuPW51bGx9ZnVuY3Rpb24gaShuLGksYSxmKXtlKGkpJiYoZj1pLGk9e30sYT17fSksZShhKSYmKGY9YSxhPXt9KTt2YXIgbD1hLnRpbWVvdXR8fDE1ZTMsZD1hLnByZWZpeHx8XCJfX2pzb25wXCIscD1hLnBhcmFtfHxcImNhbGxiYWNrXCIsbT1hLm5hbWV8fHQoZCkscz1yKG4saSxwLG0pLGg9c2V0VGltZW91dChmdW5jdGlvbigpe2YobmV3IEVycm9yKFwianNvbnAgcmVxdWVzdCBmb3IgXCIrbStcIiB0aW1lZCBvdXQuXCIpLG51bGwpLHUoaCl9LGwpO2NbbV09ZnVuY3Rpb24obil7ZihudWxsLG4pLHUoaCksY1ttXT1udWxsfTt2YXIgaj1vKHMpO2oub25lcnJvcj1mdW5jdGlvbigpe2YobmV3IEVycm9yKFwianNvbnAgZW5jb3VudGVyZWQgYW4gZXJyb3Igd2hpbGUgbG9hZGluZyBpbmplY3RlZCBzY3JpcHQuXCIpLG51bGwpLHUoaCl9fXZhciBjPXdpbmRvdyxhPWRvY3VtZW50O3JldHVybiBpfSk7IiwiaW1wb3J0IHsgYnVzLCByZW5kZXIgfSBmcm9tICcuLi8uLi9zcmMvaW5kZXguanMnXG5pbXBvcnQgS2VmaXIgZnJvbSAna2VmaXInXG5pbXBvcnQganNvbnAgZnJvbSAnYi1qc29ucCdcblxuLy8gU3RyZWFtc1xubGV0IGFjdGlvbnMkID0gYnVzKClcbmxldCBxdWVyeSQgPSBidXMoKVxuXG4vLyBNb2RlbFxubGV0IGluaXRNb2RlbCA9IHt0b3BpYzogJ2NhdHMnLCB1cmw6ICdsb2FkaW5nLmdpZicsIGVycm9yOiBudWxsfVxuXG4vLyBVcGRhdGVcbmZ1bmN0aW9uIHVwZGF0ZSh7dG9waWMsIHVybH0sIFthY3Rpb24sIHZhbHVlXSkge1xuICBzd2l0Y2ggKGFjdGlvbikge1xuICAgIGNhc2UgJ2NoYW5nZVRvcGljJzpcbiAgICAgIHJldHVybiB7dG9waWM6IHZhbHVlLCB1cmx9XG4gICAgY2FzZSAncmVzdWx0JzpcbiAgICAgIHJldHVybiB7dG9waWMsIHVybDogdmFsdWV9XG4gICAgY2FzZSAnZXJyb3InOlxuICAgICAgcmV0dXJuIHt0b3BpYywgZXJyb3I6IHZhbHVlfVxuICB9XG59XG5cbi8vIFZpZXdcbmZ1bmN0aW9uIHZpZXcobW9kZWwpIHtcbiAgbGV0IHt0b3BpYywgdXJsLCBlcnJvcn0gPSBtb2RlbFxuICBsZXQgdiA9XG4gICAgWydkaXYnLCB7fSxcbiAgICAgIFsgWydpbnB1dCcsIHtwcm9wczoge3BsYWNlaG9sZGVyOiAnR2lwaHkgVG9waWMnLCB2YWx1ZTogdG9waWN9LCBvbjoge2lucHV0OiBoYW5kbGVJbnB1dH19XSxcbiAgICAgICAgWydidXR0b24nLCB7b246IHtjbGljazogW3F1ZXJ5JC5lbWl0LCB0b3BpY119fSwgJ01vcmUgUGxlYXNlISddLFxuICAgICAgICBbJ2JyJ10sXG4gICAgICAgIGVycm9yID8gWydkaXYnLCB7fSwgZXJyb3JdIDogWydpbWcnLCB7cHJvcHM6IHtzcmM6IHVybH19XV1dXG5cbiAgcmV0dXJuIHZcbn1cblxuZnVuY3Rpb24gaGFuZGxlSW5wdXQoZSl7XG4gIGxldCB2YWx1ZSA9IGUudGFyZ2V0LnZhbHVlLnRyaW0oKVxuICBhY3Rpb25zJC5lbWl0KFsnY2hhbmdlVG9waWMnLCB2YWx1ZV0pXG59XG5cbi8vIEh0dHBcbmZ1bmN0aW9uIGh0dHAodXJsKSB7XG4gIHJldHVybiBLZWZpci5mcm9tTm9kZUNhbGxiYWNrKGNhbGxiYWNrID0+IGpzb25wKHVybCwgY2FsbGJhY2spKVxufVxuXG5mdW5jdGlvbiB0b3BpY1RvVXJsKHRvcGljKXtcbiAgcmV0dXJuIGBodHRwczovL2FwaS5naXBoeS5jb20vdjEvZ2lmcy9yYW5kb20/YXBpX2tleT1kYzZ6YVRPeEZKbXpDJnRhZz0ke3RvcGljfWBcbn1cblxuZnVuY3Rpb24gcGFyc2VSZXNwb25zZSh7ZGF0YToge2ltYWdlX3VybH19KSB7XG4gIHJldHVybiBpbWFnZV91cmwgPyBbJ3Jlc3VsdCcsIGltYWdlX3VybF0gOiBbJ2Vycm9yJywgJ05vIGltYWdlcyBmb3VuZCddXG59XG5cbmxldCBlZmZlY3RzJCA9IHF1ZXJ5JFxuICAubWFwKHRvcGljVG9VcmwpXG4gIC5mbGF0TWFwRmlyc3QoaHR0cClcbiAgLm1hcChwYXJzZVJlc3BvbnNlKVxuICAuZmxhdE1hcEVycm9ycyhlID0+IEtlZmlyLmNvbnN0YW50KFsnZXJyb3InLCBlLm1lc3NhZ2VdKSlcblxuZWZmZWN0cyQuc3B5KCdFZmZlY3RzJylcblxuLy8gUmVkdWNlXG5sZXQgbW9kZWwkID0gYWN0aW9ucyQubWVyZ2UoZWZmZWN0cyQpLnNjYW4odXBkYXRlLCBpbml0TW9kZWwpXG5tb2RlbCQuc3B5KCdNb2RlbCcpXG5cbi8vIFJlbmRlclxubGV0IHZpZXckID0gbW9kZWwkLm1hcCh2aWV3KVxucmVuZGVyKHZpZXckLCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGFpbmVyJykpXG5cbi8vIEluaXRcbnF1ZXJ5JC5lbWl0KGluaXRNb2RlbClcbiJdLCJuYW1lcyI6WyJyZXF1aXJlJCQyIiwicmVxdWlyZSQkMSIsInJlcXVpcmUkJDAiLCJ2bm9kZSIsIlZOb2RlIiwiaXMiLCJ0aGlzIiwiY29tbW9uanNHbG9iYWwiLCJnbG9iYWwiLCJjcmVhdGVDb21tb25qc01vZHVsZSIsInNuYWJDbGFzcyIsInNuYWJQcm9wcyIsInNuYWJTdHlsZSIsInNuYWJFdmVudCIsImpzb25wIl0sIm1hcHBpbmdzIjoiQUFBQSxTQUFjLEdBQUcsU0FBUyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJ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QUFDO0lBQ3pCLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO01BQ2YsSUFBSSxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUM3QyxDQUFDLENBQUNBLFFBQUssQ0FBQyxDQUFDO1FBQ1QsSUFBSSxHQUFHQSxRQUFLLENBQUMsSUFBSSxDQUFDO09BQ25CO0tBQ0Y7SUFDRCxJQUFJLEdBQUcsRUFBRSxRQUFRLEdBQUdBLFFBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxHQUFHQSxRQUFLLENBQUMsR0FBRyxDQUFDO0lBQ3BELElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFOztNQUVkLElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7TUFDL0IsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7TUFDdkMsSUFBSSxJQUFJLEdBQUcsT0FBTyxHQUFHLENBQUMsR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztNQUM5QyxJQUFJLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO01BQzNDLElBQUksR0FBRyxHQUFHLE9BQU8sS0FBSyxDQUFDLENBQUMsSUFBSSxNQUFNLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7TUFDcEYsR0FBRyxHQUFHQSxRQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxH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USxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtNQUN4QyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNoRTtHQUNGO0NBQ0Y7O0FBRUQsS0FBYyxHQUFHLFNBQVMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ3JDLElBQUksSUFBSSxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztFQUNqQyxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUU7SUFDbkIsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUNULElBQUlHLElBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUU7U0FDN0IsSUFBSUEsSUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRTtHQUN4QyxNQUFNLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRTtJQUMxQixJQUFJQSxJQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFO1NBQzdCLElBQUlBLElBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUU7U0FDbEMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUU7R0FDbkI7RUFDRCxJQUFJQSxJQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFO0lBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtNQUNwQyxJQUFJQSxJQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBR0QsT0FBSyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2xHO0dBQ0Y7RUFDRCxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0lBQ3RELEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0dBQzVCO0VBQ0QsT0FBT0EsT0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztDQUNwRCxDQUFDOztBQ2pDRixTQUFTLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFO0VBQ3BDLElBQUksR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7TUFDMUIsUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSztNQUM5QixLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7O0VBRTdCLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTztFQUNoQyxRQUFRLEdBQUcsUUFBUSxJQUFJLEVBQUUsQ0FBQztFQUMxQixLQUFLLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQzs7RUFFcEIsS0FBSyxJQUFJLElBQUksUUFBUSxFQUFFO0lBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7TUFDaEIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDNUI7R0FDRjtFQUNELEtBQUssSUFBSSxJQUFJLEtBQUssRUFBRTtJQUNsQixHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lB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SyxFQUFFLE9BQU8sRUFBRTtHQUMzRSxPQUFPLHFCQUFxQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0VBQzFELENBQUM7O0NBRUYsVUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsVUFBVSxVQUFVLEVBQUU7R0FDckQsT0FBTyxTQUFTLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0VBQ3BDLENBQUM7O0NBRUYsVUFBVSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsVUFBVSxFQUFFLEVBQUU7R0FDL0MsT0FBTyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0VBQzlCLENBQUM7O0NBRUYsVUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxLQUFLLEVBQUUsVUFBVSxFQUFFO0dBQzFELE9BQU8sT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0VBQzNDLENBQUM7O0NBRUYsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsVUFBVSxLQUFLLEVBQUUsVUFBVSxFQUFFO0dBQ3RELE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0VBQ3ZDLENBQUM7O0NBRUYsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsVUFBVSxLQUFLLEVBQUU7R0FDNUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztFQUM3QixDQUFDOztDQUVGLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFVBQVUsS0FBSyxFQUFFO0dBQzdDLE9BQU8sUUFBUSxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7RUFDaEMsQ0FBQzs7Q0FFRixJQUFJLElBQUksR0FBRyxZQUFZO0dBQ3JCLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQztFQUNuQixDQUFDOztDQUVGLFVB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RSxPQUFPLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFBLENBQUMsQ0FBQ1AsY0FBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0VBQWdFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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
