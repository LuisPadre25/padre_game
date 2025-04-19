@echo off
echo Instalando Warcraft P2P Launcher...
echo.

REM Comprobar si Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js no está instalado.
    echo Por favor, instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Instalar las dependencias
echo Instalando dependencias...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: No se pudieron instalar las dependencias.
    echo.
    pause
    exit /b 1
)

echo.
echo Instalación completada correctamente.
echo.
echo Para iniciar la aplicación, ejecuta:
echo npm start
echo.
echo O puedes ejecutar el archivo "iniciar.bat"
echo.

REM Crear archivo iniciar.bat
echo @echo off > iniciar.bat
echo echo Iniciando Warcraft P2P Launcher... >> iniciar.bat
echo call npm start >> iniciar.bat
echo pause >> iniciar.bat

echo ¿Deseas iniciar la aplicación ahora? (S/N)
set /p iniciar=

if /i "%iniciar%"=="S" (
    call npm start
)

pause 