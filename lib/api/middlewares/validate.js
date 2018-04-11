const ZSchema = require('z-schema');

const validator = new ZSchema();
const validate = module.exports;

const promisifiedValidate = (payload, schema) => new Promise((resolve, reject) => {
  validator.validate(payload, schema, (err, valid) => {
    if (err || !valid) return reject(err || new Error('Unknown validation error'));
    resolve();
  });
});

validate.message = schema => (message, next) => {
  validator.validate(message.payload, schema.payload, (err, valid) => {
    if (err || !valid) return next(err || new Error('Unknown validation error'));
    next();
  });
};

validate.topicParams = (topic, topicName) => async (message, next) => {
  if (!topic.parameters) return next();

  let paramNames = topicName.match(/\{[\w\d\-\_]+\}/g);
  if (!paramNames) return next();

  paramNames = paramNames.map(param => param.substring(1, param.length-1));

  for (const paramName of paramNames) {
    try {
      const paramDescription = topic.parameters.find(p => p.name === paramName);
      if (paramDescription) {
        await promisifiedValidate(paramName, paramDescription.schema);
      } else {
        console.log('No param defined for', paramName);
      }
    } catch (e) {
      return next(e);
    }
  }

  next();
};
