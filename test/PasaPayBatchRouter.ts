import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PasaPayBatchRouter", function () {
  let batchRouter: any;
  let mockToken: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    addr1 = signers[1];
    addr2 = signers[2];
    addr3 = signers[3];

    // Deploy Mock ERC20 Token with 1,000,000 tokens (18 decimals)
    const initialSupply = ethers.parseEther("1000000");
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy(initialSupply);

    // Deploy PasaPayBatchRouter
    const PasaPayBatchRouterFactory = await ethers.getContractFactory("PasaPayBatchRouter");
    batchRouter = await PasaPayBatchRouterFactory.deploy();
  });

  describe("Batch ERC20 Distributions", function () {
    it("should successfully distribute tokens and perfectly consume allowance", async function () {
      const tokenAddress = await mockToken.getAddress();
      const routerAddress = await batchRouter.getAddress();

      const recipients = [addr1.address, addr2.address, addr3.address];
      const amounts = [
        ethers.parseEther("150.5"), // Recipient 1
        ethers.parseEther("249.5"), // Recipient 2
        ethers.parseEther("600.0"), // Recipient 3
      ];
      const totalSum = ethers.parseEther("1000.0"); // Total batch sum

      // 1. Check initial state
      const initialOwnerBalance = await mockToken.balanceOf(owner.address);
      expect(initialOwnerBalance).to.equal(ethers.parseEther("1000000"));
      expect(await mockToken.balanceOf(routerAddress)).to.equal(0n);

      // 2. Approve Batch Router to spend 1000 tokens
      await mockToken.approve(routerAddress, totalSum);
      expect(await mockToken.allowance(owner.address, routerAddress)).to.equal(totalSum);

      // 3. Execute batch distribution
      await expect(batchRouter.batchTransferERC20(tokenAddress, recipients, amounts))
        .to.not.be.reverted;

      // 4. Verify balances post-distribution
      expect(await mockToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("150.5"));
      expect(await mockToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("249.5"));
      expect(await mockToken.balanceOf(addr3.address)).to.equal(ethers.parseEther("600.0"));

      // 5. Verify perfect allowance consumption (should be exactly 0 leftover)
      const remainingAllowance = await mockToken.allowance(owner.address, routerAddress);
      expect(remainingAllowance).to.equal(0n);

      // 6. Verify zero leftovers stuck in the router
      const routerTokenBalance = await mockToken.balanceOf(routerAddress);
      expect(routerTokenBalance).to.equal(0n);

      // 7. Verify owner spent exactly the totalSum
      const finalOwnerBalance = await mockToken.balanceOf(owner.address);
      expect(initialOwnerBalance - finalOwnerBalance).to.equal(totalSum);
    });

    it("should revert if recipients and amounts lengths mismatch", async function () {
      const tokenAddress = await mockToken.getAddress();
      const routerAddress = await batchRouter.getAddress();

      const recipients = [addr1.address, addr2.address];
      const amounts = [ethers.parseEther("100")];

      await mockToken.approve(routerAddress, ethers.parseEther("100"));

      await expect(batchRouter.batchTransferERC20(tokenAddress, recipients, amounts))
        .to.be.revertedWithCustomError(batchRouter, "InvalidLength");
    });

    it("should revert if recipients array is empty", async function () {
      const tokenAddress = await mockToken.getAddress();

      const recipients: string[] = [];
      const amounts: bigint[] = [];

      await expect(batchRouter.batchTransferERC20(tokenAddress, recipients, amounts))
        .to.be.revertedWithCustomError(batchRouter, "EmptyBatch");
    });

    it("should revert if token address is 0x0", async function () {
      const recipients = [addr1.address];
      const amounts = [ethers.parseEther("100")];

      await expect(batchRouter.batchTransferERC20(ethers.ZeroAddress, recipients, amounts))
        .to.be.revertedWithCustomError(batchRouter, "ZeroAddress");
    });

    it("should revert if any recipient address is 0x0", async function () {
      const tokenAddress = await mockToken.getAddress();
      const routerAddress = await batchRouter.getAddress();

      const recipients = [addr1.address, ethers.ZeroAddress];
      const amounts = [ethers.parseEther("50"), ethers.parseEther("50")];

      await mockToken.approve(routerAddress, ethers.parseEther("100"));

      await expect(batchRouter.batchTransferERC20(tokenAddress, recipients, amounts))
        .to.be.revertedWithCustomError(batchRouter, "ZeroAddress");
    });

    it("should skip transfers with 0 amount without reverting", async function () {
      const tokenAddress = await mockToken.getAddress();
      const routerAddress = await batchRouter.getAddress();

      const recipients = [addr1.address, addr2.address];
      const amounts = [ethers.parseEther("50"), 0n];

      await mockToken.approve(routerAddress, ethers.parseEther("50"));

      await expect(batchRouter.batchTransferERC20(tokenAddress, recipients, amounts))
        .to.not.be.reverted;

      expect(await mockToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("50"));
      expect(await mockToken.balanceOf(addr2.address)).to.equal(0n);
      expect(await mockToken.allowance(owner.address, routerAddress)).to.equal(0n);
    });
  });
});
