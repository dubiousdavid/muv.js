import { render } from '../../src/index.js'
import Rx from 'rxjs/Rx'

// Streams
let actions$ = new Rx.Subject()

// Model
function getFromStorage() {
  let json = localStorage.getItem('todos-muvjs')
  if (json) {
    return JSON.parse(json)
  }
}

function getFilterFromHash() {
  let hash = location.hash
  let filter

  if (hash) {
    filter = hash.slice(2)
  }
  return !filter ? 'all' : filter
}

let initModel = getFromStorage() ||
  {items: [], allCompleted: false, filter: getFilterFromHash(), text: '', uid: 0}

// Update
function update(model, [action, value]) {
  let {items, allCompleted, filter, text, uid} = model
  let newItems

  switch (action) {
    case 'changeText':
      return {...model, text: value}
    case 'addItem':
      return {...model, text: '', allCompleted: false, items: [...items, newItem(value, uid)], uid: uid + 1}
    case 'toggleItem':
      newItems = items.map(item => {
        return item.id == value ? {...item, completed: !item.completed} : item
      })
      return {...model, items: newItems, allCompleted: allItemsCompleted(newItems)}
    case 'editItem':
      newItems = items.map(item => {
        return item.id == value ? {...item, editing: true} : item
      })
      return {...model, items: newItems}
    case 'cancelEdit':
      newItems = items.map(item => {
        return item.editing ? {...item, editing: false} : item
      })
      return {...model, items: newItems}
    case 'updateItem':
      if (value == '') {
        let index = items.findIndex(item => item.editing)
        newItems = index == -1 ? items : removeItem(items, items[index].id)
      } else {
        newItems = items.map(item => {
          return item.editing ? {...item, editing: false, text: value} : item
        })
      }
      return items != newItems ? {...model, items: newItems} : model
    case 'removeItem':
      newItems = removeItem(items, value)
      return {...model, items: newItems, allCompleted: allItemsCompleted(newItems)}
    case 'toggleAll':
      let newAllCompleted = !allCompleted

      newItems = items.map(item => {
        return {...item, completed: newAllCompleted}
      })
      return {...model, items: newItems, allCompleted: newAllCompleted}
    case 'changeFilter':
      return {...model, filter: value}
    case 'clearCompleted':
      newItems = items.filter(item => !item.completed)
      return {...model, items: newItems}
  }
}

function removeItem(items, id) {
  return items.filter(item => item.id != id)
}

function allItemsCompleted(items) {
  return items.every(item => item.completed)
}

function newItem(text, id) {
  return {id, text, completed: false, editing: false}
}

// View
function view(model) {
  let {text} = model
  let numItems = model.items.length

  let v =
    ['div', {},
      [ ['section.todoapp', {},
        [ ['header.header', {},
          [ ['h1', {}, 'todos'],
            ['input.new-todo',
              { props: {placeholder: 'What needs to be done?', autofocus: true, value: text},
                on: {input: handleInput, keydown: onEnter}}]]],
          numItems > 0 ? main(model) : '',
          numItems > 0 ? footer(model) : '']],
      info()]]
  return v
}

function handleInput(e) {
  let value = e.target.value.trim()
  actions$.next(['changeText', value])
}

function onEnter(e) {
  if (e.code == 'Enter') {
    let text = e.target.value.trim()
    if (text !== '') actions$.next(['addItem', text])
  }
}

function main({items, filter, allCompleted}) {
  function isVisible(item) {
    switch (filter) {
      case 'all':
        return true
      case 'completed':
        return item.completed
      case 'active':
        return !item.completed
    }
  }

  let v =
    ['section.main', {},
      [ ['input.toggle-all', {props: {type: 'checkbox', checked: allCompleted}, on: {click: toggleAll}}],
        ['label', {props: {htmlFor: 'toggle-all'}}, 'Mark all as complete'],
        ['ul.todo-list', {}, items.filter(isVisible).map(viewItem)]]]
  return v
}

function toggleAll() {
  actions$.next(['toggleAll'])
}

function viewItem(item) {
  let {id, completed, editing, text} = item
  let v =
    ['li', {class: {completed, editing}},
      [ ['div.view', {},
          [ ['input.toggle', {props: {type: 'checkbox', checked: completed},
                              on: {click: [checkboxClick, id]}}],
            ['label', {on: {dblclick: [itemClick, id]}}, text],
            ['button.destroy', {on: {click: [destroyClick, id]}}]]],
        ['input.edit', {props: {value: editing ? text : ''},
                        on: {keydown: onEditDone, blur: onBlur},
                        hook: {postpatch: focusElement}}]]]
  return v
}

function focusElement(oldVnode, vnode) {
  vnode.elm.focus()
}

function onEditDone(e) {
  switch (e.code){
    case 'Enter':
      let text = e.target.value.trim()
      actions$.next(['updateItem', text])
      break
    case 'Escape':
      actions$.next(['cancelEdit'])
      break
  }
}

function onBlur(e) {
  let text = e.target.value.trim()
  actions$.next(['updateItem', text])
}

function itemClick(id) {
  actions$.next(['editItem', id])
}

function checkboxClick(id) {
  actions$.next(['toggleItem', id])
}

function destroyClick(id) {
  actions$.next(['removeItem', id])
}

function numUncompleted(items) {
  return items.filter(item => !item.completed).length
}

function numCompleted(items) {
  return items.filter(item => item.completed).length
}

function footer({items, filter}) {
  let numLeft = numUncompleted(items)
  let numDone = numCompleted(items)

  let v =
    ['footer.footer', {},
      [ ['span.todo-count', {},
          [['strong', {}, `${numLeft} item${numLeft == 1 ? '' : 's'} left`]]],
        ['ul.filters', {},
          [ viewFilter('#/', 'all', filter),
            viewFilter('#/active', 'active', filter),
            viewFilter('#/completed', 'completed', filter)]],
        numDone >= 1 ?
          ['button.clear-completed', {on: {click: clearCompleted}}, `Clear Completed (${numDone})`] :
          '']]
  return v
}

function clearCompleted(e) {
  actions$.next(['clearCompleted'])
}

function viewFilter(href, filter, currentFilter) {
  let v =
    ['li', {},
      [ ['a', {props: {href: href}, class: {selected: filter == currentFilter}}, filter]]]
  return v
}

function info() {
  let v =
    ['footer.info', {},
      [ ['p', {}, 'Double-click to edit a todo'],
        ['p', {},
          ['Created by ', ['a', {props: {href: 'https://github.com/dubiousdavid'}}, 'David Sargeant']]],
        ['p', {},
          ['Part of ', ['a', {props: {href: 'http://todomvc.com'}}, 'TodoMVC']]]]]
  return v
}

// Reduce
let model$ = actions$
  .do(x => console.log('Actions', x))
  .scan(update, initModel)
  .do(x => console.log('Model', x))
  .publishBehavior(initModel)
  .refCount()

// Save to local storage
function disableEditing(model) {
  let newItems = model.items.map(item => {
    return {...item, editing: false}
  })
  return {...model, items: newItems}
}

model$
  .map(disableEditing)
  .subscribe(model => localStorage.setItem('todos-muvjs', JSON.stringify(model)))

// Handle hash change
function changeFilter() {
  actions$.next(['changeFilter', getFilterFromHash()])
}

window.onhashchange = changeFilter

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
