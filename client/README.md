# Warcraft P2P Launcher

Cliente Electron para jugar Warcraft III utilizando conexiones P2P.

## Características

- Interfaz moderna para conectarse al servidor de señalización P2P
- Lobby para buscar y crear partidas
- Comunicación P2P mediante WebRTC
- Chat integrado entre jugadores
- Lanzamiento directo de Warcraft III desde la aplicación

## Requisitos

- Node.js 16 o superior
- Warcraft III instalado en el sistema
- Conexión a Internet para conectarse al servidor de señalización

## Instalación

1. Instalar dependencias:
   ```
   npm install
   ```

2. Iniciar la aplicación en modo desarrollo:
   ```
   npm run dev
   ```

3. Construir la aplicación para distribución:
   ```
   npm run build
   ```

## Uso

1. Inicia la aplicación cliente:
   ```
   npm start
   ```

2. Por defecto, la aplicación está configurada para conectarse al servidor en:
   ```
   http://45.77.113.226:3000
   ```

3. Selecciona la ubicación del ejecutable de Warcraft III en tu sistema

4. Conéctate al servidor y busca partidas o crea una nueva

5. Una vez que otro jugador se una a tu partida, podrás iniciar Warcraft III

## Servidor

El servidor está alojado en:
- IP: 45.77.113.226
- Puerto: 3000
- Ubicación: Miami
- Características: 1 vCPU, 512MB RAM, 10GB SSD

## Desarrollo

Este proyecto utiliza:
- Electron para la interfaz de escritorio
- Socket.IO para la comunicación con el servidor de señalización
- WebRTC para la comunicación P2P entre clientes
- Bootstrap para los estilos de la interfaz

## Estructura del proyecto

- `main.js` - Proceso principal de Electron
- `preload.js` - Script de precarga para exponer APIs al renderer
- `index.html` - Interfaz de usuario
- `renderer.js` - Lógica del cliente
- `assets/` - Imágenes y recursos 