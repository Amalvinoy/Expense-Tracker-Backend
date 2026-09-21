# Expense Tracker Backend API

Production-ready REST API for the Expense Tracker application built with **Node.js**, **Express.js**, **TypeScript**, **MongoDB**, and **Mongoose**.

---

## 1. Features & Architecture

- **Node.js & Express.js:** Fast, asynchronous HTTP microservice layer.
- **TypeScript (Strict Mode):** End-to-end type safety, typed controllers, middlewares, and models.
- **MongoDB + Mongoose:** Document-oriented persistence with schema validation, indexes, and connection pooling.
- **Security by Default:**
  - `helmet`: Security HTTP headers (XSS filter, noSniff, frameguard).
  - `cors`: Configurable cross-origin resource sharing.
  - JSON body size limits (1MB).
  - Sanitized error messages in production.
- **Enterprise Middleware:**
  - `X-Request-Id` tracing on every request.
  - Structured request logging with response times and status codes.
  - Centralized operational error hierarchy (`AppError`, `BadRequestError`, `NotFoundError`, etc.).
  - Standardized JSON responses for both successes and errors conforming to `docs/API_CONTRACT.md`.
- **Process Resilience:**
  - Pre-flight database connectivity verification before listening.
  - Graceful shutdown handling on `SIGINT`, `SIGTERM`, `unhandledRejection`, and `uncaughtException`.

---

## 2. API Contract Specification

All endpoints adhere to the unified envelope structure:

### Success Response (`2xx`)
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

### Error Response (`4xx` / `5xx`)
```json
{
  "success": false,
  "message": "Validation failed on submitted fields.",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be a positive number greater than 0."
    }
  ]
}
```

For full endpoint documentation, refer to [`docs/API_CONTRACT.md`](../docs/API_CONTRACT.md).

---

## 3. Environment Variables

Create a `.env` file in the root of `Expense-Tracker-Backend`:

```env
# Server Environment
NODE_ENV=development
PORT=5000

# Database Connection (MongoDB)
MONGODB_URI=mongodb://127.0.0.1:27017/expense_tracker

# JWT Authentication Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRES_IN=7d

# CORS Allowed Origin
CORS_ORIGIN=*
```

---

## 4. Development Scripts

```bash
# Start development server with live reload
npm run dev

# Run TypeScript type check
npm run type-check

# Run ESLint validation
npm run lint

# Build production bundle
npm run build

# Start compiled production server
npm start
```

---

## 5. Health Check Endpoint

```bash
curl -X GET http://localhost:5000/api/health
```

Expected Response:
```json
{
  "success": true,
  "message": "Expense Tracker API is running",
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-09-19T15:00:00.000Z",
    "uptime": 12
  }
}
```
