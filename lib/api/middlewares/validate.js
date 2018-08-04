const ZSchema = require('z-schema');

const validator = new ZSchema();
const validate = module.exports;

const promisifiedValidate = (payload, schema) => new Promise((resolve, reject) => {
  validator.validate(payload, schema, (err, valid) => {
    if (err || !valid) {
      reject(err || new Error('Unknown validation error'));
      return;
    }
    resolve();
  });
});

validate.message = schema => (message, next) => {
  validator.validate(message.payload, schema.payload, (err, valid) => {
    if (err || !valid) {
      next(err || new Error('Unknown validation error'));
      return;
    }
    next();
  });
};

validate.topicParams = (topic, topicName) => async (message, next) => {
  if (!topic.parameters) {
    next();
    return;
  }

  let paramNames = topicName.match(/\{[\w\d\-_]+\}/g);
  if (!paramNames) {
    next();
    return;
  }

  paramNames = paramNames.map(param => param.substring(1, param.length - 1));

  /* eslint-disable no-restricted-syntax, no-await-in-loop, no-console */
  for (const paramName of paramNames) {
    try {
      const paramDescription = topic.parameters.find(p => p.name === paramName);
      if (paramDescription) {
        await promisifiedValidate(paramName, paramDescription.schema);
      } else {
        console.error('No param defined for', paramName);
      }
    } catch (e) {
      next(e);
      return;
    }
  }
  /* eslint-enable no-restricted-syntax, no-await-in-loop, no-console */

  next();
};
