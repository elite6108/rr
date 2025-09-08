# Navigate to project directory
Set-Location -Path "C:\Users\gordo\Downloads\project-bolt-rockrevelations\project"

# Check git status
Write-Host "Checking git status..." -ForegroundColor Yellow
git status

# Check if we have commits
Write-Host "`nChecking git log..." -ForegroundColor Yellow
git log --oneline -5

# Check remotes
Write-Host "`nChecking git remotes..." -ForegroundColor Yellow
git remote -v

# Try to push to main branch
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

# If main doesn't exist, try master
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nTrying master branch..." -ForegroundColor Yellow
    git push -u origin master
}

# Show final status
Write-Host "`nFinal git status:" -ForegroundColor Green
git status
