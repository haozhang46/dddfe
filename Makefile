TEMPLATE ?= demo

.PHONY: create build-cli test

build-cli:
	pnpm --filter create-dddfe build

test:
	pnpm test

# Prefer creating outside this repo, e.g. make create NAME=../my-app
# Uses scripts/create-app.sh → create-dddfe + git init + .cursor/install.sh
create:
ifndef NAME
	$(error NAME is required, e.g. make create NAME=../my-app)
endif
	./scripts/create-app.sh $(NAME) $(TEMPLATE)
