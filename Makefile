.PHONY: test test-api test-e2e test-e2e-ui test-e2e-operators test-e2e-operators-ui

# Unit tests (vitest)
test:
	npm run test

# API tests (BFF Playwright, runs from etnr-bff/tests)
test-api:
	cd ../etnr-bff/tests && npx playwright test

# E2E UI tests — all specs, headless
test-e2e:
	npx playwright test

# E2E UI tests — all specs, headed (visible browser)
test-e2e-ui:
	npx playwright test --headed

# E2E operators spec only, headless
test-e2e-operators:
	npx playwright test e2e/operators.spec.ts --reporter=list

# E2E operators spec only, headed
test-e2e-operators-ui:
	npx playwright test e2e/operators.spec.ts --headed
