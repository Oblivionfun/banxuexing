# 伴学星 Codex 一键配置（Windows PowerShell）
# 用法：irm http://113.249.117.200:8000/codex-setup.ps1 | iex
$ErrorActionPreference = "Stop"

$BaseUrl = if ($env:BXX_BASE_URL) { $env:BXX_BASE_URL.TrimEnd("/") } else { "http://113.249.117.200:8000" }
$Token = $env:BXX_TOKEN
$Roots = $env:BXX_ROOTS

if (-not $Token) {
  $Token = (Read-Host "请粘贴伴学星令牌").Trim()
}
if (-not $Token -or $Token.Length -lt 32) {
  Write-Error "令牌不正确"
  return
}

if (-not $Roots) {
  $defaultRoots = "$env:USERPROFILE\Desktop;$env:USERPROFILE\Downloads"
  $inputRoots = (Read-Host "允许 AI 读取的目录，回车用 $defaultRoots").Trim()
  $Roots = if ($inputRoots) { $inputRoots } else { $defaultRoots }
}

# Node 18+
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "没有 Node，正在用 winget 安装…"
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    $env:Path = "$env:ProgramFiles\nodejs;$env:Path"
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  }
  if (-not $nodeCommand) {
    Write-Error "需要 Node 18+，请先安装 https://nodejs.org 后重试"
    return
  }
}
& node -e "process.exit(Number(process.versions.node.split('.')[0]) < 18 ? 1 : 0)"
if ($LASTEXITCODE -ne 0) {
  Write-Error "需要 Node 18+，请先升级 Node"
  return
}
$nodePath = (Get-Command node).Source

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Error "没有找到 codex 命令，请先安装 Codex"
  return
}

$bundleDir = Join-Path $env:LOCALAPPDATA "banxuexing"
$bundle = Join-Path $bundleDir "banxuexing-mcp.mjs"
New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null
Write-Host "下载伴学星 MCP…"
Invoke-WebRequest -Uri "$BaseUrl/banxuexing-mcp.mjs" -OutFile $bundle -UseBasicParsing
if ((Get-Item $bundle).Length -lt 100000) {
  Write-Error "下载的 MCP 文件不完整，请稍后重试"
  return
}

$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE ".codex" }
$config = Join-Path $codexHome "config.toml"
New-Item -ItemType Directory -Force -Path $codexHome | Out-Null
if (Test-Path $config) {
  Copy-Item $config "$config.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
}

# 删掉旧的 banxuexing 段（含 .env 子表）
$lines = if (Test-Path $config) { Get-Content -Path $config } else { @() }
$out = New-Object System.Collections.Generic.List[string]
$skip = $false
foreach ($line in $lines) {
  if ($line -match '^\[mcp_servers\.banxuexing(\.[^\]]+)?\]\s*$') {
    $skip = $true
    continue
  }
  if ($skip -and $line -match '^\[') { $skip = $false }
  if (-not $skip) { $out.Add($line) }
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($config, (($out -join "`r`n") + "`r`n"), $utf8)

$block = @"

[mcp_servers.banxuexing]
command = '$nodePath'
args = ['$bundle']
startup_timeout_sec = 30.0
tool_timeout_sec = 300.0

[mcp_servers.banxuexing.env]
BXX_BASE_URL = "$BaseUrl"
BXX_MCP_TOKEN = "$Token"
BXX_UPLOAD_ROOTS = '$Roots'
"@
[System.IO.File]::AppendAllText($config, $block, $utf8)

$agents = Join-Path $codexHome "AGENTS.md"
$rule = @"
<!-- BEGIN banxuexing -->
当用户拖入文件或给出本地路径并要求上传时，使用 banxuexing MCP：先用 scan_folder 确认文件，再用 upload_files。科目或资料册不明确时，先调用 list_subjects / list_material_sets 询问，不要猜。上传前复述目标；不要删除任何内容。
<!-- END banxuexing -->
"@
if (-not (Test-Path $agents) -or -not ((Get-Content -Raw $agents) -match "BEGIN banxuexing")) {
  [System.IO.File]::AppendAllText($agents, "`r`n$rule`r`n", $utf8)
}

Write-Host "验证连接…"
try {
  $result = Invoke-RestMethod -Uri "$BaseUrl/api/mcp/context" -Headers @{ Authorization = "Bearer $Token" } -TimeoutSec 15
  Write-Host "连接成功：$($result.data.student.name)，$($result.data.subjects.Count) 个科目"
} catch {
  Write-Error "配置已写入，但连接失败。请检查网络或令牌后重试。"
  return
}

Write-Host ""
Write-Host "配置完成。新开一个 Codex 会话，把文件拖进去说："
Write-Host "  帮我上传到数学课本"
Write-Host "（科目或资料册没说清楚时，Codex 会先问你。）"
