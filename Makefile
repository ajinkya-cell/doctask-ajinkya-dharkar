.PHONY: setup run test

setup:
	python -m venv .venv
	.venv/bin/pip install -r requirements.txt || .venv/Scripts/pip install -r requirements.txt

run:
	python -m app.main

test:
	pytest -v
