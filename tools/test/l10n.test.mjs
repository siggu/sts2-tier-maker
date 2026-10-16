import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignValues, looseValues, normalizeWiki, renderKo, renderKoBoth, specialize, splitKeywords, withKeywords } from '../l10n.mjs';

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
  // 넷부터는 게임·위키처럼 숫자와 아이콘 하나
  assert.equal(strip(renderKo('{Energy:energyIcons()}를 얻습니다.', v, { upgraded: true })), '4⚡를 얻습니다.');
  assert.equal(strip(renderKo('{Energy:energyIcons()}를 얻습니다.', v)), '⚡⚡⚡를 얻습니다.');
});

test('{singleStarIcon} 은 별 아이콘이고 값으로 읽지 않는다', () => {
  const v = alignValues('Gain {Stars:diff()} {singleStarIcon}.', 'Gain 9 @ST.');
  assert.equal(Number(v.Stars.base.n), 9);
  assert.equal(strip(renderKo('{singleStarIcon}을 {Stars:diff()} 얻습니다.', v)), '★을 9 얻습니다.');
  const m = alignValues('The first time you spend {singleStarIcon} each turn, gain [blue]{StrengthPower}[/blue] [gold]Strength[/gold].', 'The first time you spend @ST each turn, gain 1 $Strength.');
  assert.equal(strip(renderKo('매 턴마다 처음으로 {singleStarIcon}을 소모 시, [gold]힘[/gold]을 [blue]{StrengthPower}[/blue] 얻습니다.', m)), '매 턴마다 처음으로 ★을 소모 시, 힘을 1 얻습니다.');
});

test('choose(1)·cond·plural 은 값에 따라 문구를 고르고, 안의 {} 는 그 값', () => {
  const v = alignValues('At the start of the next {Combats:plural:combat|[blue]{}[/blue] combats}, gain [blue]{StrengthPower}[/blue] [gold]Strength[/gold].', 'At the start of the next 5 combats, gain 2 $Strength.');
  assert.equal(strip(renderKo('{Combats:choose(1):다음|다음 [blue]{}[/blue]번의} 전투 시작 시, [gold]힘[/gold]을 [blue]{StrengthPower}[/blue] 얻습니다.', v)), '다음 5번의 전투 시작 시, 힘을 2 얻습니다.');
  assert.equal(strip(renderKo('next {Combats:plural:combat|{} combats}', v)), 'next 5 combats');
  const one = { Combats: { base: { n: '1' }, up: { n: '1' } } };
  assert.equal(strip(renderKo('{Combats:choose(1):다음|다음 {}번의} 전투', one)), '다음 전투');
  const p = alignValues('your next {Attacks:cond:>1?{Attacks:diff()} Attacks are|Attack is} played', 'your next [Attack is|2 Attacks are] played');
  const ko = '다음에 사용하는 {Attacks:cond:>1?공격 카드 {Attacks:diff()}장이|공격 카드가} 사용됩니다';
  assert.equal(strip(renderKo(ko, p)), '다음에 사용하는 공격 카드가 사용됩니다');
  assert.equal(strip(renderKo(ko, p, { upgraded: true })), '다음에 사용하는 공격 카드 2장이 사용됩니다');
});

test('문장이 조금 다르면 수치를 차례대로 짝짓는다 (틀의 고정 숫자는 뺀다)', () => {
  const v = looseValues('Upon pickup, choose [blue]1[/blue] of [blue]{Cards}[/blue] Rare cards to add to your [gold]Deck[/gold], and add [blue]1[/blue] [red]Injury[/red] to your [gold]Deck[/gold].', 'Choose 1 of 3 Rare cards to add to your Deck. Add 1 {{C2|Injury}} to your Deck.');
  assert.equal(v.Cards.base.n, '3');
  assert.equal(looseValues('Deal {Damage:diff()} damage. Draw {Cards:diff()} cards.', 'Deal 5 damage.'), null);
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

test('단·복수 문구 안의 값을 읽고, 단수 문구면 1 로 본다', () => {
  const en = 'At the start of the next {Combats:plural:combat|[blue]{}[/blue] combats}, gain [blue]{StrengthPower}[/blue] [gold]Strength[/gold].';
  const ja = '次の[blue]{Combats}[/blue]回の戦闘開始時、[gold]筋力[/gold][blue]{StrengthPower}[/blue]を得る。';
  assert.equal(strip(renderKo(ja, alignValues(en, 'At the start of the next 5 combats, gain 2 $Strength.'))), '次の5回の戦闘開始時、筋力2を得る。');
  assert.equal(alignValues(en, 'At the start of the next combat, gain 2 Strength.').Combats.base.n, '1');
  // 위키 [전|후] 묶음 안의 단·복수 문구
  const buffer = alignValues('Prevent the next {BufferPower:plural:time|{BufferPower:diff()} times} you would lose HP.', 'Prevent the next [time|2 times] you would lose HP.');
  assert.deepEqual(buffer.BufferPower, { base: { n: '1' }, up: { n: '2' } });
  // cond 서식, 이름 없는 {:diff()}
  const punch = alignValues('This turn, your next {Attacks:cond:>1?{Attacks:diff()} Attacks are|Attack is} played an extra time.', 'This turn, your next [Attack is|2 Attacks are] played an extra time.');
  assert.deepEqual(punch.Attacks, { base: { n: '1' }, up: { n: '2' } });
  const rod = alignValues('At the start of the next {LightningRodPower:plural:turn|{:diff()} turns}, [gold]Channel[/gold] 1 [gold]Lightning[/gold].', 'At the start of the next 2 turns, Channel 1 Lightning.');
  assert.equal(rod.LightningRodPower.base.n, '2');
  // 수 뒤에 낱말이 붙은 묶음은 수만
  const draw = alignValues('Draw {Cards:diff()} {Cards:plural:card|cards}.', 'Draw [1 card|2 cards].');
  assert.deepEqual(draw.Cards, { base: { n: '1' }, up: { n: '2' } });
});

test('강화 문구 안의 값 ({IfUpgraded:show:{Cards} copies|a copy})', () => {
  const v = alignValues('Add {IfUpgraded:show:{Cards} copies|a copy} of that card into your [gold]Hand[/gold].', 'Add [a copy|2 copies] of that card into your Hand.');
  const ko = '그 카드의 복사본을 {IfUpgraded:show:{Cards}장|1장} [gold]손[/gold]으로 가져옵니다.';
  assert.equal(strip(renderKo(ko, v)), '그 카드의 복사본을 1장 손으로 가져옵니다.');
  assert.equal(strip(renderKo(ko, v, { upgraded: true })), '그 카드의 복사본을 2장 손으로 가져옵니다.');
  const stack = alignValues('Gain [gold]Block[/gold] equal to the number of cards in your [gold]Discard Pile[/gold]{IfUpgraded:show: +{CalculationBase}|}.', 'Gain $Block equal to the number of cards in your Discard Pile[| +3].');
  assert.equal(stack.CalculationBase.up.n, '3');
});

test('X 코스트, 0 에너지, 아이콘 강화 표기', () => {
  assert.equal(normalizeWiki('Play the top [X|X+1] cards.'), 'Play the top X[|+1] cards.');
  assert.ok(alignValues('Play the top X{IfUpgraded:show:+1} cards of your [gold]Draw Pile[/gold].', 'Play the top [X|X+1] cards of your Draw Pile.'));
  assert.ok(alignValues('[gold]Channel[/gold] {IfUpgraded:show:X+1|X} [gold]Lightning[/gold].', 'Channel [X|X+1] Lightning.'));
  // "0 @CE" 는 지우지 않는다
  assert.equal(normalizeWiki('costs 0 @CE. Gain 2 @CE.'), 'costs 0 @CE. Gain @CE@CE.');
  const pounce = alignValues('Deal {Damage:diff()} damage.\nThe next Skill you play costs 0 {energyPrefix:energyIcons(1)}.', 'Deal [14|20] damage.<br>The next Skill you play costs 0 @CE.');
  assert.equal(strip(renderKo('다음 스킬의 비용이 0 {energyPrefix:energyIcons(1)}이 됩니다.', pounce)), '다음 스킬의 비용이 0 ⚡이 됩니다.');
  // 고정 숫자 "1 {energyIcons(1)}" 를 위키가 아이콘만으로 적은 경우
  assert.ok(alignValues('Reduce this card\'s cost by 1 {energyPrefix:energyIcons(1)} until played.', 'Reduce this card\'s cost by 1 @DE until played.'));
  // 값 + 고정 아이콘이 "1 @CE" 하나로 합쳐진 경우
  const curious = alignValues('Powers cost {CuriousReduction:diff()} {energyPrefix:energyIcons(1)} less.', 'Powers cost 1 @CE less.');
  assert.equal(strip(renderKo('파워 카드의 비용이 {CuriousReduction:diff()} {energyPrefix:energyIcons(1)} 감소합니다.', curious)), '파워 카드의 비용이 1 ⚡ 감소합니다.');
  // "@CE@CE[|@CE]" → 강화 전 2개, 후 3개
  const prod = alignValues('Gain {Energy:energyIcons()}.', 'Gain @CE@CE[|@CE].');
  assert.deepEqual([prod.Energy.base.n, prod.Energy.up.n], [2, 3]);
});

test('위키가 빼먹는 끝 마침표·쉼표·"Upon pickup,"', () => {
  assert.ok(alignValues('Gain {Stars:starIcons()}.', 'Gain @ST@ST@ST'));
  assert.ok(alignValues('At the start of each combat, put a random Power into your [gold]Hand[/gold].', 'At the start of each combat put a random Power into your Hand.'));
  assert.ok(alignValues('Upon pickup, choose [blue]1[/blue] of [blue]2[/blue] packs of cards to add to your [gold]Deck[/gold].', 'Choose 1 of 2 packs of cards to add to your Deck.'));
  assert.ok(alignValues('[gold]Exhaust[/gold] your [gold]Hand[/gold].\nAdd 1 random {IfUpgraded:show:[gold]Upgraded[/gold] |}card into your [gold]Hand[/gold].', 'Exhaust your Hand.<br>Add 1 random [|$Upgraded] card into your Hand.'));
});

test('키워드: 마침표 없는 표기, 일본어·중국어 문장 부호', () => {
  const { text, keywords } = splitKeywords('[|$Innate<br>]Gain 8 $Block.<br>[Exhaust|]');
  assert.equal(text.replace(/<br>/g, ' ').trim(), 'Gain 8 $Block.');
  assert.deepEqual(keywords.map(k => [k.kw, k.base, k.up]), [['Innate', false, true], ['Exhaust', true, false]]);
  assert.equal(strip(withKeywords('ブロックを得る。', keywords, { Innate: '天賦', Exhaust: '廃棄' }, false, false, '。')), 'ブロックを得る。廃棄。');
  assert.equal(strip(withKeywords('', splitKeywords('$Unplayable.<br>$Ethereal.').keywords, { Unplayable: '无法打出', Ethereal: '虚无' }, false, false, '。')), '无法打出。虚无。');
  // 중국어·일본어 줄바꿈은 띄우지 않고 잇는다 (한국어는 띄운다)
  assert.equal(renderKo('获得{Block:diff()}点格挡。\n抽1张牌。', { Block: { base: { n: '5' }, up: { n: '5' } } }), '获得5点格挡。抽1张牌。');
  assert.equal(renderKo('방어도를 {Block:diff()} 얻습니다.\n카드를\n1장 뽑습니다.', { Block: { base: { n: '5' }, up: { n: '5' } } }), '방어도를 5 얻습니다. 카드를 1장 뽑습니다.');
});

test('선택지로 갈리는 틀을 고정한다 (괴짜 과학)', () => {
  const tmpl = '{CardType:choose(Attack|Skill|Power):Deal {Damage:diff()} damage{Violence: {ViolenceHits:diff()} times|}.|Gain {Block:diff()} [gold]Block[/gold].||???}{HasRider:{Sapping:\nApply {SappingWeak:diff()} [gold]Weak[/gold].|}{Wisdom:\nDraw {WisdomCards:diff()} cards.|}{Curious:Powers cost {CuriousReduction:diff()} less.|}|{CardType:choose(Attack|Skill|Power):\n???|\n???|???|???}}';
  const pick = (type, rider) => specialize(tmpl, { CardType: type, HasRider: true, Violence: rider === 'Violence', Sapping: rider === 'Sapping', Wisdom: rider === 'Wisdom', Curious: rider === 'Curious' });
  assert.equal(pick('Attack', 'Violence'), 'Deal {Damage:diff()} damage {ViolenceHits:diff()} times.');
  assert.equal(pick('Attack', 'Sapping'), 'Deal {Damage:diff()} damage.\nApply {SappingWeak:diff()} [gold]Weak[/gold].');
  assert.equal(pick('Skill', 'Wisdom'), 'Gain {Block:diff()} [gold]Block[/gold].\nDraw {WisdomCards:diff()} cards.');
  assert.equal(pick('Power', 'Curious'), 'Powers cost {CuriousReduction:diff()} less.');
  assert.equal(specialize('{HasRider:A|B}', { HasRider: false }), 'B');
});
