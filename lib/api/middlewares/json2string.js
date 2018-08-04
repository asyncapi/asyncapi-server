/* eslint no-console: off, no-param-reassign:off */

module.exports = (message, next) => {
  try {
    message.payload = JSON.stringify(message.payload);
  } catch (e) {
    console.error(e);
    // We did our best...
  }

  next();
};
