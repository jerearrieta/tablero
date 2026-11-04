"use client";
import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { ISO_NUM } from "@/lib/datos";
import { SEQ } from "./ui";

type Geo = { type: string; id?: string; properties: { name: string }; geometry: any };
let cache: Geo[] | null = null;

const ANCHO = 960, ALTO = 470;

export function Mapa({ valores, formato, seleccion, onClick, etiqueta, nombres }: {
  valores: Map<string, number>; // iso3 -> valor
  formato: (n: number) => string;
  seleccion?: string | null;
  onClick?: (iso3: string) => void;
  etiqueta: string;
  nombres: Map<string, string>;
}) {
  const [geos, setGeos] = useState<Geo[] | null>(cache);
  const [hover, setHover] = useState<{ iso: string | null; nombre: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (cache) return;
    fetch("/mundo-50m.json").then((r) => r.json()).then((t) => {
      const fc = feature(t, t.objects.countries) as any;
      cache = (fc.features as Geo[]).filter((g) => g.properties.name !== "Antarctica");
      setGeos(cache);
    });
  }, []);

  const numAIso = useMemo(() => {
    const m = new Map<string, string>();
    for (const [iso, n] of Object.entries(ISO_NUM)) m.set(n, iso);
    return m;
  }, []);
  const isoDe = (g: Geo) => (g.id ? numAIso.get(g.id) : g.properties.name === "Kosovo" ? "XKX" : undefined) ?? null;

  const path = useMemo(() => {
    const proj = geoNaturalEarth1().fitExtent([[4, 4], [ANCHO - 4, ALTO - 4]], { type: "Sphere" } as any);
    return geoPath(proj);
  }, []);

  const vals = [...valores.values()].sort((a, b) => a - b);
  const min = vals.length ? vals[0] : 0, max = vals.length ? vals[vals.length - 1] : 1;
  // Clases por cuantiles (7): reparte los países de forma pareja entre los tonos
  const cortes = SEQ.slice(1).map((_, i) => vals[Math.floor(((i + 1) / SEQ.length) * vals.length)] ?? max);
  const colorQ = (v: number) => SEQ[cortes.filter((c) => v >= c).length];

  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      {!geos && <div style={{ height: 300, display: "grid", placeItems: "center", color: "var(--text-3)" }}>Cargando mapa…</div>}
      {geos && (
        <svg className="mapa" viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={`Mapa de ${etiqueta} por país de destino`}>
          {geos.map((g, i) => {
            const iso = isoDe(g);
            const v = iso ? valores.get(iso) : undefined;
            const d = path(g as any) ?? "";
            return (
              <path key={g.id ?? g.properties.name + i} d={d}
                className={`${v == null ? "sin" : ""} ${iso && iso === seleccion ? "elegido" : ""}`}
                style={v != null ? { fill: colorQ(v), opacity: seleccion && iso !== seleccion ? 0.45 : 1 } : undefined}
                onClick={() => iso && v != null && onClick?.(iso)}
                onMouseMove={(e) => {
                  const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ iso, nombre: (iso && nombres.get(iso)) || g.properties.name, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
              />
            );
          })}
        </svg>
      )}
      {hover && (
        <div className="tip" style={{ position: "absolute", left: Math.min(hover.x + 14, 9999), top: hover.y + 12, pointerEvents: "none" }}>
          <div className="tt">{hover.nombre}</div>
          <div className="fila"><span>{etiqueta}</span><b>{hover.iso && valores.has(hover.iso) ? formato(valores.get(hover.iso)!) : "sin ventas"}</b></div>
          {hover.iso && valores.has(hover.iso) && onClick && <div className="pista">Clic para filtrar por este país</div>}
        </div>
      )}
      <div className="escala">
        <span>{formato(min)}</span>
        <div className="b">{SEQ.map((c, i) => <i key={c} style={{ background: c }} title={i === 0 ? `< ${formato(cortes[0] ?? max)}` : `≥ ${formato(cortes[i - 1])}`} />)}</div>
        <span>{formato(max)}</span>
        <span>· 7 clases con el mismo número de países</span>
        <span style={{ marginLeft: 10, display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: "var(--seq-0)", display: "inline-block", border: "1px solid var(--border)" }} />sin ventas</span>
      </div>
    </div>
  );
}
