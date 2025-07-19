# Living Harmonix

Living Harmonix is an AI-driven Feng Shui agent platform.

The mission of this project is to create an AI agent that
helps the user improve their living space by harnessing
positive energy or "chi."

By paying attention to your natural environment and using
this tool, you can get valuable information to arrange your
living space in ways that optimize harmony and balance.

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
- Python 3.13+ (for the agent engine)  

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
    - React Static Page infrastructure  

- **Agent Engine**  
    - Python service on Lambda functions using AWS Bedrock
  
- **Database**  
    - S3 as a data lake

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
