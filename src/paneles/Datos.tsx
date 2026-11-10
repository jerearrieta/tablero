"use client";
import { CLIENTES, PROVEEDORES, VENTAS } from "@/lib/datos";
import { num } from "@/lib/formato";
import { Seccion } from "@/components/ui";

export function Datos() {
  const fuentes = [
    { nombre: "Ventas", detalle: `${num(VENTAS.length)} pedidos, ene 2020 – 7 nov 2022`, csv: "/datos/ventas.csv" },
    { nombre: "Clientes", detalle: `${num(CLIENTES.length)} clientes de EE. UU. y Reino Unido`, csv: "/datos/clientes.csv" },
    { nombre: "Proveedores", detalle: `${num(PROVEEDORES.length)} proveedores con saldo y última compra`, csv: "/datos/proveedores.csv" },
  ];
  const supuestos = [
    { t: "Clientes enlazados por ID aproximado", p: <>Los ID de ventas no coinciden con los de clientes. Se unen por los 3 primeros dígitos (<b>C2421 → C0242</b>).</> },
    { t: "Proveedores simulados", p: <>Ventas no dice quién proveyó cada pedido, así que se asignó por categoría de producto. Saldos y fechas de proveedores sí son reales.</> },
    { t: "Zona nueva: Oriente Medio", p: <>15 países de Oriente Medio estaban dentro de «África». Se separaron.</> },
    { t: "2022 está incompleto", p: <>Los datos terminan el 7 de noviembre de 2022. Para comparar años se usa enero a octubre.</> },
  ];
  return (
    <>
      <div className="intro">
        <div>
          <h1>Datos</h1>
          <p>De dónde salen los números y qué hay que tener en cuenta al leerlos.</p>
        </div>
      </div>

      <Seccion titulo="Fuentes" />
      <div className="grid">
        {fuentes.map((f) => (
          <div key={f.nombre} className="supuesto c4">
            <h4>{f.nombre}</h4>
            <p>{f.detalle}</p>
            <a className="btn-link" href={f.csv} download style={{ display: "inline-block" }}>Descargar CSV</a>
          </div>
        ))}
      </div>

      <Seccion titulo="A tener en cuenta" />
      <div className="grid">
        {supuestos.map((s, i) => (
          <div key={s.t} className="supuesto c6">
            <h4>{i + 1}. {s.t}</h4>
            <p>{s.p}</p>
          </div>
        ))}
      </div>
    </>
  );
}
