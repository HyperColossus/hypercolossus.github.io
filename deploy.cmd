@echo off
rem Puts HyperColossus online: the web proxy at proxy.hypercoloss.us and the site on Cloudflare Pages.
rem Double-click this file (or run deploy.cmd in a terminal). Run it again any time to publish updates.
setlocal
cd /d "%~dp0"
set "WRANGLER=%~dp0proxy\node_modules\.bin\wrangler.cmd"

echo.
echo === 1/5  Installing tools ===
call npm install || goto :fail
call npm install --prefix proxy || goto :fail

echo.
echo === 2/5  Cloudflare login ===
call "%WRANGLER%" whoami 2>&1 | findstr /i /c:"not authenticated" >nul
if not errorlevel 1 (
  echo A browser window will open. Log in to Cloudflare and click Allow, then come back here.
  call "%WRANGLER%" login || goto :fail
)

echo.
echo === 3/5  Deploying the web proxy to proxy.hypercoloss.us ===
pushd proxy
call "%WRANGLER%" deploy
if errorlevel 1 (
  popd
  echo.
  echo The proxy did not deploy. If the message mentions the domain or zone, hypercoloss.us is not
  echo active on Cloudflare yet: wait for Cloudflare's "active" email and run this again.
  goto :fail
)

echo.
echo === 4/5  Web search key (optional) ===
set "ADDKEY="
set /p ADDKEY=Add your Tavily search key now? Type y and press Enter, or just press Enter to skip: 
if /i "%ADDKEY%"=="y" (
  echo Paste the key ^(starts with tvly-^) when asked, then press Enter.
  call "%WRANGLER%" secret put TAVILY_API_KEY
)
popd

echo.
echo === 5/5  Building the site and deploying the combined Worker ===
call npm run build || goto :fail
call "%WRANGLER%" deploy --config wrangler.site.jsonc || goto :fail

echo.
echo ============================================================
echo  Done! The site is deployed to Cloudflare Workers.
echo  Be sure to map hypercoloss.us and www.hypercoloss.us to the Worker
echo  and remove the old Pages custom domains.
echo ============================================================
echo.
pause
exit /b 0

:fail
echo.
echo Something went wrong. Copy the messages above and send them to Claude.
pause
exit /b 1
