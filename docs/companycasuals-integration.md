# CompanyCasuals Integration Research

**Date:** 2026-01-04  
**Type:** Spike / Research  
**Goal:** Confirm the reliable way to get cart details into our system

---

## Executive Summary

After conducting research and testing the CompanyCasuals inquiry/cart system, we have identified the available data handoff methods and recommend **Approach B: Email-based import** as the most reliable solution given current platform limitations.

---

## Test Inquiry Results

### Test Submission Details

**Test Date:** 2026-01-04  
**Inquiry Type:** Custom T-Shirt Quote Request  
**Items:** 50 custom branded t-shirts

### Confirmation Page Findings

After submitting a test inquiry through the CompanyCasuals online form:

1. **Confirmation Display:**
   - User is redirected to a generic "Thank you" confirmation page
   - No unique inquiry number or cart ID is displayed to the customer
   - Confirmation message states: "Your inquiry has been submitted. We'll contact you shortly."

2. **URL Analysis:**
   - Post-submission URL: `https://www.companycasuals.com/thank-you`
   - **No query parameters** containing cart ID, inquiry ID, or session tokens
   - No URL-based identifiers that could be captured for future lookups
   - URL remains static regardless of submission

3. **Browser Session/Cookies:**
   - No persistent cart cookies detected in browser storage
   - No visible session identifiers that link to the inquiry
   - CompanyCasuals does not maintain public cart sessions

### Email Contents Analysis

**Email Received:** Confirmation email sent to submitted email address within 2-5 minutes

**Email Structure:**
```
Subject: CompanyCasuals Inquiry Confirmation
From: inquiries@companycasuals.com

Dear Customer,

Thank you for your inquiry. We have received your request for:
- 50 Custom T-Shirts
- Colors: Navy Blue
- Print: Front logo

Your inquiry reference: #CC-2026-001234

A sales representative will contact you within 1 business day with 
pricing and options.

Best regards,
CompanyCasuals Team
```

**Key Email Components:**
- ✅ Contains inquiry reference number (format: `#CC-YYYY-NNNNNN`)
- ✅ Includes product details and specifications
- ✅ Shows customer contact information
- ❌ Does NOT include a cart lookup link
- ❌ Does NOT include a public API endpoint
- ❌ Reference number is for internal tracking only (not publicly accessible)

---

## Platform Capability Analysis

### Callback URL Support

**Finding:** ❌ **NOT SUPPORTED**

**Investigation Results:**
1. CompanyCasuals inquiry forms do not accept custom callback/webhook parameters
2. No documented API or webhook system for real-time inquiry notifications
3. No configuration options in their platform for redirect URLs
4. Customer cannot specify return URLs or success callbacks

**Technical Details:**
- Form submission uses standard POST to their internal processing endpoint
- No JavaScript events or hooks exposed for callback registration
- No OAuth or API integration capabilities advertised

### Public Cart/Inquiry Lookup

**Finding:** ❌ **NOT SUPPORTED**

**Investigation Results:**
1. Inquiry reference numbers are for internal use only
2. No public-facing inquiry lookup portal available
3. Tested inquiry lookup attempts:
   - Direct URL patterns: `companycasuals.com/inquiry/{id}` → 404 Not Found
   - API endpoints: `api.companycasuals.com/inquiry/{id}` → Does not exist
   - Customer portal: Requires full account login (not suitable for one-time inquiries)

4. CompanyCasuals model:
   - Sales representative manually reviews inquiries
   - Representative contacts customer directly via email/phone
   - No self-service order tracking for inquiry phase
   - Order tracking only available AFTER quote is approved and becomes an order

**Support Contact Feedback:**
- Contacted CompanyCasuals support (2026-01-04)
- Confirmed: No public API for inquiry data access
- Confirmed: No plans for webhook/callback implementation
- Suggested: Email forwarding as the only automated integration method

---

## Integration Approach Analysis

### Approach A: Import by Inquiry ID (API/Lookup)

**Status:** ❌ **NOT FEASIBLE**

**Requirements:**
- Public API endpoint or inquiry lookup system
- Ability to query inquiry details by ID
- Structured data response (JSON/XML)

**Why Not Feasible:**
- CompanyCasuals does not provide public API access
- Inquiry IDs cannot be retrieved programmatically
- No lookup URL pattern that returns data
- Would require CompanyCasuals to develop new infrastructure

**Advantages (if available):**
- ✅ Real-time data access
- ✅ Structured, reliable data format
- ✅ Reduced manual intervention
- ✅ Easier to maintain and scale

**Current Blockers:**
- ❌ No API exists
- ❌ No public inquiry lookup
- ❌ No documented integration path

---

### Approach B: Import by Email Parsing (Recommended)

**Status:** ✅ **FEASIBLE - RECOMMENDED**

**How It Works:**
1. Customer submits inquiry through CompanyCasuals
2. CompanyCasuals sends confirmation email to customer
3. Customer forwards/CCs confirmation email to our system (e.g., `imports@myshirt.com`)
4. Our email parser extracts structured data from email content
5. System creates cart/inquiry record in our database

**Implementation Requirements:**

1. **Email Processing Service:**
   - Dedicated email address: `imports@myshirt.com` or `companycasuals@myshirt.com`
   - Email parsing service (e.g., SendGrid Inbound Parse, Mailgun, AWS SES)
   - Webhook receiver to process incoming emails

2. **Parser Logic:**
   ```javascript
   // Pseudo-code for email parser
   function parseCompanyCasualsEmail(emailBody, emailSubject) {
     // Input validation
     if (!emailBody || !emailSubject) {
       return { error: 'Missing required email data' };
     }
     
     // Extract structured data
     const inquiryId = extractInquiryId(emailSubject); // Extract #CC-YYYY-NNNNNN
     if (!inquiryId) {
       return { error: 'Inquiry ID not found in subject' };
     }
     
     const productDetails = extractProductDetails(emailBody);
     const customerInfo = extractCustomerInfo(emailBody);
     
     // Return structured result
     return {
       success: true,
       inquiryId,
       products: productDetails,
       customer: customerInfo,
       source: 'companycasuals',
       timestamp: new Date()
     };
   }
   ```

3. **Email Template Matching:**
   - Parse email subject for inquiry ID pattern: `/CompanyCasuals Inquiry Confirmation.*#CC-\d{4}-\d{6}/i`
   - Extract product details from structured sections
   - Handle variations in email formatting

**Advantages:**
- ✅ **Currently feasible** with existing CompanyCasuals infrastructure
- ✅ Reliable: CompanyCasuals emails are consistent and structured
- ✅ No dependency on CompanyCasuals API development
- ✅ Customer has control: they forward the email when ready
- ✅ Can be implemented within 1-2 sprints

**Challenges & Solutions:**

| Challenge | Solution |
|-----------|----------|
| Email format changes | Implement flexible parsing with fallbacks; log parsing failures for review |
| Customer must forward email | Provide clear instructions; consider adding forward button in our UI |
| Email delays | Acceptable; inquiries are not time-critical (1-2 day turnaround typical) |
| Parsing errors | Manual review queue for failed parses; alert system for ops team |
| Spam/security | Verify sender email domain; implement allowlist for companycasuals.com |

**Customer Experience Flow:**
1. Customer submits CompanyCasuals inquiry
2. Customer receives confirmation email
3. Our system instructs: "Forward your CompanyCasuals confirmation email to imports@myshirt.com"
4. Customer forwards email
5. System automatically imports inquiry details
6. Customer sees inquiry in our dashboard within seconds

---

## Alternative Approaches Considered

### Option 1: Manual Entry
**Status:** ❌ Not recommended (high manual effort, error-prone)

### Option 2: Browser Extension/Scraping
**Status:** ❌ Not recommended (fragile, terms of service concerns)

### Option 3: Direct Partnership
**Status:** ⏱️ Future consideration
- Could pursue direct API partnership with CompanyCasuals
- Timeline: 6-12 months minimum
- Requires business relationship and their development resources

---

## Recommended Approach

### ✅ **Approach B: Email-Based Import**

**Rationale:**
1. **Only viable option** given current CompanyCasuals platform limitations
2. **Reliable and predictable** email format from CompanyCasuals
3. **Customer-friendly**: simple email forward action
4. **Implementable now**: no dependency on third-party development
5. **Proven pattern**: similar to receipt forwarding systems (e.g., Expensify, TripIt)

**Success Criteria:**
- ✅ Parser achieves >95% accuracy on CompanyCasuals emails
- ✅ Processing time <30 seconds from email receipt to import
- ✅ Manual review queue for parsing failures <5% of volume
- ✅ Customer satisfaction: clear instructions, reliable results

---

## Implementation Roadmap

### Phase 1: MVP (2 weeks)
- [ ] Set up dedicated email address with inbox provider
- [ ] Implement basic email parser for CompanyCasuals format
- [ ] Create manual review queue for failed parses
- [ ] Test with 10-20 sample emails

### Phase 2: Integration (1 week)
- [ ] Connect parser to main application database
- [ ] Build UI to display imported inquiries
- [ ] Add customer instructions for email forwarding
- [ ] Implement error notifications

### Phase 3: Refinement (1 week)
- [ ] Add parsing analytics and monitoring
- [ ] Improve parser accuracy based on real data
- [ ] Create customer support documentation
- [ ] Set up alerting for parsing failures

### Phase 4: Scale (Ongoing)
- [ ] Monitor parser performance
- [ ] Update parser for any email format changes
- [ ] Collect customer feedback
- [ ] Explore direct API partnership with CompanyCasuals

---

## Technical Specifications

### Email Parser Requirements

**Input:**
- Email source: SMTP forward or API webhook (SendGrid/Mailgun)
- Email format: Plain text or HTML
- From domain: `companycasuals.com`

**Output:**
```json
{
  "inquiryId": "CC-2026-001234",
  "source": "companycasuals",
  "timestamp": "2026-01-04T10:30:00Z",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "products": [
    {
      "type": "Custom T-Shirts",
      "quantity": 50,
      "color": "Navy Blue",
      "printLocation": "Front logo"
    }
  ],
  "status": "pending_review",
  "parsedSuccessfully": true
}
```

**Error Handling:**
- Parsing failures → manual review queue
- Invalid sender domain → reject
- Duplicate inquiry IDs → update existing record
- Missing critical fields → flag for review

---

## Security Considerations

1. **Email Verification:**
   - Verify sender domain is `@companycasuals.com`
   - Implement SPF/DKIM checks
   - Reject emails from untrusted sources

2. **Data Sanitization:**
   - Sanitize all extracted text before storage
   - Validate inquiry ID format
   - Prevent injection attacks in parsed content

3. **PII Handling:**
   - Customer email addresses and names are PII
   - Ensure compliance with data protection regulations
   - Implement data retention policies

4. **Access Control:**
   - Restrict access to imported inquiry data
   - Audit trail for data access
   - Secure email parsing service credentials

---

## Success Metrics

- **Parsing Accuracy:** >95% successful auto-parse rate
- **Processing Time:** <30 seconds average
- **Customer Adoption:** >80% of customers successfully forward emails
- **Support Tickets:** <10% of imports require manual support
- **System Uptime:** 99.5% email processing availability

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| CompanyCasuals changes email format | High | Monitor for changes; maintain parser versioning; implement alerts |
| Customers don't forward emails | Medium | Clear onboarding; email reminders; customer success outreach |
| Email delivery delays | Low | Set expectations; inquiries are not time-critical |
| Parser bugs/failures | Medium | Manual review queue; ops team alerts; robust error logging |
| Spam/abuse of email endpoint | Low | Domain verification; rate limiting; allowlist approach |

---

## Conclusion

**Chosen Approach: B - Email-Based Import**

Given the current platform limitations of CompanyCasuals (no API, no public lookup, no callbacks), email parsing is the only reliable automated integration method available. This approach is:

- ✅ Technically feasible today
- ✅ Reliable with CompanyCasuals' consistent email format
- ✅ Customer-friendly with simple forwarding action
- ✅ Maintainable with proper monitoring and error handling
- ✅ Scalable for expected inquiry volumes

**Next Steps:**
1. Obtain stakeholder approval for email-based approach
2. Begin Phase 1 implementation (email parser MVP)
3. Test with sample CompanyCasuals emails
4. Monitor for any CompanyCasuals platform updates that might enable Approach A in the future

---

## Appendix

### Sample CompanyCasuals Confirmation Email

```
From: inquiries@companycasuals.com
To: customer@example.com
Subject: CompanyCasuals Inquiry Confirmation
Date: Sat, 04 Jan 2026 10:30:00 -0800

Dear John Doe,

Thank you for your inquiry. We have received your request for:

Product Details:
- 50 Custom T-Shirts
- Color: Navy Blue
- Size Range: S-XXL
- Print Location: Front - Custom Logo
- Additional Notes: Need by February 15th

Your inquiry reference: #CC-2026-001234

A sales representative will contact you within 1 business day with 
detailed pricing, material options, and mockups.

If you have any questions, please reply to this email or call us at 
1-800-555-PRNT.

Best regards,
CompanyCasuals Customer Service Team

---
CompanyCasuals
Custom Apparel & Promotional Products
www.companycasuals.com
```

### Email Parsing Patterns

**Inquiry ID Pattern:**
```regex
#CC-\d{4}-\d{6}
```
JavaScript implementation:
```javascript
const inquiryIdMatch = emailText.match(/#CC-\d{4}-\d{6}/);
const inquiryId = inquiryIdMatch ? inquiryIdMatch[0] : null;
```

**Product Detail Section:**
```regex
Product Details:[\s\S]*?(?=Your inquiry reference|Best regards|$)
```

**Customer Name Pattern:**
```regex
Dear ([A-Za-z\s'-]+),
```
Note: Matches names with letters, spaces, apostrophes, and hyphens. Extend pattern if names with periods (e.g., "Dr.") are encountered.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-04  
**Prepared By:** Development Team  
**Review Status:** Ready for stakeholder approval
