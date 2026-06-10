import { KAKAO_JS_KEY } from "./config";

let loadPromise: Promise<void> | null = null;

function injectScript(appKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Maps SDK는 브라우저에서만 로드할 수 있습니다."));
  }

  if (window.kakao?.maps) {
    return new Promise((resolve) => {
      window.kakao!.maps.load(() => resolve());
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&libraries=services&autoload=false`;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error("Kakao Maps SDK 로드 후 kakao.maps를 찾을 수 없습니다."));
        return;
      }
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("Kakao Maps SDK 스크립트 로드 실패"));
    document.head.appendChild(script);
  });
}

/** 페이지 진입 시 SDK 미리 로드 (중복 호출 안전) */
export function preloadKakaoMaps(appKey: string = KAKAO_JS_KEY): Promise<void> | null {
  if (!appKey) return null;
  if (!loadPromise) {
    loadPromise = injectScript(appKey);
  }
  return loadPromise;
}

export async function ensureKakaoMapsReady(appKey: string = KAKAO_JS_KEY): Promise<void> {
  if (!appKey) {
    throw new Error("VITE_KAKAO_JS_KEY가 설정되지 않았습니다.");
  }
  const pending = preloadKakaoMaps(appKey);
  if (!pending) {
    throw new Error("VITE_KAKAO_JS_KEY가 설정되지 않았습니다.");
  }
  await pending;
}

export function createPlacesService(): kakao.maps.services.Places {
  return new kakao.maps.services.Places();
}

export function createGeocoderService(): kakao.maps.services.Geocoder {
  return new kakao.maps.services.Geocoder();
}
