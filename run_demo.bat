@echo off
echo ===================================================================
echo Launching CampusMove AI Full Stack (Backend + Frontend)...
echo ===================================================================
start "CampusMove AI Backend" cmd /c "start_backend.bat"
timeout /t 3 /nobreak >nul
start "CampusMove AI Frontend" cmd /c "start_frontend.bat"
timeout /t 3 /nobreak >nul
start http://localhost:3000
echo CampusMove AI is running!
echo Frontend: http://localhost:3000
echo Backend API Docs: http://localhost:8000/docs
pause
