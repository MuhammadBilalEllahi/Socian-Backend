const User = require("../../models/user/user.model");

/**
 * Searches for a user based on their role and valid email types.
 * @param {string} searchQuery - The email to search for.
 * @param {string} role - The role of the user ('student', 'teacher', 'alumni').
 * @returns {Promise<User|null>} - The found user or null if not found.
 * @throws {Error} - If the search query is invalid for the user's role.
 */
const searchUser = async (searchQuery, role) => {
  // Define role-based valid email fields for search
  const roleEmailFields = {
    student: ["universityEmail", "personalEmail"],
    teacher: ["universityEmail"],
    alumni: ["personalEmail", "secondaryPersonalEmail"],
  };

  // Get the valid email fields for the current user's role
  const validEmailFields = roleEmailFields[role] || [];

  if (validEmailFields.length === 0) {
    throw new Error("Invalid role. No valid email fields for search.");
  }

  // Build the query dynamically based on the role and valid email fields
  const query = {
    $or: validEmailFields.map((field) => ({ [field]: searchQuery })),
  };

  // Search for the user by the provided email in the valid fields
  const user = await User.findOne(query);

  if (!user) {
    return null; // No user found
  }

  return user; // Return the found user
};

// const searchStudents = async (searchQuery) => {};

module.exports = { searchUser };
