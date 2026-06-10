/** 프로덕션 Render 백엔드 (Vercel 빌드 시 env 미설정 대비 fallback) */
const PROD_BACKEND = "https://opti-backend-a51f.onrender.com";

export const BACKEND =
  import.meta.env.VITE_BACKEND_URL ??
  (import.meta.env.PROD ? PROD_BACKEND : "http://127.0.0.1:8000");

/** Kakao Maps JavaScript 키 (자동완성 Places 전용, 도메인 등록 필요) */
export const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY ?? "";
