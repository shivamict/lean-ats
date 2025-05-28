const handler = require('./scoreCandidate.js');

module.exports = async function scoreCandidate(candidateText, job) {
  // Mimic the API handler's req/res logic, but as a function
  // Create mock req/res objects
  let result;
  const req = {
    method: 'POST',
    body: { candidateText, job },
  };
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      result = data;
      return data;
    }
  };
  await handler.default(req, res);
  return result;
};
