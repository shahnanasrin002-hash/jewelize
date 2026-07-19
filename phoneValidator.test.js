const isValidPhone = require("./phoneValidator");

describe("isValidPhone", () => {
  test("valid phone numbers should pass", () => {
    expect(isValidPhone("9876543210")).toBe(true);
    expect(isValidPhone("1234567890")).toBe(true);
  });

  test("invalid phone numbers should fail", () => {
    expect(isValidPhone("12345")).toBe(false);        // too short
    expect(isValidPhone("123456789012")).toBe(false); // too long
    expect(isValidPhone("abcdefghij")).toBe(false);   // only letters
    expect(isValidPhone("98765 43210")).toBe(false);  // space inside
    expect(isValidPhone("98765-43210")).toBe(false);  // dash inside
  });

  test("empty input should fail", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("   ")).toBe(false);
  });
});
