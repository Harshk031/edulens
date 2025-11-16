/**
 * Utility functions for handling environment variables with defaults
 */

function getEnvVar(name, defaultValue) {
  return process.env[name] || defaultValue;
}

function getBooleanEnvVar(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined || value === null) return defaultValue;
  return value.toLowerCase() === 'true';
}

function getNumberEnvVar(name, defaultValue = 0) {
  const value = process.env[name];
  if (value === undefined || value === null) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

module.exports = {
  getEnvVar,
  getBooleanEnvVar,
  getNumberEnvVar
};