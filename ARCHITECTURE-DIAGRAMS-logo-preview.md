# System Architecture Diagram: Logo Preview Generation

## CompanyCasuals Logo-on-Shirt Preview System

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                             │
│                                                                       │
│  1. Browse CompanyCasuals Product Page                              │
│  2. Click "Add Logo" or "Customize"                                 │
│  3. Upload Logo File (PNG, JPEG, etc.)                              │
│  4. Adjust Position/Size with Design Wheel                          │
│  5. View Live Preview                                                │
│  6. Download or Add to Cart                                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (BROWSER)                              │
│                                                                       │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  HTML/CSS/JS     │  │  File Input     │  │  Canvas/Preview  │  │
│  │  UI Components   │  │  Handler        │  │  Display         │  │
│  └──────────────────┘  └─────────────────┘  └──────────────────┘  │
│                             │                                         │
│                             │ AJAX POST Request                       │
│                             │ (multipart/form-data)                  │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPANYCASUALS SERVER                             │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  UPLOAD ENDPOINT                                              │   │
│  │  /flash/upload_flash/uploadlogo.jsp                          │   │
│  │                                                               │   │
│  │  - Receive uploaded file                                     │   │
│  │  - Validate format/size (max 2MB)                            │   │
│  │  - Generate unique ID                                        │   │
│  │  - Store temporarily                                         │   │
│  └───────────────────────────┬───────────────────────────────────┘   │
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  IMAGE PROCESSING SERVICE                                    │   │
│  │                                                               │   │
│  │  - Load uploaded logo                                        │   │
│  │  - Detect & remove white background (if needed)              │   │
│  │  - Apply transparency threshold                              │   │
│  │  - Resize to specified dimensions                            │   │
│  │  - Optimize for web display                                  │   │
│  └───────────────────────────┬───────────────────────────────────┘   │
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  MOCKUP COMPOSITOR                                           │   │
│  │                                                               │   │
│  │  - Load shirt mockup template (based on color/style)        │   │
│  │  - Calculate logo position (center chest, etc.)             │   │
│  │  - Composite logo onto mockup                                │   │
│  │  - Apply perspective/warp if needed                          │   │
│  │  - Render final preview image                                │   │
│  └───────────────────────────┬───────────────────────────────────┘   │
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  PREVIEW IMAGE STORAGE                                       │   │
│  │                                                               │   │
│  │  - Save to: /logo_images/{unique_id}.png                    │   │
│  │  - Set session/time-based expiration                         │   │
│  │  - Generate preview URL                                      │   │
│  └───────────────────────────┬───────────────────────────────────┘   │
│                              │                                        │
└──────────────────────────────┼────────────────────────────────────────┘
                               │
                               │ JSON Response
                               │ { previewUrl: "/logo_images/12345.png" }
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (BROWSER)                              │
│                                                                       │
│  - Receive preview URL                                               │
│  - Display in <img> tag or canvas                                    │
│  - Enable download button                                            │
│  - Allow further adjustments                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Network Request Flow

```
TIME    CLIENT                    NETWORK                     SERVER
  │                                                              
  │  User uploads logo.png                                     
  │        │                                                    
  ├────────┼──── POST /uploadlogo.jsp ──────────────────────►  │
  │        │     Content-Type: multipart/form-data             │
  │        │     Body: logo file binary data                   │
  │        │                                                    │
  │        │                                                    │  Processing...
  │        │                                                    │  1. Validate
  │        │                                                    │  2. Store
  │        │                                                    │  3. Process
  │        │                                                    │  4. Composite
  │        │                                                    │  5. Save preview
  │        │                                                    │
  │  ◄────┼──────── JSON Response ────────────────────────────┤
  │        │     { success: true,                              │
  │        │       previewUrl: "/logo_images/abc123.png",     │
  │        │       logoId: "abc123" }                          │
  │        │                                                    │
  │        │                                                    │
  ├────────┼──── GET /logo_images/abc123.png ─────────────────►│
  │        │                                                    │
  │  ◄────┼──────── PNG Image Data ──────────────────────────┤
  │        │     Content-Type: image/png                       │
  │        │     Binary image data                             │
  │        │                                                    │
  │        │                                                    │
  │  Display preview on page                                   │
  │                                                              
```

---

## Data Flow Diagram

```
┌──────────────┐
│ Logo File    │ (user uploads)
│ logo.png     │
│ 1.2 MB       │
└──────┬───────┘
       │
       │ Upload
       ▼
┌──────────────────────────┐
│ Validation               │
│ - Check file type        │──► ✓ PNG, JPEG, GIF, etc.
│ - Check file size        │──► ✓ < 2MB
│ - Check dimensions       │──► ⚠ Min 300x300px recommended
└──────┬───────────────────┘
       │
       │ Valid ✓
       ▼
┌──────────────────────────┐
│ Image Processing         │
│                          │
│ Input:  1200x1200 PNG    │
│ Output: 800x800 PNG      │
│                          │
│ Steps:                   │
│ 1. Remove white bg       │──► Transparency: 95%
│ 2. Resize to 800x800     │──► Scale: proportional
│ 3. Optimize file size    │──► Compress: 85% quality
└──────┬───────────────────┘
       │
       │ Processed Logo
       ▼
┌──────────────────────────┐      ┌──────────────────────┐
│ Mockup Template          │      │ Logo                 │
│                          │      │ (processed)          │
│ white-tshirt-front.png   │  +   │ 800x800 PNG          │
│ 2000x2400 PNG            │      │ transparent bg       │
└──────┬───────────────────┘      └──────┬───────────────┘
       │                                  │
       └──────────┬───────────────────────┘
                  │
                  │ Composite
                  ▼
       ┌──────────────────────┐
       │ Position Calculation  │
       │                       │
       │ Canvas: 2000x2400     │
       │ Logo size: 400x400    │
       │ X position: 800       │──► Centered horizontally
       │ Y position: 840       │──► 35% from top (chest area)
       └──────┬────────────────┘
              │
              │ Render
              ▼
       ┌──────────────────────┐
       │ Final Preview Image  │
       │                      │
       │ 2000x2400 PNG        │
       │ Size: 850 KB         │
       │                      │
       │ Logo composited on   │
       │ white t-shirt mockup │
       └──────┬───────────────┘
              │
              │ Save
              ▼
       ┌──────────────────────────┐
       │ Storage                  │
       │                          │
       │ Path: /logo_images/      │
       │ File: abc123.png         │
       │ URL:  /logo_images/      │
       │       abc123.png         │
       │                          │
       │ Expires: 24-48 hours     │
       └──────────────────────────┘
```

---

## State Diagram: User Session

```
         ┌───────────────┐
         │ Initial State │
         │ No Logo       │
         └───────┬───────┘
                 │
                 │ User clicks "Add Logo"
                 ▼
         ┌───────────────┐
         │ File Selector │
         │ Open          │
         └───────┬───────┘
                 │
                 │ User selects file
                 ▼
         ┌───────────────┐
         │ Uploading     │──────┐
         │ (Spinner)     │      │ Upload fails
         └───────┬───────┘      │
                 │              │
                 │ Success      ▼
                 ▼          ┌────────────┐
         ┌───────────────┐  │ Error      │
         │ Processing    │  │ Show msg   │
         │ (Spinner)     │  └────────────┘
         └───────┬───────┘
                 │
                 │ Preview ready
                 ▼
         ┌───────────────────────┐
         │ Preview Displayed     │
         │ ┌─────────────────┐   │
         │ │  [Shirt image]  │   │
         │ │   with logo     │   │
         │ └─────────────────┘   │
         │                       │
         │ [Adjust] [Download]   │
         └───────┬───────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    │ Adjust     │ Download   │ Add to Cart
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌──────────┐
│ Design │  │ File   │  │ Order    │
│ Wheel  │  │ Saved  │  │ Created  │
└────────┘  └────────┘  └──────────┘
```

---

## Technology Stack

```
┌─────────────────────────────────────────┐
│           CLIENT SIDE                    │
├─────────────────────────────────────────┤
│ • HTML5                                  │
│ • CSS3 (Flexbox/Grid)                   │
│ • JavaScript (ES6+)                     │
│ • AJAX / Fetch API                      │
│ • File API                               │
│ • (Possibly jQuery)                      │
└─────────────────────────────────────────┘
                    │
                    │ HTTPS
                    ▼
┌─────────────────────────────────────────┐
│           SERVER SIDE                    │
├─────────────────────────────────────────┤
│ • Java (JSP/Servlets)                   │
│ • Web Framework (Spring/Struts?)        │
│ • Image Processing:                      │
│   - ImageMagick                          │
│   - Java ImageIO                         │
│   - Custom background removal            │
│ • File Storage:                          │
│   - Local filesystem                     │
│   - Temporary session storage            │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           STORAGE                        │
├─────────────────────────────────────────┤
│ • /logo_images/ directory                │
│ • Session-based cleanup                  │
│ • CDN for mockup templates              │
└─────────────────────────────────────────┘
```

---

## File Flow Chart

```
                 ┌────────────────┐
                 │  User Uploads  │
                 │  logo.png      │
                 └────────┬───────┘
                          │
                          ▼
     ┌────────────────────────────────────┐
     │       Is file type valid?          │
     │   (PNG, JPG, GIF, etc.)            │
     └────────┬───────────────────┬───────┘
              │ YES               │ NO
              ▼                   ▼
     ┌──────────────┐      ┌──────────────┐
     │ Size check   │      │ Reject file  │
     │ < 2MB?       │      │ Show error   │
     └───┬──────────┘      └──────────────┘
         │ YES    │ NO
         │        └───────► Reject (too large)
         │
         ▼
     ┌──────────────────────┐
     │ Generate unique ID   │
     │ id = "abc123"        │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Save original file   │
     │ /tmp/uploads/abc123  │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────────────┐
     │ Process image                 │
     │ - Remove background           │
     │ - Resize if needed            │
     │ - Convert to PNG              │
     └──────────┬───────────────────┘
                │
                ▼
     ┌──────────────────────────────┐
     │ Load mockup template          │
     │ /mockups/white-tshirt.png    │
     └──────────┬───────────────────┘
                │
                ▼
     ┌──────────────────────────────┐
     │ Composite logo onto mockup   │
     │ Position: center chest        │
     └──────────┬───────────────────┘
                │
                ▼
     ┌──────────────────────────────┐
     │ Save preview                  │
     │ /logo_images/abc123.png      │
     └──────────┬───────────────────┘
                │
                ▼
     ┌──────────────────────────────┐
     │ Return URL to client          │
     │ { previewUrl: "..." }         │
     └───────────────────────────────┘
```

---

## Sequence Diagram: Complete Flow

```
User          Browser         Upload EP      Process Svc    Storage       Client
 │              │                │                │            │            │
 │ Click        │                │                │            │            │
 │ "Add Logo"   │                │                │            │            │
 ├──────────────►                │                │            │            │
 │              │                │                │            │            │
 │              │ Show file      │                │            │            │
 │              │ picker         │                │            │            │
 │              │                │                │            │            │
 │ Select       │                │                │            │            │
 │ logo.png     │                │                │            │            │
 ├──────────────►                │                │            │            │
 │              │                │                │            │            │
 │              │ POST /upload   │                │            │            │
 │              ├───────────────►│                │            │            │
 │              │                │ Validate       │            │            │
 │              │                │ Generate ID    │            │            │
 │              │                │                │            │            │
 │              │                │ Process logo   │            │            │
 │              │                ├───────────────►│            │            │
 │              │                │                │            │            │
 │              │                │                │ Load mockup│            │
 │              │                │                │ Composite  │            │
 │              │                │                │            │            │
 │              │                │                │ Save PNG   │            │
 │              │                │                ├───────────►│            │
 │              │                │                │            │            │
 │              │                │ Return URL     │            │            │
 │              │  200 OK        │◄───────────────┤            │            │
 │              │◄───────────────┤                │            │            │
 │              │ {previewUrl}   │                │            │            │
 │              │                │                │            │            │
 │              │ GET /logo_images/abc123.png     │            │            │
 │              ├────────────────────────────────────────────►│            │
 │              │                │                │            │            │
 │              │                │                │   PNG data │            │
 │              │◄────────────────────────────────────────────┤            │
 │              │                │                │            │            │
 │              │ Display preview│                │            │            │
 │              ├───────────────────────────────────────────────────────►│
 │              │                │                │            │            │
 │ View preview │                │                │            │            │
 │◄─────────────┤                │                │            │            │
 │              │                │                │            │            │
```

---

## Summary

The CompanyCasuals logo preview system uses a traditional server-side rendering approach:

1. **Upload** → Server receives and validates logo file
2. **Process** → Background removal, resizing, optimization
3. **Composite** → Logo overlaid on shirt mockup template
4. **Store** → Preview saved with unique URL
5. **Deliver** → URL returned to client for display

**Key Characteristics:**
- Server-side heavy lifting
- Session-based URL generation
- Temporary storage with expiration
- High-quality output suitable for customer decisions

---

*Diagram document for CompanyCasuals logo preview research*
*Created: January 2026*
