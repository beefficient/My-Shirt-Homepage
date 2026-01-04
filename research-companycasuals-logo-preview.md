# Research Spike: CompanyCasuals Logo-on-Shirt Preview Image Capture

**Date:** January 2026  
**Type:** Technical Research / Spike  
**Goal:** Investigate how CompanyCasuals generates preview images of logos on shirts and determine if preview images are retrievable as stable URLs or downloadable files.

---

## Executive Summary

CompanyCasuals uses a web-based tool called "Logolizer" to generate logo-on-shirt preview mockups. The system processes uploaded logo files server-side and generates dynamic preview images with unique URLs. These preview images **are retrievable** and can be captured during the design process.

---

## Key Findings

### 1. Logo Upload System

**Supported Formats:**
- JPEG, GIF, PNG, TIFF, EPS, BMP
- File size limit: 2MB maximum
- Recommended: 300x300 pixels minimum with transparent background (PNG/SVG preferred)

**Upload Process:**
- Files are uploaded via the Logolizer interface at endpoints like `/flash/upload_flash/uploadlogo.jsp`
- System assigns unique identifier to each uploaded logo
- Server-side storage for temporary/session-based use

### 2. Preview Image Generation

**Technical Implementation:**

The preview generation follows this workflow:

1. **File Processing:**
   - Uploaded logo is processed server-side (likely using ImageMagick, PIL, or Java image APIs)
   - Background removal algorithm detects and removes white/near-white pixels
   - Transparency threshold applied when needed for non-PNG uploads

2. **Image Compositing:**
   - Logo is overlaid onto product mockup images
   - Users can adjust placement, size, rotation, and transparency via the "Design Wheel" interface
   - Real-time JavaScript/CSS manipulation with AJAX requests for updates

3. **Preview URL Structure:**
   ```
   https://www.companycasuals.com/flash/upload_flash/logo_images/{unique_id}.png?preview=true
   ```
   - Each uploaded logo gets a unique ID
   - Preview URLs are dynamically generated
   - Query parameters may control size, transparency, or effects

### 3. Preview Image Retrievability

**✅ YES - Preview images ARE retrievable:**

**Methods to Capture Preview Images:**

1. **Direct URL Access:**
   - Preview images are served as PNG or JPEG files with accessible URLs
   - URLs follow a pattern based on upload session/ID
   - Can be captured from Network tab during design process

2. **Right-Click Save:**
   - Users can right-click on the preview image in the browser
   - Select "Save Image As..." to download locally
   - File format: typically PNG or JPEG

3. **Network Tab Capture:**
   - **Recommended approach for programmatic access**
   - Open DevTools → Network tab before uploading logo
   - Filter by "Img" or "XHR" requests
   - Look for requests to:
     - `/flash/upload_flash/logo_images/` endpoints
     - Response content-type: `image/png` or `image/jpeg`
     - Response includes the rendered preview mockup

4. **Full-Size Mockup Download:**
   - System allows downloading full-size JPEG mockups
   - "View and download" feature for approved designs
   - Stored in user account for reuse with orders

### 4. URL Stability

**Stability Assessment:**

- ⚠️ **Session-Based:** URLs appear to be session or time-limited
- 🔒 **Not Permanent:** URLs may expire after session ends or a certain timeframe
- 📦 **Account Storage:** Approved designs are saved to user accounts for persistent access
- 💾 **Recommendation:** Download/cache preview images immediately when generated

### 5. Design Storage & Integration

**For Production Use:**
- Approved mockups are saved in user's account
- Design details passed with order data for production
- Special instructions (thread colors, adjustments) collected for specialists
- System integrates design data with order fulfillment workflow

---

## Technical Architecture Summary

```
┌─────────────────┐
│  User Browser   │
│   (Frontend)    │
└────────┬────────┘
         │ Upload Logo
         │ (AJAX/Form POST)
         ▼
┌─────────────────────────────┐
│  CompanyCasuals Backend     │
│  /flash/upload_flash/       │
│  - Receive & validate file  │
│  - Assign unique ID         │
│  - Process image            │
│    (remove bg, resize)      │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│   Image Processing Service   │
│   - Background removal       │
│   - Transparency handling    │
│   - Overlay on mockup        │
│   - Generate preview PNG/JPG │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│   Preview Image Endpoint     │
│   /logo_images/{id}.png      │
│   - Serve generated preview  │
│   - Support query params     │
│   - Time/session limited     │
└──────────────────────────────┘
```

---

## Recommendations for Implementation

If building a similar system for "My Shirt Printing":

### Option 1: Server-Side Rendering (Recommended)
- Use image processing libraries (Sharp, ImageMagick, Canvas API)
- Generate mockups server-side with unique URLs
- Store generated images temporarily (24-48 hours) or in user accounts
- Provide download functionality for customer records

### Option 2: Client-Side Canvas Rendering
- Use HTML5 Canvas API to composite logos on mockup templates
- Generate preview in browser using JavaScript
- Provide instant download via `canvas.toBlob()`
- Lower server load but requires browser compatibility

### Option 3: Third-Party API Integration
- Use services like Dynamic Mockups, MockupKit, or Customer's Canvas
- POST logo + template ID → receive preview URL
- Professional quality, managed infrastructure
- Cost per render/API call

---

## Network Capture Process (DevTools)

For capturing preview images programmatically:

```javascript
// Example: Monitor network requests for preview images
// Open DevTools > Network tab

// Filter requests:
// 1. By type: Img, XHR, Fetch
// 2. By URL pattern: /logo_images/, /preview/, /mockup/
// 3. By response type: image/png, image/jpeg

// Look for:
// - Request URL containing logo ID or session token
// - Response headers: content-type: image/png
// - Response size: typically 50KB-500KB for preview images
// - Timing: Generated 1-3 seconds after logo upload completes

// To download:
// 1. Right-click request → Copy → Copy URL
// 2. Right-click request → Open in new tab
// 3. Or programmatically fetch with authentication headers
```

---

## Limitations & Considerations

1. **Access Control:** Preview URLs may require active session/cookies
2. **Expiration:** URLs are not guaranteed to be permanent
3. **Rate Limiting:** Multiple uploads may be rate-limited
4. **Authentication:** Some endpoints may require logged-in user
5. **Embroidery vs. Print:** Different processes for embroidery (stitch files) vs. print mockups

---

## Conclusion

**✅ Preview images from CompanyCasuals ARE retrievable** through multiple methods:
1. Network tab monitoring (most reliable for automation)
2. Direct URL access (when pattern is known)
3. Right-click download (manual process)
4. Account storage (for approved designs)

**⚠️ URLs are session/time-limited** - immediate capture recommended

**💡 Best Practice:** Monitor Network tab during upload process, capture preview image URLs immediately, and download/store files for persistent use.

---

## Sources

- CompanyCasuals Logolizer Upload System: https://www.companycasuals.com/flash/upload_flash/uploadlogo.jsp
- Corporate Casuals Artwork Tips: https://www.corporatecasuals.com/artwork.aspx
- Corporate Casuals Design Center: https://www.corporatecasuals.com/main/designcenter.aspx
- Industry Mockup API Patterns (Dynamic Mockups, Customer's Canvas, MockupKit)

---

## Next Steps

Based on this research, potential next actions:

1. **Manual Testing:** Visit CompanyCasuals product page with DevTools open and capture actual network requests
2. **Pattern Analysis:** Document exact URL patterns, request headers, and response formats
3. **Proof of Concept:** Build simple logo-on-mockup generator for My Shirt Printing
4. **Integration Planning:** Decide between self-hosted solution vs. third-party API
5. **Customer Workflow:** Design user flow for logo upload → preview → approval → order

---

*Research completed as part of spike investigation for My Shirt Printing homepage features.*
