'use strict';

function multiBundleRevs() {
  const names = [ 'dummy-1', 'dummy_2', 'dummy03', 'dummy-v2.x' ];
  const revs = [
    '2afec0cdb96c29974223660ed462d1d6638e3fc9        refs/heads/greenkeeper/express-4.17.1',
    '28cdf1b8653c735c3b8b931723a5946f641fb8c3        refs/heads/greenkeeper/ejs-3.0.2',
    'a7e3ec23abe9ea8aa50df9b009db650445489564        refs/heads/greenkeeper/ejs-3.1.2',
    '72f628541feba6613bd7db85125b91a74ed893d2        refs/heads/greenkeeper/ejs-3.1.3',
    '8954e22142b5db1e637585f12795cf0f0ba5fdff        refs/heads/greenkeeper/express-session-1.17.2',
    '1d35ee465c7a88c7f8a8e41400805e75f7ecc32f        refs/heads/greenkeeper/mocha-9.1.0',
    'd1d92924f4d1f71ab5d17305d5c455fe8499e7b6        refs/heads/dummy-1',
    '3184060ebc97d65056170a735c441825d7805e26        refs/heads/dummy_2',
    '3a48ae28c33dab29ef3df6fc3a4ae304e8422f71        refs/heads/dummy03',
    '4b52d4039796572d168067fde31aa24d21211e5b        refs/heads/dummy',
    '60c3106b39c745ab082992151ded44f8472005a9        refs/heads/dummy-v2.x',
    '44f0fc9ce0f7aefe1b1f836efcf1ef8b46da17a7        refs/heads/v2.x-fix-some-defect',
    '7b5b1a4f391756c24365914f38d19d24626bda52        refs/heads/v3.x',
    '4a481c4404767e2b72b1c95159167761524841bd        refs/heads/add-validations',
    '23d5030538d24d540daede92e4bb170d9b8141da        refs/tags/dummy-v2.x-2.2.0',
    '9574faf395fcfd1d53c7ff050b14b34840fba169        refs/tags/dummy-1:v0.6.1',
    'dc2f43ca0145e87085932061e419071e387dc75e        refs/tags/dummy-1/v0.6.2',
    'a12f9fca86e9542c58a1b02ce7357890a4eed9ce        refs/tags/v0.7.0-dumm',
    'a12f9fca86e9542c58a1b02ce7357890a4eed9ce        refs/tags/v0.7.1-dummy_2',
    'bb40b0774ec4a83cdb6247492fa1afc5c5960559        refs/tags/v0.7.2',
    '9439972b0c5540831cea5384656c737e32821661        refs/tags/v1.0.0',
    '59a88a2be30a2b660d155d9c1b0b7bfa9febe30c        refs/tags/dummy03/v1.0.0-rc.1',
    '77ed2a0d62835bbd1ef80d193179b2c93c92bda6        refs/tags/dummy-1-v1.0.0-rc.2',
    '56075ad5284dc7525d0c558110c257a43164519a        refs/tags/v1.0.0-rc.3:dummy_2',
    '69babd301b8720b30a3a73e6821423612029f1ad        refs/tags/v1.0.1',
    '2e55116ff0ed1cc5fc7de700c58af34ea343d9fc        refs/tags/v1.0.2',
    '77e3a503ba45ba464790a42b4c51c1307a848a29        refs/tags/v1.0.3',
    '728226b6022bdb41acc3004c9b3d179d1c1d8e51        refs/tags/v1.0.4',
    '49a4fca1ac2a55d0f917e10cdd5922576dcd1693        refs/tags/v1.0.5',
    '26ccaf5f28e75717ecb1f75787dc981b6442d05a        refs/tags/v1.0.6',
    'b3f40e0b70b17be413fcf9a25f59236ad6d8ea39        refs/tags/v2.0.0',
    '4849454d65fa107ed904779e8a59c4e8a849da58        refs/tags/v2.0.0-rc.1-dummy03',
    'eee4757dd663e2694dc0fa04513363dabc9b00aa        refs/tags/v2.0.1',
    '4aeba73554d7bdadc85d4d40cd794f935323c279        refs/tags/v2.1.0',
    'e0c7d6c951c9267dd1db5ceaca31677aac892db0        refs/tags/v2.3.0',
  ];

  return [ [...names], [...revs] ];
}

function singleBundleRevs() {
  const name = 'dummy';
  const revs = [
    '2afec0cdb96c29974223660ed462d1d6638e3fc9        refs/heads/greenkeeper/express-4.17.1',
    '28cdf1b8653c735c3b8b931723a5946f641fb8c3        refs/heads/greenkeeper/ejs-3.0.2',
    'a7e3ec23abe9ea8aa50df9b009db650445489564        refs/heads/greenkeeper/ejs-3.1.2',
    '72f628541feba6613bd7db85125b91a74ed893d2        refs/heads/greenkeeper/ejs-3.1.3',
    '8954e22142b5db1e637585f12795cf0f0ba5fdff        refs/heads/greenkeeper/express-session-1.17.2',
    '1d35ee465c7a88c7f8a8e41400805e75f7ecc32f        refs/heads/greenkeeper/mocha-9.1.0',
    'd1d92924f4d1f71ab5d17305d5c455fe8499e7b6        refs/heads/static',
    '2c4d0ecf4f3d325b9fd72effc6f7c7369bf1g006        refs/heads/master',
    '3184060ebc97d65056170a735c441825d7805e26        refs/heads/v0.6.x',
    '3a48ae28c33dab29ef3df6fc3a4ae304e8422f71        refs/heads/v0.7.x',
    '4b52d4039796572d168067fde31aa24d21211e5b        refs/heads/v1.0.x',
    '60c3106b39c745ab082992151ded44f8472005a9        refs/heads/v2.x',
    '44f0fc9ce0f7aefe1b1f836efcf1ef8b46da17a7        refs/heads/v2.x-fix-some-defect',
    '7b5b1a4f391756c24365914f38d19d24626bda52        refs/heads/v3.x',
    '4a481c4404767e2b72b1c95159167761524841bd        refs/heads/add-validations',
    '23d5030538d24d540daede92e4bb170d9b8141da        refs/tags/2.2.0',
    '9574faf395fcfd1d53c7ff050b14b34840fba169        refs/tags/v0.6.1',
    'dc2f43ca0145e87085932061e419071e387dc7        refs/tags/v0.6.2',
    'a12f9fca86e9542c58a1b02ce7357890a4eed9ce        refs/tags/v0.7.0',
    '8d11425b3fafbc9fc2563669649bc809251ec34d        refs/tags/v0.7.1',
    'bb40b0774ec4a83cdb6247492fa1afc5c5960559        refs/tags/v0.7.2',
    'b4123fd158d25af2fa1ab8375ef586b932a337c5        refs/tags/v0.7.3',
    '8bd4bceca8884e876127c7205e819baab8a0f31d        refs/tags/v0.7.4',
    'ca442129c761e244cbe65efcd0109d054ac018ba        refs/tags/v0.7.5',
    '9439972b0c5540831cea5384656c737e32821661        refs/tags/v1.0.0',
    '59a88a2be30a2b660d155d9c1b0b7bfa9febe30c        refs/tags/v1.0.0-rc.1',
    '77ed2a0d62835bbd1ef80d193179b2c93c92bda6        refs/tags/v1.0.0-rc.2',
    '56075ad5284dc7525d0c558110c257a43164519a        refs/tags/v1.0.0-rc.3',
    '69babd301b8720b30a3a73e6821423612029f1ad        refs/tags/v1.0.1',
    '2e55116ff0ed1cc5fc7de700c58af34ea343d9fc        refs/tags/v1.0.2',
    '77e3a503ba45ba464790a42b4c51c1307a848a29        refs/tags/v1.0.3',
    '728226b6022bdb41acc3004c9b3d179d1c1d8e51        refs/tags/v1.0.4',
    '49a4fca1ac2a55d0f917e10cdd5922576dcd1693        refs/tags/v1.0.5',
    '26ccaf5f28e75717ecb1f75787dc981b6442d05a        refs/tags/v1.0.6',
    'b3f40e0b70b17be413fcf9a25f59236ad6d8ea39        refs/tags/v2.0.0',
    '4849454d65fa107ed904779e8a59c4e8a849da58        refs/tags/v2.0.0-rc.1',
    'eee4757dd663e2694dc0fa04513363dabc9b00aa        refs/tags/v2.0.1',
    '4aeba73554d7bdadc85d4d40cd794f935323c279        refs/tags/v2.1.0',
    'e0c7d6c951c9267dd1db5ceaca31677aac892db0        refs/tags/v2.3.0',
  ];
  return [ name, [...revs] ];
}

module.exports = {
  get multi() { return multiBundleRevs(); },
  get single() { return singleBundleRevs(); },
};