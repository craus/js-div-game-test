function normAng(ang)
{
  while (ang >= Math.PI) ang -= 2 * Math.PI;
  while (ang < -Math.PI) ang += 2 * Math.PI;
  return ang;
}

function sqr(x) {
  return x*x
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt(sqr(x1-x2)+sqr(y1-y2))
}