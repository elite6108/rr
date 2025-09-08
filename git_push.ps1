# Change to the project directory
Set-Location -Path $PSScriptRoot

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

# Check if .git directory exists
if (Test-Path ".git") {
    Write-Host "Git repository already initialized" -ForegroundColor Green
} else {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
}

# Add all files
Write-Host "`nAdding all files to git..." -ForegroundColor Yellow
git add --all
git add .

# Check status
Write-Host "`nGit status:" -ForegroundColor Yellow
git status --short

# Commit changes
Write-Host "`nCommitting changes..." -ForegroundColor Yellow
git commit -m "Fix QR scanner to default to back camera on mobile devices" -a

# Add remote if not exists
$remotes = git remote
if ($remotes -notcontains "origin") {
    Write-Host "`nAdding remote origin..." -ForegroundColor Yellow
    git remote add origin https://github.com/elite6108/rr.git
} else {
    Write-Host "`nRemote origin already exists" -ForegroundColor Green
}

# Show remotes
Write-Host "`nGit remotes:" -ForegroundColor Yellow
git remote -v

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

# If main branch doesn't exist, try master
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nMain branch push failed, trying master..." -ForegroundColor Yellow
    git push -u origin master
}

Write-Host "`nOperation completed!" -ForegroundColor Green
