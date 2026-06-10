/** Kakao Maps JavaScript SDK (services 라이브러리) 최소 타입 */
declare namespace kakao.maps.services {
  enum Status {
    OK = "OK",
    ZERO_RESULT = "ZERO_RESULT",
    ERROR = "ERROR",
  }

  interface Places {
    keywordSearch(
      keyword: string,
      callback: (data: KakaoPlaceDocument[], status: Status, pagination: unknown) => void,
      options?: { size?: number }
    ): void;
  }

  interface Geocoder {
    addressSearch(
      address: string,
      callback: (result: KakaoAddressDocument[], status: Status) => void
    ): void;
  }
}

interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
  x: string;
  y: string;
}

interface KakaoAddressDocument {
  address_name: string;
  x: string;
  y: string;
}

interface KakaoMapsNamespace {
  maps: {
    load: (callback: () => void) => void;
    services: {
      Places: new () => kakao.maps.services.Places;
      Geocoder: new () => kakao.maps.services.Geocoder;
      Status: typeof kakao.maps.services.Status;
    };
  };
}

interface KakaoNamespace {
  maps: KakaoMapsNamespace["maps"];
}

interface Window {
  kakao?: KakaoNamespace;
}

declare const kakao: KakaoNamespace;
