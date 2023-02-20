const Voting = artifacts.require("Voting");

module.exports = function (_deployer) {
  // Use deployer to state migration tasks.
  _deployer.deploy(Voting);
};
