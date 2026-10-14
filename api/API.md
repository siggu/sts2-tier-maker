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
| `src/play.js` | `/tiers/aggregate`, `/versus*` |
| `migrations/0002_accounts.sql` | users, sessions, user_tiers, posts, reactions, comments, comment_likes, reports |
| `migrations/0003_play.sql` | versus_votes, versus_ratings |

`handleAccount` / `handlePlay` 는 자기 경로가 아니면 `null` 을 돌려준다. 응답에는 받은 `cors` 헤더를 붙인다.

## 설정 (wrangler.toml `[vars]`)

- `GOOGLE_CLIENT_ID` — 구글 OAuth 클라이언트 ID (공개 값). 비어 있으면 `/auth/google` 은 `503 { error: 'login_disabled' }`.
- `ADMIN_SUBS` — 관리자 구글 sub 목록(쉼표). 관리자는 아무 글·댓글이나 지울 수 있다.

## 표 (0002_accounts.sql)

```sql
users(id TEXT PK,            -- 무작위 16바이트 hex
      google_sub TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL, picture TEXT, created INTEGER NOT NULL)
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
| `PATCH /me` `{ name }` | 표시 이름 바꾸기 (2–20자, 앞뒤 공백 제거). `{ user }` |
| `PUT /me/tiers/:template` `{ state }` | 티어표 저장(덮어쓰기). 서버 시각을 `updatedAt` 으로. `{ ok, updatedAt }` |
| `DELETE /me/tiers/:template` | 삭제 |

`user` = `{ id, name, picture, admin: bool }`.
JWT 검증: 헤더 `alg: RS256`, Google JWKS(`https://www.googleapis.com/oauth2/v3/certs`, 캐시) 로 서명 확인,
`iss` ∈ {`accounts.google.com`, `https://accounts.google.com`}, `aud` = `GOOGLE_CLIENT_ID`, `exp` 가 지나지 않음.

`POST /balance` (index.js): 로그인 상태면 `body.voter` 대신 `'u_' + user.id` 를 쓰고, IP 당 voter 수 제한은 건너뛴다.

## 갤러리 (account.js)

| 요청 | 설명 |
|---|---|
| `POST /gallery` `{ template, title, state }` 🔒 | 티어표 공개. `{ post }`. 한 사람이 하루 20개까지. |
| `GET /gallery?template=&sort=new|top&cursor=&author=` | `{ posts: [post], next }` (20개씩). `template` 이 없으면 전체. `author` 는 users.id. `top` = likes − dislikes 순. |
| `GET /gallery/:id` | `{ post }` |
| `DELETE /gallery/:id` 🔒 | 작성자나 관리자 |
| `POST /gallery/:id/react` `{ v: 1 | -1 | 0 }` 🔒 | 0 은 취소. `{ likes, dislikes, myReaction }` |

`post` = `{ id, template, title, state, author: { id, name, picture }, created, likes, dislikes, comments, myReaction: 1|-1|0 }`
(목록에서도 `state` 를 포함한다 — 미리보기 썸네일용.)

## 댓글 (account.js)

| 요청 | 설명 |
|---|---|
| `GET /gallery/:id/comments` | `{ comments: [comment] }` (오래된 순, 최대 200) |
| `POST /gallery/:id/comments` `{ body }` 🔒 | `{ comment }` |
| `GET /items/:category/:id/comments?sort=new|top` | `{ comments: [comment] }` (최대 200) |
| `POST /items/:category/:id/comments` `{ body }` 🔒 | `{ comment }` |
| `DELETE /comments/:id` 🔒 | 작성자나 관리자 (내용을 지우고 deleted = 1) |
| `POST /comments/:id/like` `{ on: bool }` 🔒 | `{ likes, myLike }` |
| `POST /report` `{ kind: 'post'|'comment', id, reason? }` 🔒 | `{ ok }` |

`comment` = `{ id, body, author: { id, name, picture }, created, likes, myLike: bool, mine: bool, vote: 'nerf'|'fair'|'buff'|null }`
— `vote` 는 항목 댓글에서 작성자가 그 항목에 낸 밸런스 표(없으면 null). 본문 1–500자, 1분에 5개까지.

## 모두의 티어표 (play.js)

`GET /tiers/aggregate?template=` → `{ template, count, items: { 아이템id: { score, n } } }`
- 공개 글(`posts`, hidden 제외)과 로그인 사용자가 동기화한 티어표(`user_tiers`)를 합친다. 같은 사람의 글·동기화본은 한 표로(동기화본 우선, 없으면 최신 글).
- 한 티어표에서 줄이 k개면 i번째 줄(0부터)의 점수 = 1 − i/(k−1) (k=1 이면 1). 배치하지 않은 항목은 세지 않는다.
- `score` = 평균 점수(0–1), `n` = 그 항목을 배치한 티어표 수. 60초 캐시.

## A vs B 대결 (play.js)

| 요청 | 설명 |
|---|---|
| `POST /versus` `{ category, winner, loser, voter? }` | 같은 카테고리의 두 아이템 id. 로그인 상태면 계정, 아니면 익명 voter(형식은 `/balance` 와 같음). IP 당 1분 60회. 같은 사람이 같은 쌍에 다시 내면 마지막 선택만 반영. `{ ok, ratings: { [winner]: r, [loser]: r } }` |
| `GET /versus/ranking?category=` | `{ category, items: { 아이템id: { rating, wins, losses } } }` (30초 캐시) |

Elo: 시작 1500, K = 24. 같은 쌍 재투표로 결과가 바뀌면 앞선 결과를 되돌리지 않고 새 결과만 반영해도 된다(단순화) — 대신 wins/losses 는 versus_votes 에서 다시 센다.

```sql
versus_votes(category, a, b, voter, winner, ts, PRIMARY KEY(category, a, b, voter))   -- a < b 로 정렬해 저장
versus_ratings(category, item, rating REAL DEFAULT 1500, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, PRIMARY KEY(category, item))
```
