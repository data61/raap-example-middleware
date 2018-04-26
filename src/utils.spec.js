const utils = require('./utils');
const test = require('tape');
const assert = require('assert');

//https://github.com/substack/node-deep-equal/issues/28
//required for tape version 2.9
//fixed in node version
function isSetEqual(setA, setB){
  assert.deepEqual(setA, setB); //throws error if not equal
  return true;
}

test('extractAccessToken should get auth token', (t) => {
  const request = {
    "access_token": "base64encodedSecret",
    "token_type": "Bearer"
  };
  t.equals(utils.extractAccessToken(request), 'base64encodedSecret');
  t.end();
});

test('getGoalAtoms should extract out goals without modalities', t => {
  const goalName = 'goalie';
  const metaData = {
    atom1: {
      goal: 'goalie'
    },
    atom2:{
      goal: 'goalie'
    },
    atom3:{}
  };

  const expected = [
    {atomId: 'atom1'},
    {atomId: 'atom2'}
  ];

  t.deepEquals(utils.getGoals(goalName, metaData), expected);
  t.end();
});

test('getGoalAtoms should extract out goals with modalities', t => {
  const goalName = 'goalie';
  const metaData = {
    atom1: {
      goal: 'goalie',
      modality: "PERMITTED"
    },
    atom2:{
      goal: 'goalie',
      modality: "FORBIDDEN"
    },
    atom3:{}
  };

  const expected = [
    {
      atomId: 'atom1',
      modality: "PERMITTED"
    },
    {
      atomId: 'atom2',
      modality: "FORBIDDEN"
    }
  ];

  t.deepEquals(utils.getGoals(goalName, metaData), expected);
  t.end();
});

test('mergeMetadata should create a single object overwriting keys in schema', (t) => {
  const schema = {
    atomId1: {
      atomType: 'BOOL',
      description: 'foo'
    },
    atomId2: {
      atomType: 'BOOL',
      description: 'not overwritten'
    }
  };

  const metadata = {
    atomId1: {
      description: 'new description'
    },
    atomId2: {
      otherField: 'included'
    }
  };

  const expected = {
    atomId1: {
      atomType: 'BOOL',
      description: 'new description'
    },
    atomId2: {
      atomType: 'BOOL',
      description: 'not overwritten',
      otherField: 'included'
    }
  };

  t.deepEquals(utils.mergeSchemaWithMetadata(schema, metadata), expected);

  t.end();
});

test('explodePaths should create a single object with deep values set', (t) => {
  const pathValues = {
    'a.b.c': 1,
    'a.c': 3,
    'c': 4
  };

  const expected = {
    a: {
      b: {
        c: 1
      },
      c: 3
    },
    c: 4
  };
  t.deepEquals(utils.explodePaths(pathValues), expected);

  t.end();
});

test('findUnansweredAtomsForGoals should return back the set of contributing atoms given goals', t => {
  const goals = [{atomId:'Award.001'}, {atomId:'Award.002'}];

  const inputAtoms = {
    'Award.001': {
      contributingAtoms: [
        "atom.id.1",
        "atom.id.2"
      ],
      not: {
        contributingAtoms: ["atom.id.3"]
      }
    },
    'Award.002': {
      contributingAtoms: ["atom.id.4"]
    }
  };

  const expected = new Set([
    "atom.id.1",
    "atom.id.2",
    "atom.id.4"]);

  t.ok(isSetEqual(utils.findUnansweredAtomsForGoals(goals, inputAtoms), expected));
  t.end();
});

test('findUnansweredAtomsForGoals should find all positive contributing atoms for forbidden', t => {
  //positive case: forbidden === obligated.not
  //negative case: permitted
  const goals = [{atomId:'Award.001', modality: "FORBIDDEN"}];

  const inputAtoms = {
    'Award.001': {
      contributingAtoms: [
        "atom.id.1",
        "atom.id.2"
      ],
      not: {
        contributingAtoms: ["atom.id.3"]
      },
      OBLIGATED: {
        contributingAtoms: ['atom.id.4'],
        not: {
          contributingAtoms: ['atom.id.5']
        }
      },
      PERMITTED: {
        contributingAtoms: ['atom.id.6'],
        not: {
          contributingAtoms: ['atom.id.7']
        }
      }
    }
  };

  const expected = new Set(['atom.id.5']);

  t.ok(isSetEqual(utils.findUnansweredAtomsForGoals(goals, inputAtoms), expected));
  t.end();
});

test('findUnansweredAtomsForGoals should find all positive contributing atoms for PERMITTED', t => {
  //positive case: PERMITTED
  //negative case: obligated.not
  const goals = [{atomId:'Award.001', modality: 'PERMITTED'}];

  const inputAtoms = {
    'Award.001': {
      contributingAtoms: [
        "atom.id.1",
        "atom.id.2"
      ],
      not: {
        contributingAtoms: ["atom.id.3"]
      },
      OBLIGATED: {
        contributingAtoms: ['atom.id.4'],
        not: {
          contributingAtoms: ['atom.id.5']
        }
      },
      PERMITTED: {
        contributingAtoms: ['atom.id.6'],
        not: {
          contributingAtoms: ['atom.id.7']
        }
      }
    }
  };

  const expected = new Set(['atom.id.6']);

  t.ok(isSetEqual(utils.findUnansweredAtomsForGoals(goals, inputAtoms), expected));
  t.end();
});

test('findUnansweredAtomsForGoals should find all positive contributing atoms for OBLIGATED', t => {
  //positive case: OBLIGATED
  //negative case: obligated.not
  const goals = [{atomId:'Award.001', modality:'OBLIGATED'}];

  const inputAtoms = {
    'Award.001': {
      contributingAtoms: [
        "atom.id.1",
        "atom.id.2"
      ],
      not: {
        contributingAtoms: ["atom.id.3"]
      },
      OBLIGATED: {
        contributingAtoms: ['atom.id.4'],
        not: {
          contributingAtoms: ['atom.id.5']
        }
      },
      PERMITTED: {
        contributingAtoms: ['atom.id.6'],
        not: {
          contributingAtoms: ['atom.id.7']
        }
      }
    }
  };

  const expected = new Set(['atom.id.4']);

  t.ok(isSetEqual(utils.findUnansweredAtomsForGoals(goals, inputAtoms), expected));
  t.end();
});

test('findUnansweredAtomsForGoals should find multiple modal goals', t => {
  const goals = [{atomId:'Award.001', modality:'OBLIGATED'}, {atomId: 'Award.002'}];

  const inputAtoms = {
    'Award.001': {
      contributingAtoms: [
        "atom.id.1",
        "atom.id.2"
      ],
      not: {
        contributingAtoms: ["atom.id.3"]
      },
      OBLIGATED: {
        contributingAtoms: ['atom.id.4'],
        not: {
          contributingAtoms: ['atom.id.5']
        }
      },
      PERMITTED: {
        contributingAtoms: ['atom.id.6'],
        not: {
          contributingAtoms: ['atom.id.7']
        }
      }
    },
    'Award.002':{
      contributingAtoms: [
        "atom.id.8"
      ]
    }
  };
  const expected = new Set(['atom.id.4', 'atom.id.8']);

  t.ok(isSetEqual(utils.findUnansweredAtomsForGoals(goals, inputAtoms), expected));
  t.end();
});


test('mapContributingAtoms should map contributing atom ids to all fields in the atomLibrary', t => {
  const atomLibrary = {
    "atom.id.1": {
      "atomType": "BOOL",
      "description": "Atom description 1"
    },
    "atom.id.2": {
      "atomType": "BOOL",
      "description": '[Intermediate] for: "ConnectedToHospitalityBusiness" or "ConnectedToRegisteredClub"',
      "guideLinks": ["https://www.fairwork.gov.au/library/k600013_award-coverage-for-night-clubs"]
    },
    "atom.id.3": {
      "atomType": "BOOL",
      "description": "Atom description 3"
    }
  };

  const input = {
    "goalid1": {
      contributingAtoms: [
        "atom.id.1",
        "atom.id.2"],
      not: {
        contributingAtoms: ["atom.id.3"]
      }
    }
  };

  const expected = {
    "goalid1": {
      contributingAtoms: {
        "atom.id.1": {
          "atomType": "BOOL",
          "description": "Atom description 1"
        },
        "atom.id.2": {
          "atomType": "BOOL",
          "description": '[Intermediate] for: "ConnectedToHospitalityBusiness" or "ConnectedToRegisteredClub"',
          "guideLinks": ["https://www.fairwork.gov.au/library/k600013_award-coverage-for-night-clubs"]
        },
      },
      not: {
        contributingAtoms: {
          "atom.id.3": {
            "atomType": "BOOL",
            "description": "Atom description 3"
          }
        }
      }
    }
  };

  t.deepEquals(utils.mapContributingAtoms(input, atomLibrary), expected);
  t.end();
});

test('mapContributingAtoms should map contributing atom ids for negated goals', t => {
  const atomLibrary = {
    "atom.id.3": {
      "atomType": "BOOL",
      "description": "Atom description 3"
    }
  };

  const input = {
    "goalid1": {
      not: {
        contributingAtoms: ["atom.id.3"]
      }
    }
  };

  const expected = {
    "goalid1": {
      not: {
        contributingAtoms: {
          "atom.id.3": {
            "atomType": "BOOL",
            "description": "Atom description 3"
          }
        }
      }
    }
  };

  t.deepEquals(utils.mapContributingAtoms(input, atomLibrary), expected);
  t.end();
});

test('mapContributingAtoms should filter for relevant atoms when a selected award ID is provided', t => {

  const atomLibrary = {
    "atom.id.a": {
      "atomType": "BOOL",
      "description": "Atom description a",
      "classAwardID": ["goalid1", "goalid2"],
    },
    "atom.id.b": {
      "atomType": "BOOL",
      "description": "Atom description b",
      "classAwardID": ["goalid1"],
    },
    "atom.id.c": {
      "atomType": "BOOL",
      "description": "Atom description c"
    },
  };

  const input = {
    "goalid1": {
      not: {
        contributingAtoms: ["atom.id.b", "atom.id.b"]
      },
      contributingAtoms: ["atom.id.a", "atom.id.b", "atom.id.c"]
    }
  };

  const expected = {
    "goalid1": {
      not: {
        contributingAtoms: {
          "atom.id.b": {
            "atomType": "BOOL",
            "description": "Atom description b",
            "classAwardID": ["goalid1"]
          }
        }
      },
      contributingAtoms: {
        "atom.id.a": {
          "atomType": "BOOL",
          "description": "Atom description a",
          "classAwardID": ["goalid1", "goalid2"]
        },
        "atom.id.b": {
          "atomType": "BOOL",
          "description": "Atom description b",
          "classAwardID": ["goalid1"]
        }
      }
    }
  };

  t.deepEquals(utils.mapContributingAtoms(input, atomLibrary, "goalid1"), expected);
  t.end();
});

test('hydrateMetadata should populate keys with metadata', t => {
  const atoms = ['a', 'b'];

  const metadata = {
    a: {
      question: 'blah a'
    },
    b: {
      question: 'blah b'
    },
    c: {
      question: 'blah c'
    }
  };

  const expected = {
    a: {
      question: 'blah a'
    },
    b: {
      question: 'blah b'
    }
  };

  t.deepEquals(utils.hydrateMetadata(atoms, metadata), expected);
  t.end();
});
