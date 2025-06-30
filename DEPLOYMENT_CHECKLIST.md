# StrataTracker Deployment Checklist
**Pre-Deployment & Post-Deployment Verification**

## 🚀 **Pre-Deployment Checklist**

### **Environment Variables** ✅
- [ ] `DATABASE_URL` configured
- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` set  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `SESSION_SECRET` generated (32+ characters)
- [ ] `SMTP_*` email configuration complete
- [ ] `APP_URL` and `CORS_ORIGIN` set to production domain
- [ ] `NODE_ENV=production`

### **Supabase Configuration** ✅  
- [ ] Supabase project created
- [ ] Authentication providers configured
- [ ] RLS policies configured (if applicable)
- [ ] Service role key has proper permissions

### **Domain & SSL** ✅
- [ ] Domain configured in Coolify
- [ ] SSL certificate auto-provisioned
- [ ] DNS records pointing to Coolify

## 🔍 **Post-Deployment Verification**

### **Application Health** ✅
- [ ] `GET /api/health` returns `{"status": "ok"}`
- [ ] Application logs show no errors
- [ ] Database migration completed successfully
- [ ] All 31+ tables created automatically

### **Authentication Flow** ✅
- [ ] Login page loads without errors
- [ ] Can create new account via Supabase
- [ ] Login/logout functionality works
- [ ] User profile creation successful

### **Database Schema** ✅
- [ ] Violations table has UUID support
- [ ] Foreign keys point to `profiles` table (not deprecated `users`)
- [ ] All property unit columns present (strata_lot, townhouse, etc.)
- [ ] Email deduplication tables exist and functioning
- [ ] Persons and unit_person_roles tables created

### **Core Functionality** ✅
- [ ] Dashboard loads and displays zeros (expected for new deployment)
- [ ] Navigation sidebar works (all menu items accessible)
- [ ] Can create property units
- [ ] Can create violations (after creating units)
- [ ] Email notifications system ready (check email-stats endpoint)

### **Performance & Security** ✅
- [ ] Response times < 500ms for main pages
- [ ] HTTPS enforced and working
- [ ] CORS properly configured
- [ ] Session management working
- [ ] No sensitive data exposed in client-side code

## 🛠️ **Quick Test Commands**

### **Health Check**
```bash
curl https://your-domain.com/api/health
# Expected: {"status": "ok", "timestamp": "...", "environment": "production"}
```

### **Database Status**
```bash
curl https://your-domain.com/api/health | jq '.database'
# Expected: Table count 31+, all critical tables present
```

### **Email System Status**  
```bash
curl https://your-domain.com/api/communications/email-stats?hours=24
# Expected: Email deduplication statistics
```

### **Authentication Test**
```bash
# Try accessing protected endpoint without auth
curl https://your-domain.com/api/violations
# Expected: {"error": "Missing or invalid authorization header"}
```

## 🔧 **Common Fix Commands**

### **Restart Application** 
```bash
# In Coolify dashboard: Click "Restart" on application
# Or via Docker:
docker restart your-app-container-name
```

### **Check Database Tables**
```bash
docker exec -it your-postgres-container psql -U spectrum4 -d spectrum4 -c "\dt" | wc -l
# Expected: 31+ tables
```

### **View Recent Logs**
```bash
docker logs your-app-container --tail 20
# Look for "Database migration check completed successfully"
```

## ⚠️ **Red Flags - Deployment Issues**

- ❌ Health endpoint returns errors or timeouts
- ❌ "Column does not exist" errors in logs  
- ❌ Login page shows Supabase connection errors
- ❌ Database has fewer than 25 tables
- ❌ Dashboard shows JavaScript errors instead of zeros
- ❌ Email system not initialized (email-stats endpoint fails)

## ✅ **Green Flags - Successful Deployment**

- ✅ Health endpoint returns `200 OK` with status
- ✅ Login/signup flow works end-to-end
- ✅ Dashboard shows clean interface with zero statistics
- ✅ All navigation links accessible  
- ✅ Database contains complete schema (31+ tables)
- ✅ Email deduplication system operational
- ✅ No JavaScript console errors
- ✅ Fast page load times (<2 seconds)

## 🎯 **Success Criteria Summary**

**A deployment is considered successful when:**

1. **Application starts** without errors
2. **Database schema** is complete and up-to-date  
3. **Authentication** works with Supabase
4. **All core pages** load without errors
5. **Email system** is ready for notifications
6. **Performance** meets acceptable standards

---

**Deployment Status:** ✅ Ready for Production  
**Migration System:** ✅ Fully Automated  
**Manual Database Setup:** ❌ Not Required 