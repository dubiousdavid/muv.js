import test from 'ava';
import { convertToHyperScript } from './muv'

let emptyNode = {sel:undefined,data:{},children:undefined,text:undefined,elm:undefined,key:undefined}

test('convertToHyperScript: text', t => {
  t.is(convertToHyperScript('Hello'), 'Hello')
})

test('convertToHyperScript: sel', t => {
  t.deepEqual(convertToHyperScript(['a']), {...emptyNode, sel: 'a'})
})

test('convertToHyperScript: sel, data, text', t => {
  t.deepEqual(
    convertToHyperScript(['a', {props: {href: 'http://todomvc.com'}}, 'TodoMVC']),
    {...emptyNode, sel: 'a', data: {props: {href: 'http://todomvc.com'}}, text: 'TodoMVC'}
  )
})

test('convertToHyperScript: sel, children', t => {
  t.deepEqual(
    convertToHyperScript(['p', {}, [ ['div', {}, [ 42 ]], 'Hello' ]]),
    {...emptyNode, sel: 'p', children: [
      {...emptyNode, sel: 'div', children: [
        {...emptyNode, text: 42, data: undefined}]},
      {...emptyNode, text: 'Hello', data: undefined}]}
  )
})
