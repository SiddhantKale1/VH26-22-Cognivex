@echo off
echo Starting RAG Backend and Frontend services...
start "RAG Backend API" cmd /k "cd /d ""%~dp0backend"" && call .\venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
start "RAG Frontend UI" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
echo ========================================================
echo Backend will be available at:  http://localhost:8000
echo API Documentation:             http://localhost:8000/docs
echo Frontend will be available at: http://localhost:5173
echo ========================================================
