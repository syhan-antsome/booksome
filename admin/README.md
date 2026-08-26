# BookSome Admin

React-admin 5 operations console for the BookSome Spring Boot API.

## Local development

```sh
cp .env.example .env.local
npm install
npm run dev
```

Use an account configured in the API's `BOOKSOME_ADMIN_EMAILS`. The API must allow `http://localhost:5173` or the local origin in its CORS configuration.

## Production build

```sh
VITE_API_BASE_URL=https://api.booksome.top npm run build
```

Serve the generated `dist/` directory from `https://admin.booksome.top`. Keep the admin site out of search indexes and never connect this browser application directly to MariaDB.

The production rollout also requires:

1. An `admin.booksome.top` DNS record pointing to the BookSome server.
2. A renewed `booksome.top` certificate that also contains `admin.booksome.top`.
3. `BOOKSOME_ADMIN_EMAILS` and the admin origin in the API environment.
4. The generated `dist/` files under `/var/www/booksome-admin/current`.
5. The Nginx server block in `deploy/nginx-admin.conf.example`.
