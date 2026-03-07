const COINGECKO_IDS: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  doge: 'dogecoin',
  ltc: 'litecoin',
  bnb: 'binancecoin',
  pol: 'polygon-ecosystem-token',
  xrp: 'ripple',
  trx: 'tron',
  sol: 'solana',
  algo: 'algorand',
  usdt: 'tether',
};

export async function fetchCryptoPrices(): Promise<Record<string, number>> {
  try {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    );
    
    if (!response.ok) throw new Error('Failed to fetch prices');
    
    const data = await response.json();
    const prices: Record<string, number> = {};
    
    Object.entries(COINGECKO_IDS).forEach(([symbol, geckoId]) => {
      if (data[geckoId]) {
        prices[symbol] = data[geckoId].usd;
      }
    });
    
    return prices;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return {};
  }
}
