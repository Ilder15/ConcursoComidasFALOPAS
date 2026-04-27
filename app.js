// ============ CONFIGURACIÓN ============
const CODIGO_ADMIN = '123456';
let concursoFinalizado = false; // AGREGAR ESTA LÍNEA

const STORAGE_KEY = 'concurso_falopas_data';
const SESSION_KEY = 'concurso_falopas_session';
const THEME_KEY = 'concurso_falopas_theme';
const FINALIZADO_KEY = 'concurso_falopas_finalizado'; // AGREGAR ESTA LÍNEA
const API_URL = 'https://script.google.com/macros/s/AKfycbxQsjLPy5cDEdHgkHpNJAsrxhD_pxsOUFw2KDuSGF2d6bUkkKGIsRIU8uA8ldWFm8w/exec';

const CATEGORIAS_DEFAULT = ['Presentación', 'Sabor', 'Originalidad', 'Bebida'];

let appData = {
    participantes: [],
    platos: [],
    categorias: [...CATEGORIAS_DEFAULT],
    calificaciones: []
};

let sesionActual = null;

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', function() {
    cargarDatos();
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

// ============ DATOS ============
function cargarDatos() {
    try {
        const datos = localStorage.getItem(STORAGE_KEY);
        if (datos) {
            const parsed = JSON.parse(datos);
            appData.participantes = parsed.participantes || [];
            appData.platos = parsed.platos || [];
            appData.categorias = parsed.categorias || [...CATEGORIAS_DEFAULT];
            appData.calificaciones = parsed.calificaciones || [];
        }
    } catch(e) {}
    
    try {
        const sesion = localStorage.getItem(SESSION_KEY);
        if (sesion) sesionActual = JSON.parse(sesion);
    } catch(e) {}
    
    concursoFinalizado = localStorage.getItem(FINALIZADO_KEY) === 'true';
}

function guardarDatos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function guardarSesion() {
    if (sesionActual) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sesionActual));
    } else {
        localStorage.removeItem(SESSION_KEY);
    }
}

// ============ TEMA ============
function cargarTema() {
    const tema = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', tema);
    actualizarIconoTema(tema);
}

function toggleTheme() {
    const actual = document.documentElement.getAttribute('data-theme');
    const nuevo = actual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    localStorage.setItem(THEME_KEY, nuevo);
    actualizarIconoTema(nuevo);
}

function actualizarIconoTema(tema) {
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = tema === 'dark' ? '☀️' : '🌙';
}

// ============ MENÚ DINÁMICO ============
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
        nav.innerHTML = `
            <button class="nav-btn active" data-tab="login">🔐 Iniciar Sesión</button>
        `;
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.dataset.tab;
            
            if (target === 'logout') {
                cerrarSesion();
                return;
            }
            
            if ((target === 'calificar' || target === 'resultados') && !sesionActual) {
                alert('Debe iniciar sesión primero.');
                return;
            }
            
            if ((target === 'registro' || target === 'categorias') && (!sesionActual || !sesionActual.esAdmin)) {
                alert('Acceso restringido al administrador.');
                return;
            }
            
            mostrarPanel(target);
        });
    });
}

// ============ EVENTOS ============
function configurarEventos() {
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    
    document.getElementById('form-login').addEventListener('submit', function(e) {
        e.preventDefault();
        hacerLogin();
    });
    
    document.getElementById('form-registro').addEventListener('submit', function(e) {
        e.preventDefault();
        if (!sesionActual || !sesionActual.esAdmin) return;
        registrarParticipante();
    });
    
    document.getElementById('form-categoria').addEventListener('submit', function(e) {
        e.preventDefault();
        if (!sesionActual || !sesionActual.esAdmin) return;
        agregarCategoria();
    });
    
    document.getElementById('form-plato').addEventListener('submit', function(e) {
        e.preventDefault();
        registrarPlato();
    });
    
    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', cerrarSesion);
    document.getElementById('btn-actualizar-resultados')?.addEventListener('click', renderizarResultados);
       // Botón finalizar concurso
    const btnFinalizar = document.getElementById('btn-finalizar');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', finalizarConcurso);
    }
}

// ============ UTILIDADES ============
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function obtenerParticipante(id) {
    return appData.participantes.find(p => p.id === id);
}

function generarCodigo() {
    let codigo;
    do {
        codigo = Math.floor(100000 + Math.random() * 900000).toString();
    } while (appData.participantes.some(p => p.codigo === codigo) || codigo === CODIGO_ADMIN);
    return codigo;
}
// ============ FINALIZAR CONCURSO ============
function finalizarConcurso() {
    if (!sesionActual || !sesionActual.esAdmin) {
        alert('Solo el administrador puede finalizar el concurso.');
        return;
    }
    
    if (concursoFinalizado) {
        alert('El concurso ya está finalizado.');
        return;
    }
    
    if (appData.platos.length === 0) {
        alert('No hay platos registrados para finalizar el concurso.');
        return;
    }
    
    if (!confirm('⚠️ ¿Está seguro de FINALIZAR el concurso?\n\n' +
                 '• Se mostrarán los resultados oficiales\n' +
                 '• Se bloquearán las votaciones\n' +
                 '• Esta acción no se puede deshacer\n\n' +
                 '¿Continuar?')) {
        return;
    }
    
    concursoFinalizado = true;
    localStorage.setItem(FINALIZADO_KEY, 'true');
    
    // Efecto de confetti
    lanzarConfetti();
    
    // Actualizar UI
    actualizarBannerFinalizado();
    renderizarResultados();
    mostrarPanel('resultados');
    
    // Bloquear panel de calificación
    const platosCalificar = document.getElementById('platos-a-calificar');
    if (platosCalificar) {
        platosCalificar.innerHTML = '<div class="votacion-bloqueada" style="padding:3rem;text-align:center;">' +
            '<p class="empty-message">🔒 El concurso ha finalizado. Las votaciones están cerradas.</p>' +
            '</div>';
    }
    
    alert('🏆 ¡Concurso Finalizado! 🏆\n\nResultados oficiales publicados.');
}

function revertirFinalizacion() {
    if (!sesionActual || !sesionActual.esAdmin) {
        alert('Solo el administrador puede revertir la finalización.');
        return;
    }
    
    if (!concursoFinalizado) return;
    
    if (!confirm('¿Revertir la finalización del concurso?\nSe habilitarán las votaciones nuevamente.')) return;
    
    concursoFinalizado = false;
    localStorage.setItem(FINALIZADO_KEY, 'false');
    actualizarBannerFinalizado();
    renderizarResultados();
    alert('✅ Concurso reabierto. Los participantes pueden volver a votar.');
}

function actualizarBannerFinalizado() {
    const banner = document.getElementById('banner-finalizado');
    const btnFinalizar = document.getElementById('btn-finalizar');
    const podio = document.getElementById('podio-final');
    
    if (concursoFinalizado) {
        if (banner) banner.style.display = 'block';
        if (btnFinalizar) {
            btnFinalizar.textContent = '🔄 Reabrir Concurso';
            btnFinalizar.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            btnFinalizar.style.color = '#fff';
            btnFinalizar.onclick = revertirFinalizacion;
        }
        if (podio) podio.style.display = 'block';
    } else {
        if (banner) banner.style.display = 'none';
        if (btnFinalizar) {
            btnFinalizar.textContent = '🏆 Finalizar Concurso';
            btnFinalizar.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
            btnFinalizar.style.color = '#1a1a2e';
            btnFinalizar.onclick = finalizarConcurso;
        }
        if (podio) podio.style.display = 'none';
    }
}

function lanzarConfetti() {
    const colores = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFA500', '#C9A96E', '#FF69B4', '#00D2FF'];
    
    for (let i = 0; i < 80; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.width = (Math.random() * 10 + 5) + 'px';
            confetti.style.height = (Math.random() * 10 + 5) + 'px';
            confetti.style.background = colores[Math.floor(Math.random() * colores.length)];
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
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

// ============ PANEL PLATOS (CORREGIDO) ============
function prepararPanelPlatos() {
    const cocineroSelect = document.getElementById('cocinero-select');
    const cocineroGroup = document.getElementById('cocinero-group');
    const banner = document.getElementById('platos-admin-banner');
    
    if (sesionActual && sesionActual.esAdmin) {
        // Admin: mostrar selector de cocinero
        if (banner) banner.style.display = 'block';
        if (cocineroGroup) cocineroGroup.style.display = 'block';
        if (cocineroSelect) {
            cocineroSelect.setAttribute('required', '');
            cocineroSelect.style.display = '';
        }
        renderizarCocineros();
    } else if (sesionActual && sesionActual.tipo === 'cocinero') {
        // Cocinero: ocultar selector (registra sus propios platos)
        if (banner) banner.style.display = 'none';
        if (cocineroGroup) cocineroGroup.style.display = 'none';
        if (cocineroSelect) {
            cocineroSelect.removeAttribute('required');
            cocineroSelect.style.display = 'none';
        }
    }
    
    renderizarPlatos();
}

// ============ LOGIN ============
function hacerLogin() {
    const codigo = document.getElementById('codigo-input').value.trim();
    const errorDiv = document.getElementById('login-error');
    
    if (!codigo || codigo.length !== 6) {
        if (errorDiv) { errorDiv.textContent = 'El código debe tener 6 dígitos.'; errorDiv.style.display = 'block'; }
        return;
    }
    
    if (codigo === CODIGO_ADMIN) {
        sesionActual = { id: 'admin', nombre: 'Administrador', tipo: 'admin', codigo: CODIGO_ADMIN, esAdmin: true };
        guardarSesion();
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
    guardarSesion();
    actualizarUISesion();
    construirMenu();
    document.getElementById('codigo-input').value = '';
    if (errorDiv) errorDiv.style.display = 'none';
    mostrarPanel('calificar');
}

function cerrarSesion() {
    sesionActual = null;
    guardarSesion();
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
function agregarCategoria() {
    const input = document.getElementById('nombre-categoria');
    const nombre = input.value.trim();
    if (!nombre) return;
    if (appData.categorias.includes(nombre)) { alert('Esa categoría ya existe.'); return; }
    
    appData.categorias.push(nombre);
    guardarDatos();
    input.value = '';
    renderizarCategorias();
}

function eliminarCategoria(nombre) {
    if (!confirm('¿Eliminar la categoría "' + nombre + '"?')) return;
    appData.categorias = appData.categorias.filter(c => c !== nombre);
    appData.calificaciones.forEach(cal => {
        if (cal.puntuaciones && cal.puntuaciones[nombre] !== undefined) delete cal.puntuaciones[nombre];
    });
    guardarDatos();
    renderizarCategorias();
}

function renderizarCategorias() {
    const c = document.getElementById('lista-categorias');
    if (!c) return;
    if (appData.categorias.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay categorías configuradas.</p>';
        return;
    }
    c.innerHTML = '<h3>Categorías (' + appData.categorias.length + ')</h3>' +
        appData.categorias.map(cat => 
            '<div class="categoria-card"><span class="categoria-nombre">📌 ' + cat + '</span><button class="btn-delete btn-small" onclick="window.eliminarCategoria(\'' + cat + '\')">🗑️ Eliminar</button></div>'
        ).join('');
}

// ============ REGISTRO ============
function registrarParticipante() {
    const nombre = document.getElementById('nombre-participante').value.trim();
    const tipo = document.getElementById('tipo-participante').value;
    if (!nombre) return;
    
    const codigo = generarCodigo();
    appData.participantes.push({ id: generarId(), nombre, tipo, codigo });
    guardarDatos();
    alert('✅ Participante registrado.\n\n👤 ' + nombre + '\n🔑 Código: ' + codigo + '\n📋 ' + (tipo === 'cocinero' ? 'Cocinero/a' : 'Invitado/a'));
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
    guardarDatos();
    renderizarParticipantes();
}

// ============ PLATOS ============
function renderizarCocineros() {
    const s = document.getElementById('cocinero-select');
    if (!s) return;
    const cocineros = appData.participantes.filter(p => p.tipo === 'cocinero');
    s.innerHTML = '<option value="">Seleccione un cocinero...</option>' + 
        cocineros.map(c => '<option value="' + c.id + '">' + c.nombre + '</option>').join('');
}

function registrarPlato() {
    let cocinero_id;
    
    if (sesionActual && sesionActual.esAdmin) {
        cocinero_id = document.getElementById('cocinero-select').value;
    } else if (sesionActual && sesionActual.tipo === 'cocinero') {
        cocinero_id = sesionActual.id;
    } else {
        alert('No tiene permisos.');
        return;
    }
    
    const nombre = document.getElementById('nombre-plato').value.trim();
    const descripcion = document.getElementById('descripcion-plato').value.trim();
    
    if (!cocinero_id || !nombre) {
        alert('Complete el nombre del plato.');
        return;
    }
    
    appData.platos.push({ id: generarId(), nombre, descripcion, cocinero_id });
    guardarDatos();
    document.getElementById('form-plato').reset();
    prepararPanelPlatos();
    alert('✅ Plato registrado.');
}

function renderizarPlatos() {
    const c = document.getElementById('lista-platos');
    if (!c) return;
    
    let platosFiltrados = appData.platos;
    if (sesionActual && sesionActual.tipo === 'cocinero' && !sesionActual.esAdmin) {
        platosFiltrados = appData.platos.filter(p => p.cocinero_id === sesionActual.id);
    }
    
    if (platosFiltrados.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay platos registrados.</p>';
        return;
    }
    
    c.innerHTML = '<h3>Platos (' + platosFiltrados.length + ')</h3>' + platosFiltrados.map(p => {
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
    guardarDatos();
    prepararPanelPlatos();
}

// ============ CALIFICACIÓN ============
function renderizarCalificacion(juezId) {
    const c = document.getElementById('platos-a-calificar');
    if (!c) return;
    
    // Si el concurso está finalizado, bloquear
    if (concursoFinalizado) {
        c.innerHTML = '<div class="votacion-bloqueada" style="padding:3rem;text-align:center;">' +
            '<p class="empty-message">🔒 El concurso ha finalizado. Las votaciones están cerradas.</p>' +
            '</div>';
        return;
    }
    
    if (appData.categorias.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay categorías configuradas. Contacte al administrador.</p>';
        return;
    }
    
    if (sesionActual && sesionActual.esAdmin) {
        c.innerHTML = '<p class="empty-message">Como administrador, use un código de invitado o cocinero para calificar.</p>';
        return;
    }
    
    // Filtrar platos: no se puede calificar el propio
    const platos = appData.platos.filter(p => p.cocinero_id !== juezId);
    
    if (platos.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay platos disponibles para evaluar. Espere a que otros cocineros registren sus platos.</p>';
        return;
    }
    
    c.innerHTML = platos.map(p => {
        const calExistente = appData.calificaciones.find(cal => cal.plato_id === p.id && cal.juez_id === juezId);
        const co = obtenerParticipante(p.cocinero_id);
        
        let html = '<div class="voto-card">' +
            '<div class="voto-card-header">' +
                '<strong>🍽️ ' + p.nombre + '</strong>' +
                '<span style="font-size:0.85rem;color:var(--text-light);">de ' + (co ? co.nombre : '?') + '</span>' +
            '</div>' +
            (p.descripcion ? '<p style="font-size:0.9rem;color:var(--text-light);margin-bottom:1rem;">' + p.descripcion + '</p>' : '');
        
        if (calExistente) {
            // Mostrar calificación existente
            html += '<div style="background:var(--card);padding:1rem;border-radius:8px;margin-bottom:0.5rem;">' +
                '<strong>✅ Ya calificado</strong>';
            
            appData.categorias.forEach(cat => {
                const punt = calExistente.puntuaciones && calExistente.puntuaciones[cat] ? calExistente.puntuaciones[cat] : 0;
                html += '<div style="margin-top:0.3rem;">' +
                    '<span style="font-size:0.85rem;">' + cat + ':</span> ' +
                    '★'.repeat(punt) + '☆'.repeat(5-punt) + ' (' + punt + '/5)' +
                    '</div>';
            });
            
            if (calExistente.comentario) {
                html += '<div style="margin-top:0.3rem;font-style:italic;color:var(--text-light);">💬 "' + calExistente.comentario + '"</div>';
            }
            
            html += '<button class="btn-delete btn-small" style="margin-top:0.5rem;" onclick="window.cambiarCalificacion(\'' + calExistente.id + '\',\'' + juezId + '\')">✏️ Modificar Calificación</button>' +
                '</div>';
        } else {
            // Formulario para calificar
            html += '<div style="background:var(--card);padding:1rem;border-radius:8px;">';
            
            // Categorías con estrellas
            appData.categorias.forEach(cat => {
                html += '<div class="categoria-voto">' +
                    '<label>' + cat + ' (1-5):</label>' +
                    '<div class="stars" data-plato="' + p.id + '" data-categoria="' + cat + '">' +
                        [1,2,3,4,5].map(n => 
                            '<span onclick="window.seleccionarEstrella(this, ' + n + ')" data-valor="' + n + '">★</span>'
                        ).join('') +
                    '</div>' +
                    '<input type="hidden" class="puntuacion-hidden" data-categoria="' + cat + '" value="0">' +
                '</div>';
            });
            
            // Comentario general
            html += '<div class="form-group" style="margin-top:0.8rem;">' +
                '<label>Comentario general (opcional):</label>' +
                '<textarea class="comentario-general" placeholder="Un comentario sobre el plato..." rows="2" style="width:100%;"></textarea>' +
                '</div>';
            
            // Botón de enviar
            html += '<button class="btn-primary btn-small" onclick="window.enviarCalificacion(\'' + p.id + '\',\'' + juezId + '\')">✅ Enviar Calificación</button>' +
                '</div>';
        }
        
        html += '</div>';
        return html;
    }).join('');
}

// Seleccionar estrella individual
function seleccionarEstrella(elemento, valor) {
    const starsDiv = elemento.parentElement;
    const todasLasEstrellas = starsDiv.querySelectorAll('span');
    const hiddenInput = starsDiv.parentElement.querySelector('.puntuacion-hidden');
    
    todasLasEstrellas.forEach((estrella, index) => {
        if (index < valor) {
            estrella.classList.add('active');
            estrella.style.opacity = '1';
        } else {
            estrella.classList.remove('active');
            estrella.style.opacity = '0.7';
        }
    });
    
    if (hiddenInput) {
        hiddenInput.value = valor;
    }
}

// Enviar calificación completa
function enviarCalificacion(platoId, juezId) {
    // Verificar si el concurso está finalizado
    if (concursoFinalizado) {
        alert('🔒 El concurso ha finalizado. No se aceptan más calificaciones.');
        return;
    }
    
    const votoCard = document.querySelector('.voto-card:has(button[onclick*="' + platoId + '"])');
    if (!votoCard) {
        alert('Error: No se encontró el formulario de calificación.');
        return;
    }
    
    // Recolectar puntuaciones por categoría
    const puntuaciones = {};
    const hiddenInputs = votoCard.querySelectorAll('.puntuacion-hidden');
    
    hiddenInputs.forEach(input => {
        const categoria = input.dataset.categoria;
        const valor = parseInt(input.value);
        puntuaciones[categoria] = valor || 0;
    });
    
    // Verificar que todas las categorías tengan puntuación
    const sinCalificar = appData.categorias.filter(cat => !puntuaciones[cat] || puntuaciones[cat] === 0);
    if (sinCalificar.length > 0) {
        alert('⚠️ Por favor califique todas las categorías:\n' + sinCalificar.join(', ') + 
              '\n\nDebe seleccionar al menos 1 estrella en cada una.');
        return;
    }
    
    // Validar que todas las puntuaciones estén entre 1 y 5
    for (const [cat, punt] of Object.entries(puntuaciones)) {
        if (punt < 1 || punt > 5) {
            alert('⚠️ Error en la categoría "' + cat + '": la puntuación debe ser entre 1 y 5.');
            return;
        }
    }
    
    // Obtener comentario
    const comentarioInput = votoCard.querySelector('.comentario-general');
    const comentario = comentarioInput ? comentarioInput.value.trim() : '';
    
    // Guardar calificación
    appData.calificaciones.push({
        id: generarId(),
        plato_id: platoId,
        juez_id: juezId,
        puntuaciones,
        comentario
    });
    
    guardarDatos();
    renderizarCalificacion(juezId);
    
    // Mostrar confirmación
    const plato = obtenerPlato(platoId);
    alert('✅ ¡Calificación enviada correctamente!\n\nPlato: ' + (plato ? plato.nombre : 'Desconocido'));
}


// ============ RESULTADOS ============
function renderizarResultados() {
    const c = document.getElementById('tabla-resultados');
    const podioDiv = document.getElementById('podio-final');
    if (!c) return;
    
    if (appData.platos.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay platos.</p>';
        if (podioDiv) podioDiv.style.display = 'none';
        return;
    }
    
    if (appData.categorias.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay categorías configuradas.</p>';
        return;
    }
    
    actualizarBannerFinalizado();
    
    const ranking = appData.platos.map(p => {
        const cocinero = obtenerParticipante(p.cocinero_id);
        const totalJuradosPosibles = appData.participantes.filter(
            part => part.id !== p.cocinero_id
        ).length;
        
        if (totalJuradosPosibles === 0) {
            return {
                ...p,
                cocinero: cocinero,
                promedio: 0,
                totalVotos: 0,
                totalJurados: 0,
                detalleCategorias: {}
            };
        }
        
        const cals = appData.calificaciones.filter(cal => cal.plato_id === p.id);
        let detalleCategorias = {};
        let sumaTotalCategorias = 0;
        let cantidadCategorias = 0;
        
        appData.categorias.forEach(cat => {
            const puntuacionesCat = cals
                .filter(cal => cal.puntuaciones && cal.puntuaciones[cat] && cal.puntuaciones[cat] > 0)
                .map(cal => cal.puntuaciones[cat]);
            
            const sumaPuntosCat = puntuacionesCat.reduce((s, v) => s + v, 0);
            const promCat = totalJuradosPosibles > 0 ? sumaPuntosCat / totalJuradosPosibles : 0;
            
            detalleCategorias[cat] = Math.round(promCat * 10) / 10;
            sumaTotalCategorias += promCat;
            cantidadCategorias++;
        });
        
        const promedioGeneral = cantidadCategorias > 0 ? sumaTotalCategorias / cantidadCategorias : 0;
        
        return {
            ...p,
            cocinero: cocinero,
            promedio: Math.round(promedioGeneral * 10) / 10,
            totalVotos: cals.length,
            totalJurados: totalJuradosPosibles,
            detalleCategorias
        };
    }).sort((a, b) => b.promedio - a.promedio);
    
    // Renderizar podio si está finalizado
    if (concursoFinalizado && podioDiv && ranking.length >= 3) {
        podioDiv.style.display = 'block';
        podioDiv.innerHTML = `
            <h3 style="text-align:center;margin-bottom:1rem;">🥇 PODIO OFICIAL 🥇</h3>
            <div class="podio-container">
                <!-- 2do puesto -->
                <div class="podio-puesto podio-2">
                    <div class="podio-bar">
                        <div class="podio-medalla">🥈</div>
                        <div class="podio-nombre-plato">${ranking[1].nombre}</div>
                        <div class="podio-nombre-cocinero">${ranking[1].cocinero ? ranking[1].cocinero.nombre : '?'}</div>
                        <div class="podio-puntos">${ranking[1].promedio.toFixed(1)}</div>
                    </div>
                    <div class="podio-label">2° Puesto</div>
                </div>
                
                <!-- 1er puesto -->
                <div class="podio-puesto podio-1">
                    <div class="podio-bar">
                        <div class="podio-medalla">👑</div>
                        <div class="podio-nombre-plato">${ranking[0].nombre}</div>
                        <div class="podio-nombre-cocinero">${ranking[0].cocinero ? ranking[0].cocinero.nombre : '?'}</div>
                        <div class="podio-puntos">${ranking[0].promedio.toFixed(1)}</div>
                    </div>
                    <div class="podio-label">🏆 CAMPEÓN</div>
                </div>
                
                <!-- 3er puesto -->
                <div class="podio-puesto podio-3">
                    <div class="podio-bar">
                        <div class="podio-medalla">🥉</div>
                        <div class="podio-nombre-plato">${ranking[2].nombre}</div>
                        <div class="podio-nombre-cocinero">${ranking[2].cocinero ? ranking[2].cocinero.nombre : '?'}</div>
                        <div class="podio-puntos">${ranking[2].promedio.toFixed(1)}</div>
                    </div>
                    <div class="podio-label">3° Puesto</div>
                </div>
            </div>
        `;
    } else if (podioDiv) {
        podioDiv.style.display = 'none';
    }
    
    // Renderizar tabla de ranking
    c.innerHTML = '<h3 style="margin-top:1rem;">📊 Clasificación General</h3>' + ranking.map((item, i) => {
        const clase = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
        const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        
        let detalleHTML = '';
        for (const [cat, punt] of Object.entries(item.detalleCategorias)) {
            detalleHTML += '<span>📌 ' + cat + ': <strong>' + punt.toFixed(1) + '</strong></span>';
        }
        
        const infoVotos = item.totalVotos + '/' + item.totalJurados + ' jurados';
        
        return '<div class="ranking-item ' + clase + '">' +
            '<div class="rank-pos">' + (medalla || '#' + (i+1)) + '</div>' +
            '<div class="rank-info">' +
                '<strong>' + item.nombre + '</strong>' +
                '<div>por ' + (item.cocinero ? item.cocinero.nombre : '?') + '</div>' +
                '<div style="font-size:0.8rem;">' + infoVotos + '</div>' +
                '<div class="rank-detalle">' + detalleHTML + '</div>' +
            '</div>' +
            '<div class="rank-puntos">' + item.promedio.toFixed(1) + '</div>' +
        '</div>';
    }).join('');
}
// ============ GLOBALES ============
window.eliminarParticipante = eliminarParticipante;
window.eliminarPlato = eliminarPlato;
window.eliminarCategoria = eliminarCategoria;
window.seleccionarEstrella = seleccionarEstrella;
window.enviarCalificacion = enviarCalificacion;
