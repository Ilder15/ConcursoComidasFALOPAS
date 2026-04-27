// ============ ESTADO DE LA APLICACIÓN ============
const STORAGE_KEY = 'concurso_comida_data';
const SESSION_KEY = 'concurso_sesion_actual';
const THEME_KEY = 'concurso_theme';

let appData = {
    participantes: [],
    platos: [],
    calificaciones: []
};

let sesionActual = null;

// Cargar datos del localStorage
function cargarDatos() {
    const datos = localStorage.getItem(STORAGE_KEY);
    if (datos) {
        appData = JSON.parse(datos);
    }
    
    const sesion = localStorage.getItem(SESSION_KEY);
    if (sesion) {
        sesionActual = JSON.parse(sesion);
    }
}

// Guardar datos en localStorage
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

// ============ MODO OSCURO ============
function cargarTema() {
    const temaGuardado = localStorage.getItem(THEME_KEY);
    if (temaGuardado) {
        document.documentElement.setAttribute('data-theme', temaGuardado);
        actualizarBotonTema(temaGuardado);
    }
}

function toggleTheme() {
    const temaActual = document.documentElement.getAttribute('data-theme');
    const nuevoTema = temaActual === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', nuevoTema);
    localStorage.setItem(THEME_KEY, nuevoTema);
    actualizarBotonTema(nuevoTema);
}

function actualizarBotonTema(tema) {
    const icon = document.querySelector('.theme-icon');
    const text = document.querySelector('.theme-text');
    
    if (tema === 'dark') {
        icon.textContent = '☀️';
        text.textContent = 'Modo Claro';
        document.getElementById('btn-theme').style.background = '#4ecdc4';
        document.getElementById('btn-theme').style.color = '#1a1a2e';
    } else {
        icon.textContent = '🌙';
        text.textContent = 'Modo Oscuro';
        document.getElementById('btn-theme').style.background = '#2c3e50';
        document.getElementById('btn-theme').style.color = '#ffffff';
    }
}

// ============ UTILIDADES ============
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function obtenerParticipante(id) {
    return appData.participantes.find(p => p.id === id);
}

function obtenerPlato(id) {
    return appData.platos.find(p => p.id === id);
}

// Generar código único de 6 dígitos
function generarCodigoUnico() {
    let codigo;
    do {
        codigo = Math.floor(100000 + Math.random() * 900000).toString();
    } while (appData.participantes.some(p => p.codigo === codigo));
    return codigo;
}

// ============ NAVEGACIÓN POR PESTAÑAS ============
function mostrarPanel(nombrePanel) {
    // Actualizar tabs
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === nombrePanel) {
            t.classList.add('active');
        }
    });
    
    // Actualizar paneles
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    let panelId;
    switch(nombrePanel) {
        case 'login': panelId = 'panel-login'; break;
        case 'registro': panelId = 'panel-registro'; break;
        case 'platos': panelId = 'panel-platos'; break;
        case 'calificar': panelId = 'panel-calificar'; break;
        case 'resultados': panelId = 'panel-resultados'; break;
        default: panelId = 'panel-login';
    }
    
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.add('active');
    }
    
    actualizarContenidoPanel(nombrePanel);
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        
        // Verificar si requiere sesión
        if ((target === 'calificar' || target === 'resultados') && !sesionActual) {
            alert('⚠️ Debes iniciar sesión con tu código primero');
            mostrarPanel('login');
            return;
        }
        
        mostrarPanel(target);
    });
});

function actualizarContenidoPanel(panel) {
    switch(panel) {
        case 'login':
            actualizarUISesion();
            break;
        case 'registro':
            renderizarParticipantes();
            break;
        case 'platos':
            renderizarSelectCocineros();
            renderizarPlatos();
            break;
        case 'calificar':
            if (sesionActual) {
                document.getElementById('info-juez').innerHTML = 
                    `👤 Calificando como: <strong>${sesionActual.nombre}</strong> (${sesionActual.tipo})`;
                document.getElementById('info-juez').style.display = 'block';
                renderizarPlatosParaCalificar(sesionActual.id);
            }
            break;
        case 'resultados':
            renderizarResultados();
            break;
    }
}

// ============ SISTEMA DE LOGIN ============
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const codigo = document.getElementById('codigo-input').value.trim();
    const errorDiv = document.getElementById('login-error');
    
    if (!codigo || codigo.length !== 6) {
        errorDiv.textContent = '⚠️ Ingresa un código válido de 6 dígitos';
        errorDiv.style.display = 'block';
        return;
    }
    
    const participante = appData.participantes.find(p => p.codigo === codigo);
    
    if (!participante) {
        errorDiv.textContent = '❌ Código no encontrado. Verifica e intenta de nuevo.';
        errorDiv.style.display = 'block';
        document.getElementById('codigo-input').value = '';
        return;
    }
    
    // Login exitoso
    sesionActual = {
        id: participante.id,
        nombre: participante.nombre,
        tipo: participante.tipo,
        codigo: participante.codigo
    };
    
    guardarSesion();
    actualizarUISesion();
    
    document.getElementById('codigo-input').value = '';
    errorDiv.style.display = 'none';
    
    // Mostrar mensaje de bienvenida e ir a calificar
    alert(`✅ ¡Bienvenido/a ${sesionActual.nombre}!`);
    mostrarPanel('calificar');
});

function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        sesionActual = null;
        guardarSesion();
        actualizarUISesion();
        mostrarPanel('login');
    }
}

function actualizarUISesion() {
    const loginForm = document.getElementById('login-form');
    const sesionActivaDiv = document.getElementById('sesion-activa');
    
    if (sesionActual) {
        if (loginForm) loginForm.style.display = 'none';
        if (sesionActivaDiv) {
            sesionActivaDiv.style.display = 'block';
            document.getElementById('sesion-nombre').textContent = sesionActual.nombre;
            document.getElementById('sesion-tipo').textContent = 
                sesionActual.tipo === 'cocinero' ? '👨‍🍳 Cocinero/a' : '🍴 Invitado/a';
            document.getElementById('sesion-codigo').textContent = sesionActual.codigo;
        }
        
        // Mostrar todos los tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.style.display = '';
        });
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (sesionActivaDiv) sesionActivaDiv.style.display = 'none';
        
        // Ocultar tabs que requieren sesión
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.dataset.tab === 'calificar' || tab.dataset.tab === 'resultados') {
                tab.style.display = 'none';
            }
        });
    }
}

// ============ REGISTRO DE PARTICIPANTES ============
document.getElementById('form-registro').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre-participante').value.trim();
    const tipo = document.getElementById('tipo-participante').value;
    
    if (!nombre) return;
    
    const codigo = generarCodigoUnico();
    
    const participante = {
        id: generarId(),
        nombre,
        tipo,
        codigo
    };
    
    appData.participantes.push(participante);
    guardarDatos();
    
    // Mostrar el código generado
    alert(`✅ ¡Registro exitoso!\n\n👤 Participante: ${nombre}\n🔑 Tu código de acceso es: ${codigo}\n\n⚠️ GUARDA ESTE CÓDIGO - Lo necesitarás para calificar platos.`);
    
    document.getElementById('form-registro').reset();
    renderizarParticipantes();
});

function renderizarParticipantes() {
    const contenedor = document.getElementById('lista-participantes');
    
    if (appData.participantes.length === 0) {
        contenedor.innerHTML = '<p class="mensaje-vacio">No hay participantes registrados aún.</p>';
        return;
    }
    
    contenedor.innerHTML = '<h3>Participantes registrados:</h3>' + 
        appData.participantes.map(p => `
        <div class="card">
            <div class="card-header">
                <strong>${p.nombre}</strong>
                <span class="badge badge-${p.tipo}">${p.tipo === 'cocinero' ? '👨‍🍳 Cocinero' : '🍴 Invitado'}</span>
            </div>
            <p><strong>Código:</strong> ${p.codigo}</p>
            <button class="eliminar-btn" onclick="eliminarParticipante('${p.id}')">Eliminar</button>
        </div>
    `).join('');
}

function eliminarParticipante(id) {
    if (!confirm('¿Eliminar este participante? Se eliminarán sus platos y calificaciones.')) return;
    
    appData.participantes = appData.participantes.filter(p => p.id !== id);
    appData.platos = appData.platos.filter(p => p.cocinero_id !== id);
    appData.calificaciones = appData.calificaciones.filter(
        c => c.juez_id !== id && !appData.platos.find(p => p.id === c.plato_id && p.cocinero_id === id)
    );
    guardarDatos();
    renderizarParticipantes();
}

// ============ PLATOS ============
function renderizarSelectCocineros() {
    const select = document.getElementById('cocinero-select');
    const cocineros = appData.participantes.filter(p => p.tipo === 'cocinero');
    
    select.innerHTML = '<option value="">Selecciona al cocinero...</option>' +
        cocineros.map(c => `<option value="${c.id}">${c.nombre} (Código: ${c.codigo})</option>`).join('');
}

document.getElementById('form-plato').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const cocinero_id = document.getElementById('cocinero-select').value;
    const nombre = document.getElementById('nombre-plato').value.trim();
    const descripcion = document.getElementById('descripcion-plato').value.trim();
    
    if (!cocinero_id || !nombre) return;
    
    const plato = {
        id: generarId(),
        nombre,
        descripcion,
        cocinero_id
    };
    
    appData.platos.push(plato);
    guardarDatos();
    
    document.getElementById('form-plato').reset();
    renderizarPlatos();
    alert('✅ Plato agregado correctamente');
});

function renderizarPlatos() {
    const contenedor = document.getElementById('lista-platos');
    
    if (appData.platos.length === 0) {
        contenedor.innerHTML = '<p class="mensaje-vacio">No hay platos registrados aún.</p>';
        return;
    }
    
    contenedor.innerHTML = '<h3>Platos registrados:</h3>' + 
        appData.platos.map(p => {
            const cocinero = obtenerParticipante(p.cocinero_id);
            return `
                <div class="card">
                    <div class="card-header">
                        <strong>${p.nombre}</strong>
                        <span>por ${cocinero ? cocinero.nombre : 'Desconocido'}</span>
                    </div>
                    ${p.descripcion ? `<p>${p.descripcion}</p>` : ''}
                    <button class="eliminar-btn" onclick="eliminarPlato('${p.id}')">Eliminar</button>
                </div>
            `;
        }).join('');
}

function eliminarPlato(id) {
    if (!confirm('¿Eliminar este plato y sus calificaciones?')) return;
    
    appData.platos = appData.platos.filter(p => p.id !== id);
    appData.calificaciones = appData.calificaciones.filter(c => c.plato_id !== id);
    guardarDatos();
    renderizarPlatos();
}

// ============ CALIFICACIONES ============
function renderizarPlatosParaCalificar(juezId) {
    const contenedor = document.getElementById('platos-a-calificar');
    
    if (!juezId) {
        contenedor.innerHTML = '<p class="mensaje-vacio">Inicia sesión para calificar platos.</p>';
        return;
    }
    
    // Filtrar platos donde el juez NO es el cocinero
    const platosDisponibles = appData.platos.filter(p => p.cocinero_id !== juezId);
    
    if (platosDisponibles.length === 0) {
        contenedor.innerHTML = '<p class="mensaje-vacio">No hay platos para calificar (eres el cocinero de todos los platos registrados).</p>';
        return;
    }
    
    contenedor.innerHTML = platosDisponibles.map(plato => {
        const yaCalificado = appData.calificaciones.find(
            c => c.plato_id === plato.id && c.juez_id === juezId
        );
        
        const cocinero = obtenerParticipante(plato.cocinero_id);
        
        return `
            <div class="voto-card">
                <div style="flex: 1;">
                    <strong>${plato.nombre}</strong>
                    <small>(de ${cocinero ? cocinero.nombre : '?'})</small>
                    ${plato.descripcion ? `<br><small>${plato.descripcion}</small>` : ''}
                </div>
                ${yaCalificado ? 
                    `<div style="text-align: right;">
                        <span class="badge">Ya calificado: ${'⭐'.repeat(yaCalificado.puntuacion)}</span>
                        <br>
                        <button class="eliminar-btn" onclick="eliminarCalificacion('${yaCalificado.id}', '${juezId}')">Cambiar</button>
                    </div>` :
                    `<div class="calificacion-form" data-plato="${plato.id}" data-juez="${juezId}">
                        <div class="stars">
                            ${[1,2,3,4,5].map(num => 
                                `<span onclick="calificar('${plato.id}', '${juezId}', ${num})" title="${num} estrella${num > 1 ? 's' : ''}">⭐</span>`
                            ).join('')}
                        </div>
                        <input type="text" placeholder="Comentario (opcional)" class="comentario-input" style="margin-top: 0.5rem; width: 100%;">
                    </div>`
                }
            </div>
        `;
    }).join('');
}

function calificar(platoId, juezId, puntuacion) {
    const plato = obtenerPlato(platoId);
    if (plato.cocinero_id === juezId) {
        alert('¡No puedes calificar tu propio plato!');
        return;
    }
    
    if (puntuacion < 1 || puntuacion > 5) {
        alert('La puntuación debe ser entre 1 y 5 estrellas');
        return;
    }
    
    const formDiv = document.querySelector(`[data-plato="${platoId}"]`);
    const comentarioInput = formDiv ? formDiv.querySelector('.comentario-input') : null;
    const comentario = comentarioInput ? comentarioInput.value.trim() : '';
    
    const existente = appData.calificaciones.findIndex(
        c => c.plato_id === platoId && c.juez_id === juezId
    );
    
    if (existente !== -1) {
        appData.calificaciones[existente].puntuacion = puntuacion;
        appData.calificaciones[existente].comentario = comentario;
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
    renderizarPlatosParaCalificar(juezId);
}

function eliminarCalificacion(calificacionId, juezId) {
    appData.calificaciones = appData.calificaciones.filter(c => c.id !== calificacionId);
    guardarDatos();
    renderizarPlatosParaCalificar(juezId);
}

// ============ RESULTADOS ============
function renderizarResultados() {
    const contenedor = document.getElementById('tabla-resultados');
    
    if (appData.platos.length === 0) {
        contenedor.innerHTML = '<p class="mensaje-vacio">No hay platos para mostrar resultados.</p>';
        return;
    }
    
    const ranking = appData.platos.map(plato => {
        const calificaciones = appData.calificaciones.filter(c => c.plato_id === plato.id);
        const promedio = calificaciones.length > 0 
            ? calificaciones.reduce((sum, c) => sum + c.puntuacion, 0) / calificaciones.length 
            : 0;
        
        const cocinero = obtenerParticipante(plato.cocinero_id);
        
        return {
            ...plato,
            cocinero_nombre: cocinero ? cocinero.nombre : 'Desconocido',
            promedio: Math.round(promedio * 10) / 10,
            total_votos: calificaciones.length,
            calificaciones
        };
    });
    
    ranking.sort((a, b) => b.promedio - a.promedio);
    
    contenedor.innerHTML = ranking.map((item, index) => {
        const medalla = index === 0 ? 'medal-1' : index === 1 ? 'medal-2' : index === 2 ? 'medal-3' : '';
        
        return `
            <div class="ranking-item ${medalla}">
                <div class="ranking-pos">#${index + 1}</div>
                <div class="ranking-info">
                    <strong>${item.nombre}</strong>
                    <div>por ${item.cocinero_nombre}</div>
                    <div>${'⭐'.repeat(Math.round(item.promedio))} (${item.total_votos} votos)</div>
                    ${item.calificaciones.length > 0 ? 
                        `<div style="font-size: 0.85rem; margin-top: 0.3rem;">
                            ${item.calificaciones.map(c => {
                                const juez = obtenerParticipante(c.juez_id);
                                return `${juez ? juez.nombre : '?'}: ${c.puntuacion}/5 ${c.comentario ? `"${c.comentario}"` : ''}`;
                            }).join(' | ')}
                        </div>` : 
                        '<div style="font-size: 0.85rem;">Sin calificaciones aún</div>'
                    }
                </div>
                <div class="ranking-puntos">${item.promedio}</div>
            </div>
        `;
    }).join('');
}

document.getElementById('btn-actualizar-resultados').addEventListener('click', () => {
    renderizarResultados();
});

// ============ INICIALIZACIÓN ============
cargarDatos();
cargarTema();

// Mostrar panel inicial según sesión
if (sesionActual) {
    actualizarUISesion();
    mostrarPanel('calificar');
} else {
    actualizarUISesion();
    mostrarPanel('login');
}
