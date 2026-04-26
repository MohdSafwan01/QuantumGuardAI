# QuantumGuard AI

> AI-powered quantum vulnerability scanner

QuantumGuard AI scans your codebase for quantum-vulnerable cryptographic patterns and provides AI-driven fix recommendations using Groq (LLaMA 3.3 70B).

## Architecture

```
QuantumGuard/
├── frontend/          # React + Vite + Tailwind CSS (Dashboard SPA)
├── api-server/        # Node.js + Express (REST API)
├── scanner-engine/    # Python + FastAPI (AST-based vulnerability scanner)
```

## Services

| Service | Stack | Port | Description |
|---------|-------|------|-------------|
| **Frontend** | React, Vite, Tailwind CSS | 5173 | Dashboard SPA for scan results & reports |
| **API Server** | Node.js, Express | 3001 | REST API — GitHub fetching, routing, report generation |
| **Scanner Engine** | Python, FastAPI | 8000 | AST-based vulnerability scanner for JS/TS & Python |

## External Services

- **Supabase** — PostgreSQL database, Auth, Storage
- **Groq API** — LLaMA 3.3 70B for AI fix recommendations (free tier)

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/your-username/QuantumGuard.git
cd QuantumGuard

# 2. Copy env file and fill in your keys
cp .env.example .env

# 3. Install & run each service (see individual READMEs)
```

## License

MIT
