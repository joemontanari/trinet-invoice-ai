# Trinet Invoice AI

Sistema web que lee con IA (API de Claude) las facturas de proveedores en PDF, las somete a validación del operador y aprobación del supervisor, y genera la invoice al cliente con un margen fijo. Proyecto de título, Ingeniería en Informática (iPlacex, 2026).

> Proyecto académico. No es un sistema en operación de Trinet Global Logistic; todos los datos (clientes, proveedores, facturas, usuarios) son ficticios.

## Estructura

```
db/                       base de datos MySQL 8 (11 tablas en 3FN y 2 vistas)
  01_esquema.sql          esquema, restricciones y vistas
  02_documentos.sql       PDF de las facturas de prueba
  03_datos_prueba.sql     datos ficticios (usuarios, clientes, facturas)
docs/facturas-ejemplo/    PDF ficticios para probar la carga con IA
backend/                  API REST: Node.js 24 + Express 5
  src/config/             entorno, pool MySQL, firebase-admin
  src/routes/             22 servicios bajo /api/v1
  src/middlewares/        autenticación (Google Identity Platform) y roles
  src/controllers/        traducen HTTP a llamadas de servicio
  src/services/           reglas de negocio, extracción con Claude, PDF
  src/repositories/       SQL parametrizado
  test/                   pruebas unitarias e integración (Jest + Supertest)
frontend/                 React 19 + Vite 8 + CSS propio (responsive)
```

## Perfiles

| Perfil | Funciones |
|---|---|
| Operador | Carga facturas PDF, valida y corrige los datos extraídos, gestiona clientes |
| Supervisor | Aprueba o rechaza facturas, configura el margen, gestiona usuarios |

## Desarrollo local

Requisitos: Node.js 24 y Docker.

```bash
# 1. Base de datos
docker run -d --name tia-mysql -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=<root> -e MYSQL_DATABASE=trinet_invoice_ai \
  -e MYSQL_USER=tia_app -e MYSQL_PASSWORD=<clave> mysql:8.4
cat db/01_esquema.sql db/02_documentos.sql db/03_datos_prueba.sql | docker exec -i tia-mysql mysql -uroot -p<root>

# 2. Frontend (modo desarrollo: selector de usuarios de prueba, sin Google)
cd frontend && npm install && VITE_DEV_AUTH=1 npm run build

# 3. API (sirve también el frontend compilado)
cd ../backend && npm install
DEV_AUTH=1 DB_HOST=127.0.0.1 DB_PORT=3307 DB_USER=tia_app DB_PASSWORD=<clave> \
ANTHROPIC_API_KEY=<clave> npm start        # http://localhost:3000
```

Pruebas (recrean la base de datos desde los scripts):

```bash
cd backend
DEV_AUTH=1 DB_HOST=127.0.0.1 DB_PORT=3307 DB_USER=tia_app DB_PASSWORD=<clave> DB_ROOT_PASSWORD=<root> npm test
```

## Producción

- **Aplicación:** Render, servicio web Node. Build: `cd frontend && npm ci --include=dev && npm run build && cd ../backend && npm ci`. Start: `cd backend && npm start`.
- **Base de datos:** Aiven for MySQL (TLS). Cargar los tres scripts de `db/`.
- **Autenticación:** Google Identity Platform (Firebase Auth, correo y contraseña).

Variables de entorno de la API: `NODE_ENV=production`, `DATABASE_URL`, `DB_CA_CERT` (certificado de Aiven), `ANTHROPIC_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT` (JSON de la cuenta de servicio).
Variables de compilación del frontend: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`.

El modo `DEV_AUTH` nunca se activa con `NODE_ENV=production`.
