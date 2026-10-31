import os, struct, zlib, base64

def create_png(size, output_path):
    """Create a simple PNG icon programmatically."""
    # Create a simple shield icon as PNG data
    width = height = size
    
    # Generate pixel data - black background with green shield
    pixels = []
    cx, cy = width // 2, height // 2
    
    for y in range(height):
        row = []
        for x in range(width):
            # Background: #0A0A0A = (10, 10, 10)
            r, g, b, a = 10, 10, 10, 255
            
            # Rounded rectangle (icon boundary)
            margin = max(1, size // 16)
            corner_r = max(1, size // 6)
            
            # Shield check mark - green
            # Simple cross mark in green
            rel_x = (x - cx) / (width * 0.45)
            rel_y = (y - cy) / (height * 0.45)
            
            # Green checkmark area (simplified)
            in_check = False
            # Left part of check: going down-right
            if -0.7 <= rel_x <= -0.05 and abs(rel_y - (rel_x + 0.5)) < 0.12:
                in_check = True
            # Right part of check: going up-right  
            if -0.05 <= rel_x <= 0.65 and abs(rel_y - (-rel_x * 0.7 - 0.05)) < 0.12:
                in_check = True
                
            if in_check:
                r, g, b, a = 35, 224, 0, 255  # #23E000
            
            row.extend([r, g, b, a])
        pixels.append(row)
    
    # Build PNG
    def make_chunk(chunk_type, data):
        chunk_len = len(data)
        chunk_data = chunk_type + data
        crc = zlib.crc32(chunk_data) & 0xffffffff
        return struct.pack('>I', chunk_len) + chunk_data + struct.pack('>I', crc)
    
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png += make_chunk(b'IHDR', ihdr_data)
    
    # IDAT
    raw_data = b''
    for row in pixels:
        raw_data += b'\x00'  # filter type none
        raw_data += bytes(row)
    
    compressed = zlib.compress(raw_data, 9)
    png += make_chunk(b'IDAT', compressed)
    
    # IEND
    png += make_chunk(b'IEND', b'')
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(png)
    print(f"Generated {output_path} ({size}x{size})")

create_png(192, r'd:\community scam\frontend\public\icons\icon-192.png')
create_png(512, r'd:\community scam\frontend\public\icons\icon-512.png')
