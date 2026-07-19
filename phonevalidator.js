function isValidPhone(phone) {
  // must be exactly 10 digits, no spaces, no symbols
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
}

module.exports = isValidPhone;
