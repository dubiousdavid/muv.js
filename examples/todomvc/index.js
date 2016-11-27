import { bus, render } from '../../src/index.js'
import Kefir from 'kefir'

// Streams
let actions$ = bus()

// Model
let initModel = {items: [], allCompleted: false, filter: 'All', text: '', uid: 0}

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
      newItems = items.slice().map(item => {
        return item.id == value ? {...item, completed: !item.completed} : item
      })
      return {...model, items: newItems, allCompleted: allItemsCompleted(newItems)}
    case 'editItem':
      newItems = items.slice().map(item => {
        return item.id == value ? {...item, editing: true} : item
      })
      return {...model, items: newItems}
    case 'updateItem':
      if (value == '') {
        let index = items.findIndex(item => item.editing)
        newItems = removeItem(items, items[index].id)
      } else {
        newItems = items.slice().map(item => {
          return item.editing ? {...item, editing: false, text: value} : item
        })
      }
      return {...model, items: newItems}
    case 'removeItem':
      newItems = removeItem(items, value)
      return {...model, items: newItems, allCompleted: allItemsCompleted(newItems)}
    case 'toggleAll':
      let newAllCompleted = !allCompleted

      newItems = items.slice().map(item => {
        return {...item, completed: newAllCompleted}
      })
      return {...model, items: newItems, allCompleted: newAllCompleted}
  }
}

function removeItem(items, id) {
  return items.slice().filter(item => item.id != id)
}

function allItemsCompleted(items) {
  return items.findIndex(item => !item.completed) == -1
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
  actions$.emit(['changeText', value])
}

function onEnter(e) {
  if (e.code == 'Enter') {
    let text = e.target.value.trim()
    actions$.emit(['addItem', text])
  }
}

function main({items, allCompleted}) {
  let v =
    ['section.main', {},
      [ ['input.toggle-all', {props: {type: 'checkbox', checked: allCompleted}, on: {click: toggleAll}}],
        ['label', {props: {htmlFor: 'toggle-all'}}, 'Mark all as complete'],
        ['ul.todo-list', {}, items.map(viewItem)]]]
  return v
}

function toggleAll() {
  actions$.emit(['toggleAll'])
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
        ['input.edit', {props: {value: text}, on: {keydown: onEditDone, blur: onBlur}, hook: {postpatch: focusElement}}]]]
  return v
}

function focusElement(oldVnode, vnode) {
  return vnode.elm.focus()
}

function onEditDone(e) {
  if (e.code == 'Enter' || e.code == 'Escape') {
    let text = e.target.value.trim()
    actions$.emit(['updateItem', text])
  }
}

function onBlur(e) {
  let text = e.target.value.trim()
  actions$.emit(['updateItem', text])
}

function itemClick(id) {
  actions$.emit(['editItem', id])
}

function checkboxClick(id) {
  actions$.emit(['toggleItem', id])
}

function destroyClick(id) {
  actions$.emit(['removeItem', id])
}

function numUncompleted(items) {
  return items.filter(item => !item.completed).length
}

function footer({items, filter}) {
  let numLeft = numUncompleted(items)
  let v =
    ['footer.footer', {},
      [ ['span.todo-count', {},
          [['strong', {}, `${numLeft} item${numLeft == 1 ? '' : 's'} left`]]],
        ['ul.filters', {},
          [ ['li', {},
              [ ['a', {props: {href: '#/'}, class: {selected: filter == 'All'}}, 'All']]],
            ['li', {},
              [ ['a', {props: {href: '#/active'}, class: {selected: filter == 'Active'}}, 'Active']]],
            ['li', {},
              [ ['a', {props: {href: '#/completed'}, class: {selected: filter == 'Completed'}}, 'Completed']]]]]]]
  return v
}

function info() {
  let v =
    ['footer.info', {},
      [ ['p', {}, 'Double-click to edit a todo'],
        ['p', {},
          ['Created by ', ['a', {props: {href: 'http://todomvc.com'}}, 'David Sargeant']]],
        ['p', {},
          ['Part of ', ['a', {props: {href: 'http://todomvc.com'}}, 'TodoMVC']]]]]
  return v
}

// Reduce
let model$ = actions$.scan(update, initModel)
model$.log()

// Render
let view$ = model$.map(view)
render(view$, document.getElementById('container'))
