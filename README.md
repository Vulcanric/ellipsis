# ellipsis

Python-first control plane for autonomous web and mobile agents.

## Architecture

- `services/control_plane`: FastAPI API with async SQLAlchemy/PostgreSQL state, Redis events, and WebSocket run updates.
- `services/browser_mcp`: independent MCP Python server wrapping Playwright actions. The agent layer talks to MCP tools and never receives Playwright objects.
- `services/control_plane/worker.py`: ARQ worker that executes queued runs.
- `web`: Next.js App Router frontend with TypeScript, TanStack Query, Zustand, WebSocket updates, and NextAuth wiring.
- `tests`: deterministic API contract tests.

The first vertical slice is web-only. Mobile execution will use another adapter behind the same run and approval contracts.

## Run

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head
uvicorn services.control_plane.main:app --reload
```

The API is available at `http://localhost:8000` and its OpenAPI document at `http://localhost:8000/docs`.

Run the browser MCP server separately:

```bash
MCP_TRANSPORT=stdio python -m services.browser_mcp.server
```

## Test

```bash
pytest
```

Run the full packaged stack:

```bash
docker compose up --build
```

The Next.js app is available at `http://localhost:3000`; the API is at `http://localhost:8000`.

The browser MCP service is intentionally a separate process boundary. It can later run in a hardened worker container with per-run browser contexts, network policy, artifact storage, and approval enforcement.
# ellipsis
