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

var bJsonp_min = createCommonjsModule(function (module) {
!function(n,e){"function"==typeof define&&define.amd?define([],e):"object"==typeof module&&module.exports?module.exports=e():n.jsonp=e();}(commonjsGlobal,function(){function n(n){n=n||5;for(var e="",o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=o.length,r=0;n>r;r++)e+=o.charAt(Math.floor(Math.random()*t));return e}function e(n){var e="[object Function]",o=Object.prototype.toString;return o.call(n)==e}function o(n,e){var o=a.getElementsByTagName("head")[0],t=a.createElement("script");return t.src=n,t.async=!0,t.defer=!0,o.appendChild(t),t}function t(e){return e+"__"+n()}function r(n,e,o,t){var r=-1===n.indexOf("?")?"?":"&";for(var u in e)e.hasOwnProperty(u)&&(r+=encodeURIComponent(u)+"="+encodeURIComponent(e[u])+"&");return n+r+o+"="+t}function u(n){clearTimeout(n),n=null;}function i(n,i,a,f){e(i)&&(f=i,i={},a={}),e(a)&&(f=a,a={});var l=a.timeout||15e3,d=a.prefix||"__jsonp",p=a.param||"callback",m=a.name||t(d),s=r(n,i,p,m),h=setTimeout(function(){f(new Error("jsonp request for "+m+" timed out."),null),u(h);},l);c[m]=function(n){f(null,n),u(h),c[m]=null;};var j=o(s);j.onerror=function(){f(new Error("jsonp encountered an error while loading injected script."),null),u(h);};}var c=window,a=document;return i});
});

// Streams
let actions$ = bus();
let query$ = bus();

// Model
let initModel = [];

// Update
function update(model, [action, value]) {
  switch (action) {
    case 'results':
      return value
  }
}

// View
function view(model) {
  let v =
    ['div', {},
      [ ['input', {props: {placeholder: "Search Wikipedia"}, on: {input: query$.emit}}],
        ['ul', {},
          model.map(result => ['li', {}, result])]]];

  return v
}

// Http
function http(url) {
  return Kefir.fromNodeCallback(callback => bJsonp_min(url, callback))
}

function eventToUrl(event){
  let query = event.target.value.trim();
  return `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=${query}`
}

let effects$ = query$
  .debounce(150)
  .map(eventToUrl)
  .flatMapLatest(http)
  .map(([,x]) => ['results', x]);

// Reduce
let model$ = actions$.merge(effects$).scan(update, initModel);

// Render
let view$ = model$.map(view);
render(view$, document.getElementById('container'));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS92bm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9pcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9odG1sZG9tYXBpLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL3NuYWJiZG9tLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9jbGFzcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9rZWZpci9kaXN0L2tlZmlyLmpzIiwiLi4vLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2ItanNvbnAvZGlzdC9iLWpzb25wLm1pbi5qcyIsImluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2VsLCBkYXRhLCBjaGlsZHJlbiwgdGV4dCwgZWxtKSB7XG4gIHZhciBrZXkgPSBkYXRhID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBkYXRhLmtleTtcbiAgcmV0dXJuIHtzZWw6IHNlbCwgZGF0YTogZGF0YSwgY2hpbGRyZW46IGNoaWxkcmVuLFxuICAgICAgICAgIHRleHQ6IHRleHQsIGVsbTogZWxtLCBrZXk6IGtleX07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFycmF5OiBBcnJheS5pc0FycmF5LFxuICBwcmltaXRpdmU6IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIHR5cGVvZiBzID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgcyA9PT0gJ251bWJlcic7IH0sXG59O1xuIiwiZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWdOYW1lKXtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIHF1YWxpZmllZE5hbWUpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgcXVhbGlmaWVkTmFtZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRleHROb2RlKHRleHQpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG59XG5cblxuZnVuY3Rpb24gaW5zZXJ0QmVmb3JlKHBhcmVudE5vZGUsIG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpe1xuICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCByZWZlcmVuY2VOb2RlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVDaGlsZChub2RlLCBjaGlsZCl7XG4gIG5vZGUucmVtb3ZlQ2hpbGQoY2hpbGQpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRDaGlsZChub2RlLCBjaGlsZCl7XG4gIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGQpO1xufVxuXG5mdW5jdGlvbiBwYXJlbnROb2RlKG5vZGUpe1xuICByZXR1cm4gbm9kZS5wYXJlbnRFbGVtZW50O1xufVxuXG5mdW5jdGlvbiBuZXh0U2libGluZyhub2RlKXtcbiAgcmV0dXJuIG5vZGUubmV4dFNpYmxpbmc7XG59XG5cbmZ1bmN0aW9uIHRhZ05hbWUobm9kZSl7XG4gIHJldHVybiBub2RlLnRhZ05hbWU7XG59XG5cbmZ1bmN0aW9uIHNldFRleHRDb250ZW50KG5vZGUsIHRleHQpe1xuICBub2RlLnRleHRDb250ZW50ID0gdGV4dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZUVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnQsXG4gIGNyZWF0ZUVsZW1lbnROUzogY3JlYXRlRWxlbWVudE5TLFxuICBjcmVhdGVUZXh0Tm9kZTogY3JlYXRlVGV4dE5vZGUsXG4gIGFwcGVuZENoaWxkOiBhcHBlbmRDaGlsZCxcbiAgcmVtb3ZlQ2hpbGQ6IHJlbW92ZUNoaWxkLFxuICBpbnNlcnRCZWZvcmU6IGluc2VydEJlZm9yZSxcbiAgcGFyZW50Tm9kZTogcGFyZW50Tm9kZSxcbiAgbmV4dFNpYmxpbmc6IG5leHRTaWJsaW5nLFxuICB0YWdOYW1lOiB0YWdOYW1lLFxuICBzZXRUZXh0Q29udGVudDogc2V0VGV4dENvbnRlbnRcbn07XG4iLCIvLyBqc2hpbnQgbmV3Y2FwOiBmYWxzZVxuLyogZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSwgZG9jdW1lbnQsIE5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFZOb2RlID0gcmVxdWlyZSgnLi92bm9kZScpO1xudmFyIGlzID0gcmVxdWlyZSgnLi9pcycpO1xudmFyIGRvbUFwaSA9IHJlcXVpcmUoJy4vaHRtbGRvbWFwaScpO1xuXG5mdW5jdGlvbiBpc1VuZGVmKHMpIHsgcmV0dXJuIHMgPT09IHVuZGVmaW5lZDsgfVxuZnVuY3Rpb24gaXNEZWYocykgeyByZXR1cm4gcyAhPT0gdW5kZWZpbmVkOyB9XG5cbnZhciBlbXB0eU5vZGUgPSBWTm9kZSgnJywge30sIFtdLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5cbmZ1bmN0aW9uIHNhbWVWbm9kZSh2bm9kZTEsIHZub2RlMikge1xuICByZXR1cm4gdm5vZGUxLmtleSA9PT0gdm5vZGUyLmtleSAmJiB2bm9kZTEuc2VsID09PSB2bm9kZTIuc2VsO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVLZXlUb09sZElkeChjaGlsZHJlbiwgYmVnaW5JZHgsIGVuZElkeCkge1xuICB2YXIgaSwgbWFwID0ge30sIGtleTtcbiAgZm9yIChpID0gYmVnaW5JZHg7IGkgPD0gZW5kSWR4OyArK2kpIHtcbiAgICBrZXkgPSBjaGlsZHJlbltpXS5rZXk7XG4gICAgaWYgKGlzRGVmKGtleSkpIG1hcFtrZXldID0gaTtcbiAgfVxuICByZXR1cm4gbWFwO1xufVxuXG52YXIgaG9va3MgPSBbJ2NyZWF0ZScsICd1cGRhdGUnLCAncmVtb3ZlJywgJ2Rlc3Ryb3knLCAncHJlJywgJ3Bvc3QnXTtcblxuZnVuY3Rpb24gaW5pdChtb2R1bGVzLCBhcGkpIHtcbiAgdmFyIGksIGosIGNicyA9IHt9O1xuXG4gIGlmIChpc1VuZGVmKGFwaSkpIGFwaSA9IGRvbUFwaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgaG9va3MubGVuZ3RoOyArK2kpIHtcbiAgICBjYnNbaG9va3NbaV1dID0gW107XG4gICAgZm9yIChqID0gMDsgaiA8IG1vZHVsZXMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmIChtb2R1bGVzW2pdW2hvb2tzW2ldXSAhPT0gdW5kZWZpbmVkKSBjYnNbaG9va3NbaV1dLnB1c2gobW9kdWxlc1tqXVtob29rc1tpXV0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVtcHR5Tm9kZUF0KGVsbSkge1xuICAgIHZhciBpZCA9IGVsbS5pZCA/ICcjJyArIGVsbS5pZCA6ICcnO1xuICAgIHZhciBjID0gZWxtLmNsYXNzTmFtZSA/ICcuJyArIGVsbS5jbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCcuJykgOiAnJztcbiAgICByZXR1cm4gVk5vZGUoYXBpLnRhZ05hbWUoZWxtKS50b0xvd2VyQ2FzZSgpICsgaWQgKyBjLCB7fSwgW10sIHVuZGVmaW5lZCwgZWxtKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVJtQ2IoY2hpbGRFbG0sIGxpc3RlbmVycykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLWxpc3RlbmVycyA9PT0gMCkge1xuICAgICAgICB2YXIgcGFyZW50ID0gYXBpLnBhcmVudE5vZGUoY2hpbGRFbG0pO1xuICAgICAgICBhcGkucmVtb3ZlQ2hpbGQocGFyZW50LCBjaGlsZEVsbSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIGksIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgIGlmIChpc0RlZihkYXRhKSkge1xuICAgICAgaWYgKGlzRGVmKGkgPSBkYXRhLmhvb2spICYmIGlzRGVmKGkgPSBpLmluaXQpKSB7XG4gICAgICAgIGkodm5vZGUpO1xuICAgICAgICBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGVsbSwgY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbiwgc2VsID0gdm5vZGUuc2VsO1xuICAgIGlmIChpc0RlZihzZWwpKSB7XG4gICAgICAvLyBQYXJzZSBzZWxlY3RvclxuICAgICAgdmFyIGhhc2hJZHggPSBzZWwuaW5kZXhPZignIycpO1xuICAgICAgdmFyIGRvdElkeCA9IHNlbC5pbmRleE9mKCcuJywgaGFzaElkeCk7XG4gICAgICB2YXIgaGFzaCA9IGhhc2hJZHggPiAwID8gaGFzaElkeCA6IHNlbC5sZW5ndGg7XG4gICAgICB2YXIgZG90ID0gZG90SWR4ID4gMCA/IGRvdElkeCA6IHNlbC5sZW5ndGg7XG4gICAgICB2YXIgdGFnID0gaGFzaElkeCAhPT0gLTEgfHwgZG90SWR4ICE9PSAtMSA/IHNlbC5zbGljZSgwLCBNYXRoLm1pbihoYXNoLCBkb3QpKSA6IHNlbDtcbiAgICAgIGVsbSA9IHZub2RlLmVsbSA9IGlzRGVmKGRhdGEpICYmIGlzRGVmKGkgPSBkYXRhLm5zKSA/IGFwaS5jcmVhdGVFbGVtZW50TlMoaSwgdGFnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogYXBpLmNyZWF0ZUVsZW1lbnQodGFnKTtcbiAgICAgIGlmIChoYXNoIDwgZG90KSBlbG0uaWQgPSBzZWwuc2xpY2UoaGFzaCArIDEsIGRvdCk7XG4gICAgICBpZiAoZG90SWR4ID4gMCkgZWxtLmNsYXNzTmFtZSA9IHNlbC5zbGljZShkb3QgKyAxKS5yZXBsYWNlKC9cXC4vZywgJyAnKTtcbiAgICAgIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgYXBpLmFwcGVuZENoaWxkKGVsbSwgY3JlYXRlRWxtKGNoaWxkcmVuW2ldLCBpbnNlcnRlZFZub2RlUXVldWUpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpcy5wcmltaXRpdmUodm5vZGUudGV4dCkpIHtcbiAgICAgICAgYXBpLmFwcGVuZENoaWxkKGVsbSwgYXBpLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpKTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMuY3JlYXRlLmxlbmd0aDsgKytpKSBjYnMuY3JlYXRlW2ldKGVtcHR5Tm9kZSwgdm5vZGUpO1xuICAgICAgaSA9IHZub2RlLmRhdGEuaG9vazsgLy8gUmV1c2UgdmFyaWFibGVcbiAgICAgIGlmIChpc0RlZihpKSkge1xuICAgICAgICBpZiAoaS5jcmVhdGUpIGkuY3JlYXRlKGVtcHR5Tm9kZSwgdm5vZGUpO1xuICAgICAgICBpZiAoaS5pbnNlcnQpIGluc2VydGVkVm5vZGVRdWV1ZS5wdXNoKHZub2RlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZWxtID0gdm5vZGUuZWxtID0gYXBpLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpO1xuICAgIH1cbiAgICByZXR1cm4gdm5vZGUuZWxtO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCB2bm9kZXMsIHN0YXJ0SWR4LCBlbmRJZHgsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIGZvciAoOyBzdGFydElkeCA8PSBlbmRJZHg7ICsrc3RhcnRJZHgpIHtcbiAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBjcmVhdGVFbG0odm5vZGVzW3N0YXJ0SWR4XSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSwgYmVmb3JlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbnZva2VEZXN0cm95SG9vayh2bm9kZSkge1xuICAgIHZhciBpLCBqLCBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICBpZiAoaXNEZWYoZGF0YSkpIHtcbiAgICAgIGlmIChpc0RlZihpID0gZGF0YS5ob29rKSAmJiBpc0RlZihpID0gaS5kZXN0cm95KSkgaSh2bm9kZSk7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLmRlc3Ryb3kubGVuZ3RoOyArK2kpIGNicy5kZXN0cm95W2ldKHZub2RlKTtcbiAgICAgIGlmIChpc0RlZihpID0gdm5vZGUuY2hpbGRyZW4pKSB7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCB2bm9kZS5jaGlsZHJlbi5sZW5ndGg7ICsraikge1xuICAgICAgICAgIGludm9rZURlc3Ryb3lIb29rKHZub2RlLmNoaWxkcmVuW2pdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIHZub2Rlcywgc3RhcnRJZHgsIGVuZElkeCkge1xuICAgIGZvciAoOyBzdGFydElkeCA8PSBlbmRJZHg7ICsrc3RhcnRJZHgpIHtcbiAgICAgIHZhciBpLCBsaXN0ZW5lcnMsIHJtLCBjaCA9IHZub2Rlc1tzdGFydElkeF07XG4gICAgICBpZiAoaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChpc0RlZihjaC5zZWwpKSB7XG4gICAgICAgICAgaW52b2tlRGVzdHJveUhvb2soY2gpO1xuICAgICAgICAgIGxpc3RlbmVycyA9IGNicy5yZW1vdmUubGVuZ3RoICsgMTtcbiAgICAgICAgICBybSA9IGNyZWF0ZVJtQ2IoY2guZWxtLCBsaXN0ZW5lcnMpO1xuICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucmVtb3ZlLmxlbmd0aDsgKytpKSBjYnMucmVtb3ZlW2ldKGNoLCBybSk7XG4gICAgICAgICAgaWYgKGlzRGVmKGkgPSBjaC5kYXRhKSAmJiBpc0RlZihpID0gaS5ob29rKSAmJiBpc0RlZihpID0gaS5yZW1vdmUpKSB7XG4gICAgICAgICAgICBpKGNoLCBybSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJtKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBUZXh0IG5vZGVcbiAgICAgICAgICBhcGkucmVtb3ZlQ2hpbGQocGFyZW50RWxtLCBjaC5lbG0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlQ2hpbGRyZW4ocGFyZW50RWxtLCBvbGRDaCwgbmV3Q2gsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIHZhciBvbGRTdGFydElkeCA9IDAsIG5ld1N0YXJ0SWR4ID0gMDtcbiAgICB2YXIgb2xkRW5kSWR4ID0gb2xkQ2gubGVuZ3RoIC0gMTtcbiAgICB2YXIgb2xkU3RhcnRWbm9kZSA9IG9sZENoWzBdO1xuICAgIHZhciBvbGRFbmRWbm9kZSA9IG9sZENoW29sZEVuZElkeF07XG4gICAgdmFyIG5ld0VuZElkeCA9IG5ld0NoLmxlbmd0aCAtIDE7XG4gICAgdmFyIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFswXTtcbiAgICB2YXIgbmV3RW5kVm5vZGUgPSBuZXdDaFtuZXdFbmRJZHhdO1xuICAgIHZhciBvbGRLZXlUb0lkeCwgaWR4SW5PbGQsIGVsbVRvTW92ZSwgYmVmb3JlO1xuXG4gICAgd2hpbGUgKG9sZFN0YXJ0SWR4IDw9IG9sZEVuZElkeCAmJiBuZXdTdGFydElkeCA8PSBuZXdFbmRJZHgpIHtcbiAgICAgIGlmIChpc1VuZGVmKG9sZFN0YXJ0Vm5vZGUpKSB7XG4gICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTsgLy8gVm5vZGUgaGFzIGJlZW4gbW92ZWQgbGVmdFxuICAgICAgfSBlbHNlIGlmIChpc1VuZGVmKG9sZEVuZFZub2RlKSkge1xuICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld1N0YXJ0Vm5vZGUpKSB7XG4gICAgICAgIHBhdGNoVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgb2xkU3RhcnRWbm9kZSA9IG9sZENoWysrb2xkU3RhcnRJZHhdO1xuICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRFbmRWbm9kZSwgbmV3RW5kVm5vZGUpKSB7XG4gICAgICAgIHBhdGNoVm5vZGUob2xkRW5kVm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgICAgbmV3RW5kVm5vZGUgPSBuZXdDaFstLW5ld0VuZElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRTdGFydFZub2RlLCBuZXdFbmRWbm9kZSkpIHsgLy8gVm5vZGUgbW92ZWQgcmlnaHRcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRTdGFydFZub2RlLCBuZXdFbmRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtLCBhcGkubmV4dFNpYmxpbmcob2xkRW5kVm5vZGUuZWxtKSk7XG4gICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTtcbiAgICAgICAgbmV3RW5kVm5vZGUgPSBuZXdDaFstLW5ld0VuZElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRFbmRWbm9kZSwgbmV3U3RhcnRWbm9kZSkpIHsgLy8gVm5vZGUgbW92ZWQgbGVmdFxuICAgICAgICBwYXRjaFZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgb2xkRW5kVm5vZGUuZWxtLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgIG9sZEVuZFZub2RlID0gb2xkQ2hbLS1vbGRFbmRJZHhdO1xuICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaXNVbmRlZihvbGRLZXlUb0lkeCkpIG9sZEtleVRvSWR4ID0gY3JlYXRlS2V5VG9PbGRJZHgob2xkQ2gsIG9sZFN0YXJ0SWR4LCBvbGRFbmRJZHgpO1xuICAgICAgICBpZHhJbk9sZCA9IG9sZEtleVRvSWR4W25ld1N0YXJ0Vm5vZGUua2V5XTtcbiAgICAgICAgaWYgKGlzVW5kZWYoaWR4SW5PbGQpKSB7IC8vIE5ldyBlbGVtZW50XG4gICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbShuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgICAgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWysrbmV3U3RhcnRJZHhdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVsbVRvTW92ZSA9IG9sZENoW2lkeEluT2xkXTtcbiAgICAgICAgICBwYXRjaFZub2RlKGVsbVRvTW92ZSwgbmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgICBvbGRDaFtpZHhJbk9sZF0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGVsbVRvTW92ZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9sZFN0YXJ0SWR4ID4gb2xkRW5kSWR4KSB7XG4gICAgICBiZWZvcmUgPSBpc1VuZGVmKG5ld0NoW25ld0VuZElkeCsxXSkgPyBudWxsIDogbmV3Q2hbbmV3RW5kSWR4KzFdLmVsbTtcbiAgICAgIGFkZFZub2RlcyhwYXJlbnRFbG0sIGJlZm9yZSwgbmV3Q2gsIG5ld1N0YXJ0SWR4LCBuZXdFbmRJZHgsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgfSBlbHNlIGlmIChuZXdTdGFydElkeCA+IG5ld0VuZElkeCkge1xuICAgICAgcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgb2xkQ2gsIG9sZFN0YXJ0SWR4LCBvbGRFbmRJZHgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhdGNoVm5vZGUob2xkVm5vZGUsIHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICB2YXIgaSwgaG9vaztcbiAgICBpZiAoaXNEZWYoaSA9IHZub2RlLmRhdGEpICYmIGlzRGVmKGhvb2sgPSBpLmhvb2spICYmIGlzRGVmKGkgPSBob29rLnByZXBhdGNoKSkge1xuICAgICAgaShvbGRWbm9kZSwgdm5vZGUpO1xuICAgIH1cbiAgICB2YXIgZWxtID0gdm5vZGUuZWxtID0gb2xkVm5vZGUuZWxtLCBvbGRDaCA9IG9sZFZub2RlLmNoaWxkcmVuLCBjaCA9IHZub2RlLmNoaWxkcmVuO1xuICAgIGlmIChvbGRWbm9kZSA9PT0gdm5vZGUpIHJldHVybjtcbiAgICBpZiAoIXNhbWVWbm9kZShvbGRWbm9kZSwgdm5vZGUpKSB7XG4gICAgICB2YXIgcGFyZW50RWxtID0gYXBpLnBhcmVudE5vZGUob2xkVm5vZGUuZWxtKTtcbiAgICAgIGVsbSA9IGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBlbG0sIG9sZFZub2RlLmVsbSk7XG4gICAgICByZW1vdmVWbm9kZXMocGFyZW50RWxtLCBbb2xkVm5vZGVdLCAwLCAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzRGVmKHZub2RlLmRhdGEpKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnVwZGF0ZS5sZW5ndGg7ICsraSkgY2JzLnVwZGF0ZVtpXShvbGRWbm9kZSwgdm5vZGUpO1xuICAgICAgaSA9IHZub2RlLmRhdGEuaG9vaztcbiAgICAgIGlmIChpc0RlZihpKSAmJiBpc0RlZihpID0gaS51cGRhdGUpKSBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICAgIGlmIChpc1VuZGVmKHZub2RlLnRleHQpKSB7XG4gICAgICBpZiAoaXNEZWYob2xkQ2gpICYmIGlzRGVmKGNoKSkge1xuICAgICAgICBpZiAob2xkQ2ggIT09IGNoKSB1cGRhdGVDaGlsZHJlbihlbG0sIG9sZENoLCBjaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWYoY2gpKSB7XG4gICAgICAgIGlmIChpc0RlZihvbGRWbm9kZS50ZXh0KSkgYXBpLnNldFRleHRDb250ZW50KGVsbSwgJycpO1xuICAgICAgICBhZGRWbm9kZXMoZWxtLCBudWxsLCBjaCwgMCwgY2gubGVuZ3RoIC0gMSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWYob2xkQ2gpKSB7XG4gICAgICAgIHJlbW92ZVZub2RlcyhlbG0sIG9sZENoLCAwLCBvbGRDaC5sZW5ndGggLSAxKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWYob2xkVm5vZGUudGV4dCkpIHtcbiAgICAgICAgYXBpLnNldFRleHRDb250ZW50KGVsbSwgJycpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob2xkVm5vZGUudGV4dCAhPT0gdm5vZGUudGV4dCkge1xuICAgICAgYXBpLnNldFRleHRDb250ZW50KGVsbSwgdm5vZGUudGV4dCk7XG4gICAgfVxuICAgIGlmIChpc0RlZihob29rKSAmJiBpc0RlZihpID0gaG9vay5wb3N0cGF0Y2gpKSB7XG4gICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG9sZFZub2RlLCB2bm9kZSkge1xuICAgIHZhciBpLCBlbG0sIHBhcmVudDtcbiAgICB2YXIgaW5zZXJ0ZWRWbm9kZVF1ZXVlID0gW107XG4gICAgZm9yIChpID0gMDsgaSA8IGNicy5wcmUubGVuZ3RoOyArK2kpIGNicy5wcmVbaV0oKTtcblxuICAgIGlmIChpc1VuZGVmKG9sZFZub2RlLnNlbCkpIHtcbiAgICAgIG9sZFZub2RlID0gZW1wdHlOb2RlQXQob2xkVm5vZGUpO1xuICAgIH1cblxuICAgIGlmIChzYW1lVm5vZGUob2xkVm5vZGUsIHZub2RlKSkge1xuICAgICAgcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsbSA9IG9sZFZub2RlLmVsbTtcbiAgICAgIHBhcmVudCA9IGFwaS5wYXJlbnROb2RlKGVsbSk7XG5cbiAgICAgIGNyZWF0ZUVsbSh2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcblxuICAgICAgaWYgKHBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudCwgdm5vZGUuZWxtLCBhcGkubmV4dFNpYmxpbmcoZWxtKSk7XG4gICAgICAgIHJlbW92ZVZub2RlcyhwYXJlbnQsIFtvbGRWbm9kZV0sIDAsIDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBpbnNlcnRlZFZub2RlUXVldWUubGVuZ3RoOyArK2kpIHtcbiAgICAgIGluc2VydGVkVm5vZGVRdWV1ZVtpXS5kYXRhLmhvb2suaW5zZXJ0KGluc2VydGVkVm5vZGVRdWV1ZVtpXSk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucG9zdC5sZW5ndGg7ICsraSkgY2JzLnBvc3RbaV0oKTtcbiAgICByZXR1cm4gdm5vZGU7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2luaXQ6IGluaXR9O1xuIiwidmFyIFZOb2RlID0gcmVxdWlyZSgnLi92bm9kZScpO1xudmFyIGlzID0gcmVxdWlyZSgnLi9pcycpO1xuXG5mdW5jdGlvbiBhZGROUyhkYXRhLCBjaGlsZHJlbiwgc2VsKSB7XG4gIGRhdGEubnMgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnO1xuXG4gIGlmIChzZWwgIT09ICdmb3JlaWduT2JqZWN0JyAmJiBjaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgYWRkTlMoY2hpbGRyZW5baV0uZGF0YSwgY2hpbGRyZW5baV0uY2hpbGRyZW4sIGNoaWxkcmVuW2ldLnNlbCk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaChzZWwsIGIsIGMpIHtcbiAgdmFyIGRhdGEgPSB7fSwgY2hpbGRyZW4sIHRleHQsIGk7XG4gIGlmIChjICE9PSB1bmRlZmluZWQpIHtcbiAgICBkYXRhID0gYjtcbiAgICBpZiAoaXMuYXJyYXkoYykpIHsgY2hpbGRyZW4gPSBjOyB9XG4gICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGMpKSB7IHRleHQgPSBjOyB9XG4gIH0gZWxzZSBpZiAoYiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGlzLmFycmF5KGIpKSB7IGNoaWxkcmVuID0gYjsgfVxuICAgIGVsc2UgaWYgKGlzLnByaW1pdGl2ZShiKSkgeyB0ZXh0ID0gYjsgfVxuICAgIGVsc2UgeyBkYXRhID0gYjsgfVxuICB9XG4gIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmIChpcy5wcmltaXRpdmUoY2hpbGRyZW5baV0pKSBjaGlsZHJlbltpXSA9IFZOb2RlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGNoaWxkcmVuW2ldKTtcbiAgICB9XG4gIH1cbiAgaWYgKHNlbFswXSA9PT0gJ3MnICYmIHNlbFsxXSA9PT0gJ3YnICYmIHNlbFsyXSA9PT0gJ2cnKSB7XG4gICAgYWRkTlMoZGF0YSwgY2hpbGRyZW4sIHNlbCk7XG4gIH1cbiAgcmV0dXJuIFZOb2RlKHNlbCwgZGF0YSwgY2hpbGRyZW4sIHRleHQsIHVuZGVmaW5lZCk7XG59O1xuIiwiZnVuY3Rpb24gdXBkYXRlQ2xhc3Mob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBjdXIsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZENsYXNzID0gb2xkVm5vZGUuZGF0YS5jbGFzcyxcbiAgICAgIGtsYXNzID0gdm5vZGUuZGF0YS5jbGFzcztcblxuICBpZiAoIW9sZENsYXNzICYmICFrbGFzcykgcmV0dXJuO1xuICBvbGRDbGFzcyA9IG9sZENsYXNzIHx8IHt9O1xuICBrbGFzcyA9IGtsYXNzIHx8IHt9O1xuXG4gIGZvciAobmFtZSBpbiBvbGRDbGFzcykge1xuICAgIGlmICgha2xhc3NbbmFtZV0pIHtcbiAgICAgIGVsbS5jbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgIH1cbiAgfVxuICBmb3IgKG5hbWUgaW4ga2xhc3MpIHtcbiAgICBjdXIgPSBrbGFzc1tuYW1lXTtcbiAgICBpZiAoY3VyICE9PSBvbGRDbGFzc1tuYW1lXSkge1xuICAgICAgZWxtLmNsYXNzTGlzdFtjdXIgPyAnYWRkJyA6ICdyZW1vdmUnXShuYW1lKTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y3JlYXRlOiB1cGRhdGVDbGFzcywgdXBkYXRlOiB1cGRhdGVDbGFzc307XG4iLCJmdW5jdGlvbiB1cGRhdGVQcm9wcyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGtleSwgY3VyLCBvbGQsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZFByb3BzID0gb2xkVm5vZGUuZGF0YS5wcm9wcywgcHJvcHMgPSB2bm9kZS5kYXRhLnByb3BzO1xuXG4gIGlmICghb2xkUHJvcHMgJiYgIXByb3BzKSByZXR1cm47XG4gIG9sZFByb3BzID0gb2xkUHJvcHMgfHwge307XG4gIHByb3BzID0gcHJvcHMgfHwge307XG5cbiAgZm9yIChrZXkgaW4gb2xkUHJvcHMpIHtcbiAgICBpZiAoIXByb3BzW2tleV0pIHtcbiAgICAgIGRlbGV0ZSBlbG1ba2V5XTtcbiAgICB9XG4gIH1cbiAgZm9yIChrZXkgaW4gcHJvcHMpIHtcbiAgICBjdXIgPSBwcm9wc1trZXldO1xuICAgIG9sZCA9IG9sZFByb3BzW2tleV07XG4gICAgaWYgKG9sZCAhPT0gY3VyICYmIChrZXkgIT09ICd2YWx1ZScgfHwgZWxtW2tleV0gIT09IGN1cikpIHtcbiAgICAgIGVsbVtrZXldID0gY3VyO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjcmVhdGU6IHVwZGF0ZVByb3BzLCB1cGRhdGU6IHVwZGF0ZVByb3BzfTtcbiIsInZhciByYWYgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkgfHwgc2V0VGltZW91dDtcbnZhciBuZXh0RnJhbWUgPSBmdW5jdGlvbihmbikgeyByYWYoZnVuY3Rpb24oKSB7IHJhZihmbik7IH0pOyB9O1xuXG5mdW5jdGlvbiBzZXROZXh0RnJhbWUob2JqLCBwcm9wLCB2YWwpIHtcbiAgbmV4dEZyYW1lKGZ1bmN0aW9uKCkgeyBvYmpbcHJvcF0gPSB2YWw7IH0pO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTdHlsZShvbGRWbm9kZSwgdm5vZGUpIHtcbiAgdmFyIGN1ciwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLFxuICAgICAgb2xkU3R5bGUgPSBvbGRWbm9kZS5kYXRhLnN0eWxlLFxuICAgICAgc3R5bGUgPSB2bm9kZS5kYXRhLnN0eWxlO1xuXG4gIGlmICghb2xkU3R5bGUgJiYgIXN0eWxlKSByZXR1cm47XG4gIG9sZFN0eWxlID0gb2xkU3R5bGUgfHwge307XG4gIHN0eWxlID0gc3R5bGUgfHwge307XG4gIHZhciBvbGRIYXNEZWwgPSAnZGVsYXllZCcgaW4gb2xkU3R5bGU7XG5cbiAgZm9yIChuYW1lIGluIG9sZFN0eWxlKSB7XG4gICAgaWYgKCFzdHlsZVtuYW1lXSkge1xuICAgICAgZWxtLnN0eWxlW25hbWVdID0gJyc7XG4gICAgfVxuICB9XG4gIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgIGN1ciA9IHN0eWxlW25hbWVdO1xuICAgIGlmIChuYW1lID09PSAnZGVsYXllZCcpIHtcbiAgICAgIGZvciAobmFtZSBpbiBzdHlsZS5kZWxheWVkKSB7XG4gICAgICAgIGN1ciA9IHN0eWxlLmRlbGF5ZWRbbmFtZV07XG4gICAgICAgIGlmICghb2xkSGFzRGVsIHx8IGN1ciAhPT0gb2xkU3R5bGUuZGVsYXllZFtuYW1lXSkge1xuICAgICAgICAgIHNldE5leHRGcmFtZShlbG0uc3R5bGUsIG5hbWUsIGN1cik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5hbWUgIT09ICdyZW1vdmUnICYmIGN1ciAhPT0gb2xkU3R5bGVbbmFtZV0pIHtcbiAgICAgIGVsbS5zdHlsZVtuYW1lXSA9IGN1cjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYXBwbHlEZXN0cm95U3R5bGUodm5vZGUpIHtcbiAgdmFyIHN0eWxlLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sIHMgPSB2bm9kZS5kYXRhLnN0eWxlO1xuICBpZiAoIXMgfHwgIShzdHlsZSA9IHMuZGVzdHJveSkpIHJldHVybjtcbiAgZm9yIChuYW1lIGluIHN0eWxlKSB7XG4gICAgZWxtLnN0eWxlW25hbWVdID0gc3R5bGVbbmFtZV07XG4gIH1cbn1cblxuZnVuY3Rpb24gYXBwbHlSZW1vdmVTdHlsZSh2bm9kZSwgcm0pIHtcbiAgdmFyIHMgPSB2bm9kZS5kYXRhLnN0eWxlO1xuICBpZiAoIXMgfHwgIXMucmVtb3ZlKSB7XG4gICAgcm0oKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG5hbWUsIGVsbSA9IHZub2RlLmVsbSwgaWR4LCBpID0gMCwgbWF4RHVyID0gMCxcbiAgICAgIGNvbXBTdHlsZSwgc3R5bGUgPSBzLnJlbW92ZSwgYW1vdW50ID0gMCwgYXBwbGllZCA9IFtdO1xuICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICBhcHBsaWVkLnB1c2gobmFtZSk7XG4gICAgZWxtLnN0eWxlW25hbWVdID0gc3R5bGVbbmFtZV07XG4gIH1cbiAgY29tcFN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShlbG0pO1xuICB2YXIgcHJvcHMgPSBjb21wU3R5bGVbJ3RyYW5zaXRpb24tcHJvcGVydHknXS5zcGxpdCgnLCAnKTtcbiAgZm9yICg7IGkgPCBwcm9wcy5sZW5ndGg7ICsraSkge1xuICAgIGlmKGFwcGxpZWQuaW5kZXhPZihwcm9wc1tpXSkgIT09IC0xKSBhbW91bnQrKztcbiAgfVxuICBlbG0uYWRkRXZlbnRMaXN0ZW5lcigndHJhbnNpdGlvbmVuZCcsIGZ1bmN0aW9uKGV2KSB7XG4gICAgaWYgKGV2LnRhcmdldCA9PT0gZWxtKSAtLWFtb3VudDtcbiAgICBpZiAoYW1vdW50ID09PSAwKSBybSgpO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y3JlYXRlOiB1cGRhdGVTdHlsZSwgdXBkYXRlOiB1cGRhdGVTdHlsZSwgZGVzdHJveTogYXBwbHlEZXN0cm95U3R5bGUsIHJlbW92ZTogYXBwbHlSZW1vdmVTdHlsZX07XG4iLCJmdW5jdGlvbiBpbnZva2VIYW5kbGVyKGhhbmRsZXIsIHZub2RlLCBldmVudCkge1xuICBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIC8vIGNhbGwgZnVuY3Rpb24gaGFuZGxlclxuICAgIGhhbmRsZXIuY2FsbCh2bm9kZSwgZXZlbnQsIHZub2RlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJvYmplY3RcIikge1xuICAgIC8vIGNhbGwgaGFuZGxlciB3aXRoIGFyZ3VtZW50c1xuICAgIGlmICh0eXBlb2YgaGFuZGxlclswXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAvLyBzcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSBhcmd1bWVudCBmb3IgcGVyZm9ybWFuY2VcbiAgICAgIGlmIChoYW5kbGVyLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBoYW5kbGVyWzBdLmNhbGwodm5vZGUsIGhhbmRsZXJbMV0sIGV2ZW50LCB2bm9kZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9IGhhbmRsZXIuc2xpY2UoMSk7XG4gICAgICAgIGFyZ3MucHVzaChldmVudCk7XG4gICAgICAgIGFyZ3MucHVzaCh2bm9kZSk7XG4gICAgICAgIGhhbmRsZXJbMF0uYXBwbHkodm5vZGUsIGFyZ3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjYWxsIG11bHRpcGxlIGhhbmRsZXJzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhbmRsZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW52b2tlSGFuZGxlcihoYW5kbGVyW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQsIHZub2RlKSB7XG4gIHZhciBuYW1lID0gZXZlbnQudHlwZSxcbiAgICAgIG9uID0gdm5vZGUuZGF0YS5vbjtcblxuICAvLyBjYWxsIGV2ZW50IGhhbmRsZXIocykgaWYgZXhpc3RzXG4gIGlmIChvbiAmJiBvbltuYW1lXSkge1xuICAgIGludm9rZUhhbmRsZXIob25bbmFtZV0sIHZub2RlLCBldmVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTGlzdGVuZXIoKSB7XG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50KSB7XG4gICAgaGFuZGxlRXZlbnQoZXZlbnQsIGhhbmRsZXIudm5vZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUV2ZW50TGlzdGVuZXJzKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgb2xkT24gPSBvbGRWbm9kZS5kYXRhLm9uLFxuICAgICAgb2xkTGlzdGVuZXIgPSBvbGRWbm9kZS5saXN0ZW5lcixcbiAgICAgIG9sZEVsbSA9IG9sZFZub2RlLmVsbSxcbiAgICAgIG9uID0gdm5vZGUgJiYgdm5vZGUuZGF0YS5vbixcbiAgICAgIGVsbSA9IHZub2RlICYmIHZub2RlLmVsbSxcbiAgICAgIG5hbWU7XG5cbiAgLy8gb3B0aW1pemF0aW9uIGZvciByZXVzZWQgaW1tdXRhYmxlIGhhbmRsZXJzXG4gIGlmIChvbGRPbiA9PT0gb24pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyByZW1vdmUgZXhpc3RpbmcgbGlzdGVuZXJzIHdoaWNoIG5vIGxvbmdlciB1c2VkXG4gIGlmIChvbGRPbiAmJiBvbGRMaXN0ZW5lcikge1xuICAgIC8vIGlmIGVsZW1lbnQgY2hhbmdlZCBvciBkZWxldGVkIHdlIHJlbW92ZSBhbGwgZXhpc3RpbmcgbGlzdGVuZXJzIHVuY29uZGl0aW9uYWxseVxuICAgIGlmICghb24pIHtcbiAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXIgaWYgZWxlbWVudCB3YXMgY2hhbmdlZCBvciBleGlzdGluZyBsaXN0ZW5lcnMgcmVtb3ZlZFxuICAgICAgICBvbGRFbG0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvbGRMaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb2xkT24pIHtcbiAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyIGlmIGV4aXN0aW5nIGxpc3RlbmVyIHJlbW92ZWRcbiAgICAgICAgaWYgKCFvbltuYW1lXSkge1xuICAgICAgICAgIG9sZEVsbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9sZExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhZGQgbmV3IGxpc3RlbmVycyB3aGljaCBoYXMgbm90IGFscmVhZHkgYXR0YWNoZWRcbiAgaWYgKG9uKSB7XG4gICAgLy8gcmV1c2UgZXhpc3RpbmcgbGlzdGVuZXIgb3IgY3JlYXRlIG5ld1xuICAgIHZhciBsaXN0ZW5lciA9IHZub2RlLmxpc3RlbmVyID0gb2xkVm5vZGUubGlzdGVuZXIgfHwgY3JlYXRlTGlzdGVuZXIoKTtcbiAgICAvLyB1cGRhdGUgdm5vZGUgZm9yIGxpc3RlbmVyXG4gICAgbGlzdGVuZXIudm5vZGUgPSB2bm9kZTtcblxuICAgIC8vIGlmIGVsZW1lbnQgY2hhbmdlZCBvciBhZGRlZCB3ZSBhZGQgYWxsIG5lZWRlZCBsaXN0ZW5lcnMgdW5jb25kaXRpb25hbGx5XG4gICAgaWYgKCFvbGRPbikge1xuICAgICAgZm9yIChuYW1lIGluIG9uKSB7XG4gICAgICAgIC8vIGFkZCBsaXN0ZW5lciBpZiBlbGVtZW50IHdhcyBjaGFuZ2VkIG9yIG5ldyBsaXN0ZW5lcnMgYWRkZWRcbiAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChuYW1lIGluIG9uKSB7XG4gICAgICAgIC8vIGFkZCBsaXN0ZW5lciBpZiBuZXcgbGlzdGVuZXIgYWRkZWRcbiAgICAgICAgaWYgKCFvbGRPbltuYW1lXSkge1xuICAgICAgICAgIGVsbS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZTogdXBkYXRlRXZlbnRMaXN0ZW5lcnMsXG4gIHVwZGF0ZTogdXBkYXRlRXZlbnRMaXN0ZW5lcnMsXG4gIGRlc3Ryb3k6IHVwZGF0ZUV2ZW50TGlzdGVuZXJzXG59O1xuIiwiLyohIEtlZmlyLmpzIHYzLjYuMFxuICogIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpclxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcblx0KGZhY3RvcnkoKGdsb2JhbC5LZWZpciA9IGdsb2JhbC5LZWZpciB8fCB7fSkpKTtcbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZU9iaihwcm90bykge1xuXHQgIHZhciBGID0gZnVuY3Rpb24gKCkge307XG5cdCAgRi5wcm90b3R5cGUgPSBwcm90bztcblx0ICByZXR1cm4gbmV3IEYoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQgLyosIG1peGluMSwgbWl4aW4yLi4uKi8pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMCxcblx0ICAgICAgcHJvcCA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAxOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGZvciAocHJvcCBpbiBhcmd1bWVudHNbaV0pIHtcblx0ICAgICAgdGFyZ2V0W3Byb3BdID0gYXJndW1lbnRzW2ldW3Byb3BdO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gdGFyZ2V0O1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5oZXJpdChDaGlsZCwgUGFyZW50IC8qLCBtaXhpbjEsIG1peGluMi4uLiovKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgQ2hpbGQucHJvdG90eXBlID0gY3JlYXRlT2JqKFBhcmVudC5wcm90b3R5cGUpO1xuXHQgIENoaWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENoaWxkO1xuXHQgIGZvciAoaSA9IDI7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZXh0ZW5kKENoaWxkLnByb3RvdHlwZSwgYXJndW1lbnRzW2ldKTtcblx0ICB9XG5cdCAgcmV0dXJuIENoaWxkO1xuXHR9XG5cblx0dmFyIE5PVEhJTkcgPSBbJzxub3RoaW5nPiddO1xuXHR2YXIgRU5EID0gJ2VuZCc7XG5cdHZhciBWQUxVRSA9ICd2YWx1ZSc7XG5cdHZhciBFUlJPUiA9ICdlcnJvcic7XG5cdHZhciBBTlkgPSAnYW55JztcblxuXHRmdW5jdGlvbiBjb25jYXQoYSwgYikge1xuXHQgIHZhciByZXN1bHQgPSB2b2lkIDAsXG5cdCAgICAgIGxlbmd0aCA9IHZvaWQgMCxcblx0ICAgICAgaSA9IHZvaWQgMCxcblx0ICAgICAgaiA9IHZvaWQgMDtcblx0ICBpZiAoYS5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiBiO1xuXHQgIH1cblx0ICBpZiAoYi5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiBhO1xuXHQgIH1cblx0ICBqID0gMDtcblx0ICByZXN1bHQgPSBuZXcgQXJyYXkoYS5sZW5ndGggKyBiLmxlbmd0aCk7XG5cdCAgbGVuZ3RoID0gYS5sZW5ndGg7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBqKyspIHtcblx0ICAgIHJlc3VsdFtqXSA9IGFbaV07XG5cdCAgfVxuXHQgIGxlbmd0aCA9IGIubGVuZ3RoO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKywgaisrKSB7XG5cdCAgICByZXN1bHRbal0gPSBiW2ldO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gZmluZChhcnIsIHZhbHVlKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAoYXJyW2ldID09PSB2YWx1ZSkge1xuXHQgICAgICByZXR1cm4gaTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gZmluZEJ5UHJlZChhcnIsIHByZWQpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChwcmVkKGFycltpXSkpIHtcblx0ICAgICAgcmV0dXJuIGk7XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNsb25lQXJyYXkoaW5wdXQpIHtcblx0ICB2YXIgbGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIHJlc3VsdFtpXSA9IGlucHV0W2ldO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVtb3ZlKGlucHV0LCBpbmRleCkge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IHZvaWQgMCxcblx0ICAgICAgaSA9IHZvaWQgMCxcblx0ICAgICAgaiA9IHZvaWQgMDtcblx0ICBpZiAoaW5kZXggPj0gMCAmJiBpbmRleCA8IGxlbmd0aCkge1xuXHQgICAgaWYgKGxlbmd0aCA9PT0gMSkge1xuXHQgICAgICByZXR1cm4gW107XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoIC0gMSk7XG5cdCAgICAgIGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgICAgICBpZiAoaSAhPT0gaW5kZXgpIHtcblx0ICAgICAgICAgIHJlc3VsdFtqXSA9IGlucHV0W2ldO1xuXHQgICAgICAgICAgaisrO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgICByZXR1cm4gcmVzdWx0O1xuXHQgICAgfVxuXHQgIH0gZWxzZSB7XG5cdCAgICByZXR1cm4gaW5wdXQ7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gbWFwKGlucHV0LCBmbikge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdm9pZCAwO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2ldID0gZm4oaW5wdXRbaV0pO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gZm9yRWFjaChhcnIsIGZuKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBmbihhcnJbaV0pO1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZpbGxBcnJheShhcnIsIHZhbHVlKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB2b2lkIDA7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBhcnJbaV0gPSB2YWx1ZTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBjb250YWlucyhhcnIsIHZhbHVlKSB7XG5cdCAgcmV0dXJuIGZpbmQoYXJyLCB2YWx1ZSkgIT09IC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2xpZGUoY3VyLCBuZXh0LCBtYXgpIHtcblx0ICB2YXIgbGVuZ3RoID0gTWF0aC5taW4obWF4LCBjdXIubGVuZ3RoICsgMSksXG5cdCAgICAgIG9mZnNldCA9IGN1ci5sZW5ndGggLSBsZW5ndGggKyAxLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHZvaWQgMDtcblx0ICBmb3IgKGkgPSBvZmZzZXQ7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2kgLSBvZmZzZXRdID0gY3VyW2ldO1xuXHQgIH1cblx0ICByZXN1bHRbbGVuZ3RoIC0gMV0gPSBuZXh0O1xuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgZXZlbnQpIHtcblx0ICBpZiAodHlwZSA9PT0gQU5ZKSB7XG5cdCAgICBmbihldmVudCk7XG5cdCAgfSBlbHNlIGlmICh0eXBlID09PSBldmVudC50eXBlKSB7XG5cdCAgICBpZiAodHlwZSA9PT0gVkFMVUUgfHwgdHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgZm4oZXZlbnQudmFsdWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgZm4oKTtcblx0ICAgIH1cblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBEaXNwYXRjaGVyKCkge1xuXHQgIHRoaXMuX2l0ZW1zID0gW107XG5cdCAgdGhpcy5fc3BpZXMgPSBbXTtcblx0ICB0aGlzLl9pbkxvb3AgPSAwO1xuXHQgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IG51bGw7XG5cdH1cblxuXHRleHRlbmQoRGlzcGF0Y2hlci5wcm90b3R5cGUsIHtcblx0ICBhZGQ6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgdGhpcy5faXRlbXMgPSBjb25jYXQodGhpcy5faXRlbXMsIFt7IHR5cGU6IHR5cGUsIGZuOiBmbiB9XSk7XG5cdCAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoO1xuXHQgIH0sXG5cdCAgcmVtb3ZlOiBmdW5jdGlvbiAodHlwZSwgZm4pIHtcblx0ICAgIHZhciBpbmRleCA9IGZpbmRCeVByZWQodGhpcy5faXRlbXMsIGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHJldHVybiB4LnR5cGUgPT09IHR5cGUgJiYgeC5mbiA9PT0gZm47XG5cdCAgICB9KTtcblxuXHQgICAgLy8gaWYgd2UncmUgY3VycmVudGx5IGluIGEgbm90aWZpY2F0aW9uIGxvb3AsXG5cdCAgICAvLyByZW1lbWJlciB0aGlzIHN1YnNjcmliZXIgd2FzIHJlbW92ZWRcblx0ICAgIGlmICh0aGlzLl9pbkxvb3AgIT09IDAgJiYgaW5kZXggIT09IC0xKSB7XG5cdCAgICAgIGlmICh0aGlzLl9yZW1vdmVkSXRlbXMgPT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMgPSBbXTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMucHVzaCh0aGlzLl9pdGVtc1tpbmRleF0pO1xuXHQgICAgfVxuXG5cdCAgICB0aGlzLl9pdGVtcyA9IHJlbW92ZSh0aGlzLl9pdGVtcywgaW5kZXgpO1xuXHQgICAgcmV0dXJuIHRoaXMuX2l0ZW1zLmxlbmd0aDtcblx0ICB9LFxuXHQgIGFkZFNweTogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICB0aGlzLl9zcGllcyA9IGNvbmNhdCh0aGlzLl9zcGllcywgW2ZuXSk7XG5cdCAgICByZXR1cm4gdGhpcy5fc3BpZXMubGVuZ3RoO1xuXHQgIH0sXG5cblxuXHQgIC8vIEJlY2F1c2Ugc3BpZXMgYXJlIG9ubHkgZXZlciBhIGZ1bmN0aW9uIHRoYXQgcGVyZm9ybSBsb2dnaW5nIGFzXG5cdCAgLy8gdGhlaXIgb25seSBzaWRlIGVmZmVjdCwgd2UgZG9uJ3QgbmVlZCB0aGUgc2FtZSBjb21wbGljYXRlZFxuXHQgIC8vIHJlbW92YWwgbG9naWMgbGlrZSBpbiByZW1vdmUoKVxuXHQgIHJlbW92ZVNweTogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICB0aGlzLl9zcGllcyA9IHJlbW92ZSh0aGlzLl9zcGllcywgdGhpcy5fc3BpZXMuaW5kZXhPZihmbikpO1xuXHQgICAgcmV0dXJuIHRoaXMuX3NwaWVzLmxlbmd0aDtcblx0ICB9LFxuXHQgIGRpc3BhdGNoOiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHRoaXMuX2luTG9vcCsrO1xuXHQgICAgZm9yICh2YXIgaSA9IDAsIHNwaWVzID0gdGhpcy5fc3BpZXM7IHRoaXMuX3NwaWVzICE9PSBudWxsICYmIGkgPCBzcGllcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICBzcGllc1tpXShldmVudCk7XG5cdCAgICB9XG5cblx0ICAgIGZvciAodmFyIF9pID0gMCwgaXRlbXMgPSB0aGlzLl9pdGVtczsgX2kgPCBpdGVtcy5sZW5ndGg7IF9pKyspIHtcblxuXHQgICAgICAvLyBjbGVhbnVwIHdhcyBjYWxsZWRcblx0ICAgICAgaWYgKHRoaXMuX2l0ZW1zID09PSBudWxsKSB7XG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgIH1cblxuXHQgICAgICAvLyB0aGlzIHN1YnNjcmliZXIgd2FzIHJlbW92ZWRcblx0ICAgICAgaWYgKHRoaXMuX3JlbW92ZWRJdGVtcyAhPT0gbnVsbCAmJiBjb250YWlucyh0aGlzLl9yZW1vdmVkSXRlbXMsIGl0ZW1zW19pXSkpIHtcblx0ICAgICAgICBjb250aW51ZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKGl0ZW1zW19pXS50eXBlLCBpdGVtc1tfaV0uZm4sIGV2ZW50KTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2luTG9vcC0tO1xuXHQgICAgaWYgKHRoaXMuX2luTG9vcCA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgY2xlYW51cDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5faXRlbXMgPSBudWxsO1xuXHQgICAgdGhpcy5fc3BpZXMgPSBudWxsO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gT2JzZXJ2YWJsZSgpIHtcblx0ICB0aGlzLl9kaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIoKTtcblx0ICB0aGlzLl9hY3RpdmUgPSBmYWxzZTtcblx0ICB0aGlzLl9hbGl2ZSA9IHRydWU7XG5cdCAgdGhpcy5fYWN0aXZhdGluZyA9IGZhbHNlO1xuXHQgIHRoaXMuX2xvZ0hhbmRsZXJzID0gbnVsbDtcblx0ICB0aGlzLl9zcHlIYW5kbGVycyA9IG51bGw7XG5cdH1cblxuXHRleHRlbmQoT2JzZXJ2YWJsZS5wcm90b3R5cGUsIHtcblxuXHQgIF9uYW1lOiAnb2JzZXJ2YWJsZScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7fSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHt9LFxuXHQgIF9zZXRBY3RpdmU6IGZ1bmN0aW9uIChhY3RpdmUpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUgIT09IGFjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG5cdCAgICAgIGlmIChhY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9hY3RpdmF0aW5nID0gdHJ1ZTtcblx0ICAgICAgICB0aGlzLl9vbkFjdGl2YXRpb24oKTtcblx0ICAgICAgICB0aGlzLl9hY3RpdmF0aW5nID0gZmFsc2U7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fb25EZWFjdGl2YXRpb24oKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9zZXRBY3RpdmUoZmFsc2UpO1xuXHQgICAgdGhpcy5fZGlzcGF0Y2hlci5jbGVhbnVwKCk7XG5cdCAgICB0aGlzLl9kaXNwYXRjaGVyID0gbnVsbDtcblx0ICAgIHRoaXMuX2xvZ0hhbmRsZXJzID0gbnVsbDtcblx0ICB9LFxuXHQgIF9lbWl0OiBmdW5jdGlvbiAodHlwZSwgeCkge1xuXHQgICAgc3dpdGNoICh0eXBlKSB7XG5cdCAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgcmV0dXJuIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgICBjYXNlIEVORDpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRWYWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdEVycm9yOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fYWxpdmUgPSBmYWxzZTtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IEVORCB9KTtcblx0ICAgICAgdGhpcy5fY2xlYXIoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbjogZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5hZGQodHlwZSwgZm4pO1xuXHQgICAgICB0aGlzLl9zZXRBY3RpdmUodHJ1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgeyB0eXBlOiBFTkQgfSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIF9vZmY6IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHZhciBjb3VudCA9IHRoaXMuX2Rpc3BhdGNoZXIucmVtb3ZlKHR5cGUsIGZuKTtcblx0ICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fc2V0QWN0aXZlKGZhbHNlKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBvblZhbHVlOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihWQUxVRSwgZm4pO1xuXHQgIH0sXG5cdCAgb25FcnJvcjogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb24oRVJST1IsIGZuKTtcblx0ICB9LFxuXHQgIG9uRW5kOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihFTkQsIGZuKTtcblx0ICB9LFxuXHQgIG9uQW55OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihBTlksIGZuKTtcblx0ICB9LFxuXHQgIG9mZlZhbHVlOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoVkFMVUUsIGZuKTtcblx0ICB9LFxuXHQgIG9mZkVycm9yOiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoRVJST1IsIGZuKTtcblx0ICB9LFxuXHQgIG9mZkVuZDogZnVuY3Rpb24gKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb2ZmKEVORCwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmQW55OiBmdW5jdGlvbiAoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoQU5ZLCBmbik7XG5cdCAgfSxcblx0ICBvYnNlcnZlOiBmdW5jdGlvbiAob2JzZXJ2ZXJPck9uVmFsdWUsIG9uRXJyb3IsIG9uRW5kKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXHQgICAgdmFyIGNsb3NlZCA9IGZhbHNlO1xuXG5cdCAgICB2YXIgb2JzZXJ2ZXIgPSAhb2JzZXJ2ZXJPck9uVmFsdWUgfHwgdHlwZW9mIG9ic2VydmVyT3JPblZhbHVlID09PSAnZnVuY3Rpb24nID8geyB2YWx1ZTogb2JzZXJ2ZXJPck9uVmFsdWUsIGVycm9yOiBvbkVycm9yLCBlbmQ6IG9uRW5kIH0gOiBvYnNlcnZlck9yT25WYWx1ZTtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFICYmIG9ic2VydmVyLnZhbHVlKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIudmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SICYmIG9ic2VydmVyLmVycm9yKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVORCAmJiBvYnNlcnZlci5lbmQpIHtcblx0ICAgICAgICBvYnNlcnZlci5lbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICB0aGlzLm9uQW55KGhhbmRsZXIpO1xuXG5cdCAgICByZXR1cm4ge1xuXHQgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIGlmICghY2xvc2VkKSB7XG5cdCAgICAgICAgICBfdGhpcy5vZmZBbnkoaGFuZGxlcik7XG5cdCAgICAgICAgICBjbG9zZWQgPSB0cnVlO1xuXHQgICAgICAgIH1cblx0ICAgICAgfSxcblxuXHQgICAgICBnZXQgY2xvc2VkKCkge1xuXHQgICAgICAgIHJldHVybiBjbG9zZWQ7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgfSxcblxuXG5cdCAgLy8gQSBhbmQgQiBtdXN0IGJlIHN1YmNsYXNzZXMgb2YgU3RyZWFtIGFuZCBQcm9wZXJ0eSAob3JkZXIgZG9lc24ndCBtYXR0ZXIpXG5cdCAgX29mU2FtZVR5cGU6IGZ1bmN0aW9uIChBLCBCKSB7XG5cdCAgICByZXR1cm4gQS5wcm90b3R5cGUuZ2V0VHlwZSgpID09PSB0aGlzLmdldFR5cGUoKSA/IEEgOiBCO1xuXHQgIH0sXG5cdCAgc2V0TmFtZTogZnVuY3Rpb24gKHNvdXJjZU9icyAvKiBvcHRpb25hbCAqLywgc2VsZk5hbWUpIHtcblx0ICAgIHRoaXMuX25hbWUgPSBzZWxmTmFtZSA/IHNvdXJjZU9icy5fbmFtZSArICcuJyArIHNlbGZOYW1lIDogc291cmNlT2JzO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBsb2c6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cblx0ICAgIHZhciBpc0N1cnJlbnQgPSB2b2lkIDA7XG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICB2YXIgdHlwZSA9ICc8JyArIGV2ZW50LnR5cGUgKyAoaXNDdXJyZW50ID8gJzpjdXJyZW50JyA6ICcnKSArICc+Jztcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNvbnNvbGUubG9nKG5hbWUsIHR5cGUpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIGNvbnNvbGUubG9nKG5hbWUsIHR5cGUsIGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIGlmICghdGhpcy5fbG9nSGFuZGxlcnMpIHtcblx0ICAgICAgICB0aGlzLl9sb2dIYW5kbGVycyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzLnB1c2goeyBuYW1lOiBuYW1lLCBoYW5kbGVyOiBoYW5kbGVyIH0pO1xuXHQgICAgfVxuXG5cdCAgICBpc0N1cnJlbnQgPSB0cnVlO1xuXHQgICAgdGhpcy5vbkFueShoYW5kbGVyKTtcblx0ICAgIGlzQ3VycmVudCA9IGZhbHNlO1xuXG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXHQgIG9mZkxvZzogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIG5hbWUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRvU3RyaW5nKCkgOiBhcmd1bWVudHNbMF07XG5cblxuXHQgICAgaWYgKHRoaXMuX2xvZ0hhbmRsZXJzKSB7XG5cdCAgICAgIHZhciBoYW5kbGVySW5kZXggPSBmaW5kQnlQcmVkKHRoaXMuX2xvZ0hhbmRsZXJzLCBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICAgICAgcmV0dXJuIG9iai5uYW1lID09PSBuYW1lO1xuXHQgICAgICB9KTtcblx0ICAgICAgaWYgKGhhbmRsZXJJbmRleCAhPT0gLTEpIHtcblx0ICAgICAgICB0aGlzLm9mZkFueSh0aGlzLl9sb2dIYW5kbGVyc1toYW5kbGVySW5kZXhdLmhhbmRsZXIpO1xuXHQgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzLnNwbGljZShoYW5kbGVySW5kZXgsIDEpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgc3B5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgdmFyIHR5cGUgPSAnPCcgKyBldmVudC50eXBlICsgJz4nO1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIGlmICghdGhpcy5fc3B5SGFuZGxlcnMpIHtcblx0ICAgICAgICB0aGlzLl9zcHlIYW5kbGVycyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3NweUhhbmRsZXJzLnB1c2goeyBuYW1lOiBuYW1lLCBoYW5kbGVyOiBoYW5kbGVyIH0pO1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmFkZFNweShoYW5kbGVyKTtcblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgb2ZmU3B5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgaWYgKHRoaXMuX3NweUhhbmRsZXJzKSB7XG5cdCAgICAgIHZhciBoYW5kbGVySW5kZXggPSBmaW5kQnlQcmVkKHRoaXMuX3NweUhhbmRsZXJzLCBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICAgICAgcmV0dXJuIG9iai5uYW1lID09PSBuYW1lO1xuXHQgICAgICB9KTtcblx0ICAgICAgaWYgKGhhbmRsZXJJbmRleCAhPT0gLTEpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLnJlbW92ZVNweSh0aGlzLl9zcHlIYW5kbGVyc1toYW5kbGVySW5kZXhdLmhhbmRsZXIpO1xuXHQgICAgICAgIHRoaXMuX3NweUhhbmRsZXJzLnNwbGljZShoYW5kbGVySW5kZXgsIDEpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9XG5cdH0pO1xuXG5cdC8vIGV4dGVuZCgpIGNhbid0IGhhbmRsZSBgdG9TdHJpbmdgIGluIElFOFxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gJ1snICsgdGhpcy5fbmFtZSArICddJztcblx0fTtcblxuXHRmdW5jdGlvbiBTdHJlYW0oKSB7XG5cdCAgT2JzZXJ2YWJsZS5jYWxsKHRoaXMpO1xuXHR9XG5cblx0aW5oZXJpdChTdHJlYW0sIE9ic2VydmFibGUsIHtcblxuXHQgIF9uYW1lOiAnc3RyZWFtJyxcblxuXHQgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiAnc3RyZWFtJztcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIFByb3BlcnR5KCkge1xuXHQgIE9ic2VydmFibGUuY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSBudWxsO1xuXHR9XG5cblx0aW5oZXJpdChQcm9wZXJ0eSwgT2JzZXJ2YWJsZSwge1xuXG5cdCAgX25hbWU6ICdwcm9wZXJ0eScsXG5cblx0ICBfZW1pdFZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfTtcblx0ICAgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9lbWl0RXJyb3I6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9O1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9hbGl2ZSA9IGZhbHNlO1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRU5EIH0pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2NsZWFyKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb246IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuYWRkKHR5cGUsIGZuKTtcblx0ICAgICAgdGhpcy5fc2V0QWN0aXZlKHRydWUpO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRFdmVudCAhPT0gbnVsbCkge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgdGhpcy5fY3VycmVudEV2ZW50KTtcblx0ICAgIH1cblx0ICAgIGlmICghdGhpcy5fYWxpdmUpIHtcblx0ICAgICAgY2FsbFN1YnNjcmliZXIodHlwZSwgZm4sIHsgdHlwZTogRU5EIH0pO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblx0ICBnZXRUeXBlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gJ3Byb3BlcnR5Jztcblx0ICB9XG5cdH0pO1xuXG5cdHZhciBuZXZlclMgPSBuZXcgU3RyZWFtKCk7XG5cdG5ldmVyUy5fZW1pdEVuZCgpO1xuXHRuZXZlclMuX25hbWUgPSAnbmV2ZXInO1xuXG5cdGZ1bmN0aW9uIG5ldmVyKCkge1xuXHQgIHJldHVybiBuZXZlclM7XG5cdH1cblxuXHRmdW5jdGlvbiB0aW1lQmFzZWQobWl4aW4pIHtcblxuXHQgIGZ1bmN0aW9uIEFub255bW91c1N0cmVhbSh3YWl0LCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3dhaXQgPSB3YWl0O1xuXHQgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB0aGlzLl8kb25UaWNrID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX29uVGljaygpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuX2luaXQob3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgaW5oZXJpdChBbm9ueW1vdXNTdHJlYW0sIFN0cmVhbSwge1xuXHQgICAgX2luaXQ6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgX2ZyZWU6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgX29uVGljazogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIH0sXG5cdCAgICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQgIT09IG51bGwpIHtcblx0ICAgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICAgIHRoaXMuXyRvblRpY2sgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cdCAgfSwgbWl4aW4pO1xuXG5cdCAgcmV0dXJuIEFub255bW91c1N0cmVhbTtcblx0fVxuXG5cdHZhciBTID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnbGF0ZXInLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgeCA9IF9yZWYueDtcblxuXHQgICAgdGhpcy5feCA9IHg7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5feCA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5feCk7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBsYXRlcih3YWl0LCB4KSB7XG5cdCAgcmV0dXJuIG5ldyBTKHdhaXQsIHsgeDogeCB9KTtcblx0fVxuXG5cdHZhciBTJDEgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdpbnRlcnZhbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciB4ID0gX3JlZi54O1xuXG5cdCAgICB0aGlzLl94ID0geDtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94ID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94KTtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGludGVydmFsKHdhaXQsIHgpIHtcblx0ICByZXR1cm4gbmV3IFMkMSh3YWl0LCB7IHg6IHggfSk7XG5cdH1cblxuXHR2YXIgUyQyID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnc2VxdWVudGlhbGx5JyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIHhzID0gX3JlZi54cztcblxuXHQgICAgdGhpcy5feHMgPSBjbG9uZUFycmF5KHhzKTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94cyA9IG51bGw7XG5cdCAgfSxcblx0ICBfb25UaWNrOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5feHMubGVuZ3RoID09PSAxKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94c1swXSk7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94cy5zaGlmdCgpKTtcblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHNlcXVlbnRpYWxseSh3YWl0LCB4cykge1xuXHQgIHJldHVybiB4cy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IFMkMih3YWl0LCB7IHhzOiB4cyB9KTtcblx0fVxuXG5cdHZhciBTJDMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdmcm9tUG9sbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX29uVGljazogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoZm4oKSk7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBmcm9tUG9sbCh3YWl0LCBmbikge1xuXHQgIHJldHVybiBuZXcgUyQzKHdhaXQsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gZW1pdHRlcihvYnMpIHtcblxuXHQgIGZ1bmN0aW9uIHZhbHVlKHgpIHtcblx0ICAgIG9icy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGVycm9yKHgpIHtcblx0ICAgIG9icy5fZW1pdEVycm9yKHgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGVuZCgpIHtcblx0ICAgIG9icy5fZW1pdEVuZCgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGV2ZW50KGUpIHtcblx0ICAgIG9icy5fZW1pdChlLnR5cGUsIGUudmFsdWUpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIHJldHVybiB7XG5cdCAgICB2YWx1ZTogdmFsdWUsXG5cdCAgICBlcnJvcjogZXJyb3IsXG5cdCAgICBlbmQ6IGVuZCxcblx0ICAgIGV2ZW50OiBldmVudCxcblxuXHQgICAgLy8gbGVnYWN5XG5cdCAgICBlbWl0OiB2YWx1ZSxcblx0ICAgIGVtaXRFdmVudDogZXZlbnRcblx0ICB9O1xuXHR9XG5cblx0dmFyIFMkNCA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ3dpdGhJbnRlcnZhbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gZW1pdHRlcih0aGlzKTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gbnVsbDtcblx0ICB9LFxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgZm4odGhpcy5fZW1pdHRlcik7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiB3aXRoSW50ZXJ2YWwod2FpdCwgZm4pIHtcblx0ICByZXR1cm4gbmV3IFMkNCh3YWl0LCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIFMkNShmbikge1xuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2ZuID0gZm47XG5cdCAgdGhpcy5fdW5zdWJzY3JpYmUgPSBudWxsO1xuXHR9XG5cblx0aW5oZXJpdChTJDUsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdzdHJlYW0nLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgdW5zdWJzY3JpYmUgPSBmbihlbWl0dGVyKHRoaXMpKTtcblx0ICAgIHRoaXMuX3Vuc3Vic2NyaWJlID0gdHlwZW9mIHVuc3Vic2NyaWJlID09PSAnZnVuY3Rpb24nID8gdW5zdWJzY3JpYmUgOiBudWxsO1xuXG5cdCAgICAvLyBmaXggaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8zNVxuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fY2FsbFVuc3Vic2NyaWJlKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfY2FsbFVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fdW5zdWJzY3JpYmUgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUoKTtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9jYWxsVW5zdWJzY3JpYmUoKTtcblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHN0cmVhbShmbikge1xuXHQgIHJldHVybiBuZXcgUyQ1KGZuKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZyb21DYWxsYmFjayhjYWxsYmFja0NvbnN1bWVyKSB7XG5cblx0ICB2YXIgY2FsbGVkID0gZmFsc2U7XG5cblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIGNhbGxiYWNrQ29uc3VtZXIoZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbUNhbGxiYWNrJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tTm9kZUNhbGxiYWNrKGNhbGxiYWNrQ29uc3VtZXIpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgY2FsbGJhY2tDb25zdW1lcihmdW5jdGlvbiAoZXJyb3IsIHgpIHtcblx0ICAgICAgICBpZiAoZXJyb3IpIHtcblx0ICAgICAgICAgIGVtaXR0ZXIuZXJyb3IoZXJyb3IpO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgfVxuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH0pO1xuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pLnNldE5hbWUoJ2Zyb21Ob2RlQ2FsbGJhY2snKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNwcmVhZChmbiwgbGVuZ3RoKSB7XG5cdCAgc3dpdGNoIChsZW5ndGgpIHtcblx0ICAgIGNhc2UgMDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICByZXR1cm4gZm4oKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMTpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAyOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDM6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgNDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0sIGFbM10pO1xuXHQgICAgICB9O1xuXHQgICAgZGVmYXVsdDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGEpO1xuXHQgICAgICB9O1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGFwcGx5KGZuLCBjLCBhKSB7XG5cdCAgdmFyIGFMZW5ndGggPSBhID8gYS5sZW5ndGggOiAwO1xuXHQgIGlmIChjID09IG51bGwpIHtcblx0ICAgIHN3aXRjaCAoYUxlbmd0aCkge1xuXHQgICAgICBjYXNlIDA6XG5cdCAgICAgICAgcmV0dXJuIGZuKCk7XG5cdCAgICAgIGNhc2UgMTpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSk7XG5cdCAgICAgIGNhc2UgMjpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSk7XG5cdCAgICAgIGNhc2UgMzpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSk7XG5cdCAgICAgIGNhc2UgNDpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG5cdCAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGEpO1xuXHQgICAgfVxuXHQgIH0gZWxzZSB7XG5cdCAgICBzd2l0Y2ggKGFMZW5ndGgpIHtcblx0ICAgICAgY2FzZSAwOlxuXHQgICAgICAgIHJldHVybiBmbi5jYWxsKGMpO1xuXHQgICAgICBkZWZhdWx0OlxuXHQgICAgICAgIHJldHVybiBmbi5hcHBseShjLCBhKTtcblx0ICAgIH1cblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tU3ViVW5zdWIoc3ViLCB1bnN1YiwgdHJhbnNmb3JtZXIgLyogRnVuY3Rpb24gfCBmYWxzZXkgKi8pIHtcblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cblx0ICAgIHZhciBoYW5kbGVyID0gdHJhbnNmb3JtZXIgPyBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGVtaXR0ZXIuZW1pdChhcHBseSh0cmFuc2Zvcm1lciwgdGhpcywgYXJndW1lbnRzKSk7XG5cdCAgICB9IDogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgfTtcblxuXHQgICAgc3ViKGhhbmRsZXIpO1xuXHQgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIHVuc3ViKGhhbmRsZXIpO1xuXHQgICAgfTtcblx0ICB9KS5zZXROYW1lKCdmcm9tU3ViVW5zdWInKTtcblx0fVxuXG5cdHZhciBwYWlycyA9IFtbJ2FkZEV2ZW50TGlzdGVuZXInLCAncmVtb3ZlRXZlbnRMaXN0ZW5lciddLCBbJ2FkZExpc3RlbmVyJywgJ3JlbW92ZUxpc3RlbmVyJ10sIFsnb24nLCAnb2ZmJ11dO1xuXG5cdGZ1bmN0aW9uIGZyb21FdmVudHModGFyZ2V0LCBldmVudE5hbWUsIHRyYW5zZm9ybWVyKSB7XG5cdCAgdmFyIHN1YiA9IHZvaWQgMCxcblx0ICAgICAgdW5zdWIgPSB2b2lkIDA7XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAodHlwZW9mIHRhcmdldFtwYWlyc1tpXVswXV0gPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHRhcmdldFtwYWlyc1tpXVsxXV0gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgICAgc3ViID0gcGFpcnNbaV1bMF07XG5cdCAgICAgIHVuc3ViID0gcGFpcnNbaV1bMV07XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfVxuXHQgIH1cblxuXHQgIGlmIChzdWIgPT09IHVuZGVmaW5lZCkge1xuXHQgICAgdGhyb3cgbmV3IEVycm9yKCd0YXJnZXQgZG9uXFwndCBzdXBwb3J0IGFueSBvZiAnICsgJ2FkZEV2ZW50TGlzdGVuZXIvcmVtb3ZlRXZlbnRMaXN0ZW5lciwgYWRkTGlzdGVuZXIvcmVtb3ZlTGlzdGVuZXIsIG9uL29mZiBtZXRob2QgcGFpcicpO1xuXHQgIH1cblxuXHQgIHJldHVybiBmcm9tU3ViVW5zdWIoZnVuY3Rpb24gKGhhbmRsZXIpIHtcblx0ICAgIHJldHVybiB0YXJnZXRbc3ViXShldmVudE5hbWUsIGhhbmRsZXIpO1xuXHQgIH0sIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG5cdCAgICByZXR1cm4gdGFyZ2V0W3Vuc3ViXShldmVudE5hbWUsIGhhbmRsZXIpO1xuXHQgIH0sIHRyYW5zZm9ybWVyKS5zZXROYW1lKCdmcm9tRXZlbnRzJyk7XG5cdH1cblxuXHQvLyBIQUNLOlxuXHQvLyAgIFdlIGRvbid0IGNhbGwgcGFyZW50IENsYXNzIGNvbnN0cnVjdG9yLCBidXQgaW5zdGVhZCBwdXR0aW5nIGFsbCBuZWNlc3Nhcnlcblx0Ly8gICBwcm9wZXJ0aWVzIGludG8gcHJvdG90eXBlIHRvIHNpbXVsYXRlIGVuZGVkIFByb3BlcnR5XG5cdC8vICAgKHNlZSBQcm9wcGVydHkgYW5kIE9ic2VydmFibGUgY2xhc3NlcykuXG5cblx0ZnVuY3Rpb24gUCh2YWx1ZSkge1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogJ3ZhbHVlJywgdmFsdWU6IHZhbHVlLCBjdXJyZW50OiB0cnVlIH07XG5cdH1cblxuXHRpbmhlcml0KFAsIFByb3BlcnR5LCB7XG5cdCAgX25hbWU6ICdjb25zdGFudCcsXG5cdCAgX2FjdGl2ZTogZmFsc2UsXG5cdCAgX2FjdGl2YXRpbmc6IGZhbHNlLFxuXHQgIF9hbGl2ZTogZmFsc2UsXG5cdCAgX2Rpc3BhdGNoZXI6IG51bGwsXG5cdCAgX2xvZ0hhbmRsZXJzOiBudWxsXG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbnN0YW50KHgpIHtcblx0ICByZXR1cm4gbmV3IFAoeCk7XG5cdH1cblxuXHQvLyBIQUNLOlxuXHQvLyAgIFdlIGRvbid0IGNhbGwgcGFyZW50IENsYXNzIGNvbnN0cnVjdG9yLCBidXQgaW5zdGVhZCBwdXR0aW5nIGFsbCBuZWNlc3Nhcnlcblx0Ly8gICBwcm9wZXJ0aWVzIGludG8gcHJvdG90eXBlIHRvIHNpbXVsYXRlIGVuZGVkIFByb3BlcnR5XG5cdC8vICAgKHNlZSBQcm9wcGVydHkgYW5kIE9ic2VydmFibGUgY2xhc3NlcykuXG5cblx0ZnVuY3Rpb24gUCQxKHZhbHVlKSB7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiAnZXJyb3InLCB2YWx1ZTogdmFsdWUsIGN1cnJlbnQ6IHRydWUgfTtcblx0fVxuXG5cdGluaGVyaXQoUCQxLCBQcm9wZXJ0eSwge1xuXHQgIF9uYW1lOiAnY29uc3RhbnRFcnJvcicsXG5cdCAgX2FjdGl2ZTogZmFsc2UsXG5cdCAgX2FjdGl2YXRpbmc6IGZhbHNlLFxuXHQgIF9hbGl2ZTogZmFsc2UsXG5cdCAgX2Rpc3BhdGNoZXI6IG51bGwsXG5cdCAgX2xvZ0hhbmRsZXJzOiBudWxsXG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNvbnN0YW50RXJyb3IoeCkge1xuXHQgIHJldHVybiBuZXcgUCQxKHgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29uc3RydWN0b3IoQmFzZUNsYXNzLCBuYW1lKSB7XG5cdCAgcmV0dXJuIGZ1bmN0aW9uIEFub255bW91c09ic2VydmFibGUoc291cmNlLCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBCYXNlQ2xhc3MuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZTtcblx0ICAgIHRoaXMuX25hbWUgPSBzb3VyY2UuX25hbWUgKyAnLicgKyBuYW1lO1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICAgIHRoaXMuXyRoYW5kbGVBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ2xhc3NNZXRob2RzKEJhc2VDbGFzcykge1xuXHQgIHJldHVybiB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlRW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH0sXG5cdCAgICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH0sXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgQmFzZUNsYXNzLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZUFueSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlU3RyZWFtKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFMgPSBjcmVhdGVDb25zdHJ1Y3RvcihTdHJlYW0sIG5hbWUpO1xuXHQgIGluaGVyaXQoUywgU3RyZWFtLCBjcmVhdGVDbGFzc01ldGhvZHMoU3RyZWFtKSwgbWl4aW4pO1xuXHQgIHJldHVybiBTO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlUHJvcGVydHkobmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUCA9IGNyZWF0ZUNvbnN0cnVjdG9yKFByb3BlcnR5LCBuYW1lKTtcblx0ICBpbmhlcml0KFAsIFByb3BlcnR5LCBjcmVhdGVDbGFzc01ldGhvZHMoUHJvcGVydHkpLCBtaXhpbik7XG5cdCAgcmV0dXJuIFA7XG5cdH1cblxuXHR2YXIgUCQyID0gY3JlYXRlUHJvcGVydHkoJ3RvUHJvcGVydHknLCB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9nZXRJbml0aWFsQ3VycmVudCA9IGZuO1xuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2dldEluaXRpYWxDdXJyZW50ICE9PSBudWxsKSB7XG5cdCAgICAgIHZhciBnZXRJbml0aWFsID0gdGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQ7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShnZXRJbml0aWFsKCkpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpOyAvLyBjb3BpZWQgZnJvbSBwYXR0ZXJucy9vbmUtc291cmNlXG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiB0b1Byb3BlcnR5KG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IG51bGwgOiBhcmd1bWVudHNbMV07XG5cblx0ICBpZiAoZm4gIT09IG51bGwgJiYgdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBzaG91bGQgY2FsbCB0b1Byb3BlcnR5KCkgd2l0aCBhIGZ1bmN0aW9uIG9yIG5vIGFyZ3VtZW50cy4nKTtcblx0ICB9XG5cdCAgcmV0dXJuIG5ldyBQJDIob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBTJDYgPSBjcmVhdGVTdHJlYW0oJ2NoYW5nZXMnLCB7XG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBjaGFuZ2VzKG9icykge1xuXHQgIHJldHVybiBuZXcgUyQ2KG9icyk7XG5cdH1cblxuXHRmdW5jdGlvbiBmcm9tUHJvbWlzZShwcm9taXNlKSB7XG5cblx0ICB2YXIgY2FsbGVkID0gZmFsc2U7XG5cblx0ICB2YXIgcmVzdWx0ID0gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICB2YXIgb25WYWx1ZSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH07XG5cdCAgICAgIHZhciBvbkVycm9yID0gZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVycm9yKHgpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH07XG5cdCAgICAgIHZhciBfcHJvbWlzZSA9IHByb21pc2UudGhlbihvblZhbHVlLCBvbkVycm9yKTtcblxuXHQgICAgICAvLyBwcmV2ZW50IGxpYnJhcmllcyBsaWtlICdRJyBvciAnd2hlbicgZnJvbSBzd2FsbG93aW5nIGV4Y2VwdGlvbnNcblx0ICAgICAgaWYgKF9wcm9taXNlICYmIHR5cGVvZiBfcHJvbWlzZS5kb25lID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICAgICAgX3Byb21pc2UuZG9uZSgpO1xuXHQgICAgICB9XG5cblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KTtcblxuXHQgIHJldHVybiB0b1Byb3BlcnR5KHJlc3VsdCwgbnVsbCkuc2V0TmFtZSgnZnJvbVByb21pc2UnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldEdsb2RhbFByb21pc2UoKSB7XG5cdCAgaWYgKHR5cGVvZiBQcm9taXNlID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gUHJvbWlzZTtcblx0ICB9IGVsc2Uge1xuXHQgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpc25cXCd0IGRlZmF1bHQgUHJvbWlzZSwgdXNlIHNoaW0gb3IgcGFyYW1ldGVyJyk7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gdG9Qcm9taXNlIChvYnMpIHtcblx0ICB2YXIgUHJvbWlzZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGdldEdsb2RhbFByb21pc2UoKSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHZhciBsYXN0ID0gbnVsbDtcblx0ICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgb2JzLm9uQW55KGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIGxhc3QgIT09IG51bGwpIHtcblx0ICAgICAgICAobGFzdC50eXBlID09PSBWQUxVRSA/IHJlc29sdmUgOiByZWplY3QpKGxhc3QudmFsdWUpO1xuXHQgICAgICAgIGxhc3QgPSBudWxsO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIGxhc3QgPSBldmVudDtcblx0ICAgICAgfVxuXHQgICAgfSk7XG5cdCAgfSk7XG5cdH1cblxuXHR2YXIgY29tbW9uanNHbG9iYWwgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHt9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29tbW9uanNNb2R1bGUoZm4sIG1vZHVsZSkge1xuXHRcdHJldHVybiBtb2R1bGUgPSB7IGV4cG9ydHM6IHt9IH0sIGZuKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMpLCBtb2R1bGUuZXhwb3J0cztcblx0fVxuXG5cdHZhciBwb255ZmlsbCA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuXHRcdHZhbHVlOiB0cnVlXG5cdH0pO1xuXHRleHBvcnRzWydkZWZhdWx0J10gPSBzeW1ib2xPYnNlcnZhYmxlUG9ueWZpbGw7XG5cdGZ1bmN0aW9uIHN5bWJvbE9ic2VydmFibGVQb255ZmlsbChyb290KSB7XG5cdFx0dmFyIHJlc3VsdDtcblx0XHR2YXIgX1N5bWJvbCA9IHJvb3QuU3ltYm9sO1xuXG5cdFx0aWYgKHR5cGVvZiBfU3ltYm9sID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRpZiAoX1N5bWJvbC5vYnNlcnZhYmxlKSB7XG5cdFx0XHRcdHJlc3VsdCA9IF9TeW1ib2wub2JzZXJ2YWJsZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJlc3VsdCA9IF9TeW1ib2woJ29ic2VydmFibGUnKTtcblx0XHRcdFx0X1N5bWJvbC5vYnNlcnZhYmxlID0gcmVzdWx0O1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSAnQEBvYnNlcnZhYmxlJztcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9O1xuXHR9KTtcblxuXHR2YXIgcmVxdWlyZSQkMCQxID0gKHBvbnlmaWxsICYmIHR5cGVvZiBwb255ZmlsbCA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIHBvbnlmaWxsID8gcG9ueWZpbGxbJ2RlZmF1bHQnXSA6IHBvbnlmaWxsKTtcblxuXHR2YXIgaW5kZXgkMSA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuXHRcdHZhbHVlOiB0cnVlXG5cdH0pO1xuXG5cdHZhciBfcG9ueWZpbGwgPSByZXF1aXJlJCQwJDE7XG5cblx0dmFyIF9wb255ZmlsbDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9wb255ZmlsbCk7XG5cblx0ZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHtcblx0XHRyZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9O1xuXHR9XG5cblx0dmFyIHJvb3QgPSB1bmRlZmluZWQ7IC8qIGdsb2JhbCB3aW5kb3cgKi9cblxuXHRpZiAodHlwZW9mIGNvbW1vbmpzR2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHJvb3QgPSBjb21tb25qc0dsb2JhbDtcblx0fSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHJvb3QgPSB3aW5kb3c7XG5cdH1cblxuXHR2YXIgcmVzdWx0ID0gKDAsIF9wb255ZmlsbDJbJ2RlZmF1bHQnXSkocm9vdCk7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IHJlc3VsdDtcblx0fSk7XG5cblx0dmFyIHJlcXVpcmUkJDAgPSAoaW5kZXgkMSAmJiB0eXBlb2YgaW5kZXgkMSA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIGluZGV4JDEgPyBpbmRleCQxWydkZWZhdWx0J10gOiBpbmRleCQxKTtcblxuXHR2YXIgaW5kZXggPSBjcmVhdGVDb21tb25qc01vZHVsZShmdW5jdGlvbiAobW9kdWxlKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSQkMDtcblx0fSk7XG5cblx0dmFyICQkb2JzZXJ2YWJsZSA9IChpbmRleCAmJiB0eXBlb2YgaW5kZXggPT09ICdvYmplY3QnICYmICdkZWZhdWx0JyBpbiBpbmRleCA/IGluZGV4WydkZWZhdWx0J10gOiBpbmRleCk7XG5cblx0ZnVuY3Rpb24gZnJvbUVTT2JzZXJ2YWJsZShfb2JzZXJ2YWJsZSkge1xuXHQgIHZhciBvYnNlcnZhYmxlID0gX29ic2VydmFibGVbJCRvYnNlcnZhYmxlXSA/IF9vYnNlcnZhYmxlWyQkb2JzZXJ2YWJsZV0oKSA6IF9vYnNlcnZhYmxlO1xuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblx0ICAgIHZhciB1bnN1YiA9IG9ic2VydmFibGUuc3Vic2NyaWJlKHtcblx0ICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnJvcikge1xuXHQgICAgICAgIGVtaXR0ZXIuZXJyb3IoZXJyb3IpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH0sXG5cdCAgICAgIG5leHQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh2YWx1ZSk7XG5cdCAgICAgIH0sXG5cdCAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfSk7XG5cblx0ICAgIGlmICh1bnN1Yi51bnN1YnNjcmliZSkge1xuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIHVuc3ViLnVuc3Vic2NyaWJlKCk7XG5cdCAgICAgIH07XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICByZXR1cm4gdW5zdWI7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbUVTT2JzZXJ2YWJsZScpO1xuXHR9XG5cblx0ZnVuY3Rpb24gRVNPYnNlcnZhYmxlKG9ic2VydmFibGUpIHtcblx0ICB0aGlzLl9vYnNlcnZhYmxlID0gb2JzZXJ2YWJsZS50YWtlRXJyb3JzKDEpO1xuXHR9XG5cblx0ZXh0ZW5kKEVTT2JzZXJ2YWJsZS5wcm90b3R5cGUsIHtcblx0ICBzdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnNlcnZlck9yT25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgb2JzZXJ2ZXIgPSB0eXBlb2Ygb2JzZXJ2ZXJPck9uTmV4dCA9PT0gJ2Z1bmN0aW9uJyA/IHsgbmV4dDogb2JzZXJ2ZXJPck9uTmV4dCwgZXJyb3I6IG9uRXJyb3IsIGNvbXBsZXRlOiBvbkNvbXBsZXRlIH0gOiBvYnNlcnZlck9yT25OZXh0O1xuXG5cdCAgICB2YXIgZm4gPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNsb3NlZCA9IHRydWU7XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUgJiYgb2JzZXJ2ZXIubmV4dCkge1xuXHQgICAgICAgIG9ic2VydmVyLm5leHQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SICYmIG9ic2VydmVyLmVycm9yKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVORCAmJiBvYnNlcnZlci5jb21wbGV0ZSkge1xuXHQgICAgICAgIG9ic2VydmVyLmNvbXBsZXRlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgdGhpcy5fb2JzZXJ2YWJsZS5vbkFueShmbik7XG5cdCAgICB2YXIgY2xvc2VkID0gZmFsc2U7XG5cblx0ICAgIHZhciBzdWJzY3JpcHRpb24gPSB7XG5cdCAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgY2xvc2VkID0gdHJ1ZTtcblx0ICAgICAgICBfdGhpcy5fb2JzZXJ2YWJsZS5vZmZBbnkoZm4pO1xuXHQgICAgICB9LFxuXHQgICAgICBnZXQgY2xvc2VkKCkge1xuXHQgICAgICAgIHJldHVybiBjbG9zZWQ7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuXHQgIH1cblx0fSk7XG5cblx0Ly8gTmVlZCB0byBhc3NpZ24gZGlyZWN0bHkgYi9jIFN5bWJvbHMgYXJlbid0IGVudW1lcmFibGUuXG5cdEVTT2JzZXJ2YWJsZS5wcm90b3R5cGVbJCRvYnNlcnZhYmxlXSA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gdGhpcztcblx0fTtcblxuXHRmdW5jdGlvbiB0b0VTT2JzZXJ2YWJsZSgpIHtcblx0ICByZXR1cm4gbmV3IEVTT2JzZXJ2YWJsZSh0aGlzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGRlZmF1bHRFcnJvcnNDb21iaW5hdG9yKGVycm9ycykge1xuXHQgIHZhciBsYXRlc3RFcnJvciA9IHZvaWQgMDtcblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IGVycm9ycy5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKGVycm9yc1tpXSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAgIGlmIChsYXRlc3RFcnJvciA9PT0gdW5kZWZpbmVkIHx8IGxhdGVzdEVycm9yLmluZGV4IDwgZXJyb3JzW2ldLmluZGV4KSB7XG5cdCAgICAgICAgbGF0ZXN0RXJyb3IgPSBlcnJvcnNbaV07XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIGxhdGVzdEVycm9yLmVycm9yO1xuXHR9XG5cblx0ZnVuY3Rpb24gQ29tYmluZShhY3RpdmUsIHBhc3NpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fYWN0aXZlQ291bnQgPSBhY3RpdmUubGVuZ3RoO1xuXHQgIHRoaXMuX3NvdXJjZXMgPSBjb25jYXQoYWN0aXZlLCBwYXNzaXZlKTtcblx0ICB0aGlzLl9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IHNwcmVhZChjb21iaW5hdG9yLCB0aGlzLl9zb3VyY2VzLmxlbmd0aCkgOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdCAgfTtcblx0ICB0aGlzLl9hbGl2ZUNvdW50ID0gMDtcblx0ICB0aGlzLl9sYXRlc3RWYWx1ZXMgPSBuZXcgQXJyYXkodGhpcy5fc291cmNlcy5sZW5ndGgpO1xuXHQgIHRoaXMuX2xhdGVzdEVycm9ycyA9IG5ldyBBcnJheSh0aGlzLl9zb3VyY2VzLmxlbmd0aCk7XG5cdCAgZmlsbEFycmF5KHRoaXMuX2xhdGVzdFZhbHVlcywgTk9USElORyk7XG5cdCAgdGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbiA9IGZhbHNlO1xuXHQgIHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbiA9IGZhbHNlO1xuXHQgIHRoaXMuX2xhdGVzdEVycm9ySW5kZXggPSAwO1xuXG5cdCAgdGhpcy5fJGhhbmRsZXJzID0gW107XG5cblx0ICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoaSkge1xuXHQgICAgX3RoaXMuXyRoYW5kbGVycy5wdXNoKGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShpLCBldmVudCk7XG5cdCAgICB9KTtcblx0ICB9O1xuXG5cdCAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBfbG9vcChpKTtcblx0ICB9XG5cdH1cblxuXHRpbmhlcml0KENvbWJpbmUsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdjb21iaW5lJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2FsaXZlQ291bnQgPSB0aGlzLl9hY3RpdmVDb3VudDtcblxuXHQgICAgLy8gd2UgbmVlZCB0byBzdXNjcmliZSB0byBfcGFzc2l2ZV8gc291cmNlcyBiZWZvcmUgX2FjdGl2ZV9cblx0ICAgIC8vIChzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy85OClcblx0ICAgIGZvciAodmFyIGkgPSB0aGlzLl9hY3RpdmVDb3VudDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IHRoaXMuX2FjdGl2ZUNvdW50OyBfaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbX2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tfaV0pO1xuXHQgICAgfVxuXG5cdCAgICBpZiAodGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbikge1xuXHQgICAgICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgICAgIHRoaXMuX2VtaXRJZkZ1bGwoKTtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24pIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fc291cmNlcy5sZW5ndGgsXG5cdCAgICAgICAgaSA9IHZvaWQgMDtcblx0ICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9mZkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2VtaXRJZkZ1bGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBoYXNBbGxWYWx1ZXMgPSB0cnVlO1xuXHQgICAgdmFyIGhhc0Vycm9ycyA9IGZhbHNlO1xuXHQgICAgdmFyIGxlbmd0aCA9IHRoaXMuX2xhdGVzdFZhbHVlcy5sZW5ndGg7XG5cdCAgICB2YXIgdmFsdWVzQ29weSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXHQgICAgdmFyIGVycm9yc0NvcHkgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblxuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICB2YWx1ZXNDb3B5W2ldID0gdGhpcy5fbGF0ZXN0VmFsdWVzW2ldO1xuXHQgICAgICBlcnJvcnNDb3B5W2ldID0gdGhpcy5fbGF0ZXN0RXJyb3JzW2ldO1xuXG5cdCAgICAgIGlmICh2YWx1ZXNDb3B5W2ldID09PSBOT1RISU5HKSB7XG5cdCAgICAgICAgaGFzQWxsVmFsdWVzID0gZmFsc2U7XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoZXJyb3JzQ29weVtpXSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAgICAgaGFzRXJyb3JzID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICBpZiAoaGFzQWxsVmFsdWVzKSB7XG5cdCAgICAgIHZhciBjb21iaW5hdG9yID0gdGhpcy5fY29tYmluYXRvcjtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGNvbWJpbmF0b3IodmFsdWVzQ29weSkpO1xuXHQgICAgfVxuXHQgICAgaWYgKGhhc0Vycm9ycykge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IoZXJyb3JzQ29weSkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gKGksIGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSB8fCBldmVudC50eXBlID09PSBFUlJPUikge1xuXG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdFZhbHVlc1tpXSA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdEVycm9yc1tpXSA9IHVuZGVmaW5lZDtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgICB0aGlzLl9sYXRlc3RWYWx1ZXNbaV0gPSBOT1RISU5HO1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdEVycm9yc1tpXSA9IHtcblx0ICAgICAgICAgIGluZGV4OiB0aGlzLl9sYXRlc3RFcnJvckluZGV4KyssXG5cdCAgICAgICAgICBlcnJvcjogZXZlbnQudmFsdWVcblx0ICAgICAgICB9O1xuXHQgICAgICB9XG5cblx0ICAgICAgaWYgKGkgPCB0aGlzLl9hY3RpdmVDb3VudCkge1xuXHQgICAgICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gdHJ1ZTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdElmRnVsbCgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgLy8gRU5EXG5cblx0ICAgICAgaWYgKGkgPCB0aGlzLl9hY3RpdmVDb3VudCkge1xuXHQgICAgICAgIHRoaXMuX2FsaXZlQ291bnQtLTtcblx0ICAgICAgICBpZiAodGhpcy5fYWxpdmVDb3VudCA9PT0gMCkge1xuXHQgICAgICAgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICAgICAgdGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uID0gdHJ1ZTtcblx0ICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgICAgIH1cblx0ICAgICAgICB9XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXN0VmFsdWVzID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhdGVzdEVycm9ycyA9IG51bGw7XG5cdCAgICB0aGlzLl9jb21iaW5hdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVycyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBjb21iaW5lKGFjdGl2ZSkge1xuXHQgIHZhciBwYXNzaXZlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gW10gOiBhcmd1bWVudHNbMV07XG5cdCAgdmFyIGNvbWJpbmF0b3IgPSBhcmd1bWVudHNbMl07XG5cblx0ICBpZiAodHlwZW9mIHBhc3NpdmUgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIGNvbWJpbmF0b3IgPSBwYXNzaXZlO1xuXHQgICAgcGFzc2l2ZSA9IFtdO1xuXHQgIH1cblx0ICByZXR1cm4gYWN0aXZlLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgQ29tYmluZShhY3RpdmUsIHBhc3NpdmUsIGNvbWJpbmF0b3IpO1xuXHR9XG5cblx0dmFyIE9ic2VydmFibGUkMSA9IHtcblx0ICBlbXB0eTogZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIG5ldmVyKCk7XG5cdCAgfSxcblxuXG5cdCAgLy8gTW9ub2lkIGJhc2VkIG9uIG1lcmdlKCkgc2VlbXMgbW9yZSB1c2VmdWwgdGhhbiBvbmUgYmFzZWQgb24gY29uY2F0KCkuXG5cdCAgY29uY2F0OiBmdW5jdGlvbiAoYSwgYikge1xuXHQgICAgcmV0dXJuIGEubWVyZ2UoYik7XG5cdCAgfSxcblx0ICBvZjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHJldHVybiBjb25zdGFudCh4KTtcblx0ICB9LFxuXHQgIG1hcDogZnVuY3Rpb24gKGZuLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMubWFwKGZuKTtcblx0ICB9LFxuXHQgIGJpbWFwOiBmdW5jdGlvbiAoZm5FcnIsIGZuVmFsLCBvYnMpIHtcblx0ICAgIHJldHVybiBvYnMubWFwRXJyb3JzKGZuRXJyKS5tYXAoZm5WYWwpO1xuXHQgIH0sXG5cblxuXHQgIC8vIFRoaXMgYXAgc3RyaWN0bHkgc3BlYWtpbmcgaW5jb21wYXRpYmxlIHdpdGggY2hhaW4uIElmIHdlIGRlcml2ZSBhcCBmcm9tIGNoYWluIHdlIGdldFxuXHQgIC8vIGRpZmZlcmVudCAobm90IHZlcnkgdXNlZnVsKSBiZWhhdmlvci4gQnV0IHNwZWMgcmVxdWlyZXMgdGhhdCBpZiBtZXRob2QgY2FuIGJlIGRlcml2ZWRcblx0ICAvLyBpdCBtdXN0IGhhdmUgdGhlIHNhbWUgYmVoYXZpb3IgYXMgaGFuZC13cml0dGVuIG1ldGhvZC4gV2UgaW50ZW50aW9uYWxseSB2aW9sYXRlIHRoZSBzcGVjXG5cdCAgLy8gaW4gaG9wZSB0aGF0IGl0IHdvbid0IGNhdXNlIG1hbnkgdHJvdWJsZXMgaW4gcHJhY3RpY2UuIEFuZCBpbiByZXR1cm4gd2UgaGF2ZSBtb3JlIHVzZWZ1bCB0eXBlLlxuXHQgIGFwOiBmdW5jdGlvbiAob2JzRm4sIG9ic1ZhbCkge1xuXHQgICAgcmV0dXJuIGNvbWJpbmUoW29ic0ZuLCBvYnNWYWxdLCBmdW5jdGlvbiAoZm4sIHZhbCkge1xuXHQgICAgICByZXR1cm4gZm4odmFsKTtcblx0ICAgIH0pO1xuXHQgIH0sXG5cdCAgY2hhaW46IGZ1bmN0aW9uIChmbiwgb2JzKSB7XG5cdCAgICByZXR1cm4gb2JzLmZsYXRNYXAoZm4pO1xuXHQgIH1cblx0fTtcblxuXG5cblx0dmFyIHN0YXRpY0xhbmQgPSBPYmplY3QuZnJlZXplKHtcblx0ICBPYnNlcnZhYmxlOiBPYnNlcnZhYmxlJDFcblx0fSk7XG5cblx0dmFyIG1peGluID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbih4KSk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDcgPSBjcmVhdGVTdHJlYW0oJ21hcCcsIG1peGluKTtcblx0dmFyIFAkMyA9IGNyZWF0ZVByb3BlcnR5KCdtYXAnLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBtYXAkMShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDcsIFAkMykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQ4ID0gY3JlYXRlU3RyZWFtKCdmaWx0ZXInLCBtaXhpbiQxKTtcblx0dmFyIFAkNCA9IGNyZWF0ZVByb3BlcnR5KCdmaWx0ZXInLCBtaXhpbiQxKTtcblxuXHR2YXIgaWQkMSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gZmlsdGVyKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDEgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ4LCBQJDQpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbiA9IF9yZWYubjtcblxuXHQgICAgdGhpcy5fbiA9IG47XG5cdCAgICBpZiAobiA8PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX24tLTtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkOSA9IGNyZWF0ZVN0cmVhbSgndGFrZScsIG1peGluJDIpO1xuXHR2YXIgUCQ1ID0gY3JlYXRlUHJvcGVydHkoJ3Rha2UnLCBtaXhpbiQyKTtcblxuXHRmdW5jdGlvbiB0YWtlKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDksIFAkNSkpKG9icywgeyBuOiBuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgbiA9IF9yZWYubjtcblxuXHQgICAgdGhpcy5fbiA9IG47XG5cdCAgICBpZiAobiA8PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX24tLTtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTAgPSBjcmVhdGVTdHJlYW0oJ3Rha2VFcnJvcnMnLCBtaXhpbiQzKTtcblx0dmFyIFAkNiA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlRXJyb3JzJywgbWl4aW4kMyk7XG5cblx0ZnVuY3Rpb24gdGFrZUVycm9ycyhvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxMCwgUCQ2KSkob2JzLCB7IG46IG4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxMSA9IGNyZWF0ZVN0cmVhbSgndGFrZVdoaWxlJywgbWl4aW4kNCk7XG5cdHZhciBQJDcgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZVdoaWxlJywgbWl4aW4kNCk7XG5cblx0dmFyIGlkJDIgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHRha2VXaGlsZShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQyIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTEsIFAkNykpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fbGFzdFZhbHVlID0gTk9USElORztcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fbGFzdFZhbHVlID0geDtcblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0VmFsdWUgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2xhc3RWYWx1ZSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDEyID0gY3JlYXRlU3RyZWFtKCdsYXN0JywgbWl4aW4kNSk7XG5cdHZhciBQJDggPSBjcmVhdGVQcm9wZXJ0eSgnbGFzdCcsIG1peGluJDUpO1xuXG5cdGZ1bmN0aW9uIGxhc3Qob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTIsIFAkOCkpKG9icyk7XG5cdH1cblxuXHR2YXIgbWl4aW4kNiA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gTWF0aC5tYXgoMCwgbik7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fbiA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9uLS07XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDEzID0gY3JlYXRlU3RyZWFtKCdza2lwJywgbWl4aW4kNik7XG5cdHZhciBQJDkgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcCcsIG1peGluJDYpO1xuXG5cdGZ1bmN0aW9uIHNraXAob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTMsIFAkOSkpKG9icywgeyBuOiBuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDcgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKHRoaXMuX2ZuICE9PSBudWxsICYmICFmbih4KSkge1xuXHQgICAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fZm4gPT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNCA9IGNyZWF0ZVN0cmVhbSgnc2tpcFdoaWxlJywgbWl4aW4kNyk7XG5cdHZhciBQJDEwID0gY3JlYXRlUHJvcGVydHkoJ3NraXBXaGlsZScsIG1peGluJDcpO1xuXG5cdHZhciBpZCQzID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBza2lwV2hpbGUob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQkMyA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE0LCBQJDEwKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ4ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3ByZXYgPSBOT1RISU5HO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX3ByZXYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fcHJldiA9PT0gTk9USElORyB8fCAhZm4odGhpcy5fcHJldiwgeCkpIHtcblx0ICAgICAgdGhpcy5fcHJldiA9IHg7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTUgPSBjcmVhdGVTdHJlYW0oJ3NraXBEdXBsaWNhdGVzJywgbWl4aW4kOCk7XG5cdHZhciBQJDExID0gY3JlYXRlUHJvcGVydHkoJ3NraXBEdXBsaWNhdGVzJywgbWl4aW4kOCk7XG5cblx0dmFyIGVxID0gZnVuY3Rpb24gKGEsIGIpIHtcblx0ICByZXR1cm4gYSA9PT0gYjtcblx0fTtcblxuXHRmdW5jdGlvbiBza2lwRHVwbGljYXRlcyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBlcSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDE1LCBQJDExKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQ5ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblx0ICAgIHZhciBzZWVkID0gX3JlZi5zZWVkO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fcHJldiA9IHNlZWQ7XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fcHJldiA9IG51bGw7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fcHJldiAhPT0gTk9USElORykge1xuXHQgICAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHRoaXMuX3ByZXYsIHgpKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3ByZXYgPSB4O1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQxNiA9IGNyZWF0ZVN0cmVhbSgnZGlmZicsIG1peGluJDkpO1xuXHR2YXIgUCQxMiA9IGNyZWF0ZVByb3BlcnR5KCdkaWZmJywgbWl4aW4kOSk7XG5cblx0ZnVuY3Rpb24gZGVmYXVsdEZuKGEsIGIpIHtcblx0ICByZXR1cm4gW2EsIGJdO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGlmZihvYnMsIGZuKSB7XG5cdCAgdmFyIHNlZWQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyBOT1RISU5HIDogYXJndW1lbnRzWzJdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMTYsIFAkMTIpKShvYnMsIHsgZm46IGZuIHx8IGRlZmF1bHRGbiwgc2VlZDogc2VlZCB9KTtcblx0fVxuXG5cdHZhciBQJDEzID0gY3JlYXRlUHJvcGVydHkoJ3NjYW4nLCB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIHNlZWQgPSBfcmVmLnNlZWQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9zZWVkID0gc2VlZDtcblx0ICAgIGlmIChzZWVkICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShzZWVkKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB0aGlzLl9zZWVkID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRFdmVudCA9PT0gbnVsbCB8fCB0aGlzLl9jdXJyZW50RXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3NlZWQgPT09IE5PVEhJTkcgPyB4IDogZm4odGhpcy5fc2VlZCwgeCkpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHRoaXMuX2N1cnJlbnRFdmVudC52YWx1ZSwgeCkpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gc2NhbihvYnMsIGZuKSB7XG5cdCAgdmFyIHNlZWQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyBOT1RISU5HIDogYXJndW1lbnRzWzJdO1xuXG5cdCAgcmV0dXJuIG5ldyBQJDEzKG9icywgeyBmbjogZm4sIHNlZWQ6IHNlZWQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTAgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHhzID0gZm4oeCk7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4c1tpXSk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDE3ID0gY3JlYXRlU3RyZWFtKCdmbGF0dGVuJywgbWl4aW4kMTApO1xuXG5cdHZhciBpZCQ0ID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBmbGF0dGVuKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IFMkMTcob2JzLCB7IGZuOiBmbiB9KTtcblx0fVxuXG5cdHZhciBFTkRfTUFSS0VSID0ge307XG5cblx0dmFyIG1peGluJDExID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSBNYXRoLm1heCgwLCB3YWl0KTtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuXyRzaGlmdEJ1ZmYgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHZhciB2YWx1ZSA9IF90aGlzLl9idWZmLnNoaWZ0KCk7XG5cdCAgICAgIGlmICh2YWx1ZSA9PT0gRU5EX01BUktFUikge1xuXHQgICAgICAgIF90aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgX3RoaXMuX2VtaXRWYWx1ZSh2YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgICB0aGlzLl8kc2hpZnRCdWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgICAgc2V0VGltZW91dCh0aGlzLl8kc2hpZnRCdWZmLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2J1ZmYucHVzaChFTkRfTUFSS0VSKTtcblx0ICAgICAgc2V0VGltZW91dCh0aGlzLl8kc2hpZnRCdWZmLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTggPSBjcmVhdGVTdHJlYW0oJ2RlbGF5JywgbWl4aW4kMTEpO1xuXHR2YXIgUCQxNCA9IGNyZWF0ZVByb3BlcnR5KCdkZWxheScsIG1peGluJDExKTtcblxuXHRmdW5jdGlvbiBkZWxheShvYnMsIHdhaXQpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxOCwgUCQxNCkpKG9icywgeyB3YWl0OiB3YWl0IH0pO1xuXHR9XG5cblx0dmFyIG5vdyA9IERhdGUubm93ID8gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBEYXRlLm5vdygpO1xuXHR9IDogZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0fTtcblxuXHR2YXIgbWl4aW4kMTIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBsZWFkaW5nID0gX3JlZi5sZWFkaW5nO1xuXHQgICAgdmFyIHRyYWlsaW5nID0gX3JlZi50cmFpbGluZztcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5fbGVhZGluZyA9IGxlYWRpbmc7XG5cdCAgICB0aGlzLl90cmFpbGluZyA9IHRyYWlsaW5nO1xuXHQgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fZW5kTGF0ZXIgPSBmYWxzZTtcblx0ICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9IDA7XG5cdCAgICB0aGlzLl8kdHJhaWxpbmdDYWxsID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX3RyYWlsaW5nQ2FsbCgpO1xuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuXyR0cmFpbGluZ0NhbGwgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdmFyIGN1clRpbWUgPSBub3coKTtcblx0ICAgICAgaWYgKHRoaXMuX2xhc3RDYWxsVGltZSA9PT0gMCAmJiAhdGhpcy5fbGVhZGluZykge1xuXHQgICAgICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9IGN1clRpbWU7XG5cdCAgICAgIH1cblx0ICAgICAgdmFyIHJlbWFpbmluZyA9IHRoaXMuX3dhaXQgLSAoY3VyVGltZSAtIHRoaXMuX2xhc3RDYWxsVGltZSk7XG5cdCAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuXHQgICAgICAgIHRoaXMuX2NhbmNlbFRyYWlsaW5nKCk7XG5cdCAgICAgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gY3VyVGltZTtcblx0ICAgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fdHJhaWxpbmcpIHtcblx0ICAgICAgICB0aGlzLl9jYW5jZWxUcmFpbGluZygpO1xuXHQgICAgICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSB4O1xuXHQgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJHRyYWlsaW5nQ2FsbCwgcmVtYWluaW5nKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX2VuZExhdGVyID0gdHJ1ZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jYW5jZWxUcmFpbGluZzogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCAhPT0gbnVsbCkge1xuXHQgICAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dElkKTtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF90cmFpbGluZ0NhbGw6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl90cmFpbGluZ1ZhbHVlKTtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9ICF0aGlzLl9sZWFkaW5nID8gMCA6IG5vdygpO1xuXHQgICAgaWYgKHRoaXMuX2VuZExhdGVyKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMTkgPSBjcmVhdGVTdHJlYW0oJ3Rocm90dGxlJywgbWl4aW4kMTIpO1xuXHR2YXIgUCQxNSA9IGNyZWF0ZVByb3BlcnR5KCd0aHJvdHRsZScsIG1peGluJDEyKTtcblxuXHRmdW5jdGlvbiB0aHJvdHRsZShvYnMsIHdhaXQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRsZWFkaW5nID0gX3JlZjIubGVhZGluZztcblx0ICB2YXIgbGVhZGluZyA9IF9yZWYyJGxlYWRpbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRsZWFkaW5nO1xuXHQgIHZhciBfcmVmMiR0cmFpbGluZyA9IF9yZWYyLnRyYWlsaW5nO1xuXHQgIHZhciB0cmFpbGluZyA9IF9yZWYyJHRyYWlsaW5nID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkdHJhaWxpbmc7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQxOSwgUCQxNSkpKG9icywgeyB3YWl0OiB3YWl0LCBsZWFkaW5nOiBsZWFkaW5nLCB0cmFpbGluZzogdHJhaWxpbmcgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTMgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBpbW1lZGlhdGUgPSBfcmVmLmltbWVkaWF0ZTtcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5faW1tZWRpYXRlID0gaW1tZWRpYXRlO1xuXHQgICAgdGhpcy5fbGFzdEF0dGVtcHQgPSAwO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fZW5kTGF0ZXIgPSBmYWxzZTtcblx0ICAgIHRoaXMuXyRsYXRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9sYXRlcigpO1xuXHQgICAgfTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9sYXRlclZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuXyRsYXRlciA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9sYXN0QXR0ZW1wdCA9IG5vdygpO1xuXHQgICAgICBpZiAodGhpcy5faW1tZWRpYXRlICYmICF0aGlzLl90aW1lb3V0SWQpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKCF0aGlzLl90aW1lb3V0SWQpIHtcblx0ICAgICAgICB0aGlzLl90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRoaXMuXyRsYXRlciwgdGhpcy5fd2FpdCk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKCF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9sYXRlclZhbHVlID0geDtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCAmJiAhdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fZW5kTGF0ZXIgPSB0cnVlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2xhdGVyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgbGFzdCA9IG5vdygpIC0gdGhpcy5fbGFzdEF0dGVtcHQ7XG5cdCAgICBpZiAobGFzdCA8IHRoaXMuX3dhaXQgJiYgbGFzdCA+PSAwKSB7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJGxhdGVyLCB0aGlzLl93YWl0IC0gbGFzdCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgICBpZiAoIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9sYXRlclZhbHVlKTtcblx0ICAgICAgICB0aGlzLl9sYXRlclZhbHVlID0gbnVsbDtcblx0ICAgICAgfVxuXHQgICAgICBpZiAodGhpcy5fZW5kTGF0ZXIpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjAgPSBjcmVhdGVTdHJlYW0oJ2RlYm91bmNlJywgbWl4aW4kMTMpO1xuXHR2YXIgUCQxNiA9IGNyZWF0ZVByb3BlcnR5KCdkZWJvdW5jZScsIG1peGluJDEzKTtcblxuXHRmdW5jdGlvbiBkZWJvdW5jZShvYnMsIHdhaXQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRpbW1lZGlhdGUgPSBfcmVmMi5pbW1lZGlhdGU7XG5cdCAgdmFyIGltbWVkaWF0ZSA9IF9yZWYyJGltbWVkaWF0ZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBfcmVmMiRpbW1lZGlhdGU7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMCwgUCQxNikpKG9icywgeyB3YWl0OiB3YWl0LCBpbW1lZGlhdGU6IGltbWVkaWF0ZSB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQxNCA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0RXJyb3IoZm4oeCkpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyMSA9IGNyZWF0ZVN0cmVhbSgnbWFwRXJyb3JzJywgbWl4aW4kMTQpO1xuXHR2YXIgUCQxNyA9IGNyZWF0ZVByb3BlcnR5KCdtYXBFcnJvcnMnLCBtaXhpbiQxNCk7XG5cblx0dmFyIGlkJDUgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIG1hcEVycm9ycyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCQ1IDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjEsIFAkMTcpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDE1ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDIyID0gY3JlYXRlU3RyZWFtKCdmaWx0ZXJFcnJvcnMnLCBtaXhpbiQxNSk7XG5cdHZhciBQJDE4ID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlckVycm9ycycsIG1peGluJDE1KTtcblxuXHR2YXIgaWQkNiA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gZmlsdGVyRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkJDYgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyMiwgUCQxOCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMTYgPSB7XG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDIzID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVWYWx1ZXMnLCBtaXhpbiQxNik7XG5cdHZhciBQJDE5ID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZVZhbHVlcycsIG1peGluJDE2KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVWYWx1ZXMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjMsIFAkMTkpKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE3ID0ge1xuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKCkge31cblx0fTtcblxuXHR2YXIgUyQyNCA9IGNyZWF0ZVN0cmVhbSgnaWdub3JlRXJyb3JzJywgbWl4aW4kMTcpO1xuXHR2YXIgUCQyMCA9IGNyZWF0ZVByb3BlcnR5KCdpZ25vcmVFcnJvcnMnLCBtaXhpbiQxNyk7XG5cblx0ZnVuY3Rpb24gaWdub3JlRXJyb3JzKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTJDI0LCBQJDIwKSkob2JzKTtcblx0fVxuXG5cdHZhciBtaXhpbiQxOCA9IHtcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7fVxuXHR9O1xuXG5cdHZhciBTJDI1ID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVFbmQnLCBtaXhpbiQxOCk7XG5cdHZhciBQJDIxID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZUVuZCcsIG1peGluJDE4KTtcblxuXHRmdW5jdGlvbiBpZ25vcmVFbmQob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjUsIFAkMjEpKShvYnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDE5ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbigpKTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkMjYgPSBjcmVhdGVTdHJlYW0oJ2JlZm9yZUVuZCcsIG1peGluJDE5KTtcblx0dmFyIFAkMjIgPSBjcmVhdGVQcm9wZXJ0eSgnYmVmb3JlRW5kJywgbWl4aW4kMTkpO1xuXG5cdGZ1bmN0aW9uIGJlZm9yZUVuZChvYnMsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjYsIFAkMjIpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDIwID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIG1pbiA9IF9yZWYubWluO1xuXHQgICAgdmFyIG1heCA9IF9yZWYubWF4O1xuXG5cdCAgICB0aGlzLl9tYXggPSBtYXg7XG5cdCAgICB0aGlzLl9taW4gPSBtaW47XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmID0gc2xpZGUodGhpcy5fYnVmZiwgeCwgdGhpcy5fbWF4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9taW4pIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQyNyA9IGNyZWF0ZVN0cmVhbSgnc2xpZGluZ1dpbmRvdycsIG1peGluJDIwKTtcblx0dmFyIFAkMjMgPSBjcmVhdGVQcm9wZXJ0eSgnc2xpZGluZ1dpbmRvdycsIG1peGluJDIwKTtcblxuXHRmdW5jdGlvbiBzbGlkaW5nV2luZG93KG9icywgbWF4KSB7XG5cdCAgdmFyIG1pbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IDAgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQyNywgUCQyMykpKG9icywgeyBtaW46IG1pbiwgbWF4OiBtYXggfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjEgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICghZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI4ID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaGlsZScsIG1peGluJDIxKTtcblx0dmFyIFAkMjQgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2hpbGUnLCBtaXhpbiQyMSk7XG5cblx0dmFyIGlkJDcgPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGJ1ZmZlcldoaWxlKG9icywgZm4pIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRmbHVzaE9uRW5kID0gX3JlZjIuZmx1c2hPbkVuZDtcblx0ICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYyJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRmbHVzaE9uRW5kO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjgsIFAkMjQpKShvYnMsIHsgZm46IGZuIHx8IGlkJDcsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHR2YXIgbWl4aW4kMjIgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgY291bnQgPSBfcmVmLmNvdW50O1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2NvdW50ID0gY291bnQ7XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXHQgIF9mbHVzaDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fY291bnQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDI5ID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaXRoQ291bnQnLCBtaXhpbiQyMik7XG5cdHZhciBQJDI1ID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldpdGhDb3VudCcsIG1peGluJDIyKTtcblxuXHRmdW5jdGlvbiBidWZmZXJXaGlsZSQxKG9icywgY291bnQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRmbHVzaE9uRW5kID0gX3JlZjIuZmx1c2hPbkVuZDtcblx0ICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYyJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRmbHVzaE9uRW5kO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMjksIFAkMjUpKShvYnMsIHsgY291bnQ6IGNvdW50LCBmbHVzaE9uRW5kOiBmbHVzaE9uRW5kIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDIzID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cdCAgICB2YXIgY291bnQgPSBfcmVmLmNvdW50O1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSB3YWl0O1xuXHQgICAgdGhpcy5fY291bnQgPSBjb3VudDtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB0aGlzLl8kb25UaWNrID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2ZsdXNoKCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBudWxsO1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblx0ICBfZmx1c2g6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX2NvdW50KSB7XG5cdCAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kICYmIHRoaXMuX2J1ZmYubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwodGhpcy5fJG9uVGljaywgdGhpcy5fd2FpdCk7XG5cdCAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2ludGVydmFsSWQgIT09IG51bGwpIHtcblx0ICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpOyAvLyBjb3BpZWQgZnJvbSBwYXR0ZXJucy9vbmUtc291cmNlXG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMwID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaXRoVGltZU9yQ291bnQnLCBtaXhpbiQyMyk7XG5cdHZhciBQJDI2ID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldpdGhUaW1lT3JDb3VudCcsIG1peGluJDIzKTtcblxuXHRmdW5jdGlvbiBidWZmZXJXaXRoVGltZU9yQ291bnQob2JzLCB3YWl0LCBjb3VudCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMyB8fCBhcmd1bWVudHNbM10gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzNdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMCwgUCQyNikpKG9icywgeyB3YWl0OiB3YWl0LCBjb3VudDogY291bnQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH1cblxuXHRmdW5jdGlvbiB4Zm9ybUZvck9icyhvYnMpIHtcblx0ICByZXR1cm4ge1xuXHQgICAgJ0BAdHJhbnNkdWNlci9zdGVwJzogZnVuY3Rpb24gKHJlcywgaW5wdXQpIHtcblx0ICAgICAgb2JzLl9lbWl0VmFsdWUoaW5wdXQpO1xuXHQgICAgICByZXR1cm4gbnVsbDtcblx0ICAgIH0sXG5cdCAgICAnQEB0cmFuc2R1Y2VyL3Jlc3VsdCc6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgb2JzLl9lbWl0RW5kKCk7XG5cdCAgICAgIHJldHVybiBudWxsO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHR2YXIgbWl4aW4kMjQgPSB7XG5cdCAgX2luaXQ6IGZ1bmN0aW9uIChfcmVmKSB7XG5cdCAgICB2YXIgdHJhbnNkdWNlciA9IF9yZWYudHJhbnNkdWNlcjtcblxuXHQgICAgdGhpcy5feGZvcm0gPSB0cmFuc2R1Y2VyKHhmb3JtRm9yT2JzKHRoaXMpKTtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl94Zm9ybSA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBpZiAodGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9zdGVwJ10obnVsbCwgeCkgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9yZXN1bHQnXShudWxsKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX3hmb3JtWydAQHRyYW5zZHVjZXIvcmVzdWx0J10obnVsbCk7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDMxID0gY3JlYXRlU3RyZWFtKCd0cmFuc2R1Y2UnLCBtaXhpbiQyNCk7XG5cdHZhciBQJDI3ID0gY3JlYXRlUHJvcGVydHkoJ3RyYW5zZHVjZScsIG1peGluJDI0KTtcblxuXHRmdW5jdGlvbiB0cmFuc2R1Y2Uob2JzLCB0cmFuc2R1Y2VyKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMzEsIFAkMjcpKShvYnMsIHsgdHJhbnNkdWNlcjogdHJhbnNkdWNlciB9KTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2hhbmRsZXIgPSBmbjtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBlbWl0dGVyKHRoaXMpO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHRoaXMuX2hhbmRsZXIodGhpcy5fZW1pdHRlciwgZXZlbnQpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzMiA9IGNyZWF0ZVN0cmVhbSgnd2l0aEhhbmRsZXInLCBtaXhpbiQyNSk7XG5cdHZhciBQJDI4ID0gY3JlYXRlUHJvcGVydHkoJ3dpdGhIYW5kbGVyJywgbWl4aW4kMjUpO1xuXG5cdGZ1bmN0aW9uIHdpdGhIYW5kbGVyKG9icywgZm4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQzMiwgUCQyOCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH1cblxuXHR2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG5cdCAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG5cdH07XG5cblx0ZnVuY3Rpb24gWmlwKHNvdXJjZXMsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cblx0ICB0aGlzLl9idWZmZXJzID0gbWFwKHNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0ICAgIHJldHVybiBpc0FycmF5KHNvdXJjZSkgPyBjbG9uZUFycmF5KHNvdXJjZSkgOiBbXTtcblx0ICB9KTtcblx0ICB0aGlzLl9zb3VyY2VzID0gbWFwKHNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0ICAgIHJldHVybiBpc0FycmF5KHNvdXJjZSkgPyBuZXZlcigpIDogc291cmNlO1xuXHQgIH0pO1xuXG5cdCAgdGhpcy5fY29tYmluYXRvciA9IGNvbWJpbmF0b3IgPyBzcHJlYWQoY29tYmluYXRvciwgdGhpcy5fc291cmNlcy5sZW5ndGgpIDogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHJldHVybiB4O1xuXHQgIH07XG5cdCAgdGhpcy5fYWxpdmVDb3VudCA9IDA7XG5cblx0ICB0aGlzLl8kaGFuZGxlcnMgPSBbXTtcblxuXHQgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIChpKSB7XG5cdCAgICBfdGhpcy5fJGhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGksIGV2ZW50KTtcblx0ICAgIH0pO1xuXHQgIH07XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIF9sb29wKGkpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoWmlwLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnemlwJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblxuXHQgICAgLy8gaWYgYWxsIHNvdXJjZXMgYXJlIGFycmF5c1xuXHQgICAgd2hpbGUgKHRoaXMuX2lzRnVsbCgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXQoKTtcblx0ICAgIH1cblxuXHQgICAgdmFyIGxlbmd0aCA9IHRoaXMuX3NvdXJjZXMubGVuZ3RoO1xuXHQgICAgdGhpcy5fYWxpdmVDb3VudCA9IGxlbmd0aDtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoICYmIHRoaXMuX2FjdGl2ZTsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub2ZmQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfZW1pdDogZnVuY3Rpb24gKCkge1xuXHQgICAgdmFyIHZhbHVlcyA9IG5ldyBBcnJheSh0aGlzLl9idWZmZXJzLmxlbmd0aCk7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2J1ZmZlcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdmFsdWVzW2ldID0gdGhpcy5fYnVmZmVyc1tpXS5zaGlmdCgpO1xuXHQgICAgfVxuXHQgICAgdmFyIGNvbWJpbmF0b3IgPSB0aGlzLl9jb21iaW5hdG9yO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGNvbWJpbmF0b3IodmFsdWVzKSk7XG5cdCAgfSxcblx0ICBfaXNGdWxsOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2J1ZmZlcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgaWYgKHRoaXMuX2J1ZmZlcnNbaV0ubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgcmV0dXJuIGZhbHNlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdHJ1ZTtcblx0ICB9LFxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChpLCBldmVudCkge1xuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgIHRoaXMuX2J1ZmZlcnNbaV0ucHVzaChldmVudC52YWx1ZSk7XG5cdCAgICAgIGlmICh0aGlzLl9pc0Z1bGwoKSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlQ291bnQtLTtcblx0ICAgICAgaWYgKHRoaXMuX2FsaXZlQ291bnQgPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fYnVmZmVycyA9IG51bGw7XG5cdCAgICB0aGlzLl9jb21iaW5hdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVycyA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiB6aXAob2JzZXJ2YWJsZXMsIGNvbWJpbmF0b3IgLyogRnVuY3Rpb24gfCBmYWxzZXkgKi8pIHtcblx0ICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBaaXAob2JzZXJ2YWJsZXMsIGNvbWJpbmF0b3IpO1xuXHR9XG5cblx0dmFyIGlkJDggPSBmdW5jdGlvbiAoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIEFic3RyYWN0UG9vbCgpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgdmFyIF9yZWYgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1swXTtcblxuXHQgIHZhciBfcmVmJHF1ZXVlTGltID0gX3JlZi5xdWV1ZUxpbTtcblx0ICB2YXIgcXVldWVMaW0gPSBfcmVmJHF1ZXVlTGltID09PSB1bmRlZmluZWQgPyAwIDogX3JlZiRxdWV1ZUxpbTtcblx0ICB2YXIgX3JlZiRjb25jdXJMaW0gPSBfcmVmLmNvbmN1ckxpbTtcblx0ICB2YXIgY29uY3VyTGltID0gX3JlZiRjb25jdXJMaW0gPT09IHVuZGVmaW5lZCA/IC0xIDogX3JlZiRjb25jdXJMaW07XG5cdCAgdmFyIF9yZWYkZHJvcCA9IF9yZWYuZHJvcDtcblx0ICB2YXIgZHJvcCA9IF9yZWYkZHJvcCA9PT0gdW5kZWZpbmVkID8gJ25ldycgOiBfcmVmJGRyb3A7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuXHQgIHRoaXMuX3F1ZXVlTGltID0gcXVldWVMaW0gPCAwID8gLTEgOiBxdWV1ZUxpbTtcblx0ICB0aGlzLl9jb25jdXJMaW0gPSBjb25jdXJMaW0gPCAwID8gLTEgOiBjb25jdXJMaW07XG5cdCAgdGhpcy5fZHJvcCA9IGRyb3A7XG5cdCAgdGhpcy5fcXVldWUgPSBbXTtcblx0ICB0aGlzLl9jdXJTb3VyY2VzID0gW107XG5cdCAgdGhpcy5fJGhhbmRsZVN1YkFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVTdWJBbnkoZXZlbnQpO1xuXHQgIH07XG5cdCAgdGhpcy5fJGVuZEhhbmRsZXJzID0gW107XG5cdCAgdGhpcy5fY3VycmVudGx5QWRkaW5nID0gbnVsbDtcblxuXHQgIGlmICh0aGlzLl9jb25jdXJMaW0gPT09IDApIHtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH1cblxuXHRpbmhlcml0KEFic3RyYWN0UG9vbCwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ2Fic3RyYWN0UG9vbCcsXG5cblx0ICBfYWRkOiBmdW5jdGlvbiAob2JqLCB0b09icyAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgICAgdG9PYnMgPSB0b09icyB8fCBpZCQ4O1xuXHQgICAgaWYgKHRoaXMuX2NvbmN1ckxpbSA9PT0gLTEgfHwgdGhpcy5fY3VyU291cmNlcy5sZW5ndGggPCB0aGlzLl9jb25jdXJMaW0pIHtcblx0ICAgICAgdGhpcy5fYWRkVG9DdXIodG9PYnMob2JqKSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fcXVldWVMaW0gPT09IC0xIHx8IHRoaXMuX3F1ZXVlLmxlbmd0aCA8IHRoaXMuX3F1ZXVlTGltKSB7XG5cdCAgICAgICAgdGhpcy5fYWRkVG9RdWV1ZSh0b09icyhvYmopKTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl9kcm9wID09PSAnb2xkJykge1xuXHQgICAgICAgIHRoaXMuX3JlbW92ZU9sZGVzdCgpO1xuXHQgICAgICAgIHRoaXMuX2FkZChvYmosIHRvT2JzKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2FkZEFsbDogZnVuY3Rpb24gKG9ic3MpIHtcblx0ICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG5cdCAgICBmb3JFYWNoKG9ic3MsIGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzMi5fYWRkKG9icyk7XG5cdCAgICB9KTtcblx0ICB9LFxuXHQgIF9yZW1vdmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9yZW1vdmVDdXIob2JzKSA9PT0gLTEpIHtcblx0ICAgICAgdGhpcy5fcmVtb3ZlUXVldWUob2JzKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9hZGRUb1F1ZXVlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB0aGlzLl9xdWV1ZSA9IGNvbmNhdCh0aGlzLl9xdWV1ZSwgW29ic10pO1xuXHQgIH0sXG5cdCAgX2FkZFRvQ3VyOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cblx0ICAgICAgLy8gSEFDSzpcblx0ICAgICAgLy9cblx0ICAgICAgLy8gV2UgaGF2ZSB0d28gb3B0aW1pemF0aW9ucyBmb3IgY2FzZXMgd2hlbiBgb2JzYCBpcyBlbmRlZC4gV2UgZG9uJ3Qgd2FudFxuXHQgICAgICAvLyB0byBhZGQgc3VjaCBvYnNlcnZhYmxlIHRvIHRoZSBsaXN0LCBidXQgb25seSB3YW50IHRvIGVtaXQgZXZlbnRzXG5cdCAgICAgIC8vIGZyb20gaXQgKGlmIGl0IGhhcyBzb21lKS5cblx0ICAgICAgLy9cblx0ICAgICAgLy8gSW5zdGVhZCBvZiB0aGlzIGhhY2tzLCB3ZSBjb3VsZCBqdXN0IGRpZCBmb2xsb3dpbmcsXG5cdCAgICAgIC8vIGJ1dCBpdCB3b3VsZCBiZSA1LTggdGltZXMgc2xvd2VyOlxuXHQgICAgICAvL1xuXHQgICAgICAvLyAgICAgdGhpcy5fY3VyU291cmNlcyA9IGNvbmNhdCh0aGlzLl9jdXJTb3VyY2VzLCBbb2JzXSk7XG5cdCAgICAgIC8vICAgICB0aGlzLl9zdWJzY3JpYmUob2JzKTtcblx0ICAgICAgLy9cblxuXHQgICAgICAvLyAjMVxuXHQgICAgICAvLyBUaGlzIG9uZSBmb3IgY2FzZXMgd2hlbiBgb2JzYCBhbHJlYWR5IGVuZGVkXG5cdCAgICAgIC8vIGUuZy4sIEtlZmlyLmNvbnN0YW50KCkgb3IgS2VmaXIubmV2ZXIoKVxuXHQgICAgICBpZiAoIW9icy5fYWxpdmUpIHtcblx0ICAgICAgICBpZiAob2JzLl9jdXJyZW50RXZlbnQpIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXQob2JzLl9jdXJyZW50RXZlbnQudHlwZSwgb2JzLl9jdXJyZW50RXZlbnQudmFsdWUpO1xuXHQgICAgICAgIH1cblx0ICAgICAgICByZXR1cm47XG5cdCAgICAgIH1cblxuXHQgICAgICAvLyAjMlxuXHQgICAgICAvLyBUaGlzIG9uZSBpcyBmb3IgY2FzZXMgd2hlbiBgb2JzYCBnb2luZyB0byBlbmQgc3luY2hyb25vdXNseSBvblxuXHQgICAgICAvLyBmaXJzdCBzdWJzY3JpYmVyIGUuZy4sIEtlZmlyLnN0cmVhbShlbSA9PiB7ZW0uZW1pdCgxKTsgZW0uZW5kKCl9KVxuXHQgICAgICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBvYnM7XG5cdCAgICAgIG9icy5vbkFueSh0aGlzLl8kaGFuZGxlU3ViQW55KTtcblx0ICAgICAgdGhpcy5fY3VycmVudGx5QWRkaW5nID0gbnVsbDtcblx0ICAgICAgaWYgKG9icy5fYWxpdmUpIHtcblx0ICAgICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgICAgICB0aGlzLl9zdWJUb0VuZChvYnMpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fY3VyU291cmNlcyA9IGNvbmNhdCh0aGlzLl9jdXJTb3VyY2VzLCBbb2JzXSk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfc3ViVG9FbmQ6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG5cdCAgICB2YXIgb25FbmQgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpczMuX3JlbW92ZUN1cihvYnMpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuXyRlbmRIYW5kbGVycy5wdXNoKHsgb2JzOiBvYnMsIGhhbmRsZXI6IG9uRW5kIH0pO1xuXHQgICAgb2JzLm9uRW5kKG9uRW5kKTtcblx0ICB9LFxuXHQgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgIG9icy5vbkFueSh0aGlzLl8kaGFuZGxlU3ViQW55KTtcblxuXHQgICAgLy8gaXQgY2FuIGJlY29tZSBpbmFjdGl2ZSBpbiByZXNwb25jZSBvZiBzdWJzY3JpYmluZyB0byBgb2JzLm9uQW55YCBhYm92ZVxuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9zdWJUb0VuZChvYnMpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX3Vuc3Vic2NyaWJlOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICBvYnMub2ZmQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXG5cdCAgICB2YXIgb25FbmRJID0gZmluZEJ5UHJlZCh0aGlzLl8kZW5kSGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgcmV0dXJuIG9iai5vYnMgPT09IG9icztcblx0ICAgIH0pO1xuXHQgICAgaWYgKG9uRW5kSSAhPT0gLTEpIHtcblx0ICAgICAgb2JzLm9mZkVuZCh0aGlzLl8kZW5kSGFuZGxlcnNbb25FbmRJXS5oYW5kbGVyKTtcblx0ICAgICAgdGhpcy5fJGVuZEhhbmRsZXJzLnNwbGljZShvbkVuZEksIDEpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVN1YkFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9yZW1vdmVRdWV1ZTogZnVuY3Rpb24gKG9icykge1xuXHQgICAgdmFyIGluZGV4ID0gZmluZCh0aGlzLl9xdWV1ZSwgb2JzKTtcblx0ICAgIHRoaXMuX3F1ZXVlID0gcmVtb3ZlKHRoaXMuX3F1ZXVlLCBpbmRleCk7XG5cdCAgICByZXR1cm4gaW5kZXg7XG5cdCAgfSxcblx0ICBfcmVtb3ZlQ3VyOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKG9icyk7XG5cdCAgICB9XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kKHRoaXMuX2N1clNvdXJjZXMsIG9icyk7XG5cdCAgICB0aGlzLl9jdXJTb3VyY2VzID0gcmVtb3ZlKHRoaXMuX2N1clNvdXJjZXMsIGluZGV4KTtcblx0ICAgIGlmIChpbmRleCAhPT0gLTEpIHtcblx0ICAgICAgaWYgKHRoaXMuX3F1ZXVlLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICAgIHRoaXMuX3B1bGxRdWV1ZSgpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fb25FbXB0eSgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gaW5kZXg7XG5cdCAgfSxcblx0ICBfcmVtb3ZlT2xkZXN0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9yZW1vdmVDdXIodGhpcy5fY3VyU291cmNlc1swXSk7XG5cdCAgfSxcblx0ICBfcHVsbFF1ZXVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX3F1ZXVlID0gY2xvbmVBcnJheSh0aGlzLl9xdWV1ZSk7XG5cdCAgICAgIHRoaXMuX2FkZFRvQ3VyKHRoaXMuX3F1ZXVlLnNoaWZ0KCkpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDAsIHNvdXJjZXMgPSB0aGlzLl9jdXJTb3VyY2VzOyBpIDwgc291cmNlcy5sZW5ndGggJiYgdGhpcy5fYWN0aXZlOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc3Vic2NyaWJlKHNvdXJjZXNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc291cmNlcyA9IHRoaXMuX2N1clNvdXJjZXM7IGkgPCBzb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKHNvdXJjZXNbaV0pO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRseUFkZGluZyAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSh0aGlzLl9jdXJyZW50bHlBZGRpbmcpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2lzRW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiB0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA9PT0gMDtcblx0ICB9LFxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiAoKSB7fSxcblx0ICBfY2xlYXI6IGZ1bmN0aW9uICgpIHtcblx0ICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9xdWV1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9jdXJTb3VyY2VzID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVTdWJBbnkgPSBudWxsO1xuXHQgICAgdGhpcy5fJGVuZEhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIE1lcmdlKHNvdXJjZXMpIHtcblx0ICBBYnN0cmFjdFBvb2wuY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9hZGRBbGwoc291cmNlcyk7XG5cdCAgdGhpcy5faW5pdGlhbGlzZWQgPSB0cnVlO1xuXHR9XG5cblx0aW5oZXJpdChNZXJnZSwgQWJzdHJhY3RQb29sLCB7XG5cblx0ICBfbmFtZTogJ21lcmdlJyxcblxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5faW5pdGlhbGlzZWQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gbWVyZ2Uob2JzZXJ2YWJsZXMpIHtcblx0ICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBNZXJnZShvYnNlcnZhYmxlcyk7XG5cdH1cblxuXHRmdW5jdGlvbiBTJDMzKGdlbmVyYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9nZW5lcmF0b3IgPSBnZW5lcmF0b3I7XG5cdCAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICB0aGlzLl9pbkxvb3AgPSBmYWxzZTtcblx0ICB0aGlzLl9pdGVyYXRpb24gPSAwO1xuXHQgIHRoaXMuXyRoYW5kbGVBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGV2ZW50KTtcblx0ICB9O1xuXHR9XG5cblx0aW5oZXJpdChTJDMzLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAncmVwZWF0JyxcblxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgICB0aGlzLl9nZXRTb3VyY2UoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXQoZXZlbnQudHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2dldFNvdXJjZTogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKCF0aGlzLl9pbkxvb3ApIHtcblx0ICAgICAgdGhpcy5faW5Mb29wID0gdHJ1ZTtcblx0ICAgICAgdmFyIGdlbmVyYXRvciA9IHRoaXMuX2dlbmVyYXRvcjtcblx0ICAgICAgd2hpbGUgKHRoaXMuX3NvdXJjZSA9PT0gbnVsbCAmJiB0aGlzLl9hbGl2ZSAmJiB0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9zb3VyY2UgPSBnZW5lcmF0b3IodGhpcy5faXRlcmF0aW9uKyspO1xuXHQgICAgICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9pbkxvb3AgPSBmYWxzZTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZ2V0U291cmNlKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uICgpIHtcblx0ICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX2dlbmVyYXRvciA9IG51bGw7XG5cdCAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZUFueSA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiByZXBlYXQgKGdlbmVyYXRvcikge1xuXHQgIHJldHVybiBuZXcgUyQzMyhnZW5lcmF0b3IpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29uY2F0JDEob2JzZXJ2YWJsZXMpIHtcblx0ICByZXR1cm4gcmVwZWF0KGZ1bmN0aW9uIChpbmRleCkge1xuXHQgICAgcmV0dXJuIG9ic2VydmFibGVzLmxlbmd0aCA+IGluZGV4ID8gb2JzZXJ2YWJsZXNbaW5kZXhdIDogZmFsc2U7XG5cdCAgfSkuc2V0TmFtZSgnY29uY2F0Jyk7XG5cdH1cblxuXHRmdW5jdGlvbiBQb29sKCkge1xuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMpO1xuXHR9XG5cblx0aW5oZXJpdChQb29sLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9uYW1lOiAncG9vbCcsXG5cblx0ICBwbHVnOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB0aGlzLl9hZGQob2JzKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cdCAgdW5wbHVnOiBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICB0aGlzLl9yZW1vdmUob2JzKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gRmxhdE1hcChzb3VyY2UsIGZuLCBvcHRpb25zKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXHQgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZTtcblx0ICB0aGlzLl9mbiA9IGZuO1xuXHQgIHRoaXMuX21haW5FbmRlZCA9IGZhbHNlO1xuXHQgIHRoaXMuX2xhc3RDdXJyZW50ID0gbnVsbDtcblx0ICB0aGlzLl8kaGFuZGxlTWFpbiA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVNYWluKGV2ZW50KTtcblx0ICB9O1xuXHR9XG5cblx0aW5oZXJpdChGbGF0TWFwLCBBYnN0cmFjdFBvb2wsIHtcblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9vbkFjdGl2YXRpb24uY2FsbCh0aGlzKTtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVNYWluKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgQWJzdHJhY3RQb29sLnByb3RvdHlwZS5fb25EZWFjdGl2YXRpb24uY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZU1haW4pO1xuXHQgICAgdGhpcy5faGFkTm9FdlNpbmNlRGVhY3QgPSB0cnVlO1xuXHQgIH0sXG5cdCAgX2hhbmRsZU1haW46IGZ1bmN0aW9uIChldmVudCkge1xuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgLy8gSXMgbGF0ZXN0IHZhbHVlIGJlZm9yZSBkZWFjdGl2YXRpb24gc3Vydml2ZWQsIGFuZCBub3cgaXMgJ2N1cnJlbnQnIG9uIHRoaXMgYWN0aXZhdGlvbj9cblx0ICAgICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBoYW5kbGUgc3VjaCB2YWx1ZXMsIHRvIHByZXZlbnQgdG8gY29uc3RhbnRseSBhZGRcblx0ICAgICAgLy8gc2FtZSBvYnNlcnZhbGUgb24gZWFjaCBhY3RpdmF0aW9uL2RlYWN0aXZhdGlvbiB3aGVuIG91ciBtYWluIHNvdXJjZVxuXHQgICAgICAvLyBpcyBhIGBLZWZpci5jb25hdGFudCgpYCBmb3IgZXhhbXBsZS5cblx0ICAgICAgdmFyIHNhbWVDdXJyID0gdGhpcy5fYWN0aXZhdGluZyAmJiB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCAmJiB0aGlzLl9sYXN0Q3VycmVudCA9PT0gZXZlbnQudmFsdWU7XG5cdCAgICAgIGlmICghc2FtZUN1cnIpIHtcblx0ICAgICAgICB0aGlzLl9hZGQoZXZlbnQudmFsdWUsIHRoaXMuX2ZuKTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9sYXN0Q3VycmVudCA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICBpZiAodGhpcy5faXNFbXB0eSgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX21haW5FbmRlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbWFpbkVuZGVkKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9jbGVhcjogZnVuY3Rpb24gKCkge1xuXHQgICAgQWJzdHJhY3RQb29sLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXN0Q3VycmVudCA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlTWFpbiA9IG51bGw7XG5cdCAgfVxuXHR9KTtcblxuXHRmdW5jdGlvbiBGbGF0TWFwRXJyb3JzKHNvdXJjZSwgZm4pIHtcblx0ICBGbGF0TWFwLmNhbGwodGhpcywgc291cmNlLCBmbik7XG5cdH1cblxuXHRpbmhlcml0KEZsYXRNYXBFcnJvcnMsIEZsYXRNYXAsIHtcblxuXHQgIC8vIFNhbWUgYXMgaW4gRmxhdE1hcCwgb25seSBWQUxVRS9FUlJPUiBmbGlwcGVkXG5cdCAgX2hhbmRsZU1haW46IGZ1bmN0aW9uIChldmVudCkge1xuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdmFyIHNhbWVDdXJyID0gdGhpcy5fYWN0aXZhdGluZyAmJiB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCAmJiB0aGlzLl9sYXN0Q3VycmVudCA9PT0gZXZlbnQudmFsdWU7XG5cdCAgICAgIGlmICghc2FtZUN1cnIpIHtcblx0ICAgICAgICB0aGlzLl9hZGQoZXZlbnQudmFsdWUsIHRoaXMuX2ZuKTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9sYXN0Q3VycmVudCA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICBpZiAodGhpcy5faXNFbXB0eSgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX21haW5FbmRlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbnN0cnVjdG9yJDEoQmFzZUNsYXNzLCBuYW1lKSB7XG5cdCAgcmV0dXJuIGZ1bmN0aW9uIEFub255bW91c09ic2VydmFibGUocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBCYXNlQ2xhc3MuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3ByaW1hcnkgPSBwcmltYXJ5O1xuXHQgICAgdGhpcy5fc2Vjb25kYXJ5ID0gc2Vjb25kYXJ5O1xuXHQgICAgdGhpcy5fbmFtZSA9IHByaW1hcnkuX25hbWUgKyAnLicgKyBuYW1lO1xuXHQgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IE5PVEhJTkc7XG5cdCAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlU2Vjb25kYXJ5QW55KGV2ZW50KTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVByaW1hcnlBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuX2luaXQob3B0aW9ucyk7XG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNsYXNzTWV0aG9kcyQxKEJhc2VDbGFzcykge1xuXHQgIHJldHVybiB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gKCkge30sXG5cdCAgICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSB4O1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlBbnk6IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVQcmltYXJ5RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlFbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUFueTogZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlU2Vjb25kYXJ5VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRVJST1I6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlU2Vjb25kYXJ5RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgICAgdGhpcy5faGFuZGxlU2Vjb25kYXJ5RW5kKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICAgIHRoaXMuX3JlbW92ZVNlY29uZGFyeSgpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX3JlbW92ZVNlY29uZGFyeTogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgICAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9wcmltYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgICAgfVxuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9wcmltYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSk7XG5cdCAgICB9LFxuXHQgICAgX2NsZWFyOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIEJhc2VDbGFzcy5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICAgIHRoaXMuX3ByaW1hcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9zZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSA9IG51bGw7XG5cdCAgICAgIHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTdHJlYW0kMShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBTID0gY3JlYXRlQ29uc3RydWN0b3IkMShTdHJlYW0sIG5hbWUpO1xuXHQgIGluaGVyaXQoUywgU3RyZWFtLCBjcmVhdGVDbGFzc01ldGhvZHMkMShTdHJlYW0pLCBtaXhpbik7XG5cdCAgcmV0dXJuIFM7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVQcm9wZXJ0eSQxKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFAgPSBjcmVhdGVDb25zdHJ1Y3RvciQxKFByb3BlcnR5LCBuYW1lKTtcblx0ICBpbmhlcml0KFAsIFByb3BlcnR5LCBjcmVhdGVDbGFzc01ldGhvZHMkMShQcm9wZXJ0eSksIG1peGluKTtcblx0ICByZXR1cm4gUDtcblx0fVxuXG5cdHZhciBtaXhpbiQyNiA9IHtcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcgJiYgdGhpcy5fbGFzdFNlY29uZGFyeSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORyB8fCAhdGhpcy5fbGFzdFNlY29uZGFyeSkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM0ID0gY3JlYXRlU3RyZWFtJDEoJ2ZpbHRlckJ5JywgbWl4aW4kMjYpO1xuXHR2YXIgUCQyOSA9IGNyZWF0ZVByb3BlcnR5JDEoJ2ZpbHRlckJ5JywgbWl4aW4kMjYpO1xuXG5cdGZ1bmN0aW9uIGZpbHRlckJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzNCwgUCQyOSkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH1cblxuXHR2YXIgaWQyID0gZnVuY3Rpb24gKF8sIHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBzYW1wbGVkQnkocGFzc2l2ZSwgYWN0aXZlLCBjb21iaW5hdG9yKSB7XG5cdCAgdmFyIF9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gY29tYmluYXRvcihiLCBhKTtcblx0ICB9IDogaWQyO1xuXHQgIHJldHVybiBjb21iaW5lKFthY3RpdmVdLCBbcGFzc2l2ZV0sIF9jb21iaW5hdG9yKS5zZXROYW1lKHBhc3NpdmUsICdzYW1wbGVkQnknKTtcblx0fVxuXG5cdHZhciBtaXhpbiQyNyA9IHtcblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgPT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzNSA9IGNyZWF0ZVN0cmVhbSQxKCdza2lwVW50aWxCeScsIG1peGluJDI3KTtcblx0dmFyIFAkMzAgPSBjcmVhdGVQcm9wZXJ0eSQxKCdza2lwVW50aWxCeScsIG1peGluJDI3KTtcblxuXHRmdW5jdGlvbiBza2lwVW50aWxCeShwcmltYXJ5LCBzZWNvbmRhcnkpIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMkMzUsIFAkMzApKShwcmltYXJ5LCBzZWNvbmRhcnkpO1xuXHR9XG5cblx0dmFyIG1peGluJDI4ID0ge1xuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzNiA9IGNyZWF0ZVN0cmVhbSQxKCd0YWtlVW50aWxCeScsIG1peGluJDI4KTtcblx0dmFyIFAkMzEgPSBjcmVhdGVQcm9wZXJ0eSQxKCd0YWtlVW50aWxCeScsIG1peGluJDI4KTtcblxuXHRmdW5jdGlvbiB0YWtlVW50aWxCeShwcmltYXJ5LCBzZWNvbmRhcnkpIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMkMzYsIFAkMzEpKShwcmltYXJ5LCBzZWNvbmRhcnkpO1xuXHR9XG5cblx0dmFyIG1peGluJDI5ID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmJGZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH0sXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fcHJpbWFyeS5vbkFueSh0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSk7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUgJiYgdGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3NlY29uZGFyeS5vbkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblx0fTtcblxuXHR2YXIgUyQzNyA9IGNyZWF0ZVN0cmVhbSQxKCdidWZmZXJCeScsIG1peGluJDI5KTtcblx0dmFyIFAkMzIgPSBjcmVhdGVQcm9wZXJ0eSQxKCdidWZmZXJCeScsIG1peGluJDI5KTtcblxuXHRmdW5jdGlvbiBidWZmZXJCeShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMgLyogb3B0aW9uYWwgKi8pIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMkMzcsIFAkMzIpKShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpO1xuXHR9XG5cblx0dmFyIG1peGluJDMwID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmJGZsdXNoT25FbmQ7XG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uQ2hhbmdlID0gX3JlZi5mbHVzaE9uQ2hhbmdlO1xuXHQgICAgdmFyIGZsdXNoT25DaGFuZ2UgPSBfcmVmJGZsdXNoT25DaGFuZ2UgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogX3JlZiRmbHVzaE9uQ2hhbmdlO1xuXG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2ZsdXNoT25DaGFuZ2UgPSBmbHVzaE9uQ2hhbmdlO1xuXHQgIH0sXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXHQgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ICE9PSBOT1RISU5HICYmICF0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgfSxcblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2ZsdXNoT25FbmQgJiYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgPT09IE5PVEhJTkcgfHwgdGhpcy5fbGFzdFNlY29uZGFyeSkpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25DaGFuZ2UgJiYgIXgpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblxuXHQgICAgLy8gZnJvbSBkZWZhdWx0IF9oYW5kbGVTZWNvbmRhcnlWYWx1ZVxuXHQgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IHg7XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM4ID0gY3JlYXRlU3RyZWFtJDEoJ2J1ZmZlcldoaWxlQnknLCBtaXhpbiQzMCk7XG5cdHZhciBQJDMzID0gY3JlYXRlUHJvcGVydHkkMSgnYnVmZmVyV2hpbGVCeScsIG1peGluJDMwKTtcblxuXHRmdW5jdGlvbiBidWZmZXJXaGlsZUJ5KHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyAvKiBvcHRpb25hbCAqLykge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUyQzOCwgUCQzMykpKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHR2YXIgZiA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gZmFsc2U7XG5cdH07XG5cdHZhciB0ID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGF3YWl0aW5nKGEsIGIpIHtcblx0ICB2YXIgcmVzdWx0ID0gbWVyZ2UoW21hcCQxKGEsIHQpLCBtYXAkMShiLCBmKV0pO1xuXHQgIHJlc3VsdCA9IHNraXBEdXBsaWNhdGVzKHJlc3VsdCk7XG5cdCAgcmVzdWx0ID0gdG9Qcm9wZXJ0eShyZXN1bHQsIGYpO1xuXHQgIHJldHVybiByZXN1bHQuc2V0TmFtZShhLCAnYXdhaXRpbmcnKTtcblx0fVxuXG5cdHZhciBtaXhpbiQzMSA9IHtcblx0ICBfaW5pdDogZnVuY3Rpb24gKF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblx0ICBfZnJlZTogZnVuY3Rpb24gKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgcmVzdWx0ID0gZm4oeCk7XG5cdCAgICBpZiAocmVzdWx0LmNvbnZlcnQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHJlc3VsdC5lcnJvcik7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9O1xuXG5cdHZhciBTJDM5ID0gY3JlYXRlU3RyZWFtKCd2YWx1ZXNUb0Vycm9ycycsIG1peGluJDMxKTtcblx0dmFyIFAkMzQgPSBjcmVhdGVQcm9wZXJ0eSgndmFsdWVzVG9FcnJvcnMnLCBtaXhpbiQzMSk7XG5cblx0dmFyIGRlZkZuID0gZnVuY3Rpb24gKHgpIHtcblx0ICByZXR1cm4geyBjb252ZXJ0OiB0cnVlLCBlcnJvcjogeCB9O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHZhbHVlc1RvRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGRlZkZuIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkMzksIFAkMzQpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDMyID0ge1xuXHQgIF9pbml0OiBmdW5jdGlvbiAoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXHQgIF9mcmVlOiBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciByZXN1bHQgPSBmbih4KTtcblx0ICAgIGlmIChyZXN1bHQuY29udmVydCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUocmVzdWx0LnZhbHVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNDAgPSBjcmVhdGVTdHJlYW0oJ2Vycm9yc1RvVmFsdWVzJywgbWl4aW4kMzIpO1xuXHR2YXIgUCQzNSA9IGNyZWF0ZVByb3BlcnR5KCdlcnJvcnNUb1ZhbHVlcycsIG1peGluJDMyKTtcblxuXHR2YXIgZGVmRm4kMSA9IGZ1bmN0aW9uICh4KSB7XG5cdCAgcmV0dXJuIHsgY29udmVydDogdHJ1ZSwgdmFsdWU6IHggfTtcblx0fTtcblxuXHRmdW5jdGlvbiBlcnJvcnNUb1ZhbHVlcyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBkZWZGbiQxIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMkNDAsIFAkMzUpKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9XG5cblx0dmFyIG1peGluJDMzID0ge1xuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH07XG5cblx0dmFyIFMkNDEgPSBjcmVhdGVTdHJlYW0oJ2VuZE9uRXJyb3InLCBtaXhpbiQzMyk7XG5cdHZhciBQJDM2ID0gY3JlYXRlUHJvcGVydHkoJ2VuZE9uRXJyb3InLCBtaXhpbiQzMyk7XG5cblx0ZnVuY3Rpb24gZW5kT25FcnJvcihvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUyQ0MSwgUCQzNikpKG9icyk7XG5cdH1cblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1Byb3BlcnR5ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHRvUHJvcGVydHkodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNoYW5nZXMgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGNoYW5nZXModGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9Qcm9taXNlID0gZnVuY3Rpb24gKFByb21pc2UpIHtcblx0ICByZXR1cm4gdG9Qcm9taXNlKHRoaXMsIFByb21pc2UpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvRVNPYnNlcnZhYmxlID0gdG9FU09ic2VydmFibGU7XG5cdE9ic2VydmFibGUucHJvdG90eXBlWyQkb2JzZXJ2YWJsZV0gPSB0b0VTT2JzZXJ2YWJsZTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbWFwJDEodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBmaWx0ZXIodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2UgPSBmdW5jdGlvbiAobikge1xuXHQgIHJldHVybiB0YWtlKHRoaXMsIG4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VFcnJvcnMgPSBmdW5jdGlvbiAobikge1xuXHQgIHJldHVybiB0YWtlRXJyb3JzKHRoaXMsIG4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VXaGlsZSA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB0YWtlV2hpbGUodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmxhc3QgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGxhc3QodGhpcyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHNraXAodGhpcywgbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcFdoaWxlID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHNraXBXaGlsZSh0aGlzLCBmbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcER1cGxpY2F0ZXMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gc2tpcER1cGxpY2F0ZXModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbiAoZm4sIHNlZWQpIHtcblx0ICByZXR1cm4gZGlmZih0aGlzLCBmbiwgc2VlZCk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2NhbiA9IGZ1bmN0aW9uIChmbiwgc2VlZCkge1xuXHQgIHJldHVybiBzY2FuKHRoaXMsIGZuLCBzZWVkKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0dGVuID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZsYXR0ZW4odGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKHdhaXQpIHtcblx0ICByZXR1cm4gZGVsYXkodGhpcywgd2FpdCk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGhyb3R0bGUgPSBmdW5jdGlvbiAod2FpdCwgb3B0aW9ucykge1xuXHQgIHJldHVybiB0aHJvdHRsZSh0aGlzLCB3YWl0LCBvcHRpb25zKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5kZWJvdW5jZSA9IGZ1bmN0aW9uICh3YWl0LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGRlYm91bmNlKHRoaXMsIHdhaXQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1hcEVycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBtYXBFcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZpbHRlckVycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBmaWx0ZXJFcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZVZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlVmFsdWVzKHRoaXMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZUVycm9ycyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlRXJyb3JzKHRoaXMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZUVuZCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlRW5kKHRoaXMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJlZm9yZUVuZCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBiZWZvcmVFbmQodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNsaWRpbmdXaW5kb3cgPSBmdW5jdGlvbiAobWF4LCBtaW4pIHtcblx0ICByZXR1cm4gc2xpZGluZ1dpbmRvdyh0aGlzLCBtYXgsIG1pbik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2hpbGUgPSBmdW5jdGlvbiAoZm4sIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2hpbGUodGhpcywgZm4sIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldpdGhDb3VudCA9IGZ1bmN0aW9uIChjb3VudCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZSQxKHRoaXMsIGNvdW50LCBvcHRpb25zKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaXRoVGltZU9yQ291bnQgPSBmdW5jdGlvbiAod2FpdCwgY291bnQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2l0aFRpbWVPckNvdW50KHRoaXMsIHdhaXQsIGNvdW50LCBvcHRpb25zKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50cmFuc2R1Y2UgPSBmdW5jdGlvbiAodHJhbnNkdWNlcikge1xuXHQgIHJldHVybiB0cmFuc2R1Y2UodGhpcywgdHJhbnNkdWNlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUud2l0aEhhbmRsZXIgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gd2l0aEhhbmRsZXIodGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNvbWJpbmUgPSBmdW5jdGlvbiAob3RoZXIsIGNvbWJpbmF0b3IpIHtcblx0ICByZXR1cm4gY29tYmluZShbdGhpcywgb3RoZXJdLCBjb21iaW5hdG9yKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS56aXAgPSBmdW5jdGlvbiAob3RoZXIsIGNvbWJpbmF0b3IpIHtcblx0ICByZXR1cm4gemlwKFt0aGlzLCBvdGhlcl0sIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIG1lcmdlKFt0aGlzLCBvdGhlcl0pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBjb25jYXQkMShbdGhpcywgb3RoZXJdKTtcblx0fTtcblxuXHR2YXIgcG9vbCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbmV3IFBvb2woKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuKS5zZXROYW1lKHRoaXMsICdmbGF0TWFwJyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBMYXRlc3QgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgY29uY3VyTGltOiAxLCBkcm9wOiAnb2xkJyB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwTGF0ZXN0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBGaXJzdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBjb25jdXJMaW06IDEgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcEZpcnN0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBDb25jYXQgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgcXVldWVMaW06IC0xLCBjb25jdXJMaW06IDEgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcENvbmNhdCcpO1xuXHR9O1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwQ29uY3VyTGltaXQgPSBmdW5jdGlvbiAoZm4sIGxpbWl0KSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IHF1ZXVlTGltOiAtMSwgY29uY3VyTGltOiBsaW1pdCB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwQ29uY3VyTGltaXQnKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwRXJyb3JzKHRoaXMsIGZuKS5zZXROYW1lKHRoaXMsICdmbGF0TWFwRXJyb3JzJyk7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gZmlsdGVyQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNhbXBsZWRCeSA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiBzYW1wbGVkQnkodGhpcywgb3RoZXIsIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNraXBVbnRpbEJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIHNraXBVbnRpbEJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50YWtlVW50aWxCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiB0YWtlVW50aWxCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyQnkgPSBmdW5jdGlvbiAob3RoZXIsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyQnkodGhpcywgb3RoZXIsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldoaWxlQnkgPSBmdW5jdGlvbiAob3RoZXIsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2hpbGVCeSh0aGlzLCBvdGhlciwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gRGVwcmVjYXRlZFxuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHZhciBERVBSRUNBVElPTl9XQVJOSU5HUyA9IHRydWU7XG5cdGZ1bmN0aW9uIGRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncygpIHtcblx0ICBERVBSRUNBVElPTl9XQVJOSU5HUyA9IGZhbHNlO1xuXHR9XG5cblx0ZnVuY3Rpb24gd2Fybihtc2cpIHtcblx0ICBpZiAoREVQUkVDQVRJT05fV0FSTklOR1MgJiYgY29uc29sZSAmJiB0eXBlb2YgY29uc29sZS53YXJuID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICB2YXIgbXNnMiA9ICdcXG5IZXJlIGlzIGFuIEVycm9yIG9iamVjdCBmb3IgeW91IGNvbnRhaW5pbmcgdGhlIGNhbGwgc3RhY2s6Jztcblx0ICAgIGNvbnNvbGUud2Fybihtc2csIG1zZzIsIG5ldyBFcnJvcigpKTtcblx0ICB9XG5cdH1cblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5hd2FpdGluZyA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAuYXdhaXRpbmcoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0NScpO1xuXHQgIHJldHVybiBhd2FpdGluZyh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudmFsdWVzVG9FcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLnZhbHVlc1RvRXJyb3JzKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDknKTtcblx0ICByZXR1cm4gdmFsdWVzVG9FcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdE9ic2VydmFibGUucHJvdG90eXBlLmVycm9yc1RvVmFsdWVzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5lcnJvcnNUb1ZhbHVlcygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ5Jyk7XG5cdCAgcmV0dXJuIGVycm9yc1RvVmFsdWVzKHRoaXMsIGZuKTtcblx0fTtcblxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5lbmRPbkVycm9yID0gZnVuY3Rpb24gKCkge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAuZW5kT25FcnJvcigpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTUwJyk7XG5cdCAgcmV0dXJuIGVuZE9uRXJyb3IodGhpcyk7XG5cdH07XG5cblx0Ly8gRXhwb3J0c1xuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHZhciBLZWZpciA9IHsgT2JzZXJ2YWJsZTogT2JzZXJ2YWJsZSwgU3RyZWFtOiBTdHJlYW0sIFByb3BlcnR5OiBQcm9wZXJ0eSwgbmV2ZXI6IG5ldmVyLCBsYXRlcjogbGF0ZXIsIGludGVydmFsOiBpbnRlcnZhbCwgc2VxdWVudGlhbGx5OiBzZXF1ZW50aWFsbHksXG5cdCAgZnJvbVBvbGw6IGZyb21Qb2xsLCB3aXRoSW50ZXJ2YWw6IHdpdGhJbnRlcnZhbCwgZnJvbUNhbGxiYWNrOiBmcm9tQ2FsbGJhY2ssIGZyb21Ob2RlQ2FsbGJhY2s6IGZyb21Ob2RlQ2FsbGJhY2ssIGZyb21FdmVudHM6IGZyb21FdmVudHMsIHN0cmVhbTogc3RyZWFtLFxuXHQgIGNvbnN0YW50OiBjb25zdGFudCwgY29uc3RhbnRFcnJvcjogY29uc3RhbnRFcnJvciwgZnJvbVByb21pc2U6IGZyb21Qcm9taXNlLCBmcm9tRVNPYnNlcnZhYmxlOiBmcm9tRVNPYnNlcnZhYmxlLCBjb21iaW5lOiBjb21iaW5lLCB6aXA6IHppcCwgbWVyZ2U6IG1lcmdlLFxuXHQgIGNvbmNhdDogY29uY2F0JDEsIFBvb2w6IFBvb2wsIHBvb2w6IHBvb2wsIHJlcGVhdDogcmVwZWF0LCBzdGF0aWNMYW5kOiBzdGF0aWNMYW5kIH07XG5cblx0S2VmaXIuS2VmaXIgPSBLZWZpcjtcblxuXHRleHBvcnRzLmRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncyA9IGRpc3NhYmxlRGVwcmVjYXRpb25XYXJuaW5ncztcblx0ZXhwb3J0cy5LZWZpciA9IEtlZmlyO1xuXHRleHBvcnRzLk9ic2VydmFibGUgPSBPYnNlcnZhYmxlO1xuXHRleHBvcnRzLlN0cmVhbSA9IFN0cmVhbTtcblx0ZXhwb3J0cy5Qcm9wZXJ0eSA9IFByb3BlcnR5O1xuXHRleHBvcnRzLm5ldmVyID0gbmV2ZXI7XG5cdGV4cG9ydHMubGF0ZXIgPSBsYXRlcjtcblx0ZXhwb3J0cy5pbnRlcnZhbCA9IGludGVydmFsO1xuXHRleHBvcnRzLnNlcXVlbnRpYWxseSA9IHNlcXVlbnRpYWxseTtcblx0ZXhwb3J0cy5mcm9tUG9sbCA9IGZyb21Qb2xsO1xuXHRleHBvcnRzLndpdGhJbnRlcnZhbCA9IHdpdGhJbnRlcnZhbDtcblx0ZXhwb3J0cy5mcm9tQ2FsbGJhY2sgPSBmcm9tQ2FsbGJhY2s7XG5cdGV4cG9ydHMuZnJvbU5vZGVDYWxsYmFjayA9IGZyb21Ob2RlQ2FsbGJhY2s7XG5cdGV4cG9ydHMuZnJvbUV2ZW50cyA9IGZyb21FdmVudHM7XG5cdGV4cG9ydHMuc3RyZWFtID0gc3RyZWFtO1xuXHRleHBvcnRzLmNvbnN0YW50ID0gY29uc3RhbnQ7XG5cdGV4cG9ydHMuY29uc3RhbnRFcnJvciA9IGNvbnN0YW50RXJyb3I7XG5cdGV4cG9ydHMuZnJvbVByb21pc2UgPSBmcm9tUHJvbWlzZTtcblx0ZXhwb3J0cy5mcm9tRVNPYnNlcnZhYmxlID0gZnJvbUVTT2JzZXJ2YWJsZTtcblx0ZXhwb3J0cy5jb21iaW5lID0gY29tYmluZTtcblx0ZXhwb3J0cy56aXAgPSB6aXA7XG5cdGV4cG9ydHMubWVyZ2UgPSBtZXJnZTtcblx0ZXhwb3J0cy5jb25jYXQgPSBjb25jYXQkMTtcblx0ZXhwb3J0cy5Qb29sID0gUG9vbDtcblx0ZXhwb3J0cy5wb29sID0gcG9vbDtcblx0ZXhwb3J0cy5yZXBlYXQgPSByZXBlYXQ7XG5cdGV4cG9ydHMuc3RhdGljTGFuZCA9IHN0YXRpY0xhbmQ7XG5cdGV4cG9ydHNbJ2RlZmF1bHQnXSA9IEtlZmlyO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKTsiLCJpbXBvcnQgc25hYmJkb20gZnJvbSAnc25hYmJkb20vc25hYmJkb20uanMnXG5pbXBvcnQgaCBmcm9tICdzbmFiYmRvbS9oLmpzJ1xuaW1wb3J0IHNuYWJDbGFzcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzLmpzJ1xuaW1wb3J0IHNuYWJQcm9wcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzJ1xuaW1wb3J0IHNuYWJTdHlsZSBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3N0eWxlLmpzJ1xuaW1wb3J0IHNuYWJFdmVudCBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzLmpzJ1xuaW1wb3J0IEtlZmlyIGZyb20gJ2tlZmlyJ1xuXG5leHBvcnQgZnVuY3Rpb24gbWtFbWl0KHN0cmVhbSQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGVtaXQoYWN0aW9uLCB2YWx1ZSkge1xuICAgIHJldHVybiBbc3RyZWFtJC5lbWl0LCBbYWN0aW9uLCB2YWx1ZV1dXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1cygpIHtcbiAgbGV0IGVtaXR0ZXJcbiAgbGV0IHN0cmVhbSA9IEtlZmlyLnN0cmVhbShfZW1pdHRlciA9PiB7XG4gICAgZW1pdHRlciA9IF9lbWl0dGVyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgZW1pdHRlciA9IG51bGxcbiAgICB9XG4gIH0pXG4gIHN0cmVhbS5lbWl0ID0gZnVuY3Rpb24oeCkge1xuICAgIGVtaXR0ZXIgJiYgZW1pdHRlci5lbWl0KHgpXG4gIH1cbiAgcmV0dXJuIHN0cmVhbVxufVxuXG4vKlxuICAgWydkaXYnLCB7fSxcbiAgICBbWydidXR0b24nLCB7IG9uOiB7IGNsaWNrOiBlbWl0KCdhZGQnKSB9IH0sICdDbGljayBNZSEnXSxcbiAgICAgWydzcGFuJywge30sIG1vZGVsXV1dXG4qL1xuXG5mdW5jdGlvbiBjb252ZXJ0VG9IeXBlclNjcmlwdChub2RlKSB7XG4gIGxldCBbc2VsLCBkYXRhLCBjaGlsZHJlbl0gPSBub2RlXG5cbiAgaWYgKEFycmF5LmlzQXJyYXkoY2hpbGRyZW4pKSB7XG4gICAgcmV0dXJuIGgoc2VsLCBkYXRhLCBjaGlsZHJlbi5tYXAoY29udmVydFRvSHlwZXJTY3JpcHQpKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBoLmFwcGx5KG51bGwsIG5vZGUpXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlcih2aWV3JCwgY29udGFpbmVyKSB7XG4gIGxldCBwYXRjaCA9IHNuYWJiZG9tLmluaXQoW3NuYWJDbGFzcywgc25hYlByb3BzLCBzbmFiU3R5bGUsIHNuYWJFdmVudF0pXG4gIGxldCB2bm9kZSA9IGNvbnRhaW5lclxuXG4gIHZpZXckXG4gICAgLm1hcChjb252ZXJ0VG9IeXBlclNjcmlwdClcbiAgICAub25WYWx1ZShuZXdWbm9kZSA9PiB7XG4gICAgICBwYXRjaCh2bm9kZSwgbmV3Vm5vZGUpXG4gICAgICB2bm9kZSA9IG5ld1Zub2RlXG4gICAgfSlcbn1cbiIsIiFmdW5jdGlvbihuLGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoW10sZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSgpOm4uanNvbnA9ZSgpfSh0aGlzLGZ1bmN0aW9uKCl7ZnVuY3Rpb24gbihuKXtuPW58fDU7Zm9yKHZhciBlPVwiXCIsbz1cIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5XCIsdD1vLmxlbmd0aCxyPTA7bj5yO3IrKyllKz1vLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqdCkpO3JldHVybiBlfWZ1bmN0aW9uIGUobil7dmFyIGU9XCJbb2JqZWN0IEZ1bmN0aW9uXVwiLG89T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztyZXR1cm4gby5jYWxsKG4pPT1lfWZ1bmN0aW9uIG8obixlKXt2YXIgbz1hLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXSx0PWEuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtyZXR1cm4gdC5zcmM9bix0LmFzeW5jPSEwLHQuZGVmZXI9ITAsby5hcHBlbmRDaGlsZCh0KSx0fWZ1bmN0aW9uIHQoZSl7cmV0dXJuIGUrXCJfX1wiK24oKX1mdW5jdGlvbiByKG4sZSxvLHQpe3ZhciByPS0xPT09bi5pbmRleE9mKFwiP1wiKT9cIj9cIjpcIiZcIjtmb3IodmFyIHUgaW4gZSllLmhhc093blByb3BlcnR5KHUpJiYocis9ZW5jb2RlVVJJQ29tcG9uZW50KHUpK1wiPVwiK2VuY29kZVVSSUNvbXBvbmVudChlW3VdKStcIiZcIik7cmV0dXJuIG4rcitvK1wiPVwiK3R9ZnVuY3Rpb24gdShuKXtjbGVhclRpbWVvdXQobiksbj1udWxsfWZ1bmN0aW9uIGkobixpLGEsZil7ZShpKSYmKGY9aSxpPXt9LGE9e30pLGUoYSkmJihmPWEsYT17fSk7dmFyIGw9YS50aW1lb3V0fHwxNWUzLGQ9YS5wcmVmaXh8fFwiX19qc29ucFwiLHA9YS5wYXJhbXx8XCJjYWxsYmFja1wiLG09YS5uYW1lfHx0KGQpLHM9cihuLGkscCxtKSxoPXNldFRpbWVvdXQoZnVuY3Rpb24oKXtmKG5ldyBFcnJvcihcImpzb25wIHJlcXVlc3QgZm9yIFwiK20rXCIgdGltZWQgb3V0LlwiKSxudWxsKSx1KGgpfSxsKTtjW21dPWZ1bmN0aW9uKG4pe2YobnVsbCxuKSx1KGgpLGNbbV09bnVsbH07dmFyIGo9byhzKTtqLm9uZXJyb3I9ZnVuY3Rpb24oKXtmKG5ldyBFcnJvcihcImpzb25wIGVuY291bnRlcmVkIGFuIGVycm9yIHdoaWxlIGxvYWRpbmcgaW5qZWN0ZWQgc2NyaXB0LlwiKSxudWxsKSx1KGgpfX12YXIgYz13aW5kb3csYT1kb2N1bWVudDtyZXR1cm4gaX0pOyIsImltcG9ydCB7IGJ1cywgcmVuZGVyIH0gZnJvbSAnLi4vLi4vc3JjL2luZGV4LmpzJ1xuaW1wb3J0IEtlZmlyIGZyb20gJ2tlZmlyJ1xuaW1wb3J0IGpzb25wIGZyb20gJ2ItanNvbnAnXG5cbi8vIFN0cmVhbXNcbmxldCBhY3Rpb25zJCA9IGJ1cygpXG5sZXQgcXVlcnkkID0gYnVzKClcblxuLy8gTW9kZWxcbmxldCBpbml0TW9kZWwgPSBbXVxuXG4vLyBVcGRhdGVcbmZ1bmN0aW9uIHVwZGF0ZShtb2RlbCwgW2FjdGlvbiwgdmFsdWVdKSB7XG4gIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgY2FzZSAncmVzdWx0cyc6XG4gICAgICByZXR1cm4gdmFsdWVcbiAgfVxufVxuXG4vLyBWaWV3XG5mdW5jdGlvbiB2aWV3KG1vZGVsKSB7XG4gIGxldCB2ID1cbiAgICBbJ2RpdicsIHt9LFxuICAgICAgWyBbJ2lucHV0Jywge3Byb3BzOiB7cGxhY2Vob2xkZXI6IFwiU2VhcmNoIFdpa2lwZWRpYVwifSwgb246IHtpbnB1dDogcXVlcnkkLmVtaXR9fV0sXG4gICAgICAgIFsndWwnLCB7fSxcbiAgICAgICAgICBtb2RlbC5tYXAocmVzdWx0ID0+IFsnbGknLCB7fSwgcmVzdWx0XSldXV1cblxuICByZXR1cm4gdlxufVxuXG4vLyBIdHRwXG5mdW5jdGlvbiBodHRwKHVybCkge1xuICByZXR1cm4gS2VmaXIuZnJvbU5vZGVDYWxsYmFjayhjYWxsYmFjayA9PiBqc29ucCh1cmwsIGNhbGxiYWNrKSlcbn1cblxuZnVuY3Rpb24gZXZlbnRUb1VybChldmVudCl7XG4gIGxldCBxdWVyeSA9IGV2ZW50LnRhcmdldC52YWx1ZS50cmltKClcbiAgcmV0dXJuIGBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvdy9hcGkucGhwP2FjdGlvbj1vcGVuc2VhcmNoJmZvcm1hdD1qc29uJnNlYXJjaD0ke3F1ZXJ5fWBcbn1cblxubGV0IGVmZmVjdHMkID0gcXVlcnkkXG4gIC5kZWJvdW5jZSgxNTApXG4gIC5tYXAoZXZlbnRUb1VybClcbiAgLmZsYXRNYXBMYXRlc3QoaHR0cClcbiAgLm1hcCgoWyx4XSkgPT4gWydyZXN1bHRzJywgeF0pXG5cbi8vIFJlZHVjZVxubGV0IG1vZGVsJCA9IGFjdGlvbnMkLm1lcmdlKGVmZmVjdHMkKS5zY2FuKHVwZGF0ZSwgaW5pdE1vZGVsKVxuXG4vLyBSZW5kZXJcbmxldCB2aWV3JCA9IG1vZGVsJC5tYXAodmlldylcbnJlbmRlcih2aWV3JCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRhaW5lcicpKVxuIl0sIm5hbWVzIjpbInJlcXVpcmUkJDIiLCJyZXF1aXJlJCQxIiwicmVxdWlyZSQkMCIsInZub2RlIiwiVk5vZGUiLCJpcyIsInRoaXMiLCJjb21tb25qc0dsb2JhbCIsImdsb2JhbCIsImNyZWF0ZUNvbW1vbmpzTW9kdWxlIiwic25hYkNsYXNzIiwic25hYlByb3BzIiwic25hYlN0eWxlIiwic25hYkV2ZW50IiwianNvbnAiXSwibWFwcGluZ3MiOiJBQUFBLFNBQWMsR0FBRyxTQUFTLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUU7RUFDeEQsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLFNBQVMsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztFQUNwRCxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRO1VBQ3hDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Q0FDekMsQ0FBQzs7QUNKRixRQUFjLEdBQUc7RUFDZixLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU87RUFDcEIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxPQUFPLENBQUMsS0FBSyxRQUFRLElBQUksT0FBTyxD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SUcsSUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRTtTQUM3QixJQUFJQSxJQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFO0dBQ3hDLE1BQU0sSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFO0lBQzFCLElBQUlBLElBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUU7U0FDN0IsSUFBSUEsSUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRTtTQUNsQyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRTtHQUNuQjtFQUNELElBQUlBLElBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO01BQ3BDLElBQUlBLElBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHRCxPQUFLLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEc7R0FDRjtFQUNELElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7SUFDdEQsS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7R0FDNUI7RUFDRCxPQUFPQSxPQUFLLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFF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QUksQ0FBQyxPQUFPLEVBQUUsRUFBRTtPQUNyQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7TUFDZDs7S0FFRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztLQUNsQyxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQztLQUMxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUU7T0FDL0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQzVDO0lBQ0Y7R0FDRCxlQUFlLEVBQUUsWUFBWTtLQUMzQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7T0FDN0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQzdDO0lBQ0Y7R0FDRCxLQUFLLEVBQUUsWUFBWTtLQUNqQixJQUFJLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzdDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtPQUM3QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztNQUN0QztLQUNELElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFB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SUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLDJEQUEyRCxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7OztBQ0k5c0M7QUFDQSxJQUFJLFFBQVEsR0FBRyxHQUFHLEVBQUUsQ0FBQTtBQUNwQixJQUFJLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQTs7O0FBR2xCLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQTs7O0FBR2xCLFNBQVMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRTtFQUN0QyxRQUFRLE1BQU07SUFDWixLQUFLLFNBQVM7TUFDWixPQUFPLEtBQUs7R0FDZjtDQUNGOzs7QUFHRCxTQUFTLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDbkIsSUFBSSxDQUFDO0lBQ0gsQ0FBQyxLQUFLLEVBQUUsRUFBRTtNQUNSLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDL0UsQ0FBQyxJQUFJLEVBQUUsRUFBRTtVQUNQLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBOztFQUVsRCxPQUFPLENBQUM7Q0FDVDs7O0FBR0QsU0FBUyxJQUFJLENBQUMsR0FBRyxFQUFFO0VBQ2pCLE9BQU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsSUFBSVEsVUFBSyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztDQUNoRTs7QUFFRCxTQUFTLFVBQVUsQ0FBQyxLQUFLLENBQUM7RUFDeEIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7RUFDckMsT0FBTyxDQUFDLHdFQUF3RSxFQUFFLEtBQUssQ0FBQyxDQUFDO0NBQzFGOztBQUVELElBQUksUUFBUSxHQUFHLE1BQU07R0FDbEIsUUFBUSxDQUFDLEdBQUcsQ0FBQztHQUNiLEdBQUcsQ0FBQyxVQUFVLENBQUM7R0FDZixhQUFhLENBQUMsSUFBSSxDQUFDO0dBQ25CLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTs7O0FBR2hDLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTs7O0FBRzdELElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDNUIsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUEifQ==
