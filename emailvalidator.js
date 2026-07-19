function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // first check with regex
  if (!emailRegex.test(email)) return false;

  // then make sure no double dots
  if (email.includes("..")) return false;

  return true;
}

module.exports = isValidEmail;
