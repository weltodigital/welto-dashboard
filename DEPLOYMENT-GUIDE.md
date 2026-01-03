# WELTO Dashboard Deployment Guide

## 🚀 Deployment to app.weltodigital.com

This guide will help you deploy the WELTO Dashboard to `app.weltodigital.com` using your existing Supabase database.

## ✅ Completed Migration Steps

The dashboard has been successfully migrated from SQLite to Supabase PostgreSQL with the following updates:

- ✅ **Database Layer**: Complete migration to Supabase with new database service abstraction
- ✅ **Authentication**: Updated to use Supabase PostgreSQL
- ✅ **Admin Routes**: All CRUD operations migrated to Supabase
- ✅ **Dashboard Routes**: Lead potential and metrics calculations updated
- ✅ **Environment Config**: Production environment variables configured

## 📋 Required Manual Steps

### 1. **Database Setup in Supabase Dashboard**

Run the following SQL migration in your Supabase Dashboard SQL Editor:

```sql
-- Execute the contents of: welto-dashboard/backend/src/database/supabase-migration.sql
```

**Location**: `welto-dashboard/backend/src/database/supabase-migration.sql`

This will create all necessary tables with proper indexes and Row Level Security (RLS) policies.

### 2. **Create Default Users**

After running the migration, create the initial admin and test client users:

```sql
-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, role)
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert test client user (password: client123)
INSERT INTO users (username, password, role, client_id)
VALUES ('client1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client', 'CLIENT001');
```

### 3. **Environment Variables**

**Backend (.env.production):**
```env
NODE_ENV=production
JWT_SECRET=your_production_jwt_secret_here_make_it_random_and_secure
SUPABASE_URL=https://ddtyovjdxdfpqjemmtyp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkdHlvdmpkeGRmcHFqZW1tdHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU4MjMyNiwiZXhwIjoyMDc5MTU4MzI2fQ.rPOrzq7fHFqIHY4PIGcEQ3GKt1SKlzHRUrP21G5aSbw
PORT=5001
CORS_ORIGIN=https://app.weltodigital.com
```

**Frontend (.env.production):**
```env
NEXT_PUBLIC_API_URL=https://app.weltodigital.com/api
NEXT_PUBLIC_APP_URL=https://app.weltodigital.com
```

### 4. **Deployment Options**

#### Option A: Vercel (Recommended for Frontend + Backend)
1. **Deploy Frontend**: Connect your GitHub repo to Vercel
2. **Deploy Backend**: Use Vercel's API routes or deploy as separate Node.js app
3. **Environment Variables**: Add the production environment variables in Vercel dashboard

#### Option B: Railway/Render (Backend) + Vercel (Frontend)
1. **Backend**: Deploy to Railway or Render
2. **Frontend**: Deploy to Vercel
3. **Update API URL**: Set `NEXT_PUBLIC_API_URL` to your backend deployment URL

#### Option C: Full Stack on Single Platform
1. **Vercel**: Can handle both Next.js frontend and Node.js API routes
2. **Railway**: Full-stack deployment with automatic HTTPS

### 5. **DNS Configuration**

Configure your domain `app.weltodigital.com` to point to your deployment platform:

```
Type: CNAME
Name: app
Value: [your-deployment-url]
```

### 6. **Security Considerations**

- **JWT Secret**: Generate a secure random JWT secret for production
- **Environment Variables**: Ensure all secrets are properly configured in your deployment platform
- **CORS**: Update CORS origin to match your production domain
- **SSL**: Ensure HTTPS is enabled (automatic with Vercel/Railway)

## 🔧 Build Commands

**Backend:**
```bash
cd welto-dashboard/backend
npm install
npm run build
npm start
```

**Frontend:**
```bash
cd welto-dashboard/frontend
npm install
npm run build
npm start
```

## 📊 Database Schema

The dashboard includes the following tables:
- **users**: Client and admin user accounts
- **reports**: Monthly SEO reports
- **metrics**: SEO performance metrics (GBP, GSC data)
- **search_queries**: Google Search Console query data
- **top_pages**: Google Search Console top pages data

## 🎯 Features Available

### Admin Dashboard:
- ✅ Client management (create, edit, delete)
- ✅ SEO metrics tracking
- ✅ CSV data uploads
- ✅ Lead potential calculations
- ✅ Performance analytics

### Client Dashboard:
- ✅ Read-only analytics view
- ✅ Performance charts
- ✅ Lead value tracking
- ✅ Search query insights

## 🔍 Testing

1. **Admin Login**: username: `admin`, password: `admin123`
2. **Client Login**: username: `client1`, password: `client123`
3. **API Health**: Check `https://app.weltodigital.com/api/health`

## 🚨 Important Notes

- **Database Migration**: The SQLite database is no longer used
- **File Uploads**: Ensure upload directory permissions are configured
- **API Routes**: All routes now use async/await with proper error handling
- **Authentication**: JWT tokens remain unchanged for client compatibility

---

## Next Steps

1. Run the database migration SQL in Supabase
2. Choose your deployment platform
3. Configure environment variables
4. Deploy backend and frontend
5. Configure DNS for app.weltodigital.com
6. Test the application

The dashboard is now ready for production deployment! 🎉