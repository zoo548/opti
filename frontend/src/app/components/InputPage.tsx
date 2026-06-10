import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { SearchParams } from "../App";
import { BACKEND } from "../../config";
import { OPTI } from "../optiTheme";
import {
  ensureKakaoMapsReady,
  createPlacesService,
  createGeocoderService,
} from "../../kakaoMaps";

interface InputPageProps {
  onSearch: (params: SearchParams) => void;
}

interface KakaoPlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
}

interface ResolvedPlace {
  label: string;
  address: string;
  lat: number;
  lon: number;
}

const SEARCH_SIZE = 5;
const DEBOUNCE_MS = 300;

function toKakaoPlace(doc: KakaoPlaceDocument): KakaoPlace {
  return {
    id: doc.id,
    place_name: doc.place_name,
    address_name: doc.address_name,
    road_address_name: doc.road_address_name,
  };
}

function useKakaoSearch(
  query: string,
  places: kakao.maps.services.Places | null,
  onError: (msg: string | null) => void,
  queryCache: Map<string, KakaoPlace[]>
) {
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      onErrorRef.current(null);
      return;
    }

    const cached = queryCache.get(trimmed);
    if (cached) {
      setResults(cached);
      onErrorRef.current(null);
      return;
    }

    if (!places) {
      return;
    }

    const abort = new AbortController();
    const timer = setTimeout(() => {
      if (abort.signal.aborted) return;

      places.keywordSearch(
        trimmed,
        (data, status) => {
          if (abort.signal.aborted) return;

          if (status === kakao.maps.services.Status.OK) {
            const items = data.slice(0, SEARCH_SIZE).map(toKakaoPlace);
            queryCache.set(trimmed, items);
            setResults(items);
            onErrorRef.current(null);
            return;
          }

          if (status === kakao.maps.services.Status.ZERO_RESULT) {
            queryCache.set(trimmed, []);
            setResults([]);
            onErrorRef.current(null);
            return;
          }

          setResults([]);
          onErrorRef.current("자동완성 검색 실패");
        },
        { size: SEARCH_SIZE }
      );
    }, DEBOUNCE_MS);

    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [query, places, queryCache]);

  return results;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="지우기">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="8" fill="#ddd" />
        <path d="M5 5l6 6M11 5l-6 6" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function SuggestionList({
  items,
  onSelect,
}: {
  items: KakaoPlace[];
  onSelect: (place: KakaoPlace) => void;
}) {
  return (
    <div
      className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl overflow-hidden"
      style={{ background: OPTI.surface, boxShadow: OPTI.cardShadow, border: `1px solid ${OPTI.border}` }}
    >
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#fafafa]"
          style={{ borderBottom: `1px solid ${OPTI.border}` }}
          onMouseDown={() => onSelect(p)}
        >
          <Search size={12} style={{ color: OPTI.textMuted, marginTop: 4, flexShrink: 0 }} />
          <div className="flex flex-col min-w-0">
            <span className="truncate text-[14px] font-semibold" style={{ color: OPTI.text }}>{p.place_name}</span>
            <span className="truncate text-[12px]" style={{ color: OPTI.textMuted }}>{p.address_name}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

async function geocodeViaBackend(address: string): Promise<ResolvedPlace> {
  const res = await fetch(`${BACKEND}/geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    throw new Error("주소를 찾을 수 없습니다.");
  }
  const data = await res.json();
  return {
    label: address,
    address: data.address,
    lat: data.lat,
    lon: data.lon,
  };
}

export function InputPage({ onSearch }: InputPageProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originResolved, setOriginResolved] = useState<ResolvedPlace | null>(null);
  const [destResolved, setDestResolved] = useState<ResolvedPlace | null>(null);
  const [showOriginSug, setShowOriginSug] = useState(false);
  const [showDestSug, setShowDestSug] = useState(false);
  const [focusField, setFocusField] = useState<"from" | "to" | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  const placesRef = useRef<kakao.maps.services.Places | null>(null);
  const geocoderRef = useRef<kakao.maps.services.Geocoder | null>(null);
  const queryCacheRef = useRef(new Map<string, KakaoPlace[]>());

  useEffect(() => {
    let cancelled = false;
    ensureKakaoMapsReady()
      .then(() => {
        if (cancelled) return;
        placesRef.current = createPlacesService();
        geocoderRef.current = createGeocoderService();
        setSdkReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSearchError(e instanceof Error ? e.message : "Kakao Maps SDK 로드 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const originResults = useKakaoSearch(
    origin,
    sdkReady ? placesRef.current : null,
    setSearchError,
    queryCacheRef.current
  );
  const destResults = useKakaoSearch(
    destination,
    sdkReady ? placesRef.current : null,
    setSearchError,
    queryCacheRef.current
  );

  const geocodeOnSelect = useCallback(
    (place: KakaoPlace, setResolved: (value: ResolvedPlace | null) => void) => {
      const label = place.place_name || place.address_name;
      const queryAddress = place.road_address_name || place.address_name || place.place_name;
      const geocoder = geocoderRef.current;
      if (!geocoder) {
        setResolved(null);
        return;
      }

      geocoder.addressSearch(queryAddress, (result, status) => {
        if (status !== kakao.maps.services.Status.OK || !result[0]) {
          setResolved(null);
          return;
        }
        setResolved({
          label,
          address: result[0].address_name || label,
          lat: parseFloat(result[0].y),
          lon: parseFloat(result[0].x),
        });
      });
    },
    []
  );

  const canSearch = origin.length > 0 && destination.length > 0;

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginResolved(destResolved);
    setDestResolved(originResolved);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("위치 서비스를 지원하지 않는 브라우저입니다.");
      return;
    }
    setGeoError(null);
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `${BACKEND}/reverse-geocode?lat=${latitude}&lon=${longitude}`
          );
          if (!res.ok) throw new Error(`reverse-geocode ${res.status}`);
          const data = await res.json();
          if (data.address && data.address !== "현재 위치") {
            setOrigin(data.address);
            setOriginResolved({
              label: data.address,
              address: data.address,
              lat: latitude,
              lon: longitude,
            });
          } else {
            setGeoError("현재 위치의 주소를 찾을 수 없습니다.");
          }
        } catch (e: unknown) {
          setGeoError(`주소 변환 실패: ${e instanceof Error ? e.message : "알 수 없음"}`);
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setGeoError("위치 권한을 허용해주세요.");
      }
    );
  };

  const resolveField = async (
    text: string,
    resolved: ResolvedPlace | null
  ): Promise<ResolvedPlace> => {
    if (resolved && resolved.label === text) {
      return resolved;
    }
    return geocodeViaBackend(text);
  };

  const handleSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    setGeoError(null);
    try {
      let originData: ResolvedPlace;
      let destData: ResolvedPlace;
      try {
        originData = await resolveField(origin, originResolved);
      } catch {
        throw new Error("출발지 주소를 찾을 수 없습니다.");
      }
      try {
        destData = await resolveField(destination, destResolved);
      } catch {
        throw new Error("도착지 주소를 찾을 수 없습니다.");
      }

      const now = new Date();
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00+0900`;

      onSearch({
        origin: { address: originData.address, lat: originData.lat, lon: originData.lon },
        destination: { address: destData.address, lat: destData.lat, lon: destData.lon },
        arriveBy: null,
        maxPrice: null,
        departTime: fmt(now),
      });
    } catch (e: unknown) {
      setGeoError(e instanceof Error ? e.message : "검색 실패");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: "from" | "to") => ({
    height: 44,
    background: focusField === field ? OPTI.surface : OPTI.inputBg,
    border: focusField === field ? `1.5px solid ${OPTI.primary}` : "1.5px solid transparent",
  });

  const shouldShowSuggestions = (text: string) => text.trim().length >= 2;

  return (
    <div className="min-h-screen flex flex-col justify-center" style={{ background: OPTI.surface }}>
      <div className="px-4 mb-8 text-center">
        <h1 className="text-[36px] font-black tracking-tight" style={{ color: OPTI.primary }}>OPTI</h1>
        <p className="text-[13px] mt-1" style={{ color: OPTI.textHint }}>대중교통 · 택시 환승경로 탐색 서비스</p>
        {(geoError || searchError) && (
          <p className="text-[12px] mt-2" style={{ color: OPTI.error }}>{geoError ?? searchError}</p>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex flex-col gap-1.5">
          {/* 출발 */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 rounded-xl" style={inputStyle("from")}>
              <div className="w-2 h-2 rounded-full border-2 flex-shrink-0" style={{ borderColor: OPTI.primary }} />
              <input
                value={origin}
                onChange={(e) => {
                  setOrigin(e.target.value);
                  setOriginResolved(null);
                  setShowOriginSug(shouldShowSuggestions(e.target.value));
                }}
                onFocus={() => {
                  setFocusField("from");
                  setShowOriginSug(shouldShowSuggestions(origin));
                }}
                onBlur={() => {
                  setFocusField(null);
                  setTimeout(() => setShowOriginSug(false), 150);
                }}
                placeholder="출발지를 입력하세요"
                className="flex-1 bg-transparent outline-none text-[14px] placeholder-[#aaa] min-w-0"
                style={{ color: OPTI.text }}
              />
              {origin ? (
                <ClearButton
                  onClick={() => {
                    setOrigin("");
                    setOriginResolved(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={handleCurrentLocation}
                  disabled={gpsLoading}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: OPTI.primaryLight }}
                >
                  {gpsLoading ? (
                    <Loader2 size={12} className="animate-spin" style={{ color: OPTI.primary }} />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="2" fill={OPTI.primary} />
                      <circle cx="6" cy="6" r="4.5" stroke={OPTI.primary} strokeWidth="1.2" />
                      <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11" stroke={OPTI.primary} strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  )}
                  <span className="text-[11px] font-medium" style={{ color: OPTI.primary }}>내 위치</span>
                </button>
              )}
            </div>
            {showOriginSug && originResults.length > 0 && (
              <SuggestionList
                items={originResults}
                onSelect={(p) => {
                  const label = p.place_name || p.address_name;
                  setOrigin(label);
                  setOriginResolved(null);
                  setShowOriginSug(false);
                  geocodeOnSelect(p, setOriginResolved);
                }}
              />
            )}
          </div>

          {/* dots + swap */}
          <div className="flex items-center justify-between px-3">
            <div className="flex flex-col items-center gap-0.5 ml-[1px]">
              <div className="w-0.5 h-0.5 rounded-full bg-[#ccc]" />
              <div className="w-0.5 h-0.5 rounded-full bg-[#ccc]" />
              <div className="w-0.5 h-0.5 rounded-full bg-[#ccc]" />
            </div>
            <button
              type="button"
              onClick={handleSwap}
              className="flex items-center justify-center rounded-lg"
              style={{ width: 28, height: 28, background: OPTI.inputBg }}
              aria-label="출발·도착 바꾸기"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 2v10M4 12l-2-2.5M4 12l2-2.5" stroke="#555" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 12V2M10 2l-2 2.5M10 2l2 2.5" stroke="#555" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* 도착 + 길찾기 */}
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-2 px-3 rounded-xl" style={inputStyle("to")}>
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: OPTI.primary }} />
                <input
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setDestResolved(null);
                    setShowDestSug(shouldShowSuggestions(e.target.value));
                  }}
                  onFocus={() => {
                    setFocusField("to");
                    setShowDestSug(shouldShowSuggestions(destination));
                  }}
                  onBlur={() => {
                    setFocusField(null);
                    setTimeout(() => setShowDestSug(false), 150);
                  }}
                  placeholder="도착지를 입력하세요"
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder-[#aaa] min-w-0"
                  style={{ color: OPTI.text }}
                />
                {destination && (
                  <ClearButton
                    onClick={() => {
                      setDestination("");
                      setDestResolved(null);
                    }}
                  />
                )}
              </div>
              {showDestSug && destResults.length > 0 && (
                <SuggestionList
                  items={destResults}
                  onSelect={(p) => {
                    const label = p.place_name || p.address_name;
                    setDestination(label);
                    setDestResolved(null);
                    setShowDestSug(false);
                    geocodeOnSelect(p, setDestResolved);
                  }}
                />
              )}
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={!canSearch || loading}
              className="flex items-center justify-center rounded-xl text-white text-[11px] font-bold flex-shrink-0 disabled:opacity-70"
              style={{
                width: 44,
                height: 44,
                background: canSearch && !loading ? OPTI.primary : OPTI.primaryDisabled,
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "길찾기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
