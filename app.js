// ============ CONFIGURACIÓN ============
const CODIGO_ADMIN = '123456'; // CÓDIGO FIJO DEL ADMINISTRADOR

const STORAGE_KEY = 'concurso_falopas_data';
const SESSION_KEY = 'concurso_falopas_session';
const THEME_KEY = 'concurso_falopas_theme';

let appData = { participantes: [], platos: [], calificaciones: [] };
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
            mostrarPanel('registro');
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
        if (datos) appData = JSON.parse(datos);
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
        // Menú de administrador
        nav.innerHTML = `
            <button class="nav-btn active" data-tab="registro">📋 Participantes</button>
            <button class="nav-btn" data-tab="platos">🍽️ Platos</button>
            <button class="nav-btn" data-tab="calificar">⭐ Calificar</button>
            <button class="nav-btn" data-tab="resultados">🏆 Resultados</button>
            <button class="nav-btn" data-tab="login" style="color:#ff6b6b;">🚪 Salir</button>
        `;
    } else if (sesionActual && !sesionActual.esAdmin) {
        // Menú de participante normal
        nav.innerHTML = `
            <button class="nav-btn active" data-tab="calificar">⭐ Calificar</button>
            <button class="nav-btn" data-tab="resultados">🏆 Resultados</button>
            <button class="nav-btn" data-tab="login" style="color:#ff6b6b;">🚪 Salir</button>
        `;
    } else {
        // Menú sin sesión
        nav.innerHTML = `
            <button class="nav-btn active" data-tab="login">🔐 Iniciar Sesión</button>
        `;
    }
    
    // Reconfigurar eventos de navegación
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
            
            if ((target === 'registro' || target === 'platos') && (!sesionActual || !sesionActual.esAdmin)) {
                alert('Acceso restringido al administrador.');
                return;
            }
            
            mostrarPanel(target);
        });
    });
}

// ============ EVENTOS ============
function configurarEventos() {
    // Botón de tema
    const btnTheme = document.getElementById('btn-theme');
    if (btnTheme) btnTheme.addEventListener('click', toggleTheme);
    
    // Login
    const formLogin = document.getElementById('form-login');
    if (formLogin) formLogin.addEventListener('submit', function(e) {
        e.preventDefault();
        hacerLogin();
    });
    
    // Registro
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) formRegistro.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!sesionActual || !sesionActual.esAdmin) {
            alert('Acceso denegado.');
            return;
        }
        registrarParticipante();
    });
    
    // Plato
    const formPlato = document.getElementById('form-plato');
    if (formPlato) formPlato.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!sesionActual || !sesionActual.esAdmin) {
            alert('Acceso denegado.');
            return;
        }
        registrarPlato();
    });
    
    // Cerrar sesión
    const btnCerrar = document.getElementById('btn-cerrar-sesion');
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarSesion);
    
    // Resultados
    const btnActualizar = document.getElementById('btn-actualizar-resultados');
    if (btnActualizar) btnActualizar.addEventListener('click', renderizarResultados);
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
        case 'platos': renderizarCocineros(); renderizarPlatos(); break;
        case 'calificar':
            if (sesionActual) {
                const infoBar = document.getElementById('info-juez');
                if (infoBar) {
                    infoBar.innerHTML = 'Evaluando como: <strong>' + sesionActual.nombre + '</strong>';
                }
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
        if (errorDiv) {
            errorDiv.textContent = 'El código debe tener 6 dígitos.';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    // Verificar si es admin
    if (codigo === CODIGO_ADMIN) {
        sesionActual = {
            id: 'admin',
            nombre: 'Administrador',
            tipo: 'admin',
            codigo: CODIGO_ADMIN,
            esAdmin: true
        };
        
        guardarSesion();
        actualizarUISesion();
        construirMenu();
        document.getElementById('codigo-input').value = '';
        if (errorDiv) errorDiv.style.display = 'none';
        mostrarPanel('registro');
        return;
    }
    
    // Verificar participante normal
    const participante = appData.participantes.find(p => p.codigo === codigo);
    if (!participante) {
        if (errorDiv) {
            errorDiv.textContent = 'Código no encontrado. Verifique e intente nuevamente.';
            errorDiv.style.display = 'block';
        }
        document.getElementById('codigo-input').value = '';
        return;
    }
    
    sesionActual = {
        id: participante.id,
        nombre: participante.nombre,
        tipo: participante.tipo,
        codigo: participante.codigo,
        esAdmin: false
    };
    
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
            
            let tipoTexto = '';
            if (sesionActual.esAdmin) {
                tipoTexto = '👑 Administrador';
            } else if (sesionActual.tipo === 'cocinero') {
                tipoTexto = '👨‍🍳 Cocinero/a';
            } else {
                tipoTexto = '🍴 Invitado/a';
            }
            document.getElementById('sesion-tipo').textContent = tipoTexto;
            document.getElementById('sesion-codigo').textContent = sesionActual.codigo;
        }
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (sesionDiv) sesionDiv.style.display = 'none';
    }
}

// ============ REGISTRO (SOLO ADMIN) ============
function registrarParticipante() {
    const nombre = document.getElementById('nombre-participante').value.trim();
    const tipo = document.getElementById('tipo-participante').value;
    if (!nombre) return;
    
    const codigo = generarCodigo();
    appData.participantes.push({ id: generarId(), nombre, tipo, codigo });
    guardarDatos();
    
    alert('✅ Participante registrado exitosamente.\n\n👤 Nombre: ' + nombre + 
          '\n🔑 Código de acceso: ' + codigo + 
          '\n📋 Tipo: ' + (tipo === 'cocinero' ? 'Cocinero/a' : 'Invitado/a') +
          '\n\n⚠️ Entregue este código al participante para que pueda ingresar.');
    
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
    
    c.innerHTML = '<h3>Participantes Registrados (' + appData.participantes.length + ')</h3>' + 
        appData.participantes.map(p => 
        '<div class="card">' +
            '<div class="card-header">' +
                '<strong>' + p.nombre + '</strong>' +
                '<span class="badge badge-' + p.tipo + '">' + 
                    (p.tipo === 'cocinero' ? 'Cocinero' : 'Invitado') + 
                '</span>' +
            '</div>' +
            '<p style="margin: 0.5rem 0;"><strong>🔑 Código:</strong> <code style="font-size:1.1rem; background:var(--bg); padding:0.2rem 0.5rem; border-radius:4px;">' + p.codigo + '</code></p>' +
            '<button class="btn-delete" onclick="eliminarParticipante(\'' + p.id + '\')">🗑️ Eliminar</button>' +
        '</div>'
    ).join('');
}

function eliminarParticipante(id) {
    if (!confirm('¿Está seguro de eliminar este participante?')) return;
    appData.participantes = appData.participantes.filter(p => p.id !== id);
    appData.platos = appData.platos.filter(p => p.cocinero_id !== id);
    appData.calificaciones = appData.calificaciones.filter(c => c.juez_id !== id);
    guardarDatos();
    renderizarParticipantes();
}

// ============ PLATOS (SOLO ADMIN) ============
function renderizarCocineros() {
    const s = document.getElementById('cocinero-select');
    if (!s) return;
    const cocineros = appData.participantes.filter(p => p.tipo === 'cocinero');
    s.innerHTML = '<option value="">Seleccione un cocinero...</option>' + 
        cocineros.map(c => '<option value="' + c.id + '">' + c.nombre + '</option>').join('');
}

function registrarPlato() {
    const cocinero_id = document.getElementById('cocinero-select').value;
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
    
    if (appData.platos.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay platos registrados.</p>';
        return;
    }
    
    c.innerHTML = '<h3>Platos Registrados (' + appData.platos.length + ')</h3>' + appData.platos.map(p => {
        const co = obtenerParticipante(p.cocinero_id);
        return '<div class="card">' +
            '<div class="card-header">' +
                '<strong>🍽️ ' + p.nombre + '</strong>' +
                '<span style="font-size:0.85rem;color:var(--text-light);">Cocinero: ' + (co ? co.nombre : '?') + '</span>' +
            '</div>' +
            (p.descripcion ? '<p style="font-size:0.9rem;color:var(--text-light);">' + p.descripcion + '</p>' : '') +
            '<button class="btn-delete" onclick="eliminarPlato(\'' + p.id + '\')">🗑️ Eliminar</button>' +
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
    
    if (sesionActual && sesionActual.esAdmin) {
        c.innerHTML = '<p class="empty-message">Como administrador puede ver todas las calificaciones en Resultados.</p>';
        return;
    }
    
    const platos = appData.platos.filter(p => p.cocinero_id !== juezId);
    if (platos.length === 0) {
        c.innerHTML = '<p class="empty-message">No hay platos disponibles para evaluar.</p>';
        return;
    }
    
    c.innerHTML = '<p style="margin-bottom:1rem; color:var(--text-light);">⭐ Califique de 1 a 5 estrellas cada plato</p>' + 
        platos.map(p => {
        const ex = appData.calificaciones.find(cal => cal.plato_id === p.id && cal.juez_id === juezId);
        const co = obtenerParticipante(p.cocinero_id);
        
        return '<div class="voto-card">' +
            '<div style="flex:1;">' +
                '<strong>' + p.nombre + '</strong>' +
                '<span style="color:var(--text-light);font-size:0.85rem;"> (de ' + (co ? co.nombre : '?') + ')</span>' +
                (p.descripcion ? '<br><small style="color:var(--text-light);">' + p.descripcion + '</small>' : '') +
            '</div>' +
            (ex ? 
                '<div style="text-align:right;">' +
                    '<span class="badge badge-cocinero">' + '★'.repeat(ex.puntuacion) + '☆'.repeat(5-ex.puntuacion) + '</span>' +
                    (ex.comentario ? '<br><small style="color:var(--text-light);">"' + ex.comentario + '"</small>' : '') +
                    '<br><button class="btn-delete" onclick="cambiarCalificacion(\'' + ex.id + '\',\'' + juezId + '\')">Modificar</button>' +
                '</div>' :
                '<div>' +
                    '<div class="stars">' +
                        [1,2,3,4,5].map(n => 
                            '<span onclick="calificar(\'' + p.id + '\',\'' + juezId + '\',' + n + ')" title="' + n + '/5">★</span>'
                        ).join('') +
                    '</div>' +
                    '<input type="text" class="comentario-input" placeholder="Comentario (opcional)" ' +
                        'style="margin-top:0.5rem;width:100%;padding:0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);">' +
                '</div>'
            ) +
        '</div>';
    }).join('');
}

function calificar(platoId, juezId, puntuacion) {
    const votoCard = document.querySelector(`.voto-card:has(span[onclick*="${platoId}"])`);
    const comentarioInput = votoCard ? votoCard.querySelector('.comentario-input') : null;
    const comentario = comentarioInput ? comentarioInput.value.trim() : '';
    
    const idx = appData.calificaciones.findIndex(c => c.plato_id === platoId && c.juez_id === juezId);
    if (idx !== -1) {
        appData.calificaciones[idx].puntuacion = puntuacion;
        appData.calificaciones[idx].comentario = comentario;
    } else {
        appData.calificaciones.push({
            id: generarId(),
            plato_id: platoId,
            juez_id: juezId,
            puntuacion,
            comentario
        });
    }
    
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
    
    const ranking = appData.platos.map(p => {
        const cals = appData.calificaciones.filter(cal => cal.plato_id === p.id);
        const prom = cals.length > 0 ? cals.reduce((s, cal) => s + cal.puntuacion, 0) / cals.length : 0;
        return {
            ...p,
            cocinero: obtenerParticipante(p.cocinero_id),
            promedio: Math.round(prom * 10) / 10,
            total: cals.length,
            cals
        };
    }).sort((a, b) => b.promedio - a.promedio);
    
    c.innerHTML = ranking.map((item, i) => {
        const clase = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
        const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        
        return '<div class="ranking-item ' + clase + '">' +
            '<div class="rank-pos">' + (medalla || '#' + (i+1)) + '</div>' +
            '<div class="rank-info">' +
                '<strong>' + item.nombre + '</strong>' +
                '<div style="font-size:0.85rem;color:var(--text-light);">' + (item.cocinero ? item.cocinero.nombre : '?') + '</div>' +
                '<div style="font-size:0.8rem;">' +
                    '★'.repeat(Math.round(item.promedio)) + '☆'.repeat(5-Math.round(item.promedio)) + 
                    ' (' + item.total + ' voto' + (item.total !== 1 ? 's' : '') + ')' +
                '</div>' +
                (item.cals.length > 0 ? 
                    '<div style="font-size:0.75rem;color:var(--text-light);margin-top:0.3rem;">' +
                        item.cals.map(cal => {
                            const juez = obtenerParticipante(cal.juez_id);
                            return (juez ? juez.nombre : 'Anónimo') + ': ' + cal.puntuacion + '/5' + 
                                   (cal.comentario ? ' - "' + cal.comentario + '"' : '');
                        }).join(' | ') +
                    '</div>' : '') +
            '</div>' +
            '<div class="rank-puntos">' + item.promedio.toFixed(1) + '</div>' +
        '</div>';
    }).join('');
}

// Hacer funciones globales para onclick
window.eliminarParticipante = eliminarParticipante;
window.eliminarPlato = eliminarPlato;
window.calificar = calificar;
window.cambiarCalificacion = cambiarCalificacion;
