// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

console.log('✅ Firebase inicializado correctamente');

// ===== VARIABLES GLOBALES =====
let workersData = [];
let profilePhotoBase64 = null;
let workPhotosBase64 = [];

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

// ===== FUNCIONES DE TESTING =====
window.testFirebaseConnection = async function() {
    try {
        console.log('🔍 Probando conexión a Firebase...');
        
        const testDoc = await getDocs(collection(db, 'workers'));
        console.log('✅ Firestore conectado. Documentos:', testDoc.size);
        
        showMessage('✅ Firebase conectado correctamente', 'success');
        return true;
    } catch (error) {
        console.error('❌ Error en Firebase:', error);
        showMessage('❌ Error: ' + error.message, 'error');
        return false;
    }
};

window.checkFirestoreData = async function() {
    try {
        console.log('🔍 Verificando datos en Firestore...');
        const querySnapshot = await getDocs(collection(db, 'workers'));
        
        console.log('📊 Total de documentos:', querySnapshot.size);
        
        const workers = [];
        querySnapshot.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() };
            workers.push(data);
            console.log('👤 Trabajador:', data.fullName, '-', data.trade);
        });
        
        if (workers.length === 0) {
            showMessage('❌ No hay trabajadores en la base de datos', 'error');
        } else {
            showMessage(`✅ Encontrados ${workers.length} trabajadores`, 'success');
        }
        
        return workers;
    } catch (error) {
        console.error('❌ Error:', error);
        showMessage('Error: ' + error.message, 'error');
        return [];
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

                showMessage('¡Registro exitoso!', 'success');
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
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                showMessage('¡Inicio de sesión exitoso!', 'success');
                closeModal('loginModal');
                loginForm.reset();
            } catch (error) {
                showMessage('Error al iniciar sesión: ' + error.message, 'error');
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
});