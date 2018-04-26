const utils = require('./utils');
const test = require('tape');

test('transform schema should create single object keyed with atom names', (t) => {
  const exampleJSON = [
    {
      'sequence': 0,
      'name': 'building.isHealthCareFacility',
      'atomType': 'BOOL',
      'domainID': '6c8d9a89-7538-4984-a1c4-5125dab0a503',
      'description': ''
    },
    {
      'sequence': 1,
      'name': 'building.isResidential',
      'atomType': 'BOOL',
      'domainID': '6c8d9a89-7538-4984-a1c4-5125dab0a503',
      'description': 'Is the building residential?'
    },
    {
      'sequence': 0,
      'name': 'escalator.additionalSafetyInspectionPassed',
      'atomType': 'BOOL',
      'domainID': '6c8d9a89-7538-4984-a1c4-5125dab0a503',
      'description': ''
    }
  ];
  const expected = {
    'building.isHealthCareFacility': {
      'atomType': 'BOOL',
      'description': ''
    },
    'building.isResidential': {
      'atomType': 'BOOL',
      'description': 'Is the building residential?'
    },
    'escalator.additionalSafetyInspectionPassed': {
      'atomType': 'BOOL',
      'description': ''
    }
  };

  t.deepEquals(utils.transformSchema(exampleJSON), expected);
  t.end();
});

test('transformInputAtoms should transform permission, obligation and value', t => {
  const inputAtomsResponse = [{
    contributingAtoms: ['atomId1', 'atomId2'],
    goal: {
      goalType: 'FINAL',
      modalGoal: {
        boolExpr: {
          boolRef: 'goalId1'
        },
        modality: 'OBLIGATED'
      }
    }
  }, {
    contributingAtoms: ['atomId3', 'atomId4'],
    goal: {
      goalType: 'FINAL',
      modalGoal: {
        boolExpr: {
          not: 'goalId1'
        },
        modality: 'PERMITTED'
      }
    }
  }, {
    contributingAtoms: ['atomId5'],
    goal: {
      goalType: "FINAL",
      booleanGoal: {
        boolRef: "goalId1"
      }
    }
  }];

  const expected = {
    goalId1:{
      contributingAtoms: ['atomId5'],
      OBLIGATED:{
        contributingAtoms: ['atomId1', 'atomId2']
      },
      PERMITTED: {
        not: {
          contributingAtoms: ['atomId3', 'atomId4']
        }
      }
    }
  };

  t.deepEquals(utils.transformInputAtoms(inputAtomsResponse), expected);
  t.end();
});

test('transform reason should return a single object keyed with the goal id', t => {
  const reasonResponse = {
    atom: {
      id: {
        '1': [{
          "dependencies": {
            "factsUsed": [],
            "rulesUsed": [],
          },
          goal: {
            expr: {
              boolExpr: {
                not: "atom.id.1"
              }
            },
            id: "atom.id.1",
            type: "BOOL"
          },
          reasoningResult: "INCOMPLETE"
        },
          {
            "dependencies": {
              "factsUsed": [
                "businessAttributes.FoodBeverage.Restaurant"
              ],
              "rulesUsed": [
                "f-c307357d-536e-4436-9e95-1d44ff983e6c",
                "f-4d2b1ca7-ab4b-4380-b274-7b06c7318f1a"
              ],
            },
            goal: {
              expr: {
                boolExpr: {
                  boolRef: "atom.id.1"
                }
              },
              id: "atom.id.1",
              type: "BOOL"
            },
            "reasoningResult": "CONCLUSIVE"
          }]
      }
    }
  };

  const expected = {
    "atom.id.1": {
      "type": "BOOL",
      result: {
        "reasoningResult": "CONCLUSIVE",
        not: {
          "reasoningResult": "INCOMPLETE",
        }
      }
    }
  };

  t.deepEquals(utils.transformReason(reasonResponse), expected);
  t.end();
});

test('transform reason should return a single object keyed with the goal id for multiple atoms', t => {
  const reasonResponse = {
    atom: {
      id: {
        '1': [{
          "dependencies": {
            "factsUsed": [],
            "rulesUsed": [],
          },
          goal: {
            expr: {
              boolExpr: {
                not: "atom.id.1"
              }
            },
            id: "atom.id.1",
            type: "BOOL"
          },
          "reasoningResult": "INCOMPLETE"
        }, {
          "dependencies": {
            "factsUsed": [
              "businessAttributes.FoodBeverage.Restaurant"
            ],
            "rulesUsed": [
              "f-c307357d-536e-4436-9e95-1d44ff983e6c",
              "f-4d2b1ca7-ab4b-4380-b274-7b06c7318f1a"
            ],
          },
          goal: {
            expr: {
              boolExpr: {
                boolRef: "atom.id.1"
              }
            },
            id: "atom.id.1",
            type: "BOOL"
          },
          "reasoningResult": "CONCLUSIVE"
        }]
      },
      id2: [{
        "dependencies": {
          "factsUsed": [],
          "rulesUsed": [],
        },
        goal: {
          expr: {
            boolExpr: {
              not: "atom.id2"
            }
          },
          id: "atom.id2",
          type: "BOOL"
        },
        "reasoningResult": "INCOMPLETE"
      }, {
        "dependencies": {
          "factsUsed": [],
          "rulesUsed": [],
        },
        goal: {
          expr: {
            boolExpr: {
              boolRef: "atom.id2"
            }
          },
          id: "atom.id2",
          type: "BOOL"
        },
        "reasoningResult": "INCOMPLETE"
      },]
    }
  };

  const expected = {
    "atom.id.1": {
      "type": "BOOL",
      result: {
        "reasoningResult": "CONCLUSIVE",
        not: {
          "reasoningResult": "INCOMPLETE",
        }
      }
    },
    "atom.id2": {
      "type": "BOOL",
      result: {
        "reasoningResult": "INCOMPLETE",
        not: {
          "reasoningResult": "INCOMPLETE"
        }
      }
    }
  };

  t.deepEquals(utils.transformReason(reasonResponse), expected);
  t.end();
});

test('transform reason should be able to handle numeric goals', t => {
  const reasonResponse = {
    "employee": {
      "Class": {
        "MonthsAtCurrentClassification": [
          {
            "dependencies": {
              "factsUsed": [],
              "rulesUsed": []
            },
            "goal": {
              "value": null,
              "id": "employee.Class.MonthsAtCurrentClassification",
              "type": "NUMERIC"
            },
            "reasoningResult": "INCOMPLETE"
          }
        ]
      }
    }
  };

  const expected = {
    "employee.Class.MonthsAtCurrentClassification": {
      "type": "NUMERIC",
      result: {
        "value": null,
        "reasoningResult": "INCOMPLETE"
      }
    }
  };

  t.deepEquals(utils.transformReason(reasonResponse), expected);
  t.end();
});

test('transform reason should be able to handle string goals', t => {
  const reasonResponse = {
      "businessLocation": {
        "JurisStringValue": [
          {
            "dependencies": {
              "factsUsed": [],
              "rulesUsed": []
            },
            "goal": {
              "value": "ACT",
              "id": "businessLocation.JurisStringValue",
              "type": "STRING"
            },
            "reasoningResult": "INCOMPLETE"
          }
        ]
      }
    };

  const expected = {
    "businessLocation.JurisStringValue": {
      "type": "STRING",
      result:{
        "value": 'ACT',
        "reasoningResult": "INCOMPLETE"
      }
    }
  };

  t.deepEquals(utils.transformReason(reasonResponse), expected);
  t.end();
});

test('transform reason should be able to handle modal goals', t=> {
  const reasonResponse = {
    "sendCommercialElectronicMessage": [
      {
        "dependencies": {
          "factsUsed": [],
          "rulesUsed": []
        },
        "goal": {
          "expr": {
            "modalExpr": {
              "modality": "OBLIGATED",
              "boolExpr": {
                "not": "sendCommercialElectronicMessage"
              }
            }
          },
          "id": "sendCommercialElectronicMessage",
          "type": "BOOL"
        },
        "reasoningResult": "CONCLUSIVE"
      },
      {
        "dependencies": {
          "factsUsed": [],
          "rulesUsed": []
        },
        "goal": {
          "expr": {
            "boolExpr": {
              "not": "sendCommercialElectronicMessage"
            }
          },
          "id": "sendCommercialElectronicMessage",
          "type": "BOOL"
        },
        "reasoningResult": "INCOMPLETE"
      },
      {
        "dependencies": {
          "factsUsed": [],
          "rulesUsed": []
        },
        "goal": {
          "expr": {
            "modalExpr": {
              "modality": "PERMITTED",
              "boolExpr": {
                "boolRef": "sendCommercialElectronicMessage"
              }
            }
          },
          "id": "sendCommercialElectronicMessage",
          "type": "BOOL"
        },
        "reasoningResult": "INCOMPLETE"
      },
      {
        "dependencies": {
          "factsUsed": [],
          "rulesUsed": []
        },
        "goal": {
          "expr": {
            "boolExpr": {
              "boolRef": "sendCommercialElectronicMessage"
            }
          },
          "id": "sendCommercialElectronicMessage",
          "type": "BOOL"
        },
        "reasoningResult": "INCOMPLETE"
      }
    ]
  };

  const expected = {
    "sendCommercialElectronicMessage": {
      "type": "BOOL",
      "result": {
        "reasoningResult": "INCOMPLETE",
        "not": {
          "reasoningResult": "INCOMPLETE",
        },
        "FORBIDDEN": {
          "reasoningResult": "CONCLUSIVE"
        },
        "PERMITTED": {
          "reasoningResult": "INCOMPLETE"
        }
      }
    }
  };

  t.deepEquals(utils.transformReason(reasonResponse), expected);
  t.end();
});