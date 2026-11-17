export function selectChiaCoins(amountStr: string, unspentCoins: any[]): any[] {
  if (!amountStr) return [];

  const xch = parseFloat(amountStr.trim().replace(",", "."));
  if (isNaN(xch) || xch <= 0) return [];

  const requiredMojos = Math.round(xch * 1_000_000_000_000);
  const coins = unspentCoins || [];

  // 🕵️‍♂️ ЛОГ №1: Смотрим, сколько вообще монет прилетело в селектор из кэша дашборда
  console.log("🕵️‍♂️ ВСЕГО МОНЕТ В СЕЛЕКТОРЕ:", coins.length, coins);

  const sortedCoins = [...coins].sort((a: any, b: any) => 
    Number(b.coin.amount) - Number(a.coin.amount)
  );

  const selectedItems: any[] = [];
  let accumulatedAmount = 0;

  for (const item of sortedCoins) {
    // 🕵️‍♂️ ЛОГ №2: Смотрим на флаги конкретной монеты, перед тем как её скипнуть
    if (item.isSpent === true || item.isLocked === true) {
      console.log(`⚠️ СКИПНУТА МОНЕТА ID: ${item.coin_id || item.coin?.parent_coin_info}, because isSpent=${item.isSpent}, isLocked=${item.isLocked}`);
      continue;
    }

    selectedItems.push(item);
    accumulatedAmount += Number(item.coin.amount);
    
    if (accumulatedAmount >= requiredMojos) {
      break; 
    }
  }

  // 🕵️‍♂️ ЛОГ №3: Итог сборщика
  console.log(`🎯 ИТОГ СЕЛЕКЦИИ: Собрано монет: ${selectedItems.length}, Сумма можо: ${accumulatedAmount}`);

  return selectedItems;
}
