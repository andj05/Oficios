# Oficios - Plataforma de Servicios Profesionales

## 📋 Descripción
**Oficios** es una plataforma web donde personas con habilidades y destrezas en diversos trabajos pueden registrarse gratuitamente, crear un perfil sencillo y mostrar sus trabajos realizados a través de fotos. Esto permite que otros usuarios puedan encontrarlos fácilmente cuando necesiten contratar un servicio.

## 🌟 Características principales

### Para Profesionales:
- ✅ Registro gratuito y sencillo
- ✅ Creación de perfil personalizado
- ✅ Subida de foto de perfil
- ✅ Galería de trabajos realizados
- ✅ Información de contacto visible

### Para Clientes:
- 🔍 Búsqueda intuitiva por oficio
- 📍 Filtros por ubicación y categoría
- 📱 Contacto directo (teléfono/email)
- 👀 Visualización de portafolios

## 🔧 Tecnologías utilizadas
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Hosting**: GitHub Pages
- **Responsive**: Mobile-first design

## 🚀 Instalación y configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/oficios.git
cd oficios
```

### 2. Configurar Firebase
1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitar Authentication (Email/Password)
3. Crear base de datos Firestore
4. Configurar Storage para imágenes
5. Actualizar las credenciales en `script.js`

### 3. Configurar reglas de seguridad
- Aplicar las reglas de Firestore y Storage incluidas en el proyecto

### 4. Desplegar en GitHub Pages
1. Subir archivos al repositorio
2. Ir a Settings > Pages
3. Seleccionar branch main como source
4. Tu sitio estará disponible en: `https://tu-usuario.github.io/oficios`

## 📂 Estructura del proyecto
```
oficios/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # Lógica JavaScript + Firebase
├── README.md           # Documentación
└── firebase-rules.txt  # Reglas de seguridad
```

## 🎯 Categorías de oficios disponibles
- Albañilería
- Plomería  
- Electricidad
- Carpintería
- Costura
- Peluquería
- Jardinería
- Soldadura
- Pintura
- Mecánica
- Limpieza
- Cocina

## 🔒 Seguridad
- Autenticación con Firebase Auth
- Reglas de seguridad en Firestore
- Validación de datos en frontend
- Protección de rutas sensibles

## 📱 Características responsive
- Diseño adaptable a móviles y tablets
- Navegación touch-friendly
- Imágenes optimizadas
- Formularios móvil-first

## 🌐 Demo
**URL de demostración**: [https://tu-usuario.github.io/oficios](https://tu-usuario.github.io/oficios)

## 🤝 Contribuir
1. Fork el repositorio
2. Crear una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit los cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 📞 Contacto
- **Desarrollador**: Tu Nombre
- **Email**: tu-email@ejemplo.com
- **LinkedIn**: [tu-perfil-linkedin](https://linkedin.com/in/tu-perfil)

## 📄 Licencia
Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---
⭐ **¡Dale una estrella al repositorio si te gustó el proyecto!** ⭐
