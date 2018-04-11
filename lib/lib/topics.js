const topics = module.exports;

topics.withBaseTopic = (topic, asyncapi, separator = '.') => {
  return `${asyncapi.baseTopic ? `${asyncapi.baseTopic.replace(/\./g, '/')}/` : ''}${topic.replace(/\./g, '/')}`;
};
