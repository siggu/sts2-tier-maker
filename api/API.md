# sts2-balance-api 명세

사이트(GitHub Pages, `https://siggu.github.io/sts2-tier-maker/`)가 부르는 Cloudflare Worker + D1 API.
기본 주소: `https://sts2-balance-api.siggu100.workers.dev` (사이트에서 `?api=` 로 바꿀 수 있다).

- 모든 응답은 JSON. 오류는 `{ error: '코드', reason? }` 와 4xx/5xx.
- 로그인이 필요한 요청은 `Authorization: Bearer <세션 토큰>`. 없거나 틀리면 `401 { error: 'auth' }`.
- 항목 키는 `카테고리/아이템id` (예: `cards/bash`) — `site/data/keys.json` 에 있는 것만 받는다.
- 묶음(템플릿) id 는 사이트 data.js 가 만드는 것 (예: `cards.ironclad.type-attack`, `potions`, `relics.rarity-ancient.source-Neow`).
  서버는 형식만 확인한다: `^[a-z0-9][A-Za-z0-9.-]{0,79}$` (고대의 존재 이름처럼 대문자가 들어갈 수 있다) 이고 첫 마디(`.` 앞)가 알려진 카테고리.
- 사용자에게 보이는 이름은 `users.name` (구글 이름의 앞부분으로 시작, 본인이 바꿀 수 있음). 이메일은 저장하지도 보여 주지도 않는다.

## 모듈 나눔

| 파일 | 맡는 것 |
|---|---|
| `src/index.js` | 라우팅, 기존 `/health`, `/balance` (POST/GET) |
| `src/http.js` | 공용: `json`, `corsHeaders`, `sha256`, `ipHashOf`, `rateLimited`, `readJson` |
| `src/auth.js` | 구글 ID 토큰 검증, 세션. `getUser(request, env)` 를 내보낸다 |
| `src/account.js` | `/auth/*`, `/me*`, `/gallery*`, `/comments*`, `/items/*/comments`, `/report` |
| `src/play.js` | `/tiers/aggregate`, `/versus*` (월드컵) |
| `src/cups.js` | `/images`, `/img/:id`, `/cups*` (사용자 월드컵) |
| `src/image.js` | 올린 이미지 검사·정리 (순수 함수): 형식(매직 바이트), 가로·세로 16–1024px, 움직이는 그림 거르기, 메타데이터 지우기 |
| `src/moderation.js` | 이미지 검열: `storeModeratedImage(env, bytes, { userId, purpose })` (정리 → 차단 목록 → Workers AI → 저장), 이미지 신고, 관리자 검토, 엣지 캐시 지우기 |
| `src/admin.js` | `/admin/*` (관리자: 이미지 검토) |
| `src/bracket.js` | 월드컵 한 판의 대진 검사(`checkBracket`)와 대진 크기를 반영한 수치(`bracketStats`) — play.js·cups.js 공용 |
| `migrations/0002_accounts.sql` | users, sessions, user_tiers, posts, reactions, comments, comment_likes, reports |
| `migrations/0003_play.sql` | versus_votes, versus_ratings |
| `migrations/0004_gallery_kind_worldcup.sql` | worldcup_stats (월드컵 부분) |
| `migrations/0005_cups.sql` | cups, cup_items, cup_likes, images (사용자 월드컵) |
| `migrations/0006_bracket_stats.sql` | worldcup_stats·cup_items 에 expected, progress, tracked, tracked_champ |
| `migrations/0007_image_moderation.sql` | images 에 status, reports, ai, purpose, reviewed_by, reviewed_at; image_blocklist |

`handleAccount` / `handlePlay` / `handleCups` / `handleAdmin` 은 자기 경로가 아니면 `null` 을 돌려준다. 응답에는 받은 `cors` 헤더를 붙인다.

## 설정 (wrangler.toml `[vars]`)

- `GOOGLE_CLIENT_ID` — 구글 OAuth 클라이언트 ID (공개 값). 비어 있으면 `/auth/google` 은 `503 { error: 'login_disabled' }`.
- `ADMIN_SUBS` — 관리자 구글 sub 목록(쉼표). 관리자는 아무 글·댓글이나 지울 수 있고 올린 이미지를 검토한다(`/admin/*`, 사이트 `#/admin`).
- `ADMIN_USERS` — 관리자 사용자 id(`users.id`, 쉼표). `ADMIN_SUBS` 와 둘 중 하나에 있으면 관리자. 사이트 프로필 메뉴의 '내 ID' 에서 자기 id 를 볼 수 있다.
- `MODERATION_MODELS` — 이미지 검열에 쓰는 Workers AI 모델(쉼표, 앞에서부터 시도). 기본 `@cf/meta/llama-3.2-11b-vision-instruct,@cf/llava-hf/llava-1.5-7b-hf`.
- `[ai] binding = "AI"` — Workers AI. 없으면(또는 배포 토큰에 Workers AI 권한이 없어 빼고 배포하면) 새 이미지는 모두 `pending`.

## 표 (0002_accounts.sql)

```sql
users(id TEXT PK,            -- 무작위 16바이트 hex
      google_sub TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL, picture TEXT, created INTEGER NOT NULL)   -- picture 는 더 이상 쓰지 않음(로그인 때 NULL), avatar TEXT (0008)
sessions(token_hash TEXT PK, user_id TEXT NOT NULL, created INTEGER, expires INTEGER)   -- 30일
user_tiers(user_id, template, state TEXT, updated_at INTEGER, PRIMARY KEY(user_id, template))
posts(id TEXT PK, user_id, template, title, state TEXT, created INTEGER,
      likes INTEGER DEFAULT 0, dislikes INTEGER DEFAULT 0, comments INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0)
reactions(post_id, user_id, v INTEGER, PRIMARY KEY(post_id, user_id))          -- v: 1 좋아요, -1 싫어요
comments(id TEXT PK, target TEXT, user_id, body TEXT, created INTEGER,
         likes INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0, deleted INTEGER DEFAULT 0)
         -- target: 'post:<postId>' 또는 'item:<카테고리/아이템id>'
comment_likes(comment_id, user_id, PRIMARY KEY(comment_id, user_id))
reports(kind TEXT, target_id TEXT, user_id TEXT, reason TEXT, created INTEGER, PRIMARY KEY(kind, target_id, user_id))
```

로그인한 사람의 밸런스 투표는 기존 `balance_votes` 표에 `voter = 'u_' + users.id` 로 들어간다.
신고가 3건 쌓이면 `hidden = 1` (목록에서 빠짐, 작성자 본인과 관리자에게는 보임).

티어표 `state` 형식은 사이트 tierlist.js 와 같다:
`{ title: string(≤80), tiers: [{ label: string(≤40), color: '#rrggbb', items: [아이템id...] }] (≤20줄), updatedAt: number }`.
서버는 크기(≤ 24KB)와 형식만 확인한다.

## 로그인·내 정보 (account.js)

| 요청 | 설명 |
|---|---|
| `POST /auth/google` `{ credential, voter? }` | 구글 ID 토큰(JWT, Google Identity Services) 검증 → 사용자 만들기/찾기 → `{ token, user }`. `voter` 를 주면 그 익명 id 로 낸 밸런스 표를 이 계정으로 옮긴다(계정에 이미 있는 항목은 계정 표 유지). |
| `POST /auth/logout` | 세션 삭제. `{ ok: true }` |
| `GET /me` | `{ user, votes: { '카테고리/id': 'nerf'|'fair'|'buff' }, tiers: { 템플릿id: { state, updatedAt } } }` |
| `PATCH /me` `{ name?, avatar? }` | 보낸 것만 바꾼다. `name`: 표시 이름 (2–20자, 앞뒤 공백 제거). `avatar`: `'face:<ironclad\|silent\|regent\|necrobinder\|defect>'` \| `'img:<id>'`(내가 `POST /images` 로 올린 이미지만) \| `null`(기본 얼굴). 틀리면 400 `reason: 'avatar'`. 사용자당 1분 10번. `{ user }` |
| `PUT /me/tiers/:template` `{ state }` | 티어표 저장(덮어쓰기). 서버 시각을 `updatedAt` 으로. `{ ok, updatedAt }` |
| `DELETE /me/tiers/:template` | 삭제 |

`user` = `{ id, name, avatar, admin: bool }`. `avatar` 는 항상 값이 있다: 고르지 않았으면 id 로 정한 얼굴 `'face:…'` (auth.js `avatarOf`). 얼굴 그림은 사이트의 `img/avatars/<캐릭터>.webp`, 올린 사진은 `/img/<id>`. 구글 사진은 내보내지 않는다.
JWT 검증: 헤더 `alg: RS256`, Google JWKS(`https://www.googleapis.com/oauth2/v3/certs`, 캐시) 로 서명 확인,
`iss` ∈ {`accounts.google.com`, `https://accounts.google.com`}, `aud` = `GOOGLE_CLIENT_ID`, `exp` 가 지나지 않음.

`POST /balance` (index.js): 로그인 상태면 `body.voter` 대신 `'u_' + user.id` 를 쓰고, IP 당 voter 수 제한은 건너뛴다.
익명 voter 는 `'u_'` 로 시작할 수 없다(계정 표 자리, 400 `voter`). `Authorization` 을 보냈는데 세션이 틀리고 `voter` 도 없으면 `401 { error: 'auth' }`
— 화면은 로그인 상태여도 익명 `voter` 를 같이 보내 두면 세션이 끝나도 익명 표로 들어간다.

## 갤러리 (account.js)

| 요청 | 설명 |
|---|---|
| `POST /gallery` `{ kind?, template, title, state }` 🔒 | 티어표·밸런스 투표 공개. `{ post }`. 한 사람이 하루 20개까지(종류 합산). |
| `GET /gallery?kind=tier|balance&template=&sort=new|top&cursor=&author=` | `{ posts: [post], next }` (20개씩). **`kind` 를 빼면 `tier` 만** (kind 를 모르는 예전 화면 호환). `template` 이 없으면 전체. `author` 는 users.id. `top` = likes − dislikes 순. |
| `GET /gallery/:id` | `{ post }` |
| `DELETE /gallery/:id` 🔒 | 작성자나 관리자 |
| `POST /gallery/:id/react` `{ v: 1 | -1 | 0 }` 🔒 | 0 은 취소. `{ likes, dislikes, myReaction }` |

`post` = `{ id, kind: 'tier'|'balance', template, title, state, author: { id, name, avatar }, created, likes, dislikes, comments, myReaction: 1|-1|0 }`
(덧붙임: `hidden: bool` — 숨겨진 글은 작성자·관리자에게만 오며 그때 `true`. `next` 는 다음 쪽 `cursor` 로 그대로 넘기는 문자열, 끝이면 `null`.)
(목록에서도 `state` 를 포함한다 — 미리보기 썸네일용.)

`kind` (0004 에서 추가, 기존 글은 모두 `'tier'`):
- `'tier'` (기본값): 티어표. `state` = `{ title, tiers: [{ label, color, items }] }` (줄 1–20개).
- `'balance'`: 밸런스 투표 공개. `state` 는 티어표와 같은 모양이되 줄이 정확히 3개, 순서대로
  `{ label: 'nerf', color: '#e5484d' }`, `{ label: 'fair', color: '#b9ae95' }`, `{ label: 'buff', color: '#57a7d8' }`.
  항목은 `template` 의 카테고리에 있는 id 이고 한 번씩만(아니면 400 `state.items`). 화면은 label 을 그대로 보이지 않고
  그 카테고리의 판정 이름(너프 필요/적당함/버프 필요 …)으로 바꿔 그린다. 서버는 글 내용을 실제 투표와 맞춰 보지 않는다
  (화면이 제출한 표만 담아 보낸다).
- 그 밖의 값은 400 `kind`. 반응·댓글·신고·삭제는 종류와 상관없이 같다.
- `GET /tiers/aggregate`(모두의 티어표) 는 `kind = 'tier'` 글만 센다.

## 댓글 (account.js)

| 요청 | 설명 |
|---|---|
| `GET /gallery/:id/comments` | `{ comments: [comment] }` (오래된 순, 최대 200) |
| `POST /gallery/:id/comments` `{ body }` 🔒 | `{ comment }` |
| `GET /items/:category/:id/comments?sort=new|top` | `{ comments: [comment] }` (최대 200) |
| `POST /items/:category/:id/comments` `{ body }` 🔒 | `{ comment }` |
| `DELETE /comments/:id` 🔒 | 작성자나 관리자 (내용을 지우고 deleted = 1) |
| `POST /comments/:id/like` `{ on: bool }` 🔒 | `{ likes, myLike }` |
| `POST /report` `{ kind: 'post'|'comment'|'cup'|'image', id, reason? }` 🔒 | `{ ok }` (`cup` 은 사용자 월드컵, `image` 는 올린 이미지 — id 32자리 hex, 아래 **이미지 검열**) |

`comment` = `{ id, body, author: { id, name, avatar }, created, likes, myLike: bool, mine: bool, vote: 'nerf'|'fair'|'buff'|null }`
(덧붙임: `hidden: bool`. 지운 댓글은 목록에 나오지 않는다. 본문은 원문 그대로 저장·반환하므로 화면에서 이스케이프한다.)
— `vote` 는 항목 댓글에서 작성자가 그 항목에 낸 밸런스 표(없으면 null). 본문 1–500자, 1분에 5개까지.

## 모두의 티어표 (play.js)

`GET /tiers/aggregate?template=` → `{ template, count, items: { 아이템id: { score, n } } }`
- 티어표 공개 글(`posts`, `kind = 'tier'` 만, hidden 제외)과 로그인 사용자가 동기화한 티어표(`user_tiers`)를 합친다. 같은 사람의 글·동기화본은 한 표로(동기화본 우선, 없으면 최신 글).
- 한 티어표에서 줄이 k개면 i번째 줄(0부터)의 점수 = 1 − i/(k−1) (k=1 이면 1). 배치하지 않은 항목은 세지 않는다.
- `score` = 평균 점수(0–1), `n` = 그 항목을 배치한 티어표 수. 60초 캐시.

## 월드컵 (play.js)

사이트 `#/versus` 는 이상형 월드컵식 토너먼트다. 경기 하나마다 `POST /versus` 로 Elo 를,
한 판이 끝나면 `POST /versus/tournament` 로 한 판의 결과(출전·경기·우승)를 보낸다.

| 요청 | 설명 |
|---|---|
| `POST /versus` `{ category, winner, loser, voter? }` | 한 경기. 같은 카테고리의 두 아이템 id. 로그인 상태면 계정, 아니면 익명 voter(형식은 `/balance` 와 같음). IP 당 1분 60회. 같은 사람이 같은 쌍에 다시 내면 마지막 선택만 반영(되돌리기 후 다르게 고른 경우 포함). `{ ok, ratings: { [winner]: r, [loser]: r } }` |
| `POST /versus/tournament` `{ category, champion, entrants: [아이템id...], matches: [[이긴 id, 진 id]...], voter? }` | 한 판의 결과. 아래 **대진 규칙**. `entrants` 는 그 카테고리의 아이템 2개 이상, 그 카테고리의 항목 수·512 이하. 출전 항목마다 `entries + 1`, 우승 항목은 `champ + 1`, 그리고 **대진 크기 수치**(서버가 계산). 로그인·voter 규칙은 `/versus` 와 같다(저장하지는 않음). IP 당 1분 6회(`cup` 버킷). `{ ok: true }`. 400 `reason`: `json`·`body`·`category`·`entrants`·`item`·`duplicate`·`matches`·`match`·`prelim`·`round`·`champion`·`voter` (경기 오류면 `index` = 문제 경기 위치, 0부터). `matches` 가 없는 예전 화면의 결과는 400 `matches`. |
| `GET /versus/ranking?category=` | `{ category, items: { 아이템id: { rating, wins, losses, champ, entries, expected, progress, tracked, trackedChamp } } }` (30초 캐시). 경기나 월드컵 기록이 하나라도 있는 항목만. 월드컵에만 나온 항목은 `rating: 1500, wins: 0, losses: 0`. 화면 계산: 우승률 = `champ / entries`, 우승 지수 = `trackedChamp / expected`, 평균 진출도 = `progress / tracked` (분모가 0 이면 표시하지 않음 —). |

Elo: 시작 1500, K = 24. 같은 쌍 재투표로 결과가 바뀌면 앞선 결과를 되돌리지 않고 새 결과만 반영해도 된다(단순화) — 대신 wins/losses 는 versus_votes 에서 다시 센다.

**대진 규칙** (`/versus/tournament`, `/cups/:id/play` 공통, `src/bracket.js`): 출전 n개, P = n 이하의 가장 큰 2의 거듭제곱, k = n − P.
- n 이 2의 거듭제곱이면 보통의 n강. 아니면 먼저 **예선** k경기(서로 다른 2k개 항목)를 치르고, 나머지 P − k 개는 **부전승**으로 P강에 오른 뒤 P강 … 결승.
- `matches` 는 치른 순서대로 정확히 n − 1 개: 앞의 k개가 예선(같은 항목이 두 번 나오면 `prelim`), 그 뒤 P/2, P/4, …, 1 경기씩 라운드
  (한 라운드에 같은 항목이 두 번 나오면 `round` — 그 라운드에 남은 항목은 모두 한 번씩 치른다).
- 두 id 는 출전 항목이고 서로 다르며, 한 번 진 항목은 그 뒤 경기에 나오지 않는다 (`match`). `champion` = 마지막 경기의 승자 (`champion`).
- 예선에 나오지 않은 항목이 부전승이다 (본선 짝은 서버가 따지지 않는다. 사이트는 '예선 승자 vs 부전승' 짝을 먼저 만든다).

**대진 크기 수치** (서버가 `entrants`·`matches` 로 직접 계산한다 — 화면이 보낸 수는 쓰지 않는다). 한 판(라운드 R = log2(P) + (k > 0 ? 1 : 0))마다 출전 항목에:
- `expected += 1/n` — 운으로 기대되는 우승 횟수. **우승 지수** = `tracked_champ / expected` (1.0 = 보통, 2.0 = 운의 두 배). 4강 우승보다 64강 우승을 16배 크게 친다.
- `progress += (이긴 경기 수 + 부전승이면 1) / R` — 우승 1, 첫 경기 탈락 0, 부전승 후 첫 경기 탈락 1/R. **평균 진출도** = `progress / tracked` (0–100%).
  예) 5개 전체(R = 3): 예선 탈락 0, 예선 승 후 준결승 탈락 1/3, 부전승 후 준결승 탈락 1/3, 준우승 2/3, 우승 1.
- `tracked += 1`, `tracked_champ += 우승이면 1` — 0006 이후의 판만 센 출전·우승 횟수. 그 전의 판에는 expected·progress 가 없으므로
  지수·진출도는 전체 기간의 `champ`·`entries` 가 아니라 이것으로 나눈다 (같은 판들끼리만 비교).

```sql
versus_votes(category, a, b, voter, winner, ts, PRIMARY KEY(category, a, b, voter))   -- a < b 로 정렬해 저장
versus_ratings(category, item, rating REAL DEFAULT 1500, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, PRIMARY KEY(category, item))
worldcup_stats(category, item, champ INTEGER DEFAULT 0, entries INTEGER DEFAULT 0,                                     -- 0004
               expected REAL DEFAULT 0, progress REAL DEFAULT 0, tracked INTEGER DEFAULT 0, tracked_champ INTEGER DEFAULT 0,  -- 0006
               PRIMARY KEY(category, item))
```

## 사용자 월드컵 (cups.js)

로그인한 사람이 이상형 월드컵을 만든다: 제목, 설명, 표지, 항목 4–64개(이름 + 이미지). 누구나 할 수 있고(대진은 화면이 짠다: 4강·8강…·전체)
한 판이 끝나면 결과를 한 번 보낸다. 좋아요·댓글·신고·작성자 수정(제목·설명·표지만)·삭제.

**이미지 참조** (표지 `cover`, 항목 `img`, 미리보기 `sample` 모두 같은 문자열):
- `'img:<32hex>'` — `POST /images` 로 올린 이미지 (`images` 표에 있어야 한다). 주소는 `GET /img/<32hex>`.
- `'game:<카테고리>/<아이템id>'` — 게임 이미지 (`site/data/keys.json` 에 있는 키).
- `null` — 이미지 없음 (화면이 기본 이미지를 그린다).

| 요청 | 설명 |
|---|---|
| `POST /images` 🔒 | 본문 = 이미지 파일 그대로. `Content-Type`: `image/webp`·`image/jpeg`·`image/png`, ≤ 300KB, 파일 앞부분(매직 바이트)이 그 형식이어야 한다. 가로·세로 16–1024px, 움직이는 그림(APNG·애니메이션 WebP) 금지. 메타데이터를 지운 뒤 id = sha256(정리한 파일) 앞 32자리 hex — 같은 그림은 같은 id(오류 아님). 그다음 **이미지 검열**(아래). IP 당 1분 90개, 한 사람이 하루에 새 이미지 300개, 사이트 전체 한도(아래 **사이트 전체 한도**). `?purpose=avatar` 면 프로필 사진용(관리자 화면 구분). `{ id, ref: 'img:<id>', status: 'ok'|'pending' }` |
| `GET /img/:id` | 이미지 바이트 (`status` 가 `ok`·`pending` 인 것만, 숨김·차단·없으면 404). `Content-Type` 은 올릴 때 형식, `Cache-Control: public, max-age=86400`, `Access-Control-Allow-Origin: *`(canvas 에 그릴 수 있게), `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'`, `Cross-Origin-Resource-Policy: cross-origin`. 엣지 캐시(Cache API, 열쇠 = 요청 주소)에는 1시간 둔다. |
| `POST /cups` 🔒 `{ title, description?, cover?, items: [{ name, img? }] }` | 만들기 → `{ cup }`. 제목 2–60자(한 줄), 설명 0–300자(줄바꿈 가능), 항목 4–64개, 항목 이름 1–80자(한 줄). `cover`·`img` 는 빼면 `null`. 항목 id 는 서버가 순서대로 `'i1'…'iN'`. 사용자당 1분 3개, 하루 10개(`reason: 'daily'`). |
| `GET /cups?sort=new|top&cursor=&author=` | `{ cups: [cup], next }` (20개씩). `sort` 기본 `new`. `top` = 좋아요 → 판 수 → 최신 순. `author` 는 users.id. 숨겨진 월드컵은 작성자·관리자에게만. |
| `GET /cups/:id` | `{ cup, items: [{ id, name, img, champ, entries, wins, losses, expected, progress, tracked, trackedChamp }] }` (항목 순서대로. 뒤의 넷은 위 **대진 크기 수치**). 숨겨진 월드컵은 작성자·관리자 아니면 404. |
| `PATCH /cups/:id` 🔒 `{ title?, description?, cover? }` | 작성자나 관리자. 준 필드만 바꾼다(항목은 못 바꾼다). `{ cup }` |
| `DELETE /cups/:id` 🔒 | 작성자나 관리자. 항목·좋아요·댓글(+댓글 좋아요·신고)·월드컵 신고를 같이 지운다. 올린 이미지는 남긴다. `{ ok: true }` |
| `POST /cups/:id/play` `{ champion, entrants, matches, voter? }` | 한 판의 결과 → `{ ok: true }`. 아래 규칙. 로그인 상태면 계정, 아니면 익명 `voter`(형식은 `/balance` 와 같음, 저장하지는 않음). IP 당 1분 6판(`cupplay` 버킷). `plays + 1`, 출전 항목 `entries + 1`, 우승 항목 `champ + 1`, 경기마다 이긴 쪽 `wins + 1`·진 쪽 `losses + 1`, 그리고 **대진 크기 수치**(expected·progress·tracked·tracked_champ, 서버가 계산). |
| `POST /cups/:id/like` 🔒 `{ on: bool }` | `{ likes, myLike }`. 사용자당 1분 60번. |
| `GET /cups/:id/comments` | `{ comments: [comment] }` (오래된 순, 최대 200) — 갤러리 글 댓글과 같은 모양 |
| `POST /cups/:id/comments` 🔒 `{ body }` | `{ comment }`. 본문 1–500자, 1분에 5개(모든 댓글 합산). 댓글 좋아요·삭제·신고는 기존 `/comments/:id/like`, `DELETE /comments/:id`, `POST /report { kind: 'comment' }`. |

`cup` = `{ id, title, description, cover, itemCount, plays, likes, comments, author: { id, name, avatar }, created, sample, myLike: bool, hidden: bool, mine: bool }`
- `sample` = 항목 이미지 참조 4개 (이미지 있는 항목 먼저, 항목 순서대로; 모자라면 `null` 로 채운다).
- `comments` = 지워지지도 숨겨지지도 않은 댓글 수 (댓글 쓰기·지우기·신고 숨김 때 다시 센다).
- `next` 는 다음 쪽 `cursor` 로 그대로 넘기는 문자열, 끝이면 `null`.

`play` 규칙 (틀리면 400 `reason`):
- `entrants`: 서로 다른 이 월드컵의 항목 id, 2개 이상 항목 수 이하 (`entrants` / 없는 id `item` / 겹침 `duplicate`). 2의 거듭제곱이 아니면 예선·부전승.
- `matches`: `[이긴 id, 진 id]` 를 치른 순서대로, 정확히 `entrants.length − 1` 개 (`matches`), 위 **대진 규칙** (`match`·`prelim`·`round`, 이때 `index`).
- `champion` = 마지막 경기의 승자 (`champion`). 로그인하지 않았고 `voter` 가 틀리면 `voter`
  (`Authorization` 을 보냈는데 세션이 틀리면 401 `auth`). 본문이 JSON 이 아니면 `json`.

신고: `POST /report { kind: 'cup', id }` — 3명이 신고하면 `hidden = 1` (목록·상세·댓글·한 판에서 빠짐, 작성자·관리자에게는 보임).

400 `reason` (만들기·고치기): `json`, `title`, `description`, `cover`(형식이 틀렸거나 올리지 않은 이미지), `items`(배열이 아니거나 4–64개 밖),
`item`·`name`·`img` (이때 `index` = 문제 항목 위치, 0부터. `img` 는 형식이 틀렸거나 올리지 않은 이미지).
이미지: `type`(지원하지 않는 Content-Type), `image`(비었거나 내용이 형식과 다르거나 깨짐), `dimensions`(가로·세로가 16–1024px 밖),
`animated`(움직이는 그림), 413 `too_large`(300KB 초과), 400 `{ error: 'blocked' }`(검열에 걸림 — 아래).
목록: `sort`, `author`, `cursor`. 좋아요: `on`. 없는 월드컵·이미지·형식이 틀린 id 는 404, 남의 월드컵 고치기·지우기는 403.

```sql
cups(id TEXT PK, user_id, title, description, cover, item_count, sample TEXT(JSON), plays, likes, comments, hidden, created)
cup_items(cup_id, id, pos, name, img, champ, entries, wins, losses,
          expected, progress, tracked, tracked_champ,                     -- 0006, 대진 크기 수치
          PRIMARY KEY(cup_id, id))                                         -- id = 'i' || pos
cup_likes(cup_id, user_id, PRIMARY KEY(cup_id, user_id))
images(id TEXT PK, user_id, type, bytes BLOB, size, created,                                  -- id = sha256(정리한 바이트) 앞 32 hex
       status TEXT DEFAULT 'ok', reports INTEGER DEFAULT 0, ai TEXT, purpose TEXT DEFAULT 'cup',  -- 0007
       reviewed_by TEXT, reviewed_at INTEGER)
image_blocklist(hash TEXT PK, created INTEGER, reason TEXT)                                     -- 0007, hash = images.id 와 같은 값
```
댓글은 `comments` 표에 `target = 'cup:<id>'`, 신고는 `reports` 표에 `kind = 'cup'`.
월드컵을 만들거나 표지를 바꿀 때 `img:` 참조는 `ok`·`pending` 이미지여야 한다(숨김·차단은 400 `cover`/`img`).

## 이미지 검열 (image.js, moderation.js, admin.js)

올린 이미지는 저장 전에 이렇게 거른다 (`storeModeratedImage(env, bytes, { userId, purpose, type?, dailyLimit? })` —
프로필 사진도 같은 함수를 쓴다):

1. **검사·정리** (image.js `inspectImage`): 매직 바이트, 가로·세로 16–1024px, 움직이는 그림 금지(PNG `acTL`, WebP `ANIM`·`ANMF`·VP8X 애니메이션 플래그).
   메타데이터를 지운다 — PNG: 그리는 데 필요한 조각(IHDR·PLTE·IDAT·IEND·tRNS·색 공간·pHYs 등)만 남기고 `tEXt`·`zTXt`·`iTXt`·`eXIf`·`tIME`·모르는 부가 조각을 버림.
   JPEG: APP0(JFIF)·APP14(Adobe) 만 남기고 APP1–APP13·APP15(EXIF·XMP·ICC 등)·COM 을 버림. WebP: `EXIF`·`XMP `·모르는 조각을 버리고 VP8X 플래그·RIFF 크기를 고침.
   어느 형식이든 파일 끝 뒤에 붙은 바이트도 버린다. 해시(id)·저장·AI 판정은 모두 정리한 바이트로.
2. **차단 목록**: `image_blocklist` 에 있는 해시면 400 `{ error: 'blocked' }` (AI 를 부르지 않는다). 이미 있는 이미지가 숨김·차단이어도 `blocked`.
   이미 있는 `ok`·`pending` 이미지면 그대로 그 id (하루 제한·AI 없이).
3. **Workers AI** (`env.AI`): `MODERATION_MODELS` 를 차례로 시도해 `SAFE`/`UNSAFE` 한 단어로 답하게 한다(나체·성적, 고어·잔인한 폭력, 혐오 상징, 마약, 자해 등은 UNSAFE;
   게임 그림·만화 같은 몬스터는 SAFE). 모델이 오류를 내면 다음 모델로 — 라마 3.2 비전의 라이선스 동의 요구(5016)도 오류로 보고 넘어간다(`agree` 를 대신 보내지 않는다).
   전체 8초 제한.
   - `UNSAFE` → 400 `{ error: 'blocked' }`, 해시를 `image_blocklist` 에 넣는다(바이트는 저장하지 않음).
   - `SAFE` → `status = 'ok'`.
   - AI 없음·모두 오류·시간 초과 → `status = 'pending'` (보이지만 관리자 검토 목록에 뜬다).
   `images.ai` 에 판정을 짧게 남긴다 (예: `llama-3.2-11b-vision-instruct: SAFE`, `no-ai`, `timeout / …`, `ai-daily-limit`).

**사이트 전체 한도** (0009 `usage_counters`, 바꾸려면 `[vars]`): 저장한 이미지 합이 `IMAGE_STORAGE_MB`(기본 350MB — 무료 D1 은 DB 하나에 500MB)를 넘으면 507 `{ error: 'storage_full' }`. 하루(UTC) 새 이미지 `IMAGES_PER_DAY_SITE`(기본 1500)개를 넘으면 429 `{ error: 'rate_limited', reason: 'site_daily' }` (AI 를 부르기 전에 막는다). 하루 AI 호출 `AI_DAILY_LIMIT`(기본 500)번을 넘으면 AI 없이 `pending` (`ai-daily-limit`). 같은 그림(이미 있는 id)은 세지 않는다.

**신고**: `POST /report { kind: 'image', id }` — 한 사람이 한 번, 서로 다른 3명이면 `status = 'hidden'` (`/img` 404, 엣지 캐시에서 지움). `images.reports` = 신고 수.
사이트는 사용자 월드컵 순위 화면에서 올린 이미지 옆의 '이미지 신고' 로 보낸다.

**관리자** (`ADMIN_SUBS` 또는 `ADMIN_USERS`. 로그인 안 함 401, 관리자 아님 403):

| 요청 | 설명 |
|---|---|
| `GET /admin/images?status=pending|reported|hidden|blocked&cursor=` | `{ images: [image], next }` (최신순 30개씩, `status` 기본 `pending`). `reported` = 아직 보이는(`ok`·`pending`) 이미지 가운데 신고가 있는 것. |
| `POST /admin/images/:id` `{ action: 'approve'|'hide'|'block' }` | `{ image }`. `approve` → `ok`, 신고를 비우고(다시 3명이 신고해야 숨겨짐) 차단 목록에서 뺀다. `hide` → `hidden`. `block` → `blocked` + 차단 목록(같은 파일 다시 올리기 금지). 숨김·차단은 엣지 캐시에서도 지운다. 없는 이미지 404, 틀린 action 400 `action`. |
| `GET /admin/img/:id` | 상태와 관계없이 이미지 바이트. `Cache-Control: no-store`. (화면은 `Authorization` 을 붙여 fetch 해 blob 주소로 그린다) |

`image` = `{ id, status, reports, ai, type, size, purpose, created, user: { id, name }, reviewedBy, reviewedAt, cups: [{ id, title }] }`
(`cups` = 이 이미지를 표지·항목으로 쓰는 월드컵, 최대 5개).

엣지 캐시: Cache API 는 데이터센터마다 따로라 지우기는 요청을 받은 데이터센터에만 닿는다. 그래서 `/img` 는 엣지 캐시에 1시간만 두고
(다른 데이터센터에서도 숨김·차단이 1시간 안에 반영), 브라우저 캐시는 하루(`max-age=86400`)다.

## 오류 코드·제한 (account.js 구현 기준)

| 상태 | `error` | 언제 |
|---|---|---|
| 400 | `blocked` | 이미지가 검열에 걸림 (차단 목록·AI 판정·숨김/차단된 이미지) |
| 400 | `bad_request` | `reason`: `json`, `credential`, `name`, `template`, `title`, `empty`(배치한 항목 없는 글), `state`·`state.title`·`state.tiers`·`state.label`·`state.color`·`state.items`·`state.updatedAt`, `too_many_tiers`(동기화 300개 초과), `sort`, `cursor`, `author`, `v`, `on`, `body`, `kind`, `id`, `reason`(신고 사유 200자 초과) |
| 401 | `auth` | 세션 없음·틀림·만료. `/auth/google` 에서는 `reason`: `format`·`alg`·`kid`·`signature`·`iss`·`aud`·`exp`·`iat`·`sub` |
| 403 | `forbidden` | 남의 글·댓글 지우기, 관리자가 아닌데 `/admin/*` |
| 404 | `not_found` | 없는 글·댓글·항목, 숨겨진 글(작성자·관리자 아님) |
| 405 | `method_not_allowed` | 경로는 있으나 메서드가 다름 |
| 413 | `too_large` | 요청 본문 32KB(티어표·글) / 8KB(그 밖) 초과, 티어표 state 24KB 초과 |
| 429 | `rate_limited` | 맨 앞: IP 당 1분 API 120번·`/img/` 600번 (Cloudflare 요청 제한 바인딩 `API_LIMITER`·`IMG_LIMITER`, D1 을 쓰지 않음, `Retry-After: 60`). 그 뒤 기능별 1분당: 로그인 10(IP), 이름 10, 티어표 저장 60, 글 5, 반응 60, 댓글 5, 댓글 좋아요 60, 신고 10(사용자). 글은 하루 20개(`reason: 'daily'`) |
| 503 | `login_disabled` | `GOOGLE_CLIENT_ID` 가 비어 있음 |
| 507 | `storage_full` | 사이트 전체 이미지 저장 용량 한도 (`POST /images`) |

- 세션 토큰은 43자 base64url, 30일 뒤 만료(연장 없음). 로그아웃은 언제나 `{ ok: true }`.
- 처음 로그인하면 이름은 구글 이름 앞 20자(2자 미만이면 `player-xxxx`). 구글 사진은 저장하지 않는다(예전에 저장한 것은 다음 로그인 때 지운다).
- IP 는 `IP_SALT` 시크릿과 섞은 해시로만 저장한다. 배포 워크플로가 없으면 무작위 값으로 한 번 만든다.
- 사용자 표시 이름·제목·댓글에서 제어 문자와 글자 방향 바꾸기 문자는 지운다. 그 밖의 문자(`<` 등)는 그대로 저장한다.
- 로컬 시험: `TEST_JWKS`(JWKS JSON 문자열) 변수가 있고 요청 주소가 `localhost`/`127.0.0.1` 일 때만 구글 JWKS 대신 그 키로 ID 토큰을 검증한다
  (`RUN_E2E=1 node --test test/e2e.test.js` 가 이렇게 띄운다). 배포 주소에서는 설정돼 있어도 쓰지 않는다.
