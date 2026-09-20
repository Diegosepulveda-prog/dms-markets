import { useEffect, useRef } from "react";

/**
 * Componente que dibuja un gráfico de velas (candlestick) con dos medias
 * móviles superpuestas, usando la librería lightweight-charts.
 *
 * "precios" es la lista que devuelve nuestro backend en /indicadores/{ticker},
 * con cada día trayendo open/high/low/close y sma_20 / sma_50 ya calculados.
 */
export default function GraficoVelas({ precios }) {
  const contenedorRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!precios || precios.length === 0) return;

    // lightweight-charts usa el DOM del navegador, así que solo se puede
    // cargar del lado del cliente (por eso el import va acá adentro).
    let chart;
    let resizeHandler;

    import("lightweight-charts").then(({ createChart }) => {
      if (!contenedorRef.current) return;

      chart = createChart(contenedorRef.current, {
        width: contenedorRef.current.clientWidth,
        height: 380,
        layout: { background: { color: "transparent" }, textColor: "#9a9a97" },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: "rgba(150,150,150,0.1)" },
        },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
      });
      chartRef.current = chart;

      // Los datos vienen del más reciente al más antiguo; lightweight-charts
      // necesita el orden inverso (más antiguo primero).
      const ordenados = [...precios].reverse();

      const velas = chart.addCandlestickSeries({
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });
      velas.setData(
        ordenados.map((d) => ({
          time: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );

      const sma20 = chart.addLineSeries({ color: "#42a5f5", lineWidth: 1 });
      sma20.setData(
        ordenados
          .filter((d) => d.sma_20 != null)
          .map((d) => ({ time: d.date, value: d.sma_20 }))
      );

      const sma50 = chart.addLineSeries({ color: "#ffa726", lineWidth: 1 });
      sma50.setData(
        ordenados
          .filter((d) => d.sma_50 != null)
          .map((d) => ({ time: d.date, value: d.sma_50 }))
      );

      chart.timeScale().fitContent();

      resizeHandler = () => {
        if (contenedorRef.current) {
          chart.applyOptions({ width: contenedorRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", resizeHandler);
    });

    return () => {
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (chartRef.current) chartRef.current.remove();
    };
  }, [precios]);

  return (
    <div>
      <div ref={contenedorRef} style={{ width: "100%" }} />
      <div className="legend">
        <span><span className="dot" style={{ background: "#42a5f5" }} />Media móvil 20 días</span>
        <span><span className="dot" style={{ background: "#ffa726" }} />Media móvil 50 días</span>
      </div>
    </div>
  );
}
