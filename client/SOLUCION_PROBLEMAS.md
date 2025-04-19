# Solución de Problemas Comunes

## Errores de Media Foundation en Windows N/KN

Si al iniciar la aplicación aparece un mensaje de error como:

```
Failed to start Media Foundation, accelerated media functionality may be disabled. 
Could not load mf.dll.
```

Esto ocurre porque estás usando una versión de Windows N o KN que no incluye el paquete de características multimedia de Windows. Este error no afecta la funcionalidad de conexión P2P para Warcraft.

**Solución opcional:**

1. Descargar e instalar el "Media Feature Pack" para tu versión de Windows desde:
   - Windows 10/11: https://support.microsoft.com/es-es/topic/media-feature-pack-for-windows-10-n-may-2020-ebbdf559-b84c-0fc2-bd51-e23c9f6a4439

## Problemas de Conexión P2P

Si tienes problemas para conectarte con otros jugadores:

1. **Verifica que ambos estén conectados al mismo servidor**
   - La URL del servidor debe ser la misma en ambos clientes

2. **Problemas con firewall o NAT**
   - Es posible que necesites abrir puertos en tu router o firewall
   - Puertos recomendados: 19302 (para STUN) y 3000 (para el servidor de señalización)

3. **Errores de ICE Candidates**
   - Si ves errores relacionados con ICE Candidates, intenta lo siguiente:
     - Reinicia la aplicación
     - Asegúrate de que tu conexión a internet es estable
     - Intenta crear una nueva partida en lugar de unirte a una existente

## Problemas al Iniciar Warcraft

1. **Verifica la ruta del ejecutable**
   - Asegúrate de haber seleccionado correctamente el archivo Warcraft III.exe

2. **Permisos de administrador**
   - Prueba ejecutar la aplicación como administrador

3. **Compatibilidad**
   - Configura el modo de compatibilidad de Warcraft III para Windows 7/8

## Problemas Comunes del Chat

1. **No se puede enviar mensajes**
   - Asegúrate de estar conectado con al menos otro jugador
   - La conexión P2P debe estar establecida correctamente

2. **No se reciben mensajes**
   - Verifica que la conexión P2P esté activa
   - Comprueba si hay mensajes de error en la consola

## Contacto y Soporte

Si continúas teniendo problemas, puedes contactar al soporte técnico a través de:

- Discord: [Enlace a Discord]
- Email: [Email de soporte] 