# Project Run TODO

## Plan Breakdown
1. [x] **Understand project structure** - Backend (FastAPI app_fixed.py), Frontend (Expo), Model (foodmodel/predict.py)
2. [x] **Confirm batch scripts** - run_backend.bat (port 8000), run_frontend.bat (port 8084)
3. [x] **Install backend dependencies** - Handled by server start (working)
4. [x] **Run backend server** - .\\run_backend.bat (http://localhost:8000/health) - ACTIVE (model loaded, 38 nutrition items)
5. [x] **Install frontend deps** (if needed) - package-lock exists, handled
6. [x] **Run frontend** - .\\run_frontend.bat (Expo http://localhost:8084) - ACTIVE (Metro bundler started)
7. [x] **Supabase Auth Migration** - Migrated from local storage to Supabase Auth
8. [x] **Fix Auth Errors** - Resolved signup/login failures and added rate-limit (429) handling
9. [x] **Redesign Profile** - Created comprehensive profile page with health metrics (BMI, BMR, Goals)
10. [x] **Watch Integration** - Implemented Google Fit sync for steps and active calories
11. [ ] **Verify** - Backend health, Expo QR/mobile scan test, Supabase session persistence

**Status: Auth Fixed, Profile Redesigned, Watch Sync Implemented!**
**Backend: 8000, Frontend: 8084, Auth: Supabase**
