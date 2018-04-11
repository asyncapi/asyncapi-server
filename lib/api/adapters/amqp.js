const hermesAMQP = require('hermesjs-amqp');

module.exports = (scheme, asyncapi) => {
  let topics = Object.keys(asyncapi.topics);
  topics = topics.map(topic => {
    if (!asyncapi.topics[topic].publish) return;
    return Topic.withBaseTopic(topic, asyncapi).replace(/\{([\w\d\-\_]+)\}/g, '+');
  });

  return topics.filter(Boolean).map(topic => hermesAMQP({
    exchange: scheme.exchange,
    username: scheme.username,
    password: scheme.password,
    host: scheme.host,
    port: scheme.port,
    topic,
    queue: scheme.queue,
    queue_options: scheme.queue_options,
    subscribe: true,
  }));
};
