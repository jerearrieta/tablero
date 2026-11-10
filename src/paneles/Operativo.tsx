"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFiltros } from "@/lib/filtros";
import { PRIORIDADES, VENTAS, ZONAS, type Venta } from "@/lib/datos";
import { num, fecha } from "@/lib/formato";
import { BarrasH, Kpi, Seg, Tabla, Tarjeta, Tip, type Col } from "@/components/ui";

/**
 * Panel para el operario de despacho: solo el día a día.
 * No muestra montos de venta, costes ni márgenes (eso es información gerencial).
 * Como los datos son históricos, el operario elige la "jornada" a revisar; por defecto,
 * el último día con pedidos (7 nov 2022).
 */

const PRIMER_DIA = VENTAS.reduce((m, v) => (v.fecha < m ? v.fecha : m), VENTAS[0].fecha);
const ULTIMO_DIA = VENTAS.reduce((m, v) => (v.fecha > m ? v.fecha : m), VENTAS[0].fecha);

/** Plazo máximo de despacho por prioridad (días), según las decisiones de la presentación. */
export const PLAZO_MAX: Record<string, number> = { Crítica: 7, Alta: 15, Media: 35, Baja: 35 };

const ejeProps = { tick: { fill: "var(--text-3)", fontSize: 11 }, axisLine: false, tickLine: false } as const;
const DIA_MS = 86400000;
const aFecha = (s: string) => new Date(s + "T00:00:00Z");
const sumarDias = (s: string, n: number) => new Date(aFecha(s).getTime() + n * DIA_MS).toISOString().slice(0, 10);
const entre = (a: string, b: string) => Math.round((aFecha(b).getTime() - aFecha(a).getTime()) / DIA_MS);
const DIAS_SEM = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const fechaLarga = (s: string) => `${DIAS_SEM[aFecha(s).getUTCDay()]} ${fecha(s)}`;

type Estado = "Atrasado" | "Vence pronto" | "A tiempo";
function estadoDe(espera: number, prioridad: string): Estado {
  const lim = PLAZO_MAX[prioridad] ?? 35;
  if (espera > lim) return "Atrasado";
  if (espera >= lim - 2) return "Vence pronto";
  return "A tiempo";
}
const COLOR: Record<Estado, string> = { Atrasado: "var(--critical)", "Vence pronto": "var(--warning)", "A tiempo": "var(--good)" };
function Semaforo({ e }: { e: Estado }) {
  return <span className="estado"><i style={{ background: COLOR[e] }} />{e}</span>;
}

type Pendiente = Venta & { espera: number; estado: Estado };

export function Operativo() {
  const { f } = useFiltros();
  const [dia, setDia] = useState(ULTIMO_DIA);
  const [prio, setPrio] = useState<string>(f.prioridad ?? "Todas");
  const [zona, setZona] = useState<string>("");

  const filtro = (v: Venta) => (prio === "Todas" || v.prioridad === prio) && (!zona || v.zona === zona);

  // Pedidos ya ingresados y todavía sin enviar al cierre de la jornada
  const pendientes: Pendiente[] = useMemo(() =>
    VENTAS.filter((v) => v.fecha <= dia && v.envio > dia && filtro(v)).map((v) => {
      const espera = entre(v.fecha, dia);
      return { ...v, espera, estado: estadoDe(espera, v.prioridad) };
    }), [dia, prio, zona]); // eslint-disable-line react-hooks/exhaustive-deps
  const entran = useMemo(() => VENTAS.filter((v) => v.fecha === dia && filtro(v)), [dia, prio, zona]); // eslint-disable-line react-hooks/exhaustive-deps
  const salen = useMemo(() => VENTAS.filter((v) => v.envio === dia && filtro(v)), [dia, prio, zona]); // eslint-disable-line react-hooks/exhaustive-deps

  const atrasados = pendientes.filter((p) => p.estado === "Atrasado").length;
  const pronto = pendientes.filter((p) => p.estado === "Vence pronto").length;
  const mover = (n: number) => {
    const d = sumarDias(dia, n);
    if (d >= PRIMER_DIA && d <= ULTIMO_DIA) setDia(d);
  };

  return (
    <>
      <div className="intro">
        <div>
          <h1>Panel operativo</h1>
          <p>Para el equipo de despacho: qué pedidos hay que enviar, cuáles están atrasados y qué entra y sale en la jornada. Sin montos de venta.</p>
        </div>
      </div>

      <div className="filtros" role="toolbar" aria-label="Jornada y filtros" style={{ marginBottom: 14 }}>
        <span className="etq-filtro">Jornada</span>
        <button className="btn-icono" onClick={() => mover(-1)} disabled={dia <= PRIMER_DIA} aria-label="Día anterior" title="Día anterior">‹</button>
        <input type="date" className="sel" value={dia} min={PRIMER_DIA} max={ULTIMO_DIA} aria-label="Fecha de la jornada"
          onChange={(e) => e.target.value && setDia(e.target.value < PRIMER_DIA ? PRIMER_DIA : e.target.value > ULTIMO_DIA ? ULTIMO_DIA : e.target.value)} />
        <button className="btn-icono" onClick={() => mover(1)} disabled={dia >= ULTIMO_DIA} aria-label="Día siguiente" title="Día siguiente">›</button>
        {dia !== ULTIMO_DIA && <button className="limpiar" onClick={() => setDia(ULTIMO_DIA)}>Ir al último día con datos</button>}
        <Seg etiqueta="Prioridad" valor={prio} onChange={setPrio} opciones={[{ v: "Todas", t: "Todas" }, ...PRIORIDADES.map((p) => ({ v: p, t: p }))]} />
        <select className={`sel ${zona ? "activo" : ""}`} value={zona} aria-label="Zona de destino" onChange={(e) => setZona(e.target.value)}>
          <option value="">Destino: todos</option>
          {ZONAS.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>

      <div className="kpis">
        <Kpi titulo="Pendientes de envío" valor={num(pendientes.length)} sub={`Al cierre del ${fechaLarga(dia)}`} />
        <Kpi titulo="Atrasados" valor={<span style={{ color: atrasados ? "var(--critical)" : undefined }}>{num(atrasados)}</span>} sub="Pasaron el plazo de su prioridad" />
        <Kpi titulo="Vencen en 2 días o menos" valor={num(pronto)} sub="Despachar antes de que se atrasen" />
        <Kpi titulo="Movimiento del día" valor={`${num(entran.length)} entran · ${num(salen.length)} salen`} sub="Pedidos nuevos y pedidos enviados" />
      </div>

      <div className="grid">
        <Cola filas={pendientes} dia={dia} />
        <PorPrioridad filas={pendientes} prio={prio} setPrio={setPrio} />
        <Ritmo dia={dia} filtro={filtro} />
        <Dia titulo="Salen hoy" sub="Pedidos enviados en la jornada" filas={salen} tipo="salen" />
        <Dia titulo="Entran hoy" sub="Pedidos nuevos para preparar" filas={entran} tipo="entran" />
      </div>
      <div className="nota" style={{ marginTop: 10 }}>
        Los datos son históricos: elija una fecha para ver cómo estaba la cola de despacho ese día.
      </div>
    </>
  );
}

function Cola({ filas, dia }: { filas: Pendiente[]; dia: string }) {
  const [solo, setSolo] = useState(false);
  const orden = (r: Pendiente) => (r.estado === "Atrasado" ? 0 : r.estado === "Vence pronto" ? 1 : 2) * 1000 + PRIORIDADES.indexOf(r.prioridad) * 100 - Math.min(r.espera, 99);
  const lista = useMemo(() => [...(solo ? filas.filter((r) => r.estado !== "A tiempo") : filas)].sort((a, b) => orden(a) - orden(b)), [filas, solo]);
  const cols: Col<Pendiente>[] = [
    { k: "estado", t: "Estado", v: (r) => <Semaforo e={r.estado} />, orden: (r) => -orden(r) },
    { k: "prio", t: "Prioridad", v: (r) => r.prioridad, orden: (r) => -PRIORIDADES.indexOf(r.prioridad) },
    { k: "id", t: "Pedido", v: (r) => r.id, orden: (r) => r.id },
    { k: "fecha", t: "Ingresó", v: (r) => fecha(r.fecha), orden: (r) => r.fecha },
    { k: "espera", t: "Días esperando", v: (r) => <>{r.espera} <span style={{ color: "var(--text-3)" }}>/ {PLAZO_MAX[r.prioridad]}</span></>, orden: (r) => r.espera, num: true },
    { k: "prod", t: "Producto", v: (r) => r.producto, orden: (r) => r.producto },
    { k: "uds", t: "Unidades", v: (r) => num(r.unidades), orden: (r) => r.unidades, num: true },
    { k: "pais", t: "Destino", v: (r) => `${r.pais} (${r.zona})`, orden: (r) => r.pais },
    { k: "canal", t: "Canal", v: (r) => r.canal, orden: (r) => r.canal },
  ];
  return (
    <Tarjeta className="c8" titulo="Cola de despacho" sub={`Pedidos sin enviar al cierre del ${fecha(dia)}, en orden de atención: primero los atrasados y los de mayor prioridad`}>
      <Tabla filas={lista} cols={cols} clave={(r) => r.id} porPagina={10}
        buscar={(r) => `${r.id} ${r.pais} ${r.zona} ${r.producto} ${r.prioridad} ${r.canal}`}
        extra={<label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "var(--text-2)", cursor: "pointer" }}>
          <input type="checkbox" checked={solo} onChange={(e) => setSolo(e.target.checked)} /> Solo atrasados o por vencer
        </label>} />
    </Tarjeta>
  );
}

function PorPrioridad({ filas, prio, setPrio }: { filas: Pendiente[]; prio: string; setPrio: (p: string) => void }) {
  const datos = PRIORIDADES.map((k) => {
    const g = filas.filter((r) => r.prioridad === k);
    const atr = g.filter((r) => r.estado === "Atrasado").length;
    return { k, v: g.length, sub: atr ? `${atr} atrasados` : undefined };
  });
  const top = filas.filter((r) => r.estado === "Atrasado").sort((a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad) || b.espera - a.espera)[0];
  return (
    <Tarjeta className="c4" titulo="Pendientes por prioridad" sub="Clic en una prioridad para filtrar"
      nota={<>Plazo máximo para despachar: Crítica {PLAZO_MAX["Crítica"]} días, Alta {PLAZO_MAX.Alta} días, Media y Baja {PLAZO_MAX.Media} días. «Vence pronto» = faltan 2 días o menos.</>}
      insight={top ? <>Atender primero: pedido <b>{top.id}</b> ({top.prioridad}), lleva {top.espera} días esperando.</> : filas.length ? <>No hay pedidos atrasados en esta jornada.</> : undefined}>
      <BarrasH datos={datos} formato={num} seleccion={prio === "Todas" ? null : prio} onClick={(k) => setPrio(prio === k ? "Todas" : k)} />
    </Tarjeta>
  );
}

function Ritmo({ dia, filtro }: { dia: string; filtro: (v: Venta) => boolean }) {
  const datos = useMemo(() => {
    const desde = sumarDias(dia, -13);
    const ent = new Map<string, number>(), sal = new Map<string, number>();
    for (const v of VENTAS) {
      if (!filtro(v)) continue;
      if (v.fecha >= desde && v.fecha <= dia) ent.set(v.fecha, (ent.get(v.fecha) ?? 0) + 1);
      if (v.envio >= desde && v.envio <= dia) sal.set(v.envio, (sal.get(v.envio) ?? 0) + 1);
    }
    return Array.from({ length: 14 }, (_, i) => {
      const d = sumarDias(desde, i);
      return { d, etq: d.slice(8, 10) + "/" + d.slice(5, 7), entran: ent.get(d) ?? 0, salen: sal.get(d) ?? 0 };
    });
  }, [dia, filtro]);
  return (
    <Tarjeta className="c12" titulo="Últimos 14 días" sub="Pedidos que entraron y que salieron cada día">
      <div className="leyenda"><span><i style={{ background: "var(--s1)" }} />Entran</span><span><i style={{ background: "var(--s2)" }} />Salen</span></div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={datos} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="etq" {...ejeProps} interval={0} />
            <YAxis {...ejeProps} allowDecimals={false} width={30} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip titulo={(p) => fechaLarga(p.d)} filas={(p) => [["Entran", num(p.entran)], ["Salen", num(p.salen)]]} />} />
            <Bar dataKey="entran" fill="var(--s1)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="salen" fill="var(--s2)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Tarjeta>
  );
}

function Dia({ titulo, sub, filas, tipo }: { titulo: string; sub: string; filas: Venta[]; tipo: "entran" | "salen" }) {
  const cols: Col<Venta>[] = [
    { k: "id", t: "Pedido", v: (r) => r.id, orden: (r) => r.id },
    { k: "prio", t: "Prioridad", v: (r) => r.prioridad, orden: (r) => -PRIORIDADES.indexOf(r.prioridad) },
    { k: "prod", t: "Producto", v: (r) => r.producto, orden: (r) => r.producto },
    { k: "uds", t: "Unidades", v: (r) => num(r.unidades), orden: (r) => r.unidades, num: true },
    { k: "pais", t: "Destino", v: (r) => r.pais, orden: (r) => r.pais },
    tipo === "salen"
      ? { k: "dias", t: "Tardó", v: (r) => <>{r.dias} d{r.dias > (PLAZO_MAX[r.prioridad] ?? 35) && <> <span className="bandera">fuera de plazo</span></>}</>, orden: (r) => r.dias, num: true }
      : { k: "lim", t: "Enviar antes del", v: (r) => fecha(sumarDias(r.fecha, PLAZO_MAX[r.prioridad] ?? 35)), orden: (r) => sumarDias(r.fecha, PLAZO_MAX[r.prioridad] ?? 35) },
  ];
  return (
    <Tarjeta className="c6" titulo={titulo} sub={sub}>
      <Tabla filas={filas} cols={cols} clave={(r) => r.id} ordenInicial="prio" porPagina={6} />
    </Tarjeta>
  );
}
