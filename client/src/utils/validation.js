/**
 * Pure form validation helpers — no side effects, no API calls.
 * All functions return null on success or an error object/string on failure.
 */

/**
 * Validates a password reset form.
 * @param {{ newPassword: string, confirmPassword: string }} fields
 * @returns {null | { field: string, message: string }}
 */
export function validatePasswordReset({ newPassword, confirmPassword }) {
  if (newPassword.length < 8) {
    return { field: 'newPassword', message: 'Password must be at least 8 characters.' };
  }
  if (newPassword.length > 128) {
    return { field: 'newPassword', message: 'Password must not exceed 128 characters.' };
  }
  if (newPassword !== confirmPassword) {
    return { field: 'confirmPassword', message: 'Passwords do not match.' };
  }
  return null;
}

/**
 * Validates a contact form submission.
 * @param {{ subject: string, message: string }} fields
 * @returns {null | { field: string, message: string }}
 */
export function validateContactForm({ subject, message }) {
  if (!subject || subject.trim().length === 0) {
    return { field: 'subject', message: 'Subject is required.' };
  }
  if (subject.length > 120) {
    return { field: 'subject', message: 'Subject must not exceed 120 characters.' };
  }
  if (!message || message.trim().length < 10) {
    return { field: 'message', message: 'Message must be at least 10 characters.' };
  }
  if (message.length > 2000) {
    return { field: 'message', message: 'Message must not exceed 2000 characters.' };
  }
  return null;
}

/**
 * Validates a staff invite form.
 * @param {{ first_name: string, last_name: string, email: string, role: string }} fields
 * @returns {null | { field: string, message: string }}
 */
export function validateInviteForm({ first_name, last_name, email, role }) {
  const validRoles = ['contact_agent', 'field_agent'];

  if (!first_name?.trim()) {
    return { field: 'first_name', message: 'First name is required.' };
  }
  if (!last_name?.trim()) {
    return { field: 'last_name', message: 'Last name is required.' };
  }
  if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return { field: 'email', message: 'A valid email address is required.' };
  }
  if (!validRoles.includes(role)) {
    return { field: 'role', message: 'A valid role must be selected.' };
  }
  return null;
}

/**
 * Validates a price value.
 * @param {any} price
 * @returns {string | null} Error string if invalid, null if valid.
 */
export function validatePrice(price) {
  const n = Number(price);
  if (isNaN(n) || n <= 0) return 'Price must be a positive number.';
  return null;
}
