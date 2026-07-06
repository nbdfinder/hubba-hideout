$root = "c:\Users\Tyler Edic\Documents\Hubba"
$port = 8741
$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".svg"  = "image/svg+xml"
}

$rootResolved = (Resolve-Path $root).Path

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Output "Serving $root on http://localhost:$port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = $ctx.Request.Url.LocalPath.TrimStart("/")
  if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
  $file = Join-Path $root ($path -replace "/", "\")
  try {
    if ((Test-Path $file -PathType Leaf) -and ((Resolve-Path $file).Path.StartsWith($rootResolved, [System.StringComparison]::OrdinalIgnoreCase))) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $type = $mime[$ext]
      if ($null -eq $type) { $type = "application/octet-stream" }
      $ctx.Response.ContentType = $type
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    try { $ctx.Response.StatusCode = 500 } catch {}
  }
  try { $ctx.Response.OutputStream.Close() } catch {}
}
