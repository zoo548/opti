import { useState, useEffect } from "react";
import { Search, Navigation, X, ArrowRight, Loader2 } from "lucide-react";
import { OptiHeader } from "./OptiHeader";
import { SearchParams } from "../App";

interface InputPageProps {
  onSearch: (params: SearchParams) => void;
}

interface KakaoPlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
}

const KAKAO_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY ?? "";
const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

function useKakaoSearch(query: string) {
  const [results, setResults] = useState<KakaoPlace[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
          { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
        );
        if (!res.ok) throw new Error(`Kakao ${res.status}`);
        const data = await res.json();
        if (!cancelled) setResults(data.documents ?? []);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return results;
}
const CYAN = "#4CC8F0";
const CARD = "#252A42";
const BG = "#1C2035";
const BORDER = "rgba(255,255,255,0.1)";
const TEXT = "#E8F0FF";
const MUTED = "#7A8BAA";
const DEEP = "#2A3050";

export function InputPage({ onSearch }: InputPageProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [maxPrice, setMaxPrice] = useState(20000);
  const [useTime, setUseTime] = useState(true);
  const [usePrice, setUsePrice] = useState(false);
  const [showOriginSug, setShowOriginSug] = useState(false);
  const [showDestSug, setShowDestSug] = useState(false);
  const [allowedMinutes, setAllowedMinutes] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const originResults = useKakaoSearch(origin);
  const destResults = useKakaoSearch(destination);

  const canSearch = origin.length > 0 && destination.length > 0 && (useTime || usePrice);

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
            `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${longitude}&y=${latitude}`,
            { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
          );
          if (!res.ok) throw new Error(`Kakao ${res.status}`);
          const data = await res.json();
          const doc = data.documents?.[0];
          const addr = doc?.road_address?.address_name ?? doc?.address?.address_name;
          if (addr) {
            setOrigin(addr);
          } else {
            setGeoError("현재 위치의 주소를 찾을 수 없습니다.");
          }
        } catch (e: any) {
          setGeoError(`주소 변환 실패: ${e.message}`);
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
      const arriveDate = new Date(now.getTime() + allowedMinutes * 60000);

      const pad = (n: number) => String(n).padStart(2, "0");
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+0900`;
      const departTime = fmt(now);
      const arriveByISO = useTime ? fmt(arriveDate) : null;

      onSearch({
        origin: { address: originData.address, lat: originData.lat, lon: originData.lon },
        destination: { address: destData.address, lat: destData.lat, lon: destData.lon },
        arriveBy: arriveByISO,
        maxPrice: usePrice ? maxPrice : null,
        departTime,
      });
    } catch (e: any) {
      setGeoError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <OptiHeader />
      <main className="flex-1 px-5 pb-8 flex flex-col gap-3">
        <div className="mb-2">
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.25, color: TEXT, letterSpacing: "-0.03em" }}>
            어디서 택시로<br />갈아탈까?
          </h1>
          <p style={{ fontSize: "0.875rem", color: MUTED, marginTop: "6px" }}>파레토 최적 환승 지점 찾기</p>
          {geoError && <p style={{ fontSize: "0.75rem", color: "#FF3B30", marginTop: "4px" }}>{geoError}</p>}
        </div>

        <div className="rounded-2xl overflow-visible" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="relative px-4 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: CYAN }} />
              <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "0.625rem", color: MUTED, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>출발</p>
              <input className="w-full outline-none bg-transparent truncate placeholder:text-[#8A9BBF]"
                style={{ fontSize: "0.9375rem", color: TEXT }}
                placeholder="출발지를 입력하세요" value={origin}
                onChange={(e) => { setOrigin(e.target.value); setShowOriginSug(e.target.value.length > 0); }}
                onFocus={() => setShowOriginSug(origin.length > 0)}
                onBlur={() => setTimeout(() => setShowOriginSug(false), 150)} />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {origin && (
                <button onClick={() => setOrigin("")} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <X size={10} style={{ color: MUTED }} />
                </button>
              )}
              <button onClick={handleCurrentLocation} disabled={gpsLoading} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `rgba(76,200,240,0.12)` }}>
                {gpsLoading
                  ? <Loader2 size={13} className="animate-spin" style={{ color: CYAN }} />
                  : <Navigation size={13} style={{ color: CYAN }} />}
              </button>
            </div>
            {showOriginSug && originResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 rounded-b-2xl shadow-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: "none" }}>
                {originResults.map((p) => (
                  <button key={p.id} className="w-full text-left px-4 py-3 flex items-start gap-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}
                    onMouseDown={() => { setOrigin(p.address_name); setShowOriginSug(false); }}>
                    <Search size={12} style={{ color: MUTED, marginTop: "4px", flexShrink: 0 }} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate" style={{ fontSize: "0.875rem", fontWeight: 700, color: TEXT }}>{p.place_name}</span>
                      <span className="truncate" style={{ fontSize: "0.75rem", color: MUTED }}>{p.address_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative px-4 py-4 flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CYAN }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "0.625rem", color: MUTED, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>도착</p>
              <input className="w-full outline-none bg-transparent truncate placeholder:text-[#8A9BBF]"
                style={{ fontSize: "0.9375rem", color: TEXT }}
                placeholder="도착지를 입력하세요" value={destination}
                onChange={(e) => { setDestination(e.target.value); setShowDestSug(e.target.value.length > 0); }}
                onFocus={() => setShowDestSug(destination.length > 0)}
                onBlur={() => setTimeout(() => setShowDestSug(false), 150)} />
            </div>
            {destination && (
              <button onClick={() => setDestination("")} className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                <X size={10} style={{ color: MUTED }} />
              </button>
            )}
            {showDestSug && destResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 rounded-b-2xl shadow-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: "none" }}>
                {destResults.map((p) => (
                  <button key={p.id} className="w-full text-left px-4 py-3 flex items-start gap-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}
                    onMouseDown={() => { setDestination(p.address_name); setShowDestSug(false); }}>
                    <Search size={12} style={{ color: MUTED, marginTop: "4px", flexShrink: 0 }} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate" style={{ fontSize: "0.875rem", fontWeight: 700, color: TEXT }}>{p.place_name}</span>
                      <span className="truncate" style={{ fontSize: "0.75rem", color: MUTED }}>{p.address_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div style={{ borderBottom: `1px solid ${BORDER}` }}>
            <button className="w-full flex items-center gap-3 px-4 py-4 transition-all" onClick={() => setUseTime((v) => !v)}>
              <div className="w-11 h-6 rounded-full flex-shrink-0 flex items-center px-0.5 transition-all" style={{ background: useTime ? CYAN : "rgba(255,255,255,0.08)" }}>
                <div className="w-5 h-5 rounded-full transition-all" style={{ background: useTime ? "#0B0D1F" : "#2A3450", transform: useTime ? "translateX(20px)" : "translateX(0)" }} />
              </div>
              <div className="flex-1 text-left">
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: useTime ? TEXT : MUTED }}>도착 희망 시각</p>
                {useTime && <p style={{ fontSize: "0.75rem", color: CYAN, marginTop: "1px" }}>지금부터 {allowedMinutes}분 이내</p>}
              </div>
            </button>
            {useTime && (
              <div className="px-4 pb-4">
                <input type="range" min={10} max={120} step={5} value={allowedMinutes}
                  onChange={(e) => setAllowedMinutes(Number(e.target.value))} className="w-full accent-primary" />
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: "0.75rem", color: "#2A3450" }}>10분</span>
                  <span style={{ fontSize: "0.75rem", color: "#2A3450" }}>120분</span>
                </div>
              </div>
            )}
          </div>
          <div>
            <button className="w-full flex items-center gap-3 px-4 py-4 transition-all" onClick={() => setUsePrice((v) => !v)}>
              <div className="w-11 h-6 rounded-full flex-shrink-0 flex items-center px-0.5 transition-all" style={{ background: usePrice ? CYAN : "rgba(255,255,255,0.08)" }}>
                <div className="w-5 h-5 rounded-full transition-all" style={{ background: usePrice ? "#0B0D1F" : "#2A3450", transform: usePrice ? "translateX(20px)" : "translateX(0)" }} />
              </div>
              <div className="flex-1 text-left">
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: usePrice ? TEXT : MUTED }}>최대 금액</p>
                {usePrice && <p style={{ fontSize: "0.75rem", color: CYAN, marginTop: "1px" }}>{maxPrice.toLocaleString()}원</p>}
              </div>
            </button>
            {usePrice && (
              <div className="px-4 pb-4">
                <input type="range" min={5000} max={50000} step={1000} value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-primary" />
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: "0.75rem", color: "#2A3450" }}>5,000원</span>
                  <span style={{ fontSize: "0.75rem", color: "#2A3450" }}>50,000원</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <button disabled={!canSearch || loading} onClick={handleSearch}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
          style={{ background: canSearch && !loading ? CYAN : DEEP, color: canSearch && !loading ? "#0B0D1F" : "#2A3450", fontSize: "0.9375rem", fontWeight: 700, boxShadow: canSearch && !loading ? `0 8px 32px rgba(76,200,240,0.3)` : "none" }}>
          <span>{loading ? "주소 확인 중..." : "최적 경로 찾기"}</span>
          {canSearch && !loading && <ArrowRight size={16} />}
        </button>
      </main>
    </div>
  );
}
