// ============ CONFIGURACIÓN ============
const CODIGO_ADMIN = '123456';

const STORAGE_KEY = 'concurso_falopas_data';
const SESSION_KEY = 'concurso_falopas_session';
const THEME_KEY = 'concurso_falopas_theme';

// Categorías por defecto
const CATEGORIAS_DEFAULT = ['Presentación', 'Sabor', 'Originalidad', 'Bebida'];

let appData = {
    participantes: [],
    platos: [],
    categorias: [...CATEGORIAS_DEFAULT],
    calificaciones: [] // { id, plato_id, juez_id, puntuaciones: { categoria: puntuacion }, comentario }
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
        construirMenu();
        if (sesionActual.esAdmin) {
            mostrarPanel('categorias');
        } else {
            mostrarPanel('calificar');
        }
    } else {
        actualizarUISesion();
        construirMenu();
        mostrarPanel('login');
    }
});

// ============ DATOS ============
function cargarDatos() {
    try {
        const datos = localStorage.getItem(STORAGE_KEY);
        if (datos) {
            const parsed = JSON.parse(datos);
            appData = {
                participantes: parsed.participantes || [],
                platos: parsed.platos || [],
                categorias: parsed.categorias || [...CATEGORIAS_DEFAULT],
                calificaciones: parsed.calificaciones || []
            };
        }
    } catch(e) {}
    
    try {
        const sesion = localStorage.getItem(SESSION_KEY);
        if (sesion) sesionActual = JSON.parse(sesion);
    } catch(e) {}
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
            <button class="nav-btn active" data-tab="categorias">📋 Categorías</button>
            <button class="nav-btn" data-tab="registro">👥 Participantes</button>
            <button class="nav-btn" data-tab="platos">🍽️ Platos</button>
            <button class="nav-btn" data-tab="calificar">⭐ Calificar</button>
            <button class="nav-btn" data-tab="resultados">🏆 Resultados</button>
            <button class="nav-btn" data-tab="login" style="color:#ff6b6b;">🚪 Salir</button>
        `;
    } else if (sesionActual && sesionActual.tipo === 'cocinero') {
        nav.innerHTML = `
            <button class="nav-btn active" data-tab="calificar">⭐ Calificar</button>
            <button class="nav-btn" data-tab="platos">🍽️ Mis Platos</button>
            <button class="nav-btn" data-tab="resultados">🏆 Resultados</button>
            <button class="nav-btn" data-tab="login" style="color:#ff6b6b;">🚪 Salir</button>
        `;
    } else if (sesionActual && sesionActual.tipo === 'invitado') {
        nav.innerHTML = `
            <button class="nav-btn active" data-tab="calificar">⭐ Calificar</button>
            <button class="nav-btn" data-tab="resultados">🏆 Resultados</button>
            <button class="nav-btn" data-tab="login" style="color:#ff6b6b;">🚪 Salir</button>
        `;
    } else {
        nav.innerHTML = `
            <button class="nav-btn active" data-tab="login">🔐 Iniciar Sesión</button>
        `;
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.dataset.tab;
            
            if (target === 'login' && sesionActual) {
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
    
    document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrarSesion);
    document.getElementById('btn-actualizar-resultados').addEventListener('click', renderizarResultados);
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
        case 'platos': 
            if (sesionActual && sesionActual.esAdmin) {
                document.getElementById('platos-admin-banner').style.display = 'block';
                document.getElementById('cocinero-group').style.display = 'block';
                renderizarCocineros();
            } else if (sesionActual && sesionActual.tipo === 'cocinero') {
                document.getElementById('platos-admin-banner').style.display = 'none';
                document.getElementById('cocinero-group').style.display = 'none';
            }
            renderizarPlatos(); 
            break;
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

// ============ CATEGORÍAS (SOLO ADMIN) ============
function agregarCategoria() {
    const input = document.getElementById('nombre-categoria');
    const nombre = input.value.trim();
    
    if (!nombre) return;
    
    if (appData.categorias.includes(nombre)) {
        alert('Esa categoría ya existe.');
        return;
    }
    
    appData.categorias.push(nombre);
    guardarDatos();
    input.value = '';
    renderizarCategorias();
}

function eliminarCategoria(nombre) {
    if (!confirm('¿Eliminar la categoría "' + nombre + '"?')) return;
    
    appData.categorias = appData.categorias.filter(c => c !== nombre);
    
    // Eliminar puntuaciones de esta categoría en todas las calificaciones
    appData.calificaciones.forEach(cal => {
        if (cal.puntuaciones && cal.puntuaciones[nombre] !== undefined) {
            delete cal.puntuaciones[nombre];
        }
    });
    
    guardarDatos();
    renderizarCategorias();
}

function renderizarCategorias() {
    const c = document.getElementById('lista-categorias');
    if (!c) return;
    
    if (appData.categorias.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay categorías configuradas. Agregue al menos una.</p>';
        return;
    }
    
    c.innerHTML = '<h3>Categorías de Evaluación (' + appData.categorias.length + ')</h3>' +
        appData.categorias.map(cat => 
            '<div class="categoria-card">' +
                '<span class="categoria-nombre">📌 ' + cat + '</span>' +
                '<button class="btn-delete btn-small" onclick="window.eliminarCategoria(\'' + cat + '\')">🗑️ Eliminar</button>' +
            '</div>'
        ).join('');
}

// ============ REGISTRO (SOLO ADMIN) ============
function registrarParticipante() {
    const nombre = document.getElementById('nombre-participante').value.trim();
    const tipo = document.getElementById('tipo-participante').value;
    if (!nombre) return;
    
    const codigo = generarCodigo();
    appData.participantes.push({ id: generarId(), nombre, tipo, codigo });
    guardarDatos();
    
    alert('✅ Participante registrado.\n\n👤 Nombre: ' + nombre + 
          '\n🔑 Código: ' + codigo + 
          '\n📋 Tipo: ' + (tipo === 'cocinero' ? 'Cocinero/a' : 'Invitado/a') +
          '\n\n⚠️ Entregue este código al participante.');
    
    document.getElementById('form-registro').reset();
    renderizarParticipantes();
}

function renderizarParticipantes() {
    const c = document.getElementById('lista-participantes');
    if (!c) return;
    
    if (appData.participantes.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay participantes registrados.</p>';
        return;
    }
    
    c.innerHTML = '<h3>Participantes (' + appData.participantes.length + ')</h3>' + 
        appData.participantes.map(p => 
        '<div class="card">' +
            '<div class="card-header">' +
                '<strong>' + p.nombre + '</strong>' +
                '<span class="badge badge-' + p.tipo + '">' + (p.tipo === 'cocinero' ? 'Cocinero' : 'Invitado') + '</span>' +
            '</div>' +
            '<p style="margin:0.5rem 0;">🔑 <strong>Código:</strong> <code style="font-size:1.1rem;background:var(--bg);padding:0.2rem 0.5rem;border-radius:4px;">' + p.codigo + '</code></p>' +
            '<button class="btn-delete" onclick="window.eliminarParticipante(\'' + p.id + '\')">🗑️ Eliminar</button>' +
        '</div>'
    ).join('');
}

function eliminarParticipante(id) {
    if (!confirm('¿Eliminar participante y todos sus datos?')) return;
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
        alert('No tiene permisos para registrar platos.');
        return;
    }
    
    const nombre = document.getElementById('nombre-plato').value.trim();
    const descripcion = document.getElementById('descripcion-plato').value.trim();
    
    if (!cocinero_id || !nombre) return;
    
    appData.platos.push({ id: generarId(), nombre, descripcion, cocinero_id });
    guardarDatos();
    document.getElementById('form-plato').reset();
    renderizarPlatos();
    alert('✅ Plato registrado correctamente.');
}

function renderizarPlatos() {
    const c = document.getElementById('lista-platos');
    if (!c) return;
    
    let platosFiltrados = appData.platos;
    
    // Si es cocinero, solo ve sus platos
    if (sesionActual && sesionActual.tipo === 'cocinero' && !sesionActual.esAdmin) {
        platosFiltrados = appData.platos.filter(p => p.cocinero_id === sesionActual.id);
    }
    
    if (platosFiltrados.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay platos registrados.</p>';
        return;
    }
    
    c.innerHTML = '<h3>Platos (' + platosFiltrados.length + ')</h3>' + platosFiltrados.map(p => {
        const co = obtenerParticipante(p.cocinero_id);
        return '<div class="card">' +
            '<div class="card-header">' +
                '<strong>🍽️ ' + p.nombre + '</strong>' +
                '<span style="font-size:0.85rem;color:var(--text-light);">' + (co ? co.nombre : '?') + '</span>' +
            '</div>' +
            (p.descripcion ? '<p style="font-size:0.9rem;color:var(--text-light);">' + p.descripcion + '</p>' : '') +
            (sesionActual && (sesionActual.esAdmin || sesionActual.id === p.cocinero_id) ? 
                '<button class="btn-delete" onclick="window.eliminarPlato(\'' + p.id + '\')">🗑️ Eliminar</button>' : '') +
        '</div>';
    }).join('');
}

function eliminarPlato(id) {
    if (!confirm('¿Eliminar este plato?')) return;
    appData.platos = appData.platos.filter(p => p.id !== id);
    appData.calificaciones = appData.calificaciones.filter(c => c.plato_id !== id);
    guardarDatos();
    renderizarPlatos();
}

// ============ CALIFICACIÓN ============
function renderizarCalificacion(juezId) {
    const c = document.getElementById('platos-a-calificar');
    if (!c) return;
    
    if (appData.categorias.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay categorías configuradas para evaluar. Contacte al administrador.</p>';
        return;
    }
    
    if (sesionActual && sesionActual.esAdmin) {
        c.innerHTML = '<p class="empty-message">Como administrador puede ver todas las calificaciones en Resultados. Si desea calificar como participante, use un código de invitado.</p>';
        return;
    }
    
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
            html += '<div style="background:var(--card);padding:1rem;border-radius:8px;margin-bottom:0.5rem;">' +
                '<strong>✅ Ya calificado</strong>' +
                appData.categorias.map(cat => {
                    const punt = calExistente.puntuaciones && calExistente.puntuaciones[cat] ? calExistente.puntuaciones[cat] : 0;
                    return '<div style="margin-top:0.3rem;"><span style="font-size:0.85rem;">' + cat + ':</span> ' + '★'.repeat(punt) + '☆'.repeat(5-punt) + ' (' + punt + '/5)</div>';
                }).join('') +
                (calExistente.comentario ? '<div style="margin-top:0.3rem;font-style:italic;color:var(--text-light);">💬 "' + calExistente.comentario + '"</div>' : '') +
                '<button class="btn-delete btn-small" style="margin-top:0.5rem;" onclick="window.cambiarCalificacion(\'' + calExistente.id + '\',\'' + juezId + '\')">Modificar Calificación</button>' +
                '</div>';
        } else {
            html += '<div style="background:var(--card);padding:1rem;border-radius:8px;">';
            
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
            
            html += '<div class="form-group" style="margin-top:0.8rem;">' +
                '<label>Comentario general (opcional):</label>' +
                '<textarea class="comentario-general" placeholder="Un comentario sobre el plato..." rows="2" style="width:100%;"></textarea>' +
                '</div>' +
                '<button class="btn-primary btn-small" onclick="window.enviarCalificacion(\'' + p.id + '\',\'' + juezId + '\')">✅ Enviar Calificación</button>' +
                '</div>';
        }
        
        html += '</div>';
        return html;
    }).join('');
}

function seleccionarEstrella(elemento, valor) {
    const starsDiv = elemento.parentElement;
    const todasEstrellas = starsDiv.querySelectorAll('span');
    const hiddenInput = starsDiv.parentElement.querySelector('.puntuacion-hidden');
    
    todasEstrellas.forEach((estrella, index) => {
        if (index < valor) {
            estrella.classList.add('active');
            estrella.style.opacity = '1';
        } else {
            estrella.classList.remove('active');
            estrella.style.opacity = '0.7';
        }
    });
    
    if (hiddenInput) hiddenInput.value = valor;
}

function enviarCalificacion(platoId, juezId) {
    const votoCard = document.querySelector('.voto-card:has(button[onclick*="' + platoId + '"])');
    if (!votoCard) return;
    
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
        alert('Por favor califique todas las categorías: ' + sinCalificar.join(', '));
        return;
    }
    
    const comentario = votoCard.querySelector('.comentario-general') ? 
        votoCard.querySelector('.comentario-general').value.trim() : '';
    
    appData.calificaciones.push({
        id: generarId(),
        plato_id: platoId,
        juez_id: juezId,
        puntuaciones,
        comentario
    });
    
    guardarDatos();
    renderizarCalificacion(juezId);
}

function cambiarCalificacion(calId, juezId) {
    appData.calificaciones = appData.calificaciones.filter(c => c.id !== calId);
    guardarDatos();
    renderizarCalificacion(juezId);
}

// ============ RESULTADOS ============
function renderizarResultados() {
    const c = document.getElementById('tabla-resultados');
    if (!c) return;
    
    if (appData.platos.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay platos para mostrar resultados.</p>';
        return;
    }
    
    if (appData.categorias.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay categorías configuradas. El administrador debe configurarlas primero.</p>';
        return;
    }
    
    const ranking = appData.platos.map(p => {
        const cals = appData.calificaciones.filter(cal => cal.plato_id === p.id);
        
        // Calcular promedio general (promedio de todos los promedios por categoría)
        let sumaTotal = 0;
        let cantidadCategorias = 0;
        let detalleCategorias = {};
        
        appData.categorias.forEach(cat => {
            const puntuacionesCat = cals
                .filter(cal => cal.puntuaciones && cal.puntuaciones[cat] && cal.puntuaciones[cat] > 0)
                .map(cal => cal.puntuaciones[cat]);
            
            if (puntuacionesCat.length > 0) {
                const promCat = puntuacionesCat.reduce((s, v) => s + v, 0) / puntuacionesCat.length;
                sumaTotal += promCat;
                cantidadCategorias++;
                detalleCategorias[cat] = Math.round(promCat * 10) / 10;
            }
        });
        
        const promedioGeneral = cantidadCategorias > 0 ? sumaTotal / cantidadCategorias : 0;
        
        return {
            ...p,
            cocinero: obtenerParticipante(p.cocinero_id),
            promedio: Math.round(promedioGeneral * 10) / 10,
            totalVotos: cals.length,
            detalleCategorias
        };
    }).sort((a, b) => b.promedio - a.promedio);
    
    c.innerHTML = ranking.map((item, i) => {
        const clase = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
        const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        
        let detalleHTML = '';
        for (const [cat, punt] of Object.entries(item.detalleCategorias)) {
            detalleHTML += '<span>📌 ' + cat + ': <strong>' + punt.toFixed(1) + '</strong></span>';
        }
        
        return '<div class="ranking-item ' + clase + '">' +
            '<div class="rank-pos">' + (medalla || '#' + (i+1)) + '</div>' +
            '<div class="rank-info">' +
                '<strong>' + item.nombre + '</strong>' +
                '<div style="font-size:0.85rem;color:var(--text-light);">por ' + (item.cocinero ? item.cocinero.nombre : '?') + '</div>' +
                '<div style="font-size:0.8rem;">' + item.totalVotos + ' voto' + (item.totalVotos !== 1 ? 's' : '') + '</div>' +
                '<div class="rank-detalle">' + detalleHTML + '</div>' +
            '</div>' +
            '<div class="rank-puntos">' + item.promedio.toFixed(1) + '</div>' +
        '</div>';
    }).join('');
}

// ============ EXPORTAR FUNCIONES GLOBALES ============
window.eliminarParticipante = eliminarParticipante;
window.eliminarPlato = eliminarPlato;
window.eliminarCategoria = eliminarCategoria;
window.seleccionarEstrella = seleccionarEstrella;
window.enviarCalificacion = enviarCalificacion;
window.cambiarCalificacion = cambiarCalificacion;
