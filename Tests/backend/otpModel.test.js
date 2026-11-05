const OTP = require('../../Backend/models/OTP');

test('legacy OTP expiry migration enables aggregation pipeline updates', async () => {
  const indexes = jest.spyOn(OTP.collection, 'indexes').mockResolvedValue([]);
  const updateMany = jest.spyOn(OTP, 'updateMany').mockResolvedValue({ modifiedCount: 0 });

  await OTP.cleanLegacyIndexes();

  expect(indexes).toHaveBeenCalledTimes(1);
  expect(updateMany).toHaveBeenCalledWith(
    { expiresAt: { $exists: false } },
    [{ $set: { expiresAt: { $add: ['$createdAt', 300000] } } }],
    { updatePipeline: true }
  );
});
