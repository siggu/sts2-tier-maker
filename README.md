# 첨탑의 티어 메이커 (sts2-tier-maker)

Slay the Spire 2의 캐릭터·보스·카드·유물·포션으로 티어 리스트를 만들고, 무엇이 사기이고 약한지 함께 투표하고, 이상형 월드컵을 즐기는 비공식 팬 사이트입니다.

→ https://sts2-tier-maker.pages.dev/  (예전 주소 `siggu.github.io/sts2-tier-maker`는 새 주소로 자동 이동)

## 기능

- **티어 메이커**: 끌어다 놓아 나만의 티어 리스트를 만들고 이미지 저장·링크 공유
- **밸런스 투표**: 너프 필요 / 적당함 / 버프 필요로 분류하면 모두의 표가 비율로 집계. 결과는 희귀도·캐릭터·막별로 나눠 볼 수 있다
- **갤러리**: 다른 사람의 티어표·밸런스 투표 보기, 좋아요/싫어요, 댓글, 신고
- **항목별 댓글**: 카드·유물마다 댓글 (그 사람이 낸 표가 배지로 붙는다)
- **모두의 티어표**: 공개된 티어표를 모아 만든 평균 티어
- **이상형 월드컵**
  - 게임 월드컵: 카드·유물 등으로 4강부터 전체 참가까지 강수를 골라 진행 (2의 거듭제곱이 아니면 예선·부전승)
  - 순위: 우승 지수·평균 진출도·Elo·우승 횟수 (대진 크기를 보정한 통계)
  - 사용자 월드컵: 직접 만든 월드컵. 이미지는 기기에서 올리기, 클립보드 붙여넣기(Ctrl+V), 게임 이미지 고르기, 없으면 금테 기본 이미지
- **구글 로그인 (선택)**: 투표·티어표를 계정에 저장해 다른 기기에서 이어 하기. 이메일은 저장하지 않는다
- **프로필 사진**: 캐릭터 얼굴 5종 중 고르거나 직접 올리기 (고르지 않으면 캐릭터 얼굴 하나가 기본)
- **5개 언어**: 한국어·English·日本語·简体中文·繁體中文. 게임 내용은 게임의 공식 번역
- **이미지 검열·관리자 화면** (`#/admin`): 아래 [이미지 검열](#이미지-검열) 참고

## 구조

| 경로 | 내용 | 배포 |
| --- | --- | --- |
| `site/` | 정적 프런트엔드 (빌드 없음, ES 모듈) | Cloudflare Pages (`.github/workflows/pages.yml`). GitHub Pages(예전 주소)에는 이동 안내 페이지만 |
| `api/` | API (Cloudflare Worker + D1). 계약은 [`api/API.md`](api/API.md) | `.github/workflows/api.yml` (D1 마이그레이션 → 배포 → 동작 확인) |
| `tools/` | 위키에서 게임 데이터를 모으고 언어별 덮어쓰기 파일을 만드는 스크립트 | `.github/workflows/data.yml` (main 의 `tools/**` 변경·매주) |

- `site/data/sts2.json`(영어 기본) + `site/data/i18n/<언어>.json`(언어별 덮어쓰기), 이미지는 `site/data/img/`
- **게임 버전 기준: 항상 public-beta.** 수치·효과는 위키 데이터(public-beta 기준으로 갱신됨), 카드 그림은 위키의 public-beta 그림(CardArt 의 `FullCardBeta`)이 있으면 그것을 쓴다. 안정판과 다르면 public-beta 쪽이 맞다
- 카드는 위키 Cargo 표(`Cards`, `CardArt`, 2026-10-17 이전)에서, 유물·포션·키워드·적은 위키 데이터 모듈에서 받는다 (`tools/cargo.mjs` 가 Cargo 설명을 예전 문법으로 바꾼다)
- 게임 언어 파일(`tools/l10n/ko.json`)에 이름이 없는 항목은 `hidden: true`로 사이트에 나오지 않는다 (데이터 갱신 때마다 다시 정한다. 새 언어 파일을 넣으면 이름이 생긴 항목은 저절로 다시 보인다)
- 사이트 문구는 `site/js/i18n-*.js`, 프로필 얼굴은 `site/img/avatars/`, 브라우저 이미지 검사 모델은 `site/vendor/nsfwjs/`
- 데이터 갱신 워크플로가 끝나면 사이트·API 배포가 이어서 돈다
- 검색엔진용 페이지: 배포 때 `tools/build-seo.mjs`가 템플릿마다 진짜 주소의 페이지(`/tier/…`, 5개 언어), `sitemap.xml`, `robots.txt`를 만든다 (저장소에는 넣지 않음). 링크 미리보기 그림은 `site/img/og.png`

## 처음 설정

1. **Settings → Pages → Source**를 `GitHub Actions`로 바꿉니다 (예전 주소 이동 안내용).
2. **Settings → Secrets and variables → Actions**에 `CLOUDFLARE_API_TOKEN`을 넣습니다. 필요한 권한:
   - Account · Workers Scripts · Edit
   - Account · D1 · Edit
   - Account · Workers AI · Read (없으면 AI 검열 없이 배포되고 올린 이미지는 모두 '검토 대기'가 됩니다)
   - Account · Cloudflare Pages · Edit (사이트 배포, 프로젝트 `sts2-tier-maker`는 처음 배포 때 만들어집니다)

   계정 ID는 `api/wrangler.toml`의 `account_id`에 있습니다. 첫 배포 때 D1 데이터베이스 `sts2-balance`가 자동으로 만들어집니다.
3. **구글 로그인**: Google Cloud Console에서 OAuth 클라이언트(웹)를 만들고, 승인된 JavaScript 원본에 `https://sts2-tier-maker.pages.dev`를 넣습니다.
   공개 값인 클라이언트 ID를 `site/js/config.js`와 `api/wrangler.toml`의 `GOOGLE_CLIENT_ID`에 같은 값으로 넣습니다. 클라이언트 보안 비밀은 쓰지 않습니다(어디에도 넣지 마세요). 비워 두면 로그인 기능이 꺼집니다.
4. **이미지 검열 AI**: Cloudflare에서 `@cf/meta/llama-3.2-11b-vision-instruct` 모델에 `agree`를 한 번 보내 라이선스에 동의합니다. 동의 전에는 두 번째 모델(llava)로 검사합니다.
5. **관리자**: 사이트의 프로필 메뉴 → "내 ID"를 `api/wrangler.toml`의 `ADMIN_USERS`(쉼표로 여러 명)에 넣고 배포합니다.
6. IP 해시용 비밀값 `IP_SALT`는 배포 워크플로가 없을 때 무작위로 한 번 만듭니다 (따로 할 일 없음).

## 이미지 검열

사용자가 올리는 이미지(월드컵 그림·프로필 사진)는 이렇게 거릅니다.

1. **브라우저**: 512px(프로필 256px)로 줄인 뒤 NSFW.js로 검사해 선정적인 이미지는 올리지 않습니다. 여러 장은 4장씩 함께 처리합니다.
2. **서버**: 형식·크기(16–1024px, 300KB 이하)·움직이는 그림 검사, 메타데이터(위치 정보 등) 제거,
   차단 목록 확인, Workers AI 판정(SAFE → 바로 공개, UNSAFE → 거절·차단 목록, 판정 실패 → '검토 대기'로 공개).
3. **신고**: 서로 다른 3명이 신고하면 자동으로 숨김.
4. **관리자 화면** `#/admin`: 최근 순으로 날짜별로 묶어 보여 주고, 상태(전체·검토 대기·신고됨·숨김·차단)·기간·올린 사람·용도로 거르며, 크게 보며 승인·숨김·차단합니다.

## 비용·악용 방어

무료 플랜 한도 안에서 돌도록 막아 둔 것들 (값은 `api/src/*.js`, 일부는 `[vars]`로 바꿀 수 있음):

- 맨 앞 IP 당 요청 제한: API 1분 120번, 이미지 1분 600번 (Cloudflare 요청 제한 바인딩, D1 을 쓰지 않음)
- 기능별 제한: 로그인·댓글·글·좋아요·신고·이미지 올리기(IP 당 1분 90장) 등 1분당 횟수, 하루 글 20개·월드컵 10개·이미지 300장(1인)
- 사이트 전체: 이미지 저장 용량 350MB(`IMAGE_STORAGE_MB`), 하루 새 이미지 1500장(`IMAGES_PER_DAY_SITE`), 하루 AI 판정 500번(`AI_DAILY_LIMIT`, 넘으면 AI 없이 '검토 대기')
- 요청 크기 제한, 무거운 집계의 상한과 결과 캐시
- 보안: 구글 ID 토큰 서명 검증, 세션 토큰은 해시로만 저장(30일), IP 는 비밀값과 섞은 해시로만 저장, 사용자 글은 항상 글자로만 표시, 콘텐츠 보안 정책(CSP)

## 게임 번역 (ko·ja·zh-Hans·zh-Hant)

카드·유물·포션·인챈트·적·고대의 존재 이름과 효과는 게임 언어 파일의 공식 번역을 씁니다.
`tools/l10n/<언어>.json`에는 사이트에 필요한 이름과 효과 문구 틀만 들어 있고, 원본 언어 파일은 저장소에 넣지 않습니다.
효과의 수치는 위키(영어)에서 읽어 번역 틀에 채우며, 맞추지 못한 항목은 영어 효과로 보입니다.

게임 패치 후 갱신하는 방법:
1. [GDRE Tools](https://github.com/GDRETools/gdsdecomp/releases)로 게임 폴더의 `SlayTheSpire2.pck`에서 `localization` 폴더를 꺼냅니다.
2. `node tools/build-l10n.mjs <localization 폴더>`를 실행합니다 (`eng`, `kor`, `jpn`, `zhs`, `zht` 폴더가 들어 있는 곳).
3. 바뀐 `tools/l10n/*.json`을 커밋하면 데이터 갱신 워크플로가 다시 돕니다.

## 로컬 실행·시험

```sh
cd site && python3 -m http.server 8000      # 프런트엔드
cd api && npm install && npm run migrate:local && npm run dev   # API (http://localhost:8787)
```

API를 로컬로 붙이려면 `http://localhost:8000/?api=http://localhost:8787` 로 엽니다
(콘텐츠 보안 정책 때문에 `?api=`에는 `localhost`·`127.0.0.1` 주소만 쓸 수 있습니다).

```sh
cd api && npm test                    # API 시험
cd tools && npm ci && npm test        # 데이터·번역·대진·CSP 시험
```

## 저작권

Slay the Spire 2와 모든 카드·유물 이미지의 권리는 [Mega Crit](https://www.megacrit.com/)에 있습니다. 게임 데이터는 [Slay the Spire Wiki](https://slaythespire.wiki.gg/)에서 가져옵니다. 비상업 팬 사이트이며, 권리자 요청이 있으면 내립니다.
