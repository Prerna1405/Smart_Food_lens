@echo off
cd /d "%~dp0backend"
python -c "import uvicorn; uvicorn.run('app:app', host='0.0.0.0', port=8000, reload=False)"
echo Backend running on http://localhost:8000/health ^&^& http://10.0.2.2:8000 for Android emulator
pause

