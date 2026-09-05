// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IKynloAssetRegistry } from "./interfaces/IKynloAssetRegistry.sol";

/// @notice A non-upgradeable asset vault for programmable succession.
/// @dev The vault deliberately has no owner or privileged asset-moving function.
contract KynloVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint64 public constant MIN_INACTIVITY_PERIOD = 90 days;
    uint64 public constant MIN_PROTECTION_WINDOW = 30 days;
    uint16 public constant TOTAL_BPS = 10_000;
    uint8 public constant MAX_SUCCESSORS = 3;

    enum PlanState {
        DRAFT,
        ACTIVE,
        PROTECTION,
        SUCCESSION_READY,
        CANCELLED,
        COMPLETED
    }

    struct Successor {
        address account;
        uint16 shareBps;
    }

    struct AssetPosition {
        address token;
        uint256 deposited;
        uint256 remaining;
        uint256 distributionBase;
    }

    struct LegacyPlan {
        address owner;
        uint64 createdAt;
        uint64 lastCheckIn;
        uint64 inactivityPeriod;
        uint64 protectionWindow;
        uint32 successorVersion;
        bool armed;
        bool cancelled;
        bool completed;
    }

    IKynloAssetRegistry public immutable assetRegistry;
    uint256 public nextPlanId = 1;

    mapping(uint256 planId => LegacyPlan) public legacyPlans;
    mapping(uint256 planId => Successor[]) private _successors;
    mapping(uint256 planId => AssetPosition[]) private _assets;
    mapping(uint256 planId => mapping(address token => uint256 indexPlusOne)) private _assetIndex;
    mapping(uint256 planId => mapping(address successor => uint32 version)) public acceptedVersion;
    mapping(uint256 planId => mapping(address successor => mapping(address token => bool))) public
        claimed;
    mapping(address token => uint256 rawAmount) public totalAttributed;

    error InvalidRegistry();
    error PlanNotFound();
    error NotPlanOwner();
    error InvalidSuccessorCount();
    error InvalidSuccessor();
    error DuplicateSuccessor();
    error InvalidAllocation();
    error UnsafeTiming();
    error WrongState(PlanState current);
    error SuccessorNotListed();
    error AlreadyAccepted();
    error AcceptancesIncomplete();
    error UnsupportedStock();
    error DepositsPaused();
    error InvalidAmount();
    error UnsupportedTransferBehavior();
    error AssetNotFound();
    error AlreadyClaimed();
    error ClaimUnavailable();
    error ProtectedMutation();
    error NoAssets();
    error NoClaimEntitlement();

    event LegacyPlanCreated(uint256 indexed planId, address indexed owner, uint32 successorVersion);
    event SuccessorAccepted(
        uint256 indexed planId, address indexed successor, uint32 successorVersion
    );
    event LegacyPlanArmed(uint256 indexed planId, uint64 lastCheckIn);
    event ProofOfLifeCheckedIn(uint256 indexed planId, uint64 lastCheckIn);
    event SuccessorsUpdated(uint256 indexed planId, uint32 successorVersion);
    event TimingUpdated(uint256 indexed planId, uint64 inactivityPeriod, uint64 protectionWindow);
    event AssetDeposited(uint256 indexed planId, address indexed token, uint256 rawAmount);
    event AssetWithdrawn(uint256 indexed planId, address indexed token, uint256 rawAmount);
    event LegacyPlanCancelled(uint256 indexed planId);
    event DistributionBaseRecorded(
        uint256 indexed planId, address indexed token, uint256 rawAmount
    );
    event SuccessionClaimed(
        uint256 indexed planId, address indexed successor, address indexed token, uint256 rawAmount
    );
    event LegacyPlanCompleted(uint256 indexed planId);

    constructor(address registry) {
        if (registry == address(0) || registry.code.length == 0) revert InvalidRegistry();
        assetRegistry = IKynloAssetRegistry(registry);
    }

    function createLegacyPlan(
        Successor[] calldata successors_,
        uint64 inactivityPeriod,
        uint64 protectionWindow
    ) external returns (uint256 planId) {
        _validateTiming(inactivityPeriod, protectionWindow);
        _validateSuccessors(msg.sender, successors_);

        planId = nextPlanId++;
        legacyPlans[planId] = LegacyPlan({
            owner: msg.sender,
            createdAt: uint64(block.timestamp),
            lastCheckIn: 0,
            inactivityPeriod: inactivityPeriod,
            protectionWindow: protectionWindow,
            successorVersion: 1,
            armed: false,
            cancelled: false,
            completed: false
        });
        _storeSuccessors(planId, successors_);
        emit LegacyPlanCreated(planId, msg.sender, 1);
    }

    function acceptSuccessor(uint256 planId) external {
        LegacyPlan storage plan = _plan(planId);
        PlanState state = getEffectiveState(planId);
        if (state != PlanState.DRAFT) revert WrongState(state);
        if (!_isListed(planId, msg.sender)) revert SuccessorNotListed();
        if (acceptedVersion[planId][msg.sender] == plan.successorVersion) revert AlreadyAccepted();

        acceptedVersion[planId][msg.sender] = plan.successorVersion;
        emit SuccessorAccepted(planId, msg.sender, plan.successorVersion);
    }

    function armLegacyPlan(uint256 planId) external {
        LegacyPlan storage plan = _ownedPlan(planId);
        PlanState state = getEffectiveState(planId);
        if (state != PlanState.DRAFT) revert WrongState(state);
        if (!_hasAssets(planId)) revert NoAssets();
        if (!isFullyAccepted(planId)) revert AcceptancesIncomplete();

        plan.armed = true;
        plan.lastCheckIn = uint64(block.timestamp);
        emit LegacyPlanArmed(planId, plan.lastCheckIn);
    }

    function depositAsset(uint256 planId, address token, uint256 rawAmount) external nonReentrant {
        _ownedPlan(planId);
        if (assetRegistry.newDepositsPaused()) revert DepositsPaused();

        PlanState state = getEffectiveState(planId);
        if (state != PlanState.DRAFT && state != PlanState.ACTIVE) revert WrongState(state);
        if (!assetRegistry.isSupportedStock(token)) revert UnsupportedStock();
        if (rawAmount == 0) revert InvalidAmount();

        IERC20 asset = IERC20(token);
        uint256 balanceBefore = asset.balanceOf(address(this));
        asset.safeTransferFrom(msg.sender, address(this), rawAmount);
        uint256 received = asset.balanceOf(address(this)) - balanceBefore;
        if (received != rawAmount) revert UnsupportedTransferBehavior();

        uint256 pointer = _assetIndex[planId][token];
        if (pointer == 0) {
            _assets[planId].push(AssetPosition(token, rawAmount, rawAmount, 0));
            _assetIndex[planId][token] = _assets[planId].length;
        } else {
            AssetPosition storage position = _assets[planId][pointer - 1];
            position.deposited += rawAmount;
            position.remaining += rawAmount;
        }
        totalAttributed[token] += rawAmount;
        emit AssetDeposited(planId, token, rawAmount);
    }

    function checkIn(uint256 planId) external {
        LegacyPlan storage plan = _ownedPlan(planId);
        PlanState state = getEffectiveState(planId);
        if (state != PlanState.ACTIVE && state != PlanState.PROTECTION) revert WrongState(state);

        plan.lastCheckIn = uint64(block.timestamp);
        emit ProofOfLifeCheckedIn(planId, plan.lastCheckIn);
    }

    function updateSuccessors(uint256 planId, Successor[] calldata successors_) external {
        LegacyPlan storage plan = _ownedPlan(planId);
        _requireEditable(planId);
        _validateSuccessors(plan.owner, successors_);

        delete _successors[planId];
        _storeSuccessors(planId, successors_);
        plan.successorVersion += 1;
        plan.armed = false;
        plan.lastCheckIn = 0;
        emit SuccessorsUpdated(planId, plan.successorVersion);
    }

    function updateTiming(uint256 planId, uint64 inactivityPeriod, uint64 protectionWindow)
        external
    {
        LegacyPlan storage plan = _ownedPlan(planId);
        _requireEditable(planId);
        _validateTiming(inactivityPeriod, protectionWindow);

        plan.inactivityPeriod = inactivityPeriod;
        plan.protectionWindow = protectionWindow;
        emit TimingUpdated(planId, inactivityPeriod, protectionWindow);
    }

    function withdrawAsset(uint256 planId, address token, uint256 rawAmount) external nonReentrant {
        LegacyPlan storage plan = _ownedPlan(planId);
        PlanState state = getEffectiveState(planId);
        if (state == PlanState.PROTECTION) revert ProtectedMutation();
        if (state != PlanState.DRAFT && state != PlanState.ACTIVE) revert WrongState(state);

        AssetPosition storage position = _position(planId, token);
        if (rawAmount == 0 || rawAmount > position.remaining) revert InvalidAmount();

        position.remaining -= rawAmount;
        position.deposited -= rawAmount;
        totalAttributed[token] -= rawAmount;
        IERC20(token).safeTransfer(plan.owner, rawAmount);
        emit AssetWithdrawn(planId, token, rawAmount);
    }

    function cancelLegacyPlan(uint256 planId) external nonReentrant {
        LegacyPlan storage plan = _ownedPlan(planId);
        PlanState state = getEffectiveState(planId);
        if (
            state == PlanState.SUCCESSION_READY || state == PlanState.COMPLETED
                || state == PlanState.CANCELLED
        ) revert WrongState(state);

        plan.cancelled = true;
        AssetPosition[] storage positions = _assets[planId];
        for (uint256 i; i < positions.length; ++i) {
            AssetPosition storage position = positions[i];
            uint256 amount = position.remaining;
            if (amount == 0) continue;

            position.remaining = 0;
            position.deposited = 0;
            totalAttributed[position.token] -= amount;
            IERC20(position.token).safeTransfer(plan.owner, amount);
            emit AssetWithdrawn(planId, position.token, amount);
        }
        emit LegacyPlanCancelled(planId);
    }

    function claim(uint256 planId, address token) external nonReentrant {
        LegacyPlan storage plan = _plan(planId);
        if (getEffectiveState(planId) != PlanState.SUCCESSION_READY) revert ClaimUnavailable();

        (uint256 successorIndex, bool listed) = _successorIndex(planId, msg.sender);
        if (!listed || acceptedVersion[planId][msg.sender] != plan.successorVersion) {
            revert SuccessorNotListed();
        }
        if (claimed[planId][msg.sender][token]) revert AlreadyClaimed();

        AssetPosition storage position = _position(planId, token);
        if (position.distributionBase == 0) {
            position.distributionBase = position.remaining;
            emit DistributionBaseRecorded(planId, token, position.distributionBase);
        }
        uint256 amount = _entitlement(planId, successorIndex, position.distributionBase);
        if (amount == 0) revert NoClaimEntitlement();

        claimed[planId][msg.sender][token] = true;
        position.remaining -= amount;
        totalAttributed[token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit SuccessionClaimed(planId, msg.sender, token, amount);

        if (_allDistributed(planId)) {
            plan.completed = true;
            emit LegacyPlanCompleted(planId);
        }
    }

    function getEffectiveState(uint256 planId) public view returns (PlanState) {
        LegacyPlan storage plan = _plan(planId);
        if (plan.completed) return PlanState.COMPLETED;
        if (plan.cancelled) return PlanState.CANCELLED;
        if (!plan.armed) return PlanState.DRAFT;

        uint256 deadline = uint256(plan.lastCheckIn) + plan.inactivityPeriod;
        if (block.timestamp < deadline) return PlanState.ACTIVE;
        if (block.timestamp < deadline + plan.protectionWindow) return PlanState.PROTECTION;
        return PlanState.SUCCESSION_READY;
    }

    function getSuccessors(uint256 planId) external view returns (Successor[] memory) {
        _plan(planId);
        return _successors[planId];
    }

    function getAssets(uint256 planId) external view returns (AssetPosition[] memory) {
        _plan(planId);
        return _assets[planId];
    }

    function isFullyAccepted(uint256 planId) public view returns (bool) {
        LegacyPlan storage plan = _plan(planId);
        Successor[] storage list = _successors[planId];
        for (uint256 i; i < list.length; ++i) {
            if (acceptedVersion[planId][list[i].account] != plan.successorVersion) return false;
        }
        return true;
    }

    function _plan(uint256 planId) internal view returns (LegacyPlan storage plan) {
        plan = legacyPlans[planId];
        if (plan.owner == address(0)) revert PlanNotFound();
    }

    function _ownedPlan(uint256 planId) internal view returns (LegacyPlan storage plan) {
        plan = _plan(planId);
        if (plan.owner != msg.sender) revert NotPlanOwner();
    }

    function _position(uint256 planId, address token)
        internal
        view
        returns (AssetPosition storage position)
    {
        uint256 pointer = _assetIndex[planId][token];
        if (pointer == 0) revert AssetNotFound();
        position = _assets[planId][pointer - 1];
    }

    function _validateTiming(uint64 inactivityPeriod, uint64 protectionWindow) internal pure {
        if (inactivityPeriod < MIN_INACTIVITY_PERIOD || protectionWindow < MIN_PROTECTION_WINDOW) {
            revert UnsafeTiming();
        }
    }

    function _validateSuccessors(address planOwner, Successor[] calldata list) internal pure {
        if (list.length == 0 || list.length > MAX_SUCCESSORS) revert InvalidSuccessorCount();

        uint256 total;
        for (uint256 i; i < list.length; ++i) {
            Successor calldata successor = list[i];
            if (
                successor.account == address(0) || successor.account == planOwner
                    || successor.shareBps == 0
            ) revert InvalidSuccessor();
            for (uint256 j; j < i; ++j) {
                if (list[j].account == successor.account) revert DuplicateSuccessor();
            }
            total += successor.shareBps;
        }
        if (total != TOTAL_BPS) revert InvalidAllocation();
    }

    function _storeSuccessors(uint256 planId, Successor[] calldata list) internal {
        for (uint256 i; i < list.length; ++i) {
            _successors[planId].push(list[i]);
        }
    }

    function _isListed(uint256 planId, address account) internal view returns (bool) {
        (, bool listed) = _successorIndex(planId, account);
        return listed;
    }

    function _successorIndex(uint256 planId, address account)
        internal
        view
        returns (uint256, bool)
    {
        Successor[] storage list = _successors[planId];
        for (uint256 i; i < list.length; ++i) {
            if (list[i].account == account) return (i, true);
        }
        return (0, false);
    }

    function _requireEditable(uint256 planId) internal view {
        PlanState state = getEffectiveState(planId);
        if (state != PlanState.DRAFT && state != PlanState.ACTIVE) revert ProtectedMutation();
    }

    function _entitlement(uint256 planId, uint256 index, uint256 distributionBase)
        internal
        view
        returns (uint256)
    {
        Successor[] storage list = _successors[planId];
        if (index + 1 < list.length) {
            return Math.mulDiv(distributionBase, list[index].shareBps, TOTAL_BPS);
        }

        uint256 allocated;
        for (uint256 i; i + 1 < list.length; ++i) {
            allocated += Math.mulDiv(distributionBase, list[i].shareBps, TOTAL_BPS);
        }
        return distributionBase - allocated;
    }

    function _allDistributed(uint256 planId) internal view returns (bool) {
        AssetPosition[] storage positions = _assets[planId];
        for (uint256 i; i < positions.length; ++i) {
            if (positions[i].remaining != 0) return false;
        }
        return true;
    }

    function _hasAssets(uint256 planId) internal view returns (bool) {
        AssetPosition[] storage positions = _assets[planId];
        for (uint256 i; i < positions.length; ++i) {
            if (positions[i].remaining != 0) return true;
        }
        return false;
    }
}
