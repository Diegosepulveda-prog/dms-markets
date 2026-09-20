import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// El gráfico usa el navegador (DOM) para dibujarse, así que lo cargamos
// solo del lado del cliente, nunca en el servidor.
const GraficoVelas = dynamic(() => import("../components/GraficoVelas"), {
  ssr: false,
});

// URL de tu backend en Render. Se puede sobrescribir con una variable de
// entorno NEXT_PUBLIC_API_URL en Vercel si el día de mañana cambia.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://analisis-financiero-backend.onrender.com";

export default function Home() {
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [ticker, setTicker] = useState("AAPL");
  const [precios, setPrecios] = useState(null);
  const [fundamental, setFundamental] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      setError(null);
      try {
        const [resIndicadores, resFundamental] = await Promise.all([
          fetch(`${API_URL}/indicadores/${ticker}?dias=180`),
          fetch(`${API_URL}/fundamental/${ticker}`),
        ]);

        if (!resIndicadores.ok || !resFundamental.ok) {
          throw new Error("No se pudieron traer los datos. Probá con otro ticker.");
        }

        const dataIndicadores = await resIndicadores.json();
        const dataFundamental = await resFundamental.json();

        setPrecios(dataIndicadores.precios || []);
        setFundamental(dataFundamental);
      } catch (err) {
        setError(err.message);
        setPrecios(null);
        setFundamental(null);
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, [ticker]);

  function buscar(e) {
    e.preventDefault();
    if (tickerInput.trim()) {
      setTicker(tickerInput.trim().toUpperCase());
    }
  }

  const ultimoPrecio = precios && precios.length > 0 ? precios[0] : null;
  const subio = ultimoPrecio && ultimoPrecio.change >= 0;

  return (
    <div className="container">
      <div className="header">
        <div className="logo">DMS Markets</div>
        <form className="search-form" onSubmit={buscar}>
          <input
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            placeholder="Ej: AAPL"
            maxLength={8}
          />
          <button type="submit">Buscar</button>
        </form>
      </div>

      {cargando && <p className="status-msg">Cargando datos de {ticker}...</p>}
      {error && <p className="error-msg">{error}</p>}

      {!cargando && !error && ultimoPrecio && (
        <>
          <div className="price-row">
            <span className="ticker-name">{ticker}</span>
            <span className="price">${ultimoPrecio.close}</span>
            <span className={subio ? "change-up" : "change-down"}>
              {subio ? "+" : ""}
              {ultimoPrecio.change} ({ultimoPrecio.changePercent}%)
            </span>
          </div>

          {fundamental && (
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">P/E</div>
                <div className="metric-value">
                  {fundamental.ratios?.priceToEarningsRatio?.toFixed?.(1) ?? "—"}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Market cap</div>
                <div className="metric-value">
                  {fundamental.perfil?.marketCap
                    ? `$${(fundamental.perfil.marketCap / 1e9).toFixed(1)}B`
                    : "—"}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">RSI (14)</div>
                <div className="metric-value">{ultimoPrecio.rsi_14 ?? "—"}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Sector</div>
                <div className="metric-value">{fundamental.perfil?.sector ?? "—"}</div>
              </div>
            </div>
          )}

          <div className="chart-box">
            <GraficoVelas precios={precios} />
          </div>
        </>
      )}
    </div>
  );
}
