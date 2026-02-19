# Swagger/OpenAPI Setup

## Installation

Swagger dependencies are listed in `package.json`. Install with:

```bash
cd backend
pnpm install
```

## Configuration

Swagger is configured in `src/main.ts` and is available at:
- **Development:** `/api/v1/docs` (enabled by default)
- **Production:** `/api/v1/docs` (only if `ENABLE_SWAGGER=true` in `.env`)

## Features

- Interactive API explorer
- Try-it-out with API key (use `Authorization: Bearer {your_api_key}` or `Authorization: {your_api_key}`)
- Complete v1 endpoint documentation
- Request/response schemas
- Error response documentation

## Access

With the server running:
- Swagger UI: `http://localhost:5000/api/v1/docs`
- OpenAPI JSON: `http://localhost:5000/api/v1/docs-json`
- OpenAPI YAML: `http://localhost:5000/api/v1/docs-yaml`
