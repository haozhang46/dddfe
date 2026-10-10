TEMPLATE ?= demo

.PHONY: create build-cli test

build-cli:
	pnpm --filter create-dddfe build

test:
	pnpm test

# Prefer creating outside this repo, e.g. make create NAME=../my-app
create: build-cli
ifndef NAME
	$(error NAME is required, e.g. make create NAME=../my-app)
endif
	pnpm exec create-dddfe $(NAME) --template $(TEMPLATE)
	cd $(NAME) && pnpm install && git init
