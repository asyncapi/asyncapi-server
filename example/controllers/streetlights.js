const streetlights = module.exports;

streetlights.lightMeasured = (message, next) => {
  console.log('Received light measure!');
  console.log('Streetlight id:', message.params.streetlightId);
  console.log('Lumens:', message.payload.lumens);
  console.log('Date-time:', message.payload.sentAt);
  next();
};
