const topics = module.exports;

topics.withBaseTopic = (topic, asyncapi, separator = '.') => {
  const regexp = new RegExp(`\\${separator}`, 'g');
  const baseTopic = asyncapi.baseTopic ? asyncapi.baseTopic.replace(regexp, '/') : '';
  const t = topic.replace(regexp, '/');
  return `${baseTopic}/${t}`;
};
