const fs = require('fs');
jest.mock('child_process', () => ({ spawnSync: jest.fn() }));
const { spawnSync } = require('child_process');
const { runMongoTool } = require('../../Backend/utils/mongoTools');
const { run: restore } = require('../../Backend/scripts/restoreBackupDrill');
const mongoose = require('mongoose');

test.each([0, 1])('database tools keep connection secrets out of arguments and clean up on status %s', status => {
  let configPath;
  const uri = 'mongodb://test-user:test-password@localhost/test';
  spawnSync.mockImplementation((_executable, args) => {
    expect(args.join(' ')).not.toContain(uri);
    configPath = args[1];
    expect(JSON.parse(fs.readFileSync(configPath, 'utf8'))).toEqual({ uri });
    return { status };
  });
  const invoke = () => runMongoTool('mongodump', uri, ['--archive=fixture', '--gzip']);
  if (status === 0) invoke();
  else expect(invoke).toThrow('MongoDB Database Tools command failed');
  expect(fs.existsSync(configPath)).toBe(false);
});

test('restore refuses a production database before connecting or starting mongorestore', async () => {
  const previousUri = process.env.RESTORE_MONGODB_URI;
  const previousSource = process.env.BACKUP_SOURCE_DATABASE;
  const previousArgs = process.argv;
  const connect = jest.spyOn(mongoose, 'connect');
  spawnSync.mockClear();
  process.env.RESTORE_MONGODB_URI = 'mongodb://localhost/certiverxia';
  process.env.BACKUP_SOURCE_DATABASE = 'certiverxia';
  process.argv = ['node', 'restoreBackupDrill.js', 'fixture.archive.gz'];
  try {
    await expect(restore()).rejects.toThrow('dedicated certverify_restore_check_');
    expect(connect).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  } finally {
    if (previousUri === undefined) delete process.env.RESTORE_MONGODB_URI;
    else process.env.RESTORE_MONGODB_URI = previousUri;
    if (previousSource === undefined) delete process.env.BACKUP_SOURCE_DATABASE;
    else process.env.BACKUP_SOURCE_DATABASE = previousSource;
    process.argv = previousArgs;
    connect.mockRestore();
  }
});
