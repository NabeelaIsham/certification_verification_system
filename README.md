# Certification Verification System

## Local Setup

### Backend

1. Copy `.env.example` to `.env`
2. Fill in your MongoDB and email settings
3. Install dependencies

```bash
cd Backend
npm install
```

4. Start the backend

```bash
npm run dev
```

### Frontend

1. Install dependencies

```bash
cd Frontend
npm install
```

2. Start the frontend

```bash
npm run dev
```

## Testing

### Backend

```bash
cd Backend
npm test
```

### Frontend

```bash
cd Frontend
npm test
```

## CI

A GitHub Actions workflow is configured at `.github/workflows/ci.yml`.

## Docker

A simple Docker image can be built for the backend with the provided `docker-compose.yml`.
