// Small safe math evaluator (no eval, no property access). Supports + - * / % ^ ** ( ), unary +/-,
// numbers, constants (pi, e) and a fixed set of functions.
const FUNCS = {
  sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, log: Math.log10, ln: Math.log,
  log10: Math.log10, log2: Math.log2, exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
  round: Math.round, trunc: Math.trunc, sign: Math.sign, pow: Math.pow, min: Math.min, max: Math.max,
};
const CONSTS = { pi: Math.PI, e: Math.E };
const MAX_LEN = 200;
const MAX_DEPTH = 30;

function tokenize(src) {
  const tokens = [];
  const re = /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(\*\*|[-+*\/%^(),]))/y;
  let i = 0;
  while (i < src.length) {
    if (/^\s*$/.test(src.slice(i))) break;
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) throw new Error('bad token');
    if (m[1] !== undefined) tokens.push({ t: 'num', v: parseFloat(m[1]) });
    else if (m[2] !== undefined) tokens.push({ t: 'id', v: m[2].toLowerCase() });
    else tokens.push({ t: 'op', v: m[3] === '**' ? '^' : m[3] });
    i = re.lastIndex;
  }
  return tokens;
}

function evaluate(src) {
  if (typeof src !== 'string' || src.length > MAX_LEN) throw new Error('too long');
  const tokens = tokenize(src);
  if (!tokens.length) throw new Error('empty');
  let pos = 0;
  let depth = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  const enter = () => { if (++depth > MAX_DEPTH) throw new Error('too deep'); };

  function expr() {
    let v = term();
    while (isOp('+') || isOp('-')) { const op = tokens[pos++].v; const r = term(); v = op === '+' ? v + r : v - r; }
    return v;
  }
  function term() {
    let v = unary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = tokens[pos++].v; const r = unary();
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  }
  function unary() {
    if (isOp('-')) { pos++; enter(); const v = -unary(); depth--; return v; }
    if (isOp('+')) { pos++; enter(); const v = unary(); depth--; return v; }
    return power();
  }
  function power() {
    const base = primary();
    if (isOp('^')) { pos++; enter(); const exp = unary(); depth--; return Math.pow(base, exp); }
    return base;
  }
  function primary() {
    const tk = tokens[pos++];
    if (!tk) throw new Error('unexpected end');
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'id') {
      if (isOp('(')) {
        if (!Object.prototype.hasOwnProperty.call(FUNCS, tk.v)) throw new Error('unknown function');
        pos++; enter();
        const args = [];
        if (!isOp(')')) { args.push(expr()); while (isOp(',')) { pos++; args.push(expr()); } }
        if (!isOp(')')) throw new Error('expected )');
        pos++; depth--;
        return FUNCS[tk.v](...args);
      }
      if (!Object.prototype.hasOwnProperty.call(CONSTS, tk.v)) throw new Error('unknown name');
      return CONSTS[tk.v];
    }
    if (tk.v === '(') {
      enter(); const v = expr(); depth--;
      if (!isOp(')')) throw new Error('expected )');
      pos++;
      return v;
    }
    throw new Error('unexpected token');
  }

  const result = expr();
  if (pos < tokens.length) throw new Error('trailing input');
  if (typeof result !== 'number' || Number.isNaN(result)) throw new Error('not a number');
  return result;
}

module.exports = { evaluate };
