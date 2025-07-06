// Firebase imports - Estos se cargan desde CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app);

// Variables globales
let workersData = [];
let workPhotosFiles = [];

// Funciones para modales
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

// Función para mostrar mensaje de error o éxito
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
        ${type === 'error' ? 'background-color: #f44336;' : 'background-color: #4CAF50;'}
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Subir archivos
document.addEventListener('DOMContentLoaded', function() {
    const workPhotosInput = document.getElementById('workPhotos');
    if (workPhotosInput) {
        workPhotosInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            workPhotosFiles = files;
            const preview = document.getElementById('workPhotosPreview');
            preview.innerHTML = '';
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
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
                phone: document.getElementById('phone').value,
                location: document.getElementById('location').value,
                trade: document.getElementById('trade').value,
                description: document.getElementById('description').value
            };

            try {
                showMessage('Registrando usuario...', 'info');
                
                // Crear usuario en Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, 'password123');
                const user = userCredential.user;

                // Subir foto de perfil
                let profilePhotoURL = '';
                const profilePhoto = document.getElementById('profilePhoto').files[0];
                if (profilePhoto) {
                    const profileRef = ref(storage, `profile-photos/${user.uid}`);
                    await uploadBytes(profileRef, profilePhoto);
                    profilePhotoURL = await getDownloadURL(profileRef);
                }

                // Subir fotos de trabajos
                const workPhotosURLs = [];
                for (let i = 0; i < workPhotosFiles.length; i++) {
                    const workRef = ref(storage, `work-photos/${user.uid}/${i}`);
                    await uploadBytes(workRef, workPhotosFiles[i]);
                    const url = await getDownloadURL(workRef);
                    workPhotosURLs.push(url);
                }

                // Guardar datos del trabajador en Firestore
                await addDoc(collection(db, 'workers'), {
                    uid: user.uid,
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    location: formData.location,
                    trade: formData.trade,
                    description: formData.description,
                    profilePhoto: profilePhotoURL,
                    workPhotos: workPhotosURLs,
                    createdAt: new Date()
                });

                showMessage('¡Registro exitoso! Tu perfil ha sido creado.', 'success');
                closeModal('registerModal');
                registerForm.reset();
                loadWorkers();
                
            } catch (error) {
                console.error('Error al registrar:', error);
                showMessage('Error al registrar: ' + error.message, 'error');
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
                console.error('Error al iniciar sesión:', error);
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

// Cargar trabajadores desde Firebase
async function loadWorkers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'workers'));
        workersData = [];
        querySnapshot.forEach((doc) => {
            workersData.push({ id: doc.id, ...doc.data() });
        });
        displayWorkers(workersData);
    } catch (error) {
        console.error('Error al cargar trabajadores:', error);
        // Mostrar datos de ejemplo si no hay conexión a Firebase
        showExampleWorkers();
    }
}

// Mostrar trabajadores de ejemplo (para demostración)
function showExampleWorkers() {
    const exampleWorkers = [
        {
            id: 1,
            fullName: "Juan Pérez",
            trade: "Albañilería",
            location: "Santo Domingo, DN",
            description: "Albañil con 15 años de experiencia en construcción residencial y comercial. Especializado en mampostería y acabados.",
            phone: "809-123-4567",
            email: "juan.perez@email.com",
            profilePhoto: "https://via.placeholder.com/300x200?text=Juan+Pérez"
        },
        {
            id: 2,
            fullName: "María González",
            trade: "Peluquería",
            location: "Santiago, Santiago",
            description: "Estilista profesional con 10 años de experiencia. Especializada en cortes modernos, coloración y tratamientos capilares.",
            phone: "809-987-6543",
            email: "maria.gonzalez@email.com",
            profilePhoto: "https://via.placeholder.com/300x200?text=María+González"
        },
        {
            id: 3,
            fullName: "Carlos Rodríguez",
            trade: "Plomería",
            location: "Santo Domingo, DN",
            description: "Plomero certificado con 12 años de experiencia. Reparaciones, instalaciones y mantenimiento de sistemas hidráulicos.",
            phone: "809-555-0123",
            email: "carlos.rodriguez@email.com",
            profilePhoto: "https://via.placeholder.com/300x200?text=Carlos+Rodríguez"
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
        card.innerHTML = `
            <img src="${worker.profilePhoto || 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(worker.fullName)}" alt="${worker.fullName}" class="worker-avatar">
            <div class="worker-info">
                <div class="worker-name">${worker.fullName}</div>
                <div class="worker-trade">${worker.trade}</div>
                <div class="worker-location">${worker.location}</div>
                <div class="worker-description">${worker.description}</div>
                <div class="worker-contact">
                    <a href="tel:${worker.phone}" class="contact-btn contact-phone">Llamar</a>
                    <a href="mailto:${worker.email}" class="contact-btn contact-email">Email</a>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Función de búsqueda
window.searchWorkers = function() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categorySelect').value;

    let filteredWorkers = workersData;

    if (searchTerm) {
        filteredWorkers = filteredWorkers.filter(worker => 
            worker.fullName.toLowerCase().includes(searchTerm) ||
            worker.trade.toLowerCase().includes(searchTerm) ||
            worker.description.toLowerCase().includes(searchTerm)
        );
    }

    if (category) {
        filteredWorkers = filteredWorkers.filter(worker => worker.trade === category);
    }

    displayWorkers(filteredWorkers);
    
    // Mostrar mensaje si no hay resultados
    if (filteredWorkers.length === 0) {
        showMessage('No se encontraron profesionales con esos criterios.', 'info');
    }
};