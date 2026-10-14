import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignValues, renderKo, renderKoBoth, splitKeywords, withKeywords } from '../l10n.mjs';

const strip = s => s.replace(/<[^>]+>/g, '');

test('강화 전/후 수치를 읽어 한국어 틀에 채운다', () => {
  const v = alignValues('Deal {Damage:diff()} damage.\nApply {VulnerablePower:diff()} [gold]Vulnerable[/gold].', 'Deal [8|10] damage.<br>Apply [2|3] $Vulnerable.');
  assert.deepEqual(v.Damage, { base: { n: '8' }, up: { n: '10' } });
  const ko = '피해를 {Damage:diff()} 줍니다.\n[gold]취약[/gold]을 {VulnerablePower:diff()} 부여합니다.';
  assert.equal(strip(renderKo(ko, v)), '피해를 8 줍니다. 취약을 2 부여합니다.');
  assert.equal(strip(renderKo(ko, v, { upgraded: true })), '피해를 10 줍니다. 취약을 3 부여합니다.');
  assert.match(renderKoBoth(ko, v).textUp, /<span class="up">10<\/span>/);
});

test('강화 시 바뀌는 문구(IfUpgraded)와 단·복수', () => {
  const en = 'Gain {Block:diff()} [gold]Block[/gold].\n[gold]Upgrade[/gold] {IfUpgraded:show:ALL cards|a card} in your [gold]Hand[/gold].';
  const v = alignValues(en, 'Gain 5 $Block.<br>Upgrade [a card|ALL cards] in your Hand.');
  const ko = '[gold]방어도[/gold]를 {Block:diff()} 얻습니다.\n[gold]손[/gold]에 있는 {IfUpgraded:show:모든 카드를|카드를 1장} [gold]강화[/gold]합니다.';
  assert.equal(strip(renderKo(ko, v)), '방어도를 5 얻습니다. 손에 있는 카드를 1장 강화합니다.');
  assert.equal(strip(renderKo(ko, v, { upgraded: true })), '방어도를 5 얻습니다. 손에 있는 모든 카드를 강화합니다.');
});

test('에너지 아이콘 개수', () => {
  const v = alignValues('Gain {Energy:energyIcons()}.', 'Gain [@IE@IE@IE|4 @IE].');
  assert.equal(v.Energy.base.n, 3);
  assert.equal(v.Energy.up.n, '4');
  assert.equal(strip(renderKo('{Energy:energyIcons()}를 얻습니다.', v, { upgraded: true })), '⚡⚡⚡⚡를 얻습니다.');
});

test('위키 틀과 키워드 줄을 걸러 낸다', () => {
  const { text, keywords } = splitKeywords('[|$Innate.<br>]Add a copy into your Hand.<br>$Exhaust.');
  assert.equal(text.replace(/\s+/g, ' ').trim(), 'Add a copy into your Hand.');
  assert.deepEqual(keywords.map(k => [k.kw, k.base, k.up]), [['Innate', false, true], ['Exhaust', true, true]]);
  const names = { Innate: '선천성', Exhaust: '소멸' };
  assert.equal(strip(withKeywords('효과', keywords, names, false, false)), '효과 소멸.');
  assert.equal(strip(withKeywords('효과', keywords, names, true, true)), '선천성. 효과 소멸.');
  assert.ok(alignValues('Gain [blue]{Block}[/blue] [gold]Block[/gold] at [gold]Rest Sites[/gold].', 'Gain 3 $Block at {{2|Rest Sites|Rest Site}}.'));
});

test('맞지 않으면 null', () => {
  assert.equal(alignValues('Deal {Damage:diff()} damage.', 'Gain 5 Block.'), null);
});
