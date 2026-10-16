import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatText, slug } from '../fetch-data.mjs';
import { parseLuaData } from '../lua.mjs';

test('slug', () => {
  assert.equal(slug('Strike (Ironclad)'), 'strike-ironclad');
  assert.equal(slug("Neow's Lament"), 'neows-lament');
  assert.equal(slug('Ceremonial Beast'), 'ceremonial-beast');
});

test('카드 문구', () => {
  assert.equal(formatText('Deal [8|10] damage.<br>Apply [2|3] $Vulnerable.'),
    'Deal 8<span class="up">(10)</span> damage.\nApply 2<span class="up">(3)</span> <b data-ref="kw|Vulnerable">Vulnerable</b>.');
  assert.equal(formatText('Gain @CE @CE.'), 'Gain <i class="ic energy">⚡</i> <i class="ic energy">⚡</i>.');
  assert.equal(formatText('Gain @ST.'), 'Gain <i class="ic star">★</i>.');
  assert.equal(formatText('<script>x</script> a < b'), 'x a &lt; b');
});

test('Lua 테이블', () => {
  const t = parseLuaData(`local all_data = {
    ["Bash"] = { Cost = 2, Text = "Deal [8|10] damage.\\nOk", Neg = -1, List = { "a", 'b' } },
    ["Café ☕"] = { Flag = true },
  }
  return all_data`);
  assert.deepEqual(t.Bash, { Cost: 2, Text: 'Deal [8|10] damage.\nOk', Neg: -1, List: ['a', 'b'] });
  assert.deepEqual(t['Café ☕'], { Flag: true });
});

test('위키 틀은 보이는 글자로 (숫자 인자를 쓰지 않는다)', () => {
  assert.equal(formatText('Whenever you play an {{QueryLink|Cards|type:Attack|Attack|2}}, gain 1 $Block.'), 'Whenever you play an Attack, gain 1 <b data-ref="kw|Block">Block</b>.');
  assert.equal(formatText("{{KW|Osty|Osty's|2}} attacks deal 4 additional damage."), "<b data-ref=\"kw|Osty\">Osty's</b> attacks deal 4 additional damage.");
  assert.equal(formatText('procure a {{2|potion|Potion}} and {{P|Potion-Shaped Rock||2}}'), 'procure a potion and <b data-ref="potion|Potion-Shaped Rock">Potion-Shaped Rock</b>');
  // 용어 참조: 카드 틀은 [전|후] 묶음 안에서도 남는다
  assert.equal(formatText('Add [{{C2|Shiv}}|2 {{C2|Shiv|Shivs}}].'), 'Add <b data-ref="card|Shiv">Shiv</b><span class="up">(2 <b data-ref="card|Shiv">Shivs</b>)</span>.');
});

test('같은 아이콘 넷 이상은 숫자와 아이콘 하나로', () => {
  assert.equal(formatText('Gain @ST@ST@ST@ST@ST.'), 'Gain 5<i class="ic star">★</i>.');
  assert.equal(formatText('Gain @CE@CE@CE.'), 'Gain <i class="ic energy">⚡</i><i class="ic energy">⚡</i><i class="ic energy">⚡</i>.');
});
