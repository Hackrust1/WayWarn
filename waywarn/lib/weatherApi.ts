// ============================================================
// WayWarn — Weather API  (Open-Meteo · completely free · no key)
// ============================================================

export interface WeatherFactor {
  isRaining: boolean;
  rainMmPerHour: number;   // 0–50+
  precipProbability: number; // 0–1
  weatherCode: number;     // WMO code
  description: string;
  rainfallFactor: number;  // 0–1 normalised risk contribution
  city: string;
}

// WMO Weather Interpretation Codes → description
function decodeWeatherCode(code: number): string {
  if (code === 0)              return "Clear sky";
  if (code <= 3)               return "Partly cloudy";
  if (code <= 49)              return "Foggy / drizzle";
  if (code <= 67)              return "Rain";
  if (code <= 77)              return "Snow";
  if (code <= 82)              return "Rain showers";
  if (code <= 86)              return "Snow showers";
  if (code <= 99)              return "Thunderstorm";
  return "Unknown";
}

// Convert rain mm/h → normalised 0–1 risk factor
function rainToFactor(mmPerHour: number): number {
  // 0 mm → 0, 5 mm → 0.5, 15+ mm → 1.0
  return Math.min(1, mmPerHour / 15);
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherFactor> {
  const fallback: WeatherFactor = {
    isRaining: false,
    rainMmPerHour: 0,
    precipProbability: 0,
    weatherCode: 0,
    description: "Clear sky",
    rainfallFactor: 0,
    city: "Unknown",
  };

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&current=weather_code,rain,precipitation,cloud_cover` +
      `&hourly=precipitation_probability` +
      `&timezone=auto&forecast_days=1`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return fallback;
    const data = await res.json();

    const current = data.current ?? {};
    const rainMm: number  = current.rain ?? current.precipitation ?? 0;
    const code: number    = current.weather_code ?? 0;
    const isRaining       = rainMm > 0.1 || (code >= 51 && code <= 99);

    // Best-effort precip probability from next 1 h
    const probArr: number[] = data.hourly?.precipitation_probability ?? [];
    const precipProbability = probArr.length > 0 ? (probArr[0] ?? 0) / 100 : 0;

    return {
      isRaining,
      rainMmPerHour: rainMm,
      precipProbability,
      weatherCode: code,
      description: decodeWeatherCode(code),
      rainfallFactor: isRaining ? Math.max(rainToFactor(rainMm), 0.3) : 0,
      city: "Current Location",
    };
  } catch {
    return fallback;
  }
}
