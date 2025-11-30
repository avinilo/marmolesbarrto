
Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$InputFile,
        [string]$OutputFile,
        [int]$Width
    )

    if (-not (Test-Path $InputFile)) {
        Write-Host "File not found: $InputFile"
        return
    }

    try {
        # Load the image
        # Note: System.Drawing might not support WebP directly depending on .NET version/OS support.
        # If it fails, we might need to rely on external tools or just skip.
        # However, newer Windows versions often have codecs.
        # If this fails for WebP, we will just exit.
        
        $image = [System.Drawing.Bitmap]::FromFile($InputFile)
        
        # Calculate new height to maintain aspect ratio
        $ratio = $Width / $image.Width
        $newHeight = [int]($image.Height * $ratio)

        $newImage = new-object System.Drawing.Bitmap $Width, $newHeight
        $graphics = [System.Drawing.Graphics]::FromImage($newImage)
        
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        
        $graphics.DrawImage($image, 0, 0, $Width, $newHeight)
        
        $newImage.Save($OutputFile) # Saves as default format (usually PNG/BMP if not specified, but let's see)
        # Actually System.Drawing.Bitmap.Save(string) saves as the format derived from extension if possible or default.
        # But WebP support in System.Drawing is tricky.
        
        $image.Dispose()
        $newImage.Dispose()
        $graphics.Dispose()
        
        Write-Host "Resized $InputFile to $OutputFile"
    }
    catch {
        Write-Host "Error resizing $InputFile : $_"
    }
}

# Try to resize if possible. If WebP is not supported by System.Drawing, this will fail gracefully.
Resize-Image -InputFile "chorreo.webp" -OutputFile "chorreo-sm.webp" -Width 500
Resize-Image -InputFile "marmolista.webp" -OutputFile "marmolista-sm.webp" -Width 500
