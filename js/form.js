// ============================================================
//  CURRÍCULO BASE — Lógica del formulario
// ============================================================

let tipo    = null;
let libros  = [];
let enviando = false;

// ============================================================
//  INICIALIZACIÓN
// ============================================================
window.onload = async () => {
  document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

  try {
    const res  = await gas('GET', 'catalogos');
    const { municipios, padrinos } = res.data;

    const sM = document.getElementById('municipio');
    municipios.forEach(m => sM.appendChild(new Option(m, m)));

    const sP = document.getElementById('padrino');
    padrinos.forEach(p => sP.appendChild(new Option(p, p)));

    document.getElementById('initLoader').style.display = 'none';
    document.getElementById('formContent').style.display = 'block';

  } catch (err) {
    document.getElementById('initLoader').innerHTML =
      `<p style="color:#ef4444">Error al cargar datos.<br>Verifica tu conexión e intenta recargar.</p>
       <button onclick="location.reload()" style="margin-top:12px;padding:8px 16px;cursor:pointer">Reintentar</button>`;
  }
};

// ============================================================
//  DROPDOWNS ENCADENADOS
// ============================================================
async function cargarIEs() {
  const mun   = document.getElementById('municipio').value;
  const sIE   = document.getElementById('ie');
  const sSede = document.getElementById('sede');

  sIE.innerHTML  = '<option value="">Cargando...</option>';
  sIE.disabled   = true;
  sSede.innerHTML = '<option value="">— seleccione IE</option>';
  sSede.disabled  = true;
  resetTabla();

  if (!mun) return;

  try {
    const res = await gas('GET', 'ies', { municipio: mun });
    sIE.innerHTML = '<option value="">Seleccionar IE...</option>';
    res.data.forEach(ie => sIE.appendChild(new Option(ie, ie)));
    sIE.disabled = false;
  } catch (err) {
    sIE.innerHTML = '<option value="">Error al cargar</option>';
  }
}

async function cargarSedes() {
  const mun   = document.getElementById('municipio').value;
  const ie    = document.getElementById('ie').value;
  const sSede = document.getElementById('sede');

  sSede.innerHTML = '<option value="">Cargando...</option>';
  sSede.disabled  = true;
  resetTabla();

  if (!ie) return;

  try {
    const res = await gas('GET', 'sedes', { municipio: mun, ie });
    sSede.innerHTML = '<option value="">Seleccionar sede...</option>';
    res.data.forEach(s => sSede.appendChild(new Option(s, s)));
    sSede.disabled = false;
  } catch (err) {
    sSede.innerHTML = '<option value="">Error al cargar</option>';
  }
}

// ============================================================
//  TIPO DE CURRÍCULO
// ============================================================
async function seleccionarTipo(t, el) {
  tipo = t;
  document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('activo'));
  el.classList.add('activo');

  const badge = document.getElementById('librosBadge');
  badge.textContent = t === 'tecnico' ? 'Técnico' : 'Tecnólogo';
  badge.className   = 'libros-badge ' + (t === 'tecnico' ? 'tecnico' : 'tecnologo');

  // Limpiar tabla anterior
  document.getElementById('cuerpoLibros').innerHTML =
    '<tr><td colspan="3" style="text-align:center;padding:20px;color:#94a3b8">Cargando libros...</td></tr>';
  document.getElementById('secCantidades').style.display = 'block';

  try {
    const res = await gas('GET', 'libros', { tipo: t });
    libros = res.data;

    const tbody = document.getElementById('cuerpoLibros');
    tbody.innerHTML = '';
    libros.forEach((libro, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-num">${String(i + 1).padStart(2, '0')}</td>
        <td class="td-nombre">${libro}</td>
        <td><input class="input-cant" type="number" id="l_${i}" min="0" value="0" oninput="actualizarResumen()"></td>
      `;
      tbody.appendChild(tr);
    });

    actualizarResumen();
    validar();

  } catch (err) {
    document.getElementById('cuerpoLibros').innerHTML =
      '<tr><td colspan="3" style="text-align:center;padding:20px;color:#ef4444">Error al cargar libros</td></tr>';
  }
}

// ============================================================
//  RESUMEN DE KITS
// ============================================================
function actualizarResumen() {
  if (!libros.length) return;
  const vals  = libros.map((_, i) => Number(document.getElementById('l_' + i).value) || 0);
  const total = vals.reduce((a, b) => a + b, 0);
  const kits  = Math.min(...vals);
  document.getElementById('librosResumen').textContent =
    `total: ${total} · ${kits} kits completos`;
}

function resetTabla() {
  tipo   = null;
  libros = [];
  document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('activo'));
  document.getElementById('secCantidades').style.display = 'none';
  validar();
}

// ============================================================
//  VALIDACIÓN
// ============================================================
function validar() {
  const ok =
    document.getElementById('fecha').value &&
    document.getElementById('padrino').value &&
    document.getElementById('municipio').value &&
    document.getElementById('ie').value &&
    document.getElementById('sede').value &&
    tipo &&
    libros.length > 0;

  document.getElementById('btnSubmit').disabled = !ok || enviando;
}

['fecha', 'padrino', 'municipio', 'ie', 'sede'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', validar);
});

// ============================================================
//  MODAL DE CONFIRMACIÓN
// ============================================================
function abrirModal() {
  if (enviando) return;

  const v    = id => document.getElementById(id).value;
  const vals = libros.map((_, i) => Number(document.getElementById('l_' + i).value) || 0);
  const total = vals.reduce((a, b) => a + b, 0);
  const kits  = Math.min(...vals);

  const rows = [
    ['Fecha',          v('fecha')],
    ['Padrino',        v('padrino')],
    ['Municipio',      v('municipio')],
    ['IE',             v('ie')],
    ['Sede',           v('sede')],
    ['Tipo',           tipo === 'tecnico' ? 'Técnico' : 'Tecnólogo'],
    ['Total libros',   total],
    ['Kits completos', kits],
  ];

  document.getElementById('modalRows').innerHTML = rows
    .map(([k, val]) => `
      <div class="modal-row">
        <span class="modal-row-key">${k}</span>
        <span class="modal-row-val">${val}</span>
      </div>`)
    .join('');

  document.getElementById('modalWrap').classList.add('open');
}

function cerrarModal() {
  document.getElementById('modalWrap').classList.remove('open');
}

// ============================================================
//  ENVÍO
// ============================================================
async function enviar() {
  if (enviando) return;

  enviando = true;
  cerrarModal();

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  document.getElementById('btnText').textContent    = 'Guardando...';
  document.getElementById('spinnerBtn').style.display = 'block';

  const data = {
    accion:    'saveRegistro',
    fecha:     document.getElementById('fecha').value,
    municipio: document.getElementById('municipio').value,
    ie:        document.getElementById('ie').value,
    sede:      document.getElementById('sede').value,
    padrino:   document.getElementById('padrino').value,
    tipo,
    cantidades: libros.map((libro, i) => ({
      libro,
      cantidad: Number(document.getElementById('l_' + i).value) || 0,
    })),
  };

  try {
    const res = await gas('POST', null, null, data);

    document.getElementById('spinnerBtn').style.display = 'none';
    document.getElementById('btnText').textContent = 'Registrar inventario';

    if (res.ok) {
      document.getElementById('modalExito').classList.add('open');
    } else {
      enviando = false;
      btn.disabled = false;
      mostrarToast('✗ ' + res.error, 'err');
    }

  } catch (err) {
    enviando = false;
    document.getElementById('spinnerBtn').style.display = 'none';
    document.getElementById('btnText').textContent = 'Registrar inventario';
    btn.disabled = false;
    mostrarToast('✗ Error de conexión: ' + err.message, 'err');
  }
}

// ============================================================
//  TOAST
// ============================================================
function mostrarToast(msg, t) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'toast ' + t + ' show';
  setTimeout(() => el.className = 'toast', 3800);
}

// ============================================================
//  HELPER — fetch al GAS
// ============================================================
async function gas(method, accion, params = {}, body = null) {
  let url = CONFIG.GAS_URL;

  if (method === 'GET') {
    const qs = new URLSearchParams({ accion, ...params });
    url += '?' + qs.toString();
  }

  const opts = { method };
  if (method === 'POST') {
    opts.headers = { 'Content-Type': 'text/plain' };
    opts.body    = JSON.stringify(body);
  }

  const res  = await fetch(url, opts);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error || 'Error desconocido');
  return json;
}