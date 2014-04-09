Array.prototype.map = function(mappingFunction) {
  return $.map(this, mappingFunction)
}

Math.sign = function(x) {
  if (x > 0) {
    return 1
  } else if (x < 0) {
    return -1
  } else {
    return 0
  }
}