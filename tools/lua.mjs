// 위키의 Lua 데이터 모듈에서 `local x = { ... }` 또는 `return { ... }` 의 첫 테이블을 JS 값으로 바꾼다.
import luaparse from 'luaparse';

function value(node) {
  switch (node.type) {
    case 'StringLiteral': return unquote(node.raw);
    case 'NumericLiteral': return node.value;
    case 'BooleanLiteral': return node.value;
    case 'NilLiteral': return null;
    case 'UnaryExpression': return node.operator === '-' ? -value(node.argument) : undefined;
    case 'TableConstructorExpression': return table(node);
    default: return undefined; // 함수 호출 등은 버린다
  }
}

// encodingMode 'none' 에서는 문자열 값을 주지 않으므로 raw 에서 직접 푼다.
function unquote(raw) {
  const long = raw.match(/^\[(=*)\[([\s\S]*)\]\1\]$/);
  if (long) return long[2].replace(/^\n/, '');
  return raw.slice(1, -1).replace(/\\(?:(\d{1,3})|(.))/gs, (_, num, ch) => {
    if (num) return String.fromCharCode(Number(num));
    return { n: '\n', t: '\t', r: '\r', '\n': '\n' }[ch] ?? ch;
  });
}

function table(node) {
  const arr = [];
  const obj = {};
  let isArray = true;
  for (const f of node.fields) {
    if (f.type === 'TableValue') arr.push(value(f.value));
    else {
      isArray = false;
      const key = f.type === 'TableKeyString' ? f.key.name : value(f.key);
      obj[key] = value(f.value);
    }
  }
  if (isArray) return arr;
  arr.forEach((v, i) => { obj[i + 1] = v; });
  return obj;
}

export function parseLuaData(source) {
  const ast = luaparse.parse(source, { comments: false, encodingMode: 'none' });
  for (const st of ast.body) {
    if (st.type === 'LocalStatement' && st.init[0]?.type === 'TableConstructorExpression') return value(st.init[0]);
    if (st.type === 'ReturnStatement' && st.arguments[0]?.type === 'TableConstructorExpression') return value(st.arguments[0]);
  }
  throw new Error('no table found');
}
