.PHONY: build

build-prod:
	yarn build

install:
	yarn install

build:
	yarn build

run:
	yarn start

add-serve:
	yarn dlx serve -s build

prettier-install:
	npm install --save-dev prettier eslint eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks

prettier:
	npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,css,md}"

test-creds:
	@echo "Testing AWS credentials..."
	node src/__tests__/testAwsCredentials.mjs

sync-geovision:
	aws s3 sync data/geovision/2025-06-13 \
        s3://azrius-data/geovision/test-$(shell date +%F)/unit-test-project/$(shell date +%F)

test-list-project:
	@echo "Testing list project..."
	cd web/frontend && node src/__tests__/testListProjectContents.js

test-clean:
	@echo "Cleaning up test files..."
	aws s3 rm s3://azrius-data/geovision --recursive \
  		--exclude "*" --include "test*"
