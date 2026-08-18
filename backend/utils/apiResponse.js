// utils/apiResponse.js

class ApiResponse {
  /**
   * @param {number} statusCode - HTTP Status Code (e.g., 200, 201)
   * @param {any} data - The actual payload/data to send to the client
   * @param {string} message - A helpful message detailing the action success
   */
  constructor(statusCode, data = null, message = "Success") {
    this.statusCode = statusCode;
    this.success = statusCode < 400; // Automatically true for 2xx/3xx statuses
    this.message = message;

    // Only attach data if it is provided
    if (data !== null) {
      this.data = data;
    }
  }

  /**
   * Helper method to send the response immediately via Express res object
   * @param {object} res - Express response object
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      ...(this.data && { data: this.data }), // Conditionally adds data key
    });
  }
}

export default ApiResponse;
