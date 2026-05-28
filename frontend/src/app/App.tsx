import { useState, useCallback } from "react";
import { InputPage } from "./components/InputPage";
import { LoadingPage } from "./components/LoadingPage";
import { ResultsPage } from "./components/ResultsPage";
import { DetailPage } from "./components/DetailPage";
import { Recommendation } from "./components/mockData";

type Page = "input" | "loading" | "results" | "detail";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

export interface SearchParams {
  origin: { address: string; lat: number; lon: number };
  destination: { address: string; lat: number; lon: number };
  arriveBy: string | null;
  maxPrice: number | null;
  departTime: string;
}

export default function App() {
  const [page, setPage] = useState<Page>("input");
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (params: SearchParams) => {
    setSearchParams(params);
    setPage("loading");
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin:      { lat: params.origin.lat,      lon: params.origin.lon },
          destination: { lat: params.destination.lat, lon: params.destination.lon },
          constraints: {
            arrive_by: params.arriveBy,
            max_price: params.maxPrice,
          },
          depart_time: params.departTime,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "분석 실패");
      }
      const data = await res.json();
      setAnalysisResult(data);
      setPage("results");
    } catch (e: any) {
      setError(e.message);
      setPage("input");
    }
  }, []);

  const handleSelectCard = useCallback((rec: Recommendation) => {
    setSelectedRec(rec);
    setPage("detail");
  }, []);

  return (
    <div className="size-full bg-background overflow-auto">
      <div className="max-w-md mx-auto min-h-full">
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(255,59,48,0.15)", border: "1px solid rgba(255,59,48,0.3)", color: "#FF3B30" }}>
            {error}
          </div>
        )}
        {page === "input" && <InputPage onSearch={handleSearch} />}
        {page === "loading" && (
          <LoadingPage
            onDone={() => {}}
            origin={searchParams?.origin.address}
            destination={searchParams?.destination.address}
            allowedMinutes={
              searchParams?.arriveBy
                ? Math.round((new Date(searchParams.arriveBy).getTime() - new Date(searchParams.departTime).getTime()) / 60000)
                : null
            }
          />
        )}
        {page === "results" && analysisResult && (
          <ResultsPage
            data={analysisResult}
            onBack={() => setPage("input")}
            onSelectCard={handleSelectCard}
          />
        )}
        {page === "detail" && selectedRec && (
          <DetailPage
            rec={selectedRec}
            baselines={analysisResult?.baselines}
            onBack={() => setPage("results")}
          />
        )}
      </div>
    </div>
  );
}
