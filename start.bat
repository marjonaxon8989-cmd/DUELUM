@echo off
REM Starts a local web server on http://localhost:8000 with whatever is installed.
cd /d "%~dp0"
set PORT=8000
if not "%1"=="" set PORT=%1
echo 1v1 Duel -^> http://localhost:%PORT%   (Ctrl+C to stop)
where py >nul 2>nul && (py -m http.server %PORT% & goto :eof)
where python >nul 2>nul && (python -m http.server %PORT% & goto :eof)
where npx >nul 2>nul && (npx --yes serve -l %PORT% . & goto :eof)
where php >nul 2>nul && (php -S localhost:%PORT% & goto :eof)
echo Python, Node yoki PHP topilmadi. index.html faylini brauzerda ochishingiz mumkin.
pause
