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
    },
  },
  middlewares: {
    incoming: [
      'default',
    ],
    outgoing: [
      'default',
    ],
  },
}).then((hermes) => {
  console.log('Server listening...');
  hermes.from.client.send({
    topic: 'smartylighting/streetlights/1/0/action/123/turn/on',
    payload: {
      command: 'on',
      sentAt: '1985-04-12T23:20:50.52Z',
    },
  });
}).catch(console.error);
