``` mermaid
graph TD;
  1[Mint Bond];
  1-->2[Bond Price];
  2-->3[BCV];
  3-->4[Multiplied];
  4-->5[DebtRatio];
  5-->6[Plus 1];
  6-->2;
  1-->7[Bond Price USD];
  7-->8[Treasury value Of 1 Principle];
  8-->9[Divided];
  9-->10[Payout of value];
  10-->7;
  11[Payout];
  11-->12[Treasury value of amt principle];
  12-->13[Divided];
  13-->2
  12-->14[BondCalculator Valuation];
  14-->15[Chainlink price * amount];
  15-->12;

```
