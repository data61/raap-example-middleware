//not for production use, example showing api usage only
const rootNode = document.getElementById('root');
let answersSupplied = {};

const restartButton = document.getElementById('restart');

restartButton.addEventListener('click', () => {
  window.location.reload();
});

/*
* This function makes a request to the /api/:goal/questions endpoint in the middleware which will then flow through to /input-atoms endpoint of RaaP
* */
function getQuestions(answersSupplied) {
  return fetch('//localhost:3000/api/canSend/questions', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(answersSupplied)
  }).then(resp => resp.json());
}

/*
* This function makes a request to the /api/:goal/answers endpoint in the middleware which will then flow through to /reason endpoint of RaaP
* */
function getAnswers(answersSupplied) {
  return fetch('//localhost:3000/api/canSend/answers', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(answersSupplied)
  }).then(resp => resp.json());
}

function displayQuestion(unAnsweredQuestions) {
  if (Object.keys(unAnsweredQuestions).length === 0) {
    //no more questions, sending answersSupplied to answers endpoint
    getAnswers(answersSupplied).then(displayAnswer);
  } else {
    //in this example, we ask the user one question at a time
    const atomId = Object.keys(unAnsweredQuestions)[0];
    const questionData = unAnsweredQuestions[atomId];
    rootNode.innerHTML = `
    <h2>${questionData.question}</h2>
    <form id="question" class="pure-form">
      <label><input type="radio" value="true" name="answer"> Yes</label>
      <label><input type="radio" value="false" name="answer"> No</label>
      <button class="pure-button pure-button-primary">Next</button>
    </form>
`;

    const form = document.getElementById('question');
    form.addEventListener('submit', e => {
      e.preventDefault();
      e.stopPropagation();

      const formData = new FormData(form);
      answersSupplied[atomId] = (formData.get('answer') === "true");

      getQuestions(answersSupplied)
        .then(unAnsweredQuestions => displayQuestion(unAnsweredQuestions));
    })
  }
}

function displayAnswer(answers) {
  rootNode.innerHTML = `<h2>Answers supplied</h2>`;
  rootNode.appendChild(mapAnswersSuppliedToTable(answersSupplied));
  const resultHeader = document.createElement('h2');
  resultHeader.textContent = 'Result';
  rootNode.appendChild(resultHeader);

  const result = answers.sendCommercialElectronicMessage.result;
  rootNode.appendChild(mapResultToTable(result));
}

function mapAnswersSuppliedToTable(answersSupplied) {
  const table = document.createElement('table');
  table.classList.add('pure-table');

  Object.keys(answersSupplied).forEach(key => {
    const tr = document.createElement('tr');
    const keyElement = document.createElement('td');
    keyElement.textContent = key;
    const valueElement = document.createElement('td');
    valueElement.textContent = answersSupplied[key];
    tr.appendChild(keyElement);
    tr.appendChild(valueElement);
    table.appendChild(tr);
  });

  return table;
}

function mapResultToTable(result) {
  const table = document.createElement('table');
  table.classList.add('pure-table');

  table.innerHTML = `
<thead>
    <tr>
      <th>sendCommercialElectronicMessage</th>
      <th>result</th>
    </tr>
</thead>
<tbody>
    <tr><td>PERMITTED</td><td>${result.PERMITTED.reasoningResult}</td></tr>
    <tr><td>FORBIDDEN</td><td>${result.FORBIDDEN.reasoningResult}</td></tr>
</tbody>
`;
  return table;
}

getQuestions(answersSupplied)
  .then(unAnsweredQuestions => displayQuestion(unAnsweredQuestions));