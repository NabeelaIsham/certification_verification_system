const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');

test('coverage configuration still loads YAML with the scoped js-yaml override', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'certiverxia-coverage-'));
  const filename = path.join(directory, '.nycrc.yaml');
  try {
    fs.writeFileSync(filename, 'all: true\ninclude:\n  - Backend/**/*.js\n');
    const config = await loadNycConfig({ cwd: directory, nycrcPath: filename });
    expect(config.all).toBe(true);
    expect(config.include).toEqual(['Backend/**/*.js']);
  } finally {
    fs.unlinkSync(filename);
    fs.rmdirSync(directory);
  }
});
