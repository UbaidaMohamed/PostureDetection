# Backend: MongoDB Atlas setup

This file explains how to configure the backend to use MongoDB Atlas (cloud hosted) instead of a local MongoDB instance.

## Steps

1. Create an Atlas cluster

   - Go to https://cloud.mongodb.com and sign in or create an account.
   - Create a new free tier cluster (or use an existing cluster).

2. Create a database user

   - In the Atlas UI go to "Database Access" and add a new database user.
   - Give the user a strong password and note the username/password for the connection string.

3. Whitelist your IP (or use 0.0.0.0/0 for testing)

   - In "Network Access" add the IP address(es) from which you'll connect.
   - For local development, you can add your current IP. For quick testing you may use 0.0.0.0/0 (not recommended for production).

4. Get the connection string
   - In the cluster view click "Connect" -> "Connect your application" and copy the connection string.
   - Example (replace placeholders):

```
mongodb+srv://<username>:<password>@cluster0.abcd.mongodb.net/posture-correction?retryWrites=true&w=majority
```

> If your password contains special characters, URL-encode them (e.g. `@` => `%40`).

5. Set `MONGODB_URI` in your environment
   - Create or edit `backend/.env` (don't commit it). Use the Atlas connection string:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/posture-correction?retryWrites=true&w=majority
```

6. Restart the backend
   - From project root:

```bash
# Using the venv or Node environment you normally use
node backend/server.js
# or
npm --prefix backend run dev
```

7. Verify
   - Check backend logs. On successful connection you should see `✅ Connected to MongoDB` and the server starting message.
   - Visit the health endpoint: `http://localhost:<PORT>/health`

## Notes & Troubleshooting

- If connection fails with TLS/SSL errors, ensure your environment can make outbound TLS connections and that the Node.js version supports the TLS version required by Atlas.
- If you see authentication errors, double-check username/password and URL-encoding.
- For production, store `MONGODB_URI` in your hosting provider's secret store (e.g., Heroku config vars, AWS Secrets Manager, Vercel env vars). Do NOT commit `.env` to the repo.

If you want, I can update `backend/.env` with a placeholder Atlas URL (I can leave it commented) or attempt to connect to your Atlas cluster if you provide a connection string (not recommended in chat).
