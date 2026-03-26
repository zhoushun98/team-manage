# GPT Team Management & Redemption Auto-Invite System

A FastAPI-based management platform for ChatGPT Team accounts. Administrators can manage Team accounts and redemption codes, and end users can redeem codes to join a Team automatically.

## Features

### Admin Features
- Team account management
  - Import Team accounts (single or batch)
  - Parse and extract AT token, email, and Account ID
  - Sync Team info (name, plan, expiration, member count)
  - Manage Team members (view, add, remove, revoke invites)
  - Monitor Team status (`active`, `full`, `expired`, `error`, `banned`)
- Redemption code management
  - Generate single or batch codes
  - Custom code and optional expiration
  - Filter by status (`unused`, `used`, `expired`, `warranty_active`)
  - Export codes to Excel
- Usage records
  - Filter by email, code, Team ID, and date range
  - Paginated views and summary stats
- System settings
  - Proxy configuration (HTTP/SOCKS5)
  - Admin password update
  - Runtime log level update
  - Low-stock webhook settings

### User Features
- Redeem flow
  - Submit email + redemption code
  - Auto-validate code
  - Auto-select Team (or use existing flow fallback)
  - Send Team invitation email
- Warranty flow
  - Query warranty status by email/code
  - Support one-click remediation actions in supported scenarios

### Integration
- Low-stock webhook notification for external automation
- External auto-import integration guide: [`integration_docs.md`](integration_docs.md)
- `X-API-Key` is scoped to `POST /admin/teams/import` only

## Tech Stack
- Backend: FastAPI, Uvicorn
- Database: SQLite, SQLAlchemy 2.x, aiosqlite
- Templates: Jinja2
- HTTP client: curl-cffi, httpx
- Auth: Session-based admin auth (bcrypt)
- Frontend: HTML, CSS, vanilla JavaScript

## Requirements
- Python 3.10+
- `uv` (recommended package/runtime manager)
- Docker + Docker Compose (optional)

## Quick Start (Local with uv)

1. Clone and enter the project:

```bash
git clone https://github.com/tibbar213/team-manage.git
cd team-manage
```

2. Create environment config:

```bash
cp .env.example .env
```

3. Install dependencies:

```bash
uv sync
```

4. Initialize database:

```bash
uv run python init_db.py
```

5. Start development server:

```bash
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8008
```

Or use the helper script:

```bash
./local_start.sh
```

6. Open:
- User redeem page: `http://127.0.0.1:8008/`
- Admin login: `http://127.0.0.1:8008/login`
- Admin dashboard: `http://127.0.0.1:8008/admin`

Default admin credentials (if unchanged):
- Username: `admin`
- Password: `admin123`

## Docker Deployment

```bash
cp .env.example .env
docker compose up -d --build
```

Useful commands:

```bash
docker compose logs -f
docker compose down
docker compose up -d --build
```

## Project Structure

```text
team-manage/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── db_migrations.py
│   ├── dependencies/
│   ├── routes/
│   ├── services/
│   ├── templates/
│   └── static/
├── data/
├── init_db.py
├── test_webhook.py
├── integration_docs.md
├── pyproject.toml
├── uv.lock
├── docker-compose.yml
└── Dockerfile
```

## Configuration Notes

Copy `.env.example` to `.env` and review at least:
- `SECRET_KEY`
- `ADMIN_PASSWORD`
- `DEBUG`
- `DATABASE_URL`
- `PROXY_ENABLED` / `PROXY`

Security recommendations for production:
- Change default `ADMIN_PASSWORD`
- Set a strong `SECRET_KEY`
- Set `DEBUG=False`
- Restrict network access to admin endpoints

## API Overview

Key endpoints:
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/change-password`
- `POST /redeem/verify`
- `POST /redeem/confirm`
- `POST /warranty/check`
- `POST /warranty/enable-device-auth`
- `POST /admin/teams/import` (supports Session auth or `X-API-Key`)

For integration details and payload formats, see [`integration_docs.md`](integration_docs.md).

## Troubleshooting

### Database initialization issues

```bash
uv run python init_db.py
```

### Cannot call external ChatGPT-related APIs
- Verify network/proxy settings in Admin Settings
- Verify token validity and account status
- Check application logs for upstream error details

### Team import fails
- Verify token format and expiration
- Verify account identity consistency (email/account mapping)
- Verify required fields for refresh flow (`refresh_token` + `client_id`)

## License

This project is provided for learning and research purposes.

## Contributing

Issues and pull requests are welcome.

## Compliance Notice

Use this project only for lawful account management and in compliance with applicable service terms.
