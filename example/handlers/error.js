const util = require('util');

function red (text) {
  return `\x1b[31m${text}\x1b[0m`;
}

module.exports = (err, message, next) => {
  try {
    console.log(red('# Error while processing a message:'));
    console.error(util.inspect(err, { depth: null, colors: true }));
  } catch (e) {
    console.error(e);
  }
  next();
};
