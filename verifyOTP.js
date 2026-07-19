async function verifyOTP(userContact, otp) {
  const res = await fetch("http://localhost:5000/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: userContact, otp }),
  });
  return res.json();
}

module.exports = verifyOTP;
