@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "NODE_EXE="
for /f "delims=" %%I in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
if not defined NODE_EXE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not defined NODE_EXE (
  echo Node.js wurde nicht gefunden.
  echo Bitte Node.js LTS von https://nodejs.org/ installieren und diesen Starter danach erneut oeffnen.
  pause
  exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

set "PNPM_EXE="
set "PNPM_PREFIX="
for /f "delims=" %%I in ('where pnpm 2^>nul') do if not defined PNPM_EXE set "PNPM_EXE=%%I"

if not defined PNPM_EXE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" set "PNPM_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if not defined PNPM_EXE (
  for /f "delims=" %%I in ('where corepack.cmd 2^>nul') do if not defined PNPM_EXE set "PNPM_EXE=%%I"
  if defined PNPM_EXE set "PNPM_PREFIX=pnpm"
)

if /i "%~1"=="--check" (
  echo Node: %NODE_EXE%
  if exist "node_modules\.bin\vite.cmd" (
    echo Vite: %CD%\node_modules\.bin\vite.cmd
  ) else (
    echo Vite: noch nicht installiert
  )
  if defined PNPM_EXE (
    echo Paketmanager: %PNPM_EXE% %PNPM_PREFIX%
  ) else (
    echo Paketmanager: nicht gefunden
  )
  exit /b 0
)

if not exist "node_modules\.bin\vite.cmd" (
  if not defined PNPM_EXE (
    echo Die Projektabhaengigkeiten fehlen und pnpm/Corepack wurde nicht gefunden.
    echo Bitte Node.js LTS von https://nodejs.org/ installieren und Corepack aktivieren.
    pause
    exit /b 1
  )

  echo Installiere Projektabhaengigkeiten ...
  call "%PNPM_EXE%" %PNPM_PREFIX% install --frozen-lockfile
  if errorlevel 1 (
    echo Installation fehlgeschlagen. Bitte Internetverbindung pruefen und erneut versuchen.
    pause
    exit /b 1
  )
)

echo Starte UKD Grow Masterplan unter http://127.0.0.1:4173 ...
echo Dieses Fenster offen lassen. Strg+C beendet den Server.
call "node_modules\.bin\vite.cmd" --host 127.0.0.1 --port 4173 --strictPort --open
set "UKD_EXIT=%ERRORLEVEL%"

if not "%UKD_EXIT%"=="0" (
  echo.
  echo Der lokale Server wurde mit Fehlercode %UKD_EXIT% beendet.
  echo Falls Port 4173 belegt ist, das andere UKD-Fenster schliessen und erneut starten.
  pause
)

exit /b %UKD_EXIT%
