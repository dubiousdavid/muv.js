/*
let actionToReducer = {
  action1: someFun,
  action2: someFun,
  action3: someOtherFun,
  action4: someOtherFun
}
*/

export function routeActions(mapping) {
  return function (model, [action, value]) {
    let reducer = mapping[action]

    if (reducer) {
      return reducer(model, [action, value])
    } else {
      return model
    }
  }
}
