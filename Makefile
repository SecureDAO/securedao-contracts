.PHONY: slither

slither:
	slither . --config-file slither.config.json

rebuild:
	rm -rf artifacts/ crytic-export/
	npx hardhat compile --force
