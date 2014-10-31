function createBounds(element) {
  return {
    left: element.getBoundingClientRect().left,
    top: element.getBoundingClientRect().top,
    right: element.getBoundingClientRect().right,
    bottom: element.getBoundingClientRect().bottom,
    k: 30000,
    tick: nop,
    repaint: nop
  }
}