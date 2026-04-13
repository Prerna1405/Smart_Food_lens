@echo off
cd /d "%~dp0backend"
python -m uvicorn app_fixed:app --host 0.0.0.0 --port 8000 --reload
echo Backend running on http://localhost:8000/health ^&^& http://10.0.2.2:8000 for Android emulator ^(using app_fixed.py^)
pause

