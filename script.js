// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAotIOWYCdIB5XRFTDM-lkdBO7AosYyuCc",
    authDomain: "oficios-c1ea5.firebaseapp.com",
    projectId: "oficios-c1ea5",
    storageBucket: "oficios-c1ea5.firebasestorage.app",
    messagingSenderId: "619630338027",
    appId: "1:619630338027:web:8cac5477843ab7abc283ae",
    measurementId: "G-37X7N4ZCS5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Configuración para desarrollo local
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🏠 Ejecutándose en localhost - Configuración de desarrollo');
}

console.log('✅ Firebase inicializado correctamente');

// ===== VARIABLES GLOBALES =====
let workersData = [];
let profilePhotoBase64 = null;
let workPhotosBase64 = [];
let currentUser = null;
let currentUserProfile = null;
let editProfilePhotoBase64 = null;
let editWorkPhotosBase64 = [];
// Agregar al inicio del archivo, después de las variables existentes
let selectedRating = 0;
let currentWorkerId = null;
let filteredWorkers = [];

// ===== FUNCIONES AUXILIARES =====

// Función para mostrar mensajes
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        ${type === 'error' ? 'background-color: #f44336;' : type === 'info' ? 'background-color: #2196F3;' : 'background-color: #4CAF50;'}
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Función para redimensionar imagen
function resizeImage(file, maxWidth = 400, maxHeight = 400, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calcular nuevas dimensiones manteniendo proporción
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Dibujar imagen redimensionada
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir a base64
            const base64 = canvas.toDataURL('image/jpeg', quality);
            resolve(base64);
        };
        
        img.onerror = function() {
            reject(new Error('Error al cargar la imagen'));
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// ===== FUNCIONES DE MODAL =====
window.openModal = function(modalId) {
    document.getElementById(modalId).style.display = 'block';
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none';
};

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};

// ===== FUNCIONES DE PERFIL =====
async function loadUserProfile(user) {
    try {
        console.log('🔍 Cargando perfil para usuario:', user.uid);
        const querySnapshot = await getDocs(
            query(collection(db, 'workers'), where('uid', '==', user.uid))
        );
        
        if (!querySnapshot.empty) {
            let profileData = null;
            querySnapshot.forEach((doc) => {
                profileData = { id: doc.id, ...doc.data() };
            });
            console.log('✅ Perfil encontrado:', profileData.fullName);
            return profileData;
        } else {
            console.warn('⚠️ No se encontró perfil para el usuario:', user.uid);
            showMessage('❌ Tu perfil no fue encontrado. Debes registrarte como profesional primero.', 'error');
            
            // Cerrar sesión automáticamente si no tiene perfil
            await auth.signOut();
            return null;
        }
    } catch (error) {
        console.error('❌ Error cargando perfil:', error);
        return null;
    }
}

// Reemplazar la parte de estadísticas en showProfileDashboard con esto:
function showProfileDashboard(profile) {
    const dashboard = document.getElementById('profileDashboard');
    
    if (!profile) {
        dashboard.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-title">Error cargando perfil</div>
                <div class="empty-state-description">No se pudo cargar la información de tu perfil.</div>
                <button class="btn btn-primary" onclick="window.location.reload()">🔄 Recargar página</button>
            </div>
        `;
        return;
    }

    const workPhotosGallery = profile.workPhotos && profile.workPhotos.length > 0 
        ? `<div class="work-gallery">
             ${profile.workPhotos.map((photo, index) => 
                 `<img src="${photo}" class="work-photo" onclick="showFullImage('${photo}')" alt="Trabajo ${index + 1}">`
             ).join('')}
           </div>`
        : `<div class="empty-state">
             <div class="empty-state-icon">📸</div>
             <div class="empty-state-title">No has subido fotos de trabajos</div>
             <div class="empty-state-description">Agrega fotos para mostrar tu experiencia a los clientes</div>
           </div>`;

    // Calcular tiempo desde registro y estadísticas
    const createdDate = profile.createdAt?.toDate ? profile.createdAt.toDate() : new Date(profile.createdAt);
    const daysSinceRegistration = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
    
    // Simular calificación promedio y número de reseñas
    const avgRating = (Math.random() * 2 + 3).toFixed(1);
    const reviewCount = Math.floor(Math.random() * 50) + 5;
    const stars = '⭐'.repeat(Math.floor(avgRating));
    
    dashboard.innerHTML = `
        <div class="profile-dashboard">
            <div class="profile-header">
                <img src="${profile.profilePhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.fullName) + '&background=0a66c2&color=fff&size=200'}" 
                     alt="${profile.fullName}" class="profile-avatar">
                <div class="profile-info">
                    <h2>${profile.fullName || 'Usuario'}</h2>
                    <div class="trade">${profile.trade || 'Sin oficio definido'}</div>
                    <div class="location">📍 ${profile.location || 'Ubicación no definida'}</div>
                    <div class="worker-rating" style="justify-content: flex-start; margin: 8px 0;">
                        <span class="stars">${stars}</span>
                        <span class="rating-text">${avgRating} (${reviewCount} reseñas)</span>
                    </div>
                    <div style="color: rgba(255, 255, 255, 0.8); font-size: 0.9rem; margin-top: 8px;">
                        Miembro desde hace ${daysSinceRegistration} días
                    </div>
                    <div class="profile-actions">
                        <button class="btn btn-primary" onclick="openEditProfile()">✏️ Editar perfil</button>
                        <button class="btn btn-secondary" onclick="previewPublicProfile()">👁️ Vista pública</button>
                        <button class="logout-btn" onclick="logoutUser()">🚪 Cerrar sesión</button>
                    </div>
                </div>
            </div>

            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-number">${profile.workPhotos ? profile.workPhotos.length : 0}</div>
                    <div class="stat-label">Fotos de trabajos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${avgRating}</div>
                    <div class="stat-label">Calificación promedio</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${reviewCount}</div>
                    <div class="stat-label">Reseñas recibidas</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${daysSinceRegistration}</div>
                    <div class="stat-label">Días activo</div>
                </div>
            </div>

            <div class="profile-section">
                <h3>📝 Mi descripción profesional</h3>
                <div class="profile-section-content">
                    <p style="margin: 0; line-height: 1.6; color: #333;">${profile.description || 'No hay descripción disponible.'}</p>
                </div>
            </div>

            <div class="profile-section">
                <h3>🖼️ Portafolio de trabajos (${profile.workPhotos ? profile.workPhotos.length : 0})</h3>
                <div class="profile-section-content">
                    ${workPhotosGallery}
                </div>
            </div>

            <div class="profile-section">
                <h3>📞 Información de contacto</h3>
                <div class="profile-section-content">
                    <div class="contact-grid">
                        <div class="contact-item">
                            <div class="contact-item-icon">📱</div>
                            <div class="contact-item-label">Teléfono</div>
                            <div class="contact-item-value">${profile.phone || 'No disponible'}</div>
                            ${profile.phone ? `<a href="tel:${profile.phone}" class="contact-item-action">Llamar ahora</a>` : ''}
                        </div>
                        <div class="contact-item">
                            <div class="contact-item-icon">✉️</div>
                            <div class="contact-item-label">Email</div>
                            <div class="contact-item-value">${profile.email || 'No disponible'}</div>
                            ${profile.email ? `<a href="mailto:${profile.email}" class="contact-item-action">Enviar email</a>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function openEditProfile() {
    try {
        console.log('✏️ Abriendo editor de perfil...');
        
        if (!currentUserProfile) {
            showMessage('❌ No hay perfil cargado', 'error');
            return;
        }
        
        // Llenar el formulario con datos actuales
        document.getElementById('editFullName').value = currentUserProfile.fullName || '';
        document.getElementById('editPhone').value = currentUserProfile.phone || '';
        document.getElementById('editLocation').value = currentUserProfile.location || '';
        document.getElementById('editTrade').value = currentUserProfile.trade || '';
        document.getElementById('editDescription').value = currentUserProfile.description || '';
        
        // Limpiar previews
        const profilePreview = document.getElementById('editProfilePhotoPreview');
        const workPreview = document.getElementById('editWorkPhotosPreview');
        if (profilePreview) profilePreview.innerHTML = '';
        if (workPreview) workPreview.innerHTML = '';
        
        editProfilePhotoBase64 = null;
        editWorkPhotosBase64 = [];
        
        closeModal('profileModal');
        openModal('editProfileModal');
        
        console.log('✅ Editor de perfil abierto');
    } catch (error) {
        console.error('❌ Error abriendo editor:', error);
        showMessage('Error al abrir el editor', 'error');
    }
}

window.openEditProfile = openEditProfile;

function previewPublicProfile() {
    try {
        if (!currentUserProfile) {
            showMessage('❌ No hay perfil para mostrar', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'publicPreviewModal';
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const workPhotosGallery = currentUserProfile.workPhotos && currentUserProfile.workPhotos.length > 0 
            ? `<div class="work-photos-grid">
                 ${currentUserProfile.workPhotos.map(photo => 
                     `<img src="${photo}" class="work-photo-thumb" 
                           onclick="showFullImage('${photo}')" title="Ver imagen completa">`
                 ).join('')}
               </div>`
            : '';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <span class="close" onclick="document.getElementById('publicPreviewModal').remove()">&times;</span>
                <h2 style="text-align: center; color: #0a66c2; margin-bottom: 20px;">👁️ Vista del Cliente</h2>
                
                <div class="worker-card" style="margin: 0; border: 2px solid #0a66c2;">
                    <img src="${currentUserProfile.profilePhoto}" alt="${currentUserProfile.fullName}" class="worker-avatar" 
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserProfile.fullName)}&background=0a66c2&color=fff&size=200'">
                    <div class="worker-info">
                        <div class="worker-name">${currentUserProfile.fullName}</div>
                        <div class="worker-trade">${currentUserProfile.trade}</div>
                        <div class="worker-location">${currentUserProfile.location}</div>
                        <div class="worker-description">${currentUserProfile.description}</div>
                        ${workPhotosGallery}
                        <div class="worker-contact">
                            <span class="contact-btn contact-phone" style="cursor: default;">📞 Llamar</span>
                            <span class="contact-btn contact-email" style="cursor: default;">✉️ Email</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-box" style="margin-top: 16px; text-align: center;">
                    <strong>🔍 Vista previa:</strong> Así es como los clientes ven tu perfil en los resultados de búsqueda
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('❌ Error en vista previa:', error);
        showMessage('Error al mostrar vista previa', 'error');
    }
}

window.previewPublicProfile = previewPublicProfile;

async function logoutUser() {
    try {
        console.log('🚪 Cerrando sesión...');
        showMessage('Cerrando sesión...', 'info');
        
        // Cerrar sesión en Firebase
        await auth.signOut();
        
        // Limpiar variables globales
        currentUser = null;
        currentUserProfile = null;
        
        // Cerrar modales
        closeModal('profileModal');
        closeModal('editProfileModal');
        
        // Actualizar botones del header
        updateHeaderButtons();
        
        console.log('✅ Sesión cerrada correctamente');
        showMessage('👋 Sesión cerrada correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        showMessage('Error al cerrar sesión: ' + error.message, 'error');
    }
}

window.logoutUser = logoutUser;

function updateHeaderButtons() {
    const navButtons = document.querySelector('.nav-buttons');
    
    if (currentUser && currentUserProfile) {
        navButtons.innerHTML = `
            <button class="btn btn-secondary" onclick="openUserProfile()">👤 Mi Perfil</button>
            <button class="btn btn-primary" onclick="logoutUser()">Cerrar sesión</button>
        `;
    } else {
        navButtons.innerHTML = `
            <button class="btn btn-primary" onclick="openModal('registerModal')">Registrar mi oficio</button>
            <button class="btn btn-secondary" onclick="openModal('loginModal')">Iniciar sesión</button>
        `;
    }
}

// Función para abrir el perfil de usuario
window.openUserProfile = async function() {
    try {
        console.log('🔍 Abriendo perfil de usuario...');
        
        if (!currentUser) {
            showMessage('❌ No hay usuario logueado', 'error');
            return;
        }

        if (!currentUserProfile) {
            console.log('🔄 Recargando perfil del usuario...');
            showMessage('Cargando tu perfil...', 'info');
            currentUserProfile = await loadUserProfile(currentUser);
        }

        if (currentUserProfile) {
            console.log('✅ Mostrando dashboard del perfil');
            openModal('profileModal');
            showProfileDashboard(currentUserProfile);
        } else {
            showMessage('❌ No se pudo cargar tu perfil', 'error');
            console.error('No se encontró perfil para el usuario');
        }
    } catch (error) {
        console.error('Error abriendo perfil:', error);
        showMessage('Error al abrir el perfil', 'error');
    }
};

// ===== CARGA DE TRABAJADORES =====
// Modificar la función loadWorkers para inicializar filteredWorkers:
async function loadWorkers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'workers'));
        workersData = [];
        querySnapshot.forEach((doc) => {
            workersData.push({ id: doc.id, ...doc.data() });
        });
        filteredWorkers = [...workersData]; // Agregar esta línea
        displayWorkers(workersData);
        console.log('📋 Trabajadores cargados:', workersData.length);
    } catch (error) {
        console.error('Error al cargar trabajadores:', error);
        showExampleWorkers();
    }
}

// Modificar showExampleWorkers también:
function showExampleWorkers() {
    const exampleWorkers = [
        {
            id: 1,
            fullName: "Juan Pérez",
            trade: "Albañilería",
            location: "Santo Domingo, DN",
            description: "Albañil con 15 años de experiencia en construcción residencial y comercial.",
            phone: "809-123-4567",
            email: "juan.perez@email.com",
            profilePhoto: "https://ui-avatars.com/api/?name=Juan+Pérez&background=0a66c2&color=fff&size=200",
            workPhotos: []
        }
    ];
    
    workersData = exampleWorkers;
    filteredWorkers = [...workersData]; // Agregar esta línea
    displayWorkers(workersData);
}

// Mostrar trabajadores en la página con estilo LinkedIn
// Reemplazar la función displayWorkers existente con esta versión mejorada
function displayWorkers(workers) {
    const grid = document.getElementById('resultsGrid');
    const resultsCount = document.getElementById('resultsCount');
    
    if (!grid) return;
    
    // Actualizar contador
    if (resultsCount) {
        resultsCount.textContent = `${workers.length} profesionales encontrados`;
    }
    
    grid.innerHTML = '';

    if (workers.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-title">No se encontraron profesionales</div>
                <div class="empty-state-description">Intenta con otros términos de búsqueda o revisa todas las categorías</div>
            </div>
        `;
        return;
    }

    workers.forEach((worker, index) => {
        const card = document.createElement('div');
        card.className = 'worker-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Generar calificación aleatoria para demo (puedes reemplazar con datos reales)
        const rating = (Math.random() * 2 + 3).toFixed(1); // Entre 3.0 y 5.0
        const reviewCount = Math.floor(Math.random() * 50) + 10; // Entre 10 y 60
        const stars = '⭐'.repeat(Math.floor(rating));
        
        // Crear galería de fotos si existen
        let photosGallery = '';
        if (worker.workPhotos && worker.workPhotos.length > 0) {
            photosGallery = `
                <div class="work-photos-grid">
                    ${worker.workPhotos.map((photo, index) => 
                        `<img src="${photo}" class="work-photo-thumb" 
                              onclick="showFullImage('${photo}')" 
                              title="Ver trabajo ${index + 1}">`
                    ).join('')}
                </div>
            `;
        }
        
        // Calcular estadísticas
        const yearsExperience = Math.floor(Math.random() * 15) + 5;
        const projectCount = Math.floor(Math.random() * 200) + 50;
        const responseTime = Math.random() > 0.5 ? '24h' : '48h';
        
        card.innerHTML = `
            <div class="worker-header">
                <div class="worker-location">📍 ${worker.location}</div>
                <div class="worker-avatar-container">
                    <img src="${worker.profilePhoto}" alt="${worker.fullName}" class="worker-avatar" 
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(worker.fullName)}&background=0a66c2&color=fff&size=200'">
                </div>
                <div class="worker-name">${worker.fullName}</div>
                <div class="worker-trade">${worker.trade}</div>
                <div class="worker-rating">
                    <span class="stars">${stars}</span>
                    <span class="rating-text">${rating} (${reviewCount} reseñas)</span>
                </div>
            </div>
            <div class="worker-info">
                <div class="worker-specialties">
                    <span class="specialty-tag">${worker.trade}</span>
                    <span class="specialty-tag">Profesional</span>
                </div>
                <div class="worker-stats">
                    <div class="stat">
                        <span class="stat-number">${yearsExperience}</span>
                        <span class="stat-label">Años</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${projectCount}+</span>
                        <span class="stat-label">Proyectos</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${responseTime}</span>
                        <span class="stat-label">Respuesta</span>
                    </div>
                </div>
                <div class="worker-description">${worker.description}</div>
                ${photosGallery}
                <div class="worker-contact">
                    <a href="tel:${worker.phone}" class="contact-btn contact-phone">📞 Llamar</a>
                    <a href="mailto:${worker.email}" class="contact-btn contact-email">✉️ Email</a>
                    <button class="contact-btn contact-rate" onclick="openRatingModal('${worker.id}', '${worker.fullName}')">⭐ Calificar</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Función para mostrar imagen en tamaño completo
window.showFullImage = function(base64Image) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
        justify-content: center; align-items: center; cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = base64Image;
    img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 10px;';
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    modal.onclick = () => modal.remove();
};

// ===== FUNCIÓN DE BÚSQUEDA =====
window.searchWorkers = function() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const category = document.getElementById('categorySelect').value;

    console.log('🔍 Buscando...', { searchTerm, category, totalWorkers: workersData.length });

    let filteredWorkers = [...workersData];

    if (searchTerm) {
        filteredWorkers = filteredWorkers.filter(worker => 
            worker.fullName.toLowerCase().includes(searchTerm) ||
            worker.trade.toLowerCase().includes(searchTerm) ||
            worker.description.toLowerCase().includes(searchTerm) ||
            worker.location.toLowerCase().includes(searchTerm)
        );
    }

    if (category) {
        filteredWorkers = filteredWorkers.filter(worker => worker.trade === category);
    }

    displayWorkers(filteredWorkers);
    
    if (filteredWorkers.length === 0) {
        showMessage(`No se encontraron profesionales. Total: ${workersData.length}`, 'info');
    } else {
        showMessage(`Se encontraron ${filteredWorkers.length} profesionales`, 'success');
    }
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM cargado');

// Event listeners para filtros
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            const group = this.closest('.filter-group');
            
            // Si es un filtro de categoría, solo permitir uno activo
            if (group.querySelector('h3').textContent === 'Oficios') {
                group.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const category = this.dataset.category || '';
                filterByCategory(category);
            }
            // Si es un filtro de calificación
            else if (group.querySelector('h3').textContent === 'Calificación') {
                group.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const minRating = this.dataset.rating || 0;
                filterByRating(minRating);
            }
        });
    });
});

function filterByCategory(category) {
    if (!category) {
        filteredWorkers = [...workersData];
    } else {
        filteredWorkers = workersData.filter(worker => worker.trade === category);
    }
    displayWorkers(filteredWorkers);
}

function filterByRating(minRating) {
   // Por ahora filtraremos aleatoriamente ya que no tenemos calificaciones reales
   // En una implementación real, filtrarías por worker.rating >= minRating
   if (minRating == 0) {
       filteredWorkers = [...workersData];
   } else {
       // Simulación: mantener un porcentaje de trabajadores según la calificación
       const keepPercentage = minRating == 5 ? 0.3 : minRating == 4 ? 0.6 : 0.8;
       filteredWorkers = workersData.filter(() => Math.random() < keepPercentage);
   }
   displayWorkers(filteredWorkers);
}

window.advancedSearch = function() {
   const nameSearch = document.getElementById('nameSearchInput').value.toLowerCase().trim();
   const locationSearch = document.getElementById('locationSearchInput').value.toLowerCase().trim();
   
   let filtered = [...workersData];
   
   if (nameSearch) {
       filtered = filtered.filter(worker => 
           worker.fullName.toLowerCase().includes(nameSearch) ||
           worker.trade.toLowerCase().includes(nameSearch) ||
           worker.description.toLowerCase().includes(nameSearch)
       );
   }
   
   if (locationSearch) {
       filtered = filtered.filter(worker => 
           worker.location.toLowerCase().includes(locationSearch)
       );
   }
   
   filteredWorkers = filtered;
   displayWorkers(filteredWorkers);
   
   if (filtered.length === 0) {
       showMessage('No se encontraron profesionales con esos criterios', 'info');
   } else {
       showMessage(`Se encontraron ${filtered.length} profesionales`, 'success');
   }
};

window.quickSearch = function() {
   const searchTerm = document.getElementById('headerSearchInput').value.toLowerCase().trim();
   
   if (!searchTerm) {
       displayWorkers(workersData);
       return;
   }
   
   const filtered = workersData.filter(worker => 
       worker.fullName.toLowerCase().includes(searchTerm) ||
       worker.trade.toLowerCase().includes(searchTerm) ||
       worker.description.toLowerCase().includes(searchTerm) ||
       worker.location.toLowerCase().includes(searchTerm)
   );
   
   filteredWorkers = filtered;
   displayWorkers(filtered);
   
   // Actualizar el input de búsqueda principal si existe
   const mainSearchInput = document.getElementById('searchInput');
   if (mainSearchInput) {
       mainSearchInput.value = searchTerm;
   }
};


// Agregar en el DOMContentLoaded, después de los event listeners existentes:

// Búsqueda con Enter en header
const headerSearchInput = document.getElementById('headerSearchInput');
if (headerSearchInput) {
    headerSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            quickSearch();
        }
    });
}

// Búsqueda con Enter en filtros avanzados
const nameSearchInput = document.getElementById('nameSearchInput');
if (nameSearchInput) {
    nameSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            advancedSearch();
        }
    });
}

const locationSearchInput = document.getElementById('locationSearchInput');
if (locationSearchInput) {
    locationSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            advancedSearch();
        }
    });
}

    // Event listener para foto de perfil
    const profilePhotoInput = document.getElementById('profilePhoto');
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try {
                    showMessage('Procesando foto de perfil...', 'info');
                    
                    profilePhotoBase64 = await resizeImage(file, 300, 300, 0.8);
                    
                    // Mostrar preview
                    const preview = document.getElementById('profilePhotoPreview');
                    if (preview) {
                        preview.innerHTML = `<img src="${profilePhotoBase64}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 50%;">`;
                    }
                    
                    // Actualizar área de upload
                    const uploadArea = document.querySelector('.photo-upload');
                    if (uploadArea) {
                        uploadArea.innerHTML = `
                            <img src="${profilePhotoBase64}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 50%; margin-bottom: 10px;">
                            <p>Foto de perfil lista</p>
                            <p style="font-size: 0.9rem; color: #666;">Haz clic para cambiar</p>
                        `;
                    }
                    
                    showMessage('✅ Foto de perfil procesada', 'success');
                } catch (error) {
                    console.error('Error procesando foto:', error);
                    showMessage('Error al procesar la foto', 'error');
                }
            }
        });
    }

    // Event listener para fotos de trabajos
    const workPhotosInput = document.getElementById('workPhotos');
    if (workPhotosInput) {
        workPhotosInput.addEventListener('change', async function(e) {
            const files = Array.from(e.target.files);
            
            if (files.length > 3) {
                showMessage('Máximo 3 fotos permitidas', 'error');
                return;
            }
            
            try {
                showMessage('Procesando fotos de trabajos...', 'info');
                
                workPhotosBase64 = [];
                const preview = document.getElementById('workPhotosPreview');
                if (preview) {
                    preview.innerHTML = '';
                }
                
                for (let i = 0; i < files.length; i++) {
                    const base64 = await resizeImage(files[i], 600, 400, 0.8);
                    workPhotosBase64.push(base64);
                    
                    if (preview) {
                        const img = document.createElement('img');
                        img.src = base64;
                        img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 5px; margin: 5px;';
                        preview.appendChild(img);
                    }
                }
                
                showMessage(`✅ ${files.length} fotos procesadas`, 'success');
            } catch (error) {
                console.error('Error procesando fotos:', error);
                showMessage('Error al procesar fotos', 'error');
            }
        });
    }

    // Registro de usuario
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                phone: document.getElementById('phone').value,
                location: document.getElementById('location').value,
                trade: document.getElementById('trade').value,
                description: document.getElementById('description').value
            };

            // Validar campos
            if (!formData.fullName || !formData.email || !formData.password || 
                !formData.phone || !formData.location || !formData.trade || !formData.description) {
                showMessage('Completa todos los campos', 'error');
                return;
            }

            if (formData.password.length < 6) {
                showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }

            try {
                showMessage('Registrando usuario...', 'info');
                
                // Crear usuario en Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const user = userCredential.user;

                // Preparar foto de perfil
                const finalProfilePhoto = profilePhotoBase64 || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName)}&background=667eea&color=fff&size=200`;

                // Guardar datos en Firestore
                const workerData = {
                    uid: user.uid,
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    location: formData.location,
                    trade: formData.trade,
                    description: formData.description,
                    profilePhoto: finalProfilePhoto,
                    workPhotos: workPhotosBase64 || [],
                    createdAt: new Date()
                };
                
                await addDoc(collection(db, 'workers'), workerData);

                showMessage('¡Registro exitoso! Bienvenido a Oficios 🎉', 'success');
                closeModal('registerModal');
                registerForm.reset();
                
                // Limpiar variables
                profilePhotoBase64 = null;
                workPhotosBase64 = [];
                
                // Limpiar previews
                const profilePreview = document.getElementById('profilePhotoPreview');
                const workPreview = document.getElementById('workPhotosPreview');
                if (profilePreview) profilePreview.innerHTML = '';
                if (workPreview) workPreview.innerHTML = '';
                
                const uploadArea = document.querySelector('.photo-upload');
                if (uploadArea) {
                    uploadArea.innerHTML = '<p>Haz clic para subir tu foto de perfil</p>';
                }
                
                loadWorkers();
                
            } catch (error) {
                console.error('Error al registrar:', error);
                
                let errorMessage = 'Error al registrar: ';
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage += 'Este correo ya está registrado.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage += 'El correo no es válido.';
                        break;
                    case 'auth/weak-password':
                        errorMessage += 'La contraseña es muy débil.';
                        break;
                    default:
                        errorMessage += error.message;
                }
                
                showMessage(errorMessage, 'error');
            }
        });
    }

    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            // Validaciones básicas
            if (!email || !password) {
                showMessage('Por favor completa todos los campos', 'error');
                return;
            }

            if (!email.includes('@')) {
                showMessage('Por favor ingresa un email válido', 'error');
                return;
            }

            try {
                showMessage('Iniciando sesión...', 'info');
                
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                currentUser = userCredential.user;
                console.log('👤 Usuario logueado:', currentUser.uid);
                
                // Cargar perfil del usuario
                currentUserProfile = await loadUserProfile(currentUser);
                
                if (currentUserProfile) {
                    showMessage('¡Bienvenido de vuelta! 👋', 'success');
                    closeModal('loginModal');
                    loginForm.reset();
                    updateHeaderButtons();
                    
                    // Mostrar dashboard automáticamente
                    setTimeout(() => {
                        openModal('profileModal');
                        showProfileDashboard(currentUserProfile);
                    }, 500);
                } else {
                    // No se encontró perfil - el usuario existe en Auth pero no en workers
                    showMessage('⚠️ Debes completar tu registro como profesional', 'error');
                    console.error('Usuario en Auth pero sin perfil en workers collection');
                    
                    // Opcional: Redirigir al formulario de registro
                    setTimeout(() => {
                        closeModal('loginModal');
                        openModal('registerModal');
                        showMessage('Por favor completa tu registro profesional', 'info');
                    }, 2000);
                }
            } catch (error) {
                console.error('Error al iniciar sesión:', error);
                
                let errorMessage = 'Error al iniciar sesión: ';
                switch (error.code) {
                    case 'auth/invalid-credential':
                        errorMessage += 'Email o contraseña incorrectos. Verifica tus datos.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage += 'El formato del email no es válido.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage += 'Esta cuenta ha sido deshabilitada.';
                        break;
                    case 'auth/user-not-found':
                        errorMessage += 'No existe una cuenta con este email.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage += 'La contraseña es incorrecta.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage += 'Demasiados intentos fallidos. Intenta más tarde.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage += 'Error de conexión. Verifica tu internet.';
                        break;
                    default:
                        errorMessage += 'Error desconocido. Intenta nuevamente.';
                }
                
                showMessage(errorMessage, 'error');
            }
        });
    }

    // Event listeners para editar perfil
    const editProfilePhotoInput = document.getElementById('editProfilePhoto');
    if (editProfilePhotoInput) {
        editProfilePhotoInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try {
                    showMessage('Procesando nueva foto de perfil...', 'info');
                    editProfilePhotoBase64 = await resizeImage(file, 300, 300, 0.8);
                    
                    const preview = document.getElementById('editProfilePhotoPreview');
                    if (preview) {
                        preview.innerHTML = `<img src="${editProfilePhotoBase64}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 50%;">`;
                    }
                    
                    showMessage('✅ Nueva foto procesada', 'success');
                } catch (error) {
                    showMessage('Error al procesar la foto', 'error');
                }
            }
        });
    }

    const editWorkPhotosInput = document.getElementById('editWorkPhotos');
    if (editWorkPhotosInput) {
        editWorkPhotosInput.addEventListener('change', async function(e) {
            const files = Array.from(e.target.files);
            
            if (files.length > 3) {
                showMessage('Máximo 3 fotos permitidas', 'error');
                return;
            }
            
            try {
                showMessage('Procesando nuevas fotos de trabajos...', 'info');
                editWorkPhotosBase64 = [];
                const preview = document.getElementById('editWorkPhotosPreview');
                if (preview) {
                    preview.innerHTML = '';
                }
                
                for (let i = 0; i < files.length; i++) {
                    const base64 = await resizeImage(files[i], 600, 400, 0.8);
                    editWorkPhotosBase64.push(base64);
                    
                    if (preview) {
                        const img = document.createElement('img');
                        img.src = base64;
                        img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 5px; margin: 5px;';
                        preview.appendChild(img);
                    }
                }
                
                showMessage(`✅ ${files.length} nuevas fotos procesadas`, 'success');
            } catch (error) {
                showMessage('Error al procesar fotos', 'error');
            }
        });
    }

    // Formulario de editar perfil
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentUserProfile) return;
            
            try {
                showMessage('Actualizando perfil...', 'info');
                
                const updatedData = {
                    fullName: document.getElementById('editFullName').value,
                    phone: document.getElementById('editPhone').value,
                    location: document.getElementById('editLocation').value,
                    trade: document.getElementById('editTrade').value,
                    description: document.getElementById('editDescription').value,
                    updatedAt: new Date()
                };
                
                // Actualizar foto de perfil si se seleccionó una nueva
                if (editProfilePhotoBase64) {
                    updatedData.profilePhoto = editProfilePhotoBase64;
                }
                
                // Actualizar fotos de trabajos si se seleccionaron nuevas
                if (editWorkPhotosBase64.length > 0) {
                    updatedData.workPhotos = editWorkPhotosBase64;
                }
                
                // Actualizar en Firestore
                const docRef = doc(db, 'workers', currentUserProfile.id);
                await updateDoc(docRef, updatedData);
                
                // Actualizar el perfil local
                currentUserProfile = { ...currentUserProfile, ...updatedData };
                
                showMessage('✅ Perfil actualizado correctamente', 'success');
                closeModal('editProfileModal');
                
                // Mostrar el dashboard actualizado
                showProfileDashboard(currentUserProfile);
                loadWorkers(); // Recargar la lista para reflejar cambios
                
            } catch (error) {
                console.error('Error actualizando perfil:', error);
                showMessage('Error al actualizar el perfil', 'error');
            }
        });
    }

    // ===== SISTEMA DE CALIFICACIONES =====
window.openRatingModal = function(workerId, workerName) {
    currentWorkerId = workerId;
    selectedRating = 0;
    
    // Actualizar el título del modal
    const modal = document.getElementById('ratingModal');
    const title = modal.querySelector('h2');
    title.textContent = `Calificar a ${workerName}`;
    
    // Resetear estrellas
    document.querySelectorAll('.star').forEach(star => {
        star.classList.remove('active');
    });
    
    openModal('ratingModal');
};

// Event listeners para las estrellas
document.addEventListener('DOMContentLoaded', function() {
    // ... código existente ...
    
    // Agregar después de los otros event listeners
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            updateStars();
        });
        
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
    });
    
    document.querySelector('.star-rating').addEventListener('mouseleave', function() {
        updateStars();
    });
});

function highlightStars(rating) {
    document.querySelectorAll('.star').forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function updateStars() {
    document.querySelectorAll('.star').forEach((star, index) => {
        if (index < selectedRating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

window.submitRating = async function() {
    if (selectedRating === 0) {
        showMessage('Por favor selecciona una calificación', 'error');
        return;
    }
    
    const comment = document.getElementById('ratingComment').value;
    
    try {
        // Aquí guardarías la calificación en Firebase
        // Por ahora solo simulamos
        showMessage(`¡Gracias por tu calificación de ${selectedRating} estrellas!`, 'success');
        closeModal('ratingModal');
        
        // Limpiar el comentario
        document.getElementById('ratingComment').value = '';
    } catch (error) {
        showMessage('Error al enviar la calificación', 'error');
    }
};

    // Buscar al presionar Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchWorkers();
            }
        });
    }

    // Cargar trabajadores al iniciar
    loadWorkers();
    
    // Verificar si hay usuario logueado al cargar
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            currentUserProfile = await loadUserProfile(user);
            updateHeaderButtons();
        } else {
            currentUser = null;
            currentUserProfile = null;
            updateHeaderButtons();
        }
    });