/* eslint no-console: off */

const util = require('util');

function yellow(text) {
  return `\x1b[33m${text}\x1b[0m`;
}

module.exports = (message, next) => {
  const action = message.inbound ? 'received from' : 'sent to';
  const topicText = message.topic ? yellow(message.topic) : 'A message';
  console.log(`${topicText} has been ${action} broker:`);
  console.log(util.inspect(message.payload, { depth: null, colors: true }));
  next();
};
