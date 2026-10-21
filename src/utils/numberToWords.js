/**
 * @file numberToWords.js
 * @description Converts numerical currency values into formal Indian numbering words format.
 * Example: 124600 -> "One Lakh Twenty-Four Thousand Six Hundred Rupees Only"
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(num) {
  if (num < 20) return ones[num];
  const unit = num % 10;
  return tens[Math.floor(num / 10)] + (unit !== 0 ? '-' + ones[unit] : '');
}

function convertThreeDigits(num) {
  let str = '';
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundred > 0) {
    str += ones[hundred] + ' Hundred';
    if (remainder > 0) str += ' and ';
  }

  if (remainder > 0) {
    str += convertTwoDigits(remainder);
  }

  return str;
}

/**
 * Converts a positive number to Indian numbering words
 * (Crore, Lakh, Thousand, Hundred)
 * @param {number} amount
 * @param {string} currencyName - Default 'Rupees'
 * @param {string} subunitName - Default 'Paise'
 * @returns {string} Amount in words
 */
function numberToWords(amount, currencyName = 'Rupees', subunitName = 'Paise') {
  const num = Math.round(Number(amount) * 100) / 100;
  if (isNaN(num) || num === 0) {
    return `Zero ${currencyName} Only`;
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let remaining = integerPart;
  const parts = [];

  // Crores (1,00,00,000)
  const crores = Math.floor(remaining / 10000000);
  if (crores > 0) {
    parts.push(convertThreeDigits(crores) + ' Crore');
    remaining %= 10000000;
  }

  // Lakhs (1,00,000)
  const lakhs = Math.floor(remaining / 100000);
  if (lakhs > 0) {
    parts.push(convertTwoDigits(lakhs) + ' Lakh');
    remaining %= 100000;
  }

  // Thousands (1,000)
  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) {
    parts.push(convertTwoDigits(thousands) + ' Thousand');
    remaining %= 1000;
  }

  // Hundreds and units
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  let words = parts.join(' ') + ` ${currencyName}`;

  if (decimalPart > 0) {
    words += ` and ${convertTwoDigits(decimalPart)} ${subunitName}`;
  }

  return words + ' Only';
}

module.exports = {
  numberToWords
};
