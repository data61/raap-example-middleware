# Example-middleware

### Requirements
* [NodeJs](https://nodejs.org/) > 8.10.0
* NPM > 5.6.0 (included in node)
* Modern browser (not IE)

### Getting started
On the command line, run:
* `npm install`
* `npm start`

### Middleware for RaaP

This project exists for three objectives
* Allow automatic authenticated access to the RaaP platform
* Allow attaching of additional metadata to atoms
* Make the RaaP API easier to consume

#### Overview of the example domain
Throughout this tutorial, we will be be using a simplified subset of the Spam Act 2003 to demonstrate the middleware.
If you go to the Raap [Spam act 2003 simplified](https://raap.d61.io/#!/group/examples/domain/spam-act-2003-simplified) domain, you will see it modelled there.

We will be modelling the conditions for sending electronic communications. Put simply, in order to not be in breach of the law, you need to:
 * Get the recipient's permission
 * Be clear about who you are in the message
 * Provide the user an easy way to unsubscribe from future communications.
 
More information about this can be found on the [ACMA site](https://www.acma.gov.au/Industry/Marketers/Anti-Spam/Ensuring-you-dont-spam/acma---what-is-a-commercial-electronic-message---fs162-1). However, an in-depth knowledge of this domain is not neccessary. 

#### Encoding the rules
If you look under the rules tab under this domain, we have only two rules:
1. Default sendCommercialElectronicMessage is FORBIDDEN
  * Overriden by: 2. Conditions required to send a commercial electronic message
2. If isConsentAcquired and isIdentityClear and hasUnsubscribeFunction then sendCommercialElectronicMessage is PERMITTED

Roughly speaking, we can understand it as sending commercial messages is forbidden UNLESS isConsentAcquired is true AND isIdentityClear is true AND hasUnsubscribeFunction is true.
Since we are interested in to see when sendCommercialElectronicMessage is PERMITTED, we have tagged that atom in the metadata.csv file with the goal "canSend" and the modality of "PERMITTED".

This means that when we POST to the endpoint /api/canSend/questions was are asking what questions we need to ask to fulfill that goal.


### GET /api/schema
This endpoint returns back all the atoms in the domain merged with the fields specified in csv/metadata.csv. The role of this csv file is to identify which atoms are the goal atoms and to provide a mechanism to attach additional pieces of metadata to individual atoms in the domain.
 
In this example, atomType and description is returned back from RaaP whereas question, goal and modality come from the metadata.csv. 

Sample response:
````
{
    "hasUnsubscribeFunction": {
        "atomType": "BOOL",
        "description": "A commercial electronic message must contain a functional and legitimate 'unsubscribe' facility",
        "question": "Can a user easily unsubscribe?"
    },
    "isConsentAcquired": {
        "atomType": "BOOL",
        "description": "Consent means either express consent where it is given directly or inferred consent where it can be reasonably inferred from the conduct and the nature of business",
        "question": "Has the user provided consent either express or inferred?"
    },
    "isIdentityClear": {
        "atomType": "BOOL",
        "description": "A commercial electronic message must contain clear and accurate information about the individual or organisation who authorised the sending of the message",
        "question": "Is it clear who is sending the email?"
    },
    "sendCommercialElectronicMessage": {
        "atomType": "BOOL",
        "description": "A commercial electronic message is a message sent by email, sms, mms or instant messenger",
        "goal": "canSend",
        "modality": "PERMITTED"
    }
}
```` 


### POST /api/:goal/questions
This endpoint takes in an object of atom values and returns back the contributing atoms to reach the specified goals identified in metadata.
Under the hood, it calls the /input-atoms RaaP endpoint.

Sample request:
```
{
	"hasUnsubscribeFunction":true,
	"isConsentAcquired":true
}
```

Sample response:
```
{
    "isIdentityClear": {
        "atomType": "BOOL",
        "description": "A commercial electronic message must contain clear and accurate information about the individual or organisation who authorised the sending of the message",
        "question": "Is it clear who is sending the email?"
    }
}
```

### POST /api/:goal/answers
This endpoint takes in an object of atom values and returns back the reasoning result for each specified goal identified in metadata.
Under the hood, it calls the /reason RaaP endpoint.

Sample request:
```
{
	"hasUnsubscribeFunction":true,
	"isConsentAcquired":true,
	"isIdentityClear": true
}
```

Sample response:
```
{
    "sendCommercialElectronicMessage": {
        "result": {
            "PERMITTED": {
                "reasoningResult": "CONCLUSIVE"
            },
            "not": {
                "reasoningResult": "INCOMPLETE"
            },
            "FORBIDDEN": {
                "reasoningResult": "INCOMPLETE"
            },
            "reasoningResult": "INCOMPLETE"
        },
        "type": "BOOL",
        "atomType": "BOOL",
        "description": "A commercial electronic message is a message sent by email, sms, mms or instant messenger",
        "goal": "canSend",
        "modality": "PERMITTED"
    }
}
```
---
The Software is copyright (c) 2017 Commonwealth Scientific and Industrial Research Organisation (CSIRO) ABN 41 687 119 230. All rights reserved.

CSIRO grants you a licence to access the RaaP Sample Application on the terms of the MIT License published by the [Open Source Initiative](https://opensource.org/licenses/MIT) and included in this repository. Nothing in the MIT Licence derogates from any applicable Australian Consumer Laws that cannot be excluded.

DISCLAIMER AND UNDERTAKING
------------------------------------------------
By registering for access to the Regulation as a Platform API (RaaP API) the User acknowledges the following limitations on use.
          The digital rules and reasoner output:
1.    Have no status or standing in law.
2.    Do not represent any form of legal advice, or opinion of the relevant regulator.
3.    Cannot be relied upon for the purpose of decision making or compliance.
4.    Are provided to users for test purposes only to support the development of test applications - no guarantee is provided as to the accuracy of the rules or reasoner output.

By registering for access to the Regulation as a Platform API the User provides and agree to be bound by the following undertaking.
The User undertakes:
1.    To ensure that any third party accessing their software is made expressly aware of the above limitations on RaaP API use.
2.    Not to induce any reliance by a third party, directly or indirectly, or through any act or omission, on the rules or reasoner output via their software.
3.    Neither the name of CSIRO nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission of CSIRO.
