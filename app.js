// ============ ESTADO DE LA APLICACIÓN ============
const STORAGE_KEY = 'concurso_comida_data';

let appData = {
    participantes: [],
    platos: [],
    calificaciones: []
};

// Cargar datos del localStorage
function cargarDatos() {
    const datos = localStorage.getItem(STORAGE_KEY);
    if (datos) {
        appData = JSON.parse(datos);
    }
}

// Guardar datos en localStorage
function guardarDatos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
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

// ============ NAVEGACIÓN POR PESTAÑAS ============
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        
        // Cambiar tabs activos
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Cambiar paneles
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${target}`).classList.add('active');
        
        // Actualizar paneles
        actualizarPanel(target);
    });
});

function actualizarPanel(panel) {
    switch(panel) {
        case 'registro':
            renderizarParticipantes();
            break;
        case 'platos':
            renderizarSelectCocineros();
            renderizarPlatos();
            break;
        case 'calificar':
            renderizarSelectJueces();
            break;
        case 'resultados':
            renderizarResultados();
            break;
    }
}

// ============ REGISTRO DE PARTICIPANTES ============
document.getElementById('form-registro').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre-participante').value.trim();
    const tipo = document.getElementById('tipo-participante').value;
    
    if (!nombre) return;
    
    const participante = {
        id: generarId(),
        nombre,
        tipo
    };
    
    appData.participantes.push(participante);
    guardarDatos();
    
    document.getElementById('form-registro').reset();
    renderizarParticipantes();
});

function renderizarParticipantes() {
    const contenedor = document.getElementById('lista-participantes');
    
    if (appData.participantes.length === 0) {
        contenedor.innerHTML = '<p>No hay participantes registrados aún.</p>';
        return;
    }
    
    contenedor.innerHTML = appData.participantes.map(p => `
        <div class="card">
            <div class="card-header">
                <strong>${p.nombre}</strong>
                <span class="badge badge-${p.tipo}">${p.tipo === 'cocinero' ? '👨‍🍳 Cocinero' : '🍴 Invitado'}</span>
            </div>
            <small>ID: ${p.id.slice(0, 8)}</small>
            <button class="eliminar-btn" onclick="eliminarParticipante('${p.id}')">Eliminar</button>
        </div>
    `).join('');
}

function eliminarParticipante(id) {
    if (!confirm('¿Eliminar este participante? Se eliminarán sus platos y calificaciones.')) return;
    
    appData.participantes = appData.participantes.filter(p => p.id !== id);
    appData.platos = appData.platos.filter(p => p.cocinero_id !== id);
    appData.calificaciones = appData.calificaciones.filter(c => c.juez_id !== id);
    guardarDatos();
    renderizarParticipantes();
}

// ============ PLATOS ============
function renderizarSelectCocineros() {
    const select = document.getElementById('cocinero-select');
    const cocineros = appData.participantes.filter(p => p.tipo === 'cocinero');
    
    select.innerHTML = '<option value="">Selecciona al cocinero...</option>' +
        cocineros.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
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
});

function renderizarPlatos() {
    const contenedor = document.getElementById('lista-platos');
    
    if (appData.platos.length === 0) {
        contenedor.innerHTML = '<p>No hay platos registrados aún.</p>';
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
function renderizarSelectJueces() {
    const select = document.getElementById('juez-select');
    
    select.innerHTML = '<option value="">¿Quién eres?</option>' +
        appData.participantes.map(p => `<option value="${p.id}">${p.nombre} (${p.tipo})</option>`).join('');
    
    document.getElementById('platos-a-calificar').innerHTML = 
        '<p>Selecciona un juez para ver los platos disponibles</p>';
}

document.getElementById('juez-select').addEventListener('change', (e) => {
    const juezId = e.target.value;
    if (!juezId) {
        document.getElementById('platos-a-calificar').innerHTML = 
            '<p>Selecciona un juez para ver los platos disponibles</p>';
        return;
    }
    
    renderizarPlatosParaCalificar(juezId);
});

function renderizarPlatosParaCalificar(juezId) {
    const contenedor = document.getElementById('platos-a-calificar');
    
    // Filtrar platos donde el juez NO es el cocinero
    const platosDisponibles = appData.platos.filter(p => p.cocinero_id !== juezId);
    
    if (platosDisponibles.length === 0) {
        contenedor.innerHTML = '<p>No hay platos para calificar (eres el cocinero de todos los platos).</p>';
        return;
    }
    
    contenedor.innerHTML = platosDisponibles.map(plato => {
        const yaCalificado = appData.calificaciones.find(
            c => c.plato_id === plato.id && c.juez_id === juezId
        );
        
        const cocinero = obtenerParticipante(plato.cocinero_id);
        
        return `
            <div class="voto-card">
                <div>
                    <strong>${plato.nombre}</strong>
                    <small>(de ${cocinero ? cocinero.nombre : '?'})</small>
                    ${plato.descripcion ? `<br><small>${plato.descripcion}</small>` : ''}
                </div>
                ${yaCalificado ? 
                    `<div>
                        <span class="badge">Ya calificado: ${'⭐'.repeat(yaCalificado.puntuacion)}</span>
                        <button class="eliminar-btn" onclick="eliminarCalificacion('${yaCalificado.id}', '${juezId}')">Cambiar</button>
                    </div>` :
                    `<div class="calificacion-form" data-plato="${plato.id}" data-juez="${juezId}">
                        <div class="stars">
                            ${[1,2,3,4,5,6,7,8,9,10].map(num => 
                                `<span onclick="calificar('${plato.id}', '${juezId}', ${num})" title="${num}">⭐</span>`
                            ).join('')}
                        </div>
                        <input type="text" placeholder="Comentario (opcional)" class="comentario-input" style="margin-top: 0.5rem;">
                    </div>`
                }
            </div>
        `;
    }).join('');
}

function calificar(platoId, juezId, puntuacion) {
    // Verificar que no sea el cocinero calificando su propio plato
    const plato = obtenerPlato(platoId);
    if (plato.cocinero_id === juezId) {
        alert('¡No puedes calificar tu propio plato!');
        return;
    }
    
    // Obtener el comentario
    const formDiv = document.querySelector(`[data-plato="${platoId}"]`);
    const comentarioInput = formDiv ? formDiv.querySelector('.comentario-input') : null;
    const comentario = comentarioInput ? comentarioInput.value.trim() : '';
    
    // Verificar si ya existe una calificación
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
        contenedor.innerHTML = '<p>No hay platos para mostrar resultados.</p>';
        return;
    }
    
    // Calcular promedios
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
    
    // Ordenar por promedio descendente
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
                                return `${juez ? juez.nombre : '?'}: ${c.puntuacion} ${c.comentario ? `"${c.comentario}"` : ''}`;
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
renderizarParticipantes();
