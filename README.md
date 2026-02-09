# SecureScanner

Distributed code vulnerability scanner with a Go CLI, NestJS backend, and Nuxt dashboard.

## Status
Working CLI scanner (regex-based detectors). Backend scaffold started (NestJS + TypeORM entities + core endpoints). Frontend pending.

## Quick Start (CLI)
```bash
cd cli

go build -o securescanner ./cmd/securescanner
./securescanner scan ../ --format=text
```

## Quick Start (Backend)
```bash
cd backend
npm install
DATABASE_URL="postgresql://admin:password@localhost:5432/securescanner" npm run start:dev
```

## Quick Start (Frontend)
```bash
cd frontend
npm install
NUXT_PUBLIC_API_BASE="http://localhost:3000" npm run dev
```

## Repo Structure
- `cli/` Go CLI scanner
- `backend/` NestJS API scaffold
- `frontend/` Nuxt dashboard scaffold

## Next Steps
- Scaffold NestJS app + TypeORM entities
- Scaffold Nuxt app + base layout
- Add Docker Compose for services
