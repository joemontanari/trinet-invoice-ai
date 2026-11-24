# Trinet Invoice AI: frontend

Aplicación web en React 19 + Vite con CSS propio y diseño responsive.

## Desarrollo

```
cp .env.example .env.local   # completar la configuración de Firebase
npm install
npm run dev                  # http://localhost:5173, con proxy de /api a http://localhost:3000
```

Para probar sin Firebase, usar `VITE_DEV_AUTH=1` en `.env.local`: la pantalla de inicio muestra un selector de usuarios de prueba y la API debe estar en modo de desarrollo. Nunca habilitar este modo en producción.

## Producción

```
npm run build                # genera dist/, que sirve el backend como archivos estáticos
```

## Estructura

- `src/auth/`: inicio de sesión con Google Identity Platform (Firebase Auth).
- `src/api.js`: cliente de la API; agrega el token en cada petición.
- `src/pages/`: pantallas (panel de facturas, carga, validación, revisión, clientes, usuarios, margen y perfil).
- `src/estilos.css`: estilos propios, sin frameworks.
