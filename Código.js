// ============================================================
//  CONFIGURACIÓN
// ============================================================
const SS_ORIGEN = '1sDwOuJk0x1mO6lxJbzzWTd088SOg7fAWEuXSZEM1Eog';
const SS_DESTINO = '1bvH00IgiqYY1V16RaOciqU1-YxAHOPtSZlH8widKwv0';

const HOJA_MUNS = 'Mun/IE/Sedes';
const HOJA_PADRINOS = 'Padrinos';
const HOJA_CURRICULO = 'Curriculo U Campo';
const HOJA_TECNICOS = 'Técnicos';
const HOJA_TECNOLOGOS = 'Tecnólogos';

// ============================================================
//  ROUTER PRINCIPAL
// ============================================================
function doGet(e) {
  const page = e.parameter.page;
  if (page === 'admin') {
    return HtmlService.createTemplateFromFile('AdminPage')
      .evaluate()
      .setTitle('Panel Administrador - Currículo Base')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createTemplateFromFile('FormPage')
    .evaluate()
    .setTitle('Seguimiento Currículo Base')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getUrl() {
  return ScriptApp.getService().getUrl();
}

// ============================================================
//  DATOS PARA EL FORMULARIO
// ============================================================
function getMunicipios() {
  const ss = SpreadsheetApp.openById(SS_ORIGEN);
  const hoja = ss.getSheetByName(HOJA_MUNS);
  const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues();
  const municipios = [...new Set(datos.flat().filter(v => v !== ''))];
  return municipios.sort();
}

function getIEsByMunicipio(municipio) {
  const ss = SpreadsheetApp.openById(SS_ORIGEN);
  const hoja = ss.getSheetByName(HOJA_MUNS);
  const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues();
  const ies = [...new Set(
    datos.filter(row => row[0] === municipio).map(row => row[1]).filter(v => v !== '')
  )];
  return ies.sort();
}

function getSedesByIE(municipio, ie) {
  const ss = SpreadsheetApp.openById(SS_ORIGEN);
  const hoja = ss.getSheetByName(HOJA_MUNS);
  const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, 3).getValues();
  const sedes = datos
    .filter(row => row[0] === municipio && row[1] === ie)
    .map(row => row[2])
    .filter(v => v !== '');
  return sedes.sort();
}

function getPadrinos() {
  const ss = SpreadsheetApp.openById(SS_ORIGEN);
  const hoja = ss.getSheetByName(HOJA_PADRINOS);
  const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues();
  return datos.flat().filter(v => v !== '').sort();
}

function getLibros(tipo) {
  const ss = SpreadsheetApp.openById(SS_ORIGEN);
  const hoja = ss.getSheetByName(HOJA_CURRICULO);
  const col = tipo === 'tecnico' ? 2 : 7; // B = 2, G = 7
  const datos = hoja.getRange(2, col, hoja.getLastRow() - 1, 1).getValues();
  return datos.flat().filter(v => v !== '');
}

// ============================================================
//  VALIDACIÓN Y GUARDADO
// ============================================================
function checkDuplicado(sede, tipo) {
  const ss = SpreadsheetApp.openById(SS_DESTINO);
  const nombreHoja = tipo === 'tecnico' ? HOJA_TECNICOS : HOJA_TECNOLOGOS;
  const hoja = ss.getSheetByName(nombreHoja);
  if (hoja.getLastRow() < 2) return false;
  const sedes = hoja.getRange(2, 3, hoja.getLastRow() - 1, 1).getValues().flat();
  return sedes.some(s => s === sede);
}

function saveRegistro(data) {
  // data: { fecha, municipio, ie, sede, padrino, tipo, cantidades: [{libro, cantidad}] }
  try {
    const ss = SpreadsheetApp.openById(SS_DESTINO);
    const nombreHoja = data.tipo === 'tecnico' ? HOJA_TECNICOS : HOJA_TECNOLOGOS;
    let hoja = ss.getSheetByName(nombreHoja);

    // Verificar duplicado en el momento de guardar (doble seguro)
    if (checkDuplicado(data.sede, data.tipo)) {
      return { ok: false, msg: 'Esta sede ya tiene un registro guardado.' };
    }

    // Si la hoja está vacía, crear encabezados
    if (hoja.getLastRow() === 0) {
      const headers = ['Fecha', 'Municipio', 'IE', 'Sede', 'Padrino',
        ...data.cantidades.map(c => c.libro)];
      hoja.appendRow(headers);
    }

    const fila = [
      data.fecha,
      data.municipio,
      data.ie,
      data.sede,
      data.padrino,
      ...data.cantidades.map(c => Number(c.cantidad) || 0)
    ];
    hoja.appendRow(fila);
    return { ok: true };
  } catch (err) {
    return { ok: false, msg: err.toString() };
  }
}

// ============================================================
//  DATOS PARA EL PANEL ADMIN
// ============================================================
function getAdminData() {
  const ss = SpreadsheetApp.openById(SS_DESTINO);
  const resultado = {};

  ['tecnico', 'tecnologo'].forEach(tipo => {
    const nombreHoja = tipo === 'tecnico' ? HOJA_TECNICOS : HOJA_TECNOLOGOS;
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja || hoja.getLastRow() < 2) {
      resultado[tipo] = [];
      return;
    }
    const datos = hoja.getDataRange().getValues();
    const headers = datos[0];
    const registros = datos.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      // Calcular kits: mínimo de todas las cantidades de libros
      const cantidades = headers.slice(5).map(h => Number(obj[h]) || 0);
      obj._kits = cantidades.length > 0 ? Math.min(...cantidades) : 0;
      obj._libros = headers.slice(5).map((h, i) => ({ libro: h, cantidad: cantidades[i] }));
      return obj;
    });
    resultado[tipo] = registros;
  });

  return resultado;
}