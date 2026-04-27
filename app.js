// ============ ESTADO ============
const STORAGE_KEY = 'concurso_data';
const SESSION_KEY = 'concurso_session';
const THEME_KEY = 'concurso_theme';

let appData = { participantes: [], platos: [], calificaciones: [] };
let sesionActual = null;

// ============ INICIALIZACIÓN ============
function init() {
    cargarDatos();
    cargarTema();
    configurarNavegacion();
    configurarFormularios();
    
    if (sesionActual) {
        actualizarUISesion();
        mostrarPanel('calificar');
    } else {
        actualizarUISesion();
        mostrarPanel('login');
    }
}

function cargarDatos() {
    try {
        const datos = localStorage.getItem(STORAGE_KEY);
        if (datos) appData = JSON.parse(datos);
    } catch(e) { console.error('Error cargando datos:', e); }
    
    try {
        const sesion = localStorage.getItem(SESSION_KEY);
        if (sesion) sesionActual = JSON.parse(sesion);
    } catch(e) { console.error('Error cargando sesión:', e); }
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

// ============ UTILIDADES ============
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function obtenerParticipante(id) {
    return appData.participantes.find(p => p.id === id);
}

function obtenerPlato(id) {
    return appData.platos.find(p => p.id === id);
}

function generarCodigo() {
    let codigo;
    do {
        codigo = Math.floor(100000 + Math.random() * 900000).toString();
    } while (appData.participantes.some(p => p.codigo === codigo));
    return codigo;
}

// ============ NAVEGACIÓN ============
function configurarNavegacion() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.dataset.tab;
            if ((target === 'calificar' || target === 'resultados') && !sesionActual) {
                alert('Debe iniciar sesión para acceder a esta sección.');
                return mostrarPanel('login');
            }
            mostrarPanel(target);
        });
    });
}

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
                    infoBar.innerHTML = `Evaluando como: <strong>${sesionActual.nombre}</strong>`;
                }
                renderizarCalificacion(sesionActual.id);
            }
            break;
        case 'resultados': renderizarResultados(); break;
    }
}

// ============ LOGIN ============
function configurarFormularios() {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', function(e) {
            e.preventDefault();
            const codigo = document.getElementById('codigo-input').value.trim();
            const errorDiv = document.getElementById('login-error');
            
            if (!codigo || codigo.length !== 6) {
                if (errorDiv) {
                    errorDiv.textContent = 'El código debe tener 6 dígitos.';
                    errorDiv.style.display = 'block';
                }
                return;
            }
            
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
                codigo: participante.codigo
            };
            
            guardarSesion();
            actualizarUISesion();
            document.getElementById('codigo-input').value = '';
            if (errorDiv) errorDiv.style.display = 'none';
            mostrarPanel('calificar');
        });
    }
    
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', function(e) {
            e.preventDefault();
            const nombre = document.getElementById('nombre-participante').value.trim();
            const tipo = document.getElementById('tipo-participante').value;
            
            if (!nombre) return;
            
            const codigo = generarCodigo();
            appData.participantes.push({
                id: generarId(),
                nombre, tipo, codigo
            });
            
            guardarDatos();
            alert(`Participante registrado.\n\nNombre: ${nombre}\nCódigo de acceso: ${codigo}\n\nGuarde este código para ingresar al sistema.`);
            document.getElementById('form-registro').reset();
            renderizarParticipantes();
        });
    }
    
    const formPlato = document.getElementById('form-plato');
    if (formPlato) {
        formPlato.addEventListener('submit', function(e) {
            e.preventDefault();
            const cocinero_id = document.getElementById('cocinero-select').value;
            const nombre = document.getElementById('nombre-plato').value.trim();
            const descripcion = document.getElementById('descripcion-plato').value.trim();
            
            if (!cocinero_id || !nombre) return;
            
            appData.platos.push({
                id: generarId(),
                nombre, descripcion, cocinero_id
            });
            
            guardarDatos();
            document.getElementById('form-plato').reset();
            renderizarPlatos();
        });
    }
}

function cerrarSesion() {
    sesionActual = null;
    guardarSesion();
    actualizarUISesion();
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
            document.getElementById('sesion-tipo').textContent = 
                sesionActual.tipo === 'cocinero' ? 'Cocinero/a' : 'Invitado/a';
            document.getElementById('sesion-codigo').textContent = sesionActual.codigo;
        }
        document.querySelectorAll('.nav-btn').forEach(b => b.style.display = '');
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (sesionDiv) sesionDiv.style.display = 'none';
        document.querySelectorAll('.nav-btn').forEach(b => {
            const tab = b.dataset.tab;
            if (tab === 'calificar' || tab === 'resultados') {
                b.style.display = 'none';
            }
        });
    }
}

// ============ PARTICIPANTES ============
function renderizarParticipantes() {
    const contenedor = document.getElementById('lista-participantes');
    if (!contenedor) return;
    
    if (appData.participantes.length === 0) {
        contenedor.innerHTML = '<p class="empty-message">No hay participantes registrados.</p>';
        return;
    }
    
    contenedor.innerHTML = '<h3>Participantes Registrados</h3>' + 
        appData.participantes.map(p => `
        <div class="card">
            <div class="card-header">
                <strong>${p.nombre}</strong>
                <span class="badge badge-${p.tipo}">${p.tipo === 'cocinero' ? 'Cocinero' : 'Invitado'}</span>
            </div>
            <p style="font-size: 0.85rem;">Código: <strong>${p.codigo}</strong></p>
            <button class="btn-delete" onclick="eliminarParticipante('${p.id}')">Eliminar</button>
        </div>
    `).join('');
}

function eliminarParticipante(id) {
    if (!confirm('¿Eliminar participante y todos sus datos asociados?')) return;
    appData.participantes = appData.participantes.filter(p => p.id !== id);
    appData.platos = appData.platos.filter(p => p.cocinero_id !== id);
    appData.calificaciones = appData.calificaciones.filter(c => {
        const plato = appData.platos.find(p => p.id === c.plato_id);
        return c.juez_id !== id && (!plato || plato.cocinero_id !== id);
    });
    guardarDatos();
    renderizarParticipantes();
}

// ============ PLATOS ============
function renderizarCocineros() {
    const select = document.getElementById('cocinero-select');
    if (!select) return;
    const cocineros = appData.participantes.filter(p => p.tipo === 'cocinero');
    select.innerHTML = '<option value="">Seleccione un cocinero...</option>' +
        cocineros.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

function renderizarPlatos() {
    const contenedor = document.getElementById('lista-platos');
    if (!contenedor) return;
    
    if (appData.platos.length === 0) {
        contenedor.innerHTML = '<p class="empty-message">No hay platos registrados.</p>';
        return;
    }
    
    contenedor.innerHTML = '<h3>Platos Registrados</h3>' + 
        appData.platos.map(p => {
            const cocinero = obtenerParticipante(p.cocinero_id);
            return `
            <div class="card">
                <div class="card-header">
                    <strong>${p.nombre}</strong>
                    <span>${cocinero ? cocinero.nombre : 'Desconocido'}</span>
                </div>
                ${p.descripcion ? `<p style="font-size: 0.9rem; color: var(--text-light);">${p.descripcion}</p>` : ''}
                <button class="btn-delete" onclick="eliminarPlato('${p.id}')">Eliminar</button>
            </div>
        `}).join('');
}

function eliminarPlato(id) {
    if (!confirm('¿Eliminar plato y sus calificaciones?')) return;
    appData.platos = appData.platos.filter(p => p.id !== id);
    appData.calificaciones = appData.calificaciones.filter(c => c.plato_id !== id);
    guardarDatos();
    renderizarPlatos();
}

// ============ CALIFICACIÓN ============
function renderizarCalificacion(juezId) {
    const contenedor = document.getElementById('platos-a-calificar');
    if (!contenedor) return;
    
    const platos = appData.platos.filter(p => p.cocinero_id !== juezId);
    
    if (platos.length === 0) {
        contenedor.innerHTML = '<p class="empty-message">No hay platos disponibles para evaluar.</p>';
        return;
    }
    
    contenedor.innerHTML = platos.map(plato => {
        const existente = appData.calificaciones.find(c => c.plato_id === plato.id && c.juez_id === juezId);
        const cocinero = obtenerParticipante(plato.cocinero_id);
        
        return `
        <div class="voto-card">
            <div style="flex:1;">
                <strong>${plato.nombre}</strong>
                <span style="color: var(--text-light); font-size: 0.85rem;"> (${cocinero ? cocinero.nombre : '?'})</span>
                ${plato.descripcion ? `<br><small style="color: var(--text-light);">${plato.descripcion}</small>` : ''}
            </div>
            ${existente ? 
                `<div style="text-align:right;">
                    <span class="badge badge-cocinero">${'★'.repeat(existente.puntuacion)}${'☆'.repeat(5-existente.puntuacion)}</span>
                    <br><button class="btn-delete" onclick="cambiarCalificacion('${existente.id}','${juezId}')">Modificar</button>
                </div>` :
                `<div>
                    <div class="stars">
                        ${[1,2,3,4,5].map(n => 
                            `<span onclick="calificar('${plato.id}','${juezId}',${n})" title="${n}/5">★</span>`
                        ).join('')}
                    </div>
                    <input type="text" class="comentario-input" placeholder="Comentario (opcional)" 
                           style="margin-top:0.5rem; width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px;">
                </div>`
            }
        </div>
    `}).join('');
}

function calificar(platoId, juezId, puntuacion) {
    const plato = obtenerPlato(platoId);
    if (!plato || plato.cocinero_id === juezId) return;
    
    const votoCard = document.querySelector(`.voto-card:has(div.stars span[onclick*="${platoId}"])`);
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
    const contenedor = document.getElementById('tabla-resultados');
    if (!contenedor) return;
    
    if (appData.platos.length === 0) {
        contenedor.innerHTML = '<p class="empty-message">No hay platos para mostrar resultados.</p>';
        return;
    }
    
    const ranking = appData.platos.map(p => {
        const cals = appData.calificaciones.filter(c => c.plato_id === p.id);
        const prom = cals.length > 0 ? cals.reduce((s, c) => s + c.puntuacion, 0) / cals.length : 0;
        return {
            ...p,
            cocinero: obtenerParticipante(p.cocinero_id),
            promedio: Math.round(prom * 10) / 10,
            total: cals.length,
            cals
        };
    }).sort((a, b) => b.promedio - a.promedio);
    
    contenedor.innerHTML = ranking.map((item, i) => {
        const clase = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
        return `
        <div class="ranking-item ${clase}">
            <div class="rank-pos">#${i + 1}</div>
            <div class="rank-info">
                <strong>${item.nombre}</strong>
                <div style="font-size:0.85rem; color:var(--text-light);">${item.cocinero ? item.cocinero.nombre : '?'}</div>
                <div style="font-size:0.8rem;">
                    ${'★'.repeat(Math.round(item.promedio))}${'☆'.repeat(5-Math.round(item.promedio))} (${item.total} votos)
                </div>
            </div>
            <div class="rank-puntos">${item.promedio}</div>
        </div>
    `}).join('');
}

document.getElementById('btn-actualizar-resultados').addEventListener('click', renderizarResultados);

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', init);
