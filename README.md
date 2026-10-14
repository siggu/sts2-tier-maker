# 첨탑의 티어 메이커 (sts2-tier-maker)

Slay the Spire 2의 캐릭터·보스·카드·유물·포션으로 티어 리스트를 만들고, 각 요소가 사기인지 약한지 투표하는 비공식 팬 사이트입니다.

→ https://siggu.github.io/sts2-tier-maker/

- **티어 메이커**: 끌어다 놓아 나만의 티어 리스트를 만들고 이미지 저장·링크 공유
- **밸런스 투표**: 너프 필요 / 적당함 / 버프 필요로 분류하면 모두의 표가 비율로 집계

## 구조

| 경로 | 내용 | 배포 |
| --- | --- | --- |
| `site/` | 정적 프런트엔드 (빌드 없음) | GitHub Pages (`.github/workflows/pages.yml`) |
| `api/` | 밸런스 투표 API (Cloudflare Worker + D1) | `.github/workflows/api.yml` |
| `tools/` | 위키에서 게임 데이터를 모으는 스크립트 | `.github/workflows/data.yml` |

## 처음 설정

1. **Settings → Pages → Source**를 `GitHub Actions`로 바꿉니다.
2. 투표 API를 쓰려면 **Settings → Secrets and variables → Actions**에 `CLOUDFLARE_API_TOKEN`(Workers 스크립트·D1 편집 권한)을 넣습니다. 계정 ID는 `api/wrangler.toml`의 `account_id`에 있습니다. 첫 배포 때 D1 데이터베이스 `sts2-balance`가 자동으로 만들어집니다.

## 로컬 실행

```sh
cd site && python3 -m http.server 8000      # 프런트엔드
cd api && npm install && npm run migrate:local && npm run dev   # API (http://localhost:8787)
```

API를 로컬로 붙이려면 `http://localhost:8000/?api=http://localhost:8787` 로 엽니다.

## 저작권

Slay the Spire 2와 모든 카드·유물 이미지의 권리는 [Mega Crit](https://www.megacrit.com/)에 있습니다. 게임 데이터는 [Slay the Spire Wiki](https://slaythespire.wiki.gg/)에서 가져옵니다. 비상업 팬 사이트이며, 권리자 요청이 있으면 내립니다.
