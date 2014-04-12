function call(method) {
  return function(object) {
    object[method].apply(object, Array.prototype.shift.call(arguments))
  }
}

nop = function(){}