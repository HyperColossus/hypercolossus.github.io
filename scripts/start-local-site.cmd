@echo off
rem Builds the site and serves it locally at http://127.0.0.1:8787 using your Google Sheet.
rem Leave this window open while browsing; close it to stop the server.
cd /d "%~dp0.."
call npm run build || goto fail
call npx wrangler dev --config wrangler.site.jsonc --env sheet_preview --local --port 8787
exit /b 0
:fail
echo Build failed.
pause
exit /b 1
