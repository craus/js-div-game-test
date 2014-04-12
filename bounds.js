function createBounds(element) {
  return {
    left: element.style.left,
    top: element.style.top,
    right: element.style.right,
    bottom: element.style.bottom,
    tick: nop,
    repaint: nop
  }
}