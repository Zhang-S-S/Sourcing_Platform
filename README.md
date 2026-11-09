# Supplier Sourcing Platform

Vue 3 + Vite frontend, Spring Boot 4.1.2 backend, MySQL 8.4.11 LTS database, and Java 21.

## Local Setup

Open a new terminal in VS Code. Ensure the database is running first, then start the backend:

```bash
cd "your_path/sourcing-platform"
node scripts/mysql.mjs start
cd backend
mvn spring-boot:run
```

In a second terminal, start the frontend:

```bash
cd "your_path/sourcing-platform"
npm install
cd frontend
npm run dev
```
