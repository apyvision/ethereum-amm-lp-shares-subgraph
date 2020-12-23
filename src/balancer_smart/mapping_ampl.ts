import {
  BPoolSmart,
  LogExit,
  LogJoin,
  Transfer
} from '../../generated/BalancerSmartPoolAmpl/BPoolSmart'
import {LiquidityPosition, User} from '../../generated/schema'
import {Address, BigDecimal, BigInt, log} from "@graphprotocol/graph-ts";
import {ADDRESS_ZERO, updateDayData} from "../util";

let BI_18 = BigInt.fromI32(18)
let ZERO_BI = BigInt.fromI32(0)
let ONE_BI = BigInt.fromI32(1)

function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals))
}

function getLpId(poolAddress: Address, userAddress: Address): string {
  return poolAddress.toHexString().concat('-').concat(userAddress.toHexString());
}

function createOrUpdate(poolAddress: Address, userAddrs: Address, isMintOrBurn: boolean): LiquidityPosition {
  let userId = userAddrs.toHex()
  let user = User.load(userId)
  if (user == null) {
    user = new User(userId)
    user.save()
  }

  let lpId = getLpId(poolAddress, userAddrs)
  let lp = LiquidityPosition.load(lpId)
  if (lp == null) {
    lp = new LiquidityPosition(lpId)
    lp.user = user.id
    lp.poolProviderName = "Balancer"
    lp.poolAddress = poolAddress
    lp.balance = ZERO_BI.toBigDecimal()
    lp.balanceFromMintBurn = ZERO_BI.toBigDecimal()
  }

  let bal = convertTokenToDecimal(BPoolSmart.bind(poolAddress).balanceOf(userAddrs), BI_18);
  log.warning("[BALSMART] Setting bal {} for user {} for pool {}", [bal.toString(), userAddrs.toHexString(), poolAddress.toHexString()])

  lp.balance = bal
  if (isMintOrBurn) {
    lp.balanceFromMintBurn = bal
  }

  lp.save()

  return lp as LiquidityPosition
}

export function handleJoin(event: LogJoin): void {
  let poolAddress = event.address;
  let tx = event.transaction.hash.toHexString();
  let userAddrs = event.transaction.from;
  log.warning("[BALSMART] handle join for tx: {}", [tx])
  let lp = createOrUpdate(poolAddress, userAddrs, true);
  updateDayData(lp, userAddrs, event);
}

export function handleBurn(event: LogExit): void {
  let poolAddress = event.address;
  let tx = event.transaction.hash.toHexString();
  log.warning("[BALSMART] handle burn for tx: {}", [tx])
  let userAddrs = event.transaction.from;
  let lp = createOrUpdate(poolAddress, userAddrs, true);
  updateDayData(lp, userAddrs, event);
}

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;
  let tx = event.transaction.hash.toHexString();
  log.warning("[BALSMART] handle transfer for tx: {}", [tx])

  let from = event.params.from;
  if (from != poolAddress && from.toHexString() != ADDRESS_ZERO) {
    let lp = createOrUpdate(poolAddress, from, false);
    updateDayData(lp, from, event);
  }

  let to = event.params.to;
  if (to != poolAddress && to.toHexString() != ADDRESS_ZERO) {
    let lp2 = createOrUpdate(poolAddress, to as Address, false);
    updateDayData(lp2, to as Address, event);
  }
}

