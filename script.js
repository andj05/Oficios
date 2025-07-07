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

function showProfileDashboard(profile) {
    const dashboard = document.getElementById('profileDashboard');
    
    if (!profile) {
        dashboard.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2 style="color: #f44336; margin-bottom: 1rem;">❌ Error cargando perfil</h2>
                <p style="color: #666; margin-bottom: 2rem;">No se pudo cargar la información de tu perfil.</p>
                <button class="btn btn-primary" onclick="window.location.reload()">🔄 Recargar página</button>
                <button class="btn btn-secondary" onclick="closeModal('profileModal')" style="margin-left: 1rem;">❌ Cerrar</button>
            </div>
        `;
        return;
    }

    console.log('📊 Mostrando dashboard para:', profile.fullName);
    
    const workPhotosGallery = profile.workPhotos && profile.workPhotos.length > 0 
        ? `<div class="work-gallery">
             ${profile.workPhotos.map((photo, index) => 
                 `<div style="position: relative;">
                    <img src="${photo}" class="work-photo" onclick="showFullImage('${photo}')" alt="Trabajo ${index + 1}">
                    <div style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8rem;">
                        ${index + 1}/${profile.workPhotos.length}
                    </div>
                  </div>`
             ).join('')}
           </div>`
        : '<div style="text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px; border: 2px dashed #ddd;"><p style="color: #666; margin: 0;">📸 No has subido fotos de trabajos aún</p><p style="color: #888; margin: 5px 0 0 0; font-size: 0.9rem;">Haz clic en "Editar perfil" para agregar fotos</p></div>';

    // Calcular tiempo desde registro
    const createdDate = profile.createdAt?.toDate ? profile.createdAt.toDate() : new Date(profile.createdAt);
    const daysSinceRegistration = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
    
    dashboard.innerHTML = `
        <div class="profile-dashboard">
            <div class="profile-header">
                <img src="${profile.profilePhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.fullName) + '&background=667eea&color=fff&size=200'}" alt="${profile.fullName}" class="profile-avatar">
                <div class="profile-info">
                    <h2>${profile.fullName || 'Usuario'} ✨</h2>
                    <div class="trade">${profile.trade || 'Sin oficio definido'}</div>
                    <div class="location">📍 ${profile.location || 'Ubicación no definida'}</div>
                    <div style="color: #888; font-size: 0.9rem; margin-top: 0.5rem;">
                        👤 Miembro desde hace ${daysSinceRegistration} días
                    </div>
                    <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="openEditProfile()" style="display: flex; align-items: center; gap: 0.5rem;">
                            ✏️ Editar perfil
                        </button>
                        <button class="btn" onclick="previewPublicProfile()" style="background: #4CAF50; color: white; display: flex; align-items: center; gap: 0.5rem;">
                            👁️ Ver como cliente
                        </button>
                        <button class="logout-btn" onclick="logoutUser()" style="display: flex; align-items: center; gap: 0.5rem;">
                            🚪 Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>

            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-number">${profile.workPhotos ? profile.workPhotos.length : 0}</div>
                    <div class="stat-label">Fotos de trabajos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">📞</div>
                    <div class="stat-label">${profile.phone || 'Sin teléfono'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">📧</div>
                    <div class="stat-label">${profile.email ? (profile.email.length > 20 ? profile.email.substring(0, 17) + '...' : profile.email) : 'Sin email'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${daysSinceRegistration}</div>
                    <div class="stat-label">Días activo</div>
                </div>
            </div>

            <div class="profile-section">
                <h3>📝 Mi descripción profesional</h3>
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #667eea;">
                    <p style="margin: 0; line-height: 1.6; color: #555;">${profile.description || 'No hay descripción disponible.'}</p>
                </div>
            </div>

            <div class="profile-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0;">🖼️ Portafolio de trabajos</h3>
                    <span style="background: #667eea; color: white; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.8rem;">
                        ${profile.workPhotos ? profile.workPhotos.length : 0} fotos
                    </span>
                </div>
                ${workPhotosGallery}
            </div>

            <div class="profile-section">
                <h3>📊 Información de contacto</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                    <div style="background: #f0f8ff; padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📱</div>
                        <div style="font-weight: bold; color: #333;">Teléfono</div>
                        <div style="color: #666;">${profile.phone || 'No disponible'}</div>
                        ${profile.phone ? `<a href="tel:${profile.phone}" style="display: inline-block; margin-top: 0.5rem; padding: 0.3rem 1rem; background: #4CAF50; color: white; text-decoration: none; border-radius: 15px; font-size: 0.9rem;">Llamar ahora</a>` : ''}
                    </div>
                    <div style="background: #f0f8ff; padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">✉️</div>
                        <div style="font-weight: bold; color: #333;">Email</div>
                        <div style="color: #666; word-break: break-word;">${profile.email || 'No disponible'}</div>
                        ${profile.email ? `<a href="mailto:${profile.email}" style="display: inline-block; margin-top: 0.5rem; padding: 0.3rem 1rem; background: #2196F3; color: white; text-decoration: none; border-radius: 15px; font-size: 0.9rem;">Enviar email</a>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    console.log('✅ Dashboard mostrado correctamente');
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
        console.log('👁️ Mostrando vista previa pública...');
        
        if (!currentUserProfile) {
            showMessage('❌ No hay perfil para mostrar', 'error');
            return;
        }
        
        // Crear una vista temporal del perfil como lo ven los clientes
        const modal = document.createElement('div');
        modal.id = 'publicPreviewModal';
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const workPhotosGallery = currentUserProfile.workPhotos && currentUserProfile.workPhotos.length > 0 
            ? `<div style="display: flex; gap: 5px; margin-top: 10px; overflow-x: auto;">
                 ${currentUserProfile.workPhotos.map(photo => 
                     `<img src="${photo}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; flex-shrink: 0; cursor: pointer;" 
                           onclick="showFullImage('${photo}')" title="Ver imagen completa">`
                 ).join('')}
               </div>`
            : '';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <span class="close" onclick="document.getElementById('publicPreviewModal').remove()">&times;</span>
                <h2 style="text-align: center; color: #667eea; margin-bottom: 1rem;">👁️ Vista del Cliente</h2>
                
                <div class="worker-card" style="margin: 0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    <img src="${currentUserProfile.profilePhoto}" alt="${currentUserProfile.fullName}" class="worker-avatar" 
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserProfile.fullName)}&background=667eea&color=fff&size=200'">
                    <div class="worker-info">
                        <div class="worker-name">${currentUserProfile.fullName}</div>
                        <div class="worker-trade">${currentUserProfile.trade}</div>
                        <div class="worker-location">${currentUserProfile.location}</div>
                        <div class="worker-description">${currentUserProfile.description}</div>
                        ${workPhotosGallery}
                        <div class="worker-contact">
                            <span class="contact-btn contact-phone" style="cursor: default;">📞 Llamar</span>
                            <span class="contact-btn contact-email" style="cursor: default;">📧 Email</span>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 1rem; padding: 1rem; background: #f0f8ff; border-radius: 8px;">
                    <p style="margin: 0; color: #666; font-size: 0.9rem;">
                        🔍 Así es como los clientes ven tu perfil en los resultados de búsqueda
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log('✅ Vista previa mostrada');
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
            <button class="btn btn-primary" onclick="openUserProfile()">👤 Mi Perfil</button>
            <button class="btn btn-secondary" onclick="logoutUser()">🚪 Cerrar sesión</button>
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
async function loadWorkers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'workers'));
        workersData = [];
        querySnapshot.forEach((doc) => {
            workersData.push({ id: doc.id, ...doc.data() });
        });
        displayWorkers(workersData);
        console.log('📋 Trabajadores cargados:', workersData.length);
    } catch (error) {
        console.error('Error al cargar trabajadores:', error);
        showExampleWorkers();
    }
}

// Mostrar trabajadores de ejemplo
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
            profilePhoto: "https://ui-avatars.com/api/?name=Juan+Pérez&background=667eea&color=fff&size=200",
            workPhotos: []
        }
    ];
    
    workersData = exampleWorkers;
    displayWorkers(workersData);
}

// Mostrar trabajadores en la página
function displayWorkers(workers) {
    const grid = document.getElementById('resultsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';

    if (workers.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666; font-size: 1.2rem; margin-top: 2rem;">No se encontraron profesionales.</p>';
        return;
    }

    workers.forEach(worker => {
        const card = document.createElement('div');
        card.className = 'worker-card';
        
        // Crear galería de fotos si existen
        let photosGallery = '';
        if (worker.workPhotos && worker.workPhotos.length > 0) {
            photosGallery = `
                <div style="display: flex; gap: 5px; margin-top: 10px; overflow-x: auto;">
                    ${worker.workPhotos.map(photo => 
                        `<img src="${photo}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; flex-shrink: 0; cursor: pointer;" 
                              onclick="showFullImage('${photo}')" title="Ver imagen completa">`
                    ).join('')}
                </div>
            `;
        }
        
        card.innerHTML = `
            <img src="${worker.profilePhoto}" alt="${worker.fullName}" class="worker-avatar" 
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(worker.fullName)}&background=667eea&color=fff&size=200'">
            <div class="worker-info">
                <div class="worker-name">${worker.fullName}</div>
                <div class="worker-trade">${worker.trade}</div>
                <div class="worker-location">${worker.location}</div>
                <div class="worker-description">${worker.description}</div>
                ${photosGallery}
                <div class="worker-contact">
                    <a href="tel:${worker.phone}" class="contact-btn contact-phone">Llamar</a>
                    <a href="mailto:${worker.email}" class="contact-btn contact-email">Email</a>
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
});