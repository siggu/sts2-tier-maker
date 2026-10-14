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
    'Deal 8<span class="up">(10)</span> damage.\nApply 2<span class="up">(3)</span> <b>Vulnerable</b>.');
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
