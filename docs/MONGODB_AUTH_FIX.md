# Quick Fix: MongoDB Authentication Error

## Error Message
```
Failed to get albums: Error: Command find requires authentication
```

## Immediate Solution

Your MongoDB requires authentication, but the connection string doesn't include credentials.

### Step 1: Update Environment Variable

Edit your `.env.production` file on the server:

```bash
cd /var/www/openshutter/demo/openshutter
nano .env.production
```

### Step 2: Update MONGODB_URI

Change from:
```env
MONGODB_URI=mongodb://localhost:27017/openshutter
```

To (with authentication):
```env
MONGODB_URI=mongodb://username:password@localhost:27017/openshutter?authSource=admin
```

**Replace:**
- `username` - Your MongoDB username
- `password` - Your MongoDB password (see special characters note below)
- `admin` - The authentication database (usually `admin`)

**⚠️ IMPORTANT - Special Characters in Password:**
If your password contains special characters, you MUST URL-encode them:
- `!` = `%21`
- `@` = `%40`
- `#` = `%23`
- `$` = `%24`
- `%` = `%25`
- `&` = `%26`
- `/` = `%2F`
- `:` = `%3A`

**Example:** If your password is `mypass!123`, use `mypass%21123` in the connection string:
```env
MONGODB_URI=mongodb://user:mypass%21123@localhost:27017/openshutter?authSource=admin
```

### Step 3: If You Don't Have MongoDB User Yet

Connect to MongoDB and create a user:

```bash
# Connect to MongoDB (as admin)
mongosh "mongodb://localhost:27017/admin"
# Or if admin requires auth:
mongosh "mongodb://admin_user:admin_password@localhost:27017/admin"
```

In MongoDB shell:
```javascript
// Create user for openshutter database
use admin

db.createUser({
  user: "openshutter_user",
  pwd: "your_secure_password_here",
  roles: [
    { role: "readWrite", db: "openshutter" }
  ]
})
```

Then use:
```env
MONGODB_URI=mongodb://openshutter_user:your_secure_password_here@localhost:27017/openshutter?authSource=admin
```

### Step 4: Test Connection

```bash
# Test the connection string
mongosh "mongodb://username:password@localhost:27017/openshutter?authSource=admin"

# If successful, try a query:
use openshutter
db.albums.find().limit(1)
```

### Step 5: Restart Application

```bash
# If using PM2
pm2 restart openshutter-backend
pm2 restart openshutter-frontend

# Or restart all
pm2 restart all

# Check logs
pm2 logs openshutter-backend
```

## Common Connection String Formats

### Local MongoDB with Authentication
```env
MONGODB_URI=mongodb://username:password@localhost:27017/openshutter?authSource=admin
```

### Remote MongoDB with Authentication
```env
MONGODB_URI=mongodb://username:password@mongodb-host:27017/openshutter?authSource=admin
```

### MongoDB Atlas (Cloud)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/openshutter?retryWrites=true&w=majority
```

### MongoDB Without Authentication (NOT RECOMMENDED for production)
```env
MONGODB_URI=mongodb://localhost:27017/openshutter
```

## Verify Fix

After updating and restarting:

1. Check backend logs for MongoDB connection:
```bash
pm2 logs openshutter-backend | grep -i mongo
```

2. Test API endpoint:
```bash
curl http://localhost:5000/api/albums
```

3. Check frontend:
```bash
curl http://localhost:4000
```

## Still Having Issues?

1. **Verify MongoDB is running:**
   ```bash
   sudo systemctl status mongod
   ```

2. **Check MongoDB authentication status:**
   ```bash
   sudo cat /etc/mongod.conf | grep -A 2 "security:"
   ```

3. **Test connection manually:**
   ```bash
   mongosh "mongodb://username:password@localhost:27017/openshutter?authSource=admin"
   ```

4. **Check user permissions:**
   ```javascript
   use admin
   db.getUser("openshutter_user")
   ```

For more details, see `docs/SERVER_DEPLOYMENT.md` section "MongoDB Authentication Setup".
