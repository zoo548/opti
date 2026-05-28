# Opti

파레토 최적 환승 지점 추천 — 대중교통 + 택시 조합 경로 분석

## 구조

```
opti/
├── frontend/   React + Vite (Figma UI)
└── backend/    FastAPI (Kakao / TMAP / ODsay)
```

## 로컬 실행

### Backend

```bash
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
cp .env.example .env           # API 키 입력
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env           # VITE_* 변수 입력
npm run dev
```

- Frontend: http://localhost:5173
- API docs: http://127.0.0.1:8000/docs

## 환경 변수

| 위치 | 변수 |
|------|------|
| `backend/.env` | `KAKAO_REST_API_KEY`, `TMAP_API_KEY`, `ODSAY_API_KEY` |
| `frontend/.env` | `VITE_BACKEND_URL` (로컬: `http://127.0.0.1:8000`) |
| `frontend/.env.production` | `VITE_BACKEND_URL` (배포: Render 백엔드 URL) |

`.env` 파일은 git에 포함되지 않습니다. `.env.example`을 참고하세요.
