// ============ CONFIGURACIÓN ============
const CODIGO_ADMIN = '123456';
const API_URL = 'https://script.google.com/macros/s/AKfycbxQsjLPy5cDEdHgkHpNJAsrxhD_pxsOUFw2KDuSGF2d6bUkkKGIsRIU8uA8ldWFm8w/exec';
const USAR_API = true; // CAMBIÁ A true CUANDO GOOGLE SHEETS FUNCIONE

let concursoFinalizado = false;

const STORAGE_KEY = 'concurso_falopas_data';
const SESSION_KEY = 'concurso_falopas_session';

const CATEGORIAS_DEFAULT = ['Presentación', 'Sabor', 'Originalidad', 'Bebida'];

let appData = {
    participantes: [],
    platos: [],
    categorias: [...CATEGORIAS_DEFAULT],
    calificaciones: []
};

let sesionActual = null;

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', async function() {
    if (USAR_API) {
        await cargarDatosAPI();
    } else {
        cargarDatosLocal();
    }
    
    cargarTema();
    configurarEventos();
    construirMenu();
    
    if (sesionActual) {
        actualizarUISesion();
        if (sesionActual.esAdmin) {
            mostrarPanel('categorias');
        } else {
            mostrarPanel('calificar');
        }
    } else {
        actualizarUISesion();
        mostrarPanel('login');
    }
});

// ============ API (GOOGLE SHEETS) ============
async function apiCall(action, data = {}) {
    try {
        const params = new URLSearchParams({ action, data: JSON.stringify(data) });
        const response = await fetch(API_URL + '?' + params.toString());
        return await response.json();
    } catch(e) {
        console.error('Error API:', e);
        return { error: 'Error de conexión' };
    }
}

async function cargarDatosAPI() {
    const result = await apiCall('getAll');
    if (!result.error) {
        if (result.participantes) appData.participantes = result.participantes;
        if (result.platos) appData.platos = result.platos;
        if (result.categorias && Array.isArray(result.categorias)) appData.categorias = result.categorias;
        if (result.calificaciones) {
            appData.calificaciones = result.calificaciones;
            appData.calificaciones.forEach(c => {
                if (typeof c.puntuaciones === 'string') {
                    try { c.puntuaciones = JSON.parse(c.puntuaciones); } catch(e) { c.puntuaciones = {}; }
                }
            });
        }
        if (result.config) {
            concursoFinalizado = result.config.finalizado === true || result.config.finalizado === 'true';
        }
    }
    // Cargar sesión
    cargarSesion();
}

// ============ DATOS LOCALES ============
function cargarDatosLocal() {
    const datos = localStorage.getItem(STORAGE_KEY);
    if (datos) {
        try {
            const parsed = JSON.parse(datos);
            appData.participantes = parsed.participantes || [];
            appData.platos = parsed.platos || [];
            appData.categorias = parsed.categorias || [...CATEGORIAS_DEFAULT];
            appData.calificaciones = parsed.calificaciones || [];
            concursoFinalizado = parsed.finalizado || false;
        } catch(e) {}
    }
    cargarSesion();
}

function guardarDatosLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...appData,
        finalizado: concursoFinalizado
    }));
}

function cargarSesion() {
    const sesion = localStorage.getItem(SESSION_KEY);
    if (sesion) {
        try { sesionActual = JSON.parse(sesion); } catch(e) { sesionActual = null; }
    }
}

// ============ TEMA ============
function cargarTema() {
    const tema = localStorage.getItem('concurso_theme') || 'light';
    document.documentElement.setAttribute('data-theme', tema);
    actualizarIconoTema(tema);
}

function toggleTheme() {
    const actual = document.documentElement.getAttribute('data-theme');
    const nuevo = actual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    localStorage.setItem('concurso_theme', nuevo);
    actualizarIconoTema(nuevo);
}

function actualizarIconoTema(tema) {
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = tema === 'dark' ? '☀️' : '🌙';
}

// ============ MENÚ ============
function construirMenu() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    
    if (sesionActual && sesionActual.esAdmin) {
        nav.innerHTML = `
            <button class="nav-btn" data-tab="categorias">📋 Categorías</button>
            <button class="nav-btn" data-tab="registro">👥 Participantes</button>
            <button class="nav-btn" data-tab="platos">🍽️ Platos</button>
            <button class="nav-btn" data-tab="calificar">⭐ Calificar</button>
            <button class="nav-btn" data-tab="resultados">🏆 Resultados</button>
            <button class="nav-btn" data-tab="logout">🚪 Salir</button>
        `;
    } else if (sesionActual && sesionActual.tipo === 'cocinero') {
        nav.innerHTML = `
            <button class="nav-btn" data-tab="calificar">⭐ Calificar</button>
            <button class="nav-btn" data-tab="platos">🍽️ Mis Platos</button>
            <button class="nav-btn" data-tab="resultados">🏆 Resultados</button>
            <button class="nav-btn" data-tab="logout">🚪 Salir</button>
        `;
    } else if (sesionActual && sesionActual.tipo === 'invitado') {
        nav.innerHTML = `
            <button class="nav-btn" data-tab="calificar">⭐ Calificar</button>
            <button class="nav-btn" data-tab="resultados">🏆 Resultados</button>
            <button class="nav-btn" data-tab="logout">🚪 Salir</button>
        `;
    } else {
        nav.innerHTML = `<button class="nav-btn active" data-tab="login">🔐 Iniciar Sesión</button>`;
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.dataset.tab;
            if (target === 'logout') { cerrarSesion(); return; }
            if ((target === 'calificar' || target === 'resultados') && !sesionActual) {
                alert('Debe iniciar sesión primero.'); return;
            }
            if ((target === 'registro' || target === 'categorias') && (!sesionActual || !sesionActual.esAdmin)) {
                alert('Acceso restringido al administrador.'); return;
            }
            mostrarPanel(target);
        });
    });
}

// ============ EVENTOS ============
function configurarEventos() {
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    
    document.getElementById('form-login').addEventListener('submit', e => {
        e.preventDefault(); hacerLogin();
    });
    
    document.getElementById('form-registro').addEventListener('submit', async e => {
        e.preventDefault();
        if (!sesionActual?.esAdmin) return;
        if (USAR_API) await registrarParticipanteAPI();
        else registrarParticipanteLocal();
    });
    
    document.getElementById('form-categoria').addEventListener('submit', async e => {
        e.preventDefault();
        if (!sesionActual?.esAdmin) return;
        if (USAR_API) await agregarCategoriaAPI();
        else agregarCategoriaLocal();
    });
    
    document.getElementById('form-plato').addEventListener('submit', async e => {
        e.preventDefault();
        if (USAR_API) await registrarPlatoAPI();
        else registrarPlatoLocal();
    });
    
    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', cerrarSesion);
    
    document.getElementById('btn-actualizar-resultados')?.addEventListener('click', renderizarResultados);
    
    const btnFinalizar = document.getElementById('btn-finalizar');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', () => {
            if (concursoFinalizado) reabrirConcurso();
            else finalizarConcurso();
        });
    }
}

// ============ UTILIDADES ============
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function generarCodigo() {
    let codigo;
    do {
        codigo = Math.floor(100000 + Math.random() * 900000).toString();
    } while (appData.participantes.some(p => p.codigo === codigo));
    return codigo;
}

function obtenerParticipante(id) {
    return appData.participantes.find(p => p.id === id);
}

// ============ NAVEGACIÓN ============
function mostrarPanel(nombre) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    const btn = document.querySelector(`[data-tab="${nombre}"]`);
    if (btn) btn.classList.add('active');
    
    const panel = document.getElementById(`panel-${nombre}`);
    if (panel) panel.classList.add('active');
    
    actualizarPanel(nombre);
}

function actualizarPanel(panel) {
    switch(panel) {
        case 'login': actualizarUISesion(); break;
        case 'registro': renderizarParticipantes(); break;
        case 'categorias': renderizarCategorias(); break;
        case 'platos': prepararPanelPlatos(); break;
        case 'calificar':
            if (sesionActual) {
                document.getElementById('info-juez').innerHTML = 'Evaluando como: <strong>' + sesionActual.nombre + '</strong>';
                document.getElementById('lista-categorias-activas').textContent = appData.categorias.join(' • ');
                renderizarCalificacion(sesionActual.id);
            }
            break;
        case 'resultados': renderizarResultados(); break;
    }
}

// ============ LOGIN ============
function hacerLogin() {
    const codigo = document.getElementById('codigo-input').value.trim();
    const errorDiv = document.getElementById('login-error');
    
    if (!codigo || codigo.length !== 6) {
        if (errorDiv) { errorDiv.textContent = 'Código de 6 dígitos requerido.'; errorDiv.style.display = 'block'; }
        return;
    }
    
    if (codigo === CODIGO_ADMIN) {
        sesionActual = { id: 'admin', nombre: 'Administrador', tipo: 'admin', codigo: CODIGO_ADMIN, esAdmin: true };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sesionActual));
        actualizarUISesion();
        construirMenu();
        document.getElementById('codigo-input').value = '';
        if (errorDiv) errorDiv.style.display = 'none';
        mostrarPanel('categorias');
        return;
    }
    
    const participante = appData.participantes.find(p => p.codigo === codigo);
    if (!participante) {
        if (errorDiv) { errorDiv.textContent = 'Código no encontrado.'; errorDiv.style.display = 'block'; }
        document.getElementById('codigo-input').value = '';
        return;
    }
    
    sesionActual = { id: participante.id, nombre: participante.nombre, tipo: participante.tipo, codigo: participante.codigo, esAdmin: false };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sesionActual));
    actualizarUISesion();
    construirMenu();
    document.getElementById('codigo-input').value = '';
    if (errorDiv) errorDiv.style.display = 'none';
    mostrarPanel('calificar');
}

function cerrarSesion() {
    sesionActual = null;
    localStorage.removeItem(SESSION_KEY);
    actualizarUISesion();
    construirMenu();
    mostrarPanel('login');
}

function actualizarUISesion() {
    const loginForm = document.getElementById('login-form');
    const sesionDiv = document.getElementById('sesion-activa');
    
    if (sesionActual) {
        if (loginForm) loginForm.style.display = 'none';
        if (sesionDiv) {
            sesionDiv.style.display = 'block';
            document.getElementById('sesion-nombre').textContent = sesionActual.nombre;
            document.getElementById('sesion-tipo').textContent = sesionActual.esAdmin ? '👑 Administrador' : sesionActual.tipo === 'cocinero' ? '👨‍🍳 Cocinero/a' : '🍴 Invitado/a';
            document.getElementById('sesion-codigo').textContent = sesionActual.codigo;
        }
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (sesionDiv) sesionDiv.style.display = 'none';
    }
}

// ============ CATEGORÍAS ============
function agregarCategoriaLocal() {
    const input = document.getElementById('nombre-categoria');
    const nombre = input.value.trim();
    if (!nombre) return;
    if (appData.categorias.includes(nombre)) { alert('Ya existe.'); return; }
    appData.categorias.push(nombre);
    guardarDatosLocal();
    input.value = '';
    renderizarCategorias();
}

function eliminarCategoria(nombre) {
    if (!confirm('¿Eliminar "' + nombre + '"?')) return;
    appData.categorias = appData.categorias.filter(c => c !== nombre);
    guardarDatosLocal();
    renderizarCategorias();
}

function renderizarCategorias() {
    const c = document.getElementById('lista-categorias');
    if (!c) return;
    if (appData.categorias.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay categorías.</p>';
        return;
    }
    c.innerHTML = '<h3>Categorías (' + appData.categorias.length + ')</h3>' +
        appData.categorias.map(cat => 
            '<div class="categoria-card"><span class="categoria-nombre">📌 ' + cat + '</span><button class="btn-delete btn-small" onclick="window.eliminarCategoria(\'' + cat + '\')">🗑️ Eliminar</button></div>'
        ).join('');
}

// ============ PARTICIPANTES ============
function registrarParticipanteLocal() {
    const nombre = document.getElementById('nombre-participante').value.trim();
    const tipo = document.getElementById('tipo-participante').value;
    if (!nombre) return;
    
    const codigo = generarCodigo();
    appData.participantes.push({ id: generarId(), nombre, tipo, codigo });
    guardarDatosLocal();
    
    alert('✅ Registrado\n\n👤 ' + nombre + '\n🔑 Código: ' + codigo + '\n📋 ' + tipo);
    document.getElementById('form-registro').reset();
    renderizarParticipantes();
}

function renderizarParticipantes() {
    const c = document.getElementById('lista-participantes');
    if (!c) return;
    if (appData.participantes.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay participantes.</p>';
        return;
    }
    c.innerHTML = '<h3>Participantes (' + appData.participantes.length + ')</h3>' + 
        appData.participantes.map(p => 
        '<div class="card"><div class="card-header"><strong>' + p.nombre + '</strong><span class="badge badge-' + p.tipo + '">' + (p.tipo === 'cocinero' ? 'Cocinero' : 'Invitado') + '</span></div><p>🔑 <strong>Código:</strong> <code>' + p.codigo + '</code></p><button class="btn-delete" onclick="window.eliminarParticipante(\'' + p.id + '\')">🗑️ Eliminar</button></div>'
    ).join('');
}

function eliminarParticipante(id) {
    if (!confirm('¿Eliminar?')) return;
    appData.participantes = appData.participantes.filter(p => p.id !== id);
    appData.platos = appData.platos.filter(p => p.cocinero_id !== id);
    appData.calificaciones = appData.calificaciones.filter(c => c.juez_id !== id);
    guardarDatosLocal();
    renderizarParticipantes();
}

// ============ PLATOS ============
function prepararPanelPlatos() {
    const cocineroSelect = document.getElementById('cocinero-select');
    const cocineroGroup = document.getElementById('cocinero-group');
    const banner = document.getElementById('platos-admin-banner');
    
    if (sesionActual?.esAdmin) {
        if (banner) banner.style.display = 'block';
        if (cocineroGroup) cocineroGroup.style.display = 'block';
        if (cocineroSelect) {
            cocineroSelect.setAttribute('required', '');
            cocineroSelect.style.display = '';
            const cocineros = appData.participantes.filter(p => p.tipo === 'cocinero');
            cocineroSelect.innerHTML = '<option value="">Seleccione...</option>' + 
                cocineros.map(c => '<option value="' + c.id + '">' + c.nombre + '</option>').join('');
        }
    } else {
        if (banner) banner.style.display = 'none';
        if (cocineroGroup) cocineroGroup.style.display = 'none';
        if (cocineroSelect) { cocineroSelect.removeAttribute('required'); cocineroSelect.style.display = 'none'; }
    }
    renderizarPlatos();
}

function registrarPlatoLocal() {
    let cocinero_id;
    if (sesionActual?.esAdmin) {
        cocinero_id = document.getElementById('cocinero-select').value;
    } else if (sesionActual?.tipo === 'cocinero') {
        cocinero_id = sesionActual.id;
    } else { alert('Sin permisos.'); return; }
    
    const nombre = document.getElementById('nombre-plato').value.trim();
    const descripcion = document.getElementById('descripcion-plato').value.trim();
    if (!cocinero_id || !nombre) { alert('Complete los datos.'); return; }
    
    appData.platos.push({ id: generarId(), nombre, descripcion, cocinero_id });
    guardarDatosLocal();
    document.getElementById('form-plato').reset();
    prepararPanelPlatos();
    alert('✅ Plato registrado.');
}

function renderizarPlatos() {
    const c = document.getElementById('lista-platos');
    if (!c) return;
    let platos = appData.platos;
    if (sesionActual?.tipo === 'cocinero' && !sesionActual?.esAdmin) {
        platos = appData.platos.filter(p => p.cocinero_id === sesionActual.id);
    }
    if (platos.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay platos.</p>';
        return;
    }
    c.innerHTML = '<h3>Platos (' + platos.length + ')</h3>' + platos.map(p => {
        const co = obtenerParticipante(p.cocinero_id);
        return '<div class="card"><div class="card-header"><strong>🍽️ ' + p.nombre + '</strong><span>' + (co ? co.nombre : '?') + '</span></div>' +
            (p.descripcion ? '<p>' + p.descripcion + '</p>' : '') +
            '<button class="btn-delete" onclick="window.eliminarPlato(\'' + p.id + '\')">🗑️ Eliminar</button></div>';
    }).join('');
}

function eliminarPlato(id) {
    if (!confirm('¿Eliminar?')) return;
    appData.platos = appData.platos.filter(p => p.id !== id);
    appData.calificaciones = appData.calificaciones.filter(c => c.plato_id !== id);
    guardarDatosLocal();
    prepararPanelPlatos();
}

// ============ FINALIZAR ============
function finalizarConcurso() {
    if (!sesionActual?.esAdmin) return;
    if (!confirm('⚠️ ¿Finalizar concurso?')) return;
    concursoFinalizado = true;
    guardarDatosLocal();
    actualizarBannerFinalizado();
    lanzarConfetti();
    renderizarResultados();
    alert('🏆 ¡Concurso Finalizado!');
}

function reabrirConcurso() {
    if (!sesionActual?.esAdmin) return;
    if (!confirm('¿Reabrir?')) return;
    concursoFinalizado = false;
    guardarDatosLocal();
    actualizarBannerFinalizado();
    renderizarResultados();
    alert('✅ Concurso reabierto.');
}

function actualizarBannerFinalizado() {
    const banner = document.getElementById('banner-finalizado');
    const btnFinalizar = document.getElementById('btn-finalizar');
    const podio = document.getElementById('podio-final');
    if (concursoFinalizado) {
        if (banner) banner.style.display = 'block';
        if (btnFinalizar) { btnFinalizar.textContent = '🔄 Reabrir'; btnFinalizar.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)'; btnFinalizar.style.color = '#fff'; }
        if (podio) podio.style.display = 'block';
    } else {
        if (banner) banner.style.display = 'none';
        if (btnFinalizar) { btnFinalizar.textContent = '🏆 Finalizar'; btnFinalizar.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)'; btnFinalizar.style.color = '#1a1a2e'; }
        if (podio) podio.style.display = 'none';
    }
}

function lanzarConfetti() {
    const colores = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFA500', '#C9A96E'];
    for (let i = 0; i < 60; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.width = (Math.random() * 10 + 5) + 'px';
            confetti.style.height = (Math.random() * 10 + 5) + 'px';
            confetti.style.background = colores[Math.floor(Math.random() * colores.length)];
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }, i * 20);
    }
}

// ============ CALIFICACIÓN ============
function renderizarCalificacion(juezId) {
    const c = document.getElementById('platos-a-calificar');
    if (!c) return;
    if (concursoFinalizado) { c.innerHTML = '<p class="empty-message">🔒 Concurso finalizado.</p>'; return; }
    if (!appData.categorias.length) { c.innerHTML = '<p class="empty-message">No hay categorías.</p>'; return; }
    if (sesionActual?.esAdmin) { c.innerHTML = '<p class="empty-message">Use código de invitado.</p>'; return; }
    
    const platos = appData.platos.filter(p => p.cocinero_id !== juezId);
    if (!platos.length) { c.innerHTML = '<p class="empty-message">No hay platos para evaluar.</p>'; return; }
    
    c.innerHTML = platos.map(p => {
        const cal = appData.calificaciones.find(c => c.plato_id === p.id && c.juez_id === juezId);
        const co = obtenerParticipante(p.cocinero_id);
        let html = '<div class="voto-card"><div class="voto-card-header"><strong>🍽️ ' + p.nombre + '</strong><span>de ' + (co?co.nombre:'?') + '</span></div>' + (p.descripcion?'<p>'+p.descripcion+'</p>':'');
        if (cal) {
            html += '<div style="background:var(--card);padding:1rem;border-radius:8px;"><strong>✅ Calificado</strong>';
            appData.categorias.forEach(cat => {
                const punt = cal.puntuaciones?.[cat] || 0;
                html += '<div>' + cat + ': ' + '★'.repeat(punt) + '☆'.repeat(5-punt) + '</div>';
            });
            if (cal.comentario) html += '<div>💬 "' + cal.comentario + '"</div>';
            html += '<button class="btn-delete btn-small" onclick="window.cambiarCalificacion(\''+cal.id+'\',\''+juezId+'\')">✏️ Modificar</button></div>';
        } else {
            html += '<div style="background:var(--card);padding:1rem;border-radius:8px;">';
            appData.categorias.forEach(cat => {
                html += '<div class="categoria-voto"><label>' + cat + ':</label><div class="stars">' +
                    [1,2,3,4,5].map(n => '<span onclick="window.seleccionarEstrella(this,'+n+')">★</span>').join('') +
                    '</div><input type="hidden" class="punt-hidden" data-cat="' + cat + '" value="0"></div>';
            });
            html += '<textarea class="comentario" placeholder="Comentario..." rows="2"></textarea>' +
                '<button class="btn-primary btn-small" onclick="window.enviarCal(\''+p.id+'\',\''+juezId+'\')">✅ Enviar</button></div>';
        }
        return html + '</div>';
    }).join('');
}

function seleccionarEstrella(el, val) {
    const stars = el.parentElement.querySelectorAll('span');
    const hidden = el.parentElement.parentElement.querySelector('.punt-hidden');
    stars.forEach((s, i) => { s.style.opacity = i < val ? '1' : '0.7'; });
    if (hidden) hidden.value = val;
}

function enviarCal(platoId, juezId) {
    if (concursoFinalizado) { alert('🔒 Finalizado.'); return; }
    const card = document.querySelector('.voto-card:has(button[onclick*="'+platoId+'"])');
    const puntuaciones = {};
    card.querySelectorAll('.punt-hidden').forEach(inp => { puntuaciones[inp.dataset.cat] = parseInt(inp.value) || 0; });
    const sin = appData.categorias.filter(cat => !puntuaciones[cat] || puntuaciones[cat] === 0);
    if (sin.length) { alert('Falta: ' + sin.join(', ')); return; }
    const comentario = card.querySelector('.comentario')?.value.trim() || '';
    appData.calificaciones.push({ id: generarId(), plato_id: platoId, juez_id: juezId, puntuaciones, comentario });
    guardarDatosLocal();
    renderizarCalificacion(juezId);
    alert('✅ ¡Calificado!');
}

function cambiarCalificacion(calId, juezId) {
    if (concursoFinalizado) { alert('🔒 Finalizado.'); return; }
    if (!confirm('¿Modificar?')) return;
    appData.calificaciones = appData.calificaciones.filter(c => c.id !== calId);
    guardarDatosLocal();
    renderizarCalificacion(juezId);
}

// ============ RESULTADOS ============
function renderizarResultados() {
    const c = document.getElementById('tabla-resultados');
    const podio = document.getElementById('podio-final');
    if (!c) return;
    if (!appData.platos.length) { c.innerHTML = '<p class="empty-message">No hay platos.</p>'; return; }
    actualizarBannerFinalizado();
    
    const ranking = appData.platos.map(p => {
        const co = obtenerParticipante(p.cocinero_id);
        const totalJ = appData.participantes.filter(pa => pa.id !== p.cocinero_id).length || 1;
        const cals = appData.calificaciones.filter(cal => cal.plato_id === p.id);
        let det = {}, suma = 0, cant = 0;
        appData.categorias.forEach(cat => {
            const pts = cals.filter(cal => cal.puntuaciones?.[cat] > 0).map(cal => cal.puntuaciones[cat]);
            const prom = pts.reduce((s,v)=>s+v,0) / totalJ;
            det[cat] = Math.round(prom*10)/10;
            suma += prom; cant++;
        });
        return { ...p, cocinero: co, promedio: cant ? Math.round((suma/cant)*10)/10 : 0, totalVotos: cals.length, totalJurados: totalJ, detalle: det };
    }).sort((a,b) => b.promedio - a.promedio);
    
    if (concursoFinalizado && ranking.length >= 3) {
        podio.style.display = 'block';
        podio.innerHTML = '<h3>🥇 PODIO 🥇</h3><div class="podio-container">' +
            '<div class="podio-puesto podio-2"><div class="podio-bar"><div class="podio-medalla">🥈</div><div>'+ranking[1].nombre+'</div><div>'+ranking[1].promedio.toFixed(1)+'</div></div><div class="podio-label">2°</div></div>' +
            '<div class="podio-puesto podio-1"><div class="podio-bar"><div class="podio-medalla">👑</div><div>'+ranking[0].nombre+'</div><div>'+ranking[0].promedio.toFixed(1)+'</div></div><div class="podio-label">🏆 CAMPEÓN</div></div>' +
            '<div class="podio-puesto podio-3"><div class="podio-bar"><div class="podio-medalla">🥉</div><div>'+ranking[2].nombre+'</div><div>'+ranking[2].promedio.toFixed(1)+'</div></div><div class="podio-label">3°</div></div></div>';
    } else { podio.style.display = 'none'; }
    
    c.innerHTML = '<h3>📊 Clasificación</h3>' + ranking.map((item, i) => {
        let dh = '';
        for (const [k,v] of Object.entries(item.detalle)) dh += '<span>📌 '+k+': <strong>'+v.toFixed(1)+'</strong></span>';
        return '<div class="ranking-item rank-'+(i<3?i+1:'')+'"><div class="rank-pos">'+(['🥇','🥈','🥉'][i]||'#'+(i+1))+'</div><div class="rank-info"><strong>'+item.nombre+'</strong><div>'+item.totalVotos+'/'+item.totalJurados+' jurados</div><div class="rank-detalle">'+dh+'</div></div><div class="rank-puntos">'+item.promedio.toFixed(1)+'</div></div>';
    }).join('');
}

// ============ GLOBALES ============
window.eliminarParticipante = eliminarParticipante;
window.eliminarPlato = eliminarPlato;
window.eliminarCategoria = eliminarCategoria;
window.seleccionarEstrella = seleccionarEstrella;
window.enviarCal = enviarCal;
window.cambiarCalificacion = cambiarCalificacion;
