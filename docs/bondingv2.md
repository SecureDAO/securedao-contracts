# Bonding V2

### Bond Depository bondPrice

`BCV * DEBT_RATIO`

### Bond Depository payoutFor

`Treasury.valueOf(amount, token) / bondPrice`

### Bond Depository bondPriceInUSD

`Treasury.valueOf(1 Token, token) / payoutFor(Treasury.valueOf(1 Token, token))`

### Treasury valueOf

`BondingCalculator.valuation(amount, token)`

### Bonding Calculator valuation
#### Chainlink

`assetPrice * amount`
