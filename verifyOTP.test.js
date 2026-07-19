const verifyOTP = require("./verifyOTP");

// Mock global fetch
global.fetch = jest.fn();

describe("verifyOTP", () => {
  beforeEach(() => {
    fetch.mockClear(); // reset fetch before each test
  });

  test("should return success when OTP is valid", async () => {
    // Arrange: mock fetch response
    fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, message: "OTP verified successfully!" }),
    });

    // Act
    const result = await verifyOTP("9876543210", "123456");

    // Assert
    expect(result).toEqual({ success: true, message: "OTP verified successfully!" });
    expect(fetch).toHaveBeenCalledWith("http://localhost:5000/verify-otp", expect.any(Object));
  });

  test("should return failure when OTP is invalid", async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ success: false, message: "Invalid OTP" }),
    });

    const result = await verifyOTP("9876543210", "000000");

    expect(result).toEqual({ success: false, message: "Invalid OTP" });
  });

  test("should throw error when fetch fails", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(verifyOTP("9876543210", "123456")).rejects.toThrow("Network error");
  });
});
