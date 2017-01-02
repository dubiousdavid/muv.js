import test from 'ava'
import { convertToHyperScript } from './muv'
import toHtml from 'snabbdom-to-html'

let emptyNode = {sel:undefined,data:{},children:undefined,text:undefined,elm:undefined,key:undefined}

test('convertToHyperScript: text', t => {
  t.is(convertToHyperScript('Hello'), 'Hello')
})

test('convertToHyperScript: sel', t => {
  let hs = convertToHyperScript(['a'])
  t.deepEqual(hs, {...emptyNode, sel: 'a'})
  t.is(toHtml(hs), '<a></a>')
})

test('convertToHyperScript: sel, data, text', t => {
  let hs = convertToHyperScript(['a', {props: {href: 'http://todomvc.com'}}, 'TodoMVC'])
  t.deepEqual(hs, {...emptyNode, sel: 'a', data: {props: {href: 'http://todomvc.com'}}, text: 'TodoMVC'})
  t.is(toHtml(hs), '<a href="http://todomvc.com">TodoMVC</a>')
})

test('convertToHyperScript: sel, children', t => {
  let hs = convertToHyperScript(['p', {}, [ ['div', {}, [ 42 ]], 'Hello' ]])
  t.deepEqual(
    hs,
    {...emptyNode, sel: 'p', children: [
      {...emptyNode, sel: 'div', children: [
        {...emptyNode, text: 42, data: undefined}]},
      {...emptyNode, text: 'Hello', data: undefined}]}
  )
  t.is(toHtml(hs), '<p><div>42</div>Hello</p>')
})
