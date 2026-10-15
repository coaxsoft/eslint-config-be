const path = require('node:path');

describe('paths', () => {
  it('joins', () => {
    module.exports = path.join(__dirname, process.cwd());
  });
});
