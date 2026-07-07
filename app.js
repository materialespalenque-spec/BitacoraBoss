(function(){

// ============================================================
// CONFIG: áreas, tareas por momento del día, categorías
// ============================================================
const AREAS = {
  fin:{label:"Finanzas"}, compras:{label:"Compras / Inventario"},
  ventas:{label:"Ventas / Clientes"}, personal:{label:"Personal / Equipo"},
  ops:{label:"Operaciones / Logística"}, estr:{label:"Estrategia / Crecimiento"},
  dev:{label:"Desarrollo personal"}
};

const MOMENTOS = {
  manana:   {label:"Mañana",        hour:8,  icon:"☀️"},
  mediodia: {label:"Mediodía",      hour:13, icon:"🕐"},
  tarde:    {label:"Tarde / Cierre",hour:18, icon:"🌙"}
};
const MOMENTO_ORDER = ["manana","mediodia","tarde"];

const TASKS = {
  diario: [
    {id:"d1", area:"fin",      momento:"manana",   text:"Revisar corte de caja del día anterior (Periférico y Libertad)"},
    {id:"d3", area:"compras",  momento:"manana",   text:"Revisar alertas de stock crítico (SKUs clase A)"},
    {id:"d4", area:"ops",      momento:"manana",   text:"Recorrido o revisión remota de ambas sucursales"},
    {id:"d7", area:"personal", momento:"manana",   text:"Check-in breve con encargados de sucursal"},
    {id:"d6", area:"ventas",   momento:"mediodia", text:"Seguimiento a cotizaciones grandes o clientes clave del día"},
    {id:"d5", area:"ops",      momento:"mediodia", text:"Revisar folios de entrega pendientes o duplicados"},
    {id:"d8", area:"estr",     momento:"mediodia", text:"Bloque de tiempo protegido para proyecto en curso (POS, etc.)"},
    {id:"d2", area:"fin",      momento:"tarde",    text:"Revisar efectivo disponible vs. pagos programados de mañana"},
    {id:"d9", area:"dev",      momento:"tarde",    text:"Avance de estudio (ISEI / IEU) — mínimo 20 min"},
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
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS_CORTOS = ["D","L","M","M","J","V","S"];

const pad = n => String(n).padStart(2,"0");
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function mondayOf(d){
  const t = new Date(d); t.setHours(0,0,0,0);
  const day = (t.getDay()+6)%7; // lunes=0
  t.setDate(t.getDate()-day);
  return t;
}
function weekKey(d){
  const t = mondayOf(d);
  const thursday = new Date(t); thursday.setDate(t.getDate()+3);
  const week1 = new Date(thursday.getFullYear(),0,4);
  const wn = 1 + Math.round(((thursday - mondayOf(week1)) / 86400000) / 7);
  return `${thursday.getFullYear()}-W${pad(wn)}`;
}
const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const addDays = (d,n) => { const t=new Date(d); t.setDate(t.getDate()+n); return t; };
const addMonths = (d,n) => { const t=new Date(d); t.setMonth(t.getMonth()+n); return t; };

const realToday = new Date();
document.getElementById("dayNum").textContent = pad(realToday.getDate());
document.getElementById("fullDate").textContent = realToday.toLocaleDateString('es-MX',{weekday:'long', month:'long', year:'numeric'});

// ============================================================
// Estado
// ============================================================
const emptyDiario = ()=>({done:[], times:{}, notes:{}});
const emptyList = ()=>({done:[]});

let viewDates = { diario:new Date(realToday), semanal:new Date(realToday), mensual:new Date(realToday) };
let state    = { diario:emptyDiario(), semanal:emptyList(), mensual:emptyList() };
let stateNow = { diario:emptyDiario(), semanal:emptyList(), mensual:emptyList() }; // siempre real hoy/semana/mes, para el dashboard
let unsub    = { diario:null, semanal:null, mensual:null };
let unsubNow = { diario:null, semanal:null, mensual:null };

let expenses = [];
let currentTab = "diario";
let expenseFilterTipo = "";
let expenseFilterSucursal = "";
let expenseMonth = monthKey(realToday);
let histYear = realToday.getFullYear();
let histMode = "6m"; // "6m" | "anio"

function getKey(freq, date){
  if (freq==="diario") return dateKey(date);
  if (freq==="semanal") return weekKey(date);
  return monthKey(date);
}

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
// Firestore: suscripción dinámica por periodo navegado
// ============================================================
function subscribeAgenda(freq){
  if (unsub[freq]) unsub[freq]();
  const key = getKey(freq, viewDates[freq]);
  unsub[freq] = db.collection("agenda").doc(`${freq}_${key}`).onSnapshot(doc=>{
    state[freq] = Object.assign(freq==="diario"?emptyDiario():emptyList(), doc.exists?doc.data():{});
    if (currentTab === freq) render();
  }, err=>console.error("Error leyendo agenda:", err));
}
["diario","semanal","mensual"].forEach(subscribeAgenda);

// suscripción fija al periodo real actual, para KPIs del dashboard (independiente de la navegación)
["diario","semanal","mensual"].forEach(freq=>{
  const key = getKey(freq, realToday);
  unsubNow[freq] = db.collection("agenda").doc(`${freq}_${key}`).onSnapshot(doc=>{
    stateNow[freq] = Object.assign(freq==="diario"?emptyDiario():emptyList(), doc.exists?doc.data():{});
    if (currentTab === "dashboard") render();
  }, err=>console.error("Error leyendo agenda (now):", err));
});

db.collection("gastos").orderBy("fecha","desc").limit(500).onSnapshot(snap=>{
  expenses = snap.docs.map(d=>({id:d.id, ...d.data()}));
  if (currentTab === "gastos") render();
}, err=>console.error("Error leyendo gastos:", err));

function saveAgenda(freq){
  const key = getKey(freq, viewDates[freq]);
  db.collection("agenda").doc(`${freq}_${key}`).set(state[freq], {merge:true})
    .catch(err=>console.error("Error guardando agenda:", err));
}

// ============================================================
// Navegación por periodo
// ============================================================
function isViewingCurrent(freq){
  return getKey(freq, viewDates[freq]) === getKey(freq, realToday);
}
function navShift(freq, dir){
  if (freq==="diario") viewDates.diario = addDays(viewDates.diario, dir);
  else if (freq==="semanal") viewDates.semanal = addDays(viewDates.semanal, dir*7);
  else viewDates.mensual = addMonths(viewDates.mensual, dir);
  subscribeAgenda(freq);
  render();
}
function navToday(freq){
  viewDates[freq] = new Date(realToday);
  subscribeAgenda(freq);
  render();
}
function navJump(freq, value){
  if (!value) return;
  if (freq==="diario") viewDates.diario = new Date(value+"T00:00:00");
  else if (freq==="mensual"){ const [y,m]=value.split("-"); viewDates.mensual = new Date(parseInt(y), parseInt(m)-1, 1); }
  subscribeAgenda(freq);
  render();
}

function navLabel(freq){
  const d = viewDates[freq];
  if (freq==="diario") return d.toLocaleDateString('es-MX',{weekday:'long', day:'numeric', month:'long', year: d.getFullYear()!==realToday.getFullYear()?'numeric':undefined});
  if (freq==="semanal"){
    const mon = mondayOf(d), sun = addDays(mon,6);
    const sameMonth = mon.getMonth()===sun.getMonth();
    return sameMonth
      ? `${mon.getDate()} – ${sun.getDate()} de ${MESES[mon.getMonth()]}`
      : `${mon.getDate()} ${MESES[mon.getMonth()].slice(0,3)} – ${sun.getDate()} ${MESES[sun.getMonth()].slice(0,3)}`;
  }
  return `${MESES[d.getMonth()][0].toUpperCase()+MESES[d.getMonth()].slice(1)} ${d.getFullYear()}`;
}

function renderNavBar(freq){
  const inputType = freq==="diario" ? "date" : (freq==="mensual" ? "month" : null);
  const inputValue = freq==="diario" ? dateKey(viewDates.diario) : (freq==="mensual" ? monthKey(viewDates.mensual) : "");
  return `
    <div class="nav-bar">
      <div class="nav-btn" data-nav="${freq}:-1">‹</div>
      <div class="nav-label">${navLabel(freq)}</div>
      <div class="nav-btn" data-nav="${freq}:1">›</div>
      ${!isViewingCurrent(freq) ? `<div class="nav-today" data-navtoday="${freq}">Hoy</div>` : ""}
      ${inputType ? `<input class="nav-jump" type="${inputType}" id="navJump_${freq}" value="${inputValue}" style="opacity:1;position:static;width:auto;pointer-events:auto;">` : ""}
    </div>
  `;
}

// ============================================================
// Recordatorios (Notification API — funciona con la app abierta)
// ============================================================
function notifPrefOn(){ return localStorage.getItem("notifEnabled") === "1"; }

function renderNotifBar(){
  const supported = "Notification" in window;
  if (!supported) return "";
  const on = notifPrefOn() && Notification.permission === "granted";
  return `
    <div class="notif-btn ${on?'on':''}" id="notifToggleBtn">🔔 ${on ? "Recordatorios activados" : "Activar recordatorios"}</div>
    ${on ? `<div class="notif-hint">Te avisará en Mañana (${MOMENTOS.manana.hour}:00), Mediodía (${MOMENTOS.mediodia.hour}:00) y Tarde (${MOMENTOS.tarde.hour}:00) si aún tienes pendientes — solo mientras esta app esté abierta.</div>` : ""}
  `;
}

async function toggleNotifications(){
  if (!("Notification" in window)) return;
  if (notifPrefOn()){
    localStorage.setItem("notifEnabled","0");
    render();
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === "granted"){
    localStorage.setItem("notifEnabled","1");
    scheduleTodayNotifications();
  }
  render();
}

let scheduledTimers = [];
function scheduleTodayNotifications(){
  scheduledTimers.forEach(t=>clearTimeout(t));
  scheduledTimers = [];
  if (!notifPrefOn() || Notification.permission !== "granted") return;
  const now = new Date();
  MOMENTO_ORDER.forEach(mKey=>{
    const m = MOMENTOS[mKey];
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), m.hour, 0, 0);
    const ms = target - now;
    if (ms <= 0) return; // ya pasó esa hora hoy
    const timer = setTimeout(async ()=>{
      try{
        const key = dateKey(new Date());
        const doc = await db.collection("agenda").doc(`diario_${key}`).get();
        const done = doc.exists ? (doc.data().done||[]) : [];
        const tasksBlock = TASKS.diario.filter(t=>t.momento===mKey);
        const pending = tasksBlock.filter(t=>!done.includes(t.id));
        if (pending.length){
          new Notification(`Bitácora del dueño · ${m.label}`, {
            body: `Tienes ${pending.length} pendiente(s) de ${m.label.toLowerCase()}: ${pending[0].text}`,
            icon: "icons/icon-192.png"
          });
        }
      }catch(e){ console.error("Error en recordatorio:", e); }
    }, ms);
    scheduledTimers.push(timer);
  });
}
if (notifPrefOn() && "Notification" in window && Notification.permission === "granted"){
  scheduleTodayNotifications();
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
// Render: checklist diario (agrupado por momento del día)
// ============================================================
function renderChecklistDiario(){
  const viewingToday = isViewingCurrent("diario");
  const nowHour = new Date().getHours();
  let html = renderNavBar("diario");

  MOMENTO_ORDER.forEach(mKey=>{
    const m = MOMENTOS[mKey];
    const tasks = TASKS.diario.filter(t=>t.momento===mKey);
    const doneCount = tasks.filter(t=>(state.diario.done||[]).includes(t.id)).length;
    const isDue = viewingToday && nowHour >= m.hour && doneCount < tasks.length;
    html += `<div class="momento-block">
      <div class="momento-header">
        <span class="momento-title">${m.icon} ${m.label}</span>
        <span class="momento-hour">desde las ${m.hour}:00</span>
        ${isDue ? `<span class="momento-due">Pendiente</span>` : ""}
      </div>`;
    tasks.forEach(t=>{
      const done = (state.diario.done||[]).includes(t.id);
      const time = state.diario.times ? state.diario.times[t.id] : null;
      html += `<div class="task ${done?'done':''}" data-freq="diario" data-id="${t.id}">
        <div class="stamp">${done?'✓':''}</div>
        <div class="task-text"><span class="area-tag">${AREAS[t.area].label}</span><br>${t.text}</div>
        ${time?`<div class="task-time">${time}</div>`:""}
      </div>`;
    });
    html += `</div>`;
  });

  const notes = state.diario.notes || {};
  html += `<div class="notes"><label>Decisión importante del día</label>
    <textarea id="noteDecision" placeholder="¿Qué decidiste que vale la pena recordar?">${notes.decision||""}</textarea></div>
  <div class="notes" style="margin-top:8px;"><label>Pendiente para el día siguiente</label>
    <textarea id="notePending" placeholder="¿Qué le toca después?">${notes.pending||""}</textarea></div>`;

  return html;
}

// ============================================================
// Render: checklist semanal / mensual (agrupado por área, con nav)
// ============================================================
function renderChecklistPeriodic(freq){
  let html = renderNavBar(freq);
  const grouped = {};
  TASKS[freq].forEach(t=>{ (grouped[t.area] = grouped[t.area] || []).push(t); });
  Object.keys(grouped).forEach(areaKey=>{
    html += `<div class="area-block"><div class="area-label">${AREAS[areaKey].label}</div>`;
    grouped[areaKey].forEach(t=>{
      const done = (state[freq].done||[]).includes(t.id);
      html += `<div class="task ${done?'done':''}" data-freq="${freq}" data-id="${t.id}">
        <div class="stamp">${done?'✓':''}</div>
        <div class="task-text">${t.text}</div>
      </div>`;
    });
    html += `</div>`;
  });
  return html;
}

function pctFromDone(freq, doneArr){
  const total = TASKS[freq].length;
  return total ? Math.round(((doneArr||[]).length/total)*100) : 0;
}

// ============================================================
// Historial (consultas puntuales a Firestore por rango de fechas)
// ============================================================
async function fetchRange(freq, startKey, endKey){
  const snap = await db.collection("agenda")
    .where(firebase.firestore.FieldPath.documentId(), ">=", `${freq}_${startKey}`)
    .where(firebase.firestore.FieldPath.documentId(), "<=", `${freq}_${endKey}`)
    .get();
  const map = {};
  snap.forEach(doc=> map[doc.id.replace(`${freq}_`,"")] = doc.data());
  return map;
}

async function computeStreak(){
  const start = addDays(realToday, -60);
  const map = await fetchRange("diario", dateKey(start), dateKey(realToday));
  let streak = 0;
  let cursor = new Date(realToday);
  while (true){
    const key = dateKey(cursor);
    const data = map[key];
    const pct = data ? pctFromDone("diario", data.done) : 0;
    if (pct >= 80) { streak++; cursor = addDays(cursor,-1); }
    else break;
  }
  return streak;
}

async function renderHistorial(){
  const container = document.getElementById("histContainer");
  if (!container) return;
  container.innerHTML = `<div class="loading">Cargando historial...</div>`;

  const streak = await computeStreak();

  // últimos 7 días
  const start7 = addDays(realToday,-6);
  const map7 = await fetchRange("diario", dateKey(start7), dateKey(realToday));
  const days7 = [];
  for (let i=0;i<7;i++){
    const d = addDays(start7,i);
    const data = map7[dateKey(d)];
    days7.push({ label: DIAS_CORTOS[d.getDay()], pct: data?pctFromDone("diario",data.done):0 });
  }

  // meses: últimos 6 o año completo
  let monthBars = [];
  if (histMode === "6m"){
    const start = addMonths(realToday,-5);
    const map = await fetchRange("mensual", monthKey(start), monthKey(realToday));
    for (let i=0;i<6;i++){
      const d = addMonths(start,i);
      const data = map[monthKey(d)];
      monthBars.push({ label: MESES[d.getMonth()].slice(0,3), pct: data?pctFromDone("mensual",data.done):0 });
    }
  } else {
    const map = await fetchRange("mensual", `${histYear}-01`, `${histYear}-12`);
    for (let i=0;i<12;i++){
      const key = `${histYear}-${pad(i+1)}`;
      const data = map[key];
      monthBars.push({ label: MESES[i].slice(0,3), pct: data?pctFromDone("mensual",data.done):0 });
    }
  }

  const barsHtml = (arr) => `
    <div class="chart-wrap">
      ${arr.map(b=>`<div class="chart-col"><div class="chart-bar"><div class="chart-bar-fill" style="height:${b.pct}%"></div></div></div>`).join("")}
    </div>
    <div class="chart-labels">${arr.map(b=>`<div class="chart-label">${b.label}</div>`).join("")}</div>
  `;

  container.innerHTML = `
    <div class="streak-badge"><span class="flame">🔥</span><span class="num">${streak}</span><span class="txt">día(s) seguidos con 80%+ en la rutina diaria</span></div>

    <div class="area-label" style="margin-bottom:8px;">Últimos 7 días</div>
    ${barsHtml(days7)}

    <div class="hist-header" style="margin-top:20px;">
      <div class="area-label" style="margin-bottom:0;flex:1;">Por meses</div>
      <div class="segmented">
        <div class="${histMode==='6m'?'active':''}" data-histmode="6m">6 meses</div>
        <div class="${histMode==='anio'?'active':''}" data-histmode="anio">Año</div>
      </div>
    </div>
    ${histMode==='anio' ? `
      <div class="nav-bar" style="margin-top:8px;">
        <div class="nav-btn" data-histyear="-1">‹</div>
        <div class="nav-label">${histYear}</div>
        <div class="nav-btn" data-histyear="1">›</div>
      </div>` : ""}
    ${barsHtml(monthBars)}
  `;

  container.querySelectorAll("[data-histmode]").forEach(el=>{
    el.addEventListener("click", ()=>{ histMode = el.dataset.histmode; renderHistorial(); });
  });
  container.querySelectorAll("[data-histyear]").forEach(el=>{
    el.addEventListener("click", ()=>{ histYear += parseInt(el.dataset.histyear); renderHistorial(); });
  });
}

// ============================================================
// Render: dashboard (KPIs de HOY real + áreas + historial)
// ============================================================
function renderDashboard(){
  const areaStats = {};
  Object.keys(AREAS).forEach(k=>areaStats[k]={done:0,total:0});
  ["diario","semanal","mensual"].forEach(freq=>{
    TASKS[freq].forEach(t=>{
      areaStats[t.area].total++;
      if ((stateNow[freq].done||[]).includes(t.id)) areaStats[t.area].done++;
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
      <div class="kpi"><div class="num">${pctFromDone('diario', stateNow.diario.done)}%</div><div class="label">Hoy</div></div>
      <div class="kpi"><div class="num">${pctFromDone('semanal', stateNow.semanal.done)}%</div><div class="label">Esta semana</div></div>
      <div class="kpi"><div class="num">${pctFromDone('mensual', stateNow.mensual.done)}%</div><div class="label">Este mes</div></div>
    </div>
    <div class="area-label" style="margin-bottom:10px;">Cumplimiento por área (periodo actual)</div>
    ${barsHtml}
    <div class="reset-link" id="resetBtn">Borrar registros de hoy</div>
    <div class="hist-section" id="histContainer"></div>
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
        <div class="form-group"><label>Fecha</label><input type="date" id="expFecha" value="${dateKey(realToday)}"></div>
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
  document.getElementById("notifBar").innerHTML = renderNotifBar();
  const notifBtn = document.getElementById("notifToggleBtn");
  if (notifBtn) notifBtn.addEventListener("click", toggleNotifications);

  if (currentTab === "dashboard"){
    content.innerHTML = renderDashboard();
    document.getElementById("resetBtn").onclick = ()=>{
      const key = getKey("diario", realToday);
      db.collection("agenda").doc(`diario_${key}`).set(emptyDiario());
    };
    renderHistorial();
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
  content.innerHTML = currentTab === "diario" ? renderChecklistDiario() : renderChecklistPeriodic(currentTab);

  content.querySelectorAll(".task").forEach(el=>{
    el.addEventListener("click", ()=> toggleTask(el.dataset.freq, el.dataset.id));
  });
  content.querySelectorAll("[data-nav]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [freq,dir] = el.dataset.nav.split(":");
      navShift(freq, parseInt(dir));
    });
  });
  content.querySelectorAll("[data-navtoday]").forEach(el=>{
    el.addEventListener("click", ()=> navToday(el.dataset.navtoday));
  });
  const jumpEl = document.getElementById(`navJump_${currentTab}`);
  if (jumpEl) jumpEl.addEventListener("change", (e)=> navJump(currentTab, e.target.value));

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
