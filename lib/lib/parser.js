const fs = require('fs');
const path = require('path');
const debug = require('debug')('server:parser');
const ZSchema = require('z-schema');
const YAML = require('js-yaml');
const RefParser = require('json-schema-ref-parser');
const asyncAPIschemas = require('asyncapi');

const validator = new ZSchema();

async function getFileContent(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, filePath), (err, content) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(content);
    });
  });
}

function parseContent(content) {
  const contentString = content.toString('utf8');
  try {
    return JSON.parse(contentString);
  } catch (e) {
    return YAML.safeLoad(contentString);
  }
}

async function dereference(json) {
  return RefParser.dereference(json, {
    dereference: {
      circular: 'ignore',
    },
  });
}

async function bundle(json) {
  return RefParser.bundle(json, {
    dereference: {
      circular: 'ignore',
    },
  });
}

async function validate(json) {
  const schema = asyncAPIschemas[json.asyncapi];

  return new Promise((resolve, reject) => {
    validator.validate(json, schema, (err) => {
      if (err) return reject(err);
      return resolve(json);
    });
  });
}

async function parse(filePath) {
  let content;
  let parsedContent;
  let dereferencedJSON;
  let bundledJSON;
  let parsed;

  try {
    content = await getFileContent(filePath);
  } catch (e) {
    debug('Can not load the content of the AsyncAPI specification file');
    debug(e);
    return undefined;
  }

  try {
    parsedContent = parseContent(content);
  } catch (e) {
    debug('Can not parse the content of the AsyncAPI specification file');
    debug(e);
    return undefined;
  }

  try {
    dereferencedJSON = await dereference(parsedContent);
  } catch (e) {
    debug('Can not dereference the JSON obtained from the content of the AsyncAPI specification file');
    debug(e);
    return undefined;
  }

  try {
    bundledJSON = await bundle(dereferencedJSON);
  } catch (e) {
    debug('Can not bundle the JSON obtained from the content of the AsyncAPI specification file');
    debug(e);
    return undefined;
  }

  try {
    parsed = await validate(bundledJSON);
  } catch (e) {
    debug('Invalid JSON obtained from the content of the AsyncAPI specification file');
    debug(e);
    return undefined;
  }

  return JSON.parse(JSON.stringify(parsed));
}

module.exports = parse;
