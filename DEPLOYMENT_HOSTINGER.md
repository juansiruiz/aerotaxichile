# Manual de Despliegue - AeroTaxi Chile en Hostinger

Este documento sirve como registro oficial de los pasos y configuraciones necesarias para desplegar correctamente la API y el Frontend (Web) de AeroTaxi Chile en los servidores Node.js compartidos de Hostinger, evitando errores 403, 503 o bloqueos de auditoría de seguridad.

## 1. Proceso de Construcción Local (Build)

Para preparar los archivos de producción, siempre debes ejecutar el script oficial de creación de ZIPs. Este script resuelve automáticamente:
- Limpieza de dependencias tipo `workspace:*`.
- Generación de los archivos `.env` y `.env.local` apuntando a la IP pública del servidor.
- Inyección del archivo `server.js` nativo para Phusion Passenger de Hostinger.

### Comando de construcción
Desde la raíz del proyecto (`c:\Desarrollo\aerotaxichile`), ejecuta:

```powershell
pnpm install; pnpm run build; node create-zip.mjs
```

Esto generará dos archivos listos en la carpeta `zips\`:
- `aerotaxi-api.zip`
- `aerotaxi-web.zip`

---

## 2. Configuración en el Panel de Hostinger

Hostinger utiliza un gestor nativo de Node.js (Phusion Passenger / LiteSpeed). Para que funcione correctamente sin arrojar Error 403 o quedarse colgado, sigue estas reglas exactas en la sección **Ajustes y reimplementación**:

### Para el Frontend (Web)
* Sube el archivo `aerotaxi-web.zip` a través de la interfaz de Hostinger.
* Configura los campos exactamente así:
  * **Preajuste del marco:** `Other` (NO seleccionar Next.js, esto evita scripts incompatibles).
  * **Versión del nodo:** `@ 20x`
  * **Comando de compilación:** *(Déjalo en blanco o con un simple `-`)*
  * **Gestor de paquetes:** `npm`
  * **Directorio de salida:** *(Déjalo en blanco)*
  * **Archivo de entrada:** `server.js`

### Para la API
* Sube el archivo `aerotaxi-api.zip` a su respectivo subdominio o directorio.
* Configura los campos exactamente así:
  * **Preajuste del marco:** `Other`
  * **Versión del nodo:** `@ 20x`
  * **Comando de compilación:** *(Déjalo en blanco o con un simple `-`)*
  * **Gestor de paquetes:** `npm`
  * **Directorio de salida:** *(Déjalo en blanco)*
  * **Archivo de entrada:** `dist/index.js` (o el entry file equivalente de la API Hono).

> **Aviso Crítico:** Es obligatorio hacer clic en el botón **"Guardar y reimplementar"** cada vez que actualices la configuración, de lo contrario Hostinger no escribirá el archivo `.htaccess` oculto requerido para que el Proxy Inverso funcione.

---

## 3. Resolución de Errores Comunes

### Error 403 Forbidden
**Causa:** Hostinger (LiteSpeed) no encuentra el archivo de entrada especificado o la App de Node.js no ha sido creada formalmente en el panel.
**Solución:** Asegúrate de que escribiste correctamente `server.js` en el campo "Archivo de entrada" y guardaste los cambios en el panel. El script `create-zip.mjs` ya se encarga de incluir `server.js` en la raíz del ZIP.

### Error 503 Service Unavailable / EADDRINUSE
**Causa:** El puerto interno predeterminado (por ejemplo, el 3000) ya está siendo ocupado por otro usuario en el servidor compartido de Hostinger.
**Solución:** No es necesario fijar un puerto manual. Nuestro `server.js` está diseñado para escuchar la variable `process.env.PORT` que Phusion Passenger inyecta automáticamente. Passenger asignará un puerto de socket interno y libre, resolviendo las colisiones de red.

### Error de despliegue por "Auditoría de Seguridad" (Deployment Failed)
**Causa:** Hostinger escanea automáticamente el archivo `package.json` durante el despliegue. Si la versión de un framework (como Next.js) tiene un aviso de seguridad tipo CVE crítico, Hostinger bloqueará la subida.
**Solución:** Actualiza la librería localmente antes de compilar. Ejemplo: `pnpm update next@latest -w`, luego vuelve a compilar y generar los ZIPs. (AeroTaxi Web actualmente corre en Next.js ^16.2.x para evadir bloqueos).
