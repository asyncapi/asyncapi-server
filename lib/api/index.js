const path = require('path');
const debug = require('debug')('server');
const Hermes = require('hermesjs');
const MqttAdapter = require('hermesjs-mqtt');
const buffer2string = require('./middlewares/buffer2string');
const string2json = require('./middlewares/string2json');
const json2string = require('./middlewares/json2string');
const logger = require('./middlewares/logger');
const validate = require('./middlewares/validate');
const parser = require('../lib/parser');
const Topic = require('../lib/topics');

const hermes = new Hermes();

const DEFAULT_MIDDLEWARES = {
  buffer2string,
  string2json,
  json2string,
  logger,
  defaultInbound: [buffer2string, string2json, logger],
  defaultOutbound: [logger, json2string],
};

const getAdapter = (scheme, schemeName) => {
  if (scheme._adapter) return scheme._adapter; // eslint-disable-line no-underscore-dangle

  if (['mqtt', 'mqtts', 'secure-mqtt'].includes(schemeName)) {
    return MqttAdapter;
  } else if (['amqp', 'amqps'].includes(schemeName)) {
    // return AmqpAdapter;
  }

  return undefined;
};

module.exports.start = async ({
  asyncapi,
  schemes,
  appRoot = process.cwd(),
  errorHandler,
  middlewares = {
    inbound: ['default'],
    outbound: ['default'],
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
  if (!Array.isArray(middlewares.inbound)) {
    throw new Error('Invalid `middlewares.inbound` property in configuration. It MUST be an array.');
  }
  if (!Array.isArray(middlewares.outbound)) {
    throw new Error('Invalid `middlewares.outbound` property in configuration. It MUST be an array.');
  }

  const asyncapiObj = await parser(asyncapi);

  Object.keys(schemes).forEach((schemeName) => {
    const Adapter = getAdapter(schemes[schemeName], schemeName);
    if (Adapter) hermes.addAdapter(Adapter, schemes[schemeName]);
  });

  middlewares.inbound.forEach((mw) => {
    if (mw === 'default') {
      hermes.use(...DEFAULT_MIDDLEWARES.defaultInbound);
    } else if (typeof mw === 'string' && DEFAULT_MIDDLEWARES[mw]) {
      hermes.use(DEFAULT_MIDDLEWARES[mw]);
    } else if (typeof mw === 'function') {
      hermes.use(mw);
    } else {
      debug('Invalid inbound middleware type:', mw);
    }
  });

  Object.keys(asyncapiObj.topics).forEach((topicName) => {
    const topic = asyncapiObj.topics[topicName];
    const controllerName = topic['x-asyncapi-router-controller'];
    const operationId = topic.publish ? topic.publish['x-operation-id'] : null;
    const newTopicName = Topic.withBaseTopic(topicName, asyncapiObj).replace(/\{([\w\d\-_]+)\}/g, ':$1');

    if (controllerName && operationId) {
      const controller = require(path.resolve(appRoot, './controllers', controllerName)); // eslint-disable-line global-require, import/no-dynamic-require

      hermes.use(
        newTopicName,
        validate.topicParams(topic, topicName),
        validate.message(topic.publish),
        (message, next) => {
          controller[operationId](message, next);
        },
      );
    }

    if (topic.subscribe) {
      hermes.useOutbound(
        newTopicName,
        validate.topicParams(topic, topicName),
        validate.message(topic.subscribe),
      );
    }
  });

  middlewares.outbound.forEach((mw) => {
    if (mw === 'default') {
      hermes.useOutbound(...DEFAULT_MIDDLEWARES.defaultOutbound);
    } else if (typeof mw === 'string' && DEFAULT_MIDDLEWARES[mw]) {
      hermes.useOutbound(DEFAULT_MIDDLEWARES[mw]);
    } else if (typeof mw === 'function') {
      hermes.useOutbound(mw);
    } else {
      debug('Invalid outbound middleware type:', mw);
    }
  });

  if (errorHandler) {
    hermes.use(errorHandler);
    hermes.useOutbound(errorHandler);
  }

  hermes.connect();

  return hermes;
};
