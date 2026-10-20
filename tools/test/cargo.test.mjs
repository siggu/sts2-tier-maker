import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargoText, cardsFromCargo } from '../cargo.mjs';

const kw = (name, inner = name) => `<span class="keyword-trigger inline-trigger" data-name="${name}" data-sequel="2">[[Slay the Spire 2:${name}|<span title=''>${inner}</span>]]</span>`;
const icon = code => `<span class='keyword-trigger' data-name='@${code}' data-sequel='2'>[[File:StS2_Energy.png|20px|middle|link=]]</span>`;

test('Cargo 설명 → 예전 데이터 모듈 문법', () => {
  assert.equal(cargoText('Deal (8;10) damage.<br>Apply (2;3) <span class="power-trigger inline-trigger" data-name="Vulnerable" data-sequel="2">[[File:StS2 Icon Vulnerable.png|22px|link=Slay_the_Spire_2:Vulnerable]] [[Slay_the_Spire_2:Vulnerable|Vulnerable]]</span>.'),
    'Deal [8|10] damage.<br>Apply [2|3] $Vulnerable.');
  assert.equal(cargoText(`(;${kw('Retain')}.<br>)Gain 9 ${icon('ST')}.<br>${kw('Exhaust')}.`), '[|$Retain.<br>]Gain 9 @ST.<br>$Exhaust.');
  assert.equal(cargoText(`Gain ${icon('CE')}${icon('CE')}(;${icon('CE')}).`), 'Gain [@CE@CE|@CE@CE@CE].');
  assert.equal(cargoText('Add (1 <span class="card-trigger inline-trigger" data-name="Shiv">[[File:x.png|24px]] [[Slay_the_Spire_2:Shiv|Shiv]]</span>;2 <span class="card-trigger inline-trigger" data-name="Shiv">[[File:x.png|24px]] [[Slay_the_Spire_2:Shiv|Shivs]]</span>) into your [[Slay the Spire 2:Hand|Hand]].'),
    'Add [1 {{C2|Shiv|Shiv}}|2 {{C2|Shiv|Shivs}}] into your Hand.');
  assert.equal(cargoText(`${kw('Evoke')} your rightmost Orb X(;+1) times.`), '$Evoke your rightmost Orb [X|X+1] times.');
  assert.equal(cargoText('Put every [https://slaythespire.wiki.gg/wiki/x?rarity=Rare Rare] card.'), 'Put every Rare card.');
});

test('Cargo 행 → 카드 (그림은 CardArt, public-beta 그림 포함)', () => {
  const cards = cardsFromCargo(
    [{ Name: 'Bash', Color: 'Ironclad', Type: 'Attack', Rarity: 'Basic', Cost: '2', CostPlus: '', StarCost: '', NoUpgrade: '0', MultiplayerOnly: '0', Image: 'StS2_Ironclad-Bash.png', Description: 'Deal (8;10) damage.' }],
    [{ Name: 'Bash', FullCard: 'StS2 Ironclad-Bash.png', FullCardPlus: 'StS2 Ironclad-BashPlus.png', FullCardBeta: 'StS2 Beta-Ironclad-Bash.png', FullCardBetaPlus: '' }]);
  assert.deepEqual(cards.Bash, {
    Cost: 2, CostPlus: undefined, StarCost: undefined, Color: 'Ironclad', Type: 'Attack', Rarity: 'Basic',
    Image: 'StS2 Ironclad-Bash.png', ImagePlus: 'StS2 Ironclad-BashPlus.png', ImageBeta: 'StS2 Beta-Ironclad-Bash.png', ImageBetaPlus: undefined,
    NoUpgrade: undefined, Multiplayer: undefined, Text: 'Deal [8|10] damage.',
  });
});
