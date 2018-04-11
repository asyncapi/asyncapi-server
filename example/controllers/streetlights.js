const streetlights = module.exports;

streetlights.lightMeasured = (message, next) => {
  console.log('lightMeasured called!');
  next();
};
