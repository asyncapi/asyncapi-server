const path = require('path');
const errorHandler = require('./handlers/error');
const AsyncApiServer = require('..');

AsyncApiServer.start({
  appRoot: __dirname,
  asyncapi: path.resolve(__dirname, './asyncapi/asyncapi.yaml'),
  errorHandler,
  schemes: {
    mqtt: {
      url: 'mqtt://test.mosquitto.org',
      topics: 'smartylighting/streetlights/1/0/#',
    },
  },
  middlewares: {
    inbound: [
      'default',
    ],
    outbound: [
      'default',
    ],
  },
}).then((hermes) => {
  console.log('Server listening...');
  console.log('Sending a message to the broker...');
  hermes.send({
    command: 'on',
    sentAt: '1985-04-12T23:20:50.52Z',
  }, {}, 'smartylighting/streetlights/1/0/action/123/turn/on');
}).catch(console.error);
