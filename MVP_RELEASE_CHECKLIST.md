# YardFront MVP Release Checklist

This document outlines everything that needs to be completed before releasing YardFront to the public. Complete all items in each section before launch.

---

## 🔐 1. Authentication & User Management

### Core Authentication
- [ ] **Signup/Signin Flow**
  - [ ] Email/password signup works end-to-end
  - [ ] Email/password login works end-to-end
  - [ ] OAuth providers (Google, Apple, etc.) configured and tested
  - [ ] Email verification flow implemented and tested
  - [ ] Password reset functionality works
  - [ ] Auth callbacks handled correctly (OAuth redirects)
  - [ ] Session management (token refresh, expiration)

- [ ] **User Profiles**
  - [ ] Profile creation on signup
  - [ ] Profile editing (name, bio, location, avatar)
  - [ ] Avatar upload works correctly
  - [ ] Profile viewing (public profiles)
  - [ ] User role selection (Buyer, Seller, Collector, Neighbor)

- [ ] **Security**
  - [ ] All protected routes require authentication
  - [ ] RLS (Row Level Security) policies tested and working
  - [ ] Auth tokens validated on every API request
  - [ ] CORS properly configured for production domain
  - [ ] Rate limiting on auth endpoints (prevent brute force)

---

## 🗄️ 2. Database & Backend Setup

### Database Schema
- [ ] **Run all SQL migrations in order:**
  - [ ] `sql/001_schema.sql` - Core tables (profiles, products, orders, etc.)
  - [ ] `sql/002_rls_policies.sql` - Row Level Security policies
  - [ ] `sql/003_storage.sql` - Storage bucket setup
  - [ ] `sql/004_fix_ai_usage_rls.sql` - AI usage tracking
  - [ ] `sql/004_subscription_ai_usage.sql` - Subscription features
  - [ ] `sql/005_location_privacy.sql` - Location privacy settings
  - [ ] `sql/005_verify_ai_usage_setup.sql` - Verify AI setup
  - [ ] `sql/006_database_fixes.sql` - Any fixes

- [ ] **Verify all tables exist:**
  - [ ] profiles
  - [ ] products
  - [ ] product_images
  - [ ] garage_sales
  - [ ] garage_sale_images
  - [ ] cart
  - [ ] orders
  - [ ] order_items
  - [ ] conversations
  - [ ] conversation_participants
  - [ ] messages
  - [ ] reviews
  - [ ] favorites
  - [ ] ai_usage_logs
  - [ ] subscriptions (if using)

### Storage Buckets
- [ ] **Create Supabase Storage Buckets:**
  - [ ] `product-images` (public, for product photos)
  - [ ] `garage-sale-images` (public, for garage sale photos)
  - [ ] `avatars` (public, for user profile pictures)
  - [ ] RLS policies configured for each bucket
  - [ ] Upload limits enforced (file size, file type)
  - [ ] Image optimization/resizing on upload

### Environment Variables
- [ ] **Backend (.env file):**
  - [ ] `SUPABASE_URL` - Production Supabase URL
  - [ ] `SUPABASE_ANON_KEY` - Production anon key
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Production service role key
  - [ ] `GEMINI_API_KEY` - Google Gemini API key for AI features
  - [ ] `PORT` - Server port (3000 or production port)
  - [ ] `NODE_ENV=production`
  - [ ] `CORS_ORIGIN` - Production frontend URL(s)
  - [ ] `FRONTEND_URL` - Production frontend URL

- [ ] **Frontend (.env or build-time vars):**
  - [ ] `VITE_API_BASE` - Production API URL
  - [ ] `VITE_SUPABASE_URL` - Production Supabase URL
  - [ ] `VITE_SUPABASE_ANON_KEY` - Production anon key
  - [ ] `VITE_GEMINI_API_KEY` - For client-side AI features (if needed)

- [ ] **Security:**
  - [ ] `.env` files added to `.gitignore`
  - [ ] `.env.example` file created with placeholder values
  - [ ] Environment variables documented in README
  - [ ] No secrets committed to version control

---

## 🛍️ 3. Core Marketplace Features

### Product Listings
- [ ] **Create Listing Page**
  - [ ] Form validation (title, price, description, location required)
  - [ ] Photo upload (multiple images)
  - [ ] Category selection
  - [ ] Condition selection
  - [ ] Location input with map picker
  - [ ] AI price suggestion works
  - [ ] AI description generation works
  - [ ] Listing creation saves to database
  - [ ] Images upload to storage bucket
  - [ ] Success/error feedback to user

- [ ] **Product Display**
  - [ ] Product detail page loads correctly
  - [ ] All product images display
  - [ ] Product information accurate (price, condition, location)
  - [ ] Seller profile link works
  - [ ] "Contact Seller" button works
  - [ ] "Add to Cart" button works (if applicable)
  - [ ] "Add to Favorites" button works
  - [ ] Product status (active, sold, reserved) displays correctly
  - [ ] View counter increments

- [ ] **Product Search & Discovery**
  - [ ] Search by keyword works
  - [ ] Filter by category works
  - [ ] Filter by price range works
  - [ ] Filter by location/distance works
  - [ ] Sort options work (price, date, distance)
  - [ ] Pagination works (if many results)
  - [ ] Search results load quickly

### Garage Sales
- [ ] **Create Garage Sale**
  - [ ] Form validation
  - [ ] Date/time selection
  - [ ] Location with map picker
  - [ ] Photo upload
  - [ ] Description input
  - [ ] Garage sale creation saves correctly
  - [ ] Images upload successfully

- [ ] **Garage Sale Display**
  - [ ] Garage sale list page works
  - [ ] Garage sale detail page loads
  - [ ] All images display
  - [ ] Date/time displayed correctly
  - [ ] Location displayed correctly
  - [ ] Map shows location
  - [ ] Associated products listed (if any)
  - [ ] "Contact Seller" works

### Cart & Checkout
- [ ] **Shopping Cart**
  - [ ] Add items to cart works
  - [ ] Remove items from cart works
  - [ ] Update quantities works
  - [ ] Cart persists across sessions
  - [ ] Cart totals calculate correctly
  - [ ] Empty cart message displays

- [ ] **Checkout Process**
  - [ ] Checkout page loads with cart items
  - [ ] Shipping/billing form validation
  - [ ] Form fields save as user types (optional enhancement)
  - [ ] **Payment Integration** ⚠️ **CRITICAL**
    - [ ] Payment processor integrated (Stripe, PayPal, etc.)
    - [ ] Card payment form secure and validated
    - [ ] Test payments work
    - [ ] Payment webhooks configured
    - [ ] Order creation triggers on successful payment
    - [ ] Error handling for failed payments
    - **NOTE:** Currently checkout creates order without payment - this needs payment integration!

- [ ] **Order Management**
  - [ ] Order confirmation page after checkout
  - [ ] Orders list page displays user's orders
  - [ ] Order detail page shows full order info
  - [ ] Order status updates (pending, confirmed, completed, cancelled)
  - [ ] Seller can view/manage their orders
  - [ ] Buyer can view their orders

---

## 🤖 4. AI Features (Stitch AI)

### Garage Sale Scanner
- [ ] **Image Analysis**
  - [ ] Upload garage sale photo works
  - [ ] AI analyzes image correctly
  - [ ] Detected items display with bounding boxes
  - [ ] Estimated values show for each item
  - [ ] Confidence scores display
  - [ ] Error handling for failed analysis
  - [ ] Loading states during processing
  - [ ] Rate limiting enforced (freemium limits)

### Price Suggestions
- [ ] **AI Price Check**
  - [ ] Price suggestion API endpoint works
  - [ ] Frontend calls API correctly
  - [ ] Suggestions display in UI
  - [ ] Market average shown
  - [ ] Price range (min/max) shown
  - [ ] Error handling implemented

### Description Generation
- [ ] **AI Description Generator**
  - [ ] Generate description from image works
  - [ ] Title, description, category, tags generated
  - [ ] Generated content displays in form
  - [ ] User can edit generated content
  - [ ] Error handling implemented

### Stitch Live Advisor
- [ ] **Live Advisor Page**
  - [ ] Camera/microphone permissions work
  - [ ] Live video streaming connects
  - [ ] Audio input/output works
  - [ ] AI responds in real-time
  - [ ] Connection errors handled
  - [ ] Graceful disconnect on page leave

### Product Intelligence Terminal
- [ ] **Product Analysis**
  - [ ] Analysis runs on product detail page
  - [ ] Stitch Score displays (0-100)
  - [ ] Market arbitrage analysis shows
  - [ ] Insights display correctly
  - [ ] Error handling for API failures

### Sale Intelligence
- [ ] **Garage Sale Analysis**
  - [ ] Analysis runs on garage sale detail page
  - [ ] Quality score displays
  - [ ] Arrival strategy suggestions show
  - [ ] Top categories listed
  - [ ] Error handling implemented

### Inbox Consultation
- [ ] **Stitch Consultation in Messages** ⚠️ **INCOMPLETE**
  - [ ] Currently has placeholder implementation
  - [ ] Implement backend API endpoint for consultation
  - [ ] Connect frontend to API endpoint
  - [ ] Generate negotiation advice from conversation
  - [ ] Display advice in chat UI
  - [ ] Error handling for failed consultations

### AI Usage Tracking
- [ ] **Freemium Limits**
  - [ ] AI usage logged in database
  - [ ] Free tier limits enforced (e.g., 10 scans/month)
  - [ ] Usage bar displays correctly
  - [ ] Upgrade modal shows when limit reached
  - [ ] Premium subscription unlocks unlimited usage

---

## 💬 5. Messaging & Communication

### Inbox System
- [ ] **Message Inbox**
  - [ ] Inbox page loads conversations
  - [ ] Conversations list displays
  - [ ] Unread message count shows
  - [ ] Click conversation opens chat
  - [ ] Messages load in conversation
  - [ ] Real-time message updates (if using Supabase Realtime)
  - [ ] Message sending works
  - [ ] Message receiving works
  - [ ] Typing indicators (optional enhancement)
  - [ ] Message read receipts (optional enhancement)

- [ ] **Conversation View**
  - [ ] Chat UI displays messages
  - [ ] Message sender/recipient clear
  - [ ] Timestamps display correctly
  - [ ] Scroll to bottom on new messages
  - [ ] Input field works
  - [ ] Send button works
  - [ ] Product context shows (if conversation about product)
  - [ ] Stitch consultation button works (see AI section above)

---

## 🗺️ 6. Location & Maps

### Map Features
- [ ] **Discovery Map**
  - [ ] Map loads on garage sales/search pages
  - [ ] Markers display for products/garage sales
  - [ ] Click marker shows popup/details
  - [ ] Map centering on user location works (with permission)
  - [ ] Map filtering works (by category, distance)
  - [ ] Location search works

- [ ] **Location Privacy**
  - [ ] Location privacy settings work
  - [ ] Users can choose location visibility
  - [ ] Private locations not exposed to public
  - [ ] Location picker for creating listings works
  - [ ] Geocoding works (address → lat/lng)

---

## ⭐ 7. Additional Features

### Favorites
- [ ] **Favorites System**
  - [ ] Add to favorites button works
  - [ ] Remove from favorites works
  - [ ] Favorites page displays saved items
  - [ ] Favorites persist across sessions
  - [ ] Favorite count shows on product cards

### Reviews & Ratings
- [ ] **Review System**
  - [ ] Users can leave reviews after order completion
  - [ ] Star ratings work
  - [ ] Review text input works
  - [ ] Reviews display on seller profile
  - [ ] Average rating calculates correctly
  - [ ] Review count displays

### Community Page
- [ ] **Community Features**
  - [ ] Community page loads
  - [ ] Community posts/activities display (if implemented)
  - [ ] All features work as expected

### Profile Pages
- [ ] **User Profiles**
  - [ ] Public profile page works
  - [ ] User's listings display
  - [ ] User's garage sales display
  - [ ] Reviews/ratings display
  - [ ] Profile edit works (for own profile)

### Sell Hub
- [ ] **Sell Hub Page**
  - [ ] Page loads correctly
  - [ ] Links to create listing/sale work
  - [ ] All features functional

---

## 🎨 8. UI/UX & Frontend

### Design & Layout
- [ ] **Responsive Design**
  - [ ] Mobile layout works (test on iPhone, Android)
  - [ ] Tablet layout works
  - [ ] Desktop layout works
  - [ ] No horizontal scrolling on mobile
  - [ ] Touch targets adequate size (min 44x44px)

- [ ] **Navigation**
  - [ ] Header/navigation works on all pages
  - [ ] Footer displays correctly (where applicable)
  - [ ] Links work correctly
  - [ ] Active page highlighted in nav
  - [ ] Mobile menu works (if applicable)

- [ ] **Loading States**
  - [ ] Loading spinners show during async operations
  - [ ] Skeleton screens for better UX (optional enhancement)
  - [ ] No blank screens during data fetching

- [ ] **Error States**
  - [ ] Error messages display user-friendly text
  - [ ] 404 page exists and is styled
  - [ ] 500 error page exists (or error boundary)
  - [ ] Network errors handled gracefully
  - [ ] Form validation errors clear and actionable

- [ ] **Accessibility**
  - [ ] Alt text on all images
  - [ ] ARIA labels where needed
  - [ ] Keyboard navigation works
  - [ ] Focus indicators visible
  - [ ] Screen reader compatibility (basic)

### Performance
- [ ] **Page Load Speed**
  - [ ] Initial page load < 3 seconds
  - [ ] Images optimized and lazy-loaded
  - [ ] Code splitting implemented
  - [ ] Bundle size reasonable (< 500KB gzipped)

- [ ] **Runtime Performance**
  - [ ] Smooth scrolling (60fps)
  - [ ] No laggy interactions
  - [ ] Infinite scroll/pagination works smoothly
  - [ ] Debouncing on search inputs

---

## 🔒 9. Security & Compliance

### Security Measures
- [ ] **Input Validation**
  - [ ] All user inputs validated on frontend
  - [ ] All user inputs validated on backend
  - [ ] SQL injection prevention (using parameterized queries)
  - [ ] XSS prevention (input sanitization)
  - [ ] File upload validation (type, size)

- [ ] **API Security**
  - [ ] Rate limiting on all endpoints
  - [ ] Authentication required for protected routes
  - [ ] Authorization checks (users can only access their data)
  - [ ] CORS properly configured
  - [ ] HTTPS enforced in production
  - [ ] API keys stored securely (never in client code)

- [ ] **Data Protection**
  - [ ] User data encrypted at rest (Supabase handles this)
  - [ ] Passwords hashed (Supabase handles this)
  - [ ] PII (personally identifiable information) handled carefully
  - [ ] GDPR compliance (if serving EU users)
    - [ ] Privacy policy page
    - [ ] Terms of service page
    - [ ] Cookie consent (if using cookies)
    - [ ] Data deletion request process

### Error Handling
- [ ] **Error Logging**
  - [ ] Backend errors logged (file or service like Sentry)
  - [ ] Frontend errors logged (Sentry, LogRocket, etc.)
  - [ ] No sensitive data in error logs
  - [ ] Error monitoring dashboard set up

- [ ] **Graceful Degradation**
  - [ ] App works if AI features fail
  - [ ] App works if maps fail to load
  - [ ] Fallback images for missing product photos
  - [ ] Offline handling (optional enhancement)

---

## 🚀 10. Deployment & Infrastructure

### Server Configuration
- [ ] **Production Server**
  - [ ] Server runs on production port
  - [ ] PM2 or process manager configured
  - [ ] Auto-restart on crash enabled
  - [ ] Log rotation configured
  - [ ] Health check endpoint works (`/api/health`)
  - [ ] Server can handle expected traffic

- [ ] **Build & Deploy**
  - [ ] Frontend builds successfully (`npm run build`)
  - [ ] Build artifacts in `dist/` folder
  - [ ] Server serves static files correctly
  - [ ] Environment variables set in production
  - [ ] Deployment script tested (`deploy.sh`)
  - [ ] Rollback plan exists

- [ ] **Domain & DNS**
  - [ ] Production domain configured
  - [ ] DNS records set correctly
  - [ ] SSL certificate installed (HTTPS)
  - [ ] SSL certificate auto-renewal set up (Let's Encrypt)

- [ ] **Monitoring**
  - [ ] Server uptime monitoring (UptimeRobot, etc.)
  - [ ] Error tracking (Sentry, etc.)
  - [ ] Performance monitoring (New Relic, etc.)
  - [ ] Database monitoring (Supabase dashboard)

### Backup & Recovery
- [ ] **Data Backup**
  - [ ] Database backups automated (Supabase handles this, verify settings)
  - [ ] Backup restoration tested
  - [ ] Storage bucket backups (if needed)

---

## 🧪 11. Testing

### Manual Testing
- [ ] **End-to-End User Flows**
  - [ ] New user signup → browse → create listing → receive message → complete order
  - [ ] User login → search → add to cart → checkout → payment → order confirmation
  - [ ] User creates garage sale → uploads photos → receives inquiries
  - [ ] User uses scanner → AI analysis → creates listing from results
  - [ ] User sends message → receives response → uses Stitch consultation

- [ ] **Cross-Browser Testing**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)
  - [ ] Mobile Safari (iOS)
  - [ ] Mobile Chrome (Android)

- [ ] **Edge Cases**
  - [ ] Empty search results
  - [ ] Empty cart checkout (should redirect)
  - [ ] Invalid payment card
  - [ ] Network timeout scenarios
  - [ ] Very large images
  - [ ] Special characters in inputs
  - [ ] Very long text inputs

### Automated Testing (Recommended)
- [ ] **Unit Tests**
  - [ ] Critical functions have unit tests
  - [ ] Test coverage > 70% for critical paths

- [ ] **Integration Tests**
  - [ ] API endpoints tested
  - [ ] Database operations tested

- [ ] **E2E Tests** (Optional but recommended)
  - [ ] Key user flows automated (Playwright, Cypress)

---

## 📚 12. Documentation

### User Documentation
- [ ] **Help/Support**
  - [ ] "How It Works" page complete and accurate
  - [ ] FAQ page (common questions)
  - [ ] Contact/support email or form
  - [ ] Help documentation for key features

### Developer Documentation
- [ ] **README.md**
  - [ ] Installation instructions
  - [ ] Environment variable setup
  - [ ] Development setup guide
  - [ ] Deployment instructions
  - [ ] API documentation (or link to API docs)

- [ ] **Code Documentation**
  - [ ] Complex functions have comments
  - [ ] API endpoints documented
  - [ ] Database schema documented

---

## 🔍 13. Pre-Launch Checklist

### Final Verification
- [ ] **Content Review**
  - [ ] Landing page copy is accurate
  - [ ] All placeholder text replaced
  - [ ] No "lorem ipsum" or test data visible
  - [ ] Legal pages (Privacy Policy, Terms of Service) written

- [ ] **Configuration Review**
  - [ ] All API keys are production keys (not test keys)
  - [ ] Payment processor in production mode (not test mode)
  - [ ] Email service configured (for password reset, etc.)
  - [ ] Analytics tracking set up (Google Analytics, etc.)

- [ ] **Performance Review**
  - [ ] Lighthouse score > 80 for all key pages
  - [ ] Core Web Vitals acceptable
  - [ ] No console errors in production build
  - [ ] No slow database queries

- [ ] **Security Review**
  - [ ] Security headers configured (Helmet.js)
  - [ ] No secrets in code or environment variables exposed
  - [ ] Rate limiting tested
  - [ ] Authentication tested thoroughly

### Launch Day
- [ ] **Monitoring**
  - [ ] Monitor error logs closely
  - [ ] Monitor server resources (CPU, memory)
  - [ ] Monitor database performance
  - [ ] Monitor API rate limits

- [ ] **Support**
  - [ ] Support email monitored
  - [ ] Response plan for critical bugs
  - [ ] Rollback procedure ready

---

## ⚠️ Critical Items (Must Complete Before Launch)

1. **Payment Integration** - Currently checkout creates orders without payment. This MUST be implemented.
2. **Inbox Stitch Consultation** - Placeholder implementation needs real API integration
3. **Environment Variables** - All production environment variables must be set
4. **Database Migrations** - All SQL migrations must be run in production
5. **Storage Buckets** - All Supabase storage buckets must be created with correct permissions
6. **Error Handling** - Comprehensive error handling on all critical paths
7. **Security Review** - Complete security audit before launch
8. **Legal Pages** - Privacy Policy and Terms of Service must be written
9. **Testing** - All core user flows tested end-to-end
10. **Monitoring** - Error tracking and monitoring set up

---

## 📝 Notes

- Items marked with ⚠️ are critical and must be completed
- Items marked as "optional enhancement" can be added post-MVP
- Test all features in production-like environment before launch
- Have a rollback plan ready
- Consider starting with a limited beta launch to catch issues

---

**Last Updated:** [Current Date]
**Status:** Pre-MVP Development Phase

