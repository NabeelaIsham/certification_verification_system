param(
  [string]$CredentialFile = (Join-Path $PSScriptRoot '../../.local-secrets/mikenium-superadmin.credential.xml')
)
$ErrorActionPreference = 'Stop'
if (!$env:ATLAS_ADMIN_MONGODB_URI -or !$env:ATLAS_ADMIN_DATABASE) {
  throw 'Set ATLAS_ADMIN_MONGODB_URI and ATLAS_ADMIN_DATABASE through your protected environment first.'
}
try { $connection = [Uri]$env:ATLAS_ADMIN_MONGODB_URI } catch { throw 'Invalid Atlas connection configuration.' }
if ($connection.Scheme -ne 'mongodb+srv' -or !$connection.Host.EndsWith('.mongodb.net') -or
    $connection.AbsolutePath.TrimStart('/') -cne $env:ATLAS_ADMIN_DATABASE -or
    $env:ATLAS_ADMIN_DATABASE -notmatch '^[a-zA-Z0-9_-]+$' -or
    $env:ATLAS_ADMIN_DATABASE -in @('admin', 'local', 'config')) {
  throw 'Use an Atlas SRV URI whose explicit application database matches ATLAS_ADMIN_DATABASE.'
}
$credential = Import-Clixml -LiteralPath $CredentialFile
if ($credential -isnot [System.Management.Automation.PSCredential] -or $credential.UserName -ne 'info@mikenium.com') {
  throw 'The protected credential must belong to info@mikenium.com.'
}
$names = @('MONGODB_URI', 'SUPERADMIN_EMAIL', 'SUPERADMIN_PASSWORD', 'SUPERADMIN_NAME')
$original = @{}
foreach ($name in $names) { $original[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  $env:MONGODB_URI = $env:ATLAS_ADMIN_MONGODB_URI
  $env:SUPERADMIN_EMAIL = $credential.UserName
  $env:SUPERADMIN_PASSWORD = $credential.GetNetworkCredential().Password
  $env:SUPERADMIN_NAME = 'Mikenium Administrator'
  & node (Join-Path $PSScriptRoot 'setupSuperAdmin.js')
  if ($LASTEXITCODE -ne 0) { throw 'Atlas administrator setup did not complete.' }
} finally {
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $original[$name], 'Process') }
}
