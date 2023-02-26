const Voting = artifacts.require("Voting");
const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Voting", function (accounts) {
  let contractIstance;
  const owner = accounts[0];
  const account1 = accounts[1];
  const zero = new BN(0);
  const one = new BN(1);

  const notVoter = "You're not a voter";
  const notOwner = "Ownable: caller is not the owner";
  const VotingSessionNotStarted = "Voting session havent started yet.";
  const desc = "My proposal !";

  beforeEach(async () => {
    contractIstance = await Voting.new();
  });

  describe("Getters", () => {
    it("should revert getter because onlyVoters modifier is used", async () => {
      await expectRevert(
        contractIstance.getVoter(owner, { from: owner }),
        notVoter
      );

      await expectRevert(
        contractIstance.getOneProposal(0, { from: owner }),
        notVoter
      );
    });
  });

  describe("Setters", () => {
    it("should add voter", async () => {
      await expectRevert(
        contractIstance.addVoter(owner, { from: account1 }),
        notOwner
      );

      const tx = await contractIstance.addVoter(owner);
      await expectRevert(contractIstance.addVoter(owner), "Already registered");
      expectEvent(tx, "VoterRegistered");

      const voter = await contractIstance.getVoter(owner);
      expect(voter.isRegistered).to.equal(true);

      await contractIstance.startProposalsRegistering();

      await expectRevert(
        contractIstance.addVoter(owner),
        "Voters registration is not open yet"
      );
    });

    it("should add proposal", async () => {
      await expectRevert(contractIstance.addProposal(""), notVoter);
      await contractIstance.addVoter(owner);
      await expectRevert(
        contractIstance.addProposal(""),
        "Proposals are not allowed yet"
      );

      await contractIstance.startProposalsRegistering();

      await expectRevert(
        contractIstance.addProposal(""),
        "Vous ne pouvez pas ne rien proposer"
      );

      const tx = await contractIstance.addProposal(desc);

      await expectEvent(tx, "ProposalRegistered");

      const proposal = await contractIstance.getOneProposal(1);

      expect(proposal.description).to.equal(desc);
    });

    it("should set a vote", async () => {
      await expectRevert(contractIstance.setVote(0), notVoter);

      await contractIstance.addVoter(owner);
      await expectRevert(contractIstance.setVote(0), VotingSessionNotStarted);

      await contractIstance.startProposalsRegistering();
      await contractIstance.addProposal(desc);
      await contractIstance.endProposalsRegistering();

      await contractIstance.startVotingSession();

      await expectRevert(contractIstance.setVote(42), "Proposal not found");

      let proposal = await contractIstance.getOneProposal(1);
      expect(proposal.voteCount).to.be.bignumber.equal(zero);

      const tx = await contractIstance.setVote(1);

      proposal = await contractIstance.getOneProposal(1);
      expect(proposal.voteCount).to.be.bignumber.equal(one);

      await expectEvent(tx, "Voted");
    });
  });

  describe("Workflow status changes", () => {
    it("should change work flow to start proposals registering", async () => {
      await contractIstance.addVoter(owner);
      await expectRevert(
        contractIstance.startProposalsRegistering({
          from: account1,
        }),
        notOwner
      );

      const tx = await contractIstance.startProposalsRegistering();

      await expectRevert(
        contractIstance.startProposalsRegistering(),
        "Registering proposals cant be started now"
      );

      expectEvent(tx, "WorkflowStatusChange");

      const proposal = await contractIstance.getOneProposal(0);

      expect(proposal.description).to.equal("GENESIS");
    });

    it("should change work flow to end proposals registering", async () => {
      await expectRevert(
        contractIstance.endProposalsRegistering({
          from: account1,
        }),
        notOwner
      );

      await expectRevert(
        contractIstance.endProposalsRegistering(),
        "Registering proposals havent started yet"
      );

      await contractIstance.startProposalsRegistering();
      const tx = await contractIstance.endProposalsRegistering();

      expectEvent(tx, "WorkflowStatusChange");
    });

    it("should change work flow to start voting session", async () => {
      await expectRevert(
        contractIstance.startVotingSession({
          from: account1,
        }),
        notOwner
      );

      await expectRevert(
        contractIstance.startVotingSession(),
        "Registering proposals phase is not finished."
      );

      await contractIstance.startProposalsRegistering();
      await contractIstance.endProposalsRegistering();

      const tx = await contractIstance.startVotingSession();
      expectEvent(tx, "WorkflowStatusChange");
    });

    it("should change work flow to end voting session", async () => {
      await expectRevert(
        contractIstance.endVotingSession({
          from: account1,
        }),
        notOwner
      );

      await expectRevert(
        contractIstance.endVotingSession(),
        VotingSessionNotStarted
      );

      await contractIstance.startProposalsRegistering();
      await contractIstance.endProposalsRegistering();
      await contractIstance.startVotingSession();

      const tx = await contractIstance.endVotingSession();
      expectEvent(tx, "WorkflowStatusChange");
    });
  });

  describe("should tally votes", () => {
    it("should tally votes and check winner before call the tallyVotes()", async () => {
      await expectRevert(
        contractIstance.tallyVotes({ from: account1 }),
        notOwner
      );
      await expectRevert(
        contractIstance.tallyVotes(),
        "Current status is not voting session ended"
      );

      let winner = (await contractIstance.winningProposalID.call()).words[0];
      expect(BN(winner)).to.be.bignumber.equal(zero);

      await contractIstance.addVoter(owner);
      await contractIstance.startProposalsRegistering();
      await contractIstance.addProposal(desc);
      await contractIstance.endProposalsRegistering();
      await contractIstance.startVotingSession();
      await contractIstance.setVote(1);
      await contractIstance.endVotingSession();

      const tx = await contractIstance.tallyVotes();
      await expectEvent(tx, "WorkflowStatusChange");
      winner = (await contractIstance.winningProposalID.call()).words[0];
      expect(BN(winner)).to.be.bignumber.equal(one);
    });
  });
});
