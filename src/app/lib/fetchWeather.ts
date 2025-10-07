interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  alert?: string;
  timezone: number; 
  forecast?: { date: string; temp: number; condition: string }[];
}

export async function fetchWeather(city: string): Promise<WeatherData | { error: string }> {
  if (!process.env.OPENWEATHER_API_KEY) {
    return { error: "API configuration error. Please contact support." };
  }
  try {
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`,
      { cache: "no-store" }
    );
    if (!weatherRes.ok) {
      const errData = await weatherRes.json();
      return { error: errData.message || "Weather API failed. Check city name or API key." };
    }

    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`,
      { cache: "no-store" }
    );
    if (!forecastRes.ok) {
      const errData = await forecastRes.json();
      return { error: errData.message || "Forecast API failed. Check city name or API key." };
    }

    const weatherData = await weatherRes.json();
    const forecastData = await forecastRes.json();
    const forecast = [];
    const uniqueDays = new Set();

    for (let i = 0; i < forecastData.list.length && forecast.length < 7; i++) {
      const item = forecastData.list[i];
      const date = new Date(item.dt * 1000);
      const day = date.toLocaleDateString("en-US", { weekday: "short" });
  
    if (!uniqueDays.has(day)) {
      forecast.push({
        date: day,
        temp: Math.round(item.main.temp),
        condition: item.weather[0]?.main || "Unknown",
      });
      uniqueDays.add(day);
    }
  }

  return {
    city: weatherData.name,
    temp: Math.round(weatherData.main.temp),
    condition: weatherData.weather[0]?.main || "Unknown",
    alert: weatherData.alerts?.[0]?.description || "No alerts available",
    timezone: weatherData.timezone,
    forecast,
  };
  } catch (error) {
    console.error("Fetch Weather API Error:", error);
    return { error: "Network error or API unavailable. Please try again later." };
  }
}