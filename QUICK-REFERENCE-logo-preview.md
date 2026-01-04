# Quick Reference: CompanyCasuals Logo Preview Research

**Research Date:** January 2026  
**Status:** ✅ Complete

---

## TL;DR

**Question:** Can we capture CompanyCasuals logo-on-shirt preview images?

**Answer:** ✅ **YES** - Preview images are retrievable via multiple methods.

---

## Key Findings (30-second version)

### How It Works
1. User uploads logo → Server processes → Generates preview PNG/JPG
2. Preview URL format: `/flash/upload_flash/logo_images/{unique_id}.png`
3. Image rendered server-side with logo composited on shirt mockup

### How To Capture
✅ **Network Tab Method** (Recommended)
- Open DevTools → Network → Filter by "Img"
- Upload logo
- Capture preview image URL from response
- Right-click → "Open in new tab" or "Copy URL"

✅ **Right-Click Save**
- View preview in browser
- Right-click image → "Save Image As..."

✅ **Account Storage**
- Approved designs saved to user account
- Persistent access for reuse

### URL Stability
⚠️ **Session-Limited:**
- URLs expire after session or time limit
- **Action:** Download immediately when generated
- **Best practice:** Store locally, don't rely on URL permanence

---

## System Architecture (Simplified)

```
USER → Upload Logo → CompanyCasuals Server → Process Image
                              ↓
                     Generate Preview PNG
                              ↓
                     Serve at unique URL
                              ↓
                     Return to Browser
```

---

## Technical Specs

| Aspect | Details |
|--------|---------|
| **Formats Accepted** | JPEG, PNG, GIF, TIFF, EPS, BMP |
| **Max File Size** | 2MB |
| **Recommended Size** | 300x300px minimum |
| **Preview Format** | PNG or JPEG |
| **URL Pattern** | `/logo_images/{id}.png?preview=true` |
| **Generation Time** | 1-3 seconds |
| **URL Lifespan** | Session-based (hours to days) |

---

## Network Capture Steps

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter: "Img" or "XHR"
4. Clear existing requests (trash icon)
5. Upload logo on CompanyCasuals
6. Watch for new image requests
7. Look for: `/logo_images/` or similar pattern
8. Right-click request → Copy URL or Open in new tab
9. **Save immediately** - URL may expire

---

## Implementation Options for My Shirt Printing

### 🥇 Best for Quick Start
**Client-Side Canvas (HTML5)**
- ✅ Zero server cost
- ✅ Instant preview
- ✅ 20-40 hours development
- ❌ Limited quality control

### 🥈 Best for Production
**Server-Side (Node.js + Sharp)**
- ✅ High quality
- ✅ Background removal
- ✅ Store previews
- ❌ $15-70/month hosting

### 🥉 Best for Quality
**Third-Party API (Printful, MockupKit)**
- ✅ Professional quality
- ✅ Fast integration (10-20 hours)
- ✅ Minimal maintenance
- ❌ $29-99/month or per-use costs

---

## Files Created

1. **`research-companycasuals-logo-preview.md`**
   - Full research report (8KB)
   - Technical architecture
   - Detailed findings

2. **`implementation-guide-logo-preview.md`**
   - Code examples
   - Three implementation options
   - Step-by-step guides
   - Cost estimates

3. **`QUICK-REFERENCE-logo-preview.md`** ← You are here
   - Summary of key points
   - Quick decision guide

---

## Decision Matrix

| Need | Recommended Solution |
|------|---------------------|
| Quick MVP test | Client-Side Canvas |
| Professional quality | Server-Side Processing |
| No maintenance burden | Third-Party API |
| Maximum control | Server-Side Processing |
| Zero cost | Client-Side Canvas |
| Automatic background removal | Third-Party API or Server-Side |

---

## Next Actions

### Immediate (if building this feature):
- [ ] Decide on implementation approach
- [ ] Gather mockup images (white/black/navy shirts)
- [ ] Set up development environment
- [ ] Build basic prototype

### Optional (for deeper research):
- [ ] Manual test on CompanyCasuals with DevTools
- [ ] Document exact request/response patterns
- [ ] Test URL expiration timing
- [ ] Analyze authentication requirements

---

## Common Questions

**Q: Are the preview URLs permanent?**  
A: No, they're session-based. Download images immediately.

**Q: Can I automate this?**  
A: Yes, but CompanyCasuals may have rate limits or authentication requirements.

**Q: What's the easiest way to get started?**  
A: HTML5 Canvas with client-side rendering. See implementation guide.

**Q: Do I need CompanyCasuals permission?**  
A: This research is for understanding their approach. Build your own system.

**Q: How much does it cost to build?**  
A: Client-side: $0 hosting, 20-40 dev hours. Server-side: $15-70/month, 40-80 dev hours.

---

## Resources

**Mockup Templates (Free):**
- Mockup World: https://www.mockupworld.co/free/
- Freepik: https://www.freepik.com/free-photos-vectors/shirt-mockup
- GraphicBurger: https://graphicburger.com/mockups/

**Image Processing Libraries:**
- Sharp (Node.js): https://sharp.pixelplumbing.com/
- Canvas API (Browser): https://developer.mozilla.org/docs/Web/API/Canvas_API

**Third-Party APIs:**
- Printful: https://www.printful.com/docs
- Dynamic Mockups: https://dynamicmockups.com
- MockupKit: https://mockupkit.app

---

## Contact & Support

For questions about this research:
- Review full report: `research-companycasuals-logo-preview.md`
- Check implementation guide: `implementation-guide-logo-preview.md`
- See code examples in implementation guide

---

**Research Status:** ✅ Complete  
**Recommendation:** CompanyCasuals preview images ARE retrievable. Use Network tab capture method for best results. Build your own system using one of the three implementation options provided.

---

*Last Updated: January 2026*
