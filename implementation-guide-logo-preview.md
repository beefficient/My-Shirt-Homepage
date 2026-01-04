# Implementation Guide: Logo-on-Shirt Preview System

**Based on CompanyCasuals Research**  
**For: My Shirt Printing Website**

---

## Overview

This guide provides implementation options for adding a logo-on-shirt preview feature similar to CompanyCasuals' Logolizer tool.

---

## Implementation Options

### Option A: Client-Side Canvas Solution (Simplest)

**Pros:**
- No server-side processing required
- Instant preview generation
- No API costs
- Works entirely in browser

**Cons:**
- Limited to browser capabilities
- More CPU intensive for client
- Less control over image quality

**Technology Stack:**
- HTML5 Canvas API
- JavaScript (vanilla or React)
- File API for logo uploads

**Basic Implementation:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Logo Preview Demo</title>
  <style>
    .preview-container {
      max-width: 800px;
      margin: 20px auto;
      text-align: center;
    }
    canvas {
      border: 1px solid #ccc;
      border-radius: 8px;
      max-width: 100%;
    }
    .controls {
      margin: 20px 0;
    }
    .controls button {
      padding: 10px 20px;
      margin: 5px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <h1>Logo Preview Tool</h1>
    
    <div class="controls">
      <input type="file" id="logoUpload" accept="image/*">
      <br><br>
      
      <label>
        Shirt Color:
        <select id="shirtColor">
          <option value="white">White</option>
          <option value="black">Black</option>
          <option value="navy">Navy</option>
          <option value="red">Red</option>
        </select>
      </label>
      
      <label>
        Logo Size:
        <input type="range" id="logoSize" min="50" max="300" value="150">
      </label>
      
      <br><br>
      
      <button id="downloadBtn">Download Preview</button>
    </div>
    
    <canvas id="previewCanvas" width="600" height="700"></canvas>
  </div>

  <script>
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    
    let uploadedLogo = null;
    let logoSize = 150;
    
    // Shirt mockup templates (replace with actual mockup images)
    const shirtMockups = {
      white: '/images/mockups/white-tshirt.png',
      black: '/images/mockups/black-tshirt.png',
      navy: '/images/mockups/navy-tshirt.png',
      red: '/images/mockups/red-tshirt.png'
    };
    
    // Load initial shirt
    let currentShirt = 'white';
    let shirtImage = new Image();
    shirtImage.src = shirtMockups[currentShirt];
    shirtImage.onload = renderPreview;
    
    // Handle logo upload
    document.getElementById('logoUpload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedLogo = new Image();
        uploadedLogo.onload = renderPreview;
        uploadedLogo.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
    
    // Handle shirt color change
    document.getElementById('shirtColor').addEventListener('change', (e) => {
      currentShirt = e.target.value;
      shirtImage.src = shirtMockups[currentShirt];
      shirtImage.onload = renderPreview;
    });
    
    // Handle logo size change
    document.getElementById('logoSize').addEventListener('input', (e) => {
      logoSize = parseInt(e.target.value);
      renderPreview();
    });
    
    // Render preview
    function renderPreview() {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw shirt mockup
      ctx.drawImage(shirtImage, 0, 0, canvas.width, canvas.height);
      
      // Draw logo if uploaded
      if (uploadedLogo) {
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = 250; // Position on chest area
        
        ctx.drawImage(uploadedLogo, logoX, logoY, logoSize, logoSize);
      }
    }
    
    // Download preview
    document.getElementById('downloadBtn').addEventListener('click', () => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'shirt-preview.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    });
  </script>
</body>
</html>
```

---

### Option B: Server-Side Node.js Solution (Recommended for Production)

**Pros:**
- High-quality image processing
- Can remove backgrounds automatically
- Better control over output
- Can store/cache results

**Cons:**
- Requires server infrastructure
- More complex to set up
- Server processing time

**Technology Stack:**
- Node.js + Express
- Sharp (image processing library)
- Multer (file uploads)

**Installation:**

```bash
npm install express sharp multer cors
```

**Server Implementation:**

```javascript
// server.js
const express = require('express');
const sharp = require('sharp');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use('/previews', express.static('previews'));

// Endpoint: Generate logo preview
app.post('/api/generate-preview', upload.single('logo'), async (req, res) => {
  try {
    const { shirtColor, logoSize = 200 } = req.body;
    const logoFile = req.file;
    
    if (!logoFile) {
      return res.status(400).json({ error: 'No logo file uploaded' });
    }
    
    // Path to shirt mockup template
    const mockupPath = path.join(__dirname, 'mockups', `${shirtColor}-tshirt.png`);
    
    // Load and process logo
    let logoBuffer = await sharp(logoFile.path)
      .resize(parseInt(logoSize), parseInt(logoSize), { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    // Load mockup
    const mockupImage = await sharp(mockupPath);
    const mockupMetadata = await mockupImage.metadata();
    
    // Calculate logo position (center on chest)
    const logoX = Math.floor((mockupMetadata.width - parseInt(logoSize)) / 2);
    const logoY = Math.floor(mockupMetadata.height * 0.35); // 35% down from top
    
    // Composite logo onto mockup
    const outputFileName = `preview-${Date.now()}.png`;
    const outputPath = path.join(__dirname, 'previews', outputFileName);
    
    await mockupImage
      .composite([{
        input: logoBuffer,
        top: logoY,
        left: logoX
      }])
      .png({ quality: 90 })
      .toFile(outputPath);
    
    // Clean up uploaded file
    fs.unlinkSync(logoFile.path);
    
    // Return preview URL
    res.json({
      success: true,
      previewUrl: `/previews/${outputFileName}`,
      fileName: outputFileName
    });
    
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Endpoint: Download preview
app.get('/api/download-preview/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'previews', filename);
  
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'Preview not found' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Client-Side Integration:**

```javascript
// client-side code
async function uploadLogoAndGeneratePreview(logoFile, shirtColor) {
  const formData = new FormData();
  formData.append('logo', logoFile);
  formData.append('shirtColor', shirtColor);
  formData.append('logoSize', 200);
  
  try {
    const response = await fetch('http://localhost:3000/api/generate-preview', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Display preview
      const previewImg = document.getElementById('preview');
      previewImg.src = `http://localhost:3000${data.previewUrl}`;
      
      // Enable download button
      document.getElementById('downloadBtn').onclick = () => {
        window.open(`http://localhost:3000/api/download-preview/${data.fileName}`);
      };
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

### Option C: Third-Party API Integration

**Recommended Services:**

1. **Printful API** - https://www.printful.com/docs
   - Large mockup library
   - High quality renders
   - Commercial use allowed
   - ~$0.10 per mockup generation

2. **Dynamic Mockups** - https://dynamicmockups.com
   - Simple REST API
   - Fast rendering
   - $29-99/month

3. **MockupKit** - https://mockupkit.app
   - Developer-friendly
   - Good documentation
   - Pay-per-use pricing

**Example: Dynamic Mockups Integration**

```javascript
async function generateMockup(logoUrl, templateId) {
  const apiKey = 'YOUR_API_KEY';
  
  const response = await fetch('https://app.dynamicmockups.com/api/v1/renders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mockup_uuid: templateId, // e.g., 'white-tshirt-front-view'
      export_options: {
        image_format: 'jpg',
        image_size: 1500
      },
      smart_objects: [{
        layer_name: 'logo',
        image_url: logoUrl // Must be publicly accessible
      }]
    })
  });
  
  const data = await response.json();
  return data.export_path; // URL to generated mockup
}
```

---

## Required Assets

### Mockup Images

You need high-quality shirt mockup templates:

**Sources for Mockup Templates:**
- **Free:** Mockup World, GraphicBurger, Freepik
- **Premium:** Creative Market, Envato Elements
- **Custom:** Hire photographer for branded mockups

**Required Mockups (minimum):**
- White t-shirt (front)
- Black t-shirt (front)
- Navy t-shirt (front)
- Red t-shirt (front)

**Specifications:**
- Resolution: 2000x2400px minimum
- Format: PNG with transparent background (if possible)
- Perspective: Flat lay or realistic 3D
- Chest area: Clearly defined for logo placement

---

## Development Roadmap

### Phase 1: Basic Prototype (1-2 weeks)
- [ ] Create simple client-side canvas implementation
- [ ] Test with 2-3 mockup templates
- [ ] Basic upload and preview functionality
- [ ] Download preview feature

### Phase 2: Enhanced Features (2-3 weeks)
- [ ] Server-side image processing (Sharp/Node.js)
- [ ] Background removal for uploaded logos
- [ ] Multiple shirt colors and styles
- [ ] Adjustable logo size and position
- [ ] Preview URL generation and storage

### Phase 3: Production Ready (2-4 weeks)
- [ ] User authentication integration
- [ ] Save designs to user account
- [ ] Email preview to customer
- [ ] Integration with quote/order system
- [ ] Mobile responsive interface
- [ ] Performance optimization

### Phase 4: Advanced Features (optional)
- [ ] Multiple logo placement (front, back, sleeves)
- [ ] Text addition capability
- [ ] Color customization for logos
- [ ] Bulk mockup generation
- [ ] Share preview via link

---

## Security Considerations

1. **File Upload Validation:**
   ```javascript
   const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
   const maxSize = 5 * 1024 * 1024; // 5MB
   
   if (!allowedTypes.includes(file.type)) {
     throw new Error('Invalid file type');
   }
   if (file.size > maxSize) {
     throw new Error('File too large');
   }
   ```

2. **Rate Limiting:** Limit preview generations per user/IP
3. **File Cleanup:** Auto-delete temporary files after 24 hours
4. **URL Signing:** Use signed URLs for preview access
5. **Input Sanitization:** Validate all user inputs

---

## Performance Optimization

1. **Caching:** Cache generated previews for identical logo+mockup combinations
2. **CDN:** Serve mockup templates from CDN
3. **Image Optimization:** Compress outputs (quality 85-90%)
4. **Lazy Loading:** Load mockup images on demand
5. **Background Processing:** Queue long-running tasks

---

## Testing Checklist

- [ ] Upload various image formats (PNG, JPG, SVG)
- [ ] Test with transparent and non-transparent logos
- [ ] Verify download functionality
- [ ] Test on mobile devices
- [ ] Check cross-browser compatibility
- [ ] Load testing with concurrent users
- [ ] Validate file size limits
- [ ] Test error handling

---

## Cost Estimation

**Option A (Client-Side):**
- Development: 20-40 hours
- Hosting: $0 (static files)
- Maintenance: Minimal

**Option B (Server-Side):**
- Development: 40-80 hours
- Hosting: $10-50/month (VPS/Cloud)
- Storage: $5-20/month
- Maintenance: 2-4 hours/month

**Option C (Third-Party API):**
- Development: 10-20 hours (integration)
- API Costs: $29-99/month or per-use
- Hosting: Minimal
- Maintenance: Minimal

---

## Recommended Approach for My Shirt Printing

**Start with Option A** (Client-Side Canvas):
- Quick to implement
- No server costs
- Good for MVP/testing market fit

**Migrate to Option B** (Server-Side) when:
- Need background removal
- Want to save/store previews
- Require better image quality
- Have sufficient traffic to justify costs

---

## Additional Resources

- **Sharp Documentation:** https://sharp.pixelplumbing.com/
- **Canvas API Guide:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **Multer (File Uploads):** https://github.com/expressjs/multer
- **Background Removal:** https://www.remove.bg/api (API service)
- **Mockup Templates:** https://www.mockupworld.co/free/

---

*Implementation guide based on research findings from CompanyCasuals spike investigation.*
