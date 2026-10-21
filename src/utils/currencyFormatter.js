/**
 * @file currencyFormatter.js
 * @description Utility for formatting numeric amounts into currency strings.
 */

/**
 * Formats a number to currency string
 * @param {number|string} amount 
 * @param {string} currencySymbol - Default '₹'
 * @param {string} locale - Default 'en-IN'
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currencySymbol = '₹', locale = 'en-IN') {
  const num = Number(amount) || 0;
  const targetLocale = locale && locale.trim() ? locale : 'en-IN';
  const formattedNumber = new Intl.NumberFormat(targetLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);

  return currencySymbol && currencySymbol.trim() ? `${currencySymbol.trim()} ${formattedNumber}` : formattedNumber;
}

/**
 * Rounds a number to two decimal places
 * @param {number|string} value 
 * @returns {number}
 */
function roundTwoDecimals(value) {
  const num = Number(value) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

module.exports = {
  formatCurrency,
  roundTwoDecimals
};
