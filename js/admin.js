// ============================================================
//  CURRÍCULO BASE — Lógica del panel admin
// ============================================================

let raw         = { tecnico: [], tecnologo: [] };
let tipoActual  = 'tecnico';
let vistaActual = 'tabla';

// ============================================================
//  INICIALIZACIÓN
// ============================================================
window.onload = async () => {
  try {
    const res = await gas('admin');
    raw = res.data;
    poblarFiltros();
    render();
  } catch (err) {
    document.getElementById('bodyTabla').innerHTML =
      `<div class="state-box" style="color:#ef4444">
        Error al cargar datos.<br>
        <button onclick="recargar()" style="margin-top:12px;padding:8px 16px;cursor:pointer">Reintentar</button>
      </div>`;
  }
};

// ============================================================
//  RECARGA
// ============================================================
async function recargar() {
  document.getElementById('bodyTabla').innerHTML =
    '<div class="state-box"><div class="ld-spin"></div>Actualizando...</div>';
  try {
    const res = await gas('admin');
    raw = res.data;
    render();
  } catch (err) {
    document.getElementById('bodyTabla').innerHTML =
      '<div class="state-box" style="color:#ef4444">Error al actualizar.</div>';
  }
}

// ============================================================
//  CAMBIAR TIPO
// ============================================================
function cambiarTipo(t, btn) {
  tipoActual = t;
  document.querySelectorAll('.tipo-sw-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');

  const badge = document.getElementById('topBadge');
  badge.textContent = t === 'tecnico' ? 'Técnico' : 'Tecnólogo';
  badge.className   = 'tb-badge ' + (t === 'tecnico' ? 'tec' : 'tecn');

  document.getElementById('fMun').value = '';
  document.getElementById('fIE').value  = '';
  poblarFiltros();
  render();
}

// ============================================================
//  CAMBIAR VISTA
// ============================================================
function setVista(v, btn) {
  vistaActual = v;
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('vTabla').style.display   = v === 'tabla'   ? 'block' : 'none';
  document.getElementById('vResumen').style.display = v === 'resumen' ? 'block' : 'none';
  render();
}

// ============================================================
//  FILTROS
// ============================================================
function poblarFiltros() {
  const d    = raw[tipoActual];
  const muns = [...new Set(d.map(r => r['Municipio']))].sort();
  const sM   = document.getElementById('fMun');
  sM.innerHTML = '<option value="">Todos los municipios</option>';
  muns.forEach(m => sM.appendChild(new Option(m, m)));
  document.getElementById('fIE').innerHTML = '<option value="">Todas las IEs</option>';
}

function filtrar() {
  const mun   = document.getElementById('fMun').value;
  const d     = raw[tipoActual];
  const sIE   = document.getElementById('fIE');
  const ieAct = sIE.value;

  const ies = mun
    ? [...new Set(d.filter(r => r['Municipio'] === mun).map(r => r['IE']))].sort()
    : [];

  sIE.innerHTML = '<option value="">Todas las IEs</option>';
  ies.forEach(ie => sIE.appendChild(new Option(ie, ie)));
  if (ies.includes(ieAct)) sIE.value = ieAct;

  render();
}

function getFiltrados() {
  const mun = document.getElementById('fMun').value;
  const ie  = document.getElementById('fIE').value;
  return raw[tipoActual].filter(r =>
    (!mun || r['Municipio'] === mun) &&
    (!ie  || r['IE'] === ie)
  );
}

// ============================================================
//  RENDER PRINCIPAL
// ============================================================
function render() {
  const d = getFiltrados();
  actualizarKPIs(d);
  document.getElementById('fCount').textContent = d.length + ' registros';
  if (vistaActual === 'tabla')   renderTabla(d);
  else                           renderResumen(d);
}

// ============================================================
//  KPIs
// ============================================================
function actualizarKPIs(d) {
  const tl = d.reduce((s, r) => s + r._libros.reduce((a, l) => a + l.cantidad, 0), 0);
  const kp = d.length
    ? Math.round(d.reduce((s, r) => s + r._kits, 0) / d.length)
    : 0;
  const mn = new Set(d.map(r => r['Municipio'])).size;

  document.getElementById('kSedes').textContent  = d.length;
  document.getElementById('kLibros').textContent = tl.toLocaleString();
  document.getElementById('kKits').textContent   = kp;
  document.getElementById('kMuns').textContent   = mn;
}

// ============================================================
//  TABLA DE REGISTROS
// ============================================================
function chipClass(k) { return k >= 10 ? 'hi' : k >= 5 ? 'md' : 'lo'; }

function renderTabla(d) {
  const el = document.getElementById('bodyTabla');

  if (!d.length) {
    el.innerHTML = '<div class="state-box">Sin registros con los filtros aplicados</div>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Municipio</th><th>IE</th><th>Sede</th><th>Padrino</th>
          <th>Fecha</th><th>Libros</th><th>Kits</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${d.map((r, i) => {
          const tot = r._libros.reduce((s, l) => s + l.cantidad, 0);
          const cc  = chipClass(r._kits);
          return `
            <tr onclick="togDet(${i})">
              <td>${r['Municipio']}</td>
              <td>${r['IE']}</td>
              <td class="td-bold">${r['Sede']}</td>
              <td style="color:var(--s400)">${r['Padrino'] || '–'}</td>
              <td class="td-mono">${r['Fecha'] || '–'}</td>
              <td class="td-mono">${tot}</td>
              <td><span class="kit-chip ${cc}">${r._kits}</span></td>
              <td><span class="expand-icon" id="xi${i}">›</span></td>
            </tr>
            <tr class="fila-det" id="det${i}">
              <td colspan="8">
                <div class="det-inner">
                  <div class="det-title">${r['Sede']} — inventario completo</div>
                  <div class="det-grid">
                    ${r._libros.map(l => `
                      <div class="det-item">
                        <span class="det-libro">${l.libro}</span>
                        <span class="det-cant ${l.cantidad === r._kits && r._kits > 0 ? 'min' : ''}">
                          ${l.cantidad}
                        </span>
                      </div>`).join('')}
                  </div>
                </div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function togDet(i) {
  document.getElementById('det' + i).classList.toggle('vis');
  document.getElementById('xi'  + i).classList.toggle('open');
}

// ============================================================
//  RESUMEN POR IE
// ============================================================
function renderResumen(d) {
  const el = document.getElementById('bodyResumen');

  if (!d.length) {
    el.innerHTML = '<div class="state-box">Sin registros</div>';
    return;
  }

  const porIE = {};
  d.forEach(r => {
    const k = r['Municipio'] + '||' + r['IE'];
    if (!porIE[k]) porIE[k] = { mun: r['Municipio'], ie: r['IE'], sedes: [] };
    porIE[k].sedes.push(r);
  });

  el.innerHTML = Object.values(porIE).map(g => {
    const tl  = g.sedes.reduce((s, r) => s + r._libros.reduce((a, l) => a + l.cantidad, 0), 0);
    const kp  = Math.round(g.sedes.reduce((s, r) => s + r._kits, 0) / g.sedes.length);
    const cc  = chipClass(kp);
    const colorKp = cc === 'hi' ? 'var(--em500)' : cc === 'md' ? 'var(--amb500)' : 'var(--re500)';

    return `
      <div class="resumen-card">
        <div class="rc-top">
          <div>
            <div class="rc-ie">${g.ie}</div>
            <div class="rc-mun">${g.mun} · ${g.sedes.length} sede${g.sedes.length > 1 ? 's' : ''}</div>
          </div>
          <div class="rc-stats">
            <div class="rc-stat">
              <div class="rc-stat-val">${tl.toLocaleString()}</div>
              <div class="rc-stat-lbl">libros</div>
            </div>
            <div class="rc-stat">
              <div class="rc-stat-val" style="color:${colorKp}">${kp}</div>
              <div class="rc-stat-lbl">kits prom.</div>
            </div>
          </div>
        </div>
        <div class="rc-sedes">
          ${g.sedes.map(s => `
            <div class="sede-pill">
              <span class="sede-pill-name">${s['Sede']}</span>
              <span class="sede-pill-kits ${chipClass(s._kits)}">${s._kits} kits</span>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');
}

// ============================================================
//  HELPER — fetch al GAS
// ============================================================
async function gas(accion, params = {}) {
  const qs  = new URLSearchParams({ accion, ...params });
  const res = await fetch(`${CONFIG.GAS_URL}?${qs}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Error desconocido');
  return json;
}