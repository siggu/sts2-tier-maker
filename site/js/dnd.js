// 포인터 이벤트 기반 드래그 앤 드롭.
// 마우스는 바로 끌고, 터치는 길게 눌러야 끈다(그냥 쓸어내리면 스크롤).
// 움직이지 않고 떼면 탭으로 처리한다.

const MOVE_THRESHOLD = 6;
const LONG_PRESS_MS = 220;

export function enableDrag(root, { onDrop, onTap, onDragStart }) {
  let s = null; // 진행 중인 제스처

  root.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const tile = e.target.closest('.tile');
    if (!tile || !root.contains(tile)) return;
    s = {
      tile, id: tile.dataset.id, pointerId: e.pointerId, touch: e.pointerType !== 'mouse',
      x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      dragging: false, timer: null, ghost: null, placeholder: null, zone: null,
    };
    if (s.touch) {
      s.timer = setTimeout(() => { if (s) startDrag(); }, LONG_PRESS_MS);
    } else {
      e.preventDefault();
    }
  });

  function startDrag() {
    clearTimeout(s.timer);
    s.dragging = true;
    const rect = s.tile.getBoundingClientRect();
    s.dx = s.x0 - rect.left;
    s.dy = s.y0 - rect.top;
    const ghost = s.tile.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    document.body.appendChild(ghost);
    s.ghost = ghost;
    s.placeholder = document.createElement('div');
    s.placeholder.className = 'tile-placeholder';
    s.placeholder.style.width = `${rect.width}px`;
    s.placeholder.style.height = `${rect.height}px`;
    s.tile.classList.add('dragging');
    document.body.classList.add('is-dragging');
    if (navigator.vibrate && s.touch) navigator.vibrate(10);
    onDragStart?.(s.id);
    position();
  }

  function position() {
    s.ghost.style.transform = `translate(${s.x - s.dx}px, ${s.y - s.dy}px) rotate(-3deg) scale(1.06)`;
    const under = document.elementFromPoint(s.x, s.y);
    const zone = under?.closest('[data-zone]');
    if (s.zone && s.zone !== zone) s.zone.classList.remove('drop-hover');
    s.zone = zone || null;
    if (!zone) { s.placeholder.remove(); return; }
    zone.classList.add('drop-hover');
    const target = zone.querySelector('.zone-items') || zone;
    const before = insertionPoint(target, s.x, s.y, s.tile);
    if (before) target.insertBefore(s.placeholder, before);
    else target.appendChild(s.placeholder);
    autoScroll();
  }

  function autoScroll() {
    const edge = 60;
    if (s.y < edge) window.scrollBy(0, -12);
    else if (s.y > innerHeight - edge) window.scrollBy(0, 12);
  }

  window.addEventListener('pointermove', e => {
    if (!s || e.pointerId !== s.pointerId) return;
    s.x = e.clientX; s.y = e.clientY;
    const moved = Math.hypot(s.x - s.x0, s.y - s.y0) > MOVE_THRESHOLD;
    if (!s.dragging) {
      if (!moved) return;
      if (s.touch) { cancel(); return; } // 길게 누르기 전에 움직였으면 스크롤
      startDrag();
    }
    position();
  });

  // 드래그 중 터치 스크롤 막기
  window.addEventListener('touchmove', e => {
    if (s?.dragging) e.preventDefault();
  }, { passive: false });

  window.addEventListener('pointerup', e => {
    if (!s || e.pointerId !== s.pointerId) return;
    if (!s.dragging) {
      const { id, tile } = s;
      cancel();
      onTap?.(id, tile);
      return;
    }
    const zone = s.zone;
    let index = null;
    if (zone && s.placeholder.isConnected) {
      const siblings = [...s.placeholder.parentNode.children].filter(el => el.classList.contains('tile') && el !== s.tile);
      index = siblings.filter(el => s.placeholder.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING).length;
    }
    const id = s.id;
    cleanup();
    if (zone) onDrop(id, zone, index);
  });

  window.addEventListener('pointercancel', e => {
    if (s && e.pointerId === s.pointerId) cancel();
  });

  // 길게 누를 때 뜨는 컨텍스트 메뉴 막기
  root.addEventListener('contextmenu', e => {
    if (e.target.closest('.tile')) e.preventDefault();
  });

  function cancel() { cleanup(); }

  function cleanup() {
    if (!s) return;
    clearTimeout(s.timer);
    s.ghost?.remove();
    s.placeholder?.remove();
    s.zone?.classList.remove('drop-hover');
    s.tile.classList.remove('dragging');
    document.body.classList.remove('is-dragging');
    s = null;
  }
}

// (x, y) 에 놓으면 어느 타일 앞에 들어가야 하는지. 줄 단위로 왼쪽→오른쪽 순서.
function insertionPoint(container, x, y, dragged) {
  const tiles = [...container.children].filter(el => el.classList.contains('tile') && el !== dragged);
  for (const el of tiles) {
    const r = el.getBoundingClientRect();
    if (y < r.top) return el;
    if (y <= r.bottom && x < r.left + r.width / 2) return el;
  }
  return null;
}
