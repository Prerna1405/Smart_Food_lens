@echo off
cd /d "c:\Users\ahire\ns - Copy\backend"
python -c "import uvicorn; uvicorn.run('app:app', host='127.0.0.1', port=8000, reload=False)"
