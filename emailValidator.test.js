const isValidEmail = require("./emailValidator");

describe("isValidEmail", () => {
  test("valid emails should pass", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@domain.co")).toBe(true);
    expect(isValidEmail("user_name@sub.domain.org")).toBe(true);
  });

  test("invalid emails should fail", () => {
    expect(isValidEmail("plainaddress")).toBe(false);
    expect(isValidEmail("missingatsign.com")).toBe(false);
    expect(isValidEmail("@missingusername.com")).toBe(false);
    expect(isValidEmail("username@.com")).toBe(false);
    expect(isValidEmail("username@domain")).toBe(false);
    expect(isValidEmail("username@domain..com")).toBe(false);
  });

  test("empty or whitespace should fail", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("   ")).toBe(false);
  });
});

