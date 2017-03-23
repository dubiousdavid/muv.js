/*
let actionGroupToReducer = {
  actionGroup1: someFun,
  actionGroup2: someOtherFun
}

actions:

"actionGroup1:someAction"
"actionGroup1:someOtherAction"
*/

export function routeActions(mapping) {
  return function (model, [groupedAction, value]) {
    let [actionGroup, action] = groupedAction.split(':')
    let reducer = mapping[actionGroup]

    if (reducer) {
      return reducer(model, [action, value])
    } else {
      return model
    }
  }
}
