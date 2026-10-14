// 항목 상세 정보 창: 큰 이미지(카드는 강화 전/후 토글), 효과, 적 행동 패턴, 고대의 존재가 주는 유물.
// 텍스트 필드(text, textUp, moves[].text, flavor)는 수집 스크립트가 이스케이프한 뒤 만든 HTML 이다.

import { h } from './ui.js';
import { rarityKo, typeKo } from './data.js';

let current = null;

export function openDetail(item, category, db) {
  closeDetail();
  const restore = document.activeElement;
  let showUp = false;

  const panel = h('div', { class: 'detail', role: 'dialog', 'aria-modal': 'true', 'aria-label': `${item.name} 상세 정보` });
  const backdrop = h('div', { class: 'detail-backdrop', onclick: e => { if (e.target === backdrop) closeDetail(); } }, panel);

  function render() {
    const img = showUp && item.imgUp ? item.imgUp : item.img;
    const canUpgrade = Boolean(item.imgUp || item.textUp || item.costUp !== undefined);
    panel.replaceChildren(
      h('button', { class: 'detail-close', 'aria-label': '닫기', onclick: closeDetail }, '×'),
      h('div', { class: `detail-media kind-${category.tile}` },
        img ? h('img', {
          src: img, alt: item.name,
          class: canUpgrade ? 'flip' : null,
          title: canUpgrade ? '눌러서 강화 전/후 전환' : null,
          onclick: canUpgrade ? toggle : null,
          onerror: e => { if (showUp) { e.target.src = item.img; } },
        }) : h('div', { class: 'detail-noimg' }, item.name),
        // 한 버튼을 누를 때마다 강화 전 ↔ 강화 후가 번갈아 바뀐다.
        canUpgrade && h('button', {
          class: `upgrade-switch${showUp ? ' on' : ''}`, role: 'switch', 'aria-checked': String(showUp),
          onclick: toggle,
        },
          h('span', { class: 'switch-track', 'aria-hidden': 'true' }, h('span', { class: 'switch-knob' })),
          h('span', { class: 'switch-label' }, showUp ? '강화 후 ✦' : '강화 전'),
        ),
      ),
      h('div', { class: 'detail-body' },
        h('h2', { class: `detail-title${showUp ? ' is-up' : ''}` }, item.name, showUp ? '+' : ''),
        item.nameEn && item.nameEn !== item.name && h('div', { class: 'detail-sub' }, item.nameEn),
        meta(item, category),
        ...bodyFor(item, category, db, showUp),
        h('a', {
          class: 'detail-wiki',
          href: `https://slaythespire.wiki.gg/wiki/Special:Search?go=Go&search=${encodeURIComponent(`Slay the Spire 2:${item.name}`)}`,
          target: '_blank', rel: 'noopener',
        }, '위키에서 보기 ↗'),
      ),
    );
  }

  function toggle() {
    showUp = !showUp;
    render();
    panel.querySelector('.upgrade-switch')?.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') closeDetail();
  }

  render();
  document.body.append(backdrop);
  document.body.classList.add('modal-open');
  document.addEventListener('keydown', onKey);
  panel.querySelector('.detail-close').focus();
  current = () => {
    backdrop.remove();
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKey);
    restore?.focus?.({ preventScroll: true });
  };
}

export function closeDetail() {
  if (current) { const c = current; current = null; c(); }
}

function meta(item, category) {
  const chips = [
    item.groupName,
    item.area,
    item.rarity && rarityKo(item.rarity),
    item.type && typeKo(item.type),
    item.source && `${item.source}의 유물`,
  ].filter((c, i, all) => c && all.indexOf(c) === i);
  return chips.length ? h('div', { class: 'detail-chips' }, chips.map(c => h('span', {}, c))) : null;
}

const html = (cls, content) => h('div', { class: cls, html: content });

function costText(cost, stars) {
  const parts = [];
  if (cost !== undefined && cost !== null && cost !== '') parts.push(`에너지 ${cost === -1 ? 'X' : cost}`);
  if (stars !== undefined && stars !== null && stars !== '') parts.push(`별 ${stars}`);
  return parts.join(' · ');
}

function bodyFor(item, category, db, showUp = false) {
  // 적: HP 와 행동 패턴
  if (item.members) {
    return [
      ...item.members.map(m => h('section', { class: 'detail-sec' },
        item.members.length > 1 && h('h3', {}, m.name),
        (m.hp || m.hpAsc) && h('p', { class: 'detail-hp' },
          m.hp && `HP ${m.hp}`,
          m.hpAsc && h('span', { class: 'asc' }, ` (승천 ${m.hpAsc})`)),
        m.moves.length > 0 && h('ul', { class: 'moves' }, m.moves.map(mv => h('li', {},
          h('b', { class: 'move-name' }, mv.name),
          h('span', { html: mv.text }),
        ))),
      )),
      item.members.some(m => m.moves.some(mv => mv.text.includes('class="asc"'))) &&
        h('p', { class: 'detail-note' }, h('span', { class: 'asc' }, '주황색'), ' 수치는 승천 난이도에서 바뀌는 값입니다.'),
    ];
  }

  // 카드: 토글에 따라 강화 전/후 코스트와 효과 하나만 보여 준다. 강화 후에는 바뀐 값을 초록색으로.
  if (category.id === 'cards' || category.id === 'curses') {
    const costChanged = showUp && item.costUp !== undefined;
    const cost = costText(costChanged ? item.costUp : item.cost, item.stars);
    const text = showUp ? (item.textUp || item.text) : item.text.replace(/<span class="up">\([^<]*\)<\/span>/g, '');
    return [
      cost && h('p', { class: `detail-cost${costChanged ? ' changed' : ''}` }, cost),
      html(`detail-text${showUp ? ' is-up' : ''}`, text),
    ];
  }

  // 고대의 존재: 주는 유물
  if (category.id === 'ancients') {
    const relics = db.categories.find(c => c.id === 'relics')?.items.filter(r => r.source === item.name) || [];
    return [
      item.text && html('detail-text', item.text),
      relics.length > 0 && h('section', { class: 'detail-sec' },
        h('h3', {}, `주는 유물 ${relics.length}개`),
        h('ul', { class: 'relic-list' }, relics.map(r => h('li', {},
          h('button', {
            class: 'relic-link', title: r.name,
            onclick: () => openDetail(r, db.categories.find(c => c.id === 'relics'), db),
          },
            r.img ? h('img', { src: r.img, alt: '' }) : null,
            h('span', {}, r.name)),
        ))),
      ),
    ];
  }

  return [
    item.text && html('detail-text', item.text),
    item.flavor && h('p', { class: 'detail-flavor', html: item.flavor }),
  ];
}
