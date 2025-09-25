# === Configuration ===
$RemoteUser = "root"           # SSH username
$RemoteHost = "147.182.216.253"          # Server IP or domain
$RemotePath = "/var/www/yairl.com"       # Path on the server
$AppName = "yairlCom"                   # PM2 process name

# Generate date string: YYYY-MM-DD
$DateString = Get-Date -Format "yyyy-MM-dd"
$ZipName = "deploy-$DateString.zip"
$LocalZipPath = ".\$ZipName"

# Check for --no flag
$SkipBuild = $args -contains "--no"

if (-not $SkipBuild) {
    Write-Host "🚀 Running PNPM install and build..."
    pnpm install
    pnpm build
} else {
    Write-Host "⏩ Skipping install/build due to --no flag"
}


Write-Host "📦 Creating ZIP package: $ZipName"

# Remove old zip if exists
if (Test-Path $LocalZipPath) {
    Remove-Item $LocalZipPath
}

# Create ZIP with necessary files
Compress-Archive -Path `
    ".next/standalone/*", `
    "public/*", `
    "package.json", `
    "pnpm-lock.yaml" `
    -DestinationPath $LocalZipPath

Write-Host "🚚 Copying ZIP to server..."
scp $LocalZipPath "${RemoteUser}@${RemoteHost}:${RemotePath}/"

Write-Host "🧩 Extracting on server and restarting app..."

$sshCommand = @"
cd $RemotePath
unzip -o $ZipName
rm $ZipName
pnpm install --prod
pm2 restart $AppName || pm2 start pnpm --name "$AppName" -- start
pm2 save
"@

ssh "$RemoteUser@$RemoteHost" $sshCommand

Write-Host "✅ Deployment complete!"
