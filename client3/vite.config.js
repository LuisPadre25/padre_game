import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Añadido para rutas relativas en producción
  plugins: [react()],
  server: {
    port: 5173, // Puerto específico para desarrollo
    strictPort: true, // Forzar el uso de este puerto
    hmr: {
      overlay: true, // Mostrar errores en overlay
      protocol: 'ws',
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/chat': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chat/, '/src/chat.html')
      },
      '/create-game': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/create-game/, '/src/create-game.html')
      },
      '/waiting-room': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/waiting-room/, '/src/waiting-room.html')
      },
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Alias para importaciones
    },
  },
  build: {
    outDir: 'dist', // Directorio de salida
    emptyOutDir: true, // Limpiar directorio antes de construir
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        chat: path.resolve(__dirname, 'src/chat.html'),
        waitingRoom: path.resolve(__dirname, 'src/waiting-room.html'),
        createGame: path.resolve(__dirname, 'src/create-game.html'),
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  // Asegurarse de que los archivos HTML se sirvan correctamente
  publicDir: 'public',
  // Configuración específica para el desarrollo
  preview: {
    port: 5173,
    strictPort: true
  }
})
