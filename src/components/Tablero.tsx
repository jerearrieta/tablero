"use client";
import { useEffect, useMemo, useState } from "react";
import { ProveedorFiltros, useFiltros, type Pestana, type Filtros } from "@/lib/filtros";
import { ANIOS, MESES, PRODUCTOS, SEGMENTOS, ZONAS, sumar, VENTAS, CLIENTE_POR_ID } from "@/lib/datos";
import { usd, num, porc, dias } from "@/lib/formato";
import { Kpi } from "./ui";
import { Operativo } from "@/paneles/Operativo";
import { Tactico } from "@/paneles/Tactico";
import { Estrategico } from "@/paneles/Estrategico";
import { Presentacion } from "@/paneles/Presentacion";
import { Datos } from "@/paneles/Datos";

const PESTANAS: { id: Pestana; t: string; nivel?: string }[] = [
  { id: "presentacion", t: "Presentación" },
  { id: "operativo", t: "Operativo", nivel: "Día a día" },
  { id: "tactico", t: "Táctico", nivel: "Este año" },
  { id: "estrategico", t: "Estratégico", nivel: "Futuro" },
  { id: "datos", t: "Datos" },
];

export function Tablero() {
  return (
    <ProveedorFiltros inicial="presentacion">
      <Shell />
    </ProveedorFiltros>
  );
}

function Shell() {
  const { pestana, irA } = useFiltros();
  useEffect(() => {
    const h = location.hash.replace("#", "") as Pestana;
    if (PESTANAS.some((p) => p.id === h)) irA(h);
    const onHash = () => {
      const x = location.hash.replace("#", "") as Pestana;
      if (PESTANAS.some((p) => p.id === x)) irA(x);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [irA]);

  // El panel operativo tiene su propia barra (jornada, prioridad, destino) y no muestra indicadores de venta
  const conFiltros = pestana === "tactico" || pestana === "estrategico";
  return (
    <>
      <header className="cab">
        <div className="cab-in">
          <div className="marca">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Air Transport" />
            <div className="marca-txt"><b>Tablero analítico</b><span>Ventas · Proveedores · Clientes · 2020–2022</span></div>
          </div>
          <nav className="pestanas" role="tablist" aria-label="Paneles">
            {PESTANAS.map((p) => (
              <button key={p.id} role="tab" aria-selected={pestana === p.id} className="pestana" onClick={() => irA(p.id)}>
                {p.t}{p.nivel && <span className="nivel">{p.nivel}</span>}
              </button>
            ))}
          </nav>
          <div className="cab-der"><Tema /></div>
        </div>
      </header>
      {conFiltros && <BarraFiltros />}
      <main className="main">
        {conFiltros && <Kpis />}
        {pestana === "operativo" && <Operativo />}
        {pestana === "tactico" && <Tactico />}
        {pestana === "estrategico" && <Estrategico />}
        {pestana === "presentacion" && <Presentacion />}
        {pestana === "datos" && <Datos />}
      </main>
      <footer className="pie">
        Datos: 1,000 pedidos (ene 2020 – 7 nov 2022), 999 clientes y 999 proveedores de Air Transport. Montos en USD.
        Los cruces ventas↔clientes y ventas↔proveedores son supuestos de modelado: ver la pestaña <a href="#datos" onClick={(e) => { e.preventDefault(); irA("datos"); }}>Datos</a>.
      </footer>
    </>
  );
}

function Tema() {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    setT(document.documentElement.getAttribute("data-theme") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }, []);
  const oscuro = t === "dark";
  const cambiar = () => {
    const n = oscuro ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", n);
    try { localStorage.setItem("tema", n); } catch {}
    setT(n);
  };
  return (
    <button className="btn-icono" onClick={cambiar} title={oscuro ? "Modo claro" : "Modo oscuro"} aria-label="Cambiar tema">
      {oscuro
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
    </button>
  );
}

function Selector({ k, etiqueta, opciones }: { k: "zona" | "producto" | "canal" | "prioridad" | "segmento" | "grupo"; etiqueta: string; opciones: string[] }) {
  const { f, set } = useFiltros();
  const v = f[k];
  return (
    <select className={`sel ${v ? "activo" : ""}`} value={v ?? ""} aria-label={etiqueta}
      onChange={(e) => { set(k, e.target.value || null); if (k === "zona") set("pais", null); }}>
      <option value="">{etiqueta}: todos</option>
      {opciones.map((o) => <option key={o} value={o}>{k === "grupo" ? `Grupo ${o}` : o}</option>)}
    </select>
  );
}

function BarraFiltros() {
  const { f, set, toggleAnio, limpiar } = useFiltros();
  const nombrePais = useMemo(() => new Map(VENTAS.map((v) => [v.iso3, v.pais])), []);
  const pills: { k: keyof Filtros; t: string; v: string }[] = [];
  if (f.trim) pills.push({ k: "trim", t: "Trimestre", v: `T${f.trim}` });
  if (f.mes) pills.push({ k: "mes", t: "Mes", v: MESES[f.mes - 1] });
  if (f.pais) pills.push({ k: "pais", t: "País", v: nombrePais.get(f.pais) ?? f.pais });
  if (f.canal) pills.push({ k: "canal", t: "Canal", v: f.canal });
  if (f.prioridad) pills.push({ k: "prioridad", t: "Prioridad", v: f.prioridad });
  if (f.grupo) pills.push({ k: "grupo", t: "Grupo", v: f.grupo });
  if (f.cliente) pills.push({ k: "cliente", t: "Cliente", v: CLIENTE_POR_ID.get(f.cliente)?.nombre ?? f.cliente });
  const hay = f.anios.length || Object.entries(f).some(([k, v]) => k !== "anios" && v != null);
  return (
    <>
      <div className="filtros" role="toolbar" aria-label="Filtros">
        <span className="etq-filtro">Año</span>
        <div className="chip-grupo">
          {ANIOS.map((a) => <button key={a} aria-pressed={f.anios.includes(a)} onClick={() => toggleAnio(a)}>{a}{a === 2022 ? "*" : ""}</button>)}
        </div>
        <Selector k="zona" etiqueta="Zona" opciones={ZONAS} />
        <Selector k="producto" etiqueta="Producto" opciones={PRODUCTOS} />
        <Selector k="segmento" etiqueta="Clientes" opciones={SEGMENTOS} />
        {hay ? <button className="limpiar" onClick={limpiar}>Limpiar filtros</button> : null}
      </div>
      <div className="activos">
        {pills.map((p) => (
          <span className="pill" key={p.k}>{p.t}: <b>{p.v}</b>
            <button aria-label={`Quitar ${p.t}`} onClick={() => { set(p.k, null as any); if (p.k === "trim") set("mes", null); }}>×</button>
          </span>
        ))}
        {!pills.length && <span style={{ fontSize: 12, color: "var(--text-3)" }}>Haga clic en una barra, un país o una fila para filtrar todo. * 2022 llega hasta el 7 de noviembre.</span>}
      </div>
    </>
  );
}

function Kpis() {
  const { ventas } = useFiltros();
  const a = sumar(ventas);
  const total = useMemo(() => sumar(VENTAS), []);
  const clientes = new Set(ventas.map((v) => v.cliente)).size;
  const parte = total.venta ? a.venta / total.venta : 0;
  return (
    <div className="kpis">
      <Kpi titulo="Venta" valor={usd(a.venta)} sub={parte < 0.999 ? `${porc(parte)} del total` : "Total del período"} />
      <Kpi titulo="Ganancia (margen)" valor={usd(a.margen)} sub={`${porc(a.venta ? a.margen / a.venta : 0)} de cada venta`} />
      <Kpi titulo="Pedidos" valor={num(a.pedidos)} sub={`${num(clientes)} clientes distintos`} />
      <Kpi titulo="Plazo de envío" valor={dias(a.pedidos ? a.dias / a.pedidos : 0)} sub="Media entre pedido y envío" />
    </div>
  );
}
