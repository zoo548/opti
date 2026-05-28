export interface Segment {
  name: string;
  from: string;
  to: string;
  minutes: number;
  price?: number;
}

export interface Recommendation {
  rank: number;
  transfer_point: string;
  total_minutes: number;
  weighted_minutes: number;
  price: number;
  transit_segment: {
    minutes: number;
    transfers: number;
    price: number;
    lines: Segment[];
  };
  taxi_segment: { minutes: number; price: number };
  savings: { vs_transit_minutes: number; vs_taxi_price: number };
  over_constraint?: boolean;
  over_label?: string | null;
}

export const MOCK_DATA = {
  constraints: {
    allowed_minutes: 50,
    max_price: 15000,
  },
  baselines: {
    transit_only: {
      minutes: 110,
      price: 3200,
      segments: [
        { type: "walk", minutes: 5 },
        { type: "transit", line: "신분당선", from: "동천역", to: "양재역", minutes: 45, price: 1250 },
        { type: "walk", minutes: 10 },
        { type: "transit", line: "마을버스", from: "양재역", to: "서울대입구역", minutes: 35, price: 1250 },
        { type: "walk", minutes: 15 },
      ],
    },
    taxi_only: { minutes: 42, price: 38000 },
  },
  recommendations: [
    {
      rank: 1,
      transfer_point: "양재역",
      total_minutes: 48,
      weighted_minutes: 61.2,
      price: 12400,
      transit_segment: {
        minutes: 25,
        transfers: 1,
        price: 1250,
        lines: [{ name: "신분당선", from: "동천역", to: "양재역", minutes: 20 }],
      },
      taxi_segment: { minutes: 23, price: 11150 },
      savings: { vs_transit_minutes: 62, vs_taxi_price: 25600 },
    },
    {
      rank: 2,
      transfer_point: "강남역",
      total_minutes: 54,
      weighted_minutes: 68.4,
      price: 11800,
      transit_segment: {
        minutes: 30,
        transfers: 1,
        price: 1250,
        lines: [{ name: "신분당선", from: "동천역", to: "강남역", minutes: 25 }],
      },
      taxi_segment: { minutes: 24, price: 10550 },
      savings: { vs_transit_minutes: 56, vs_taxi_price: 26200 },
    },
    {
      rank: 3,
      transfer_point: "서초역",
      total_minutes: 58,
      weighted_minutes: 74.1,
      price: 10200,
      transit_segment: {
        minutes: 35,
        transfers: 2,
        price: 1650,
        lines: [
          { name: "신분당선", from: "동천역", to: "강남역", minutes: 25 },
          { name: "2호선", from: "강남역", to: "서초역", minutes: 3 },
        ],
      },
      taxi_segment: { minutes: 23, price: 8550 },
      savings: { vs_transit_minutes: 52, vs_taxi_price: 27800 },
    },
    {
      rank: 4,
      transfer_point: "교대역",
      total_minutes: 62,
      weighted_minutes: 79.8,
      price: 9400,
      transit_segment: {
        minutes: 38,
        transfers: 2,
        price: 1650,
        lines: [
          { name: "신분당선", from: "동천역", to: "강남역", minutes: 25 },
          { name: "2호선", from: "강남역", to: "교대역", minutes: 6 },
        ],
      },
      taxi_segment: { minutes: 24, price: 7750 },
      savings: { vs_transit_minutes: 48, vs_taxi_price: 28600 },
    },
  ] as Recommendation[],
};
