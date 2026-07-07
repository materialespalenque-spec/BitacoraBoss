(function(){

// ============================================================
// CONFIG: tareas de la agenda
// ============================================================
const AREAS = {
  fin:{label:"Finanzas"}, compras:{label:"Compras / Inventario"},
  ventas:{label:"Ventas / Clientes"}, personal:{label:"Personal / Equipo"},
  ops:{label:"Operaciones / Logística"}, estr:{label:"Estrategia / Crecimiento"},
  dev:{label:"Desarrollo personal"}
};

const TASKS = {
  diario: [
    {id:"d1", area:"fin", text:"Revisar corte de caja del día anterior (Periférico y Libertad)"},
    {id:"d2", area:"fin", text:"Revisar efectivo disponible vs. pagos programados del día"},
    {id:"d3", area:"compras", text:"Revisar alertas de stock crítico (SKUs clase A)"},
    {id:"d4", area:"ops", text:"Recorrido o revisión remota de ambas sucursales"},
    {id:"d5", area:"ops", text:"Revisar folios de entrega pendientes o duplicados"},
    {id:"d6", area:"ventas", text:"Seguimiento a cotizaciones grandes o clientes clave del día"},
    {id:"d7", area:"personal", text:"Check-in breve con encargados de sucursal"},
    {id:"d8", area:"estr", text:"Bloque de tiempo protegido para proyecto en curso (POS, etc.)"},
    {id:"d9", area:"dev", text:"Avance de estudio (ISEI / IEU) — mínimo 20 min"},
  ],
  semanal: [
    {id:"s1", area:"fin", text:"Revisar dashboard financiero (KPIs y semáforos) vs. meta del mes"},
    {id:"s2", area:"compras", text:"Contacto con al menos un proveedor clave (crédito / precio)"},
    {id:"s3", area:"compras", text:"Revisar inventario clase A+B contra lista de 85 SKUs"},
    {id:"s4", area:"personal", text:"Reunión breve de equipo (una o ambas sucursales)"},
    {id:"s5", area:"ventas", text:"Revisar cartera de crédito a clientes (meta: reducirla a cero)"},
    {id:"s6", area:"ops", text:"Revisar métricas de flotilla / entregas / fletes"},
    {id:"s7", area:"estr", text:"Revisar avance de metas semanales y ajustar prioridades"},
  ],
  mensual: [
    {id:"m1", area:"fin", text:"Cerrar y analizar estado de resultados del mes (ambas sucursales)"},
    {id:"m2", area:"fin", text:"Comparar presupuesto vs. real y actualizar proyecciones"},
    {id:"m3", area:"compras", text:"Revisar mezcla de ventas (construcción vs. ferretería) hacia 50/50"},
    {id:"m4", area:"personal", text:"Evaluación breve de desempeño con encargados"},
    {id:"m5", area:"estr", text:"Sesión de planeación mensual — revisar hoja de ruta a 12 meses"},
    {id:"m6", area:"dev", text:"Revisar avance ISEI / explorar siguiente paso hacia IEU"},
  ]
};

const CATEGORIAS = {
  proveedor: ["Materiales de construcción", "Ferretería / Insumos", "Flete de proveedor", "Otro"],
  operativo: ["Renta", "Nómina", "Luz", "Agua", "Teléfono / Internet", "Combustible",
              "Mantenimiento vehículos", "Mantenimiento sucursal", "Papelería / Oficina",
              "Impuestos", "Contador", "Publicidad", "Otro"],
  personal: ["Retiro del dueño", "Gasto personal", "Otro"]
};
const SUCURSALES = ["Periférico", "Libertad", "General"];

// ============================================================
// Fechas / claves
// ============================================================
const today = new Date();
const pad = n => String(n).padStart(2,"0");
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function weekKey(d){
  const t = new Date(d); t.setHours(0,0,0,0);
  t.setDate(t.getDate() + 3 - ((t.getDay()+6)%7));
  const week1 = new Date(t.getFullYear(),0,4);
  const wn = 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay()+6)%7)) / 7);
  return `${t.getFullYear()}-W${pad(wn)}`;
}
const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const KEYS = { diario: dateKey(today), semanal: weekKey(today), mensual: monthKey(today) };

document.getElementById("dayNum").textContent = pad(today.getDate());
document.getElementById("fullDate").textContent = today.toLocaleDateString('es-MX',{weekday:'long', month:'long', year:'numeric'});

// ============================================================
// Estado
// ============================================================
let state = { diario:{done:[], times:{}, notes:{}}, semanal:{done:[]}, mensual:{done:[]} };
let expenses = [];
let currentTab = "diario";
let expenseFilterTipo = "";
let expenseFilterSucursal = "";
let expenseMonth = monthKey(today);

// ============================================================
// Conexión
// ============================================================
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
function updateStatus(){
  const dot = document.getElementById("statusDot");
  const txt = document.getElementById("statusText");
  if (navigator.onLine){ dot.className="status-dot online"; txt.textContent="En línea · sincronizado"; }
  else { dot.className="status-dot offline"; txt.textContent="Sin conexión · guardando local"; }
}
updateStatus();

// ============================================================
// Firestore listeners (tiempo real, multi-dispositivo)
// ============================================================
["diario","semanal","mensual"].forEach(freq=>{
  db.collection("agenda").doc(`${freq}_${KEYS[freq]}`).onSnapshot(doc=>{
    if (doc.exists) state[freq] = Object.assign({done:[],times:{},notes:{}}, doc.data());
    if (currentTab === freq || currentTab === "dashboard") render();
  }, err=>console.error("Error leyendo agenda:", err));
});

db.collection("gastos").orderBy("fecha","desc").limit(500).onSnapshot(snap=>{
  expenses = snap.docs.map(d=>({id:d.id, ...d.data()}));
  if (currentTab === "gastos") render();
}, err=>console.error("Error leyendo gastos:", err));

function saveAgenda(freq){
  db.collection("agenda").doc(`${freq}_${KEYS[freq]}`).set(state[freq], {merge:true})
    .catch(err=>console.error("Error guardando agenda:", err));
}

// ============================================================
// Toggle tareas
// ============================================================
function toggleTask(freq, id){
  const arr = state[freq].done || [];
  const i = arr.indexOf(id);
  if (i === -1){
    arr.push(id);
    if (freq === "diario"){
      state.diario.times = state.diario.times || {};
      state.diario.times[id] = new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
    }
  } else {
    arr.splice(i,1);
    if (freq === "diario" && state.diario.times) delete state.diario.times[id];
  }
  state[freq].done = arr;
  saveAgenda(freq);
  render();
}

let noteTimer;
function saveNoteDebounced(){
  clearTimeout(noteTimer);
  noteTimer = setTimeout(()=> saveAgenda("diario"), 600);
}

// ============================================================
// Render: checklist
// ============================================================
function renderChecklist(freq){
  const grouped = {};
  TASKS[freq].forEach(t=>{ (grouped[t.area] = grouped[t.area] || []).push(t); });
  let html = "";
  Object.keys(grouped).forEach(areaKey=>{
    html += `<div class="area-block"><div class="area-label">${AREAS[areaKey].label}</div>`;
    grouped[areaKey].forEach(t=>{
      const done = (state[freq].done||[]).includes(t.id);
      const time = (freq==="diario" && state.diario.times) ? state.diario.times[t.id] : null;
      html += `<div class="task ${done?'done':''}" data-freq="${freq}" data-id="${t.id}">
        <div class="stamp">${done?'✓':''}</div>
        <div class="task-text">${t.text}</div>
        ${time?`<div class="task-time">${time}</div>`:""}
      </div>`;
    });
    html += `</div>`;
  });
  if (freq === "diario"){
    const notes = state.diario.notes || {};
    html += `<div class="notes"><label>Decisión importante de hoy</label>
      <textarea id="noteDecision" placeholder="¿Qué decidiste hoy que vale la pena recordar?">${notes.decision||""}</textarea></div>
    <div class="notes" style="margin-top:8px;"><label>Pendiente para mañana</label>
      <textarea id="notePending" placeholder="¿Qué le toca a mañana?">${notes.pending||""}</textarea></div>`;
  }
  return html;
}

function pctFreq(freq){
  const total = TASKS[freq].length;
  const done = (state[freq].done||[]).length;
  return total ? Math.round((done/total)*100) : 0;
}

// ============================================================
// Render: dashboard
// ============================================================
function renderDashboard(){
  const areaStats = {};
  Object.keys(AREAS).forEach(k=>areaStats[k]={done:0,total:0});
  ["diario","semanal","mensual"].forEach(freq=>{
    TASKS[freq].forEach(t=>{
      areaStats[t.area].total++;
      if ((state[freq].done||[]).includes(t.id)) areaStats[t.area].done++;
    });
  });
  let barsHtml = "";
  Object.keys(areaStats).forEach(k=>{
    const s = areaStats[k];
    const p = s.total ? Math.round((s.done/s.total)*100) : 0;
    barsHtml += `<div class="bar-row"><div class="name">${AREAS[k].label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${p}%"></div></div>
      <div class="bar-pct">${p}%</div></div>`;
  });
  return `
    <div class="dash">
      <div class="kpi"><div class="num">${pctFreq('diario')}%</div><div class="label">Hoy</div></div>
      <div class="kpi"><div class="num">${pctFreq('semanal')}%</div><div class="label">Esta semana</div></div>
      <div class="kpi"><div class="num">${pctFreq('mensual')}%</div><div class="label">Este mes</div></div>
    </div>
    <div class="area-label" style="margin-bottom:10px;">Cumplimiento por área</div>
    ${barsHtml}
    <div class="reset-link" id="resetBtn">Borrar registros de hoy</div>
  `;
}

// ============================================================
// Render: gastos
// ============================================================
function renderGastos(){
  const tipoOptions = Object.keys(CATEGORIAS).map(t=>
    `<option value="${t}">${t[0].toUpperCase()+t.slice(1)}</option>`).join("");

  const monthExpenses = expenses.filter(e => (e.fecha||"").startsWith(expenseMonth));
  const filtered = monthExpenses.filter(e=>
    (!expenseFilterTipo || e.tipo===expenseFilterTipo) &&
    (!expenseFilterSucursal || e.sucursal===expenseFilterSucursal)
  );

  const totals = {proveedor:0, operativo:0, personal:0};
  monthExpenses.forEach(e=> totals[e.tipo] = (totals[e.tipo]||0) + Number(e.monto||0));
  const grandTotal = totals.proveedor + totals.operativo + totals.personal;

  const fmt = n => "$" + n.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2});

  let rowsHtml = "";
  if (filtered.length === 0){
    rowsHtml = `<div class="empty-msg">Sin gastos registrados con este filtro.</div>`;
  } else {
    filtered.forEach(e=>{
      rowsHtml += `<div class="expense-row">
        <div class="exp-left">
          <div class="exp-cat"><span class="tag tag-${e.tipo}">${e.tipo}</span>${e.categoria}${e.proveedor?` · ${e.proveedor}`:""}</div>
          <div class="exp-meta">${e.fecha} · ${e.sucursal}${e.metodoPago?` · ${e.metodoPago}`:""}</div>
        </div>
        <div class="exp-amount">${fmt(Number(e.monto||0))}</div>
        <div class="del-x" data-id="${e.id}" title="Eliminar">✕</div>
      </div>`;
    });
  }

  return `
    <div class="expense-form">
      <div class="form-row">
        <div class="form-group"><label>Fecha</label><input type="date" id="expFecha" value="${dateKey(today)}"></div>
        <div class="form-group"><label>Tipo</label>
          <select id="expTipo">${tipoOptions}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Categoría</label><select id="expCategoria"></select></div>
        <div class="form-group"><label>Sucursal</label>
          <select id="expSucursal">${SUCURSALES.map(s=>`<option value="${s}">${s}</option>`).join("")}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Monto (MXN)</label><input type="number" id="expMonto" step="0.01" placeholder="0.00"></div>
        <div class="form-group"><label>Método de pago</label>
          <select id="expMetodo"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Crédito proveedor</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" id="proveedorGroup"><label>Proveedor (opcional)</label><input type="text" id="expProveedor" placeholder="Nombre del proveedor"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Notas (opcional)</label><textarea id="expNotas" placeholder="Detalle adicional" style="min-height:36px;"></textarea></div>
      </div>
      <button class="btn-primary" id="btnAddExpense">Registrar gasto</button>
    </div>

    <div class="dash">
      <div class="kpi"><div class="num" style="font-size:18px;">${fmt(totals.proveedor)}</div><div class="label">Proveedores</div></div>
      <div class="kpi"><div class="num" style="font-size:18px;">${fmt(totals.operativo)}</div><div class="label">Operativo</div></div>
      <div class="kpi"><div class="num" style="font-size:18px;">${fmt(totals.personal)}</div><div class="label">Personal</div></div>
      <div class="kpi"><div class="num" style="font-size:18px;">${fmt(grandTotal)}</div><div class="label">Total del mes</div></div>
    </div>

    <div class="expense-filters">
      <input type="month" id="expMonthPicker" value="${expenseMonth}">
      <select id="filterTipo"><option value="">Todos los tipos</option>${Object.keys(CATEGORIAS).map(t=>`<option value="${t}" ${expenseFilterTipo===t?"selected":""}>${t}</option>`).join("")}</select>
      <select id="filterSucursal"><option value="">Todas las sucursales</option>${SUCURSALES.map(s=>`<option value="${s}" ${expenseFilterSucursal===s?"selected":""}>${s}</option>`).join("")}</select>
    </div>

    ${rowsHtml}
  `;
}

function updateCategoriaOptions(){
  const tipo = document.getElementById("expTipo").value;
  const sel = document.getElementById("expCategoria");
  sel.innerHTML = CATEGORIAS[tipo].map(c=>`<option value="${c}">${c}</option>`).join("");
  document.getElementById("proveedorGroup").style.display = tipo === "proveedor" ? "" : "none";
}

async function addExpense(){
  const btn = document.getElementById("btnAddExpense");
  const monto = parseFloat(document.getElementById("expMonto").value);
  if (!monto || monto <= 0){ alert("Ingresa un monto válido."); return; }
  btn.disabled = true; btn.textContent = "Guardando...";
  const data = {
    fecha: document.getElementById("expFecha").value,
    tipo: document.getElementById("expTipo").value,
    categoria: document.getElementById("expCategoria").value,
    sucursal: document.getElementById("expSucursal").value,
    monto: monto,
    metodoPago: document.getElementById("expMetodo").value,
    proveedor: document.getElementById("expProveedor").value || "",
    notas: document.getElementById("expNotas").value || "",
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  try{
    await db.collection("gastos").add(data);
  }catch(e){
    console.error("Error guardando gasto:", e);
    alert("No se pudo guardar. Revisa tu conexión.");
  }
  btn.disabled = false; btn.textContent = "Registrar gasto";
  document.getElementById("expMonto").value = "";
  document.getElementById("expProveedor").value = "";
  document.getElementById("expNotas").value = "";
}

async function deleteExpense(id){
  if (!confirm("¿Eliminar este gasto?")) return;
  try{ await db.collection("gastos").doc(id).delete(); }
  catch(e){ console.error("Error eliminando gasto:", e); }
}

// ============================================================
// Render principal
// ============================================================
function render(){
  const content = document.getElementById("content");

  if (currentTab === "dashboard"){
    content.innerHTML = renderDashboard();
    document.getElementById("resetBtn").onclick = ()=>{
      state.diario = {done:[], times:{}, notes:state.diario.notes||{}};
      saveAgenda("diario");
    };
    return;
  }

  if (currentTab === "gastos"){
    content.innerHTML = renderGastos();
    updateCategoriaOptions();
    document.getElementById("expTipo").addEventListener("change", updateCategoriaOptions);
    document.getElementById("btnAddExpense").addEventListener("click", addExpense);
    document.getElementById("expMonthPicker").addEventListener("change", (e)=>{ expenseMonth = e.target.value; render(); });
    document.getElementById("filterTipo").addEventListener("change", (e)=>{ expenseFilterTipo = e.target.value; render(); });
    document.getElementById("filterSucursal").addEventListener("change", (e)=>{ expenseFilterSucursal = e.target.value; render(); });
    content.querySelectorAll(".del-x").forEach(el=>{
      el.addEventListener("click", ()=> deleteExpense(el.dataset.id));
    });
    return;
  }

  // diario / semanal / mensual
  content.innerHTML = renderChecklist(currentTab);
  content.querySelectorAll(".task").forEach(el=>{
    el.addEventListener("click", ()=> toggleTask(el.dataset.freq, el.dataset.id));
  });
  if (currentTab === "diario"){
    const dEl = document.getElementById("noteDecision");
    const pEl = document.getElementById("notePending");
    dEl.addEventListener("input", ()=>{
      state.diario.notes = state.diario.notes || {};
      state.diario.notes.decision = dEl.value;
      saveNoteDebounced();
    });
    pEl.addEventListener("input", ()=>{
      state.diario.notes = state.diario.notes || {};
      state.diario.notes.pending = pEl.value;
      saveNoteDebounced();
    });
  }
}

document.querySelectorAll(".tab").forEach(tab=>{
  tab.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.dataset.tab;
    render();
  });
});

render();
})();
