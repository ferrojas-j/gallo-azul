$file = "public\finanzas_corporativas\index.html"
$lines = Get-Content $file -Encoding UTF8
$output = [System.Collections.Generic.List[string]]::new()
$inDeadBlock = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $lineNum = $i + 1
    $line = $lines[$i]

    # Start of dead block: the empty line 842 just before the orphan <script>
    if ($lineNum -eq 842 -and $line -eq '') {
        $inDeadBlock = $true
        continue
    }

    # End of dead block: closing </script> at line 1198 area
    if ($inDeadBlock -and $line -match '^\s*</script>') {
        # peek next line to confirm this is followed by empty + <script> for Restaurante
        $inDeadBlock = $false
        continue  # skip this </script> too
    }

    if (!$inDeadBlock) {
        $output.Add($line)
    }
}

[System.IO.File]::WriteAllLines(
    (Resolve-Path $file).Path,
    $output,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "Done. Output lines: $($output.Count)"
