# Run the AI-image detector evaluation.
#   .\eval.ps1                                   # all models
#   .\eval.ps1 Smogy/SMOGY-Ai-images-detector    # one or more specific models
#   .\eval.ps1 -Fetch                            # rebuild the test set first, then evaluate
param(
    [switch]$Fetch,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Models
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Error "No .venv found. Set it up first (see README.md)."
}

if ($Fetch -or -not (Test-Path "manifest.csv")) {
    Write-Host "Building test set..."
    & $python -u fetch_data.py
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# Every image in the manifest must exist, or the run fails partway through
$missing = Import-Csv manifest.csv | Where-Object { -not (Test-Path (Join-Path "data" $_.path)) }
if ($missing) {
    Write-Error "$(@($missing).Count) images listed in manifest.csv are missing from data/. Run .\eval.ps1 -Fetch"
}

# Start from a clean results file so old runs don't mix in
Remove-Item results.json -ErrorAction SilentlyContinue
& $python -u run_eval.py @Models
exit $LASTEXITCODE
