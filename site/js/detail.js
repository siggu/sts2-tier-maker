// 항목 상세 정보 창: 큰 이미지(카드는 강화 전/후 토글), 효과, 적 행동 패턴, 고대의 존재가 주는 유물.
// 텍스트 필드(text, textUp, moves[].text, flavor)는 수집 스크립트가 이스케이프한 뒤 만든 HTML 이다.

import { h } from './ui.js';
import { rarityName, typeName } from './data.js';
import { t, lang } from './i18n.js';
import { detailExtras } from './community.js';
import { linkRefs, closeAll as closeRefs } from './refs.js';

let current = null;

export function openDetail(item, category, db) {
  closeDetail();
  const restore = document.activeElement;
  let showUp = false;

  const panel = h('div', { class: 'detail', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('detail.aria', { name: item.name }) });
  const backdrop = h('div', { class: 'detail-backdrop', onclick: e => { if (e.target === backdrop) closeDetail(); } }, panel);

  function render() {
    const img = showUp && item.imgUp ? item.imgUp : item.img;
    const canUpgrade = Boolean(item.imgUp || item.textUp || item.costUp !== undefined);
    panel.replaceChildren(
      h('button', { class: 'detail-close', 'aria-label': t('detail.close'), onclick: closeDetail }, '×'),
      h('div', { class: `detail-media kind-${category.tile}` },
        img ? h('img', {
          src: img, alt: item.name,
          class: canUpgrade ? 'flip' : null,
          title: canUpgrade ? t('detail.flip') : null,
          onclick: canUpgrade ? toggle : null,
          onerror: e => { if (showUp) { e.target.src = item.img; } },
        }) : h('div', { class: 'detail-noimg' }, item.name),
        // 한 버튼을 누를 때마다 강화 전 ↔ 강화 후가 번갈아 바뀐다.
        canUpgrade && h('button', {
          class: `upgrade-switch${showUp ? ' on' : ''}`, role: 'switch', 'aria-checked': String(showUp),
          onclick: toggle,
        },
          h('span', { class: 'switch-track', 'aria-hidden': 'true' }, h('span', { class: 'switch-knob' })),
          h('span', { class: 'switch-label' }, showUp ? `${t('detail.upgraded')} ✦` : t('detail.base')),
        ),
      ),
      h('div', { class: 'detail-body' },
        h('h2', { class: `detail-title${showUp ? ' is-up' : ''}` }, item.name, showUp ? '+' : ''),
        item.nameEn && item.nameEn !== item.name && h('div', { class: 'detail-sub' }, item.nameEn),
        meta(item, category),
        ...bodyFor(item, category, db, showUp),
        detailExtras(item, category, db),
        h('a', {
          class: 'detail-wiki',
          href: `https://slaythespire.wiki.gg/wiki/Special:Search?go=Go&search=${encodeURIComponent(`Slay the Spire 2:${item.nameEn || item.name}`)}`,
          target: '_blank', rel: 'noopener',
        }, `${t('detail.wiki')} ↗`),
      ),
    );
    // 효과 문구 속 용어 팝업 (번역 문구는 item.refs 의 번역 이름으로 찾는다)
    closeRefs();
    for (const el of panel.querySelectorAll('.detail-text, .moves li > span')) linkRefs(el, db, item.refs);
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
  closeRefs();
  if (current) { const c = current; current = null; c(); }
}

function meta(item, category) {
  const chips = [
    item.groupName,
    item.area,
    item.rarity && rarityName(item.rarity),
    item.type && typeName(item.type),
    item.source && t('detail.relicOf', { name: category.labels?.source?.[item.source] || item.source }),
  ].filter((c, i, all) => c && all.indexOf(c) === i);
  return chips.length ? h('div', { class: 'detail-chips' }, chips.map(c => h('span', {}, c))) : null;
}

const html = (cls, content) => h('div', { class: cls, html: content });

// 승천 수치(<span class="asc" data-asc="9">)에 '승천 9 이상' 설명을 붙인다.
function ascTitles(el) {
  for (const s of el.querySelectorAll('[data-asc]')) s.title = t('detail.ascFrom', { n: s.dataset.asc });
  return el;
}

function costText(cost, stars) {
  const parts = [];
  if (cost !== undefined && cost !== null && cost !== '') parts.push(t('detail.energy', { n: cost === -1 ? 'X' : cost }));
  if (stars !== undefined && stars !== null && stars !== '') parts.push(t('detail.stars', { n: stars }));
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
          m.hpAsc && h('span', { class: 'asc' }, ` (${t('detail.asc', { n: m.hpAsc })})`)),
        m.moves.length > 0 && h('ul', { class: 'moves' }, m.moves.map(mv => h('li', {},
          h('b', { class: 'move-name' }, mv.name),
          ascTitles(h('span', { html: mv.text })),
        ))),
      )),
      item.members.some(m => m.moves.some(mv => mv.text.includes('class="asc"'))) &&
        h('p', { class: 'detail-note' }, h('span', { class: 'asc' }, t('detail.ascColor')), /^(ja|zh)/.test(lang) ? '' : ' ', t('detail.ascNote')),
      lang !== 'en' && item.members.some(m => m.moves.length) &&
        h('p', { class: 'detail-note' }, t('detail.movesEnglish')),
    ];
  }

  // 카드: 토글에 따라 강화 전/후 코스트와 효과 하나만 보여 준다. 강화 후에는 바뀐 값을 초록색으로.
  if (category.id === 'cards' || category.id === 'curses') {
    const costChanged = showUp && item.costUp !== undefined;
    const cost = costText(costChanged ? item.costUp : item.cost, item.stars);
    const text = showUp ? (item.textUp || item.text) : item.text.replace(/<span class="up">\([\s\S]*?\)<\/span>/g, '');
    return [
      cost && h('p', { class: `detail-cost${costChanged ? ' changed' : ''}` }, cost),
      html(`detail-text${showUp ? ' is-up' : ''}`, text),
      // 설명은 public-beta 기준인데 카드 그림(위키)은 안정판일 수 있다 (README 기준 버전)
      category.id === 'cards' && h('p', { class: 'detail-note detail-info' }, h('span', { class: 'info-ic', 'aria-hidden': 'true' }, 'i'), h('span', {}, t('detail.betaNote'))),
      item.textEn && h('p', { class: 'detail-note' }, t('detail.textEnglish')),
    ];
  }

  // 고대의 존재: 주는 유물
  if (category.id === 'ancients') {
    const relics = db.categories.find(c => c.id === 'relics')?.items.filter(r => r.source === (item.nameEn || item.name)) || [];
    return [
      item.text && html('detail-text', item.text),
      relics.length > 0 && h('section', { class: 'detail-sec' },
        h('h3', {}, t('detail.relicsN', { n: relics.length })),
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
    item.textEn && h('p', { class: 'detail-note' }, t('detail.textEnglish')),
    item.flavor && h('p', { class: 'detail-flavor', html: item.flavor }),
  ];
}
