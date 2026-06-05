import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { SearchParams } from "../App";
import { BACKEND } from "../../config";
import { OPTI } from "../optiTheme";

interface InputPageProps {
  onSearch: (params: SearchParams) => void;
}

interface KakaoPlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
}

function useKakaoSearch(query: string, onError: (msg: string | null) => void) {
  const [results, setResults] = useState<KakaoPlace[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      onError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${BACKEND}/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = typeof data.detail === "string" ? data.detail : `검색 실패 (${res.status})`;
          throw new Error(detail);
        }
        if (!cancelled) {
          setResults(data.documents ?? []);
          onError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setResults([]);
          onError(e instanceof Error ? e.message : "자동완성 요청 실패");
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, onError]);

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

export function InputPage({ onSearch }: InputPageProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [showOriginSug, setShowOriginSug] = useState(false);
  const [showDestSug, setShowDestSug] = useState(false);
  const [focusField, setFocusField] = useState<"from" | "to" | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const originResults = useKakaoSearch(origin, setSearchError);
  const destResults = useKakaoSearch(destination, setSearchError);

  const canSearch = origin.length > 0 && destination.length > 0;

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
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

  const handleSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    setGeoError(null);
    try {
      const [originRes, destRes] = await Promise.all([
        fetch(`${BACKEND}/geocode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: origin }),
        }),
        fetch(`${BACKEND}/geocode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: destination }),
        }),
      ]);

      if (!originRes.ok) throw new Error("출발지 주소를 찾을 수 없습니다.");
      if (!destRes.ok) throw new Error("도착지 주소를 찾을 수 없습니다.");

      const originData = await originRes.json();
      const destData = await destRes.json();

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
                  setShowOriginSug(e.target.value.length > 0);
                }}
                onFocus={() => {
                  setFocusField("from");
                  setShowOriginSug(origin.length > 0);
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
                <ClearButton onClick={() => setOrigin("")} />
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
                  setOrigin(p.place_name || p.address_name);
                  setShowOriginSug(false);
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
                    setShowDestSug(e.target.value.length > 0);
                  }}
                  onFocus={() => {
                    setFocusField("to");
                    setShowDestSug(destination.length > 0);
                  }}
                  onBlur={() => {
                    setFocusField(null);
                    setTimeout(() => setShowDestSug(false), 150);
                  }}
                  placeholder="도착지를 입력하세요"
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder-[#aaa] min-w-0"
                  style={{ color: OPTI.text }}
                />
                {destination && <ClearButton onClick={() => setDestination("")} />}
              </div>
              {showDestSug && destResults.length > 0 && (
                <SuggestionList
                  items={destResults}
                  onSelect={(p) => {
                    setDestination(p.place_name || p.address_name);
                    setShowDestSug(false);
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
