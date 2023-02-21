# Test unit explications Projet #2

### Testing revert for `getVoter()` & `getOneProposal(uint)`

```
   it("should revert because onlyVoters modifier is used", async () => {
    const r = await expectRevert(
      contractIstance.getVoter(owner, { from: registeredAccount }),
      "You're not a voter"
    );
  });
```

### Testing add voters

1. Check revert onlyOwner modifier from openzeppelin
2. Add new voter
3. Check revert if the voter is already registered
4. Check if the event is emit
5. Get voter and check if voter is registered
6. Change `WorkflowStatus` and check the revert sorkflow status

```
 it("should add voter", async () => {
    await expectRevert(
      contractIstance.addVoter(owner, { from: account1 }),
      "Ownable: caller is not the owner"
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
```

### Testing add proposal

1. Check revert caller is not voter
2. Check revert work flow proposals need to be `ProposalsRegistrationStarted`
3. Check revert description !== empty
4. Add proposal
5. Check if `ProposalRegistered` event id emit
6. Get proposal by `Id`
7. Expect proposal description

```
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

    const desc = "My proposal !";
    const tx = await contractIstance.addProposal(desc);

    await expectEvent(tx, "ProposalRegistered");

    const proposal = await contractIstance.getOneProposal(1);

    expect(proposal.description).to.equal(desc);
  });
```

### Testing set vote

1. Check revert caller is not voter
2. Check revert work flow proposals need to be `VotingSessionStarted`
3. Change proposal work flow and add proposal
4. Change proposal work flow to start voting session
5. Check revert if `proposalId` does't exists
6. Check proposal `voteCount` after and before the `setVote`
7. Check if Voted event id emit

```
  it("should set a vote", async () => {
    await expectRevert(contractIstance.setVote(0), notVoter);

    await contractIstance.addVoter(owner);
    await expectRevert(
      contractIstance.setVote(0),
      "Voting session havent started yet"
    );

    await contractIstance.startProposalsRegistering();
    await contractIstance.addProposal(desc);
    await contractIstance.endProposalsRegistering();

    await contractIstance.startVotingSession();

    await expectRevert(contractIstance.setVote(42), "Proposal not found");

    let proposal = await contractIstance.getOneProposal(1);
    expect(proposal.voteCount).to.be.bignumber.equal(new BN(0));

    const tx = await contractIstance.setVote(1);

    proposal = await contractIstance.getOneProposal(1);
    expect(proposal.voteCount).to.be.bignumber.equal(new BN(1));

    await expectEvent(tx, "Voted");
  });
```

### Testing change work flow to start proposals registering

1. Add owner to voters
2. Check revert onlyOwner modifier from openzeppelin
3. Change workflow to start proposals registering
4. Check revert if call `startProposalsRegistering` without `RegisteringVoters` status
5. Check if `WorkflowStatusChange` is emit
6. Check if the proposal genesis was create

```
it("should change work flow to start proposals registering", async () => {
    await contractIstance.addVoter(owner);
    const tx = await contractIstance.startProposalsRegistering();

    await expectRevert(
      contractIstance.startProposalsRegistering(),
      "Registering proposals cant be started now"
    );

    expectEvent(tx, "WorkflowStatusChange");

    const proposal = await contractIstance.getOneProposal(0);

    expect(proposal.description).to.equal("GENESIS");
  });
```

### Testing change work flow to end proposals registering

1. Check revert onlyOwner modifier from openzeppelin
2. Check revert proposals havent started yet
3. Change work flow status
4. Check if event `WorkflowStatusChange` is emit

```
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
```

### Testing change work flow to start voting session

1. Check revert onlyOwner modifier from openzeppelin
2. Check revert proposals registering is not finished.
3. Change work flow status
4. Check if event `WorkflowStatusChange` is emit

```
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
```

### Testing change work flow to end voting session

1. Check revert onlyOwner modifier from openzeppelin
2. Check revert VotingSessionNotStarted.
3. Change work flow status
4. Check if event `WorkflowStatusChange` is emit

```
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

```

### Testing tally votes

1. Check revert onlyOwner modifier from openzeppelin
2. Check revert work flow status is not voting session ended.
3. Check if `winningProposalID` is equal 0 (Defaul value)
4. Add voter (owner)
5. Change workflow status
6. Add proposal
7. Change workflow status
8. Set vote to 1
9. Change workflow status
10. Call `tallyVotes`
11. Check if `WorkflowStatusChange` is emit
12. Check if `winningProposalID` has change and if is equal 1

```
  it("should tally votes", async () => {
    await expectRevert(
      contractIstance.tallyVotes({ from: account1 }),
      notOwner
    );

    await expectRevert(
      contractIstance.tallyVotes(),
      "Current status is not voting session ended"
    );

    let winner = (await contractIstance.winningProposalID.call()).words[0];
    expect(new BN(winner)).to.be.bignumber.equal(zero);

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
    expect(new BN(winner)).to.be.bignumber.equal(one);
  });
```
