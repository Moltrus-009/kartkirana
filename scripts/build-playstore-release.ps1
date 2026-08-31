param(
    [switch]$UseExistingEnvironment
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$deliveryDirectory = Join-Path $repositoryRoot 'FINAL APKAAB\2026-08-31-PLAYSTORE-API36'
$zipPath = Join-Path $repositoryRoot 'FINAL APKAAB\Kart-Kirana-All-Apps-2026-08-31-PLAYSTORE-API36.zip'
$localAppData = [Environment]::GetFolderPath('LocalApplicationData')
$credentialPath = Join-Path $localAppData 'KartKirana\release-signing.credential.xml'

$apps = @(
    @{
        Name = 'Customer'
        Version = '1.4.8'
        AndroidDirectory = Join-Path $repositoryRoot 'acustoomer\android'
    },
    @{
        Name = 'Partner'
        Version = '1.3.1'
        AndroidDirectory = Join-Path $repositoryRoot 'shopkeeper pov\android'
    },
    @{
        Name = 'Rider'
        Version = '1.4.1'
        AndroidDirectory = Join-Path $repositoryRoot 'delivery boy app\android'
    }
)

function ConvertTo-TemporaryPlainText {
    param([Security.SecureString]$SecureValue)

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

try {
    if (-not $UseExistingEnvironment) {
        if (Test-Path -LiteralPath $credentialPath) {
            $savedCredential = Import-Clixml -LiteralPath $credentialPath
            $storePassword = $savedCredential.Password
            $keyPassword = $savedCredential.Password
        }
        else {
            $storePassword = Read-Host 'Enter the Kart Kirana keystore password' -AsSecureString
            $keyPassword = Read-Host 'Enter the Kart Kirana key password' -AsSecureString
        }
        $env:KARTKIRANA_STORE_PASSWORD = ConvertTo-TemporaryPlainText $storePassword
        $env:KARTKIRANA_KEY_PASSWORD = ConvertTo-TemporaryPlainText $keyPassword
    }

    if ([string]::IsNullOrWhiteSpace($env:KARTKIRANA_STORE_PASSWORD) -or
        [string]::IsNullOrWhiteSpace($env:KARTKIRANA_KEY_PASSWORD)) {
        throw 'Both release-signing passwords are required.'
    }

    New-Item -ItemType Directory -Path $deliveryDirectory -Force | Out-Null

    foreach ($app in $apps) {
        Write-Host "Building $($app.Name) $($app.Version) release..."
        $gradleWrapper = Join-Path $app.AndroidDirectory 'gradlew.bat'
        Push-Location $app.AndroidDirectory
        try {
            & $gradleWrapper --no-daemon clean assembleRelease bundleRelease
            if ($LASTEXITCODE -ne 0) {
                throw "$($app.Name) release build failed with exit code $LASTEXITCODE."
            }
        }
        finally {
            Pop-Location
        }

        $apkSource = Join-Path $app.AndroidDirectory 'app\build\outputs\apk\release\app-release.apk'
        $aabSource = Join-Path $app.AndroidDirectory 'app\build\outputs\bundle\release\app-release.aab'
        $apkDestination = Join-Path $deliveryDirectory "Kart-Kirana-$($app.Name)-v$($app.Version)-API36-release.apk"
        $aabDestination = Join-Path $deliveryDirectory "Kart-Kirana-$($app.Name)-v$($app.Version)-API36-release.aab"

        Copy-Item -LiteralPath $apkSource -Destination $apkDestination -Force
        Copy-Item -LiteralPath $aabSource -Destination $aabDestination -Force
    }

    Compress-Archive -Path (Join-Path $deliveryDirectory '*') -DestinationPath $zipPath -Force
    Write-Host "Release files created in: $deliveryDirectory"
    Write-Host "Combined archive created at: $zipPath"
}
finally {
    $env:KARTKIRANA_STORE_PASSWORD = $null
    $env:KARTKIRANA_KEY_PASSWORD = $null
    $storePassword = $null
    $keyPassword = $null
    $savedCredential = $null
    $localAppData = $null
}
