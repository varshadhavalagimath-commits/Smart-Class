@echo off
echo ========================================================
echo   Launching Smart Classroom Energy Management Agent
echo ========================================================
echo Starting Backend Server on http://localhost:5000...
start cmd /k "cd backend && python run.py"

timeout /t 3 /nobreak >nul

echo Starting Frontend Dev Server on http://localhost:5173...
start cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo System launched!
echo Backend:  http://localhost:5000 (Docs: http://localhost:5000/docs)
echo Frontend: http://localhost:5173
echo ========================================================
