const _ = require('lodash');

function extractAccessToken(tokenResponse) {
  return tokenResponse['access_token'];
}

function transformSchema(schema) {
  return schema.reduce((acc, atom) => {
    acc[atom.name] = {
      atomType: atom.atomType,
      description: atom.description
    };
    return acc;
  }, {})
}

function transformInputAtoms(inputAtoms) {
  return inputAtoms.reduce((acc, goal) => {
    if (_.has(goal, 'goal.booleanGoal')) {
      const notPath = 'goal.booleanGoal.not';
      const goalPath = 'goal.booleanGoal.boolRef';

      if (_.has(goal, notPath)) {
        const atomId = _.get(goal, notPath);
        setNotContributingAtoms(acc, atomId, goal.contributingAtoms);
      } else {
        const atomId = _.get(goal, goalPath);
        setContributingAtoms(acc, atomId, goal.contributingAtoms);
      }

    } else if (_.has(goal, 'goal.modalGoal')) {
      const notPath = 'goal.modalGoal.boolExpr.not';
      const goalPath = 'goal.modalGoal.boolExpr.boolRef';
      if (_.has(goal, goalPath)) {
        const atomId = _.get(goal, goalPath);
        setModalContributingAtoms(acc, atomId, goal.contributingAtoms, goal.goal.modalGoal.modality);
      } else {
        const atomId = _.get(goal, notPath);
        setNotModalContributingAtoms(acc, atomId, goal.contributingAtoms, goal.goal.modalGoal.modality);
      }
    }
    return acc;
  }, {});
}

function setModalContributingAtoms(obj, atomId, contributingAtoms, modality) {
  _.set(obj, [atomId, modality], {contributingAtoms: [...contributingAtoms]});
}

function setNotModalContributingAtoms(obj, atomId, contributingAtoms, modality) {
  _.set(obj, [atomId, modality, 'not'], {contributingAtoms: [...contributingAtoms]});
}

function setNotContributingAtoms(obj, atomId, contributingAtoms) {
  obj[atomId] = obj[atomId] || {};
  obj[atomId].not = {
    contributingAtoms: [...contributingAtoms]
  };
}

function setContributingAtoms(obj, atomId, contributingAtoms) {
  obj[atomId] = obj[atomId] || {};
  obj[atomId].contributingAtoms = [...contributingAtoms];
}

function transformReason(reason) {
  let results = flattenResults(reason);

  return results.reduce((acc, result) => {
    if (result.goal.type === 'BOOL') {

      if (_.has(result, 'goal.expr.modalExpr')) {
        acc[result.goal.id] = _.merge(acc[result.goal.id] || {}, extractModalGoal(result));
      } else {
        acc[result.goal.id] = _.merge(acc[result.goal.id] || {}, extractBooleanGoal(result));
      }
    } else if (result.goal.type === 'NUMERIC') {
      acc[result.goal.id] = extractGoal(result);
    } else if (result.goal.type === 'STRING') {
      acc[result.goal.id] = extractGoal(result);
    }
    return acc;
  }, {});
}

function extractModalGoal(result) {
  const modality = result.goal.expr.modalExpr.modality;

  if (_.has(result, 'goal.expr.modalExpr.boolExpr.not')) {
    return extractNegativeModality(result, modality);
  } else {
    return {
      result: {
        [modality]: {
          reasoningResult: result.reasoningResult,
        }
      }
    };
  }
}

function extractNegativeModality(result, modality) {
  if (modality === "OBLIGATED") { //api returns back obligated not instead of forbidden
    return {
      type: result.goal.type,
      result: {
        "FORBIDDEN": {
          reasoningResult: result.reasoningResult
        }
      }
    };
  }

  return {
    type: result.goal.type,
    result: {
      [modality]: {
        not: {
          reasoningResult: result.reasoningResult
        }
      }
    }
  };
}


function extractBooleanGoal(result) {
  if (_.has(result, 'goal.expr.boolExpr.not')) {
    return {
      'type': result.goal.type,
      result: {
        not: _.pick(result, ['reasoningResult'])
      }
    };
  }

  return {
    'type': result.goal.type,
    result: {
      'reasoningResult': result.reasoningResult
    }
  };
}

function extractGoal(result) {
  return {
    'type': result.goal.type,
    result: {
      'reasoningResult': result.reasoningResult,
      'value': result.goal.value
    }
  };
}

function flattenResults(obj, results = []) {
  if (Array.isArray(obj)) {
    results.push(...obj);
    return;
  }

  Object.values(obj).forEach(value => flattenResults(value, results));
  return results;

}

function mergeSchemaWithMetadata(schema, metadata) {
  return _.merge(schema, metadata);
}

function explodePaths(atoms = {}) {
  return Object.entries(atoms).reduce((acc, [key, value]) => _.set(acc, key, value), {});
}

function getGoals(goalName, atomMetadata) {
  const goalIds = Object.keys(atomMetadata).filter(atomId => atomMetadata[atomId].goal === goalName);

  return goalIds.map(goalId => {
    const modality = atomMetadata[goalId].modality;
    const goal = {atomId: goalId};
    if (modality) {
      goal.modality = modality;
    }
    return goal;
  })
}

function findUnansweredAtomsForGoals(goals, inputAtoms) {
  debugger;
  return goals.reduce((acc, goal) => {
    let unansweredAtoms;
    if (goal.modality) {
      unansweredAtoms = getUnansweredAtomsForModality(goal, inputAtoms);
    } else {
      unansweredAtoms = getUnansweredAtoms(goal, inputAtoms, ['contributingAtoms']);
    }
    unansweredAtoms.forEach(atom => acc.add(atom));

    return acc;
  }, new Set());
}

function getUnansweredAtomsForModality(goal, inputAtoms) {
  switch (goal.modality) {
    case 'PERMITTED':
      return getUnansweredAtoms(goal, inputAtoms, ['PERMITTED', 'contributingAtoms']);
    case 'FORBIDDEN':
      return getUnansweredAtoms(goal, inputAtoms, ['OBLIGATED', 'not', 'contributingAtoms']);
    case 'OBLIGATED':
      return getUnansweredAtoms(goal, inputAtoms, ['OBLIGATED', 'contributingAtoms']);
  }
}

function getUnansweredAtoms(goal, inputAtoms, positivePath) {
  return _.get(inputAtoms, [goal.atomId, ...positivePath], []);
}

function mapContributingAtoms(inputAtoms, atomLibrary, awardSelected = false) {
  const goalIds = Object.keys(inputAtoms);
  return goalIds.reduce((acc, goalId) => {
    acc[goalId] = {};

    if (inputAtoms[goalId].not) {
      acc[goalId].not = {
        contributingAtoms: mapContributing(inputAtoms[goalId].not.contributingAtoms, atomLibrary, awardSelected)
      }
    }
    if (inputAtoms[goalId].contributingAtoms) {
      acc[goalId].contributingAtoms = mapContributing(inputAtoms[goalId].contributingAtoms, atomLibrary, awardSelected);
    }
    return acc;
  }, {});
}

function mapContributing(atoms, library, awardSelected = false) {

  const relevantAtomsForSelectedAward = awardSelected ? _.filter(atoms, atom => (
    library[atom]
    && library[atom].classAwardID
    && library[atom].classAwardID.some((awardId) => awardId === awardSelected))
  ) : atoms;

  return relevantAtomsForSelectedAward.reduce((acc, atom) => {
    acc[atom] = {...library[atom]};
    return acc;
  }, {});
}

function hydrateMetadata(atoms, library) {
  return _.pick(library, atoms);
}

function mergeMetadata(atoms = {}, library) {
  return Object.entries(atoms).reduce((acc, [key, value]) => {
    acc[key] = Object.assign({}, value, library[key]);
    return acc;
  }, {});
}

module.exports = {
  extractAccessToken,
  transformSchema,
  transformInputAtoms,
  transformReason,
  mergeSchemaWithMetadata,
  explodePaths,
  getGoals,
  findUnansweredAtomsForGoals,
  mapContributingAtoms,
  hydrateMetadata,
  mergeMetadata
};