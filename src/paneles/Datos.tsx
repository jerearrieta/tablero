"use client";
import { CLIENTES, PROVEEDORES, VENTAS } from "@/lib/datos";
import { num } from "@/lib/formato";
import { Seccion, Tarjeta } from "@/components/ui";

export function Datos() {
  const antesAlta = CLIENTES.filter((c) => c.antesAlta).length;
  const dupCli = CLIENTES.filter((c) => c.emailDup).length;
  const dupProv = PROVEEDORES.filter((p) => p.emailDup).length;
  return (
    <>
      <div className="intro">
        <div>
          <h1>Datos y supuestos</h1>
          <p>Qué datos usa el tablero, cómo se conectaron las tres fuentes y qué limitaciones hay que tener en cuenta al leer los resultados.</p>
        </div>
      </div>
      <div className="grid">
        <Tarjeta className="c4" titulo="Ventas" sub="1000-Registros-de-ventas.xlsx">
          <p style={{ margin: 0, color: "var(--text-2)" }}>{num(VENTAS.length)} pedidos del 1 de enero de 2020 al 7 de noviembre de 2022: fecha de pedido y envío, país y zona de destino, producto, canal, prioridad, unidades, precio, coste, venta y margen.</p>
          <a className="btn-link" href="/datos/ventas.csv" download style={{ display: "inline-block" }}>Descargar ventas.csv (limpio)</a>
        </Tarjeta>
        <Tarjeta className="c4" titulo="Clientes" sub="Lista-de-clientes-con-nombre-y-direccion.xlsx">
          <p style={{ margin: 0, color: "var(--text-2)" }}>{num(CLIENTES.length)} clientes de Estados Unidos y Reino Unido con grupo A–E, fecha de nacimiento, fecha de alta, dirección y contacto. Se añadieron las métricas RFM calculadas desde ventas.</p>
          <a className="btn-link" href="/datos/clientes.csv" download style={{ display: "inline-block" }}>Descargar clientes.csv (limpio)</a>
        </Tarjeta>
        <Tarjeta className="c4" titulo="Proveedores" sub="Listado-de-proveedores-y-contactos.xlsx">
          <p style={{ margin: 0, color: "var(--text-2)" }}>{num(PROVEEDORES.length)} proveedores con contacto, saldo pendiente y fecha de última compra. Se añadió el estado de actividad y la categoría asignada.</p>
          <a className="btn-link" href="/datos/proveedores.csv" download style={{ display: "inline-block" }}>Descargar proveedores.csv (limpio)</a>
        </Tarjeta>
      </div>

      <Seccion titulo="Supuestos de modelado" sub="Necesarios para cruzar las fuentes" />
      <div className="grid">
        <div className="supuesto c6">
          <h4>1. Ventas → Clientes: por los 3 primeros dígitos del ID</h4>
          <p>Los ID de cliente de ventas (C1008–C9987) no existen en el archivo de clientes (C0001–C0999). Se enlazan tomando los tres primeros dígitos: <b>C2421 → C0242</b>. Así los 1,000 pedidos quedan enlazados con 580 clientes y 419 clientes quedan «Sin compras». En {antesAlta} clientes el primer pedido es anterior a su fecha de alta, señal de que el enlace es aproximado.</p>
        </div>
        <div className="supuesto c6">
          <h4>2. Ventas → Proveedores: asignación simulada por categoría</h4>
          <p>Ventas no indica proveedor. A cada proveedor se le asignó una de las 12 categorías de producto (rotando en orden alfabético) y cada pedido se asignó de forma determinista a un proveedor de su categoría. <b>Es una simulación</b> para mostrar el cruce; los análisis de saldo, actividad y última compra sí son datos reales del archivo.</p>
        </div>
        <div className="supuesto c6">
          <h4>3. Zonas geográficas corregidas</h4>
          <p>15 países de Oriente Medio venían clasificados en «África»; se agruparon en una zona nueva, <b>Oriente Medio</b>. Afganistán, Pakistán y Timor Oriental pasaron a Asia. La zona original se conserva en los CSV.</p>
        </div>
        <div className="supuesto c6">
          <h4>4. 2022 es un año parcial</h4>
          <p>Los datos llegan al 7 de noviembre de 2022. Para comparar años se usa el acumulado enero–octubre. La fecha de corte para recencia y actividad de proveedores es el <b>8 de noviembre de 2022</b>.</p>
        </div>
        <div className="supuesto c12">
          <h4>Cómo se agruparon los clientes (RFM)</h4>
          <p>A cada cliente se le dan tres notas del 1 al 5: <b>R</b>, cuánto hace de su última compra (5 = compró hace poco); <b>F</b>, cuántos pedidos hizo (5 = cinco o más); y <b>M</b>, cuánto gastó en total (5 = de los que más gastaron). Según esas notas, cada cliente cae en un grupo con nombre, como «Campeones» (compran seguido y mucho) o «En riesgo» (eran buenos clientes y dejaron de comprar). Los grupos A–E del archivo original no se usan porque los cinco gastan casi lo mismo.</p>
        </div>
      </div>

      <Seccion titulo="Calidad de datos" sub="Detectado en la auditoría de los Excel" />
      <div className="grid">
        <Tarjeta className="c12" titulo="Incidencias y tratamiento">
          <div className="tabla-env">
            <table className="tabla">
              <thead><tr><th>Incidencia</th><th>Fuente</th><th>Tratamiento</th></tr></thead>
              <tbody>
                <tr><td>ID de cliente de ventas fuera del rango del maestro</td><td>Ventas / Clientes</td><td style={{ whiteSpace: "normal" }}>Mapeo por 3 primeros dígitos (supuesto 1)</td></tr>
                <tr><td>Ventas sin proveedor</td><td>Ventas / Proveedores</td><td style={{ whiteSpace: "normal" }}>Asignación simulada por categoría (supuesto 2)</td></tr>
                <tr><td>Zonas mal asignadas (18 países)</td><td>Ventas</td><td style={{ whiteSpace: "normal" }}>Reclasificadas; se conserva la zona original</td></tr>
                <tr><td>Direcciones del Reino Unido incompletas</td><td>Clientes</td><td style={{ whiteSpace: "normal" }}>Faltan calle o ciudad en 119 filas y código postal en 219; el original no los trae. No afecta a los análisis.</td></tr>
                <tr><td>Emails repetidos</td><td>Clientes / Proveedores</td><td style={{ whiteSpace: "normal" }}>Marcados: {dupCli} clientes y {dupProv} proveedores comparten email con otro registro</td></tr>
                <tr><td>Primer pedido anterior a la fecha de alta</td><td>Clientes</td><td style={{ whiteSpace: "normal" }}>{antesAlta} clientes marcados; se mantienen</td></tr>
                <tr><td>Proveedores sin compras recientes</td><td>Proveedores</td><td style={{ whiteSpace: "normal" }}>Ninguna compra en los últimos 6 meses: puede indicar un listado desactualizado</td></tr>
              </tbody>
            </table>
          </div>
        </Tarjeta>
      </div>

      <Seccion titulo="Cómo usar el tablero" />
      <div className="grid">
        <div className="supuesto c4"><h4>Filtros cruzados</h4><p>Los filtros de la barra superior y los clics en barras, países, celdas o filas filtran todos los gráficos a la vez. Las etiquetas naranjas muestran lo que está activo; la × lo quita.</p></div>
        <div className="supuesto c4"><h4>Drill-down</h4><p>En «Venta por año» del panel operativo, haga clic en un año, luego en un trimestre y luego en un mes para llegar al detalle diario. La ruta permite volver atrás.</p></div>
        <div className="supuesto c4"><h4>Presentación</h4><p>La pestaña Presentación recorre los hallazgos con las flechas ← →. Cada diapositiva enlaza al panel y filtro que la respalda.</p></div>
      </div>
    </>
  );
}
