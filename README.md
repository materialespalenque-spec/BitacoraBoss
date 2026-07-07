# Bitácora del Dueño — Materiales Palenque

PWA para agenda operativa diaria/semanal/mensual + control de gastos (proveedor / operativo / personal), sincronizada en tiempo real vía Firebase Firestore. Funciona en el navegador del celular como app instalable.

## 1. Crear el proyecto de Firebase

1. Ve a https://console.firebase.google.com y crea un proyecto nuevo, ej. **`bitacora-dueno-mp`**.
2. En el menú lateral: **Build > Firestore Database > Crear base de datos**.
   - Modo: producción.
   - Región: la más cercana disponible (`us-central1` suele ser buena opción para México).
3. En **Configuración del proyecto (ícono de engrane) > General**, baja hasta "Tus apps" y agrega una app **Web (`</>`)**.
4. Copia el objeto `firebaseConfig` que te muestra y pégalo en `firebase-config.js`, reemplazando los valores `TU_...`.
5. En **Firestore Database > Reglas**, pega el contenido de `firestore.rules` (incluido en esta carpeta) y publica.
   - ⚠️ Esa regla deja la base abierta a quien tenga la URL de tu app — no es autenticación real, solo evita accesos accidentales. Si más adelante quieres agregar a un encargado con su propio acceso, lo correcto es migrar a Firebase Authentication; avísame cuando llegue ese momento.

## 2. Subir a GitHub Pages

1. Dentro de tu repo `materialespalenque-spec`, crea una carpeta nueva, ej. `bitacora-dueno/`.
2. Copia todos los archivos de esta carpeta ahí:
   - `index.html`
   - `style.css`
   - `app.js`
   - `firebase-config.js` (ya con tus valores reales)
   - `manifest.json`
   - `service-worker.js`
   - `icons/` (agrega tus propios íconos 192x192 y 512x512 — puedes generarlos gratis en https://realfavicongenerator.net a partir de un logo)
3. Activa GitHub Pages para esa ruta si aún no lo está (Settings > Pages), igual que hiciste con FolioCTR y las demás apps.
4. Abre la URL resultante desde tu celular y en el navegador elige **"Agregar a pantalla de inicio"** para que funcione como app instalada.

## 3. Estructura de datos en Firestore

**Colección `agenda`** — un documento por período:
- `diario_2026-07-07` → `{ done: [...ids], times: {id: "hh:mm"}, notes: {decision, pending} }`
- `semanal_2026-W28` → `{ done: [...ids] }`
- `mensual_2026-07` → `{ done: [...ids] }`

**Colección `gastos`** — un documento por gasto:
```
{
  fecha: "2026-07-07",
  tipo: "proveedor" | "operativo" | "personal",
  categoria: "Materiales de construcción" | "Renta" | ... ,
  sucursal: "Periférico" | "Libertad" | "General",
  monto: 1500.00,
  metodoPago: "Efectivo" | "Transferencia" | "Tarjeta" | "Crédito proveedor",
  proveedor: "Nombre del proveedor" (opcional),
  notas: "..." (opcional),
  timestamp: <server timestamp>
}
```

## 4. Para tu estado de resultados de fin de mes

En la pestaña **Gastos**, el selector de mes (arriba, junto a los filtros) te deja ver el total del mes que necesites, ya desglosado en Proveedor / Operativo / Personal. Puedes tomar esos tres totales y vaciarlos directo en las columnas correspondientes de tu Excel — y si más adelante quieres, puedo ayudarte a exportar esto a CSV o conectarlo directo a tu workbook.

## 5. Costo

Firestore tiene una capa gratuita amplia (50k lecturas / 20k escrituras por día). Para el volumen de una sola persona capturando tareas y gastos, no deberías acercarte al límite ni pagar nada.
