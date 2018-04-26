const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const request = require('request-promise-native');
const csv = require('csvtojson');
const _ = require('lodash');
const opn = require('opn');

const CONFIG = require('../config');
const utils = require('./utils');

const CSV_PATH = './csv/metadata.csv';
const LOGIN_PATH = '/api/v1/user/token';
const SCHEMA_PATH = `/api/v1/domain/${CONFIG.DOMAIN}/schema`;
const INPUT_ATOMS_PATH = `/api/v1/domain/${CONFIG.DOMAIN}/reasoning/input-atoms?criteria=draft`;
const REASON_PATH = `/api/v1/domain/${CONFIG.DOMAIN}/reasoning/reason?criteria=draft`;

const ALLOWED_MODALITIES = ['PERMITTED', 'OBLIGATED', 'FORBIDDEN'];

startServer()
  .then(() => opn("http://localhost:3000")) //open browser after server has started
  .catch(e => console.error(e));

async function startServer() {
  const app = express();
  app.use(helmet());
  app.use(bodyParser.json());
  app.use(express.static('public'));

  const token = await fetchToken();
  const [schema, atomMetadata] = await Promise.all([fetchSchema(token), loadCSVMetadata()]);

  const atomLibrary = utils.mergeSchemaWithMetadata(schema, atomMetadata);

  /**
   * This endpoint gives you all the atoms in your domain mixed in with the provided metadata from the csv file
   *
   */
  app.get('/api/schema', (req, res) => {
    res.json(atomLibrary);
  });

  /**
   * This endpoint takes in an object of atom values and returns back an object of atoms that require values to answer the goal(s)
   * In other words, give it a bunch of answers and then it'll return back the questions that need to be answered to decisively answer your goals.
   * Once this responds back with an empty object, this means that a conclusion has been met and you are ready to send the same input to the /answers endpoint
  **/
  app.post('/api/:goal/questions', async (req, res) => {
    const goalName = req.params.goal;

    const goals = utils.getGoals(goalName, atomMetadata);

    if (_.isEmpty(goals)) {
      return res.status(400).send("Goal not found. Have you set it in metadata.csv?");
    }

    const inputAtoms = await postInputAtoms(token, req.body);

    const unansweredAtoms = utils.findUnansweredAtomsForGoals(goals, inputAtoms);

    return res.json(utils.hydrateMetadata(
      [...unansweredAtoms],
      atomLibrary
    ))
  });

  /** e.g. /api/canSend/answers
   * This endpoint takes in an object of atom values and returns back the result of the specified goal(s)
   * In other words, give it the same object you sent to /questions and it'll return back the conclusions of the atoms marked in metadata.csv
   **/
  app.post('/api/:goal/answers', async (req, res) => {
    const goalName = req.params.goal;

    const goals = utils.getGoals(goalName, atomMetadata);

    if (_.isEmpty(goals)) {
      return res.status(400).send("Goal not found. Have you set it in metadata.csv?");
    }

    const reasonAtoms = await postReason(token, req.body);

    const answers = goals.reduce((acc, goal) => {
      acc[goal.atomId] = reasonAtoms[goal.atomId];
      return acc;
    }, {});

    return res.json(utils.mergeMetadata(answers, atomLibrary));
  });

  app.listen(3000, () => {
    console.log('Example middleware listening on port 3000!');
  });
}

async function fetchToken() {
  return request.post(`${CONFIG.RAAP_URL}${LOGIN_PATH}`, {
    json: true,
    auth: {
      user: CONFIG.RAAP_USERNAME,
      pass: CONFIG.RAAP_PASSWORD
    }
  }).then(tokenResponse => Promise.resolve(utils.extractAccessToken(tokenResponse)));
}

async function fetchSchema(token) {
  return request.get(`${CONFIG.RAAP_URL}${SCHEMA_PATH}`, {
    auth: {
      bearer: token
    },
    json: true
  }).then(schema => Promise.resolve(utils.transformSchema(schema)));
}

async function loadCSVMetadata() {
  return new Promise((resolve, reject) => {
    const metadata = {};

    csv({
      ignoreEmpty: true
    }).fromFile(CSV_PATH)
      .on('json', (json, rowIndex) => {
        validate(json, rowIndex);
        metadata[json.atomId] = _.omit(json, 'atomId');
      })
      .on('end', () => resolve(metadata))
      .on('error', error => reject(error));
  });
}

function validate(json, rowIndex){
  if(json.modality && !ALLOWED_MODALITIES.includes(json.modality)){
    const lineNumber = rowIndex + 2; //counting from zero and omitting header row
    throw new Error(`Modality: ${json.modality} not allowed on line number ${lineNumber} in csv. Allowed values are ${ALLOWED_MODALITIES.join(', ')}.`);
  }
}

function postInputAtoms(token, inputAtoms) {
  return request.post(`${CONFIG.RAAP_URL}${INPUT_ATOMS_PATH}`, {
    auth: {
      bearer: token
    },
    body: utils.explodePaths(inputAtoms),
    json: true
  }).then(response => Promise.resolve(utils.transformInputAtoms(response)));
}

function postReason(token, inputAtoms) {
  return request.post(`${CONFIG.RAAP_URL}${REASON_PATH}`, {
    auth: {
      bearer: token
    },
    body: utils.explodePaths(inputAtoms),
    json: true
  }).then(response => Promise.resolve(utils.transformReason(response)));
}

