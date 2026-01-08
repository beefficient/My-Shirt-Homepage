// Simple test harness for quote calculation (mirrors the in-page algorithm)
function parseColors(val) {
  const n = parseInt(val, 10);
  if (!isFinite(n) || n <= 0) return 5;
  return n;
}

function calculateQuote({ qty, numColorsVal, lightOnDark, locations }) {
  const numColors = parseColors(numColorsVal);
  const basePerGarment = 8.00;
  const colorSurchargePerExtraColor = 1.50;
  const underbasePerGarment = 1.50;
  const setupFeePerColorPerLocation = 30.00;

  const extraColorCount = Math.max(0, numColors - 1);
  let pricePerGarment = basePerGarment + (extraColorCount * colorSurchargePerExtraColor);
  if (lightOnDark === 'Yes') pricePerGarment += underbasePerGarment;

  const outsideLoc = locations.some(l => l !== 'Front Center' && l !== 'Back Center');
  const difficultyFactor = outsideLoc ? 1.12 : 1.0;

  const numberOfLocations = locations.length;
  const setupFee = setupFeePerColorPerLocation * numColors * numberOfLocations;
  const garmentsCost = pricePerGarment * qty * difficultyFactor;
  let subtotal = garmentsCost + setupFee;

  let discountPct = 0;
  if (qty >= 500) discountPct = 0.25;
  else if (qty >= 250) discountPct = 0.20;
  else if (qty >= 100) discountPct = 0.10;
  else if (qty >= 50) discountPct = 0.05;

  const discount = subtotal * discountPct;
  const total = subtotal - discount;

  return {
    pricePerGarment: Number(pricePerGarment.toFixed(2)),
    garmentsCost: Number(garmentsCost.toFixed(2)),
    setupFee: Number(setupFee.toFixed(2)),
    discountPct,
    discount: Number(discount.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

// Sample scenarios
const scenarios = [
  { name: 'Small single color front', qty: 24, numColorsVal: '1 color', lightOnDark: 'No', locations: ['Front Center'] },
  { name: 'Medium two color outside loc', qty: 120, numColorsVal: '2 colors', lightOnDark: 'Yes', locations: ['Left Chest', 'Back Center'] },
  { name: 'Large multi color many locs', qty: 350, numColorsVal: '4 colors', lightOnDark: 'No', locations: ['Front Center', 'Back Center', 'Sleeve'] },
  { name: '7 colors small qty', qty: 12, numColorsVal: '7 colors', lightOnDark: 'Not sure', locations: ['Front Center'] },
  { name: 'Front 5, Back 1 example', qty: 24, numColorsVal: null, lightOnDark: 'No', locations: [ { name: 'Front Center', numColorsVal: '5 colors' }, { name: 'Back Center', numColorsVal: '1 color' } ] }
];

for (const s of scenarios) {
  const r = calculateQuote({ qty: s.qty, numColorsVal: s.numColorsVal, lightOnDark: s.lightOnDark, locations: s.locations });
  console.log('--- ' + s.name + ' ---');
  console.log('Qty:', s.qty, 'Colors:', s.numColorsVal, 'LightOnDark:', s.lightOnDark, 'Locations:', s.locations.join(', '));
  console.log('Price per garment:', r.pricePerGarment);
  console.log('Garments cost:', r.garmentsCost);
  console.log('Setup fee:', r.setupFee);
  console.log('Discount %:', r.discountPct);
  console.log('Discount amount:', r.discount);
  console.log('Total:', r.total);
  console.log('\n');
}
