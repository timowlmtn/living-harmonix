# Living Harmonix

Living Harmonix is an AI-driven Feng Shui agent platform that helps you build, customize, and deploy intelligent Feng Shui services for your applications. Whether you’re integrating our agent into a web app, automating spatial analysis, or extending the core engine, this repo contains everything you need to get started.

    # Clone the repo
    git clone https://github.com/your-org/livingharmonix.git
    cd livingharmonix

    # Install dependencies
    npm install

    # Create your local environment file
    cp .env.example .env.local
    # Edit `.env.local` with your DOMAIN, GITHUB_TOKEN, DATABASE_URL, etc.

    # Run in development mode
    npm run dev

## Prerequisites

- Node.js ≥ 14.x  
- npm or Yarn  
- Python 3.8+ (for the agent engine)  

## Configuration

- Copy `.env.example` → `.env.local`  
    - `DOMAIN=your-domain.com`  
    - `GITHUB_TOKEN=ghp_…`  
    - `DATABASE_URL=postgres://…`  
- (Optional) Enable S3 artifacts:  
    - `AWS_ACCESS_KEY_ID`  
    - `AWS_SECRET_ACCESS_KEY`  

## Architecture

- **Frontend**  
    - Next.js + Tailwind CSS  
    - `/pages` – Static & dynamic agent interfaces  
- **Backend**  
    - Node.js (Express) API  
    - `/api/agent` – Routes for Feng Shui queries  
- **Agent Engine**  
    - Python service wrapping Llama or OpenAI models  
    - `/engine` – Core inference & prompt logic  
- **Database**  
    - PostgreSQL for user sessions & logs  
    - Sequelize ORM for migrations  

## Local Development

    # Start API server
    npm run api:dev

    # Start agent engine
    python -m engine.server

    # Start frontend
    npm run dev

## Testing & Linting

- Run unit tests  
    - `npm test`  
    - `pytest engine/tests/`  
- Lint code  
    - `npm run lint`  
    - `npm run lint:fix`  

## CI/CD

- GitHub Actions workflows in `.github/workflows/`  
    - `build.yml` – install, lint, test  
    - `deploy.yml` – deploy to Vercel & AWS  

## Contributing

- Fork this repo  
    - `git checkout -b feat/your-feature`  
    - `git commit -m "feat: …"`  
    - `git push origin feat/your-feature`  
    - Open a pull request against `main`  

## License

MIT © 2025 Living Harmonix Inc.
