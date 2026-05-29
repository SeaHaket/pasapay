// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC20 standard token used for batch distributions.
 */
interface IERC20 {
    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's allowance.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}

/**
 * @title PasaPayBatchRouter
 * @author Senior Web3 Full-Stack Architect
 * @notice Gas-optimized batch transfer router for ERC20 tokens designed for Celo / MiniPay.
 * @dev Optimizes multiple ERC20 transfers into a single transaction to bypass sequential client loops,
 * fully integrating with Celo's CIP-64 gas fee currency abstraction layer.
 */
contract PasaPayBatchRouter {
    // Custom gas-efficient errors
    error InvalidLength();
    error ZeroAddress();
    error EmptyBatch();
    error TransferFailed();

    /**
     * @notice Distributes a single ERC20 token to multiple recipients in a single transaction.
     * @dev The caller must approve this contract to spend the cumulative amounts of tokens beforehand.
     *      No tokens are held in this contract; transfers occur directly from `msg.sender`.
     * @param token The contract address of the ERC20 token to distribute (e.g. USDT, USDC, USDm).
     * @param recipients An array of recipient addresses.
     * @param amounts An array of distribution amounts corresponding to each recipient in `recipients`.
     */
    function batchTransferERC20(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        if (token == address(0)) revert ZeroAddress();
        
        uint256 length = recipients.length;
        if (length == 0) revert EmptyBatch();
        if (length != amounts.length) revert InvalidLength();

        for (uint256 i = 0; i < length; i++) {
            address recipient = recipients[i];
            if (recipient == address(0)) revert ZeroAddress();
            
            uint256 amount = amounts[i];
            if (amount > 0) {
                bool success = IERC20(token).transferFrom(msg.sender, recipient, amount);
                if (!success) revert TransferFailed();
            }
        }
    }
}
