const path = require('path');
const hermes = require('hermesjs')();
const buffer2string = require('./middlewares/buffer2string');
const string2json = require('./middlewares/string2json');
const json2string = require('./middlewares/json2string');
const logger = require('./middlewares/logger');
const validate = require('./middlewares/validate');
const createMQTTAdapter = require('./adapters/mqtt');
const createAMQPAdapter = require('./adapters/amqp');
const parser = require('../lib/parser');
const Topic = require('../lib/topics');

const DEFAULT_MIDDLEWARES = {
  buffer2string,
  string2json,
  json2string,
  logger,
  defaultIncoming: [buffer2string, string2json, logger],
  defaultOutgoing: [logger, json2string],
};

const createAdapter = (scheme, schemeName, asyncapi) => {
  const adapterConfig = {
    ...scheme,
    ...{ protocol: schemeName },
  };

  if (['mqtt', 'mqtts', 'secure-mqtt'].includes(schemeName)) {
    return createMQTTAdapter(adapterConfig, asyncapi);
  } else if (['amqp', 'amqps'].includes(schemeName)) {
    return createAMQPAdapter(adapterConfig, asyncapi);
  }
};

module.exports.start = async ({
  asyncapi,
  schemes,
  appRoot = process.cwd(),
  errorHandler,
  middlewares = {
    incoming: ['default'],
    outgoing: ['default'],
  },
}) => {
  if (!asyncapi) {
    throw new Error('Missing required `asyncapi` property in configuration.');
  }
  if (!schemes || schemes.length === 0) {
    throw new Error('Missing required `schemes` property in configuration.');
  }
  if (typeof middlewares !== 'object') {
    throw new Error('Invalid `middlewares` property in configuration. It MUST be an object.');
  }
  if (!Array.isArray(middlewares.incoming)) {
    throw new Error('Invalid `middlewares.incoming` property in configuration. It MUST be an array.');
  }
  if (!Array.isArray(middlewares.outgoing)) {
    throw new Error('Invalid `middlewares.outgoing` property in configuration. It MUST be an array.');
  }

  asyncapi = await parser(asyncapi);

  Object.keys(schemes).forEach((schemeName) => {
    const adapter = createAdapter(schemes[schemeName], schemeName, asyncapi);
    if (adapter) {
      if (Array.isArray(adapter)) {
        adapter.forEach(a => hermes.add('broker', a));
      } else {
        hermes.add('broker', adapter);
      }
    }
  });

  middlewares.incoming.forEach((mw) => {
    if (mw === 'default') {
      hermes.in.broker.use(DEFAULT_MIDDLEWARES.defaultIncoming);
    } else if (typeof mw === 'string' && DEFAULT_MIDDLEWARES[mw]) {
      hermes.in.broker.use(DEFAULT_MIDDLEWARES[mw]);
    } else if (typeof mw === 'function') {
      hermes.in.broker.use(mw);
    } else {
      console.warn('Invalid incoming middleware type:', mw);
    }
  });

  Object.keys(asyncapi.topics).forEach((topicName) => {
    const topic = asyncapi.topics[topicName];
    const controllerName = topic['x-asyncapi-router-controller'];
    const operationId = topic.publish ? topic.publish['x-operation-id'] : null;
    const newTopicName = Topic.withBaseTopic(topicName, asyncapi).replace(/\{([\w\d\-\_]+)\}/g, ':$1');

    if (controllerName && operationId) {
      const controller = require(path.resolve(appRoot, './controllers', controllerName));

      hermes.in.broker.use(newTopicName, validate.topicParams(topic, topicName), validate.message(topic.publish), (message, next) => {
        controller[operationId](message, next);
      });
    }

    if (topic.subscribe) {
      hermes.in.client.use(newTopicName, validate.topicParams(topic, topicName), validate.message(topic.subscribe));
    }
  });

  middlewares.outgoing.forEach((mw) => {
    if (mw === 'default') {
      hermes.in.client.use(DEFAULT_MIDDLEWARES.defaultOutgoing);
    } else if (typeof mw === 'string' && DEFAULT_MIDDLEWARES[mw]) {
      hermes.in.client.use(DEFAULT_MIDDLEWARES[mw]);
    } else if (typeof mw === 'function') {
      hermes.in.client.use(mw);
    } else {
      console.warn('Invalid outgoing middleware type:', mw);
    }
  });

  if (errorHandler) hermes.use(errorHandler);

  hermes.listen();

  return hermes;
};
