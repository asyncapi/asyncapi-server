const hermesMQTT = require('hermesjs-mqtt');
const Topic = require('../../lib/topics');

module.exports = (scheme, asyncapi) => {
  let topics = Object.keys(asyncapi.topics);
  topics = topics.map(topic => {
    if (!asyncapi.topics[topic].publish) return;
    return Topic.withBaseTopic(topic, asyncapi, '/').replace(/\{([\w\d\-\_]+)\}/g, '+');
  });

  return topics.filter(Boolean).map(topic => hermesMQTT({
    host_url: scheme.url,
    topics: topic,
    qos: scheme.qos,
    protocol: scheme.protocol,
    retain: scheme.retain,
    subscribe: true,
  }));
};
