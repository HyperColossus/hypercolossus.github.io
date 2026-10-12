@echo off
rem Refresh the bundled Riftbound catalog from the local Docker database.
cd /d "%~dp0.."
call npm run db:up || goto fail
rem Load the latest RiftHunt catalog into the local database (keeps ownership and prices).
call npm run catalog:import || goto fail
call npm run catalog:snapshot || goto fail
call npm test || goto fail
git add -A server/riftbound/catalog-snapshot.json scripts
git commit -m "Refresh Riftbound catalog snapshot from local database"
git push
echo.
echo Done. Catalog refreshed, tested, committed and pushed.
pause
exit /b 0
:fail
echo.
echo Something failed above. Nothing was committed.
pause
exit /b 1
